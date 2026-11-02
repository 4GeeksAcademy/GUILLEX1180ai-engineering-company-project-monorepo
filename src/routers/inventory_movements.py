"""Hito 5 — Products and inbound/outbound stock orders for the TrackFlow backoffice.

All routes require a valid bearer token. Product and order creation is
restricted to the admin and manager roles, mirroring the warehouse inventory
module in ``src/routers/inventory.py``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status

from src.deps import CurrentUser
from src.schemas import (
    InboundOrderPayload,
    Order,
    OrderType,
    OutboundOrderPayload,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    UserRole,
)
from src.services import (
    DuplicateProductSkuError,
    InsufficientStockError,
    OrderStorageError,
    ProductNotFoundError,
    ProductStorageError,
    create_product,
    create_stock_order,
    delete_product,
    get_product,
    list_orders,
    list_products,
    update_product,
)


router = APIRouter(prefix="/inventory", tags=["inventory"])

_WRITE_ROLES = {UserRole.admin.value, UserRole.manager.value}


def _require_writer(current_user: dict[str, Any]) -> None:
    """Allow only admin or manager roles to mutate product/order records."""
    if current_user["role"] not in _WRITE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator or manager role required.",
        )


@router.get("/products", response_model=list[ProductResponse])
def get_products(current_user: CurrentUser) -> list[ProductResponse]:
    """List all products, ordered by name for dependable selectors."""
    return [
        ProductResponse.model_validate(product.model_dump())
        for product in list_products()
    ]


@router.post(
    "/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def post_product(
    payload: ProductCreate,
    current_user: CurrentUser,
) -> ProductResponse:
    """Create a product with a unique SKU (admins and managers only)."""
    _require_writer(current_user)
    try:
        product = create_product(payload)
    except DuplicateProductSkuError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except ProductStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not create the product.",
        ) from error
    return ProductResponse.model_validate(product.model_dump())


@router.put("/products/{product_id}", response_model=ProductResponse)
def put_product(
    product_id: int,
    payload: ProductUpdate,
    current_user: CurrentUser,
) -> ProductResponse:
    """Update editable product fields (admins and managers only)."""
    _require_writer(current_user)
    try:
        product = update_product(product_id, payload)
    except ProductNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ProductStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not update the product.",
        ) from error
    return ProductResponse.model_validate(product.model_dump())


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_product(
    product_id: int,
    current_user: CurrentUser,
) -> None:
    """Delete a product (admins and managers only)."""
    _require_writer(current_user)
    try:
        deleted = delete_product(product_id)
    except ProductStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not delete the product.",
        ) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found.")


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product_by_id(
    product_id: int,
    current_user: CurrentUser,
) -> ProductResponse:
    """Return a single product by its identifier."""
    product = get_product(product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    return ProductResponse.model_validate(product.model_dump())


@router.get("/orders", response_model=list[Order])
def get_orders(current_user: CurrentUser) -> list[Order]:
    """List all recorded stock movements, most recent first."""
    return [Order.model_validate(order.model_dump()) for order in list_orders()]


@router.post(
    "/orders/inbound",
    response_model=Order,
    status_code=status.HTTP_201_CREATED,
)
def post_inbound_order(
    payload: InboundOrderPayload,
    current_user: CurrentUser,
) -> Order:
    """Record an inbound order that increases product stock."""
    _require_writer(current_user)
    user_uuid = str(current_user["id"])
    try:
        order = create_stock_order(OrderType.inbound, payload, user_uuid)
    except ProductNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except OrderStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not record the inbound order.",
        ) from error
    return Order.model_validate(order.model_dump())


@router.post(
    "/orders/outbound",
    response_model=Order,
    status_code=status.HTTP_201_CREATED,
)
def post_outbound_order(
    payload: OutboundOrderPayload,
    current_user: CurrentUser,
) -> Order:
    """Record an outbound order that decreases product stock (validated)."""
    _require_writer(current_user)
    user_uuid = str(current_user["id"])
    try:
        order = create_stock_order(OrderType.outbound, payload, user_uuid)
    except ProductNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except InsufficientStockError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
    except OrderStorageError as error:
        raise HTTPException(
            status_code=500,
            detail="Could not record the outbound order.",
        ) from error
    return Order.model_validate(order.model_dump())
