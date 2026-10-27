"""cars.quantity — fleet units per listing

Revision ID: b3f8c2a91d47
Revises: 1eccb3865a1b
Create Date: 2026-10-22 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3f8c2a91d47"
down_revision: str | Sequence[str] | None = "1eccb3865a1b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "cars",
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("cars", "quantity")
