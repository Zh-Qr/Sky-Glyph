"""
projection.py
Projects Alt/Az spherical coordinates onto a normalized 2D canvas.
Uses hemispherical (zenithal equidistant) projection.
"""

import math
from typing import Tuple, Optional


def altaz_to_xy(alt_deg: float, az_deg: float) -> Tuple[Optional[float], Optional[float]]:
    """
    Project Alt/Az to normalized canvas [0, 1] x [0, 1].

    Projection formula:
        r = (90 - alt) / 90           # radial distance from zenith
        x = 0.5 + 0.5 * r * sin(az)
        y = 0.5 - 0.5 * r * cos(az)

    Az=0 is North, increasing clockwise (standard astronomical Az).

    Args:
        alt_deg: Altitude in degrees (0 = horizon, 90 = zenith)
        az_deg: Azimuth in degrees (0 = N, 90 = E, 180 = S, 270 = W)

    Returns:
        (x, y) normalized [0,1] or (None, None) if out of bounds
    """
    if alt_deg < 0:
        return None, None

    r = (90.0 - alt_deg) / 90.0
    az_rad = math.radians(az_deg)

    x = 0.5 + 0.5 * r * math.sin(az_rad)
    y = 0.5 - 0.5 * r * math.cos(az_rad)

    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
        return None, None

    return x, y


def batch_altaz_to_xy(alt_list: list, az_list: list) -> Tuple[list, list]:
    """
    Vectorized batch projection using numpy.

    Returns:
        (x_list, y_list) — None entries for stars out of canvas bounds
    """
    import numpy as np

    alt = np.array(alt_list)
    az = np.array(az_list)

    visible = alt >= 0
    r = np.where(visible, (90.0 - alt) / 90.0, np.nan)
    az_rad = np.radians(az)

    x = 0.5 + 0.5 * r * np.sin(az_rad)
    y = 0.5 - 0.5 * r * np.cos(az_rad)

    in_bounds = visible & (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1)

    x_out = [float(x[i]) if in_bounds[i] else None for i in range(len(alt))]
    y_out = [float(y[i]) if in_bounds[i] else None for i in range(len(alt))]

    return x_out, y_out
