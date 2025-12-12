# backend/app/routers/quota.py
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.quotas import get_quota_state

router = APIRouter(prefix="/quota", tags=["Quota"])


@router.get("/info", summary="Get current user's quota information")
async def quota_info(
        db: Annotated[AsyncSession, Depends(get_db)],
        current_user: Annotated[User, Depends(get_current_user)],
):
    s = await get_quota_state(db, current_user.id)
    return {
        "user_id": s.user_id,
        "limit_bytes": s.limit_bytes,
        "used_conv_bytes": s.used_conv_bytes,
        "used_doc_bytes": s.used_doc_bytes,
        "used_total_bytes": s.used_total_bytes,
        "used_ratio": s.used_ratio,
    }
