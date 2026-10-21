"""Login and current-user routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.database import DB_LOCK, UserQuery, profiles_table
from src.deps import CurrentUser
from src.schemas import AuthMeResponse, ProfileResponse, Token
from src.security import create_access_token, verify_password
from src.services import get_user_by_email


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(
    credentials: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """Authenticate using OAuth2 form fields (username is the user's email)."""
    normalized_email = credentials.username.strip().casefold()
    user = get_user_by_email(normalized_email)

    if user is None or not user.is_active or not verify_password(
        credentials.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id)})
    return Token(access_token=access_token)


@router.get("/me", response_model=AuthMeResponse)
def read_current_user(current_user: CurrentUser) -> AuthMeResponse:
    """Return the authenticated user's email, role, and linked profile."""
    with DB_LOCK:
        profile_document = profiles_table.get(
            UserQuery.user_id == current_user["id"]
        )

    profile = None
    if profile_document is not None:
        profile = ProfileResponse(
            id=profile_document.doc_id,
            **dict(profile_document),
        )

    return AuthMeResponse(
        email=current_user["email"],
        role=current_user["role"],
        profile=profile,
    )
