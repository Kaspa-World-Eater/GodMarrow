"""Item icons from one painted "flat lay" (prompt D or a 3x3 / 4x4 grid of items on a plain background).

Finds each object (connected patches after background removal, read left-to-right, top-to-bottom), fits it
into its inventory cell(s) and writes, per item, ``<id>@1x.png`` at the art size and ``<id>.png`` at the
screen size (Godmarrow: 12 art px per cell, 4x -> 48 px; ``icons.json`` records ``{base, grid, px}``).

``names`` gives the ids in reading order, each with an optional grid ``"sword:1x3,ring,hood:2x2"``.
"""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

from .cleanup import add_outline, background_mask, border_color, defringe
from .color import rgb_to_oklab
from .pixelate import PixelateOptions, pixelate


def label_components(mask: np.ndarray, min_pixels: int) -> list[tuple[int, int, int, int]]:
    """Bounding boxes (x0, y0, x1, y1) of connected opaque patches with at least ``min_pixels``, reading order."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    boxes = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                q = deque([(y, x)])
                seen[y, x] = True
                n, x0, y0, x1, y1 = 0, x, y, x, y
                while q:
                    cy, cx = q.popleft()
                    n += 1
                    x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1), (cy - 1, cx - 1), (cy - 1, cx + 1), (cy + 1, cx - 1), (cy + 1, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if n >= min_pixels:
                    boxes.append((x0, y0, x1 + 1, y1 + 1))
    # reading order: rows by centre y (banded by the median box height), then x
    if not boxes:
        return []
    band = max(1, int(np.median([b[3] - b[1] for b in boxes]) * 0.6))
    return sorted(boxes, key=lambda b: (((b[1] + b[3]) // 2) // band, (b[0] + b[2]) // 2))


def _merge_overlaps(boxes: list[tuple[int, int, int, int]], gap: int) -> list[tuple[int, int, int, int]]:
    """Join boxes that touch or overlap (a sword and its gem, a bow and its string)."""
    boxes = list(boxes)
    changed = True
    while changed:
        changed = False
        out: list = []
        for b in boxes:
            for i, o in enumerate(out):
                if b[0] < o[2] + gap and o[0] < b[2] + gap and b[1] < o[3] + gap and o[1] < b[3] + gap:
                    out[i] = (min(b[0], o[0]), min(b[1], o[1]), max(b[2], o[2]), max(b[3], o[3]))
                    changed = True
                    break
            else:
                out.append(b)
        boxes = out
    return boxes


def make_icons(
    image: Image.Image | str,
    out_dir: str | Path,
    names: list[str] | None = None,
    *,
    cell_art: int = 12,
    scale: int = 4,
    tolerance: float = 0.08,
    outline: bool = True,
    colors: int = 0,
    manifest: str | Path | None = "icons.json",
    min_fraction: float = 0.002,
) -> dict:
    if isinstance(image, str):
        image = Image.open(image)
    rgb = np.asarray(image.convert("RGB"))
    lab = rgb_to_oklab(rgb)
    bg_color = border_color(lab)
    bg = background_mask(lab, tolerance, bg_color)
    alpha = defringe(np.where(bg, 0, 255).astype(np.uint8), lab, bg_color, tolerance)
    mask = alpha > 0
    boxes = _merge_overlaps(label_components(mask, int(mask.size * min_fraction)), gap=max(4, rgb.shape[1] // 100))
    boxes = sorted(boxes, key=lambda b: (b[1] // max(1, int(np.median([x[3] - x[1] for x in boxes]) * 0.6)), b[0])) if boxes else []
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    specs = []
    for i, b in enumerate(boxes):
        spec = names[i] if names and i < len(names) else f"item_{i + 1:02d}"
        name, _, grid = spec.partition(":")
        gw, gh = (int(v) for v in grid.lower().split("x")) if grid else (1, 1)
        specs.append((name, gw, gh, b))
    written = {}
    for name, gw, gh, (x0, y0, x1, y1) in specs:
        crop = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
        aw, ah = cell_art * gw, cell_art * gh
        inner_w, inner_h = aw - (2 if outline else 0), ah - (2 if outline else 0)
        opts = PixelateOptions(colors=colors, palette=None, dither="none", outline=None, crop=True)
        if (x1 - x0) / (y1 - y0) > inner_w / inner_h:
            opts.width = inner_w
        else:
            opts.height = inner_h
        small = np.asarray(pixelate(Image.fromarray(np.ascontiguousarray(crop), "RGBA"), opts).image.convert("RGBA"))
        if outline:
            small = add_outline(small, (0, 0, 0))
        canvas = np.zeros((ah, aw, 4), dtype=np.uint8)
        sh, sw = small.shape[:2]
        sh, sw = min(sh, ah), min(sw, aw)
        oy, ox = (ah - sh) // 2, (aw - sw) // 2
        canvas[oy:oy + sh, ox:ox + sw] = small[:sh, :sw]
        Image.fromarray(canvas, "RGBA").save(out / f"{name}@1x.png")
        Image.fromarray(canvas, "RGBA").resize((aw * scale, ah * scale), Image.NEAREST).save(out / f"{name}.png")
        written[name] = {"base": name, "grid": [gw, gh], "px": [aw * scale, ah * scale]}
    if manifest:
        mp = out / manifest
        data = json.loads(mp.read_text()) if mp.exists() else {"web_cell_art_px": cell_art, "screen_px_per_art_px": scale, "cell_px": cell_art * scale, "icons": {}}
        data.setdefault("icons", {}).update(written)
        mp.write_text(json.dumps(data, indent=1) + "\n")
    return {"ok": True, "dir": str(out), "found": len(boxes), "icons": written}
