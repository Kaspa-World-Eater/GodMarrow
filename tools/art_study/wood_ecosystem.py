"""A patch of Godmarrow's old wood laid out as an ecosystem before anything is painted (STUDY.md round 13; Derek:
"you need to understand ecosystem completely to build one").

The order is the forest's own:
1. the living trees, ages mixed (giants, middle, young), and the dead standing (snags) and the cut (stumps);
2. the dead lying where they fell: a giant down a few years (decay class 1-2) with its root plate on edge, its pit and
   the bright gap it tore in the canopy; an old nurse log (class 4) with a row of seedlings along its back; older logs
   (class 3, class 5 only a mossy hump); the pits and mounds of trees that fell centuries ago; rain standing in one pit;
3. the LIGHT map (crowns shade the floor; the gap is bright; the rest gets only flecks) and the WET map (pits, the pool,
   low ground, the shade of the logs' north sides);
4. the floor derived from those maps: litter depth (drifting against logs on the windward side, deep in pits, thin on
   mounds), moss (wet and still: logs, stumps, mounds, root flares), ferns (wet and shaded), grass and brambles and
   saplings (light: the gap), mushrooms (logs of class 3-4, stumps, the litter in rings), bare mineral soil (fresh
   mounds, the root plate's face).

  python tools/art_study/wood_ecosystem.py OUT.png
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

N = 40.0                     # yards across the patch
RES = 0.1                    # yards per cell
G = int(N / RES)
WIND = np.array([0.7, -0.7])                 # blowing toward the screen's right (x - y)
_P = np.random.default_rng(12).random((1024, 1024))


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


class Wood:
    def __init__(self, seed=4):
        rr = np.random.default_rng(seed)
        self.rr = rr
        i = (np.arange(G) + 0.5) * RES
        self.X, self.Y = np.meshgrid(i, i)
        # ---- 1. the living, the standing dead, the cut
        self.trees = []                                       # (x, y, kind, trunk radius yd, crown radius yd)
        def free(x, y, r):
            return all(np.hypot(x - t[0], y - t[1]) > r + t[3] * 2 for t in self.trees)
        for kind, n, tr, cr in [("giant", 4, (0.7, 1.0), (7, 9)), ("middle", 7, (0.3, 0.45), (4, 5.5)),
                                ("young", 12, (0.1, 0.2), (1.5, 2.5)), ("snag", 2, (0.5, 0.7), (0, 0)),
                                ("stump", 3, (0.4, 0.6), (0, 0))]:
            k = 0
            while k < n:
                x, y = rr.uniform(3, N - 3), rr.uniform(3, N - 3)
                r = rr.uniform(*tr)
                if not free(x, y, 3.0 if kind == "giant" else 1.5):
                    continue
                self.trees.append((x, y, kind, r, rr.uniform(*cr) if cr[1] else 0))
                k += 1
        # ---- 2. the fallen
        self.logs = []                                        # (x0, y0, x1, y1, radius, decay class, plate?)
        # the giant down a few years: class 1-2, root plate on edge at its foot, a pit, the gap it tore
        fx, fy, ang = 16.0, 22.0, rr.uniform(0.3, 0.9)
        L = 22.0
        self.logs.append((fx, fy, fx + np.cos(ang) * L, fy + np.sin(ang) * L, 0.75, 2, True))
        self.gap = (fx + np.cos(ang) * L * 0.4, fy + np.sin(ang) * L * 0.4, 7.5)
        # an old nurse log, class 4, its seedlings in a row
        ax, ay, ang2 = 8.0, 9.0, rr.uniform(-0.2, 0.3)
        self.logs.append((ax, ay, ax + np.cos(ang2) * 14, ay + np.sin(ang2) * 14, 0.6, 4, False))
        self.nursed = [(ax + np.cos(ang2) * t, ay + np.sin(ang2) * t) for t in np.arange(2, 13, 1.6)]
        # older logs
        for cls in (3, 3, 5, 5, 1):
            x, y, a = rr.uniform(4, N - 4), rr.uniform(4, N - 4), rr.uniform(0, np.pi)
            Ll = rr.uniform(5, 11)
            self.logs.append((x, y, x + np.cos(a) * Ll, y + np.sin(a) * Ll, rr.uniform(0.25, 0.5), cls, False))
        def on_log(x, y, pad):
            for (x0, y0, x1, y1, r, cls, plate) in self.logs:
                dx, dy = x1 - x0, y1 - y0
                t = np.clip(((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
                if np.hypot(x - (x0 + dx * t), y - (y0 + dy * t)) < r + pad:
                    return True
            return False
        self.trees = [t for t in self.trees if not on_log(t[0], t[1], t[3] + 0.3)]
        # pits and mounds of centuries of falls
        self.pm = [(rr.uniform(2, N - 2), rr.uniform(2, N - 2), rr.uniform(0, 2 * np.pi), rr.uniform(0.8, 1.6)) for _ in range(14)]
        lx0, ly0 = self.logs[0][:2]
        self.pm.append((lx0 - np.cos(ang) * 0.9, ly0 - np.sin(ang) * 0.9, ang + np.pi, 2.0))   # the fresh one's pit
        # ---- 3. the ground's height: gentle, then pits and mounds
        H = (fbm(self.X * 0.06, self.Y * 0.06) - 0.5) * 1.2
        for (x, y, a, r) in self.pm:
            px, py = x - np.cos(a) * r * 0.6, y - np.sin(a) * r * 0.6
            mx, my = x + np.cos(a) * r * 0.7, y + np.sin(a) * r * 0.7
            H -= 0.35 * r * np.exp(-((np.hypot(self.X - px, self.Y - py)) / (r * 0.7)) ** 2)
            H += 0.3 * r * np.exp(-((np.hypot(self.X - mx, self.Y - my)) / (r * 0.8)) ** 2)
        self.H = H
        # ---- light: crowns shade; the gap is bright; flecks through the leaves
        shade = np.zeros_like(H)
        for (x, y, kind, r, cr) in self.trees:
            if cr > 0:
                d = np.hypot(self.X - x, self.Y - y) / cr
                shade = np.maximum(shade, np.clip(1.2 - d, 0, 1) * (1.0 if kind != "young" else 0.5))
        shade = np.clip(nd.gaussian_filter(shade, 12) * 0.6 + 0.62, 0, 1)
        gx, gy, gr = self.gap
        gapk = np.clip(1 - np.hypot(self.X - gx, (self.Y - gy) * 1.2) / gr, 0, 1)
        shade = shade * (1 - gapk * 0.9)
        fleck = (vn(self.X * 1.6, self.Y * 1.6) > 0.72) * 0.25
        self.light = np.clip(1 - shade + fleck * shade, 0, 1)
        # ---- wet: pits, low ground, the pool, the logs' shaded sides
        wet = np.clip(-(H - nd.gaussian_filter(H, 25)) * 2.2 + 0.35, 0, 1)
        self.logmask = np.zeros_like(H, bool)
        self.logcls = np.zeros_like(H, int)
        for (x0, y0, x1, y1, r, cls, plate) in self.logs:
            dx, dy = x1 - x0, y1 - y0
            t = np.clip(((self.X - x0) * dx + (self.Y - y0) * dy) / (dx * dx + dy * dy), 0, 1)
            d = np.hypot(self.X - (x0 + dx * t), self.Y - (y0 + dy * t))
            m = d < r * (1.0 if cls < 5 else 1.4)
            self.logmask |= m
            self.logcls = np.where(m, cls, self.logcls)
            near = (d < r + 1.0) & ~m
            wet = np.where(near, np.maximum(wet, 0.55), wet)
        pool_pit = self.pm[3]
        self.pool = np.hypot(self.X - (pool_pit[0] - np.cos(pool_pit[2]) * pool_pit[3] * 0.6), self.Y - (pool_pit[1] - np.sin(pool_pit[2]) * pool_pit[3] * 0.6)) < pool_pit[3] * 0.55
        wet = np.where(self.pool, 1, wet)
        self.wet = np.clip(wet + (1 - self.light) * 0.15, 0, 1)
        # ---- 4. the floor, derived
        upwind = np.zeros_like(H, bool)                                  # litter drifts against the windward side of logs
        for (x0, y0, x1, y1, r, cls, plate) in self.logs:
            pass
        shifted = nd.shift(self.logmask.astype(float), (-WIND[1] * 8, -WIND[0] * 8), order=0) > 0.5
        upwind = shifted & ~self.logmask
        self.litter = np.clip(0.55 + wet * 0.3 - (H - nd.gaussian_filter(H, 15)) * 1.2 + upwind * 0.5, 0, 1.5)
        mound = (H - nd.gaussian_filter(H, 15)) > 0.12
        poolrim = nd.binary_dilation(self.pool, iterations=8) & ~self.pool
        feet = np.zeros_like(H, bool)
        for (x, y, kind, r, cr) in self.trees:
            feet |= np.hypot(self.X - x, self.Y - y) < r + (0.6 if kind in ("giant", "stump", "snag") else 0.2)
        self.moss = ((self.logmask & (self.logcls >= 3)) | (mound & (fbm(self.X * 0.8, self.Y * 0.8) > 0.4)) | poolrim
                     | (feet & (fbm(self.X * 2, self.Y * 2) > 0.45)) | ((self.wet > 0.8) & (fbm(self.X * 0.5, self.Y * 0.5) > 0.6)))
        self.fern = (self.wet > 0.62) & (self.light < 0.6) & (fbm(self.X * 0.35 + 5, self.Y * 0.35) > 0.5) & ~self.logmask & ~self.pool
        self.grass = (self.light > 0.5) & (fbm(self.X * 0.4 + 9, self.Y * 0.4) > 0.4) & ~self.logmask
        self.bare = (H - nd.gaussian_filter(H, 15) > 0.18) & (self.litter < 0.5)
        self.sapl = [(x, y) for x, y in zip(rr.uniform(gx - gr, gx + gr, 40), rr.uniform(gy - gr, gy + gr, 40))
                     if np.hypot(x - gx, y - gy) < gr * 0.9]
        self.shrooms = []
        for (x0, y0, x1, y1, r, cls, plate) in self.logs:
            if cls in (3, 4):
                for t in rr.uniform(0, 1, 6):
                    self.shrooms.append((x0 + (x1 - x0) * t + rr.normal(0, 0.3), y0 + (y1 - y0) * t + rr.normal(0, 0.3)))
        for (x, y, kind, r, cr) in self.trees:
            if kind in ("stump", "snag"):
                for _ in range(4):
                    a = rr.uniform(0, 2 * np.pi)
                    self.shrooms.append((x + np.cos(a) * (r + 0.2), y + np.sin(a) * (r + 0.2)))


def plan(w, out):
    """the patch from above, as a field naturalist's plan"""
    S = 20                                                              # px per yard
    img = np.zeros((G, G, 3))
    base = np.array([0.33, 0.24, 0.16])
    img[:] = base * (0.5 + w.light[..., None] * 0.7)
    img[w.grass] = img[w.grass] * 0.5 + np.array([0.5, 0.55, 0.25]) * 0.5
    img[w.fern] = img[w.fern] * 0.4 + np.array([0.2, 0.4, 0.2]) * 0.6
    img[w.moss] = img[w.moss] * 0.4 + np.array([0.25, 0.45, 0.22]) * 0.6
    img[w.bare] = np.array([0.5, 0.42, 0.34])
    img[w.pool] = np.array([0.12, 0.18, 0.28])
    cls_col = {1: (0.55, 0.42, 0.3), 2: (0.5, 0.38, 0.27), 3: (0.42, 0.32, 0.24), 4: (0.33, 0.36, 0.2), 5: (0.28, 0.33, 0.18)}
    for c, col in cls_col.items():
        m = w.logmask & (w.logcls == c)
        img[m] = col
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((int(N * S), int(N * S)), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for (x, y, kind, r, cr) in w.trees:
        X, Y = x * S, y * S
        col = {"giant": (40, 30, 20), "middle": (60, 45, 30), "young": (80, 70, 40), "snag": (150, 150, 140), "stump": (120, 90, 60)}[kind]
        d.ellipse([X - r * S, Y - r * S, X + r * S, Y + r * S], fill=col, outline=(0, 0, 0))
        if cr:
            d.ellipse([X - cr * S, Y - cr * S, X + cr * S, Y + cr * S], outline=(20, 60, 25))
        d.text((X + r * S + 2, Y - 6), kind, fill=(230, 220, 200))
    for (x0, y0, x1, y1, r, cls, plate) in w.logs:
        d.text(((x0 + x1) / 2 * S, (y0 + y1) / 2 * S - 14), f"log, class {cls}", fill=(255, 240, 200))
        if plate:
            d.line([(x0 * S - 30, y0 * S + 40), (x0 * S + 30, y0 * S - 40)], fill=(160, 120, 80), width=6)
            d.text((x0 * S - 60, y0 * S + 44), "root plate, pit, mound", fill=(255, 240, 200))
    for (x, y) in w.nursed:
        d.ellipse([x * S - 4, y * S - 4, x * S + 4, y * S + 4], fill=(90, 140, 60))
    d.text((w.nursed[0][0] * S, w.nursed[0][1] * S + 12), "nurse log: seedlings in a row", fill=(200, 240, 180))
    for (x, y) in w.sapl:
        d.ellipse([x * S - 3, y * S - 3, x * S + 3, y * S + 3], fill=(120, 170, 70))
    gx, gy, gr = w.gap
    d.ellipse([(gx - gr) * S, (gy - gr) * S, (gx + gr) * S, (gy + gr) * S], outline=(255, 230, 120), width=3)
    d.text((gx * S - 40, (gy - gr) * S - 16), "the gap: light, saplings, grass", fill=(255, 230, 120))
    for (x, y) in w.shrooms:
        d.point((x * S, y * S), fill=(240, 230, 210))
    for (x, y, a, r) in w.pm:
        d.text((x * S, y * S), "pm", fill=(200, 180, 160))
    d.rectangle([4, 4, 330, 120], fill=(10, 10, 12))
    for k, (txt, col) in enumerate([("light: brighter floor", (200, 170, 120)), ("moss (wet, shaded, still)", (70, 120, 60)),
                                    ("ferns (wet, shaded)", (50, 100, 50)), ("grass (light)", (130, 140, 70)),
                                    ("bare mineral soil (mounds)", (130, 110, 90)), ("rainwater in an old pit", (40, 60, 90)),
                                    ("pm: old pit and mound", (200, 180, 160))]):
        d.text((10, 10 + k * 15), txt, fill=col)
    im.save(out)


if __name__ == "__main__":
    w = Wood()
    plan(w, sys.argv[1] if len(sys.argv) > 1 else "wood_plan.png")
    print("saved")
