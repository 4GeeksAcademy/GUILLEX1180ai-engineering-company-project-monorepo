/** Badges reutilizables para los indicadores visuales del Hito 5. */

import type { JSX } from "react";

import {
  getStockLevel,
  STOCK_LEVEL_CLASSES,
  STOCK_LEVEL_LABELS,
  type StockLevel,
} from "@/types/inventoryOrder";

/** Badge de nivel de stock: Verde >20, Ámbar 5-20, Rojo <5. */
export function StockLevelBadge({
  currentStock,
}: {
  currentStock: number;
}): JSX.Element {
  const level: StockLevel = getStockLevel(currentStock);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STOCK_LEVEL_CLASSES[level]}`}
    >
      {STOCK_LEVEL_LABELS[level]} · {currentStock}
    </span>
  );
}

/** Badge de tipo de orden: entrada (verde) vs salida (coral). */
export function OrderTypeBadge({ orderType }: { orderType: "inbound" | "outbound" }): JSX.Element {
  const isInbound = orderType === "inbound";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        isInbound
          ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
          : "bg-coral/10 text-coral ring-coral/30"
      }`}
      aria-label={isInbound ? "Entrada de stock" : "Salida de stock"}
    >
      {isInbound ? (
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" />
        </svg>
      ) : (
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" />
        </svg>
      )}
      {isInbound ? "Entrada" : "Salida"}
    </span>
  );
}