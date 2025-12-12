# backend/app/models/passwd_reset.py
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class PasswordResetCode(Base):
    __tablename__ = "password_reset_code"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_profile.id", ondelete="CASCADE"), index=True, nullable=False)

    # For safe, only save code (hash); Send original code by email
    code_hash = Column(String(255), nullable=False)
    sent_to_email = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)

    attempts = Column(Integer, default=0, nullable=False)

    user = relationship("User", backref="password_resets")