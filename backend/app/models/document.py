# backend/app/models/document.py
import datetime
from uuid import uuid4

from sqlalchemy import Column, Text, DateTime, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class Document(Base):
    __tablename__ = "document"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    filename = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    storage_url = Column(Text, nullable=False)
    processed_text = Column(Text, nullable=True)
    processed_text_bytes = Column(BigInteger, nullable=True)
    sha256 = Column(Text, nullable=True)
    status = Column(Text, nullable=False, default="uploaded")  # uploaded/archived_quota/deleted
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False
    )


class UserDocument(Base):
    __tablename__ = "user_document"

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profile.id", ondelete="CASCADE"),
        primary_key=True
    )
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("document.id", ondelete="CASCADE"),
        primary_key=True
    )
    permission = Column(Text, nullable=False, default="owner")
    linked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False
    )


class ConversationDocument(Base):
    __tablename__ = "conversation_document"

    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversation.id", ondelete="CASCADE"),
        primary_key=True
    )
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("document.id", ondelete="CASCADE"),
        primary_key=True
    )
    scope = Column(Text, nullable=False, default="context")
    linked_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False
    )
