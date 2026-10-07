"""landkit: Godmarrow's land, made of reusable objects (Derek 2026-10-06: "Every rock every grass like everything").

Every object (tree, rock, grass clump, log, stump, fern...) is a GENERATOR with parameters and a seed, crafted to the
painted standard (docs/PAINTED_STANDARD.md), never a drawing pasted into a scene. Each export carries what the game's
lighting needs (see tools/art_study/LIVING_LANDSCAPES.md):
  <name>.webp          the painted object, the moon's key light painted in (one texel per world px; the game draws
                       world px at 4 screen px)
  <name>_n.webp        its normal map (r: right, g: up, b: toward the viewer), read by shaders/cm_prop_lit.gdshader
                       so the lantern rakes across it live
  <name>_h.webp        its height above its foot (for the 3D path, tests/scene3d, and depth tests)
  <name>_shadow.webp   the moon's shadow it lays on the ground (alpha)
  <name>.json          foot point (px in the sprite), collision radius (yards), footprint polygon (for the light
                       map's occluders, world/dark_layer.gd), true size, sway

This module holds what every object shares: the game's camera at true scale, the ray-cast of a local height field into
a sprite, the painted shading (hue-shifted ramps, stepped light, rims, AO, bounce), and the export.
"""
import json
import os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

KX, KY, KZ = 18.0, 9.0, 21.0                  # world px per yard: x, y (a 36x18 tile) and height (core/iso.gd)
MOON = np.array([-0.62, 0.22, 0.75])          # from the screen's upper left: world -x, a little +y (rule 11)
MOON = MOON / np.linalg.norm(MOON)
VIEW = np.array([1.0, 1.0, 2 * KY / KZ])
VIEW = VIEW / np.linalg.norm(VIEW)
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32
_P = np.random.default_rng(1).random((1024, 1024))


def hexc(s):
    s = s.lstrip("#")
    return np.array([int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y, o=3):
    a, f, s, w = 0.0, 1.0, 0.0, 0.55
    for k in range(o):
        a = a + vn(x * f + k * 9.1, y * f + k * 4.7) * w
        s += w
        f *= 2.07
        w *= 0.5
    return a / s


class Field:
    """a local height field round an object's foot (0, 0): heights in yards, a material id and tag per cell"""

    def __init__(self, half, res=0.02):
        self.res, self.half = res, half
        n = int(2 * half / res)
        i = (np.arange(n) + 0.5) * res - half
        self.X, self.Y = np.meshgrid(i, i)
        self.H = np.full(self.X.shape, -9.0)                             # -9: nothing (the ground is not drawn)
        self.M = np.zeros(self.X.shape, int)
        self.n = n

    def at(self, A, x, y, outside=-9.0):
        fi, fj = (x + self.half) / self.res, (y + self.half) / self.res
        ci = np.clip(fi.astype(int), 0, self.n - 1)
        ri = np.clip(fj.astype(int), 0, self.n - 1)
        v = A[ri, ci]
        return np.where((fi < 0) | (fj < 0) | (fi >= self.n) | (fj >= self.n), outside, v)


def cast(F, top):
    """ray-cast the field into a sprite: the screen box that holds it; per pixel the world point hit (or none).
    top: the object's greatest height (yards)."""
    h = F.half
    W = int(2 * h * KX * 2) + 4
    Hh = int(2 * h * KY * 2 + top * KZ) + 6
    SY, SX = np.mgrid[0:Hh, 0:W].astype(float)
    ox, oy = W / 2, Hh - 2 * h * KY - 3                                   # the foot (0, 0, 0) on screen
    px = np.zeros(SX.shape)
    py = np.zeros(SX.shape)
    pz = np.full(SX.shape, -9.0)
    got = np.zeros(SX.shape, bool)
    for z in np.arange(top + 0.05, -0.3, -0.01):
        u = (SX + 0.5 - ox) / KX
        v = (SY + 0.5 - oy + z * KZ) / KY
        x, y = (u + v) / 2, (v - u) / 2
        hit = ~got & (F.at(F.H, x, y) >= z)
        px[hit], py[hit], pz[hit] = x[hit], y[hit], z
        got |= hit
    return dict(px=px, py=py, pz=pz, got=got, SX=SX, SY=SY, foot=(ox, oy), W=W, H=Hh)


def normals(F, C, exag=1.4):
    Hs = nd.gaussian_filter(np.where(F.H < -5, -0.2, F.H), 1.0)
    gy, gx = np.gradient(Hs, F.res)
    nx, ny = -F.at(gx, C["px"], C["py"], 0), -F.at(gy, C["px"], C["py"], 0)
    hh = F.at(F.H, C["px"], C["py"])
    side = C["pz"] < hh - 0.03
    hz = np.hypot(nx, ny) + 1e-6
    n_top = np.dstack([nx * exag, ny * exag, np.ones_like(nx)])
    n_top /= np.linalg.norm(n_top, axis=2, keepdims=True)
    n_side = np.dstack([nx / hz, ny / hz, np.zeros_like(nx)])
    n = np.where(side[..., None], n_side, n_top)
    return n, side


def moon_shadow(F, C, n):
    """the object's own shadow on itself (marched toward the moon, from a little out along the normal)"""
    x0, y0, z0 = C["px"] + n[..., 0] * 0.03, C["py"] + n[..., 1] * 0.03, C["pz"] + n[..., 2] * 0.03
    sh = np.zeros(C["px"].shape, bool)
    for k in range(1, 60):
        s = k * 0.025
        sh |= F.at(F.H, x0 + MOON[0] * s, y0 + MOON[1] * s) > z0 + MOON[2] * s
    return sh


def ao(F, C):
    Hc = np.where(F.H < -5, 0, F.H)
    a = np.clip((nd.gaussian_filter(Hc, 6) - Hc) * 4.0, 0, 1)
    contact = np.clip(1 - C["pz"] / 0.12, 0, 1) * 0.5                       # dark where it meets the ground
    return np.clip(F.at(a, C["px"], C["py"], 0) + contact, 0, 1)


def light(n, sh, aoa, side):
    """the painted light: the moon key (stepped by the shadow), a sky fill from above, bounce from the ground onto the
    walls, contact darkening"""
    ndl = np.clip((n * MOON).sum(2), 0, 1)
    key = ndl * np.where(sh, 0.15, 1.0)
    sky = np.clip(n[..., 2], 0, 1) * 0.12
    bounce = side * 0.1 + np.clip(-n[..., 2], 0, 1) * 0.05
    return 0.2 + key * 0.72 + sky + bounce - aoa * 0.3


def paint(rp, v, mask, bay=None, dither=0.05):
    """values to a hue-shifted ramp, dithered only at the steps"""
    out = np.zeros(v.shape + (3,))
    if bay is not None:
        v = v + (bay - 0.5) * dither
    idx = np.clip((v * len(rp)).astype(int), 0, len(rp) - 1)
    out[mask] = rp[idx[mask]]
    return out


def rim(img, mask, C, k=1.35):
    """the lit edge where the object meets what is behind it, on the moon's side (the left and the top)"""
    edge = mask & (~np.roll(mask, 1, axis=1) | ~np.roll(mask, 1, axis=0))
    img[edge] = np.minimum(img[edge] * k + 0.02, 1)
    return img


def export(name, out_dir, img, mask, n, C, F, meta):
    """write the object's five files"""
    os.makedirs(out_dir, exist_ok=True)
    rgba = np.dstack([np.clip(img, 0, 1), mask.astype(float)])
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = max(ys.min() - 1, 0), ys.max() + 2, max(xs.min() - 1, 0), xs.max() + 2
    crop = lambda a: a[y0:y1, x0:x1]
    Image.fromarray((crop(rgba) * 255).astype(np.uint8), "RGBA").save(os.path.join(out_dir, name + ".webp"), lossless=True)
    nmap = np.dstack([n[..., 0] * 0.5 + 0.5, n[..., 2] * 0.5 + 0.5, n[..., 1] * 0.5 + 0.5])     # screen space, below
    # screen-space normal: right = (x - y) direction, up = -(x + y) and +z mixed by the camera; approximated per pixel
    sr = (n[..., 0] - n[..., 1]) / np.sqrt(2)
    su = n[..., 2] * 0.85 - (n[..., 0] + n[..., 1]) / np.sqrt(2) * 0.5
    sz = (n * VIEW).sum(2)
    nm = np.dstack([sr, su, sz])
    nm /= np.linalg.norm(nm, axis=2, keepdims=True) + 1e-9
    nimg = np.dstack([nm * 0.5 + 0.5, mask.astype(float)])
    Image.fromarray((crop(nimg) * 255).astype(np.uint8), "RGBA").save(os.path.join(out_dir, name + "_n.webp"), lossless=True)
    hz = np.clip(C["pz"] / max(meta.get("height", 1.0), 1e-3), 0, 1)
    Image.fromarray((crop(np.dstack([hz, hz, hz, mask.astype(float)])) * 255).astype(np.uint8), "RGBA").save(os.path.join(out_dir, name + "_h.webp"), lossless=True)
    # the moon's shadow on the ground: the field's footprint swept away from the moon by its height
    shadow = np.zeros(mask.shape)
    fx, fy = C["foot"]
    for (yy, xx) in zip(*np.nonzero(F.H > -5)):
        if (yy + xx) % 2:
            continue
        hgt = F.H[yy, xx]
        wx, wy = F.X[yy, xx], F.Y[yy, xx]
        L = hgt / MOON[2]
        gx_, gy_ = wx - MOON[0] * L, wy - MOON[1] * L
        sx, sy = (gx_ - gy_) * KX + fx, (gx_ + gy_) * KY + fy
        for t in np.linspace(0, 1, max(2, int(L * 10))):
            qx = (wx - MOON[0] * L * t - (wy - MOON[1] * L * t)) * KX + fx
            qy = (wx - MOON[0] * L * t + wy - MOON[1] * L * t) * KY + fy
            if 0 <= int(qy) < shadow.shape[0] and 0 <= int(qx) < shadow.shape[1]:
                shadow[int(qy), int(qx)] = 1
    shadow = nd.binary_closing(shadow > 0, iterations=2) * 0.55
    Image.fromarray((np.dstack([np.zeros(mask.shape + (3,)), shadow]) * 255).astype(np.uint8), "RGBA").save(os.path.join(out_dir, name + "_shadow.webp"), lossless=True)
    # the footprint: the field's outline on the ground (yards), for the light map's occluders
    fp = F.H > 0.05
    contour = []
    if fp.any():
        ang = np.arctan2(F.Y[fp], F.X[fp])
        rad = np.hypot(F.X[fp], F.Y[fp])
        for a in np.linspace(-np.pi, np.pi, 16, endpoint=False):
            sel = np.abs(((ang - a + np.pi) % (2 * np.pi)) - np.pi) < np.pi / 16
            r = float(rad[sel].max()) if sel.any() else 0.0
            contour.append([round(np.cos(a) * r, 3), round(np.sin(a) * r, 3)])
    meta = dict(meta)
    meta.update(foot=[float(fx - x0), float(fy - y0)], size=[int(x1 - x0), int(y1 - y0)], footprint=contour)
    with open(os.path.join(out_dir, name + ".json"), "w") as f:
        json.dump(meta, f, indent=1)
    return crop(rgba), crop(nimg)
