from datetime import date

import pytest
from sqlmodel import select

from app.models import Booking, Notification, UserRow
from app.services.booking_status import IllegalTransition, transition
from app.services.event_hub import EventHub


def _booking(status: str = "pending") -> Booking:
    return Booking(
        id="b1",
        user_id="u1",
        car_id="c1",
        pickup_date=date(2026, 11, 1),
        dropoff_date=date(2026, 11, 4),
        pickup_time="10:00",
        dropoff_time="10:00",
        pickup_location="NYC",
        dropoff_location="NYC",
        days=3,
        billing_name="n",
        billing_phone="p",
        billing_address="a",
        billing_city="c",
        subtotal_cents=29700,
        discount_cents=0,
        total_cents=29700,
        status=status,
    )


async def _all_notifications(db_session) -> list[Notification]:
    result = await db_session.exec(select(Notification))
    return list(result.all())


async def test_webhook_confirm_notifies_customer_and_owner(db_session) -> None:
    db_session.add(UserRow(id="owner_1", email="o@x.com", role="owner"))
    db_session.add(_booking())
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()
    hub = EventHub()
    hub.subscribe("u1")
    hub.subscribe("owner_1")

    await transition(db_session, booking, "confirmed", actor="webhook", hub=hub)

    assert booking.status == "confirmed"
    notifications = await _all_notifications(db_session)
    by_user = {n.user_id: n for n in notifications}
    assert set(by_user) == {"u1", "owner_1"}
    assert by_user["u1"].type == "booking_confirmed"
    assert by_user["u1"].title == "Booking confirmed"
    assert by_user["u1"].link == "/account/bookings/b1"
    assert by_user["owner_1"].link == "/admin/bookings/b1"


async def test_illegal_transition_has_no_side_effects(db_session) -> None:
    db_session.add(_booking())
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()
    hub = EventHub()

    with pytest.raises(IllegalTransition):
        await transition(db_session, booking, "completed", actor="owner", hub=hub)

    assert booking.status == "pending"
    assert await _all_notifications(db_session) == []


async def test_owner_handover_notifies_customer(db_session) -> None:
    db_session.add(_booking(status="confirmed"))
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()
    hub = EventHub()
    hub.subscribe("u1")

    await transition(db_session, booking, "active", actor="owner", hub=hub)

    notifications = await _all_notifications(db_session)
    assert len(notifications) == 1
    assert notifications[0].user_id == "u1"
    assert notifications[0].title == "Pickup recorded"
    assert hub._subscribers["u1"].pop().get_nowait()["id"] == notifications[0].id


async def test_owner_return_notifies_customer(db_session) -> None:
    db_session.add(_booking(status="active"))
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()

    await transition(db_session, booking, "completed", actor="owner", hub=EventHub())

    notifications = await _all_notifications(db_session)
    assert len(notifications) == 1
    assert notifications[0].title == "Return recorded"


async def test_customer_cancel_notifies_owner(db_session) -> None:
    db_session.add(UserRow(id="owner_1", email="o@x.com", role="owner"))
    db_session.add(_booking())
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()

    await transition(
        db_session, booking, "cancelled", actor="customer", hub=EventHub()
    )

    notifications = await _all_notifications(db_session)
    assert len(notifications) == 1
    assert notifications[0].user_id == "owner_1"
    assert notifications[0].title == "Booking cancelled"
    assert notifications[0].link == "/admin/bookings/b1"


async def test_webhook_expired_notifies_customer_only(db_session) -> None:
    db_session.add(UserRow(id="owner_1", email="o@x.com", role="owner"))
    db_session.add(_booking())
    await db_session.commit()
    booking = (await db_session.exec(select(Booking))).one()

    await transition(
        db_session, booking, "cancelled", actor="webhook", hub=EventHub()
    )

    notifications = await _all_notifications(db_session)
    assert len(notifications) == 1
    assert notifications[0].user_id == "u1"
    assert notifications[0].title == "Booking cancelled"
