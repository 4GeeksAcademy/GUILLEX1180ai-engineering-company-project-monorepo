"use client";

import { apiRequest, ApiError } from "@/services/api";
import type {
  IncidentAnalysisReport,
} from "@/types/incidents";

/**
 * Sube un fichero CSV al endpoint de análisis y devuelve el resumen JSON.
 * Lanza ApiError si la respuesta no es satisfactoria.
 */
export async function uploadAndAnalyzeCsv(
  file: File,
): Promise<IncidentAnalysisReport> {
  if (typeof window === "undefined") {
    throw new Error("uploadAndAnalyzeCsv solo se puede usar desde el navegador.");
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!API_BASE_URL) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");

  const token = localStorage.getItem("token");
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/incidents/analyze`, {
    method: "POST",
    headers,
    body: formData,
    credentials: "omit",
  });

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    // 422 → errores de validación de filas
    if (response.status === 422) {
      const detail =
        typeof body === "object" && body !== null
          ? (body as Record<string, unknown>)
          : {};

      // Si hay un analysis anidado, devolverlo igualmente
      if (detail.analysis && typeof detail.analysis === "object") {
        return detail.analysis as IncidentAnalysisReport;
      }

      // Si hay un mensaje + errors, lanzar con detalle
      const message =
        typeof detail.message === "string"
          ? detail.message
          : "El fichero contiene errores de formato.";
      const errorsList = Array.isArray(detail.errors)
        ? (detail.errors as string[])
        : [];
      throw new ApiError(
        message,
        response.status,
        errorsList.length > 0 ? errorsList : detail,
      );
    }

    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? (body as Record<string, unknown>).detail
        : body;
    const errorMsg =
      typeof detail === "string"
        ? detail
        : `La API respondió con HTTP ${response.status}.`;
    throw new ApiError(errorMsg, response.status, detail);
  }

  return body as IncidentAnalysisReport;
}

/**
 * Descarga el último resultado de análisis como fichero CSV.
 */
export async function downloadExportCsv(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("downloadExportCsv solo se puede usar desde el navegador.");
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  if (!API_BASE_URL) throw new Error("NEXT_PUBLIC_API_URL no está configurada.");

  const token = localStorage.getItem("token");
  const headers = new Headers();
  headers.set("Accept", "text/csv");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/api/incidents/results/export`, {
    method: "GET",
    headers,
    credentials: "omit",
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? (body as Record<string, unknown>).detail
        : body;
    const errorMsg =
      typeof detail === "string"
        ? detail
        : `La API respondió con HTTP ${response.status}.`;
    throw new ApiError(errorMsg, response.status, detail);
  }

  const csvText = await response.text();
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "incident_analysis_summary.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}