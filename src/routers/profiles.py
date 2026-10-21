"""Authenticated profile read and update routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.database import DB_LOCK, UserQuery, profiles_table
from src.deps import CurrentUser
from src.schemas import ProfileBase, ProfileResponse


router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: CurrentUser) -> ProfileResponse:
    """Return the profile linked to the authenticated user."""
    with DB_LOCK:
        profile_document = profiles_table.get(
            UserQuery.user_id == current_user["id"]
        )
    if profile_document is None:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return ProfileResponse(id=profile_document.doc_id, **dict(profile_document))


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileBase,
    current_user: CurrentUser,
) -> ProfileResponse:
    """Update profile fields and keep the corresponding user record in sync."""
    changes = payload.model_dump()
    user_id = current_user["id"]
    with DB_LOCK:
        profile_document = profiles_table.get(UserQuery.user_id == user_id)
        if profile_document is None:
            raise HTTPException(status_code=404, detail="Profile not found.")
        profiles_table.update(changes, doc_ids=[profile_document.doc_id])
        updated_profile = profiles_table.get(doc_id=profile_document.doc_id)

    if updated_profile is None:
        raise HTTPException(
            status_code=500, detail="Could not load the updated profile.")
    return ProfileResponse(id=updated_profile.doc_id, **dict(updated_profile))
