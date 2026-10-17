from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.models import Car, PromoCode


class QuoteError(Exception):
    def __init__(self, field: str, message: str) -> None:
        self.field = field
        self.message = message
        super().__init__(message)


class Quote:
    def __init__(
        self,
        *,
        days: int,
        subtotal_cents: int,
        discount_cents: int,
        total_cents: int,
        currency: str = "usd",
    ) -> None:
        self.days = days
        self.subtotal_cents = subtotal_cents
        self.discount_cents = discount_cents
        self.total_cents = total_cents
        self.currency = currency

    def as_dict(self) -> dict[str, int | str]:
        return {
            "days": self.days,
            "subtotalCents": self.subtotal_cents,
            "discountCents": self.discount_cents,
            "totalCents": self.total_cents,
            "currency": self.currency,
        }


def quote(
    car: Car,
    pickup_date: date,
    dropoff_date: date,
    promo: PromoCode | None = None,
) -> Quote:
    """The single source of money math: days, discount, rounding."""
    if dropoff_date < pickup_date:
        raise QuoteError("dropoffDate", "Drop-off date must be on or after pickup date")

    days = max((dropoff_date - pickup_date).days, 1)
    subtotal = int(
        (car.price_per_day * days * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )

    discount = 0
    if promo is not None:
        discount = int(
            (Decimal(subtotal) * promo.percent_off / 100).quantize(
                Decimal("1"), rounding=ROUND_HALF_UP
            )
        )

    return Quote(
        days=days,
        subtotal_cents=subtotal,
        discount_cents=discount,
        total_cents=subtotal - discount,
    )
