"use client";

import type { JSX } from "react";

import type { IncidentAnalysisReport } from "@/types/incidents";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types/incidents";

interface AnalysisResultsProps {
  report: IncidentAnalysisReport;
}

/** Formatea un número como entero con separador de miles */
function fmt(n: number): string {
  return n.toLocaleString("es-ES");
}

/** Colores para badges de estado */
function statusBadgeColor(status: string): string {
  switch (status) {
    case "open":
      return "bg-blue-50 text-blue-800 ring-blue-600/20";
    case "in_progress":
      return "bg-amber-50 text-amber-800 ring-amber-600/20";
    case "resolved":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
    case "closed":
      return "bg-slate-50 text-slate-600 ring-slate-500/20";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-500/20";
  }
}

/** Colores para badges de prioridad */
function priorityBadgeColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-50 text-red-800 ring-red-600/20";
    case "high":
      return "bg-orange-50 text-orange-800 ring-orange-600/20";
    case "medium":
      return "bg-yellow-50 text-yellow-800 ring-yellow-600/20";
    case "low":
      return "bg-slate-50 text-slate-600 ring-slate-500/20";
    default:
      return "bg-gray-50 text-gray-600 ring-gray-500/20";
  }
}

/** Color de barra para una categoría */
function categoryBarColor(index: number): string {
  const colors = [
    "bg-forest",
    "bg-leaf",
    "bg-coral",
    "bg-blue-600",
    "bg-purple-600",
    "bg-pink-600",
    "bg-teal-600",
  ];
  return colors[index % colors.length];
}

export default function AnalysisResults({
  report,
}: AnalysisResultsProps): JSX.Element {
  const total = report.total;
  // El backend actual no separa válidos/inválidos por fila;
  // si en el futuro se añade, usamos la propiedad. Mientras tanto,
  // asumimos que todos son válidos si no hay errores a nivel de columna.
  const validCount =
    "valid_count" in report
      ? (report as unknown as Record<string, number>).valid_count
      : report.errors.length === 0
        ? total
        : 0;
  const invalidCount =
    "invalid_count" in report
      ? (report as unknown as Record<string, number>).invalid_count
      : report.errors.length > 0
        ? total
        : 0;

  // Índice de satisfacción medio (pendiente de implementar en backend)
  const satisfactionScore =
    "avg_satisfaction" in report
      ? (report as unknown as Record<string, number>).avg_satisfaction
      : null;

  // Errores de validación de filas individuales
  const rowErrors: string[] = report.errors;

  // Preparar listas ordenadas para desgloses
  const statusEntries = Object.entries(report.by_status).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const categoryEntries = Object.entries(report.by_category).sort(
    ([, a], [, b]) => b - a,
  );
  const priorityEntries = Object.entries(report.by_priority).sort(
    ([, a], [, b]) => b - a,
  );

  const maxCategoryCount =
    categoryEntries.length > 0
      ? Math.max(...categoryEntries.map(([, c]) => c))
      : 1;

  return (
    <section className="space-y-8" aria-label="Resultados del análisis">
      {/* ── Métricas generales ── */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Métricas generales
        </h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase text-muted">Total procesados</p>
            <p className="mt-1 text-3xl font-bold text-ink">{fmt(total)}</p>
          </div>
          {/* Válidos */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase text-muted">Registros válidos</p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">{fmt(validCount)}</p>
          </div>
          {/* Inválidos */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase text-muted">Registros inválidos</p>
            <p className="mt-1 text-3xl font-bold text-red-700">{fmt(invalidCount)}</p>
          </div>
          {/* Satisfacción */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase text-muted">
              Índice de satisfacción medio
            </p>
            {satisfactionScore !== null ? (
              <p className="mt-1 text-3xl font-bold text-forest">
                {satisfactionScore.toFixed(1)}
                <span className="text-base font-normal text-muted"> / 5.0</span>
              </p>
            ) : (
              <p className="mt-2 text-sm italic text-muted">
                Pendiente de implementar
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Desglose por estado ── */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Desglose por estado
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusEntries.length === 0 && (
            <p className="col-span-full text-sm italic text-muted">
              No hay datos de estado.
            </p>
          )}
          {statusEntries.map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeColor(status)}`}
                >
                  {STATUS_LABELS[status] ?? status}
                </span>
              </div>
              <span className="text-lg font-bold text-ink">{fmt(count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desglose por prioridad ── */}
      {priorityEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Desglose por prioridad
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {priorityEntries.map(([priority, count]) => (
              <div
                key={priority}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityBadgeColor(priority)}`}
                  >
                    {PRIORITY_LABELS[priority] ?? priority}
                  </span>
                </div>
                <span className="text-lg font-bold text-ink">{fmt(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Desglose por categoría ── */}
      {categoryEntries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Desglose por categoría
          </h3>
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white px-5 py-4">
            {categoryEntries.map(([category, count], index) => (
              <div key={category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{category}</span>
                  <span className="font-semibold text-muted">{fmt(count)}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${categoryBarColor(index)}`}
                    style={{
                      width: `${Math.max(2, (count / maxCategoryCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Registros inválidos ── */}
      {rowErrors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
            <svg
              className="h-6 w-6 shrink-0 text-amber-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-amber-800">
                Se encontraron {rowErrors.length} error
                {rowErrors.length !== 1 ? "es" : ""} de validación
              </p>
              <p className="mt-1 text-sm text-amber-700">
                Revisa los detalles a continuación y corrige el fichero antes de reanalizarlo.
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {rowErrors.map((err, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-white px-4 py-3"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-ink">{err}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Fichero fuente ── */}
      {report.filename && (
        <p className="text-xs text-muted">
          Fuente: <span className="font-medium text-ink">{report.filename}</span>
        </p>
      )}
    </section>
  );
}