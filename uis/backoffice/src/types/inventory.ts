/** Tipos e helpers del módulo de inventario de almacenes TrackFlow. */

export type WarehouseLocation = "los_angeles" | "zaragoza";

export type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  quantity: number;
  min_stock: number;
  warehouse: WarehouseLocation;
  status: InventoryStatus;
  updated_at: string;
}

export interface InventoryItemPayload {
  sku: string;
  name: string;
  description?: string | null;
  quantity: number;
  min_stock: number;
  warehouse: WarehouseLocation;
}

export interface InventoryItemUpdatePayload {
  name?: string;
  description?: string | null;
  min_stock?: number;
  warehouse?: WarehouseLocation;
}

export interface StockAdjustmentPayload {
  delta: number;
  note?: string | null;
}

export interface InventorySummary {
  total_items: number;
  total_units: number;
  low_stock_items: number;
  out_of_stock_items: number;
  by_warehouse: Record<string, number>;
  by_status: Record<string, number>;
}

/** Almacenes operados por TrackFlow según BRIEFING.md. */
export const WAREHOUSE_LABELS: Record<WarehouseLocation, string> = {
  los_angeles: "Los Ángeles",
  zaragoza: "Zaragoza",
};

/** Etiquetas legibles para cada estado de stock. */
export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  in_stock: "En stock",
  low_stock: "Stock bajo",
  out_of_stock: "Sin stock",
};

/** Clases Tailwind para el badge de estado. */
export const INVENTORY_STATUS_CLASSES: Record<InventoryStatus, string> = {
  in_stock: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  low_stock: "bg-amber-50 text-amber-800 ring-amber-600/20",
  out_of_stock: "bg-red-50 text-red-800 ring-red-600/20",
};

/** Devuelve true si el rol puede crear, editar o borrar inventario. */
export function canManageInventory(role: string): boolean {
  return role === "admin" || role === "manager";
}
