from decimal import Decimal

from pydantic import field_serializer
from sqlmodel import JSON, Field, Numeric, SQLModel


class Car(SQLModel, table=True):
    __tablename__ = "cars"

    id: str = Field(primary_key=True)
    name: str
    type: str
    description: str
    fuel_capacity: str
    transmission: str
    seating_capacity: str
    price_per_day: Decimal = Field(sa_type=Numeric(10, 2))
    original_price: Decimal | None = Field(default=None, sa_type=Numeric(10, 2))
    image_url: str
    images: list[str] = Field(default_factory=list, sa_type=JSON)
    tags: list[str] = Field(default_factory=list, sa_type=JSON)
    rating: Decimal | None = Field(default=None, sa_type=Numeric(3, 1))
    image_width: int | None = None
    image_height: int | None = None
    status: str = Field(default="available")  # available | maintenance | hidden

    @field_serializer("price_per_day", "original_price", "rating")
    def _money_to_json_number(self, value: Decimal | None) -> float | None:
        return float(value) if value is not None else None
