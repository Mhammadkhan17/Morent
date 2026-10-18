import asyncio

from app.services.event_hub import EventHub


def test_publish_reaches_only_that_user() -> None:
    hub = EventHub()
    q1 = hub.subscribe("u1")
    q2 = hub.subscribe("u2")

    event = {"event": "notification", "id": "n1", "data": {"title": "Booked"}}
    hub.publish("u1", event)

    assert q1.get_nowait() == event  # exact payload, unchanged
    assert q2.empty()


def test_publish_without_subscriber_is_noop() -> None:
    hub = EventHub()
    hub.publish("nobody", {"event": "notification", "id": "n1", "data": {}})


def test_unsubscribe_stops_delivery() -> None:
    hub = EventHub()
    q = hub.subscribe("u1")
    hub.unsubscribe("u1", q)

    hub.publish("u1", {"event": "notification", "id": "n1", "data": {}})

    assert q.empty()


def test_second_subscription_same_user_also_receives() -> None:
    hub = EventHub()
    qa = hub.subscribe("u1")
    qb = hub.subscribe("u1")

    hub.publish("u1", {"event": "message", "id": "m1", "data": {"body": "hi"}})

    assert qa.get_nowait() == qb.get_nowait()


def test_many_events_stay_fifo() -> None:
    hub = EventHub()
    q = hub.subscribe("u1")
    for n in range(3):
        hub.publish("u1", {"event": "notification", "id": str(n), "data": {}})

    ids = [q.get_nowait()["id"] for _ in range(3)]
    assert ids == ["0", "1", "2"]


def test_subscribe_returns_queue_usable_with_asyncio() -> None:
    hub = EventHub()
    q = hub.subscribe("u1")
    hub.publish("u1", {"event": "notification", "id": "n1", "data": {}})

    async def drain():
        return await asyncio.wait_for(q.get(), timeout=1)

    assert asyncio.run(drain())["id"] == "n1"
