from app.core import security
from app.core.config import settings


def test_jwks_base_prefers_binding_and_claims_stay_on_auth_base(monkeypatch):
    monkeypatch.setattr(
        settings, "frontend_url", "https://frontend.internal/"
    )
    monkeypatch.setattr(settings, "auth_base_url", "https://morent.vercel.app")

    better_auth = security._build_better_auth()

    assert better_auth.base_url == "https://frontend.internal"
    assert better_auth.audience == "https://morent.vercel.app"
    assert better_auth.issuer == "https://morent.vercel.app"


def test_jwks_base_falls_back_to_auth_base_when_binding_absent(monkeypatch):
    monkeypatch.setattr(settings, "frontend_url", None)
    monkeypatch.setattr(settings, "auth_base_url", "http://localhost:3000")

    better_auth = security._build_better_auth()

    assert better_auth.base_url == "http://localhost:3000"
    assert better_auth.audience == "http://localhost:3000"
    assert better_auth.issuer == "http://localhost:3000"
