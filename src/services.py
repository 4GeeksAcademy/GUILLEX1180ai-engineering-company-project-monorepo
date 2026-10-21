"""TinyDB service layer for users and their linked profiles."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from src.database import DB_LOCK, UserQuery, profiles_table, users_table
from src.schemas import User, UserCreate, UserRole, UserUpdate
from src.security import hash_password


class DuplicateUserError(ValueError):
    """Raised when a registration email is already in use."""


class UserNotFoundError(LookupError):
    """Raised when an operation targets a missing user."""


class InvalidUserUpdateError(ValueError):
    """Raised when an update contains no valid user fields."""


class UserStorageError(RuntimeError):
    """Raised when TinyDB cannot persist a user/profile operation."""


def _to_user(document: Any) -> User:
    """Validate a TinyDB document and expose its document ID as `id`."""
    values = dict(document)
    values["id"] = document.doc_id
    return User.model_validate(values)


def create_user(payload: UserCreate) -> User:
    """Create a role=user account and, when supplied, its separate profile."""
    email = str(payload.email).strip().casefold()
    profile_fields = payload.model_dump(include={"name", "phone", "address"})
    user_id: int | None = None

    with DB_LOCK:
        if users_table.get(UserQuery.email == email) is not None:
            raise DuplicateUserError("A user with this email already exists.")

        try:
            user_id = users_table.insert(
                {
                    "email": email,
                    "hashed_password": hash_password(payload.password),
                    "is_active": True,
                    "role": UserRole.user.value,
                    "created_at": datetime.now(UTC).isoformat(),
                }
            )
            users_table.update({"id": user_id}, doc_ids=[user_id])
            profiles_table.insert({"user_id": user_id, **profile_fields})
            document = users_table.get(doc_id=user_id)
        except Exception as error:
            # TinyDB has no transactions, so roll back a partially created user.
            if user_id is not None:
                users_table.remove(doc_ids=[user_id])
                profiles_table.remove(UserQuery.user_id == user_id)
            raise UserStorageError(
                "Could not create the user and profile.") from error

    if document is None:
        raise UserStorageError("The new user could not be loaded from TinyDB.")
    return _to_user(document)


def get_user_by_id(user_id: int) -> User | None:
    """Return one validated user by TinyDB document ID."""
    with DB_LOCK:
        document = users_table.get(doc_id=user_id)
    return _to_user(document) if document is not None else None


def get_user_by_email(email: str) -> User | None:
    """Return one validated user by normalized email address."""
    normalized_email = email.strip().casefold()
    with DB_LOCK:
        document = users_table.get(UserQuery.email == normalized_email)
    return _to_user(document) if document is not None else None


def list_users() -> list[User]:
    """Return all persisted users without exposing profile records."""
    with DB_LOCK:
        documents = users_table.all()
    return [_to_user(document) for document in documents]


def update_user(user_id: int, payload: UserUpdate) -> User:
    """Update email and/or role, preserving profile data in its own table."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise InvalidUserUpdateError(
            "Provide at least one user field to update.")
    if any(value is None for value in changes.values()):
        raise InvalidUserUpdateError("Email and role cannot be null.")

    if "email" in changes:
        changes["email"] = str(changes["email"]).strip().casefold()
    if "role" in changes:
        role = changes["role"]
        if not isinstance(role, UserRole):
            raise InvalidUserUpdateError(
                "Role must be admin, manager, or user.")
        changes["role"] = role.value

    with DB_LOCK:
        existing = users_table.get(doc_id=user_id)
        if existing is None:
            raise UserNotFoundError("User not found.")
        if "email" in changes and changes["email"] != existing["email"]:
            if users_table.get(UserQuery.email == changes["email"]) is not None:
                raise DuplicateUserError(
                    "A user with this email already exists.")

        users_table.update(changes, doc_ids=[user_id])
        updated = users_table.get(doc_id=user_id)

    if updated is None:
        raise UserNotFoundError("User not found after update.")
    return _to_user(updated)


def delete_user_and_profile(user_id: int) -> bool:
    """Delete a user and all linked profile documents under one DB lock."""
    with DB_LOCK:
        if users_table.get(doc_id=user_id) is None:
            return False
        try:
            profiles_table.remove(UserQuery.user_id == user_id)
            users_table.remove(doc_ids=[user_id])
        except Exception as error:
            raise UserStorageError(
                "Could not delete the user and linked profile.") from error
    return True
