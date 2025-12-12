# backend/app/schemas/chat.py
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field, field_serializer

SYDNEY_TZ = ZoneInfo("Australia/Sydney")


class ConversationCreate(BaseModel):
    title: Optional[str] = None


class ConversationOut(BaseModel):
    id: UUID
    title: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    storage_size: int | None = None

    class Config:
        from_attributes = True

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, dt: datetime, _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt_sydney = dt.astimezone(SYDNEY_TZ)
        return dt_sydney.isoformat()


class ConversationRename(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=18000)
    document_ids: List[UUID] = Field(default_factory=list)


class MessageOut(BaseModel):
    id: UUID
    role: str
    content_md: str
    meta: dict
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_dt(self, dt: datetime, _info):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt_sydney = dt.astimezone(SYDNEY_TZ)
        return dt_sydney.isoformat()


class ConversationWithMessages(BaseModel):
    conversation: ConversationOut
    messages: List[MessageOut]
