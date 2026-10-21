from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi_betterauth import BetterAuth, User
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models import UserRow


def _build_better_auth() -> BetterAuth:
    # JWKS fetch base: Vercel service binding when present, localhost otherwise.
    # iss/aud claims must always equal the public BETTER_AUTH_URL (auth_base_url),
    # never the internal binding URL — tokens are issued with the public origin.
    fetch_base = (settings.frontend_url or settings.auth_base_url).rstrip("/")
    return BetterAuth(
        fetch_base,
        audience=settings.auth_base_url,
        issuer=settings.auth_base_url,
        auto_error=False,
    )


_better_auth = _build_better_auth()


async def get_current_user(
    user: Annotated[User | None, Depends(_better_auth)],
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def require_owner(user: CurrentUserDep, session: SessionDep) -> User:
    """Owner gate: role is re-read from the DB on every request (never trusted
    from a JWT claim), so promoting/demoting takes effect immediately."""
    user_id = user.get("sub", "") if user else ""
    row = await session.get(UserRow, user_id) if user_id else None
    if row is None or row.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required",
        )
    return user


OwnerUserDep = Annotated[User, Depends(require_owner)]
