"""
Download public star catalogs from VizieR and normalize them for Sky Glyph.

Examples:
    python tools/download_catalog.py hipparcos --max-mag 9
    python tools/download_catalog.py bright_star
"""

from __future__ import annotations

import argparse
import csv
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from normalize_catalog import normalize_catalog


VIZIER_ASU_TSV = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv"

CATALOGS = {
    "hipparcos": {
        "source": "I/239/hip_main",
        "output": "app/data/hipparcos.csv",
        "columns": ["HIP", "RAICRS", "DEICRS", "Vmag"],
        "magnitude_column": "Vmag",
    },
    "bright_star": {
        "source": "V/50/catalog",
        "output": "app/data/bright_star.csv",
        "columns": ["HR", "Name", "RAJ2000", "DEJ2000", "Vmag"],
        "magnitude_column": "Vmag",
    },
}


def build_url(catalog_key: str, max_mag: float | None) -> str:
    config = CATALOGS[catalog_key]
    params: list[tuple[str, str]] = [
        ("-source", config["source"]),
        ("-out.max", "200000"),
    ]
    for column in config["columns"]:
        params.append(("-out", column))
    if max_mag is not None:
        params.append((config["magnitude_column"], f"..{max_mag}"))
    return f"{VIZIER_ASU_TSV}?{urllib.parse.urlencode(params)}"


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "SkyGlyph/1.0 (+https://vizier.cds.unistra.fr/)",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def vizier_tsv_to_csv(text: str, output_path: Path) -> None:
    rows = []
    header = None

    for raw_line in text.splitlines():
        line = raw_line.strip("\n")
        if not line.strip() or line.startswith("#"):
            continue

        cells = [cell.strip() for cell in line.split("\t")]
        if len(cells) < 3:
            continue

        if header is None:
            if any(cell in {"HIP", "HR", "RAICRS", "RAJ2000"} for cell in cells):
                header = cells
            continue

        if all(set(cell) <= {"-"} for cell in cells if cell):
            continue
        if len(cells) != len(header):
            continue
        rows.append(dict(zip(header, cells)))

    if header is None:
        raise RuntimeError("Could not find a table header in the VizieR response.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=header)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", choices=sorted(CATALOGS.keys()))
    parser.add_argument("--max-mag", type=float, default=9.0)
    parser.add_argument("--raw", type=Path, default=None, help="Optional path to save raw VizieR TSV")
    args = parser.parse_args()

    config = CATALOGS[args.catalog]
    output_path = Path(config["output"])
    url = build_url(args.catalog, args.max_mag)

    print(f"Downloading {args.catalog} from VizieR...")
    print(url)
    text = fetch_text(url)

    if args.raw:
        args.raw.parent.mkdir(parents=True, exist_ok=True)
        args.raw.write_text(text, encoding="utf-8")

    with tempfile.TemporaryDirectory() as temp_dir:
        raw_csv = Path(temp_dir) / f"{args.catalog}_raw.csv"
        vizier_tsv_to_csv(text, raw_csv)
        normalize_catalog(raw_csv, output_path, args.max_mag)

    print("Done. Restart the backend and refresh the frontend catalog selector.")


if __name__ == "__main__":
    main()
