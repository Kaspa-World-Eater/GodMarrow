"""Source nodes: noise, shapes and the particle emitter. Each returns a field (T, H, W) or, for the emitter, a bundle
(a dict of fields: v, age, height, dist, speed) that paint and take read."""
from __future__ import annotations

import math

import numpy as np

from . import noise as N
from .graph import Context, Field, node

# ------------------------------------------------------------------ noise
_NOISE_DOC = "cells across the width ({} per loop in time); octaves of detail; the same seed, the same field."


@node("perlin", "source", "Perlin gradient noise, tileable in space and time. cells across the width, tcells beats per loop, octaves of detail.")
def perlin(ctx: Context, cells: float = 4.0, tcells: int = 1, octaves: int = 3, gain: float = 0.5, seed: int = 0, _id: str = "") -> Field:
    return N.perlin(ctx.w, ctx.h, ctx.frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("simplex", "source", "Simplex-style noise (triangular lattice, no square-grid bias), tileable; cells, tcells, octaves.")
def simplex(ctx: Context, cells: float = 4.0, tcells: int = 1, octaves: int = 3, gain: float = 0.5, seed: int = 0, _id: str = "") -> Field:
    return N.simplex(ctx.w, ctx.h, ctx.frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("cellular", "source", "Worley cells: mode f1 (dark at the points), f2f1 (bright walls), id (flat value per cell); drift per loop.")
def cellular(ctx: Context, cells: float = 4.0, mode: str = "f1", drift: float = 0.3, jitter: float = 1.0, seed: int = 0, _id: str = "") -> Field:
    return N.cellular(ctx.w, ctx.h, ctx.frames, cells=cells, mode=mode, drift=drift, jitter=jitter, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("ridged", "source", "Ridged multifractal noise: sharp bright creases for licks, cracks and veins; tileable.")
def ridged(ctx: Context, cells: float = 4.0, tcells: int = 1, octaves: int = 4, gain: float = 0.55, seed: int = 0, _id: str = "") -> Field:
    return N.ridged(ctx.w, ctx.h, ctx.frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("value_noise", "source", "Soft value noise: blobs between random lattice values; tileable.")
def value_noise(ctx: Context, cells: float = 4.0, tcells: int = 1, seed: int = 0, _id: str = "") -> Field:
    return N.value(ctx.w, ctx.h, ctx.frames, cells=cells, tcells=tcells, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("flow", "source", "A swirling vector field (curl noise, divergence free) in pixels; strength scales it. Feed warp, smoke, emitters.", returns="vectors")
def flow(ctx: Context, cells: float = 3.0, tcells: int = 1, octaves: int = 2, strength: float = 1.0, seed: int = 0, _id: str = "") -> np.ndarray:
    return N.flow(ctx.w, ctx.h, ctx.frames, cells=cells, tcells=tcells, octaves=octaves, strength=strength, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("blue", "source", "Blue-noise dots: one jittered point per cell, soft discs of radius (cells), twinkling over the loop.")
def blue(ctx: Context, cells: float = 8.0, radius: float = 0.35, twinkle: float = 0.5, seed: int = 0, _id: str = "") -> Field:
    return N.blue(ctx.w, ctx.h, ctx.frames, cells=cells, radius=radius, twinkle=twinkle, seed=ctx.node_seed(f"{_id}:{seed}"))


@node("scroll", "source", "A field moved by (dx, dy) pixels per loop (whole loops stay seamless when the field tiles).")
def scroll(ctx: Context, field: Field, dx: float = 0.0, dy: float = -1.0) -> Field:
    out = np.empty_like(field)
    for t in range(ctx.frames):
        f = t / max(ctx.frames, 1)
        out[t] = np.roll(np.roll(field[t], int(round(dx * ctx.w * f)), axis=1), int(round(dy * ctx.h * f)), axis=0)
    return out


@node("scroll_vectors", "source", "A vector field moved by (dx, dy) canvas fractions per loop (seamless when it tiles).", returns="vectors")
def scroll_vectors(ctx: Context, vectors: np.ndarray, dx: float = 0.0, dy: float = -1.0) -> np.ndarray:
    out = np.empty_like(vectors)
    for t in range(ctx.frames):
        f = t / max(ctx.frames, 1)
        out[t] = np.roll(np.roll(vectors[t], int(round(dx * ctx.w * f)), axis=1), int(round(dy * ctx.h * f)), axis=0)
    return out


# ------------------------------------------------------------------ shapes
def _xy(ctx: Context, x: float, y: float):
    X, Y = ctx.grid()
    return X - (x * ctx.w), Y - (y * ctx.h)


def _soft(d: np.ndarray, edge: float) -> np.ndarray:
    """1 inside (d <= 0), 0 outside, a ramp of ``edge`` pixels in between."""
    return np.clip(1.0 - d / max(edge, 1e-3), 0.0, 1.0).astype(np.float32)


def _per_frame(ctx: Context, one: np.ndarray) -> Field:
    return np.repeat(one[None], ctx.frames, axis=0).astype(np.float32)


@node("circle", "shape", "A disc at (x, y) in 0..1 of the canvas, radius in 0..1 of the width; falloff 0 = hard, 1 = a soft glow to the edge; grow > 0 swells it from nothing over the loop; squash flattens it (ground pools).")
def circle(ctx: Context, x: float = 0.5, y: float = 0.5, radius: float = 0.3, falloff: float = 0.0, edge: float = 1.0, grow: float = 0.0, squash: float = 1.0) -> Field:
    dx, dy = _xy(ctx, x, y)
    d = np.sqrt(dx * dx + (dy / max(squash, 1e-3)) ** 2)
    out = ctx.zeros()
    for t in range(ctx.frames):
        f = (t + 1) / ctx.frames if grow > 0 else 1.0
        r = radius * ctx.w * (f ** (1.0 / max(grow, 1e-3)) if grow > 0 else 1.0)
        if falloff > 0:
            out[t] = np.clip(1.0 - d / max(r, 1e-3), 0, 1) ** (1.0 / max(falloff, 1e-3) if falloff < 1 else 1.0)
        else:
            out[t] = _soft(d - r, edge)
    return out


@node("radial_vectors", "shape", "A vector field pointing away from (x, y), ``strength`` px at full, fading to nothing by radius (canvas width fraction).", returns="vectors")
def radial_vectors(ctx: Context, x: float = 0.5, y: float = 0.5, strength: float = 3.0, radius: float = 0.5) -> np.ndarray:
    dx, dy = _xy(ctx, x, y)
    d = np.maximum(np.hypot(dx, dy), 1e-3)
    k = strength * np.clip(1.0 - d / max(radius * ctx.w, 1e-3), 0, 1)
    v = np.stack([dx / d * k, dy / d * k], -1).astype(np.float32)
    return np.repeat(v[None], ctx.frames, axis=0)


@node("ring", "shape", "A ring at (x, y): radius and width in 0..1 of the width; with grow > 0 it expands over the loop (0 at the start to radius).")
def ring(ctx: Context, x: float = 0.5, y: float = 0.5, radius: float = 0.4, width: float = 0.05, grow: float = 0.0, edge: float = 1.0, squash: float = 1.0) -> Field:
    dx, dy = _xy(ctx, x, y)
    d = np.sqrt(dx * dx + (dy / max(squash, 1e-3)) ** 2)
    out = ctx.zeros()
    for t in range(ctx.frames):
        f = (t + 0.5) / ctx.frames if grow > 0 else 1.0
        r = radius * ctx.w * (f ** (1.0 / max(grow, 1e-3)) if grow > 0 else 1.0)
        wd = width * ctx.w
        out[t] = _soft(np.abs(d - r) - wd * 0.5, edge)
    return out


@node("line", "shape", "A line from (x0, y0) to (x1, y1) (canvas fractions), width in pixels; taper 1 thins it toward the end.")
def line(ctx: Context, x0: float = 0.5, y0: float = 0.9, x1: float = 0.5, y1: float = 0.1, width: float = 2.0, taper: float = 0.0, edge: float = 1.0) -> Field:
    X, Y = ctx.grid()
    ax, ay, bx, by = x0 * ctx.w, y0 * ctx.h, x1 * ctx.w, y1 * ctx.h
    vx, vy = bx - ax, by - ay
    L2 = max(vx * vx + vy * vy, 1e-6)
    u = np.clip(((X - ax) * vx + (Y - ay) * vy) / L2, 0, 1)
    px, py = ax + u * vx, ay + u * vy
    d = np.sqrt((X - px) ** 2 + (Y - py) ** 2)
    wd = width * 0.5 * (1.0 - taper * u)
    return _per_frame(ctx, _soft(d - wd, edge))


@node("polygon", "shape", "A regular polygon of n sides at (x, y), radius in 0..1 of the width, turned by angle degrees (spin degrees per loop).")
def polygon(ctx: Context, x: float = 0.5, y: float = 0.5, radius: float = 0.3, sides: int = 5, angle: float = 0.0, spin: float = 0.0, edge: float = 1.0, star: float = 0.0) -> Field:
    dx, dy = _xy(ctx, x, y)
    r = radius * ctx.w
    out = ctx.zeros()
    n = max(3, int(sides))
    for t in range(ctx.frames):
        a = math.radians(angle + spin * t / ctx.frames)
        th = np.arctan2(dy, dx) - a
        rad = np.sqrt(dx * dx + dy * dy)
        sector = np.pi / n
        local = np.mod(th, 2 * sector) - sector
        edge_r = r * np.cos(sector) / np.maximum(np.cos(local), 1e-3)
        if star > 0:
            edge_r = edge_r * (1.0 - star * (np.abs(local) / sector))
        out[t] = _soft(rad - edge_r, edge)
    return out


@node("text", "shape", "Letters drawn with the bundled bitmap face at (x, y); size in pixels (10 = small). For runes, marks, counters.")
def text(ctx: Context, words: str = "A", x: float = 0.5, y: float = 0.5, size: int = 10) -> Field:
    from PIL import Image as PILImage, ImageDraw, ImageFont
    try:
        font = ImageFont.load_default(size=max(6, int(size)))
    except TypeError:  # older Pillow
        font = ImageFont.load_default()
    im = PILImage.new("L", (ctx.w, ctx.h), 0)
    d = ImageDraw.Draw(im)
    box = d.textbbox((0, 0), words, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text((x * ctx.w - tw / 2 - box[0], y * ctx.h - th / 2 - box[1]), words, fill=255, font=font)
    return _per_frame(ctx, np.asarray(im, np.float32) / 255.0)


@node("gradient", "shape", "A linear ramp 0..1 across the canvas: direction up (1 at the bottom, 0 at the top), down, left, right; power bends it.")
def gradient(ctx: Context, direction: str = "up", power: float = 1.0) -> Field:
    X, Y = ctx.grid()
    g = {"up": Y / ctx.h, "down": 1 - Y / ctx.h, "left": X / ctx.w, "right": 1 - X / ctx.w}[direction]
    return _per_frame(ctx, np.clip(g, 0, 1) ** power)


@node("radial", "shape", "Distance from (x, y) as 0 at the point to 1 at radius (canvas width fractions): the ramps' distance driver.")
def radial(ctx: Context, x: float = 0.5, y: float = 0.5, radius: float = 0.5) -> Field:
    dx, dy = _xy(ctx, x, y)
    return _per_frame(ctx, np.clip(np.sqrt(dx * dx + dy * dy) / max(radius * ctx.w, 1e-3), 0, 1))


@node("constant", "shape", "A flat field of one value.")
def constant(ctx: Context, value: float = 1.0) -> Field:
    return np.full((ctx.frames, ctx.h, ctx.w), float(value), np.float32)


# ------------------------------------------------------------------ the emitter
def _curve(kind: str, a: np.ndarray) -> np.ndarray:
    """A life curve over age 0..1. grow_slow_shrink_fast is the house default (the fire rule)."""
    if kind == "linear":
        return a
    if kind == "flat":
        return np.ones_like(a)
    if kind == "fade_out":
        return 1.0 - a
    if kind == "fade_in":
        return a
    if kind == "grow_slow_shrink_fast":
        return np.where(a < 0.7, (np.minimum(a, 0.7) / 0.7) ** 0.6, 1.0 - (np.clip(a - 0.7, 0, 0.3) / 0.3) ** 1.5)
    if kind == "pop":  # big at once, then shrinks
        return (1.0 - a) ** 0.5
    if kind == "s":
        return a * a * (3 - 2 * a)
    if kind == "bell":
        return np.sin(np.pi * np.clip(a, 0, 1))
    return a


CURVES = ("linear", "flat", "fade_out", "fade_in", "grow_slow_shrink_fast", "pop", "s", "bell")


@node("emitter", "source",
      "Particles with life curves. Born at (x, y) (+ jitter in canvas fractions; shape point|line|circle|area), ``count`` per loop, living ``life`` "
      "frames; speed px/frame along angle (degrees, 0 right, -90 up) within spread; size (px) along size_curve; gravity (px/frame^2, down positive), "
      "drag per frame, turbulence (px) from a flow field, spin (degrees/frame, shows on streaks), trail frames, ground (canvas y; bounce 0..1, or "
      "stick), sub (a dict of emitter params for children born when a particle dies or lands). Returns a bundle: v, age, height, dist, speed.",
      returns="bundle")
def emitter(ctx: Context, x: float = 0.5, y: float = 0.9, jitter: float = 0.0, shape: str = "point", count: int = 24, life: int = 8, life_jitter: float = 0.3,
            angle: float = -90.0, spread: float = 30.0, speed: float = 2.0, speed_jitter: float = 0.3, speed_curve: str = "linear",
            size: float = 2.0, size_jitter: float = 0.3, size_end: float = 0.0, size_curve: str = "grow_slow_shrink_fast",
            gravity: float = 0.0, drag: float = 0.0, turbulence: float = 0.0, flow: np.ndarray | None = None, spin: float = 0.0,
            trail: int = 0, ground: float = 0.0, bounce: float = 0.0, stick: bool = False, sub: dict | None = None, burst: bool = False,
            soft: float = 0.5, seed: int = 0, _id: str = "") -> dict:
    rng = ctx.rng(f"{_id}:{seed}")
    n = max(0, int(count))
    life_n = max(1, int(life))
    T = ctx.frames
    # births: spread over the loop (or all at frame 0 for a burst); the loop wraps births so the strip is seamless
    birth = np.zeros(n, np.float32) if burst else rng.random(n).astype(np.float32) * T
    lives = np.clip(life_n * (1 + life_jitter * rng.uniform(-1, 1, n)), 1, None).astype(np.float32)
    if shape == "line":
        bx = (x + jitter * rng.uniform(-1, 1, n)) * ctx.w
        by = np.full(n, y * ctx.h, np.float32)
    elif shape == "circle":
        th = rng.uniform(0, 2 * np.pi, n)
        rr = jitter * np.sqrt(rng.random(n))
        bx, by = (x + rr * np.cos(th)) * ctx.w, (y + rr * np.sin(th)) * ctx.h
    elif shape == "area":
        bx = (x + jitter * rng.uniform(-1, 1, n)) * ctx.w
        by = (y + jitter * rng.uniform(-1, 1, n)) * ctx.h
    else:
        bx = (x + jitter * 0.25 * rng.uniform(-1, 1, n)) * ctx.w
        by = (y + jitter * 0.25 * rng.uniform(-1, 1, n)) * ctx.h
    ang = np.radians(angle + spread * rng.uniform(-1, 1, n))
    spd = speed * (1 + speed_jitter * rng.uniform(-1, 1, n))
    vx0, vy0 = spd * np.cos(ang), spd * np.sin(ang)
    sz0 = size * (1 + size_jitter * rng.uniform(-1, 1, n))
    # integrate every particle over its life in whole frames (positions by age, so the loop is seamless)
    steps = int(np.ceil(lives.max())) + 1
    px = np.zeros((steps, n), np.float32)
    py = np.zeros((steps, n), np.float32)
    alive = np.ones((steps, n), bool)
    landed_at = np.full(n, -1, np.int32)
    cx, cy, vx, vy = bx.copy(), by.copy(), vx0.copy(), vy0.copy()
    gy = ground * ctx.h if ground > 0 else None
    stuck = np.zeros(n, bool)
    for s in range(steps):
        px[s], py[s] = cx, cy
        a = s / np.maximum(lives, 1)
        alive[s] = a <= 1.0
        sc = _curve(speed_curve, np.clip(a, 0, 1))
        if turbulence and flow is not None:
            fr = flow[s % T]
            ix = np.clip(cx.astype(int), 0, ctx.w - 1)
            iy = np.clip(cy.astype(int), 0, ctx.h - 1)
            tx, ty = fr[iy, ix, 0], fr[iy, ix, 1]
        else:
            tx = ty = 0.0
        vy = vy + gravity
        vx, vy = vx * (1 - drag), vy * (1 - drag)
        mvx = (vx * sc + turbulence * tx) * (~stuck)
        mvy = (vy * sc + turbulence * ty) * (~stuck)
        cx, cy = cx + mvx, cy + mvy
        if gy is not None:
            hit = (cy > gy) & ~stuck
            if hit.any():
                cy = np.where(hit, gy, cy)
                landed_at = np.where(hit & (landed_at < 0), s, landed_at)
                if stick:
                    stuck |= hit
                else:
                    vy = np.where(hit, -vy * bounce, vy)
                    vx = np.where(hit, vx * (0.5 + 0.5 * bounce), vx)
                    if bounce <= 0:
                        alive[s + 1:, hit] = False
    out = {k: ctx.zeros() for k in ("v", "age", "height", "dist", "speed")}
    X, Y = ctx.grid()
    src_y = y * ctx.h
    for t in range(T):
        for i in range(n):
            # the particle's age at this frame, wrapped round the loop (born again every T frames)
            age_f = (t - birth[i]) % T
            if age_f > lives[i]:
                continue
            s = int(age_f)
            if not alive[min(s, steps - 1), i]:
                continue
            a = age_f / lives[i]
            frac = age_f - s
            s1 = min(s + 1, steps - 1)
            qx = px[s, i] * (1 - frac) + px[s1, i] * frac
            qy = py[s, i] * (1 - frac) + py[s1, i] * frac
            r = max(sz0[i] * (_curve(size_curve, np.float32(a)) * (1 - size_end) + size_end), 0.15)
            _disc(out, t, X, Y, qx, qy, r, a, soft, src_y, bx[i], by[i], spd[i])
            if trail > 0 and s > 0:
                for k in range(1, min(trail, s) + 1):
                    fade = (1 - k / (trail + 1)) * 0.8
                    _disc(out, t, X, Y, px[s - k, i], py[s - k, i], r * (1 - 0.5 * k / (trail + 1)), a, soft, src_y, bx[i], by[i], spd[i], fade,
                          spin_turn=np.radians(spin) * k)
    if sub:
        children = _children(ctx, sub, px, py, lives, landed_at, birth, n, rng, _id)
        if children is not None:
            for k in out:
                out[k] = np.maximum(out[k], children[k]) if k == "v" else np.where(children["v"] > out["v"], children[k], out[k])
    return out


def _disc(out, t, X, Y, qx, qy, r, a, soft, src_y, bx, by, spd, fade: float = 1.0, spin_turn: float = 0.0):
    x0, x1 = int(max(0, np.floor(qx - r - 1))), int(min(X.shape[1], np.ceil(qx + r + 2)))
    y0, y1 = int(max(0, np.floor(qy - r - 1))), int(min(X.shape[0], np.ceil(qy + r + 2)))
    if x0 >= x1 or y0 >= y1:
        return
    dx = X[y0:y1, x0:x1] - qx
    dy = Y[y0:y1, x0:x1] - qy
    if spin_turn:
        c, s = np.cos(spin_turn), np.sin(spin_turn)
        dx, dy = dx * c - dy * s, dx * s + dy * c
        dy = dy * 1.6  # a turning streak flattens: shows the spin
    d = np.sqrt(dx * dx + dy * dy)
    cov = np.clip((r + 0.5 - d) / max(soft * r + 0.5, 0.5), 0, 1) * fade
    sl = out["v"][t, y0:y1, x0:x1]
    better = cov > sl
    sl[better] = cov[better]
    out["age"][t, y0:y1, x0:x1][better] = a
    out["height"][t, y0:y1, x0:x1][better] = np.clip((src_y - qy) / max(src_y, 1), 0, 1)
    out["dist"][t, y0:y1, x0:x1][better] = np.clip(np.hypot(qx - bx, qy - by) / max(X.shape[1] * 0.5, 1), 0, 1)
    out["speed"][t, y0:y1, x0:x1][better] = np.clip(spd / 8.0, 0, 1)


def _children(ctx, sub, px, py, lives, landed_at, birth, n, rng, _id):
    """Sub-emitter: children born where each parent died (or landed), inheriting the parent's birth phase."""
    sub = dict(sub)
    per = int(sub.pop("count", 4))
    when = sub.pop("when", "death")
    pts = []
    for i in range(n):
        s = int(landed_at[i]) if (when == "land" and landed_at[i] >= 0) else int(min(lives[i], px.shape[0] - 1))
        pts.append((px[s, i], py[s, i], (birth[i] + s) % ctx.frames))
    if not pts:
        return None
    acc = None
    # one emitter call per parent would be slow; group by rounding the birth phase to whole frames
    sub_ctx = ctx
    for (qx, qy, b) in pts:
        child = emitter(sub_ctx, x=qx / ctx.w, y=qy / ctx.h, count=per, burst=True, seed=int(b * 1000 + qx), _id=f"{_id}:sub", **{k: v for k, v in sub.items() if k not in ("x", "y", "burst")})
        # shift the child's loop so it starts at the parent's death frame
        shift = int(round(b))
        for k in child:
            child[k] = np.roll(child[k], shift, axis=0)
        if acc is None:
            acc = child
        else:
            for k in acc:
                acc[k] = np.maximum(acc[k], child[k]) if k == "v" else np.where(child["v"] > acc["v"], child[k], acc[k])
    return acc


@node("take", "source", "One field out of a bundle: v (coverage), age, height, dist or speed.")
def take(ctx: Context, bundle: dict, key: str = "v") -> Field:
    return bundle[key]


# ------------------------------------------------------------------ the flame body (the house fire recipe as one node)
@node("flame_body", "source",
      "The house flame: a teardrop from (x, y) ``width`` wide and ``height`` tall (canvas fractions), bright at the source and darker upward, swaying "
      "in an S (or C) curve, its top broken into ``licks`` tongues by rising ridged noise (``rise`` loops per loop) that climb, thin and pinch off. "
      "flicker shakes the whole body a little per frame. A field: 1 at the heart, 0 outside.")
def flame_body(ctx: Context, x: float = 0.5, y: float = 0.92, width: float = 0.5, height: float = 0.85, licks: float = 2.5, rise: float = 1.0,
               curve: str = "s", sway: float = 0.08, flicker: float = 0.15, sharp: float = 1.2, seed: int = 0, _id: str = "") -> Field:
    from . import noise as N
    rng = ctx.rng(f"{_id}:{seed}")
    X, Y = ctx.grid()
    T = ctx.frames
    n = N.ridged(ctx.w, ctx.h, T, cells=max(1.5, licks), tcells=1, octaves=3, gain=0.5, seed=ctx.node_seed(f"{_id}:n:{seed}"))
    n2 = N.perlin(ctx.w, ctx.h, T, cells=max(1.0, licks * 0.6), tcells=1, octaves=2, seed=ctx.node_seed(f"{_id}:n2:{seed}"))
    base_y = y * ctx.h
    H = max(height * ctx.h, 2.0)
    W = max(width * ctx.w * 0.5, 1.0)
    out = ctx.zeros()
    jit = rng.uniform(-1, 1, (T, 2)).astype(np.float32) * flicker
    for t in range(T):
        f = t / T
        hgt = np.clip((base_y - Y) / H, 0, 1.2)             # 0 at the source, 1 at the tip
        # the sway: an S (two bends) or a C (one bend) that travels up over the loop
        if curve == "c":
            bend = np.sin(hgt * np.pi * 0.9 + f * 2 * np.pi) * sway * ctx.w * hgt
        else:
            bend = np.sin(hgt * np.pi * 2.0 - f * 2 * np.pi) * sway * ctx.w * hgt
        cx = x * ctx.w + bend + jit[t, 0] * 1.5
        # the teardrop's half width by height: a full base on its fuel, widest a fifth up, tapering to the tip
        h1 = np.clip(hgt, 0, 1)
        hw = W * np.where(h1 < 0.2, 0.72 + 0.28 * h1 / 0.2, np.clip(1.0 - (np.clip(h1 - 0.2, 0, 1) / 0.8) ** 1.25, 0, 1) * 0.95 + 0.05)
        dx = np.abs(X - cx) / np.maximum(hw, 0.5)
        inside = np.clip(1.0 - dx ** 2, 0, 1)
        # rising noise eats the body more the higher it goes: tongues separate and the tip pinches off
        shift = int(round(rise * f * ctx.h))
        nt = np.roll(n[t], -shift, axis=0)
        pt = np.roll(n2[t], -int(round(rise * 0.6 * f * ctx.h)), axis=0)
        eat = (nt * 0.9 + pt * 0.8 - 0.2) * (h1 ** 0.85) * sharp
        core = inside ** 3.0 * (1.0 - h1) ** 0.8 * 0.3            # the inner tongue: brighter, reaching up the middle
        v = inside ** 0.8 * (1.0 - 0.5 * h1) + core - eat
        v = np.where(hgt <= 1.2, v, 0.0)
        out[t] = np.clip(v, 0, 1)
    return out


# ------------------------------------------------------------------ special sources
def _polyline_field(ctx: Context, pts: np.ndarray, width: float, out: np.ndarray, value=1.0) -> None:
    from .sims import _draw_polyline
    _draw_polyline(out, pts, width, value)


@node("bolt", "source",
      "An arc of discharge from (x0, y0) to (x1, y1): a jagged random walk re-rolled every ``hold`` frames with ``branches`` side forks, width px, "
      "flashing (bright one frame in ``hold``). A field: 1 on the core.")
def bolt(ctx: Context, x0: float = 0.5, y0: float = 0.05, x1: float = 0.5, y1: float = 0.95, jag: float = 0.12, segments: int = 12, branches: int = 3,
         width: float = 1.5, hold: int = 2, flash: float = 0.5, seed: int = 0, _id: str = "") -> Field:
    rng = ctx.rng(f"{_id}:{seed}")
    out = ctx.zeros()
    T = ctx.frames
    a = np.array([x0 * ctx.w, y0 * ctx.h], np.float32)
    b = np.array([x1 * ctx.w, y1 * ctx.h], np.float32)
    L = float(np.hypot(*(b - a))) or 1.0
    nrm = np.array([-(b - a)[1], (b - a)[0]], np.float32) / L
    n_roll = max(1, int(np.ceil(T / max(1, int(hold)))))
    paths = []
    for _ in range(n_roll):
        u = np.linspace(0, 1, max(3, int(segments)))
        off = rng.normal(0, jag * L, len(u)) * np.sin(np.pi * u)
        pts = a[None] + (b - a)[None] * u[:, None] + nrm[None] * off[:, None]
        forks = []
        for _k in range(int(branches)):
            i = rng.integers(1, len(u) - 1)
            m = max(2, int(segments * 0.4))
            du = np.linspace(0, 1, m)
            d = (b - a) * rng.uniform(0.25, 0.45) * np.array([1, 1]) + nrm * rng.choice([-1, 1]) * L * rng.uniform(0.15, 0.3)
            fpts = pts[i][None] + d[None] * du[:, None] + nrm[None] * (rng.normal(0, jag * L * 0.5, m) * np.sin(np.pi * du))[:, None]
            forks.append(fpts)
        paths.append((pts, forks))
    for t in range(T):
        pts, forks = paths[(t // max(1, int(hold))) % n_roll]
        bright = 1.0 if (t % max(1, int(hold))) == 0 else 1.0 - flash
        f = out[t]
        _polyline_field(ctx, pts, width, f, bright)
        for fp in forks:
            _polyline_field(ctx, fp, max(0.8, width * 0.6), f, bright * 0.75)
    return out


@node("threads", "source",
      "Threads pulled from points on an arc round (x, y) (radius, canvas fraction) into the sink at (sx, sy): ``count`` bowed curves that wobble, with "
      "``beads`` bright knots travelling along each toward the sink over the loop. Returns a bundle: v (the threads), age (0 at the figure, 1 at the sink).",
      returns="bundle")
def threads(ctx: Context, x: float = 0.3, y: float = 0.5, radius: float = 0.18, sx: float = 0.8, sy: float = 0.35, count: int = 6, beads: int = 2, width: float = 1.0,
            bow: float = 0.15, wobble: float = 1.0, seed: int = 0, _id: str = "") -> dict:
    rng = ctx.rng(f"{_id}:{seed}")
    T = ctx.frames
    v = ctx.zeros()
    age = ctx.zeros()
    sink = np.array([sx * ctx.w, sy * ctx.h], np.float32)
    X, Y = ctx.grid()
    for i in range(int(count)):
        th = rng.uniform(0, 2 * np.pi)
        start = np.array([x * ctx.w + radius * ctx.w * np.cos(th), y * ctx.h + radius * ctx.h * np.sin(th)], np.float32)
        ctrl = (start + sink) / 2 + np.array([-(sink - start)[1], (sink - start)[0]]) * rng.uniform(-bow, bow)
        ph = rng.uniform(0, 2 * np.pi)
        u = np.linspace(0, 1, 16)[:, None]
        for t in range(T):
            a = 2 * np.pi * t / T
            c = ctrl + np.array([np.sin(a + ph), np.cos(a * 2 + ph)]) * wobble * 2.0
            pts = (1 - u) ** 2 * start + 2 * (1 - u) * u * c + u ** 2 * sink
            seg = np.zeros((ctx.h, ctx.w), np.float32)
            _polyline_field(ctx, pts, width, seg, 0.45)
            for k in range(int(beads)):
                bu = ((t / T) + k / max(1, beads) + i * 0.13) % 1.0
                p = (1 - bu) ** 2 * start + 2 * (1 - bu) * bu * c + bu ** 2 * sink
                d = np.hypot(X - p[0], Y - p[1])
                seg = np.maximum(seg, np.clip(1.6 - d, 0, 1))
            better = seg > v[t]
            v[t][better] = seg[better]
            age[t][better] = np.clip(np.hypot(X - start[0], Y - start[1]) / max(float(np.hypot(*(sink - start))), 1), 0, 1)[better]
    return {"v": v, "age": age, "height": age, "dist": age, "speed": age}


@node("eyes", "source",
      "Eyes scattered over a mask: ``count`` of them at blue-noise points, each a white almond with a dark pupil, blinking on its own phase (lids close for "
      "``blink`` of the loop) and glancing. Returns a bundle: v (the white), age (1 on the pupil, 0.5 the lid line).", returns="bundle")
def eyes(ctx: Context, mask: Field | None = None, count: int = 6, size: float = 3.0, blink: float = 0.25, seed: int = 0, _id: str = "") -> dict:
    rng = ctx.rng(f"{_id}:{seed}")
    T = ctx.frames
    X, Y = ctx.grid()
    v = ctx.zeros()
    age = ctx.zeros()
    m0 = mask[0] if mask is not None else np.ones((ctx.h, ctx.w), np.float32)
    cand = np.argwhere(m0 > 0.5)
    if len(cand) == 0:
        return {"v": v, "age": age, "height": age, "dist": age, "speed": age}
    pts = []
    tries = 0
    while len(pts) < int(count) and tries < 400:
        tries += 1
        p = cand[rng.integers(len(cand))]
        if all(np.hypot(p[1] - q[1], p[0] - q[0]) > size * 2.2 for q in pts):
            pts.append(p)
    for (py, px) in pts:
        ph = rng.uniform(0, 1)
        gl = rng.uniform(-1, 1)
        sz = size * rng.uniform(0.8, 1.2)
        for t in range(T):
            f = ((t / T) + ph) % 1.0
            openness = 1.0 if f > blink else np.sin(np.pi * f / blink) if blink > 0 else 1.0
            openness = float(np.clip(openness, 0, 1))
            dx = (X - px - 0.5) / sz
            dy = (Y - py - 0.5) / max(sz * 0.6 * openness, 0.2)
            white = np.clip(1.0 - (dx * dx + dy * dy), 0, 1)
            lid = (np.abs(Y - py - 0.5) < 0.6) & (np.abs(dx) < 1.0) & (openness < 0.15)
            look = gl * np.sin(2 * np.pi * (t / T) + ph * 6.28) * sz * 0.35
            pup = np.hypot(X - px - 0.5 - look, Y - py - 0.5) < max(sz * 0.33, 0.8)
            fld = np.where(white > 0, 1.0, 0.0)
            fld = np.maximum(fld, lid.astype(np.float32))
            better = fld > v[t]
            v[t][better] = fld[better]
            a = np.where(pup & (white > 0), 1.0, np.where(lid, 0.5, 0.15))
            age[t][better] = a[better]
    return {"v": v, "age": age, "height": age, "dist": age, "speed": age}


@node("mouths", "source",
      "Mouths in a veil: at cellular points over a mask, dark slits that open into rings of teeth and close again, each on its own phase. "
      "Returns a bundle: v (the mouth), age (1 teeth, 0.3 the throat).", returns="bundle")
def mouths(ctx: Context, mask: Field | None = None, count: int = 5, size: float = 3.5, seed: int = 0, _id: str = "") -> dict:
    rng = ctx.rng(f"{_id}:{seed}")
    T = ctx.frames
    X, Y = ctx.grid()
    v = ctx.zeros()
    age = ctx.zeros()
    m0 = mask[0] if mask is not None else np.ones((ctx.h, ctx.w), np.float32)
    cand = np.argwhere(m0 > 0.5)
    if len(cand) == 0:
        return {"v": v, "age": age, "height": age, "dist": age, "speed": age}
    pts = []
    tries = 0
    while len(pts) < int(count) and tries < 400:
        tries += 1
        p = cand[rng.integers(len(cand))]
        if all(np.hypot(p[1] - q[1], p[0] - q[0]) > size * 2.4 for q in pts):
            pts.append(p)
    for (py, px) in pts:
        ph = rng.uniform(0, 1)
        sz = size * rng.uniform(0.8, 1.2)
        for t in range(T):
            f = ((t / T) + ph) % 1.0
            gape = float(np.clip(np.sin(np.pi * f) ** 1.5, 0, 1))
            dx = (X - px - 0.5) / sz
            dy = (Y - py - 0.5) / max(sz * 0.7 * gape, 0.25)
            r2 = dx * dx + dy * dy
            inside = r2 < 1.0
            teeth = inside & (r2 > 0.55) & (((np.floor(np.arctan2(dy, dx) * 4 / np.pi * 1.5).astype(int)) % 2) == 0) & (gape > 0.3)
            fld = inside.astype(np.float32)
            better = fld > v[t]
            v[t][better] = fld[better]
            age[t][better] = np.where(teeth, 1.0, 0.3)[better]
    return {"v": v, "age": age, "height": age, "dist": age, "speed": age}
