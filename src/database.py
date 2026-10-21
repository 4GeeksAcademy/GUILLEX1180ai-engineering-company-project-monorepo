"""TinyDB tables used by the AUTH-01 users and profiles endpoints."""

from __future__ import annotations

from pathlib import Path
from threading import RLock

from tinydb import Query, TinyDB


DB_PATH = Path(__file__).resolve().with_name("db_users.json")
DB_LOCK = RLock()

try:
    db = TinyDB(DB_PATH)
    users_table = db.table("users")
    profiles_table = db.table("profiles")
except OSError as error:
    raise RuntimeError(f"Could not initialize TinyDB at {DB_PATH}.") from error

UserQuery = Query()
