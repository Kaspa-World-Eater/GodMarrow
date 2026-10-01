"""Iso tiles from rendered ground patches (``blender/render_ground.py``): cut grid-aligned 2:1 diamonds out of a
lit patch, grade them like the props, and build the 16 edge-transition tiles between two materials rendered on
the same geometry (same seed), so light and relief stay continuous across the join.

    pixelforge tiles3d grass stone moor_grass -o art/tiles [--tiles 4 --seed 1]
"""

from __future__ import annotations

import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

from . import api
from .grade import Target, grade
from .tiles import diamond_mask, edge_field, tileset_tres


def render_patch(material: str, out_png: Path, *, seed: int, tiles: int, tile_m: float, ppu: float, blender: str | None = None) -> dict:
    exe = blender or api.find_blender(None)
    if exe is None:
        raise api.StepError("Blender was not found")
    script = Path(__file__).resolve().parent / "blender" / "render_ground.py"
    proc = subprocess.run([exe, "-b", "--python", str(script), "--", "--out", str(out_png), "--material", material, "--seed", str(seed),
                           "--tiles", str(tiles), "--tile-m", str(tile_m), "--ppu", str(ppu)], capture_output=True, text=True)
    ok = [l for l in (proc.stdout + proc.stderr).splitlines() if l.startswith("PF_OK")]
    if not ok:
        raise api.StepError("ground render failed: " + (proc.stdout + proc.stderr)[-800:])
    kv = dict(part.split("=", 1) for part in ok[-1].split()[1:])
    return {"tile_w": float(kv["tile_w"]), "tile_h": float(kv["tile_h"]), "size": kv["size"]}


def cut_diamonds(patch: np.ndarray, tiles: int, tile_w: float, tile_h: float) -> list[np.ndarray]:
    """Grid-aligned diamonds. The patch is an iso diamond of `tiles` x `tiles` cells; cell (i, j) centre is
    at (cx + (i - j) * tw/2, cy + (i + j) * th/2) from the top corner."""
    H, W = patch.shape[:2]
    tw, th = int(round(tile_w)), int(round(tile_h))
    tw -= tw % 2
    th -= th % 2
    mask = diamond_mask(tw, th)
    top_x, top_y = W / 2, (H - tiles * th) / 2
    out = []
    for j in range(tiles):
        for i in range(tiles):
            cx = top_x + (i - j) * tw / 2
            cy = top_y + (i + j + 1) * th / 2
            x0, y0 = int(round(cx - tw / 2)), int(round(cy - th / 2))
            if x0 < 0 or y0 < 0 or x0 + tw > W or y0 + th > H:
                continue
            t = patch[y0:y0 + th, x0:x0 + tw].copy()
            t[..., 3] = np.where(mask, t[..., 3], 0)
            if ((t[..., 3] > 0) & mask).sum() / mask.sum() > 0.9:
                out.append(t)
    return out


def make_tiles3d(material: str, second: str | None, name: str, out_dir: str | Path, *, tiles: int = 4, seed: int = 1, tile_m: float = 0.471,
                 ppu: float = 108.0, target: Target | None = None, res_dir: str = "res://art/tiles", blender: str | None = None, keep_patch: bool = True) -> dict:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    work = out / "_patches"
    work.mkdir(exist_ok=True)
    pa = work / f"{name}_{material}.png"
    info = render_patch(material, pa, seed=seed, tiles=tiles, tile_m=tile_m, ppu=ppu, blender=blender)
    A = grade(np.asarray(Image.open(pa).convert("RGBA")), target or Target(), grain=0.02)
    tw, th = info["tile_w"], info["tile_h"]
    variants = cut_diamonds(A, tiles, tw, th)
    all_tiles = list(variants)
    n_trans = 0
    if second:
        pb = work / f"{name}_{second}.png"
        render_patch(second, pb, seed=seed, tiles=tiles, tile_m=tile_m, ppu=ppu, blender=blender)
        B = grade(np.asarray(Image.open(pb).convert("RGBA")), target or Target(), grain=0.02)
        vb = cut_diamonds(B, tiles, tw, th)
        rng = np.random.default_rng(seed)
        for bits in range(16):
            k = bits % len(variants)
            ta, tb = variants[k], vb[k]
            h, w = ta.shape[:2]
            f = np.ones((h, w, 1), np.float32) if bits == 15 else (edge_field(w, h, bits, rng)[..., None] if bits else np.zeros((h, w, 1), np.float32))
            t = ta.copy()
            t[..., :3] = (ta[..., :3] * (1 - f) + tb[..., :3] * f).astype(np.uint8)
            all_tiles.append(t)
            n_trans += 1
    strip = np.concatenate(all_tiles, axis=1)
    png = out / f"{name}.png"
    Image.fromarray(strip, "RGBA").save(png)
    h, w = all_tiles[0].shape[:2]
    meta = {"name": name, "tile": [w, h], "variants": len(variants), "transitions": n_trans, "material": material, "second": second,
            "bitmask": "index = variants + bits; N=1 (top-right edge) E=2 (bottom-right) S=4 (bottom-left) W=8 (top-left)", "source": "pixelforge tiles3d", "lit": "same rig as prop3d"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    (out / f"{name}.tres").write_text(tileset_tres(f"{res_dir.rstrip('/')}/{png.name}", w, h, len(all_tiles)))
    if not keep_patch:
        pa.unlink(missing_ok=True)
    return {"ok": True, "png": str(png), "tiles": len(all_tiles), "tile": [w, h], "variants": len(variants)}
