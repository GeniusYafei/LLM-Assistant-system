# backend/app/models/conversation.py
from sqlalchemy import Column, String, DateTime, BigInteger, ForeignKey, Index, text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))

    # From which user
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profile.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # From which session
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("session.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    title = Column(String(255), nullable=True)

    status = Column(
        String(20),
        nullable=False,
        server_default="active"
    )  # active/deleted
    storage_size = Column(
        BigInteger,
        nullable=False,
        server_default='0')

    created_at = Column(
        DateTime(timezone=True),
        server_default=text("now()"),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=text("now()"),
        nullable=False,
    )
    __table_args__ = (
        Index("idx_conv_user_time", "user_id", "created_at"),

        CheckConstraint("storage_size >= 0", name="chk_conversation_storage_size"),
    )
