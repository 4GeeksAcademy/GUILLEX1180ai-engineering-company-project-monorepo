"""Manual-compatible AUTH-01 acceptance audit for the local FastAPI app.

Run from the repository root with:
    uv run --with httpx python scripts/auth01_audit.py

The audit creates uniquely named temporary users and removes them in a finally
block. It never prints the JWT signing key, passwords, hashes, or access tokens.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tomllib
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from secrets import token_hex
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
ENV_KEYS = ("SECRET_KEY", "ALGORITHM", "ACCESS_TOKEN_EXPIRE_MINUTES")
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@dataclass
class AuditReport:
    passed: list[str] = field(default_factory=list)
    failed: list[tuple[str, str]] = field(default_factory=list)
    blocked: list[tuple[str, str]] = field(default_factory=list)

    def check(self, name: str, test: Callable[[], None]) -> None:
        try:
            test()
        except Exception as error:  # Keep running so one issue does not hide others.
            detail = f"{type(error).__name__}: {error}"
            self.failed.append((name, detail))
            print(f"FAIL  {name}: {detail}")
        else:
            self.passed.append(name)
            print(f"PASS  {name}")

    def block(self, name: str, detail: str) -> None:
        self.blocked.append((name, detail))
        print(f"BLOCKED  {name}: {detail}")


def _verify_dotenv_configuration() -> None:
    """Load config in a child with JWT shell variables removed, without printing secrets."""
    env_file = ROOT / ".env"
    assert env_file.is_file(), "Required local .env file is missing."

    child_env = os.environ.copy()
    for key in ENV_KEYS:
        child_env.pop(key, None)

    code = """
import json
from pathlib import Path
from dotenv import dotenv_values
from src.config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
values = dotenv_values(Path.cwd() / '.env')
print(json.dumps({
    'secret_present': bool(values.get('SECRET_KEY')),
    'secret_loaded': SECRET_KEY == values.get('SECRET_KEY'),
    'algorithm_loaded': ALGORITHM == (values.get('ALGORITHM') or 'HS256').upper(),
    'expiry_loaded': ACCESS_TOKEN_EXPIRE_MINUTES == int(values['ACCESS_TOKEN_EXPIRE_MINUTES']),
}))
"""
    process = subprocess.run(
        [sys.executable, "-c", code],
        cwd=ROOT,
        env=child_env,
        check=False,
        capture_output=True,
        text=True,
    )
    assert process.returncode == 0, "Config import failed; check .env format and required values."
    result = json.loads(process.stdout)
    assert result["secret_present"] and result["secret_loaded"], "SECRET_KEY was not loaded from .env."
    assert result["algorithm_loaded"], "ALGORITHM was not loaded from .env/default."
    assert result["expiry_loaded"], "ACCESS_TOKEN_EXPIRE_MINUTES was not loaded from .env."


def _verify_storage_and_source() -> None:
    """Check the concrete TinyDB models and reject SQL/session implementations."""
    from src.database import DB_PATH, db, profiles_table, users_table
    from src.schemas import Profile, User

    assert DB_PATH.name == "db_users.json", f"Unexpected TinyDB file: {DB_PATH.name}"
    assert db.__class__.__name__ == "TinyDB", "AUTH storage is not a TinyDB instance."
    assert users_table.name == "users" and profiles_table.name == "profiles"
    assert set(User.model_fields) == {
        "id", "email", "hashed_password", "is_active", "role", "created_at"
    }
    assert set(Profile.model_fields) == {
        "id", "user_id", "name", "phone", "address"
    }

    source_files = list((ROOT / "src").rglob("*.py"))
    forbidden_storage = ("SQLModel", "sqlalchemy",
                         "create_engine", "psycopg", "supabase")
    forbidden_state = ("SessionMiddleware", "request.cookies",
                       "set_cookie", "response.set_cookie")
    for source_file in source_files:
        text = source_file.read_text(encoding="utf-8")
        assert not any(term in text for term in forbidden_storage), (
            f"SQL persistence reference found in {source_file.relative_to(ROOT)}"
        )
        assert not any(term in text for term in forbidden_state), (
            f"Cookie/session state reference found in {source_file.relative_to(ROOT)}"
        )

    with (ROOT / "pyproject.toml").open("rb") as project_file:
        project = tomllib.load(project_file)
    dependency_names = {item.split("[", 1)[0].split(
        ">", 1)[0].lower() for item in project["project"]["dependencies"]}
    assert not dependency_names.intersection(
        {"sqlmodel", "sqlalchemy", "psycopg", "supabase"})


def _check_role_enum() -> None:
    from pydantic import ValidationError

    from src.schemas import UserRole, UserUpdate

    assert {role.value for role in UserRole} == {"admin", "manager", "user"}
    try:
        UserUpdate(role="superuser")
    except ValidationError:
        return
    raise AssertionError(
        "UserUpdate accepted a role outside admin/manager/user.")


def _audit_api(report: AuditReport) -> None:
    from fastapi.testclient import TestClient
    from jose import jwt
    from passlib.hash import bcrypt

    from src.config import ALGORITHM, SECRET_KEY
    from src.database import DB_LOCK, UserQuery, profiles_table, users_table
    from src.main import app
    from src.security import create_access_token

    suffix = token_hex(6)
    password_a = f"Auth01-A-{token_hex(10)}"
    password_b = f"Auth01-B-{token_hex(10)}"
    email_a = f"auth01-a-{suffix}@example.com"
    email_b = f"auth01-b-{suffix}@example.com"
    admin_email = f"auth01-admin-{suffix}@example.com"
    created_ids: list[int] = []
    admin_id: int | None = None

    with TestClient(app) as client:
        try:
            def register_accounts() -> None:
                nonlocal admin_id
                for email, password, name in (
                    (email_a, password_a, "Audit User A"),
                    (email_b, password_b, "Audit User B"),
                ):
                    response = client.post(
                        "/users",
                        json={
                            "email": email,
                            "password": password,
                            "name": name,
                            "phone": "+1 555 0100",
                            "address": "Temporary audit address",
                        },
                    )
                    assert response.status_code == 201, response.text
                    body = response.json()
                    created_ids.append(body["id"])
                    assert body["role"] == "user"
                    assert "hashed_password" not in body
                    assert not {"name", "phone", "address"}.intersection(body)

                with DB_LOCK:
                    for user_id, password in zip(created_ids, (password_a, password_b)):
                        user_document = users_table.get(doc_id=user_id)
                        profile_document = profiles_table.get(
                            UserQuery.user_id == user_id)
                        assert user_document is not None and profile_document is not None
                        assert set(user_document.keys()) == {
                            "id", "email", "hashed_password", "is_active", "role", "created_at"
                        }
                        assert bcrypt.verify(
                            password, user_document["hashed_password"])
                        assert "password" not in user_document
                        assert profile_document["name"].startswith(
                            "Audit User")
                        assert profile_document["phone"] == "+1 555 0100"
                        assert profile_document["address"] == "Temporary audit address"

                    admin_id = users_table.insert({
                        "email": admin_email,
                        "hashed_password": bcrypt.hash(f"Admin-{token_hex(12)}"),
                        "is_active": True,
                        "role": "admin",
                        "created_at": datetime.now(UTC).isoformat(),
                    })
                    users_table.update({"id": admin_id}, doc_ids=[admin_id])
                    profiles_table.insert({
                        "user_id": admin_id,
                        "name": "Audit Admin",
                        "phone": None,
                        "address": None,
                    })

            report.check(
                "POST /users: defaults, linked Profile, role and bcrypt hash", register_accounts)

            tokens: dict[str, str] = {}

            def login_accounts() -> None:
                for email, password, key in (
                    (email_a, password_a, "a"),
                    (email_b, password_b, "b"),
                    (admin_email, None, "admin"),
                ):
                    if key == "admin":
                        with DB_LOCK:
                            admin_doc = users_table.get(doc_id=admin_id)
                        # The generated admin password is not retained; issue this account below instead.
                        assert admin_doc is not None
                        continue
                    login = client.post(
                        "/auth/login",
                        data={"username": email, "password": password},
                    )
                    assert login.status_code == 200, login.text
                    token = login.json()["access_token"]
                    claims = jwt.decode(token, SECRET_KEY,
                                        algorithms=[ALGORITHM])
                    assert claims["sub"] == str(
                        created_ids[0 if key == "a" else 1])
                    assert claims["exp"] > datetime.now(UTC).timestamp()
                    tokens[key] = token

                # Re-hash only a temporary test password to make the seeded admin usable.
                admin_password = f"Admin-{suffix}-password"
                with DB_LOCK:
                    users_table.update(
                        {"hashed_password": bcrypt.hash(admin_password)},
                        doc_ids=[admin_id],
                    )
                login = client.post(
                    "/auth/login",
                    data={"username": admin_email, "password": admin_password},
                )
                assert login.status_code == 200, login.text
                tokens["admin"] = login.json()["access_token"]

            report.check(
                "POST /auth/login: signed JWT has correct subject and expiry", login_accounts)

            def check_auth_me() -> None:
                response = client.get(
                    "/auth/me",
                    headers={"Authorization": f"Bearer {tokens['a']}"},
                )
                assert response.status_code == 200, response.text
                assert response.json()["email"] == email_a
                assert response.json()["role"] == "user"
                assert response.json()["profile"]["name"] == "Audit User A"

            report.check(
                "GET /auth/me: returns authenticated user and Profile", check_auth_me)

            def check_unauthorized() -> None:
                protected_requests = (
                    ("GET", "/users", None),
                    ("GET", f"/users/{created_ids[0]}", None),
                    ("PUT", f"/users/{created_ids[0]}", {"email": email_a}),
                    ("DELETE", f"/users/{created_ids[0]}", None),
                    ("GET", "/auth/me", None),
                    ("GET", "/profiles/me", None),
                    ("PUT", "/profiles/me", {"name": "Unauthenticated"}),
                )
                for method, path, payload in protected_requests:
                    response = client.request(method, path, json=payload)
                    assert response.status_code == 401, (
                        method, path, response.status_code)
                    assert response.headers.get("www-authenticate") == "Bearer"

            report.check(
                "Protected endpoints without token: 401 + Bearer challenge", check_unauthorized)

            def check_invalid_tokens() -> None:
                malformed_token = "not.a.valid.jwt"
                bad_signature = jwt.encode(
                    {"sub": str(created_ids[0]), "exp": datetime.now(
                        UTC) + timedelta(minutes=5)},
                    "x" * 64,
                    algorithm=ALGORITHM,
                )
                expired_token = jwt.encode(
                    {"sub": str(created_ids[0]), "exp": datetime.now(
                        UTC) - timedelta(minutes=1)},
                    SECRET_KEY,
                    algorithm=ALGORITHM,
                )
                missing_user = create_access_token({"sub": "999999999"})
                for token in (malformed_token, bad_signature, expired_token, missing_user):
                    response = client.get(
                        "/auth/me",
                        headers={"Authorization": f"Bearer {token}"},
                    )
                    assert response.status_code == 401
                    assert response.headers.get("www-authenticate") == "Bearer"

            report.check(
                "Malformed, bad-signature, expired and missing-user tokens: 401", check_invalid_tokens)

            def check_owner_admin_access() -> None:
                headers_a = {"Authorization": f"Bearer {tokens['a']}"}
                headers_admin = {"Authorization": f"Bearer {tokens['admin']}"}
                target_id = created_ids[1]
                assert client.get(
                    "/users", headers=headers_a).status_code == 403
                assert client.get(
                    f"/users/{target_id}", headers=headers_a).status_code == 403
                assert client.put(
                    f"/users/{target_id}",
                    headers=headers_a,
                    json={"email": f"changed-{suffix}@example.com"},
                ).status_code == 403
                assert client.delete(
                    f"/users/{target_id}", headers=headers_a).status_code == 403
                assert client.put(
                    f"/users/{created_ids[0]}",
                    headers=headers_a,
                    json={"role": "manager"},
                ).status_code == 403
                assert client.get(
                    f"/users/{target_id}", headers=headers_admin).status_code == 200
                promoted = client.put(
                    f"/users/{target_id}",
                    headers=headers_admin,
                    json={"role": "manager"},
                )
                assert promoted.status_code == 200, promoted.text
                assert promoted.json()["role"] == "manager"

            report.check(
                "Owner/admin authorization: cross-user mutation denied with 403", check_owner_admin_access)

            def check_profiles_bearer() -> None:
                headers_a = {"Authorization": f"Bearer {tokens['a']}"}
                assert client.get(
                    "/profiles/me", headers=headers_a).status_code == 200
                update = client.put(
                    "/profiles/me",
                    headers=headers_a,
                    json={
                        "name": "Updated Audit Profile",
                        "phone": "+1 555 0101",
                        "address": "Updated audit address",
                    },
                )
                assert update.status_code == 200, update.text
                with DB_LOCK:
                    user_document = users_table.get(doc_id=created_ids[0])
                    profile_document = profiles_table.get(
                        UserQuery.user_id == created_ids[0])
                assert user_document is not None and profile_document is not None
                assert "name" not in user_document
                assert profile_document["name"] == "Updated Audit Profile"

            report.check(
                "Profile routes: Bearer required and data stays in Profile", check_profiles_bearer)

            def check_invalid_role() -> None:
                from pydantic import ValidationError
                from src.schemas import UserRole, UserUpdate

                assert {role.value for role in UserRole} == {
                    "admin", "manager", "user"}
                try:
                    UserUpdate(role="superuser")
                except ValidationError:
                    return
                raise AssertionError("Invalid role was accepted.")

            report.check(
                "Role enum accepts only admin/manager/user", check_invalid_role)

            def check_stateless_bearer() -> None:
                openapi = app.openapi()
                outside_auth = [
                    (method, path, operation)
                    for path, operations in openapi["paths"].items()
                    if not path.startswith(("/users", "/auth"))
                    for method, operation in operations.items()
                    if method in {"get", "post", "put", "patch", "delete"}
                ]
                assert all(operation.get("security")
                           for _, _, operation in outside_auth)
                source_text = "\n".join(
                    path.read_text(encoding="utf-8")
                    for path in (ROOT / "src").rglob("*.py")
                )
                assert not any(
                    marker in source_text
                    for marker in ("SessionMiddleware", "request.cookies", "set_cookie", "response.set_cookie")
                )

            report.check(
                "Bearer auth is stateless; no cookie/session mechanisms found", check_stateless_bearer)

            def check_external_routes() -> None:
                openapi = app.openapi()
                external_routes = [
                    (method.upper(), path)
                    for path, operations in openapi["paths"].items()
                    if not path.startswith(("/users", "/auth"))
                    for method, operation in operations.items()
                    if method in {"get", "post", "put", "patch", "delete"}
                    and operation.get("security")
                ]
                if len(external_routes) < 5:
                    report.block(
                        "At least five secured routes exist outside /users and /auth",
                        f"Only {len(external_routes)} secured operations exist: {external_routes}. "
                        "Inventory/order/product routes are not implemented in this repository.",
                    )
                    return

                unsecured_routes = [
                    (method.upper(), path)
                    for path, operations in openapi["paths"].items()
                    if not path.startswith(("/users", "/auth"))
                    for method, operation in operations.items()
                    if method in {"get", "post", "put", "patch", "delete"}
                    and not operation.get("security")
                ]
                assert not unsecured_routes, f"Unprotected external routes: {unsecured_routes}"
                report.passed.append(
                    "At least five secured routes exist outside /users and /auth"
                )
                print(
                    "PASS  At least five secured routes exist outside /users and /auth")

            check_external_routes()
        finally:
            with DB_LOCK:
                for user_id in created_ids:
                    profiles_table.remove(UserQuery.user_id == user_id)
                    users_table.remove(doc_ids=[user_id])
                if admin_id is not None:
                    profiles_table.remove(UserQuery.user_id == admin_id)
                    users_table.remove(doc_ids=[admin_id])


def main() -> int:
    report = AuditReport()
    report.check("TinyDB/User/Profile models and SQL-free persistence",
                 _verify_storage_and_source)
    report.check("SECRET_KEY/ALGORITHM/ACCESS_TOKEN_EXPIRE_MINUTES load from .env",
                 _verify_dotenv_configuration)
    report.check(
        "Role validation rejects values outside the allowed enum", _check_role_enum)

    try:
        _audit_api(report)
    except Exception as error:
        report.failed.append(("API setup", f"{type(error).__name__}: {error}"))
        print(f"FAIL  API setup: {type(error).__name__}: {error}")

    print("\nAUTH-01 audit summary")
    print(
        f"PASS: {len(report.passed)} | FAIL: {len(report.failed)} | BLOCKED/NOT MET: {len(report.blocked)}")
    for name, detail in report.failed:
        print(f"FAIL: {name} — {detail}")
    for name, detail in report.blocked:
        print(f"BLOCKED: {name} — {detail}")

    if report.failed:
        return 1
    if report.blocked:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
