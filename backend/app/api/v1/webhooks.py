from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.db import get_session
from app.models import Booking, Payment
from app.services.booking_status import IllegalTransition, transition

webhooks_router = APIRouter(prefix="/webhooks", tags=["webhooks"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]

_HANDLED_TYPES = {
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
}


async def _find_booking_by_session(
    session: AsyncSession, stripe_session_id: str
) -> Booking | None:
    result = await session.exec(
        select(Booking).where(Booking.stripe_session_id == stripe_session_id)
    )
    return result.first()


async def _upsert_payment(
    session: AsyncSession,
    booking: Booking,
    *,
    payment_intent_id: str | None,
    amount_cents: int,
    payment_status: str,
) -> None:
    result = await session.exec(select(Payment).where(Payment.booking_id == booking.id))
    payment = result.first()
    if payment is None:
        payment = Payment(
            booking_id=booking.id,
            stripe_payment_intent_id=payment_intent_id,
            amount_cents=amount_cents,
            currency=booking.currency,
            status=payment_status,
        )
        session.add(payment)
    else:
        payment.stripe_payment_intent_id = (
            payment_intent_id or payment.stripe_payment_intent_id
        )
        payment.amount_cents = amount_cents
        payment.status = payment_status


@webhooks_router.post("/stripe")
async def stripe_webhook(request: Request, session: SessionDep) -> dict[str, str]:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.stripe_webhook_secret
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Invalid signature") from exc

    if event["type"] not in _HANDLED_TYPES:
        return {"received": "true"}

    obj = event["data"]["object"]
    session_id = obj["id"]
    booking = await _find_booking_by_session(session, session_id)
    if booking is None:
        # Unknown session — acknowledge without side effects
        return {"received": "true"}

    event_type = event["type"]
    payment_status = getattr(obj, "payment_status", None) or ""
    payment_intent = getattr(obj, "payment_intent", None)

    try:
        if event_type in (
            "checkout.session.completed",
            "checkout.session.async_payment_succeeded",
        ):
            # Idempotent: already confirmed → no-op
            if booking.status == "pending":
                await transition(
                    session, booking, "confirmed", actor="webhook"
                )
            if payment_status in ("paid", "no_payment_required"):
                await _upsert_payment(
                    session,
                    booking,
                    payment_intent_id=payment_intent,
                    amount_cents=booking.total_cents,  # stored totals, never re-quote
                    payment_status="succeeded",
                )
        elif event_type == "checkout.session.async_payment_failed":
            if booking.status == "pending":
                await transition(session, booking, "failed", actor="webhook")
            await _upsert_payment(
                session,
                booking,
                payment_intent_id=payment_intent,
                amount_cents=booking.total_cents,
                payment_status="failed",
            )
        elif event_type == "checkout.session.expired":
            if booking.status == "pending":
                await transition(session, booking, "cancelled", actor="webhook")
    except IllegalTransition:
        # Late/duplicate events on non-pending bookings are ignored
        await session.rollback()
        return {"received": "true"}

    await session.commit()
    return {"received": "true"}
