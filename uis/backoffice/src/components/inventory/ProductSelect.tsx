"use client";

import type { JSX } from "react";

import {
  PRODUCT_CATEGORY_LABELS,
  WAREHOUSE_LABELS,
  type Product,
} from "@/types/inventoryOrder";

/**
 * Selector de producto que lista los productos por nombre (y SKU) para que el
 * operario elija por la referencia legible, nunca tecleando un ID manual.
 */
export function ProductSelect({
  products,
  value,
  onChange,
  id,
  placeholder = "Selecciona un producto…",
}: {
  products: Product[];
  value: number | null;
  onChange: (productId: number | null) => void;
  id: string;
  placeholder?: string;
}): JSX.Element {
  return (
    <select
      id={id}
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value ? Number(event.target.value) : null)
      }
      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
    >
      <option value="">{placeholder}</option>
      {products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.name} · {product.sku} · {WAREHOUSE_LABELS[product.warehouse]} ·{" "}
          {PRODUCT_CATEGORY_LABELS[product.category]}
        </option>
      ))}
    </select>
  );
}