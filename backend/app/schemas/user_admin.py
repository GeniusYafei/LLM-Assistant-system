# backend/app/schemas/user_admin.py
from __future__ import annotations

import uuid
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class OrganizationMini(BaseModel):
    id: uuid.UUID
    name: str


class UserCardOut(BaseModel):
    id: uuid.UUID
    display_name: Optional[str] = None
    email: EmailStr
    role: str
    is_active: bool
    organization: Optional[OrganizationMini] = None


class UsersPage(BaseModel):
    items: List[UserCardOut]
    total: int
    limit: int
    offset: int


class UsersStatsOut(BaseModel):
    total_users: int
    active_users: int
    admin_users: int


class InviteUserIn(BaseModel):
    display_name: Optional[str] = None
    email: EmailStr
    role: str = Field(description="UI: 'User' or 'Admin'")
    organization_id: uuid.UUID


class InviteUserOut(BaseModel):
    user: UserCardOut
    # Optional return (Development Stage)
    temporary_password: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)
    confirm_password: str


class ApproveUserIn(BaseModel):
    is_active: bool = True


class UpdateNameIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=128)
