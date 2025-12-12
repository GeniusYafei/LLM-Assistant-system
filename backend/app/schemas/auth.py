# backend/app/schemas/auth.py
import uuid
from datetime import datetime, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from pydantic import BaseModel, EmailStr, Field, field_serializer


# ---------- in ----------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: Optional[str] = None
    organization_id: uuid.UUID = Field(..., description="Organization ID (required)")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


SYDNEY_TZ = ZoneInfo("Australia/Sydney")


# ---------- out ----------

class UserOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    display_name: Optional[str] = None
    role: str
    organization_id: Optional[uuid.UUID] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # pydantic v2

    @field_serializer('created_at', 'last_login_at')
    def serialize_datetime(self, dt: Optional[datetime], _info):
        """Serialize datetime (UTC) to an ISO string in Sydney timezone."""
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        dt_sydney = dt.astimezone(SYDNEY_TZ)
        return dt_sydney.isoformat()


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- organization list ----------
class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Organization name")


class OrganizationOut(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True
