# backend/app/schemas/password_reset.py
from pydantic import BaseModel, EmailStr, Field


class ForgotPasswordIn(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1)


class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=6, max_length=128)
    confirm_password: str
