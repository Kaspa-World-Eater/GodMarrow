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
    "blood": ["#140202", "#300606", "#480a0a", "#5c1010", "#701616"],   # dark, never lit
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
        out.append((0.2 + np.clip((inten - 0.18) / 0.82, 0, 1) * 0.4, alpha, None))
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
def add_haze(seq: list[np.ndarray], lut: np.ndarray, strength: float = 0.3, radius: int = 6) -> list[np.ndarray]:
    """A wide, faint haze round an effect in the ramp's second-darkest colour (the painterly looks): fills only the
    pixels the effect and its halo left clear, so the hard bands and the glow stay exactly as drawn."""
    out = []
    for f in seq:
        body = (f[..., 3] > 0).astype(np.float32)
        field = np.clip(_blur(body, radius) * 1.6, 0, 1) * strength
        g = f.copy()
        clear = f[..., 3] == 0
        g[clear, :3] = lut[1] if len(lut) > 1 else lut[0]
        g[clear, 3] = (field[clear] * 255).astype(np.uint8)
        out.append(g)
    return out


def render_frames(
    kind: str,
    *,
    size: tuple[int, int] | None = None,
    frames: int = 8,
    palette: str | list[str] | None = None,
    bands: int = 6,
    seed: int = 1,
    glow: bool | None = None,
    haze: bool = False,
) -> tuple[list[np.ndarray], dict]:
    """The frames of one effect loop as RGBA arrays (no files), plus what was decided: size, colours, glow, loop,
    anchor. ``make_vfx`` writes these out; the style demo composes them next to a figure."""
    if kind not in KINDS:
        raise ValueError(f"kind must be one of {KINDS}")
    if palette is None:
        base = kind.rsplit("_", 1)[0] if kind.endswith(("_front", "_back")) else kind
        palette = MISSILES[kind]["palette"] if kind in MISSILES else (ORBITS[base]["palette"] if base in ORBITS else "lantern")
    colors = PRESETS[palette] if isinstance(palette, str) else list(palette)
    w, h = size or DEFAULT_SIZE[kind]
    rng = np.random.default_rng(seed)
    if glow is None:
        glow = kind in GLOW_KINDS
    gen = GENERATORS[kind](w, h, frames, rng, glow)
    lut = ramp_lut(colors, bands)
    if kind == "cookie":   # a light texture is soft by nature: single colour, alpha = falloff
        seq = []
        for inten, _a, _h in gen:
            rgba = np.zeros((h, w, 4), dtype=np.uint8)
            rgba[..., :3] = lut[-1]
            rgba[..., 3] = (np.clip(inten, 0, 1) * 255).astype(np.uint8)
            seq.append(rgba)
    else:
        seq = [paint(i, a, lut, hl) for i, a, hl in gen]
    if haze and glow and kind != "cookie":   # haze is a kind of glow: only where the game allows one
        seq = add_haze(seq, lut)
    loop = kind in LOOPING
    anchor = [w // 2, h - 1] if kind in ("fire", "smoke", "embers", "pillar", "ward") else [w // 2, h // 2]
    return seq, {"size": (w, h), "colors": colors, "bands": bands, "glow": bool(glow), "haze": bool(haze and glow), "loop": loop, "anchor": anchor}


def make_vfx(
    kind: str,
    name: str,
    out_dir: str | Path,
    *,
    size: tuple[int, int] | None = None,
    frames: int | None = None,
    fps: float | None = None,
    palette: str | list[str] | None = None,
    bands: int | None = None,
    seed: int = 1,
    glow: bool | None = None,
    haze: bool | None = None,
    gif: bool = False,
    atlas_dir: str | Path | None = None,
    rotations: int = 0,
    style: str | None = None,
) -> dict:
    """Render a looping VFX strip. ``palette`` is a preset name or a dark->bright hex list.
    ``glow`` defaults by kind (fire/wisp/burst on, smoke/embers off) and is the only soft alpha in the sheet.
    With ``style`` (a look preset name) the bands, glow rule, haze, frame count and speed default to the preset's;
    an explicit argument always wins."""
    st = None
    if style:
        from .styles import get_style
        st = get_style(style)
    frames = frames or (st.fx_frames if st else 8)
    fps = fps or (st.fx_fps if st else 10.0)
    bands = bands or (st.fx_bands if st else 6)
    if glow is None and st is not None:
        glow = st.glow_arg
    if haze is None:
        haze = bool(st.fx_haze) if st else False
    seq, info = render_frames(kind, size=size, frames=frames, palette=palette, bands=bands, seed=seed, glow=glow, haze=haze)
    w, h = info["size"]
    colors, glow, loop, anchor = info["colors"], info["glow"], info["loop"], info["anchor"]
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    rows = [seq]
    if rotations and rotations > 1:
        # a missile drawn flying right, turned by RotSprite into N headings (row k = k * 360 / N degrees anticlockwise),
        # every row padded to one cell so the sheet is a grid; the game picks the row nearest its heading
        from .transform import rotate

        turned = [[rotate(f, k * 360.0 / rotations, expand=True) for f in seq] for k in range(rotations)]
        cw = max(f.shape[1] for row in turned for f in row)
        ch = max(f.shape[0] for row in turned for f in row)
        rows = []
        for row in turned:
            cells = []
            for f in row:
                cell = np.zeros((ch, cw, 4), np.uint8)
                oy, ox = (ch - f.shape[0]) // 2, (cw - f.shape[1]) // 2
                cell[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
                cells.append(cell)
            rows.append(cells)
        w, h = cw, ch
        anchor = [cw // 2, ch // 2]
    sheet = np.concatenate([np.concatenate(r, axis=1) for r in rows], axis=0)
    Image.fromarray(sheet, "RGBA").save(out / f"{name}.png")
    meta = {"name": name, "kind": kind, "size": [w, h], "frames": frames, "frame_width": w, "frame_height": h, "fps": fps, "loop": loop,
            "anchor": anchor, "glow": glow, "haze": info["haze"], "palette": colors, "bands": bands, "seed": seed, "rotations": int(rotations or 1),
            **({"style": st.name} if st else {}),
            "heading": "row k faces k * 360 / rotations degrees anticlockwise from flying right" if rotations and rotations > 1 else "flying right",
            "source": "pixelforge"}
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


# ------------------------------------------------------------------ more kinds (auras, spells, impacts)
def _grid(w: int, h: int):
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    return xs + 0.5, ys + 0.5


def gen_ring(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A pulsing 2:1 ground aura: a ring that breathes, with drifting motes on it."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    d = np.hypot(xs - cx, (ys - cy) * 2)
    R = min(w / 2, h) * 0.86
    motes = rng.random((10, 2)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames
        rad = R * (0.94 + 0.06 * math.sin(t * 2 * math.pi))
        ring = np.clip(1 - np.abs(d - rad) / 2.2, 0, 1)
        inten = ring * 0.85
        for a, s in motes:
            ang = (a + t * (0.5 + s)) * 2 * math.pi
            mx, my = cx + math.cos(ang) * rad, cy + math.sin(ang) * rad * 0.5
            inten = np.maximum(inten, np.clip(1 - np.hypot(xs - mx, ys - my) / 1.5, 0, 1))
        alpha = (inten > 0.2).astype(np.float32)
        halo = _blur(ring, 3) * 1.2 if glow else None
        out.append((np.clip(inten * 1.2, 0, 1), alpha, halo))
    return out


def gen_bolt(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A projectile flying right: bright head, flickering tail. Loops (the game moves it)."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    hx, hy, r = w * 0.78, h / 2, h * 0.22
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, 0, -t * w)
        head = np.clip(1 - np.hypot(xs - hx, ys - hy) / r, 0, 1)
        tail_mask = np.clip((hx - xs) / (w * 0.7), 0, 1)                      # 0 at the head, 1 at the back
        tail = np.clip(1 - np.abs(ys - hy) / (r * (1.1 - tail_mask * 0.9)), 0, 1) * (1 - tail_mask) ** 0.6 * (xs < hx)
        tail = tail * np.clip((n - 0.25) * 2.2, 0, 1)
        inten = np.maximum(head * 1.3, tail)
        alpha = (inten > 0.18).astype(np.float32)
        halo = np.clip(1 - np.hypot(xs - hx, ys - hy) / (r * 2.6), 0, 1) ** 1.5 if glow else None
        out.append((np.clip(inten, 0, 1), alpha, halo))
    return out


def gen_slash(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = False) -> list:
    """A melee arc: a crescent sweeping top to bottom on the right, one-shot. Bright leading edge, fading trail."""
    xs, ys = _grid(w, h)
    cx, cy = w * 0.1, h / 2
    R = min(w * 0.85, h * 0.5)
    d = np.hypot(xs - cx, ys - cy)
    ang = np.arctan2(ys - cy, xs - cx)   # 0 = right, negative = up
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        lead = -1.0 + 2.0 * t
        thick = R * (0.16 + 0.1 * (1 - t))
        band = np.clip(1 - np.abs(d - R * 0.85) / thick, 0, 1)
        swept = np.clip((lead - ang) / 1.4, 0, 1)                       # 0 at the edge, 1 far behind
        arc = band * (ang <= lead) * (ang > lead - 1.4) * (1 - swept) ** 1.2
        edge = band * np.clip(1 - np.abs(ang - lead) / 0.16, 0, 1)
        inten = np.clip(np.maximum(arc * 0.9, edge * 1.5) * (1 - 0.6 * t), 0, 1)
        alpha = (inten > 0.15).astype(np.float32)
        out.append((inten, alpha, _blur(arc, 2) * 0.5 if glow else None))
    return out


def gen_circle(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A summoning circle on the ground (2:1): two rings, spokes, turning slowly. Loops."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    dx, dy = xs - cx, (ys - cy) * 2
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    R = min(w / 2, h) * 0.9
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        inten = np.clip(1 - np.abs(d - R) / 1.8, 0, 1) * 0.9
        inten = np.maximum(inten, np.clip(1 - np.abs(d - R * 0.62) / 1.4, 0, 1) * 0.7)
        spokes = np.clip(1 - np.abs(np.sin((ang + t) * 3)) * 9, 0, 1) * (d < R) * (d > R * 0.62)
        inten = np.maximum(inten, spokes * 0.8)
        glyphs = np.clip(1 - np.abs(np.sin((ang - t * 0.5) * 8)) * 5, 0, 1) * np.clip(1 - np.abs(d - R * 0.8) / 2.5, 0, 1)
        inten = np.maximum(inten, glyphs)
        alpha = (inten > 0.25).astype(np.float32)
        halo = _blur(inten, 3) * 1.1 if glow else None
        out.append((np.clip(inten, 0, 1), alpha, halo))
    return out


def gen_cloud(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A lingering status cloud (poison, chill, dust): a soft blob that rolls in place. Loops, no glow."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 2, rng, octaves=3)
    cx, cy = w / 2, h * 0.55
    body = np.clip(1 - np.hypot((xs - cx) / (w * 0.45), (ys - cy) / (h * 0.38)), 0, 1)
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, math.sin(t * 2 * math.pi) * h * 0.1, -t * w)
        n = (n - n.min()) / max(n.max() - n.min(), 1e-6)   # full range whatever the seed and size
        inten = np.clip((n - 0.42) * 2.6, 0, 1) * np.clip(body * 1.6, 0, 1)
        alpha = (inten > 0.2).astype(np.float32)
        out.append((0.3 + np.clip((inten - 0.2) / 0.8, 0, 1) * 0.55, alpha, None))
    return out


def gen_shards(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = False, n: int = 12) -> list:
    """Debris bursting out and falling (bone, glass, stone). One-shot, no glow."""
    xs, ys = _grid(w, h)
    p = rng.random((n, 4)).astype(np.float32)   # angle, speed, size, spin
    cx, cy = w / 2, h * 0.6
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for a, s, sz, sp in p:
            ang = a * 2 * math.pi
            vx, vy = math.cos(ang) * (0.5 + s) * w * 0.45, -abs(math.sin(ang)) * (0.6 + s) * h * 0.5
            px, py = cx + vx * t, cy + vy * t + h * 0.9 * t * t
            L = 2.2 + sz * 3.5
            dd = np.hypot((xs - px) * (0.5 + 0.5 * abs(math.cos(sp * 6 + t * 12))), (ys - py) * 1.4)
            inten = np.maximum(inten, np.clip(1 - dd / L, 0, 1) * (0.7 + 0.3 * sz))
        alpha = (inten > 0.25).astype(np.float32) * (t < 0.95)
        out.append((np.clip(inten * 1.4, 0, 1), alpha, None))
    return out


def gen_pillar(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A beam of light from the ground, rising then fading (level-up, a vow fulfilled). One-shot."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 2, rng, octaves=3)
    cx = w / 2
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        rise = np.clip((1 - ys / h) < t * 1.6, 0, 1)
        core = np.clip(1 - np.abs(xs - cx) / (w * 0.14 * (1 + 0.6 * (1 - t))), 0, 1)
        streaks = np.clip((_roll(noise, -t * h * 2) - 0.35) * 2.5, 0, 1) * np.clip(1 - np.abs(xs - cx) / (w * 0.42), 0, 1)
        inten = np.maximum(core, streaks * 0.8) * rise * (1 - t) ** 0.7
        alpha = (inten > 0.2).astype(np.float32)
        halo = np.clip(1 - np.abs(xs - cx) / (w * 0.5), 0, 1) ** 2 * rise * (1 - t) * 0.7 if glow else None
        out.append((np.clip(inten, 0, 1), alpha, halo))
    return out


def gen_decal(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A ground splat (blood, scorch, sand), one still frame, 2:1 and ragged. No glow."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    cx, cy = w / 2, h / 2
    d = np.hypot((xs - cx) / (w * 0.48), (ys - cy) / (h * 0.46))
    inten = np.clip((1 - d) * 1.6 + (noise - 0.5) * 1.3, 0, 1)
    drops = rng.random((7, 3)).astype(np.float32)
    for a, r, s in drops:
        px, py = cx + math.cos(a * 6.28) * w * 0.46 * (0.5 + r / 2), cy + math.sin(a * 6.28) * h * 0.46 * (0.5 + r / 2)
        inten = np.maximum(inten, np.clip(1 - np.hypot(xs - px, (ys - py) * 2) / (1 + s * 2), 0, 1) * 0.6)
    alpha = (inten > 0.25).astype(np.float32)
    return [(np.clip(inten * 0.8, 0, 1), alpha, None)] * frames


def gen_drip(w: int, h: int, frames: int, rng: np.random.Generator, n: int = 6) -> list:
    """Drops falling from the top edge (blood, water, wax). Loops, no glow."""
    xs, ys = _grid(w, h)
    p = rng.random((n, 3)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for px, ph, sp in p:
            u = (t * (0.6 + sp) + ph) % 1.0
            py = u * u * h
            dd = np.hypot((xs - px * w) * 1.4, (ys - py) * (0.55 if u > 0.2 else 1.0))
            inten = np.maximum(inten, np.clip(1 - dd / 2.6, 0, 1) * (0.6 + 0.4 * u))
        alpha = (inten > 0.3).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_flash(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = False) -> list:
    """A hit flash: a bright star that collapses in three frames. One-shot."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    ang = np.arctan2(ys - cy, xs - cx)
    d = np.hypot(xs - cx, ys - cy)
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        R = min(w, h) * 0.5 * (1 - t) ** 0.5
        star = np.clip(1 - d / (R * (0.45 + 0.55 * np.abs(np.cos(ang * 2)))), 0, 1)
        inten = np.clip(star * 1.6, 0, 1)
        alpha = (inten > 0.25).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_ward(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A dome over the character: a shimmering shell, open at the bottom. Loops."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h * 0.62
    d = np.hypot((xs - cx) / (w * 0.48), (ys - cy) / (h * 0.6))
    noise = periodic_noise(w, h, 3, rng, octaves=2)
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, -t * h, t * w)
        shell = np.clip(1 - np.abs(d - 1) / 0.06, 0, 1) * (ys < cy + h * 0.2)
        shimmer = shell * np.clip((n - 0.3) * 2.0, 0, 1)
        inten = np.maximum(shell * 0.45, shimmer)
        alpha = (inten > 0.2).astype(np.float32)
        halo = _blur(shell, 3) * 1.0 if glow else None
        out.append((np.clip(inten, 0, 1), alpha, halo))
    return out


def gen_vortex(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A spiral pulling inward on the ground (2:1). Loops."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    dx, dy = xs - cx, (ys - cy) * 2
    d = np.hypot(dx, dy)
    ang = np.arctan2(dy, dx)
    R = min(w / 2, h) * 0.9
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        arms = np.clip(1 - np.abs(np.sin(ang * 2 + d / R * 7 + t)) * 3.0, 0, 1) * (d < R) * (d > 2)
        inten = arms * np.clip(1 - d / R, 0, 1) ** 0.4
        alpha = (inten > 0.3).astype(np.float32)
        halo = _blur(arms, 3) * 1.0 if glow else None
        out.append((np.clip(inten * 1.2, 0, 1), alpha, halo))
    return out


KINDS = KINDS + ("ring", "bolt", "slash", "circle", "cloud", "shards", "pillar", "decal", "drip", "flash", "ward", "vortex")
LOOPING = {"fire", "smoke", "wisp", "embers", "ring", "bolt", "circle", "cloud", "drip", "ward", "vortex"}
GLOW_KINDS = {"fire", "wisp", "burst", "ring", "bolt", "circle", "pillar", "ward", "vortex"}
DEFAULT_SIZE = {"fire": (32, 48), "smoke": (40, 56), "wisp": (24, 36), "burst": (64, 40), "embers": (48, 64),
                "ring": (80, 40), "bolt": (48, 20), "slash": (56, 64), "circle": (96, 48), "cloud": (56, 40),
                "shards": (56, 56), "pillar": (40, 96), "decal": (48, 24), "drip": (24, 40), "flash": (32, 32),
                "ward": (64, 72), "vortex": (80, 40)}
GENERATORS = {
    "fire": lambda w, h, f, r, g: gen_fire(w, h, f, r, glow=g), "smoke": lambda w, h, f, r, g: gen_smoke(w, h, f, r),
    "wisp": lambda w, h, f, r, g: gen_wisp(w, h, f, r, glow=g), "burst": lambda w, h, f, r, g: gen_burst(w, h, f, r, glow=g),
    "embers": lambda w, h, f, r, g: gen_embers(w, h, f, r), "ring": lambda w, h, f, r, g: gen_ring(w, h, f, r, glow=g),
    "bolt": lambda w, h, f, r, g: gen_bolt(w, h, f, r, glow=g), "slash": lambda w, h, f, r, g: gen_slash(w, h, f, r, glow=g),
    "circle": lambda w, h, f, r, g: gen_circle(w, h, f, r, glow=g), "cloud": lambda w, h, f, r, g: gen_cloud(w, h, f, r),
    "shards": lambda w, h, f, r, g: gen_shards(w, h, f, r), "pillar": lambda w, h, f, r, g: gen_pillar(w, h, f, r, glow=g),
    "decal": lambda w, h, f, r, g: gen_decal(w, h, f, r), "drip": lambda w, h, f, r, g: gen_drip(w, h, f, r),
    "flash": lambda w, h, f, r, g: gen_flash(w, h, f, r), "ward": lambda w, h, f, r, g: gen_ward(w, h, f, r, glow=g),
    "vortex": lambda w, h, f, r, g: gen_vortex(w, h, f, r, glow=g),
}
PRESETS.update({
    "silver": ["#141a22", "#3a4a5a", "#7f93a6", "#c2d2dd", "#f2f7fa"],     # the Hollow Mystic's mirrors
    "amber": ["#2a1a05", "#7a4a0c", "#c98a1e", "#f0c24a", "#fff0b8"],      # the Empty Hand's amber sand
    "black": ["#050507", "#15141a", "#2a2831", "#423f4a", "#5b5866"],      # the Empty Hand's black sand
    "paper": ["#2a2318", "#6b5a3a", "#b09a6a", "#e2d3a8", "#fff6dc"],      # the Shrine Keeper's charms
    "iron": ["#121214", "#2e2f33", "#55575c", "#80838a", "#aeb2b9"],
    "frost": ["#0b1a26", "#1f4a63", "#4d93b3", "#9ad4e8", "#eafaff"],
    "poison": ["#0d1a0c", "#234d1e", "#4f8f3a", "#95c860", "#e3ffb8"],
})


# ------------------------------------------------------------------ weather, world and light
def gen_rain(w: int, h: int, frames: int, rng: np.random.Generator, n: int = 40) -> list:
    """Falling streaks, slightly slanted, tileable. Loops, no glow."""
    xs, ys = _grid(w, h)
    p = rng.random((n, 3)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for px, ph, L in p:
            y0 = ((ph + t * 1.0) % 1.0) * h
            x0 = (px * w + y0 * 0.18) % w
            length = 4 + L * 6
            for k in range(int(length)):
                yy, xx = int(y0 - k) % h, int(x0 - k * 0.18) % w
                inten[yy, xx] = max(inten[yy, xx], 0.5 + 0.5 * (1 - k / length))
        alpha = (inten > 0.3).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_ashfall(w: int, h: int, frames: int, rng: np.random.Generator, n: int = 26) -> list:
    """Flakes drifting down and sideways (ash, snow, petals). Loops, no glow."""
    xs, ys = _grid(w, h)
    p = rng.random((n, 4)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for px, ph, sp, sz in p:
            y0 = ((ph + t * (0.4 + sp * 0.4)) % 1.0) * h
            x0 = (px * w + math.sin((t + ph) * 2 * math.pi) * 3) % w
            dd = np.hypot(xs - x0, ys - y0)
            inten = np.maximum(inten, np.clip(1 - dd / (1.0 + sz * 1.2), 0, 1) * (0.5 + 0.5 * sz))
        alpha = (inten > 0.3).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_fog(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A low bank of fog rolling sideways, soft-edged (hard bands, low tones). Loops, no glow."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 2, rng, octaves=3)
    band = np.clip(1 - np.abs(ys / h - 0.6) / 0.45, 0, 1) ** 1.5
    out = []
    for i in range(frames):
        t = i / frames
        n = _roll(noise, math.sin(t * 2 * math.pi) * 2, -t * w)
        n = (n - n.min()) / max(n.max() - n.min(), 1e-6)
        inten = np.clip((n - 0.35) * 2.0, 0, 1) * band
        alpha = (inten > 0.15).astype(np.float32)
        out.append((0.25 + np.clip(inten, 0, 1) * 0.4, alpha, None))
    return out


def gen_lightning(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A jagged bolt from the top, two flickers then gone. One-shot."""
    xs, ys = _grid(w, h)
    pts = [(w / 2 + rng.uniform(-w * 0.1, w * 0.1), 0.0)]
    y = 0.0
    while y < h - 2:
        y += rng.uniform(h * 0.06, h * 0.14)
        pts.append((float(np.clip(pts[-1][0] + rng.uniform(-w * 0.18, w * 0.18), 2, w - 3)), min(y, h - 1)))
    bolt = np.zeros((h, w), dtype=np.float32)
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n):
            u = k / max(n - 1, 1)
            bolt[int(y0 + (y1 - y0) * u), int(x0 + (x1 - x0) * u)] = 1
    thick = _blur(bolt, 1)
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        k = 1.0 if t < 0.3 else (0.0 if t < 0.45 else (0.7 if t < 0.65 else max(0.0, 1 - (t - 0.65) / 0.35) * 0.4))
        inten = np.clip(np.maximum(bolt * 1.5, thick * 2.0) * k, 0, 1)
        alpha = (inten > 0.25).astype(np.float32)
        out.append((inten, alpha, _blur(bolt, 4) * 2.5 * k if glow else None))
    return out


def gen_swarm(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True, n: int = 9) -> list:
    """Many small wisps drifting on their own loops (fireflies without the word). Loops."""
    xs, ys = _grid(w, h)
    p = rng.random((n, 5)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        inten = np.zeros((h, w), dtype=np.float32)
        halo = np.zeros((h, w), dtype=np.float32)
        for px, py, a, b, ph in p:
            x0 = px * w + math.sin(t * (1 + a) + ph * 6) * w * 0.12
            y0 = py * h + math.cos(t * (1 + b) + ph * 4) * h * 0.1
            dd = np.hypot(xs - x0, ys - y0)
            bright = 0.6 + 0.4 * math.sin(t * 2 + ph * 9)
            inten = np.maximum(inten, np.clip(1 - dd / 1.4, 0, 1) * bright)
            halo = np.maximum(halo, np.clip(1 - dd / 5.0, 0, 1) ** 2 * bright)
        alpha = (inten > 0.3).astype(np.float32)
        out.append((inten, alpha, halo * 0.9 if glow else None))
    return out


def gen_chain(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A hanging chain swinging gently from the top. Loops, no glow."""
    xs, ys = _grid(w, h)
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        inten = np.zeros((h, w), dtype=np.float32)
        for k in range(int(h / 3)):
            yy = 1 + k * 3
            u = yy / h
            xx = w / 2 + math.sin(t) * u * u * w * 0.22
            rx, ry = (2.2, 1.4) if k % 2 == 0 else (1.4, 2.2)
            dd = np.hypot((xs - xx) / rx, (ys - yy) / ry)
            inten = np.maximum(inten, np.clip(1 - np.abs(dd - 0.75) / 0.35, 0, 1) * (0.55 + 0.45 * (k % 2)))
        alpha = (inten > 0.3).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_rune(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True) -> list:
    """A glowing mark on the ground: a ring with strokes that breathe. Loops."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    dx, dy = xs - cx, (ys - cy) * 2
    d = np.hypot(dx, dy)
    R = min(w / 2, h) * 0.8
    strokes = np.zeros((h, w), dtype=np.float32)
    for _ in range(5):
        a0, a1 = rng.uniform(0, 2 * math.pi, 2)
        r0, r1 = rng.uniform(0.15, 0.9, 2) * R
        x0, y0, x1, y1 = cx + math.cos(a0) * r0, cy + math.sin(a0) * r0 * 0.5, cx + math.cos(a1) * r1, cy + math.sin(a1) * r1 * 0.5
        n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for k in range(n):
            u = k / max(n - 1, 1)
            strokes[int(np.clip(y0 + (y1 - y0) * u, 0, h - 1)), int(np.clip(x0 + (x1 - x0) * u, 0, w - 1))] = 1
    strokes = np.clip(_blur(strokes, 1) * 2.5, 0, 1)
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        breathe = 0.75 + 0.25 * math.sin(t)
        ring = np.clip(1 - np.abs(d - R) / 1.6, 0, 1)
        inten = np.clip(np.maximum(ring, strokes) * breathe * 1.2, 0, 1)
        alpha = (inten > 0.25).astype(np.float32)
        out.append((inten, alpha, _blur(inten, 3) * 1.0 if glow else None))
    return out


def gen_pool(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A pool spreading on the ground (blood, water, tar) then holding. One-shot, no glow."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    cx, cy = w / 2, h / 2
    d = np.hypot((xs - cx) / (w * 0.48), (ys - cy) / (h * 0.46)) + (noise - 0.5) * 0.5
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        r = min(1.0, t * 1.4) ** 0.6
        inten = np.clip((r - d) * 4, 0, 1) * 0.75
        alpha = (inten > 0.25).astype(np.float32)
        out.append((inten, alpha, None))
    return out


def gen_cookie(w: int, h: int, frames: int, rng: np.random.Generator) -> list:
    """A light cookie: soft radial falloff with faint flicker, for PointLight2D textures. Loops, single colour."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    d = np.hypot(xs - cx, ys - cy) / (min(w, h) / 2)
    out = []
    for i in range(frames):
        t = i / frames * 2 * math.pi
        k = 0.96 + 0.04 * math.sin(t * 3)
        inten = np.clip(1 - d / k, 0, 1) ** 1.8
        alpha = (inten > 0.02).astype(np.float32)
        out.append((inten, alpha, None))
    return out


KINDS = KINDS + ("rain", "ashfall", "fog", "lightning", "swarm", "chain", "rune", "pool", "cookie")
LOOPING |= {"rain", "ashfall", "fog", "swarm", "chain", "rune", "cookie"}
GLOW_KINDS |= {"lightning", "swarm", "rune"}
DEFAULT_SIZE.update({"rain": (64, 64), "ashfall": (64, 64), "fog": (128, 48), "lightning": (48, 112), "swarm": (80, 56),
                     "chain": (12, 64), "rune": (72, 36), "pool": (56, 28), "cookie": (128, 128)})
GENERATORS.update({
    "rain": lambda w, h, f, r, g: gen_rain(w, h, f, r), "ashfall": lambda w, h, f, r, g: gen_ashfall(w, h, f, r),
    "fog": lambda w, h, f, r, g: gen_fog(w, h, f, r), "lightning": lambda w, h, f, r, g: gen_lightning(w, h, f, r, glow=g),
    "swarm": lambda w, h, f, r, g: gen_swarm(w, h, f, r, glow=g), "chain": lambda w, h, f, r, g: gen_chain(w, h, f, r),
    "rune": lambda w, h, f, r, g: gen_rune(w, h, f, r, glow=g), "pool": lambda w, h, f, r, g: gen_pool(w, h, f, r),
    "cookie": lambda w, h, f, r, g: gen_cookie(w, h, f, r),
})
PRESETS.update({"rain": ["#0c1218", "#22313c", "#3f5563", "#6b8593", "#a7bcc6"], "white": ["#000000", "#404040", "#808080", "#c0c0c0", "#ffffff"]})


# ---------------------------------------------------------------- missiles: spears, bolts, teeth
# Structured projectiles in the manner of the classic action-RPG missiles (a spinning spear of bone fragments, a
# fan of teeth, an ice bolt, a fire bolt): a spindle body with a twisting stripe, fragments on a helix round the axis
# that pass in front and behind it, a trail that falls away, and a glow. Every pixel is generated here. Missiles fly
# to the right; the game (or ``rotations``) turns them.
MISSILES = {
    "bone_spear": {"palette": "bone", "size": (96, 40), "length": 0.86, "radius": 0.17, "twist": 3.0, "twist_depth": 0.5, "spin": 1.0, "shards": 18,
                   "shard_len": 7.0, "helix": 0.8, "trail": 0.6, "glow": True, "core": 1.0, "loop": True, "head": 0.55, "shaft": 0.4},
    "teeth": {"palette": "bone", "size": (96, 56), "length": 0.42, "radius": 0.07, "twist": 0.0, "spin": 0.6, "shards": 12, "shard_len": 4.0,
              "helix": 0.9, "trail": 0.3, "glow": False, "core": 0.9, "loop": True, "fan": 3, "head": 0.6, "shaft": 0.5},
    "ice_bolt": {"palette": "frost", "size": (80, 32), "length": 0.7, "radius": 0.16, "twist": 1.5, "twist_depth": 0.2, "spin": 0.6, "shards": 8,
                 "shard_len": 4.5, "helix": 0.7, "trail": 0.7, "glow": True, "core": 1.0, "loop": True, "head": 0.55, "shaft": 0.45},
    "fire_bolt": {"palette": "lantern", "size": (80, 32), "length": 0.62, "radius": 0.2, "twist": 0.0, "spin": 1.2, "shards": 8, "shard_len": 3.0,
                  "helix": 0.5, "trail": 1.0, "glow": True, "core": 1.0, "loop": True, "head": 0.5, "shaft": 0.6, "jagged": True},
}


def _spindle(xs, ys, x0, x1, cy, rmax, bright_front=0.35, head=0.72, jag=None, shaft=0.38):
    """A spear body between x0 (tail) and x1 (point): a slim shaft, a blade that widens from ``head`` and tapers to
    the point over the last quarter; ``jag`` (a noise field) chips the edge. Brighter toward the head, with a
    lit top edge so it reads as a solid rod, not a flat bar."""
    u = np.clip((xs - x0) / max(x1 - x0, 1e-6), 0, 1)
    blade = np.clip((u - head) / max(1 - head, 1e-6), 0, 1)           # 0 on the shaft, 1 at the point
    widen = np.clip(np.sin(np.pi * np.clip(blade, 0, 1) ** 0.5), 0, 1)   # widens early, then tapers to the point
    taper_tail = np.clip(u / 0.06, 0, 1) ** 0.5
    r = rmax * (shaft + (1 - shaft) * widen) * taper_tail * np.clip((1 - u) / 0.14, 0, 1) ** 0.6 + 1e-6
    d = ys - cy
    edge = r if jag is None else r * (0.85 + 0.35 * jag)
    inside = np.clip((edge - np.abs(d)) / 1.0 + 0.5, 0, 1)
    shade = 0.55 + 0.45 * np.clip(1 - (d + 0.35 * r) ** 2 / (1.6 * r * r), 0, 1)   # a highlight above the axis
    body = inside * shade
    body = np.where((xs >= x0) & (xs <= x1), body, 0)
    return body * (1 - bright_front + bright_front * u), u


def _shard(inten, xs, ys, px, py, length, angle, depth_shade, width: float = 1.3):
    """A sliver (or, with ``width``, a chunk) of bone / ice at px, py, turned by angle, lit along its top edge."""
    ca, sa = math.cos(angle), math.sin(angle)
    dx, dy = xs - px, ys - py
    along = dx * ca + dy * sa
    across = -dx * sa + dy * ca
    body = np.clip(1 - np.abs(along) / length, 0, 1) ** 0.5 * np.clip((width - np.abs(across)) / 1.0 + 0.5, 0, 1)
    lit = 0.75 + 0.25 * np.clip(1 - (across + width * 0.5) ** 2 / max(width * width, 1e-6), 0, 1)
    np.maximum(inten, body * lit * depth_shade, out=inten)


def gen_missile(w: int, h: int, frames: int, rng: np.random.Generator, *, glow: bool = True, spec: dict | None = None) -> list:
    spec = {**MISSILES["bone_spear"], **(spec or {})}
    xs, ys = _grid(w, h)
    cy = h / 2
    L = w * spec["length"]
    x1 = w * 0.92
    x0 = x1 - L
    rmax = h * spec["radius"]
    n = int(spec["shards"])
    fan = int(spec.get("fan", 1))
    # each shard: position along the body (0 tail .. 1 head), phase on the helix, size, a lane for fans
    sp = rng.random((n, 4)).astype(np.float32)
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        back = np.zeros((h, w), dtype=np.float32)
        lanes = [cy] if fan == 1 else [cy + (k - (fan - 1) / 2) * h * 0.3 for k in range(fan)]
        for lane_i, ly in enumerate(lanes):
            jag = _roll(noise, 0, -w * 0.4 * t) if spec.get("jagged", True) else None
            body, u = _spindle(xs, ys, x0 + (lane_i % 2) * w * 0.06, x1 - (lane_i % 2) * w * 0.06, ly, rmax, head=spec.get("head", 0.72), jag=jag, shaft=spec.get("shaft", 0.38))
            if spec["twist"]:
                dep = spec.get("twist_depth", 0.3)
                stripe = (1 - dep * 0.5) + dep * 0.5 * np.cos(2 * math.pi * (spec["twist"] * u - spec["spin"] * t) + 2.0 * (ys - cy) / max(rmax, 1))
                body = body * stripe
            inten = np.maximum(inten, body * spec["core"])
        # the helix of fragments: in front (drawn over the body) and behind (drawn under, darker)
        for j in range(n):
            s, phase, size, lane_r = sp[j]
            lane_y = lanes[int(lane_r * len(lanes)) % len(lanes)]
            s_t = (s + 0.0) if spec["loop"] else s
            px = x0 + s_t * L
            ang = 2 * math.pi * (phase + spec["spin"] * t * (1.0 + 0.3 * size))
            py = lane_y + math.sin(ang) * (rmax * 2.2 * spec["helix"] * (0.4 + 0.6 * s_t))
            depth = math.cos(ang)
            tilt = 0.45 * math.sin(ang) + 0.15 * (size - 0.5)
            shade = 0.6 + 0.4 * (0.5 + 0.5 * depth)
            target = inten if depth >= 0 else back
            _shard(target, xs, ys, px, py, spec["shard_len"] * (0.7 + 0.8 * size), tilt, min(1.0, shade * (0.9 + 0.3 * size)))
        # the trail: fragments falling away behind the tail, fading, plus a wisp of dust
        tr = spec["trail"]
        if tr > 0:
            for j in range(n // 2):
                s, phase, size, _ = sp[j]
                life = (s + t * 1.0) % 1.0
                px = x0 - life * w * 0.28 * tr
                py = cy + math.sin(2 * math.pi * (phase + t)) * rmax * 1.4 * life + (life * life) * h * 0.12
                _shard(back, xs, ys, px, py, spec["shard_len"] * 0.7, 0.6 * math.sin(2 * math.pi * (phase + 2 * t)), (1 - life) * 0.7)
            dust = _roll(noise, 0, -w * 0.35 * t)
            band = np.exp(-((ys - cy) ** 2) / (2 * (rmax * 1.6) ** 2)) * np.clip((x0 + w * 0.15 - xs) / (w * 0.35), 0, 1) * np.clip((xs - 2) / (w * 0.15), 0, 1)
            back = np.maximum(back, dust * band * 0.5 * tr)
        full = np.maximum(inten, back * 0.75)
        alpha = (full > 0.28).astype(np.float32)
        halo = _blur(np.clip(full, 0, 1), 3) * 0.9 if glow else None
        out.append((np.clip(full * 1.25, 0, 1), alpha, halo))
    return out


for _name, _spec in MISSILES.items():
    GENERATORS[_name] = (lambda w, h, frames, rng, glow, _s=_spec: gen_missile(w, h, frames, rng, glow=glow, spec=_s))
    DEFAULT_SIZE[_name] = _spec["size"]
    if _spec["glow"]:
        GLOW_KINDS.add(_name)
    LOOPING.add(_name)
KINDS = KINDS + tuple(MISSILES)
PRESETS.setdefault("frost", ["#0a1620", "#1e3a52", "#3f7aa0", "#8fd0ec", "#eafaff"])


# ---------------------------------------------------------------- impacts, novas, walls
def gen_nova(w: int, h: int, frames: int, rng: np.random.Generator, glow: bool = True, n: int = 28, flat: float = 0.5) -> list:
    """A ring of fragments bursting outward on the ground plane (a frost nova, a bone nova): an expanding ellipse of
    shards with a bright leading edge and a fading inner haze. One-shot."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    p = rng.random((n, 3)).astype(np.float32)   # angle, size, speed
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        R = (0.12 + 0.88 * (1 - (1 - t) ** 2)) * w * 0.48
        inten = np.zeros((h, w), dtype=np.float32)
        for a, sz, sp in p:
            ang = a * 2 * math.pi
            r = R * (0.85 + 0.3 * sp)
            px, py = cx + math.cos(ang) * r, cy + math.sin(ang) * r * flat
            _shard(inten, xs, ys, px, py, 2.5 + 4 * sz, ang + math.pi / 2 + 0.4 * (sz - 0.5), 0.9 + 0.2 * sz)
        # the leading edge: a thin bright ellipse
        d = np.hypot((xs - cx), (ys - cy) / flat)
        edge = np.exp(-((d - R) ** 2) / (2 * (1.5 + 2 * t) ** 2)) * (1 - 0.6 * t)
        haze = np.clip(1 - d / max(R, 1), 0, 1) * noise * 0.5 * (1 - t)
        full = np.maximum(inten, np.maximum(edge, haze))
        alpha = (full > 0.3).astype(np.float32) * (t < 0.97)
        halo = _blur(np.clip(full, 0, 1), 3) * (1 - t) if glow else None
        out.append((np.clip(full * 1.2, 0, 1), alpha, halo))
    return out


def gen_firewall(w: int, h: int, frames: int, rng: np.random.Generator, glow: bool = True) -> list:
    """A line of flames along the ground, seen from the game's angle: several tongues of fire side by side with
    licking tips, embers above. Loops."""
    xs, ys = _grid(w, h)
    noise = periodic_noise(w, h, 4, rng, octaves=4)
    noise2 = periodic_noise(w, h, 2, rng, octaves=3)
    out = []
    base = h * 0.9
    for i in range(frames):
        t = i / frames
        n1 = _roll(noise, -h * 1.2 * t, 0)
        n2 = _roll(noise2, -h * 0.5 * t, w * 0.25 * t)
        # two families of tongues, offset, so the wall is a continuous flickering mass with licking tips
        ta = 0.55 + 0.45 * np.cos(2 * math.pi * (xs / w * 3.5 + 0.7 * n2 + 0.3 * t))
        tb = 0.55 + 0.45 * np.cos(2 * math.pi * (xs / w * 5.5 - 0.5 * n2 - 0.45 * t + 0.3))
        height = h * (0.3 + 0.55 * n1) * np.maximum(ta, 0.75 * tb)
        rise = base - ys
        inten = np.clip((height - rise) / (h * 0.22), 0, 1) * np.clip(rise / (h * 0.06), 0, 1)
        inten = inten * (0.7 + 0.3 * n1) * np.clip(1 - np.abs(xs - w / 2) / (w * 0.5), 0, 1) ** 0.25
        inten = np.where(ys <= base, inten, 0)
        alpha = (inten > 0.28).astype(np.float32)
        halo = _blur(np.clip(inten, 0, 1), 4) * 0.8 if glow else None
        out.append((np.clip(inten * 1.3, 0, 1), alpha, halo))
    return out


def gen_bone_burst(w: int, h: int, frames: int, rng: np.random.Generator, glow: bool = True) -> list:
    """What a bone spear leaves on impact: a flash, chips flying out and down, a puff of bone dust. One-shot."""
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h * 0.55
    n = 16
    p = rng.random((n, 4)).astype(np.float32)
    noise = periodic_noise(w, h, 3, rng, octaves=3)
    out = []
    for i in range(frames):
        t = (i + 0.5) / frames
        inten = np.zeros((h, w), dtype=np.float32)
        flash = np.exp(-(((xs - cx) ** 2 + (ys - cy) ** 2) / (2 * (w * 0.12 * (1 - t) + 1) ** 2))) * max(0.0, 1 - t * 3)
        for a, s, sz, sp in p:
            ang = a * 2 * math.pi
            px = cx + math.cos(ang) * (0.4 + s) * w * 0.4 * t
            py = cy + math.sin(ang) * (0.4 + s) * h * 0.3 * t + h * 0.5 * t * t
            _shard(inten, xs, ys, px, py, 3 + 4 * sz, ang + sp * 6 * t, min(1.0, 1.1 - t * 0.4))
        puff = np.clip(1 - np.hypot(xs - cx, (ys - cy) * 1.4) / (w * 0.3 * (0.3 + t)), 0, 1) * _roll(noise, -h * 0.3 * t, 0) * 0.55 * (1 - t)
        full = np.maximum(np.clip(inten * 1.3, 0, 1), np.maximum(flash, puff))
        alpha = (full > 0.3).astype(np.float32) * (t < 0.97)
        halo = _blur(np.clip(full, 0, 1), 3) * (1 - t) if glow else None
        out.append((np.clip(full * 1.2, 0, 1), alpha, halo))
    return out


GENERATORS.update({"nova": gen_nova, "firewall": gen_firewall, "bone_burst": gen_bone_burst})
DEFAULT_SIZE.update({"nova": (128, 72), "firewall": (128, 64), "bone_burst": (64, 56)})
LOOPING |= {"firewall"}
GLOW_KINDS |= {"nova", "firewall", "bone_burst"}
KINDS = KINDS + ("nova", "firewall", "bone_burst")


# ---------------------------------------------------------------- orbits: bone armour, shard auras
# Fragments circling a figure at chest height. Rendered as two kinds from one motion: ``orbit_front`` is the half of
# the ring nearer the camera (attach in front of the character) and ``orbit_back`` the far half (attach behind), so
# the pieces pass in front of and behind the body. Both loop with the same period.
ORBITS = {
    "bone_armor": {"palette": "bone", "n": 9, "rx": 0.42, "ry": 0.16, "len": 7.0, "width": 3.2, "spin": 1.0, "tumble": 2.0, "glow": True, "wisps": 0},
    "bone_shard_aura": {"palette": "bone", "n": 14, "rx": 0.46, "ry": 0.2, "len": 5.5, "width": 2.4, "spin": -0.6, "tumble": 3.0, "glow": True, "wisps": 5},
}


def gen_orbit(w: int, h: int, frames: int, rng: np.random.Generator, glow: bool = True, spec: dict | None = None, half: str = "front") -> list:
    spec = {**ORBITS["bone_armor"], **(spec or {})}
    xs, ys = _grid(w, h)
    cx, cy = w / 2, h / 2
    n = int(spec["n"])
    ph = rng.random((n, 3)).astype(np.float32)
    out = []
    for i in range(frames):
        t = i / frames
        inten = np.zeros((h, w), dtype=np.float32)
        for j in range(n):
            a = 2 * math.pi * (j / n + spec["spin"] * t)
            depth = math.sin(a)             # +1 nearest the camera (bottom of the ellipse on screen)
            if (half == "front") != (depth >= 0):
                continue
            px = cx + math.cos(a) * w * spec["rx"]
            py = cy + math.sin(a) * h * spec["ry"] * 2
            tilt = 2 * math.pi * (ph[j, 0] + spec["tumble"] * t * (0.6 + 0.8 * ph[j, 1]))
            shade = 0.7 + 0.3 * (0.5 + 0.5 * depth)
            _shard(inten, xs, ys, px, py, spec["len"] * (0.8 + 0.5 * ph[j, 2]), tilt, shade, width=spec.get("width", 1.3) * (0.8 + 0.4 * ph[j, 1]))
        for k in range(int(spec["wisps"])):
            a = 2 * math.pi * (k / max(spec["wisps"], 1) - 0.4 * spec["spin"] * t + 0.13)
            depth = math.sin(a)
            if (half == "front") != (depth >= 0):
                continue
            px = cx + math.cos(a) * w * spec["rx"] * 0.8
            py = cy + math.sin(a) * h * spec["ry"] * 1.6 - h * 0.08
            d = np.hypot(xs - px, (ys - py) * 1.3)
            inten = np.maximum(inten, np.clip(1 - d / 3.0, 0, 1) * 0.8)
        alpha = (inten > 0.3).astype(np.float32)
        halo = _blur(np.clip(inten, 0, 1), 2) * 0.7 if glow else None
        out.append((np.clip(inten * 1.2, 0, 1), alpha, halo))
    return out


for _name, _spec in ORBITS.items():
    for _half in ("front", "back"):
        GENERATORS[f"{_name}_{_half}"] = (lambda w, h, frames, rng, glow, _s=_spec, _h=_half: gen_orbit(w, h, frames, rng, glow=glow, spec=_s, half=_h))
        DEFAULT_SIZE[f"{_name}_{_half}"] = (112, 64)
        LOOPING.add(f"{_name}_{_half}")
        if _spec["glow"]:
            GLOW_KINDS.add(f"{_name}_{_half}")
        KINDS = KINDS + (f"{_name}_{_half}",)
PRESETS.setdefault("iron", ["#0f1012", "#2b2d33", "#4c5059", "#7d8290", "#b7bcc6"])
