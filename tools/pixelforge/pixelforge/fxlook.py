"""Looks: finishing layers for any effect the Forge makes.

A look takes the frames of an effect (RGBA uint8 arrays, one per frame) and gives frames back: phosphorus
persistence, haze, an ethereal pallor, bloom, neon, hue cycling, afterimages, smoother loops, embers, smoke, heat
shimmer, rim light, pulse, grain, flicker, dissolve, frost and rot. Looks stack in order
(``"phosphorus:strength=0.8,echo:count=3"``) and the result is palette-locked: every colour is the effect's own
palette, extended by the look's own colours when the look adds light (neon, phosphor, frost, rot, a chosen outline
colour), and the json written next to a sheet lists the palette actually used. All colour distance is OKLab.
Loops stay loops: everything that moves in time is periodic over the frame count, so frame N is frame 0.

    frames, info = apply_looks(frames, "glow:radius=8,echo:count=2", palette)   # palette: hex list, Palette or RGB array
    LOOKS["phosphorus"].params                                                   # the knobs: default, range, meaning
    relook("art/fx/wisp.json", "phosphorus", "wisp_phosphorus")                 # a look on an existing sheet (rows kept)
    demo("docs/screens/fxlook")                                                  # one GIF per look + a contact sheet

The same looks apply to procedural effects (``vfx.make_vfx(..., looks=)``), spell layers and whole spells
(``"look"`` fields), painted effects (``effect_art.make_effect(..., looks=)``) and sprite animation
(``animate.LookEffect``). The game's own theme keeps the neon and hue-cycling looks (cyberpunk, psychedelic) for magic.
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image
from scipy import ndimage

from .color import hex_to_rgb, oklab_to_rgb, rgb_to_hex, rgb_to_oklab
from .palette import Palette
from .vfx import _roll, periodic_noise


# ------------------------------------------------------------------ registry
@dataclass(frozen=True)
class Param:
    default: object
    lo: float | None = None
    hi: float | None = None
    doc: str = ""
    choices: tuple | None = None


@dataclass
class Look:
    name: str
    fn: Callable
    doc: str
    params: dict[str, Param]
    extra: Callable | None = None   # (params, base palette RGB) -> hex colours the look adds to the palette

    def defaults(self) -> dict:
        return {k: v.default for k, v in self.params.items()}


LOOKS: dict[str, Look] = {}


def _register(name: str, doc: str, params: dict, extra=None):
    def deco(fn):
        LOOKS[name] = Look(name, fn, doc, {k: (v if isinstance(v, Param) else Param(*v)) for k, v in params.items()}, extra)
        return fn
    return deco


def looks_table() -> list[dict]:
    """Every look with its one-line description and parameters (default, min, max, doc): what the CLI and the MCP list."""
    rows = []
    for name, lk in LOOKS.items():
        ps = {}
        for k, prm in lk.params.items():
            ps[k] = {"default": prm.default, "doc": prm.doc}
            if prm.lo is not None:
                ps[k]["min"], ps[k]["max"] = prm.lo, prm.hi
            if prm.choices:
                ps[k]["choices"] = list(prm.choices)
        rows.append({"name": name, "doc": lk.doc, "params": ps, "adds_colours": lk.extra is not None})
    return rows


# ------------------------------------------------------------------ palettes and pixels
def as_palette(palette) -> np.ndarray:
    """Any palette a caller holds (hex list, Palette, (N, 3) array) -> unique uint8 RGB sorted dark -> bright (OKLab L)."""
    if isinstance(palette, Palette):
        rgb = palette.colors
    elif isinstance(palette, (list, tuple)) and palette and isinstance(palette[0], str):
        rgb = np.array([hex_to_rgb(c) for c in palette], np.uint8)
    else:
        rgb = np.asarray(palette, np.uint8).reshape(-1, 3)
    rgb = np.unique(rgb, axis=0)
    return rgb[np.argsort(rgb_to_oklab(rgb)[:, 0], kind="stable")]


def frames_palette(frames: list[np.ndarray], cap: int = 96) -> np.ndarray:
    """The colours frames already use (opaque pixels), dark -> bright; OKLab k-means down to ``cap`` when there are more."""
    px = [f[f[..., 3] > 0][:, :3] for f in frames if f.size]
    px = np.concatenate(px) if px else np.zeros((0, 3), np.uint8)
    if len(px) == 0:
        return np.array([[0, 0, 0], [255, 255, 255]], np.uint8)
    u = np.unique(px, axis=0)
    if len(u) > cap:
        u = Palette.from_image(np.dstack([px.reshape(-1, 1, 3), np.full((len(px), 1, 1), 255, np.uint8)]), cap).colors
    return as_palette(u)


def hexes(rgb) -> list[str]:
    return ["#" + rgb_to_hex(c) for c in np.asarray(rgb).reshape(-1, 3)]


def lock_palette(frames: list[np.ndarray], palette) -> list[np.ndarray]:
    """Every visible pixel snapped to its nearest palette colour in OKLab; alpha untouched."""
    pal = Palette(as_palette(palette))
    out = []
    for f in frames:
        g = f.copy()
        m = g[..., 3] > 0
        if m.any():
            cols, inv = np.unique(g[m][:, :3], axis=0, return_inverse=True)
            idx = pal.nearest(rgb_to_oklab(cols))
            g[m, :3] = pal.colors[idx[inv.reshape(-1)]]
        g[~m] = 0
        out.append(g)
    return out


def _alpha(f: np.ndarray) -> np.ndarray:
    return f[..., 3].astype(np.float32) / 255.0


def _cov(f: np.ndarray, th: float = 0.5) -> np.ndarray:
    return _alpha(f) > th


def _L(f: np.ndarray) -> np.ndarray:
    return rgb_to_oklab(f[..., :3])[..., 0].astype(np.float32)


def _blur(a: np.ndarray, sigma: float) -> np.ndarray:
    return ndimage.gaussian_filter(a.astype(np.float32), sigma) if sigma > 0 else a.astype(np.float32)


def _shift(a: np.ndarray, dy: int, dx: int) -> np.ndarray:
    """Integer shift with empty fill (any number of channels)."""
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    if abs(dy) >= h or abs(dx) >= w:
        return out
    ys, xs = slice(max(dy, 0), h + min(dy, 0)), slice(max(dx, 0), w + min(dx, 0))
    ys2, xs2 = slice(max(-dy, 0), h + min(-dy, 0)), slice(max(-dx, 0), w + min(-dx, 0))
    out[ys, xs] = a[ys2, xs2]
    return out


def _over(top: np.ndarray, under: np.ndarray) -> np.ndarray:
    """``top`` drawn over ``under`` (both RGBA uint8)."""
    ta = top[..., 3:4].astype(np.float32) / 255.0
    ua = under[..., 3:4].astype(np.float32) / 255.0
    oa = ta + ua * (1 - ta)
    rgb = (top[..., :3] * ta + under[..., :3] * ua * (1 - ta)) / np.maximum(oa, 1e-6)
    out = np.zeros_like(top)
    out[..., :3] = np.clip(rgb + 0.5, 0, 255)
    out[..., 3] = np.clip(oa[..., 0] * 255 + 0.5, 0, 255)
    return out


def _layer(rgb: np.ndarray, alpha01: np.ndarray) -> np.ndarray:
    """An RGBA layer from per-pixel colours (h, w, 3) and an alpha field in 0..1."""
    out = np.zeros(alpha01.shape + (4,), np.uint8)
    a = np.clip(alpha01, 0, 1)
    out[..., :3] = np.broadcast_to(rgb, alpha01.shape + (3,))
    out[..., 3] = (a * 255 + 0.5).astype(np.uint8)
    out[a <= 0] = 0
    return out


def _bayer(h: int, w: int) -> np.ndarray:
    from .quantize import bayer_matrix

    m = bayer_matrix(4) + 0.5   # 0..1
    return np.tile(m, (h // 4 + 1, w // 4 + 1))[:h, :w]


def _prev(frames: list[np.ndarray], i: int, k: int, loop: bool):
    """Frame ``k`` steps before ``i``: wrapped for a loop, None before the start of a one-shot."""
    j = i - k
    if j < 0:
        if not loop:
            return None
        j %= len(frames)
    return frames[j]


def _scale_light(f: np.ndarray, m: float) -> np.ndarray:
    """Lightness (and any soft alpha) scaled by ``m``; colours free until the final lock."""
    g = f.copy()
    msk = g[..., 3] > 0
    if msk.any():
        lab = rgb_to_oklab(g[msk][:, :3])
        lab[:, 0] = np.clip(lab[:, 0] * m, 0, 1)
        g[msk, :3] = oklab_to_rgb(lab)
    soft = msk & (g[..., 3] < 255)
    g[soft, 3] = np.clip(g[soft, 3].astype(np.float32) * m, 0, 255).astype(np.uint8)
    return g


def _shift_lab(rgb: np.ndarray, k, a_to: float, b_to: float, L_add=0.0) -> np.ndarray:
    """(N, 3) uint8 -> (N, 3) uint8 with chroma pulled toward (a_to, b_to) by ``k`` (scalar or per pixel) and L moved."""
    lab = rgb_to_oklab(rgb)
    k = np.asarray(k, dtype=np.float64)
    lab[:, 1] = lab[:, 1] * (1 - k) + a_to * k
    lab[:, 2] = lab[:, 2] * (1 - k) + b_to * k
    lab[:, 0] = np.clip(lab[:, 0] + L_add, 0, 1)
    return oklab_to_rgb(lab)


def _rotate_hue(rgb: np.ndarray, ang: float, sat: float) -> np.ndarray:
    lab = rgb_to_oklab(rgb)
    a, b = lab[:, 1].copy(), lab[:, 2].copy()
    c, s = math.cos(ang), math.sin(ang)
    lab[:, 1], lab[:, 2] = (a * c - b * s) * sat, (a * s + b * c) * sat
    return oklab_to_rgb(lab)


def _blend(a: np.ndarray, b: np.ndarray, w: float) -> np.ndarray:
    """Alpha-weighted mix of two frames (premultiplied, so edges do not darken)."""
    aa = a[..., 3:4].astype(np.float32) / 255.0
    ab = b[..., 3:4].astype(np.float32) / 255.0
    al = aa * (1 - w) + ab * w
    rgb = (a[..., :3] * aa * (1 - w) + b[..., :3] * ab * w) / np.maximum(al, 1e-6)
    out = np.zeros_like(a)
    out[..., :3] = np.clip(rgb + 0.5, 0, 255)
    out[..., 3] = np.clip(al[..., 0] * 255 + 0.5, 0, 255)
    return out


# ------------------------------------------------------------------ the looks
PHOSPHOR = ["#0b2318", "#17553a", "#3ccf86", "#a8ffd0", "#eafff6"]
BONE_TEAL = ["#4f7d78", "#8fb8b0", "#c9e2dc", "#eef7f4"]
NEON = ["#ff2bd6", "#ff8ae9", "#15e2ff", "#8df6ff", "#07060c", "#1c0a2c"]
FROST = ["#1f4a63", "#4d93b3", "#9ad4e8", "#eafaff"]
ROT = ["#0d1a14", "#1e5a44", "#3fa07a", "#8fe0b4"]


@_register("phosphorus", "Green-white persistence: an afterglow that decays over the frames, a cool bright core, a slight flicker.",
           {"strength": (0.8, 0.0, 1.0, "how strong the afterglow is"), "decay": (0.6, 0.2, 0.95, "share of the glow that survives each frame"),
            "flicker": (0.15, 0.0, 0.5, "brightness jitter"), "core": (0.6, 0.0, 1.0, "how white the bright core turns")},
           extra=lambda p, pal: PHOSPHOR)
def look_phosphorus(frames, p, ctx):
    n = len(frames)
    ramp = np.array([hex_to_rgb(c) for c in PHOSPHOR], np.uint8)
    core_rgb = np.array(hex_to_rgb(PHOSPHOR[-1]), np.float32)
    K = max(1, int(math.ceil(math.log(0.05) / math.log(max(min(p["decay"], 0.97), 0.05)))))
    out = []
    for i, f in enumerate(frames):
        t = i / n
        trail = np.zeros(f.shape[:2], np.float32)
        for k in range(1, K + 1):
            pf = _prev(frames, i, k, ctx["loop"])
            if pf is None:
                break
            np.maximum(trail, _alpha(pf) * p["decay"] ** k, out=trail)
        trail *= p["strength"]
        live = f.copy()
        L = _L(f)
        m = (f[..., 3] > 0) & (L > 0.6)
        if m.any() and p["core"] > 0:
            w = (np.clip((L[m] - 0.6) / 0.4, 0, 1) * p["core"])[:, None]
            live[m, :3] = np.clip(f[m][:, :3] * (1 - w) + core_rgb * w + 0.5, 0, 255).astype(np.uint8)
        if p["flicker"] > 0:
            ph = ctx["phases"]
            s = 0.65 * math.sin(2 * math.pi * (3 * t + ph[0])) + 0.35 * math.sin(2 * math.pi * (5 * t + ph[1]))
            live = _scale_light(live, 1 + p["flicker"] * s)
        idx = np.clip((trail * 1.15 * (len(ramp) - 1) + 0.5).astype(int), 0, len(ramp) - 1)
        a = np.where(trail > 0.03, 0.35 + 0.65 * trail ** 0.8, 0.0)
        a = np.round(a * 4) / 4
        a[_cov(f)] = 0
        out.append(_over(live, _layer(ramp[idx], a)))
    return out


@_register("haze", "Soft bands of haze round the effect, dithered in the palette's darker steps, drifting slowly.",
           {"radius": (5.0, 1.0, 12.0, "how far the haze reaches, px"), "strength": (0.55, 0.0, 1.0, "how thick it is"),
            "drift": (1.0, 0.0, 4.0, "how far it wanders over the loop, px"), "bands": (2, 1, 3, "how many of the palette's dark steps it uses")})
def look_haze(frames, p, ctx):
    n = len(frames)
    pal = ctx["pal"]
    bands = max(1, min(int(p["bands"]), len(pal)))
    th = _bayer(*frames[0].shape[:2])
    out = []
    for i, f in enumerate(frames):
        t = i / n
        cov = _alpha(f)
        if cov.max() <= 0:
            out.append(f.copy())
            continue
        soft, soft2 = _blur(cov, p["radius"]), _blur(cov, p["radius"] * 2.2)
        soft /= max(soft.max(), 1e-6)
        soft2 /= max(soft2.max(), 1e-6)
        ang = 2 * math.pi * t
        soft = _roll(soft, math.sin(ang) * p["drift"], math.cos(ang) * p["drift"] * 0.6)
        soft2 = _roll(soft2, -math.cos(ang) * p["drift"] * 0.5, math.sin(ang) * p["drift"] * 0.4)
        field = np.clip(0.75 * soft + 0.55 * soft2, 0, 1) * p["strength"]
        level = np.floor(field * 3 + th).astype(int)
        a = np.array([0.0, 0.4, 0.6, 0.8])[np.clip(level, 0, 3)]
        a[cov > 0.5] = 0
        lo = 1 if len(pal) > bands else 0   # skip the near-black step: haze must show on the game's dark ground
        idx = np.clip((field * bands * 1.2).astype(int) + lo, lo, min(lo + bands - 1, len(pal) - 1))
        out.append(_over(f, _layer(pal[idx], a)))
    return out


def _etherealize(rgb: np.ndarray, pale: float) -> np.ndarray:
    lab = rgb_to_oklab(rgb)
    lab[:, 1] = lab[:, 1] * (1 - pale) + (-0.035) * pale
    lab[:, 2] = lab[:, 2] * (1 - pale) + 0.0 * pale
    lab[:, 0] = lab[:, 0] + (0.88 - lab[:, 0]) * pale * 0.45
    return oklab_to_rgb(lab)


@_register("ethereal", "Pale and see-through: colours fade toward bone and teal, edges soften, a faint inner light, a slow vertical drift.",
           {"pale": (0.6, 0.0, 1.0, "how far the colours fade toward bone and teal"), "drift": (1.5, 0.0, 4.0, "vertical wander over the loop, px"),
            "softness": (0.5, 0.0, 1.0, "how soft and see-through the edge gets"), "inner": (0.4, 0.0, 1.0, "faint light from inside")},
           extra=lambda p, pal: hexes(_etherealize(pal, p["pale"])) + BONE_TEAL)
def look_ethereal(frames, p, ctx):
    n = len(frames)
    pale_rgb = np.array(hex_to_rgb(BONE_TEAL[-2]), np.uint8)
    out = []
    for i, f in enumerate(frames):
        t = i / n
        g = f.copy()
        m = g[..., 3] > 0
        if not m.any():
            out.append(g)
            continue
        g[m, :3] = _etherealize(g[m][:, :3], p["pale"])
        cov = _alpha(f)
        if p["inner"] > 0:
            core = _blur(cov * (_L(f) > 0.45), 2.0)
            core /= max(core.max(), 1e-6)
            lab = rgb_to_oklab(g[m][:, :3])
            lab[:, 0] = np.clip(lab[:, 0] + p["inner"] * 0.18 * core[m], 0, 1)
            g[m, :3] = oklab_to_rgb(lab)
        g[..., 3] = (f[..., 3] * (1 - 0.22 * p["softness"])).astype(np.uint8)
        fringe = np.clip(_blur(cov, 1.2) - cov, 0, 1) * p["softness"]
        g = _over(g, _layer(pale_rgb, np.round(np.clip(fringe * 1.5, 0, 1) * 3) / 3 * 0.6))
        dy = int(round(p["drift"] * math.sin(2 * math.pi * t))) if ctx["loop"] else int(round(-p["drift"] * 2 * t))
        if dy:
            g = _shift(g, dy, 0)
        out.append(g)
    return out


@_register("glow", "Bloom in palette bands: an additive core and a wide soft halo.",
           {"intensity": (0.8, 0.0, 1.5, "halo strength"), "radius": (6.0, 1.0, 16.0, "halo reach, px"),
            "core": (0.5, 0.0, 1.0, "how much the bright pixels lift"), "threshold": (0.55, 0.0, 1.0, "lightness where the glow starts")})
def look_glow(frames, p, ctx):
    pal = ctx["pal"]
    inner_c = pal[-2] if len(pal) > 1 else pal[-1]
    mid_c = pal[-3] if len(pal) > 2 else pal[0]
    outer_c = pal[-4] if len(pal) > 3 else mid_c
    th = _bayer(*frames[0].shape[:2])
    out = []
    for f in frames:
        L = _L(f)
        cov = _alpha(f)
        bright = cov * np.clip((L - p["threshold"]) / max(1 - p["threshold"], 1e-3), 0, 1)
        if bright.max() <= 0:
            out.append(f.copy())
            continue
        halo = _blur(bright, p["radius"])
        halo /= max(halo.max(), 1e-6)
        halo = halo ** 1.3 * p["intensity"]
        # three bands, each dithered at its edge so the halo falls off in pixels rather than a flat blob
        level = np.floor(np.clip(halo, 0, 1) * 3 + th * 0.9).astype(int)
        rgb = np.where((level >= 3)[..., None], inner_c, np.where((level == 2)[..., None], mid_c, outer_c)).astype(np.uint8)
        a = np.array([0.0, 0.3, 0.45, 0.6])[np.clip(level, 0, 3)]
        a[cov > 0.5] = 0
        g = f.copy()
        if p["core"] > 0:
            m = g[..., 3] > 0
            lab = rgb_to_oklab(g[m][:, :3])
            lab[:, 0] = np.clip(lab[:, 0] + p["core"] * 0.16 * bright[m], 0, 1)
            g[m, :3] = oklab_to_rgb(lab)
        out.append(_over(g, _layer(rgb, a)))
    return out


@_register("cyberpunk", "Neon edge light in magenta and cyan, scanline shimmer, a small chromatic offset, a hard dark core.",
           {"edge": (1.0, 0.0, 1.0, "rim brightness"), "scanline": (0.35, 0.0, 0.8, "how dark the alternate rows go"),
            "offset": (1, 0, 3, "chromatic split, px"), "core": (0.6, 0.0, 1.0, "how dark the inside goes")},
           extra=lambda p, pal: NEON)
def look_cyberpunk(frames, p, ctx):
    n = len(frames)
    mag, mag2, cy, cy2, dark, _dark2 = [np.array(hex_to_rgb(c), np.float32) for c in NEON]
    off = int(p["offset"])
    out = []
    for i, f in enumerate(frames):
        cov = _cov(f)
        if not cov.any():
            out.append(f.copy())
            continue
        inner = ndimage.binary_erosion(cov, iterations=1)
        rim = cov & ~inner
        ys = np.nonzero(cov.any(axis=1))[0]
        gy = (np.arange(f.shape[0]) - ys.min()) / max(ys.max() - ys.min(), 1)
        top = (gy < 0.5)[:, None] & rim
        L = _L(f)
        g = f.astype(np.float32)
        if p["core"] > 0:
            keep = L > 0.78
            w = (p["core"] * 0.8 * inner * ~keep)[..., None]
            g[..., :3] = g[..., :3] * (1 - w) + dark * w
        bright = (L > 0.55)[..., None]
        rim_rgb = np.where(top[..., None], np.where(bright, cy2, cy), np.where(bright, mag2, mag))
        g[rim, :3] = g[rim, :3] * (1 - p["edge"]) + rim_rgb[rim] * p["edge"]
        g = np.clip(g + 0.5, 0, 255).astype(np.uint8)
        if off and p["edge"] > 0:
            lc = _layer(cy.astype(np.uint8), rim * 0.6 * p["edge"])
            lm = _layer(mag.astype(np.uint8), rim * 0.6 * p["edge"])
            g = _over(g, _over(_shift(lc, 0, -off), _shift(lm, 0, off)))
        if p["scanline"] > 0:
            phase = (i % 2) if n % 2 == 0 else int(2 * i / n) % 2
            rows = ((np.arange(f.shape[0]) + phase) % 2 == 0)[:, None] & (g[..., 3] > 0)
            if rows.any():
                lab = rgb_to_oklab(g[rows][:, :3])
                lab[:, 0] *= 1 - p["scanline"]
                g[rows, :3] = oklab_to_rgb(lab)
        out.append(g)
    return out


def _psy_extra(p, pal):
    L = rgb_to_oklab(pal)[:, 0]
    bright = pal[L > 0.3] if (L > 0.3).any() else pal
    cols = []
    for k in range(6):
        cols += hexes(_rotate_hue(bright, 2 * math.pi * k / 6, p["saturation"]))
    return cols


def _kaleido(f: np.ndarray, k: int) -> np.ndarray:
    h, w = f.shape[:2]
    if k == 2:
        return np.where((np.arange(w) < w / 2)[None, :, None], f, f[:, ::-1])
    if k == 4:
        g = np.where((np.arange(w) < w / 2)[None, :, None], f, f[:, ::-1])
        return np.where((np.arange(h) < h / 2)[:, None, None], g, g[::-1])
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = (w - 1) / 2, (h - 1) / 2
    dx, dy = xs - cx, ys - cy
    r, th = np.hypot(dx, dy), np.arctan2(dy, dx)
    sector = 2 * math.pi / k
    th2 = np.abs(((th + math.pi) % sector) - sector / 2) - math.pi / 2   # fold into half a sector, aimed up
    sx = np.clip(np.rint(cx + r * np.cos(th2)), 0, w - 1).astype(int)
    sy = np.clip(np.rint(cy + r * np.sin(th2)), 0, h - 1).astype(int)
    return f[sy, sx]


@_register("psychedelic", "Hue cycling that closes over the loop, colour-banded afterimages, an optional kaleidoscope fold.",
           {"cycles": (1, 1, 4, "full hue turns per loop"), "saturation": (1.4, 0.5, 3.0, "chroma boost"),
            "kaleidoscope": (0, 0, 8, "mirror folds: 0 off, 2, 4, 6 or 8"), "trail": (0.5, 0.0, 1.0, "strength of the banded afterimages")},
           extra=_psy_extra)
def look_psychedelic(frames, p, ctx):
    n = len(frames)
    cyc, k = int(p["cycles"]), int(p["kaleidoscope"])
    out = []
    for i, f in enumerate(frames):
        g = f.copy()
        m = g[..., 3] > 0
        if m.any():
            g[m, :3] = _rotate_hue(g[m][:, :3], 2 * math.pi * cyc * i / n, p["saturation"])
        if p["trail"] > 0:
            for j in range(1, 4):
                pf = _prev(frames, i, j, ctx["loop"])
                if pf is None:
                    continue
                tl = pf.copy()
                mm = tl[..., 3] > 0
                if not mm.any():
                    continue
                tl[mm, :3] = _rotate_hue(tl[mm][:, :3], 2 * math.pi * cyc * (i - j) / n + j * 0.9, p["saturation"])
                tl[..., 3] = (tl[..., 3] * p["trail"] * 0.6 ** j).astype(np.uint8)
                g = _over(g, tl)
        if k >= 2:
            g = _kaleido(g, k)
        out.append(g)
    return out


@_register("echo", "Afterimages: ghost copies trailing the motion, each fainter and darker, optionally offset or smaller.",
           {"count": (3, 1, 6, "ghosts"), "decay": (0.6, 0.2, 0.9, "opacity kept per ghost"), "spacing": (1, 1, 3, "frames between ghosts"),
            "dx": (-3, -16, 16, "offset per ghost, px (negative trails a missile flying right)"), "dy": (0, -16, 16, "vertical offset per ghost, px"),
            "scale": (1.0, 0.5, 1.2, "size factor per ghost"), "dim": (1, 0, 3, "palette steps darker per ghost")})
def look_echo(frames, p, ctx):
    pal = ctx["pal"]
    palette = Palette(pal)
    count, spacing, dim = int(p["count"]), int(p["spacing"]), int(p["dim"])
    out = []
    for i, f in enumerate(frames):
        g = f.copy()
        for k in range(1, count + 1):   # nearest ghost first: it sits just under the live frame
            pf = _prev(frames, i, k * spacing, ctx["loop"])
            if pf is None:
                continue
            gh = pf.copy()
            if p["scale"] != 1.0:
                s = p["scale"] ** k
                im = Image.fromarray(gh, "RGBA")
                nw, nh = max(1, round(im.width * s)), max(1, round(im.height * s))
                small = im.resize((nw, nh), Image.NEAREST)
                canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
                canvas.paste(small, ((im.width - nw) // 2, (im.height - nh) // 2))
                gh = np.array(canvas)
            m = gh[..., 3] > 0
            if dim and m.any():
                idx = palette.nearest(rgb_to_oklab(gh[m][:, :3]))
                gh[m, :3] = pal[np.maximum(idx - dim * k, 0)]
            gh[..., 3] = (gh[..., 3] * p["decay"] ** k).astype(np.uint8)
            gh = _shift(gh, int(round(k * p["dy"])), int(round(k * p["dx"])))
            g = _over(g, gh)
        out.append(g)
    return out


@_register("smooth", "Smoother loops: cross-fade the seam, blend in-between frames (doubling the count), ping-pong, ease the timing.",
           {"interpolate": (1, 0, 2, "doublings of the frame count by blending"), "crossfade": (0.0, 0.0, 0.5, "share of the loop blended across the seam"),
            "pingpong": (0, 0, 1, "play forward, then back"), "ease": Param("linear", doc="timing curve: linear | sine | in | out", choices=("linear", "sine", "in", "out")),
            "keep_speed": (1, 0, 1, "doubled frames play at doubled fps, so the loop keeps its length")})
def look_smooth(frames, p, ctx):
    seq = [f.copy() for f in frames]
    loop = ctx["loop"]
    n = len(seq)
    if p["crossfade"] > 0 and n > 2:
        # the tail is laid over the head, fading out as the head fades in; the overlap is dropped, so the last frame
        # runs straight into the first (a loop of n - M frames)
        M = min(max(1, int(round(p["crossfade"] * n))), n // 2)
        seq = [_blend(seq[n - M + j], seq[j], (j + 1) / (M + 1)) for j in range(M)] + seq[M:n - M]
        n = len(seq)
        loop = True
    if int(p["pingpong"]) and n > 2:
        seq = seq + seq[-2:0:-1]
        loop = True
    for _ in range(int(p["interpolate"])):
        new = []
        for j in range(len(seq)):
            new.append(seq[j])
            if j + 1 < len(seq) or loop:
                new.append(_blend(seq[j], seq[(j + 1) % len(seq)], 0.5))
        seq = new
    if p["ease"] != "linear":
        m = len(seq)
        ts = np.arange(m) / m
        e = {"sine": (1 - np.cos(np.pi * ts)) / 2, "in": ts ** 2, "out": 1 - (1 - ts) ** 2}[p["ease"]]
        seq = [seq[int(round(v * m)) % m] for v in e]
    scale = float(2 ** int(p["interpolate"])) if int(p["keep_speed"]) else 1.0
    return seq, {"fps_scale": scale, "loop": loop}


@_register("embers", "Sparks that rise from the bright parts and die, in the palette's brightest steps.",
           {"count": (12, 1, 40, "sparks"), "rise": (1.0, 0.0, 3.0, "how far they climb, as a share of the height"),
            "speed": (1, 1, 3, "lives per loop"), "size": (1, 1, 2, "spark size, px")})
def look_embers(frames, p, ctx):
    n = len(frames)
    h, w = frames[0].shape[:2]
    pal = ctx["pal"]
    rng = np.random.default_rng(ctx["seed"] + 11)
    cands = []
    for f in frames:
        ys, xs = np.nonzero((f[..., 3] > 128) & (_L(f) > 0.45))
        cands += list(zip(xs.tolist(), ys.tolist()))
    if not cands:
        return [f.copy() for f in frames]
    count, sz, speed = int(p["count"]), int(p["size"]), int(p["speed"])
    pick = rng.integers(0, len(cands), count)
    ph = rng.random((count, 2))
    cols = [pal[-1], pal[-2] if len(pal) > 1 else pal[-1], pal[-3] if len(pal) > 2 else pal[0]]
    covs = [(f[..., 3] > 0).mean() for f in frames]
    peak = max(max(covs), 1e-6)
    out = []
    for i, f in enumerate(frames):
        t = i / n
        g = f.copy()
        amp = 1.0 if ctx["loop"] else min(1.0, covs[i] / peak * 1.5)   # one-shots: the sparks die with the effect
        for j in range(count):
            x0, y0 = cands[pick[j]]
            life = (t * speed + ph[j, 0]) % 1.0
            y = y0 - life * p["rise"] * h * 0.35
            x = x0 + math.sin(2 * math.pi * (life * 2 + ph[j, 1])) * 1.5
            a = (1 - life) ** 0.6 * amp
            if a < 0.2:
                continue
            c = cols[0] if life < 0.3 else cols[1] if life < 0.65 else cols[2]
            xi, yi = int(round(x)), int(round(y))
            if 0 <= xi <= w - sz and 0 <= yi <= h - sz:
                g[yi:yi + sz, xi:xi + sz, :3] = c
                g[yi:yi + sz, xi:xi + sz, 3] = int(255 * max(round(a * 3) / 3, 1 / 3))
        out.append(g)
    return out


@_register("smoke", "A dark smoke layer trailing up and away behind the effect, in the palette's darkest steps.",
           {"strength": (0.6, 0.0, 1.0, "thickness"), "rise": (1.0, 0.0, 3.0, "how fast it climbs"),
            "drift": (0.5, -2.0, 2.0, "sideways wander"), "radius": (3.0, 1.0, 8.0, "how wide it spreads, px")})
def look_smoke(frames, p, ctx):
    n = len(frames)
    h, w = frames[0].shape[:2]
    pal = ctx["pal"]
    rng = np.random.default_rng(ctx["seed"] + 23)
    noise = periodic_noise(w, h, 2, rng, octaves=3)
    th = _bayer(h, w)
    ry, rx = max(1, int(round(p["rise"]))), int(round(p["drift"]))
    out = []
    for i, f in enumerate(frames):
        t = i / n
        plume = np.zeros((h, w), np.float32)
        for k in range(0, 5):
            pf = f if k == 0 else _prev(frames, i, k, ctx["loop"])
            if pf is None:
                break
            np.maximum(plume, _shift(_alpha(pf), -int(round(k * p["rise"] * 2.5)), int(round(k * p["drift"] * 1.5))) * 0.72 ** k, out=plume)
        if plume.max() <= 0:
            out.append(f.copy())
            continue
        plume = _blur(plume, p["radius"])
        plume /= max(plume.max(), 1e-6)
        nz = _roll(noise, -t * h * ry, t * w * rx)
        nz = (nz - nz.min()) / max(nz.max() - nz.min(), 1e-6)
        dens = np.clip((nz - 0.3) * 1.8, 0, 1) * plume * p["strength"]
        level = np.floor(dens * 3 + th).astype(int)
        a = np.array([0.0, 0.5, 0.7, 0.85])[np.clip(level, 0, 3)]
        a[_cov(f)] = 0
        # the two steps above near-black: smoke has to show against the game's dark ground
        dark, mid = pal[min(1, len(pal) - 1)], pal[min(2, len(pal) - 1)]
        rgb = np.where((level >= 3)[..., None], mid, dark).astype(np.uint8)
        out.append(_over(f, _layer(rgb, a)))
    return out


@_register("shimmer", "Heat shimmer: rows sway by a small periodic displacement.",
           {"amplitude": (1.0, 0.0, 3.0, "px"), "wavelength": (6.0, 2.0, 24.0, "rows per wave"), "speed": (1, 1, 4, "waves travelling per loop")})
def look_shimmer(frames, p, ctx):
    n = len(frames)
    h = frames[0].shape[0]
    speed = int(p["speed"])
    out = []
    for i, f in enumerate(frames):
        t = i / n
        g = np.zeros_like(f)
        for y in range(h):
            dx = int(round(p["amplitude"] * math.sin(2 * math.pi * (y / p["wavelength"] + speed * t))))
            if dx == 0:
                g[y] = f[y]
            elif dx > 0:
                g[y, dx:] = f[y, :-dx]
            else:
                g[y, :dx] = f[y, -dx:]
        out.append(g)
    return out


@_register("outline", "Rim light: a one-pixel (or wider) edge in a chosen colour, all round or from one side.",
           {"colour": Param("#eafff8", doc="hex colour of the rim"), "width": (1, 1, 3, "px"), "strength": (1.0, 0.0, 1.0, "opacity"),
            "side": Param("all", doc="all | top | bottom | left | right", choices=("all", "top", "bottom", "left", "right"))},
           extra=lambda p, pal: [p["colour"]])
def look_outline(frames, p, ctx):
    col = np.array(hex_to_rgb(p["colour"]), np.uint8)
    width = int(p["width"])
    out = []
    for f in frames:
        cov = _cov(f)
        if not cov.any():
            out.append(f.copy())
            continue
        rim = ndimage.binary_dilation(cov, iterations=width) & ~cov
        if p["side"] != "all":
            dy, dx = {"top": (-1, 0), "bottom": (1, 0), "left": (0, -1), "right": (0, 1)}[p["side"]]
            lit = _shift(cov, dy * width, dx * width)
            rim &= ndimage.binary_dilation(lit, iterations=max(width - 1, 0)) if width > 1 else lit
        out.append(_over(f, _layer(col, rim * p["strength"])))
    return out


@_register("pulse", "Rhythmic brightness: the whole effect breathes lighter and darker, in palette steps.",
           {"rate": (1, 1, 4, "beats per loop"), "depth": (0.3, 0.0, 0.6, "how far the lightness swings"), "phase": (0.0, 0.0, 1.0, "where in the beat the loop starts")})
def look_pulse(frames, p, ctx):
    n = len(frames)
    return [_scale_light(f, 1 + p["depth"] * math.sin(2 * math.pi * (int(p["rate"]) * i / n + p["phase"]))) for i, f in enumerate(frames)]


@_register("grain", "Dither noise: pixels flip between neighbouring palette steps, still or animated.",
           {"amount": (0.5, 0.0, 1.0, "how much"), "animated": (1, 0, 1, "a new pattern every frame"), "size": (1, 1, 2, "grain size, px")})
def look_grain(frames, p, ctx):
    h, w = frames[0].shape[:2]
    sz = int(p["size"])
    out = []
    for i, f in enumerate(frames):
        rng = np.random.default_rng(ctx["seed"] + (i if int(p["animated"]) else 0))
        nz = rng.normal(0, 1, ((h + sz - 1) // sz, (w + sz - 1) // sz)).repeat(sz, 0).repeat(sz, 1)[:h, :w]
        g = f.copy()
        m = g[..., 3] > 0
        if m.any():
            lab = rgb_to_oklab(g[m][:, :3])
            lab[:, 0] = np.clip(lab[:, 0] + p["amount"] * 0.07 * nz[m], 0, 1)
            g[m, :3] = oklab_to_rgb(lab)
        out.append(g)
    return out


@_register("flicker", "Irregular brightness flicker, loop-safe (a lantern's gutter, a failing light).",
           {"depth": (0.25, 0.0, 0.6, "swing"), "rate": (3, 1, 6, "base flickers per loop"), "chaos": (0.5, 0.0, 1.0, "how irregular")})
def look_flicker(frames, p, ctx):
    n = len(frames)
    r = int(p["rate"])
    ph = ctx["phases"]
    out = []
    for i, f in enumerate(frames):
        t = i / n
        s = 0.6 * math.sin(2 * math.pi * (r * t + ph[0])) + p["chaos"] * (0.4 * math.sin(2 * math.pi * (2 * r * t + ph[1])) + 0.3 * math.sin(2 * math.pi * ((r + 1) * t + ph[2])))
        out.append(_scale_light(f, 1 + p["depth"] * s))
    return out


@_register("dissolve", "The effect eats away over its life (a one-shot): grain by grain, with a lit, charred edge.",
           {"start": (0.35, 0.0, 0.9, "share of the life before it starts"), "grain": (1.0, 0.5, 3.0, "grain size"),
            "edge": (1, 0, 2, "edge width"), "direction": Param("any", doc="any | up | down", choices=("any", "up", "down"))})
def look_dissolve(frames, p, ctx):
    n = len(frames)
    h, w = frames[0].shape[:2]
    pal = ctx["pal"]
    rng = np.random.default_rng(ctx["seed"] + 37)
    nz = periodic_noise(w, h, max(2, int(round(6 / p["grain"]))), rng, octaves=3)
    nz = (nz - nz.min()) / max(nz.max() - nz.min(), 1e-6)
    if p["direction"] != "any":
        grad = np.linspace(0, 1, h, dtype=np.float32)[:, None] * np.ones((1, w), np.float32)
        nz = 0.55 * nz + 0.45 * (grad if p["direction"] == "down" else 1 - grad)
    e = int(p["edge"])
    out = []
    for i, f in enumerate(frames):
        t = (i + 0.5) / n
        k = max(0.0, (t - p["start"]) / max(1 - p["start"], 1e-6))
        g = f.copy()
        g[nz < k, 3] = 0
        if e and k > 0:
            m = g[..., 3] > 0
            g[m & (nz >= k + 0.05 * e) & (nz < k + 0.11 * e), :3] = pal[0]
            g[m & (nz < k + 0.05 * e), :3] = pal[-2] if len(pal) > 1 else pal[-1]
        out.append(g)
    return out, {"loop": False}


@_register("ice", "Frost: colours chill toward pale blue, crystals twinkle on the bright edges.",
           {"frost": (0.6, 0.0, 1.0, "how blue"), "crystals": (10, 0, 40, "how many"), "pale": (0.5, 0.0, 1.0, "how much the bright parts whiten"),
            "twinkle": (1, 0, 1, "crystals twinkle over the loop")},
           extra=lambda p, pal: FROST)
def look_ice(frames, p, ctx):
    n = len(frames)
    h, w = frames[0].shape[:2]
    rng = np.random.default_rng(ctx["seed"] + 41)
    white, pale = np.array(hex_to_rgb(FROST[-1]), np.uint8), np.array(hex_to_rgb(FROST[-2]), np.uint8)
    cands = []
    for f in frames:
        cov = _cov(f)
        rim = cov & ~ndimage.binary_erosion(cov, iterations=1)
        ys, xs = np.nonzero(rim & (_L(f) > 0.45))
        cands += list(zip(xs.tolist(), ys.tolist()))
    if not cands:
        cands = [(w // 2, h // 2)]
    nc = int(p["crystals"])
    pick = rng.integers(0, len(cands), nc)
    ph = rng.random(nc)
    out = []
    for i, f in enumerate(frames):
        t = i / n
        g = f.copy()
        m = g[..., 3] > 0
        if m.any():
            lab = rgb_to_oklab(g[m][:, :3])
            k = 0.85 * p["frost"]
            lab[:, 1] = lab[:, 1] * (1 - k) + (-0.05) * k
            lab[:, 2] = lab[:, 2] * (1 - k) + (-0.1) * k
            lab[:, 0] = np.clip(lab[:, 0] + np.clip(lab[:, 0] - 0.45, 0, 1) * p["pale"] * 0.45, 0, 1)
            g[m, :3] = oklab_to_rgb(lab)
        for j in range(nc):
            x, y = cands[pick[j]]
            a = 0.5 + 0.5 * math.sin(2 * math.pi * (t + ph[j])) if int(p["twinkle"]) else 1.0
            if a < 0.35:
                continue
            big = a > 0.8
            arms = ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (-1, -1), (1, -1), (-1, 1)) if big else ())
            for dx, dy in arms:
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and 0 <= yy < h:
                    g[yy, xx, :3] = white if (dx == 0 and dy == 0) or big else pale
                    g[yy, xx, 3] = 255
        out.append(g)
    return out


@_register("rot", "Miasma rot in the game's teal-green: the lower part sickens, drips fall from the underside.",
           {"drips": (6, 0, 16, "how many drops"), "strength": (0.6, 0.0, 1.0, "how thick the miasma"),
            "speed": (1, 1, 3, "falls per loop"), "tint": (0.5, 0.0, 1.0, "how green the lower part goes")},
           extra=lambda p, pal: ROT)
def look_rot(frames, p, ctx):
    n = len(frames)
    h, w = frames[0].shape[:2]
    rng = np.random.default_rng(ctx["seed"] + 53)
    th = _bayer(h, w)
    rot = np.array([hex_to_rgb(c) for c in ROT], np.uint8)
    cov_any = np.zeros((h, w), bool)
    for f in frames:
        cov_any |= _cov(f)
    cols = np.nonzero(cov_any.any(axis=0))[0]
    if len(cols) == 0:
        return [f.copy() for f in frames]
    nd = int(p["drips"])
    dxs = rng.choice(cols, nd) if nd else np.array([], int)
    bottoms = np.array([np.nonzero(cov_any[:, x])[0].max() for x in dxs], int)
    ph = rng.random((nd, 2))
    rates = int(p["speed"]) + (ph[:, 1] > 0.5).astype(int)
    out = []
    for i, f in enumerate(frames):
        t = i / n
        g = f.copy()
        m = g[..., 3] > 0
        if not m.any():
            out.append(g)
            continue
        ys = np.nonzero(m.any(axis=1))[0]
        gy = np.clip((np.arange(h) - ys.min()) / max(ys.max() - ys.min(), 1), 0, 1)[:, None] * np.ones((1, w))
        if p["tint"] > 0:
            g[m, :3] = _shift_lab(g[m][:, :3], np.clip(gy[m] * 1.4, 0, 1) * p["tint"] * 1.2, -0.11, 0.06, L_add=-0.04 * p["tint"])
        cov = _alpha(f)
        puff = _blur(cov * (gy > 0.5), 2.5)
        puff /= max(puff.max(), 1e-6)
        puff = _roll(puff, 0, math.sin(2 * math.pi * t) * 1.5) * p["strength"]
        level = np.floor(puff * 2.2 + th).astype(int)
        a = np.array([0.0, 0.4, 0.6])[np.clip(level, 0, 2)]
        a[cov > 0.5] = 0
        g = _over(g, _layer(np.where((level >= 2)[..., None], rot[1], rot[0]).astype(np.uint8), a))
        covb = _cov(f)
        for j in range(nd):
            u = (t * rates[j] + ph[j, 0]) % 1.0
            y, x = int(bottoms[j] + 1 + u * u * h * 0.5), int(dxs[j])
            a_d = int(255 * (1 - 0.6 * u))
            for dy, c in ((0, rot[3] if u < 0.5 else rot[2]), (-1, rot[2]), (-2, rot[1])):
                yy = y + dy
                if 0 <= yy < h and not covb[yy, x]:
                    g[yy, x, :3] = c
                    g[yy, x, 3] = a_d
        out.append(g)
    return out


# ------------------------------------------------------------------ parsing and applying
def _cast(v, prm: Param, name: str, k: str):
    d = prm.default
    if prm.choices:
        v = str(v)
        if v not in prm.choices:
            raise ValueError(f"{name}: {k} must be one of {', '.join(prm.choices)}, not {v!r}")
        return v
    if isinstance(d, bool):
        return str(v).lower() in ("1", "true", "yes", "on")
    if isinstance(d, int):
        try:
            v = int(round(float(v)))
        except (TypeError, ValueError):
            raise ValueError(f"{name}: {k} wants a number, not {v!r}") from None
    elif isinstance(d, float):
        try:
            v = float(v)
        except (TypeError, ValueError):
            raise ValueError(f"{name}: {k} wants a number, not {v!r}") from None
    else:
        return str(v)
    if prm.lo is not None:
        v = type(d)(max(prm.lo, min(prm.hi, v)))
    return v


def _norm(d: dict) -> dict:
    name = d.get("name") or d.get("look")
    if name not in LOOKS:
        raise ValueError(f"unknown look {name!r}; the looks are: {', '.join(LOOKS)}")
    lk = LOOKS[name]
    p = lk.defaults()
    for k, v in d.items():
        if k in ("name", "look"):
            continue
        if k not in lk.params:
            raise ValueError(f"{name} has no parameter {k!r}; it has: {', '.join(lk.params)}")
        p[k] = _cast(v, lk.params[k], name, k)
    return {"name": name, **p}


def parse_looks(spec) -> list[dict]:
    """``"phosphorus:strength=0.8,decay=0.5,echo:count=3"`` (also ``+``, ``;`` or spaces between looks), a list of such
    strings, or a list of dicts ``{"name": ..., param: value}`` -> normalized dicts with every parameter filled in."""
    if spec is None or spec == "" or spec == [] or spec == {}:
        return []
    if isinstance(spec, dict):
        return [_norm(spec)]
    if isinstance(spec, (list, tuple)):
        out = []
        for item in spec:
            out += [_norm(item)] if isinstance(item, dict) else parse_looks(str(item))
        return out
    text = re.sub(r"\s*,\s*", ",", str(spec).strip())
    text = re.sub(r"\s*[;+|]+\s*|\s+", ",", text)
    out, cur = [], None
    for piece in filter(None, text.split(",")):
        if "=" in piece and ":" not in piece.split("=", 1)[0]:
            if cur is None:
                raise ValueError(f"a parameter ({piece}) came before any look name; write look:param=value")
            k, _, v = piece.partition("=")
            cur[k.strip()] = v.strip()
        else:
            name, _, first = piece.partition(":")
            cur = {"name": name.strip().lower()}
            out.append(cur)
            if first:
                k, eq, v = first.partition("=")
                if not eq:
                    raise ValueError(f"{name}: expected param=value after the colon, got {first!r}")
                cur[k.strip()] = v.strip()
    return [_norm(d) for d in out]


def spec_string(looks: list[dict]) -> str:
    """The reverse of parse_looks: ``phosphorus:strength=0.8,decay=0.6+echo:count=3`` (defaults left out)."""
    parts = []
    for d in looks:
        lk = LOOKS[d["name"]]
        kv = [f"{k}={v:g}" if isinstance(v, float) else f"{k}={v}" for k, v in d.items() if k != "name" and v != lk.params[k].default]
        parts.append(d["name"] + (":" + ",".join(kv) if kv else ""))
    return "+".join(parts)


def apply_looks(frames: list[np.ndarray], looks, palette=None, *, loop: bool = True, seed: int = 1, fps: float = 10.0) -> tuple[list[np.ndarray], dict]:
    """Run the looks in order and finish palette-locked. Returns ``(frames, info)`` with ``info["palette"]`` the hex list
    actually used (the effect's palette plus the looks' own colours), ``looks`` normalized, ``fps_scale`` and ``loop``
    (``smooth`` may double the frame count and ``dissolve`` makes a one-shot)."""
    chain = parse_looks(looks)
    frames = [np.ascontiguousarray(np.asarray(f, np.uint8)) for f in frames]
    frames = [np.dstack([f, np.full(f.shape[:2], 255, np.uint8)]) if f.shape[-1] == 3 else f for f in frames]
    base = as_palette(palette) if palette is not None and len(palette) else frames_palette(frames)
    info = {"looks": chain, "spec": spec_string(chain), "fps_scale": 1.0, "loop": bool(loop)}
    if not chain or not frames:
        info.update(palette=hexes(base), frames=len(frames))
        return frames, info
    rng = np.random.default_rng(seed)
    ctx = {"pal": base, "loop": bool(loop), "seed": int(seed), "fps": float(fps), "phases": rng.random(4)}
    extras: list[str] = []
    for d in chain:
        lk = LOOKS[d["name"]]
        p = {k: v for k, v in d.items() if k != "name"}
        if lk.extra:
            extras += list(lk.extra(p, base))
        res = lk.fn(frames, p, ctx)
        if isinstance(res, tuple):
            frames, meta = res
            info["fps_scale"] *= float(meta.get("fps_scale", 1.0))
            if "loop" in meta:
                info["loop"] = bool(meta["loop"])
                ctx["loop"] = info["loop"]
        else:
            frames = res
    full = as_palette(np.concatenate([base, np.array([hex_to_rgb(c) for c in extras], np.uint8).reshape(-1, 3)]))
    frames = lock_palette(frames, full)
    info.update(palette=hexes(full), frames=len(frames))
    return frames, info


# ------------------------------------------------------------------ files: a look on an existing sheet
def relook(json_path: str | Path, looks, name: str | None = None, out_dir: str | Path | None = None, *, gif: bool = False) -> dict:
    """Apply looks to an exported effect (``<name>.json`` + strip, rotation sheets included: every row gets the look)
    and write ``<new name>.png|json`` in the same layout, the json listing the palette used."""
    p = Path(json_path)
    meta = json.loads(p.read_text())
    strip = np.array(Image.open(p.with_suffix(".png")).convert("RGBA"))
    fw = int(meta["frame_width"])
    fh = int(meta.get("frame_height", meta["size"][1]))
    n = int(meta["frames"])
    rows = max(1, int(meta.get("rotations", 1) or 1))
    pal = meta.get("palette") or frames_palette([strip])
    loop, fps = bool(meta.get("loop", True)), float(meta.get("fps", 10) or 10)
    out_rows, info, first = [], None, None
    for r in range(rows):
        frames = [strip[r * fh:(r + 1) * fh, i * fw:(i + 1) * fw] for i in range(n)]
        frames, info = apply_looks(frames, looks, pal, loop=loop, seed=int(meta.get("seed", 1) or 1), fps=fps)
        first = first or frames
        out_rows.append(np.concatenate(frames, axis=1))
    sheet = np.concatenate(out_rows, axis=0)
    name = name or p.stem
    out = Path(out_dir) if out_dir else p.parent
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(sheet, "RGBA").save(out / f"{name}.png")
    meta2 = {**meta, "name": name, "frames": info["frames"], "fps": fps * info["fps_scale"], "loop": info["loop"], "palette": info["palette"],
             "look": info["spec"], "looks": info["looks"], "source": str(meta.get("source", "pixelforge")) + " + look"}
    (out / f"{name}.json").write_text(json.dumps(meta2, indent=2) + "\n")
    r = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), "frames": info["frames"], "fps": meta2["fps"],
         "loop": info["loop"], "palette": info["palette"], "look": info["spec"], "rotations": rows}
    if gif:
        from .spritesheet import save_gif

        save_gif([Image.fromarray(f, "RGBA") for f in first], out / f"{name}.gif", fps=meta2["fps"], zoom=3)
        r["gif"] = str(out / f"{name}.gif")
    return r


# ------------------------------------------------------------------ the demo: every look on a wisp and a bone spear
DEMO = (("wisp", (32, 48)), ("bone_spear", (96, 40)))


def demo(out_dir: str | Path, looks=None, *, frames: int = 12, fps: float = 10.0, zoom: int = 2, bg: str = "#0f1317", seed: int = 3) -> dict:
    """One GIF per look (a wisp and the bone spear side by side, on the game's dark) and a contact sheet PNG of them all."""
    from PIL import ImageDraw

    from . import spell, vfx
    from .spritesheet import save_gif

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    names = ["plain", *LOOKS] if looks is None else [n for n in (looks if isinstance(looks, (list, tuple)) else str(looks).split(" "))]
    bgc = hex_to_rgb(bg) + (255,)
    plain = {}
    for kind, (w, h) in DEMO:
        pal = vfx.PRESETS[vfx.MISSILES[kind]["palette"]] if kind in vfx.MISSILES else vfx.PRESETS["wisp"]
        plain[kind] = (spell.render_kind(kind, w, h, frames, pal, seed), pal)
    gap = 6
    cw = sum(w for _k, (w, _h) in DEMO) + gap * (len(DEMO) - 1)
    ch = max(h for _k, (_w, h) in DEMO)
    gifs, rows = {}, []
    for name in names:
        seqs, cfps = [], fps
        for kind, (w, h) in DEMO:
            seq, pal = plain[kind]
            if name != "plain":
                seq, info = apply_looks(seq, name, pal, loop=True, seed=seed, fps=fps)
                cfps = fps * info["fps_scale"]
            seqs.append(seq)
        count = max(len(s) for s in seqs)
        canvases = []
        for i in range(count):
            canvas = np.zeros((ch, cw, 4), np.uint8)
            canvas[...] = bgc
            x = 0
            for seq, (kind, (w, h)) in zip(seqs, DEMO):
                f = seq[i % len(seq)]
                y0 = (ch - h) // 2
                canvas[y0:y0 + h, x:x + w] = _over(f, canvas[y0:y0 + h, x:x + w])
                x += w + gap
            canvases.append(canvas)
        path = out / f"look_{name}.gif"
        save_gif(canvases, path, fps=cfps, zoom=zoom, background=bgc)
        gifs[name] = str(path)
        rows.append((name, [canvases[int(k * count / 3)] for k in range(3)]))
    # the contact sheet: a row per look, three moments each
    label_w = 120
    zw, zh = cw * zoom, ch * zoom
    sheet = Image.new("RGB", (label_w + 3 * (zw + 4), len(rows) * (zh + 4) + 4), bgc[:3])
    draw = ImageDraw.Draw(sheet)
    for r, (name, moments) in enumerate(rows):
        y = 4 + r * (zh + 4)
        draw.text((8, y + zh // 2 - 6), name, fill=(214, 206, 186))
        for c, canvas in enumerate(moments):
            im = Image.fromarray(canvas, "RGBA").convert("RGB").resize((zw, zh), Image.NEAREST)
            sheet.paste(im, (label_w + c * (zw + 4), y))
    contact = out / "looks_contact.png"
    sheet.save(contact, optimize=True)
    return {"ok": True, "gifs": gifs, "contact": str(contact), "looks": [n for n in names if n != "plain"], "frames": frames, "fps": fps}
