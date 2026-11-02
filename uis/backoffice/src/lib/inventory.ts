/**
 * Módulo de integración con la API de inventario (Hito 5).
 *
 * Centraliza TODAS las llamadas a `/inventory/products` y `/inventory/orders`.
 * Ningún componente React debe llamar a `fetch` directamente.
 *
 * Reutiliza la capa central `@/services/api`:
 *  - `apiRequest` inyecta `Authorization: Bearer <token>` desde localStorage,
 *    cierra la sesión ante un 401 y lanza `ApiError` con un mensaje legible
 *    extraído de `detail`/`message` en respuestas 4xx/5xx (nunca JSON en bruto).
 *  - La base URL se toma de `NEXT_PUBLIC_INVENTORY_API_URL` (con fallback a
 *    `NEXT_PUBLIC_API_URL`) y por defecto `http://localhost:8000`.
 */

import { apiRequest } from "@/services/api";
import type {
  InboundOrderPayload,
  Order,
  OutboundOrderPayload,
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
} from "@/types/inventoryOrder";

/** URL base del servicio de inventario. */
export const INVENTORY_API_URL =
  process.env.NEXT_PUBLIC_INVENTORY_API_URL?.replace(/\/+$/, "") ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:8000";

/** Wrapper local que fija la base URL del servicio de inventario. */
function inventoryRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiRequest<T>(path, init, { baseUrl: INVENTORY_API_URL });
}

/** GET /inventory/products — lista de productos (ordenada por nombre). */
export function listProducts(): Promise<Product[]> {
  return inventoryRequest<Product[]>("/inventory/products");
}

/** GET /inventory/products/{id} — detalle de un producto. */
export function getProduct(productId: number): Promise<Product> {
  return inventoryRequest<Product>(`/inventory/products/${productId}`);
}

/** POST /inventory/products — crea un producto (admin/manager). */
export function createProduct(payload: ProductCreatePayload): Promise<Product> {
  return inventoryRequest<Product>("/inventory/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** PUT /inventory/products/{id} — actualiza un producto (admin/manager). */
export function updateProduct(
  productId: number,
  payload: ProductUpdatePayload,
): Promise<Product> {
  return inventoryRequest<Product>(`/inventory/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** DELETE /inventory/products/{id} — elimina un producto (admin/manager). */
export function deleteProduct(productId: number): Promise<void> {
  return inventoryRequest<void>(`/inventory/products/${productId}`, {
    method: "DELETE",
  });
}

/** GET /inventory/orders — historial completo, más recientes primero. */
export function listOrders(): Promise<Order[]> {
  return inventoryRequest<Order[]>("/inventory/orders");
}

/** POST /inventory/orders/inbound — registra una entrada de stock. */
export function createInboundOrder(
  payload: InboundOrderPayload,
): Promise<Order> {
  return inventoryRequest<Order>("/inventory/orders/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** POST /inventory/orders/outbound — registra una salida (valida stock). */
export function createOutboundOrder(
  payload: OutboundOrderPayload,
): Promise<Order> {
  return inventoryRequest<Order>("/inventory/orders/outbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
