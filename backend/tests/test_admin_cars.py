"""M6-5b: admin car CRUD — create/update fields, hide, delete rules."""

from tests.conftest import seed_booking

CAR_PAYLOAD = {
    "name": "Test Car",
    "type": "Sedan",
    "description": "A test sedan",
    "fuelCapacity": "50L",
    "transmission": "Automatic",
    "seatingCapacity": "5",
    "pricePerDay": 59.9,
    "originalPrice": 69.9,
    "imageUrl": "https://example.com/1.jpg",
    "images": [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
    ],
    "tags": ["New", "Electric"],
    "rating": 4.5,
    "status": "available",
}


async def test_admin_cars_create_and_list(client, owner_user, seeded_car):
    listing = await client.get("/api/v1/admin/cars")
    assert listing.status_code == 200
    assert {c["id"] for c in listing.json()} >= {"koenigsegg"}
    koenigsegg = next(c for c in listing.json() if c["id"] == "koenigsegg")
    assert koenigsegg["status"] == "available"

    resp = await client.post("/api/v1/admin/cars", json=CAR_PAYLOAD)
    assert resp.status_code == 201
    created = resp.json()
    assert created["id"] == "test-car"
    assert created["status"] == "available"
    assert created["images"] == CAR_PAYLOAD["images"]
    assert created["pricePerDay"] == 59.9

    dup = await client.post("/api/v1/admin/cars", json=CAR_PAYLOAD)
    assert dup.json()["id"] == "test-car-2"

    public = await client.get("/api/v1/cars")
    assert "test-car" in {c["id"] for c in public.json()}

    invalid = await client.post("/api/v1/admin/cars", json={"name": "Nope"})
    assert invalid.status_code == 422


async def test_admin_car_patch(client, owner_user, seeded_car):
    resp = await client.patch(
        "/api/v1/admin/cars/koenigsegg",
        json={"pricePerDay": 79.5, "status": "hidden", "images": ["a", "b"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["pricePerDay"] == 79.5
    assert data["status"] == "hidden"
    assert data["images"] == ["a", "b"]

    public = await client.get("/api/v1/cars")
    assert "koenigsegg" not in {c["id"] for c in public.json()}

    missing = await client.patch(
        "/api/v1/admin/cars/nope", json={"status": "hidden"}
    )
    assert missing.status_code == 404

    bad_status = await client.patch(
        "/api/v1/admin/cars/koenigsegg", json={"status": "bogus"}
    )
    assert bad_status.status_code == 422


async def test_admin_car_delete(client, owner_user, seeded_car, db_session):
    created = (
        await client.post("/api/v1/admin/cars", json=CAR_PAYLOAD)
    ).json()
    resp = await client.delete(f"/api/v1/admin/cars/{created['id']}")
    assert resp.status_code == 204
    assert (await client.get(f"/api/v1/admin/cars/{created['id']}")).status_code == 404

    await seed_booking(
        db_session, "b_del1", status="active", total_cents=100
    )
    blocked = await client.delete("/api/v1/admin/cars/koenigsegg")
    assert blocked.status_code == 409
    assert "hidden" in blocked.json()["detail"]
    listing = await client.get("/api/v1/admin/cars")
    assert "koenigsegg" in {c["id"] for c in listing.json()}


async def test_admin_car_delete_blocked_by_booking_history(
    client, owner_user, seeded_car, db_session
):
    # Terminal bookings still block physical delete (bookings.car_id FK);
    # plan steers to status=hidden instead.
    await seed_booking(db_session, "b_hist", status="completed", total_cents=100)
    resp = await client.delete("/api/v1/admin/cars/koenigsegg")
    assert resp.status_code == 409
    assert "hidden" in resp.json()["detail"]
