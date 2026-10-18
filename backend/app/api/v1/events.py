import asyncio
from collections.abc import AsyncIterable

from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.core.security import CurrentUserDep
from app.services.event_hub import event_hub

events_router = APIRouter(prefix="/events", tags=["events"])

HEARTBEAT_SECONDS = 25.0


@events_router.get("", response_class=EventSourceResponse)
async def stream_events(user: CurrentUserDep) -> AsyncIterable[ServerSentEvent]:
    user_id = user.get("sub") or user.get("id")
    queue = event_hub.subscribe(user_id)
    try:
        yield ServerSentEvent(comment="connected")
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=HEARTBEAT_SECONDS)
            except TimeoutError:
                yield ServerSentEvent(comment="heartbeat")
                continue
            yield ServerSentEvent(
                event=event["event"],
                id=event["id"],
                data=event["data"],
            )
    finally:
        event_hub.unsubscribe(user_id, queue)
