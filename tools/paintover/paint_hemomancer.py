"""A paint-over pass on the Hemomancer's frames (art/sprites/hemomancer*.png), toward the painting
(docs/concepts/hemomancer/test1/sheet_original.png): form light from the upper left on every piece, inked edges,
blood that runs in drips instead of specks, the cape's pink taken to dusty crimson.

Run with PixelForge's Python (numpy, scipy, Pillow):
  tools/pixelforge/.venv/Scripts/python tools/paintover/paint_hemomancer.py --preview OUT.png   # 7 frames, before/after
  tools/pixelforge/.venv/Scripts/python tools/paintover/paint_hemomancer.py --apply              # every frame, in place
The unpainted sheets are kept in tools/paintover/unpainted/ (the first --apply copies them there; every run paints from
them, so the pass never stacks on itself). A new PixelForge export: delete that folder, then --apply again.
"""
import argparse, json, os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SPR = os.path.join(ROOT, 'art', 'sprites')
KEEP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'unpainted')
LIGHT = np.array([-0.62, -0.78])          # screen space (x, y): from the upper left
LUMW = np.array([0.299, 0.587, 0.114])


def hsv(rgb):
    r, g, b = [rgb[..., i] / 255.0 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    rc, gc, bc = (mx - r) / dd, (mx - g) / dd, (mx - b) / dd
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    return np.where(d > 1e-6, h, 0), s, mx


def from_hsv(h, s, v):
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1) * 255.0


def paint(im):
    a = np.asarray(im.convert('RGBA')).astype(np.float64)
    rgb, al = a[..., :3].copy(), a[..., 3]
    solid = al > 128
    if not solid.any():
        return im
    H, S, V = hsv(rgb)
    hd = H * 360
    # ---- the materials, by colour
    blood = solid & ((hd > 350) | (hd < 12)) & (S > 0.62) & (V > 0.28)
    cape = solid & ~blood & ((hd > 325) | (hd < 8)) & (S > 0.22) & (S <= 0.62) & (V > 0.32)
    # ---- 1. the cape: dusty crimson, not pink (the painting's cloth)
    V = np.where(cape, V * 0.8, V)
    S = np.where(cape, np.minimum(1, S * 1.15), S)
    rgb = from_hsv(H, S, V)
    # ---- 2. pieces: where the colour jumps there is an edge between two pieces (blood specks are not edges)
    dx = np.abs(np.diff(rgb, axis=1)).sum(-1)
    dy = np.abs(np.diff(rgb, axis=0)).sum(-1)
    jump = np.zeros(solid.shape, bool)
    jump[:, 1:] |= dx > 70; jump[:, :-1] |= dx > 70; jump[1:, :] |= dy > 70; jump[:-1, :] |= dy > 70
    jump &= ~blood
    inner = solid & ~jump
    lab, n = nd.label(inner)
    sizes = np.asarray(nd.sum(np.ones_like(lab), lab, range(n + 1)))
    big = (sizes[lab] >= 12) & (lab > 0)
    # ---- 3. form light: each piece rounds toward its own edges, lit from the upper left; the whole body rounds too
    light = np.zeros(solid.shape)
    for src, sig, gain, w in ((big, 1.6, 6.0, 0.55), (solid, 6.0, 14.0, 0.45)):
        m = nd.gaussian_filter(src.astype(float), sig)
        gy, gx = np.gradient(m)
        nrm = np.hypot(gx, gy) + 1e-6
        k = (-(gx * LIGHT[0] + gy * LIGHT[1]) / nrm) * np.clip(nrm * gain, 0, 1)   # outward normal . light
        light += w * k
    light = np.clip(light, -1, 1)
    # creases: inside a piece, the two pixels next to where it meets another piece sit in its shadow
    dist = nd.distance_transform_edt(solid & ~jump)
    ao = np.clip(1.0 - (dist - 1.0) / 2.5, 0, 1) * (lab > 0)
    out = rgb * (1.0 + light * 0.45 - ao * 0.22)[..., None]
    out[..., 0] += np.clip(light, 0, 1) * 10                     # warm in the light
    out[..., 2] += np.clip(-light, 0, 1) * 9                     # cool in the shade
    out[..., 1] -= np.clip(-light, 0, 1) * 3
    # ---- 4. ink: where a darker piece meets a lighter one, the darker side's edge goes to ink; the silhouette too
    lum = out @ LUMW
    ink = np.zeros(solid.shape, bool)
    for sh in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb = np.roll(lum, sh, (0, 1)); nbs = np.roll(solid, sh, (0, 1))
        ink |= solid & nbs & (lum + 34 < nb) & jump
    edge = solid & ~nd.binary_erosion(solid)
    gy, gx = np.gradient(nd.gaussian_filter(solid.astype(float), 1.0))
    side = -(gx * LIGHT[0] + gy * LIGHT[1]) / (np.hypot(gx, gy) + 1e-6)
    inkc = np.array([22.0, 12.0, 18.0])
    out = np.where((ink & ~blood)[..., None], out * 0.45 + inkc * 0.55, out)
    out = np.where((edge & (side < 0.2))[..., None], out * 0.35 + inkc * 0.65, out)
    out = np.where((edge & (side >= 0.2))[..., None], out * 1.12 + 6, out)
    # ---- 5. blood runs: each blood pixel drips two to four pixels down over what lies below it, thinning as it goes
    yy, xx = np.nonzero(blood)
    for y, x in zip(yy, xx):
        L = 2 + ((x * 7 + y * 3) % 3)
        c = out[y, x].copy()
        for k in range(1, L + 1):
            if y + k >= solid.shape[0] or not solid[y + k, x] or blood[y + k, x]:
                break
            out[y + k, x] = c * (0.88 - 0.1 * k) + out[y + k, x] * (0.1 * k)
    out = np.where(blood[..., None], out * np.array([0.92, 0.7, 0.72]), out)   # wet blood: deeper
    res = np.concatenate([np.clip(out, 0, 255), al[..., None]], -1).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')


def load():
    d = json.load(open(os.path.join(SPR, 'hemomancer.json')))
    src = []
    for s in d['sheets']:
        p = os.path.join(SPR, s)
        u = os.path.join(KEEP, s)
        src.append(Image.open(u if os.path.exists(u) else p).convert('RGBA'))
    return d, src


def frame(d, src, k):
    s, x, y, w, h, dx, dy = d['idx'][k]
    return src[s].crop((x, y, x + w, y + h))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview'); ap.add_argument('--apply', action='store_true'); ap.add_argument('--scale', type=int, default=3)
    A = ap.parse_args()
    d, src = load()
    if A.preview:
        keys = ['idle/down/0', 'idle/front/0', 'idle/side/0', 'idle/back/0', 'idle/up/0', 'atk/front/10', 'walk/side/6']
        rows = [[frame(d, src, k) for k in keys], [paint(frame(d, src, k)) for k in keys]]
        W = sum(f.width for f in rows[0]) + 10 * len(keys)
        Hh = max(f.height for f in rows[0])
        o = Image.new('RGBA', (W, Hh * 2 + 10), (40, 36, 44, 255))
        for r, fs in enumerate(rows):
            x = 0
            for f in fs:
                o.alpha_composite(f, (x, r * (Hh + 10) + Hh - f.height)); x += f.width + 10
        o.resize((o.width * A.scale, o.height * A.scale), Image.NEAREST).save(A.preview)
        print(A.preview)
    if A.apply:
        out = [im.copy() for im in src]
        for k, (s, x, y, w, h, dx, dy) in d['idx'].items():
            out[s].paste(paint(src[s].crop((x, y, x + w, y + h))), (x, y))
        for i, sname in enumerate(d['sheets']):
            p = os.path.join(SPR, sname)
            u = os.path.join(KEEP, sname)
            os.makedirs(KEEP, exist_ok=True)
            if not os.path.exists(u):
                shutil.copy(p, u)
            out[i].save(p)
        print('painted', len(d['idx']), 'frames')
