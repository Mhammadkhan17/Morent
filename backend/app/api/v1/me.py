from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.core.security import CurrentUserDep, SessionDep
from app.models import (
    Booking,
    Car,
    CustomerProfile,
    Message,
    Notification,
    Payment,
    SwapOffer,
)
from app.schemas.me import (
    MeBookingCar,
    MeBookingItem,
    MeBookingListResponse,
    MePaymentInfo,
    MeSwapOffer,
    NotificationItem,
    NotificationListResponse,
    ProfilePayload,
    ProfileResponse,
)
from app.services import resolution
from app.services.stripe_service import StripeService, get_stripe_service

me_router = APIRouter(prefix="/me", tags=["me"])

StripeDep = Annotated[StripeService, Depends(get_stripe_service)]


def _user_id(user: dict) -> str:
    return user.get("sub") or user.get("id") or ""


def _item(notification: Notification) -> NotificationItem:
    return NotificationItem(
        id=notification.id,
        type=notification.type,
        title=notification.title,
        body=notification.body,
        link=notification.link,
        read_at=notification.read_at,
        created_at=notification.created_at,
    )


def _profile_item(user_id: str, profile: CustomerProfile | None) -> ProfileResponse:
    if profile is None:
        return ProfileResponse(user_id=user_id)
    return ProfileResponse(
        user_id=user_id,
        phone=profile.phone,
        license_number=profile.license_number,
        license_expires=profile.license_expires,
    )


@me_router.get("")
async def me(user: CurrentUserDep) -> dict[str, str | bool | None]:
    return {
        "id": user.get("sub", ""),
        "email": user.get("email", ""),
        "name": user.get("name"),
        "emailVerified": user.get("emailVerified", False),
    }


@me_router.get("/notifications")
async def list_notifications(
    user: CurrentUserDep, session: SessionDep
) -> NotificationListResponse:
    user_id = _user_id(user)
    rows = (
        await session.exec(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    ).all()
    unread = (
        await session.exec(
            select(func.count())
            .select_from(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    ).one()
    return NotificationListResponse(
        notifications=[_item(row) for row in rows],
        unread_count=unread,
    )


@me_router.post("/notifications/read-all")
async def read_all_notifications(
    user: CurrentUserDep, session: SessionDep
) -> dict[str, int]:
    user_id = _user_id(user)
    rows = (
        await session.exec(
            select(Notification).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
    ).all()
    now = datetime.now(UTC)
    for row in rows:
        row.read_at = now
        session.add(row)
    await session.commit()
    return {"updated": len(rows)}


@me_router.post("/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    user: CurrentUserDep,
    session: SessionDep,
) -> NotificationItem:
    notification = await session.get(Notification, notification_id)
    if notification is None or notification.user_id != _user_id(user):
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.read_at is None:
        notification.read_at = datetime.now(UTC)
        session.add(notification)
        await session.commit()
    return _item(notification)


@me_router.get("/bookings")
async def list_me_bookings(
    user: CurrentUserDep, session: SessionDep
) -> MeBookingListResponse:
    user_id = _user_id(user)
    rows = (
        await session.exec(
            select(Booking, Car)
            .join(Car, Booking.car_id == Car.id)
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
        )
    ).all()
    items: list[MeBookingItem] = []
    for booking, car in rows:
        unread = (
            await session.exec(
                select(func.count())
                .select_from(Message)
                .where(
                    Message.booking_id == booking.id,
                    Message.sender_id != user_id,
                    Message.read_at.is_(None),
                )
            )
        ).one()
        payment = (
            await session.exec(
                select(Payment).where(Payment.booking_id == booking.id)
            )
        ).first()
        offer = (
            await session.exec(
                select(SwapOffer).where(SwapOffer.booking_id == booking.id)
            )
        ).first()
        offer_item: MeSwapOffer | None = None
        if offer is not None:
            offered_car = await session.get(Car, offer.offered_car_id)
            if offered_car is not None:
                offer_item = MeSwapOffer(
                    id=offer.id,
                    status=offer.status,
                    offeredTotalCents=offer.offered_total_cents,
                    originalTotalCents=booking.total_cents,
                    createdAt=offer.created_at,
                    car=MeBookingCar(
                        id=offered_car.id,
                        name=offered_car.name,
                        type=offered_car.type,
                        imageUrl=offered_car.image_url,
                    ),
                )
        items.append(
            MeBookingItem(
                id=booking.id,
                status=booking.status,
                pickup_date=booking.pickup_date,
                dropoff_date=booking.dropoff_date,
                pickup_time=booking.pickup_time,
                dropoff_time=booking.dropoff_time,
                pickup_location=booking.pickup_location,
                dropoff_location=booking.dropoff_location,
                days=booking.days,
                total_cents=booking.total_cents,
                currency=booking.currency,
                unread_messages=unread,
                cancel_reason=booking.cancel_reason,
                payment=(
                    MePaymentInfo(
                        amount_cents=payment.amount_cents,
                        refunded_cents=payment.refunded_cents,
                        refund_status=payment.refund_status,
                        origin=payment.origin,
                    )
                    if payment
                    else None
                ),
                swap_offer=offer_item,
                car=MeBookingCar(
                    id=car.id, name=car.name, type=car.type, image_url=car.image_url
                ),
            )
        )
    return MeBookingListResponse(bookings=items)


async def _customer_booking(session, user_id: str, booking_id: str) -> Booking:
    booking = await session.get(Booking, booking_id)
    if booking is None or booking.user_id != user_id:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@me_router.post("/bookings/{booking_id}/swap/accept")
async def accept_swap(
    booking_id: str,
    user: CurrentUserDep,
    session: SessionDep,
    stripe_service: StripeDep,
) -> dict[str, str]:
    user_id = _user_id(user)
    booking = await _customer_booking(session, user_id, booking_id)
    new_id = await resolution.accept_swap(
        session, stripe_service, booking, user_id=user_id
    )
    return {"bookingId": new_id, "status": "accepted"}


@me_router.post("/bookings/{booking_id}/swap/decline")
async def decline_swap(
    booking_id: str,
    user: CurrentUserDep,
    session: SessionDep,
    stripe_service: StripeDep,
) -> dict[str, str]:
    user_id = _user_id(user)
    booking = await _customer_booking(session, user_id, booking_id)
    await resolution.decline_swap(
        session, stripe_service, booking, user_id=user_id
    )
    return {"status": "refunded"}


@me_router.get("/profile")
async def get_profile(user: CurrentUserDep, session: SessionDep) -> ProfileResponse:
    user_id = _user_id(user)
    profile = await session.get(CustomerProfile, user_id)
    return _profile_item(user_id, profile)


@me_router.patch("/profile")
async def patch_profile(
    payload: ProfilePayload, user: CurrentUserDep, session: SessionDep
) -> ProfileResponse:
    user_id = _user_id(user)
    profile = await session.get(CustomerProfile, user_id)
    if profile is None:
        profile = CustomerProfile(user_id=user_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(profile, key, value)
    session.add(profile)
    await session.commit()
    return _profile_item(user_id, profile)
