from datetime import date

from sqlmodel import Field, SQLModel


class CustomerProfile(SQLModel, table=True):
    """Customer-supplied profile (M7 settings form). The owner never edits
    these fields directly."""

    __tablename__ = "customer_profiles"

    user_id: str = Field(primary_key=True, foreign_key="user.id")
    phone: str | None = None
    license_number: str | None = None
    license_expires: date | None = None
