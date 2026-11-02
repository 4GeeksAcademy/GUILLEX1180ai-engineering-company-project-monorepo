"""Reusable incident CSV analysis module.

Provides:
- IncidentAnalyzer: read, validate, and count incidents from a CSV file.
- export_summary_csv: export analysis results as CSV text.
- print_report: print a human-readable report to stdout.
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import IO, Any


# Minimum columns required for analysis.
REQUIRED_COLUMNS = {"id", "title", "category", "priority", "status"}

# Canonical values (we accept lowercase comparisons).
VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}


@dataclass
class AnalysisReport:
    """Holds the analysis results for one CSV file."""

    filename: str
    total: int = 0
    by_status: dict[str, int] = field(default_factory=dict)
    by_category: dict[str, int] = field(default_factory=dict)
    by_priority: dict[str, int] = field(default_factory=dict)
    open_count: int = 0
    closed_count: int = 0
    errors: list[str] = field(default_factory=list)


class IncidentAnalyzer:
    """Reads and analyzes incident CSVs.

    Parameters
    ----------
    source : Path | str | IO[str] | IO[bytes]
        A file path or file-like object containing CSV data.
    """

    def __init__(self, source: Path | str | IO[str] | IO[bytes]) -> None:
        self._source = source

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalise(value: Any) -> str:
        """Lower-case, stripped string; '' for None."""
        if value is None:
            return ""
        return str(value).strip().lower()

    def _read_rows(self) -> list[dict[str, str]]:
        """Read the source CSV into a list of dicts."""
        if isinstance(self._source, (Path, str)):
            path = Path(self._source)
            if not path.exists():
                raise FileNotFoundError(f"Fichero no encontrado: {path}")
            with path.open(newline="", encoding="utf-8-sig") as fh:
                return list(csv.DictReader(fh))
        return list(csv.DictReader(self._source))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self) -> AnalysisReport:
        """Run the analysis and return an ``AnalysisReport``."""
        rows = self._read_rows()
        filename = (
            getattr(self._source, "name", None)
            or str(self._source)
        )

        report = AnalysisReport(filename=filename)

        # --- Empty file -------------------------------------------------
        if not rows:
            report.errors.append(
                "El fichero CSV está vacío o no contiene datos."
            )
            return report

        # --- Column validation -----------------------------------------
        headers = set(rows[0].keys())
        missing = REQUIRED_COLUMNS - headers
        if missing:
            report.errors.append(
                f"Columnas obligatorias faltantes: "
                f"{', '.join(sorted(missing))}. "
                f"Columnas encontradas: {', '.join(sorted(headers))}."
            )
            return report

        # --- Count rows ------------------------------------------------
        report.total = len(rows)

        for row in rows:
            status = self._normalise(row.get("status"))
            category = self._normalise(row.get("category"))
            priority = self._normalise(row.get("priority"))

            # By status
            report.by_status[status] = report.by_status.get(status, 0) + 1

            # By category
            report.by_category[category] = (
                report.by_category.get(category, 0) + 1
            )

            # By priority
            report.by_priority[priority] = (
                report.by_priority.get(priority, 0) + 1
            )

            # Open vs closed
            if status in ("open", "in_progress"):
                report.open_count += 1
            elif status in ("resolved", "closed"):
                report.closed_count += 1

        return report


# ------------------------------------------------------------------
# Formatting helpers
# ------------------------------------------------------------------


def report_to_dict(report: AnalysisReport) -> dict[str, Any]:
    """Convert an ``AnalysisReport`` to a JSON-serialisable dict."""
    return {
        "filename": report.filename,
        "total": report.total,
        "by_status": dict(sorted(report.by_status.items())),
        "by_category": dict(sorted(report.by_category.items())),
        "by_priority": dict(sorted(report.by_priority.items())),
        "open_count": report.open_count,
        "closed_count": report.closed_count,
        "errors": report.errors,
    }


def export_summary_csv(report: AnalysisReport) -> str:
    """Return a CSV-formatted summary string suitable for export."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Filename", report.filename])
    writer.writerow(["Total incidents", report.total])
    writer.writerow(["Open (open + in_progress)", report.open_count])
    writer.writerow(["Closed (resolved + closed)", report.closed_count])

    if report.by_status:
        writer.writerow([])
        writer.writerow(["--- By status ---"])
        for status, count in sorted(report.by_status.items()):
            writer.writerow([f"  {status}", count])

    if report.by_category:
        writer.writerow([])
        writer.writerow(["--- By category ---"])
        for category, count in sorted(report.by_category.items()):
            writer.writerow([f"  {category}", count])

    if report.by_priority:
        writer.writerow([])
        writer.writerow(["--- By priority ---"])
        for priority, count in sorted(report.by_priority.items()):
            writer.writerow([f"  {priority}", count])

    if report.errors:
        writer.writerow([])
        writer.writerow(["--- Errors ---"])
        for err in report.errors:
            writer.writerow([f"  ⚠ {err}"])

    return buf.getvalue()


def print_report(report: AnalysisReport) -> None:
    """Print a human-readable analysis report to stdout."""
    sep = "=" * 52
    print(f"\n{sep}")
    print(f"  Incident Analysis Report")
    print(f"{sep}")
    print(f"  File:            {report.filename}")
    print(f"  Total incidents: {report.total}")
    print(f"  Open:            {report.open_count}")
    print(f"  Closed:          {report.closed_count}")
    print(f"{'-' * 52}")

    if report.by_status:
        print("\n  By status:")
        for status, count in sorted(report.by_status.items()):
            print(f"    {status:<22s} {count}")

    if report.by_category:
        print("\n  By category:")
        for category, count in sorted(report.by_category.items()):
            print(f"    {category:<22s} {count}")

    if report.by_priority:
        print("\n  By priority:")
        for priority, count in sorted(report.by_priority.items()):
            print(f"    {priority:<22s} {count}")

    if report.errors:
        print(f"\n  {'!' * 48}")
        for err in report.errors:
            print(f"  ⚠ {err}")
        print(f"  {'!' * 48}")

    print(f"{sep}\n")
