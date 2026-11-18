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
    user_id: str = Field(foreign_key="user.id", index=True)
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
    cancel_reason: str | None = None
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
    # Last refund attempt outcome; money moved is tracked by refunded_cents.
    refund_status: str = Field(default="none")  # none|pending|succeeded|failed
    stripe_refund_id: str | None = None
    refunded_cents: int = 0
    # "stripe" = captured by Checkout; "credit" = created when a swap offer
    # re-uses an existing payment (no second charge ever happens).
    origin: str = Field(default="stripe")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SwapOffer(SQLModel, table=True):
    """Admin-proposed replacement car after cancelling a paid booking.

    One row per cancelled booking (unique); the customer accepts (a new
    booking is created) or declines (full refund)."""

    __tablename__ = "swap_offers"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    booking_id: str = Field(foreign_key="bookings.id", unique=True, index=True)
    offered_car_id: str = Field(foreign_key="cars.id", index=True)
    offered_total_cents: int
    status: str = Field(default="offered")  # offered|accepted|declined|withdrawn
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    responded_at: datetime | None = None
