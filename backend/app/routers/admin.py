# backend/app/routers/admin.py
from __future__ import annotations

import random
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_, and_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.core.database import get_db
from app.core.deps import require_admin, is_super_admin
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.user import User, UserRoleEnum
from app.schemas.user_admin import (
    UsersPage, UserCardOut, UsersStatsOut,
    InviteUserIn, InviteUserOut, ApproveUserIn
)
from app.services.mailer import send_invite_email

router = APIRouter(prefix="/admin/users", tags=["Admin User Management"])


def _norm_role(role_from_ui: str) -> UserRoleEnum:
    r = (role_from_ui or "").strip().lower()
    return UserRoleEnum.admin if r in ("admin", "administrator") else UserRoleEnum.regular


def _role_to_str(role) -> str:
    """Normalize role (Enum or str) to 'admin'/'regular' string."""
    if role is None:
        return "regular"
    if isinstance(role, str):
        return role.lower()
    if hasattr(role, "value") and isinstance(role.value, str):
        return role.value.lower()
    if hasattr(role, "name") and isinstance(role.name, str):
        return role.name.lower()
    return str(role).split(".")[-1].lower()


def _user_to_card(u: User, org: Organization | None) -> UserCardOut:
    org_mini = None
    if org:
        org_mini = {"id": org.id, "name": org.name}
    data_to_validate = {
        "id": u.id,
        "display_name": u.display_name,
        "email": u.email,
        "role": _role_to_str(u.role),  # ensure string for schema
        "is_active": bool(u.is_active),
        "organization": org_mini
    }
    return UserCardOut.model_validate(data_to_validate)


@router.get("/stats", response_model=UsersStatsOut)
async def users_stats(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(require_admin)],
):
    """
    Global Super-admin: manage all organization's users
    Organization-level Admin: manage their organization's users
    """

    is_super = is_super_admin(current_user)
    base = select(User)
    if not is_super:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Org admin must belong to an organization")
        base = base.where(User.organization_id == current_user.organization_id)

    # Total Users
    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar_one()

    # Active Users
    active_q = base.where(User.is_active.is_(True))
    active = (await db.execute(
        select(func.count()).select_from(active_q.subquery())
    )).scalar_one()

    # Admin Users
    admin_q = base.where(User.role == UserRoleEnum.admin)
    admins = (await db.execute(
        select(func.count()).select_from(admin_q.subquery())
    )).scalar_one()

    return UsersStatsOut(
        total_users=int(total),
        active_users=int(active),
        admin_users=int(admins)
    )


@router.get("", response_model=UsersPage)
async def list_or_search_users(
        q: str | None = Query(default=None, description="search keywords (split by space)"),
        limit: int = Query(default=10, ge=1, le=100),
        offset: int = Query(default=0, ge=0),
        db: Annotated[AsyncSession, Depends(get_db)] = None,
        current_user: Annotated[User, Depends(require_admin)] = None,
):
    """
    Global Super-admin: Search users from all organizations
    Organization-level admin: Search users from their own organizations
    """
    is_super = is_super_admin(current_user)
    org = aliased(Organization)

    base = (
        select(User, org)
        .select_from(User)
        .join(org, User.organization_id == org.id, isouter=True)
    )

    if not is_super:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Org admin must belong to an organization")
        base = base.where(User.organization_id == current_user.organization_id)

    if q:
        tokens = [t.strip() for t in q.split() if t.strip()]
        conds_all: List = []
        for t in tokens:
            t_like = f"%{t}%"

            #  Enum should be cast and then ilike
            token_ors = or_(
                User.display_name.ilike(t_like),
                User.email.ilike(t_like),
                cast(User.role, String).ilike(t_like),  # key
                org.name.ilike(t_like),
            )

            # implement is_active key
            t_low = t.lower()
            if t_low in ("active", "true", "1"):
                token_ors = or_(token_ors, User.is_active.is_(True))
            elif t_low in ("inactive", "false", "0"):
                token_ors = or_(token_ors, User.is_active.is_(False))

            conds_all.append(token_ors)

        base = base.where(and_(*conds_all))

    # total
    total = (await db.execute(
        select(func.count()).select_from(base.subquery())
    )).scalar_one()

    # rows
    rows = (await db.execute(
        base.order_by(User.created_at.desc()).offset(offset).limit(limit)
    )).all()

    items = [_user_to_card(u, org) for (u, org) in rows]
    return UsersPage(items=items, total=int(total), limit=limit, offset=offset)


@router.post("", response_model=InviteUserOut, status_code=status.HTTP_201_CREATED)
async def invite_user(
        data: InviteUserIn,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(require_admin)],
):
    """
    Global Super-admin: can invite any organization's users
    Organization-level admin: only invite users from their own organization
    """

    is_super = is_super_admin(current_user)

    # Check organization permission
    if not is_super:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Org admin must belong to an organization")
        if data.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=403,
                detail="Org admin can only invite users to their own organization",
            )

    # Check email exists
    exists = (await db.execute(
        select(User)
        .where(User.email == data.email)
    )).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Check organization exists
    org = (await db.execute(
        select(Organization)
        .where(Organization.id == data.organization_id)
    )).scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Generate temporary password (8 digits)
    tmp_pw = "".join(str(random.randint(0, 9)) for _ in range(8))

    u = User(
        email=str(data.email),
        display_name=data.display_name,
        password_hash=hash_password(tmp_pw),
        role=_norm_role(data.role),  # Enum value
        is_active=True,
        organization_id=data.organization_id,
    )
    db.add(u)
    await db.flush()
    # Send invite email (placeholder)
    send_invite_email(to_email=u.email, to_name=u.display_name or "", temp_password=tmp_pw)

    await db.commit()
    await db.refresh(u)
    return InviteUserOut(user=_user_to_card(u, org), temporary_password=tmp_pw)


@router.post("/{user_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_user(
        user_id: str,
        data: ApproveUserIn,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(require_admin)],
):
    """
    Global Super-admin: can activate any users
    Organization-level admin: only activate their own users
    """

    is_super = is_super_admin(current_user)

    u = (await db.execute(
        select(User)
        .where(User.id == user_id)
    )).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_super:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Org admin must belong to an organization")
        if u.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from other organizations")

    u.is_active = bool(data.is_active)
    await db.commit()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
        user_id: str,
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(require_admin)],
):
    """
    Soft Delete: "deactivate"
    Global Super-admin: can stop any users
    Organization-level admin: can only deactivate their own users
    """
    is_super = is_super_admin(current_user)

    u = (await db.execute(
        select(User)
        .where(User.id == user_id)
    )).scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    if not is_super:
        if not current_user.organization_id:
            raise HTTPException(status_code=400, detail="Org admin must belong to an organization")
        if u.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from other organizations")

    # "Delete" = deactivate
    u.is_active = False
    await db.commit()
