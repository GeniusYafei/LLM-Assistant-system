# backend/app/routers/auth.py
import datetime
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.organization import Organization
from app.models.user import User, UserRoleEnum
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserOut,
    OrganizationOut,
    OrganizationCreate
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/organizations", response_model=list[OrganizationOut])
async def list_organizations(
        db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Return a list of all organizations (id + name).
    """
    result = await db.execute(select(Organization).order_by(Organization.name.asc()))
    orgs = result.scalars().all()
    return [OrganizationOut.model_validate(o) for o in orgs]


@router.post("/organizations", response_model=OrganizationOut, status_code=201)
async def create_organization(
        payload: OrganizationCreate,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new organization.

    Body:
    - name: organization name (must be unique)
    """
    # Optional: prevent duplicate name（not required by SQL, but nice）
    existing_stmt = select(Organization).where(Organization.name == payload.name)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with this name already exists",
        )

    org = Organization(name=payload.name)
    db.add(org)
    await db.commit()
    await db.refresh(org)

    return OrganizationOut.model_validate(org)


@router.post("/register", response_model=UserOut, status_code=201)
async def register_user(
        payload: RegisterRequest,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    # Check if organization exists (Must)
    org_stmt = select(Organization).where(Organization.id == payload.organization_id)
    org_result = await db.execute(org_stmt)
    org = org_result.scalar_one_or_none()

    if org is None:
        raise HTTPException(status_code=400, detail="Organization not found")

    # Check if email already exists
    user_stmt = select(User).where(User.email == payload.email)
    user_result = await db.execute(user_stmt)
    existing = user_result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    user = User(
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name or payload.email.split("@")[0],
        organization_id=payload.organization_id,
        role=UserRoleEnum.regular,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    user_for_response = UserOut.model_validate(user)

    return user_for_response


@router.post("/login", response_model=TokenResponse)
async def login(
        payload: LoginRequest,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive")

    # Login successful, update last login time
    user.last_login_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    await db.refresh(user)

    user_for_response = UserOut.model_validate(user)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=str(user.id),
        expires_delta=access_token_expires,
        extra={
            "role": user.role.value,
            "org_id": str(user.organization_id) if user.organization_id else None
        },
    )
    return TokenResponse(
        access_token=token,
        user=user_for_response,
    )
