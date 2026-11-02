/**
 * Tipos de dominio del Hito 5 — Gestión de Inventario (Productos y Órdenes).
 *
 * La terminología, categorías y almacenes provienen de la fuente de verdad de
 * negocio `BRIEFING.md` (TrackFlow): una empresa de gestión de almacenes y
 * entregas de última milla con operación en Los Ángeles y Zaragoza, y clientes
 * de moda, electrónica y cosmética.
 *
 * Los nombres de campo (p. ej. `name`, `sku`, `current_stock`) se mantienen
 * aislados en este módulo para que etiquetas y entidades puedan adaptarse
 * fácilmente a la terminología del negocio sin tocar las vistas.
 */

/** Almacenes operados por TrackFlow según BRIEFING.md. */
export type WarehouseLocation = "los_angeles" | "zaragoza";

export const WAREHOUSE_LABELS: Record<WarehouseLocation, string> = {
  los_angeles: "Los Ángeles",
  zaragoza: "Zaragoza",
};

/** Verticales e-commerce de los clientes de TrackFlow (BRIEFING.md). */
export type ProductCategory = "fashion" | "electronics" | "cosmetics" | "other";

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  fashion: "Moda",
  electronics: "Electrónica",
  cosmetics: "Cosmética",
  other: "Otro",
};

/** Un producto almacenado en un almacén de TrackFlow. */
export interface Product {
  id: number;
  name: string;
  sku: string;
  category: ProductCategory;
  current_stock: number;
  min_stock: number;
  warehouse: WarehouseLocation;
  created_at: string;
  updated_at: string;
}

export interface ProductCreatePayload {
  name: string;
  sku: string;
  category: ProductCategory;
  current_stock: number;
  min_stock: number;
  warehouse: WarehouseLocation;
}

export interface ProductUpdatePayload {
  name?: string;
  category?: ProductCategory;
  min_stock?: number;
  warehouse?: WarehouseLocation;
}

/** Tipo de movimiento de stock (entrada o salida). */
export type OrderType = "inbound" | "outbound";

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  inbound: "Entrada",
  outbound: "Salida",
};

/** Payload enviado al registrar una entrada de stock. */
export interface InboundOrderPayload {
  product_id: number;
  quantity: number;
  note?: string | null;
}

/** Payload enviado al registrar una salida de stock. */
export interface OutboundOrderPayload {
  product_id: number;
  quantity: number;
  note?: string | null;
}

/** Movimiento de stock registrado, vinculado al usuario que lo creó. */
export interface Order {
  id: number;
  product_id: number;
  order_type: OrderType;
  quantity: number;
  user_uuid: string;
  created_at: string;
}

/**
 * Umbrales de nivel de stock para los indicadores visuales (badges).
 *
 *  - Verde  (Saludable):  current_stock > 20
 *  - Ámbar  (Moderado):   5 <= current_stock <= 20
 *  - Rojo   (Bajo):       current_stock < 5
 */
export const STOCK_HEALTHY_THRESHOLD = 20;
export const STOCK_LOW_THRESHOLD = 5;

export type StockLevel = "healthy" | "moderate" | "low";

export function getStockLevel(currentStock: number): StockLevel {
  if (currentStock > STOCK_HEALTHY_THRESHOLD) return "healthy";
  if (currentStock >= STOCK_LOW_THRESHOLD) return "moderate";
  return "low";
}

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  healthy: "Saludable",
  moderate: "Moderado",
  low: "Bajo",
};

export const STOCK_LEVEL_CLASSES: Record<StockLevel, string> = {
  healthy: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  moderate: "bg-amber-50 text-amber-800 ring-amber-600/20",
  low: "bg-red-50 text-red-800 ring-red-600/20",
};

/** Roles autorizados a registrar entradas/salidas y editar productos. */
export type InventoryRole = "admin" | "manager";

export function canManageInventory(role: string): boolean {
  return role === "admin" || role === "manager";
}