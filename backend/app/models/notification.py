from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class Message(SQLModel, table=True):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_booking_created", "booking_id", "created_at"),)

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    booking_id: str = Field(foreign_key="bookings.id")
    sender_id: str
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    read_at: datetime | None = None


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_created", "user_id", "created_at"),)

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str
    type: str
    title: str
    body: str
    link: str
    read_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
