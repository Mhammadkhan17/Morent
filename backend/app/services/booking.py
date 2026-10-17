from datetime import date
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.models import Booking, Car, PromoCode
from app.schemas.bookings import BookingRequest
from app.services.pricing import Quote, quote
from app.services.stripe_service import StripeService


def _field_error(field: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=[{"loc": ["body", field], "msg": message, "type": "value_error"}],
    )


async def resolve_promo(
    session: AsyncSession, promo_code: str | None
) -> PromoCode | None:
    if not promo_code:
        return None
    code = promo_code.strip().upper()
    promo = await session.get(PromoCode, code)
    if promo is None or not promo.active:
        raise _field_error("promoCode", "Unknown or inactive promo code")
    return promo


async def get_available_car(session: AsyncSession, car_id: str) -> Car:
    car = await session.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    if car.status != "available":
        raise HTTPException(status_code=409, detail="Car is not available")
    return car


def validate_dates(pickup_date: date, dropoff_date: date) -> None:
    if dropoff_date < pickup_date:
        raise _field_error(
            "dropoffDate", "Drop-off date must be on or after pickup date"
        )
    if pickup_date < date.today():
        raise _field_error("pickupDate", "Pickup date cannot be in the past")


async def assert_no_overlap(
    session: AsyncSession, car_id: str, pickup_date: date, dropoff_date: date
) -> None:
    result = await session.exec(
        select(Booking).where(
            Booking.car_id == car_id,
            Booking.status.in_(("pending", "confirmed", "active")),
            Booking.pickup_date <= dropoff_date,
            Booking.dropoff_date >= pickup_date,
        )
    )
    if result.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Car is already booked for the selected dates",
        )


async def create_booking(
    session: AsyncSession,
    stripe_service: StripeService,
    *,
    user_id: str,
    user_email: str,
    payload: BookingRequest,
) -> tuple[Booking, str, str]:
    """Validate → price → persist → Stripe session. Single intake seam."""
    car = await get_available_car(session, payload.car_id)
    validate_dates(payload.pickup.date, payload.dropoff.date)
    promo = await resolve_promo(session, payload.promo_code)
    await assert_no_overlap(
        session, payload.car_id, payload.pickup.date, payload.dropoff.date
    )

    priced: Quote = quote(car, payload.pickup.date, payload.dropoff.date, promo)

    booking = Booking(
        id=str(uuid4()),
        user_id=user_id,
        car_id=car.id,
        pickup_date=payload.pickup.date,
        dropoff_date=payload.dropoff.date,
        pickup_time=payload.pickup.time,
        dropoff_time=payload.dropoff.time,
        pickup_location=payload.pickup.location,
        dropoff_location=payload.dropoff.location,
        days=priced.days,
        billing_name=payload.billing_name,
        billing_phone=payload.billing_phone,
        billing_address=payload.billing_address,
        billing_city=payload.billing_city,
        promo_code=promo.code if promo else None,
        subtotal_cents=priced.subtotal_cents,
        discount_cents=priced.discount_cents,
        total_cents=priced.total_cents,
        currency=priced.currency,
        agreed_to_terms=payload.agreed_to_terms,
        agreed_to_marketing=payload.agreed_to_marketing,
        status="pending",
    )

    checkout = await stripe_service.create_checkout_session(
        {
            "ui_mode": "elements",
            "mode": "payment",
            "line_items": [
                {
                    "price_data": {
                        "currency": priced.currency,
                        "unit_amount": priced.total_cents,
                        "product_data": {
                            "name": f"{car.name} rental — {priced.days} day(s)"
                        },
                    },
                    "quantity": 1,
                }
            ],
            "metadata": {"booking_id": booking.id, "user_id": user_id},
            "customer_email": user_email,
            "return_url": (
                f"{settings.frontend_origin}/Payment/complete"
                "?session_id={CHECKOUT_SESSION_ID}"
            ),
        }
    )

    booking.stripe_session_id = checkout.id
    session.add(booking)
    await session.commit()
    await session.refresh(booking)
    return booking, checkout.id, checkout.client_secret


def booking_to_response(booking: Booking) -> dict[str, Any]:
    return {
        "id": booking.id,
        "userId": booking.user_id,
        "carId": booking.car_id,
        "pickupDate": booking.pickup_date.isoformat(),
        "dropoffDate": booking.dropoff_date.isoformat(),
        "pickupTime": booking.pickup_time,
        "dropoffTime": booking.dropoff_time,
        "pickupLocation": booking.pickup_location,
        "dropoffLocation": booking.dropoff_location,
        "days": booking.days,
        "promoCode": booking.promo_code,
        "subtotalCents": booking.subtotal_cents,
        "discountCents": booking.discount_cents,
        "totalCents": booking.total_cents,
        "currency": booking.currency,
        "status": booking.status,
        "createdAt": booking.created_at.isoformat(),
    }


__all__ = [
    "assert_no_overlap",
    "booking_to_response",
    "create_booking",
    "get_available_car",
    "resolve_promo",
    "validate_dates",
]
