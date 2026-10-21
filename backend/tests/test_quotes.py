from decimal import Decimal

import pytest

from tests.conftest import quote_body


@pytest.mark.asyncio
async def test_quote_three_days(client, seeded_car):
    resp = await client.post("/api/v1/quotes", json=quote_body())
    assert resp.status_code == 200
    data = resp.json()
    assert data == {
        "days": 3,
        "subtotalCents": 29_700,
        "discountCents": 0,
        "totalCents": 29_700,
        "currency": "usd",
    }


@pytest.mark.asyncio
async def test_quote_with_promo(client, seeded_car, db_session):
    from app.models import PromoCode

    db_session.add(PromoCode(code="DISCOUNT10", percent_off=Decimal("10"), active=True))
    await db_session.commit()

    resp = await client.post(
        "/api/v1/quotes",
        json=quote_body(promoCode="discount10"),  # case-insensitive trim/upper
    )
    assert resp.status_code == 200
    assert resp.json()["discountCents"] == 2_970
    assert resp.json()["totalCents"] == 26_730


@pytest.mark.asyncio
async def test_quote_unknown_promo_422(client, seeded_car):
    resp = await client.post("/api/v1/quotes", json=quote_body(promoCode="NOPE"))
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail[0]["loc"] == ["body", "promoCode"]


@pytest.mark.asyncio
async def test_quote_unknown_car_404(client, seeded_car):
    resp = await client.post("/api/v1/quotes", json=quote_body(carId="missing"))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_quote_dropoff_before_pickup_422(client, seeded_car):
    body = quote_body()
    body["pickup"]["date"] = body["dropoff"]["date"]
    body["dropoff"]["date"] = body["pickup"]["date"]
    # force dropoff < pickup
    body["pickup"]["date"] = "2030-01-10"
    body["dropoff"]["date"] = "2030-01-01"
    resp = await client.post("/api/v1/quotes", json=body)
    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"] == ["body", "dropoffDate"]


async def _seed_hidden_car(db_session) -> None:
    from decimal import Decimal

    from app.models import Car

    db_session.add(
        Car(
            id="hidden_van",
            name="Hidden Van",
            type="MPV",
            description="Retired from catalogue",
            fuel_capacity="50L",
            transmission="Automatic",
            seating_capacity="8",
            price_per_day=Decimal("70.00"),
            image_url="https://example.com/van.png",
            images=["https://example.com/van.png"],
            tags=["MPV"],
            status="hidden",
        )
    )
    await db_session.commit()


async def test_quote_hidden_car_404(client, db_session):
    await _seed_hidden_car(db_session)
    body = quote_body()
    body["carId"] = "hidden_van"
    resp = await client.post("/api/v1/quotes", json=body)
    assert resp.status_code == 404


async def test_car_detail_hidden_404(client, db_session):
    await _seed_hidden_car(db_session)
    resp = await client.get("/api/v1/cars/hidden_van")
    assert resp.status_code == 404
