from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class PickupDropoff(BaseModel):
    location: str = Field(min_length=1)
    date: date
    time: str = Field(min_length=1)


class QuoteRequest(BaseModel):
    car_id: str = Field(alias="carId")
    pickup: PickupDropoff
    dropoff: PickupDropoff
    promo_code: str | None = Field(default=None, alias="promoCode")

    model_config = {"populate_by_name": True}


class QuoteResponse(BaseModel):
    days: int
    subtotal_cents: int = Field(alias="subtotalCents")
    discount_cents: int = Field(alias="discountCents")
    total_cents: int = Field(alias="totalCents")
    currency: str

    model_config = {"populate_by_name": True}


class BookingRequest(QuoteRequest):
    billing_name: str = Field(alias="billingName", min_length=1)
    billing_phone: str = Field(alias="billingPhone", min_length=1)
    billing_address: str = Field(alias="billingAddress", min_length=1)
    billing_city: str = Field(alias="billingCity", min_length=1)
    agreed_to_terms: bool = Field(alias="agreedToTerms")
    agreed_to_marketing: bool = Field(default=False, alias="agreedToMarketing")

    @field_validator("agreed_to_terms")
    @classmethod
    def _must_accept_terms(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must accept the rental terms")
        return value


class BookingResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    car_id: str = Field(alias="carId")
    pickup_date: date = Field(alias="pickupDate")
    dropoff_date: date = Field(alias="dropoffDate")
    pickup_time: str = Field(alias="pickupTime")
    dropoff_time: str = Field(alias="dropoffTime")
    pickup_location: str = Field(alias="pickupLocation")
    dropoff_location: str = Field(alias="dropoffLocation")
    days: int
    promo_code: str | None = Field(alias="promoCode")
    subtotal_cents: int = Field(alias="subtotalCents")
    discount_cents: int = Field(alias="discountCents")
    total_cents: int = Field(alias="totalCents")
    currency: str
    status: str
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class CheckoutSessionResponse(BaseModel):
    session_id: str = Field(alias="sessionId")
    client_secret: str = Field(alias="clientSecret")

    model_config = {"populate_by_name": True}


class SessionStatusResponse(BaseModel):
    status: str
    payment_status: str = Field(alias="paymentStatus")

    model_config = {"populate_by_name": True}


BookingStatusLiteral = Literal[
    "pending", "confirmed", "active", "completed", "failed", "cancelled"
]
