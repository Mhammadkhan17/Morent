from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context
from app.core.config import settings
from app.models import (  # noqa: F401 — register tables
    Booking,
    Car,
    CustomerProfile,
    Message,
    Notification,
    Payment,
    PromoCode,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url from settings (direct/unpooled — never the pooler)
config.set_main_option("sqlalchemy.url", settings.database_url_unpooled)

target_metadata = SQLModel.metadata

# Better Auth tables are managed out-of-band (created by Auth itself).
# Without this filter, autogenerate proposes dropping session/account/
# verification/jwks and mangling the partial `user` mapping.
AUTH_TABLES = {"account", "jwks", "session", "user", "verification"}


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in AUTH_TABLES:
        return False
    if type_ == "index" and name in {"session_token_key", "user_email_key"}:
        return False
    table = getattr(object, "table", None)
    if table is not None and table.name in AUTH_TABLES:
        return False
    compare_table = getattr(compare_to, "table", None)
    return not (
        compare_table is not None and compare_table.name in AUTH_TABLES
    )


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
