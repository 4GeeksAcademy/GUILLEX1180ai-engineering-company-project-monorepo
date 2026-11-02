"use client";

import { useState, type JSX } from "react";

import { downloadExportCsv } from "@/services/incidents";

interface ExportButtonProps {
  /** Deshabilitar si no hay análisis previo */
  disabled?: boolean;
}

export default function ExportButton({
  disabled = false,
}: ExportButtonProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setExportError(null);
    setIsExporting(true);
    try {
      await downloadExportCsv();
    } catch (cause: unknown) {
      const msg =
        cause instanceof Error ? cause.message : "No se pudo descargar el archivo.";
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || isExporting}
        onClick={handleExport}
        className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {isExporting ? (
          <>
            {/* Spinner simple */}
            <svg
              className="h-4 w-4 animate-spin"
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
            Exportando…
          </>
        ) : (
          <>
            {/* Icono de descarga */}
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Exportar Resultados a CSV
          </>
        )}
      </button>

      {exportError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );
}