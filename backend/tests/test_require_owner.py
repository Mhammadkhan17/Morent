import pytest
from fastapi import HTTPException

from app.core.security import require_owner
from app.models import UserRow
from tests.conftest import TEST_USER


async def test_owner_passes(db_session) -> None:
    db_session.add(
        UserRow(id=TEST_USER["sub"], email=TEST_USER["email"], role="owner")
    )
    await db_session.commit()

    result = await require_owner(dict(TEST_USER), db_session)

    assert result["sub"] == TEST_USER["sub"]


async def test_customer_forbidden(db_session) -> None:
    db_session.add(
        UserRow(id=TEST_USER["sub"], email=TEST_USER["email"], role="customer")
    )
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await require_owner(dict(TEST_USER), db_session)

    assert exc_info.value.status_code == 403


async def test_unknown_user_forbidden(db_session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await require_owner(dict(TEST_USER), db_session)

    assert exc_info.value.status_code == 403


async def test_role_is_read_from_db_not_token(db_session) -> None:
    """A token still saying 'customer' must not matter once the row is owner."""
    db_session.add(
        UserRow(id=TEST_USER["sub"], email=TEST_USER["email"], role="owner")
    )
    await db_session.commit()
    stale_token_user = dict(TEST_USER, role="customer")

    result = await require_owner(stale_token_user, db_session)

    assert result["role"] == "customer"  # token unchanged — DB decides access
