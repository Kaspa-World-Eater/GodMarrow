"""Props, trees and objects: one painted sheet -> game-ready sprites with footprints.

A prop is simpler than a character: no rig, no directions.  What it needs is a
clean cutout at the game's scale, a 1 px outline, a 2 px transparent margin
(so outline shaders don't clip), a **footprint** (where it stands on the iso
grid, for Y-sorting and collision) and, for trees and banners, a looping sway.

Prompt D (`pixelforge prompt --kind item`) or a 2x2 "four variations" sheet
feed this.  Output goes to ``art/objects/<name>/`` in the game's layout:
``<name>.png`` (the sprite or the frames packed in a row), ``<name>.json``
(size, anchor, footprint, frames, fps).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import cleanup
from .animate import Sway, animate
from .color import rgb_to_oklab
from .pixelate import PixelateOptions, pixelate
from .sheet import View, cutout, split_sheet


def _footprint(rgba: np.ndarray, base_fraction: float = 0.12) -> dict:
    """Ground ellipse from the bottom slice of the silhouette: centre x, width,
    and the anchor row (the lowest opaque pixel)."""
    alpha = rgba[..., 3] > 0
    ys, xs = np.nonzero(alpha)
    if len(ys) == 0:
        return {"anchor": [0, 0], "ellipse": [0, 0, 1, 1]}
    bottom = ys.max()
    band = alpha[max(0, int(bottom - rgba.shape[0] * base_fraction)) : bottom + 1]
    bx = np.nonzero(band.any(axis=0))[0]
    cx = int((bx.min() + bx.max()) / 2) if len(bx) else int(xs.mean())
    w = int(bx.max() - bx.min() + 1) if len(bx) else int(xs.max() - xs.min() + 1)
    return {"anchor": [cx, int(bottom)], "ellipse": [cx, int(bottom), w, max(4, w // 2)]}  # cx, cy, w, h (2:1 iso)


def make_prop(
    image: Image.Image | str,
    name: str,
    out_dir: str | Path,
    *,
    height: int | None = None,
    scale: float | None = None,
    colors: int = 0,
    outline: bool = True,
    sway: str | None = None,  # None | "canopy" | "banner" | "flame"
    frames: int = 8,
    fps: float = 6.0,
    tolerance: float = 0.08,
    variations: int = 1,
) -> dict:
    """Cut a prop (or a sheet of ``variations`` props) out of a painting and
    write game-ready sprites.  ``height`` = target sprite height in px, or
    ``scale`` = source px per sprite px (use the project's character scale so
    props and characters agree)."""
    if isinstance(image, str):
        image = Image.open(image)
    out = Path(out_dir) / name
    out.mkdir(parents=True, exist_ok=True)
    if variations > 1:
        views = split_sheet(image, names=[f"v{i + 1}" for i in range(variations)], tolerance=tolerance, expected=variations)
    else:
        rgba = cutout(image, tolerance)
        views = [View("v1", Image.fromarray(np.ascontiguousarray(rgba), "RGBA"), (0, 0, image.width, image.height))]
    written = {}
    for v in views:
        src = np.asarray(v.image.convert("RGBA"))
        ys, xs = np.nonzero(src[..., 3])
        src = src[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
        src_im = Image.fromarray(np.ascontiguousarray(src), "RGBA")
        opts = PixelateOptions(colors=colors, palette=None, dither="none", outline="auto" if outline else None, crop=True)
        if scale:
            opts.scale = scale
        else:
            opts.height = height or 96
        r = pixelate(src_im, opts)
        sprite = cleanup.pad(np.asarray(r.image), 2)
        foot = _footprint(sprite)
        entry = {"size": [int(sprite.shape[1]), int(sprite.shape[0])], **foot, "frames": 1, "fps": 0}
        if sway:
            effects = {
                "canopy": [Sway(1.5, anchor="bottom", box=(0, 0, 1, 0.75), wavelength=1.2, power=1.5)],
                "banner": [Sway(2.0, anchor="top", box=(0, 0.2, 1, 1), wavelength=0.7)],
                "flame": [Sway(2.0, anchor="bottom", wavelength=0.5, cycles=2)],
            }[sway]
            seq = animate(sprite, effects, frames)
            w, h = seq[0].shape[1], seq[0].shape[0]
            strip = np.zeros((h, w * len(seq), 4), dtype=np.uint8)
            for i, f in enumerate(seq):
                strip[:, i * w : (i + 1) * w] = f
            Image.fromarray(strip, "RGBA").save(out / f"{name}_{v.name}.png")
            dx, dy = (w - sprite.shape[1]) // 2, (h - sprite.shape[0]) // 2
            entry.update({"size": [w, h], "anchor": [foot["anchor"][0] + dx, foot["anchor"][1] + dy], "frames": len(seq), "fps": fps, "frame_width": w})
        else:
            Image.fromarray(sprite, "RGBA").save(out / f"{name}_{v.name}.png")
        written[v.name] = entry
    meta = {"name": name, "variations": written, "outline": outline, "sway": sway, "source": "pixelforge"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    return {"ok": True, "name": name, "dir": str(out), "variations": written}
