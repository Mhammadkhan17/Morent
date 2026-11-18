"""Refund / replacement-offer flows: admin cancel, swap accept/decline,
manual refund, withdraw, and charge.refunded webhook reconciliation."""

import json
from decimal import Decimal

import pytest
from sqlmodel import select

from app.core.config import settings
from app.models import Booking, Car, Message, Notification, Payment, SwapOffer
from tests.conftest import seed_booking, seed_payment, sign_stripe_event

pytestmark = pytest.mark.usefixtures("owner_user")

CANCEL = {"reason": "Customer trip fell through"}


async def _cheaper_car(db_session) -> Car:
    car = Car(
        id="budget",
        name="Budget Runner",
        type="Sedan",
        description="Cheap",
        fuel_capacity="40L",
        transmission="Automatic",
        seating_capacity="5",
        price_per_day=Decimal("50.00"),
        image_url="https://example.com/budget.png",
        images=["https://example.com/budget.png"],
        tags=["Economy"],
        status="available",
    )
    db_session.add(car)
    await db_session.commit()
    return car


async def _pricier_car(db_session) -> Car:
    car = Car(
        id="pricier",
        name="Pricier Beast",
        type="SUV",
        description="Expensive",
        fuel_capacity="90L",
        transmission="Automatic",
        seating_capacity="5",
        price_per_day=Decimal("150.00"),
        image_url="https://example.com/pricier.png",
        images=["https://example.com/pricier.png"],
        tags=["Luxury"],
        status="available",
    )
    db_session.add(car)
    await db_session.commit()
    return car


async def _paid_confirmed(db_session, booking_id: str = "b_paid") -> Booking:
    booking = await seed_booking(
        db_session, booking_id, status="confirmed", total_cents=19_800
    )
    await seed_payment(db_session, booking.id, amount_cents=19_800)
    return booking


async def _payments(db_session, booking_id: str) -> list[Payment]:
    # Client requests run in other sessions — populate_existing forces a
    # column reload so we don't read identity-map instances that predate
    # their commits.
    stmt = (
        select(Payment)
        .where(Payment.booking_id == booking_id)
        .execution_options(populate_existing=True)
    )
    return list((await db_session.exec(stmt)).all())


async def _offer(db_session, booking_id: str) -> SwapOffer | None:
    stmt = (
        select(SwapOffer)
        .where(SwapOffer.booking_id == booking_id)
        .execution_options(populate_existing=True)
    )
    return (await db_session.exec(stmt)).first()


# --- admin cancel ---------------------------------------------------------


async def test_cancel_paid_no_offer_auto_refunds(
    client, seeded_car, db_session, fake_stripe
):
    booking = await _paid_confirmed(db_session)

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json=CANCEL
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"
    assert data["cancelReason"] == CANCEL["reason"]
    assert data["refundStatus"] == "succeeded"
    assert data["refundedCents"] == 19_800

    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refunded_cents == 19_800
    assert payment.refund_status == "succeeded"
    assert payment.stripe_refund_id == "re_test_1"

    params, key = fake_stripe.refunds.created[0]
    assert params["payment_intent"] == "pi_test_1"
    assert params["amount"] == 19_800
    assert key == f"refund:{booking.id}:full:19800"

    notes = list((await db_session.exec(select(Notification))).all())
    assert any(n.type == "refund_completed" for n in notes)

    message = (
        await db_session.exec(
            select(Message).where(Message.booking_id == booking.id)
        )
    ).one()
    assert CANCEL["reason"] in message.body


async def test_cancel_with_offer_holds_money(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"
    assert data["swapOfferStatus"] == "offered"
    assert data["refundedCents"] == 0
    assert data["refundStatus"] == "none"  # payment exists, nothing refunded yet

    assert fake_stripe.refunds.created == []
    offer = await _offer(db_session, booking.id)
    assert offer is not None
    assert offer.offered_car_id == "budget"
    assert offer.offered_total_cents == 10_000  # 50/day * 2 days

    notes = list((await db_session.exec(select(Notification))).all())
    assert any(n.type == "swap_offered" for n in notes)
    message = (
        await db_session.exec(
            select(Message).where(Message.booking_id == booking.id)
        )
    ).one()
    assert "Replacement offered" in message.body


async def test_cancel_offer_rejects_pricier_car(
    client, seeded_car, db_session, fake_stripe
):
    await _pricier_car(db_session)
    booking = await _paid_confirmed(db_session)

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "pricier"},
    )
    assert resp.status_code == 422
    assert "never pays more" in resp.json()["detail"]

    # Nothing mutated: still confirmed, no offer, no refund attempted.
    await db_session.refresh(booking)
    assert booking.status == "confirmed"
    assert await _offer(db_session, booking.id) is None
    assert fake_stripe.refunds.created == []


async def test_cancel_offer_rejects_unpaid(client, seeded_car, db_session):
    booking = await seed_booking(
        db_session, "b_hold", status="pending", total_cents=19_800
    )
    await _cheaper_car(db_session)

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )
    assert resp.status_code == 422
    await db_session.refresh(booking)
    assert booking.status == "pending"


async def test_cancel_pending_expires_session(
    client, seeded_car, db_session, fake_stripe
):
    booking = await seed_booking(
        db_session, "b_unpaid", status="pending", total_cents=19_800
    )
    booking.stripe_session_id = "cs_hold_1"
    db_session.add(booking)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json=CANCEL
    )
    assert resp.status_code == 200
    assert fake_stripe.sessions.expired_ids == ["cs_hold_1"]
    assert fake_stripe.refunds.created == []
    payment_rows = await _payments(db_session, booking.id)
    assert payment_rows == []


async def test_cancel_requires_reason(client, seeded_car, db_session):
    booking = await _paid_confirmed(db_session, "b_noreason")

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json={"reason": "   "}
    )
    assert resp.status_code == 422


async def test_cancel_active_is_reason_only(
    client, seeded_car, db_session, fake_stripe
):
    booking = await _paid_confirmed(db_session, "b_active")
    booking.status = "active"
    db_session.add(booking)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "koenigsegg"},
    )
    assert resp.status_code == 422

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json=CANCEL
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    # Mid-rental: money untouched — admin uses the refund button later.
    assert resp.json()["refundedCents"] == 0
    assert fake_stripe.refunds.created == []

    refund = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert refund.status_code == 200
    assert refund.json()["refundedCents"] == 19_800


async def test_patch_cancelled_rejected(client, seeded_car, db_session):
    booking = await _paid_confirmed(db_session, "b_patch_c")

    resp = await client.patch(
        f"/api/v1/admin/bookings/{booking.id}", json={"status": "cancelled"}
    )
    assert resp.status_code == 409
    assert "cancel" in resp.json()["detail"].lower()
    await db_session.refresh(booking)
    assert booking.status == "confirmed"


async def test_cancel_completed_rejected(client, seeded_car, db_session):
    booking = await seed_booking(
        db_session, "b_done", status="completed", total_cents=19_800
    )

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json=CANCEL
    )
    assert resp.status_code == 409


# --- swap accept ----------------------------------------------------------


async def test_accept_swap_creates_credit_booking(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert resp.status_code == 200
    new_id = resp.json()["bookingId"]
    assert resp.json()["status"] == "accepted"

    new_booking = await db_session.get(Booking, new_id)
    assert new_booking is not None
    assert new_booking.status == "confirmed"
    assert new_booking.car_id == "budget"
    assert new_booking.total_cents == 10_000

    payments = await _payments(db_session, new_id)
    assert len(payments) == 1
    assert payments[0].origin == "credit"
    assert payments[0].status == "succeeded"
    assert payments[0].stripe_payment_intent_id is None

    original = (await _payments(db_session, booking.id))[0]
    assert original.refunded_cents == 9_800  # 19800 - 10000
    assert original.refund_status == "succeeded"

    params, key = fake_stripe.refunds.created[0]
    assert params["amount"] == 9_800
    assert key == f"refund:{booking.id}:diff:9800"

    offer = await _offer(db_session, booking.id)
    assert offer.status == "accepted"

    notes = list((await db_session.exec(select(Notification))).all())
    assert any(n.type == "booking_confirmed" for n in notes)
    assert any(n.type == "swap_accepted" for n in notes)


async def test_accept_swap_overlap_conflict(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    # Another customer already holds the replacement car for these dates.
    await seed_booking(
        db_session,
        "b_overlap",
        status="confirmed",
        total_cents=10_000,
        car_id="budget",
        user_id="someone_else",
    )
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert resp.status_code == 409

    offer = await _offer(db_session, booking.id)
    assert offer.status == "offered"  # still open for a refund request
    assert fake_stripe.refunds.created == []


async def test_accept_swap_price_changed_blocks(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )
    # Admin raises the replacement's price above the original total.
    car = await db_session.get(Car, "budget")
    car.price_per_day = Decimal("150.00")
    db_session.add(car)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert resp.status_code == 409
    assert "request a refund" in resp.json()["detail"]

    offer = await _offer(db_session, booking.id)
    assert offer.status == "offered"
    assert fake_stripe.refunds.created == []


async def test_accept_requires_open_offer(client, seeded_car, db_session):
    booking = await _paid_confirmed(db_session, "b_nooffer")

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert resp.status_code == 409


async def test_accept_other_users_booking_404(
    client, seeded_car, db_session
):
    booking = await _paid_confirmed(db_session, "b_theirs")
    booking.user_id = "someone_else"
    db_session.add(booking)
    await db_session.commit()

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert resp.status_code == 404


# --- swap decline ---------------------------------------------------------


async def test_decline_refunds_full(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/decline"
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "refunded"

    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refunded_cents == 19_800
    offer = await _offer(db_session, booking.id)
    assert offer.status == "declined"

    params, key = fake_stripe.refunds.created[0]
    assert params["amount"] == 19_800
    assert key == f"refund:{booking.id}:full:19800"


async def test_decline_failure_keeps_offer_open(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )
    fake_stripe.refunds.fail_next = True

    resp = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/decline"
    )
    assert resp.status_code == 502

    offer = await _offer(db_session, booking.id)
    assert offer.status == "offered"  # retryable
    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refund_status == "failed"

    # Retry succeeds with the deterministic idempotency key (the failed
    # attempt never reached Stripe — nothing else recorded).
    retry = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/decline"
    )
    assert retry.status_code == 200
    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refunded_cents == 19_800
    keys = [k for _, k in fake_stripe.refunds.created]
    assert keys == [f"refund:{booking.id}:full:19800"]


# --- withdraw + manual refund ---------------------------------------------


async def test_withdraw_offer_refunds(
    client, seeded_car, db_session, fake_stripe
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/offer/withdraw"
    )
    assert resp.status_code == 200
    assert resp.json()["swapOfferStatus"] == "withdrawn"
    assert resp.json()["refundedCents"] == 19_800

    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refunded_cents == 19_800
    notes = list((await db_session.exec(select(Notification))).all())
    assert any(n.type == "swap_withdrawn" for n in notes)


async def test_withdraw_without_offer_409(
    client, seeded_car, db_session
):
    booking = await _paid_confirmed(db_session, "b_plain")
    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/offer/withdraw"
    )
    assert resp.status_code == 409


async def test_manual_refund_and_double_409(
    client, seeded_car, db_session, fake_stripe
):
    booking = await _paid_confirmed(db_session)

    first = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert first.status_code == 200
    assert first.json()["refundedCents"] == 19_800
    assert first.json()["refundStatus"] == "succeeded"

    second = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert second.status_code == 409
    assert "already fully refunded" in second.json()["detail"]
    assert len(fake_stripe.refunds.created) == 1


async def test_manual_refund_without_payment_409(
    client, seeded_car, db_session
):
    booking = await seed_booking(
        db_session, "b_free", status="confirmed", total_cents=19_800
    )
    resp = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert resp.status_code == 409


async def test_manual_refund_after_accept_blocked(
    client, seeded_car, db_session, fake_stripe
):
    """The remaining balance became the replacement's credit — no second refund."""
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session)
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )
    accept = await client.post(
        f"/api/v1/me/bookings/{booking.id}/swap/accept"
    )
    assert accept.status_code == 200

    resp = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert resp.status_code == 409
    assert "replacement" in resp.json()["detail"].lower()
    assert len(fake_stripe.refunds.created) == 1  # only the diff refund


async def test_cancel_refund_failure_still_cancels(
    client, seeded_car, db_session, fake_stripe
):
    booking = await _paid_confirmed(db_session, "b_fail")
    fake_stripe.refunds.fail_next = True

    resp = await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel", json=CANCEL
    )
    # Car released; refund recorded as failed for retry.
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["refundStatus"] == "failed"

    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refund_status == "failed"

    retry = await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    assert retry.status_code == 200
    assert retry.json()["refundedCents"] == 19_800


async def test_cancel_idempotency_keys_stable(
    client, seeded_car, db_session, fake_stripe
):
    """Same booking+purpose+amount → same Stripe idempotency key."""
    booking = await _paid_confirmed(db_session, "b_idem")
    await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")
    await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")  # 409

    keys = [k for _, k in fake_stripe.refunds.created]
    assert keys == [f"refund:{booking.id}:full:19800"]


# --- webhook charge.refunded ----------------------------------------------


def _refunded_event(payment_intent: str, amount_refunded: int, event_id: str):
    return {
        "id": event_id,
        "type": "charge.refunded",
        "data": {
            "object": {
                "id": "ch_test_1",
                "payment_intent": payment_intent,
                "amount_refunded": amount_refunded,
            }
        },
    }


async def test_webhook_charge_refunded_reconciles(
    client, seeded_car, db_session
):
    booking = await _paid_confirmed(db_session)
    event = _refunded_event("pi_test_1", 19_800, "evt_refund_1")
    payload = json.dumps(event).encode()
    sig = sign_stripe_event(
        payload, settings.stripe_webhook_secret or "whsec_test"
    )

    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers={"Stripe-Signature": sig}
    )
    assert resp.status_code == 200

    payment = (await _payments(db_session, booking.id))[0]
    assert payment.refunded_cents == 19_800
    assert payment.refund_status == "succeeded"

    # Duplicate event must not double-count (absolute set, not +=).
    event2 = _refunded_event("pi_test_1", 19_800, "evt_refund_1_dup")
    payload2 = json.dumps(event2).encode()
    sig2 = sign_stripe_event(
        payload2, settings.stripe_webhook_secret or "whsec_test"
    )
    resp2 = await client.post(
        "/api/v1/webhooks/stripe",
        content=payload2,
        headers={"Stripe-Signature": sig2},
    )
    assert resp2.status_code == 200
    await db_session.refresh(payment)
    assert payment.refunded_cents == 19_800


async def test_webhook_charge_refunded_unknown_intent(
    client, seeded_car, db_session
):
    event = _refunded_event("pi_nope", 500, "evt_refund_unknown")
    payload = json.dumps(event).encode()
    sig = sign_stripe_event(
        payload, settings.stripe_webhook_secret or "whsec_test"
    )

    resp = await client.post(
        "/api/v1/webhooks/stripe", content=payload, headers={"Stripe-Signature": sig}
    )
    assert resp.status_code == 200  # no-op, still acknowledged


# --- reads ----------------------------------------------------------------


async def test_me_bookings_include_payment_and_offer(
    client, seeded_car, db_session
):
    await _cheaper_car(db_session)
    booking = await _paid_confirmed(db_session, "b_read")
    await client.post(
        f"/api/v1/admin/bookings/{booking.id}/cancel",
        json={**CANCEL, "offeredCarId": "budget"},
    )

    resp = await client.get("/api/v1/me/bookings")
    assert resp.status_code == 200
    item = next(
        b for b in resp.json()["bookings"] if b["id"] == booking.id
    )
    assert item["cancelReason"] == CANCEL["reason"]
    assert item["payment"]["amountCents"] == 19_800
    assert item["payment"]["refundedCents"] == 0
    assert item["payment"]["origin"] == "stripe"
    assert item["swapOffer"]["status"] == "offered"
    assert item["swapOffer"]["car"]["id"] == "budget"
    assert item["swapOffer"]["originalTotalCents"] == 19_800
    assert item["swapOffer"]["offeredTotalCents"] == 10_000


async def test_admin_list_includes_refund_fields(
    client, seeded_car, db_session
):
    booking = await _paid_confirmed(db_session, "b_list")
    await client.post(f"/api/v1/admin/bookings/{booking.id}/refund")

    resp = await client.get("/api/v1/admin/bookings")
    assert resp.status_code == 200
    item = next(b for b in resp.json() if b["id"] == booking.id)
    assert item["paymentStatus"] == "succeeded"
    assert item["refundStatus"] == "succeeded"
    assert item["refundedCents"] == 19_800
    assert item["cancelReason"] is None
