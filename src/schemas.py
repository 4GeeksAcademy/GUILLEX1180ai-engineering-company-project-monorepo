"""Pydantic request and response models for authentication and user profiles."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class User(StrictModel):
    """Persisted user fields; profile data belongs in the profiles table."""

    id: int
    email: EmailStr
    hashed_password: str
    is_active: bool
    role: UserRole
    created_at: datetime


class Profile(StrictModel):
    """Persisted profile fields, linked to a user by TinyDB document ID."""

    id: int
    user_id: int
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class UserCreate(StrictModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)

    @field_validator("password")
    @classmethod
    def validate_bcrypt_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError(
                "Password must not exceed 72 UTF-8 bytes for bcrypt.")
        return value


class UserResponse(StrictModel):
    id: int
    email: EmailStr
    is_active: bool
    role: UserRole
    created_at: datetime


class UserUpdate(StrictModel):
    email: EmailStr | None = None
    role: UserRole | None = None


class ProfileBase(StrictModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=500)


class ProfileResponse(ProfileBase):
    id: int
    user_id: int


class Token(StrictModel):
    access_token: str
    token_type: str = "bearer"


class AuthMeResponse(StrictModel):
    email: EmailStr
    role: UserRole
    profile: ProfileResponse | None = None


class ForgotPasswordRequest(StrictModel):
    email: EmailStr


class ResetPasswordRequest(StrictModel):
    token: str = Field(min_length=1, max_length=4096)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_bcrypt_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError(
                "Password must not exceed 72 UTF-8 bytes for bcrypt.")
        return value


class ChangePasswordRequest(StrictModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_bcrypt_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError(
                "Password must not exceed 72 UTF-8 bytes for bcrypt.")
        return value


class WarehouseLocation(str, Enum):
    los_angeles = "los_angeles"
    zaragoza = "zaragoza"


class InventoryStatus(str, Enum):
    in_stock = "in_stock"
    low_stock = "low_stock"
    out_of_stock = "out_of_stock"


class InventoryItem(StrictModel):
    """Persisted inventory item, keyed by SKU and linked to a warehouse."""

    id: int
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    quantity: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    warehouse: WarehouseLocation
    status: InventoryStatus
    updated_at: datetime


class InventoryItemCreate(StrictModel):
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    quantity: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    warehouse: WarehouseLocation


class InventoryItemUpdate(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    min_stock: int | None = Field(default=None, ge=0)
    warehouse: WarehouseLocation | None = None


class InventoryItemResponse(InventoryItem):
    """Response model for a single inventory item."""


class StockAdjustment(StrictModel):
    delta: int
    note: str | None = Field(default=None, max_length=500)


class MessageResponse(StrictModel):
    message: str


# ---------------------------------------------------------------------------
# Hito 5 — Products and inbound/outbound orders
# ---------------------------------------------------------------------------


class ProductCategory(str, Enum):
    """TrackFlow e-commerce verticals described in BRIEFING.md."""
    fashion = "fashion"
    electronics = "electronics"
    cosmetics = "cosmetics"
    other = "other"


class Product(StrictModel):
    """A stock-keeping product stored in a TrackFlow warehouse."""

    id: int
    name: str = Field(min_length=1, max_length=120)
    sku: str = Field(min_length=1, max_length=64)
    category: ProductCategory
    current_stock: int = Field(ge=0)
    min_stock: int = Field(default=0, ge=0)
    warehouse: WarehouseLocation
    created_at: datetime
    updated_at: datetime


class ProductCreate(StrictModel):
    name: str = Field(min_length=1, max_length=120)
    sku: str = Field(min_length=1, max_length=64)
    category: ProductCategory
    current_stock: int = Field(default=0, ge=0)
    min_stock: int = Field(default=0, ge=0)
    warehouse: WarehouseLocation


class ProductUpdate(StrictModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    category: ProductCategory | None = None
    min_stock: int | None = Field(default=None, ge=0)
    warehouse: WarehouseLocation | None = None


class ProductResponse(Product):
    """Response model for a single product."""


class OrderType(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class InboundOrderPayload(StrictModel):
    """An order that increases a product's available stock."""

    product_id: int
    quantity: int = Field(ge=1)
    note: str | None = Field(default=None, max_length=500)


class OutboundOrderPayload(StrictModel):
    """An order that reduces a product's available stock."""

    product_id: int
    quantity: int = Field(ge=1)
    note: str | None = Field(default=None, max_length=500)


class Order(StrictModel):
    """A recorded stock movement linked to the authenticated user."""

    id: int
    product_id: int
    order_type: OrderType
    quantity: int = Field(ge=1)
    user_uuid: str = Field(min_length=1, max_length=64)
    created_at: datetime
