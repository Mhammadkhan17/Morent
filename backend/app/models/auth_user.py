from sqlmodel import Field, SQLModel


class UserRow(SQLModel, table=True):
    """Read-only mapping of Better Auth's `user` table (owner role check,
    admin customer joins). Columns not mapped here are untouched."""

    __tablename__ = "user"

    id: str = Field(primary_key=True)
    email: str = Field(default="")
    name: str | None = None
    role: str = Field(default="customer")
