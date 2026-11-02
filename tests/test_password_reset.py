"""Integration tests for AUTH-03 password reset and password change."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import Iterator
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from passlib.hash import bcrypt

from src.config import (
    ALGORITHM,
    FRONTEND_URL,
    RESET_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
)
from src.database import (
    DB_LOCK,
    PasswordResetTokenQuery,
    UserQuery,
    password_reset_tokens_table,
    profiles_table,
    users_table,
)
from src.main import app
from src.routers import auth as auth_router


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def created_user_ids() -> Iterator[list[int]]:
    user_ids: list[int] = []
    yield user_ids
    with DB_LOCK:
        for user_id in user_ids:
            password_reset_tokens_table.remove(
                PasswordResetTokenQuery.user_id == user_id
            )
            profiles_table.remove(UserQuery.user_id == user_id)
            users_table.remove(doc_ids=[user_id])


def create_test_user(client: TestClient, user_ids: list[int]) -> tuple[str, str, int]:
    suffix = token_hex(6)
    email = f"auth03-{suffix}@example.com"
    password = f"Current-Password-{suffix}"
    response = client.post(
        "/users",
        json={
            "email": email,
            "password": password,
            "name": "Password Reset QA",
            "phone": "+1 555 0199",
            "address": "Temporary reset-test address",
        },
    )
    assert response.status_code == 201, response.text
    user_id = int(response.json()["id"])
    user_ids.append(user_id)
    return email, password, user_id


def capture_reset_email(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    sent: list[tuple[str, str]] = []
    monkeypatch.setattr(
        auth_router,
        "send_password_reset_email",
        lambda recipient, reset_url: sent.append((recipient, reset_url)),
    )
    return sent


def token_from_url(reset_url: str) -> str:
    parsed = urlparse(reset_url)
    values = parse_qs(parsed.query)
    assert parsed.path == "/reset-password"
    assert "token" in values
    return values["token"][0]


def test_forgot_password_is_non_enumerating_and_persists_only_token_hash(
    client: TestClient,
    created_user_ids: list[int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email, _, user_id = create_test_user(client, created_user_ids)
    sent = capture_reset_email(monkeypatch)

    missing_response = client.post(
        "/auth/forgot-password",
        json={"email": f"missing-{token_hex(4)}@example.com"},
    )
    known_response = client.post("/auth/forgot-password", json={"email": email})

    assert missing_response.status_code == known_response.status_code == 200
    assert missing_response.json() == known_response.json()
    assert len(sent) == 1
    assert sent[0][0] == email
    assert sent[0][1].startswith(f"{FRONTEND_URL}/reset-password?token=")

    token = token_from_url(sent[0][1])
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["type"] == "password_reset"
    assert claims["sub"] == str(user_id)
    assert timedelta(minutes=15) <= (
        datetime.fromtimestamp(claims["exp"], UTC) - datetime.now(UTC)
    ) <= timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES + 1)

    with DB_LOCK:
        record = password_reset_tokens_table.get(
            PasswordResetTokenQuery.user_id == user_id
        )
    assert record is not None
    assert record["used"] is False
    assert record["token_hash"] != token
    assert len(record["token_hash"]) == 64


def test_reset_password_changes_hash_and_rejects_reuse(
    client: TestClient,
    created_user_ids: list[int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email, old_password, user_id = create_test_user(client, created_user_ids)
    sent = capture_reset_email(monkeypatch)
    requested = client.post("/auth/forgot-password", json={"email": email})
    assert requested.status_code == 200
    reset_token = token_from_url(sent[0][1])
    new_password = f"New-Password-{token_hex(8)}"

    reset = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": new_password},
    )
    assert reset.status_code == 200, reset.text

    with DB_LOCK:
        user_document = users_table.get(doc_id=user_id)
        token_document = password_reset_tokens_table.get(
            PasswordResetTokenQuery.user_id == user_id
        )
    assert user_document is not None and token_document is not None
    assert bcrypt.verify(new_password, user_document["hashed_password"])
    assert not bcrypt.verify(old_password, user_document["hashed_password"])
    assert token_document["used"] is True

    replay = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": f"Replay-{token_hex(8)}"},
    )
    assert replay.status_code == 400
    assert replay.json()["detail"] == "Token inválido, expirado o ya utilizado"


@pytest.mark.parametrize(
    "token",
    ["not-a-jwt", ""],
)
def test_invalid_reset_tokens_return_400(client: TestClient, token: str) -> None:
    response = client.post(
        "/auth/reset-password",
        json={"token": token or "x", "new_password": "New-Password-123"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Token inválido, expirado o ya utilizado"


def test_expired_or_unstored_reset_token_returns_400(
    client: TestClient,
    created_user_ids: list[int],
) -> None:
    _, _, user_id = create_test_user(client, created_user_ids)
    expired_token = jwt.encode(
        {
            "sub": str(user_id),
            "type": "password_reset",
            "jti": token_hex(12),
            "exp": datetime.now(UTC) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    response = client.post(
        "/auth/reset-password",
        json={"token": expired_token, "new_password": "Expired-New-Password"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Token inválido, expirado o ya utilizado"


def test_change_password_checks_current_password_and_updates_hash(
    client: TestClient,
    created_user_ids: list[int],
) -> None:
    email, current_password, user_id = create_test_user(client, created_user_ids)
    login = client.post(
        "/auth/login",
        data={"username": email, "password": current_password},
    )
    assert login.status_code == 200, login.text
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    rejected = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": "wrong-current-password", "new_password": "New-Password-456"},
    )
    assert rejected.status_code == 400
    assert rejected.json()["detail"] == "La contraseña actual es incorrecta"

    new_password = f"Changed-Password-{token_hex(8)}"
    changed = client.post(
        "/auth/change-password",
        headers=headers,
        json={"current_password": current_password, "new_password": new_password},
    )
    assert changed.status_code == 200, changed.text

    with DB_LOCK:
        user_document = users_table.get(doc_id=user_id)
    assert user_document is not None
    assert bcrypt.verify(new_password, user_document["hashed_password"])
    assert not bcrypt.verify(current_password, user_document["hashed_password"])

    old_login = client.post(
        "/auth/login",
        data={"username": email, "password": current_password},
    )
    new_login = client.post(
        "/auth/login",
        data={"username": email, "password": new_password},
    )
    assert old_login.status_code == 401
    assert new_login.status_code == 200


def test_change_password_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/auth/change-password",
        json={"current_password": "current-password", "new_password": "New-Password-789"},
    )
    assert response.status_code == 401
    assert response.headers.get("www-authenticate") == "Bearer"


def test_mail_delivery_failure_keeps_non_enumerating_response(
    client: TestClient,
    created_user_ids: list[int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email, _, user_id = create_test_user(client, created_user_ids)

    def fail_delivery(_recipient: str, _reset_url: str) -> None:
        raise RuntimeError("simulated provider outage")

    monkeypatch.setattr(auth_router, "send_password_reset_email", fail_delivery)
    response = client.post("/auth/forgot-password", json={"email": email})

    assert response.status_code == 200
    assert response.json() == {
        "message": "Si la dirección existe en nuestro sistema, recibirás un correo de restablecimiento."
    }
    with DB_LOCK:
        reset_record = password_reset_tokens_table.get(
            PasswordResetTokenQuery.user_id == user_id
        )
    assert reset_record is None
