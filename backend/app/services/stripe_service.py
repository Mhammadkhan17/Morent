from typing import Any

import stripe

from app.core.config import settings


class StripeService:
    """Thin async wrapper around the official SDK's StripeClient."""

    def __init__(self, secret_key: str) -> None:
        self.client = stripe.StripeClient(secret_key)

    async def create_checkout_session(
        self, params: dict[str, Any]
    ) -> Any:  # stripe.Checkout.Session
        return await self.client.v1.checkout.sessions.create_async(params=params)

    async def retrieve_checkout_session(self, session_id: str) -> Any:
        return await self.client.v1.checkout.sessions.retrieve_async(session_id)

    async def expire_checkout_session(self, session_id: str) -> Any:
        """Close an open session so it can never be paid (superseded booking)."""
        return await self.client.v1.checkout.sessions.expire_async(session_id)


def get_stripe_service() -> StripeService:
    return StripeService(settings.stripe_secret_key)
