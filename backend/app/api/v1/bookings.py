from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.core.security import CurrentUserDep
from app.models import Booking
from app.schemas.bookings import (
    BookingRequest,
    BookingResponse,
    CheckoutSessionResponse,
)
from app.services.booking import booking_to_response, create_booking
from app.services.stripe_service import StripeService, get_stripe_service

bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
StripeDep = Annotated[StripeService, Depends(get_stripe_service)]


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
    user_id = user.get("sub") or user.get("id") or ""
    if booking is None or booking.user_id != user_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return BookingResponse(**booking_to_response(booking))
