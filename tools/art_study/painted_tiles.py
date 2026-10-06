"""Painted ground tiles and plants: the first pieces made to docs/PAINTED_STANDARD.md (Derek 2026-10-06).

Everything is drawn on the art grid (1 cell = 4 screen px; the sheet is shown x4): broad flat tones from short ramps,
pigment pooled dark at wet edges, surfaces laid in long dry-brush strokes (noise stretched along one axis), highlights
as a loaded brush dragged across, a soft paper tooth under it all, a light dither only where tones meet.
Light comes from the upper left, as in the game.

  python tools/art_study/painted_tiles.py OUT.png
"""
import sys
import numpy as np
from PIL import Image

RNG = np.random.default_rng(7)
_P = RNG.random((512, 512))
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32


def vn(x, y):
    """value noise, smooth, on float arrays"""
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 512, b % 512]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


def strokes(x, y, ang, along, across, seed=0.0):
    """dry-brush: noise stretched along the angle"""
    c, s = np.cos(ang), np.sin(ang)
    a = x * c + y * s
    b = -x * s + y * c
    return vn(a * along + seed, b * across + seed * 1.7)


def tone(v, ramp, d, dith=0.07):
    """value -> one of the ramp's colours, the dither only nudging where tones meet"""
    v = np.clip(v + (d - 0.5) * dith * 2, 0, 0.999)
    idx = (v * len(ramp)).astype(int)
    return np.array(ramp, dtype=float)[idx]


def bayer(h, w):
    yy, xx = np.mgrid[0:h, 0:w]
    return B4[yy % 4, xx % 4]


def hexc(s):
    s = s.lstrip("#")
    return [int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)]


# ------------------------------------------------------------------ ground: a patch of iso ground in one material
def iso_mask(h, w):
    """an iso diamond patch (2:1), soft-edged by noise so the patch looks painted out, not cut"""
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    q = np.abs((xx - w / 2) / (w / 2)) + np.abs((yy - h / 2) / (h / 2))
    edge = 0.92 + (fbm(xx * 0.08, yy * 0.08) - 0.5) * 0.18
    return q, edge


def ground(kind, w=96, h=48, ox=0.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    X, Y = xx + ox, yy * 2.0                     # world-ish coordinates (iso y doubled), so strokes lie flat
    d = bayer(h, w)
    tooth = vn(X * 0.21 + 71, Y * 0.21) * 0.6 + vn(X * 0.6, Y * 0.6) * 0.4   # paper tooth
    if kind == "grass":
        ramp = [hexc(c) for c in ("#141a10", "#232c17", "#34401f", "#4d5a2a", "#76803f")]
        st = strokes(X, Y, -0.5, 0.06, 0.55)                 # blades leaning with the wind
        st2 = strokes(X, Y, -0.45, 0.1, 0.9, 13)
        patch = fbm(X * 0.04, Y * 0.04)
        v = 0.25 + (patch - 0.5) * 0.5 + (st - 0.5) * 0.35 + (tooth - 0.5) * 0.06
        v += (strokes(X, Y, -0.5, 0.05, 0.35, 31) > 0.72) * 0.3 * (patch > 0.45)   # light dragged across
        v -= (st2 < 0.22) * 0.18                                                # dark pooled between tufts
    elif kind == "mud":
        ramp = [hexc(c) for c in ("#120e0c", "#241b15", "#3a2b20", "#54412f", "#7c8a92")]
        st = strokes(X, Y, 0.15, 0.03, 0.4)
        wet = fbm(X * 0.05 + 4, Y * 0.05)
        v = 0.42 + (st - 0.5) * 0.35 + (tooth - 0.5) * 0.08
        v += (strokes(X, Y, 0.15, 0.02, 1.2, 17) > 0.8) * -0.2                # cart ruts, dark
        pud = wet > 0.56                                                        # puddles: dark wash, pooled rim, sky dragged in
        rim = (wet > 0.53) & (wet <= 0.56)
        sky = strokes(X, Y, 0.05, 0.04, 0.7, 5)
        v = np.where(pud, 0.18 + (sky > 0.62) * 0.35 + (sky > 0.8) * 0.3, v)
        v = np.where(rim, 0.04, v)
    elif kind == "snow":
        ramp = [hexc(c) for c in ("#3a4458", "#5f6d86", "#8d9bb2", "#c3cddb", "#eef2f6")]
        st = strokes(X, Y, 0.25, 0.025, 0.3)                 # wind-scoured
        drift = fbm(X * 0.03, Y * 0.03)
        v = 0.6 + (drift - 0.5) * 0.45 + (st - 0.5) * 0.3 + (tooth - 0.5) * 0.05
        v -= (strokes(X, Y, 0.25, 0.05, 0.8, 9) < 0.2) * 0.25                     # blue shadow in the furrows
        sp = (vn(X * 0.9, Y * 0.9) > 0.93) & (drift > 0.5)
        v = np.where(sp, 0.99, v)                                                # a few glints of ice
    elif kind == "flags":
        ramp = [hexc(c) for c in ("#17141a", "#2b2730", "#423c44", "#5e5659", "#857a73")]
        # flagstones: nearest of jittered points (voronoi) gives each stone its own flat tone
        pts = []
        for gy in range(-1, h * 2 // 14 + 2):
            for gx in range(-1, w // 18 + 2):
                pts.append((gx * 18 + RNG.random() * 12, gy * 14 + RNG.random() * 10, RNG.random()))
        P = np.array(pts)
        dd = np.stack([np.hypot(X - p[0], Y - p[1]) for p in P])
        o = np.argsort(dd, axis=0)
        d1 = np.take_along_axis(dd, o[:1], 0)[0]
        d2 = np.take_along_axis(dd, o[1:2], 0)[0]
        own = P[o[0], 2]
        gap = d2 - d1
        # lit along the upper-left edge of each stone, pooled dark along the lower-right
        nx = X - P[o[0], 0]
        ny = Y - P[o[0], 1]
        side = (nx + ny) / (np.hypot(nx, ny) + 1e-3)
        v = 0.45 + (own - 0.5) * 0.25 + (strokes(X, Y, 0.6, 0.05, 0.4, 3) - 0.5) * 0.2 + (tooth - 0.5) * 0.06
        v += np.where(gap < 4.5, np.where(side < -0.3, 0.2, -0.18), 0.0)
        v = np.where(gap < 1.8, 0.02, v)                                         # the joint
        moss = (gap < 3.5) & (fbm(X * 0.1 + 20, Y * 0.1) > 0.6)
        col = tone(v, ramp, d)
        col = np.where(moss[..., None], tone(0.3 + strokes(X, Y, -0.5, 0.2, 0.9) * 0.5, [hexc("#1c2412"), hexc("#2e3a1a"), hexc("#46532a")], d), col)
        return col, d
    elif kind == "ash":
        ramp = [hexc(c) for c in ("#18171a", "#2c2a2c", "#454144", "#67615e", "#948b82")]
        st = strokes(X, Y, -0.2, 0.04, 0.5)
        v = 0.45 + (fbm(X * 0.05, Y * 0.05) - 0.5) * 0.4 + (st - 0.5) * 0.3 + (tooth - 0.5) * 0.08
        ember = (vn(X * 0.5 + 3, Y * 0.5) > 0.9) & (fbm(X * 0.04, Y * 0.04) > 0.55)
        col = tone(v, ramp, d)
        col = np.where(ember[..., None], np.array(hexc("#c8642a")), col)
        bone = (strokes(X, Y, 1.1, 0.25, 1.4, 50) > 0.85) & (fbm(X * 0.07 + 8, Y * 0.07) > 0.62)
        col = np.where(bone[..., None], np.array(hexc("#b9ad98")), col)          # splinters of old bone in it
        return col, d
    return tone(v, ramp, d), d


def patch_img(kind, w=96, h=48):
    col, d = ground(kind, w, h)
    q, edge = iso_mask(h, w)
    a = np.clip((edge - q) / 0.08, 0, 1)
    a = (a > d * 0.9).astype(float)                       # painted out at the edge in whole cells
    rgba = np.dstack([col, a])
    return rgba


# ------------------------------------------------------------------ plants: painted with strokes on the grid
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.c = np.zeros((h, w, 4))

    def px(self, x, y, col, a=1.0):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            self.c[y, x, :3] = col
            self.c[y, x, 3] = a

    def stroke(self, pts, w0, w1, ramp, lit_side=-1):
        """a tapered brush stroke along points; the lit side (left) one tone up, the far side one down"""
        pts = np.array(pts, float)
        seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
        L = seg[-1]
        n = max(2, int(L * 2))
        for i in range(n + 1):
            f = i / n
            x = np.interp(f * L, seg, pts[:, 0])
            y = np.interp(f * L, seg, pts[:, 1])
            w = w0 + (w1 - w0) * f
            # direction for the stroke's sides
            f2 = min(1, f + 1 / n)
            x2 = np.interp(f2 * L, seg, pts[:, 0])
            y2 = np.interp(f2 * L, seg, pts[:, 1])
            dx, dy = x2 - x, y2 - y
            ln = np.hypot(dx, dy) + 1e-6
            nx, ny = -dy / ln, dx / ln
            for k in np.arange(-w / 2, w / 2 + 0.01, 0.5):
                t = (k / max(w / 2, 0.5))
                li = 1 if t * lit_side * nx > 0.3 or (t * nx < -0.3) else 0
                ti = int(np.clip(1 + li - (1 if t * nx > 0.4 else 0) + (1 if f > 0.75 else 0) - (1 if f < 0.12 else 0), 0, len(ramp) - 1))
                self.px(x + nx * k, y + ny * k, ramp[ti])

    def img(self):
        return self.c


def tuft(seed):
    r = np.random.default_rng(seed)
    cv = Canvas(36, 34)
    ramp = [hexc(c) for c in ("#10160c", "#2a3619", "#435426", "#6b7b36", "#a5a85a")]
    for i in range(14):
        bx = 18 + r.normal(0, 3.5)
        lean = r.normal(0.7, 0.6)
        hgt = r.uniform(14, 30)
        pts = [(bx, 33), (bx + lean * 3, 33 - hgt * 0.5), (bx + lean * 8 + r.normal(0, 1.5), 33 - hgt)]
        cv.stroke(pts, 3.0, 0.5, ramp)
    for x in range(9, 28):                                  # pigment pooled dark at the root
        cv.px(x, 33, ramp[0])
        cv.px(x, 32, ramp[0] if r.random() < 0.6 else ramp[1])
    return cv.img()


def fern(seed):
    r = np.random.default_rng(seed)
    cv = Canvas(52, 36)
    ramp = [hexc(c) for c in ("#0d1510", "#20341f", "#34532e", "#557a40", "#8fae62")]
    base = np.array([26, 35.0])
    for i in range(7):
        ang = -np.pi / 2 + (i - 3) * 0.38 + r.normal(0, 0.08)
        L = r.uniform(20, 27)
        # the frond rises, then arches over and droops at its tip
        spine = [base + np.array([np.cos(ang) * L * f * 1.1, np.sin(ang) * L * f + (f ** 2.2) * L * 0.75]) for f in np.linspace(0, 1, 14)]
        for j in range(2, 13):                              # leaflets, longest mid-frond, drawn before the spine
            f = j / 13
            p = spine[j]
            ln = 5.5 * np.sin(np.pi * min(1, f * 1.15))
            dv = spine[j + 1] - spine[j]
            tang = np.arctan2(dv[1], dv[0])
            for sgn in (-1, 1):
                a2 = tang + sgn * 1.1
                q = p + np.array([np.cos(a2) * ln, np.sin(a2) * ln + 1.5])
                cv.stroke([p, (p + q) / 2 + np.array([0, -0.6]), q], 1.9, 0.6, ramp, lit_side=sgn)
        cv.stroke(spine, 1.2, 0.6, [ramp[0], ramp[1], ramp[1], ramp[2], ramp[2]])
    return cv.img()


def thorn(seed):
    r = np.random.default_rng(seed)
    cv = Canvas(44, 42)
    ramp = [hexc(c) for c in ("#0c0a0b", "#221b1c", "#3a2e2d", "#5a4842", "#8a7262")]
    def branch(p, ang, L, w, depth):
        q = (p[0] + np.cos(ang) * L, p[1] + np.sin(ang) * L)
        mid = ((p[0] + q[0]) / 2 + r.normal(0, 1), (p[1] + q[1]) / 2 + r.normal(0, 1))
        cv.stroke([p, mid, q], w, max(0.5, w * 0.5), ramp)
        for k in range(2):                                  # thorns
            f = r.uniform(0.3, 0.9)
            tp = (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f)
            ta = ang + r.choice([-1, 1]) * 1.1
            cv.px(tp[0] + np.cos(ta) * 1.4, tp[1] + np.sin(ta) * 1.4, ramp[3])
        if depth > 0:
            for k in range(2):
                branch(q, ang + r.normal(0, 0.55), L * 0.68, w * 0.7, depth - 1)
    for a in (-2.1, -1.7, -1.35, -0.95):
        branch((22, 41), a + r.normal(0, 0.08), 12, 3.0, 2)
    for x in range(15, 30):
        cv.px(x, 41, ramp[0])
    return cv.img()


def caps(seed):
    """a cluster of pale grave-caps, each cap a painted dome: lit top-left, pooled dark under the gill line"""
    r = np.random.default_rng(seed)
    cv = Canvas(34, 26)
    ramp = [hexc(c) for c in ("#2a2422", "#5a4c44", "#9b8a78", "#cdbfa8", "#efe6d2")]
    stem = [hexc(c) for c in ("#3b3530", "#7a6e62", "#b2a690")]
    for i in range(4):
        cx = 7 + i * 6.5 + r.normal(0, 1)
        hgt = r.uniform(7, 16)
        rad = r.uniform(3.8, 6.5)
        for y in range(int(25 - hgt), 26):                 # stem
            cv.px(cx - 1, y, stem[2])
            cv.px(cx, y, stem[1])
            cv.px(cx + 1, y, stem[0])
        top = 25 - hgt
        for yy in range(-int(rad * 0.7), 1):
            for xx in range(-int(rad), int(rad) + 1):
                e = (xx / rad) ** 2 + (yy / (rad * 0.7)) ** 2
                if e <= 1:
                    v = 0.55 - xx / rad * 0.25 - yy / rad * 0.2 + (vn(np.array([xx * 0.5 + i * 7.0]), np.array([yy * 0.5]))[0] - 0.5) * 0.2
                    if yy == 0:
                        v = 0.05                            # the gill line, pooled dark
                    cv.px(cx + xx, top + yy, ramp[int(np.clip(v, 0, 0.99) * 5)])
    return cv.img()


def reeds(seed):
    r = np.random.default_rng(seed)
    cv = Canvas(30, 50)
    ramp = [hexc(c) for c in ("#12140c", "#272a16", "#3f4122", "#5f5d32", "#8c8550")]
    head = [hexc(c) for c in ("#1c120c", "#3a2416", "#5a3a22")]
    for i in range(7):
        bx = 15 + r.normal(0, 4)
        hgt = r.uniform(26, 47)
        lean = r.normal(0.5, 0.35)
        pts = [(bx, 49), (bx + lean * 3, 49 - hgt * 0.6), (bx + lean * 6, 49 - hgt)]
        cv.stroke(pts, 2.2, 0.6, ramp)
        if i % 2 == 0:                                      # a cattail head: lit left, dark right, a pale tip
            hx, hy = bx + lean * 4.8, 49 - hgt * 0.8
            for k in range(8):
                cv.px(hx - 1, hy + k, head[2] if k < 3 else head[1])
                cv.px(hx, hy + k, head[1])
                cv.px(hx + 1, hy + k, head[0])
            cv.px(hx, hy - 1, ramp[4])
    return cv.img()


# ------------------------------------------------------------------ the sheet
def place(sheet, img, x, y):
    h, w = img.shape[:2]
    region = sheet[y:y + h, x:x + w]
    a = img[..., 3:4]
    region[..., :3] = region[..., :3] * (1 - a) + img[..., :3] * a
    region[..., 3:4] = np.maximum(region[..., 3:4], a)


def main(out):
    W, H = 330, 210
    sheet = np.zeros((H, W, 4))
    sheet[..., :3] = hexc("#0b0a0c")
    sheet[..., 3] = 1
    kinds = ["grass", "flags", "mud", "ash", "snow"]
    for i, k in enumerate(kinds):
        place(sheet, patch_img(k), 8 + (i % 3) * 106, 6 + (i // 3) * 56)
    # plants on a strip of painted grass
    strip = ground("grass", 210, 44)
    place(sheet, np.dstack([strip[0], np.ones((44, 210))]), 116, 160)
    for img, x, y in [(reeds(5), 112, 116), (fern(2), 136, 130), (thorn(3), 184, 124), (tuft(1), 222, 132),
                      (caps(4), 252, 140), (tuft(6), 286, 134)]:
        place(sheet, img, x, y)
    im = Image.fromarray((np.clip(sheet, 0, 1) * 255).astype(np.uint8), "RGBA")
    im = im.resize((W * 4, H * 4), Image.NEAREST)
    im.save(out)
    print("saved", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "painted_tiles.png")
