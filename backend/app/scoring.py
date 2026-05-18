"""
scoring.py
Scoring functions for glyph matching candidates.
"""

import math
from typing import List, Tuple, Dict

STYLE_WEIGHTS: Dict[str, Dict[str, float]] = {
    "accurate-glyph": {
        "shape": 0.55,
        "brightness": 0.15,
        "natural": 0.15,
        "distribution": 0.10,
        "visibility": 0.05,
    },
    "bright-constellation": {
        "shape": 0.35,
        "brightness": 0.30,
        "natural": 0.20,
        "distribution": 0.10,
        "visibility": 0.05,
    },
    "romantic-poster": {
        "shape": 0.40,
        "brightness": 0.20,
        "natural": 0.20,
        "distribution": 0.10,
        "visibility": 0.10,
    },
}


def shape_score(template_pts: List[Tuple[float, float]], star_pts: List[Tuple[float, float]]) -> float:
    """Lower mean squared distance → higher score. Returns [0,1]."""
    if not template_pts or len(template_pts) != len(star_pts):
        return 0.0
    total = sum(
        (t[0] - s[0]) ** 2 + (t[1] - s[1]) ** 2
        for t, s in zip(template_pts, star_pts)
    )
    mean_sq = total / len(template_pts)
    # Normalize: distance of 0.1 (10% of canvas) gets ~0.5 score
    return math.exp(-mean_sq / 0.005)


def brightness_score(mags: List[float]) -> float:
    """Brighter stars → higher score. Mag scale: -2 (very bright) to 9 (dim)."""
    if not mags:
        return 0.0
    avg_mag = sum(mags) / len(mags)
    # Map avg_mag from range [-2, 9] to [1, 0]
    score = 1.0 - (avg_mag + 2.0) / 11.0
    return max(0.0, min(1.0, score))


def natural_score(star_pts: List[Tuple[float, float]], edges: List[Tuple[int, int]]) -> float:
    """
    Penalize:
    - High variance in edge lengths (unnatural star pattern)
    - Edge crossings
    Returns [0,1].
    """
    if len(star_pts) < 2 or not edges:
        return 0.5

    lengths = []
    for i, j in edges:
        if i < len(star_pts) and j < len(star_pts):
            dx = star_pts[i][0] - star_pts[j][0]
            dy = star_pts[i][1] - star_pts[j][1]
            lengths.append(math.sqrt(dx * dx + dy * dy))

    if not lengths:
        return 0.5

    mean_len = sum(lengths) / len(lengths)
    variance = sum((l - mean_len) ** 2 for l in lengths) / len(lengths)
    variance_penalty = math.exp(-variance / 0.01)

    # Count crossings
    crossings = 0
    segs = []
    for i, j in edges:
        if i < len(star_pts) and j < len(star_pts):
            segs.append((star_pts[i], star_pts[j]))

    for a in range(len(segs)):
        for b in range(a + 2, len(segs)):
            if _segments_intersect(segs[a][0], segs[a][1], segs[b][0], segs[b][1]):
                crossings += 1

    crossing_penalty = math.exp(-crossings * 0.3)

    return 0.5 * variance_penalty + 0.5 * crossing_penalty


def distribution_score(star_pts: List[Tuple[float, float]]) -> float:
    """Penalize over-clustering of stars."""
    if len(star_pts) < 2:
        return 0.5

    min_dist = float("inf")
    for i in range(len(star_pts)):
        for j in range(i + 1, len(star_pts)):
            dx = star_pts[i][0] - star_pts[j][0]
            dy = star_pts[i][1] - star_pts[j][1]
            d = math.sqrt(dx * dx + dy * dy)
            min_dist = min(min_dist, d)

    # Penalize if stars are very close (< 2% of canvas)
    return min(1.0, min_dist / 0.02)


def visibility_score(alts: List[float]) -> float:
    """Penalize stars close to the horizon."""
    if not alts:
        return 0.5
    avg_alt = sum(alts) / len(alts)
    # 90° → 1.0, 5° → ~0.0
    return max(0.0, min(1.0, (avg_alt - 5.0) / 85.0))


def compute_total_score(
    template_pts: List[Tuple[float, float]],
    star_pts: List[Tuple[float, float]],
    mags: List[float],
    alts: List[float],
    edges: List[Tuple[int, int]],
    style: str = "accurate-glyph",
) -> Dict[str, float]:
    """
    Compute all sub-scores and weighted total.

    Returns dict with individual scores and 'total'.
    """
    weights = STYLE_WEIGHTS.get(style, STYLE_WEIGHTS["accurate-glyph"])

    s_shape = shape_score(template_pts, star_pts)
    s_bright = brightness_score(mags)
    s_natural = natural_score(star_pts, edges)
    s_dist = distribution_score(star_pts)
    s_vis = visibility_score(alts)

    total = (
        weights["shape"] * s_shape
        + weights["brightness"] * s_bright
        + weights["natural"] * s_natural
        + weights["distribution"] * s_dist
        + weights["visibility"] * s_vis
    )

    return {
        "total": round(total, 6),
        "shape": round(s_shape, 6),
        "brightness": round(s_bright, 6),
        "natural": round(s_natural, 6),
        "distribution": round(s_dist, 6),
        "visibility": round(s_vis, 6),
    }


# ─── Geometry helpers ────────────────────────────────────────────────────────

def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def _on_segment(p, q, r):
    return (
        min(p[0], r[0]) <= q[0] <= max(p[0], r[0])
        and min(p[1], r[1]) <= q[1] <= max(p[1], r[1])
    )


def _segments_intersect(p1, p2, p3, p4) -> bool:
    d1 = _cross(p3, p4, p1)
    d2 = _cross(p3, p4, p2)
    d3 = _cross(p1, p2, p3)
    d4 = _cross(p1, p2, p4)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    if d1 == 0 and _on_segment(p3, p1, p4): return True
    if d2 == 0 and _on_segment(p3, p2, p4): return True
    if d3 == 0 and _on_segment(p1, p3, p2): return True
    if d4 == 0 and _on_segment(p1, p4, p2): return True

    return False
