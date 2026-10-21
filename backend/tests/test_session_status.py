import pytest


@pytest.mark.asyncio
async def test_session_status_open_session(client):
    resp = await client.get(
        "/api/v1/checkout/session-status", params={"session_id": "cs_test_open"}
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "open", "paymentStatus": "unpaid"}


@pytest.mark.asyncio
async def test_session_status_complete_paid_session(client):
    resp = await client.get(
        "/api/v1/checkout/session-status", params={"session_id": "cs_test_complete"}
    )
    assert resp.status_code == 200
    assert resp.json() == {"status": "complete", "paymentStatus": "paid"}


@pytest.mark.asyncio
async def test_session_status_unknown_session_404(client):
    resp = await client.get(
        "/api/v1/checkout/session-status", params={"session_id": "cs_nope"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_session_status_requires_session_id(client):
    resp = await client.get("/api/v1/checkout/session-status")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_session_status_stripe_outage_500(client, fake_stripe, monkeypatch):
    """Only genuine not-found maps to 404; outages surface as 5xx so the
    return page can say retry instead of 'session not found'."""

    async def boom(session_id, *args, **kwargs):
        raise RuntimeError("stripe unreachable")

    monkeypatch.setattr(fake_stripe, "retrieve_checkout_session", boom)
    with pytest.raises(RuntimeError, match="stripe unreachable"):
        await client.get(
            "/api/v1/checkout/session-status",
            params={"session_id": "cs_test_open"},
        )
