# backend/app/schemas/file.py
from datetime import datetime, timezone
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel, field_serializer

SYDNEY_TZ = ZoneInfo("Australia/Sydney")


class DocumentOut(BaseModel):
    id: UUID
    filename: str
    mime_type: str
    size_bytes: int
    status: str
    storage_url: str
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def _ser(self, dt: datetime, _):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(SYDNEY_TZ).strftime("%Y-%m-%d %H:%M:%S %Z")


class FileListOut(BaseModel):
    items: list[DocumentOut]
    total_count: int
    used_bytes: int
    limit_bytes: int
    used_ratio: float
    warn: bool


class UsageOut(BaseModel):
    used_bytes: int
    limit_bytes: int
    used_ratio: float
    warn: bool


class DocumentUploadResponse(BaseModel):
    document: DocumentOut
    quota: dict
