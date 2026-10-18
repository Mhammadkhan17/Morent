"""M6-5c: admin promo-code CRUD."""


async def test_promo_crud(client, owner_user, db_session):
    created = await client.post(
        "/api/v1/admin/promo-codes",
        json={"code": "save10", "percent": 10},
    )
    assert created.status_code == 201
    assert created.json() == {"code": "SAVE10", "percent": 10.0, "isActive": True}

    dup = await client.post(
        "/api/v1/admin/promo-codes",
        json={"code": "SAVE10", "percent": 5},
    )
    assert dup.status_code == 409

    listing = await client.get("/api/v1/admin/promo-codes")
    assert {"code": "SAVE10", "percent": 10.0, "isActive": True} in listing.json()

    patched = await client.patch(
        "/api/v1/admin/promo-codes/SAVE10",
        json={"percent": 15, "isActive": False},
    )
    assert patched.status_code == 200
    assert patched.json() == {"code": "SAVE10", "percent": 15.0, "isActive": False}

    missing = await client.patch(
        "/api/v1/admin/promo-codes/NOPE", json={"percent": 5}
    )
    assert missing.status_code == 404

    bad_percent = await client.post(
        "/api/v1/admin/promo-codes",
        json={"code": "TOOBIG", "percent": 150},
    )
    assert bad_percent.status_code == 422

    # Deactivated promo must not price a quote (existing resolve_promo rule)
    deleted = await client.delete("/api/v1/admin/promo-codes/SAVE10")
    assert deleted.status_code == 204
    after = (await client.get("/api/v1/admin/promo-codes")).json()
    assert "SAVE10" not in {p["code"] for p in after}
    assert (await client.delete("/api/v1/admin/promo-codes/SAVE10")).status_code == 404
