"""Small simulations: cheap smoke (density carried by a flow field with buoyancy), verlet ropes and chains, cloth flags.
Each runs the loop twice and keeps the second pass so frame 0 follows frame T-1 without a jump; deterministic per seed."""
from __future__ import annotations

import math

import numpy as np
from scipy import ndimage

from . import noise as N
from .graph import Context, Field, node


@node("smoke", "sim",
      "Cheap smoke: density released at (x, y) (width in canvas fractions) rises at ``rise`` px/frame, is carried by a flow field (``swirl`` px), "
      "spreads (``spread``) and thins (``decay`` per frame). A field of density.")
def smoke(ctx: Context, x: float = 0.5, y: float = 0.85, width: float = 0.15, rise: float = 1.2, swirl: float = 1.5, spread: float = 0.6, decay: float = 0.06,
          amount: float = 1.0, seed: int = 0, _id: str = "") -> Field:
    T = ctx.frames
    fl = N.flow(ctx.w, ctx.h, T, cells=3.0, tcells=1, octaves=2, strength=swirl, seed=ctx.node_seed(f"{_id}:{seed}"))
    puff = N.value(ctx.w, ctx.h, T, cells=6.0, tcells=1, seed=ctx.node_seed(f"{_id}:puff:{seed}"))
    X, Y = ctx.grid()
    src = np.exp(-(((X - x * ctx.w) / max(width * ctx.w, 1)) ** 2) - ((Y - y * ctx.h) / 1.5) ** 2).astype(np.float32)
    d = np.zeros((ctx.h, ctx.w), np.float32)
    frames = []
    for pass_ in range(2):
        for t in range(T):
            v = fl[t]
            sx = np.clip(np.rint(X - 0.5 - v[..., 0]).astype(int), 0, ctx.w - 1)
            sy = np.clip(np.rint(Y - 0.5 - v[..., 1] + rise).astype(int), 0, ctx.h - 1)
            d = d[sy, sx]
            if spread > 0:
                d = ndimage.uniform_filter(d, size=3) * spread + d * (1 - spread)
            d = d * (1 - decay)
            d = np.clip(d + src * amount * (0.6 + 0.8 * puff[t]), 0, 1)
            if pass_ == 1:
                frames.append(d.copy())
    return np.stack(frames).astype(np.float32)


def _verlet(points: np.ndarray, prev: np.ndarray, pins: np.ndarray, rest: float, gravity: float, wind: np.ndarray, iters: int = 6, damping: float = 0.98):
    """One step of position verlet on a chain (N, 2) with distance constraints; pinned points stay."""
    vel = (points - prev) * damping
    prev = points.copy()
    points = points + vel + wind + np.array([0.0, gravity], np.float32)
    for _ in range(iters):
        seg = points[1:] - points[:-1]
        L = np.maximum(np.hypot(seg[:, 0], seg[:, 1]), 1e-6)
        corr = (seg / L[:, None]) * ((L - rest) * 0.5)[:, None]
        points[:-1] += corr
        points[1:] -= corr
        points[pins] = prev[pins]
    return points, prev


def _draw_polyline(field: np.ndarray, pts: np.ndarray, width: float, value: np.ndarray | float = 1.0) -> None:
    H, W = field.shape
    ys, xs = np.mgrid[0:H, 0:W]
    for i in range(len(pts) - 1):
        ax, ay = pts[i]
        bx, by = pts[i + 1]
        vx, vy = bx - ax, by - ay
        L2 = max(vx * vx + vy * vy, 1e-6)
        x0, x1 = int(max(0, min(ax, bx) - width - 1)), int(min(W, max(ax, bx) + width + 2))
        y0, y1 = int(max(0, min(ay, by) - width - 1)), int(min(H, max(ay, by) + width + 2))
        if x0 >= x1 or y0 >= y1:
            continue
        X, Y = xs[y0:y1, x0:x1] + 0.5, ys[y0:y1, x0:x1] + 0.5
        u = np.clip(((X - ax) * vx + (Y - ay) * vy) / L2, 0, 1)
        d = np.hypot(X - (ax + u * vx), Y - (ay + u * vy))
        v = value[i] if isinstance(value, np.ndarray) else value
        cov = np.clip(width * 0.5 + 0.5 - d, 0, 1) * v
        np.maximum(field[y0:y1, x0:x1], cov, out=field[y0:y1, x0:x1])


@node("rope", "sim",
      "A verlet rope or chain of ``links`` from (x, y) hanging ``length`` (canvas fraction), swung by wind (px/frame, gusting over the loop) and gravity; "
      "width px; end_mass weights the tip; a second pin at (x1, y1) when pin_end. A field.")
def rope(ctx: Context, x: float = 0.5, y: float = 0.1, length: float = 0.6, links: int = 12, width: float = 1.5, gravity: float = 0.3, wind: float = 0.6,
         gust: float = 1.0, pin_end: bool = False, x1: float = 0.8, y1: float = 0.1, seed: int = 0, _id: str = "") -> Field:
    rng = ctx.rng(f"{_id}:{seed}")
    T = ctx.frames
    n = max(2, int(links))
    rest = length * ctx.h / (n - 1)
    pts = np.stack([np.full(n, x * ctx.w), y * ctx.h + np.arange(n) * rest], 1).astype(np.float32)
    if pin_end:
        pts = np.stack([np.linspace(x * ctx.w, x1 * ctx.w, n), np.linspace(y * ctx.h, y1 * ctx.h, n)], 1).astype(np.float32)
    prev = pts.copy()
    pins = np.zeros(n, bool)
    pins[0] = True
    if pin_end:
        pins[-1] = True
    ph = rng.uniform(0, 2 * np.pi)
    frames = []
    for pass_ in range(3):
        for t in range(T):
            a = 2 * np.pi * t / T
            w = wind * (math.sin(a + ph) + gust * 0.5 * math.sin(2 * a + ph * 1.7))
            windv = np.zeros_like(pts)
            windv[:, 0] = w * np.linspace(0.2, 1.0, n)
            pts, prev = _verlet(pts, prev, pins, rest, gravity, windv)
            if pass_ == 2:
                f = np.zeros((ctx.h, ctx.w), np.float32)
                _draw_polyline(f, pts, width)
                frames.append(f)
    return np.stack(frames)


@node("cloth", "sim",
      "A cloth flag of cols x rows points hung from its top edge (x, y, width as canvas fractions), blown by wind (px/frame) with gusts over the loop; "
      "returns a field shaded by the cloth's lean (1 lit face, darker in the folds).")
def cloth(ctx: Context, x: float = 0.3, y: float = 0.15, width: float = 0.4, height: float = 0.5, cols: int = 8, rows: int = 6, wind: float = 0.8, gust: float = 1.0,
          gravity: float = 0.25, hang: str = "top", seed: int = 0, _id: str = "") -> Field:
    rng = ctx.rng(f"{_id}:{seed}")
    T = ctx.frames
    c, r = max(2, int(cols)), max(2, int(rows))
    gx = np.linspace(x * ctx.w, (x + width) * ctx.w, c)
    gy = np.linspace(y * ctx.h, (y + height) * ctx.h, r)
    P = np.stack(np.meshgrid(gx, gy, indexing="xy"), -1).astype(np.float32)  # (r, c, 2)
    prev = P.copy()
    restx = (gx[1] - gx[0])
    resty = (gy[1] - gy[0])
    pins = np.zeros((r, c), bool)
    if hang == "top":
        pins[0, :] = True
    else:
        pins[:, 0] = True
    ph = rng.uniform(0, 2 * np.pi)
    frames = []
    for pass_ in range(3):
        for t in range(T):
            a = 2 * np.pi * t / T
            w = wind * (0.6 + 0.4 * math.sin(a + ph) + gust * 0.3 * math.sin(3 * a + ph))
            vel = (P - prev) * 0.97
            prev = P.copy()
            P = P + vel + np.array([w, gravity], np.float32)
            for _ in range(5):
                for axis, rest in ((1, restx), (0, resty)):
                    seg = np.diff(P, axis=axis)
                    L = np.maximum(np.hypot(seg[..., 0], seg[..., 1]), 1e-6)
                    corr = seg / L[..., None] * ((L - rest) * 0.5)[..., None]
                    if axis == 1:
                        P[:, :-1] += corr
                        P[:, 1:] -= corr
                    else:
                        P[:-1] += corr
                        P[1:] -= corr
                P[pins] = prev[pins]
            if pass_ == 2:
                frames.append(_raster_cloth(ctx, P))
    return np.stack(frames)


def _raster_cloth(ctx: Context, P: np.ndarray) -> np.ndarray:
    from PIL import Image as PILImage, ImageDraw
    im = PILImage.new("F", (ctx.w, ctx.h), 0.0)
    d = ImageDraw.Draw(im)
    r, c, _ = P.shape
    for i in range(r - 1):
        for j in range(c - 1):
            quad = [tuple(P[i, j]), tuple(P[i, j + 1]), tuple(P[i + 1, j + 1]), tuple(P[i + 1, j])]
            # shade by the quad's lean: a face turned to the light (right) is bright, folds dark
            ex = P[i, j + 1] - P[i, j]
            lean = ex[0] / max(np.hypot(ex[0], ex[1]), 1e-6)
            shade = float(np.clip(0.45 + 0.55 * lean, 0.15, 1.0))
            d.polygon(quad, fill=shade)
    return np.asarray(im, np.float32)
