"""CI helper: create Better Auth's `user` table so alembic migrations that
reference public."user" can run on a fresh database.

In prod/Neon, Better Auth created this table out-of-band before any
migration ran; CI's empty Postgres service has no such history. Only the
columns the base Auth schema had at M3 are created — `role` is added later
by migration 873baecbda05, exactly as it was in production.

Run from backend/: PYTHONPATH=. uv run python scripts/ci_auth_stub.py
"""

import sqlalchemy as sa

from app.core.config import settings

_STUB_USER = """
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    image TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
)
"""


def main() -> None:
    engine = sa.create_engine(settings.database_url_unpooled)
    try:
        with engine.begin() as conn:
            conn.execute(sa.text(_STUB_USER))
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
