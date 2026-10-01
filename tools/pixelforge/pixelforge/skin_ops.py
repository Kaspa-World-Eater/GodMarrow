"""Skin edits as operations: the same brushes a person uses in the skin editor, callable headlessly by an AI.

    apply_ops("views/front.png", [
        {"op": "recolor", "at": [220, 51], "to": "#5ae6d2", "range": 0.12, "radius": 30},   # one eye to teal
        {"op": "glow", "at": [220, 51], "color": "#9ff4ea", "radius": 10, "strength": 0.6},  # a soft light round it
        {"op": "paint", "at": [100, 300], "color": "#2a2630", "radius": 4},                 # a brush dab
        {"op": "erase", "region": "stray_bit"}, {"op": "restore", "at": [50, 50], "radius": 6},
        {"op": "region", "name": "eye_left", "polygon": [[210, 45], [232, 45], [232, 60], [210, 60]]},
        {"op": "region", "name": "eye_left", "mode": "add", "like": {"at": [214, 50], "range": 0.1}},   # Shift+click: add the patch of that colour
        {"op": "region", "name": "eye_left", "mode": "subtract", "polygon": [[220, 50], [224, 50], [224, 54], [220, 54]]},
        {"op": "clone", "from": [120, 200], "to": [160, 200], "radius": 8, "path": [[160, 200], [164, 203], [168, 206]]},  # the clone brush
    ])

Regions are named selections kept in <image>.regions.json so later ops (and people) can target "the left eye" by name.
A region is built the way a person builds a selection: polygons (lasso) and "like" patches (magic wand: the pixels of
one colour round a point), added with mode "add" (Shift+click in the editor) or taken away with mode "subtract"
(Alt+click); a plain polygon with no mode starts the region over. "clone" is the clone brush: it paints pixels copied
from an offset elsewhere in the picture (Alt+click sets the source, then paint), so repairs use the painting's own
colours. Every op keeps shading where that makes sense (recolor is an OKLab offset; glow lifts lightness with a soft
falloff).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .color import oklab_to_rgb, rgb_to_oklab
from .color_editor import select_like, shift_colors

OPS = ("recolor", "glow", "paint", "erase", "restore", "region", "lightness", "smooth", "clone")


def _hex(c) -> np.ndarray:
    if isinstance(c, str):
        c = c.lstrip("#")
        return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)
    return np.asarray(c, np.uint8)


def _disc(shape, at, radius: float) -> np.ndarray:
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    return (xx - at[0]) ** 2 + (yy - at[1]) ** 2 <= radius * radius


def _falloff(shape, at, radius: float) -> np.ndarray:
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    d = np.sqrt((xx - at[0]) ** 2 + (yy - at[1]) ** 2) / max(radius, 1e-6)
    return np.clip(1 - d, 0, 1) ** 1.5


def regions_path(image_path: str | Path) -> Path:
    p = Path(image_path)
    return p.with_name(p.stem + ".regions.json")


def load_regions(image_path: str | Path) -> dict:
    rp = regions_path(image_path)
    return json.loads(rp.read_text()) if rp.exists() else {}


def region_mask(shape, polygon) -> np.ndarray:
    im = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in polygon], fill=255)
    return np.asarray(im) > 0


def _like_mask(rgba: np.ndarray, like: dict) -> np.ndarray:
    """The magic wand: the pixels whose colour is like the one at `at` (OKLab distance `range`), the connected patch
    when `radius` is 0, else everything within `radius` of the point."""
    lab = rgb_to_oklab(rgba[..., :3]).astype(np.float32)
    x, y = int(like["at"][0]), int(like["at"][1])
    return select_like(lab, rgba[..., 3], lab[y, x], float(like.get("range", 0.1)), (x, y), int(like.get("radius", 0)))


def _piece_mask(rgba: np.ndarray, piece) -> np.ndarray:
    """One piece of a selection: a polygon (a list of points, or {"polygon": [...]}) or a magic-wand patch ({"like": {...}})."""
    h, w = rgba.shape[:2]
    if isinstance(piece, dict):
        if "like" in piece:
            return _like_mask(rgba, piece["like"])
        return region_mask((h, w), piece["polygon"])
    return region_mask((h, w), piece)


def resolve_region(rgba: np.ndarray, spec) -> np.ndarray:
    """A region's pixels. `spec` is a polygon (the old form) or {"add": [pieces], "subtract": [pieces]}: every added
    piece, less every subtracted one, in the order the dict keeps (add first, then subtract)."""
    if isinstance(spec, dict):
        m = np.zeros(rgba.shape[:2], bool)
        for piece in spec.get("add", []):
            m |= _piece_mask(rgba, piece)
        for piece in spec.get("subtract", []):
            m &= ~_piece_mask(rgba, piece)
        return m
    return region_mask(rgba.shape[:2], spec)


def _target(rgba: np.ndarray, op: dict, regions: dict) -> np.ndarray:
    """The pixels an op works on: a region by name, a polygon, a magic-wand patch, or a disc round a point; always only opaque pixels."""
    h, w = rgba.shape[:2]
    if "region" in op:
        spec = regions.get(op["region"])
        if spec is None:
            raise ValueError(f"no region named {op['region']!r}; known: {sorted(regions)}")
        m = resolve_region(rgba, spec)
    elif "polygon" in op:
        m = region_mask((h, w), op["polygon"])
    elif "like" in op:
        m = _like_mask(rgba, op["like"])
    elif "at" in op:
        m = _disc((h, w), op["at"], float(op.get("radius", 6)))
    else:
        m = np.ones((h, w), bool)
    return m & (rgba[..., 3] > 0)


def apply_op(rgba: np.ndarray, op: dict, regions: dict, raw: np.ndarray | None = None) -> np.ndarray:
    kind = op["op"]
    out = rgba.copy()
    h, w = rgba.shape[:2]
    if kind == "region":
        piece = {"like": dict(op["like"])} if "like" in op else {"polygon": [list(map(int, p)) for p in op["polygon"]]}
        mode = op.get("mode", "replace")
        if mode == "replace" or op["name"] not in regions:
            regions[op["name"]] = {"add": [piece], "subtract": []}
            return out
        spec = regions[op["name"]]
        if not isinstance(spec, dict):   # an old plain polygon becomes the first added piece
            spec = {"add": [{"polygon": spec}], "subtract": []}
        spec.setdefault("add", []).append(piece) if mode == "add" else spec.setdefault("subtract", []).append(piece)
        regions[op["name"]] = spec
        return out
    if kind == "clone":
        # the clone brush: pixels copied from `from` to `to` (the offset holds along the stroke, as a clone stamp does),
        # sampled from the picture as it was before the stroke, only where the source is painted
        fx, fy = float(op["from"][0]), float(op["from"][1])
        tx, ty = float(op["to"][0]), float(op["to"][1])
        dx, dy = int(round(fx - tx)), int(round(fy - ty))
        r = float(op.get("radius", 6))
        a = float(op.get("opacity", 1.0))
        soft = bool(op.get("soft", True))
        src = rgba
        for px, py in op.get("path") or [[tx, ty]]:
            m = _disc((h, w), (px, py), r)
            ys, xs = np.nonzero(m)
            sy, sx = ys + dy, xs + dx
            ok = (sy >= 0) & (sy < h) & (sx >= 0) & (sx < w)
            ys, xs, sy, sx = ys[ok], xs[ok], sy[ok], sx[ok]
            ok = src[sy, sx, 3] > 0
            ys, xs, sy, sx = ys[ok], xs[ok], sy[ok], sx[ok]
            if ys.size == 0:
                continue
            wgt = (_falloff((h, w), (px, py), r)[ys, xs] if soft else np.ones(ys.size, np.float32)) * a
            wgt = np.where(out[ys, xs, 3] == 0, 1.0, wgt)   # over bare canvas the copy lands whole
            out[ys, xs, :3] = (out[ys, xs, :3] * (1 - wgt[:, None]) + src[sy, sx, :3] * wgt[:, None] + 0.5).astype(np.uint8)
            out[ys, xs, 3] = np.maximum(out[ys, xs, 3], (src[sy, sx, 3] * np.clip(wgt * 2, 0, 1)).astype(np.uint8))
        return out
    if kind == "recolor":
        lab = rgb_to_oklab(rgba[..., :3]).astype(np.float32)
        if "at" in op:
            x, y = int(op["at"][0]), int(op["at"][1])
            src = lab[y, x]
            m = select_like(lab, rgba[..., 3], src, float(op.get("range", 0.1)), (x, y), int(op.get("radius", 0)))
        else:
            m = _target(rgba, op, regions)
            src = lab[m].mean(axis=0) if m.any() else lab[0, 0]
        dst = rgb_to_oklab(_hex(op["to"])[None, None])[0, 0].astype(np.float32) if "to" in op else None
        return shift_colors(rgba, m, src, dst, float(op.get("lightness", 0)), float(op.get("chroma", 1)), float(op.get("hue", 0)))
    if kind == "lightness":
        m = _target(rgba, op, regions)
        lab = rgb_to_oklab(rgba[..., :3]).astype(np.float32)
        return shift_colors(rgba, m, lab[0, 0], None, float(op.get("amount", 0.1)), float(op.get("chroma", 1)), float(op.get("hue", 0)))
    if kind == "glow":
        at = op["at"]
        r = float(op.get("radius", 8))
        k = float(op.get("strength", 0.5))
        col = rgb_to_oklab(_hex(op.get("color", "#ffffff"))[None, None])[0, 0]
        fall = _falloff((h, w), at, r) * k
        m = (fall > 0.01) & (rgba[..., 3] > 0)
        lab = rgb_to_oklab(rgba[..., :3][m]).astype(np.float32)
        f = fall[m][:, None]
        lab = lab * (1 - f) + col[None, :] * f           # toward the glow colour
        lab[:, 0] = np.clip(lab[:, 0] + 0.25 * fall[m], 0, 1)   # and lighter
        out[..., :3][m] = oklab_to_rgb(lab)
        if op.get("spill", True):   # the glow may spill a little past the edge, as light does
            spill = (fall > 0.35) & (rgba[..., 3] == 0)
            out[..., :3][spill] = _hex(op.get("color", "#ffffff"))
            out[..., 3][spill] = (fall[spill] * 180).astype(np.uint8)
        return out
    if kind == "paint":
        m = _target(rgba, op, regions) if "region" in op or "polygon" in op else _disc((h, w), op["at"], float(op.get("radius", 4)))
        col = _hex(op["color"])
        a = float(op.get("opacity", 1.0))
        out[..., :3][m] = (rgba[..., :3][m] * (1 - a) + col * a).astype(np.uint8)
        out[..., 3][m] = np.maximum(rgba[..., 3][m], 255 if a >= 1 else rgba[..., 3][m])
        return out
    if kind == "erase":
        m = _target(rgba, op, regions) if "region" in op or "polygon" in op else _disc((h, w), op["at"], float(op.get("radius", 6)))
        out[..., 3][m] = 0
        return out
    if kind == "restore":
        if raw is None:
            raise ValueError("restore needs the raw crop (<image>_raw.png) next to the image")
        m = _disc((h, w), op["at"], float(op.get("radius", 6))) if "at" in op else (resolve_region(rgba, regions[op["region"]]) if "region" in op else region_mask((h, w), op["polygon"]))
        out[..., :3][m] = raw[..., :3][m]
        out[..., 3][m] = 255
        return out
    if kind == "smooth":
        from scipy import ndimage

        m = _target(rgba, op, regions)
        blurred = ndimage.gaussian_filter(rgba[..., :3].astype(np.float32), sigma=(float(op.get("sigma", 1.0)), float(op.get("sigma", 1.0)), 0))
        out[..., :3][m] = np.clip(blurred[m], 0, 255).astype(np.uint8)
        return out
    raise ValueError(f"unknown op {kind!r}; ops: {OPS}")


def apply_ops(image_path: str | Path, ops: list[dict], out_path: str | Path | None = None, backup: bool = True) -> dict:
    """Apply ops in order to the image; writes it back (or to out_path). A .bak of the first edit is kept."""
    p = Path(image_path)
    rgba = np.array(Image.open(p).convert("RGBA"))
    rawp = p.with_name(p.stem + "_raw.png")
    raw = None
    if rawp.exists():
        raw = np.array(Image.open(rawp).convert("RGBA").resize((rgba.shape[1], rgba.shape[0]), Image.LANCZOS))
    regions = load_regions(p)
    for op in ops:
        rgba = apply_op(rgba, op, regions, raw)
    dst = Path(out_path) if out_path else p
    if backup and dst == p:
        bak = p.with_suffix(p.suffix + ".bak")
        if not bak.exists():
            shutil.copy(p, bak)
    Image.fromarray(rgba, "RGBA").save(dst)
    if regions:
        regions_path(p).write_text(json.dumps(regions, indent=1))
    return {"ok": True, "image": str(dst), "ops": len(ops), "regions": sorted(regions)}
