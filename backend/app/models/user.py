# backend/app/models/user.py
import datetime
import enum
from uuid import uuid4

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM

from app.models.base import Base


class UserRoleEnum(enum.Enum):
    regular = "regular"
    admin = "admin"


class User(Base):
    __tablename__ = "user_profile"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)

    role = Column(ENUM(UserRoleEnum, name="user_role_enum", native_enum=True), nullable=False,
                  default=UserRoleEnum.regular)

    # Login credentials
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    # Organizational Isolation: Allowed to be empty, followed by "user-selected organization" logic.
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organization.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    display_name = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.UTC),
        nullable=False
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)
