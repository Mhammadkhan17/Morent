"""bookings and payments

Revision ID: 2fbeb566ad69
Revises: 6b5cd5924f90
Create Date: 2026-10-16 21:10:07.779961

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2fbeb566ad69"
down_revision: str | Sequence[str] | None = "6b5cd5924f90"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema — bookings + payments only.

    Better Auth tables (user/session/account/verification/jwks) were created
    out-of-band; autogenerate wanted to drop them because they are not in
    SQLModel metadata. Those drops were removed by hand. user_id FK references
    public."user" per plan (auth tables exist before this migration).
    """
    op.create_table(
        "bookings",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("user_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("car_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("pickup_date", sa.Date(), nullable=False),
        sa.Column("dropoff_date", sa.Date(), nullable=False),
        sa.Column("pickup_time", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("dropoff_time", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "pickup_location",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
        ),
        sa.Column(
            "dropoff_location",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
        ),
        sa.Column("days", sa.Integer(), nullable=False),
        sa.Column("billing_name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("billing_phone", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "billing_address",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=False,
        ),
        sa.Column("billing_city", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("promo_code", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False),
        sa.Column("discount_cents", sa.Integer(), nullable=False),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("agreed_to_terms", sa.Boolean(), nullable=False),
        sa.Column("agreed_to_marketing", sa.Boolean(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "stripe_session_id",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=True,
        ),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            name="bookings_user_id_fkey",
        ),
        sa.ForeignKeyConstraint(["car_id"], ["cars.id"], name="bookings_car_id_fkey"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookings_car_id"), "bookings", ["car_id"], unique=False)
    op.create_index(
        op.f("ix_bookings_stripe_session_id"),
        "bookings",
        ["stripe_session_id"],
        unique=True,
    )
    op.create_index(op.f("ix_bookings_user_id"), "bookings", ["user_id"], unique=False)
    op.create_table(
        "payments",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("booking_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "stripe_payment_intent_id",
            sqlmodel.sql.sqltypes.AutoString(),
            nullable=True,
        ),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["booking_id"],
            ["bookings.id"],
            name="payments_booking_id_fkey",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payments_booking_id"),
        "payments",
        ["booking_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payments_stripe_payment_intent_id"),
        "payments",
        ["stripe_payment_intent_id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_payments_stripe_payment_intent_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_booking_id"), table_name="payments")
    op.drop_table("payments")
    op.drop_index(op.f("ix_bookings_user_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_stripe_session_id"), table_name="bookings")
    op.drop_index(op.f("ix_bookings_car_id"), table_name="bookings")
    op.drop_table("bookings")
