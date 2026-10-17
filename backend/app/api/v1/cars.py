from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.db import get_session
from app.models import Car
from app.schemas.cars import CarRead, car_to_read

cars_router = APIRouter(prefix="/cars", tags=["cars"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@cars_router.get("")
async def list_cars(session: SessionDep) -> list[CarRead]:
    result = await session.exec(select(Car).where(Car.status == "available"))
    return [car_to_read(car) for car in result.all()]


@cars_router.get("/{car_id}")
async def get_car(car_id: str, session: SessionDep) -> CarRead:
    car = await session.get(Car, car_id)
    if car is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Car not found"
        )
    return car_to_read(car)
