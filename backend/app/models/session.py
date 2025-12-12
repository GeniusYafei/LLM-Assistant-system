# backend/app/models/session.py

from sqlalchemy import Column, DateTime, ForeignKey, text, String, Index
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class Session(Base):
    __tablename__ = "session"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()")
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profile.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)

    state = Column(
        String(20),
        nullable=True,
        server_default="active"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_session_user_time", "user_id", "created_at"),
    )
