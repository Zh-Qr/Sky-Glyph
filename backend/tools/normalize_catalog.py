"""
Normalize downloaded star catalogs for Sky Glyph.

Usage:
    python tools/normalize_catalog.py ~/Downloads/hip_main.csv app/data/hipparcos.csv

The output schema is always:
    id,name,ra_deg,dec_deg,mag
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Iterable


COLUMN_ALIASES = {
    "id": ["id", "HIP", "HR", "TYC", "Gaia", "Source"],
    "name": ["name", "Name", "Proper", "Bayer", "Common"],
    "ra_deg": ["ra_deg", "RAICRS", "RAJ2000", "RAdeg", "RA_deg", "_RAJ2000"],
    "dec_deg": ["dec_deg", "DEICRS", "DEJ2000", "DEdeg", "DE_deg", "_DEJ2000"],
    "mag": ["mag", "Vmag", "Hpmag", "VTmag", "Gmag", "V"],
}


def find_column(columns: Iterable[str], aliases: list[str], required: bool = True) -> str | None:
    normalized = {col.strip(): col for col in columns}
    lower = {col.strip().lower(): col for col in columns}
    for alias in aliases:
        if alias in normalized:
            return normalized[alias]
        if alias.lower() in lower:
            return lower[alias.lower()]
    if required:
        raise ValueError(f"Could not find any of these columns: {aliases}")
    return None


def parse_ra(value: str) -> float:
    raw = str(value).strip()
    try:
        return float(raw)
    except ValueError:
        pass

    parts = raw.replace(":", " ").split()
    if len(parts) >= 3:
        hours = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2])
        return 15.0 * (hours + minutes / 60.0 + seconds / 3600.0)
    raise ValueError(f"Invalid RA value: {value}")


def parse_dec(value: str) -> float:
    raw = str(value).strip()
    try:
        return float(raw)
    except ValueError:
        pass

    parts = raw.replace(":", " ").split()
    if len(parts) >= 3:
        sign = -1.0 if parts[0].startswith("-") else 1.0
        degrees = abs(float(parts[0]))
        minutes = float(parts[1])
        seconds = float(parts[2])
        return sign * (degrees + minutes / 60.0 + seconds / 3600.0)
    raise ValueError(f"Invalid Dec value: {value}")


def normalize_catalog(input_path: Path, output_path: Path, max_mag: float | None = None) -> None:
    raw_text = "\n".join(
        line for line in input_path.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )
    sample = raw_text[:4096]
    dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    reader = csv.DictReader(raw_text.splitlines(), dialect=dialect)
    if not reader.fieldnames:
        raise ValueError(f"No header found in {input_path}")

    id_col = find_column(reader.fieldnames, COLUMN_ALIASES["id"])
    name_col = find_column(reader.fieldnames, COLUMN_ALIASES["name"], required=False)
    ra_col = find_column(reader.fieldnames, COLUMN_ALIASES["ra_deg"])
    dec_col = find_column(reader.fieldnames, COLUMN_ALIASES["dec_deg"])
    mag_col = find_column(reader.fieldnames, COLUMN_ALIASES["mag"])

    rows = []
    by_id = {}
    for source in reader:
        try:
            star_id = int(float(source[id_col]))
            ra_deg = parse_ra(source[ra_col])
            dec_deg = parse_dec(source[dec_col])
            mag = float(source[mag_col])
        except (TypeError, ValueError):
            continue

        if not (0 <= ra_deg <= 360 and -90 <= dec_deg <= 90):
            continue
        if max_mag is not None and mag > max_mag:
            continue

        name = source.get(name_col, "") if name_col else ""
        row = {
            "id": star_id,
            "name": name.strip(),
            "ra_deg": ra_deg,
            "dec_deg": dec_deg,
            "mag": mag,
        }
        previous = by_id.get(star_id)
        if previous is None or mag < previous["mag"]:
            by_id[star_id] = row

    rows = sorted(by_id.values(), key=lambda item: item["mag"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "ra_deg", "dec_deg", "mag"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows):,} stars to {output_path}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="Downloaded CSV from VizieR or another catalog source")
    parser.add_argument("output", type=Path, help="Output CSV path, e.g. app/data/hipparcos.csv")
    parser.add_argument("--max-mag", type=float, default=None, help="Optional magnitude cutoff")
    args = parser.parse_args()
    normalize_catalog(args.input, args.output, args.max_mag)


if __name__ == "__main__":
    main()
