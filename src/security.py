"""Password hashing and JWT access-token helpers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from passlib.hash import bcrypt

from src.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY


def hash_password(password: str) -> str:
    """Hash a password with bcrypt, enforcing bcrypt's 72-byte input limit."""
    if not isinstance(password, str) or not password:
        raise ValueError("Password must be a non-empty string.")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes for bcrypt.")
    return bcrypt.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password; malformed hashes fail closed instead of raising."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.verify(plain_password, hashed_password)
    except (TypeError, ValueError):
        return False


def create_access_token(data: dict[str, Any]) -> str:
    """Return a signed JWT with an expiration based on the validated settings."""
    payload = data.copy()
    payload["exp"] = datetime.now(UTC) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
