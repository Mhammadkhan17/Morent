import json
from decimal import Decimal
from pathlib import Path

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.db import get_session
from app.main import app
from app.models import Car, PromoCode
from scripts.seed import FIXTURES
from scripts.seed import fixture_car_to_model as _fixture_car_to_model


@pytest_asyncio.fixture
async def seeded_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    session_factory = async_sessionmaker(
        engine, expire_on_commit=False, class_=AsyncSession
    )

    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    # run the real seed logic twice against this DB
    for _ in range(2):
        cars_data = json.loads(FIXTURES.read_text())
        async with session_factory() as session:
            for raw in cars_data:
                car = _fixture_car_to_model(raw)
                existing = await session.get(Car, car.id)
                if existing:
                    for key, value in car.model_dump(exclude={"id"}).items():
                        setattr(existing, key, value)
                else:
                    session.add(car)
            if await session.get(PromoCode, "DISCOUNT10") is None:
                session.add(
                    PromoCode(code="DISCOUNT10", percent_off=Decimal("10"), active=True)
                )
            await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, session_factory
    app.dependency_overrides.clear()
    await engine.dispose()


async def test_seed_idempotent(seeded_client) -> None:
    _client, session_factory = seeded_client
    async with session_factory() as session:
        cars = list((await session.exec(select(Car))).all())
        promos = list((await session.exec(select(PromoCode))).all())

    assert len(cars) == 7
    assert {c.id for c in cars} == {
        "koenigsegg",
        "nissan-gtr",
        "rolls-royce",
        "mercedes-benz",
        "volkswagen",
        "toyota",
        "jaguar",
    }
    koenigsegg = next(c for c in cars if c.id == "koenigsegg")
    assert koenigsegg.price_per_day == Decimal("99.00")
    assert koenigsegg.original_price == Decimal("100.00")
    assert koenigsegg.status == "available"
    assert len(promos) == 1
    assert promos[0].code == "DISCOUNT10"
    assert promos[0].percent_off == Decimal("10")


async def test_cars_list_from_seed(seeded_client) -> None:
    client, _sf = seeded_client
    response = await client.get("/api/v1/cars")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 7
    assert body[0]["id"] == "koenigsegg"
    assert body[0]["pricePerDay"] == 99.0
    assert body[0]["imageUrl"].startswith("/asset/Car/")


async def test_car_detail_and_404(seeded_client) -> None:
    client, _sf = seeded_client
    ok = await client.get("/api/v1/cars/jaguar")
    assert ok.status_code == 200
    assert ok.json()["name"] == "Jaguar XF"

    missing = await client.get("/api/v1/cars/nope")
    assert missing.status_code == 404


def test_fixture_file_shape() -> None:
    raw = json.loads(Path(FIXTURES).read_text())
    assert len(raw) == 7
    for item in raw:
        assert isinstance(item["id"], str)
        assert isinstance(item["pricePerDay"], float)
        assert "images" in item and isinstance(item["images"], list)
