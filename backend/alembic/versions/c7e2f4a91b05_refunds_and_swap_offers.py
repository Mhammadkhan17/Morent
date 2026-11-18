"""refund fields + cancel_reason + swap_offers

Revision ID: c7e2f4a91b05
Revises: b3f8c2a91d47
Create Date: 2026-11-09 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7e2f4a91b05"
down_revision: str | Sequence[str] | None = "b3f8c2a91d47"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("cancel_reason", sa.Text(), nullable=True))
    op.add_column(
        "payments",
        sa.Column(
            "refund_status", sa.Text(), nullable=False, server_default="none"
        ),
    )
    op.add_column(
        "payments", sa.Column("stripe_refund_id", sa.Text(), nullable=True)
    )
    op.add_column(
        "payments",
        sa.Column("refunded_cents", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "payments",
        sa.Column("origin", sa.Text(), nullable=False, server_default="stripe"),
    )
    op.create_table(
        "swap_offers",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("booking_id", sa.Text(), nullable=False),
        sa.Column("offered_car_id", sa.Text(), nullable=False),
        sa.Column("offered_total_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("responded_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.ForeignKeyConstraint(["offered_car_id"], ["cars.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_swap_offers_booking_id", "swap_offers", ["booking_id"], unique=True
    )
    op.create_index("ix_swap_offers_offered_car_id", "swap_offers", ["offered_car_id"])


def downgrade() -> None:
    op.drop_index("ix_swap_offers_offered_car_id", table_name="swap_offers")
    op.drop_index("ix_swap_offers_booking_id", table_name="swap_offers")
    op.drop_table("swap_offers")
    op.drop_column("payments", "origin")
    op.drop_column("payments", "refunded_cents")
    op.drop_column("payments", "stripe_refund_id")
    op.drop_column("payments", "refund_status")
    op.drop_column("bookings", "cancel_reason")
