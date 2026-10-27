import re
from collections import Counter
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlmodel import select

from app.core.security import SessionDep, require_owner
from app.models import Booking, Car, CustomerProfile, PromoCode, UserRow
from app.models.booking import BOOKING_ACTIVE_STATUSES
from app.schemas.admin import (
    AdminBookingItem,
    AdminCarCreate,
    AdminCarRead,
    AdminCarUpdate,
    AdminPromoCreate,
    AdminPromoRead,
    AdminPromoUpdate,
    AnalyticsResponse,
    CarBookingsStat,
    CarUtilizationStat,
    CustomerDetail,
    CustomerListItem,
    OverviewResponse,
    RecentActivityItem,
    RevenueDay,
    RevenueWeek,
    StatusUpdateRequest,
    TopPromoStat,
)
from app.schemas.cars import car_to_read
from app.services.booking_status import IllegalTransition, transition

admin_router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_owner)],
)

REVENUE_STATUSES = ("confirmed", "active", "completed")
UTILIZATION_STATUSES = ("active", "confirmed")


def _item(
    booking: Booking, car: Car | None, user: UserRow | None
) -> AdminBookingItem:
    return AdminBookingItem(
        id=booking.id,
        status=booking.status,
        userId=booking.user_id,
        carId=booking.car_id,
        carName=car.name if car else "",
        carImage=car.image_url if car else "",
        customerName=(user.name if user else None) or booking.billing_name,
        customerEmail=user.email if user else "",
        pickupDate=booking.pickup_date,
        dropoffDate=booking.dropoff_date,
        totalCents=booking.total_cents,
        createdAt=booking.created_at.isoformat(),
    )


@admin_router.get("/overview")
async def overview(session: SessionDep) -> OverviewResponse:
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today = date.today()
    horizon = today + timedelta(days=7)

    bookings = (await session.exec(select(Booking))).all()
    revenue = sum(
        b.total_cents
        for b in bookings
        if b.status in REVENUE_STATUSES and b.created_at >= month_start
    )
    active = sum(1 for b in bookings if b.status == "active")
    upcoming = sum(
        1
        for b in bookings
        if b.status == "confirmed" and today <= b.pickup_date <= horizon
    )
    pending = sum(1 for b in bookings if b.status == "pending")
    cars = (await session.exec(select(Car))).all()
    booked_cars = {
        b.car_id for b in bookings if b.status in UTILIZATION_STATUSES
    }
    fleet_size = len(cars)
    utilization = (
        round(100 * len(booked_cars) / fleet_size) if fleet_size else 0
    )

    recent_rows = (
        await session.exec(
            select(Booking, Car, UserRow)
            .outerjoin(Car, Booking.car_id == Car.id)
            .outerjoin(UserRow, Booking.user_id == UserRow.id)
            .order_by(Booking.created_at.desc())
            .limit(10)
        )
    ).all()
    recent = [
        RecentActivityItem(
            bookingId=b.id,
            status=b.status,
            carName=car.name if car else "",
            customerName=(u.name if u else None) or b.billing_name,
            createdAt=b.created_at.isoformat(),
        )
        for b, car, u in recent_rows
    ]

    return OverviewResponse(
        revenueMtdCents=revenue,
        activeRentals=active,
        upcoming7d=upcoming,
        fleetSize=fleet_size,
        utilizationPercent=utilization,
        pendingConfirmations=pending,
        recentActivity=recent,
    )


@admin_router.get("/bookings")
async def list_bookings(
    session: SessionDep,
    status: Annotated[str | None, Query()] = None,
    car_id: Annotated[str | None, Query()] = None,
    q: Annotated[str | None, Query()] = None,
) -> list[AdminBookingItem]:
    stmt = (
        select(Booking, Car, UserRow)
        .outerjoin(Car, Booking.car_id == Car.id)
        .outerjoin(UserRow, Booking.user_id == UserRow.id)
    )
    if status:
        stmt = stmt.where(Booking.status == status)
    if car_id:
        stmt = stmt.where(Booking.car_id == car_id)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(UserRow.name.ilike(pattern), UserRow.email.ilike(pattern))
        )
    stmt = stmt.order_by(Booking.created_at.desc())
    rows = (await session.exec(stmt)).all()
    return [_item(b, car, user) for b, car, user in rows]


@admin_router.patch("/bookings/{booking_id}")
async def patch_booking(
    booking_id: str,
    payload: StatusUpdateRequest,
    session: SessionDep,
) -> AdminBookingItem:
    booking = await session.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    try:
        await transition(session, booking, payload.status, actor="owner")
    except IllegalTransition as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    car = await session.get(Car, booking.car_id)
    user = await session.get(UserRow, booking.user_id)
    return _item(booking, car, user)


def _admin_car(car: Car) -> AdminCarRead:
    return AdminCarRead(**car_to_read(car).model_dump(), status=car.status)


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "car"


async def _unique_car_id(session: SessionDep, name: str) -> str:
    base = _slugify(name)
    candidate, n = base, 2
    while await session.get(Car, candidate):
        candidate = f"{base}-{n}"
        n += 1
    return candidate


@admin_router.get("/cars")
async def list_admin_cars(session: SessionDep) -> list[AdminCarRead]:
    cars = (await session.exec(select(Car).order_by(Car.name))).all()
    return [_admin_car(c) for c in cars]


@admin_router.get("/cars/{car_id}")
async def get_admin_car(car_id: str, session: SessionDep) -> AdminCarRead:
    car = await session.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    return _admin_car(car)


@admin_router.post("/cars", status_code=201)
async def create_admin_car(
    payload: AdminCarCreate, session: SessionDep
) -> AdminCarRead:
    car = Car(
        id=await _unique_car_id(session, payload.name),
        name=payload.name,
        type=payload.type,
        description=payload.description,
        fuel_capacity=payload.fuel_capacity,
        transmission=payload.transmission,
        seating_capacity=payload.seating_capacity,
        price_per_day=Decimal(str(payload.price_per_day)),
        original_price=(
            Decimal(str(payload.original_price))
            if payload.original_price is not None
            else None
        ),
        image_url=payload.image_url,
        images=list(payload.images),
        tags=list(payload.tags),
        rating=Decimal(str(payload.rating)) if payload.rating is not None else None,
        status=payload.status,
        quantity=payload.quantity,
    )
    session.add(car)
    await session.commit()
    await session.refresh(car)
    return _admin_car(car)


@admin_router.patch("/cars/{car_id}")
async def patch_admin_car(
    car_id: str, payload: AdminCarUpdate, session: SessionDep
) -> AdminCarRead:
    car = await session.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in ("price_per_day", "original_price", "rating") and value is not None:
            value = Decimal(str(value))
        setattr(car, field, value)
    session.add(car)
    await session.commit()
    await session.refresh(car)
    return _admin_car(car)


@admin_router.delete("/cars/{car_id}", status_code=204)
async def delete_admin_car(car_id: str, session: SessionDep) -> None:
    car = await session.get(Car, car_id)
    if car is None:
        raise HTTPException(status_code=404, detail="Car not found")
    bookings = (
        await session.exec(select(Booking).where(Booking.car_id == car_id))
    ).all()
    if any(b.status in BOOKING_ACTIVE_STATUSES for b in bookings):
        raise HTTPException(
            status_code=409,
            detail="Car has active bookings — set status=hidden instead",
        )
    if bookings:
        # bookings.car_id FK would orphan history; plan steers to hide.
        raise HTTPException(
            status_code=409,
            detail="Car has booking history — set status=hidden instead",
        )
    await session.delete(car)
    await session.commit()


def _promo_item(promo: PromoCode) -> AdminPromoRead:
    return AdminPromoRead(
        code=promo.code,
        percent=float(promo.percent_off),
        isActive=promo.active,
    )


@admin_router.get("/promo-codes")
async def list_promos(session: SessionDep) -> list[AdminPromoRead]:
    promos = (await session.exec(select(PromoCode).order_by(PromoCode.code))).all()
    return [_promo_item(p) for p in promos]


@admin_router.post("/promo-codes", status_code=201)
async def create_promo(
    payload: AdminPromoCreate, session: SessionDep
) -> AdminPromoRead:
    code = payload.code.strip().upper()
    if await session.get(PromoCode, code):
        raise HTTPException(
            status_code=409, detail=f"Promo code {code} already exists"
        )
    promo = PromoCode(
        code=code,
        percent_off=Decimal(str(payload.percent)),
        active=payload.is_active,
    )
    session.add(promo)
    await session.commit()
    await session.refresh(promo)
    return _promo_item(promo)


@admin_router.patch("/promo-codes/{code}")
async def patch_promo(
    code: str, payload: AdminPromoUpdate, session: SessionDep
) -> AdminPromoRead:
    promo = await session.get(PromoCode, code.strip().upper())
    if promo is None:
        raise HTTPException(status_code=404, detail="Promo code not found")
    field_map = {"percent": "percent_off", "is_active": "active"}
    for field, value in payload.model_dump(exclude_unset=True).items():
        attr = field_map.get(field, field)
        if attr == "percent_off" and value is not None:
            value = Decimal(str(value))
        setattr(promo, attr, value)
    session.add(promo)
    await session.commit()
    await session.refresh(promo)
    return _promo_item(promo)


@admin_router.delete("/promo-codes/{code}", status_code=204)
async def delete_promo(code: str, session: SessionDep) -> None:
    promo = await session.get(PromoCode, code.strip().upper())
    if promo is None:
        raise HTTPException(status_code=404, detail="Promo code not found")
    await session.delete(promo)
    await session.commit()


async def _customer_stats(
    session: SessionDep, user_id: str
) -> tuple[int, int, list[Booking]]:
    bookings = (
        await session.exec(
            select(Booking)
            .where(Booking.user_id == user_id)
            .order_by(Booking.created_at.desc())
        )
    ).all()
    count = len(bookings)
    spent = sum(
        b.total_cents for b in bookings if b.status in REVENUE_STATUSES
    )
    return count, spent, list(bookings)


@admin_router.get("/customers")
async def list_customers(session: SessionDep) -> list[CustomerListItem]:
    users = (
        await session.exec(
            select(UserRow)
            .where(UserRow.role != "owner")
            .order_by(UserRow.name)
        )
    ).all()
    items = []
    for user in users:
        count, spent, _ = await _customer_stats(session, user.id)
        items.append(
            CustomerListItem(
                id=user.id,
                name=user.name or "",
                email=user.email or "",
                bookingCount=count,
                totalSpentCents=spent,
            )
        )
    return items


@admin_router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: str, session: SessionDep
) -> CustomerDetail:
    user = await session.get(UserRow, customer_id)
    if user is None or user.role == "owner":
        raise HTTPException(status_code=404, detail="Customer not found")
    profile = await session.get(CustomerProfile, user.id)
    count, spent, bookings = await _customer_stats(session, user.id)
    items = []
    for booking in bookings:
        car = await session.get(Car, booking.car_id)
        items.append(_item(booking, car, user))
    return CustomerDetail(
        id=user.id,
        name=user.name or "",
        email=user.email or "",
        bookingCount=count,
        totalSpentCents=spent,
        phone=profile.phone if profile else None,
        licenseNumber=profile.license_number if profile else None,
        licenseExpires=profile.license_expires if profile else None,
        bookings=items,
    )


@admin_router.get("/analytics")
async def analytics(
    session: SessionDep,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
) -> AnalyticsResponse:
    today = date.today()
    start_d = date_from or (today - timedelta(days=29))
    end_d = date_to or today
    start = datetime.combine(start_d, time(0), tzinfo=UTC)
    end = datetime.combine(end_d + timedelta(days=1), time(0), tzinfo=UTC)

    bookings = [
        b
        for b in (await session.exec(select(Booking))).all()
        if start <= b.created_at < end
    ]
    revenue_bookings = [b for b in bookings if b.status in REVENUE_STATUSES]

    by_day: dict[date, int] = {}
    by_week: dict[date, int] = {}
    for b in revenue_bookings:
        day = b.created_at.date()
        by_day[day] = by_day.get(day, 0) + b.total_cents
        week = day - timedelta(days=day.weekday())
        by_week[week] = by_week.get(week, 0) + b.total_cents

    cars = (await session.exec(select(Car))).all()
    car_names = {c.id: c.name for c in cars}

    bookings_count: Counter[str] = Counter(b.car_id for b in bookings)
    by_car = sorted(
        (
            CarBookingsStat(
                carId=car_id,
                carName=car_names.get(car_id, ""),
                bookings=count,
            )
            for car_id, count in bookings_count.items()
        ),
        key=lambda s: (-s.bookings, s.car_name),
    )

    range_days = max((end_d - start_d).days + 1, 1)
    utilization = []
    for car in cars:
        rented_days = sum(
            b.days
            for b in revenue_bookings
            if b.car_id == car.id
            and b.dropoff_date >= start_d
            and b.pickup_date <= end_d
        )
        utilization.append(
            CarUtilizationStat(
                carId=car.id,
                carName=car.name,
                utilizationPercent=min(
                    round(100 * rented_days / range_days), 100
                ),
            )
        )
    utilization.sort(key=lambda u: (-u.utilization_percent, u.car_name))

    promo_uses: Counter[str] = Counter()
    promo_discount: Counter[str] = Counter()
    for b in revenue_bookings:
        if b.promo_code:
            promo_uses[b.promo_code] += 1
            promo_discount[b.promo_code] += b.discount_cents
    top_promos = [
        TopPromoStat(
            code=code, uses=uses, discountCents=promo_discount[code]
        )
        for code, uses in sorted(
            promo_uses.items(), key=lambda kv: (-kv[1], kv[0])
        )[:5]
    ]

    return AnalyticsResponse(
        revenueByDay=[
            RevenueDay(date=d.isoformat(), revenueCents=c)
            for d, c in sorted(by_day.items())
        ],
        revenueByWeek=[
            RevenueWeek(weekStart=w.isoformat(), revenueCents=c)
            for w, c in sorted(by_week.items())
        ],
        bookingsByCar=by_car,
        utilizationByCar=utilization,
        topPromoCodes=top_promos,
    )
