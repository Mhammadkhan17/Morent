"""M6-7: /me/notifications — list newest 50 + unread count, mark one/all read."""

from datetime import UTC, datetime, timedelta

from app.models import Notification
from tests.conftest import TEST_USER


async def seed_notification(
    db_session,
    notification_id: str,
    *,
    user_id: str = TEST_USER["sub"],
    created_at: datetime | None = None,
    read_at: datetime | None = None,
    title: str = "Booking confirmed",
) -> Notification:
    notification = Notification(
        id=notification_id,
        user_id=user_id,
        type="booking_confirmed",
        title=title,
        body="details",
        link="/account",
        created_at=created_at or datetime.now(UTC),
        read_at=read_at,
    )
    db_session.add(notification)
    await db_session.commit()
    return notification


async def test_notifications_require_auth(anon_client):
    resp = await anon_client.get("/api/v1/me/notifications")
    assert resp.status_code == 401


async def test_list_empty(client):
    resp = await client.get("/api/v1/me/notifications")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["notifications"] == []
    assert payload["unreadCount"] == 0


async def test_list_newest_first_limit_and_unread_count(client, db_session):
    base = datetime.now(UTC)
    for i in range(55):
        await seed_notification(
            db_session,
            f"n_{i}",
            created_at=base + timedelta(seconds=i),
        )
    await seed_notification(
        db_session,
        "n_foreign",
        user_id="someone_else",
        created_at=base + timedelta(seconds=99),
    )

    resp = await client.get("/api/v1/me/notifications")
    payload = resp.json()
    assert len(payload["notifications"]) == 50
    # badge counts every unread row, not just the page shown
    assert payload["unreadCount"] == 55
    newest = payload["notifications"][0]
    assert newest["id"] == "n_54"
    assert all(item["id"] != "n_foreign" for item in payload["notifications"])


async def test_read_one_marks_read_and_decrements_unread(client, db_session):
    await seed_notification(db_session, "n_1")

    resp = await client.post("/api/v1/me/notifications/n_1/read")
    assert resp.status_code == 200
    assert resp.json()["readAt"] is not None

    listing = (await client.get("/api/v1/me/notifications")).json()
    assert listing["unreadCount"] == 0

    # idempotent re-read
    again = await client.post("/api/v1/me/notifications/n_1/read")
    assert again.status_code == 200


async def test_read_one_hides_other_users_notifications(client, db_session):
    foreign = await seed_notification(
        db_session, "n_foreign", user_id="someone_else"
    )

    resp = await client.post(f"/api/v1/me/notifications/{foreign.id}/read")
    assert resp.status_code == 404

    # untouched for its owner
    assert foreign.read_at is None
    missing = await client.post("/api/v1/me/notifications/nope/read")
    assert missing.status_code == 404


async def test_read_all_only_own_unread(client, db_session):
    await seed_notification(db_session, "n_a")
    await seed_notification(db_session, "n_b")
    await seed_notification(db_session, "n_c")
    await seed_notification(
        db_session, "n_already", read_at=datetime.now(UTC)
    )
    foreign = await seed_notification(
        db_session, "n_foreign", user_id="someone_else"
    )

    resp = await client.post("/api/v1/me/notifications/read-all")
    assert resp.status_code == 200
    assert resp.json() == {"updated": 3}

    listing = (await client.get("/api/v1/me/notifications")).json()
    assert listing["unreadCount"] == 0

    assert foreign.read_at is None
