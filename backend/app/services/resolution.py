"""Cancellation, refund, and replacement-offer flows.

Money rules (decided with the user):
- Paid cancel with no offer → full refund fires immediately.
- Offers only exist on paid bookings; the customer never pays more than
  they already paid (replacement re-priced ≤ original total, enforced
  at offer time and re-checked at accept time).
- No deadline: the admin can withdraw an offer anytime → full refund.
- Stripe calls happen before the DB flips money state; a failed call
  leaves refund_status="failed" for retry via the manual refund button.
"""

import contextlib
from datetime import UTC, datetime
from uuid import uuid4

import stripe
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Booking, Car, Message, Notification, Payment, SwapOffer
from app.services.booking import (
    assert_no_overlap,
    get_available_car,
    resolve_promo,
)
from app.services.booking_status import (
    ALLOWED_TRANSITIONS,
    find_owner_id,
    transition,
)
from app.services.event_hub import EventHub, event_hub
from app.services.pricing import Quote, quote
from app.services.stripe_service import StripeService

OFFER_LINK = "/account/bookings"
ADMIN_LINK = "/admin/bookings"


def _money(cents: int) -> str:
    return f"${cents / 100:.2f}"


async def get_payment(session: AsyncSession, booking_id: str) -> Payment | None:
    result = await session.exec(
        select(Payment).where(Payment.booking_id == booking_id)
    )
    return result.first()


async def get_offer(session: AsyncSession, booking_id: str) -> SwapOffer | None:
    result = await session.exec(
        select(SwapOffer).where(SwapOffer.booking_id == booking_id)
    )
    return result.first()


async def get_open_offer(session: AsyncSession, booking_id: str) -> SwapOffer | None:
    result = await session.exec(
        select(SwapOffer).where(
            SwapOffer.booking_id == booking_id, SwapOffer.status == "offered"
        )
    )
    return result.first()


def _remaining_refundable(payment: Payment | None) -> int:
    if payment is None or payment.status != "succeeded":
        return 0
    return max(payment.amount_cents - payment.refunded_cents, 0)


def _require_cancelable(booking: Booking) -> None:
    if booking.status not in ALLOWED_TRANSITIONS or "cancelled" not in (
        ALLOWED_TRANSITIONS[booking.status]
    ):
        raise HTTPException(
            status_code=409,
            detail=f"Booking cannot be cancelled from status {booking.status!r}",
        )


async def _quote_offer(
    session: AsyncSession, booking: Booking, car: Car
) -> Quote:
    """Re-price the replacement for the original dates. Promo honored while
    active; a lapsed promo falls back to list price (R ≤ P still enforced)."""
    promo = None
    if booking.promo_code:
        try:
            promo = await resolve_promo(session, booking.promo_code)
        except HTTPException:
            promo = None
    return quote(car, booking.pickup_date, booking.dropoff_date, promo)


def _notify(
    session: AsyncSession,
    *,
    user_id: str,
    ntype: str,
    title: str,
    body: str,
    link: str,
) -> Notification:
    note = Notification(
        user_id=user_id, type=ntype, title=title, body=body, link=link
    )
    session.add(note)
    return note


def _publish_notification(hub: EventHub, note: Notification) -> None:
    hub.publish(
        note.user_id,
        {
            "event": "notification",
            "id": note.id,
            "data": {
                "id": note.id,
                "type": note.type,
                "title": note.title,
                "body": note.body,
                "link": note.link,
            },
        },
    )


async def execute_refund(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    payment: Payment,
    *,
    amount_cents: int,
    purpose: str,
    hub: EventHub | None = None,
    notify_customer: bool = True,
) -> None:
    """Refund `amount_cents` (must be the remaining balance) on Stripe, then
    record it on the payment row. Commits only on the failure path (so a
    failed attempt is persisted for retry); success leaves the commit to the
    caller, which bundles it with its own state changes."""
    hub = hub or event_hub
    remaining = _remaining_refundable(payment)
    if amount_cents <= 0 or amount_cents > remaining:
        raise HTTPException(status_code=409, detail="Nothing to refund")
    if not payment.stripe_payment_intent_id:
        raise HTTPException(
            status_code=409,
            detail=(
                "Payment has no Stripe reference — "
                "refund it in the Stripe dashboard"
            ),
        )

    payment.refund_status = "pending"
    session.add(payment)
    try:
        refund = await stripe_service.create_refund(
            {
                "payment_intent": payment.stripe_payment_intent_id,
                "amount": amount_cents,
            },
            idempotency_key=f"refund:{booking.id}:{purpose}:{amount_cents}",
        )
    except Exception as exc:
        payment.refund_status = "failed"
        session.add(payment)
        await session.commit()
        raise HTTPException(
            status_code=502,
            detail="Refund could not be issued — try again",
        ) from exc

    payment.refund_status = getattr(refund, "status", "succeeded") or "succeeded"
    payment.stripe_refund_id = getattr(refund, "id", None)
    payment.refunded_cents += amount_cents
    session.add(payment)

    if notify_customer:
        _notify(
            session,
            user_id=booking.user_id,
            ntype="refund_completed",
            title="Refund issued",
            body=(
                f"{_money(amount_cents)} is on its way back to your "
                "payment method (3-5 business days)."
            ),
            link=OFFER_LINK,
        )


async def cancel_booking(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    *,
    reason: str,
    offered_car_id: str | None = None,
    hub: EventHub | None = None,
) -> SwapOffer | None:
    """The admin cancel flow: required reason, optional replacement offer.

    Unpaid: expires the open checkout session (it can never be paid later).
    Paid + no offer: full refund immediately. Paid + offer: money is held
    until the customer accepts (credit) or declines (full refund).

    Returns the created SwapOffer, or None when no offer was made.
    Raises before any mutation when validation fails; a refund API failure
    after the cancel still releases the car (refund_status=failed → retry)."""
    hub = hub or event_hub
    reason = reason.strip()
    if not reason:
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "reason"],
                    "msg": "Cancellation reason is required",
                    "type": "value_error",
                }
            ],
        )
    _require_cancelable(booking)
    # Mid-rental: reason only. No offer, no automatic refund — the standalone
    # refund button covers money return after the car is back.
    was_active = booking.status == "active"
    if was_active and offered_car_id is not None:
        raise HTTPException(
            status_code=422,
            detail="Mid-rental cancellations cannot include a replacement offer",
        )

    payment = await get_payment(session, booking.id)
    paid = payment is not None and payment.status == "succeeded"
    remaining = _remaining_refundable(payment)

    if (
        payment is not None
        and payment.status == "succeeded"
        and not payment.stripe_payment_intent_id
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Payment has no Stripe reference — "
                "refund it in the Stripe dashboard"
            ),
        )

    offered_car: Car | None = None
    priced: Quote | None = None
    if offered_car_id is not None:
        if not paid:
            raise HTTPException(
                status_code=422,
                detail="Replacement offers require a paid booking",
            )
        offered_car = await get_available_car(session, offered_car_id)
        priced = await _quote_offer(session, booking, offered_car)
        if priced.total_cents > booking.total_cents:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Replacement total {_money(priced.total_cents)} exceeds the "
                    f"original {_money(booking.total_cents)} — customer never pays more"
                ),
            )

    owner_id = await find_owner_id(session)

    # Release an unpaid hold's checkout session before the status flip.
    if booking.status == "pending" and booking.stripe_session_id:
        with contextlib.suppress(stripe.InvalidRequestError):
            # already expired/complete — keep going
            await stripe_service.expire_checkout_session(booking.stripe_session_id)

    booking.cancel_reason = reason
    session.add(booking)
    await transition(session, booking, "cancelled", actor="owner", hub=hub)

    offer: SwapOffer | None = None
    notes: list[Notification] = []
    message: Message | None = None

    if offered_car is not None and priced is not None:
        offer = SwapOffer(
            booking_id=booking.id,
            offered_car_id=offered_car.id,
            offered_total_cents=priced.total_cents,
            status="offered",
        )
        session.add(offer)
        if owner_id:
            message = Message(
                booking_id=booking.id,
                sender_id=owner_id,
                body=(
                    f"Cancellation reason: {reason}\n\n"
                    f"Replacement offered: {offered_car.name} - "
                    f"{_money(priced.total_cents)} for the same dates. "
                    "You pay nothing extra; accept it or request a refund "
                    "from your Bookings page."
                ),
            )
            session.add(message)
        notes.append(
            _notify(
                session,
                user_id=booking.user_id,
                ntype="swap_offered",
                title="Replacement offered",
                body=(
                    f"{offered_car.name} for your cancelled booking — "
                    "accept it or request a refund."
                ),
                link=OFFER_LINK,
            )
        )
    else:
        if owner_id:
            message = Message(
                booking_id=booking.id,
                sender_id=owner_id,
                body=f"Booking cancelled: {reason}",
            )
            session.add(message)

    if paid and remaining > 0 and offer is None and not was_active:
        # No offer → money must not sit with no decision pending.
        try:
            await execute_refund(
                session,
                stripe_service,
                booking,
                payment,  # type: ignore[arg-type]
                amount_cents=remaining,
                purpose="full",
                hub=hub,
            )
        except HTTPException as exc:
            if exc.status_code == 409:
                raise
            # Car is already released; failure is persisted as
            # refund_status="failed" and retried via the manual refund button.

    await session.commit()

    for note in notes:
        _publish_notification(hub, note)
    if message is not None:
        for recipient in {booking.user_id, owner_id} - {None}:
            hub.publish(
                recipient,
                {
                    "event": "message",
                    "id": message.id,
                    "data": {
                        "id": message.id,
                        "bookingId": message.booking_id,
                        "senderId": message.sender_id,
                        "body": message.body,
                        "readAt": None,
                        "createdAt": message.created_at.isoformat(),
                    },
                },
            )
    return offer


async def _require_customer(booking: Booking, user_id: str) -> None:
    if booking.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your booking")


async def _load_offered_offer(
    session: AsyncSession, booking: Booking, user_id: str
) -> tuple[SwapOffer, Car]:
    await _require_customer(booking, user_id)
    offer = await get_open_offer(session, booking.id)
    if offer is None:
        raise HTTPException(status_code=409, detail="No open replacement offer")
    car = await session.get(Car, offer.offered_car_id)
    if car is None:
        raise HTTPException(status_code=409, detail="Offered car no longer exists")
    return offer, car


async def accept_swap(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    *,
    user_id: str,
    hub: EventHub | None = None,
) -> str:
    """Customer takes the replacement: refund any price difference, then create
    a new confirmed booking on the offered car (credit — never a second charge).
    Returns the new booking id. Re-validates availability and price at accept
    time; either failing leaves the offer open so the customer can refund."""
    hub = hub or event_hub
    offer, car = await _load_offered_offer(session, booking, user_id)

    payment = await get_payment(session, booking.id)
    if payment is None or payment.status != "succeeded":
        raise HTTPException(status_code=409, detail="No captured payment to apply")
    held = _remaining_refundable(payment)
    if held <= 0:
        raise HTTPException(status_code=409, detail="Booking was already refunded")

    # Availability: original hold is released (cancelled); re-check fleet units.
    await assert_no_overlap(
        session,
        car.id,
        booking.pickup_date,
        booking.dropoff_date,
        quantity=car.quantity,
    )

    priced = await _quote_offer(session, booking, car)
    if priced.total_cents > booking.total_cents:
        raise HTTPException(
            status_code=409,
            detail="Price changed since the offer — request a refund instead",
        )

    difference = held - priced.total_cents
    if difference > 0:
        await execute_refund(
            session,
            stripe_service,
            booking,
            payment,
            amount_cents=difference,
            purpose="diff",
            hub=hub,
        )

    new_booking = Booking(
        id=str(uuid4()),
        user_id=booking.user_id,
        car_id=car.id,
        pickup_date=booking.pickup_date,
        dropoff_date=booking.dropoff_date,
        pickup_time=booking.pickup_time,
        dropoff_time=booking.dropoff_time,
        pickup_location=booking.pickup_location,
        dropoff_location=booking.dropoff_location,
        days=priced.days,
        billing_name=booking.billing_name,
        billing_phone=booking.billing_phone,
        billing_address=booking.billing_address,
        billing_city=booking.billing_city,
        promo_code=booking.promo_code,
        subtotal_cents=priced.subtotal_cents,
        discount_cents=priced.discount_cents,
        total_cents=priced.total_cents,
        currency=priced.currency,
        agreed_to_terms=booking.agreed_to_terms,
        agreed_to_marketing=booking.agreed_to_marketing,
        status="confirmed",
    )
    session.add(new_booking)
    session.add(
        Payment(
            booking_id=new_booking.id,
            stripe_payment_intent_id=None,
            amount_cents=priced.total_cents,
            currency=priced.currency,
            status="succeeded",
            origin="credit",
        )
    )

    offer.status = "accepted"
    offer.responded_at = datetime.now(UTC)
    session.add(offer)

    notes = [
        _notify(
            session,
            user_id=booking.user_id,
            ntype="booking_confirmed",
            title="Replacement confirmed",
            body=f"Your {car.name} booking is confirmed — nothing more to pay.",
            link=OFFER_LINK,
        )
    ]
    owner_id = await find_owner_id(session)
    if owner_id:
        notes.append(
            _notify(
                session,
                user_id=owner_id,
                ntype="swap_accepted",
                title="Replacement accepted",
                body=f"Customer accepted the {car.name} replacement.",
                link=ADMIN_LINK,
            )
        )
    await session.commit()
    for note in notes:
        _publish_notification(hub, note)
    return new_booking.id


async def decline_swap(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    *,
    user_id: str,
    hub: EventHub | None = None,
) -> None:
    """Customer requests the refund instead of the replacement."""
    hub = hub or event_hub
    offer, _car = await _load_offered_offer(session, booking, user_id)

    payment = await get_payment(session, booking.id)
    if payment is None:
        raise HTTPException(status_code=409, detail="No payment to refund")
    remaining = _remaining_refundable(payment)
    if remaining <= 0:
        raise HTTPException(status_code=409, detail="Nothing to refund")

    # Refund first: a failure keeps the offer open for retry.
    await execute_refund(
        session,
        stripe_service,
        booking,
        payment,
        amount_cents=remaining,
        purpose="full",
        hub=hub,
    )
    offer.status = "declined"
    offer.responded_at = datetime.now(UTC)
    session.add(offer)

    notes = []
    owner_id = await find_owner_id(session)
    if owner_id:
        notes.append(
            _notify(
                session,
                user_id=owner_id,
                ntype="swap_declined",
                title="Refund requested",
                body="Customer declined the replacement — refund issued.",
                link=ADMIN_LINK,
            )
        )
    await session.commit()
    for note in notes:
        _publish_notification(hub, note)


async def withdraw_offer(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    *,
    hub: EventHub | None = None,
) -> None:
    """Admin pulls the offer back → full refund (escape hatch, no deadline)."""
    hub = hub or event_hub
    offer = await get_open_offer(session, booking.id)
    if offer is None:
        raise HTTPException(status_code=409, detail="No open replacement offer")

    offer.status = "withdrawn"
    offer.responded_at = datetime.now(UTC)
    session.add(offer)

    payment = await get_payment(session, booking.id)
    note: Notification | None = None
    if payment is not None and _remaining_refundable(payment) > 0:
        try:
            await execute_refund(
                session,
                stripe_service,
                booking,
                payment,
                amount_cents=_remaining_refundable(payment),
                purpose="full",
                hub=hub,
            )
        except HTTPException as exc:
            if exc.status_code == 409:
                raise
            # Refund failed (persisted as failed); do not tell the user a
            # refund is on its way. Retry via the manual refund button.
            await session.commit()
            return
        note = _notify(
            session,
            user_id=booking.user_id,
            ntype="swap_withdrawn",
            title="Offer withdrawn",
            body="The replacement offer was withdrawn — your refund is on its way.",
            link=OFFER_LINK,
        )
    await session.commit()
    if note is not None:
        _publish_notification(hub, note)


async def manual_refund(
    session: AsyncSession,
    stripe_service: StripeService,
    booking: Booking,
    *,
    hub: EventHub | None = None,
) -> None:
    """Standalone full refund of whatever is still held (also the retry path
    after a failed refund). Withdraws any open offer — the money is gone."""
    hub = hub or event_hub
    payment = await get_payment(session, booking.id)
    if payment is None or payment.status != "succeeded":
        raise HTTPException(status_code=409, detail="No captured payment to refund")
    remaining = _remaining_refundable(payment)
    if remaining <= 0:
        raise HTTPException(status_code=409, detail="Booking is already fully refunded")

    offer = await get_offer(session, booking.id)
    if offer is not None and offer.status == "accepted":
        # Remaining balance became the replacement booking's credit —
        # refunding it again would pay the customer twice.
        raise HTTPException(
            status_code=409,
            detail=(
                "Remaining balance was applied to the replacement booking"
            ),
        )
    if offer is not None and offer.status == "offered":
        offer.status = "withdrawn"
        offer.responded_at = datetime.now(UTC)
        session.add(offer)

    await execute_refund(
        session,
        stripe_service,
        booking,
        payment,
        amount_cents=remaining,
        purpose="full",
        hub=hub,
    )
    await session.commit()


__all__ = [
    "accept_swap",
    "cancel_booking",
    "decline_swap",
    "execute_refund",
    "get_offer",
    "get_open_offer",
    "get_payment",
    "manual_refund",
    "withdraw_offer",
]
