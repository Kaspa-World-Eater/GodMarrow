"""Nine-slice UI panels from a painted frame.

Give it a Midjourney panel/frame image (prompt kind ``ui``) and it finds the
border width (where the rows and columns stop changing), writes a small
``<name>.png`` that keeps the corners and a short run of each edge, and a Godot
``StyleBoxTexture`` ``<name>.tres`` with the texture margins set, ready for a
``Panel`` or ``PanelContainer`` theme override.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from .color import rgb_to_oklab
from .pixelate import PixelateOptions, pixelate


def detect_border(rgba: np.ndarray, tolerance: float = 0.03) -> tuple[int, int, int, int]:
    """left, top, right, bottom: how far in from each edge the image keeps changing (OKLab row/col deltas)."""
    lab = rgb_to_oklab(rgba[..., :3])
    h, w = lab.shape[:2]

    def run(axis: int, reverse: bool) -> int:
        lines = np.moveaxis(lab, axis, 0)
        if reverse:
            lines = lines[::-1]
        n = lines.shape[0]
        last = 0
        for i in range(1, n // 2):
            d = np.abs(lines[i] - lines[i - 1]).sum(axis=-1).mean()
            if d > tolerance:
                last = i
        return min(max(last, 1), n // 2 - 1)

    return run(1, False), run(0, False), run(1, True), run(0, True)


def make_ui9(
    image: Image.Image | str,
    name: str,
    out_dir: str | Path,
    *,
    border: tuple[int, int, int, int] | None = None,
    width: int | None = None,
    colors: int = 0,
    mid: int = 8,
    res_dir: str = "res://art/ui",
) -> dict:
    if isinstance(image, str):
        image = Image.open(image)
    opts = PixelateOptions(colors=colors, palette=None, dither="none", outline=None, crop=False, scale=1.0)
    if width:
        opts.scale = "auto"
        opts.width = width
    rgba = np.asarray(pixelate(image.convert("RGBA"), opts).image.convert("RGBA"))
    l, t, r, b = border or detect_border(rgba)
    h, w = rgba.shape[:2]
    # keep corners + `mid` px of each edge/centre so the texture stays small
    cols = list(range(0, l)) + list(range(l, min(l + mid, w - r))) + list(range(w - r, w))
    rows = list(range(0, t)) + list(range(t, min(t + mid, h - b))) + list(range(h - b, h))
    small = rgba[rows][:, cols]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    png = out / f"{name}.png"
    Image.fromarray(np.ascontiguousarray(small), "RGBA").save(png)
    tres = out / f"{name}.tres"
    tres.write_text(stylebox_tres(f"{res_dir.rstrip('/')}/{png.name}", l, t, r, b))
    meta = {"name": name, "size": [int(small.shape[1]), int(small.shape[0])], "margins": {"left": l, "top": t, "right": r, "bottom": b}, "source": "pixelforge"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    return {"ok": True, "png": str(png), "tres": str(tres), "json": str(out / f"{name}.json"), **meta}


def stylebox_tres(texture_res_path: str, l: int, t: int, r: int, b: int) -> str:
    return "\n".join([
        '[gd_resource type="StyleBoxTexture" load_steps=2 format=3]', "",
        f'[ext_resource type="Texture2D" path="{texture_res_path}" id="1_tex"]', "",
        "[resource]", 'texture = ExtResource("1_tex")',
        f"texture_margin_left = {l}.0", f"texture_margin_top = {t}.0", f"texture_margin_right = {r}.0", f"texture_margin_bottom = {b}.0",
        "axis_stretch_horizontal = 1", "axis_stretch_vertical = 1",   # tile the edges: pixel art, no stretching blur
        "",
    ])
