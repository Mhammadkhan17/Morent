from datetime import date
from decimal import Decimal

import pytest

from app.models import Car, PromoCode
from app.services.pricing import QuoteError, quote


def _car(price: str = "99.00") -> Car:
    return Car(
        id="c1",
        name="Test",
        type="Sedan",
        description="d",
        fuel_capacity="50L",
        transmission="Auto",
        seating_capacity="5",
        price_per_day=Decimal(price),
        image_url="u",
        status="available",
    )


def _promo(pct: str = "10") -> PromoCode:
    return PromoCode(code="DISCOUNT10", percent_off=Decimal(pct), active=True)


def test_three_days_at_99():
    # worked example: $99 * 3 = $297.00
    q = quote(_car(), date(2026, 11, 1), date(2026, 11, 4))
    assert q.days == 3
    assert q.subtotal_cents == 29_700
    assert q.discount_cents == 0
    assert q.total_cents == 29_700


def test_three_days_with_10_percent_promo():
    # worked example: $99 * 3 - 10% = $267.30
    q = quote(_car(), date(2026, 11, 1), date(2026, 11, 4), _promo())
    assert q.days == 3
    assert q.subtotal_cents == 29_700
    assert q.discount_cents == 2_970
    assert q.total_cents == 26_730


def test_same_day_is_one_day():
    q = quote(_car("50.00"), date(2026, 11, 1), date(2026, 11, 1))
    assert q.days == 1
    assert q.total_cents == 5_000


def test_dropoff_before_pickup_raises():
    with pytest.raises(QuoteError) as exc:
        quote(_car(), date(2026, 11, 4), date(2026, 11, 1))
    assert exc.value.field == "dropoffDate"


def test_cent_rounding_half_up():
    # 99.99 * 1 day, promo 33.333%: subtotal 9999, discount round(3333.0) = 3333
    q = quote(_car("99.99"), date(2026, 11, 1), date(2026, 11, 2), _promo("33.333"))
    assert q.subtotal_cents == 9_999
    assert q.discount_cents == 3_333
    assert q.total_cents == 6_666


def test_discount_rounds_half_up_on_odd_cent():
    # 99.00 * 1 day, promo 33.5%: 9900 * 0.335 = 3316.5 -> half-up 3317
    q = quote(_car("99.00"), date(2026, 11, 1), date(2026, 11, 2), _promo("33.5"))
    assert q.discount_cents == 3_317
    assert q.total_cents == 6_583
