# backend/app/core/security.py
import datetime
from datetime import timedelta
from typing import Optional, Any

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Using argon2（slow, salted）
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
        subject: str,
        expires_delta: Optional[timedelta] = None,
        extra: Optional[dict[str, Any]] = None,
) -> str:
    to_encode: dict[str, Any] = {"sub": subject}
    if extra:
        to_encode.update(extra)
    if expires_delta:
        expire = datetime.datetime.now(datetime.UTC) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt
