"""
coordinate_transform.py
Converts RA/Dec (ICRS) to Alt/Az (horizontal coordinates)
using Astropy for a given observer location and time.
"""

from datetime import datetime
from typing import Tuple

from astropy.coordinates import AltAz, EarthLocation, SkyCoord
from astropy.utils import iers
from astropy.time import Time
import astropy.units as u

iers.conf.auto_download = False


def radec_to_altaz(
    ra_deg: float,
    dec_deg: float,
    latitude: float,
    longitude: float,
    elevation: float,
    obs_time: datetime,
) -> Tuple[float, float]:
    """
    Convert RA/Dec to Alt/Az for a given observer and time.

    Args:
        ra_deg: Right Ascension in degrees
        dec_deg: Declination in degrees
        latitude: Observer latitude in degrees (N positive)
        longitude: Observer longitude in degrees (E positive)
        elevation: Observer elevation in meters
        obs_time: Observation datetime (timezone-aware recommended)

    Returns:
        (alt_deg, az_deg): Altitude and Azimuth in degrees
    """
    location = EarthLocation(
        lat=latitude * u.deg,
        lon=longitude * u.deg,
        height=elevation * u.m,
    )

    # Handle timezone-aware datetimes
    time = Time(obs_time, scale="utc")

    altaz_frame = AltAz(obstime=time, location=location)
    coord = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs")
    altaz = coord.transform_to(altaz_frame)

    return float(altaz.alt.deg), float(altaz.az.deg)


def batch_radec_to_altaz(
    ra_list: list,
    dec_list: list,
    latitude: float,
    longitude: float,
    elevation: float,
    obs_time: datetime,
) -> Tuple[list, list]:
    """
    Vectorized batch conversion for performance.

    Returns:
        (alt_list, az_list) in degrees
    """
    import numpy as np

    location = EarthLocation(
        lat=latitude * u.deg,
        lon=longitude * u.deg,
        height=elevation * u.m,
    )
    time = Time(obs_time, scale="utc")
    altaz_frame = AltAz(obstime=time, location=location)

    coords = SkyCoord(ra=np.array(ra_list) * u.deg, dec=np.array(dec_list) * u.deg, frame="icrs")
    altaz = coords.transform_to(altaz_frame)

    return altaz.alt.deg.tolist(), altaz.az.deg.tolist()
