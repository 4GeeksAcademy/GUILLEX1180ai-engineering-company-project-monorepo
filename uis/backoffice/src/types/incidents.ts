/** Tipos para el análisis de incidencias */

export interface IncidentAnalysisReport {
  filename: string;
  total: number;
  /** Recuento de incidencias agrupadas por estado */
  by_status: Record<string, number>;
  /** Recuento de incidencias agrupadas por categoría */
  by_category: Record<string, number>;
  /** Recuento de incidencias agrupadas por prioridad */
  by_priority: Record<string, number>;
  /** Total de incidencias en estado "open" o "in_progress" */
  open_count: number;
  /** Total de incidencias en estado "resolved" o "closed" */
  closed_count: number;
  /** Lista de errores de validación general (columnas faltantes, etc.) */
  errors: string[];
}

export interface IncidentAnalysisResponse {
  /** Mensaje de error cuando la API responde con 422 */
  message?: string;
  /** Errores detallados */
  errors?: string[];
  /** Resultado del análisis (puede venir anidado en 422) */
  analysis?: IncidentAnalysisReport;
}

/** Estados válidos de incidencia según el sistema TrackFlow */
export const VALID_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

/** Categorías de incidencia presentes en el dataset */
export const VALID_CATEGORIES = [
  "Autenticación",
  "Rendimiento",
  "Compras",
  "UI/UX",
  "Infraestructura",
  "Contenido",
  "Notificaciones",
  "Búsqueda",
  "Reportes",
] as const;

/** Prioridades válidas */
export const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;

/** Nombre legible para cada estado */
export const STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En progreso",
  resolved: "Resuelta",
  closed: "Cerrada",
};

/** Nombre legible para cada prioridad */
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};