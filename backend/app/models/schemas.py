"""
models/schemas.py
Pydantic request/response schemas for the Sky Glyph API.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ─── Shared ──────────────────────────────────────────────────────────────────

class ObserverInfo(BaseModel):
    latitude: float
    longitude: float
    elevation: float
    datetime: str
    catalog: str


class StarInfo(BaseModel):
    id: int
    name: Optional[str]
    ra_deg: float
    dec_deg: float
    mag: float
    alt_deg: float
    az_deg: float
    x: float
    y: float


# ─── /api/sky ─────────────────────────────────────────────────────────────────

class SkyRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: float = Field(0.0, ge=0)
    datetime: str = Field(..., description="ISO 8601 datetime, e.g. 2026-05-17T20:00:00+08:00")
    maxMagnitude: float = Field(8.0, ge=-5, le=15)
    minAltitude: float = Field(5.0, ge=0, le=90)
    catalog: str = Field("sample")


class SkyResponse(BaseModel):
    observer: ObserverInfo
    stars: List[StarInfo]
    total_visible: int


# ─── /api/glyph ───────────────────────────────────────────────────────────────

class GlyphRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation: float = Field(0.0, ge=0)
    datetime: str = Field(..., description="ISO 8601 datetime")
    char: str = Field(..., min_length=1, max_length=10, description="A-Z/0-9 text, up to 10 chars")
    catalog: str = Field("sample")
    maxMagnitude: float = Field(9.0, ge=-5, le=15)
    minAltitude: float = Field(10.0, ge=0, le=90)
    style: str = Field("accurate-glyph")
    glyphFont: str = Field("soft-wide")
    candidateCount: int = Field(5, ge=1, le=10)


class GlyphCandidateResponse(BaseModel):
    score: float
    score_breakdown: Dict[str, float]
    rotation: float
    scale: float
    translation: List[float]
    selected_stars: List[Dict[str, Any]]
    edges: List[List[int]]
    template_points: List[List[float]]


class GlyphResponse(BaseModel):
    char: str
    style: str
    observer: ObserverInfo
    all_stars: List[StarInfo]
    best_candidate: GlyphCandidateResponse
    candidates: List[GlyphCandidateResponse]
    supported_chars: List[str]
