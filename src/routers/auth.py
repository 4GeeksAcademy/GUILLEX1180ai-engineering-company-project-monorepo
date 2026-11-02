"""Login and current-user routes."""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.database import DB_LOCK, UserQuery, profiles_table
from src.deps import CurrentUser
from src.email_service import send_password_reset_email
from src.schemas import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ProfileResponse,
    ResetPasswordRequest,
    Token,
)
from src.security import create_access_token, verify_password
from src.services import (
    InvalidCurrentPasswordError,
    InvalidPasswordResetTokenError,
    UserNotFoundError,
    build_password_reset_url,
    change_user_password,
    get_user_by_email,
    issue_password_reset_token,
    reset_user_password,
    revoke_password_reset_token,
)


router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
PASSWORD_RESET_MESSAGE = (
    "Si la dirección existe en nuestro sistema, recibirás un correo de restablecimiento."
)


def _process_password_reset_request(email: str) -> None:
    """Look up the account and send mail after the generic HTTP response is queued."""
    reset_token: str | None = None
    try:
        user = get_user_by_email(email)
        if user is None or not user.is_active:
            return
        reset_token = issue_password_reset_token(user.id)
        reset_url = build_password_reset_url(reset_token)
        send_password_reset_email(str(user.email), reset_url)
    except Exception:
        if reset_token is not None:
            try:
                revoke_password_reset_token(reset_token)
            except Exception:
                logger.error("Could not revoke a reset token after email failure.")
        # Do not log the email, reset URL/token, provider response, or exception.
        logger.error("Password-reset request could not be completed.")


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


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
) -> MessageResponse:
    """Queue reset processing and return the same immediate response for all emails."""
    background_tasks.add_task(_process_password_reset_request, str(payload.email))
    return MessageResponse(message=PASSWORD_RESET_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    """Consume a valid one-time reset token and replace the password hash."""
    try:
        reset_user_password(payload.token, payload.new_password)
    except InvalidPasswordResetTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido, expirado o ya utilizado",
        ) from error
    return MessageResponse(message="Contraseña restablecida correctamente.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
) -> MessageResponse:
    """Change the authenticated user's password after verifying the current one."""
    try:
        change_user_password(
            int(current_user["id"]),
            payload.current_password,
            payload.new_password,
        )
    except InvalidCurrentPasswordError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        ) from error
    except UserNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no disponible.") from error
    return MessageResponse(message="Contraseña actualizada correctamente.")
