"""Noise sources, all tileable in space and in time.

Every function here returns a float32 field of shape (T, H, W) in 0..1 (vector fields: (T, H, W, 2)). The lattice
wraps: ``cells`` divide the width and height, ``tcells`` the frame count, so frame T is frame 0 again and the
picture tiles edge to edge. Nothing here reads a file or a clock; the same seed gives the same field.

Written from the mathematics (gradient lattice noise, Worley cells, curl of a potential), not from any tool's code.
"""
from __future__ import annotations

import numpy as np

__all__ = ["perlin", "simplex", "cellular", "ridged", "flow", "blue", "fbm", "value"]


def _fade(t: np.ndarray) -> np.ndarray:
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0)


def _grads(rng: np.random.Generator, shape: tuple) -> np.ndarray:
    """Unit gradient vectors (3-vectors) on a lattice of the given shape."""
    g = rng.normal(size=shape + (3,)).astype(np.float32)
    n = np.linalg.norm(g, axis=-1, keepdims=True)
    return g / np.maximum(n, 1e-6)


def _coords(w: int, h: int, frames: int, cells: float, tcells: int, phase: tuple[float, float, float] = (0.0, 0.0, 0.0)):
    """Lattice coordinates for every (t, y, x) sample; the lattice has cx x cy x ct cells over the whole field."""
    cx = max(1, int(round(cells)))
    cy = max(1, int(round(cells * h / max(w, 1))))
    ct = max(1, int(tcells))
    xs = (np.arange(w, dtype=np.float32) + 0.5) / w * cx + phase[0]
    ys = (np.arange(h, dtype=np.float32) + 0.5) / h * cy + phase[1]
    ts = np.arange(frames, dtype=np.float32) / max(frames, 1) * ct + phase[2]
    T, Y, X = np.meshgrid(ts, ys, xs, indexing="ij")
    return X, Y, T, (cx, cy, ct)


def _gradient_noise(w: int, h: int, frames: int, cells: float, tcells: int, rng: np.random.Generator, phase=(0.0, 0.0, 0.0), skew: float = 0.0) -> np.ndarray:
    """One octave of periodic 3D gradient noise in -1..1. ``skew`` shifts every other lattice row by half a cell
    (a triangular lattice: the simplex look without the square grid's diagonal bias)."""
    X, Y, T, (cx, cy, ct) = _coords(w, h, frames, cells, tcells, phase)
    if skew:
        X = X + skew * 0.5 * (np.floor(Y) % 2)
    g = _grads(rng, (ct, cy, cx))
    x0 = np.floor(X).astype(np.int64)
    y0 = np.floor(Y).astype(np.int64)
    t0 = np.floor(T).astype(np.int64)
    fx, fy, ft = X - x0, Y - y0, T - t0
    ux, uy, ut = _fade(fx), _fade(fy), _fade(ft)
    out = np.zeros_like(X)
    for dt in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                gv = g[(t0 + dt) % ct, (y0 + dy) % cy, (x0 + dx) % cx]
                dot = gv[..., 0] * (fx - dx) + gv[..., 1] * (fy - dy) + gv[..., 2] * (ft - dt)
                wgt = (ux if dx else 1 - ux) * (uy if dy else 1 - uy) * (ut if dt else 1 - ut)
                out += wgt * dot
    return np.clip(out * 1.6, -1.0, 1.0)


def fbm(w: int, h: int, frames: int, *, cells: float = 4.0, tcells: int = 1, octaves: int = 3, gain: float = 0.5, lacunarity: float = 2.0,
        seed: int = 0, skew: float = 0.0, ridged_: bool = False) -> np.ndarray:
    """Fractal sum of gradient noise octaves, normalised to 0..1."""
    rng = np.random.default_rng(seed)
    out = np.zeros((frames, h, w), np.float32)
    amp, total, c, tc = 1.0, 0.0, float(cells), int(tcells)
    for _ in range(max(1, int(octaves))):
        n = _gradient_noise(w, h, frames, c, tc, rng, skew=skew)
        if ridged_:
            n = 1.0 - np.abs(n)
            n = n * n * 2.0 - 1.0
        out += amp * n
        total += amp
        amp *= gain
        c *= lacunarity
        tc = max(1, int(round(tc * lacunarity))) if tc > 1 else 1
    out = out / max(total, 1e-6)
    return np.clip(out * 0.5 + 0.5, 0.0, 1.0).astype(np.float32)


def perlin(w: int, h: int, frames: int, *, cells: float = 4.0, tcells: int = 1, octaves: int = 3, gain: float = 0.5, seed: int = 0) -> np.ndarray:
    """Periodic Perlin (gradient lattice) noise with ``octaves`` of detail; ``tcells`` beats per loop in time."""
    return fbm(w, h, frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=seed)


def simplex(w: int, h: int, frames: int, *, cells: float = 4.0, tcells: int = 1, octaves: int = 3, gain: float = 0.5, seed: int = 0) -> np.ndarray:
    """Gradient noise on a triangular lattice (rows offset by half a cell): the simplex look, free of the square
    grid's diagonal bias, still periodic."""
    return fbm(w, h, frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=seed, skew=1.0)


def ridged(w: int, h: int, frames: int, *, cells: float = 4.0, tcells: int = 1, octaves: int = 4, gain: float = 0.55, seed: int = 0) -> np.ndarray:
    """Ridged multifractal: sharp bright creases (flame licks, cracks, veins)."""
    return fbm(w, h, frames, cells=cells, tcells=tcells, octaves=octaves, gain=gain, seed=seed, ridged_=True)


def value(w: int, h: int, frames: int, *, cells: float = 4.0, tcells: int = 1, seed: int = 0) -> np.ndarray:
    """Periodic value noise: smooth blobs between random lattice values (cheap, soft)."""
    rng = np.random.default_rng(seed)
    X, Y, T, (cx, cy, ct) = _coords(w, h, frames, cells, tcells)
    v = rng.random((ct, cy, cx), dtype=np.float32)
    x0, y0, t0 = np.floor(X).astype(np.int64), np.floor(Y).astype(np.int64), np.floor(T).astype(np.int64)
    ux, uy, ut = _fade(X - x0), _fade(Y - y0), _fade(T - t0)
    out = np.zeros_like(X)
    for dt in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                wgt = (ux if dx else 1 - ux) * (uy if dy else 1 - uy) * (ut if dt else 1 - ut)
                out += wgt * v[(t0 + dt) % ct, (y0 + dy) % cy, (x0 + dx) % cx]
    return out.astype(np.float32)


def cellular(w: int, h: int, frames: int, *, cells: float = 4.0, seed: int = 0, drift: float = 0.3, mode: str = "f1", jitter: float = 1.0) -> np.ndarray:
    """Worley cells: one feature point per lattice cell, drifting on a loop. ``mode`` f1 (distance to the nearest
    point, dark at the points), f2f1 (cell walls bright), id (a flat random value per cell: shards, scales)."""
    rng = np.random.default_rng(seed)
    cx = max(1, int(round(cells)))
    cy = max(1, int(round(cells * h / max(w, 1))))
    base = rng.random((cy, cx, 2), dtype=np.float32) * jitter + (1 - jitter) * 0.5
    ph = rng.random((cy, cx, 2), dtype=np.float32) * 2 * np.pi
    ids = rng.random((cy, cx), dtype=np.float32)
    xs = (np.arange(w, dtype=np.float32) + 0.5) / w * cx
    ys = (np.arange(h, dtype=np.float32) + 0.5) / h * cy
    Y, X = np.meshgrid(ys, xs, indexing="ij")
    ix, iy = np.floor(X).astype(np.int64), np.floor(Y).astype(np.int64)
    out = np.zeros((frames, h, w), np.float32)
    for t in range(frames):
        a = 2 * np.pi * t / max(frames, 1)
        pts = base + drift * 0.5 * np.stack([np.sin(a + ph[..., 0]), np.cos(a + ph[..., 1])], -1)
        d1 = np.full((h, w), np.inf, np.float32)
        d2 = np.full((h, w), np.inf, np.float32)
        best = np.zeros((h, w), np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                jx, jy = (ix + dx) % cx, (iy + dy) % cy
                px = (ix + dx) + pts[jy, jx, 0]
                py = (iy + dy) + pts[jy, jx, 1]
                d = (X - px) ** 2 + (Y - py) ** 2
                closer = d < d1
                d2 = np.where(closer, d1, np.minimum(d2, d))
                best = np.where(closer, ids[jy, jx], best)
                d1 = np.where(closer, d, d1)
        if mode == "id":
            out[t] = best
        elif mode == "f2f1":
            out[t] = np.clip(np.sqrt(d2) - np.sqrt(d1), 0, 1)
        else:
            out[t] = np.clip(np.sqrt(d1), 0, 1)
    return out


def flow(w: int, h: int, frames: int, *, cells: float = 3.0, tcells: int = 1, octaves: int = 2, seed: int = 0, strength: float = 1.0) -> np.ndarray:
    """A divergence-free vector field (T, H, W, 2): the curl of a noise potential, in pixels. Things carried by it
    swirl without piling up: smoke, motes, warps."""
    p = fbm(w, h, frames, cells=cells, tcells=tcells, octaves=octaves, seed=seed)
    # curl of (0, 0, p): (dp/dy, -dp/dx), periodic differences
    dpy = (np.roll(p, -1, axis=1) - np.roll(p, 1, axis=1)) * 0.5
    dpx = (np.roll(p, -1, axis=2) - np.roll(p, 1, axis=2)) * 0.5
    v = np.stack([dpy, -dpx], -1) * (strength * w * 0.5)
    return v.astype(np.float32)


def blue(w: int, h: int, frames: int, *, cells: float = 8.0, seed: int = 0, radius: float = 0.35, twinkle: float = 0.5) -> np.ndarray:
    """Blue-noise dots: one jittered point per lattice cell (evenly spread, never clumped), drawn as soft discs of
    ``radius`` cells, each twinkling on its own phase over the loop. Motes, stars, sparkle fields."""
    rng = np.random.default_rng(seed)
    cx = max(1, int(round(cells)))
    cy = max(1, int(round(cells * h / max(w, 1))))
    pts = rng.random((cy, cx, 2), dtype=np.float32) * 0.8 + 0.1
    ph = rng.random((cy, cx), dtype=np.float32) * 2 * np.pi
    xs = (np.arange(w, dtype=np.float32) + 0.5) / w * cx
    ys = (np.arange(h, dtype=np.float32) + 0.5) / h * cy
    Y, X = np.meshgrid(ys, xs, indexing="ij")
    ix, iy = np.floor(X).astype(np.int64), np.floor(Y).astype(np.int64)
    out = np.zeros((frames, h, w), np.float32)
    for t in range(frames):
        a = 2 * np.pi * t / max(frames, 1)
        acc = np.zeros((h, w), np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                jx, jy = (ix + dx) % cx, (iy + dy) % cy
                px = (ix + dx) + pts[jy, jx, 0]
                py = (iy + dy) + pts[jy, jx, 1]
                d = np.sqrt((X - px) ** 2 + (Y - py) ** 2)
                bright = 1.0 - twinkle * 0.5 * (1 + np.sin(a + ph[jy, jx]))
                acc = np.maximum(acc, np.clip(1.0 - d / max(radius, 1e-3), 0, 1) * bright)
        out[t] = acc
    return out
