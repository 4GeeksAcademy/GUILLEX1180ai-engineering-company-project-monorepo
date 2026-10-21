"""Pydantic request and response models for authentication and user profiles."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class User(StrictModel):
    """Persisted user fields; profile data belongs in the profiles table."""

    id: int
    email: EmailStr
    hashed_password: str
    is_active: bool
    role: UserRole
    created_at: datetime


class Profile(StrictModel):
    """Persisted profile fields, linked to a user by TinyDB document ID."""

    id: int
    user_id: int
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class UserCreate(StrictModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("password")
    @classmethod
    def validate_bcrypt_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError(
                "Password must not exceed 72 UTF-8 bytes for bcrypt.")
        return value


class UserResponse(StrictModel):
    id: int
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime


class UserUpdate(StrictModel):
    email: EmailStr | None = None
    role: UserRole | None = None


class ProfileBase(StrictModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class ProfileResponse(ProfileBase):
    id: int
    user_id: int


class Token(StrictModel):
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(StrictModel):
    email: EmailStr
    role: UserRole
    profile: ProfileResponse | None = None
