"""M6-5a: admin overview + booking list + booking status PATCH + owner
notification on new booking."""

from datetime import UTC, date, datetime, timedelta

from sqlmodel import select

from app.models import Notification, UserRow
from tests.conftest import booking_body, seed_booking


async def test_admin_endpoints_require_owner(client, seeded_car):
    for path in ("/api/v1/admin/overview", "/api/v1/admin/bookings"):
        resp = await client.get(path)
        assert resp.status_code == 403, path


async def test_overview_returns_kpis(client, owner_user, seeded_car, db_session):
    now = datetime.now(UTC)
    await seed_booking(
        db_session,
        "b_conf",
        status="confirmed",
        total_cents=19_800,
        created_at=now - timedelta(days=1),
        pickup=date.today() + timedelta(days=2),
    )
    await seed_booking(
        db_session,
        "b_active",
        status="active",
        total_cents=9_900,
        created_at=now - timedelta(hours=1),
        pickup=date.today(),
    )
    await seed_booking(
        db_session,
        "b_pending",
        status="pending",
        total_cents=7_700,
        created_at=now - timedelta(hours=2),
        pickup=date.today() + timedelta(days=1),
    )
    await seed_booking(
        db_session,
        "b_cancelled",
        status="cancelled",
        total_cents=6_600,
        created_at=now,  # newest
        pickup=date.today() + timedelta(days=3),
    )
    await seed_booking(
        db_session,
        "b_old",
        status="confirmed",
        total_cents=50_000,
        created_at=now - timedelta(days=400),
        pickup=date.today() + timedelta(days=30),
    )

    resp = await client.get("/api/v1/admin/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["revenueMtdCents"] == 29_700  # b_conf + b_active, not old/pending
    assert data["activeRentals"] == 1
    assert data["upcoming7d"] == 1  # b_conf only (b_pending is pending)
    assert data["fleetSize"] == 1
    assert data["utilizationPercent"] == 100  # koenigsegg has active+confirmed
    assert data["pendingConfirmations"] == 1
    assert data["recentActivity"][0]["bookingId"] == "b_cancelled"
    assert len(data["recentActivity"]) == 5
    assert data["recentActivity"][0]["status"] == "cancelled"


async def test_bookings_list_join_and_filters(
    client, owner_user, seeded_car, db_session
):
    db_session.add(
        UserRow(
            id="cust_1",
            email="alice@example.com",
            name="AliceWonder",
            role="customer",
        )
    )
    await db_session.commit()
    now = datetime.now(UTC)
    await seed_booking(
        db_session, "b_alice", status="confirmed", total_cents=1_000,
        created_at=now - timedelta(minutes=2), user_id="cust_1",
    )
    await seed_booking(
        db_session, "b_bob", status="pending", total_cents=2_000,
        created_at=now - timedelta(minutes=1), user_id="user_test_1",
    )

    resp = await client.get("/api/v1/admin/bookings")
    assert resp.status_code == 200
    items = resp.json()
    assert [i["id"] for i in items] == ["b_bob", "b_alice"]  # newest first
    alice = items[1]
    assert alice["customerName"] == "AliceWonder"
    assert alice["customerEmail"] == "alice@example.com"
    assert alice["carName"] == "Koenigsegg Gemera"
    assert alice["totalCents"] == 1_000

    by_status = (await client.get("/api/v1/admin/bookings?status=pending")).json()
    assert [i["id"] for i in by_status] == ["b_bob"]

    by_car = (await client.get("/api/v1/admin/bookings?car_id=koenigsegg")).json()
    assert len(by_car) == 2

    by_q = (await client.get("/api/v1/admin/bookings?q=alicewonder")).json()
    assert [i["id"] for i in by_q] == ["b_alice"]

    by_missing_q = (await client.get("/api/v1/admin/bookings?q=zzz")).json()
    assert by_missing_q == []


async def test_patch_booking_status(client, owner_user, seeded_car, db_session):
    booking = await seed_booking(
        db_session, "b_patch", status="pending", total_cents=19_800
    )

    resp = await client.patch(
        f"/api/v1/admin/bookings/{booking.id}", json={"status": "confirmed"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "confirmed"

    notifications = list(
        (await db_session.exec(select(Notification))).all()
    )
    assert len(notifications) == 1
    assert notifications[0].title == "Booking confirmed"
    assert notifications[0].user_id == "user_test_1"

    # `pending` is never a legal target from any state
    illegal = await client.patch(
        f"/api/v1/admin/bookings/{booking.id}", json={"status": "pending"}
    )
    assert illegal.status_code == 409

    missing = await client.patch(
        "/api/v1/admin/bookings/nope", json={"status": "confirmed"}
    )
    assert missing.status_code == 404


async def test_new_booking_notifies_owner(
    client, owner_user, seeded_car, db_session
):
    from app.services.event_hub import event_hub

    queue = event_hub.subscribe("user_test_1")
    try:
        resp = await client.post("/api/v1/bookings", json=booking_body())
        assert resp.status_code == 201

        notifications = list(
            (await db_session.exec(select(Notification))).all()
        )
        assert len(notifications) == 1
        owner_note = notifications[0]
        assert owner_note.user_id == "user_test_1"
        assert owner_note.title == "New booking"
        assert owner_note.type == "booking_new"
        assert owner_note.link.startswith("/admin/bookings/")

        event = queue.get_nowait()
        assert event["event"] == "notification"
        assert event["data"]["title"] == "New booking"
    finally:
        event_hub.unsubscribe("user_test_1", queue)
