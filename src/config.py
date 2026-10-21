"""Validated JWT configuration loaded from the repository's .env file."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if len(SECRET_KEY.encode("utf-8")) < 32:
    raise RuntimeError(
        "SECRET_KEY must contain at least 32 bytes; set it in .env.")

ALGORITHM = os.getenv("ALGORITHM", "HS256").strip().upper()
if ALGORITHM not in {"HS256", "HS384", "HS512"}:
    raise RuntimeError("ALGORITHM must be one of HS256, HS384, or HS512.")

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30").strip()
    )
except ValueError as error:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.") from error

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError(
        "ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.")
