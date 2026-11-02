"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import Link from "next/link";

import { useAuthUser } from "@/components/auth/AuthUserContext";
import { StockLevelBadge } from "@/components/inventory/Badges";
import { listProducts } from "@/lib/inventory";
import {
  canManageInventory,
  PRODUCT_CATEGORY_LABELS,
  WAREHOUSE_LABELS,
  type Product,
} from "@/types/inventoryOrder";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; products: Product[] }
  | { status: "error"; message: string };

export default function InventoryProductsPage(): JSX.Element {
  const user = useAuthUser();
  const canWrite = canManageInventory(user.role);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const products = await listProducts();
      setState({ status: "ready", products });
    } catch (cause: unknown) {
      setState({
        status: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar los productos.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const products = state.status === "ready" ? state.products : [];
  const term = search.trim().toLowerCase();
  const visibleProducts = term
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term),
      )
    : products;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-forest">Backoffice · Almacén</p>
          <h1 className="mt-2 text-3xl font-bold">Productos</h1>
          <p className="mt-2 text-muted">
            Catálogo de productos con su stock en tiempo real en los almacenes de
            Los Ángeles y Zaragoza.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Acciones de inventario">
          <Link
            href="/inventory/orders"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white"
          >
            Historial de órdenes
          </Link>
          {canWrite && (
            <Link
              href="/inventory/products/new"
              className="rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/90"
            >
              Nuevo producto
            </Link>
          )}
        </nav>
      </header>

      {state.status === "loading" && (
        <p className="mt-10 text-center text-muted" role="status">
          Cargando productos…
        </p>
      )}

      {state.status === "error" && (
        <div className="mt-10 rounded-md border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">No se pudieron cargar los productos</p>
          <p className="mt-1 text-sm">{state.message}</p>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {visibleProducts.length} producto{visibleProducts.length === 1 ? "" : "s"}
            </p>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o SKU…"
              aria-label="Buscar producto"
              className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          {visibleProducts.length === 0 ? (
            <div className="mt-10 rounded-lg border border-dashed border-slate-300 p-12 text-center">
              <p className="font-semibold text-ink">No hay productos</p>
              <p className="mt-1 text-sm text-muted">
                {term
                  ? "Ningún producto coincide con la búsqueda."
                  : "Registra el primer producto para empezar a gestionar stock."}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Producto</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Almacén</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Nivel de stock</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/inventory/products?productId=${product.id}`}
                          className="font-semibold text-forest hover:underline"
                        >
                          {product.name}
                        </Link>
                        <span className="block font-mono text-xs text-muted">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {PRODUCT_CATEGORY_LABELS[product.category]}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {WAREHOUSE_LABELS[product.warehouse]}
                      </td>
                      <td className="px-4 py-3">
                        <StockLevelBadge currentStock={product.current_stock} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite ? (
                            <>
                              <Link
                                href={`/inventory/orders/inbound?productId=${product.id}`}
                                className="rounded-md border border-emerald-300 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                              >
                                Registrar entrada
                              </Link>
                              <Link
                                href={`/inventory/orders/outbound?productId=${product.id}`}
                                className="rounded-md border border-coral/40 px-2.5 py-1.5 text-xs font-semibold text-coral hover:bg-coral/10"
                              >
                                Registrar salida
                              </Link>
                            </>
                          ) : (
                            <span className="text-xs text-muted">
                              Solo lectura ·{" "}
                              <Link
                                href={`/inventory/orders?productId=${product.id}`}
                                className="font-semibold text-forest hover:underline"
                              >
                                Ver movimientos
                              </Link>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}