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


def _brim_rows(F: np.ndarray) -> list[int]:
    """Rows of a hat brim: a band in the top third whose width is > 1.5x the width a few rows below it, and whose
    lowest row is at least 1.5x wider than the row under it (the head). Empty when there is no such band."""
    rows = F.shape[0]
    width = F.sum(axis=1)
    top = [z for z in range(rows) if width[z] > 0]
    if not top:
        return []
    z0 = top[0]
    best = []
    for z in range(z0, min(rows, z0 + rows // 3)):
        below = width[min(z + 3, rows - 1)]
        if width[z] >= 1.5 * max(below, 1) and width[z] >= 0.25 * width.max():
            best.append(z)
        elif best:
            break
    if len(best) < 2 or len(best) > rows // 6:
        return []
    return list(range(z0, max(best) + 1))   # everything from the figure's top down to the brim's underside is the hat


def _cull_slivers(vox: np.ndarray, keep_fraction: float = 0.03, attached_only: bool = False) -> np.ndarray:
    """Keep the body and any island at least keep_fraction of it (a held thing); drop the rest. Loose slivers (a plate
    where a cord seen edge-on met the body's width, a tassel's voxels) read as lines sticking out of the figure; the
    card pass that follows brings back what the front view shows, attached to the body at its mid-depth."""
    from scipy import ndimage

    lab, n = ndimage.label(vox)
    if n <= 1:
        return vox
    sizes = ndimage.sum(vox, lab, index=np.arange(n + 1))
    biggest = sizes[1:].max()
    keep = sizes >= keep_fraction * biggest
    if attached_only:   # only the body and a held thing (a quarter of its size or more); every other loose piece goes
        keep &= (sizes >= 0.25 * biggest)
    keep[0] = False
    return keep[lab]


# PIL's Image.transpose methods, in the order _dihedral() numbers them
DIHEDRAL = [None, Image.FLIP_LEFT_RIGHT, Image.FLIP_TOP_BOTTOM, Image.ROTATE_180, Image.ROTATE_90, Image.ROTATE_270, Image.TRANSPOSE, Image.TRANSVERSE]


def _dihedral(a: np.ndarray, k: int) -> np.ndarray:
    """The 8 flips/rotations of a 2D array, matching DIHEDRAL (PIL's transpose) index for index."""
    return [lambda a: a, np.fliplr, np.flipud, lambda a: np.rot90(a, 2), lambda a: np.rot90(a, 1), lambda a: np.rot90(a, 3),
            lambda a: a.T, lambda a: np.rot90(a.T, 2)][k](a)


def transpose_image(img: Image.Image, k: int) -> Image.Image:
    return img if not k else img.transpose(DIHEDRAL[k])


def _canopy_cards(vox: np.ndarray, F: np.ndarray, S: np.ndarray, T: np.ndarray | None) -> list[dict]:
    """A tree: the trunk stays a carved solid; the crown becomes crossed painted cards (front plane, side plane and,
    with a top view, a horizontal plane), the way game trees are built, so leaves keep their painted lace instead of
    carving into a solid blob. The crown rows are the ones wider than 1.8x the trunk (the narrow rows at the base)."""
    rows, depth_cols, columns = vox.shape
    width = F.sum(axis=1)
    filled = np.nonzero(width)[0]
    if len(filled) == 0:
        return []
    base = filled[-1]
    trunk_w = max(float(np.median(width[max(filled[0], base - rows // 6):base + 1])), 1.0)
    crown = [z for z in filled if width[z] > 1.8 * trunk_w]
    if len(crown) < rows // 10:
        return []
    z0, z1 = min(crown), max(crown) + 1
    body = [np.nonzero(vox[z].any(axis=1))[0] for z in range(z0, z1) if vox[z].any()]
    cy = int(round(float(np.mean([b.mean() for b in body])))) if body else depth_cols // 2
    xs = np.nonzero(F[z0:z1].any(axis=0))[0]
    cx = int(round((xs.min() + xs.max()) / 2)) if len(xs) else columns // 2
    parts = [{"kind": "card", "axis": "y", "at": cy, "z0": int(z0), "z1": int(z1), "mask": ["".join("1" if v else "0" for v in F[z]) for z in range(z0, z1)]},
             {"kind": "card", "axis": "x", "at": cx, "z0": int(z0), "z1": int(z1), "mask": ["".join("1" if v else "0" for v in S[z]) for z in range(z0, z1)]}]
    if T is not None:
        zm = (z0 + z1) // 2
        parts.append({"kind": "card", "axis": "z", "at": int(zm), "mask": ["".join("1" if v else "0" for v in T[y]) for y in range(depth_cols)]})
    vox[z0:z1] = False
    return parts


def synthesize_top(front: Image.Image, spec: dict, scale: int = 8, top_light: float = 0.10) -> Image.Image:
    """What the camera sees from above when no plan view was painted. Each column of the front view gives the colour
    of its topmost paint (the surface the camera looks down on); a hat cone is revolved from the front painting's
    brim band, so the hat's top is the brim's colour out to its edge and the crown's colour at the centre, not the
    pale disc the front projection smeared over it. Canonical orientation (image-up = the figure's back)."""
    f = np.asarray(front.convert("RGBA"))
    a = f[..., 3] > 127
    ys, xs = np.nonzero(a)
    f = f[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    a = f[..., 3] > 127
    h, w = a.shape
    cols, dcols, rows = spec["columns"], spec["depth_columns"], spec["rows"]
    W, H = cols * scale, dcols * scale
    out = np.zeros((H, W, 4), np.uint8)
    # topmost paint per column, averaged over a few pixels down so it is the surface and not the edge fringe
    xs_src = (np.arange(W) * w / W).astype(int)
    for X in range(W):
        col = np.nonzero(a[:, xs_src[X]])[0]
        if len(col) == 0:
            continue
        y0 = col[0]
        band = f[y0:min(h, y0 + max(2, h // 60)), xs_src[X]]
        band = band[band[..., 3] > 127]
        out[:, X, :3] = band[..., :3].mean(axis=0).astype(np.uint8)
        out[:, X, 3] = 255
    for part in spec.get("parts", []):
        if part["kind"] != "cone":
            continue
        # revolve: a point at radius r (in columns) takes the front painting's colour at x = cx +- r in the brim band
        rows_b = part["rows"]
        yb0, yb1 = int(min(rows_b) * h / rows), int((max(rows_b) + 1) * h / rows)
        # the upper half of the brim band is the hat's top surface in the painting; the lower half its underside
        band = f[yb0:max(yb0 + max(1, (yb1 - yb0) // 2), yb0 + 1)]
        R = part["radius"]
        cxp = (part["cx"] + 0.5) * w / cols
        prof = np.zeros((int(R * scale) + 2, 3), np.float32)
        for i in range(len(prof)):
            r_px = (i / scale) * w / cols
            lo, hi = int(max(0, cxp - r_px - 1)), int(min(w, cxp - r_px + 2))
            lo2, hi2 = int(max(0, cxp + r_px - 1)), int(min(w, cxp + r_px + 2))
            px = np.concatenate([band[:, lo:hi].reshape(-1, 4), band[:, lo2:hi2].reshape(-1, 4)])
            px = px[px[:, 3] > 127]
            prof[i] = px[:, :3].mean(axis=0) if len(px) else (prof[i - 1] if i else 0)
        yy, xx = np.mgrid[0:H, 0:W]
        cy = (dcols - 1 - part["cy"]) * scale   # canonical top: row 0 is the back (+y)
        d = np.sqrt((xx - (part["cx"] + 0.5) * scale) ** 2 + (yy - (cy + 0.5 * scale)) ** 2)
        inside = d <= R * scale
        idx = np.clip(d[inside].astype(int), 0, len(prof) - 1)
        cols_rgb = prof[idx]
        if top_light:
            # a hat's top faces the sky: lift it toward straw (OKLab lightness up, a little warmth) so it reads as a
            # lit surface and not the brim's shadowed underside
            from .color import oklab_to_rgb, rgb_to_oklab

            lab = rgb_to_oklab(cols_rgb[None].astype(np.uint8))[0]
            lab[:, 0] = np.clip(lab[:, 0] + top_light, 0, 1)
            lab[:, 1] += 0.01
            lab[:, 2] += 0.02
            cols_rgb = np.clip(oklab_to_rgb(lab[None])[0], 0, 255)
        out[inside, :3] = cols_rgb.astype(np.uint8)
        out[inside, 3] = 255
    return Image.fromarray(out, "RGBA")


def hull_preview(spec: dict, path: str | Path, scale: int = 3) -> str:
    """Front, side and top views of the carved voxels (and a 3/4 view) as one PNG, so a carve can be judged without
    Blender: the shape problems (slabs, plates, thick brims) show here first."""
    vox = np.array([[[c == "1" for c in row] for row in layer] for layer in spec["voxels"]], bool)   # z, y, x
    rows, depth, cols = vox.shape
    for part in spec.get("parts", []):
        if part["kind"] == "card":
            m = np.array([[c == "1" for c in row] for row in part["mask"]], bool)
            if part["axis"] == "y":
                vox[part["z0"]:part["z1"], part["at"], :] |= m
            elif part["axis"] == "x":
                vox[part["z0"]:part["z1"], :, part["at"]] |= m
            else:
                vox[part["at"], :, :] |= m
        if part["kind"] == "cone":
            yy, xx = np.mgrid[0:depth, 0:cols]
            for z in range(part["z_apex"], part["z_base"]):
                r = part["radius"] * (z - part["z_apex"] + 0.5) / max(part["z_base"] - part["z_apex"], 1)
                vox[z] |= ((xx - part["cx"]) ** 2 + (yy - part["cy"]) ** 2) <= r * r
    def depth_shade(mask_depth):   # nearest-surface shading: brighter = nearer
        out = np.zeros(mask_depth.shape[:2] + (3,), np.uint8)
        a = mask_depth
        any_ = a.any(axis=2)
        first = np.argmax(a, axis=2)
        n = a.shape[2]
        v = (0.35 + 0.65 * (1 - first / max(n - 1, 1)))
        g = (v * 200).astype(np.uint8)
        out[..., 0] = np.where(any_, (g * 0.9).astype(np.uint8), 18)
        out[..., 1] = np.where(any_, g, 18)
        out[..., 2] = np.where(any_, (g * 0.95).astype(np.uint8), 20)
        return out
    front = depth_shade(np.transpose(vox, (0, 2, 1)))                      # z, x, y(depth)
    side = depth_shade(np.transpose(vox, (0, 1, 2))[:, :, ::-1])            # z, y, x: seen from the character's left
    top = depth_shade(np.transpose(vox, (1, 2, 0)))                         # y, x, z
    # a 3/4 view: shear x by depth
    q = np.zeros((rows, cols + depth, depth), bool)
    for y in range(depth):
        q[:, y:y + cols, y] = vox[:, y, :]
    quarter = depth_shade(q)
    tiles = [front, side, quarter, top]
    H = max(t.shape[0] for t in tiles); W = sum(t.shape[1] for t in tiles) + 6 * len(tiles)
    img = Image.new("RGB", (W, H), (18, 18, 20)); x = 0
    for t in tiles:
        im = Image.fromarray(t)
        img.paste(im, (x, H - t.shape[0])); x += t.shape[1] + 6
    img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    return str(path)


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
    thin_run: int = 3,
    brim: bool = True,
    top: Image.Image | None = None,
    bottom: Image.Image | None = None,
    canopy: bool = False,
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

    def shrink(mask, size, coverage: float = 0.35):
        # a cell is solid when more than ``coverage`` of it is paint: a lacy hem or a tattered edge (half paint, half
        # holes) must still carve, or the dark cloth there vanishes from the model
        return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).resize(size, Image.BOX)) > int(255 * coverage)

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
        deepest = max(y1 - y0 for y0, y1 in s_runs)
        for x0, x1 in f_runs:
            cx, hw = (x0 + x1 - 1) / 2, max((x1 - x0) / 2, 0.5)
            thin_f = x1 - x0 < widest * 0.6
            for y0, y1 in s_runs:
                cy, hd = (y0 + y1 - 1) / 2, max((y1 - y0) / 2, 0.5)
                thin_s = y1 - y0 < deepest * 0.6 and y1 - y0 <= thin_run
                if thin_s and not thin_f:
                    # a sliver in the side view (a tassel, a cord end, a blade seen edge-on) meeting the whole body width
                    # would carve as a plate the width of the figure: the "lines sticking out". It belongs to something
                    # thin in the front view or to nothing; the cards below bring back what the front view shows.
                    continue
                if thin_f:  # a thin run (arm, chain) is not torso-deep
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
    parts: list[dict] = []
    brim_rows = _brim_rows(F) if brim else []
    if brim_rows:
        # a hat: the front view's brim is a wide band that narrows sharply below it (the head). A one-voxel cone would be
        # eaten by the mesh smoothing (it came out as a small dome), so the brim leaves the voxels and becomes a real
        # cone part: base at the brim's lowest row, apex at the top of the figure, built as geometry in Blender.
        z_lo = max(brim_rows)
        xs = np.nonzero(F[brim_rows].any(axis=0))[0]
        cx = (xs.min() + xs.max()) / 2
        r = max((xs.max() - xs.min()) / 2, 1.0)
        body = [np.nonzero(vox[z].any(axis=1))[0] for z in range(z_lo + 1, min(rows, z_lo + 8)) if vox[z].any()]
        cy = float(np.mean([b.mean() for b in body])) if body else depth_cols / 2
        z_top = int(np.nonzero(F.any(axis=1))[0].min())
        for z in brim_rows:
            vox[z] = False
        parts.append({"kind": "cone", "cx": float(cx), "cy": float(cy), "radius": float(r), "z_base": int(z_lo + 1), "z_apex": int(z_top),
                      "rows": brim_rows})
    vox = _cull_slivers(vox)
    # a top view (and an underside view) carve the footprint: what the camera looks down on (hat brims, shoulders,
    # a tree's crown, a roof) gets its real plan shape instead of the front x side box. The view's orientation is
    # found by matching the carve (sheets are not consistent about which way is up in a plan view).
    orient = {}
    for label, img in (("top", top), ("bottom", bottom)):
        if img is None:
            continue
        m = _mask(img)
        foot = vox.any(axis=0)   # y, x
        best, best_k, best_iou = None, 0, -1.0
        for k in range(8):
            cand = shrink(_dihedral(m, k), (columns, depth_cols))
            cand = cand[::-1] if label == "top" else cand   # the top camera's image-up is the back (+y)
            iou = (cand & foot).sum() / max((cand | foot).sum(), 1)
            if iou > best_iou:
                best, best_k, best_iou = cand, k, iou
        vox &= best[None]
        if brim_rows and parts:   # the cone's radius follows the plan view too
            ys_, xs_ = np.nonzero(best)
            if len(xs_):
                parts[0]["radius"] = float(min(parts[0]["radius"], (xs_.max() - xs_.min() + 1) / 2))
        orient[label] = {"transpose": best_k, "iou": round(float(best_iou), 3)}
    if canopy:
        parts += _canopy_cards(vox, F, S, shrink(_dihedral(_mask(top), orient["top"]["transpose"]), (columns, depth_cols))[::-1] if top is not None else None)
    # cards: what the front view shows but the carve lost (ropes, chains, hanging charms, hem fringe) comes back as a
    # two-voxel-thick card at the body's mid-depth, painted by the same projection (the Diablo II way)
    front_proj = vox.any(axis=1)   # z, x
    lost = F & ~front_proj
    for part in parts:   # the brim is a cone part and the crown is cards: neither comes back as a mid-depth card
        if part["kind"] == "cone":
            lost[part["rows"]] = False
        elif part["kind"] == "card" and part["axis"] != "z":
            lost[part["z0"]:part["z1"]] = False
    for z in range(rows):
        if not lost[z].any():
            continue
        body = np.nonzero(vox[z].any(axis=1))[0]   # depths used by the body at this row
        if len(body):
            yc = int(round(body.mean()))
        else:
            near = [zz for zz in range(max(0, z - 6), min(rows, z + 7)) if vox[zz].any()]
            yc = int(round(np.mean([np.nonzero(vox[zz].any(axis=1))[0].mean() for zz in near]))) if near else depth_cols // 2
        for y in (yc - 1, yc):
            if 0 <= y < depth_cols:
                vox[z, y, lost[z]] = True
    # a card that touched nothing (a charm whose string is thinner than a voxel) would float: keep what is attached
    vox = _cull_slivers(vox, keep_fraction=0.03, attached_only=True)
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
        "parts": parts,
        "orient": orient,   # which transpose made each plan view match the carve (the texture gets the same)
        "voxels": packed,
    }
