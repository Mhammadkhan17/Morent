from decimal import Decimal

from sqlmodel import Field, Numeric, SQLModel


class PromoCode(SQLModel, table=True):
    __tablename__ = "promo_codes"

    code: str = Field(primary_key=True)
    percent_off: Decimal = Field(sa_type=Numeric(5, 2))
    active: bool = True
