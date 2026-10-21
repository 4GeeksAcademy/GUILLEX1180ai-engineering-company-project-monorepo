"""FastAPI application entry point for AUTH-01."""

from fastapi import FastAPI

from src.routers.auth import router as auth_router
from src.routers.profiles import router as profiles_router
from src.routers.users import router as users_router


app = FastAPI(title="TrackFlow Auth API", version="0.1.0")
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profiles_router)
