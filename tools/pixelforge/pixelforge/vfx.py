"""Procedural VFX sheets: fire, smoke, wisps, magic bursts, embers.

Godmarrow's rule: glow only on magic, lanterns and wisps; nothing else bright.
So the fire and wisp kinds carry a soft halo, smoke and embers do not, and every
sheet is drawn in hard-edged colour bands from a short OKLab ramp (a palette the
caller gives, or one of the game's presets) so it sits in the pixel world.

All loops are seamless: the noise is periodic in time, so frame N+1 is frame 0.
Output: ``<name>.png`` (frames in a row) + ``<name>.json`` (frame size, fps,
anchor, loop) in the props format, and optionally a Godmarrow sprite set
(``art/sprites/<name>.png|json`` with ``idx`` keys ``loop/down/i``) that
``SpriteSet`` loads like any creature.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

from .color import hex_to_rgb, oklab_to_rgb, rgb_to_oklab

# the game's colours: dark -> bright. Teal wisps, lantern gold, violet miasma, bone pale, iron grey smoke.
PRESETS = {
    "wisp": ["#0b1c20", "#1d4a4c", "#3f9c92", "#8fe3d2", "#eafff8"],
    "lantern": ["#2a1206", "#7a3d10", "#d08a2a", "#f3c75c", "#fff1b0"],
    "miasma": ["#140b1e", "#3a1f52", "#6d3f9a", "#a97fd1", "#e3d2f5"],
    "bone": ["#1a1712", "#4a4336", "#8f8470", "#c9bfa6", "#f0ead8"],
    "smoke": ["#1a1b1f", "#2e3036", "#45484f", "#5c6068", "#767a83"],
    "blood": ["#160303", "#3a0707", "#5a0c0c", "#731313", "#8a1a1a"],
}
KINDS = ("fire", "smoke", "wisp", "burst", "embers")


# ------------------------------------------------------------------ noise
def _lattice(rng: np.random.Generator, nx: int, ny: int) -> np.ndarray:
    return rng.random((ny, nx), dtype=np.float32)


def periodic_noise(w: int, h: int, cells: int, rng: np.random.Generator, octaves: int = 4) -> np.ndarray:
    """Tileable fBm value noise over a w x h field (periodic in x and y)."""
    out = np.zeros((h, w), dtype=np.float32)
    amp, total = 1.0, 0.0
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    for o in range(octaves):
        n = cells << o
        lat = _lattice(rng, n, n)
        fx, fy = xs / w * n, ys / h * n
        x0, y0 = np.floor(fx).astype(int), np.floor(fy).astype(int)
        tx, ty = fx - x0, fy - y0
        tx, ty = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
        x1, y1 = (x0 + 1) % n, (y0 + 1) % n
        x0, y0 = x0 % n, y0 % n
        v = (lat[y0, x0] * (1 - tx) + lat[y0, x1] * tx) * (1 - ty) + (lat[y1, x0] * (1 - tx) + lat[y1, x1] * tx) * ty
        out += v * amp
        total += amp
        amp *= 0.5
    return out / total


def _roll(field: np.ndarray, dy: float, dx: float = 0.0) -> np.ndarray:
    """Sub-pixel periodic scroll (bilinear) so a loop of N frames closes exactly."""
    h, w = field.shape
    iy, fy = int(math.floor(dy)), dy - math.floor(dy)
    ix, fx = int(math.floor(dx)), dx - math.floor(dx)
    a = np.roll(field, (iy, ix), axis=(0, 1))
    b = np.roll(field, (iy + 1, ix), axis=(0, 1))
    c = np.roll(field, (iy, ix + 1), axis=(0, 1))
    d = np.roll(field, (iy + 1, ix + 1), axis=(0, 1))
    return (a * (1 - fy) + b * fy) * (1 - fx) + (c * (1 - fy) + d * fy) * fx


# ------------------------------------------------------------------ colour
def ramp_lut(colors: list[str], bands: int) -> np.ndarray:
    """``bands`` RGB colours evenly spaced along the OKLab path through ``colors``."""
    pts = rgb_to_oklab(np.array([hex_to_rgb(c) for c in colors], dtype=np.uint8))
    t = np.linspace(0, 1, bands)
    seg = t * (len(colors) - 1)
    i = np.minimum(np.floor(seg).astype(int), len(colors) - 2)
    f = (seg - i)[:, None]
    lab = pts[i] * (1 - f) + pts[i + 1] * f
    return oklab_to_rgb(lab)


def paint(intensity: np.ndarray, alpha: np.ndarray, lut: np.ndarray, halo: np.ndarray | None = None) -> np.ndarray:
    """Hard bands from intensity; optional soft halo (glow) underneath, in the ramp's second-brightest colour."""
    h, w = intensity.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    if halo is not None:
        hm = np.clip(halo, 0, 1)
        rgba[..., :3] = lut[-2]
        rgba[..., 3] = (hm * 120).astype(np.uint8)
    idx = np.clip((intensity * (len(lut) - 1) + 0.5).astype(int), 0, len(lut) - 1)
    on = alpha > 0.5
    rgba[on, :3] = lut[idx[on]]
    rgba[on, 3] = 255
    return rgba


# ------------------------------------------------------------------ kinds
def _flame_shape(w: int, h: int, width: float = 0.85, lift: float = 1.6) -> np.ndarray:
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    u = (xs + 0.5) / w * 2 - 1
    v = 1 - (ys + 0.5) / h            # 1 at the bottom, 0 at the top
    narrow = width * (0.25 + 0.75 * v ** 0.7)
    return np.clip(1 - (u / np.maximum(narrow, 1e-3)) ** 2, 0, 1) * v ** (1 / lift)


def gen_fire(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True, scroll: float = 1.0) -> list[tuple[np.ndarray, np.ndarray, np.ndarray | None]]:
    noise = periodic_noise(w, h, 3, rng)
    shape = _flame_shape(w, h)
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, -t * h * scroll, math.sin(t * 2 * math.pi) * w * 0.05)
        inten = np.clip((n - 0.3) * 2.4, 0, 1) * np.clip(shape * 1.7, 0, 1) ** 1.4
        alpha = (inten > 0.1).astype(np.float32)
        inten = np.clip((inten - 0.1) / 0.9, 0, 1) ** 0.75
        halo = _blur(alpha * (0.3 + 0.7 * inten), 3) * 0.9 if glow else None
        out.append((inten, alpha, halo))
    return out


def gen_smoke(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    noise = periodic_noise(w, h, 2, rng, octaves=3)
    shape = _flame_shape(w, h, width=1.0, lift=4.0)
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, -t * h, math.sin(t * 2 * math.pi) * w * 0.08)
        inten = np.clip((n - 0.42) * 3.0, 0, 1) * np.clip(shape * 1.6, 0, 1)
        alpha = (inten > 0.18).astype(np.float32)
        out.append((np.clip((inten - 0.18) / 0.82, 0, 1), alpha, None))
    return out


def gen_wisp(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    r = min(w, h) * 0.18
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        cx, cy = w / 2 + math.sin(t) * w * 0.06, h * 0.45 + math.cos(t * 2) * h * 0.04
        d = np.hypot(xs + 0.5 - cx, ys + 0.5 - cy)
        core = np.clip(1 - d / r, 0, 1)
        # a tail of three fading beads drifting down and wavering
        for k in range(1, 4):
            tx = cx + math.sin(t - k * 0.9) * w * 0.12
            ty = cy + k * r * 1.1
            dk = np.hypot(xs + 0.5 - tx, ys + 0.5 - ty)
            core = np.maximum(core, np.clip(1 - dk / (r * (1 - k * 0.22)), 0, 1) * (1 - k * 0.25))
        inten = np.clip(core * 1.4, 0, 1)
        alpha = (core > 0.08).astype(np.float32)
        halo = np.clip(1 - d / (r * 3.2), 0, 1) ** 1.6 * (0.8 + 0.2 * math.sin(t * 3)) if glow else None
        out.append((inten, alpha, halo))
    return out


def gen_burst(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w / 2, h / 2
    d = np.hypot(xs + 0.5 - cx, (ys + 0.5 - cy) * 2)   # a 2:1 ground ring, as the iso floor
    R = min(w, h) * 0.95
    sparks = rng.random((14, 2)).astype(np.float32)
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        rad = R * t ** 0.6
        thick = max(1.5, 4.0 * (1 - t))
        ring = np.clip(1 - np.abs(d - rad) / thick, 0, 1) * (1 - t) ** 0.5
        inten = ring.copy()
        for a, s in sparks:
            ang = a * 2 * math.pi
            sr = R * 0.9 * t ** 0.5 * (0.6 + 0.4 * s)
            sx, sy = cx + math.cos(ang) * sr, cy + math.sin(ang) * sr * 0.5 - t * h * 0.15
            ds = np.hypot(xs + 0.5 - sx, ys + 0.5 - sy)
            inten = np.maximum(inten, np.clip(1 - ds / 1.6, 0, 1) * (1 - t))
        alpha = (inten > 0.15).astype(np.float32)
        halo = np.clip(1 - d / (rad + 4), 0, 1) * (1 - t) ** 1.5 * 0.7 if glow else None
        out.append((np.clip(inten * 1.3, 0, 1), alpha, halo))
    return out


def gen_embers(w: int, h: int, frames: int, rng: np.random.Generator, n: int = 18) -> list:
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    p = rng.random((n, 4)).astype(np.float32)   # x, y phase, speed, flicker phase
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for px, py, sp, ph in p:
            cy = ((py - t * (0.5 + sp)) % 1.0) * h
            cx = px * w + math.sin((t + ph) * 2 * math.pi) * 1.5
            fl = 0.55 + 0.45 * math.sin((t * 2 + ph) * 2 * math.pi)
            dd = np.hypot(xs + 0.5 - cx, ys + 0.5 - cy)
            inten = np.maximum(inten, np.clip(1 - dd / 1.2, 0, 1) * fl * (0.4 + 0.6 * cy / h))
        alpha = (inten > 0.2).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def _blur(a: np.ndarray, r: int) -> np.ndarray:
    out = a.copy()
    for _ in range(r):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out


# ------------------------------------------------------------------ driver
def make_vfx(
    kind: str,
    name: str,
    out_dir: str | Path,
    *,
    size: tuple[int, int] | None = None,
    frames: int = 8,
    fps: float = 10.0,
    palette: str | list[str] = "lantern",
    bands: int = 6,
    seed: int = 1,
    glow: bool | None = None,
    gif: bool = False,
    atlas_dir: str | Path | None = None,
) -> dict:
    """Render a looping VFX strip. ``palette`` is a preset name or a dark->bright hex list.
    ``glow`` defaults by kind (fire/wisp/burst on, smoke/embers off) and is the only soft alpha in the sheet."""
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {KINDS}")
    colors = PRESETS[palette] if isinstance(palette, str) else list(palette)
    w, h = size or {"fire": (32, 48), "smoke": (40, 56), "wisp": (24, 36), "burst": (64, 40), "embers": (48, 64)}[kind]
    rng = np.random.default_rng(seed)
    if glow is None:
        glow = kind in ("fire", "wisp", "burst")
    gen = {
        "fire": lambda: gen_fire(w, h, frames, rng, glow=glow),
        "smoke": lambda: gen_smoke(w, h, frames, rng),
        "wisp": lambda: gen_wisp(w, h, frames, rng, glow=glow),
        "burst": lambda: gen_burst(w, h, frames, rng, glow=glow),
        "embers": lambda: gen_embers(w, h, frames, rng),
    }[kind]()
    lut = ramp_lut(colors, bands)
    seq = [paint(i, a, lut, hl) for i, a, hl in gen]
    loop = kind != "burst"
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    strip = np.concatenate(seq, axis=1)
    Image.fromarray(strip, "RGBA").save(out / f"{name}.png")
    anchor = [w // 2, h - 1] if kind in ("fire", "smoke", "embers") else [w // 2, h // 2]
    meta = {"name": name, "kind": kind, "size": [w, h], "frames": frames, "frame_width": w, "fps": fps, "loop": loop,
            "anchor": anchor, "glow": glow, "palette": colors, "bands": bands, "seed": seed, "source": "pixelforge"}
    (out / f"{name}.json").write_text(json.dumps(meta, indent=2) + "\n")
    result = {"ok": True, "png": str(out / f"{name}.png"), "json": str(out / f"{name}.json"), **{k: meta[k] for k in ("size", "frames", "fps", "loop")}}
    if gif:
        from .spritesheet import save_gif
        save_gif([Image.fromarray(f, "RGBA") for f in seq], out / f"{name}.gif", fps=fps, zoom=4)
        result["gif"] = str(out / f"{name}.gif")
    if atlas_dir:
        result["atlas"] = export_vfx_set(seq, name, atlas_dir, fps=fps, loop=loop, anchor=anchor)
    return result


def export_vfx_set(seq: list[np.ndarray], kind: str, out_dir: str | Path, *, fps: float, loop: bool, anchor: list[int]) -> dict:
    """A Godmarrow sprite set for an effect: one anim ``loop`` (or ``once``), one view ``down``."""
    from .godmarrow_export import shelf_pack, trim

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    anim = "loop" if loop else "once"
    frames, offs = [], {}
    for i, f in enumerate(seq):
        fr, x0, y0 = trim(f)
        key = f"{anim}/down/{i}"
        frames.append((key, np.ascontiguousarray(fr)))
        offs[key] = (x0 - anchor[0], y0 - anchor[1])
    sheet, placed = shelf_pack(frames)
    png = out / f"{kind}.png"
    Image.fromarray(sheet, "RGBA").save(png)
    idx = {k: [0, *placed[k], *offs[k]] for k, _ in frames}
    data = {"sheets": [png.name], "meta": {"kind": kind, "category": "fx", "name": kind, "anims": {anim: {"frames": len(seq), "views": ["down"]}},
                                            "fps": {anim: fps}, "anchor": "(0,0) = the effect's ground point (fire, smoke, embers) or centre (wisp, burst)",
                                            "source": "pixelforge"}, "idx": idx}
    (out / f"{kind}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    return {"png": str(png), "json": str(out / f"{kind}.json"), "frames": len(seq)}
