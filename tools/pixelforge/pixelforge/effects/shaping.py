"""Shaping nodes: morphology, warps, thresholds, licks, masks, outlines, glows, shadows and the blur that stays pixel.
All take a field (T, H, W) and give one back."""
from __future__ import annotations

import numpy as np
from scipy import ndimage

from .graph import Context, Field, node


def _per_frame(fn, field: Field) -> Field:
    return np.stack([fn(f) for f in field]).astype(np.float32)


@node("erode", "shape", "Shrink the lit area by radius pixels (grey erosion).")
def erode(ctx: Context, field: Field, radius: int = 1) -> Field:
    k = np.ones((2 * int(radius) + 1,) * 2, bool)
    return _per_frame(lambda f: ndimage.grey_erosion(f, footprint=k), field)


@node("dilate", "shape", "Grow the lit area by radius pixels (grey dilation).")
def dilate(ctx: Context, field: Field, radius: int = 1) -> Field:
    k = np.ones((2 * int(radius) + 1,) * 2, bool)
    return _per_frame(lambda f: ndimage.grey_dilation(f, footprint=k), field)


@node("warp", "shape", "Displace a field along a vector field (pixels) scaled by amount; nearest sampling keeps pixels whole.")
def warp(ctx: Context, field: Field, vectors: np.ndarray, amount: float = 1.0) -> Field:
    X, Y = ctx.grid()
    out = np.empty_like(field)
    for t in range(ctx.frames):
        v = vectors[t % vectors.shape[0]]
        sx = np.mod(np.rint(X - 0.5 - v[..., 0] * amount).astype(int), ctx.w)
        sy = np.mod(np.rint(Y - 0.5 - v[..., 1] * amount).astype(int), ctx.h)
        out[t] = field[t][sy, sx]
    return out


@node("displace_by", "shape", "Displace a field by another scalar field: dx and dy pixels at full value (heat haze, ripples).")
def displace_by(ctx: Context, field: Field, by: Field, dx: float = 0.0, dy: float = 2.0, centre: float = 0.5) -> Field:
    X, Y = ctx.grid()
    out = np.empty_like(field)
    for t in range(ctx.frames):
        b = by[t % by.shape[0]] - centre
        sx = np.clip(np.rint(X - 0.5 - b * dx).astype(int), 0, ctx.w - 1)
        sy = np.clip(np.rint(Y - 0.5 - b * dy).astype(int), 0, ctx.h - 1)
        out[t] = field[t][sy, sx]
    return out


@node("threshold", "shape", "1 where the field is above level, else 0; soft widens the step (0 = a hard cut).")
def threshold(ctx: Context, field: Field, level: float = 0.5, soft: float = 0.0) -> Field:
    if soft <= 0:
        return (field > level).astype(np.float32)
    return np.clip((field - level) / soft + 0.5, 0, 1).astype(np.float32)


@node("licks", "shape",
      "Break a flame body into licks: the field is multiplied by rising ridged noise and thinned toward the top, so tongues "
      "separate and pinch off. count sets how many across; rise is how fast they climb per loop; curve s or c bends them.")
def licks(ctx: Context, field: Field, count: float = 3.0, rise: float = 1.0, curve: str = "s", strength: float = 1.0, seed: int = 0, _id: str = "") -> Field:
    from . import noise as N
    n = N.ridged(ctx.w, ctx.h, ctx.frames, cells=count, tcells=1, octaves=3, seed=ctx.node_seed(f"{_id}:{seed}"))
    X, Y = ctx.grid()
    out = np.empty_like(field)
    for t in range(ctx.frames):
        f = t / max(ctx.frames, 1)
        # the noise climbs: rolled up by rise loops per loop; a lateral S or C bend by height
        shift = int(round(rise * f * ctx.h))
        nt = np.roll(n[t], -shift, axis=0)
        hgt = 1.0 - Y / ctx.h
        if curve == "s":
            bend = np.sin(hgt * np.pi * 2 + f * 2 * np.pi) * hgt * ctx.w * 0.08
        elif curve == "c":
            bend = (1 - np.cos(hgt * np.pi)) * ctx.w * 0.1 * np.sin(f * 2 * np.pi + 1.0)
        else:
            bend = np.zeros_like(hgt)
        sx = np.mod(np.rint(X - 0.5 - bend).astype(int), ctx.w)
        nt = nt[np.arange(ctx.h)[:, None], sx]
        thin = np.clip(1.0 - hgt * 0.6, 0, 1)
        out[t] = field[t] * (1 - strength + strength * np.clip(nt * 1.4 * thin + (1 - hgt) * 0.4, 0, 1))
    return np.clip(out, 0, 1)


@node("mask_height", "shape", "Keep the field between lo and hi of the canvas height measured up from the bottom (0 bottom, 1 top), feathered.")
def mask_height(ctx: Context, field: Field, lo: float = 0.0, hi: float = 1.0, feather: float = 0.1) -> Field:
    X, Y = ctx.grid()
    hgt = 1.0 - Y / ctx.h
    m = np.clip((hgt - lo) / max(feather, 1e-3), 0, 1) * np.clip((hi - hgt) / max(feather, 1e-3), 0, 1)
    return (field * m[None]).astype(np.float32)


@node("mask_age", "shape", "Keep a bundle's coverage where its particles' age (0 born .. 1 dying) lies between lo and hi.")
def mask_age(ctx: Context, bundle: dict, lo: float = 0.0, hi: float = 1.0, feather: float = 0.1) -> Field:
    a = bundle["age"]
    m = np.clip((a - lo) / max(feather, 1e-3), 0, 1) * np.clip((hi - a) / max(feather, 1e-3), 0, 1)
    return (bundle["v"] * m).astype(np.float32)


@node("outline", "shape", "The rim of the lit area: 1 on pixels outside it within width of it (level decides lit). Edge lines, selection rims.")
def outline(ctx: Context, field: Field, width: int = 1, level: float = 0.3, inside: bool = False) -> Field:
    k = np.ones((2 * int(width) + 1,) * 2, bool)
    out = np.empty_like(field)
    for t in range(ctx.frames):
        m = field[t] > level
        if inside:
            out[t] = (m & ~ndimage.binary_erosion(m, structure=k)).astype(np.float32)
        else:
            out[t] = (ndimage.binary_dilation(m, structure=k) & ~m).astype(np.float32)
    return out


@node("inner_glow", "shape", "Brighten toward the centre of the lit area: distance from the edge, inside, over radius pixels; add to the field with strength.")
def inner_glow(ctx: Context, field: Field, radius: float = 3.0, strength: float = 0.6, level: float = 0.3) -> Field:
    out = np.empty_like(field)
    for t in range(ctx.frames):
        m = field[t] > level
        d = ndimage.distance_transform_edt(m)
        out[t] = np.clip(field[t] + strength * np.clip(d / max(radius, 1e-3), 0, 1) * m, 0, 1)
    return out


@node("shadow", "shape", "A cast shadow: the lit area offset by (dx, dy) pixels, darkened by amount, laid under it (as a field: 1 = shadow).")
def shadow(ctx: Context, field: Field, dx: int = 1, dy: int = 1, level: float = 0.3) -> Field:
    out = np.empty_like(field)
    for t in range(ctx.frames):
        m = (field[t] > level).astype(np.float32)
        s = np.roll(np.roll(m, int(dy), axis=0), int(dx), axis=1)
        out[t] = np.clip(s - m, 0, 1)
    return out


@node("pixel_blur", "shape", "A blur that stays pixel: box blur of radius, then the values snapped to ``levels`` steps so edges stay hard.")
def pixel_blur(ctx: Context, field: Field, radius: int = 1, levels: int = 4) -> Field:
    r = int(radius)
    out = _per_frame(lambda f: ndimage.uniform_filter(f, size=2 * r + 1, mode="wrap"), field) if r > 0 else field.copy()
    if levels and levels > 1:
        out = np.round(out * (levels - 1)) / (levels - 1)
    return out.astype(np.float32)


@node("blur", "shape", "A soft Gaussian blur (sigma px) for glows and haze bodies; quantise it later with posterize or bands.")
def blur(ctx: Context, field: Field, sigma: float = 1.5) -> Field:
    return _per_frame(lambda f: ndimage.gaussian_filter(f, sigma=sigma, mode="wrap"), field)


@node("posterize", "shape", "Snap a field to ``levels`` even steps (hard colour bands).")
def posterize(ctx: Context, field: Field, levels: int = 4) -> Field:
    lv = max(2, int(levels))
    return (np.round(np.clip(field, 0, 1) * (lv - 1)) / (lv - 1)).astype(np.float32)


@node("mul", "math", "a * b (fields or numbers).")
def mul(ctx: Context, a, b) -> Field:
    return (np.asarray(a, np.float32) * np.asarray(b, np.float32)).astype(np.float32)


@node("add", "math", "a + b, clipped to 0..1.")
def add(ctx: Context, a, b) -> Field:
    return np.clip(np.asarray(a, np.float32) + np.asarray(b, np.float32), 0, 1).astype(np.float32)


@node("sub", "math", "a - b, clipped to 0..1.")
def sub(ctx: Context, a, b) -> Field:
    return np.clip(np.asarray(a, np.float32) - np.asarray(b, np.float32), 0, 1).astype(np.float32)


@node("max", "math", "The brighter of a and b per pixel.")
def max_(ctx: Context, a, b) -> Field:
    return np.maximum(np.asarray(a, np.float32), np.asarray(b, np.float32)).astype(np.float32)


@node("min", "math", "The darker of a and b per pixel.")
def min_(ctx: Context, a, b) -> Field:
    return np.minimum(np.asarray(a, np.float32), np.asarray(b, np.float32)).astype(np.float32)


@node("invert", "math", "1 - field.")
def invert(ctx: Context, field: Field) -> Field:
    return (1.0 - np.asarray(field, np.float32)).astype(np.float32)


@node("gain", "math", "field * mult + lift, clipped; power bends the middle (2 darkens, 0.5 lightens).")
def gain(ctx: Context, field: Field, mult: float = 1.0, lift: float = 0.0, power: float = 1.0) -> Field:
    f = np.clip(np.asarray(field, np.float32) * mult + lift, 0, 1)
    return (f ** power).astype(np.float32)


@node("pulse", "math", "Multiply a field by a wave over the loop: 1 - depth .. 1, ``beats`` per loop (breathing, flicker).")
def pulse(ctx: Context, field: Field, depth: float = 0.3, beats: int = 1, shape: str = "sine", seed: int = 0, _id: str = "") -> Field:
    ph = ctx.phase() * 2 * np.pi * max(1, int(beats))
    if shape == "flicker":
        rng = ctx.rng(f"{_id}:{seed}")
        wave = rng.random(ctx.frames).astype(np.float32)
    elif shape == "saw":
        wave = (ph / (2 * np.pi)) % 1.0
    else:
        wave = 0.5 + 0.5 * np.sin(ph)
    k = 1.0 - depth * (1.0 - wave)
    return (field * k[:, None, None]).astype(np.float32)


@node("time_shift", "math", "Roll a field by ``frames`` along the loop (a layer that lags another).")
def time_shift(ctx: Context, field: Field, frames: int = 1) -> Field:
    return np.roll(field, int(frames), axis=0)


@node("hold_frames", "math", "Play a field at a slower beat: every frame held ``n`` times, the loop wrapped (fewer distinct frames, same length).")
def hold_frames(ctx: Context, field: Field, n: int = 2) -> Field:
    idx = (np.arange(ctx.frames) // max(1, int(n))) * max(1, int(n))
    return field[idx % ctx.frames]


@node("shift", "math", "Move a field by (dx, dy) pixels (wrapping).")
def shift(ctx: Context, field: Field, dx: int = 0, dy: int = 0) -> Field:
    return np.roll(np.roll(field, int(dy), axis=1), int(dx), axis=2)


@node("flip", "math", "Mirror a field left-right (x) or top-bottom (y).")
def flip(ctx: Context, field: Field, axis: str = "x") -> Field:
    return field[:, :, ::-1].copy() if axis == "x" else field[:, ::-1, :].copy()


@node("alpha_of", "math", "The coverage (alpha 0..1) of an image as a field.")
def alpha_of(ctx: Context, image: np.ndarray) -> Field:
    return (image[..., 3].astype(np.float32) / 255.0)


@node("lightness_of", "math", "The OKLab lightness of an image as a field (0 dark .. 1 light), where it is opaque.")
def lightness_of(ctx: Context, image: np.ndarray) -> Field:
    from ..color import rgb_to_oklab
    L = rgb_to_oklab(image[..., :3])[..., 0]
    return (np.clip(L, 0, 1) * (image[..., 3] > 0)).astype(np.float32)


@node("after", "math", "A one-shot's timing: the field is empty before frame ``start`` (and after start + length when length > 0).")
def after(ctx: Context, field: Field, start: int = 0, length: int = 0) -> Field:
    out = np.zeros_like(field)
    s0 = int(start)
    s1 = ctx.frames if int(length) <= 0 else min(ctx.frames, s0 + int(length))
    out[s0:s1] = field[s0:s1]
    return out


@node("wipe", "math", "Reveal a field over ``length`` frames from frame ``start``: top to bottom (down), bottom up, left or right; then it stays.")
def wipe(ctx: Context, field: Field, start: int = 0, length: int = 3, direction: str = "down") -> Field:
    X, Y = ctx.grid()
    g = {"down": Y / ctx.h, "up": 1 - Y / ctx.h, "right": X / ctx.w, "left": 1 - X / ctx.w}[direction]
    out = np.zeros_like(field)
    for t in range(ctx.frames):
        f = (t - int(start) + 1) / max(1, int(length))
        if f <= 0:
            continue
        out[t] = field[t] * (g <= min(f, 1.0))
    return out


@node("reverse", "math", "The field played backward (a grown ring falls inward).")
def reverse(ctx: Context, field: Field) -> Field:
    return field[::-1].copy()
