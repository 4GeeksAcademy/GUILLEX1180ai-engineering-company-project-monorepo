"""TinyDB service layer for users and their linked profiles."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from src.config import ALGORITHM, FRONTEND_URL, RESET_TOKEN_EXPIRE_MINUTES, SECRET_KEY
from src.database import (
    DB_LOCK,
    InventoryQuery,
    OrderQuery,
    PasswordResetTokenQuery,
    ProductQuery,
    UserQuery,
    inventory_table,
    orders_table,
    password_reset_tokens_table,
    products_table,
    profiles_table,
    users_table,
)
from src.schemas import (
    InboundOrderPayload,
    InventoryItem,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryStatus,
    Order,
    OrderType,
    OutboundOrderPayload,
    Product,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    User,
    UserCreate,
    UserRole,
    UserUpdate,
    WarehouseLocation,
)
from src.security import hash_password, verify_password


class DuplicateUserError(ValueError):
    """Raised when a registration email is already in use."""


class UserNotFoundError(LookupError):
    """Raised when an operation targets a missing user."""


class InvalidUserUpdateError(ValueError):
    """Raised when an update contains no valid user fields."""


class UserStorageError(RuntimeError):
    """Raised when TinyDB cannot persist a user/profile operation."""


class InvalidPasswordResetTokenError(ValueError):
    """Raised for missing, expired, tampered, or already-consumed reset tokens."""


class InvalidCurrentPasswordError(ValueError):
    """Raised when a password-change request has an incorrect current password."""


def _to_user(document: Any) -> User:
    """Validate a TinyDB document and expose its document ID as `id`."""
    values = dict(document)
    values["id"] = document.doc_id
    return User.model_validate(values)


def create_user(payload: UserCreate) -> User:
    """Create a role=user account and, when supplied, its separate profile."""
    email = str(payload.email).strip().casefold()
    profile_fields = payload.model_dump(include={"name", "phone", "address"})
    user_id: int | None = None

    with DB_LOCK:
        if users_table.get(UserQuery.email == email) is not None:
            raise DuplicateUserError("A user with this email already exists.")

        try:
            user_id = users_table.insert(
                {
                    "email": email,
                    "hashed_password": hash_password(payload.password),
                    "is_active": True,
                    "role": UserRole.user.value,
                    "created_at": datetime.now(UTC).isoformat(),
                }
            )
            users_table.update({"id": user_id}, doc_ids=[user_id])
            profiles_table.insert({"user_id": user_id, **profile_fields})
            document = users_table.get(doc_id=user_id)
        except Exception as error:
            # TinyDB has no transactions, so roll back a partially created user.
            if user_id is not None:
                users_table.remove(doc_ids=[user_id])
                profiles_table.remove(UserQuery.user_id == user_id)
            raise UserStorageError(
                "Could not create the user and profile.") from error

    if document is None:
        raise UserStorageError("The new user could not be loaded from TinyDB.")
    return _to_user(document)


def get_user_by_id(user_id: int) -> User | None:
    """Return one validated user by TinyDB document ID."""
    with DB_LOCK:
        document = users_table.get(doc_id=user_id)
    return _to_user(document) if document is not None else None


def get_user_by_email(email: str) -> User | None:
    """Return one validated user by normalized email address."""
    normalized_email = email.strip().casefold()
    with DB_LOCK:
        document = users_table.get(UserQuery.email == normalized_email)
    return _to_user(document) if document is not None else None


def list_users() -> list[User]:
    """Return all persisted users without exposing profile records."""
    with DB_LOCK:
        documents = users_table.all()
    return [_to_user(document) for document in documents]


def update_user(user_id: int, payload: UserUpdate) -> User:
    """Update email and/or role, preserving profile data in its own table."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise InvalidUserUpdateError(
            "Provide at least one user field to update.")
    if any(value is None for value in changes.values()):
        raise InvalidUserUpdateError("Email and role cannot be null.")

    if "email" in changes:
        changes["email"] = str(changes["email"]).strip().casefold()
    if "role" in changes:
        role = changes["role"]
        if not isinstance(role, UserRole):
            raise InvalidUserUpdateError(
                "Role must be admin, manager, or user.")
        changes["role"] = role.value

    with DB_LOCK:
        existing = users_table.get(doc_id=user_id)
        if existing is None:
            raise UserNotFoundError("User not found.")
        if "email" in changes and changes["email"] != existing["email"]:
            if users_table.get(UserQuery.email == changes["email"]) is not None:
                raise DuplicateUserError(
                    "A user with this email already exists.")

        users_table.update(changes, doc_ids=[user_id])
        updated = users_table.get(doc_id=user_id)

    if updated is None:
        raise UserNotFoundError("User not found after update.")
    return _to_user(updated)


def delete_user_and_profile(user_id: int) -> bool:
    """Delete a user and all linked profile documents under one DB lock."""
    with DB_LOCK:
        if users_table.get(doc_id=user_id) is None:
            return False
        try:
            profiles_table.remove(UserQuery.user_id == user_id)
            users_table.remove(doc_ids=[user_id])
        except Exception as error:
            raise UserStorageError(
                "Could not delete the user and linked profile.") from error
    return True


def issue_password_reset_token(user_id: int) -> str:
    """Create a signed, single-use reset JWT and persist only its SHA-256 hash."""
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    token_id = secrets.token_urlsafe(24)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "type": "password_reset",
            "jti": token_id,
            "iat": now,
            "exp": expires_at,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    with DB_LOCK:
        user_document = users_table.get(doc_id=user_id)
        if user_document is None or not user_document.get("is_active", False):
            raise UserNotFoundError("User not found or inactive.")
        # Only the newest reset request remains valid for this account.
        password_reset_tokens_table.remove(
            PasswordResetTokenQuery.user_id == user_id
        )
        password_reset_tokens_table.insert(
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "used": False,
                "issued_at": now.isoformat(),
                "expires_at": expires_at.isoformat(),
            }
        )
    return token


def revoke_password_reset_token(token: str) -> None:
    """Remove a reset token after delivery failure without storing its value."""
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with DB_LOCK:
        password_reset_tokens_table.remove(
            PasswordResetTokenQuery.token_hash == token_hash
        )


def reset_user_password(token: str, new_password: str) -> None:
    """Consume one valid reset token and atomically update the bcrypt hash."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            raise InvalidPasswordResetTokenError("Invalid reset token.")
        user_id = int(payload.get("sub", ""))
        if not isinstance(payload.get("jti"), str):
            raise InvalidPasswordResetTokenError("Invalid reset token.")
    except (JWTError, TypeError, ValueError) as error:
        if isinstance(error, InvalidPasswordResetTokenError):
            raise
        raise InvalidPasswordResetTokenError("Invalid reset token.") from error

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = datetime.now(UTC)
    with DB_LOCK:
        token_document = password_reset_tokens_table.get(
            PasswordResetTokenQuery.token_hash == token_hash
        )
        if token_document is None or token_document.get("used") is not False:
            raise InvalidPasswordResetTokenError(
                "Reset token is missing or already used.")
        if token_document.get("user_id") != user_id:
            raise InvalidPasswordResetTokenError(
                "Reset token does not match its user.")
        try:
            stored_expiry = datetime.fromisoformat(
                token_document["expires_at"])
        except (KeyError, TypeError, ValueError) as error:
            raise InvalidPasswordResetTokenError(
                "Reset token record is invalid.") from error
        if stored_expiry <= now:
            raise InvalidPasswordResetTokenError("Reset token has expired.")

        user_document = users_table.get(doc_id=user_id)
        if user_document is None or not user_document.get("is_active", False):
            raise InvalidPasswordResetTokenError(
                "Reset token user is unavailable.")

        # Only pay bcrypt's cost after signature, expiry, use-state, and user checks pass.
        new_password_hash = hash_password(new_password)
        # Mark every outstanding reset token used before changing the password.
        password_reset_tokens_table.update(
            {"used": True, "used_at": now.isoformat()},
            PasswordResetTokenQuery.user_id == user_id,
        )
        users_table.update(
            {"hashed_password": new_password_hash},
            doc_ids=[user_id],
        )


def change_user_password(
    user_id: int,
    current_password: str,
    new_password: str,
) -> None:
    """Verify the current password, update its hash, and revoke reset tokens."""
    now = datetime.now(UTC)
    with DB_LOCK:
        user_document = users_table.get(doc_id=user_id)
        if user_document is None or not user_document.get("is_active", False):
            raise UserNotFoundError("User not found or inactive.")
        if not verify_password(
            current_password,
            str(user_document.get("hashed_password", "")),
        ):
            raise InvalidCurrentPasswordError("Current password is incorrect.")
        new_password_hash = hash_password(new_password)
        users_table.update(
            {"hashed_password": new_password_hash},
            doc_ids=[user_id],
        )
        password_reset_tokens_table.update(
            {"used": True, "used_at": now.isoformat()},
            PasswordResetTokenQuery.user_id == user_id,
        )


def build_password_reset_url(token: str) -> str:
    """Build the frontend URL carrying an URL-encoded one-time token."""
    from urllib.parse import quote

    return f"{FRONTEND_URL}/reset-password?token={quote(token, safe='')}"


# ---------------------------------------------------------------------------
# Inventory (warehouse stock) service layer
# ---------------------------------------------------------------------------


class DuplicateSkuError(ValueError):
    """Raised when creating an inventory item whose SKU already exists."""


class InventoryItemNotFoundError(LookupError):
    """Raised when an operation targets a missing inventory item."""


class InvalidInventoryUpdateError(ValueError):
    """Raised when an update contains no valid inventory fields."""


class InventoryStorageError(RuntimeError):
    """Raised when TinyDB cannot persist an inventory operation."""


def _derive_inventory_status(quantity: int, min_stock: int) -> InventoryStatus:
    """Compute stock status from available quantity and the reorder threshold."""
    if quantity <= 0:
        return InventoryStatus.out_of_stock
    if quantity <= min_stock:
        return InventoryStatus.low_stock
    return InventoryStatus.in_stock


def _to_inventory_item(document: Any) -> InventoryItem:
    """Validate a TinyDB inventory document and expose its document ID as `id`."""
    values = dict(document)
    values["id"] = document.doc_id
    return InventoryItem.model_validate(values)


def _normalize_sku(sku: str) -> str:
    return sku.strip().upper()


def create_inventory_item(payload: InventoryItemCreate) -> InventoryItem:
    """Create a new inventory item, ensuring SKU uniqueness across warehouses."""
    sku = _normalize_sku(payload.sku)
    now = datetime.now(UTC)
    status = _derive_inventory_status(payload.quantity, payload.min_stock)
    item_id: int | None = None

    with DB_LOCK:
        if inventory_table.get(InventoryQuery.sku == sku) is not None:
            raise DuplicateSkuError(
                "An inventory item with this SKU already exists.")
        try:
            item_id = inventory_table.insert(
                {
                    "sku": sku,
                    "name": payload.name.strip(),
                    "description": payload.description.strip()
                    if payload.description
                    else None,
                    "quantity": payload.quantity,
                    "min_stock": payload.min_stock,
                    "warehouse": payload.warehouse.value,
                    "status": status.value,
                    "updated_at": now.isoformat(),
                }
            )
            inventory_table.update({"id": item_id}, doc_ids=[item_id])
            document = inventory_table.get(doc_id=item_id)
        except Exception as error:
            if item_id is not None:
                inventory_table.remove(doc_ids=[item_id])
            raise InventoryStorageError(
                "Could not create the inventory item.") from error

    if document is None:
        raise InventoryStorageError(
            "The new inventory item could not be loaded from TinyDB.")
    return _to_inventory_item(document)


def list_inventory_items(
    *,
    warehouse: WarehouseLocation | None = None,
    status: InventoryStatus | None = None,
) -> list[InventoryItem]:
    """Return inventory items, optionally filtered by warehouse and/or status."""
    with DB_LOCK:
        documents = inventory_table.all()
    items = [_to_inventory_item(document) for document in documents]
    if warehouse is not None:
        items = [item for item in items if item.warehouse == warehouse]
    if status is not None:
        items = [item for item in items if item.status == status]
    return sorted(items, key=lambda item: item.sku)


def get_inventory_item(item_id: int) -> InventoryItem | None:
    """Return one validated inventory item by TinyDB document ID."""
    with DB_LOCK:
        document = inventory_table.get(doc_id=item_id)
    return _to_inventory_item(document) if document is not None else None


def update_inventory_item(
    item_id: int,
    payload: InventoryItemUpdate,
) -> InventoryItem:
    """Update editable fields and recompute the derived stock status."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise InvalidInventoryUpdateError(
            "Provide at least one inventory field to update.")

    normalized: dict[str, Any] = {}
    for field, value in changes.items():
        if value is None:
            if field == "description":
                normalized[field] = None
                continue
            raise InvalidInventoryUpdateError(
                f"Field '{field}' cannot be null.")
        if field == "warehouse":
            normalized[field] = (
                value.value if isinstance(value, WarehouseLocation) else value
            )
        elif field == "name":
            normalized[field] = str(value).strip()
        elif field == "description":
            normalized[field] = str(value).strip() or None
        else:
            normalized[field] = value

    with DB_LOCK:
        existing = inventory_table.get(doc_id=item_id)
        if existing is None:
            raise InventoryItemNotFoundError("Inventory item not found.")
        quantity = int(existing.get("quantity", 0))
        min_stock = int(normalized.get(
            "min_stock", existing.get("min_stock", 0)))
        normalized["status"] = _derive_inventory_status(
            quantity, min_stock).value
        normalized["updated_at"] = datetime.now(UTC).isoformat()
        try:
            inventory_table.update(normalized, doc_ids=[item_id])
            updated = inventory_table.get(doc_id=item_id)
        except Exception as error:
            raise InventoryStorageError(
                "Could not update the inventory item.") from error

    if updated is None:
        raise InventoryItemNotFoundError(
            "Inventory item not found after update.")
    return _to_inventory_item(updated)


def adjust_inventory_stock(item_id: int, delta: int) -> InventoryItem:
    """Apply a signed stock delta, preventing negative quantities."""
    with DB_LOCK:
        existing = inventory_table.get(doc_id=item_id)
        if existing is None:
            raise InventoryItemNotFoundError("Inventory item not found.")
        quantity = int(existing.get("quantity", 0)) + delta
        if quantity < 0:
            raise InvalidInventoryUpdateError(
                "Stock adjustment would result in a negative quantity.")
        min_stock = int(existing.get("min_stock", 0))
        changes = {
            "quantity": quantity,
            "status": _derive_inventory_status(quantity, min_stock).value,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        try:
            inventory_table.update(changes, doc_ids=[item_id])
            updated = inventory_table.get(doc_id=item_id)
        except Exception as error:
            raise InventoryStorageError(
                "Could not adjust the inventory stock.") from error

    if updated is None:
        raise InventoryItemNotFoundError(
            "Inventory item not found after adjustment.")
    return _to_inventory_item(updated)


def delete_inventory_item(item_id: int) -> bool:
    """Delete an inventory item; return False when it does not exist."""
    with DB_LOCK:
        if inventory_table.get(doc_id=item_id) is None:
            return False
        try:
            inventory_table.remove(doc_ids=[item_id])
        except Exception as error:
            raise InventoryStorageError(
                "Could not delete the inventory item.") from error
    return True


def inventory_summary() -> dict[str, Any]:
    """Aggregate totals used by the backoffice inventory dashboard."""
    with DB_LOCK:
        documents = inventory_table.all()
    items = [_to_inventory_item(document) for document in documents]
    by_warehouse: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for item in items:
        by_warehouse[item.warehouse.value] = (
            by_warehouse.get(item.warehouse.value, 0) + 1
        )
        by_status[item.status.value] = by_status.get(item.status.value, 0) + 1
    return {
        "total_items": len(items),
        "total_units": sum(item.quantity for item in items),
        "low_stock_items": by_status.get(InventoryStatus.low_stock.value, 0),
        "out_of_stock_items": by_status.get(InventoryStatus.out_of_stock.value, 0),
        "by_warehouse": by_warehouse,
        "by_status": by_status,
    }


# ---------------------------------------------------------------------------
# Hito 5 — Products and inbound/outbound stock orders
# ---------------------------------------------------------------------------


class DuplicateProductSkuError(ValueError):
    """Raised when creating a product whose SKU already exists."""


class ProductNotFoundError(LookupError):
    """Raised when an operation targets a missing product."""


class ProductStorageError(RuntimeError):
    """Raised when TinyDB cannot persist a product operation."""


class InsufficientStockError(ValueError):
    """Raised when an outbound order would make a product's stock negative."""


class OrderStorageError(RuntimeError):
    """Raised when TinyDB cannot persist an order operation."""


def _to_product(document: Any) -> Product:
    """Validate a TinyDB product document and expose its document ID as `id`."""
    values = dict(document)
    values["id"] = document.doc_id
    return Product.model_validate(values)


def _to_order(document: Any) -> Order:
    """Validate a TinyDB order document and expose its document ID as `id`."""
    values = dict(document)
    values["id"] = document.doc_id
    return Order.model_validate(values)


def list_products() -> list[Product]:
    """Return all persisted products, ordered by name for dependable selectors."""
    with DB_LOCK:
        documents = products_table.all()
    products = [_to_product(document) for document in documents]
    return sorted(products, key=lambda product: product.name.casefold())


def get_product(product_id: int) -> Product | None:
    """Return one validated product by TinyDB document ID."""
    with DB_LOCK:
        document = products_table.get(doc_id=product_id)
    return _to_product(document) if document is not None else None


def create_product(payload: ProductCreate) -> Product:
    """Create a product with a unique SKU and its starting stock level."""
    sku = payload.sku.strip().upper()
    now = datetime.now(UTC)
    product_id: int | None = None
    with DB_LOCK:
        if products_table.get(ProductQuery.sku == sku) is not None:
            raise DuplicateProductSkuError(
                "A product with this SKU already exists.")
        try:
            product_id = products_table.insert(
                {
                    "name": payload.name.strip(),
                    "sku": sku,
                    "category": payload.category.value,
                    "current_stock": payload.current_stock,
                    "min_stock": payload.min_stock,
                    "warehouse": payload.warehouse.value,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            )
            products_table.update({"id": product_id}, doc_ids=[product_id])
            document = products_table.get(doc_id=product_id)
        except Exception as error:
            if product_id is not None:
                products_table.remove(doc_ids=[product_id])
            raise ProductStorageError(
                "Could not create the product.") from error
    if document is None:
        raise ProductStorageError(
            "The new product could not be loaded from TinyDB.")
    return _to_product(document)


def update_product(product_id: int, payload: ProductUpdate) -> Product:
    """Update editable product fields, ignoring current_stock (use orders)."""
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise ValueError("Provide at least one product field to update.")
    if any(value is None for value in changes.values()):
        raise ValueError("Product fields cannot be null.")

    normalized: dict[str, str | int] = {}
    for field, value in changes.items():
        if field == "category":
            normalized[field] = value.value if isinstance(
                value, ProductCategory) else value
        elif field == "warehouse":
            normalized[field] = (
                value.value if isinstance(value, WarehouseLocation) else value
            )
        elif field == "name":
            normalized[field] = str(value).strip()
        else:
            normalized[field] = value

    with DB_LOCK:
        if products_table.get(doc_id=product_id) is None:
            raise ProductNotFoundError("Product not found.")
        try:
            products_table.update(
                {**normalized, "updated_at": datetime.now(UTC).isoformat()},
                doc_ids=[product_id],
            )
            updated = products_table.get(doc_id=product_id)
        except Exception as error:
            raise ProductStorageError(
                "Could not update the product.") from error
    if updated is None:
        raise ProductNotFoundError("Product not found after update.")
    return _to_product(updated)


def delete_product(product_id: int) -> bool:
    """Delete a product; return False when it does not exist."""
    with DB_LOCK:
        if products_table.get(doc_id=product_id) is None:
            return False
        try:
            products_table.remove(doc_ids=[product_id])
        except Exception as error:
            raise ProductStorageError(
                "Could not delete the product.") from error
    return True


def create_stock_order(
    order_type: OrderType,
    payload: InboundOrderPayload | OutboundOrderPayload,
    user_uuid: str,
) -> Order:
    """Apply a signed stock movement and record it against the user_uuid."""
    stock_delta: int
    if order_type is OrderType.inbound:
        stock_delta = payload.quantity
    else:
        stock_delta = -payload.quantity

    order_id: int | None = None
    with DB_LOCK:
        product = products_table.get(doc_id=payload.product_id)
        if product is None:
            raise ProductNotFoundError("Product not found.")

        new_stock = int(product.get("current_stock", 0)) + stock_delta
        if new_stock < 0:
            raise InsufficientStockError(
                "Stock insuficiente para la salida solicitada.")

        try:
            products_table.update(
                {
                    "current_stock": new_stock,
                    "updated_at": datetime.now(UTC).isoformat(),
                },
                doc_ids=[payload.product_id],
            )
            order_id = orders_table.insert(
                {
                    "product_id": payload.product_id,
                    "order_type": order_type.value,
                    "quantity": payload.quantity,
                    "user_uuid": user_uuid,
                    "created_at": datetime.now(UTC).isoformat(),
                }
            )
            orders_table.update({"id": order_id}, doc_ids=[order_id])
            document = orders_table.get(doc_id=order_id)
        except InsufficientStockError:
            raise
        except Exception as error:
            if order_id is not None:
                orders_table.remove(doc_ids=[order_id])
            raise OrderStorageError(
                "Could not record the stock order.") from error

    if document is None:
        raise OrderStorageError(
            "The new order could not be loaded from TinyDB.")
    return _to_order(document)


def list_orders() -> list[Order]:
    """Return all persisted stock orders, most recent first."""
    with DB_LOCK:
        documents = orders_table.all()
    orders = [_to_order(document) for document in documents]
    return sorted(
        orders,
        key=lambda order: order.created_at,
        reverse=True,
    )
