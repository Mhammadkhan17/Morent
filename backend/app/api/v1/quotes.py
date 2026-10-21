from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Car
from app.schemas.bookings import QuoteRequest, QuoteResponse
from app.services.booking import resolve_promo
from app.services.pricing import QuoteError, quote

quotes_router = APIRouter(prefix="/quotes", tags=["quotes"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@quotes_router.post("")
async def create_quote(payload: QuoteRequest, session: SessionDep) -> QuoteResponse:
    car = await session.get(Car, payload.car_id)
    if car is None or car.status != "available":
        raise HTTPException(status_code=404, detail="Car not found")

    promo = await resolve_promo(session, payload.promo_code)
    try:
        priced = quote(car, payload.pickup.date, payload.dropoff.date, promo)
    except QuoteError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[
                {
                    "loc": ["body", exc.field],
                    "msg": exc.message,
                    "type": "value_error",
                }
            ],
        ) from exc

    return QuoteResponse(
        days=priced.days,
        subtotalCents=priced.subtotal_cents,
        discountCents=priced.discount_cents,
        totalCents=priced.total_cents,
        currency=priced.currency,
    )
