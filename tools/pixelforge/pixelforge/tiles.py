"""Isometric ground tiles from a painted texture.

Godmarrow's floor is a 2:1 diamond grid (36 x 18 web px; the game draws at
``hr`` texels per web px, 2 by default, so a diamond is 72 x 36 texels).  Given
one painted ground texture (Midjourney "seamless top-down <material>", or any
square crop) this makes:

- ``variants``: N diamonds cut from different spots of the texture after it has
  been made seamless, so a floor of them never shows a repeat;
- ``transitions``: for a second texture, the 16 edge-bitmask tiles (N=1, E=2,
  S=4, W=8 are the edges where the second material shows) with a noisy, hard
  pixel boundary, so a path can run through grass or ash through stone.

Output: ``<name>.png`` (one row: variants, then the 16 transition tiles),
``<name>.json`` (tile size, counts, bitmask order) and ``<name>.tres`` (a Godot
``TileSet`` with an isometric atlas source, every tile registered).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from .pixelate import PixelateOptions, pixelate
from .vfx import periodic_noise


def make_seamless(rgb: np.ndarray) -> np.ndarray:
    """Offset-blend: roll by half and cross-fade along the seam lines."""
    h, w = rgb.shape[:2]
    rolled = np.roll(rgb, (h // 2, w // 2), axis=(0, 1)).astype(np.float32)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = np.minimum(xs, w - 1 - xs) / (w / 2)
    dy = np.minimum(ys, h - 1 - ys) / (h / 2)
    k = np.clip(np.minimum(dx, dy) * 2.5, 0, 1)[..., None]   # 1 away from the edges, 0 at them
    return (rgb.astype(np.float32) * k + rolled * (1 - k)).astype(np.uint8)


def diamond_mask(tw: int, th: int) -> np.ndarray:
    ys, xs = np.mgrid[0:th, 0:tw].astype(np.float32)
    u = np.abs((xs + 0.5) / tw * 2 - 1)
    v = np.abs((ys + 0.5) / th * 2 - 1)
    return (u + v) <= 1.0 + 1.0 / tw   # include the edge pixels, so neighbours meet with no hairline


def _cut(tex: np.ndarray, x0: int, y0: int, tw: int, th: int) -> np.ndarray:
    """A tw x th window of a seamless texture at (x0, y0), wrapping."""
    h, w = tex.shape[:2]
    ys = (np.arange(th) + y0) % h
    xs = (np.arange(tw) + x0) % w
    return tex[ys][:, xs]


def edge_field(tw: int, th: int, mask_bits: int, rng: np.random.Generator, wobble: float = 0.18) -> np.ndarray:
    """1 where the second material shows: within a noisy band of each flagged edge (N=1 E=2 S=4 W=8)."""
    ys, xs = np.mgrid[0:th, 0:tw].astype(np.float32)
    u = (xs + 0.5) / tw * 2 - 1
    v = (ys + 0.5) / th * 2 - 1
    # distance to the four diamond edges, 0 on the edge, 1 at the centre: N (u<0? no): N edge is top-right in screen
    # terms we use: N = top-right edge, E = bottom-right, S = bottom-left, W = top-left (clockwise from the top).
    d = {1: (u - v + 1) / 2, 2: (-u - v + 1) / 2, 4: (-u + v + 1) / 2, 8: (u + v + 1) / 2}
    n = periodic_noise(tw, th, 3, rng, octaves=3) - 0.5
    field = np.zeros((th, tw), dtype=np.float32)
    for bit, dist in d.items():
        if mask_bits & bit:
            field = np.maximum(field, (0.42 + n * wobble * 2) - dist)
    return (field > 0).astype(np.float32)


def make_tiles(
    texture: Image.Image | str,
    name: str,
    out_dir: str | Path,
    *,
    second: Image.Image | str | None = None,
    tile: tuple[int, int] = (72, 36),
    variants: int = 6,
    colors: int = 0,
    seed: int = 1,
    res_dir: str = "res://art/tiles",
) -> dict:
    rng = np.random.default_rng(seed)
    tw, th = tile

    def prep(img):
        if isinstance(img, str):
            img = Image.open(img)
        r = pixelate(img.convert("RGBA"), PixelateOptions(colors=colors, palette=None, dither="none", outline=None, crop=False, width=max(tw * 3, 128)))
        return make_seamless(np.asarray(r.image.convert("RGB")))

    a = prep(texture)
    b = prep(second) if second is not None else None
    mask = diamond_mask(tw, th)
    tiles: list[np.ndarray] = []
    h, w = a.shape[:2]
    for _ in range(variants):
        cut = _cut(a, int(rng.integers(0, w)), int(rng.integers(0, h)), tw, th)
        t = np.zeros((th, tw, 4), dtype=np.uint8)
        t[..., :3] = cut
        t[..., 3] = mask * 255
        tiles.append(t)
    n_trans = 0
    if b is not None:
        hb, wb = b.shape[:2]
        for bits in range(16):
            ca = _cut(a, int(rng.integers(0, w)), int(rng.integers(0, h)), tw, th)
            cb = _cut(b, int(rng.integers(0, wb)), int(rng.integers(0, hb)), tw, th)
            f = edge_field(tw, th, bits, rng)[..., None] if bits else np.zeros((th, tw, 1), np.float32)
            if bits == 15:
                f = np.ones((th, tw, 1), np.float32)
            t = np.zeros((th, tw, 4), dtype=np.uint8)
            t[..., :3] = (ca * (1 - f) + cb * f).astype(np.uint8)
            t[..., 3] = mask * 255
            tiles.append(t)
            n_trans += 1
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    strip = np.concatenate(tiles, axis=1)
    png = out / f"{name}.png"
    Image.fromarray(strip, "RGBA").save(png)
    meta = {"name": name, "tile": [tw, th], "variants": variants, "transitions": n_trans,
            "bitmask": "tile index = variants + bits; bits: N=1 (top-right edge) E=2 (bottom-right) S=4 (bottom-left) W=8 (top-left); 0 = all first material, 15 = all second",
            "source": "pixelforge"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    tres = out / f"{name}.tres"
    tres.write_text(tileset_tres(f"{res_dir.rstrip('/')}/{png.name}", tw, th, len(tiles)))
    return {"ok": True, "png": str(png), "json": str(out / f"{name}.json"), "tres": str(tres), "tiles": len(tiles), "tile": [tw, th]}


def tileset_tres(texture_res_path: str, tw: int, th: int, count: int) -> str:
    lines = [
        '[gd_resource type="TileSet" load_steps=3 format=3]', "",
        f'[ext_resource type="Texture2D" path="{texture_res_path}" id="1_tex"]', "",
        '[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]',
        'texture = ExtResource("1_tex")',
        f"texture_region_size = Vector2i({tw}, {th})",
    ]
    lines += [f"{i}:0/0 = 0" for i in range(count)]
    lines += ["", "[resource]", "tile_shape = 1", "tile_layout = 0", "tile_offset_axis = 0", f"tile_size = Vector2i({tw}, {th})",
              'sources/0 = SubResource("TileSetAtlasSource_1")', ""]
    return "\n".join(lines)
