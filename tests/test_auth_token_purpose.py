"""Reject recovery JWTs and tokens without expiry as authenticated sessions."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from jose import jwt

from src import deps
from src.config import ALGORITHM, SECRET_KEY


@pytest.mark.parametrize("purpose", ["password_reset", "unknown", None])
def test_non_access_token_is_not_a_session(purpose: str | None, monkeypatch: pytest.MonkeyPatch) -> None:
    def forbidden_lookup(_user_id: int) -> None:
        pytest.fail("Invalid token must be rejected before querying users")

    monkeypatch.setattr(deps, "get_user_by_id", forbidden_lookup)
    token = jwt.encode(
        {"sub": "1", "type": purpose, "exp": datetime.now(
            UTC) + timedelta(minutes=5)},
        SECRET_KEY, algorithm=ALGORITHM,
    )
    with pytest.raises(HTTPException) as caught:
        deps.get_current_user(token)
    assert caught.value.status_code == 401
    assert caught.value.headers == {"WWW-Authenticate": "Bearer"}


def test_session_requires_expiration() -> None:
    token = jwt.encode({"sub": "1"}, SECRET_KEY, algorithm=ALGORITHM)
    with pytest.raises(HTTPException) as caught:
        deps.get_current_user(token)
    assert caught.value.status_code == 401
