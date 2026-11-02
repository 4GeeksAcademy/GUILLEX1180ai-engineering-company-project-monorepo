"use client";

import { useState, type FormEvent, type JSX } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createInventoryItem } from "@/services/inventory";
import { getApiFieldErrors } from "@/services/api";
import {
  WAREHOUSE_LABELS,
  type WarehouseLocation,
} from "@/types/inventory";

export default function NewInventoryItemPage(): JSX.Element {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [warehouse, setWarehouse] = useState<WarehouseLocation>("los_angeles");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (!sku.trim()) {
      setFieldErrors({ sku: "El SKU es obligatorio." });
      return;
    }
    if (!name.trim()) {
      setFieldErrors({ name: "El nombre es obligatorio." });
      return;
    }
    const qty = Number(quantity);
    const minQty = Number(minStock);
    if (!Number.isInteger(qty) || qty < 0) {
      setFieldErrors({ quantity: "La cantidad debe ser un entero mayor o igual a 0." });
      return;
    }
    if (!Number.isInteger(minQty) || minQty < 0) {
      setFieldErrors({ min_stock: "El stock mínimo debe ser un entero mayor o igual a 0." });
      return;
    }

    setIsSaving(true);
    try {
      const created = await createInventoryItem({
        sku: sku.trim(),
        name: name.trim(),
        description: description.trim() || null,
        quantity: qty,
        min_stock: minQty,
        warehouse,
      });
      router.push(`/inventory/${created.id}`);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear el artículo.",
      );
      setFieldErrors(getApiFieldErrors(cause));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-forest">Backoffice · Almacén</p>
          <h1 className="mt-2 text-3xl font-bold">Nuevo artículo de inventario</h1>
          <p className="mt-2 text-muted">
            Registra una nueva referencia con su stock inicial y umbral de reposición.
          </p>
        </div>
        <Link
          href="/inventory"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
        >
          Volver
        </Link>
      </header>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="item-sku">
              SKU
            </label>
            <input
              id="item-sku"
              maxLength={64}
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono"
              aria-invalid={Boolean(fieldErrors.sku)}
              aria-describedby={fieldErrors.sku ? "item-sku-error" : undefined}
            />
            {fieldErrors.sku && (
              <p id="item-sku-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.sku}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="item-warehouse">
              Almacén
            </label>
            <select
              id="item-warehouse"
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value as WarehouseLocation)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            >
              <option value="los_angeles">{WAREHOUSE_LABELS.los_angeles}</option>
              <option value="zaragoza">{WAREHOUSE_LABELS.zaragoza}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="item-name">
            Nombre
          </label>
          <input
            id="item-name"
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "item-name-error" : undefined}
          />
          {fieldErrors.name && (
            <p id="item-name-error" className="mt-1 text-sm text-red-700">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="item-description">
            Descripción
          </label>
          <textarea
            id="item-description"
            maxLength={500}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium" htmlFor="item-quantity">
              Stock inicial
            </label>
            <input
              id="item-quantity"
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              aria-invalid={Boolean(fieldErrors.quantity)}
              aria-describedby={fieldErrors.quantity ? "item-quantity-error" : undefined}
            />
            {fieldErrors.quantity && (
              <p id="item-quantity-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.quantity}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="item-min-stock">
              Stock mínimo
            </label>
            <input
              id="item-min-stock"
              type="number"
              min={0}
              step={1}
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              aria-invalid={Boolean(fieldErrors.min_stock)}
              aria-describedby={fieldErrors.min_stock ? "item-min-stock-error" : undefined}
            />
            {fieldErrors.min_stock && (
              <p id="item-min-stock-error" className="mt-1 text-sm text-red-700">
                {fieldErrors.min_stock}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            disabled={isSaving}
            type="submit"
            className="inline-flex min-w-40 items-center justify-center rounded-md bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
          >
            {isSaving ? "Guardando…" : "Crear artículo"}
          </button>
          <Link
            href="/inventory"
            className="rounded-md border border-slate-300 px-4 py-2.5 font-semibold hover:bg-white"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </main>
  );
}
