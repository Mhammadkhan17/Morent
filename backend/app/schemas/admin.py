from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.cars import CarRead


class AdminBookingItem(BaseModel):
    id: str
    status: str
    user_id: str = Field(alias="userId")
    car_id: str = Field(alias="carId")
    car_name: str = Field(alias="carName")
    car_image: str = Field(alias="carImage")
    customer_name: str = Field(alias="customerName")
    customer_email: str = Field(alias="customerEmail")
    pickup_date: date = Field(alias="pickupDate")
    dropoff_date: date = Field(alias="dropoffDate")
    total_cents: int = Field(alias="totalCents")
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class StatusUpdateRequest(BaseModel):
    status: str


class RecentActivityItem(BaseModel):
    booking_id: str = Field(alias="bookingId")
    status: str
    car_name: str = Field(alias="carName")
    customer_name: str = Field(alias="customerName")
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class OverviewResponse(BaseModel):
    revenue_mtd_cents: int = Field(alias="revenueMtdCents")
    active_rentals: int = Field(alias="activeRentals")
    upcoming_7d: int = Field(alias="upcoming7d")
    fleet_size: int = Field(alias="fleetSize")
    utilization_percent: int = Field(alias="utilizationPercent")
    pending_confirmations: int = Field(alias="pendingConfirmations")
    recent_activity: list[RecentActivityItem] = Field(alias="recentActivity")

    model_config = {"populate_by_name": True}


class AdminCarRead(CarRead):
    status: str


class AdminCarCreate(BaseModel):
    name: str
    type: str
    description: str
    fuel_capacity: str = Field(alias="fuelCapacity")
    transmission: str
    seating_capacity: str = Field(alias="seatingCapacity")
    price_per_day: float = Field(alias="pricePerDay")
    original_price: float | None = Field(default=None, alias="originalPrice")
    image_url: str = Field(alias="imageUrl")
    images: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    rating: float | None = None
    status: Literal["available", "maintenance", "hidden"] = "available"
    quantity: int = Field(default=1, ge=1)

    model_config = {"populate_by_name": True}


class AdminCarUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    description: str | None = None
    fuel_capacity: str | None = Field(default=None, alias="fuelCapacity")
    transmission: str | None = None
    seating_capacity: str | None = Field(default=None, alias="seatingCapacity")
    price_per_day: float | None = Field(default=None, alias="pricePerDay")
    original_price: float | None = Field(default=None, alias="originalPrice")
    image_url: str | None = Field(default=None, alias="imageUrl")
    images: list[str] | None = None
    tags: list[str] | None = None
    rating: float | None = None
    status: Literal["available", "maintenance", "hidden"] | None = None
    quantity: int | None = Field(default=None, ge=1)

    model_config = {"populate_by_name": True}


class AdminPromoRead(BaseModel):
    code: str
    percent: float
    is_active: bool = Field(alias="isActive")

    model_config = {"populate_by_name": True}


class AdminPromoCreate(BaseModel):
    code: str = Field(min_length=1)
    percent: float = Field(ge=0, le=100)
    is_active: bool = Field(default=True, alias="isActive")

    model_config = {"populate_by_name": True}


class AdminPromoUpdate(BaseModel):
    percent: float | None = Field(default=None, ge=0, le=100)
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = {"populate_by_name": True}


class CustomerListItem(BaseModel):
    id: str
    name: str
    email: str
    booking_count: int = Field(alias="bookingCount")
    total_spent_cents: int = Field(alias="totalSpentCents")

    model_config = {"populate_by_name": True}


class CustomerDetail(CustomerListItem):
    phone: str | None = None
    license_number: str | None = Field(default=None, alias="licenseNumber")
    license_expires: date | None = Field(default=None, alias="licenseExpires")
    bookings: list[AdminBookingItem]

    model_config = {"populate_by_name": True}


class RevenueDay(BaseModel):
    date: str
    revenue_cents: int = Field(alias="revenueCents")

    model_config = {"populate_by_name": True}


class RevenueWeek(BaseModel):
    week_start: str = Field(alias="weekStart")
    revenue_cents: int = Field(alias="revenueCents")

    model_config = {"populate_by_name": True}


class CarBookingsStat(BaseModel):
    car_id: str = Field(alias="carId")
    car_name: str = Field(alias="carName")
    bookings: int

    model_config = {"populate_by_name": True}


class CarUtilizationStat(BaseModel):
    car_id: str = Field(alias="carId")
    car_name: str = Field(alias="carName")
    utilization_percent: int = Field(alias="utilizationPercent")

    model_config = {"populate_by_name": True}


class TopPromoStat(BaseModel):
    code: str
    uses: int
    discount_cents: int = Field(alias="discountCents")

    model_config = {"populate_by_name": True}


class AnalyticsResponse(BaseModel):
    revenue_by_day: list[RevenueDay] = Field(alias="revenueByDay")
    revenue_by_week: list[RevenueWeek] = Field(alias="revenueByWeek")
    bookings_by_car: list[CarBookingsStat] = Field(alias="bookingsByCar")
    utilization_by_car: list[CarUtilizationStat] = Field(alias="utilizationByCar")
    top_promo_codes: list[TopPromoStat] = Field(alias="topPromoCodes")

    model_config = {"populate_by_name": True}
