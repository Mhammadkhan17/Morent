import asyncio
import contextlib
from collections import defaultdict
from typing import Any

# Single-worker MVP: in-process dict only. Multi-worker fan-out needs Redis
# (documented in Dashboard-plan Known risks) — never silently partial.
Event = dict[str, Any]  # {"event": <name>, "id": <str>, "data": {...}}


class EventHub:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[Event]]] = defaultdict(set)

    def subscribe(self, user_id: str) -> asyncio.Queue[Event]:
        queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=100)
        self._subscribers[user_id].add(queue)
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue[Event]) -> None:
        subscribers = self._subscribers.get(user_id)
        if subscribers is None:
            return
        subscribers.discard(queue)
        if not subscribers:
            del self._subscribers[user_id]

    def publish(self, user_id: str, event: Event) -> None:
        for queue in list(self._subscribers.get(user_id, ())):
            # Slow consumer: drop rather than block the request.
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(event)


event_hub = EventHub()
