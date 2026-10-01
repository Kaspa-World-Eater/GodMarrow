"""The pixel conversion: the passes between the downsample and the palette lock that turn a shrunken painting into
readable pixel art.

A resize plus a quantise turns a dark, low-contrast, finely tattered painting into a blur at 56-120 px. Hand-made
pixel art is not a shrunken painting: it has a value structure (a few clearly separated lightness levels), a
readable silhouette with a darker edge, clusters of colour instead of noise, deliberate highlights on the things that
identify the figure (eyes, hat brim, blade, cords) and local contrast where the painting has mush. The passes here
give the pipeline each of those, in order:

1. :func:`sample_cells`: area-aware downsampling. Every cell takes the alpha-weighted mean of the paint it covers
   where it is flat and the median where an edge crosses it (so edges stay crisp and flat areas stay clean), and a
   cell is opaque when at least half of it is paint (stable frame to frame, keeps gaps between arm and body open).
2. :func:`find_details`: the small bright or saturated features of the source (eyes, glow, trim, metal) found at the
   painting's resolution, so each survives at the target size as at least one clean, slightly brightened cell.
3. :func:`value_remap` and :func:`local_contrast`: the lightness structure. The figure's median is moved toward the
   middle of its range, the range is stretched to a guaranteed span so the darkest and lightest clusters sit far
   apart, and an unsharp pass in OKLab at the pixel scale separates folds and gear. Hue is never touched.
4. :func:`feature_weights`: what the palette build should care about: chroma and local contrast weigh more than the
   big flat dark areas, and the details most of all.
5. :func:`cluster_clean`: clusters, not noise. Connected runs of one palette index smaller than ``min_size`` cells
   (orphans, pairs, 2 px checkers) take the index of the neighbour they share the longest border with; the detail
   cells are never touched.
6. :func:`gap_lines`, :func:`edge_shade`: the edges. Interior cells only partly covered by paint are the concavities
   the downsample closed (between arm and body, under the hat brim) and take the figure's own darkest shade of their
   hue; the ``dark`` outline darkens the silhouette's own edge cells the same way and ``rim`` lights the edge on the
   lit side instead.

Everything works in OKLab, moves only palette indices once the palette is locked and returns plain arrays.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

from .grid import Grid

_N4 = ((0, 1), (0, -1), (1, 0), (-1, 0))
_EIGHT = np.ones((3, 3), bool)


def _shift(a: np.ndarray, dy: int, dx: int, fill) -> np.ndarray:
    out = np.full_like(a, fill)
    h, w = a.shape[:2]
    ys = slice(max(dy, 0), h + min(dy, 0))
    xs = slice(max(dx, 0), w + min(dx, 0))
    yd = slice(max(-dy, 0), h + min(-dy, 0))
    xd = slice(max(-dx, 0), w + min(-dx, 0))
    out[ys, xs] = a[yd, xd]
    return out


# ------------------------------------------------------------------ 1. cells
@dataclass
class Cells:
    """One frame downsampled to the sprite grid."""

    lab: np.ndarray            # (h, w, 3) OKLab, one colour per cell
    alpha: np.ndarray          # (h, w) uint8 255 / 0: opaque when at least half the cell is paint
    coverage: np.ndarray       # (h, w) float: how much of each cell is paint
    detail: np.ndarray         # (h, w) bool: cells holding an identity detail (eyes, glow, trim)
    detail_lab: np.ndarray     # (h, w, 3) the detail's colour where ``detail`` is set
    weight: np.ndarray         # (h, w) float: how much each cell should count in the palette build

    @property
    def shape(self) -> tuple[int, int]:
        return self.alpha.shape


def cell_edges(n_out: int, scale: float, offset: float, limit: int) -> tuple[np.ndarray, np.ndarray]:
    """Source start / end (exclusive) of every cell along one axis."""
    k = np.arange(n_out)
    starts = np.floor(offset + k * scale).astype(int)
    ends = np.floor(offset + (k + 1) * scale).astype(int)
    ends = np.maximum(ends, starts + 1)
    return np.clip(starts, 0, limit - 1), np.clip(ends, 1, limit)


def box_sums(a: np.ndarray, ys0, ys1, xs0, xs1) -> np.ndarray:
    """Sum of ``a`` (H, W[, C]) over every cell, exactly, with integral images."""
    S = np.zeros((a.shape[0] + 1, a.shape[1] + 1) + a.shape[2:], np.float64)
    S[1:, 1:] = a.cumsum(0).cumsum(1)
    return S[np.ix_(ys1, xs1)] - S[np.ix_(ys0, xs1)] - S[np.ix_(ys1, xs0)] + S[np.ix_(ys0, xs0)]


def _samples(lab: np.ndarray, grid: Grid, h: int, w: int, inner: float, n: int) -> np.ndarray:
    """(h, w, n*n, 3): n x n samples over the inner fraction of every cell."""
    H, W = lab.shape[:2]
    t = (np.arange(n) + 0.5) / n
    t = 0.5 - inner / 2 + t * inner
    xs = np.clip(np.floor(grid.offset_x + (np.arange(w)[:, None] + t[None, :]) * grid.scale_x).astype(int), 0, W - 1)
    ys = np.clip(np.floor(grid.offset_y + (np.arange(h)[:, None] + t[None, :]) * grid.scale_y).astype(int), 0, H - 1)
    block = lab[ys[:, None, :, None], xs[None, :, None, :]]
    return block.reshape(h, w, n * n, 3)


def sample_cells(lab_src: np.ndarray, alpha_src: np.ndarray, grid: Grid, *, edge: str = "soft", h: int | None = None,
                 w: int | None = None) -> tuple[np.ndarray, np.ndarray]:
    """Area-aware downsample: ``(lab (h, w, 3), coverage (h, w))``.

    ``soft``: the alpha-weighted mean of the whole cell where it is flat, sliding to the median of its inner 70% where
    an edge crosses it (a lightness range above 0.08 in the cell). ``crisp``: the median of the inner 70%. ``hard``:
    the median of the inner 35% (a detected pixel grid, or a crunchy look). Coverage is the exact mean alpha of the
    cell, whatever the edge treatment."""
    H, W = alpha_src.shape
    if w is None or h is None:
        w, h = grid.output_size(W, H)
    ys0, ys1 = cell_edges(h, grid.scale_y, grid.offset_y, H)
    xs0, xs1 = cell_edges(w, grid.scale_x, grid.offset_x, W)
    a = alpha_src.astype(np.float64) / 255.0
    area = ((ys1 - ys0)[:, None] * (xs1 - xs0)[None, :]).astype(np.float64)
    cover = box_sums(a, ys0, ys1, xs0, xs1) / area
    n = int(min(8, max(2, np.ceil(max(grid.scale_x, grid.scale_y)))))
    if edge == "hard":
        return np.median(_samples(lab_src, grid, h, w, 0.35, n), axis=2), cover
    inner = 0.7 if max(grid.scale_x, grid.scale_y) >= 3 else 0.9
    med = np.median(_samples(lab_src, grid, h, w, inner, n), axis=2)
    if edge == "crisp":
        return med, cover
    paint = box_sums(a, ys0, ys1, xs0, xs1)
    mean = box_sums(lab_src * a[..., None], ys0, ys1, xs0, xs1) / np.maximum(paint, 1e-6)[..., None]
    mean = np.where(paint[..., None] > 1e-6, mean, med)
    full = _samples(lab_src, grid, h, w, 1.0, n)[..., 0]
    spread = full.max(axis=2) - full.min(axis=2)
    t = np.clip((spread - 0.08) / 0.16, 0.0, 1.0)[..., None]
    return mean * (1 - t) + med * t, cover


def coverage_alpha(coverage: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    return np.where(coverage >= threshold, 255, 0).astype(np.uint8)


# ------------------------------------------------------------------ 2. identity details
def _normalised_blur(v: np.ndarray, m: np.ndarray, sigma: float) -> np.ndarray:
    num = ndimage.gaussian_filter(v * m, sigma)
    den = ndimage.gaussian_filter(m.astype(np.float64), sigma)
    return num / np.maximum(den, 1e-6)


def find_details(lab_src: np.ndarray, alpha_src: np.ndarray, grid: Grid, h: int, w: int, strength: float = 1.0,
                 *, max_cells: float = 10.0) -> tuple[np.ndarray, np.ndarray]:
    """The identity details of the source, as cells: ``(mask (h, w), lab (h, w, 3))``.

    A detail is a small patch of the painting that is much brighter or much more saturated than its surroundings
    (a window of about one cell): a glowing eye, a gem, a paper charm, gold trim, a blade's shine. Saturated patches
    count from 3 source pixels (an eye is tiny but is the figure); bright neutral ones only from 60% of a cell, so
    the spray dots of a tattered hem are not details. Patches larger than ``max_cells`` cells are cloth, not detail.
    Each detail paints the cells it covers by at least 30% (at least the one it lies in most) with its own colour,
    lifted a little in lightness, the way a pixel artist places a highlight by hand. ``strength`` scales the
    thresholds (1 = default; 2 finds fainter details; 0 = none)."""
    H, W = alpha_src.shape
    none = np.zeros((h, w), bool), np.zeros((h, w, 3))
    scale = max(grid.scale_x, grid.scale_y)
    if strength <= 0 or scale < 1.0:
        return none
    m = alpha_src > 127
    if m.sum() < 16:
        return none
    L = lab_src[..., 0]
    C = np.hypot(lab_src[..., 1], lab_src[..., 2])
    # the surroundings: a blur wide enough that a 3 px eye does not hide itself in it
    sigma = max(2.0, 1.5 * scale)
    bright = L - _normalised_blur(L, m, sigma)
    sat = C - _normalised_blur(C, m, sigma)
    thr_l, thr_c = 0.14 / strength, 0.06 / strength
    cell_area = grid.scale_x * grid.scale_y
    ys0, _ = cell_edges(h, grid.scale_y, grid.offset_y, H)
    xs0, _ = cell_edges(w, grid.scale_x, grid.offset_x, W)
    row_cell = np.clip(np.searchsorted(ys0, np.arange(H), side="right") - 1, 0, h - 1)
    col_cell = np.clip(np.searchsorted(xs0, np.arange(W), side="right") - 1, 0, w - 1)
    cell_id = row_cell[:, None] * w + col_cell[None, :]

    mask = np.zeros((h, w), bool)
    out = np.zeros((h, w, 3))
    score_sum = np.zeros((h, w))
    for cand, min_px, score in ((m & (sat > thr_c), 3, sat), (m & (bright > thr_l), 0.6 * cell_area, bright)):
        labels, n = ndimage.label(cand, structure=_EIGHT)
        if n == 0:
            continue
        sizes = ndimage.sum(cand, labels, np.arange(1, n + 1))
        boxes = ndimage.find_objects(labels)
        keep = []
        for i, s in enumerate(sizes):
            if not (max(min_px, 3) <= s <= max_cells * cell_area):
                continue
            sl = boxes[i]
            bh, bw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            # compact: a blob (eye, charm, gem, buckle), not a line (a brim's lit rim, a fold)
            if s < 0.35 * bh * bw or max(bh, bw) > 4.0 * scale:
                continue
            keep.append(i + 1)
        if not keep:
            continue
        sel = np.isin(labels, keep)
        comp = labels[sel]
        cells = cell_id[sel]
        lab_px = lab_src[sel]
        sc = score[sel]
        # pixels of each (component, cell) pair
        pair = comp.astype(np.int64) * (h * w) + cells
        uniq, inv, counts = np.unique(pair, return_inverse=True, return_counts=True)
        pc_comp = uniq // (h * w)
        pc_cell = uniq % (h * w)
        frac = counts / cell_area
        # the colour of each component: the mean of its brighter half
        comp_ids, comp_inv = np.unique(comp, return_inverse=True)
        colour = np.zeros((len(comp_ids), 3))
        for k in range(len(comp_ids)):
            px = lab_px[comp_inv == k]
            cut = np.percentile(px[:, 0], 50)
            top = px[px[:, 0] >= cut]
            colour[k] = top.mean(axis=0)
        comp_pos = np.searchsorted(comp_ids, pc_comp)
        best = {}
        for i in range(len(uniq)):
            c = int(pc_comp[i])
            if c not in best or frac[i] > best[c][1]:
                best[c] = (int(pc_cell[i]), frac[i])
        chosen = (frac >= 0.3)
        for c, (cell, _) in best.items():
            chosen |= (pc_comp == c) & (pc_cell == cell)
        # the strength of each (component, cell): mean score of its pixels
        pair_score = np.bincount(inv, weights=sc, minlength=len(uniq)) / counts
        for i in np.nonzero(chosen)[0]:
            cy, cx = divmod(int(pc_cell[i]), w)
            s = float(pair_score[i])
            if s > score_sum[cy, cx]:
                score_sum[cy, cx] = s
                out[cy, cx] = colour[comp_pos[i]]
                mask[cy, cx] = True
    out[mask, 0] = np.clip(out[mask, 0] + 0.05 * min(strength, 2.0), 0.0, 1.0)
    return mask, out


# ------------------------------------------------------------------ 3. value structure
SHADOW_FLOOR = 0.12   # the figure's 2nd-percentile lightness never ends under this when a span is asked for: the body's
                      # shadow stays a shade, and black is kept for the edges (what the hand-made references do)


def value_remap(L: np.ndarray, ref: tuple[float, float, float], *, contrast: float = 1.0, span: float = 0.0,
                midtone: float = 0.5, lift: float = 0.0, floor: float = 0.03, ceiling: float = 0.97) -> tuple[np.ndarray, tuple[float, float, float]]:
    """The lightness remap: ``(L', (median', low', high'))``.

    ``ref`` is the figure's (median, low, high) lightness (the 50th, 2nd and 99th percentiles, measured once for a
    whole character). The range low..high is stretched by ``contrast`` about the median and never ends narrower
    than ``span``, so the darkest and lightest clusters of the figure sit far apart; ``midtone`` (0..1) moves the
    median toward the middle of that range (expanding whichever side of the median is squashed, usually the
    shadows of a dark painting); ``lift`` adds to everything; the result is shifted to stay inside
    ``floor..ceiling`` before it is clipped. Hue and chroma are not touched here."""
    med, lo, hi = ref
    width = max(hi - lo, 1e-3)
    t = (np.asarray(L, dtype=np.float64) - lo) / width
    tm = min(max((med - lo) / width, 0.05), 0.95)
    gamma = np.log(0.5) / np.log(tm)
    gamma = 1.0 + midtone * (gamma - 1.0)
    pos = t > 0
    t2 = np.where(pos, np.power(np.clip(t, 0.0, None), gamma), t)
    tm2 = tm ** gamma
    out_width = max(width * contrast, span)
    med_out = med + lift
    L2 = med_out + (t2 - tm2) * out_width
    lo2, hi2 = med_out - tm2 * out_width, med_out + (1 - tm2) * out_width
    if lo2 < floor:
        d = floor - lo2
        L2, lo2, hi2, med_out = L2 + d, lo2 + d, hi2 + d, med_out + d
    if hi2 > ceiling:
        d = hi2 - ceiling
        L2, lo2, hi2, med_out = L2 - d, lo2 - d, hi2 - d, med_out - d
    return np.clip(L2, 0.0, 1.0), (float(med_out), float(max(lo2, 0.0)), float(min(hi2, 1.0)))


def local_contrast(L: np.ndarray, mask: np.ndarray, amount: float, radius: float) -> np.ndarray:
    """An unsharp pass on lightness at the pixel scale, inside the figure only (the blur is normalised by the mask,
    so the silhouette's edge gets no halo from the background): folds, straps and gear separate from the cloth
    round them."""
    if amount <= 0 or radius <= 0:
        return L
    m = (mask > 0).astype(np.float64)
    blur = _normalised_blur(L, m, radius)
    out = L + amount * (L - blur)
    return np.where(m > 0, np.clip(out, 0.0, 1.0), L)


def posterise(L: np.ndarray, lo: float, hi: float, bands: int) -> np.ndarray:
    """Lightness between ``lo`` and ``hi`` flattened to ``bands`` even levels; anything above lands on the top band."""
    if bands < 2:
        return L
    lo, hi = max(lo, 0.0), min(hi, 1.0)
    t = np.clip((L - lo) / max(hi - lo, 1e-6), 0.0, 1.0)
    return lo + np.rint(t * (bands - 1)) / (bands - 1) * (hi - lo)


def value_separation(L: np.ndarray, mask: np.ndarray) -> float:
    """How far apart the figure's dark and light clusters sit: the 90th minus the 10th percentile of lightness."""
    v = L[mask > 0]
    if v.size == 0:
        return 0.0
    p10, p90 = np.percentile(v, [10, 90])
    return float(p90 - p10)


# ------------------------------------------------------------------ 4. what the palette should care about
def feature_weights(lab: np.ndarray, mask: np.ndarray, detail: np.ndarray | None, *, detail_boost: float = 6.0,
                    radius: float = 1.5) -> np.ndarray:
    """A weight per cell for the palette build: chroma and local lightness contrast count, the big flat dark areas
    count least, and the detail cells most of all (``detail_boost`` times)."""
    m = (mask > 0).astype(np.float64)
    L = lab[..., 0]
    C = np.hypot(lab[..., 1], lab[..., 2])
    dev = np.abs(L - _normalised_blur(L, m, radius))
    wgt = 1.0 + 2.0 * np.clip(C / 0.12, 0.0, 1.0) + 2.0 * np.clip(dev / 0.12, 0.0, 1.0)
    if detail is not None and detail.any():
        wgt = np.where(detail, wgt + detail_boost, wgt)
    return np.where(m > 0, wgt, 0.0)


# ------------------------------------------------------------------ 5. clusters, not noise
def cluster_smooth(lab: np.ndarray, mask: np.ndarray, radius: int = 1, passes: int = 1, sigma_range: float = 0.08) -> np.ndarray:
    """A bilateral smoothing in OKLab at the cell scale: every cell moves toward the neighbours within ``radius``
    whose colour is near its own (``sigma_range``, OKLab distance), so the fine texture of a painting collapses into
    clusters of one colour while the borders between materials and values stay where they are. Runs inside the
    figure only."""
    if radius <= 0 or passes <= 0:
        return lab
    m = (mask > 0).astype(np.float64)
    out = lab.astype(np.float64, copy=True)
    offsets = [(dy, dx) for dy in range(-radius, radius + 1) for dx in range(-radius, radius + 1)]
    for _ in range(passes):
        acc = np.zeros_like(out)
        wsum = np.zeros(out.shape[:2])
        for dy, dx in offsets:
            sh = _shift(out, dy, dx, 0.0)
            shm = _shift(m, dy, dx, 0.0)
            d2 = ((sh - out) ** 2).sum(-1)
            wgt = np.exp(-(dy * dy + dx * dx) / (2.0 * radius * radius)) * np.exp(-d2 / (2.0 * sigma_range ** 2)) * shm
            acc += sh * wgt[..., None]
            wsum += wgt
        smoothed = acc / np.maximum(wsum, 1e-9)[..., None]
        out = np.where((m > 0)[..., None], smoothed, out)
    return out


def cluster_clean(indices: np.ndarray, alpha: np.ndarray, min_size: int, protect: np.ndarray | None = None,
                  passes: int = 2) -> np.ndarray:
    """Runs of one palette index smaller than ``min_size`` cells (8-connected: a diagonal line is one run and stays)
    take the index of the neighbouring run they share the longest border with. Orphans, pairs and 2 px checkers go;
    lines, blocks and borders stay; cells in ``protect`` (the identity details) never move. Only indices move."""
    if min_size <= 1:
        return indices
    idx = indices.copy()
    opaque = alpha > 0
    prot = np.zeros(idx.shape, bool) if protect is None else protect.astype(bool)
    for _ in range(passes):
        moved = False
        for c in np.unique(idx[opaque]):
            if c < 0:
                continue
            here = (idx == c) & opaque
            labels, n = ndimage.label(here, structure=_EIGHT)
            if n == 0:
                continue
            sizes = ndimage.sum(here, labels, np.arange(1, n + 1))
            for comp_id in np.nonzero(sizes < min_size)[0] + 1:
                comp = labels == comp_id
                if prot[comp].any():
                    continue
                ring = ndimage.binary_dilation(comp, structure=_EIGHT) & ~comp & opaque
                around = idx[ring]
                around = around[(around >= 0) & (around != c)]
                if around.size == 0:
                    continue
                vals, counts = np.unique(around, return_counts=True)
                idx[comp] = vals[counts.argmax()]
                moved = True
        if not moved:
            break
    return idx


def orphan_count(indices: np.ndarray, alpha: np.ndarray) -> int:
    """Opaque cells whose four neighbours all share another index (the specks a clean pass removes)."""
    neigh = [_shift(indices, dy, dx, -1) for dy, dx in _N4]
    n0 = neigh[0]
    same = np.all([n == n0 for n in neigh[1:]], axis=0)
    return int((same & (n0 != indices) & (n0 >= 0) & (alpha > 0)).sum())


# ------------------------------------------------------------------ 6. edges
def gap_lines(coverage: np.ndarray, alpha: np.ndarray, *, below: float = 0.8) -> np.ndarray:
    """Interior cells (every 4-neighbour opaque) that are opaque but less than ``below`` covered by paint: the
    concavities the downsample closed (between arm and body, between hat and head). They get the dark shade so the
    silhouette keeps its openings as lines instead of merging into one mass."""
    opaque = alpha > 0
    interior = opaque & np.all([_shift(opaque, dy, dx, False) for dy, dx in _N4], axis=0)
    return interior & (coverage < below)


def edge_cells(alpha: np.ndarray, *, lit: tuple[int, int] = (-1, -1)) -> tuple[np.ndarray, np.ndarray]:
    """``(lit_edge, dark_edge)``: the silhouette's own edge cells, split by which way their open side faces. ``lit``
    is the direction the light comes from as (dy, dx), upper left by default; an edge cell open toward the light is
    lit, any other edge cell is dark."""
    opaque = alpha > 0
    # open_to[(dy, dx)]: opaque cells whose neighbour at (y + dy, x + dx) is transparent (open toward +d)
    open_to = {d: opaque & ~_shift(opaque, -d[0], -d[1], False) for d in _N4}
    edge = np.any(list(open_to.values()), axis=0)
    toward_light = np.zeros_like(opaque)
    for dy, dx in _N4:
        if dy * lit[0] + dx * lit[1] > 0:
            toward_light |= open_to[(dy, dx)]
    away = np.zeros_like(opaque)
    for dy, dx in _N4:
        if dy * lit[0] + dx * lit[1] < 0:
            away |= open_to[(dy, dx)]
    lit_edge = toward_light & ~away
    return lit_edge, edge & ~lit_edge


def shade_index(palette_lab: np.ndarray, cell_lab: np.ndarray, *, darker: bool = True, step: float = 0.06,
                reach: float = 0.18) -> np.ndarray:
    """For every cell colour (..., 3), the palette index of the figure's own darker (or lighter) shade of that hue:
    among the palette entries at least ``step`` darker (lighter), the one nearest in hue and chroma and nearest to
    ``reach`` darker (lighter), so an edge is one firm step down the ramp, not a jump to black or to the brightest
    highlight; when there is none, the darkest (lightest) entry of all."""
    flat = cell_lab.reshape(-1, 3)
    dab = np.sqrt(((flat[:, None, 1:] - palette_lab[None, :, 1:]) ** 2).sum(-1))
    pL = palette_lab[None, :, 0]
    L = flat[:, None, 0]
    if darker:
        ok = pL <= L - step
        score = dab * 2.0 + np.abs(pL - (L - reach))
        fallback = int(palette_lab[:, 0].argmin())
    else:
        ok = pL >= L + step
        score = dab * 2.0 + np.abs(pL - (L + reach * 0.7))
        fallback = int(palette_lab[:, 0].argmax())
    score = np.where(ok, score, np.inf)
    best = score.argmin(1)
    best[~ok.any(1)] = fallback
    return best.reshape(cell_lab.shape[:-1])


def edge_lab(lab: np.ndarray, alpha: np.ndarray, mode: str, coverage: np.ndarray | None = None,
             protect: np.ndarray | None = None, *, dark_step: float = 0.16, rim_step: float = 0.1,
             floor: float = 0.02) -> tuple[np.ndarray, np.ndarray]:
    """The edge pass on the cells' colours, before the palette is drawn: ``(lab, edge mask)``. The gap lines
    (concavities the downsample closed) and, with ``dark``, every edge cell of the silhouette drop ``dark_step`` in
    lightness in their own hue; with ``rim`` the edge cells facing the light rise ``rim_step`` instead and the rest
    drop. ``none`` draws only the gap lines. Detail cells are left alone. Because this runs before the lock, the
    palette holds the edge shades itself and nothing is added after it."""
    out = lab.astype(np.float64, copy=True)
    prot = np.zeros(alpha.shape, bool) if protect is None else protect.astype(bool)
    darken = np.zeros(alpha.shape, bool)
    lighten = np.zeros(alpha.shape, bool)
    if coverage is not None:
        darken |= gap_lines(coverage, alpha)
    if mode in ("dark", "rim"):
        lit, dark = edge_cells(alpha)
        if mode == "rim":
            lighten |= lit
            darken |= dark
        else:
            darken |= dark | lit
    darken &= ~prot & (alpha > 0)
    lighten &= ~prot & ~darken & (alpha > 0)
    # the step is taken from the body beside the edge, not from the edge cell's own colour (a lit brim or a pale
    # fringe is lighter than the cloth it borders, and the edge must still end a step darker than that cloth)
    inside = inside_lightness(out[..., 0], (alpha > 0) & ~darken & ~lighten)
    out[darken, 0] = np.clip(np.minimum(out[darken, 0], inside[darken]) - dark_step, floor, 1.0)
    out[lighten, 0] = np.clip(np.maximum(out[lighten, 0], inside[lighten]) + rim_step, 0.0, 0.98)
    return out, darken | lighten


def inside_lightness(L: np.ndarray, body: np.ndarray) -> np.ndarray:
    """For every cell, the mean lightness of its 8-neighbours that are ``body`` cells (its own lightness where it has
    none): what a cell on the edge of the figure borders on the inside."""
    acc = np.zeros(L.shape)
    cnt = np.zeros(L.shape)
    b = body.astype(np.float64)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            w = _shift(b, dy, dx, 0.0)
            acc += _shift(L, dy, dx, 0.0) * w
            cnt += w
    return np.where(cnt > 0, acc / np.maximum(cnt, 1e-9), L)


def edge_shade(indices: np.ndarray, lab: np.ndarray, alpha: np.ndarray, palette_lab: np.ndarray, mode: str,
               coverage: np.ndarray | None = None, protect: np.ndarray | None = None) -> np.ndarray:
    """The same edge pass on palette indices, for a sprite whose palette is already locked and drawn: the gap lines
    and the ``dark`` / ``rim`` edge cells take the figure's own darker (lighter) shade of their hue from the palette
    (:func:`shade_index`). Detail cells are left alone. No colour outside the palette."""
    idx = indices.copy()
    prot = np.zeros(idx.shape, bool) if protect is None else protect.astype(bool)
    if coverage is not None:
        gaps = gap_lines(coverage, alpha) & ~prot
        if gaps.any():
            idx[gaps] = shade_index(palette_lab, lab[gaps], darker=True)
    if mode in ("dark", "rim"):
        lit, dark = edge_cells(alpha)
        if mode == "dark":
            dark = dark | lit
            lit = np.zeros_like(lit)
        dark &= ~prot
        lit &= ~prot
        if dark.any():
            idx[dark] = shade_index(palette_lab, lab[dark], darker=True)
        if lit.any():
            idx[lit] = shade_index(palette_lab, lab[lit], darker=False)
    return idx


# ------------------------------------------------------------------ measuring
def frame_change(frames: list[np.ndarray]) -> dict:
    """How much an animation flickers: the mean OKLab change per shared opaque pixel between consecutive frames and
    the share of those pixels that changed colour at all. Frames are RGBA arrays of one size."""
    from .color import rgb_to_oklab

    if len(frames) < 2:
        return {"mean_change": 0.0, "changed_fraction": 0.0}
    labs = [rgb_to_oklab(f[..., :3]) for f in frames]
    masks = [f[..., 3] > 0 for f in frames]
    means, fracs = [], []
    for a, b, ma, mb in zip(labs, labs[1:], masks, masks[1:]):
        both = ma & mb
        if not both.any():
            continue
        d = np.sqrt(((a - b) ** 2).sum(-1))[both]
        means.append(float(d.mean()))
        fracs.append(float((d > 1e-6).mean()))
    return {"mean_change": float(np.mean(means)) if means else 0.0, "changed_fraction": float(np.mean(fracs)) if fracs else 0.0}
