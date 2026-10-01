"""Skin edits as operations: the same brushes a person uses in the skin editor, callable headlessly by an AI.

    apply_ops("views/front.png", [
        {"op": "recolor", "at": [220, 51], "to": "#5ae6d2", "range": 0.12, "radius": 30},   # one eye to teal
        {"op": "glow", "at": [220, 51], "color": "#9ff4ea", "radius": 10, "strength": 0.6},  # a soft light round it
        {"op": "paint", "at": [100, 300], "color": "#2a2630", "radius": 4},                 # a brush dab
        {"op": "erase", "region": "stray_bit"}, {"op": "restore", "at": [50, 50], "radius": 6},
        {"op": "region", "name": "eye_left", "polygon": [[210, 45], [232, 45], [232, 60], [210, 60]]},
    ])

Regions are named polygons kept in <image>.regions.json so later ops (and people) can target "the left eye" by name.
Every op keeps shading where that makes sense (recolor is an OKLab offset; glow lifts lightness with a soft falloff).
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .color import oklab_to_rgb, rgb_to_oklab
from .color_editor import select_like, shift_colors

OPS = ("recolor", "glow", "paint", "erase", "restore", "region", "lightness", "smooth")


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


def _target(rgba: np.ndarray, op: dict, regions: dict) -> np.ndarray:
    """The pixels an op works on: a region by name, a polygon, or a disc round a point; always only opaque pixels."""
    h, w = rgba.shape[:2]
    if "region" in op:
        poly = regions.get(op["region"])
        if poly is None:
            raise ValueError(f"no region named {op['region']!r}; known: {sorted(regions)}")
        m = region_mask((h, w), poly)
    elif "polygon" in op:
        m = region_mask((h, w), op["polygon"])
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
        regions[op["name"]] = [list(map(int, p)) for p in op["polygon"]]
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
        m = _disc((h, w), op["at"], float(op.get("radius", 6))) if "at" in op else region_mask((h, w), regions[op["region"]] if "region" in op else op["polygon"])
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
