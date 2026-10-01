"""Portraits and busts from the front view: head-and-shoulders crops at two or three sizes, same palette lock,
optional frame. For dialogue boxes, the character panel, the title roster."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from .cleanup import add_outline, pad
from .pixelate import PixelateOptions, pixelate


def bust_box(rgba: np.ndarray, head_fraction: float = 0.34) -> tuple[int, int, int, int]:
    """x0, y0, x1, y1 of the head-and-shoulders: the top ``head_fraction`` of the figure, widened to the shoulders."""
    ys, xs = np.nonzero(rgba[..., 3])
    top, bottom = ys.min(), ys.max()
    h = bottom - top + 1
    y1 = top + int(h * head_fraction)
    band = rgba[top:y1, :, 3] > 0
    cols = np.nonzero(band.any(axis=0))[0]
    x0, x1 = cols.min(), cols.max() + 1
    w = x1 - x0
    # square-ish: widen to the crop height
    side = max(w, y1 - top)
    cx = (x0 + x1) // 2
    return int(max(0, cx - side // 2)), int(top), int(min(rgba.shape[1], cx + side // 2)), int(y1)


def make_portrait(front: str | Path | Image.Image, name: str, out_dir: str | Path, *, sizes=(48, 96), colors: int = 0,
                  outline: bool = True, head_fraction: float = 0.34, frame: tuple[int, int, int] | None = None) -> dict:
    im = Image.open(front) if not isinstance(front, Image.Image) else front
    rgba = np.asarray(im.convert("RGBA"))
    x0, y0, x1, y1 = bust_box(rgba, head_fraction)
    crop = rgba[y0:y1, x0:x1]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    written = {}
    for size in sizes:
        opts = PixelateOptions(colors=colors, palette=None, dither="none", outline=None, crop=False, height=size - (4 if outline else 2))
        px = np.asarray(pixelate(Image.fromarray(np.ascontiguousarray(crop), "RGBA"), opts).image.convert("RGBA"))
        if outline:
            px = add_outline(px, (0, 0, 0))
        canvas = np.zeros((size, size, 4), np.uint8)
        if frame is not None:
            canvas[..., :3] = frame
            canvas[..., 3] = 255
            canvas[2:-2, 2:-2, 3] = 0
        h, w = px.shape[:2]
        h, w = min(h, size), min(w, size)
        oy, ox = (size - h) // 2, (size - w) // 2
        region = canvas[oy:oy + h, ox:ox + w]
        a = px[:h, :w, 3:4] > 0
        region[...] = np.where(a, px[:h, :w], region)
        p = out / f"{name}_portrait_{size}.png"
        Image.fromarray(canvas, "RGBA").save(p)
        written[size] = str(p)
    return {"ok": True, "box": [x0, y0, x1, y1], "files": written}
