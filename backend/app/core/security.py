from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi_betterauth import BetterAuth, User

from app.core.config import settings


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

CurrentUser = User


async def get_optional_user(
    user: Annotated[User | None, Depends(_better_auth)],
) -> User | None:
    return user


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
OptionalUserDep = Annotated[User | None, Depends(get_optional_user)]
