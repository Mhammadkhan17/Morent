"""Seam 4: GET /api/v1/events — authenticated SSE stream.

Contract: 401 without Bearer; with auth, 200 text/event-stream that delivers a
published hub event. Last-Event-ID replay is deferred (see Dashboard-plan).

The streaming case drives the ASGI app directly: httpx's ASGITransport
buffers whole responses, so `client.stream()` cannot observe an infinite
SSE stream. Direct ASGI keeps the real status/header/body layer and lets
chunks be read as they are sent."""

import asyncio
from asyncio import Queue
from contextlib import suppress
from typing import Any

from app.main import app
from app.services.event_hub import event_hub

SSE_PATH = "/api/v1/events"


class SseConnection:
    """Minimal ASGI client that yields response messages as they are sent."""

    def __init__(self) -> None:
        self.starts: Queue[dict[str, Any]] = Queue()
        self.bodies: Queue[bytes] = Queue()
        self._disconnected = False
        self.task = asyncio.create_task(app(self._scope(), self._receive, self._send))

    @staticmethod
    def _scope() -> dict[str, Any]:
        return {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": SSE_PATH,
            "raw_path": SSE_PATH.encode(),
            "query_string": b"",
            "headers": [(b"accept", b"text/event-stream")],
            "client": ("testclient", 50000),
            "server": ("testserver", 80),
            "root_path": "",
        }

    async def _receive(self) -> dict[str, Any]:
        if not self._disconnected:
            self._disconnected = True
            return {"type": "http.request", "body": b"", "more_body": False}
        # Keep the connection open until the app is cancelled.
        await asyncio.Event().wait()
        raise RuntimeError("unreachable")

    async def _send(self, message: dict[str, Any]) -> None:
        if message["type"] == "http.response.start":
            self.starts.put_nowait(message)
        elif message["type"] == "http.response.body":
            self.bodies.put_nowait(message.get("body", b""))

    async def close(self) -> None:
        self.task.cancel()
        with suppress(asyncio.CancelledError):
            await self.task


async def _next(queue: Queue) -> Any:
    return await asyncio.wait_for(queue.get(), 5)


async def test_events_requires_auth(anon_client):
    resp = await anon_client.get(SSE_PATH)
    assert resp.status_code == 401


async def test_events_streams_published_notification(client):
    # `client` activates the app dependency overrides (get_current_user).
    conn = SseConnection()
    try:
        start = await _next(conn.starts)
        assert start["status"] == 200
        content_type = dict(start["headers"]).get(b"content-type", b"")
        assert content_type.startswith(b"text/event-stream")

        buf = b""
        while b": connected" not in buf:
            buf += await _next(conn.bodies)
        assert "user_test_1" in event_hub._subscribers

        event_hub.publish(
            "user_test_1",
            {
                "event": "notification",
                "id": "notif_1",
                "data": {"title": "Booking confirmed"},
            },
        )
        while b"id: notif_1" not in buf:
            buf += await _next(conn.bodies)

        text = buf.decode()
        assert "event: notification" in text
        assert "id: notif_1" in text
        assert "Booking confirmed" in text
    finally:
        await conn.close()

    assert "user_test_1" not in event_hub._subscribers
