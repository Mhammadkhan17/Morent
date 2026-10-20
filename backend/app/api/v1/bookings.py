from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.core.security import CurrentUserDep
from app.models import Booking, Message, Notification, UserRow
from app.schemas.bookings import (
    BookingRequest,
    BookingResponse,
    CheckoutSessionResponse,
)
from app.schemas.me import MessageItem, MessageListResponse, MessagePayload
from app.services.booking import booking_to_response, create_booking
from app.services.event_hub import event_hub
from app.services.stripe_service import StripeService, get_stripe_service

bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
StripeDep = Annotated[StripeService, Depends(get_stripe_service)]


def _user_id(user: dict) -> str:
    return user.get("sub") or user.get("id") or ""


def _message_item(message: Message) -> MessageItem:
    return MessageItem(
        id=message.id,
        booking_id=message.booking_id,
        sender_id=message.sender_id,
        body=message.body,
        read_at=message.read_at,
        created_at=message.created_at,
    )


async def _require_thread_participant(
    session: AsyncSession, booking_id: str, user: dict
) -> tuple[Booking, str, bool]:
    booking = await session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    me = _user_id(user)
    row = await session.get(UserRow, me)
    is_owner = row is not None and row.role == "owner"
    if booking.user_id != me and not is_owner:
        raise HTTPException(status_code=403, detail="Not a participant of this thread")
    return booking, me, is_owner


@bookings_router.post("", status_code=201)
async def create_booking_endpoint(
    payload: BookingRequest,
    session: SessionDep,
    stripe_service: StripeDep,
    user: CurrentUserDep,
) -> CheckoutSessionResponse:
    user_id = user.get("sub") or user.get("id") or ""
    user_email = user.get("email") or ""
    _booking, session_id, client_secret = await create_booking(
        session,
        stripe_service,
        user_id=user_id,
        user_email=user_email,
        payload=payload,
    )
    return CheckoutSessionResponse(sessionId=session_id, clientSecret=client_secret)


@bookings_router.get("")
async def list_my_bookings(
    session: SessionDep, user: CurrentUserDep
) -> list[BookingResponse]:
    user_id = user.get("sub") or user.get("id") or ""
    result = await session.exec(
        select(Booking).where(Booking.user_id == user_id).order_by(Booking.created_at)
    )
    return [BookingResponse(**booking_to_response(b)) for b in result.all()]


@bookings_router.get("/{booking_id}")
async def get_my_booking(
    booking_id: str, session: SessionDep, user: CurrentUserDep
) -> BookingResponse:
    booking = await session.get(Booking, booking_id)
    user_id = _user_id(user)
    if booking is None or booking.user_id != user_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking_to_response(booking))


@bookings_router.get("/{booking_id}/messages")
async def list_booking_messages(
    booking_id: str, session: SessionDep, user: CurrentUserDep
) -> MessageListResponse:
    booking, me, _ = await _require_thread_participant(session, booking_id, user)
    rows = (
        await session.exec(
            select(Message)
            .where(Message.booking_id == booking.id)
            .order_by(Message.created_at)
        )
    ).all()
    now = datetime.now(UTC)
    touched = False
    for row in rows:
        if row.sender_id != me and row.read_at is None:
            row.read_at = now
            session.add(row)
            touched = True
    if touched:
        await session.commit()
    return MessageListResponse(messages=[_message_item(row) for row in rows])


@bookings_router.post("/{booking_id}/messages", status_code=201)
async def post_booking_message(
    booking_id: str,
    payload: MessagePayload,
    session: SessionDep,
    user: CurrentUserDep,
) -> MessageItem:
    body = payload.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Message body is empty")
    booking, me, is_sender_owner = await _require_thread_participant(
        session, booking_id, user
    )
    if is_sender_owner:
        other_ids = [booking.user_id]
    else:
        owners = (
            await session.exec(select(UserRow).where(UserRow.role == "owner"))
        ).all()
        other_ids = [owner.id for owner in owners if owner.id != me]
    other_ids = [oid for oid in other_ids if oid and oid != me]

    message = Message(booking_id=booking.id, sender_id=me, body=body)
    session.add(message)
    preview = body if len(body) <= 80 else body[:77] + "…"
    notifications: list[Notification] = []
    for other_id in other_ids:
        link = (
            f"/account/inbox?booking={booking.id}"
            if other_id == booking.user_id
            else f"/admin/bookings?thread={booking.id}"
        )
        note = Notification(
            user_id=other_id,
            type="message",
            title="New message",
            body=preview,
            link=link,
        )
        session.add(note)
        notifications.append(note)
    await session.commit()

    item = _message_item(message)
    for other_id, note in zip(other_ids, notifications, strict=False):
        event_hub.publish(
            other_id,
            {
                "event": "message",
                "id": message.id,
                "data": item.model_dump(by_alias=True),
            },
        )
        event_hub.publish(
            other_id,
            {
                "event": "notification",
                "id": note.id,
                "data": {
                    "id": note.id,
                    "type": note.type,
                    "title": note.title,
                    "body": note.body,
                    "link": note.link,
                },
            },
        )
    return item
