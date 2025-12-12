# backend/app/routers/password_reset.py
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models import User, PasswordResetCode
from app.schemas import ForgotPasswordIn, ResetPasswordIn
from app.services.mailer import send_password_reset_email

router = APIRouter(prefix="/auth/password", tags=["Auth"])


def _now_utc():
    return datetime.now(timezone.utc)


def _gen_code(length: int) -> str:
    # Digits Verification Code
    return "".join(str(random.randint(0, 9)) for _ in range(length))


@router.post("/forgot")
async def forgot_password(
        data: ForgotPasswordIn,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate CAPTCHA based on email + name.
    To prevent enumeration attacks, it returns 204 even if the user does not exist.
    """
    # Match user by email + display_name (case-insensitive)
    user = (
        await db.execute(
            select(User).where(
                and_(
                    User.email == str(data.email),
                    func.lower(User.display_name) == func.lower(str(data.display_name)),
                )
            )
        )
    ).scalar_one_or_none()

    # Return 204 either way; if exists, store code and send email
    dev_payload: dict[str, str] | None = None
    if user:
        # Deactivate any outstanding active codes so we can issue a new one
        await db.execute(
            update(PasswordResetCode)
            .where(
                PasswordResetCode.user_id == user.id,
                PasswordResetCode.sent_to_email == str(data.email),
                PasswordResetCode.consumed_at.is_(None),
            )
            .values(consumed_at=_now_utc())
        )

        code_plain = _gen_code(settings.PASSWORD_RESET_CODE_LENGTH)
        record = PasswordResetCode(
            user_id=user.id,
            code_hash=hash_password(code_plain),
            sent_to_email=str(data.email),
            created_at=_now_utc(),
            expires_at=_now_utc() + timedelta(minutes=settings.PASSWORD_RESET_CODE_TTL_MINUTES),
        )
        db.add(record)
        # "Send Email" placeholder
        send_password_reset_email(to_email=str(data.email), to_name=user.display_name, code=code_plain)
        await db.commit()

        # In non-production environments we expose the code directly to simplify development
        if settings.ENV.lower() not in {"prod", "production"}:
            dev_payload = {"code": code_plain}

    if dev_payload:
        return dev_payload

    # 204 No Content for security
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
        data: ResetPasswordIn,
        db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Verify email + code, set new password. Code is one-time use.
    """
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New password mismatch")

    user = (await db.execute(select(User).where(User.email == str(data.email)))).scalar_one_or_none()
    if not user:
        return

    dev_code = settings.PASSWORD_RESET_DEV_CODE
    now = _now_utc()
    rec = None

    # Allow bypass when a dev code is configured
    if not dev_code or data.code != dev_code:
        # Use the most recent valid code for the user/email
        rec = (
            await db.execute(
                select(PasswordResetCode)
                .where(
                    PasswordResetCode.user_id == user.id,
                    PasswordResetCode.sent_to_email == str(data.email),
                    PasswordResetCode.consumed_at.is_(None),
                    PasswordResetCode.expires_at > now,
                )
                .order_by(PasswordResetCode.created_at.desc())
            )
        ).scalar_one_or_none()

        if not rec or not verify_password(data.code, rec.code_hash):
            raise HTTPException(status_code=400, detail="Invalid or expired code")

    # Update password and mark code as consumed when applicable
    user.password_hash = hash_password(data.new_password)
    if rec:
        rec.consumed_at = now
    await db.commit()
