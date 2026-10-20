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
