from pydantic import BaseModel, ConfigDict, Field

from app.models import Car


class CarRead(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    type: str
    description: str
    fuel_capacity: str = Field(alias="fuelCapacity")
    transmission: str
    seating_capacity: str = Field(alias="seatingCapacity")
    price_per_day: float = Field(alias="pricePerDay")
    original_price: float | None = Field(alias="originalPrice")
    image_url: str = Field(alias="imageUrl")
    images: list[str]
    tags: list[str]
    rating: float | None
    image_metadata: dict[str, int] | None = Field(alias="imageMetadata")


def car_to_read(car: Car) -> CarRead:
    meta = None
    if car.image_width is not None and car.image_height is not None:
        meta = {"width": car.image_width, "height": car.image_height}
    return CarRead(
        id=car.id,
        name=car.name,
        type=car.type,
        description=car.description,
        fuel_capacity=car.fuel_capacity,
        transmission=car.transmission,
        seating_capacity=car.seating_capacity,
        price_per_day=float(car.price_per_day),
        original_price=(
            float(car.original_price) if car.original_price is not None else None
        ),
        image_url=car.image_url,
        images=list(car.images or []),
        tags=list(car.tags or []),
        rating=float(car.rating) if car.rating is not None else None,
        image_metadata=meta,
    )
