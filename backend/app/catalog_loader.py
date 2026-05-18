"""
catalog_loader.py
Loads star catalog from CSV and returns structured data.
Supports easy replacement with Hipparcos or Tycho-2 data.
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional, Dict
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

CATALOG_FILES = {
    "sample": "stars_sample.csv",
    "hipparcos": "hipparcos.csv",
    "tycho2": "tycho2.csv",
    "bright_star": "bright_star.csv",
    "bright-star": "bright_star.csv",
}

CATALOG_LABELS = {
    "sample": "Sample bright stars",
    "hipparcos": "Hipparcos",
    "tycho2": "Tycho-2",
    "bright_star": "Yale Bright Star Catalog",
    "bright-star": "Yale Bright Star Catalog",
}


@dataclass
class Star:
    id: int
    name: Optional[str]
    ra_deg: float
    dec_deg: float
    mag: float


@dataclass
class StarCatalog:
    catalog_name: str
    stars: List[Star] = field(default_factory=list)

    def filter_by_magnitude(self, max_magnitude: float) -> "StarCatalog":
        filtered = [s for s in self.stars if s.mag <= max_magnitude]
        return StarCatalog(catalog_name=self.catalog_name, stars=filtered)


def load_catalog(catalog: str = "sample", max_magnitude: Optional[float] = None) -> StarCatalog:
    """
    Load star catalog from CSV.

    Args:
        catalog: catalog name key (sample / hipparcos / tycho2)
        max_magnitude: optional magnitude filter

    Returns:
        StarCatalog instance
    """
    filename = CATALOG_FILES.get(catalog)
    if filename is None:
        raise ValueError(f"Unknown catalog: {catalog}. Available: {list(CATALOG_FILES.keys())}")

    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Catalog file not found: {filepath}. "
            f"For '{catalog}', place the CSV at {filepath}."
        )

    df = pd.read_csv(filepath)

    # Validate required columns
    required = {"id", "ra_deg", "dec_deg", "mag"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Catalog CSV missing columns: {missing}")

    if "name" not in df.columns:
        df["name"] = None

    stars = []
    for _, row in df.iterrows():
        name = row["name"] if pd.notna(row.get("name")) else None
        stars.append(
            Star(
                id=int(row["id"]),
                name=str(name) if name else None,
                ra_deg=float(row["ra_deg"]),
                dec_deg=float(row["dec_deg"]),
                mag=float(row["mag"]),
            )
        )

    cat = StarCatalog(catalog_name=catalog, stars=stars)

    if max_magnitude is not None:
        cat = cat.filter_by_magnitude(max_magnitude)

    return cat


def get_catalog_status() -> List[Dict]:
    """Return catalog availability for the frontend selector."""
    result = []
    seen_files = set()
    for key, filename in CATALOG_FILES.items():
        if filename in seen_files and key == "bright-star":
            continue
        seen_files.add(filename)
        filepath = os.path.join(DATA_DIR, filename)
        available = os.path.exists(filepath)
        row_count = None
        if available:
            with open(filepath, "r", encoding="utf-8") as f:
                row_count = max(0, sum(1 for _ in f) - 1)
        result.append(
            {
                "key": key,
                "label": CATALOG_LABELS.get(key, key),
                "filename": filename,
                "available": available,
                "rows": row_count,
            }
        )
    return result
