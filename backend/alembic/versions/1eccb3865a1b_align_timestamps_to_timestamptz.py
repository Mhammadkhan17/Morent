"""align timestamps to timestamptz

The app always writes tz-aware UTC datetimes, but three tables were created
with TIMESTAMP WITHOUT TIME ZONE (sa.DateTime()) while SQLModel metadata
renders UTCDateTime — the drift autogenerate kept flagging (H7). Converts
five columns to TIMESTAMPTZ, interpreting existing naive values as UTC.

Revision ID: 1eccb3865a1b
Revises: 7614f96e736b
Create Date: 2026-10-21 16:50:45.741435

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "1eccb3865a1b"
down_revision: str | Sequence[str] | None = "7614f96e736b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TIMESTAMP_COLS = (
    ("messages", "created_at", False),
    ("messages", "read_at", True),
    ("notifications", "created_at", False),
    ("notifications", "read_at", True),
    ("webhook_events", "received_at", False),
)


def upgrade() -> None:
    for table, column, nullable in _TIMESTAMP_COLS:
        op.alter_column(
            table,
            column,
            existing_type=postgresql.TIMESTAMP(),
            type_=sqlmodel.sql.sqltypes.UTCDateTime(),
            existing_nullable=nullable,
            # naive stored values were written as UTC — pin the interpretation
            using=sa.text(f"{column} AT TIME ZONE 'UTC'"),
        )


def downgrade() -> None:
    for table, column, nullable in reversed(_TIMESTAMP_COLS):
        op.alter_column(
            table,
            column,
            existing_type=sqlmodel.sql.sqltypes.UTCDateTime(),
            type_=postgresql.TIMESTAMP(),
            existing_nullable=nullable,
            # keep UTC wall time when stripping the zone back off
            using=sa.text(f"{column} AT TIME ZONE 'UTC'"),
        )
