"""Protected warehouse inventory routes for the TrackFlow backoffice.

All endpoints require a valid bearer token. Read access is available to any
authenticated user; mutations require the admin or manager role.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from src.deps import CurrentUser
from src.schemas import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
    InventoryStatus,
    StockAdjustment,
    UserRole,
    WarehouseLocation,
)
from src.services import (
    DuplicateSkuError,
    InvalidInventoryUpdateError,
    InventoryItemNotFoundError,
    InventoryStorageError,
    adjust_inventory_stock,
    create_inventory_item,
    delete_inventory_item,
    get_inventory_item,
    inventory_summary,
    list_inventory_items,
    update_inventory_item,
)


router = APIRouter(prefix="/inventory", tags=["inventory"])

_WRITE_ROLES = {UserRole.admin.value, UserRole.manager.value}


def _require_writer(current_user: dict[str, Any]) -> None:
    """Allow only admin or manager roles to mutate inventory records."""
    if current_user["role"] not in _WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator or manager role required.",
        )


@router.get("", response_model=list[InventoryItemResponse])
def list_items(
    current_user: CurrentUser,
    warehouse: WarehouseLocation | None = Query(default=None),
    item_status: InventoryStatus | None = Query(default=None, alias="status"),
) -> list[InventoryItemResponse]:
    """List inventory items, optionally filtered by warehouse or stock status."""
    items = list_inventory_items(warehouse=warehouse, status=item_status)
    return [InventoryItemResponse.model_validate(item.model_dump()) for item in items]


@router.get("/summary")
def get_summary(current_user: CurrentUser) -> dict[str, Any]:
    """Return aggregate inventory metrics for the backoffice dashboard."""
    return inventory_summary()


@router.post(
    "",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_item(
    payload: InventoryItemCreate,
    current_user: CurrentUser,
) -> InventoryItemResponse:
    """Create a new inventory item; SKUs must be unique."""
    _require_writer(current_user)
    try:
        item = create_inventory_item(payload)
    except DuplicateSkuError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except InventoryStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not create the inventory item.",
        ) from error
    return InventoryItemResponse.model_validate(item.model_dump())


@router.get("/{item_id}", response_model=InventoryItemResponse)
def get_item(item_id: int, current_user: CurrentUser) -> InventoryItemResponse:
    """Return a single inventory item by its identifier."""
    item = get_inventory_item(item_id)
    if item is None:
        raise HTTPException(
            status_code=404, detail="Inventory item not found.")
    return InventoryItemResponse.model_validate(item.model_dump())


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_item(
    item_id: int,
    payload: InventoryItemUpdate,
    current_user: CurrentUser,
) -> InventoryItemResponse:
    """Update editable inventory fields and recompute the derived status."""
    _require_writer(current_user)
    try:
        item = update_inventory_item(item_id, payload)
    except InventoryItemNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except InvalidInventoryUpdateError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InventoryStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not update the inventory item.",
        ) from error
    return InventoryItemResponse.model_validate(item.model_dump())


@router.patch("/{item_id}/stock", response_model=InventoryItemResponse)
def adjust_stock(
    item_id: int,
    payload: StockAdjustment,
    current_user: CurrentUser,
) -> InventoryItemResponse:
    """Apply a signed stock adjustment (receive or pick/pack movement)."""
    _require_writer(current_user)
    try:
        item = adjust_inventory_stock(item_id, payload.delta)
    except InventoryItemNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except InvalidInventoryUpdateError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except InventoryStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not adjust the inventory stock.",
        ) from error
    return InventoryItemResponse.model_validate(item.model_dump())


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, current_user: CurrentUser) -> None:
    """Delete an inventory item; admins and managers only."""
    _require_writer(current_user)
    try:
        deleted = delete_inventory_item(item_id)
    except InventoryStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not delete the inventory item.",
        ) from error
    if not deleted:
        raise HTTPException(
            status_code=404, detail="Inventory item not found.")
