import asyncio
from typing import Annotated
from weakref import WeakKeyDictionary

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.db import get_session
from app.models import Booking, Payment, WebhookEvent
from app.services.booking_status import IllegalTransition, transition

webhooks_router = APIRouter(prefix="/webhooks", tags=["webhooks"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]

_webhook_locks: WeakKeyDictionary[asyncio.AbstractEventLoop, asyncio.Lock] = (
    WeakKeyDictionary()
)


def _processing_lock() -> asyncio.Lock:
    loop = asyncio.get_running_loop()
    lock = _webhook_locks.get(loop)
    if lock is None:
        lock = asyncio.Lock()
        _webhook_locks[loop] = lock
    return lock

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


async def _claim_event(session: AsyncSession, event_id: str, event_type: str) -> bool:
    result = await session.exec(
        select(WebhookEvent).where(WebhookEvent.event_id == event_id)
    )
    existing = result.first()
    if existing is not None:
        return existing.status == "failed"
    session.add(
        WebhookEvent(event_id=event_id, event_type=event_type, status="received")
    )
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        result = await session.exec(
            select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        )
        existing = result.first()
        return existing is not None and existing.status == "failed"
    return True


async def _mark_event(session: AsyncSession, event_id: str, status: str) -> None:
    row = await session.get(WebhookEvent, event_id)
    if row is None:
        return
    row.status = status
    session.add(row)
    await session.commit()


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
    event_id = str(event["id"])
    event_type = event["type"]

    async with _processing_lock():
        if not await _claim_event(session, event_id, event_type):
            return {"received": "true"}

        session_id = obj["id"]
        booking = await _find_booking_by_session(session, session_id)
        if booking is None:
            # Unknown session — acknowledge without side effects
            await _mark_event(session, event_id, "processed")
            return {"received": "true"}

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
                    # stored totals, never re-quote
                    await _upsert_payment(
                        session,
                        booking,
                        payment_intent_id=payment_intent,
                        amount_cents=booking.total_cents,
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
            await session.commit()
        except IllegalTransition:
            # Late/duplicate events on non-pending bookings are ignored
            await session.rollback()
            await _mark_event(session, event_id, "processed")
            return {"received": "true"}
        except Exception as exc:
            await session.rollback()
            await _mark_event(session, event_id, "failed")
            raise HTTPException(
                status_code=500, detail="Webhook processing failed"
            ) from exc

        await _mark_event(session, event_id, "processed")
        return {"received": "true"}
