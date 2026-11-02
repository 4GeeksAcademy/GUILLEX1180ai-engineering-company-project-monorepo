"""FastAPI application entry point for AUTH-01/AUTH-02 integration."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers.auth import router as auth_router
from src.routers.incidents import router as incidents_router
from src.routers.inventory import router as inventory_router
from src.routers.inventory_movements import router as inventory_movements_router
from src.routers.profiles import router as profiles_router
from src.routers.users import router as users_router


app = FastAPI(title="TrackFlow Auth API", version="0.1.0")
frontend_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3001",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.include_router(auth_router)
app.include_router(incidents_router)
app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(inventory_router)
app.include_router(inventory_movements_router)
