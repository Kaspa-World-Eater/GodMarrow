"""Composition nodes: layers with blend modes, depth and sprite stacking, Voronoi shards, path scatter, mirrors,
transforms, pictures from disk and whole library effects as layers."""
from __future__ import annotations

import math

import numpy as np
from PIL import Image as PILImage

from ..color import oklab_to_rgb, rgb_to_oklab
from .graph import Context, Field, evaluate, node

BLENDS = ("normal", "add", "screen", "multiply", "subtract", "behind", "lighten", "darken", "mask", "erase")


def blend_images(base: np.ndarray, top: np.ndarray, mode: str = "normal", opacity: float = 1.0) -> np.ndarray:
    """Composite ``top`` over ``base`` (both uint8 RGBA (T, H, W, 4)); the result keeps hard alpha where either had it."""
    b = base.astype(np.float32) / 255.0
    t = top.astype(np.float32) / 255.0
    ta = t[..., 3:4] * float(opacity)
    ba = b[..., 3:4]
    bc, tc = b[..., :3], t[..., :3]
    if mode == "add":
        col = np.clip(bc + tc * ta, 0, 1)
        a = np.maximum(ba, ta)
        col = np.where(ba > 0, col, tc)
    elif mode == "screen":
        col = 1 - (1 - bc) * (1 - tc * ta)
        a = np.maximum(ba, ta)
        col = np.where(ba > 0, col, tc)
    elif mode == "multiply":
        col = bc * (1 - ta + tc * ta)
        a = ba
    elif mode == "subtract":
        col = np.clip(bc - tc * ta, 0, 1)
        a = ba
    elif mode == "lighten":
        col = np.where(ta > 0, np.maximum(bc, tc), bc)
        a = np.maximum(ba, ta)
        col = np.where(ba > 0, col, tc)
    elif mode == "darken":
        col = np.where(ta > 0, np.minimum(bc, tc), bc)
        a = np.maximum(ba, ta)
        col = np.where(ba > 0, col, tc)
    elif mode == "behind":
        col = np.where(ba > 0, bc, tc)
        a = np.maximum(ba, ta)
    elif mode == "mask":
        col = bc
        a = ba * (ta > 0)
    elif mode == "erase":
        col = bc
        a = ba * (1 - ta)
    else:  # normal
        col = tc * ta + bc * (1 - ta)
        a = ta + ba * (1 - ta)
        col = np.where(a > 0, col / np.maximum(a, 1e-6), 0)
        a = np.where(ta >= 0.5, 1.0, a) if opacity >= 1.0 else a
    out = np.concatenate([np.clip(col, 0, 1), np.clip(a, 0, 1)], -1)
    return (np.rint(out * 255)).astype(np.uint8)


@node("layers", "compose", "Stack images bottom to top; blends per layer (normal add screen multiply subtract behind lighten darken mask erase), opacities too.", returns="image")
def layers(ctx: Context, images: list, blends: list | None = None, opacities: list | None = None) -> np.ndarray:
    out = None
    for i, im in enumerate(images):
        if im is None:
            continue
        if out is None:
            out = im.copy()
            continue
        mode = (blends[i] if blends and i < len(blends) else "normal") or "normal"
        op = float(opacities[i]) if opacities and i < len(opacities) else 1.0
        out = blend_images(out, im, mode, op)
    if out is None:
        return np.zeros((ctx.frames, ctx.h, ctx.w, 4), np.uint8)
    return out


@node("blend", "compose", "Two images: top over base with a blend mode and opacity.", returns="image")
def blend(ctx: Context, base: np.ndarray, top: np.ndarray, mode: str = "normal", opacity: float = 1.0) -> np.ndarray:
    return blend_images(base, top, mode, opacity)


@node("transform", "compose", "Move (dx, dy px), scale and turn (degrees; spin degrees per loop) an image; nearest sampling, the canvas size kept.", returns="image")
def transform(ctx: Context, image: np.ndarray, dx: float = 0.0, dy: float = 0.0, scale: float = 1.0, angle: float = 0.0, spin: float = 0.0, flip_x: bool = False) -> np.ndarray:
    out = np.zeros_like(image)
    for t in range(image.shape[0]):
        im = PILImage.fromarray(image[t], "RGBA")
        if flip_x:
            im = im.transpose(PILImage.FLIP_LEFT_RIGHT)
        if scale != 1.0:
            im = im.resize((max(1, int(round(im.width * scale))), max(1, int(round(im.height * scale)))), PILImage.NEAREST)
        a = angle + spin * t / max(image.shape[0], 1)
        if a:
            im = im.rotate(a, resample=PILImage.NEAREST, expand=True)
        canvas = PILImage.new("RGBA", (ctx.w, ctx.h), (0, 0, 0, 0))
        canvas.paste(im, (int(round(ctx.w / 2 + dx - im.width / 2)), int(round(ctx.h / 2 + dy - im.height / 2))), im)
        out[t] = np.asarray(canvas)
    return out


@node("depth_stack", "compose", "Several images ordered per pixel by depth fields (nearer wins): a flame in front of smoke where the smoke is behind.", returns="image")
def depth_stack(ctx: Context, images: list, depths: list) -> np.ndarray:
    out = np.zeros((ctx.frames, ctx.h, ctx.w, 4), np.uint8)
    best = np.full((ctx.frames, ctx.h, ctx.w), -np.inf, np.float32)
    for im, d in zip(images, depths):
        dd = np.broadcast_to(np.asarray(d, np.float32), best.shape)
        here = (im[..., 3] > 0) & (dd > best)
        out[here] = im[here]
        best = np.where(here, dd, best)
    return out


@node("sprite_stack", "compose", "Stack an image on itself ``count`` times, each copy ``step`` px higher and ``shade`` darker: the voxel look of a stacked sprite.", returns="image")
def sprite_stack(ctx: Context, image: np.ndarray, count: int = 4, step: int = 1, shade: float = 0.08, ramp: np.ndarray | None = None) -> np.ndarray:
    out = np.zeros_like(image)
    n = max(1, int(count))
    for k in range(n):
        shifted = np.roll(image, -k * int(step), axis=1)
        lab = rgb_to_oklab(shifted[..., :3])
        lab[..., 0] = np.clip(lab[..., 0] - shade * (n - 1 - k), 0, 1)
        rgb = oklab_to_rgb(lab)
        layer = np.concatenate([rgb, shifted[..., 3:4]], -1)
        out = blend_images(out, layer, "normal", 1.0)
    if ramp is not None:
        from ..palette import Palette
        pal = Palette(ramp)
        op = out[..., 3] > 0
        out[..., :3][op] = pal.colors[pal.nearest(rgb_to_oklab(out[..., :3][op]))]
    return out


@node("fracture", "compose",
      "Voronoi fracture: an image broken into ``pieces`` shards that fly from (x, y) over the loop with speed (px/frame), gravity and spin; they "
      "fade from fade_from (0..1 of the loop). The source's frame 0 is the thing broken.", returns="image")
def fracture(ctx: Context, image: np.ndarray, pieces: int = 8, x: float = 0.5, y: float = 0.5, speed: float = 1.5, gravity: float = 0.15, spin: float = 0.0,
             fade_from: float = 0.6, seed: int = 0, _id: str = "") -> np.ndarray:
    from . import noise as N
    rng = ctx.rng(f"{_id}:{seed}")
    src = image[0]
    cells = max(2, int(round(math.sqrt(pieces))))
    ids = N.cellular(ctx.w, ctx.h, 1, cells=cells, mode="id", drift=0.0, seed=ctx.node_seed(f"{_id}:cells:{seed}"))[0]
    labels = np.unique(ids)
    out = np.zeros_like(image)
    T = ctx.frames
    for lab in labels:
        m = (ids == lab) & (src[..., 3] > 0)
        if not m.any():
            continue
        ys, xs = np.nonzero(m)
        cxp, cyp = xs.mean(), ys.mean()
        ang = math.atan2(cyp - y * ctx.h, cxp - x * ctx.w) + rng.uniform(-0.3, 0.3)
        sp = speed * rng.uniform(0.6, 1.4)
        piece = np.zeros_like(src)
        piece[m] = src[m]
        pim = PILImage.fromarray(piece, "RGBA")
        for t in range(T):
            if t / T >= 1.0:
                break
            dx = sp * math.cos(ang) * t
            dy = sp * math.sin(ang) * t + 0.5 * gravity * t * t
            im = pim
            if spin:
                im = pim.rotate(spin * t * rng.choice([-1, 1]), resample=PILImage.NEAREST, center=(cxp, cyp))
            canvas = PILImage.new("RGBA", (ctx.w, ctx.h), (0, 0, 0, 0))
            canvas.paste(im, (int(round(dx)), int(round(dy))), im)
            arr = np.asarray(canvas).copy()
            if fade_from < 1.0:
                f = t / T
                if f > fade_from:
                    keep = rng.random(arr.shape[:2]) > (f - fade_from) / max(1 - fade_from, 1e-3)
                    arr[..., 3] *= keep
            out[t] = np.where(arr[..., 3:4] > 0, arr, out[t])
    return out


@node("path_scatter", "compose", "Stamp an image's frame 0 along a path (points as [x, y] canvas fractions) ``count`` times, each copy advancing a step along it per frame.", returns="image")
def path_scatter(ctx: Context, image: np.ndarray, points: list, count: int = 6, speed: float = 1.0, scale_end: float = 1.0) -> np.ndarray:
    pts = np.array(points, np.float32) * np.array([ctx.w, ctx.h], np.float32)
    seg = np.diff(pts, axis=0)
    seglen = np.hypot(seg[:, 0], seg[:, 1])
    total = float(seglen.sum()) or 1.0
    cum = np.concatenate([[0], np.cumsum(seglen)])
    src = PILImage.fromarray(image[0], "RGBA")
    out = np.zeros_like(image)

    def at(u):
        d = u * total
        i = int(np.clip(np.searchsorted(cum, d) - 1, 0, len(seg) - 1))
        f = (d - cum[i]) / max(seglen[i], 1e-6)
        return pts[i] + seg[i] * f

    for t in range(ctx.frames):
        canvas = PILImage.new("RGBA", (ctx.w, ctx.h), (0, 0, 0, 0))
        for k in range(count):
            u = ((k / count) + speed * t / ctx.frames) % 1.0
            p = at(u)
            sc = 1.0 + (scale_end - 1.0) * u
            im = src if sc == 1.0 else src.resize((max(1, int(src.width * sc)), max(1, int(src.height * sc))), PILImage.NEAREST)
            canvas.paste(im, (int(round(p[0] - im.width / 2)), int(round(p[1] - im.height / 2))), im)
        out[t] = np.asarray(canvas)
    return out


@node("mirror", "compose", "Mirror an image or field: the left half copied to the right (axis x) or the top to the bottom (y).")
def mirror(ctx: Context, image: np.ndarray, axis: str = "x") -> np.ndarray:
    out = image.copy()
    if axis == "x":
        half = ctx.w // 2
        out[:, :, ctx.w - half:] = out[:, :, :half][:, :, ::-1]
    else:
        half = ctx.h // 2
        out[:, ctx.h - half:] = out[:, :half][:, ::-1]
    return out


@node("polar_mirror", "compose", "Kaleidoscope: one wedge of ``segments`` round (x, y) repeated and mirrored round the circle.")
def polar_mirror(ctx: Context, image: np.ndarray, segments: int = 6, x: float = 0.5, y: float = 0.5, spin: float = 0.0) -> np.ndarray:
    X, Y = ctx.grid()
    dx, dy = X - x * ctx.w, Y - y * ctx.h
    r = np.hypot(dx, dy)
    n = max(1, int(segments))
    wedge = 2 * np.pi / n
    out = np.zeros_like(image)
    for t in range(image.shape[0]):
        th = np.arctan2(dy, dx) + math.radians(spin) * t / max(image.shape[0], 1)
        local = np.mod(th, wedge)
        local = np.where(local > wedge / 2, wedge - local, local)
        sx = np.clip(np.rint(x * ctx.w + r * np.cos(local) - 0.5).astype(int), 0, ctx.w - 1)
        sy = np.clip(np.rint(y * ctx.h + r * np.sin(local) - 0.5).astype(int), 0, ctx.h - 1)
        out[t] = image[t][sy, sx]
    return out


@node("picture", "compose", "A PNG from disk as an image (a still repeated every frame, or a strip of ``frames`` cells read left to right), fitted to the canvas centre.", returns="image")
def picture(ctx: Context, path: str, frames: int = 1, scale: float = 1.0) -> np.ndarray:
    im = PILImage.open(path).convert("RGBA")
    n = max(1, int(frames))
    fw = im.width // n
    out = np.zeros((ctx.frames, ctx.h, ctx.w, 4), np.uint8)
    for t in range(ctx.frames):
        cell = im.crop((fw * (t % n), 0, fw * (t % n + 1), im.height))
        if scale != 1.0:
            cell = cell.resize((max(1, int(cell.width * scale)), max(1, int(cell.height * scale))), PILImage.NEAREST)
        canvas = PILImage.new("RGBA", (ctx.w, ctx.h), (0, 0, 0, 0))
        canvas.paste(cell, ((ctx.w - cell.width) // 2, (ctx.h - cell.height) // 2), cell)
        out[t] = np.asarray(canvas)
    return out


@node("effect", "compose", "A whole library effect as one layer, rendered on this canvas with its levers; dx, dy move it, scale sizes it, start delays it (frames).", returns="image")
def effect(ctx: Context, name: str, levers: dict | None = None, dx: float = 0.0, dy: float = 0.0, scale: float = 1.0, start: int = 0, seed: int = 0) -> np.ndarray:
    from .library import get_effect
    g = get_effect(name)
    sub = Context(ctx.w, ctx.h, ctx.frames, ctx.fps, ctx.seed + int(seed), {**g.get("levers", {}), **(levers or {})}, ctx.anchor)
    sub.levers = {k: (v["default"] if isinstance(v, dict) else v) for k, v in sub.levers.items()}
    img, _, _ = evaluate({**g["graph"], "levers": {}}, sub.levers, ctx=sub)
    if dx or dy or scale != 1.0:
        img = transform(ctx, img, dx=dx, dy=dy, scale=scale)
    if start:
        img = np.roll(img, int(start), axis=0)
    return img


@node("empty", "compose", "A clear canvas (image).", returns="image")
def empty(ctx: Context) -> np.ndarray:
    return np.zeros((ctx.frames, ctx.h, ctx.w, 4), np.uint8)


@node("echo", "compose",
      "Ghost copies trailing a moving image: ``copies`` earlier frames laid behind it, each ``lag`` frames older, shifted by (dx, dy) px per copy and "
      "fading (and darkened toward ``ramp``'s low end when given).", returns="image")
def echo(ctx: Context, image: np.ndarray, copies: int = 3, lag: int = 1, dx: float = -2.0, dy: float = 0.0, fade: float = 0.6, ramp: np.ndarray | None = None) -> np.ndarray:
    out = np.zeros_like(image)
    for k in range(int(copies), 0, -1):
        ghost = np.roll(image, k * int(lag), axis=0)
        ghost = np.roll(np.roll(ghost, int(round(dy * k)), axis=1), int(round(dx * k)), axis=2)
        if ramp is not None:
            lab = rgb_to_oklab(ghost[..., :3])
            lab[..., 0] = np.clip(lab[..., 0] * (1 - fade * k / (copies + 1)), 0, 1)
            lab[..., 1:] *= (1 - fade * k / (copies + 1))
            from ..palette import Palette
            pal = Palette(ramp)
            rgb = pal.colors[pal.nearest(lab)]
            ghost = np.concatenate([rgb, ghost[..., 3:4]], -1).astype(np.uint8)
        # a ghost is thinned: every k-th pixel dropped by a checker, so it reads as a fading copy without soft alpha
        yy, xx = np.mgrid[0:ctx.h, 0:ctx.w]
        keep = ((xx + yy + k) % (k + 1)) == 0
        ghost[..., 3] = ghost[..., 3] * keep[None]
        out = blend_images(out, ghost, "normal", 1.0)
    return blend_images(out, image, "normal", 1.0)
