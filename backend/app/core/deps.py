# backend/app/core/deps.py
import os
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserRoleEnum

# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_scheme = HTTPBearer()


# ---------- helpers: admin scopes ----------

def _superadmin_email_set() -> set[str]:
    """
    Read SUPERADMIN_EMAILS from env (or .env via Docker),
    e.g.:
        SUPERADMIN_EMAILS=owner@lorgan.com,superadmin@example.com
    All emails are normalized to lowercase and trimmed.
    """
    raw = os.getenv("SUPERADMIN_EMAILS", "") or ""
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def is_super_admin(user: User) -> bool:
    """
    Global super-admin:
    - role == 'admin'
    - email in SUPERADMIN_EMAILS env list
    """
    if user.role != UserRoleEnum.admin:
        return False
    emails = _superadmin_email_set()
    if not emails:
        return False
    return (user.email or "").lower() in emails


def is_org_admin(user: User) -> bool:
    """
    Organization-level admin: any user whose role == 'admin'.
    (Super-admin is also a superset of org admin)
    """
    return user.role == UserRoleEnum.admin


# ---------- user authentication dependencies ----------
async def get_current_user(
        token: Annotated[HTTPAuthorizationCredentials, Depends(oauth2_scheme)],
        db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
    except JWTError:
        raise credentials_error

    try:
        user_id_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise credentials_error

    # Select user from DB
    stmt = select(User).where(User.id == user_id_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_error
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    General admin access control (Superadmin + Org admin).
    """
    if not is_org_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return current_user


async def require_super_admin(
        current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    Only global super-admins are allowed.
    """
    if not is_super_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    return current_user
