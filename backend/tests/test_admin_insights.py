"""M6-5d: admin customers (profiles + counts + spend) and analytics."""

from datetime import UTC, date, datetime, timedelta

from app.models import CustomerProfile, UserRow
from tests.conftest import seed_booking


async def _seed_customers(db_session):
    db_session.add(
        UserRow(
            id="cust_1",
            email="alice@example.com",
            name="AliceWonder",
            role="customer",
        )
    )
    db_session.add(
        UserRow(id="cust_2", email="bob@example.com", name="Bob", role="customer")
    )
    db_session.add(CustomerProfile(user_id="cust_1", phone="555-9999"))
    await db_session.commit()


async def test_customers_list(client, owner_user, seeded_car, db_session):
    await _seed_customers(db_session)
    await seed_booking(
        db_session, "c_done", status="completed", total_cents=20_000,
        user_id="cust_1", created_at=datetime(2026, 1, 5, tzinfo=UTC),
    )
    await seed_booking(
        db_session, "c_cancel", status="cancelled", total_cents=5_000,
        user_id="cust_1", created_at=datetime(2026, 2, 5, tzinfo=UTC),
    )

    resp = await client.get("/api/v1/admin/customers")
    assert resp.status_code == 200
    items = resp.json()
    assert [c["name"] for c in items] == ["AliceWonder", "Bob"]  # owner excluded
    alice = items[0]
    assert alice["bookingCount"] == 2
    assert alice["totalSpentCents"] == 20_000  # cancelled does not count
    bob = items[1]
    assert bob["bookingCount"] == 0
    assert bob["totalSpentCents"] == 0
    assert "licenseNumber" not in alice  # list stays light


async def test_customer_detail(client, owner_user, seeded_car, db_session):
    await _seed_customers(db_session)
    await seed_booking(
        db_session, "c_done", status="completed", total_cents=20_000,
        user_id="cust_1", created_at=datetime(2026, 1, 5, tzinfo=UTC),
    )
    await seed_booking(
        db_session, "c_cancel", status="cancelled", total_cents=5_000,
        user_id="cust_1", created_at=datetime(2026, 2, 5, tzinfo=UTC),
    )

    resp = await client.get("/api/v1/admin/customers/cust_1")
    assert resp.status_code == 200
    data = resp.json()
    assert data["phone"] == "555-9999"
    assert data["licenseNumber"] is None
    assert data["bookingCount"] == 2
    assert data["totalSpentCents"] == 20_000
    assert [b["id"] for b in data["bookings"]] == ["c_cancel", "c_done"]
    assert data["bookings"][0]["carName"] == "Koenigsegg Gemera"

    empty = (await client.get("/api/v1/admin/customers/cust_2")).json()
    assert empty["bookings"] == []

    assert (await client.get("/api/v1/admin/customers/user_test_1")).status_code == 404
    assert (await client.get("/api/v1/admin/customers/nope")).status_code == 404


async def test_analytics_range(client, owner_user, seeded_car, db_session):
    created = await client.post(
        "/api/v1/admin/cars",
        json={
            "name": "BMW M5",
            "type": "Sedan",
            "description": "d",
            "fuelCapacity": "68L",
            "transmission": "Automatic",
            "seatingCapacity": "5",
            "pricePerDay": 120.0,
            "imageUrl": "https://example.com/bmw.jpg",
        },
    )
    assert created.status_code == 201
    bmw_id = created.json()["id"]

    await seed_booking(
        db_session, "a_conf", status="confirmed", total_cents=19_800,
        promo_code="DISCOUNT10", discount_cents=1_980,
        created_at=datetime(2026, 10, 5, 12, tzinfo=UTC),
        pickup=date(2026, 10, 10), dropoff=date(2026, 10, 12),
    )
    await seed_booking(
        db_session, "a_pending", status="pending", total_cents=5_000,
        created_at=datetime(2026, 10, 6, 12, tzinfo=UTC),
        pickup=date(2026, 10, 15), dropoff=date(2026, 10, 17),
    )
    await seed_booking(
        db_session, "a_active", status="active", total_cents=10_000,
        created_at=datetime(2026, 10, 20, 12, tzinfo=UTC),
        pickup=date(2026, 10, 21), dropoff=date(2026, 10, 26), car_id=bmw_id,
    )
    await seed_booking(
        db_session, "a_old", status="confirmed", total_cents=99_999,
        created_at=datetime(2026, 9, 15, 12, tzinfo=UTC),
        pickup=date(2026, 9, 20), dropoff=date(2026, 9, 22),
    )

    resp = await client.get(
        "/api/v1/admin/analytics?from=2026-10-01&to=2026-10-31"
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["revenueByDay"] == [
        {"date": "2026-10-05", "revenueCents": 19_800},
        {"date": "2026-10-20", "revenueCents": 10_000},
    ]

    week_of = lambda d: (  # noqa: E731
        d - timedelta(days=d.weekday())
    ).isoformat()
    assert data["revenueByWeek"] == [
        {"weekStart": week_of(date(2026, 10, 5)), "revenueCents": 19_800},
        {"weekStart": week_of(date(2026, 10, 20)), "revenueCents": 10_000},
    ]

    assert data["bookingsByCar"] == [
        {"carId": "koenigsegg", "carName": "Koenigsegg Gemera", "bookings": 2},
        {"carId": bmw_id, "carName": "BMW M5", "bookings": 1},
    ]

    range_days = 31
    util = {u["carId"]: u["utilizationPercent"] for u in data["utilizationByCar"]}
    assert util == {
        bmw_id: round(100 * 5 / range_days),       # a_active days=5
        "koenigsegg": round(100 * 2 / range_days),  # a_conf days=2 (pending ignored)
    }

    assert data["topPromoCodes"] == [
        {"code": "DISCOUNT10", "uses": 1, "discountCents": 1_980}
    ]


async def test_analytics_default_window(client, owner_user, seeded_car):
    resp = await client.get("/api/v1/admin/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data) == {
        "revenueByDay",
        "revenueByWeek",
        "bookingsByCar",
        "utilizationByCar",
        "topPromoCodes",
    }
