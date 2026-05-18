"""
visible_star_service.py
Computes the list of stars visible from a given location/time.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from .catalog_loader import load_catalog, Star
from .coordinate_transform import batch_radec_to_altaz
from .projection import batch_altaz_to_xy


@dataclass
class VisibleStar:
    id: int
    name: Optional[str]
    ra_deg: float
    dec_deg: float
    mag: float
    alt_deg: float
    az_deg: float
    x: float
    y: float


def get_visible_stars(
    latitude: float,
    longitude: float,
    elevation: float,
    obs_time: datetime,
    catalog: str = "sample",
    max_magnitude: float = 8.0,
    min_altitude: float = 5.0,
) -> List[VisibleStar]:
    """
    Return all stars visible from observer location at given time.

    Args:
        latitude: degrees N
        longitude: degrees E
        elevation: meters
        obs_time: observation datetime
        catalog: catalog key
        max_magnitude: faint limit
        min_altitude: minimum altitude in degrees

    Returns:
        List of VisibleStar
    """
    cat = load_catalog(catalog, max_magnitude=max_magnitude)
    stars = cat.stars

    if not stars:
        return []

    ra_list = [s.ra_deg for s in stars]
    dec_list = [s.dec_deg for s in stars]

    alt_list, az_list = batch_radec_to_altaz(
        ra_list, dec_list, latitude, longitude, elevation, obs_time
    )

    x_list, y_list = batch_altaz_to_xy(alt_list, az_list)

    visible = []
    for star, alt, az, x, y in zip(stars, alt_list, az_list, x_list, y_list):
        if alt < min_altitude:
            continue
        if x is None or y is None:
            continue
        visible.append(
            VisibleStar(
                id=star.id,
                name=star.name,
                ra_deg=star.ra_deg,
                dec_deg=star.dec_deg,
                mag=star.mag,
                alt_deg=round(alt, 4),
                az_deg=round(az, 4),
                x=round(x, 6),
                y=round(y, 6),
            )
        )

    # Sort brightest first
    visible.sort(key=lambda s: s.mag)
    return visible
