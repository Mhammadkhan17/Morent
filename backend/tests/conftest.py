from collections.abc import AsyncIterator
from datetime import date, timedelta
from decimal import Decimal

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession as SQLModelAsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.core.security import get_current_user
from app.main import app
from app.models import Car
from app.services.stripe_service import get_stripe_service

TEST_USER = {
    "sub": "user_test_1",
    "id": "user_test_1",
    "email": "tester@example.com",
    "name": "Tester",
    "emailVerified": True,
}


class FakeCheckoutSession:
    def __init__(self, n: int) -> None:
        self.id = f"cs_test_{n}"
        self.client_secret = f"cs_test_secret_{n}"
        self.status = "open"
        self.payment_status = "unpaid"


class FakeSessions:
    def __init__(self) -> None:
        self._n = 0
        self.created_params: list = []

    async def create_async(self, params=None, options=None):
        self._n += 1
        self.created_params.append(params)
        return FakeCheckoutSession(self._n)

    async def retrieve_async(self, session_id, params=None, options=None):
        if not session_id.startswith("cs_test_"):
            raise RuntimeError("No such checkout session")
        s = FakeCheckoutSession(0)
        s.id = session_id
        if "complete" in session_id or "paid" in session_id:
            s.status = "complete"
            s.payment_status = "paid"
        return s


class FakeStripeService:
    """SDK-style fake: one method per operation, no network."""

    def __init__(self) -> None:
        self.sessions = FakeSessions()

    async def create_checkout_session(self, params):
        return await self.sessions.create_async(params=params)

    async def retrieve_checkout_session(self, session_id):
        return await self.sessions.retrieve_async(session_id)


@pytest_asyncio.fixture
async def engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def session_factory(engine):
    return async_sessionmaker(
        engine, expire_on_commit=False, class_=SQLModelAsyncSession
    )


@pytest_asyncio.fixture
async def db_session(session_factory):
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def fake_stripe() -> FakeStripeService:
    return FakeStripeService()


@pytest_asyncio.fixture
async def client(session_factory, fake_stripe) -> AsyncIterator[AsyncClient]:
    async def override_get_session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: dict(TEST_USER)
    app.dependency_overrides[get_stripe_service] = lambda: fake_stripe

    prev_secret = settings.stripe_webhook_secret
    settings.stripe_webhook_secret = settings.stripe_webhook_secret or "whsec_test"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    settings.stripe_webhook_secret = prev_secret
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def anon_client() -> AsyncIterator[AsyncClient]:
    """No auth override — for 401 checks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seeded_car(db_session) -> Car:
    car = Car(
        id="koenigsegg",
        name="Koenigsegg Gemera",
        type="Hybrid",
        description="Test car",
        fuel_capacity="70L",
        transmission="Automatic",
        seating_capacity="4",
        price_per_day=Decimal("99.00"),
        image_url="https://example.com/car.png",
        images=["https://example.com/car.png"],
        tags=["Sport"],
        status="available",
    )
    db_session.add(car)
    await db_session.commit()
    return car


def future(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


def quote_body(**overrides) -> dict:
    body = {
        "carId": "koenigsegg",
        "pickup": {
            "location": "New York",
            "date": future(10),
            "time": "10:00",
        },
        "dropoff": {
            "location": "New York",
            "date": future(13),
            "time": "10:00",
        },
    }
    body.update(overrides)
    return body


def booking_body(**overrides) -> dict:
    body = quote_body()
    body.update(
        {
            "billingName": "Test User",
            "billingPhone": "555-0100",
            "billingAddress": "1 Test St",
            "billingCity": "New York",
            "agreedToTerms": True,
            "agreedToMarketing": False,
        }
    )
    body.update(overrides)
    return body


def sign_stripe_event(payload: bytes, secret: str, timestamp: int | None = None) -> str:
    """Produce a Stripe-Signature header the same way Stripe does (HMAC-SHA256)."""
    import hashlib
    import hmac
    import time

    ts = timestamp if timestamp is not None else int(time.time())
    signed = hmac.new(
        secret.encode(),
        f"{ts}.".encode() + payload,
        hashlib.sha256,
    ).hexdigest()
    return f"t={ts},v1={signed}"
