from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class WebhookEvent(SQLModel, table=True):
    __tablename__ = "webhook_events"

    event_id: str = Field(primary_key=True)
    event_type: str
    status: str = Field(default="received")
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
