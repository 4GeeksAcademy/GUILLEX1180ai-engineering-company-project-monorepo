"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useAuthUser } from "@/components/auth/AuthUserContext";
import {
  adjustInventoryStock,
  deleteInventoryItem,
  getInventoryItem,
  updateInventoryItem,
} from "@/services/inventory";
import { getApiFieldErrors } from "@/services/api";
import {
  canManageInventory,
  INVENTORY_STATUS_CLASSES,
  INVENTORY_STATUS_LABELS,
  WAREHOUSE_LABELS,
  type InventoryItem,
  type WarehouseLocation,
} from "@/types/inventory";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; item: InventoryItem }
  | { status: "error"; message: string };

export default function InventoryItemPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthUser();
  const canWrite = canManageInventory(user.role);
  const itemId = Number(params.id);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [warehouse, setWarehouse] = useState<WarehouseLocation>("los_angeles");
  const [delta, setDelta] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const applyItem = useCallback((item: InventoryItem) => {
    setState({ status: "ready", item });
    setName(item.name);
    setDescription(item.description ?? "");
    setMinStock(String(item.min_stock));
    setWarehouse(item.warehouse);
  }, []);

  useEffect(() => {
    let active = true;
    setIsSaving(false);
    setError("");
    getInventoryItem(itemId)
      .then((item) => {
        if (active) applyItem(item);
      })
      .catch((cause: unknown) => {
        if (active) {
          setState({
            status: "error",
            message:
              cause instanceof Error ? cause.message : "No se pudo cargar el artículo.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [itemId, applyItem]);

  async function handleSave(): Promise<void> {
    setError("");
    setNotice("");
    setFieldErrors({});
    const minQty = Number(minStock);
    if (!Number.isInteger(minQty) || minQty < 0) {
      setFieldErrors({ min_stock: "El stock mínimo debe ser un entero mayor o igual a 0." });
      return;
    }
    if (!name.trim()) {
      setFieldErrors({ name: "El nombre es obligatorio." });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateInventoryItem(itemId, {
        name: name.trim(),
        description: description.trim() || null,
        min_stock: minQty,
        warehouse,
      });
      applyItem(updated);
      setNotice("Artículo actualizado correctamente.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el artículo.");
      setFieldErrors(getApiFieldErrors(cause));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjust(sign: 1 | -1): Promise<void> {
    setError("");
    setNotice("");
    const value = Number(delta);
    if (!Number.isInteger(value) || value <= 0) {
      setFieldErrors({ delta: "Introduce un entero mayor que 0." });
      return;
    }
    setFieldErrors({});
    setIsAdjusting(true);
    try {
      const updated = await adjustInventoryStock(itemId, { delta: sign * value });
      applyItem(updated);
      setNotice(
        sign > 0
          ? `Entrada de ${value} unidades registrada.`
          : `Salida de ${value} unidades registrada.`,
      );
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo ajustar el stock.");
    } finally {
      setIsAdjusting(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm("¿Eliminar definitivamente este artículo de inventario?")) return;
    setError("");
    setIsDeleting(true);
    try {
      await deleteInventoryItem(itemId);
      router.push("/inventory");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el artículo.");
      setIsDeleting(false);
    }
  }

  if (state.status === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-muted" role="status" aria-live="polite">
          Cargando artículo…
        </p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5" role="alert">
          <p className="font-semibold text-red-800">No se pudo cargar el artículo</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
          <Link
            href="/inventory"
            className="mt-4 inline-block rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Volver al inventario
          </Link>
        </div>
      </main>
    );
  }

  const item = state.item;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-forest">Backoffice · Almacén</p>
          <h1 className="mt-2 text-3xl font-bold">{item.name}</h1>
          <p className="mt-2 font-mono text-sm text-muted">{item.sku}</p>
        </div>
        <Link
          href="/inventory"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
        >
          Volver
        </Link>
      </header>

      {/* Ficha de stock */}
      <section
        className="mt-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-3"
        aria-label="Estado del stock"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stock actual</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-forest">{item.quantity}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stock mínimo</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-ink">{item.min_stock}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Estado</p>
          <p className="mt-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${INVENTORY_STATUS_CLASSES[item.status]}`}
            >
              {INVENTORY_STATUS_LABELS[item.status]}
            </span>
          </p>
          <p className="mt-2 text-xs text-muted">{WAREHOUSE_LABELS[item.warehouse]}</p>
        </div>
      </section>

      {notice && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {canWrite ? (
        <>
          {/* Ajuste de stock */}
          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5" aria-label="Ajuste de stock">
            <h2 className="text-lg font-semibold">Movimiento de stock</h2>
            <p className="mt-1 text-sm text-muted">
              Registra entradas (recepción) o salidas (picking y packing).
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium" htmlFor="stock-delta">
                  Unidades
                </label>
                <input
                  id="stock-delta"
                  type="number"
                  min={1}
                  step={1}
                  value={delta}
                  onChange={(event) => setDelta(event.target.value)}
                  className="mt-1 w-32 rounded-md border border-slate-300 bg-white px-3 py-2"
                  aria-invalid={Boolean(fieldErrors.delta)}
                  aria-describedby={fieldErrors.delta ? "stock-delta-error" : undefined}
                />
              </div>
              <button
                type="button"
                onClick={() => void handleAdjust(1)}
                disabled={isAdjusting}
                className="rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
              >
                Registrar entrada
              </button>
              <button
                type="button"
                onClick={() => void handleAdjust(-1)}
                disabled={isAdjusting}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-white disabled:opacity-60"
              >
                Registrar salida
              </button>
            </div>
            {fieldErrors.delta && (
              <p id="stock-delta-error" className="mt-2 text-sm text-red-700">
                {fieldErrors.delta}
              </p>
            )}
          </section>

          {/* Datos del artículo */}
          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5" aria-label="Datos del artículo">
            <h2 className="text-lg font-semibold">Datos del artículo</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium" htmlFor="edit-name">
                  Nombre
                </label>
                <input
                  id="edit-name"
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-700">{fieldErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="edit-description">
                  Descripción
                </label>
                <textarea
                  id="edit-description"
                  maxLength={500}
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium" htmlFor="edit-min-stock">
                    Stock mínimo
                  </label>
                  <input
                    id="edit-min-stock"
                    type="number"
                    min={0}
                    step={1}
                    value={minStock}
                    onChange={(event) => setMinStock(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                  {fieldErrors.min_stock && (
                    <p className="mt-1 text-sm text-red-700">{fieldErrors.min_stock}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium" htmlFor="edit-warehouse">
                    Almacén
                  </label>
                  <select
                    id="edit-warehouse"
                    value={warehouse}
                    onChange={(event) => setWarehouse(event.target.value as WarehouseLocation)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="los_angeles">{WAREHOUSE_LABELS.los_angeles}</option>
                    <option value="zaragoza">{WAREHOUSE_LABELS.zaragoza}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="rounded-md bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
              >
                {isSaving ? "Guardando…" : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
              >
                {isDeleting ? "Eliminando…" : "Eliminar artículo"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5" aria-label="Datos del artículo">
          <h2 className="text-lg font-semibold">Datos del artículo</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Nombre</dt>
              <dd className="mt-1 text-ink">{item.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Almacén</dt>
              <dd className="mt-1 text-ink">{WAREHOUSE_LABELS[item.warehouse]}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Descripción</dt>
              <dd className="mt-1 text-ink">{item.description || "—"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            Tu rol permite consultar el inventario, pero no modificarlo.
          </p>
        </section>
      )}
    </main>
  );
}
