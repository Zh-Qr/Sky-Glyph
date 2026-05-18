"""
glyph_template.py
Defines skeletal stroke templates for characters 0-9 and A-Z.
Each template provides normalized points [0,1]x[0,1] and strokes (edges).
Points are sampled along strokes to produce candidate anchor points.
"""

import math
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass


@dataclass
class GlyphTemplate:
    char: str
    points: List[Tuple[float, float]]   # control vertices
    strokes: List[Tuple[int, int]]       # edges between point indices
    sampled_points: List[Tuple[float, float]] = None   # filled after sampling
    sampled_edges: List[Tuple[int, int]] = None


def _lerp(p1, p2, t):
    return (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)


def sample_stroke(p1, p2, n_samples: int) -> List[Tuple[float, float]]:
    """Sample n_samples points along a line segment."""
    pts = []
    for i in range(n_samples):
        t = i / (n_samples - 1) if n_samples > 1 else 0.5
        pts.append(_lerp(p1, p2, t))
    return pts


def build_sampled(template: GlyphTemplate, samples_per_stroke: int = 3) -> GlyphTemplate:
    """
    Sample points along each stroke. Returns a new template with sampled_points/edges.
    Total sampled points: strokes * samples_per_stroke (deduped).
    """
    sampled = []
    sampled_edges = []

    for (i, j) in template.strokes:
        p1 = template.points[i]
        p2 = template.points[j]
        seg_pts = sample_stroke(p1, p2, samples_per_stroke)

        start_idx = len(sampled)
        sampled.extend(seg_pts)
        for k in range(len(seg_pts) - 1):
            sampled_edges.append((start_idx + k, start_idx + k + 1))

    return GlyphTemplate(
        char=template.char,
        points=template.points,
        strokes=template.strokes,
        sampled_points=sampled,
        sampled_edges=sampled_edges,
    )


# ─────────────────────────────────────────────────────────
# Template definitions (normalized 0→1 coordinates)
# ─────────────────────────────────────────────────────────

RAW_TEMPLATES: Dict[str, GlyphTemplate] = {}

FONT_VARIANTS = {
    "classic": {
        "x_scale": 1.0,
        "y_scale": 1.0,
        "spacing": 0.34,
    },
    "rounded": {
        "x_scale": 1.02,
        "y_scale": 0.88,
        "spacing": 0.18,
    },
    "soft-wide": {
        "x_scale": 1.18,
        "y_scale": 0.92,
        "spacing": 0.16,
    },
}


def _reg(char, points, strokes):
    RAW_TEMPLATES[char] = GlyphTemplate(char=char, points=points, strokes=strokes)


# 0
_reg("0", [
    (0.3, 0.0), (0.7, 0.0),  # top
    (1.0, 0.3), (1.0, 0.7),  # right
    (0.7, 1.0), (0.3, 1.0),  # bottom
    (0.0, 0.7), (0.0, 0.3),  # left
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,0)])

# 1
_reg("1", [
    (0.5, 0.0), (0.5, 1.0), (0.3, 0.2), (0.2, 1.0), (0.8, 1.0)
], [(2,0),(0,1),(3,4)])

# 2
_reg("2", [
    (0.2, 0.15), (0.5, 0.0), (0.8, 0.15), (0.8, 0.45),
    (0.2, 0.85), (0.2, 1.0), (0.8, 1.0)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6)])

# 3
_reg("3", [
    (0.2, 0.0), (0.8, 0.0), (0.8, 0.5), (0.5, 0.5),
    (0.8, 0.5), (0.8, 1.0), (0.2, 1.0)
], [(0,1),(1,2),(2,3),(2,4),(4,5),(5,6)])

# 4
_reg("4", [
    (0.7, 0.0), (0.1, 0.65), (1.0, 0.65),
    (0.7, 0.0), (0.7, 1.0)
], [(0,1),(1,2),(3,4)])

# 5
_reg("5", [
    (0.8, 0.0), (0.2, 0.0), (0.2, 0.45), (0.7, 0.45),
    (0.9, 0.7), (0.7, 1.0), (0.2, 1.0)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6)])

# 6
_reg("6", [
    (0.8, 0.05), (0.3, 0.0), (0.1, 0.3), (0.1, 0.7),
    (0.3, 1.0), (0.7, 1.0), (0.9, 0.7), (0.9, 0.5),
    (0.7, 0.45), (0.1, 0.5)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,8),(8,9),(9,3)])

# 7
_reg("7", [
    (0.1, 0.0), (0.9, 0.0), (0.45, 1.0), (0.5, 0.5)
], [(0,1),(1,2),(1,3)])

# 8
_reg("8", [
    (0.5, 0.0),
    (0.8, 0.15), (0.8, 0.45), (0.5, 0.5),
    (0.2, 0.55), (0.2, 0.85), (0.5, 1.0),
    (0.8, 0.85), (0.8, 0.55), (0.5, 0.5),
    (0.2, 0.45), (0.2, 0.15),
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,8),(8,9),(9,10),(10,11),(11,0)])

# 9
_reg("9", [
    (0.5, 0.0), (0.8, 0.0), (0.9, 0.3), (0.8, 0.55),
    (0.5, 0.55), (0.2, 0.4), (0.2, 0.1),
    (0.9, 0.55), (0.8, 0.9), (0.5, 1.0)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,0),(2,7),(7,8),(8,9)])

# A
_reg("A", [
    (0.5, 0.0), (0.0, 1.0), (1.0, 1.0), (0.2, 0.6), (0.8, 0.6)
], [(0,1),(0,2),(3,4)])

# B
_reg("B", [
    (0.1, 0.0), (0.1, 1.0),
    (0.1, 0.0), (0.65, 0.0), (0.9, 0.2), (0.9, 0.45), (0.65, 0.5), (0.1, 0.5),
    (0.65, 0.5), (0.9, 0.7), (0.9, 0.85), (0.65, 1.0), (0.1, 1.0)
], [(0,1),(2,3),(3,4),(4,5),(5,6),(6,7),(8,9),(9,10),(10,11),(11,12)])

# C
_reg("C", [
    (0.8, 0.15), (0.5, 0.0), (0.2, 0.15), (0.1, 0.5),
    (0.2, 0.85), (0.5, 1.0), (0.8, 0.85)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6)])

# D
_reg("D", [
    (0.1, 0.0), (0.1, 1.0),
    (0.1, 0.0), (0.6, 0.0), (0.9, 0.3), (0.9, 0.7), (0.6, 1.0), (0.1, 1.0)
], [(0,1),(2,3),(3,4),(4,5),(5,6),(6,7)])

# E
_reg("E", [
    (0.8, 0.0), (0.1, 0.0), (0.1, 0.5), (0.1, 1.0), (0.8, 1.0),
    (0.65, 0.5)
], [(0,1),(1,2),(2,3),(3,4),(2,5)])

# F
_reg("F", [
    (0.1, 0.0), (0.1, 1.0),
    (0.8, 0.0), (0.1, 0.0),
    (0.65, 0.5), (0.1, 0.5)
], [(0,1),(2,3),(4,5)])

# G
_reg("G", [
    (0.8, 0.1), (0.5, 0.0), (0.15, 0.2), (0.1, 0.5),
    (0.15, 0.8), (0.5, 1.0), (0.85, 0.8), (0.85, 0.5), (0.5, 0.5)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,8)])

# H
_reg("H", [
    (0.1, 0.0), (0.1, 1.0),
    (0.9, 0.0), (0.9, 1.0),
    (0.1, 0.5), (0.9, 0.5)
], [(0,1),(2,3),(4,5)])

# I
_reg("I", [
    (0.3, 0.0), (0.7, 0.0),
    (0.5, 0.0), (0.5, 1.0),
    (0.3, 1.0), (0.7, 1.0)
], [(0,1),(2,3),(4,5)])

# J
_reg("J", [
    (0.3, 0.0), (0.7, 0.0),
    (0.7, 0.0), (0.7, 0.8), (0.5, 1.0), (0.3, 0.9), (0.2, 0.7)
], [(0,1),(2,3),(3,4),(4,5),(5,6)])

# K
_reg("K", [
    (0.1, 0.0), (0.1, 1.0),
    (0.9, 0.0), (0.1, 0.5),
    (0.1, 0.5), (0.9, 1.0)
], [(0,1),(2,3),(4,5)])

# L
_reg("L", [
    (0.2, 0.0), (0.2, 1.0), (0.8, 1.0)
], [(0,1),(1,2)])

# M
_reg("M", [
    (0.0, 1.0), (0.0, 0.0), (0.5, 0.6), (1.0, 0.0), (1.0, 1.0)
], [(0,1),(1,2),(2,3),(3,4)])

# N
_reg("N", [
    (0.1, 1.0), (0.1, 0.0), (0.9, 1.0), (0.9, 0.0)
], [(0,1),(1,2),(2,3)])

# O
_reg("O", [
    (0.5, 0.0), (0.85, 0.15), (1.0, 0.5), (0.85, 0.85),
    (0.5, 1.0), (0.15, 0.85), (0.0, 0.5), (0.15, 0.15)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,0)])

# P
_reg("P", [
    (0.1, 0.0), (0.1, 1.0),
    (0.1, 0.0), (0.65, 0.0), (0.9, 0.2), (0.9, 0.45), (0.65, 0.55), (0.1, 0.55)
], [(0,1),(2,3),(3,4),(4,5),(5,6),(6,7)])

# Q
_reg("Q", [
    (0.5, 0.0), (0.85, 0.15), (1.0, 0.5), (0.85, 0.85),
    (0.5, 1.0), (0.15, 0.85), (0.0, 0.5), (0.15, 0.15),
    (0.6, 0.7), (0.95, 1.0)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,0),(8,9)])

# R
_reg("R", [
    (0.1, 0.0), (0.1, 1.0),
    (0.1, 0.0), (0.65, 0.0), (0.9, 0.2), (0.9, 0.45), (0.65, 0.55), (0.1, 0.55),
    (0.5, 0.55), (0.9, 1.0)
], [(0,1),(2,3),(3,4),(4,5),(5,6),(6,7),(8,9)])

# S
_reg("S", [
    (0.8, 0.1), (0.5, 0.0), (0.2, 0.1), (0.1, 0.35), (0.3, 0.5),
    (0.7, 0.5), (0.9, 0.65), (0.8, 0.9), (0.5, 1.0), (0.2, 0.9)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6),(6,7),(7,8),(8,9)])

# T
_reg("T", [
    (0.0, 0.0), (1.0, 0.0), (0.5, 0.0), (0.5, 1.0)
], [(0,1),(2,3)])

# U
_reg("U", [
    (0.1, 0.0), (0.1, 0.75), (0.3, 1.0), (0.5, 1.0),
    (0.7, 1.0), (0.9, 0.75), (0.9, 0.0)
], [(0,1),(1,2),(2,3),(3,4),(4,5),(5,6)])

# V
_reg("V", [
    (0.0, 0.0), (0.5, 1.0), (1.0, 0.0)
], [(0,1),(1,2)])

# W
_reg("W", [
    (0.0, 0.0), (0.25, 1.0), (0.5, 0.5), (0.75, 1.0), (1.0, 0.0)
], [(0,1),(1,2),(2,3),(3,4)])

# X
_reg("X", [
    (0.0, 0.0), (1.0, 1.0),
    (1.0, 0.0), (0.0, 1.0)
], [(0,1),(2,3)])

# Y
_reg("Y", [
    (0.0, 0.0), (0.5, 0.45),
    (1.0, 0.0), (0.5, 0.45),
    (0.5, 0.45), (0.5, 1.0)
], [(0,1),(2,3),(4,5)])

# Z
_reg("Z", [
    (0.0, 0.0), (1.0, 0.0), (0.0, 1.0), (1.0, 1.0)
], [(0,1),(1,2),(2,3)])


def get_glyph_template(char: str, samples_per_stroke: int = 4) -> Optional[GlyphTemplate]:
    """
    Returns sampled glyph template for a character.

    Args:
        char: single character (0-9, A-Z)
        samples_per_stroke: number of sample points per stroke segment

    Returns:
        GlyphTemplate with sampled_points and sampled_edges, or None
    """
    key = char.upper()
    raw = RAW_TEMPLATES.get(key)
    if raw is None:
        return None
    return build_sampled(raw, samples_per_stroke=samples_per_stroke)


def get_text_glyph_template(
    text: str,
    samples_per_stroke: int = 3,
    font_variant: str = "soft-wide",
) -> Optional[GlyphTemplate]:
    """
    Build a single normalized template for 1-10 alphanumeric characters.

    Each character keeps its own stroke structure, then the characters are laid
    out left-to-right in one [0,1] x [0,1] coordinate system. The matcher can
    rotate, scale, and translate this combined template as one constellation.
    """
    normalized = text.upper().strip()
    if not normalized or len(normalized) > 10:
        return None

    if any(ch not in RAW_TEMPLATES for ch in normalized):
        return None

    variant = FONT_VARIANTS.get(font_variant, FONT_VARIANTS["soft-wide"])
    x_scale = variant["x_scale"]
    y_scale = variant["y_scale"]
    char_spacing = variant["spacing"]
    char_width = x_scale
    total_width = len(normalized) * char_width + char_spacing * max(0, len(normalized) - 1)
    all_points: List[Tuple[float, float]] = []
    all_edges: List[Tuple[int, int]] = []

    for char_index, ch in enumerate(normalized):
        tmpl = get_glyph_template(ch, samples_per_stroke=samples_per_stroke)
        if tmpl is None:
            return None

        offset = len(all_points)
        x_origin = char_index * (char_width + char_spacing)
        for x, y in tmpl.sampled_points:
            local_x = x * x_scale
            local_y = 0.5 + (y - 0.5) * y_scale
            all_points.append((0.5 + x_origin + local_x - total_width / 2.0, local_y))

        for i, j in tmpl.sampled_edges:
            all_edges.append((offset + i, offset + j))

    return GlyphTemplate(
        char=normalized,
        points=[],
        strokes=[],
        sampled_points=all_points,
        sampled_edges=all_edges,
    )


def list_supported_chars() -> List[str]:
    return sorted(RAW_TEMPLATES.keys())
