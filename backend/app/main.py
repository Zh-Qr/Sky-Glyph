"""
main.py
Sky Glyph FastAPI backend.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dateutil import parser as dtparser

from .models.schemas import (
    SkyRequest, SkyResponse, ObserverInfo, StarInfo,
    GlyphRequest, GlyphResponse, GlyphCandidateResponse,
)
from .visible_star_service import get_visible_stars
from .glyph_matcher import find_glyph_candidates
from .glyph_template import list_supported_chars
from .catalog_loader import get_catalog_status

app = FastAPI(
    title="Sky Glyph API",
    description="Real star sky driven character art generator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _parse_datetime(dt_str: str):
    try:
        return dtparser.parse(dt_str)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid datetime: {dt_str}. {e}")


@app.get("/")
def root():
    return {"message": "Sky Glyph API", "version": "1.0.0"}


@app.get("/api/chars")
def get_supported_chars():
    return {"supported": list_supported_chars()}


@app.get("/api/catalogs")
def get_catalogs():
    return {"catalogs": get_catalog_status()}


@app.post("/api/sky", response_model=SkyResponse)
def get_sky(req: SkyRequest):
    obs_time = _parse_datetime(req.datetime)

    try:
        stars = get_visible_stars(
            latitude=req.latitude,
            longitude=req.longitude,
            elevation=req.elevation,
            obs_time=obs_time,
            catalog=req.catalog,
            max_magnitude=req.maxMagnitude,
            min_altitude=req.minAltitude,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sky computation error: {e}")

    observer = ObserverInfo(
        latitude=req.latitude,
        longitude=req.longitude,
        elevation=req.elevation,
        datetime=req.datetime,
        catalog=req.catalog,
    )

    star_infos = [
        StarInfo(
            id=s.id,
            name=s.name,
            ra_deg=s.ra_deg,
            dec_deg=s.dec_deg,
            mag=s.mag,
            alt_deg=s.alt_deg,
            az_deg=s.az_deg,
            x=s.x,
            y=s.y,
        )
        for s in stars
    ]

    return SkyResponse(observer=observer, stars=star_infos, total_visible=len(star_infos))


@app.post("/api/glyph", response_model=GlyphResponse)
def get_glyph(req: GlyphRequest):
    char = req.char.upper().strip()

    supported = list_supported_chars()
    if not char or len(char) > 10 or any(c not in supported for c in char):
        raise HTTPException(
            status_code=422,
            detail=f"Text '{char}' not supported. Use A-Z and 0-9, up to 10 characters."
        )

    obs_time = _parse_datetime(req.datetime)

    try:
        stars = get_visible_stars(
            latitude=req.latitude,
            longitude=req.longitude,
            elevation=req.elevation,
            obs_time=obs_time,
            catalog=req.catalog,
            max_magnitude=req.maxMagnitude,
            min_altitude=req.minAltitude,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Star computation error: {e}")

    if len(stars) < 5:
        raise HTTPException(
            status_code=422,
            detail=f"Only {len(stars)} visible stars found. Try increasing maxMagnitude or decreasing minAltitude."
        )

    try:
        candidates = find_glyph_candidates(
            char=char,
            visible_stars=stars,
            style=req.style,
            glyph_font=req.glyphFont,
            candidate_count=req.candidateCount,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Glyph matching error: {e}")

    observer = ObserverInfo(
        latitude=req.latitude,
        longitude=req.longitude,
        elevation=req.elevation,
        datetime=req.datetime,
        catalog=req.catalog,
    )

    all_stars = [
        StarInfo(
            id=s.id,
            name=s.name,
            ra_deg=s.ra_deg,
            dec_deg=s.dec_deg,
            mag=s.mag,
            alt_deg=s.alt_deg,
            az_deg=s.az_deg,
            x=s.x,
            y=s.y,
        )
        for s in stars
    ]

    def _candidate_resp(c):
        return GlyphCandidateResponse(
            score=c.score,
            score_breakdown=c.score_breakdown,
            rotation=c.rotation,
            scale=c.scale,
            translation=list(c.translation),
            selected_stars=c.selected_stars,
            edges=[list(e) for e in c.edges],
            template_points=[list(p) for p in c.template_points],
        )

    return GlyphResponse(
        char=char,
        style=req.style,
        observer=observer,
        all_stars=all_stars,
        best_candidate=_candidate_resp(candidates[0]),
        candidates=[_candidate_resp(c) for c in candidates],
        supported_chars=supported,
    )
