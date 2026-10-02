"""Demo: the necromancer page's recipe ported to numpy, plus the PixelForge additions.

Renders: base (faithful), enhanced (longer ramps, material texture, rim + second light, contact AO), and a 2x
scale version of the enhanced one (the shapes scaled, so detail grows with the size). Writes a side-by-side.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image


class Mask(np.ndarray):
    """A boolean mask that can carry its bounding box."""
    bb = None


def as_mask(a, bb):
    m = a.view(Mask); m.bb = bb
    return m

W, H, OY = 96, 108, 6
BAYER = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], float).reshape(4, 4)
BAYER = (BAYER + 0.5) / 16


def hexc(s):
    return np.array([int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)], float)


def ramp(cols):
    return [hexc(c) for c in cols]


def extend_ramp(r, n):
    """A 5-step ramp becomes an n-step ramp by interpolating in the same hue, darker at the bottom, lighter top."""
    r = np.array(r)
    xs = np.linspace(0, len(r) - 1, n)
    out = []
    for x in xs:
        i = int(math.floor(x)); f = x - i
        a = r[min(i, len(r) - 1)]; b = r[min(i + 1, len(r) - 1)]
        out.append(a * (1 - f) + b * f)
    # push the ends a little further for contrast
    out[0] = np.clip(out[0] * 0.8, 0, 255); out[-1] = np.clip(out[-1] * 1.1 + 8, 0, 255)
    return out


P5 = {
    "robe": ramp(["#0a080c", "#141017", "#1f1922", "#2c2430", "#3d3242"]),
    "sash": ramp(["#1e0a0c", "#3a1014", "#5e1a1e", "#842a2a", "#a8413a"]),
    "cape": ramp(["#070609", "#0e0b10", "#161219", "#1f1924", "#2a222f"]),
    "tunic": ramp(["#1b1b21", "#2a2a32", "#3c3c46", "#52525c", "#6b6b76"]),
    "mantle": ramp(["#1c1b17", "#302e26", "#48443a", "#635e4e", "#827b64"]),
    "bone": ramp(["#3a3428", "#675e4c", "#968c74", "#c2b897", "#e6ddc0"]),
    "skin": ramp(["#26251f", "#45433a", "#6a6656", "#908a74", "#b5ae93"]),
    "gold": ramp(["#2a1e0e", "#4c3818", "#765925", "#a37f38", "#cfac5d"]),
    "wood": ramp(["#17100b", "#2a1d13", "#43301f", "#5e442c", "#7c5d3c"]),
    "leather": ramp(["#150f0c", "#261b15", "#3b2a20", "#53392a", "#6d4c37"]),
    "iron": ramp(["#121216", "#212127", "#34343c", "#4d4d56", "#6d6d78"]),
}
SOUL = ramp(["#0f3a1c", "#1f6e2e", "#3fb04a", "#8cf07a", "#e6ffdc"])
VOID = hexc("#050307"); OUT = hexc("#08060a"); SHADOW = hexc("#3c3b40"); TINT = hexc("#6fe86a")
# material texture rules for the enhanced render: (kind, strength)
TEX = {"robe": ("weave", 0.55), "cape": ("weave", 0.5), "tunic": ("weave", 0.45), "mantle": ("fur", 0.7), "sash": ("weave", 0.45),
       "bone": ("grain", 0.45), "skin": ("grain", 0.2), "gold": ("scratch", 0.5), "iron": ("scratch", 0.6), "wood": ("grain", 0.55), "leather": ("grain", 0.4)}


class Renderer:
    def __init__(self, scale=1, steps=5, enhanced=False, seed=1):
        self.s = scale
        self.W, self.H = W * scale, H * scale
        self.steps = steps
        self.enh = enhanced
        self.P = {k: (extend_ramp(v, steps) if steps != 5 else v) for k, v in P5.items()}
        self.rng = np.random.default_rng(seed)
        self.noise = self.rng.random((self.H, self.W))
        self.reset()

    def reset(self):
        self.col = np.zeros((self.H, self.W, 3), float)
        self.fill = np.zeros((self.H, self.W), np.uint8)
        self.mat = np.zeros((self.H, self.W), object)
        self.glow = []

    def bay(self):
        yy, xx = np.mgrid[0:self.H, 0:self.W]
        return BAYER[yy & 3, xx & 3]

    # ---- masks
    def poly(self, pts, dx=0.0, dy=0.0):
        s = self.s
        q = [((x + dx) * s, (y + dy + OY) * s) for x, y in pts]
        xs = [p[0] for p in q]; ys = [p[1] for p in q]
        m = np.zeros((self.H, self.W), bool)
        bb = (min(xs), min(ys), max(xs), max(ys))
        x0, x1 = max(1, int(math.floor(min(xs)))), min(self.W - 2, int(math.ceil(max(xs))))
        y0, y1 = max(1, int(math.floor(min(ys)))), min(self.H - 2, int(math.ceil(max(ys))))
        if x1 < x0 or y1 < y0:
            return as_mask(m, bb)
        px = np.arange(x0, x1 + 1) + 0.5; py = np.arange(y0, y1 + 1) + 0.5
        PX, PY = np.meshgrid(px, py)
        inside = np.zeros_like(PX, bool)
        n = len(q)
        for i in range(n):
            xi, yi = q[i]; xj, yj = q[i - 1]
            cond = ((yi > PY) != (yj > PY))
            with np.errstate(divide="ignore", invalid="ignore"):
                xint = (xj - xi) * (PY - yi) / (yj - yi + 1e-12) + xi
            inside ^= cond & (PX < xint)
        m[y0:y1 + 1, x0:x1 + 1] = inside
        return as_mask(m, bb)

    def ell(self, cx, cy, rx, ry, dy=0.0):
        s = self.s
        cx, cy, rx, ry = cx * s, (cy + OY + dy) * s, rx * s, ry * s
        yy, xx = np.mgrid[0:self.H, 0:self.W]
        m = ((xx + 0.5 - cx) / rx) ** 2 + ((yy + 0.5 - cy) / ry) ** 2 <= 1
        return as_mask(m, (cx - rx, cy - ry, cx + rx, cy + ry))

    # ---- paint
    def paint(self, m, name, base=2, gx=-0.9, gy=-0.6, fold=None, contour=True):
        r = self.P[name]
        bx0, by0, bx1, by1 = m.bb
        mx, my = (bx0 + bx1) / 2, (by0 + by1) / 2
        hw, hh = max(1, (bx1 - bx0) / 2), max(1, (by1 - by0) / 2)
        ys, xs = np.nonzero(m)
        if len(ys) == 0:
            return
        ms = max(1, self.s)  # edge band scales with size
        t = np.full(len(ys), base, float)
        def off(dy, dx):
            y2 = np.clip(ys + dy, 0, self.H - 1); x2 = np.clip(xs + dx, 0, self.W - 1)
            return m[y2, x2]
        near_tl = (~off(0, -ms)) | (~off(-ms, 0))
        near_tl2 = (~off(0, -2 * ms)) | (~off(-2 * ms, 0))
        t += np.where(near_tl, 1, np.where(near_tl2, 1, 0))
        t -= (~off(0, ms)).astype(float)
        t -= (~off(ms, 0)).astype(float)
        g = gx * (xs - mx) / hw + gy * (ys - my) / hh
        bayv = BAYER[ys & 3, xs & 3]
        t += np.floor(g + 0.5 + (bayv - 0.5) * 0.5)
        if contour:
            cont = np.zeros(len(ys), bool)
            for dy, dx in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                y2 = np.clip(ys + dy, 0, self.H - 1); x2 = np.clip(xs + dx, 0, self.W - 1)
                cont |= (~m[y2, x2]) & (self.fill[y2, x2] == 1)
            t = np.where(cont, np.minimum(t, 0), t)
        if fold is not None:
            p, w = fold
            t += np.where(((xs / self.s + np.floor(ys / self.s * p)) % w) == 0, -1, 0)
        if self.enh:
            # material texture: a per-material pattern that nudges the step by one, dithered, never on contours
            kind, k = TEX.get(name, ("none", 0))
            n = self.noise[ys, xs]
            if kind == "weave":
                pat = (((xs // ms) + (ys // ms)) % 2 == 0) & (n < k)
                t += np.where(pat, -1, 0)
            elif kind == "fur":
                pat = ((xs // ms + (ys // ms) // 2) % 3 == 0) & (n < k)
                t += np.where(pat, np.where(n < k / 2, 1, -1), 0)
            elif kind == "scratch":
                pat = (((xs // ms) * 3 + (ys // ms)) % 7 == 0) & (n < k)
                t += np.where(pat, 1, 0)
                t += np.where((n > 1 - k * 0.3), -1, 0)
            elif kind == "grain":
                t += np.where(n < k * 0.5, -1, np.where(n > 1 - k * 0.3, 1, 0))
            # the ramp is longer: spread the step budget over it
            t = np.round(t * (self.steps - 1) / 4)
        t = np.clip(t, 0, len(r) - 1).astype(int)
        self.col[ys, xs] = np.array(r)[t]
        self.fill[ys, xs] = 1
        self.mat[ys, xs] = name

    def dot(self, x, y, c):
        s = self.s
        y0, x0 = int((y + OY) * s), int(x * s)
        self.col[y0:y0 + s, x0:x0 + s] = c; self.fill[y0:y0 + s, x0:x0 + s] = 1

    def emit(self, x, y, c):
        self.glow.append((x, y + OY, c))

    # ---- figure (the page's shape list)
    def figure(self, f=40):
        self.reset()
        b = (f // 10) % 2
        wave = lambda i, amp=1: round(math.sin(f * 0.55 + i * 1.9) * amp)
        def hem(xa, xb, y, seed, deep=4):
            pts = []; n = round(abs(xb - xa) / 3)
            for k in range(n + 1):
                x = xa + (xb - xa) * k / n
                d = deep + ((k * 7 + seed) % 3) if k % 2 else 0
                pts.append((x + (wave(k + seed) if k % 2 else 0), y + d + (wave(k * 3 + seed + 3) if k % 2 else 0)))
            return pts
        pt = self.paint
        pt(self.poly([(34, 38), (59, 38), (64, 60), (70, 92)] + hem(70, 24, 93, 5, 3) + [(28, 60)]), "cape", fold=(0.12, 5))
        pt(self.poly([(36, 85), (42, 85), (43, 94), (33, 94), (34, 90)]), "iron")
        pt(self.poly([(48, 85), (54, 85), (55, 90), (57, 94), (47, 94)]), "iron")
        pt(self.poly([(35, 35), (58, 35), (60, 46), (60, 60), (62, 74), (64, 86)] + hem(64, 29, 86, 2, 4) + [(29, 74), (31, 60), (33, 46)]), "robe", fold=(0.18, 6))
        pt(self.poly([(44, 44), (50, 44), (54, 87), (52, 91 + wave(1)), (49, 88), (46, 92 + wave(4)), (43, 88), (40, 90 + wave(7)), (41, 70)]), "tunic", gy=-0.3, fold=(0.05, 4))
        pt(self.poly([(32, 54), (60, 53), (60, 57), (32, 58)]), "leather")
        pt(self.poly([(45, 53), (49, 53), (49, 58), (45, 58)]), "gold", base=3)
        for x, y in ((46, 55), (47, 55), (46, 56), (47, 56)): self.dot(x, y, self.P["gold"][0])
        pt(self.poly([(54, 57), (58, 57), (58, 63), (54, 63)]), "leather")
        pt(self.poly([(39, 57), (44, 57), (45, 70), (43, 83), (44, 89 + wave(11)), (42, 85), (40, 88 + wave(12)), (39, 79), (38, 67)]), "sash", fold=(0.1, 3))
        sw = wave(9)
        for y in range(58, 62): self.dot(35 + (sw if y > 60 else 0), y, self.P["leather"][1])
        pt(self.ell(35.5 + sw, 63.5, 2.1, 1.9), "bone", base=3)
        self.dot(35 + sw, 63, self.P["bone"][0]); self.dot(36 + sw, 63, self.P["bone"][0])
        pt(self.poly([(36, 36), (32, 40), (29, 49), (28, 56), (32, 58), (34, 50), (37, 43)], 0, b), "robe", gx=-0.4)
        pt(self.poly([(26, 55), (33, 56), (34, 62), (32, 60 + wave(2)), (29, 64 + wave(5)), (27, 61), (25, 63 + wave(8))], 0, b), "robe", base=1)
        pt(self.poly([(28, 61), (32, 61), (33, 66), (29, 67)], 0, b), "skin", base=3)
        for x, y, i in ((28, 67, 2), (28, 68, 1), (30, 68, 3), (30, 69, 2), (32, 67, 2), (32, 68, 1)): self.dot(x, y + b, self.P["skin"][min(i, len(self.P["skin"]) - 1)])
        pt(self.poly([(39, 30), (53, 30), (59, 33), (62, 38), (62, 45), (60, 43 + wave(1)), (58, 49 + wave(2)), (55, 44), (52, 48 + wave(3)), (49, 44), (46, 50 + wave(4)), (43, 44), (40, 48 + wave(5)), (37, 43), (33, 46 + wave(6)), (31, 40), (34, 34)], 0, b), "mantle", fold=(0.3, 4))
        pt(self.poly([(42, 13), (47, 13), (51, 16), (54, 21), (55, 27), (53, 32), (40, 33), (37, 28), (37, 20), (39, 15)], 0, b), "robe")
        for x, y, h in ((40, 16, 3), (42.5, 14.5, 5), (45.5, 13.5, 6), (48.5, 14, 5), (51, 16, 3)):
            pt(self.poly([(x - 1.3, y + 1), (x - 0.6 - h * 0.12, y - h), (x + 1.3, y + 1)], 0, b), "bone", base=3, contour=False)
        pt(self.poly([(38, 15.5), (52, 15.5), (53, 18), (38, 18)], 0, b), "gold", base=3, gy=0)
        self.dot(45, 16 + b, self.P["sash"][-1]); self.dot(45, 17 + b, self.P["sash"][2])
        cav = self.ell(49.8, 24.8, 4.1, 5.6, b)
        self.col[cav] = VOID; self.fill[cav] = 1
        pt(self.poly([(47, 20.5), (52, 20.5), (53, 24), (52, 28), (50, 30), (48, 30), (46, 27), (46, 23)], 0, b), "bone", gx=-1.2, contour=False)
        for x, y, i in ((48, 23, 0), (51, 23, 0), (47, 23, 1), (50, 25, 0), (48, 28, 0), (50, 28, 0), (49, 27, 1)): self.dot(x, y + b, self.P["bone"][i])
        pt(self.poly([(55, 35), (61, 37), (64, 44), (69, 43), (70, 48), (65, 51), (60, 48), (56, 42)]), "robe", base=3, gx=-0.5)
        pt(self.poly([(61, 49), (67, 50), (66, 59 + wave(3)), (64, 55), (62, 58 + wave(6))]), "robe")
        pt(self.ell(58.5, 36.5, 4.2, 3.4), "bone")
        for x, y, i in ((57, 36, 0), (59, 36, 0), (58, 38, 1), (60, 38, 1)): self.dot(x, y, self.P["bone"][i])
        pt(self.poly([(54, 39), (62.5, 39), (62, 41), (55, 41)]), "iron")
        pt(self.poly([(67.5, 13), (69.8, 13), (68.6, 95), (66.4, 95)]), "wood", gx=-2, gy=0)
        for y in (30, 62, 80): pt(self.poly([(66, y), (70.5, y), (70.2, y + 2), (66, y + 2)]), "gold")
        pt(self.ell(69, 10.6, 3.1, 2.6), "bone", base=3)
        pt(self.poly([(67.6, 12), (70.6, 12), (70.4, 14.4), (67.8, 14.4)]), "bone")
        self.dot(68, 13, self.P["bone"][0]); self.dot(70, 13, self.P["bone"][0])
        for x, y in ((65, 11), (65, 10), (65, 9), (66, 8), (66, 7), (73, 11), (73, 10), (73, 9), (72, 8), (72, 7)): self.dot(x, y, self.P["gold"][-2])
        self.dot(65, 12, self.P["gold"][1]); self.dot(73, 12, self.P["gold"][1])
        pt(self.poly([(66, 43), (70.5, 43), (71, 47), (66.5, 48)]), "skin")
        self.dot(67, 45, self.P["skin"][0]); self.dot(69, 45, self.P["skin"][0])
        # outline
        f1 = self.fill == 1
        nb = np.zeros_like(f1)
        nb[:, 1:] |= f1[:, :-1]; nb[:, :-1] |= f1[:, 1:]; nb[1:, :] |= f1[:-1, :]; nb[:-1, :] |= f1[1:, :]
        edge = nb & (self.fill == 0)
        self.col[edge] = OUT; self.fill[edge] = 2
        # emissives
        pulse = (math.sin(f * 0.35) + 1) / 2
        eye = SOUL[4] if pulse > 0.3 else SOUL[3]
        self.emit(48, 23 + b, eye); self.emit(51, 23 + b, eye)
        self.emit(68, 11, SOUL[3]); self.emit(70, 11, SOUL[3])
        for k in range(13):
            y = 48 + k * 3; xl = round(44 - (y - 44) * 0.08); xr = round(50 + (y - 44) * 0.08)
            lit = (k + f // 2) % 5
            if lit < 2:
                self.emit(xl - 1, y, SOUL[2 if lit else 3]); self.emit(xr + 1, y + 1, SOUL[2 if lit else 3])
        orb = 1 + (f // 3) % 2
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                d = math.hypot(dx, dy)
                if d > orb + 0.3: continue
                self.emit(30 + dx, 73 + dy + b, SOUL[4] if d < 0.5 else SOUL[3] if d < 1.3 else SOUL[2])
        for dx in range(-3, 4):
            h = max(0, 7 - abs(dx) * 2 + round(math.sin(f * 1.3 + dx * 2.1) * 1.4 + math.sin(f * 0.7 - dx)))
            for k in range(h):
                rel = k / max(1, h); core = abs(dx) <= 1 and rel < 0.5
                self.emit(69 + dx + (round(math.sin(f * 0.9 + k)) if k > 4 else 0), 8 - k, SOUL[4] if core else SOUL[3] if rel < 0.6 else SOUL[2] if rel < 0.85 else SOUL[1])
        return b, pulse

    def light(self, cx, cy, R, s, tint=TINT, rim=False):
        sc = self.s
        cx, cy, R = cx * sc, cy * sc, R * sc
        yy, xx = np.mgrid[0:self.H, 0:self.W]
        d = np.hypot(xx - cx, yy - cy)
        v = np.clip(1 - d / R, 0, 1) ** 2 * s
        bay = self.bay()
        m = self.fill == 1
        a = m & (v > bay)
        self.col[a] = self.col[a] * 0.7 + tint * 0.3
        a2 = m & (v > 0.6 + bay * 0.4)
        self.col[a2] = self.col[a2] * 0.75 + tint * 0.25
        if rim:
            # rim: painted pixels whose neighbour toward the light is unpainted get a bright edge
            dirx, diry = np.sign(cx - self.W / 2), np.sign(cy - self.H / 2)
            dx, dy = int(dirx) * sc, int(diry) * sc
            shifted = np.zeros_like(m)
            ys, xs = np.nonzero(m)
            y2 = np.clip(ys + dy, 0, self.H - 1); x2 = np.clip(xs + dx, 0, self.W - 1)
            edge = (self.fill[y2, x2] != 1)
            rimm = np.zeros_like(m); rimm[ys[edge], xs[edge]] = True
            rimm &= (v > 0.08)
            self.col[rimm] = np.clip(self.col[rimm] * 0.35 + tint * 0.75 + 30, 0, 255)

    def ao(self):
        """Contact darkening where one painted shape sits under another (enhanced only): a 1-px darker band."""
        m = self.fill == 1
        ys, xs = np.nonzero(m)
        above = np.clip(ys - self.s, 0, self.H - 1)
        diff = (self.mat[above, xs] != self.mat[ys, xs]) & (self.fill[above, xs] == 1)
        self.col[ys[diff], xs[diff]] *= 0.6

    def compose(self, f=40):
        b, pulse = self.figure(f)
        if self.enh:
            self.ao()
            self.light(69, 6 + OY, 22, 0.75 + pulse * 0.15, rim=True)
            self.light(30, 73 + OY + b, 12, 0.6 + pulse * 0.2)
            self.light(49, 23 + OY + b, 5, 0.6)
            self.light(10, 40 + OY, 60, 0.45, tint=hexc("#7f9bb8"), rim=True)   # a cold ambient from the left, rimming the far side
            self.light(69, 6 + OY, 30, 0.5, tint=hexc("#e0b060"))   # the staff fire also warms what it reaches
        else:
            self.light(69, 6 + OY, 22, 0.75 + pulse * 0.15)
            self.light(30, 73 + OY + b, 12, 0.6 + pulse * 0.2)
            self.light(49, 23 + OY + b, 5, 0.6)
        out = np.zeros((self.H, self.W, 4), np.uint8)
        sc = self.s
        yy, xx = np.mgrid[0:self.H, 0:self.W]
        u = (xx / sc + 0.5 - 46) / 30; v = (yy / sc + 0.5 - (95 + OY)) / 4.2
        shadow = (u * u + v * v <= 1) & (((xx // sc) + (yy // sc)) % 2 == 0) & (self.fill == 0)
        out[shadow, :3] = SHADOW; out[shadow, 3] = 255
        m = self.fill > 0
        out[m, :3] = np.clip(self.col[m], 0, 255).astype(np.uint8); out[m, 3] = 255
        for x, y, c in self.glow:
            x0, y0 = int(x * sc), int(y * sc)
            if 0 <= x0 < self.W and 0 <= y0 < self.H:
                out[y0:y0 + sc, x0:x0 + sc, :3] = c; out[y0:y0 + sc, x0:x0 + sc, 3] = 255
        return Image.fromarray(out, "RGBA")


if __name__ == "__main__":
    import sys
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    base = Renderer().compose()
    enh = Renderer(steps=8, enhanced=True).compose()
    big = Renderer(scale=2, steps=8, enhanced=True).compose()
    bg = (94, 93, 98, 255)
    def on_bg(im, z):
        c = Image.new("RGBA", im.size, bg); c.alpha_composite(im)
        return c.resize((im.width * z, im.height * z), Image.NEAREST)
    from PIL import ImageDraw
    a, b_, c = on_bg(base, 5), on_bg(enh, 5), on_bg(big, 3)
    crop = lambda im, z: on_bg(im.crop((26, 30 + OY, 66, 70 + OY)), z)
    ca, cb = crop(base, 8), crop(enh, 8)
    cc = on_bg(big.crop((52, 60 + OY * 2, 132, 140 + OY * 2)), 4)
    sheet = Image.new("RGBA", (a.width + b_.width + c.width + 60, a.height + ca.height + 80), bg)
    d = ImageDraw.Draw(sheet)
    x = 15
    for im, cr, label in ((a, ca, "the page's recipe, 96 px"), (b_, cb, "+ longer ramps, material texture, rim + fire + cold light, contact shade"), (c, cc, "the same, hi-res preset (192 px): finer, but no new detail without new shapes")):
        d.text((x, 6), label, fill=(230, 225, 210, 255))
        sheet.alpha_composite(im, (x, 24)); sheet.alpha_composite(cr, (x, 24 + a.height + 30))
        d.text((x, 24 + a.height + 12), "zoom", fill=(200, 195, 180, 255))
        x += max(im.width, cr.width) + 15
    sheet.save(f"{out_dir}/necro_compare.png")
    base.save(f"{out_dir}/necro_base.png"); enh.save(f"{out_dir}/necro_enh.png"); big.save(f"{out_dir}/necro_big.png")
    print("ok", base.size, enh.size, big.size)
