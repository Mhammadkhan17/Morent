from datetime import date

import pytest

from app.models import Booking
from app.services.booking_status import IllegalTransition, apply


def _booking(status: str = "pending") -> Booking:
    return Booking(
        id="b1",
        user_id="u1",
        car_id="c1",
        pickup_date=date(2026, 11, 1),
        dropoff_date=date(2026, 11, 4),
        pickup_time="10:00",
        dropoff_time="10:00",
        pickup_location="NYC",
        dropoff_location="NYC",
        days=3,
        billing_name="n",
        billing_phone="p",
        billing_address="a",
        billing_city="c",
        subtotal_cents=29700,
        discount_cents=0,
        total_cents=29700,
        status=status,
    )


@pytest.mark.parametrize(
    ("from_status", "to_status"),
    [
        ("pending", "confirmed"),
        ("pending", "cancelled"),
        ("pending", "failed"),
        ("confirmed", "active"),
        ("confirmed", "completed"),
        ("active", "completed"),
        ("active", "cancelled"),
    ],
)
def test_legal_transitions(from_status, to_status):
    b = _booking(from_status)
    apply(b, to_status)
    assert b.status == to_status


@pytest.mark.parametrize(
    ("from_status", "to_status"),
    [
        ("completed", "confirmed"),
        ("cancelled", "pending"),
        ("failed", "confirmed"),
        ("confirmed", "pending"),
        ("pending", "completed"),
    ],
)
def test_illegal_transitions(from_status, to_status):
    b = _booking(from_status)
    with pytest.raises(IllegalTransition):
        apply(b, to_status)
    assert b.status == from_status  # unchanged
