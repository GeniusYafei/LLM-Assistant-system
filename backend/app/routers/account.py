# backend/app/routers/account.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import verify_password, hash_password
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import UserOut
from app.schemas.user_admin import UpdateNameIn, ChangePasswordIn

router = APIRouter(prefix="/settings", tags=["Account Settings"])


@router.get("/user", response_model=UserOut)
async def get_user(
        current_user: Annotated[User, Depends(get_current_user)],
):
    return UserOut.model_validate(current_user)


@router.patch("/user/name", response_model=UserOut)
async def update_user_name(
        data: UpdateNameIn,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    current_user.display_name = data.display_name
    await db.commit()
    await db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.get("/user/organizations")
async def user_organizations(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    # Return current org info
    if not current_user.organization_id:
        return {"items": []}
    org = (await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )).scalar_one_or_none()
    if not org:
        return {"items": []}
    return {"items": [{"id": org.id, "name": org.name}]}


@router.post("/user/change_password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
        data: ChangePasswordIn,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password mismatch")
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
