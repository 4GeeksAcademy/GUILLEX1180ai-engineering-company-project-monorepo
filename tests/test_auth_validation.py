"""End-to-end acceptance tests for the TrackFlow AUTH-01 implementation.

Run from the repository root with ``uv run pytest -q tests/test_auth_validation.py``.
The tests use the configured TinyDB file but remove every temporary user/profile.
They never print JWTs, passwords, hashes, or the contents of the local .env file.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from secrets import token_hex
from typing import Iterator

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from passlib.hash import bcrypt
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from src.database import (
    DB_LOCK,
    DB_PATH,
    UserQuery,
    db,
    profiles_table,
    users_table,
)
from src.main import app
from src.schemas import UserRole, UserUpdate
from src.security import create_access_token


@pytest.fixture(scope="module")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def cleanup_user_ids() -> Iterator[list[int]]:
    """Track created docs so test failures cannot leave records in TinyDB."""
    user_ids: list[int] = []
    yield user_ids
    with DB_LOCK:
        for user_id in user_ids:
            profiles_table.remove(UserQuery.user_id == user_id)
            users_table.remove(doc_ids=[user_id])


def register(
    client: TestClient,
    email: str,
    password: str,
    *,
    name: str = "AUTH QA User",
) -> tuple[int, dict[str, object]]:
    response = client.post(
        "/users",
        json={
            "email": email,
            "password": password,
            "name": name,
            "phone": "+1 555 0100",
            "address": "Temporary QA address",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return int(body["id"]), body


def login(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str) and body["access_token"]
    return body["access_token"]


def seed_admin(
    email: str,
    password: str,
    cleanup_user_ids: list[int],
) -> int:
    """Create an admin for positive authorization tests without public signup."""
    with DB_LOCK:
        admin_id = users_table.insert(
            {
                "email": email,
                "hashed_password": bcrypt.hash(password),
                "is_active": True,
                "role": UserRole.admin.value,
                "created_at": datetime.now(UTC).isoformat(),
            }
        )
        users_table.update({"id": admin_id}, doc_ids=[admin_id])
        profiles_table.insert(
            {
                "user_id": admin_id,
                "name": "AUTH QA Admin",
                "phone": None,
                "address": None,
            }
        )
    cleanup_user_ids.append(admin_id)
    return admin_id


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_auth_data_uses_only_tinydb_and_separates_user_profile() -> None:
    assert DB_PATH.name == "db_users.json"
    assert db.__class__.__name__ == "TinyDB"
    assert users_table.name == "users"
    assert profiles_table.name == "profiles"
    assert set(app.openapi()["paths"]).issuperset(
        {"/users", "/users/{user_id}", "/auth/login", "/auth/me", "/profiles/me"}
    )

    source_files = list((ROOT / "src").rglob("*.py"))
    forbidden_storage = ("SQLModel", "sqlalchemy",
                         "create_engine", "psycopg", "supabase")
    forbidden_sessions = ("SessionMiddleware", "request.cookies",
                          "set_cookie", "response.set_cookie")
    for source_file in source_files:
        source = source_file.read_text(encoding="utf-8")
        assert not any(
            term in source for term in forbidden_storage), source_file
        assert not any(
            term in source for term in forbidden_sessions), source_file


def test_configuration_is_loaded_from_dotenv_without_printing_secrets() -> None:
    env_path = ROOT / ".env"
    assert env_path.is_file(), "Create .env from .env.example before running AUTH tests."

    child_env = os.environ.copy()
    for key in ("SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES"):
        child_env.pop(key, None)

    check_code = """
import json
from pathlib import Path
from dotenv import dotenv_values
from src.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
values = dotenv_values(Path.cwd() / '.env')
print(json.dumps({
    'secret_loaded': bool(SECRET_KEY) and SECRET_KEY == values.get('SECRET_KEY'),
    'algorithm_loaded': ALGORITHM == (values.get('ALGORITHM') or 'HS256').upper(),
    'expiry_loaded': ACCESS_TOKEN_EXPIRE_MINUTES == int(values['ACCESS_TOKEN_EXPIRE_MINUTES']),
}))
"""
    result = subprocess.run(
        [sys.executable, "-c", check_code],
        cwd=ROOT,
        env=child_env,
        check=True,
        capture_output=True,
        text=True,
    )
    checks = json.loads(result.stdout)
    assert checks == {
        "secret_loaded": True,
        "algorithm_loaded": True,
        "expiry_loaded": True,
    }
    assert ALGORITHM in {"HS256", "HS384", "HS512"}
    assert ACCESS_TOKEN_EXPIRE_MINUTES > 0


def test_register_stores_profile_separately_and_hashes_password(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    email = f"auth-register-{suffix}@example.com"
    password = f"Strong-Password-{suffix}"
    user_id, response_body = register(client, email, password)
    cleanup_user_ids.append(user_id)

    assert response_body["role"] == "user"
    assert not {"name", "phone", "address",
                "hashed_password"}.intersection(response_body)

    with DB_LOCK:
        user_doc = users_table.get(doc_id=user_id)
        profile_doc = profiles_table.get(UserQuery.user_id == user_id)

    assert user_doc is not None and profile_doc is not None
    assert set(user_doc.keys()) == {
        "id", "email", "hashed_password", "is_active", "role", "created_at"
    }
    assert user_doc["email"] == email
    assert user_doc["is_active"] is True
    assert user_doc["role"] == "user"
    assert user_doc["hashed_password"].startswith("$2b$")
    assert bcrypt.verify(password, user_doc["hashed_password"])
    assert password not in json.dumps(dict(user_doc))

    assert profile_doc["user_id"] == user_id
    assert profile_doc["name"] == "AUTH QA User"
    assert profile_doc["phone"] == "+1 555 0100"
    assert profile_doc["address"] == "Temporary QA address"


def test_role_is_limited_and_default_is_user(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    email = f"auth-role-{suffix}@example.com"
    password = f"Strong-Role-{suffix}"
    user_id, body = register(client, email, password)
    cleanup_user_ids.append(user_id)
    assert body["role"] == "user"

    invalid_registration = client.post(
        "/users",
        json={
            "email": f"invalid-role-{suffix}@example.com",
            "password": password,
            "name": "Invalid Role",
            "role": "superadmin",
        },
    )
    assert invalid_registration.status_code == 422

    with pytest.raises(ValidationError):
        UserUpdate(role="superadmin")

    token = login(client, email, password)
    invalid_update = client.put(
        f"/users/{user_id}",
        headers=auth_header(token),
        json={"role": "superadmin"},
    )
    assert invalid_update.status_code == 422
    assert {role.value for role in UserRole} == {"admin", "manager", "user"}


def test_login_jwt_and_auth_me_profile(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    email = f"auth-login-{suffix}@example.com"
    password = f"Strong-Login-{suffix}"
    user_id, _ = register(client, email, password)
    cleanup_user_ids.append(user_id)

    token = login(client, email, password)
    claims = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert claims["sub"] == str(user_id)
    assert claims["exp"] > datetime.now(UTC).timestamp()

    response = client.get("/auth/me", headers=auth_header(token))
    assert response.status_code == 200, response.text
    assert response.json()["email"] == email
    assert response.json()["role"] == "user"
    assert response.json()["profile"]["name"] == "AUTH QA User"

    assert client.post(
        "/auth/login",
        data={"username": email, "password": "wrong-password"},
    ).status_code == 401
    assert client.post(
        "/auth/login",
        data={"username": f"missing-{suffix}@example.com", "password": password},
    ).status_code == 401


def test_profiles_me_get_and_put_only_change_profile(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    email = f"auth-profile-{suffix}@example.com"
    password = f"Strong-Profile-{suffix}"
    user_id, _ = register(client, email, password)
    cleanup_user_ids.append(user_id)
    headers = auth_header(login(client, email, password))

    current = client.get("/profiles/me", headers=headers)
    assert current.status_code == 200, current.text
    assert current.json()["user_id"] == user_id

    updated = client.put(
        "/profiles/me",
        headers=headers,
        json={"name": "Updated QA Profile",
              "phone": "+1 555 0110", "address": "Updated address"},
    )
    assert updated.status_code == 200, updated.text
    with DB_LOCK:
        user_doc = users_table.get(doc_id=user_id)
        profile_doc = profiles_table.get(UserQuery.user_id == user_id)
    assert user_doc is not None and profile_doc is not None
    assert not {"name", "phone", "address"}.intersection(user_doc)
    assert profile_doc["name"] == "Updated QA Profile"
    assert profile_doc["phone"] == "+1 555 0110"
    assert profile_doc["address"] == "Updated address"


def test_missing_malformed_expired_bad_signature_and_unknown_user_tokens_return_401(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    email = f"auth-401-{suffix}@example.com"
    password = f"Strong-401-{suffix}"
    user_id, _ = register(client, email, password)
    cleanup_user_ids.append(user_id)

    missing = client.get("/auth/me")
    assert missing.status_code == 401
    assert missing.headers.get("www-authenticate") == "Bearer"

    expired = jwt.encode(
        {"sub": str(user_id), "exp": datetime.now(UTC) - timedelta(minutes=1)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    bad_signature = jwt.encode(
        {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(minutes=5)},
        "invalid-signing-key" * 4,
        algorithm=ALGORITHM,
    )
    unknown_user = create_access_token({"sub": "999999999"})
    for token in ("not-a-jwt", expired, bad_signature, unknown_user):
        response = client.get("/auth/me", headers=auth_header(token))
        assert response.status_code == 401, response.text
        assert response.headers.get("www-authenticate") == "Bearer"


def test_user_owner_and_admin_authorization(
    client: TestClient,
    cleanup_user_ids: list[int],
) -> None:
    suffix = token_hex(6)
    password = f"Strong-ACL-{suffix}"
    email_a = f"auth-acl-a-{suffix}@example.com"
    email_b = f"auth-acl-b-{suffix}@example.com"
    id_a, _ = register(client, email_a, password)
    id_b, _ = register(client, email_b, password)
    cleanup_user_ids.extend((id_a, id_b))
    headers_a = auth_header(login(client, email_a, password))

    assert client.get("/users", headers=headers_a).status_code == 403
    assert client.get(f"/users/{id_b}", headers=headers_a).status_code == 403
    assert client.put(
        f"/users/{id_b}",
        headers=headers_a,
        json={"email": f"stolen-{suffix}@example.com"},
    ).status_code == 403
    assert client.delete(
        f"/users/{id_b}", headers=headers_a).status_code == 403
    assert client.put(
        f"/users/{id_a}",
        headers=headers_a,
        json={"role": "manager"},
    ).status_code == 403
    assert client.get(f"/users/{id_a}", headers=headers_a).status_code == 200

    admin_email = f"auth-acl-admin-{suffix}@example.com"
    admin_password = f"Strong-Admin-{suffix}"
    admin_id = seed_admin(admin_email, admin_password, cleanup_user_ids)
    headers_admin = auth_header(login(client, admin_email, admin_password))
    assert client.get("/users", headers=headers_admin).status_code == 200
    assert client.get(f"/users/{id_b}",
                      headers=headers_admin).status_code == 200
    promoted = client.put(
        f"/users/{id_b}",
        headers=headers_admin,
        json={"role": "manager"},
    )
    assert promoted.status_code == 200, promoted.text
    assert promoted.json()["role"] == "manager"
    assert client.delete(
        f"/users/{id_b}", headers=headers_admin).status_code == 204
    cleanup_user_ids.remove(id_b)


def test_all_protected_routes_return_401_without_bearer(
    client: TestClient,
) -> None:
    requests = (
        ("GET", "/users", None),
        ("GET", "/users/1", None),
        ("PUT", "/users/1", {"email": "unauth@example.com"}),
        ("DELETE", "/users/1", None),
        ("GET", "/auth/me", None),
        ("GET", "/profiles/me", None),
        ("PUT", "/profiles/me", {"name": "No Token"}),
    )
    for method, path, payload in requests:
        response = client.request(method, path, json=payload)
        assert response.status_code == 401, (method,
                                             path, response.status_code)
        assert response.headers.get("www-authenticate") == "Bearer"


def test_openapi_routes_are_under_expected_prefixes_and_use_bearer() -> None:
    openapi = app.openapi()
    expected_paths = {
        "/users",
        "/users/{user_id}",
        "/auth/login",
        "/auth/me",
        "/profiles/me",
    }
    assert expected_paths.issubset(openapi["paths"])
    assert "security" not in openapi["paths"]["/users"]["post"]
    assert "security" in openapi["paths"]["/auth/me"]["get"]
    assert "security" in openapi["paths"]["/profiles/me"]["get"]
    assert "security" in openapi["paths"]["/profiles/me"]["put"]


def test_five_secured_routes_exist_outside_users_and_auth() -> None:
    """This acceptance criterion fails until five real external routes exist."""
    secured_external_routes = [
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        if not path.startswith(("/users", "/auth"))
        for method, operation in operations.items()
        if method in {"get", "post", "put", "patch", "delete"}
        and operation.get("security")
    ]
    assert len(secured_external_routes) >= 5, (
        f"Found {len(secured_external_routes)} secured operations outside /users and /auth: "
        f"{secured_external_routes}. The current API only defines GET/PUT /profiles/me; "
        "implement real inventory/order/product routes before claiming full compliance."
    )
