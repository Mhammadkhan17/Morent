from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import Booking, Car, Notification, UserRow
from app.services.event_hub import EventHub, event_hub

# pending -> confirmed is the webhook path; owner/admin extend in M6-M7
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"confirmed", "cancelled", "failed", "active"}),
    "confirmed": frozenset({"active", "completed", "cancelled"}),
    "active": frozenset({"completed", "cancelled"}),
    "completed": frozenset(),
    "failed": frozenset(),
    "cancelled": frozenset(),
}


class IllegalTransition(Exception):
    pass


def apply(booking: Booking, to_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(booking.status, frozenset())
    if to_status not in allowed:
        raise IllegalTransition(
            f"Illegal booking transition {booking.status!r} -> {to_status!r}"
        )
    booking.status = to_status


async def find_owner_id(session: AsyncSession) -> str | None:
    result = await session.exec(select(UserRow).where(UserRow.role == "owner"))
    owner = result.first()
    return owner.id if owner else None


async def _notifications_for(
    session: AsyncSession, booking: Booking, to_status: str, actor: str
) -> list[tuple[str, str, str, str, str]]:
    """(user_id, type, title, body, link) rows to create for this transition."""
    car = await session.get(Car, booking.car_id)
    name = car.name if car else "Booking"
    booking_link = f"/account/bookings/{booking.id}"
    admin_link = f"/admin/bookings/{booking.id}"
    ntype = (
        "booking_confirmed" if to_status == "confirmed" else "booking_status_changed"
    )
    rows: list[tuple[str, str, str, str, str]] = []

    if actor == "webhook":
        if to_status == "confirmed":
            rows.append(
                (
                    booking.user_id,
                    ntype,
                    "Booking confirmed",
                    f"Payment received — your {name} booking is confirmed.",
                    booking_link,
                )
            )
            owner = await find_owner_id(session)
            if owner:
                rows.append(
                    (
                        owner,
                        ntype,
                        "Booking confirmed",
                        f"Payment received — {name} booking confirmed.",
                        admin_link,
                    )
                )
        elif to_status in ("cancelled", "failed"):
            title = (
                "Booking cancelled" if to_status == "cancelled" else "Payment failed"
            )
            rows.append(
                (
                    booking.user_id,
                    ntype,
                    title,
                    f"Your {name} booking status changed to {to_status}.",
                    booking_link,
                )
            )
    elif actor == "owner":
        copy = {
            "confirmed": (
                "Booking confirmed",
                f"Your {name} booking is confirmed.",
            ),
            "active": ("Pickup recorded", f"Your {name} rental is now active."),
            "completed": (
                "Return recorded",
                f"Thanks! Your {name} rental is complete.",
            ),
            "cancelled": (
                "Booking cancelled",
                f"Your {name} booking was cancelled.",
            ),
        }
        if to_status in copy:
            title, body = copy[to_status]
            rows.append((booking.user_id, ntype, title, body, booking_link))
    elif actor == "customer" and to_status == "cancelled":
        rows.append(
            (
                (await find_owner_id(session)) or "",
                ntype,
                "Booking cancelled",
                f"Customer cancelled the {name} booking.",
                admin_link,
            )
        )
    return [row for row in rows if row[0]]


async def transition(
    session: AsyncSession,
    booking: Booking,
    to_status: str,
    actor: str,
    hub: EventHub | None = None,
) -> None:
    """Single entry for status changes (webhook + admin): validates, sets
    status, persists counterparty notifications, publishes SSE events, commits.
    IllegalTransition propagates before any side effect."""
    apply(booking, to_status)

    hub = hub or event_hub
    events: list[tuple[str, dict[str, Any]]] = []
    for user_id, ntype, title, body, link in await _notifications_for(
        session, booking, to_status, actor
    ):
        notification = Notification(
            user_id=user_id, type=ntype, title=title, body=body, link=link
        )
        session.add(notification)
        events.append(
            (
                user_id,
                {
                    "event": "notification",
                    "id": notification.id,
                    "data": {
                        "id": notification.id,
                        "type": ntype,
                        "title": title,
                        "body": body,
                        "link": link,
                    },
                },
            )
        )

    await session.commit()
    # Publish only after a durable row exists — a failed commit must not
    # produce phantom SSE events.
    for user_id, event in events:
        hub.publish(user_id, event)
