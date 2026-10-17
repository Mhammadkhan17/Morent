import json
from datetime import date, timedelta

import pytest

from app.core.config import settings
from app.models import Booking
from tests.conftest import sign_stripe_event


def _event(
    session_id: str,
    event_type: str,
    payment_status: str = "paid",
    payment_intent: str = "pi_123",
):
    return {
        "type": event_type,
        "data": {
            "object": {
                "id": session_id,
                "payment_status": payment_status,
                "payment_intent": payment_intent,
            }
        },
    }


async def _seed_pending_booking(db_session, session_id: str = "cs_test_1") -> Booking:
    start = date.today() + timedelta(days=40)
    booking = Booking(
        user_id="user_test_1",
        car_id="koenigsegg",
        pickup_date=start,
        dropoff_date=start + timedelta(days=2),
        pickup_time="10:00",
        dropoff_time="10:00",
        pickup_location="NYC",
        dropoff_location="NYC",
        days=2,
        billing_name="T",
        billing_phone="p",
        billing_address="a",
        billing_city="c",
        subtotal_cents=19_800,
        discount_cents=0,
        total_cents=19_800,
        status="pending",
        stripe_session_id=session_id,
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)
    return booking


def _post(client, event, *, secret=None, raw=None, sig=None):
    payload = raw if raw is not None else json.dumps(event).encode()
    secret = secret or settings.stripe_webhook_secret
    sig_header = sig if sig is not None else sign_stripe_event(payload, secret)
    headers = {"stripe-signature": sig_header}
    return payload, headers


@pytest.mark.asyncio
async def test_bad_signature_400(client, db_session):
    payload, headers = _post(client, None, raw=b"{}", sig="t=1,v1=deadbeef")
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_invalid_payload_400(client, db_session):
    payload, headers = _post(client, None, raw=b"not-json", sig=None)
    # sign the actual bytes so we exercise payload parse, not signature
    headers["stripe-signature"] = sign_stripe_event(
        payload, settings.stripe_webhook_secret
    )
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_completed_confirms_booking_and_inserts_payment(
    client, seeded_car, db_session
):
    await _seed_pending_booking(db_session, "cs_test_1")
    event = _event("cs_test_1", "checkout.session.completed", payment_status="paid")
    payload, headers = _post(client, event)
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 200

    bookings = (await client.get("/api/v1/bookings")).json()
    assert bookings[0]["status"] == "confirmed"

    from sqlmodel import select

    from app.models import Payment

    result = await db_session.exec(
        select(Payment).where(Payment.booking_id == bookings[0]["id"])
    )
    payments = list(result.all())
    assert len(payments) == 1
    assert payments[0].status == "succeeded"
    assert payments[0].amount_cents == 19_800


@pytest.mark.asyncio
async def test_completed_is_idempotent_double_delivery(client, seeded_car, db_session):
    await _seed_pending_booking(db_session, "cs_test_2")
    event = _event("cs_test_2", "checkout.session.completed")
    payload, headers = _post(client, event)
    r1 = await client.post("/api/v1/webhooks/stripe", content=payload, headers=headers)
    r2 = await client.post("/api/v1/webhooks/stripe", content=payload, headers=headers)
    assert r1.status_code == 200
    assert r2.status_code == 200

    bookings = (await client.get("/api/v1/bookings")).json()
    assert bookings[0]["status"] == "confirmed"

    from sqlmodel import select

    from app.models import Payment

    result = await db_session.exec(
        select(Payment).where(Payment.booking_id == bookings[0]["id"])
    )
    payments = list(result.all())
    assert len(payments) == 1
    assert payments[0].amount_cents == 19_800
    assert payments[0].status == "succeeded"


@pytest.mark.asyncio
async def test_expired_cancels_pending(client, seeded_car, db_session):
    await _seed_pending_booking(db_session, "cs_test_3")
    event = _event("cs_test_3", "checkout.session.expired", payment_status="unpaid")
    payload, headers = _post(client, event)
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 200
    bookings = (await client.get("/api/v1/bookings")).json()
    assert bookings[0]["status"] == "cancelled"


@pytest.mark.asyncio
async def test_late_event_on_confirmed_is_ignored(client, seeded_car, db_session):
    booking = await _seed_pending_booking(db_session, "cs_test_4")
    booking.status = "confirmed"
    db_session.add(booking)
    await db_session.commit()

    event = _event("cs_test_4", "checkout.session.expired")
    payload, headers = _post(client, event)
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 200
    bookings = (await client.get("/api/v1/bookings")).json()
    assert bookings[0]["status"] == "confirmed"  # unchanged


@pytest.mark.asyncio
async def test_unknown_session_acked_without_side_effects(client, seeded_car):
    event = _event("cs_test_unknown", "checkout.session.completed")
    payload, headers = _post(client, event)
    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers=headers
    )
    assert resp.status_code == 200
