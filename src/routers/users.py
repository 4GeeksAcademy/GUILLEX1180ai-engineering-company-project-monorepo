"""User registration and protected user administration routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from src.deps import CurrentUser
from src.schemas import User, UserCreate, UserResponse, UserRole, UserUpdate
from src.services import (
    DuplicateUserError,
    InvalidUserUpdateError,
    UserNotFoundError,
    UserStorageError,
    create_user as create_user_service,
    delete_user_and_profile,
    get_user_by_id,
    list_users as list_users_service,
    update_user as update_user_service,
)


router = APIRouter(prefix="/users", tags=["users"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user.model_dump(exclude={"hashed_password"}))


def _require_owner_or_admin(user_id: int, current_user: dict[str, Any]) -> None:
    if current_user["id"] != user_id and current_user["role"] != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only manage your own account.",
        )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate) -> UserResponse:
    """Register a standard user and create the corresponding profile."""
    try:
        return _to_user_response(create_user_service(payload))
    except DuplicateUserError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except UserStorageError as error:
        raise HTTPException(
            status_code=500, detail="Could not create the user.") from error


@router.get("", response_model=list[UserResponse])
def list_users(current_user: CurrentUser) -> list[UserResponse]:
    """List all users only for administrators."""
    if current_user["role"] != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required.",
        )
    return [_to_user_response(user) for user in list_users_service()]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: CurrentUser) -> UserResponse:
    """Read a user account only if owned by the caller or caller is admin."""
    _require_owner_or_admin(user_id, current_user)
    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    return _to_user_response(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: CurrentUser,
) -> UserResponse:
    """Update an account; only administrators may change roles."""
    _require_owner_or_admin(user_id, current_user)
    if "role" in payload.model_fields_set and current_user["role"] != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators may change user roles.",
        )
    try:
        return _to_user_response(update_user_service(user_id, payload))
    except UserNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except DuplicateUserError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except InvalidUserUpdateError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except UserStorageError as error:
        raise HTTPException(
            status_code=500, detail="Could not update the user.") from error


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, current_user: CurrentUser) -> None:
    """Delete an account only if owned by the caller or caller is admin."""
    _require_owner_or_admin(user_id, current_user)
    if not delete_user_and_profile(user_id):
        raise HTTPException(status_code=404, detail="User not found.")
