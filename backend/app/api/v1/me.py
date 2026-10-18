from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app.core.security import CurrentUserDep, SessionDep
from app.models import Notification
from app.schemas.me import NotificationItem, NotificationListResponse

me_router = APIRouter(prefix="/me", tags=["me"])


def _user_id(user: dict) -> str:
    return user.get("sub") or user.get("id") or ""


def _item(notification: Notification) -> NotificationItem:
    return NotificationItem(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        link=notification.link,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


@me_router.get("")
async def me(user: CurrentUserDep) -> dict[str, str | bool | None]:
    return {
        "id": user.get("sub", ""),
        "email": user.get("email", ""),
        "name": user.get("name"),
        "emailVerified": user.get("emailVerified", False),
    }


@me_router.get("/notifications")
async def list_notifications(
    user: CurrentUserDep, session: SessionDep
) -> NotificationListResponse:
    user_id = _user_id(user)
    rows = (
        await session.exec(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    ).all()
    unread = (
        await session.exec(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    ).one()
    return NotificationListResponse(
        notifications=[_item(row) for row in rows],
        unread_count=unread,
    )


@me_router.post("/notifications/read-all")
async def read_all_notifications(
    user: CurrentUserDep, session: SessionDep
) -> dict[str, int]:
    user_id = _user_id(user)
    rows = (
        await session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    ).all()
    now = datetime.now(UTC)
    for row in rows:
        row.read_at = now
        session.add(row)
    await session.commit()
    return {"updated": len(rows)}


@me_router.post("/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    user: CurrentUserDep,
    session: SessionDep,
) -> NotificationItem:
    notification = await session.get(Notification, notification_id)
    if notification is None or notification.user_id != _user_id(user):
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        session.add(notification)
        await session.commit()
    return _item(notification)
