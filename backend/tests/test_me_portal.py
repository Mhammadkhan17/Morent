from datetime import UTC, date, datetime, timedelta

from app.models import CustomerProfile, Message, Notification, UserRow
from app.services.event_hub import event_hub
from tests.conftest import seed_booking

ISO = "%Y-%m-%d"


async def _owner(user_id: str = "user_owner_2", db_session=None) -> None:
    db_session.add(UserRow(id=user_id, email="owner@example.com", role="owner"))
    await db_session.commit()


class TestMeBookings:
    async def test_enriched_own_bookings_only(self, client, db_session, seeded_car):
        await seed_booking(db_session, "b_active", status="active", total_cents=10_000)
        await seed_booking(
            db_session,
            "b_past",
            status="completed",
            total_cents=8_000,
            pickup=date.today() - timedelta(days=10),
            dropoff=date.today() - timedelta(days=8),
        )
        await seed_booking(
            db_session,
            "b_stranger",
            status="confirmed",
            total_cents=5_000,
            user_id="user_other",
        )

        res = await client.get("/api/v1/me/bookings")
        assert res.status_code == 200
        items = res.json()["bookings"]
        ids = {item["id"] for item in items}
        assert ids == {"b_active", "b_past"}
        active = next(item for item in items if item["id"] == "b_active")
        assert active["car"]["name"] == "Koenigsegg Gemera"
        assert active["car"]["imageUrl"].endswith("car.png")
        assert active["totalCents"] == 10_000
        assert active["unreadMessages"] == 0

    async def test_unread_counts_incoming_only(self, client, db_session, seeded_car):
        await seed_booking(db_session, "b1", status="confirmed", total_cents=1_000)
        db_session.add_all(
            [
                Message(
                    booking_id="b1", sender_id="user_owner_2", body="see you"
                ),
                Message(
                    booking_id="b1", sender_id="user_owner_2", body="bring license"
                ),
                Message(booking_id="b1", sender_id="user_test_1", body="ok"),
            ]
        )
        await db_session.commit()

        res = await client.get("/api/v1/me/bookings")
        item = res.json()["bookings"][0]
        assert item["unreadMessages"] == 2

    async def test_requires_auth(self, anon_client):
        res = await anon_client.get("/api/v1/me/bookings")
        assert res.status_code == 401


class TestMeProfile:
    async def test_patch_upserts_and_get_returns(self, client, db_session):
        res = await client.patch(
            "/api/v1/me/profile",
            json={
                "phone": "555-0111",
                "licenseNumber": "DL-9",
                "licenseExpires": "2030-01-15",
            },
        )
        assert res.status_code == 200
        assert res.json()["phone"] == "555-0111"
        assert res.json()["licenseExpires"] == "2030-01-15"

        res2 = await client.patch("/api/v1/me/profile", json={"phone": "555-0222"})
        assert res2.json()["phone"] == "555-0222"
        assert res2.json()["licenseNumber"] == "DL-9"

        profile = await db_session.get(CustomerProfile, "user_test_1")
        assert profile is not None and profile.phone == "555-0222"

        res3 = await client.get("/api/v1/me/profile")
        assert res3.status_code == 200
        assert res3.json()["licenseNumber"] == "DL-9"

    async def test_requires_auth(self, anon_client):
        res = await anon_client.patch("/api/v1/me/profile", json={"phone": "x"})
        assert res.status_code == 401


class TestMessages:
    async def test_post_on_own_booking_notifies_owners_and_sse(
        self, client, db_session, seeded_car
    ):
        await _owner("user_owner_2", db_session)
        await seed_booking(db_session, "b1", status="confirmed", total_cents=1_000)

        queue = event_hub.subscribe("user_owner_2")
        try:
            res = await client.post(
                "/api/v1/bookings/b1/messages", json={"body": "Hi, where do I pick up?"}
            )
            assert res.status_code == 201
            assert res.json()["senderId"] == "user_test_1"
            events = [queue.get_nowait() for _ in range(queue.qsize())]
            kinds = {e["event"] for e in events}
            assert kinds == {"message", "notification"}
            message_event = next(e for e in events if e["event"] == "message")
            assert message_event["data"]["body"] == "Hi, where do I pick up?"
        finally:
            event_hub.unsubscribe("user_owner_2", queue)

        note = (
            await db_session.exec(
                __import__("sqlmodel").select(Notification).where(
                    Notification.user_id == "user_owner_2"
                )
            )
        ).one()
        assert note.type == "message"
        assert "b1" in note.link

    async def test_post_by_owner_notifies_customer(
        self, client, owner_user, db_session, seeded_car
    ):
        await seed_booking(
            db_session,
            "b2",
            status="confirmed",
            total_cents=1_000,
            user_id="user_other",
        )
        res = await client.post(
            "/api/v1/bookings/b2/messages", json={"body": "keys ready"}
        )
        assert res.status_code == 201
        note = (
            await db_session.exec(
                __import__("sqlmodel").select(Notification).where(
                    Notification.user_id == "user_other"
                )
            )
        ).one()
        assert note.type == "message"

    async def test_stranger_get_403(self, client, db_session, seeded_car):
        await seed_booking(
            db_session,
            "b3",
            status="confirmed",
            total_cents=1_000,
            user_id="user_other",
        )
        res = await client.get("/api/v1/bookings/b3/messages")
        assert res.status_code == 403

    async def test_stranger_post_403(self, client, db_session, seeded_car):
        await seed_booking(
            db_session,
            "b4",
            status="confirmed",
            total_cents=1_000,
            user_id="user_other",
        )
        res = await client.post("/api/v1/bookings/b4/messages", json={"body": "hi"})
        assert res.status_code == 403

    async def test_missing_booking_404(self, client):
        res = await client.get("/api/v1/bookings/nope/messages")
        assert res.status_code == 404

    async def test_get_marks_incoming_read_and_orders_asc(
        self, client, db_session, seeded_car
    ):
        await seed_booking(db_session, "b5", status="confirmed", total_cents=1_000)
        older = datetime.now(UTC) - timedelta(minutes=2)
        newer = datetime.now(UTC) - timedelta(minutes=1)
        db_session.add_all(
            [
                Message(
                    booking_id="b5",
                    sender_id="user_owner_2",
                    body="first",
                    created_at=older,
                ),
                Message(
                    booking_id="b5",
                    sender_id="user_test_1",
                    body="second",
                    created_at=newer,
                ),
            ]
        )
        await db_session.commit()

        res = await client.get("/api/v1/bookings/b5/messages")
        assert res.status_code == 200
        msgs = res.json()["messages"]
        assert [m["body"] for m in msgs] == ["first", "second"]
        assert msgs[0]["readAt"] is not None

    async def test_empty_body_422(self, client, db_session, seeded_car):
        await seed_booking(db_session, "b6", status="confirmed", total_cents=1_000)
        res = await client.post("/api/v1/bookings/b6/messages", json={"body": "   "})
        assert res.status_code == 422

    async def test_requires_auth(self, anon_client):
        res = await anon_client.get("/api/v1/bookings/b1/messages")
        assert res.status_code == 401
