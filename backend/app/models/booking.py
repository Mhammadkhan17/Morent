from datetime import UTC, date, datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel

BOOKING_ACTIVE_STATUSES = ("pending", "confirmed", "active")
BOOKING_STATUSES = (
    *BOOKING_ACTIVE_STATUSES,
    "completed",
    "failed",
    "cancelled",
)


class Booking(SQLModel, table=True):
    __tablename__ = "bookings"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    car_id: str = Field(foreign_key="cars.id", index=True)

    pickup_date: date
    dropoff_date: date
    pickup_time: str
    dropoff_time: str
    pickup_location: str
    dropoff_location: str
    days: int

    billing_name: str
    billing_phone: str
    billing_address: str
    billing_city: str

    promo_code: str | None = None
    subtotal_cents: int
    discount_cents: int
    total_cents: int
    currency: str = "usd"

    agreed_to_terms: bool = False
    agreed_to_marketing: bool = False

    status: str = Field(default="pending")
    stripe_session_id: str | None = Field(default=None, unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    booking_id: str = Field(foreign_key="bookings.id", index=True)
    stripe_payment_intent_id: str | None = Field(default=None, index=True)
    amount_cents: int
    currency: str = "usd"
    status: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
