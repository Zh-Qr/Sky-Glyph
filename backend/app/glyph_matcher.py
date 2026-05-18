"""
glyph_matcher.py
Matches a glyph template to real visible stars via spatial search.
Searches over rotation, scale, and translation to find best fits.
"""

import math
import random
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

import numpy as np
from scipy.spatial import cKDTree
from scipy.optimize import linear_sum_assignment

from .glyph_template import get_text_glyph_template, GlyphTemplate
from .visible_star_service import VisibleStar
from .scoring import compute_total_score


@dataclass
class GlyphCandidate:
    score: float
    score_breakdown: Dict[str, float]
    rotation: float          # degrees
    scale: float
    translation: Tuple[float, float]
    selected_stars: List[Dict]
    edges: List[Tuple[int, int]]
    template_points: List[Tuple[float, float]]


def _rotate_point(pt: Tuple[float, float], angle_rad: float) -> Tuple[float, float]:
    cos_a, sin_a = math.cos(angle_rad), math.sin(angle_rad)
    return (pt[0] * cos_a - pt[1] * sin_a, pt[0] * sin_a + pt[1] * cos_a)


def _transform_template(
    sampled_pts: List[Tuple[float, float]],
    rotation_deg: float,
    scale: float,
    cx: float,
    cy: float,
) -> List[Tuple[float, float]]:
    """
    Apply rotation, scale, and translation to template points.
    Template is centered at (0.5, 0.5) before transform.
    """
    angle_rad = math.radians(rotation_deg)
    result = []
    for pt in sampled_pts:
        # Center template around origin
        p = (pt[0] - 0.5, pt[1] - 0.5)
        # Rotate
        p = _rotate_point(p, angle_rad)
        # Scale
        p = (p[0] * scale, p[1] * scale)
        # Translate to (cx, cy)
        p = (p[0] + cx, p[1] + cy)
        result.append(p)
    return result


def _match_stars_to_template(
    template_pts: List[Tuple[float, float]],
    star_coords: np.ndarray,
    star_indices: np.ndarray,
    tree: cKDTree,
    max_dist: float = 0.15,
    k_neighbors: int = 48,
) -> Optional[List[int]]:
    """
    Use KDTree + linear_sum_assignment to find 1:1 mapping
    of template points to stars.

    Returns list of star indices (one per template point), or None if failed.
    """
    n_tmpl = len(template_pts)
    n_stars = len(star_coords)

    if n_stars < n_tmpl:
        return None

    local_cols = set()
    nearest_by_row = []
    for tp in template_pts:
        dists, idxs = tree.query(tp, k=min(k_neighbors, n_stars))
        dists = np.atleast_1d(dists)
        idxs = np.atleast_1d(idxs)
        usable = [(float(dist), int(idx)) for dist, idx in zip(dists, idxs) if dist <= max_dist]
        if not usable:
            return None
        nearest_by_row.append(usable)
        local_cols.update(idx for _, idx in usable)

    if len(local_cols) < n_tmpl:
        return None

    local_cols = np.array(sorted(local_cols), dtype=int)
    local_pos = {int(col): pos for pos, col in enumerate(local_cols)}

    # Build a compact cost matrix from only nearby stars. This is the difference
    # between "works on a sample catalog" and "survives Hipparcos-sized skies".
    cost_matrix = np.full((n_tmpl, len(local_cols)), 1e9)
    for row, usable in enumerate(nearest_by_row):
        for dist, global_col in usable:
            cost_matrix[row, local_pos[global_col]] = dist

    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    if len(row_ind) < n_tmpl:
        return None

    matched = [-1] * n_tmpl
    for r, c in zip(row_ind, col_ind):
        if cost_matrix[r, c] >= 1e8:
            return None
        matched[int(r)] = int(star_indices[local_cols[int(c)]])

    if any(idx < 0 for idx in matched):
        return None

    return matched


def find_glyph_candidates(
    char: str,
    visible_stars: List[VisibleStar],
    style: str = "accurate-glyph",
    glyph_font: str = "soft-wide",
    candidate_count: int = 5,
    rotation_steps: int = 7,
    scale_steps: int = 5,
    translation_samples: int = 20,
    samples_per_stroke: int = 3,
) -> List[GlyphCandidate]:
    """
    Search for best glyph matches in the real star field.

    Args:
        char: character to match
        visible_stars: list of visible stars
        style: scoring style
        candidate_count: number of top candidates to return
        rotation_steps: how many rotation values to try
        scale_steps: how many scale values to try
        translation_samples: candidate sky positions
        samples_per_stroke: points per stroke

    Returns:
        List of GlyphCandidate sorted by score descending
    """
    text = char.upper().strip()
    if len(text) > 10:
        raise ValueError("Text is too long. Sky Glyph supports up to 10 characters.")

    if len(text) > 1 and samples_per_stroke > 2:
        samples_per_stroke = 2

    template = get_text_glyph_template(
        text,
        samples_per_stroke=samples_per_stroke,
        font_variant=glyph_font,
    )
    if template is None:
        raise ValueError(f"Unsupported text: {char}. Use A-Z and 0-9, up to 10 characters.")

    if len(visible_stars) < len(template.sampled_points):
        raise ValueError(
            f"Not enough visible stars ({len(visible_stars)}) to match "
            f"text '{text}' needing {len(template.sampled_points)} points."
        )

    # Build star spatial arrays
    star_coords = np.array([(s.x, s.y) for s in visible_stars])
    star_indices = np.arange(len(visible_stars))
    tree = cKDTree(star_coords)

    # Search parameters
    rotations = np.linspace(-60, 60, rotation_steps)
    xs = [p[0] for p in template.sampled_points]
    ys = [p[1] for p in template.sampled_points]
    template_width = max(xs) - min(xs)
    template_height = max(ys) - min(ys)
    template_span = max(template_width, template_height, 0.1)
    max_scale = min(0.86, 0.76 / template_span)
    min_scale = max(0.045, max_scale * 0.48)
    scales = np.linspace(min_scale, max_scale, scale_steps)

    # Sample candidate translation centers (inside the sky disk)
    centers = []
    rng = random.Random(42)
    for _ in range(translation_samples):
        while True:
            cx = rng.uniform(0.15, 0.85)
            cy = rng.uniform(0.15, 0.85)
            # Check inside sky circle
            dx, dy = cx - 0.5, cy - 0.5
            if dx * dx + dy * dy <= 0.36:
                centers.append((cx, cy))
                break

    all_candidates: List[GlyphCandidate] = []

    for rotation in rotations:
        for scale in scales:
            for cx, cy in centers:
                transformed = _transform_template(
                    template.sampled_points, rotation, scale, cx, cy
                )

                # Quick bounds check: discard if most points out of canvas
                in_bounds = sum(
                    1 for p in transformed if 0.0 <= p[0] <= 1.0 and 0.0 <= p[1] <= 1.0
                )
                if in_bounds < len(transformed) * 0.7:
                    continue

                matched_indices = _match_stars_to_template(
                    transformed,
                    star_coords,
                    star_indices,
                    tree,
                    max_dist=0.12 if len(text) > 1 else 0.15,
                    k_neighbors=64 if len(text) > 1 else 48,
                )
                if matched_indices is None:
                    continue

                selected = [visible_stars[i] for i in matched_indices]
                star_pts = [(s.x, s.y) for s in selected]
                mags = [s.mag for s in selected]
                alts = [s.alt_deg for s in selected]

                scores = compute_total_score(
                    transformed, star_pts, mags, alts,
                    template.sampled_edges, style
                )

                # Build edges using matched star indices
                edges = []
                for (ti, tj) in template.sampled_edges:
                    if ti < len(matched_indices) and tj < len(matched_indices):
                        edges.append((matched_indices[ti], matched_indices[tj]))

                candidate = GlyphCandidate(
                    score=scores["total"],
                    score_breakdown=scores,
                    rotation=round(rotation, 2),
                    scale=round(scale, 4),
                    translation=(round(cx, 4), round(cy, 4)),
                    selected_stars=[_star_to_dict(s, idx) for s, idx in zip(selected, matched_indices)],
                    edges=edges,
                    template_points=[(round(p[0], 5), round(p[1], 5)) for p in transformed],
                )
                all_candidates.append(candidate)

    if not all_candidates:
        raise ValueError(
            f"Could not find any valid glyph match for '{text}' in the current sky."
        )

    # Sort by score descending
    all_candidates.sort(key=lambda c: c.score, reverse=True)

    # Deduplicate: skip candidates that share >50% stars with a better one
    unique: List[GlyphCandidate] = []
    used_star_sets: List[set] = []
    for c in all_candidates:
        star_set = {s["id"] for s in c.selected_stars}
        duplicate = False
        for used in used_star_sets:
            overlap = len(star_set & used) / max(len(star_set), 1)
            if overlap > 0.5:
                duplicate = True
                break
        if not duplicate:
            unique.append(c)
            used_star_sets.append(star_set)
        if len(unique) >= candidate_count:
            break

    return unique


def _star_to_dict(star: VisibleStar, index: int) -> Dict:
    return {
        "index": index,
        "id": star.id,
        "name": star.name,
        "ra_deg": star.ra_deg,
        "dec_deg": star.dec_deg,
        "mag": star.mag,
        "alt_deg": star.alt_deg,
        "az_deg": star.az_deg,
        "x": star.x,
        "y": star.y,
    }
