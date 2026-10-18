from datetime import datetime

from pydantic import BaseModel, Field


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: str
    link: str
    read_at: datetime | None = Field(default=None, alias="readAt")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class NotificationListResponse(BaseModel):
    notifications: list[NotificationItem] = Field(default_factory=list)
    unread_count: int = Field(default=0, alias="unreadCount")

    model_config = {"populate_by_name": True}
