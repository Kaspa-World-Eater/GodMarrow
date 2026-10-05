"""Colour nodes: ramps, painting a field into pixels, the OKLab palette lock, palette cycling and ordered dither.

A **ramp** is a dark -> bright list of hex colours; ``bands`` steps of it make the LUT. Painting maps a driver field
(the coverage itself, or a bundle's age / height / dist) through the LUT and uses the coverage as alpha, cut hard at
``cut`` so a sheet has no soft alpha unless a node asks for a glow. Every colour that leaves ``paint`` is a ramp
colour; ``palette_lock`` snaps any image to a palette by OKLab distance.
"""
from __future__ import annotations

import numpy as np

from ..color import hex_to_rgb, oklab_to_rgb, rgb_to_oklab
from .graph import Context, Field, node

# the game's colours, dark -> bright, plus the ones the new effects need
PALETTES: dict[str, list[str]] = {
    "wisp": ["#0b1c20", "#1d4a4c", "#3f9c92", "#8fe3d2", "#eafff8"],
    "lantern": ["#2a1206", "#7a3d10", "#d08a2a", "#f3c75c", "#fff1b0"],
    "fire": ["#1a0604", "#5a1408", "#b8400e", "#e8862a", "#f6c75a", "#fff3c4"],
    "soul_fire": ["#031208", "#0b3d1e", "#1f8a3c", "#5fd36a", "#b8ffb0", "#f0fff0"],
    "phosphorus": ["#061410", "#0f3a2c", "#2e8c6a", "#7fe0b8", "#d4fff0", "#ffffff"],
    "miasma": ["#140b1e", "#3a1f52", "#6d3f9a", "#a97fd1", "#e3d2f5"],
    "bone": ["#1a1712", "#4a4336", "#8f8470", "#c9bfa6", "#f0ead8"],
    "marrow": ["#1a1712", "#5a4a30", "#b08a40", "#f0c860", "#fff4c0"],
    "smoke": ["#1a1b1f", "#2e3036", "#45484f", "#5c6068", "#767a83"],
    "ash": ["#121214", "#2a2a2e", "#4a4a50", "#6e6e76", "#9a9aa2"],
    "blood": ["#140202", "#300606", "#480a0a", "#5c1010", "#701616", "#8c2020"],
    "frost": ["#0a1424", "#1c3a5c", "#3d7aa8", "#8cc8e8", "#e0f6ff"],
    "amber": ["#2a1a04", "#6a4210", "#b8802a", "#e8b84a", "#fff0b0"],
    "iron": ["#141416", "#2c2c30", "#505058", "#80808a", "#b0b0b8"],
    "silver": ["#1c1c22", "#44444e", "#80808c", "#c0c0cc", "#f4f4ff"],
    "poison": ["#0a1404", "#1e3a08", "#3e7a12", "#7ab822", "#c8f060"],
    "holy": ["#2a2208", "#7a6420", "#d0b050", "#f4e4a0", "#fffbe8"],
    "paper": ["#2a2418", "#6a5c3a", "#a89a70", "#d8ccaa", "#f4ecd8"],
    "rain": ["#0c141c", "#1c2c3c", "#3c5468", "#6c8ca0", "#a8c8d8"],
    "water": ["#061420", "#0e3048", "#1e5c80", "#4a9cc0", "#a0e0f0", "#f0fcff"],
    "white": ["#303030", "#707070", "#b0b0b0", "#e0e0e0", "#ffffff"],
    "black": ["#000000", "#080808", "#101010", "#181818", "#202020"],
    "unlight": ["#000000", "#08020e", "#180826", "#2c1246", "#4a2470"],
    "arc": ["#101830", "#2c3c80", "#6c80d0", "#b8c8ff", "#ffffff"],
    "saber": ["#200810", "#6c1030", "#c02858", "#f06090", "#ffd0e0"],
    "spark": ["#2a1a04", "#8a4a10", "#e89020", "#ffd060", "#fffbe0"],
    "ooze": ["#0a1008", "#1c2e14", "#3a5a28", "#7a9a40", "#d0e080"],
    "mouth": ["#1a0608", "#3c0c14", "#6c1424", "#a82838", "#e8a0a8"],
}


def palette(name_or_list) -> list[str]:
    if isinstance(name_or_list, str):
        if name_or_list in PALETTES:
            return list(PALETTES[name_or_list])
        return [c.strip() for c in name_or_list.split(",") if c.strip()]
    return [str(c) for c in name_or_list]


def make_lut(colours: list[str], bands: int) -> np.ndarray:
    """``bands`` colours stepped evenly along the ramp in OKLab (so the mid steps look mid)."""
    lab = rgb_to_oklab(np.array([hex_to_rgb(c) for c in colours], np.uint8))
    n = max(2, int(bands))
    pos = np.linspace(0, len(colours) - 1, n)
    i0 = np.floor(pos).astype(int)
    i1 = np.minimum(i0 + 1, len(colours) - 1)
    f = (pos - i0)[:, None]
    return oklab_to_rgb(lab[i0] * (1 - f) + lab[i1] * f)


BAYER4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16.0 - 0.5 + 1 / 32


def ordered_dither(field: Field, strength: float = 0.5, cells: int = 4) -> Field:
    """Bayer threshold pattern added before banding: the bands' borders become checker patterns."""
    T, H, W = field.shape
    tile = np.tile(BAYER4, (H // 4 + 1, W // 4 + 1))[:H, :W]
    return np.clip(field + tile[None] * strength / max(cells, 1), 0, 1).astype(np.float32)


@node("ramp", "colour", "A dark -> bright ramp: a palette name (fire, soul_fire, phosphorus, wisp, blood ...) or hex colours; shift turns it (0..1), reverse flips it.", returns="ramp")
def ramp(ctx: Context, colours="fire", bands: int = 6, reverse: bool = False, shift: float = 0.0, lift: float = 0.0) -> np.ndarray:
    cols = palette(colours)
    if reverse:
        cols = cols[::-1]
    lut = make_lut(cols, bands)
    if shift:
        lut = np.roll(lut, int(round(shift * len(lut))), axis=0)
    if lift:
        lab = rgb_to_oklab(lut)
        lab[:, 0] = np.clip(lab[:, 0] + lift, 0, 1)
        lut = oklab_to_rgb(lab)
    return lut


@node("paint", "colour",
      "Field -> RGBA image. The driver (``by``: the field itself, or a bundle's age / height / dist / speed, or another field) picks the ramp "
      "step (reverse_by flips it: dark young, bright old); the field is the alpha, cut hard at ``cut`` (hard = 1 for crisp pixels, lower for a "
      "glow's soft edge); dither 0..1 breaks the bands with a Bayer pattern; the colour steps are the ramp's and nothing else.",
      returns="image")
def paint(ctx: Context, field, ramp: np.ndarray, by=None, reverse_by: bool = False, cut: float = 0.35, hard: float = 1.0, dither: float = 0.0,
          gamma: float = 1.0, source_bright: float = 0.0) -> np.ndarray:
    bundle = field if isinstance(field, dict) else None
    cov = bundle["v"] if bundle is not None else np.asarray(field, np.float32)
    if isinstance(by, str) and bundle is not None:
        drv = bundle[by]
    elif isinstance(by, np.ndarray):
        drv = by
    else:
        drv = cov
    drv = np.clip(drv, 0, 1) ** gamma
    if source_bright:
        # the fire rule: light at the source, darker outward (height or dist drives it)
        drv = np.clip(drv * (1 - source_bright) + source_bright * (1 - bundle["height"] if bundle is not None else drv), 0, 1)
    if reverse_by:
        drv = 1.0 - drv
    if dither > 0:
        drv = ordered_dither(drv, dither, 1)
    n = len(ramp)
    idx = np.clip(np.rint(drv * (n - 1)).astype(int), 0, n - 1)
    rgb = ramp[idx]
    if hard >= 1.0:
        a = (cov >= cut).astype(np.uint8) * 255
    else:
        a = np.clip((cov - cut) / max(1.0 - hard, 1e-3) + cut, 0, 1)
        a = (np.where(cov >= cut, np.maximum(a, cut), 0.0) * 255).astype(np.uint8)
    out = np.concatenate([rgb.astype(np.uint8), a[..., None]], -1)
    out[a == 0] = 0
    return out


@node("palette_lock", "colour", "Snap every opaque pixel of an image to the nearest colour of a palette (OKLab distance).", returns="image")
def palette_lock(ctx: Context, image: np.ndarray, colours="fire") -> np.ndarray:
    from ..palette import Palette
    pal = Palette(np.array([hex_to_rgb(c) for c in palette(colours)], np.uint8))
    out = image.copy()
    opaque = image[..., 3] > 0
    if opaque.any():
        lab = rgb_to_oklab(image[..., :3][opaque])
        out[..., :3][opaque] = pal.colors[pal.nearest(lab)]
    return out


@node("palette_cycle", "colour", "Palette cycling: the ramp index of every pixel advances ``steps`` over the loop (classic flowing water, running light).", returns="image")
def palette_cycle(ctx: Context, image: np.ndarray, ramp: np.ndarray, steps: int = 0) -> np.ndarray:
    n = len(ramp)
    lab_r = rgb_to_oklab(ramp)
    out = image.copy()
    st = int(steps) if steps else n
    for t in range(image.shape[0]):
        op = image[t, ..., 3] > 0
        if not op.any():
            continue
        lab = rgb_to_oklab(image[t, ..., :3][op])
        idx = ((lab[:, None, :] - lab_r[None]) ** 2).sum(-1).argmin(1)
        k = int(round(t * st / max(image.shape[0], 1)))
        out[t, ..., :3][op] = ramp[(idx + k) % n]
    return out


@node("dither", "colour", "Ordered (Bayer) dither added to a field before banding; strength 0..1.")
def dither(ctx: Context, field: Field, strength: float = 0.5) -> Field:
    return ordered_dither(np.asarray(field, np.float32), strength, 1)


@node("tint", "colour", "Recolour an image: every opaque pixel's lightness mapped through a new ramp (keeps the shading, swaps the palette).", returns="image")
def tint(ctx: Context, image: np.ndarray, ramp: np.ndarray) -> np.ndarray:
    out = image.copy()
    op = image[..., 3] > 0
    if op.any():
        L = np.clip(rgb_to_oklab(image[..., :3][op])[:, 0], 0, 1)
        lo, hi = float(L.min()), float(L.max())
        u = (L - lo) / max(hi - lo, 1e-3)
        out[..., :3][op] = ramp[np.clip(np.rint(u * (len(ramp) - 1)).astype(int), 0, len(ramp) - 1)]
    return out


@node("darken", "colour", "Multiply an image's lightness by a field (1 keeps, 0 black): shading, unlight, shadows on a layer.", returns="image")
def darken(ctx: Context, image: np.ndarray, by: Field, amount: float = 1.0, ramp: np.ndarray | None = None) -> np.ndarray:
    out = image.copy()
    op = image[..., 3] > 0
    if not op.any():
        return out
    lab = rgb_to_oklab(image[..., :3])
    k = 1.0 - amount * np.clip(np.asarray(by, np.float32), 0, 1)
    lab[..., 0] = lab[..., 0] * k
    lab[..., 1:] = lab[..., 1:] * k[..., None]
    rgb = oklab_to_rgb(lab)
    if ramp is not None:
        from ..palette import Palette
        pal = Palette(ramp)
        rgb = pal.colors[pal.nearest(rgb_to_oklab(rgb))]
    out[..., :3] = np.where(op[..., None], rgb, out[..., :3])
    return out


@node("displacement_map", "colour",
      "A vector field as the sheet the game's shader reads: R and G hold dx, dy (128 = none, ``range`` px full scale), B 128, alpha the strength mask "
      "(the field ``mask`` where given, else where the vectors move at all). Heat haze and ring-bends ship this way; the GIF preview shows it bending a backdrop.",
      returns="image")
def displacement_map(ctx: Context, vectors: np.ndarray, mask: Field | None = None, range: float = 4.0, levels: int = 8) -> np.ndarray:
    v = np.clip(vectors / max(range, 1e-3), -1, 1)
    lv = max(2, int(levels))
    v = np.round(v * lv) / lv
    r = (128 + v[..., 0] * 127).astype(np.uint8)
    g = (128 + v[..., 1] * 127).astype(np.uint8)
    b = np.full_like(r, 128)
    if mask is not None:
        a = (np.clip(np.asarray(mask, np.float32), 0, 1) * 255).astype(np.uint8)
    else:
        a = ((np.abs(v[..., 0]) + np.abs(v[..., 1])) > 0).astype(np.uint8) * 255
    return np.stack([r, g, b, a], -1)
