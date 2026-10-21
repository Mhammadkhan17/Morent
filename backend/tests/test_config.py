import pytest

from app.core.config import Settings


def test_sslmode_verify_modes_downgraded_to_require():
    s = Settings(
        database_url="postgresql://user:pass@host/db?sslmode=verify-full",
        database_url_unpooled="postgresql://user:pass@host/db?sslmode=verify-ca",
    )
    assert s.database_url.endswith("sslmode=require")
    assert s.database_url_unpooled.endswith("sslmode=require")


def test_sslmode_require_untouched():
    s = Settings(
        database_url="postgresql://user:pass@host/db?sslmode=require",
        database_url_unpooled="postgresql://user:pass@host/db",
    )
    assert s.database_url.endswith("sslmode=require")
    assert s.database_url_unpooled.endswith("/db")


async def test_lifespan_refuses_empty_webhook_secret(monkeypatch):
    from app.core.config import settings
    from app.main import app, lifespan

    monkeypatch.setattr(settings, "stripe_webhook_secret", "")
    agen = lifespan(app)
    with pytest.raises(RuntimeError, match="STRIPE_WEBHOOK_SECRET"):
        await agen.__anext__()
    await agen.aclose()


async def test_lifespan_starts_with_webhook_secret():
    from app.core.config import settings
    from app.main import app, lifespan

    prev = settings.stripe_webhook_secret
    settings.stripe_webhook_secret = "whsec_test"
    agen = lifespan(app)
    try:
        await agen.__anext__()
    finally:
        await agen.aclose()
        settings.stripe_webhook_secret = prev
