"""Tests for the incident CSV analysis module (src/incident_service.py)."""

from __future__ import annotations

import io
from pathlib import Path

import pytest

from src.incident_service import (
    IncidentAnalyzer,
    AnalysisReport,
    export_summary_csv,
    print_report,
    REQUIRED_COLUMNS,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_CSV = """\
id,title,category,priority,status,assigned_to
INC-001,Login failure,Autenticación,high,open,juan.perez
INC-002,Slow page,Rendimiento,medium,open,maria.garcia
INC-003,Error 500 checkout,Compras,critical,closed,carlos.lopez
INC-004,Recovery link expired,Autenticación,low,closed,ana.martinez
INC-005,Icons missing,UI/UX,low,open,luis.ramirez
"""

SAMPLE_ROWS = [
    {"id": "INC-001", "title": "Login failure",
        "category": "Autenticación", "priority": "high", "status": "open"},
    {"id": "INC-002", "title": "Slow page", "category": "Rendimiento",
        "priority": "medium", "status": "open"},
    {"id": "INC-003", "title": "Error 500 checkout",
        "category": "Compras", "priority": "critical", "status": "closed"},
    {"id": "INC-004", "title": "Recovery link expired",
        "category": "Autenticación", "priority": "low", "status": "closed"},
    {"id": "INC-005", "title": "Icons missing",
        "category": "UI/UX", "priority": "low", "status": "open"},
]


def make_csv_string(rows: list[dict[str, str]]) -> str:
    """Build a CSV string from a list of dicts."""
    if not rows:
        return "id,title,category,priority,status\n"
    headers = list(rows[0].keys())
    lines = [",".join(headers)]
    for row in rows:
        lines.append(",".join(str(row.get(h, "")) for h in headers))
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Empty / missing data tests
# ---------------------------------------------------------------------------


class TestEmptyInput:
    def test_empty_csv_string(self) -> None:
        """Analyzing an empty string yields an error."""
        analyzer = IncidentAnalyzer("")
        report = analyzer.analyze()
        assert report.total == 0
        assert report.errors
        assert "vacío" in report.errors[0]

    def test_empty_io(self) -> None:
        """Analyzing a StringIO with only headers yields empty rows -> error."""
        analyzer = IncidentAnalyzer(io.StringIO(
            "id,title,category,priority,status\n"))
        report = analyzer.analyze()
        assert report.total == 0
        assert report.errors
        assert "vacío" in report.errors[0]

    def test_csv_with_only_headers(self) -> None:
        """No data rows = empty analysis."""
        analyzer = IncidentAnalyzer(io.StringIO("a,b\n"))
        report = analyzer.analyze()
        assert report.total == 0


# ---------------------------------------------------------------------------
# Column validation tests
# ---------------------------------------------------------------------------


class TestMissingColumns:
    def test_all_columns_missing(self) -> None:
        csv_data = "foo,bar\n1,2\n"
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.total == 0
        assert report.errors
        assert "Columnas obligatorias faltantes" in report.errors[0]
        for col in REQUIRED_COLUMNS:
            assert col in report.errors[0]

    def test_single_column_missing(self) -> None:
        csv_data = "id,title,category,priority\nfoo,bar,baz,low\n"
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.total == 0
        assert any("status" in e for e in report.errors)


# ---------------------------------------------------------------------------
# Happy path — valid CSV
# ---------------------------------------------------------------------------


class TestValidAnalysis:
    def test_string_source(self) -> None:
        """Analyze from a plain CSV string."""
        analyzer = IncidentAnalyzer(SAMPLE_CSV)
        report = analyzer.analyze()
        assert report.total == 5
        assert report.errors == []

    def test_io_string_source(self) -> None:
        """Analyze from a StringIO."""
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        assert report.total == 5
        assert report.errors == []

    def test_bytes_source(self) -> None:
        """Analyze from a bytes object (common for file uploads)."""
        analyzer = IncidentAnalyzer(SAMPLE_CSV.encode("utf-8-sig"))
        report = analyzer.analyze()
        assert report.total == 5

    def test_filename_metadata(self) -> None:
        """filename= kwarg appears in the report."""
        analyzer = IncidentAnalyzer(
            io.StringIO(SAMPLE_CSV), filename="test.csv")
        report = analyzer.analyze()
        assert report.filename == "test.csv"

    def test_counts_by_status(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        assert report.by_status["open"] == 3
        assert report.by_status["closed"] == 2

    def test_counts_by_category(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        assert report.by_category["autenticación"] == 2
        assert report.by_category["rendimiento"] == 1
        assert report.by_category["compras"] == 1
        assert report.by_category["ui/ux"] == 1

    def test_counts_by_priority(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        assert report.by_priority["high"] == 1
        assert report.by_priority["medium"] == 1
        assert report.by_priority["critical"] == 1
        assert report.by_priority["low"] == 2

    def test_open_closed_counts(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        assert report.open_count == 3
        assert report.closed_count == 2

    def test_in_progress_counts_as_open(self) -> None:
        csv_data = "id,title,category,priority,status\n1,A,B,low,in_progress\n"
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.open_count == 1
        assert report.closed_count == 0

    def test_resolved_counts_as_closed(self) -> None:
        csv_data = "id,title,category,priority,status\n1,A,B,low,resolved\n"
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.closed_count == 1
        assert report.open_count == 0


# ---------------------------------------------------------------------------
# Case insensitivity
# ---------------------------------------------------------------------------


class TestNormalisation:
    def test_mixed_case_status(self) -> None:
        csv_data = (
            "id,title,category,priority,status\n"
            "1,A,X,low,Open\n"
            "2,B,Y,high,CLOSED\n"
        )
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.by_status["open"] == 1
        assert report.by_status["closed"] == 1

    def test_mixed_case_priority(self) -> None:
        csv_data = (
            "id,title,category,priority,status\n"
            "1,A,X,HIGH,open\n"
        )
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.by_priority["high"] == 1
        assert report.open_count == 1

    def test_whitespace_handling(self) -> None:
        csv_data = (
            "id,title,category,priority,status\n"
            "1, A , X ,  high , open \n"
        )
        analyzer = IncidentAnalyzer(io.StringIO(csv_data))
        report = analyzer.analyze()
        assert report.by_category.get("x") == 1
        assert report.by_priority.get("high") == 1
        assert report.by_status.get("open") == 1


# ---------------------------------------------------------------------------
# export_summary_csv
# ---------------------------------------------------------------------------


class TestExportSummary:
    def test_export_basic(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        csv_output = export_summary_csv(report)
        assert "Total incidents" in csv_output
        assert "5" in csv_output
        assert "Open (open + in_progress)" in csv_output
        assert "Closed (resolved + closed)" in csv_output

    def test_export_contains_sections(self) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        csv_output = export_summary_csv(report)
        assert "--- By status ---" in csv_output
        assert "--- By category ---" in csv_output
        assert "--- By priority ---" in csv_output

    def test_export_with_errors(self) -> None:
        report = AnalysisReport(filename="bad.csv")
        report.errors.append("Test error")
        csv_output = export_summary_csv(report)
        assert "--- Errors ---" in csv_output
        assert "Test error" in csv_output

    def test_export_empty_report(self) -> None:
        report = AnalysisReport(filename="empty.csv")
        csv_output = export_summary_csv(report)
        assert "Metric,Value" in csv_output
        assert "empty.csv" in csv_output


# ---------------------------------------------------------------------------
# print_report (smoke test — just ensure no exceptions)
# ---------------------------------------------------------------------------


class TestPrintReport:
    def test_print_valid_report(self, capsys: pytest.CaptureFixture[str]) -> None:
        analyzer = IncidentAnalyzer(io.StringIO(SAMPLE_CSV))
        report = analyzer.analyze()
        print_report(report)
        captured = capsys.readouterr()
        assert "Incident Analysis Report" in captured.out
        assert "Total incidents: 5" in captured.out
        assert "Open:            3" in captured.out
        assert "Closed:          2" in captured.out

    def test_print_with_errors(self, capsys: pytest.CaptureFixture[str]) -> None:
        report = AnalysisReport(filename="err.csv")
        report.errors.append("Something went wrong")
        print_report(report)
        captured = capsys.readouterr()
        assert "Something went wrong" in captured.out


# ---------------------------------------------------------------------------
# Integration with data/raw/incidents.csv
# ---------------------------------------------------------------------------


@pytest.mark.skipif(
    not Path(__file__).resolve().parents[1].joinpath(
        "data/raw/incidents.csv").exists(),
    reason="data/raw/incidents.csv not found",
)
class TestSampleDataFile:
    def test_analyze_sample_file(self) -> None:
        path = Path(__file__).resolve().parents[1] / "data/raw/incidents.csv"
        content = path.read_text(encoding="utf-8")
        analyzer = IncidentAnalyzer(content, filename=str(path))
        report = analyzer.analyze()
        assert report.total == 15
        assert report.errors == []
        assert report.open_count > 0
        assert report.closed_count > 0
        assert len(report.by_category) >= 6
