from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.models import Booking, PromoCode
from tests.conftest import booking_body, future


async def _seed_booking(
    db_session,
    *,
    car_id: str = "koenigsegg",
    pickup: date | None = None,
    dropoff: date | None = None,
    status: str = "confirmed",
    user_id: str = "someone_else",
    session_id: str | None = None,
) -> Booking:
    pickup = pickup or date.today() + timedelta(days=20)
    dropoff = dropoff or date.today() + timedelta(days=22)
    booking = Booking(
        user_id=user_id,
        car_id=car_id,
        pickup_date=pickup,
        dropoff_date=dropoff,
        pickup_time="10:00",
        dropoff_time="10:00",
        pickup_location="NYC",
        dropoff_location="NYC",
        days=(dropoff - pickup).days,
        billing_name="Other",
        billing_phone="555",
        billing_address="a",
        billing_city="c",
        subtotal_cents=19800,
        discount_cents=0,
        total_cents=19800,
        status=status,
        stripe_session_id=session_id,
    )
    db_session.add(booking)
    await db_session.commit()
    await db_session.refresh(booking)
    return booking


@pytest.mark.asyncio
async def test_bookings_require_auth(anon_client, seeded_car):
    resp = await anon_client.post("/api/v1/bookings", json=booking_body())
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_booking_happy_path(client, seeded_car, fake_stripe):
    resp = await client.post("/api/v1/bookings", json=booking_body())
    assert resp.status_code == 201
    data = resp.json()
    assert data["sessionId"].startswith("cs_test_")
    assert data["clientSecret"].startswith("cs_test_secret_")

    # Stripe got server-computed money, not client totals
    params = fake_stripe.sessions.created_params[0]
    assert params["line_items"][0]["price_data"]["unit_amount"] == 29_700
    assert params["ui_mode"] == "elements"
    assert params["mode"] == "payment"
    assert "allow_promotion_codes" not in params
    assert params["customer_email"] == "tester@example.com"

    listing = await client.get("/api/v1/bookings")
    assert listing.status_code == 200
    bookings = listing.json()
    assert len(bookings) == 1
    assert bookings[0]["status"] == "pending"
    assert bookings[0]["totalCents"] == 29_700


@pytest.mark.asyncio
async def test_overlap_returns_409(client, seeded_car, db_session):
    start = date.today() + timedelta(days=30)
    await _seed_booking(db_session, pickup=start, dropoff=start + timedelta(days=2))

    body = booking_body()
    body["pickup"]["date"] = start.isoformat()
    body["dropoff"]["date"] = (start + timedelta(days=2)).isoformat()
    resp = await client.post("/api/v1/bookings", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_quantity_two_allows_second_unit(client, seeded_car, db_session):
    """Fleet quantity=2: one overlapping hold does not block a second unit;
    once both units are held the next overlap 409s."""
    seeded_car.quantity = 2
    db_session.add(seeded_car)
    await db_session.commit()

    start = date.today() + timedelta(days=30)
    await _seed_booking(db_session, pickup=start, dropoff=start + timedelta(days=2))

    body = booking_body()
    body["pickup"]["date"] = start.isoformat()
    body["dropoff"]["date"] = (start + timedelta(days=2)).isoformat()
    first = await client.post("/api/v1/bookings", json=body)
    assert first.status_code == 201

    # both units now held → third concurrent overlap is blocked
    await _seed_booking(
        db_session,
        pickup=start,
        dropoff=start + timedelta(days=2),
        user_id="third_customer",
    )
    third = await client.post("/api/v1/bookings", json=body)
    assert third.status_code == 409


@pytest.mark.asyncio
async def test_own_confirmed_overlap_409(client, seeded_car, db_session):
    """The caller's own *confirmed* booking blocks a second overlapping
    booking — only own *pending* rows are superseded, never ignored."""
    start = date.today() + timedelta(days=30)
    await _seed_booking(
        db_session,
        pickup=start,
        dropoff=start + timedelta(days=2),
        status="confirmed",
        user_id="user_test_1",
    )

    body = booking_body()
    body["pickup"]["date"] = start.isoformat()
    body["dropoff"]["date"] = (start + timedelta(days=2)).isoformat()
    resp = await client.post("/api/v1/bookings", json=body)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_adjacent_non_overlapping_ok(client, seeded_car, db_session):
    """Closed-interval plan rule: existing [30, 32] blocks same start;
    a booking starting after dropoff day must succeed."""
    start = date.today() + timedelta(days=30)
    await _seed_booking(db_session, pickup=start, dropoff=start + timedelta(days=2))

    body = booking_body()
    body["pickup"]["date"] = (start + timedelta(days=3)).isoformat()
    body["dropoff"]["date"] = (start + timedelta(days=5)).isoformat()
    resp = await client.post("/api/v1/bookings", json=body)
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_past_pickup_422(client, seeded_car):
    body = booking_body()
    body["pickup"]["date"] = (date.today() - timedelta(days=1)).isoformat()
    body["dropoff"]["date"] = future(2)
    resp = await client.post("/api/v1/bookings", json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_dropoff_before_pickup_422(client, seeded_car):
    body = booking_body()
    body["pickup"]["date"] = future(5)
    body["dropoff"]["date"] = future(3)
    resp = await client.post("/api/v1/bookings", json=body)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_terms_required_422(client, seeded_car):
    resp = await client.post("/api/v1/bookings", json=booking_body(agreedToTerms=False))
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_promo_applied_end_to_end(client, seeded_car, db_session, fake_stripe):
    db_session.add(PromoCode(code="DISCOUNT10", percent_off=Decimal("10"), active=True))
    await db_session.commit()

    resp = await client.post(
        "/api/v1/bookings", json=booking_body(promoCode="DISCOUNT10")
    )
    assert resp.status_code == 201
    params = fake_stripe.sessions.created_params[0]
    assert params["line_items"][0]["price_data"]["unit_amount"] == 26_730

    bookings = (await client.get("/api/v1/bookings")).json()
    assert bookings[0]["discountCents"] == 2_970
    assert bookings[0]["promoCode"] == "DISCOUNT10"


@pytest.mark.asyncio
async def test_list_only_own_bookings(client, seeded_car, db_session):
    await _seed_booking(db_session, user_id="someone_else")
    await client.post("/api/v1/bookings", json=booking_body())
    bookings = (await client.get("/api/v1/bookings")).json()
    assert len(bookings) == 1
    assert bookings[0]["userId"] == "user_test_1"


@pytest.mark.asyncio
async def test_rebook_supersedes_own_pending(client, seeded_car, fake_stripe):
    """Retrying/editing my own booking on the same car cancels the old
    pending booking and expires its Stripe session instead of 409ing."""
    resp1 = await client.post("/api/v1/bookings", json=booking_body())
    assert resp1.status_code == 201
    old_session_id = resp1.json()["sessionId"]

    body = booking_body()
    body["pickup"]["date"] = future(20)
    body["dropoff"]["date"] = future(23)
    resp2 = await client.post("/api/v1/bookings", json=body)
    assert resp2.status_code == 201
    new_session_id = resp2.json()["sessionId"]
    assert new_session_id != old_session_id

    bookings = (await client.get("/api/v1/bookings")).json()
    assert len(bookings) == 2
    assert sorted(b["status"] for b in bookings) == ["cancelled", "pending"]
    assert old_session_id in fake_stripe.sessions.expired_ids
    assert new_session_id not in fake_stripe.sessions.expired_ids


@pytest.mark.asyncio
async def test_failed_rebook_keeps_existing_pending(
    client, seeded_car, db_session, fake_stripe
):
    """Availability is checked BEFORE superseding: a 409 from someone else's
    pending must leave my pending (and its session) untouched."""
    resp1 = await client.post("/api/v1/bookings", json=booking_body())
    assert resp1.status_code == 201
    old_session_id = resp1.json()["sessionId"]

    blocked_start = date.today() + timedelta(days=30)
    await _seed_booking(
        db_session,
        pickup=blocked_start,
        dropoff=blocked_start + timedelta(days=2),
        status="pending",
    )

    body = booking_body()
    body["pickup"]["date"] = blocked_start.isoformat()
    body["dropoff"]["date"] = (blocked_start + timedelta(days=2)).isoformat()
    resp2 = await client.post("/api/v1/bookings", json=body)
    assert resp2.status_code == 409

    mine = (await client.get("/api/v1/bookings")).json()
    assert len(mine) == 1
    assert mine[0]["status"] == "pending"
    assert old_session_id not in fake_stripe.sessions.expired_ids


async def test_supersede_expire_failure_aborts(
    client, seeded_car, db_session, fake_stripe, monkeypatch
):
    """If the Stripe session cannot be expired, the old pending booking must
    NOT be cancelled (it would stay payable while dead on our side)."""
    await _seed_booking(
        db_session,
        status="pending",
        user_id="user_test_1",
        session_id="cs_test_stuck",
    )

    async def boom(session_id):
        raise RuntimeError("stripe down")

    monkeypatch.setattr(fake_stripe, "expire_checkout_session", boom)

    with pytest.raises(RuntimeError, match="stripe down"):
        await client.post("/api/v1/bookings", json=booking_body())

    from sqlmodel import select

    mine = (
        await db_session.exec(
            select(Booking).where(Booking.stripe_session_id == "cs_test_stuck")
        )
    ).first()
    assert mine is not None
    assert mine.status == "pending"
