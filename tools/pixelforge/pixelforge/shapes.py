"""Shape sprites: characters and objects drawn by code and rendered as pixel art.

A ``.shapes.json`` file lists materials (short colour ramps, shadow to highlight), shapes with a material each, the
lights, the ground shadow and the animation rules. This module turns such a file into frames two ways that share
one set of shading rules:

* **flat** (the 2D fast path, for icons, effects and props without depth): polygons, ellipses and dots are masks
  painted back to front with automatic form shading: a step up along the top-left edges, a step down along the
  bottom-right ones, a directional gradient across the shape's box with a half-step Bayer dither, contour pixels
  (touching an earlier shape) forced to the darkest step, optional fold stripes and a material texture.
* **solid** (the 3D path, for characters): ellipsoids, capsules, rounded boxes and elliptical rings around the body
  axis (coats, capes, skirts, belts, hat brims, with ragged hems, open fronts, holes) are signed-distance shapes.
  They are voxelised once; a two-voxel surface shell keeps each voxel's normal, material and tone; a frame rotates
  the shell to the wanted direction, z-buffers it and shades every pixel from one fixed light with the material's
  ramp, so all eight game directions are real views of one model.

Both end the same way: contours where a neighbouring pixel belongs to another shape behind this one, a 1 px
outline round the silhouette, emissive pixels stamped last, point lights tinting lit pixels through a Bayer
threshold, a dithered contact shadow on the ground. Every colour comes from the ramps; nothing is blended between
palette steps except the light tints, which the preset can switch off.

Sizes: a file is authored at its own ``height`` (the figure's native height in units). A render at ``scale``
multiplies everything, so the voxel grid and the masks follow the output resolution; the preset's ``figure_height``
divided by the file's height gives the scale. The preset's ``shading_bands`` resamples every ramp to that many
steps (0 keeps each ramp's own length) and its ``outline`` rule decides the outline.
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

ASSETS = Path(__file__).resolve().parent.parent / "assets" / "shapes"
LIBRARY_FILE = ASSETS / "materials.json"
BAYER = (np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], float).reshape(4, 4) + 0.5) / 16
LIGHT = np.array([-0.55, -0.7, 0.65]) / math.sqrt(0.55 ** 2 + 0.7 ** 2 + 0.65 ** 2)
FLAT_KINDS = ("poly", "ellipse", "dot", "dots", "flat")
SOLID_KINDS = ("ellipsoid", "capsule", "box", "ring", "prism", "union")
EMIT_CODES = {"none": 0, "flicker": 1, "pulse": 2, "steady": 3, "soft": 4}
TEXTURES = ("none", "weave", "fur", "scratch", "grain")
DEFAULT_OUTLINE = "#08060a"


# ---------------------------------------------------------------------------------------------- colours and ramps
def hexrgb(s: str) -> np.ndarray:
    s = s.strip().lstrip("#")
    if len(s) != 6:
        raise ValueError(f"expected #rrggbb, got {s!r}")
    return np.array([int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)], float)


def rgbhex(c) -> str:
    return "#%02x%02x%02x" % tuple(int(round(float(v))) for v in np.clip(c, 0, 255)[:3])


def extend_ramp(ramp: np.ndarray, n: int) -> np.ndarray:
    """A ramp of any length becomes an ``n``-step ramp: linear in RGB between its steps, the ends pushed a little
    further apart when the ramp grows (so a long ramp keeps contrast)."""
    r = np.asarray(ramp, float)
    if n == len(r):
        return r.copy()
    xs = np.linspace(0, len(r) - 1, n)
    out = np.empty((n, 3))
    for k, x in enumerate(xs):
        i = int(math.floor(x)); f = x - i
        a = r[min(i, len(r) - 1)]; b = r[min(i + 1, len(r) - 1)]
        out[k] = a * (1 - f) + b * f
    if n > len(r):
        out[0] = np.clip(out[0] * 0.8, 0, 255)
        out[-1] = np.clip(out[-1] * 1.1 + 8, 0, 255)
    return out


@dataclass
class Material:
    name: str
    ramp: np.ndarray                 # (n, 3) float RGB, shadow first
    emissive: bool = False
    spec: bool = False               # metal: the brightest step only for near-direct light
    spec_t: float = 0.88
    texture: str = "none"
    texture_strength: float = 0.0
    lift: float = 0.0

    @property
    def steps(self) -> int:
        return len(self.ramp)

    def resampled(self, n: int | None) -> "Material":
        if not n or n == len(self.ramp):
            return self
        return Material(self.name, extend_ramp(self.ramp, n), self.emissive, self.spec, self.spec_t, self.texture, self.texture_strength, self.lift)

    def as_dict(self) -> dict:
        return {"ramp": [rgbhex(c) for c in self.ramp], "emissive": self.emissive, "spec": self.spec, "spec_t": self.spec_t,
                "texture": self.texture, "texture_strength": self.texture_strength, "lift": self.lift}


def load_library(path: str | Path = LIBRARY_FILE) -> dict:
    data = json.loads(Path(path).read_text())
    return {k: v for k, v in data.items() if not k.startswith("_")}


def _material(name: str, spec: dict, library: dict, depth: int = 0) -> Material:
    ramp = spec.get("ramp")
    if isinstance(ramp, str):                      # an alias: "ramp": "iron"
        if ramp not in library or depth > 4:
            raise ValueError(f"material {name!r} refers to unknown ramp {ramp!r}")
        base = _material(ramp, library[ramp], library, depth + 1)
        merged = {**base.as_dict(), **{k: v for k, v in spec.items() if k != "ramp"}}
        return _material(name, merged, library, depth + 1)
    if not ramp or len(ramp) < 2:
        raise ValueError(f"material {name!r} needs a ramp of at least two colours")
    return Material(name, np.array([hexrgb(c) for c in ramp]), bool(spec.get("emissive", False)), bool(spec.get("spec", False)),
                    float(spec.get("spec_t", 0.88)), str(spec.get("texture", "none")), float(spec.get("texture_strength", 0.0)),
                    float(spec.get("lift", 0.0)))


def build_materials(doc: dict, steps: int | None = None, library: dict | None = None) -> dict[str, Material]:
    """The library plus the file's own materials (which win), every ramp resampled to ``steps`` when given.
    Emissive ramps keep their own length: their steps are picked by rule, not by light."""
    lib = dict(library if library is not None else load_library())
    lib.update(doc.get("materials", {}))
    out = {}
    for name, spec in lib.items():
        m = _material(name, spec, lib)
        out[name] = m if m.emissive else m.resampled(steps)
    return out


# ---------------------------------------------------------------------------------------------- frame functions
def wave(f: int, i: float, amp: float = 1.0) -> int:
    """The page's tatter wave: a whole-pixel offset that flicks without drifting."""
    return int(round(math.sin(f * 0.55 + i * 1.9) * amp))


def breath(f: int, period: int = 10, amount: int = 1) -> int:
    return amount * ((f // period) % 2)


def pulse(f: int, speed: float = 0.35) -> float:
    return (math.sin(f * speed) + 1) / 2


def hash2(x, y=0.0):
    s = np.sin(np.asarray(x, float) * 127.1 + np.asarray(y, float) * 311.7) * 43758.5453
    return s - np.floor(s)


def tat(a, n: int, seed: float):
    """Ragged hem: sawtooth tongues around the circumference (``a`` in radians), each a different depth."""
    u = (np.asarray(a, float) + math.pi) / (2 * math.pi) * n
    k = np.floor(u); fr = u - k
    return (1 - np.abs(2 * fr - 1)) * (0.45 + 0.55 * hash2(k + seed))


# ---------------------------------------------------------------------------------------------- the pixel canvas
class Canvas:
    """The buffers both paths draw into. ``fill``: 0 empty, 1 painted, 2 outline, 3 emissive. ``pid`` is the shape
    that painted a pixel, ``depth`` its distance toward the viewer, ``normal`` its view-space normal."""

    def __init__(self, w: int, h: int, scale: float = 1.0):
        self.W, self.H, self.scale = int(w), int(h), float(scale)
        self.col = np.zeros((self.H, self.W, 3), float)
        self.fill = np.zeros((self.H, self.W), np.uint8)
        self.pid = np.full((self.H, self.W), -1, np.int32)
        self.depth = np.full((self.H, self.W), -1e9, float)
        self.normal = np.zeros((self.H, self.W, 3), float)
        self.normal[..., 2] = 1.0
        self.glow: list[tuple[int, int, np.ndarray]] = []
        yy, xx = np.mgrid[0:self.H, 0:self.W]
        self.bayer = BAYER[yy & 3, xx & 3]
        self.yy, self.xx = yy, xx

    # ---- the shared passes
    def outline(self, colour: np.ndarray) -> int:
        body = (self.fill == 1) | (self.fill == 3)
        nb = np.zeros_like(body)
        nb[:, 1:] |= body[:, :-1]; nb[:, :-1] |= body[:, 1:]; nb[1:, :] |= body[:-1, :]; nb[:-1, :] |= body[1:, :]
        edge = nb & (self.fill == 0)
        self.col[edge] = colour
        self.fill[edge] = 2
        return int(edge.sum())

    def emit(self, x: float, y: float, colour: np.ndarray, size: int | None = None) -> None:
        """An emissive pixel (a block of ``size`` at scale > 1), stamped last, on top of everything."""
        self.glow.append((int(math.floor(x)), int(math.floor(y)), np.asarray(colour, float), int(size or max(1, round(self.scale)))))

    def light_flat(self, cx: float, cy: float, R: float, s: float, tint: np.ndarray, rim: bool = False) -> None:
        """The flat path's point light: distance falloff only, two Bayer-thresholded mixes toward the tint."""
        d = np.hypot(self.xx - cx, self.yy - cy)
        v = np.clip(1 - d / R, 0, 1) ** 2 * s
        m = self.fill == 1
        a = m & (v > self.bayer)
        self.col[a] = self.col[a] * 0.7 + tint * 0.3
        a2 = m & (v > 0.6 + self.bayer * 0.4)
        self.col[a2] = self.col[a2] * 0.75 + tint * 0.25
        if rim:
            self._rim(m, v, cx, cy, tint)

    def light_point(self, sx: float, sy: float, sz: float, R: float, s: float, tint: np.ndarray, rim: bool = False) -> None:
        """The solid path's point light: each pixel's real depth and normal, squared falloff, three mix bands with
        the faintest dithered by the Bayer pattern."""
        m = self.fill == 1
        dx = sx - (self.xx + 0.5); dy = sy - (self.yy + 0.5); dz = sz - self.depth
        dd = np.hypot(dx, dy)
        ln = np.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
        ndl = np.clip((self.normal[..., 0] * dx + self.normal[..., 1] * dy + self.normal[..., 2] * dz) / ln, 0, None)
        v = ndl * np.clip(1 - dd / R, 0, 1) ** 2 * s
        hi = m & (v > 0.55)
        mid = m & (v > 0.28) & ~hi
        lo = m & (v > 0.12 + self.bayer * 0.06) & ~(v > 0.28)
        for a, k in ((hi, 0.62), (mid, 0.38), (lo, 0.18)):
            self.col[a] = self.col[a] * (1 - k) + tint * k
        if rim:
            self._rim(m, np.clip(1 - dd / R, 0, 1) ** 2 * s, sx, sy, tint)

    def _rim(self, m, v, cx, cy, tint) -> None:
        sc = max(1, int(round(self.scale)))
        dx, dy = int(np.sign(cx - self.W / 2)) * sc, int(np.sign(cy - self.H / 2)) * sc
        ys, xs = np.nonzero(m)
        y2 = np.clip(ys + dy, 0, self.H - 1); x2 = np.clip(xs + dx, 0, self.W - 1)
        edge = self.fill[y2, x2] != 1
        rimm = np.zeros_like(m); rimm[ys[edge], xs[edge]] = True
        rimm &= v > 0.08
        self.col[rimm] = np.clip(self.col[rimm] * 0.35 + tint * 0.75 + 30, 0, 255)

    def shadow(self, cx: float, cy: float, rx: float, ry: float) -> np.ndarray:
        sc = max(1, int(round(self.scale)))
        u = (self.xx + 0.5 - cx) / max(rx, 0.5); v = (self.yy + 0.5 - cy) / max(ry, 0.5)
        return (u * u + v * v <= 1) & (((self.xx // sc) + (self.yy // sc)) % 2 == 0) & (self.fill == 0)

    def compose(self, shadow_mask: np.ndarray | None = None, shadow_colour: np.ndarray | None = None) -> np.ndarray:
        out = np.zeros((self.H, self.W, 4), np.uint8)
        if shadow_mask is not None and shadow_colour is not None:
            out[shadow_mask, :3] = np.clip(shadow_colour, 0, 255).astype(np.uint8); out[shadow_mask, 3] = 255
        m = self.fill > 0
        out[m, :3] = np.clip(self.col[m], 0, 255).astype(np.uint8); out[m, 3] = 255
        for x, y, c, size in self.glow:
            if 0 <= x < self.W and 0 <= y < self.H:
                out[y:y + size, x:x + size, :3] = np.clip(c, 0, 255).astype(np.uint8); out[y:y + size, x:x + size, 3] = 255
        return out

    def normal_pass(self) -> np.ndarray:
        """The view-space normals as an RGBA image (x right, y up, z toward the viewer, the usual encoding)."""
        out = np.zeros((self.H, self.W, 4), np.uint8)
        m = (self.fill == 1) | (self.fill == 3)
        n = self.normal[m]
        out[m, 0] = np.clip((n[:, 0] * 0.5 + 0.5) * 255, 0, 255); out[m, 1] = np.clip((-n[:, 1] * 0.5 + 0.5) * 255, 0, 255)
        out[m, 2] = np.clip((n[:, 2] * 0.5 + 0.5) * 255, 0, 255); out[m, 3] = 255
        return out

    def depth_pass(self, near: float, far: float) -> np.ndarray:
        out = np.zeros((self.H, self.W, 4), np.uint8)
        m = (self.fill == 1) | (self.fill == 3)
        g = np.clip((self.depth[m] - far) / max(near - far, 1e-6), 0, 1) * 215 + 25
        out[m, 0] = out[m, 1] = out[m, 2] = g.astype(np.uint8); out[m, 3] = 255
        return out


# ---------------------------------------------------------------------------------------------- the flat path
class Mask(np.ndarray):
    """A boolean mask that carries its bounding box (x0, y0, x1, y1) in canvas pixels."""
    bb = (0.0, 0.0, 0.0, 0.0)


def _as_mask(a: np.ndarray, bb) -> Mask:
    m = a.view(Mask); m.bb = bb
    return m


class Painter:
    """The flat recipe. Coordinates are in the file's units; ``scale`` and ``oy`` map them to the canvas."""

    def __init__(self, canvas: Canvas, materials: dict[str, Material], oy: float = 0.0, seed: int = 1, texture: bool = False, ao: bool = False):
        self.c = canvas
        self.M = materials
        self.oy = oy
        self.s = canvas.scale
        self.texture = texture
        self.ao = ao
        self.noise = np.random.default_rng(seed).random((canvas.H, canvas.W))
        self.shape_count = 0

    # ---- masks
    def poly(self, pts, dx: float = 0.0, dy: float = 0.0) -> Mask:
        s, c = self.s, self.c
        q = [((x + dx) * s, (y + dy + self.oy) * s) for x, y in pts]
        xs = [p[0] for p in q]; ys = [p[1] for p in q]
        m = np.zeros((c.H, c.W), bool)
        bb = (min(xs), min(ys), max(xs), max(ys))
        x0, x1 = max(1, int(math.floor(min(xs)))), min(c.W - 2, int(math.ceil(max(xs))))
        y0, y1 = max(1, int(math.floor(min(ys)))), min(c.H - 2, int(math.ceil(max(ys))))
        if x1 < x0 or y1 < y0 or len(q) < 3:
            return _as_mask(m, bb)
        PX, PY = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        inside = np.zeros_like(PX, bool)
        for i in range(len(q)):
            xi, yi = q[i]; xj, yj = q[i - 1]
            cond = (yi > PY) != (yj > PY)
            den = (yj - yi) if yj != yi else 1.0      # cond is False on a horizontal edge, so the value is unused
            xint = (xj - xi) * (PY - yi) / den + xi
            inside ^= cond & (PX < xint)
        m[y0:y1 + 1, x0:x1 + 1] = inside
        return _as_mask(m, bb)

    def ell(self, cx: float, cy: float, rx: float, ry: float, dx: float = 0.0, dy: float = 0.0) -> Mask:
        s, c = self.s, self.c
        cx, cy, rx, ry = (cx + dx) * s, (cy + self.oy + dy) * s, rx * s, ry * s
        m = ((c.xx + 0.5 - cx) / max(rx, 1e-6)) ** 2 + ((c.yy + 0.5 - cy) / max(ry, 1e-6)) ** 2 <= 1
        return _as_mask(m, (cx - rx, cy - ry, cx + rx, cy + ry))

    # ---- painting
    def paint(self, m: Mask, material: str, base: int = 2, gx: float = -0.9, gy: float = -0.6, fold=None, contour: bool = True) -> int:
        mat = self.M[material]
        r = mat.ramp
        c = self.c
        bx0, by0, bx1, by1 = m.bb
        mx, my = (bx0 + bx1) / 2, (by0 + by1) / 2
        hw, hh = max(1.0, (bx1 - bx0) / 2), max(1.0, (by1 - by0) / 2)
        ys, xs = np.nonzero(m)
        sid = self.shape_count
        self.shape_count += 1
        if len(ys) == 0:
            return 0
        ms = max(1, int(round(self.s)))
        t = np.full(len(ys), float(base))

        def off(dy, dx):
            return m[np.clip(ys + dy, 0, c.H - 1), np.clip(xs + dx, 0, c.W - 1)]

        near_tl = (~off(0, -ms)) | (~off(-ms, 0))
        near_tl2 = (~off(0, -2 * ms)) | (~off(-2 * ms, 0))
        t += np.where(near_tl | near_tl2, 1, 0)
        t -= (~off(0, ms)).astype(float)
        t -= (~off(ms, 0)).astype(float)
        g = gx * (xs - mx) / hw + gy * (ys - my) / hh
        t += np.floor(g + 0.5 + (c.bayer[ys, xs] - 0.5) * 0.5)
        if contour:
            cont = np.zeros(len(ys), bool)
            for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                y2 = np.clip(ys + dy, 0, c.H - 1); x2 = np.clip(xs + dx, 0, c.W - 1)
                cont |= (~m[y2, x2]) & (c.fill[y2, x2] == 1)
            t = np.where(cont, np.minimum(t, 0), t)
        if fold is not None:
            p, w = fold
            t += np.where(((xs / self.s + np.floor(ys / self.s * p)) % w) == 0, -1, 0)
        if self.texture and mat.texture != "none" and mat.texture_strength > 0:
            t += texture_steps(mat.texture, mat.texture_strength, xs, ys, ms, self.noise[ys, xs])
        if len(r) != 5:                                  # the recipe's step budget is written for five steps
            t = np.round(t * (len(r) - 1) / 4)
        idx = np.clip(t, 0, len(r) - 1).astype(int)
        c.col[ys, xs] = r[idx]
        c.fill[ys, xs] = 1
        c.pid[ys, xs] = sid
        return len(ys)

    def flat(self, m: Mask, colour: np.ndarray) -> None:
        self.c.col[m] = colour
        self.c.fill[m] = 1
        self.c.pid[m] = self.shape_count
        self.shape_count += 1

    def dot(self, x: float, y: float, colour: np.ndarray) -> None:
        s = max(1, int(round(self.s)))
        y0, x0 = int(math.floor((y + self.oy) * self.s)), int(math.floor(x * self.s))
        if 0 <= x0 < self.c.W and 0 <= y0 < self.c.H:
            self.c.col[y0:y0 + s, x0:x0 + s] = colour
            self.c.fill[y0:y0 + s, x0:x0 + s] = 1

    def contact_shade(self) -> None:
        """A 1 px darker band where one painted shape sits under another (an option of the enhanced look)."""
        c = self.c
        m = c.fill == 1
        ys, xs = np.nonzero(m)
        above = np.clip(ys - max(1, int(round(self.s))), 0, c.H - 1)
        diff = (c.pid[above, xs] != c.pid[ys, xs]) & (c.fill[above, xs] == 1)
        c.col[ys[diff], xs[diff]] *= 0.6


def texture_steps(kind: str, k: float, xs, ys, ms: int, n) -> np.ndarray:
    """A per-material pattern that nudges the step by one, dithered by noise: never on its own on contours."""
    xs = xs // ms; ys = ys // ms
    if kind == "weave":
        return np.where(((xs + ys) % 2 == 0) & (n < k), -1, 0)
    if kind == "fur":
        pat = ((xs + ys // 2) % 3 == 0) & (n < k)
        return np.where(pat, np.where(n < k / 2, 1, -1), 0)
    if kind == "scratch":
        return np.where(((xs * 3 + ys) % 7 == 0) & (n < k), 1, 0) + np.where(n > 1 - k * 0.3, -1, 0)
    if kind == "grain":
        return np.where(n < k * 0.5, -1, np.where(n > 1 - k * 0.3, 1, 0))
    return np.zeros(len(xs), int)


# ---------------------------------------------------------------------------------------------- the solid path
def sd_ellipsoid(P, c, r):
    q = (P - c) / r
    k0 = np.linalg.norm(q, axis=1)
    k1 = np.linalg.norm(q / r, axis=1)
    with np.errstate(divide="ignore", invalid="ignore"):
        d = np.where(k1 == 0, -min(r), k0 * (k0 - 1) / k1)
    return d


def sd_capsule(P, a, b, ra, rb):
    ab = b - a
    pa = P - a
    h = np.clip((pa @ ab) / max(float(ab @ ab), 1e-9), 0, 1)
    return np.linalg.norm(pa - ab[None, :] * h[:, None], axis=1) - (ra + (rb - ra) * h)


def sd_box(P, c, half, rnd=0.0):
    q = np.abs(P - c) - (half - rnd)
    return np.linalg.norm(np.maximum(q, 0), axis=1) + np.minimum(np.max(q, axis=1), 0) - rnd


def sd_ring(P, cx, cz, rx, rz):
    """Elliptical cross-section distance from an axis-aligned tube with radii ``rx``/``rz`` (per point)."""
    return (np.hypot((P[:, 0] - cx) / rx, (P[:, 2] - cz) / rz) - 1) * np.minimum(rx, rz)


def _lin(spec, y, y0):
    """``[r0, k]``: radius r0 at y0 growing k per unit down; a number: constant."""
    if isinstance(spec, (int, float)):
        return np.full_like(y, float(spec))
    return spec[0] + (y - y0) * spec[1]


class Prim:
    """One signed-distance shape with its material rules, bump and bone."""

    def __init__(self, spec: dict, index: int, axis: tuple[float, float]):
        self.spec = spec
        self.index = index
        self.name = spec.get("name", f"shape{index}")
        self.kind = spec["kind"]
        self.axis = axis
        self.carve = bool(spec.get("carve", False))
        self.bone = spec.get("bone")
        self.part = spec.get("part")
        self.material = spec.get("material", "cloth")
        self.sub = [Prim(s, index, axis) for s in spec.get("of", [])] if self.kind == "union" else []
        self.bbox = self._bbox()
        if spec.get("rotate"):                        # a turned shape: the box of its turned corners
            lo, hi = self.bbox
            corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
            about = np.array(spec["rotate"].get("about", spec.get("centre", spec.get("a", [axis[0], 0, axis[1]]))), float)
            R = rotation(spec["rotate"])
            turned = (corners - about) @ R.T + about
            self.bbox = np.array([turned.min(0), turned.max(0)])

    # ---- geometry
    def _bbox(self) -> np.ndarray:
        s = self.spec
        k = self.kind
        if k == "ellipsoid":
            c, r = np.array(s["centre"], float), np.array(s["radii"], float)
            return np.array([c - r, c + r])
        if k == "capsule":
            a, b = np.array(s["a"], float), np.array(s["b"], float)
            r = max(_radii(s))
            return np.array([np.minimum(a, b) - r, np.maximum(a, b) + r])
        if k == "box":
            c, h = np.array(s["centre"], float), np.array(s["half"], float)
            return np.array([c - h, c + h])
        if k == "prism":
            c, r = np.array(s["centre"], float), np.array(s["radii"], float)
            z0, z1 = s["z"]
            return np.array([[c[0] - r[0], c[1] - r[1], z0], [c[0] + r[0], c[1] + r[1], z1]])
        if k == "ring":
            y0, y1 = s["y"]
            depth = float(s.get("hem", {}).get("depth", 0))
            ys = np.array([y0, y1 + depth])
            rx = np.max(np.abs(_lin(s["rx"], ys, y0))) + 1
            rz = np.max(np.abs(_lin(s.get("rz", s["rx"]), ys, y0))) + 1
            cx, cz = self.axis
            cz = float(s.get("cz", cz))
            return np.array([[cx - rx, y0 - 1, cz - rz], [cx + rx, y1 + depth + 1, cz + rz]])
        if k == "union":
            bs = np.array([p.bbox for p in self.sub])
            return np.array([bs[:, 0].min(0), bs[:, 1].max(0)])
        raise ValueError(f"unknown solid shape kind {k!r}")

    def angle(self, P):
        cx, cz = self.axis
        return np.arctan2(P[:, 0] - cx, P[:, 2] - float(self.spec.get("cz", cz)))

    def _local(self, P: np.ndarray) -> np.ndarray:
        rot = self.spec.get("rotate")
        if not rot:
            return P
        about = np.array(rot.get("about", self.spec.get("centre", self.spec.get("a", [self.axis[0], 0, self.axis[1]]))), float)
        R = rotation(rot)
        return (P - about) @ R + about           # R is orthonormal: @ R is the inverse rotation of the points

    def sd(self, P: np.ndarray) -> np.ndarray:
        P = self._local(P)
        d = self._sd(P)
        clip = self.spec.get("clip_y")
        if clip and self.kind != "ring":
            y0, y1 = clip
            parts = [d]
            if y0 is not None:
                parts.append(y0 - P[:, 1])
            if y1 is not None:
                parts.append(P[:, 1] - (self.hem_y(self.angle(P)) if self.spec.get("hem") else y1))
            d = np.maximum.reduce(parts)
        return d

    def _sd(self, P: np.ndarray) -> np.ndarray:
        s = self.spec
        k = self.kind
        if k == "ellipsoid":
            return sd_ellipsoid(P, np.array(s["centre"], float), np.array(s["radii"], float))
        if k == "capsule":
            ra, rb = _radii(s)
            return sd_capsule(P, np.array(s["a"], float), np.array(s["b"], float), ra, rb)
        if k == "box":
            return sd_box(P, np.array(s["centre"], float), np.array(s["half"], float), float(s.get("round", 0)))
        if k == "prism":
            c, r = np.array(s["centre"], float), np.array(s["radii"], float)
            z0, z1 = s["z"]
            e = (np.hypot((P[:, 0] - c[0]) / r[0], (P[:, 1] - c[1]) / r[1]) - 1) * min(r)
            return np.maximum.reduce([e, z0 - P[:, 2], P[:, 2] - z1])
        if k == "ring":
            return self._sd_ring(P)
        if k == "union":
            return np.minimum.reduce([p.sd(P) for p in self.sub])
        raise ValueError(k)

    def _ring_radii(self, y):
        s = self.spec
        y0 = s["y"][0]
        return _lin(s["rx"], y, y0), _lin(s.get("rz", s["rx"]), y, y0)

    def hem_y(self, a):
        s = self.spec
        y1 = s["y"][1] if self.kind == "ring" else s.get("clip_y", [None, None])[1]
        hem = s.get("hem")
        if not hem:
            return np.full_like(np.asarray(a, float), float(y1))
        return y1 + float(hem.get("depth", 4)) * tat(a, int(hem.get("tongues", 12)), float(hem.get("seed", 1)))

    def _sd_ring(self, P):
        s = self.spec
        cx, cz = self.axis
        cz = float(s.get("cz", cz))
        rx, rz = self._ring_radii(P[:, 1])
        rx = np.maximum(rx, 0.3); rz = np.maximum(rz, 0.3)
        a = self.angle(P)
        outer = sd_ring(P, cx, cz, rx, rz)
        parts = [outer, s["y"][0] - P[:, 1], P[:, 1] - self.hem_y(a)]
        th = float(s.get("thickness", 0))
        if th > 0:
            parts.append(-sd_ring(P, cx, cz, np.maximum(rx - th, 0.2), np.maximum(rz - th, 0.2)))
        op = s.get("open")
        if op:                                           # a wedge cut out of the front below a height
            r = np.hypot(P[:, 0] - cx, P[:, 2] - cz)
            below = float(op.get("below", s["y"][0]))
            parts.append(np.where(P[:, 1] > below, (float(op.get("angle", 0.36)) - np.abs(a)) * r, -9.0))
        keep = s.get("keep")
        if keep:                                         # keep only the back (|a| > angle) or the front
            r = np.hypot(P[:, 0] - cx, P[:, 2] - cz)
            if "back" in keep:
                parts.append((float(keep["back"]) - np.abs(a)) * r)
            if "front" in keep:
                parts.append((np.abs(a) - float(keep["front"])) * r)
        d = np.maximum.reduce(parts)
        holes = s.get("holes")
        if holes:
            band = float(holes.get("band", 16)); p = float(holes.get("p", 0.07)); seed = float(holes.get("seed", 0))
            hm = self.hem_y(a)
            h = (P[:, 1] > hm - band) & (hash2(np.floor(a * 24) + seed, np.floor(P[:, 1] / 2)) < p)
            d = np.where(h, 1.0, d)
        return d

    def nsd(self, P: np.ndarray) -> np.ndarray:
        """The distance used for normals: for shells and rings the plain outer tube, so the inner face and the cuts
        take the outer surface's normal (the fix for the net of holes on thin cloth)."""
        P = self._local(P)
        if self.kind == "ring":
            s = self.spec
            cx, cz = self.axis
            rx, rz = self._ring_radii(P[:, 1])
            return sd_ring(P, cx, float(s.get("cz", cz)), np.maximum(rx, 0.3), np.maximum(rz, 0.3))
        if self.kind == "union":
            d = np.stack([p.sd(P) for p in self.sub])
            return d.min(0)
        return self.sd(P)

    def normals(self, P: np.ndarray, e: float = 0.5) -> np.ndarray:
        n = np.empty_like(P)
        for k in range(3):
            d = np.zeros(3); d[k] = e
            n[:, k] = self.nsd(P + d) - self.nsd(P - d)
        n /= np.linalg.norm(n, axis=1)[:, None] + 1e-9
        bump = self.spec.get("bump")
        if bump:
            n = apply_bump(bump, P, n, self.angle(P))
            n /= np.linalg.norm(n, axis=1)[:, None] + 1e-9
        return n


def rotation(rot: dict) -> np.ndarray:
    """A rotation matrix from degrees about x, then y, then z (file axes: x right, y down, z toward the viewer)."""
    R = np.eye(3)
    for axis, key in ((0, "x"), (1, "y"), (2, "z")):
        a = math.radians(float(rot.get(key, 0.0)))
        if a == 0:
            continue
        c, s_ = math.cos(a), math.sin(a)
        M = np.eye(3)
        i, j = [(1, 2), (2, 0), (0, 1)][axis]
        M[i, i] = c; M[i, j] = -s_; M[j, i] = s_; M[j, j] = c
        R = M @ R
    return R


def _radii(s: dict) -> tuple[float, float]:
    r = s.get("r", s.get("radius", 1.0))
    if isinstance(r, (int, float)):
        return float(r), float(r)
    return float(r[0]), float(r[1])


def apply_bump(bump: dict, P, n, a):
    n = n.copy()
    if "folds" in bump:
        amp, k, seed = (list(bump["folds"]) + [0.4, 8, 0.0])[:3]
        t = np.sin(a * k + seed) * amp * (0.6 + 0.4 * np.sin(P[:, 1] * 0.05 + seed))
        n[:, 0] += np.cos(a) * t; n[:, 2] -= np.sin(a) * t
    if bump.get("fur"):
        s = (hash2(np.floor(a * 26), 3) - 0.5) * 0.9 + (hash2(np.floor(a * 60), np.floor(P[:, 1] / 3)) - 0.5) * 0.5
        n[:, 0] += np.cos(a) * s; n[:, 2] -= np.sin(a) * s; n[:, 1] += 0.15
    if "ridges" in bump:                                   # straight-down ridges, every so many units of x
        amp, period = (list(bump["ridges"]) + [0.3, 3])[:2]
        n[:, 0] += np.sin(P[:, 0] / period * 2 * math.pi) * amp
    return n


# ---- material rules: a rule is a dict of conditions plus what to set when they all hold
def rule_mask(rule: dict, P: np.ndarray, prim: Prim) -> np.ndarray:
    m = np.ones(len(P), bool)
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    a = None
    for key, val in rule.items():
        if key in ("material", "t", "emit", "rivet", "flat", "lift", "spec_t"):
            continue
        if key in ("x", "y", "z"):
            v = {"x": x, "y": y, "z": z}[key]
            lo, hi = val
            if lo is not None:
                m &= v >= lo
            if hi is not None:
                m &= v < hi
        elif key in ("dx", "dy", "dz"):
            c = np.array(prim.spec.get("centre", prim.spec.get("a", [0, 0, 0])), float)
            v = {"dx": x - c[0], "dy": y - c[1], "dz": z - c[2]}[key]
            lo, hi = val
            if lo is not None:
                m &= v >= lo
            if hi is not None:
                m &= v < hi
        elif key == "angle":
            a = prim.angle(P) if a is None else a
            lo, hi = val
            m &= (a >= lo) & (a < hi)
        elif key == "abs_angle":
            a = prim.angle(P) if a is None else a
            lo, hi = val
            m &= (np.abs(a) >= lo) & (np.abs(a) < hi)
        elif key == "back":                              # within val radians of straight back
            a = prim.angle(P) if a is None else a
            m &= np.abs(np.abs(a) - math.pi) < val
        elif key == "front":
            a = prim.angle(P) if a is None else a
            m &= np.abs(a) < val
        elif key == "every_y":
            period, which = (list(val) + [0])[:2]
            m &= np.floor(y).astype(int) % int(period) == int(which)
        elif key == "every_x":
            period, which = (list(val) + [0])[:2]
            m &= np.floor(x).astype(int) % int(period) == int(which)
        elif key == "every_z":
            period, which = (list(val) + [0])[:2]
            m &= np.floor(z).astype(int) % int(period) == int(which)
        elif key == "every_angle":                       # alternate tongues around the axis: floor(a*n) % 2 == which
            a = prim.angle(P) if a is None else a
            n, which = (list(val) + [0])[:2]
            m &= np.floor(a * n).astype(int) % 2 == int(which)
        elif key == "near":                              # [[x, y, z], r]: within a box of half-size r of a point (None = any)
            pts, r = val
            if pts and not isinstance(pts[0], (list, tuple)):
                pts = [pts]
            hit = np.zeros(len(P), bool)
            for pt in pts:
                h = np.ones(len(P), bool)
                for k, v in enumerate(pt):
                    if v is not None:
                        h &= np.abs(P[:, k] - v) < r
                hit |= h
            m &= hit
        elif key == "hem_band":                          # [d0, d1] units above the hem (rings)
            a = prim.angle(P) if a is None else a
            hm = prim.hem_y(a)
            d0, d1 = val
            m &= (y > hm - d1) & (y < hm - d0)
        elif key == "hash":                              # a scattered fraction of the voxels: [p, seed, cell]; cell = the speck size in units
            p, seed, cell = (list(val) + [0, 1 / 3])[:3] if isinstance(val, (list, tuple)) else (val, 0, 1 / 3)
            cell = max(float(cell), 1e-3)
            m &= hash2(np.floor(x / cell) + seed, np.floor(y / cell) + np.floor(z / cell) * 7.0) < p
        elif key == "crack":                             # a wiggly vertical line: {"x": x0, "amp": a, "k": k, "w": w}
            x0 = val["x"]; amp = val.get("amp", 0.7); kk = val.get("k", 1.5); w = val.get("w", 0.7)
            m &= np.abs(x - (x0 + np.sin(y * kk) * amp)) < w
        elif key == "bitmap":                            # rows of 0/1 placed by angle (or x) and y
            rows = val["rows"]; y0 = float(val["y"]); by = val.get("by", "angle"); sc = float(val.get("scale", 1.0))
            if by == "angle":
                a = prim.angle(P) if a is None else a
                u = np.round((math.pi - np.abs(a)) * np.sign(a) * float(val.get("spread", 14))).astype(int) + len(rows[0]) // 2
            else:
                u = np.floor((x - float(val["x"])) / sc).astype(int) + len(rows[0]) // 2
            v = np.floor((y - y0) / sc).astype(int)
            ok = (v >= 0) & (v < len(rows)) & (u >= 0) & (u < len(rows[0]))
            grid = np.array([[ch == "1" for ch in row] for row in rows])
            hit = np.zeros(len(P), bool)
            hit[ok] = grid[v[ok], u[ok]]
            m &= hit
        elif key == "ellipse_xy":                        # inside an ellipse in the x/y plane: {"centre": [x, y], "radii": [rx, ry]}
            c = val["centre"]; r = val["radii"]
            m &= ((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2 < 1
        elif key == "where_cut":                         # on the edge of an open front: |a| within the trim of the opening
            a = prim.angle(P) if a is None else a
            op = prim.spec.get("open", {})
            m &= (y > float(op.get("below", 0))) & (np.abs(a) < float(op.get("angle", 0.36)) + float(val))
        else:
            raise ValueError(f"unknown rule condition {key!r}")
    return m


@dataclass
class Motion:
    """How one shape moves in a frame: a rigid transform (p' = R p + t), and for a loose part a second, late
    transform plus a drag vector that the hem follows more than the top (``y0``..``y1`` is the shape's span)."""
    R: np.ndarray
    t: np.ndarray
    R_lag: np.ndarray | None = None
    t_lag: np.ndarray | None = None
    drag: np.ndarray | None = None
    y0: float = 0.0
    y1: float = 1.0

    def apply(self, P: np.ndarray, N: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        Q = P @ self.R.T + self.t
        Nn = N @ self.R.T
        if self.R_lag is not None:
            w = np.clip((P[:, 1] - self.y0) / max(self.y1 - self.y0, 1e-6), 0, 1)[:, None]
            Q2 = P @ self.R_lag.T + self.t_lag
            if self.drag is not None:
                Q2 = Q2 + np.asarray(self.drag, float)[None, :]
            Q = Q * (1 - w) + Q2 * w
            Nn = Nn * (1 - w) + (N @ self.R_lag.T) * w
            Nn /= np.linalg.norm(Nn, axis=1)[:, None] + 1e-9
        return Q, Nn

    def point(self, p: np.ndarray) -> np.ndarray:
        q = self.R @ p + self.t
        if self.R_lag is not None:
            w = float(np.clip((p[1] - self.y0) / max(self.y1 - self.y0, 1e-6), 0, 1))
            q2 = self.R_lag @ p + self.t_lag + (np.asarray(self.drag, float) if self.drag is not None else 0)
            q = q * (1 - w) + q2 * w
        return q


@dataclass
class Shell:
    """The surface voxels of a model: positions in file units, normals, and per-voxel material data."""
    pos: np.ndarray
    nrm: np.ndarray
    mat: np.ndarray
    tone: np.ndarray
    emit: np.ndarray
    rivet: np.ndarray
    flat: np.ndarray            # index into ``flats`` or -1
    lift: np.ndarray
    spec_t: np.ndarray
    prim: np.ndarray
    flats: list[np.ndarray] = field(default_factory=list)


class Model:
    """A solid shape sprite voxelised once at a scale, ready to render from any direction and pose."""

    def __init__(self, doc: dict, scale: float = 1.0, steps: int | None = None, materials: dict[str, Material] | None = None,
                 width: float | None = None):
        """``width`` (file units) widens the canvas beyond the file's ``size`` for clips that reach past it (a death
        that lies down); the body axis stays at the canvas centre and the ground line where the file put it."""
        self.doc = doc
        self.scale = float(scale)
        self.M = materials or build_materials(doc, steps)
        self.mat_names = list(self.M)
        self.axis = tuple(doc.get("axis", [doc["size"][0] / 2, 0.0]))
        self.ground = float(doc.get("ground", doc["size"][1] - 1))
        self.prims = [Prim(s, i, self.axis) for i, s in enumerate(doc["shapes"])]
        self.set_width(width)
        self.H = int(round(doc["size"][1] * self.scale))
        self.shell = self._voxelise()
        n = max(m.steps for m in self.M.values())
        self.table = np.zeros((len(self.M), n, 3)); self.lengths = np.zeros(len(self.M), int)
        self.spec = np.zeros(len(self.M), bool); self.emissive = np.zeros(len(self.M), bool)
        for i, m in enumerate(self.M.values()):
            self.table[i, :m.steps] = m.ramp; self.lengths[i] = m.steps; self.spec[i] = m.spec; self.emissive[i] = m.emissive
        self.stats = {"shapes": len(self.prims), "voxels": int(len(self.shell.pos)), "size": [self.W, self.H], "scale": self.scale}

    def set_width(self, width: float | None) -> None:
        """Change the canvas width (file units, never below the file's own); the voxels are untouched."""
        self.width = float(max(self.doc["size"][0], width or 0))
        self.W = int(round(self.width * self.scale))

    # ---- voxelise once
    @staticmethod
    def group_key(p: Prim) -> tuple:
        """The rigid body a shape belongs to: its part (which may lag), else its bone, else the static model. Shapes
        of one body are voxelised together (a hand and its fingers share one surface); different bodies keep their
        own surface even where they overlap in the author pose, so a leg inside a skirt still has its voxels when
        the clip swings it out."""
        if p.part:
            return ("part", p.part)
        if p.bone:
            return ("bone", p.bone)
        return ("static",)

    def _voxelise(self) -> Shell:
        s = self.scale
        groups: dict[tuple, list[Prim]] = {}
        carves = [p for p in self.prims if p.carve]
        for p in self.prims:
            if not p.carve:
                groups.setdefault(self.group_key(p), []).append(p)
        P_parts, prim_parts = [], []
        for prims in groups.values():
            lo = np.min([p.bbox[0] for p in prims], axis=0) - 1
            hi = np.max([p.bbox[1] for p in prims], axis=0) + 1
            g0 = np.floor(lo * s).astype(int); g1 = np.ceil(hi * s).astype(int)
            own = np.full(tuple(g1 - g0), -1, np.int16)
            for p in sorted(prims + carves, key=lambda q: q.index):        # file order: a carve empties what came before it
                b0 = np.maximum(np.floor(p.bbox[0] * s).astype(int), g0); b1 = np.minimum(np.ceil(p.bbox[1] * s).astype(int), g1)
                if np.any(b1 <= b0):
                    continue
                gx, gy, gz = np.mgrid[b0[0]:b1[0], b0[1]:b1[1], b0[2]:b1[2]]
                P = (np.stack([gx.ravel(), gy.ravel(), gz.ravel()], 1) + 0.5) / s
                inside = p.sd(P) <= 0
                sl = (slice(b0[0] - g0[0], b1[0] - g0[0]), slice(b0[1] - g0[1], b1[1] - g0[1]), slice(b0[2] - g0[2], b1[2] - g0[2]))
                view = own[sl]
                view[inside.reshape(view.shape)] = -1 if p.carve else p.index
            filled = own >= 0
            pad = np.pad(filled, 2, constant_values=False)
            surf = np.zeros_like(filled)
            for ax in range(3):
                for d in (1, 2, -1, -2):
                    sh = np.roll(pad, -d, axis=ax)[2:-2, 2:-2, 2:-2]
                    surf |= ~sh
            surf &= filled
            ix, iy, iz = np.nonzero(surf)
            P_parts.append((np.stack([ix + g0[0], iy + g0[1], iz + g0[2]], 1) + 0.5) / s)
            prim_parts.append(own[ix, iy, iz].astype(np.int32))
        P = np.concatenate(P_parts) if P_parts else np.zeros((0, 3))
        prim_of = np.concatenate(prim_parts) if prim_parts else np.zeros(0, np.int32)
        n = len(P)
        nrm = np.zeros((n, 3)); mat = np.zeros(n, np.int32); tone = np.zeros(n, np.int8); emit = np.zeros(n, np.int8)
        rivet = np.zeros(n, bool); flat = np.full(n, -1, np.int32); lift = np.zeros(n); spec_t = np.full(n, 0.88)
        flats: list[np.ndarray] = []
        for p in self.prims:
            sel = np.nonzero(prim_of == p.index)[0]
            if len(sel) == 0:
                continue
            Pp = P[sel]
            nrm[sel] = p.normals(Pp)
            base = p.spec.get("material", "cloth")
            mat[sel] = self._mat_index(base, p)
            tone[sel] = int(p.spec.get("t", 0))
            emit[sel] = EMIT_CODES[str(p.spec.get("emit", "none"))]
            lift[sel] = float(p.spec.get("lift", self.M[base].lift))
            spec_t[sel] = float(p.spec.get("spec_t", self.M[base].spec_t))
            if p.spec.get("flat"):
                flats.append(hexrgb(p.spec["flat"])); flat[sel] = len(flats) - 1
            for rule in p.spec.get("rules", []):
                hit = rule_mask(rule, Pp, p)
                if not hit.any():
                    continue
                idx = sel[hit]
                if "material" in rule:
                    mat[idx] = self._mat_index(rule["material"], p)
                if "t" in rule:
                    tone[idx] = int(rule["t"])
                if "emit" in rule:
                    emit[idx] = EMIT_CODES[str(rule["emit"])]
                if rule.get("rivet"):
                    rivet[idx] = True
                if "flat" in rule:
                    flats.append(hexrgb(rule["flat"])); flat[idx] = len(flats) - 1
                if "lift" in rule:
                    lift[idx] = float(rule["lift"])
                if "spec_t" in rule:
                    spec_t[idx] = float(rule["spec_t"])
        return Shell(P, nrm, mat, tone, emit, rivet, flat, lift, spec_t, prim_of, flats)

    def _mat_index(self, name: str, prim: Prim) -> int:
        if name not in self.M:
            raise ValueError(f"shape {prim.name!r} uses unknown material {name!r}")
        return self.mat_names.index(name)

    # ---- one frame
    def render(self, frame: int = 0, phi: float = 0.0, elevation: float = 0.0, transforms: dict | None = None, *,
               outline: np.ndarray | None = None, lights: list | None = None, effects: list | None = None, shadow: dict | None = None,
               anchors: dict | None = None, contour: float = 2.2, passes: bool = False, shade: bool = True) -> "Frame":
        """Render the model facing ``phi`` radians (0 = toward the viewer, +pi/2 = toward the viewer's right) seen from
        ``elevation`` degrees above. ``transforms`` maps a shape index to a (3x3 rotation, 3 translation) pair in
        file units (what the rig makes from a clip's joints). ``anchors`` are named 3D points in file units (after
        posing) that lights and effects refer to."""
        sh = self.shell
        s = self.scale
        W, H = self.W, self.H
        cv = Canvas(W, H, s)
        P = sh.pos.copy(); N = sh.nrm.copy()
        if transforms:
            for pi, mo in transforms.items():
                sel = sh.prim == pi
                if not sel.any():
                    continue
                if not isinstance(mo, Motion):
                    mo = Motion(np.asarray(mo[0], float), np.asarray(mo[1], float))
                P[sel], N[sel] = mo.apply(P[sel], N[sel])
        cx, cz = self.axis
        cs, sn = math.cos(phi), math.sin(phi)
        xr = (P[:, 0] - cx) * cs + (P[:, 2] - cz) * sn
        zr = -(P[:, 0] - cx) * sn + (P[:, 2] - cz) * cs
        nx = N[:, 0] * cs + N[:, 2] * sn; nz = -N[:, 0] * sn + N[:, 2] * cs; ny = N[:, 1]
        e = math.radians(elevation)
        ce, se = math.cos(e), math.sin(e)
        gy = self.ground
        sx = W / 2 + xr * s
        sy = (gy + (P[:, 1] - gy) * ce + zr * se) * s
        depth = (zr * ce - (P[:, 1] - gy) * se) * s
        nvx, nvy, nvz = nx, ny * ce + nz * se, nz * ce - ny * se
        px = np.floor(sx).astype(int); py = np.floor(sy).astype(int)
        ok = (px >= 1) & (px < W - 1) & (py >= 1) & (py < H - 1)
        facing = nvz
        # pass 1: voxels facing the camera; pass 2: inner faces, only where nothing landed
        vid = np.full((H, W), -1, np.int64); zb = np.full((H, W), -1e9); inner = np.zeros((H, W), bool)
        for pas in (0, 1):
            cand = np.nonzero(ok & ((facing >= -0.15) if pas == 0 else (facing < -0.15)))[0]
            if len(cand) == 0:
                continue
            k = py[cand] * W + px[cand]
            order = np.lexsort((depth[cand], k))
            k_sorted = k[order]
            last = np.ones(len(order), bool); last[:-1] = k_sorted[1:] != k_sorted[:-1]
            win = cand[order[last]]
            kk = k_sorted[last]
            yy, xx = kk // W, kk % W
            if pas == 1:
                free = vid[yy, xx] < 0
                win, yy, xx = win[free], yy[free], xx[free]
                inner[yy, xx] = True
            vid[yy, xx] = win; zb[yy, xx] = depth[win]
            if pas == 0:
                self._close_cracks(vid, zb, s)
        m = vid >= 0
        ys, xs = np.nonzero(m)
        v = vid[ys, xs]
        inn = inner[ys, xs]
        nnx, nny, nnz = nvx[v], nvy[v], nvz[v]
        nnx = np.where(inn, -nnx, nnx); nny = np.where(inn, -nny, nny); nnz = np.where(inn, -nnz, nnz)
        cv.normal[ys, xs, 0] = nnx; cv.normal[ys, xs, 1] = nny; cv.normal[ys, xs, 2] = nnz
        cv.depth[ys, xs] = zb[ys, xs]
        cv.pid[ys, xs] = sh.prim[v]
        cv.fill[ys, xs] = 1
        mat = sh.mat[v]
        n = self.lengths[mat]
        spec = self.spec[mat]
        amb = np.where(spec, 0.2, 0.16)
        diff = np.clip(nnx * LIGHT[0] + nny * LIGHT[1] + nnz * LIGHT[2], 0, None)
        val = amb + (1 - amb) * diff + sh.lift[v]
        idx_spec = np.where(diff > sh.spec_t[v], n - 1, np.clip(np.floor(val * (n - 1)), 0, n - 2))
        idx_mat = np.clip(np.floor(val * n), 0, n - 1)
        idx = np.where(spec, idx_spec, idx_mat).astype(int)
        if not shade:
            idx = n // 2
        idx = np.clip(idx + sh.tone[v] - inn.astype(int), 0, n - 1)
        # contours: the neighbour belongs to another shape well behind this one
        thr = contour * s
        pidf = cv.pid

        def behind(dy, dx):
            y2 = np.clip(ys + dy, 0, H - 1); x2 = np.clip(xs + dx, 0, W - 1)
            return (vid[y2, x2] >= 0) & (zb[y2, x2] < zb[ys, xs] - thr) & (pidf[y2, x2] != pidf[ys, xs])

        idx = np.where(behind(0, 1) | behind(1, 0), 0, np.where(behind(0, -1) | behind(-1, 0), np.minimum(idx, 1), idx))
        colour = self.table[mat, idx]
        # emissive voxels: the ramp step is a rule of the frame, not of the light
        em = sh.emit[v]
        if em.any():
            pu = pulse(frame, 0.3)
            emat = mat
            tbl = self.table; ln = self.lengths[emat]
            top = ln - 1
            flick = np.where(((ys * W + xs) + frame // 3) % 5 == 0, top, np.where(pu > 0.5, top - 1, top - 2))
            puls = np.where(pu > 0.3, top, top - 1)
            steady = np.where(nnz > 0.6, top, np.where(nnz > 0.2, top - 1, top - 2))
            soft = np.clip(np.floor((0.3 + 0.7 * np.clip(nnz, 0, 1)) * ln), 0, top)
            estep = np.select([em == 1, em == 2, em == 3, em == 4], [flick, puls, steady, soft], idx)
            estep = np.clip(estep, 0, top).astype(int)
            e_sel = em > 0
            colour = np.where(e_sel[:, None], tbl[emat, estep], colour)
            cv.fill[ys[e_sel], xs[e_sel]] = 3
        fl = sh.flat[v]
        if (fl >= 0).any() and sh.flats:
            flat_cols = np.array(sh.flats)
            colour = np.where((fl >= 0)[:, None], flat_cols[np.clip(fl, 0, len(sh.flats) - 1)], colour)
        riv = sh.rivet[v]
        if riv.any():
            colour = np.where(riv[:, None], self.table[mat, n - 1], colour)
        cv.col[ys, xs] = colour
        if riv.any():                                   # a shadow pixel under each rivet
            ry, rx = ys[riv], xs[riv]
            by = np.clip(ry + max(1, int(round(s))), 0, H - 1)
            okk = (cv.fill[by, rx] == 1) & ~np.isin(by * W + rx, ry * W + rx)
            cv.col[by[okk], rx[okk]] = self.table[sh.mat[vid[by[okk], rx[okk]]], 0]
        if outline is not None:
            cv.outline(outline)
        # projected anchors for lights, effects and the shadow (a 3D "at" of an effect projects the same way)
        proj = {}
        for name, pt in (anchors or {}).items():
            proj[name] = self.project(pt, phi, elevation)
        effects = [dict(ef) for ef in (effects or [])]
        for i, ef in enumerate(effects):
            if "anchor" not in ef and len(ef.get("at", [])) == 3:
                at = list(ef["at"]); off = list(ef.get("offset", [0, 0, 0])) + [0.0] * 3
                proj[f"_effect{i}"] = self.project((at[0] + off[0], at[1] + off[1], at[2] + off[2]), phi, elevation)
                ef["anchor"] = f"_effect{i}"; ef.pop("offset", None)
        for li in lights or []:
            if li.get("from") == "flicker":                 # glowing cracks: a small light every few emissive pixels
                ey, ex = np.nonzero((cv.fill == 3))
                codes = sh.emit[vid[ey, ex]]
                keep = (codes == 1) & (((ey * W + ex) % int(li.get("every", 3))) == 0)
                tint = hexrgb(li.get("colour", "#7dff78"))
                for yy_, xx_ in zip(ey[keep], ex[keep]):
                    cv.light_point(xx_ + 0.5, yy_ + 0.5, zb[yy_, xx_] + s, float(li.get("radius", 3.2)) * s, float(li.get("strength", 0.7)), tint)
                continue
            at = self._screen_at(li, proj, phi, elevation)
            if at is None:
                continue
            x, y, z = at
            x, y = math.floor(x) + 0.5, math.floor(y) + 0.5           # a light sits on a pixel centre, so its tint field never slides under a pixel
            # the pulse moves in four steps, not every frame: a glow that breathes like a hand-animated one instead of crawling
            strength = float(li.get("strength", 1.0)) + float(li.get("pulse", 0.0)) * round(pulse(frame, 0.3) * 3) / 3
            tint = hexrgb(li.get("colour", "#7dff78"))
            cv.light_point(x, y, z, float(li.get("radius", 20)) * s, strength, tint, rim=bool(li.get("rim", False)))
        for ef in effects or []:
            stamp_effect(cv, ef, frame, proj, self, s)
        shadow_mask = None; shadow_colour = None
        if shadow:
            at = self._screen_at(shadow, proj, phi, elevation)
            if at is None:
                at = self.project((cx, gy, cz), phi, elevation)
            x, y, _ = at
            rx, ry = shadow.get("radii", [W / 4 / s, 5])
            shadow_mask = cv.shadow(x, y, rx * s, ry * s)
            shadow_colour = hexrgb(shadow.get("colour", "#4b4a4f"))
        rgba = cv.compose(shadow_mask, shadow_colour)
        fr = Frame(rgba, proj, {"filled": int(m.sum())})
        if passes:
            fr.normal = cv.normal_pass()
            fr.depth = cv.depth_pass(zb[m].max() if m.any() else 1, zb[m].min() if m.any() else 0)
        return fr

    def _close_cracks(self, vid: np.ndarray, zb: np.ndarray, s: float) -> None:
        """Close the one-pixel cracks a voxel shell leaves when it is seen at a slant: a pixel that is empty, or far
        behind both its left and right (or upper and lower) neighbours when those belong to one shape at one depth,
        takes the nearer neighbour's voxel. Without this the head shows through a hat and the crack pattern re-rolls
        with every sub-pixel move, which reads as shimmer. Wider holes (a torn hem, an open front) are untouched."""
        prim = self.shell.prim
        for axis in (1, 0):
            if axis == 1:
                a, b, c = vid[:, :-2], vid[:, 2:], vid[:, 1:-1]
                za, zb_, zc = zb[:, :-2], zb[:, 2:], zb[:, 1:-1]
            else:
                a, b, c = vid[:-2, :], vid[2:, :], vid[1:-1, :]
                za, zb_, zc = zb[:-2, :], zb[2:, :], zb[1:-1, :]
            both = (a >= 0) & (b >= 0)
            same = both & (prim[np.where(both, a, 0)] == prim[np.where(both, b, 0)]) & (np.abs(za - zb_) < 2.0 * s)
            near = np.maximum(za, zb_)
            hole = same & ((c < 0) | (zc < near - 1.5 * s))
            if hole.any():
                pick = np.where(za >= zb_, a, b)
                c[hole] = pick[hole]
                zc[hole] = ((za + zb_) / 2)[hole]

    def project(self, pt, phi: float, elevation: float) -> tuple[float, float, float]:
        """A file-space point -> (screen x, screen y, depth) at this direction and elevation (canvas pixels)."""
        cx, cz = self.axis
        s = self.scale
        x, y, z = float(pt[0]), float(pt[1]), float(pt[2])
        cs, sn = math.cos(phi), math.sin(phi)
        xr = (x - cx) * cs + (z - cz) * sn; zr = -(x - cx) * sn + (z - cz) * cs
        e = math.radians(elevation)
        gy = self.ground
        return (self.W / 2 + xr * s, (gy + (y - gy) * math.cos(e) + zr * math.sin(e)) * s, (zr * math.cos(e) - (y - gy) * math.sin(e)) * s)

    def _screen_at(self, spec: dict, proj: dict, phi: float, elevation: float):
        """Where a light, effect or shadow sits on the canvas: a rig anchor by name (already projected, with an
        ``offset`` in file units on screen) or a fixed ``at`` point in file units (with a 3D ``offset``)."""
        s = self.scale
        if "anchor" in spec and spec["anchor"] in proj:
            x, y, z = proj[spec["anchor"]]
            off = list(spec.get("offset", [0, 0])) + [0, 0]
            return (x + off[0] * s, y + off[1] * s, z)
        if "at" in spec:
            at = list(spec["at"]) + [0.0] * 3
            off = list(spec.get("offset", [0, 0, 0])) + [0.0] * 3
            return self.project((at[0] + off[0], at[1] + off[1], at[2] + off[2]), phi, elevation)
        return None


@dataclass
class Frame:
    rgba: np.ndarray
    anchors: dict
    stats: dict
    normal: np.ndarray | None = None
    depth: np.ndarray | None = None


# ---------------------------------------------------------------------------------------------- effects
def stamp_effect(cv: Canvas, ef: dict, frame: int, proj: dict, model=None, s: float = 1.0, oy: float = 0.0,
                 materials: dict[str, Material] | None = None, breathe_px: int = 0) -> None:
    """Emissive sprites drawn last: flame, orb, pixels, runes, motes. Positions in file units (flat) or
    anchors (solid) are turned into canvas pixels here."""
    M = materials or (model.M if model is not None else {})
    mat = M[ef.get("material", "soul")]
    ramp = mat.ramp
    top = len(ramp) - 1
    step = lambda i: ramp[max(0, min(top, i if i >= 0 else top + 1 + i))]
    kind = ef.get("kind", "pixels")
    b = breathe_px if ef.get("breathe") else 0
    if "anchor" in ef and ef["anchor"] in proj:
        ax, ay, _ = proj[ef["anchor"]]
        off = list(ef.get("offset", [0, 0])) + [0, 0]
        ox, oy_ = ax / s + off[0], ay / s + off[1]
    else:
        at = ef.get("at", [0, 0])
        ox, oy_ = float(at[0]), float(at[1]) + oy + b
    if kind == "pixels":
        pts = ef.get("points", [])
        steps = ef.get("steps")
        pu = pulse(frame, float(ef.get("speed", 0.35)))
        for k, pt in enumerate(pts):
            if "pulse" in ef:
                si = steps[0] if pu > float(ef["pulse"]) else steps[1]
            else:
                si = pt[2] if len(pt) > 2 else int(ef.get("step", -1))
            cv.emit((ox + pt[0]) * s, (oy_ + pt[1]) * s, step(int(si)))
    elif kind == "flame":
        height = float(ef.get("height", 7)); width = int(ef.get("width", 3)); fall = float(ef.get("fall", 2.0))
        flick = float(ef.get("flicker", 1.4)); sway_from = int(ef.get("sway_from", 4))
        for dx in range(-width, width + 1):
            h = max(0, int(round(height - abs(dx) * fall + math.sin(frame * 1.3 + dx * 2.1) * flick + math.sin(frame * 0.7 - dx))))
            for k in range(h):
                rel = k / max(1, h); core = abs(dx) <= 1 and rel < 0.5
                xsw = round(math.sin(frame * 0.9 + k)) if k > sway_from else 0
                c = step(-1) if core else step(-2) if rel < 0.6 else step(-3) if rel < 0.85 else step(-4)
                cv.emit((ox + dx + xsw) * s, (oy_ - k) * s, c)
    elif kind == "orb":
        r = float(ef.get("radius", 1)) + (frame // int(ef.get("period", 3))) % 2 * float(ef.get("grow", 1))
        reach = int(math.ceil(r + 1))
        for dy in range(-reach, reach + 1):
            for dx in range(-reach, reach + 1):
                d = math.hypot(dx, dy)
                if d > r + 0.3:
                    continue
                cv.emit((ox + dx) * s, (oy_ + dy) * s, step(-1) if d < 0.5 else step(-2) if d < 1.3 else step(-3))
    elif kind == "runes":
        x0, x1 = ef.get("x", [44, 50]); y0 = float(ef.get("y", 48)); count = int(ef.get("count", 13)); dy = float(ef.get("dy", 3))
        spread = float(ef.get("spread", 0.08)); period = int(ef.get("period", 5)); lit_n = int(ef.get("lit", 2)); speed = int(ef.get("speed", 2))
        ref = float(ef.get("ref", y0 - 4))
        for k in range(count):
            y = y0 + k * dy
            xl = round(x0 - (y - ref) * spread); xr = round(x1 + (y - ref) * spread)
            lit = (k + frame // speed) % period
            if lit < lit_n:
                c = step(-2) if lit == 0 else step(-3)
                cv.emit((xl - 1) * s, (y + oy + b) * s, c); cv.emit((xr + 1) * s, (y + 1 + oy + b) * s, c)
    elif kind == "motes":
        for mx, my, age, life in motes_at(ef, frame):
            cv.emit((ox + mx) * s, (oy_ + my) * s, step(min(top, max(1, top - int(age / life * top)))))


def motes_at(ef: dict, frame: int) -> list[tuple[float, float, int, float]]:
    """Deterministic soul motes: the emitter is replayed from frame 0 with a fixed seed, so a frame always looks the
    same (the page used Math.random; a sprite sheet must not)."""
    rng = np.random.default_rng(int(ef.get("seed", 7)))
    rate = float(ef.get("rate", 0.7)); spread = float(ef.get("spread", 2)); vy = ef.get("vy", [-0.8, -1.6]); life = ef.get("life", [6, 12])
    every = int(ef.get("every", 1))
    motes = []
    for f in range(frame + 1):
        if f % every == 0 and rng.random() < rate:
            motes.append([rng.uniform(-spread, spread), 0.0, rng.uniform(min(vy), max(vy)), rng.uniform(0, 6), 0, rng.uniform(min(life), max(life))])
        for m in motes:
            m[4] += 1; m[1] += m[2]; m[0] += math.sin(m[4] * 0.6 + m[3]) * 0.5
        motes = [m for m in motes if m[4] < m[5]]
    return [(m[0], m[1], m[4], m[5]) for m in motes]


# ---------------------------------------------------------------------------------------------- flat frames
def _pt(p, f: int):
    if isinstance(p, dict):
        raise ValueError("hem entries are expanded before this point")
    if len(p) >= 3 and p[2] is not None:
        amp = p[3] if len(p) > 3 else 1
        return (float(p[0]), float(p[1]) + wave(f, float(p[2]), amp))
    return (float(p[0]), float(p[1]))


def expand_points(points: list, f: int) -> list[tuple[float, float]]:
    out = []
    for p in points:
        if isinstance(p, dict) and "hem" in p:
            xa, xb, y, seed, deep = (list(p["hem"]) + [4])[:5]
            n = max(1, round(abs(xb - xa) / 3))
            for k in range(n + 1):
                x = xa + (xb - xa) * k / n
                d = deep + ((k * 7 + seed) % 3) if k % 2 else 0
                out.append((x + (wave(f, k + seed) if k % 2 else 0), y + d + (wave(f + 3, k * 3 + seed) if k % 2 else 0)))
        else:
            out.append(_pt(p, f))
    return out


def _offset(spec, f: int, b: int) -> tuple[float, float]:
    def one(v):
        if v is None:
            return 0.0
        if isinstance(v, dict):
            if "wave" in v:
                i, amp = (list(v["wave"]) + [1])[:2]
                return float(wave(f, i, amp))
            return 0.0
        return float(v)
    dx, dy = one(spec.get("dx")), one(spec.get("dy"))
    if spec.get("breathe"):
        dy += b
    return dx, dy


def render_flat(doc: dict, frame: int = 0, *, scale: float = 1.0, steps: int | None = None, outline="auto",
                materials: dict[str, Material] | None = None, texture: bool = False, contact: bool = False,
                transforms: dict | None = None, mirror: bool = False) -> Frame:
    """One frame of a flat (2D) shape sprite. ``transforms`` maps a part name to (angle, dx, dy, pivot) from the rig;
    ``mirror`` flips the figure about its centre (the cheap back or far-side view)."""
    M = materials or build_materials(doc, steps)
    W0, H0 = doc["size"]
    cv = Canvas(int(round(W0 * scale)), int(round(H0 * scale)), scale)
    oy = float(doc.get("origin_y", 0))
    pt = Painter(cv, M, oy=oy, texture=texture, ao=contact)
    anim = doc.get("animation", {})
    b = breath(frame, int(anim.get("breathe", {}).get("period", 10)), int(anim.get("breathe", {}).get("amount", 1)))
    parts = doc.get("parts", {})
    xc = W0 / 2

    def place(points, spec):
        dx, dy = _offset(spec, frame, b)
        pts = [(x + dx, y + dy) for x, y in points]
        part = spec.get("part")
        if transforms and part in transforms:
            ang, tx, ty, piv = transforms[part]
            ca, sa = math.cos(ang), math.sin(ang)
            pts = [(piv[0] + (x - piv[0]) * ca - (y - piv[1]) * sa + tx, piv[1] + (x - piv[0]) * sa + (y - piv[1]) * ca + ty) for x, y in pts]
        if mirror:
            pts = [(2 * xc - x, y) for x, y in pts]
        return pts

    for spec in doc["shapes"]:
        kind = spec.get("kind", "poly")
        if "views" in spec and doc.get("_view") not in spec["views"]:
            continue
        if kind == "poly":
            pts = place(expand_points(spec["points"], frame), spec)
            mask = pt.poly(pts)
        elif kind == "ellipse":
            (cx, cy), = place([tuple(spec["centre"])], spec)
            rx, ry = spec["radii"]
            mask = pt.ell(cx, cy, rx, ry)
        elif kind in ("dot", "dots"):
            at = [spec["at"]] if kind == "dot" else spec["at"]
            pts = place([(p[0], p[1]) for p in at], spec)
            mat = M[spec.get("material", "bone")]
            for p, (x, y) in zip(at, pts):
                si = p[2] if len(p) > 2 else spec.get("step", 0)
                col = hexrgb(spec["colour"]) if "colour" in spec else mat.ramp[max(0, min(len(mat.ramp) - 1, int(si) if si >= 0 else len(mat.ramp) + int(si)))]
                pt.dot(x, y, col)
            continue
        else:
            raise ValueError(f"unknown flat shape kind {kind!r}")
        if "flat" in spec:
            pt.flat(mask, hexrgb(spec["flat"]))
            continue
        fold = spec.get("fold")
        pt.paint(mask, spec.get("material", "cloth"), base=int(spec.get("base", 2)), gx=float(spec.get("gx", -0.9)), gy=float(spec.get("gy", -0.6)),
                 fold=tuple(fold) if fold else None, contour=bool(spec.get("contour", True)))
    if contact:
        pt.contact_shade()
    oc = outline_colour(doc, outline)
    if oc is not None:
        cv.outline(oc)
    for ef in doc.get("effects", []):
        if mirror and "at" in ef:
            ef = {**ef, "at": [2 * xc - ef["at"][0], ef["at"][1]]}
        stamp_effect(cv, ef, frame, {}, None, scale, oy, M, b)
    for li in doc.get("lights", []):
        at = li.get("at", [xc, H0 / 2])
        x = (2 * xc - at[0]) if mirror else at[0]
        y = at[1] + oy + (b if li.get("breathe") else 0)
        strength = float(li.get("strength", 0.75)) + float(li.get("pulse", 0.0)) * pulse(frame)
        cv.light_flat(x * scale, y * scale, float(li.get("radius", 20)) * scale, strength, hexrgb(li.get("colour", "#6fe86a")), rim=bool(li.get("rim", False)))
    shadow_mask = shadow_colour = None
    sh = doc.get("shadow")
    if sh:
        at = sh.get("at", [xc, doc.get("ground", H0 - 1)])
        rx, ry = sh.get("radii", [W0 / 3, 4])
        shadow_mask = cv.shadow(at[0] * scale, (at[1] + oy) * scale, rx * scale, ry * scale)
        shadow_colour = hexrgb(sh.get("colour", "#3c3b40"))
    return Frame(cv.compose(shadow_mask, shadow_colour), {}, {"shapes": pt.shape_count, "filled": int((cv.fill == 1).sum())})


def outline_colour(doc: dict, outline) -> np.ndarray | None:
    """The outline rule: None/"none" = no outline, "auto" = the file's outline colour (near-black), "#rrggbb"."""
    if outline is None or outline in ("none", ""):
        return None
    if outline == "auto":
        return hexrgb(doc.get("outline", DEFAULT_OUTLINE))
    return hexrgb(outline)


# ---------------------------------------------------------------------------------------------- the format
def load_shapes(path: str | Path) -> dict:
    doc = json.loads(Path(path).read_text())
    doc.setdefault("_file", str(path))
    return doc


def mode_of(doc: dict) -> str:
    if doc.get("mode") in ("flat", "solid"):
        return doc["mode"]
    kinds = {s.get("kind", "poly") for s in doc.get("shapes", [])}
    return "solid" if kinds & set(SOLID_KINDS) else "flat"


def validate(doc: dict, library: dict | None = None) -> list[str]:
    """The reasons a file is not a valid shape sprite (empty when it is)."""
    bad = []
    if not isinstance(doc, dict):
        return ["the file is not a JSON object"]
    size = doc.get("size")
    if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, (int, float)) and v >= 8 for v in size)):
        bad.append("size must be [width, height] of at least 8 units")
    if not isinstance(doc.get("shapes"), list) or not doc.get("shapes"):
        bad.append("shapes must be a non-empty list")
        return bad
    try:
        M = build_materials(doc, None, library)
    except Exception as e:
        return bad + [f"materials: {e}"]
    mode = mode_of(doc)
    kinds = FLAT_KINDS if mode == "flat" else SOLID_KINDS
    def check(s, tag):
        kind = s.get("kind", "poly")
        if kind not in kinds:
            bad.append(f"{tag}: kind {kind!r} is not a {mode} kind {kinds}")
            return
        mat = s.get("material", "cloth" if mode == "solid" else None)
        if "flat" not in s and kind not in ("dot", "dots") and mat not in M:
            bad.append(f"{tag}: unknown material {mat!r}")
        if kind == "poly" and (not isinstance(s.get("points"), list) or len([p for p in s["points"] if not isinstance(p, dict)]) + 3 * len([p for p in s["points"] if isinstance(p, dict)]) < 3):
            bad.append(f"{tag}: a poly needs at least three points")
        if kind == "ellipse" and not (len(s.get("centre", [])) == 2 and len(s.get("radii", [])) == 2):
            bad.append(f"{tag}: an ellipse needs centre [x, y] and radii [rx, ry]")
        if kind == "ellipsoid" and not (len(s.get("centre", [])) == 3 and len(s.get("radii", [])) == 3):
            bad.append(f"{tag}: an ellipsoid needs centre [x, y, z] and radii [rx, ry, rz]")
        if kind == "capsule" and not (len(s.get("a", [])) == 3 and len(s.get("b", [])) == 3):
            bad.append(f"{tag}: a capsule needs a [x, y, z], b [x, y, z] and r")
        if kind == "box" and not (len(s.get("centre", [])) == 3 and len(s.get("half", [])) == 3):
            bad.append(f"{tag}: a box needs centre [x, y, z] and half [hx, hy, hz]")
        if kind == "ring" and not (len(s.get("y", [])) == 2 and "rx" in s):
            bad.append(f"{tag}: a ring needs y [top, bottom] and rx (a number or [r0, growth per unit])")
        if kind == "prism" and not (len(s.get("centre", [])) == 2 and len(s.get("radii", [])) == 2 and len(s.get("z", [])) == 2):
            bad.append(f"{tag}: a prism needs centre [x, y], radii [rx, ry] and z [z0, z1]")
        if kind == "union":
            if not isinstance(s.get("of"), list) or not s["of"]:
                bad.append(f"{tag}: a union needs 'of': a list of shapes")
            else:
                for k, sub in enumerate(s["of"]):
                    if not isinstance(sub, dict):
                        bad.append(f"{tag}: of[{k}] must be a shape object")
                    else:
                        check(sub, f"{tag} of[{k}] ({sub.get('name', sub.get('kind', '?'))})")
        for r in s.get("rules", []):
            if "material" in r and r["material"] not in M:
                bad.append(f"{tag}: rule uses unknown material {r['material']!r}")
            if "emit" in r and r["emit"] not in EMIT_CODES:
                bad.append(f"{tag}: rule emit {r['emit']!r} not in {list(EMIT_CODES)}")
        if "hang" in s and not (isinstance(s["hang"], (int, float)) and 0 <= s["hang"] <= 1):
            bad.append(f"{tag}: hang must be a number from 0 (hangs straight) to 1 (rigid with the bone)")

    for i, s in enumerate(doc["shapes"]):
        if not isinstance(s, dict):
            bad.append(f"shape {i} must be an object")
            continue
        check(s, f"shape {i} ({s.get('name', s.get('kind', '?'))})")
    for name, part in (doc.get("parts") or {}).items():
        if not isinstance(part, dict):
            bad.append(f"part {name!r} must be an object")
        elif "hang" in part and not (isinstance(part["hang"], (int, float)) and 0 <= part["hang"] <= 1):
            bad.append(f"part {name!r}: hang must be a number from 0 (hangs straight) to 1 (rigid with the bone)")
    for i, ef in enumerate(doc.get("effects", [])):
        if ef.get("material", "soul") not in M:
            bad.append(f"effect {i}: unknown material {ef.get('material')!r}")
        if ef.get("kind", "pixels") not in ("pixels", "flame", "orb", "runes", "motes"):
            bad.append(f"effect {i}: unknown kind {ef.get('kind')!r}")
    if mode == "solid" and "ground" not in doc:
        bad.append("a solid file needs 'ground' (the y of the ground line in its units)")
    return bad


def file_summary(doc: dict) -> dict:
    mats = sorted({s.get("material", "cloth") for s in doc.get("shapes", []) if "material" in s or mode_of(doc) == "solid"})
    return {"name": doc.get("name", Path(doc.get("_file", "sprite")).stem.split(".")[0]), "mode": mode_of(doc), "size": doc.get("size"),
            "height": doc.get("height", (doc.get("size") or [0, 0])[1]), "shapes": len(doc.get("shapes", [])), "materials": mats,
            "parts": sorted((doc.get("parts") or {}).keys()), "bones": sorted({s["bone"] for s in doc.get("shapes", []) if s.get("bone")}),
            "effects": [e.get("kind", "pixels") for e in doc.get("effects", [])], "lights": len(doc.get("lights", []))}


def preset_scale(doc: dict, figure_height: int | None) -> float:
    """The render scale that puts the file's figure at the preset's height."""
    native = float(doc.get("height", doc["size"][1]))
    return 1.0 if not figure_height else float(figure_height) / native


def render_still(doc: dict, frame: int = 0, *, scale: float = 1.0, steps: int | None = None, outline="auto", phi: float = 0.0,
                 elevation: float | None = None, texture: bool = False, passes: bool = False, model: Model | None = None) -> Frame:
    """One frame of a file without a rig: the flat path with its own animation rules, or the solid model turned to
    ``phi`` with its effects, lights and shadow at their authored places."""
    if mode_of(doc) == "flat":
        return render_flat(doc, frame, scale=scale, steps=steps, outline=outline, texture=texture)
    model = model or Model(doc, scale, steps)
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if elevation is None else float(elevation)
    return model.render(frame, phi, elev, None, outline=outline_colour(doc, outline), lights=doc.get("lights"), effects=doc.get("effects"),
                        shadow=doc.get("shadow"), passes=passes)
