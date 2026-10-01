"""Recolour finished sprites without re-rendering: champion / unique tints, seasonal variants, team colours.

Three ways, all in OKLab so dark teals and greens survive:

- ``mapping``: explicit pairs ``{"#1d4a4c": "#4a3a1d", ...}``; every pixel goes to the colour whose source it is
  nearest to (so a 300-colour atlas can be driven by a 5-colour map);
- ``hue`` (degrees) / ``lightness`` (multiplier) / ``chroma`` (multiplier): a global shift;
- ``palette_from`` + ``palette_to``: two ``.hex`` files of equal length, matched by index.

For a Godmarrow set, ``recolor_set(kind, suffix)`` copies ``<kind>.json`` to ``<kind><suffix>.json`` with the
sheet name changed, so ``@champion`` / ``@unique`` skins drop in next to the base one.
"""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

from .color import hex_to_rgb, oklab_to_rgb, rgb_to_oklab


def _read_hex(path: str | Path) -> list[str]:
    return [l.strip() for l in Path(path).read_text().splitlines() if l.strip() and not l.startswith("#;")]


def recolor_image(rgba: np.ndarray, *, mapping: dict[str, str] | None = None, hue: float = 0.0, lightness: float = 1.0, chroma: float = 1.0,
                  palette_from: list[str] | None = None, palette_to: list[str] | None = None) -> np.ndarray:
    out = rgba.copy()
    opaque = rgba[..., 3] > 0
    if not opaque.any():
        return out
    lab = rgb_to_oklab(rgba[..., :3][opaque])
    if palette_from and palette_to:
        mapping = {**(mapping or {}), **dict(zip(palette_from, palette_to))}
    if mapping:
        src = rgb_to_oklab(np.array([hex_to_rgb(k) for k in mapping], dtype=np.uint8))
        dst = rgb_to_oklab(np.array([hex_to_rgb(v) for v in mapping.values()], dtype=np.uint8))
        d = ((lab[:, None, :] - src[None, :, :]) ** 2).sum(-1)
        i = d.argmin(1)
        # keep each pixel's own shading: move it by the (dst - src) offset of its nearest source colour
        lab = lab + (dst[i] - src[i])
    if hue or lightness != 1.0 or chroma != 1.0:
        L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
        th = math.radians(hue)
        a2 = (a * math.cos(th) - b * math.sin(th)) * chroma
        b2 = (a * math.sin(th) + b * math.cos(th)) * chroma
        lab = np.stack([np.clip(L * lightness, 0, 1), a2, b2], axis=1)
    out[..., :3][opaque] = oklab_to_rgb(lab)
    return out


def recolor_file(src: str | Path, dst: str | Path, **kw) -> dict:
    im = np.asarray(Image.open(src).convert("RGBA"))
    out = recolor_image(im, **kw)
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(out, "RGBA").save(dst)
    return {"ok": True, "png": str(dst)}


def recolor_set(sprites_dir: str | Path, kind: str, suffix: str, **kw) -> dict:
    """``art/sprites/<kind>.png|json`` -> ``<kind><suffix>.png|json`` (and the _normal/_depth sets are shared)."""
    sprites_dir = Path(sprites_dir)
    src_json = sprites_dir / f"{kind}.json"
    data = json.loads(src_json.read_text())
    made = []
    for sheet in data["sheets"]:
        new_sheet = sheet.replace(f"{kind}", f"{kind}{suffix}", 1)
        recolor_file(sprites_dir / sheet, sprites_dir / new_sheet, **kw)
        made.append(new_sheet)
    data["sheets"] = made
    data.setdefault("meta", {})["variant_of"] = kind
    (sprites_dir / f"{kind}{suffix}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    return {"ok": True, "json": str(sprites_dir / f"{kind}{suffix}.json"), "sheets": made}
