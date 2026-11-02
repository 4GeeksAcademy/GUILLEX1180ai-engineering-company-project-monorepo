"use client";

import { useState, type JSX } from "react";

import FileUpload from "@/components/incidents/FileUpload";
import AnalysisResults from "@/components/incidents/AnalysisResults";
import ExportButton from "@/components/incidents/ExportButton";
import { uploadAndAnalyzeCsv } from "@/services/incidents";
import type { IncidentAnalysisReport } from "@/types/incidents";

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; report: IncidentAnalysisReport }
  | { status: "error"; message: string; detail?: unknown };

export default function AnalyzePage(): JSX.Element {
  const [state, setState] = useState<PageState>({ status: "idle" });

  const detailErrors: string[] =
    state.status === "error" && Array.isArray(state.detail)
      ? (state.detail as string[])
      : [];

  async function handleFileSelected(file: File) {
    setState({ status: "loading" });
    try {
      const report = await uploadAndAnalyzeCsv(file);
      setState({ status: "success", report });
    } catch (cause: unknown) {
      const message =
        cause instanceof Error ? cause.message : "Error desconocido al procesar el archivo.";
      setState({
        status: "error",
        message,
        detail: cause instanceof Error ? (cause as Error & { detail?: unknown }).detail : undefined,
      });
    }
  }

  function handleReset() {
    setState({ status: "idle" });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Cabecera */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase text-forest">Backoffice · Operaciones</p>
        <h1 className="mt-2 text-3xl font-bold">Análisis de Incidencias</h1>
        <p className="mt-2 text-muted">
          Sube un archivo CSV con los datos de incidencias para obtener un resumen completo con
          métricas, desgloses y detección de errores.
        </p>
      </header>

      {/* Zona de carga */}
      <section className="mt-8" aria-label="Carga de archivo">
        <FileUpload
          onFileSelected={handleFileSelected}
          disabled={state.status === "loading"}
        />
      </section>

      {/* Spinner de carga */}
      {state.status === "loading" && (
        <div className="mt-10 flex flex-col items-center gap-3" role="status" aria-live="polite">
          <svg
            className="h-8 w-8 animate-spin text-forest"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-sm font-medium text-muted">Analizando incidencias…</p>
          <p className="text-xs text-muted">Esto puede tomar unos segundos.</p>
        </div>
      )}

      {/* Error de API */}
      {state.status === "error" && (
        <section
          className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5"
          role="alert"
          aria-label="Error de análisis"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
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
            <div className="flex-1">
              <p className="font-semibold text-red-800">Error al procesar el archivo</p>
              <p className="mt-1 text-sm text-red-700">{state.message}</p>
              {detailErrors.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                  {detailErrors.map((err: string, idx: number) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Intentar de nuevo
          </button>
        </section>
      )}

      {/* Resultados exitosos */}
      {state.status === "success" && (
        <div className="mt-10 space-y-8">
          <AnalysisResults report={state.report} />

          {/* Exportación */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-5 py-4">
            <div>
              <p className="font-medium text-ink">Exportar resultados</p>
              <p className="text-sm text-muted">
                Descarga un resumen en formato CSV con todas las métricas calculadas.
              </p>
            </div>
            <ExportButton />
          </div>

          {/* Nuevo análisis */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-white"
            >
              Analizar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}