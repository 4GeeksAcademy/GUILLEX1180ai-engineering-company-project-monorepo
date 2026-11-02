"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import Link from "next/link";

import { useAuthUser } from "@/components/auth/AuthUserContext";
import {
  deleteInventoryItem,
  getInventorySummary,
  listInventoryItems,
} from "@/services/inventory";
import {
  canManageInventory,
  INVENTORY_STATUS_CLASSES,
  INVENTORY_STATUS_LABELS,
  WAREHOUSE_LABELS,
  type InventoryItem,
  type InventoryStatus,
  type InventorySummary,
  type WarehouseLocation,
} from "@/types/inventory";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: InventoryItem[]; summary: InventorySummary | null }
  | { status: "error"; message: string };

export default function InventoryPage(): JSX.Element {
  const user = useAuthUser();
  const canWrite = canManageInventory(user.role);

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [warehouseFilter, setWarehouseFilter] = useState<WarehouseLocation | "">("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "">("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [items, summary] = await Promise.all([
        listInventoryItems({
          warehouse: warehouseFilter || undefined,
          status: statusFilter || undefined,
        }),
        getInventorySummary(),
      ]);
      setState({ status: "ready", items, summary });
    } catch (cause: unknown) {
      setState({
        status: "error",
        message:
          cause instanceof Error ? cause.message : "No se pudo cargar el inventario.",
      });
    }
  }, [warehouseFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(item: InventoryItem): Promise<void> {
    if (!window.confirm(`¿Eliminar el artículo ${item.sku} — ${item.name}?`)) return;
    setActionError("");
    setDeletingId(item.id);
    try {
      await deleteInventoryItem(item.id);
      await load();
    } catch (cause: unknown) {
      setActionError(
        cause instanceof Error ? cause.message : "No se pudo eliminar el artículo.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  const items = state.status === "ready" ? state.items : [];
  const summary = state.status === "ready" ? state.summary : null;
  const term = search.trim().toLowerCase();
  const visibleItems = term
    ? items.filter(
        (item) =>
          item.sku.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term),
      )
    : items;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-forest">Backoffice · Almacén</p>
          <h1 className="mt-2 text-3xl font-bold">Inventario</h1>
          <p className="mt-2 text-muted">
            Stock en tiempo real de los almacenes de Los Ángeles y Zaragoza: almacenamiento,
            picking y packing.
          </p>
        </div>
        {canWrite && (
          <Link
            href="/inventory/new"
            className="rounded-md bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest/90"
          >
            Nuevo artículo
          </Link>
        )}
      </header>

      {/* Métricas agregadas */}
      {summary && (
        <section
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Resumen de inventario"
        >
          <MetricCard label="Artículos" value={summary.total_items} />
          <MetricCard label="Unidades totales" value={summary.total_units} />
          <MetricCard
            label="Stock bajo"
            value={summary.low_stock_items}
            tone="amber"
          />
          <MetricCard
            label="Sin stock"
            value={summary.out_of_stock_items}
            tone="red"
          />
        </section>
      )}

      {/* Filtros */}
      <section className="mt-8 flex flex-wrap items-end gap-4" aria-label="Filtros de inventario">
        <div className="min-w-56 flex-1">
          <label className="block text-sm font-medium" htmlFor="inventory-search">
            Buscar por SKU o nombre
          </label>
          <input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej. TF-1001"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="inventory-warehouse">
            Almacén
          </label>
          <select
            id="inventory-warehouse"
            value={warehouseFilter}
            onChange={(event) =>
              setWarehouseFilter(event.target.value as WarehouseLocation | "")
            }
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="los_angeles">{WAREHOUSE_LABELS.los_angeles}</option>
            <option value="zaragoza">{WAREHOUSE_LABELS.zaragoza}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="inventory-status">
            Estado
          </label>
          <select
            id="inventory-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as InventoryStatus | "")
            }
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            <option value="">Todos</option>
            <option value="in_stock">{INVENTORY_STATUS_LABELS.in_stock}</option>
            <option value="low_stock">{INVENTORY_STATUS_LABELS.low_stock}</option>
            <option value="out_of_stock">{INVENTORY_STATUS_LABELS.out_of_stock}</option>
          </select>
        </div>
      </section>

      {actionError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {actionError}
        </p>
      )}

      {/* Estados de carga / error */}
      {state.status === "loading" && (
        <p className="mt-10 text-sm text-muted" role="status" aria-live="polite">
          Cargando inventario…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5" role="alert">
          <p className="font-semibold text-red-800">No se pudo cargar el inventario</p>
          <p className="mt-1 text-sm text-red-700">{state.message}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {state.status === "ready" && (
        <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white" aria-label="Listado de inventario">
          {visibleItems.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium text-ink">No hay artículos que coincidan.</p>
              <p className="mt-1 text-sm text-muted">
                Ajusta los filtros o crea un nuevo artículo de inventario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <caption className="sr-only">
                  Artículos de inventario con SKU, almacén, stock y estado
                </caption>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>SKU</Th>
                    <Th>Artículo</Th>
                    <Th>Almacén</Th>
                    <Th className="text-right">Stock</Th>
                    <Th className="text-right">Mínimo</Th>
                    <Th>Estado</Th>
                    <Th className="text-right">Acciones</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-ink">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{item.name}</p>
                        {item.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">
                        {WAREHOUSE_LABELS[item.warehouse]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted">
                        {item.min_stock}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${INVENTORY_STATUS_CLASSES[item.status]}`}
                        >
                          {INVENTORY_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/inventory/${item.id}`}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-white"
                          >
                            {canWrite ? "Editar" : "Ver"}
                          </Link>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deletingId === item.id ? "Eliminando…" : "Eliminar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted ${className}`}
    >
      {children}
    </th>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "red";
}): JSX.Element {
  const toneClass =
    tone === "amber"
      ? "text-amber-700"
      : tone === "red"
        ? "text-red-700"
        : "text-forest";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
