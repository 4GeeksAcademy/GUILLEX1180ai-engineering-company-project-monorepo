"""Shared FastAPI dependencies for authenticated routes."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from src.config import ALGORITHM, SECRET_KEY
from src.services import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> dict[str, Any]:
    """Decode the bearer token and return its current TinyDB user document."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        if not isinstance(subject, str):
            raise credentials_error
        user_id = int(subject)
    except (JWTError, TypeError, ValueError) as error:
        raise credentials_error from error

    user = get_user_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_error

    return user.model_dump(exclude={"hashed_password"})


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
