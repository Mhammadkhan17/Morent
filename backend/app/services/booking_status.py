from app.models import Booking

# pending -> confirmed is the webhook path; owner/admin extend in M6-M7
ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    "pending": frozenset({"confirmed", "cancelled", "failed", "active"}),
    "confirmed": frozenset({"active", "completed", "cancelled"}),
    "active": frozenset({"completed", "cancelled"}),
    "completed": frozenset(),
    "failed": frozenset(),
    "cancelled": frozenset(),
}


class IllegalTransition(Exception):
    pass


def apply(booking: Booking, to_status: str) -> None:
    allowed = ALLOWED_TRANSITIONS.get(booking.status, frozenset())
    if to_status not in allowed:
        raise IllegalTransition(
            f"Illegal booking transition {booking.status!r} -> {to_status!r}"
        )
    booking.status = to_status
