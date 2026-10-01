"""Turn a front-view cutout into a spec for an "inflated cutout" 3D model.

Blender's bundled Python has no Pillow, so all image work happens here and the
result is a small JSON file the Blender script turns into a mesh:

* ``grid``     - which cells of a WxH grid are inside the character's silhouette
* ``depth``    - per cell, how far it should bulge (0 at the edge, 1 in the middle),
                 computed from the distance to the nearest edge, so the body is
                 round where it is wide (torso, hood) and thin where it is narrow
                 (arms, lantern chain)
* ``thickness``- total front-to-back thickness relative to the height, taken from
                 the side view when there is one

This is the classic "inflate the silhouette" trick: crude up close, convincing
at sprite scale, and it needs no modelling skill at all.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image


def _distance_to_edge(mask: np.ndarray) -> np.ndarray:
    """Chessboard-ish distance from each inside pixel to the nearest outside pixel."""
    h, w = mask.shape
    inf = h + w
    d = np.where(mask, inf, 0).astype(np.int32)
    # two-pass (forward/backward) chamfer distance transform
    for y in range(h):
        for x in range(w):
            if d[y, x] == 0:
                continue
            best = d[y, x]
            if y > 0:
                best = min(best, d[y - 1, x] + 1)
                if x > 0:
                    best = min(best, d[y - 1, x - 1] + 1)
                if x + 1 < w:
                    best = min(best, d[y - 1, x + 1] + 1)
            if x > 0:
                best = min(best, d[y, x - 1] + 1)
            d[y, x] = best
    for y in range(h - 1, -1, -1):
        for x in range(w - 1, -1, -1):
            if d[y, x] == 0:
                continue
            best = d[y, x]
            if y + 1 < h:
                best = min(best, d[y + 1, x] + 1)
                if x > 0:
                    best = min(best, d[y + 1, x - 1] + 1)
                if x + 1 < w:
                    best = min(best, d[y + 1, x + 1] + 1)
            if x + 1 < w:
                best = min(best, d[y, x + 1] + 1)
            d[y, x] = best
    return d


def build_spec(
    front: Image.Image,
    side: Image.Image | None = None,
    *,
    columns: int = 64,
    thickness: float | None = None,
    roundness: float = 0.5,
) -> dict:
    """Compute the model spec from RGBA cutouts. ``columns`` = grid resolution."""
    front = front.convert("RGBA")
    alpha = np.asarray(front)[..., 3] > 127
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        raise ValueError("front view has no opaque pixels")
    alpha = alpha[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    h, w = alpha.shape
    rows = max(8, round(columns * h / w))
    small = np.asarray(Image.fromarray(alpha.astype(np.uint8) * 255).resize((columns, rows), Image.BOX)) > 127
    # fill single-pixel holes so the grid stays solid
    d = _distance_to_edge(small)
    inside = d > 0
    if inside.any():
        # normalise per row-neighbourhood: local width decides local roundness
        depth = (d / max(d.max(), 1)) ** roundness
        depth = np.where(inside, depth, 0.0)
    else:
        depth = np.zeros_like(d, dtype=float)

    if thickness is None:
        if side is not None:
            sa = np.asarray(side.convert("RGBA"))[..., 3] > 127
            sy, sx = np.nonzero(sa)
            if len(sy):
                side_w = sx.max() - sx.min() + 1
                side_h = sy.max() - sy.min() + 1
                thickness = float(np.clip(side_w / side_h, 0.12, 0.6))
        if thickness is None:
            thickness = 0.28  # a typical standing figure: depth ~ 28% of height

    return {
        "version": 1,
        "columns": int(columns),
        "rows": int(rows),
        "aspect": float(w / h),  # width / height of the silhouette
        "thickness": float(thickness),
        "grid": ["".join("1" if v else "0" for v in row) for row in inside],
        "depth": [[round(float(v), 3) for v in row] for row in depth],
    }


def write_spec(spec: dict, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(spec, separators=(",", ":")) + "\n")
    return path


# --------------------------------------------------------------------- hull
def _runs(row: np.ndarray) -> list[tuple[int, int]]:
    """Index ranges [start, end) of True runs in a 1-D boolean array."""
    out = []
    x = 0
    n = len(row)
    while x < n:
        if row[x]:
            s = x
            while x < n and row[x]:
                x += 1
            out.append((s, x))
        else:
            x += 1
    return out


def _mask(image: Image.Image) -> np.ndarray:
    from .cleanup import remove_islands

    a = np.asarray(image.convert("RGBA"))[..., 3] > 127
    a = remove_islands(a.astype(np.uint8) * 255, min_fraction=0.004) > 0   # loose chain bits and fringe would carve as floating slivers
    ys, xs = np.nonzero(a)
    if len(ys) == 0:
        raise ValueError("view has no opaque pixels")
    return a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def _project_quarter(vox: np.ndarray, sign: int) -> np.ndarray:
    """Silhouette of the voxel hull seen from the +-45 degree camera (yaw sign),
    on a column grid along u = x*c + sign*y*c (c = cos 45)."""
    rows, dcols, cols = vox.shape
    c = math.sqrt(0.5)
    ix = np.arange(cols) + 0.5 - cols / 2
    iy = np.arange(dcols) + 0.5 - dcols / 2
    u = (ix[None, :] * c + sign * iy[:, None] * c)  # (dcols, cols)
    u_min, u_max = u.min(), u.max()
    n_u = int(math.ceil(u_max - u_min)) + 1
    sil = np.zeros((rows, n_u), dtype=bool)
    ui = np.clip(np.rint(u - u_min).astype(int), 0, n_u - 1)
    for z in range(rows):
        layer = vox[z]
        if layer.any():
            sil[z, np.unique(ui[layer])] = True
    return sil, (u_min, u_max, ui)


def carve_quarter(vox: np.ndarray, quarter_mask: np.ndarray) -> tuple[np.ndarray, int, float]:
    """Carve the hull with the three-quarter silhouette.  The view may face
    either way; the orientation whose projected hull best matches the mask
    (IoU) wins.  Returns (voxels, sign, iou)."""
    rows = vox.shape[0]
    best = None
    for sign in (+1, -1):
        sil, (u_min, u_max, ui) = _project_quarter(vox, sign)
        # fit the mask to the hull's projected box (height is shared, width by extent)
        ys, xs = np.nonzero(sil)
        if len(xs) == 0:
            continue
        x0, x1 = xs.min(), xs.max() + 1
        q = np.asarray(Image.fromarray(quarter_mask.astype(np.uint8) * 255).resize((x1 - x0, rows), Image.BOX)) > 127
        full = np.zeros_like(sil)
        full[:, x0:x1] = q
        inter, union = (full & sil).sum(), (full | sil).sum()
        iou = inter / max(union, 1)
        if best is None or iou > best[0]:
            best = (iou, sign, full, ui)
    iou, sign, full, ui = best
    keep = full[:, ui]  # (rows, dcols, cols): is the voxel's u column inside the quarter silhouette
    return vox & keep, sign, float(iou)


def _open(vox: np.ndarray, n: int) -> np.ndarray:
    """Morphological opening with a 3x3x3 cross, n times: removes protrusions thinner than 2 voxels."""
    def shift_and(v):
        out = v.copy()
        for axis in range(3):
            for d in (-1, 1):
                out &= np.roll(v, d, axis=axis)
        return out

    def shift_or(v):
        out = v.copy()
        for axis in range(3):
            for d in (-1, 1):
                out |= np.roll(v, d, axis=axis)
        return out

    eroded = vox
    for _ in range(n):
        eroded = shift_and(eroded)
    opened = eroded
    for _ in range(n):
        opened = shift_or(opened)
    return opened & vox   # never grow past the original hull


def build_hull_spec(
    front: Image.Image,
    side: Image.Image,
    back: Image.Image | None = None,
    quarter: Image.Image | None = None,
    *,
    columns: int = 64,
    side_faces: str = "left",
    arm_depth_ratio: float = 1.4,
    depth_scale: float = 0.8,
    fit: float = 2.6,
    opening: int = 1,
) -> dict:
    """Carve a voxel model from the front and side silhouettes (a visual hull).

    Every horizontal slice is the intersection of what the front view allows
    (x range) and what the side view allows (y range), rounded into ellipses
    per run so bodies, hoods and arms get round cross-sections instead of
    boxes.  ``side_faces`` says which way the side view looks ("left" = the
    character's front is on the image's left, as on most turnaround sheets).
    """
    f = _mask(front)
    s = _mask(side)
    b = _mask(back)[:, ::-1] if back is not None else None  # mirror: seen from behind
    h, w = f.shape
    rows = max(8, round(columns * h / w))
    cell = 1.0 / rows  # cubic voxels in units of height
    depth_cols = max(4, round((s.shape[1] / s.shape[0]) / cell))

    def shrink(mask, size):
        return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).resize(size, Image.BOX)) > 127

    F = shrink(f, (columns, rows))
    S = shrink(s, (depth_cols, rows))
    if side_faces == "right":
        S = S[:, ::-1]
    if b is not None:
        B = shrink(b, (columns, rows))
        F = F & (B | ~B.any(axis=1, keepdims=True))  # back view can only remove, never add
    vox = np.zeros((rows, depth_cols, columns), dtype=bool)  # z, y, x
    for z in range(rows):
        f_runs = _runs(F[z])
        s_runs = _runs(S[z])
        if not f_runs or not s_runs:
            continue
        widest = max(x1 - x0 for x0, x1 in f_runs)
        for x0, x1 in f_runs:
            cx, hw = (x0 + x1 - 1) / 2, max((x1 - x0) / 2, 0.5)
            for y0, y1 in s_runs:
                cy, hd = (y0 + y1 - 1) / 2, max((y1 - y0) / 2, 0.5)
                if x1 - x0 < widest * 0.6:  # a thin run (arm, chain) is not torso-deep
                    hd = min(hd, hw * arm_depth_ratio)
                # form-fit: a side silhouette is the cloak's widest sweep, not the body; pull the depth in toward its
                # centre line, and use a superellipse (fit > 2 = fuller shoulders, no boxy corners, less bulk front/back)
                hd = max(hd * depth_scale, 0.5)
                xs = np.arange(x0, x1)
                ys = np.arange(max(y0, 0), min(y1, depth_cols))
                xn = np.abs((xs - cx) / hw)[None, :]
                yn = np.abs((ys - cy) / hd)[:, None]
                vox[z, ys[:, None], xs[None, :]] |= (xn**fit + yn**fit) <= 1.0
    if opening > 0:   # strip one-voxel protrusions (the "lines off the back"): erode then dilate
        vox = _open(vox, opening)
    if not vox.any():
        raise ValueError("hull is empty; check that the side view faces the right way")
    quarter_sign, quarter_iou = 0, 0.0
    if quarter is not None:
        # smooth the hull a little before carving so the quarter view trims shape, not staircase noise
        vox, quarter_sign, quarter_iou = carve_quarter(vox, _mask(quarter))
        if not vox.any():
            raise ValueError("the three-quarter view carved everything away; check it is the same character")
    packed = [["".join("1" if v else "0" for v in vox[z, y]) for y in range(depth_cols)] for z in range(rows)]
    return {
        "version": 2,
        "mode": "hull",
        "quarter_sign": int(quarter_sign),  # +1: the quarter view shows the character's left/front; 0: none
        "quarter_iou": round(quarter_iou, 3),
        "columns": int(columns),
        "rows": int(rows),
        "depth_columns": int(depth_cols),
        "aspect": float(w / h),
        "thickness": float(depth_cols / rows),
        "voxels": packed,
    }
