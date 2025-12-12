# backend/app/models/message.py
import datetime
import enum
from uuid import uuid4

from sqlalchemy import Column, String, Text, DateTime, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.models.base import Base


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"
    tool = "tool"


class Message(Base):
    __tablename__ = "message"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversation.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("session.id", ondelete="CASCADE"),
        nullable=False,
    )

    role = Column(String, nullable=False)  # user / assistant / ...
    content_md = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=False, default=0)
    meta = Column(JSONB, nullable=False, default=dict)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False,
    )
