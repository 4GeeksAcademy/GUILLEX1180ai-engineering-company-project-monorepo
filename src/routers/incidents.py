"""Incident CSV analysis endpoints (Fase 2 — Integración en la plataforma).

Endpoints
---------
POST /api/incidents/analyze
    Upload a CSV file and receive a JSON analysis summary.
GET  /api/incidents/results/export
    Download the last analysis result as a CSV file.
"""

from __future__ import annotations

import io

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse

from src.incident_service import (
    IncidentAnalyzer,
    export_summary_csv,
    report_to_dict,
)


router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# In-memory store for the last analysis result (simple; survives until restart).
_last_report: dict | None = None


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)) -> dict:
    """Upload a CSV of incidents and receive the analysis summary as JSON.

    The file must contain at least the columns: id, title, category, priority, status.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fichero debe tener extensión .csv.",
        )

    contents = await file.read()

    if not contents or not contents.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fichero CSV está vacío.",
        )

    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El fichero no tiene una codificación UTF-8 válida.",
        ) from error

    analyzer = IncidentAnalyzer(io.StringIO(text), filename=file.filename)
    report = analyzer.analyze()

    global _last_report
    _last_report = report_to_dict(report)

    if report.errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "message": "El fichero contiene errores de formato.",
                "errors": report.errors,
                "analysis": _last_report,
            },
        )

    return _last_report


@router.get("/results/export")
async def export_last_analysis() -> PlainTextResponse:
    """Download the last analysis summary as a CSV file."""
    if _last_report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todavía no se ha realizado ningún análisis.",
        )

    from src.incident_service import AnalysisReport

    report = AnalysisReport(
        filename=_last_report["filename"],
        total=_last_report["total"],
        by_status=_last_report["by_status"],
        by_category=_last_report["by_category"],
        by_priority=_last_report["by_priority"],
        open_count=_last_report["open_count"],
        closed_count=_last_report["closed_count"],
        errors=_last_report["errors"],
    )

    csv_text = export_summary_csv(report)
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=incident_analysis_summary.csv"
        },
    )
