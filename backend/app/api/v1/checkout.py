from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.schemas.bookings import SessionStatusResponse
from app.services.stripe_service import StripeService, get_stripe_service

checkout_router = APIRouter(prefix="/checkout", tags=["checkout"])

StripeDep = Annotated[StripeService, Depends(get_stripe_service)]


@checkout_router.get("/session-status")
async def session_status(
    session_id: str, stripe_service: StripeDep
) -> SessionStatusResponse:
    try:
        session_obj = await stripe_service.retrieve_checkout_session(session_id)
    except Exception as exc:  # stripe errors -> 404-style for the client
        raise HTTPException(
            status_code=404, detail="Checkout session not found"
        ) from exc
    return SessionStatusResponse(
        status=getattr(session_obj, "status", "open"),
        paymentStatus=getattr(session_obj, "payment_status", "unpaid"),
    )
