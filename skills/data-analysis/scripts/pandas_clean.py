"""Clean a CSV by removing empty columns and duplicate rows.

Usage:
    python pandas_clean.py data.csv --output cleaned.csv

Requires pandas: python -m pip install pandas
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import pandas as pd


class CSVProcessingError(Exception):
    """Base exception for expected input and output errors."""


class CSVInputError(CSVProcessingError):
    """Raised when the input CSV is invalid or cannot be read."""


class CSVOutputError(CSVProcessingError):
    """Raised when the cleaned CSV cannot be written safely."""


@dataclass(frozen=True)
class CleaningResult:
    """Cleaned data and counts describing the applied transformations."""

    dataframe: pd.DataFrame
    rows_before: int
    columns_before: int
    empty_columns_removed: tuple[str, ...]
    duplicate_rows_removed: int


def normalize_column_names(columns: Sequence[object]) -> list[str]:
    """Trim, lowercase, and underscore column names; reject collisions."""
    normalized_names: list[str] = []
    seen_names: set[str] = set()

    for index, column in enumerate(columns, start=1):
        name = re.sub(r"\s+", "_", str(column).strip()).lower()
        if not name:
            name = f"column_{index}"
        if name in seen_names:
            raise CSVInputError(
                f"Column names are not unique after normalization: {name!r}."
            )
        normalized_names.append(name)
        seen_names.add(name)

    return normalized_names


def clean_dataframe(dataframe: pd.DataFrame) -> CleaningResult:
    """Return a cleaned copy without mutating the caller's DataFrame."""
    if not isinstance(dataframe, pd.DataFrame):
        raise TypeError("dataframe must be a pandas.DataFrame")

    cleaned = dataframe.copy()
    rows_before, columns_before = cleaned.shape
    cleaned.columns = normalize_column_names(list(cleaned.columns))

    # Keep headers in header-only CSVs; empty data has no values to classify.
    if cleaned.empty:
        empty_columns: tuple[str, ...] = ()
    else:
        empty_columns = tuple(
            str(column) for column in cleaned.columns[cleaned.isna().all(axis=0)]
        )
        cleaned = cleaned.dropna(axis=1, how="all")

    rows_before_deduplication = len(cleaned)
    cleaned = cleaned.drop_duplicates().reset_index(drop=True)
    duplicates_removed = rows_before_deduplication - len(cleaned)

    return CleaningResult(
        dataframe=cleaned,
        rows_before=rows_before,
        columns_before=columns_before,
        empty_columns_removed=empty_columns,
        duplicate_rows_removed=duplicates_removed,
    )


def validate_paths(input_path: Path, output_path: Path | None, overwrite: bool) -> None:
    """Validate CSV locations before reading or writing any data."""
    if input_path.suffix.lower() != ".csv":
        raise CSVInputError(f"Input must be a .csv file: {input_path}")
    if not input_path.is_file():
        raise CSVInputError(
            f"Input file does not exist or is not a file: {input_path}")

    if output_path is None:
        return
    if output_path.suffix.lower() != ".csv":
        raise CSVOutputError(
            f"Output must use the .csv extension: {output_path}")
    if input_path.resolve() == output_path.resolve():
        raise CSVOutputError("Input and output paths must be different.")
    if not output_path.parent.is_dir():
        raise CSVOutputError(
            f"Output directory does not exist: {output_path.parent}")
    if output_path.is_dir():
        raise CSVOutputError(f"Output path is a directory: {output_path}")
    if output_path.exists() and not overwrite:
        raise CSVOutputError(
            f"Output already exists: {output_path}. Pass --overwrite to replace it."
        )


def clean_csv(
    input_path: Path,
    output_path: Path | None = None,
    *,
    overwrite: bool = False,
) -> CleaningResult:
    """Read, clean, and optionally save a CSV with domain-specific errors."""
    validate_paths(input_path, output_path, overwrite)

    try:
        dataframe = pd.read_csv(input_path)
    except pd.errors.EmptyDataError as error:
        raise CSVInputError(f"CSV file is empty: {input_path}") from error
    except pd.errors.ParserError as error:
        raise CSVInputError(
            f"Could not parse CSV file {input_path}: {error}") from error
    except UnicodeDecodeError as error:
        raise CSVInputError(
            f"CSV file is not valid UTF-8 text: {input_path}") from error
    except OSError as error:
        raise CSVInputError(f"Could not read {input_path}: {error}") from error

    result = clean_dataframe(dataframe)
    if output_path is not None:
        write_cleaned_csv(result.dataframe, output_path, overwrite=overwrite)
    return result


def write_cleaned_csv(
    dataframe: pd.DataFrame,
    output_path: Path,
    *,
    overwrite: bool = False,
) -> None:
    """Write UTF-8 CSV, refusing to overwrite an existing file by default."""
    mode = "w" if overwrite else "x"
    try:
        dataframe.to_csv(output_path, index=False, encoding="utf-8", mode=mode)
    except (OSError, UnicodeError, ValueError) as error:
        raise CSVOutputError(
            f"Could not write {output_path}: {error}") from error


def positive_int(value: str) -> int:
    """Parse a positive integer for CLI display options."""
    try:
        parsed_value = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be an integer") from error
    if parsed_value <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed_value


def build_parser() -> argparse.ArgumentParser:
    """Construct the command-line interface."""
    parser = argparse.ArgumentParser(
        description="Remove fully empty columns, normalize headers, and deduplicate a CSV."
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=Path("data.csv"),
        help="source CSV file (default: data.csv)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="optional destination CSV; does not overwrite existing files by default",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="allow replacing the destination file",
    )
    parser.add_argument(
        "--preview-rows",
        type=positive_int,
        default=5,
        help="number of cleaned rows to display (default: 5)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the CLI and return a process exit code."""
    args = build_parser().parse_args(argv)

    try:
        result = clean_csv(args.input, args.output, overwrite=args.overwrite)
    except CSVProcessingError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    print(f"Input shape: ({result.rows_before}, {result.columns_before})")
    print(f"Empty columns removed: {len(result.empty_columns_removed)}")
    print(f"Duplicate rows removed: {result.duplicate_rows_removed}")
    print(f"Cleaned shape: {result.dataframe.shape}")
    if args.output is not None:
        print(f"Saved cleaned CSV: {args.output}")
    print("Preview:")
    print(result.dataframe.head(args.preview_rows).to_string(index=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
