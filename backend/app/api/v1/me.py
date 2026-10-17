from fastapi import APIRouter

from app.core.security import CurrentUserDep

me_router = APIRouter(prefix="/me", tags=["me"])


@me_router.get("")
async def me(user: CurrentUserDep) -> dict[str, str | bool | None]:
    return {
        "id": user.get("sub", ""),
        "email": user.get("email", ""),
        "name": user.get("name"),
        "emailVerified": user.get("emailVerified", False),
    }
