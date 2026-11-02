"use client";

import { apiRequest } from "@/services/api";
import type {
  InventoryItem,
  InventoryItemPayload,
  InventoryItemUpdatePayload,
  InventoryStatus,
  InventorySummary,
  StockAdjustmentPayload,
  WarehouseLocation,
} from "@/types/inventory";

/**
 * Lista los artículos de inventario, opcionalmente filtrados por almacén o estado.
 */
export function listInventoryItems(
  filters: { warehouse?: WarehouseLocation; status?: InventoryStatus } = {},
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (filters.warehouse) params.set("warehouse", filters.warehouse);
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  return apiRequest<InventoryItem[]>(`/inventory${query ? `?${query}` : ""}`);
}

/** Recupera las métricas agregadas del inventario. */
export function getInventorySummary(): Promise<InventorySummary> {
  return apiRequest<InventorySummary>("/inventory/summary");
}

/** Recupera un artículo de inventario concreto por su identificador. */
export function getInventoryItem(id: number): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/inventory/${id}`);
}

/** Crea un nuevo artículo de inventario. */
export function createInventoryItem(
  payload: InventoryItemPayload,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>("/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Actualiza un artículo de inventario existente. */
export function updateInventoryItem(
  id: number,
  payload: InventoryItemUpdatePayload,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Aplica un ajuste de stock firmado (entrada o salida). */
export function adjustInventoryStock(
  id: number,
  payload: StockAdjustmentPayload,
): Promise<InventoryItem> {
  return apiRequest<InventoryItem>(`/inventory/${id}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Elimina un artículo de inventario. */
export function deleteInventoryItem(id: number): Promise<void> {
  return apiRequest<void>(`/inventory/${id}`, { method: "DELETE" });
}
