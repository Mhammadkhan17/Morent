from fastapi import APIRouter

from app.api.v1.admin import admin_router
from app.api.v1.bookings import bookings_router
from app.api.v1.cars import cars_router
from app.api.v1.checkout import checkout_router
from app.api.v1.events import events_router
from app.api.v1.health import health_router
from app.api.v1.me import me_router
from app.api.v1.quotes import quotes_router
from app.api.v1.webhooks import webhooks_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(me_router)
api_router.include_router(cars_router)
api_router.include_router(quotes_router)
api_router.include_router(bookings_router)
api_router.include_router(checkout_router)
api_router.include_router(webhooks_router)
api_router.include_router(events_router)
api_router.include_router(admin_router)
