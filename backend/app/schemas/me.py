from datetime import date, datetime

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


class MeBookingCar(BaseModel):
    id: str
    name: str
    type: str
    image_url: str = Field(alias="imageUrl")

    model_config = {"populate_by_name": True}


class MeBookingItem(BaseModel):
    id: str
    status: str
    pickup_date: date = Field(alias="pickupDate")
    dropoff_date: date = Field(alias="dropoffDate")
    pickup_time: str = Field(alias="pickupTime")
    dropoff_time: str = Field(alias="dropoffTime")
    pickup_location: str = Field(alias="pickupLocation")
    dropoff_location: str = Field(alias="dropoffLocation")
    days: int
    total_cents: int = Field(alias="totalCents")
    currency: str
    unread_messages: int = Field(default=0, alias="unreadMessages")
    car: MeBookingCar

    model_config = {"populate_by_name": True}


class MeBookingListResponse(BaseModel):
    bookings: list[MeBookingItem]


class ProfilePayload(BaseModel):
    phone: str | None = None
    license_number: str | None = Field(default=None, alias="licenseNumber")
    license_expires: date | None = Field(default=None, alias="licenseExpires")

    model_config = {"populate_by_name": True, "exclude_unset": True}


class ProfileResponse(BaseModel):
    user_id: str = Field(alias="userId")
    phone: str | None = None
    license_number: str | None = Field(default=None, alias="licenseNumber")
    license_expires: date | None = Field(default=None, alias="licenseExpires")

    model_config = {"populate_by_name": True}


class MessagePayload(BaseModel):
    body: str = Field(min_length=1)


class MessageItem(BaseModel):
    id: str
    booking_id: str = Field(alias="bookingId")
    sender_id: str = Field(alias="senderId")
    body: str
    read_at: datetime | None = Field(default=None, alias="readAt")
    created_at: datetime = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class MessageListResponse(BaseModel):
    messages: list[MessageItem]
