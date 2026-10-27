"""Idempotent seed: upsert cars from fixtures/cars.json + DISCOUNT10 promo.

Run from backend/: PYTHONPATH=. python scripts/seed.py
"""

import asyncio
import json
from decimal import Decimal
from pathlib import Path

from app.core.db import async_session_factory
from app.models import Car, PromoCode

FIXTURES = Path(__file__).parent / "fixtures" / "cars.json"


def fixture_car_to_model(raw: dict) -> Car:
    meta = raw.get("imageMetadata") or {}
    return Car(
        id=raw["id"],
        name=raw["name"],
        type=raw["type"],
        description=raw["description"],
        fuel_capacity=raw["fuelCapacity"],
        transmission=raw["transmission"],
        seating_capacity=raw["seatingCapacity"],
        price_per_day=Decimal(str(raw["pricePerDay"])),
        original_price=(
            Decimal(str(raw["originalPrice"]))
            if raw.get("originalPrice") is not None
            else None
        ),
        image_url=raw["imageUrl"],
        images=raw["images"],
        tags=raw["tags"],
        rating=Decimal(str(raw["rating"])) if raw.get("rating") is not None else None,
        image_width=meta.get("width"),
        image_height=meta.get("height"),
        status="available",
        quantity=raw.get("quantity", 1),
    )


async def seed() -> None:
    cars_data = json.loads(FIXTURES.read_text())
    async with async_session_factory() as session:
        for raw in cars_data:
            car = fixture_car_to_model(raw)
            existing = await session.get(Car, car.id)
            if existing:
                for key, value in car.model_dump(exclude={"id"}).items():
                    setattr(existing, key, value)
            else:
                session.add(car)

        promo = await session.get(PromoCode, "DISCOUNT10")
        if promo is None:
            session.add(
                PromoCode(code="DISCOUNT10", percent_off=Decimal("10"), active=True)
            )
        else:
            promo.percent_off = Decimal("10")
            promo.active = True

        await session.commit()
    print(f"Seeded {len(cars_data)} cars + DISCOUNT10 promo")


if __name__ == "__main__":
    asyncio.run(seed())
