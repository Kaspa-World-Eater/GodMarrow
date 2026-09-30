#!/usr/bin/env python3
"""Paints the world objects the web build drew with vector calls and that have no image asset yet:
the toppled three-faced Triune statues (zd_world22 statueFrame, 3 variants), the Reader's Book on its lectern
(the relic of The Reader's Ink), and Nell in the drowned keepers' cage (the captive). Pixel art at 2 texels per
world px (hr 2), anchored at the foot point written in objects.json. Run: python3 paint_objects.py"""
import json, math, os, random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
K = 2  # texels per world px

def hexc(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def ramp(a, b, c, n):
    a, b, c = hexc(a), hexc(b), hexc(c); out = []
    for i in range(n):
        t = i / (n - 1)
        if t < 0.5:
            u = t / 0.5; out.append(tuple(int(a[k] + (b[k] - a[k]) * u) for k in range(3)))
        else:
            u = (t - 0.5) / 0.5; out.append(tuple(int(b[k] + (c[k] - b[k]) * u) for k in range(3)))
    return out

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

class Canvas:
    def __init__(self, w, h, ox, oy):
        self.w, self.h, self.ox, self.oy = w * K, h * K, ox * K, oy * K
        self.im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)); self.px = self.im.load()
    def put(self, x, y, c, a=255):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h:
            if a >= 255: self.px[x, y] = tuple(c[:3]) + (255,)
            else:
                o = self.px[x, y]
                if o[3] == 0: self.px[x, y] = tuple(c[:3]) + (a,)
                else:
                    f = a / 255; self.px[x, y] = tuple(int(o[k] * (1 - f) + c[k] * f) for k in range(3)) + (max(o[3], a),)
    def W(self, x, y):  # world px (relative to the anchor) -> texel
        return self.ox + x * K, self.oy + y * K
    def ball(self, cx, cy, rx, ry, rp, lit=0.0, ao=0.0, ang=0.0):
        X, Y = self.W(cx, cy); RX, RY = rx * K, ry * K; R = max(RX, RY)
        ca, sa = math.cos(ang), math.sin(ang)
        for y in range(int(Y - R) - 1, int(Y + R) + 2):
            for x in range(int(X - R) - 1, int(X + R) + 2):
                dx, dy = x + 0.5 - X, y + 0.5 - Y
                u, v = (dx * ca + dy * sa) / RX, (-dx * sa + dy * ca) / RY; d = u * u + v * v
                if d > 1: continue
                nz = math.sqrt(1 - d); l = (-u * 0.55 - v * 0.65 + nz * 0.55) + lit - ao * (v > 0.3) * 0.5
                l = max(0, min(1, 0.5 + l * 0.55)); idx = l * (len(rp) - 1) + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.9
                c = rp[max(0, min(len(rp) - 1, int(round(idx))))]
                if d > 0.86: c = rp[0]
                self.put(x, y, c)
    def poly(self, pts, rp, base=0.6, grad=0.0):
        P = [self.W(x, y) for x, y in pts]
        xs = [p[0] for p in P]; ys = [p[1] for p in P]
        y0, y1 = int(min(ys)), int(max(ys)) + 1
        for y in range(y0, y1 + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                if self.inside(P, x + 0.5, y + 0.5):
                    t = (y - y0) / max(1, y1 - y0)
                    l = base - grad * t + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.18
                    self.put(x, y, rp[max(0, min(len(rp) - 1, int(round(l * (len(rp) - 1)))))])
        # a dark contour
        for i in range(len(P)):
            self.line_t(P[i], P[(i + 1) % len(P)], rp[0])
    @staticmethod
    def inside(P, x, y):
        c = False; j = len(P) - 1
        for i in range(len(P)):
            xi, yi = P[i]; xj, yj = P[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi: c = not c
            j = i
        return c
    def line_t(self, a, b, c, alpha=255):
        n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
        for i in range(n + 1):
            t = i / max(1, n); self.put(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, c, alpha)
    def line(self, x0, y0, x1, y1, c, alpha=255):
        self.line_t(self.W(x0, y0), self.W(x1, y1), c, alpha)
    def rect(self, x, y, w, h, c, alpha=255):
        X, Y = self.W(x, y)
        for j in range(int(h * K)):
            for i in range(int(w * K)): self.put(X + i, Y + j, c, alpha)
    def shadow(self, rx, ry, a=150):
        X, Y = self.W(0, 0)
        for y in range(int(Y - ry * K), int(Y + ry * K) + 1):
            for x in range(int(X - rx * K), int(X + rx * K) + 1):
                u, v = (x - X) / (rx * K), (y - Y) / (ry * K)
                if u * u + v * v <= 1: self.put(x, y, (8, 6, 9), int(a * (1 - 0.5 * (u * u + v * v))))
    def save(self, name):
        self.im.save(os.path.join(HERE, name + '.png'))
        return {"png": "res://art/objects/%s.png" % name, "ox": self.ox, "oy": self.oy, "hr": K}

meta = {}
STONE = ramp('#18161c', '#6a6468', '#cac2bc', 7)
MOSS = hexc('#4a5a36')

# ---------------------------------------------------------------- toppled three-faced statues (3 variants)
STONE = ramp('#0e0d11', '#4f4a4e', '#a8a097', 8)
DARK = STONE[0]
def moss(c, x, y, n, r):
    for i in range(n):
        a = random.random() * 6.283; d = random.random() * r
        c.rect(x + math.cos(a) * d * 1.6, y + math.sin(a) * d * 0.7, 0.5, 0.5, random.choice([(52, 66, 40), (66, 82, 46), (40, 50, 32)]))
def face(c, x, y, s=1.0, crushed=False):
    # a carved face: brow, two eye-hollows, the ridge of a nose, a closed mouth
    c.line(x - 1.6 * s, y - 1.2 * s, x + 1.6 * s, y - 1.2 * s, STONE[5])
    for ex in (-0.9, 0.9):
        c.rect(x + ex * s - 0.25, y - 0.6 * s, 0.75, 0.5, DARK)
    c.line(x, y - 0.8 * s, x + 0.2, y + 0.6 * s, STONE[6])
    c.line(x - 0.7 * s, y + 1.3 * s, x + 0.7 * s, y + 1.3 * s, STONE[1] if not crushed else DARK)
for v in range(3):
    random.seed(40 + v)
    c = Canvas(48, 30, 24, 25)
    c.shadow(19, 4.2, 170)
    # the broken plinth it fell from
    c.poly([(-15, -1), (-6, 2.5), (3, -1), (-6, -4)], STONE, base=0.32)
    c.poly([(-15, -1), (-6, 2.5), (-6, 3.5), (-15, 0)], STONE, base=0.15)
    # the fallen body in its robe, lying along the ground
    c.ball(-4, -4.2, 9.5, 4.0, STONE, ao=0.35, ang=-0.12)
    for fx in (-9, -6, -3, 0):  # robe folds
        c.line(fx, -7.2 + fx * 0.05, fx + 1.2, -1.6, STONE[2], 200)
    # the head on its side, three faces: one looks along the ground, one up at the sky, one pressed into the dirt
    c.ball(7.5, -5.4, 4.6, 4.8, STONE, ao=0.3)
    face(c, 10.0, -5.6, 0.95)
    face(c, 7.2, -9.0, 0.8)
    c.line(4.4, -2.0, 6.4, -1.2, DARK); c.rect(5.0, -2.2, 0.5, 0.5, STONE[1])
    # cracks
    c.line(-8, -7.6, -5.5, -5.5, DARK, 220); c.line(-5.5, -5.5, -4.8, -3.0, DARK, 200)
    c.line(6.0, -9.8, 7.2, -7.4, DARK, 200)
    moss(c, -7, -7.4, 26, 2.8); moss(c, 6.4, -9.6, 10, 1.4); moss(c, -12, -1.4, 10, 2)
    for i in range(7): c.rect(-12 + random.random() * 24, 0.2 + random.random() * 1.6, 0.5, 0.5, STONE[random.randint(1, 3)])
    if v == 1:  # an arm broken off, and a hand
        c.ball(-14.5, -1.6, 2.6, 1.4, STONE, lit=-0.1, ang=0.3); c.ball(14.5, -1.0, 1.9, 1.2, STONE)
        c.line(13.4, -1.6, 15.4, -1.8, DARK)
    if v == 2:  # a slab of the plinth standing up at an angle
        c.poly([(-17, 0), (-13, -10), (-10.5, -9), (-13.5, 1)], STONE, base=0.45, grad=0.25)
        moss(c, -13.5, -8.5, 8, 1.2)
    meta["statue%d" % v] = c.save("statue%d" % v)

# ---------------------------------------------------------------- the Reader's Book on a stone lectern
BOOKST = ramp('#141218', '#5a5460', '#b8b0b8', 6)
PAGE = ramp('#3a3226', '#b8aa88', '#efe4c6', 6)
LEATHER = ramp('#120808', '#4a2418', '#8a4a2a', 5)
c = Canvas(30, 34, 15, 30)
c.shadow(11, 3)
c.poly([(-9, -1), (0, 3), (9, -1), (0, -5)], BOOKST, base=0.55)                 # the plinth
c.poly([(-3, -2), (3, -2), (2.5, -14), (-2.5, -14)], BOOKST, base=0.5, grad=0.25)  # the post
c.poly([(-8, -15), (0, -12), (8, -15), (0, -20)], BOOKST, base=0.75)              # the slanted top
c.poly([(-7, -16), (-0.3, -13.4), (-0.3, -17.6), (-6.4, -20.4)], LEATHER, base=0.5)   # covers
c.poly([(0.3, -13.4), (7, -16), (6.4, -20.4), (0.3, -17.6)], LEATHER, base=0.4)
c.poly([(-6.4, -16.8), (-0.4, -14.2), (-0.4, -18.8), (-5.8, -21)], PAGE, base=0.8)    # the open pages
c.poly([(0.4, -14.2), (6.4, -16.8), (5.8, -21), (0.4, -18.8)], PAGE, base=0.65)
for i in range(5):  # the writing, still wet
    c.line(-5.4, -17.4 - i * 0.7 + 0.35, -1.2, -15.6 - i * 0.7 + 0.35, (58, 24, 22), 210)
    if i < 3: c.line(1.2, -15.6 - i * 0.7 + 0.35, 5.0, -17.2 - i * 0.7 + 0.35, (58, 24, 22), 210)
c.rect(-1, -12, 0.5, 2.5, (46, 14, 16), 200)   # a thread of ink run down the post
c.rect(-1, -9, 0.5, 1, (46, 14, 16), 150)
for sx in (-5.5, 5.5):  # two stubs of candle, unlit
    c.rect(sx - 0.5, -3.4, 1, 1.6, (200, 190, 160)); c.rect(sx - 0.5, -3.8, 1, 0.5, (40, 32, 24))
meta["relic_book"] = c.save("relic_book")

# ---------------------------------------------------------------- Nell in the keepers' cage (the captive)
RAG = ramp('#1c1814', '#8a8272', '#d8d0bc', 6)
SKIN = ramp('#2a1a16', '#a08070', '#e8c8b0', 5)
IRON = ramp('#0e0c10', '#3a3642', '#6a6472', 5)
c = Canvas(28, 40, 14, 34)
c.shadow(11, 3.2)
c.ball(0, -6, 5, 6, RAG)                    # kneeling, hunched
c.ball(-0.6, -14.2, 3.6, 3.8, RAG, lit=-0.1)   # the hood, bowed forward
c.ball(-1.4, -13.4, 1.9, 2.3, SKIN, lit=-0.25)  # the face in its shadow
c.rect(-2.3, -14.0, 0.5, 0.5, (30, 18, 18)); c.rect(-0.9, -14.0, 0.5, 0.5, (30, 18, 18))
for i in range(4): c.line(-3.2 + i * 0.4, -12.5, -3.4 + i * 0.5, -9.5 + i * 0.3, (48, 34, 26), 200)   # wet hair
c.line(-3.5, -8, -4.5, -3, SKIN[2])         # one arm hanging
c.line(3, -9, 4, -4, RAG[2])
for k in range(-2, 3):                      # the bars
    x = k * 4
    c.line(x, 1, x, -26, IRON[2]); c.line(x + 0.5, 1, x + 0.5, -26, IRON[0])
c.line(-9, -26, 9, -26, IRON[3]); c.line(-9, -25.5, 9, -25.5, IRON[0])
c.line(-9, 0.5, 9, 0.5, IRON[1])
c.line(0, -26, 0, -30, IRON[2])              # the chain it hangs from
for i in range(4): c.rect(-0.5, -30 - i * 0.8, 1, 0.5, IRON[3 if i % 2 else 1])
meta["captive"] = c.save("captive")

# the errand's objects read a little larger than the world grain, so they are found
for k in ('relic_book', 'captive'):
    meta[k]['hr'] = 1.4
json.dump(meta, open(os.path.join(HERE, 'objects.json'), 'w'), indent=1)
print(json.dumps(meta, indent=1))
