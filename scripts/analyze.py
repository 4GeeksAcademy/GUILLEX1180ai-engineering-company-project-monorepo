"""CLI entry point for incident CSV analysis.

Usage:
    uv run python scripts/analyze.py path/to/incidents.csv
    uv run python scripts/analyze.py path/to/incidents.csv --export summary.csv

Usage (from repo root):
    uv run python scripts/analyze.py data/incidents.csv
"""

from __future__ import annotations
from src.incident_service import (
    IncidentAnalyzer,
    export_summary_csv,
    print_report,
)

import argparse
import sys
from pathlib import Path

# Ensure src/ is importable (must happen before importing from src).
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analiza un CSV de incidencias y genera un resumen.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Ejemplos:\n"
            "  %(prog)s incidents.csv\n"
            "  %(prog)s incidents.csv --export summary.csv\n"
        ),
    )
    parser.add_argument(
        "csv_path",
        type=Path,
        help="Ruta al fichero CSV de incidencias.",
    )
    parser.add_argument(
        "--export",
        "-e",
        type=Path,
        default=None,
        metavar="OUTPUT.csv",
        help="Exporta el resumen a un fichero CSV.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    csv_path: Path = args.csv_path
    if not csv_path.is_file():
        print(f"Error: fichero no encontrado: {csv_path}", file=sys.stderr)
        return 1

    analyzer = IncidentAnalyzer(csv_path.open(
        newline="", encoding="utf-8-sig"), filename=csv_path.name)
    report = analyzer.analyze()
    print_report(report)

    if args.export:
        export_path: Path = args.export
        csv_text = export_summary_csv(report)
        export_path.write_text(csv_text, encoding="utf-8")
        print(f"Resumen exportado a: {export_path}")

    return 0 if not report.errors else 1


if __name__ == "__main__":
    sys.exit(main())
