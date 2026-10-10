"""The faces of the Reading's cards (art/reading/cards/m_<id>.png, a_<aspect>.png; 54 x 84, drawn x3 by ui/reading.gd).

Derek, 2026-10-09: "Fix the front of the cards and have each art represent an archetype/mantle/aspect". The deck is the
bible's twenty-two mantles (mythology/07-who-is-who.md, "Mantles"), numbered 0 to XXI like a major arcana, and the five
callings' cards, one for each aspect (Bone, Soul, Flesh, Breath, the Silence). Every face is cut from the same hide as
the back (tools/reading/card_back.py): a stitched edge, a gilt arch for a window, the card's number cut into the hide
above it, its aspect's small sigil in the plate below, and in the window the mantle itself, drawn in worn gilt and bone
on the dark, lit from the upper left.

  python tools/reading/card_fronts.py [SHEET.png]
"""
import os
import sys
import math
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import card_back as CB                                                  # noqa: E402

ROOT = CB.ROOT
W, H = 54, 84
HIDE, GILT, BONE, LIGHT, VOID = CB.HIDE, CB.GILT, CB.BONE, CB.LIGHT, CB.VOID
BLOOD = [(46, 8, 10), (88, 16, 18), (128, 34, 30)]
WIN = (8, 14, 45, 64)                                                   # the arch's window: x0, y0, x1, y1


class C:
    """a card being cut: pixel tools on a 54 x 84 field"""
    def __init__(self):
        self.a = np.zeros((H, W, 3), np.uint8)

    def put(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if WIN[0] <= x <= WIN[2] and WIN[1] <= y <= WIN[3] or getattr(self, "free", False):
            if 0 <= x < W and 0 <= y < H:
                self.a[y, x] = c

    def line(self, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            u = i / max(n, 1)
            x, y = x0 + (x1 - x0) * u, y0 + (y1 - y0) * u
            for ox in range(w):
                for oy in range(w):
                    self.put(x + ox - (w - 1) / 2, y + oy - (w - 1) / 2, c)

    def ring(self, cx, cy, r, c, ry=None, a0=0.0, a1=2 * math.pi):
        ry = r if ry is None else ry
        n = int(8 * max(r, ry)) + 8
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            self.put(cx + math.cos(a) * r, cy + math.sin(a) * ry, c)

    def disc(self, cx, cy, r, c, ry=None, lit=None):
        ry = r if ry is None else ry
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - r - 1), int(cx + r + 2)):
                d = ((x - cx) / max(r, 0.5)) ** 2 + ((y - cy) / max(ry, 0.5)) ** 2
                if d <= 1.0:
                    if lit is not None and (x - cx) + (y - cy) < -0.6 * (r + ry) * 0.5:
                        self.put(x, y, lit)
                    else:
                        self.put(x, y, c)

    def poly(self, pts, c):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                if _inside(x + 0.5, y + 0.5, pts):
                    self.put(x, y, c)

    def outline(self, pts, c, close=True):
        for i in range(len(pts) - (0 if close else 1)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            self.line(a[0], a[1], b[0], b[1], c)


def _inside(x, y, pts):
    n, j, ins = len(pts), len(pts) - 1, False
    for i in range(n):
        xi, yi = pts[i]
        xj, yj = pts[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi:
            ins = not ins
        j = i
    return ins


def frame(c, num, aspect):
    """the hide, the stitched edge, the arch window, the number above, the aspect's sigil below"""
    a = c.a
    for y in range(H):
        for x in range(W):
            m = 0.55 * CB.h2(x // 3, y // 3, 11) + 0.3 * CB.h2(x // 2, y // 2, 12) + 0.15 * CB.h2(x, y, 13)
            r = math.hypot((x - 26.5) / 27, (y - 41.5) / 42)
            a[y, x] = HIDE[int(np.clip((m * 0.9 + 0.55 - 0.45 * r) * 3.2, 0, 3))]
    c.free = True
    # the window: darker hide inside an arch of gilt
    x0, y0, x1, y1 = WIN
    cx = (x0 + x1) / 2
    for y in range(y0 - 6, y1 + 1):
        for x in range(x0, x1 + 1):
            top = y0 + 4 - math.sqrt(max(0.0, (x1 - x0) ** 2 / 4 - (x - cx) ** 2)) * 0.62
            if y >= top:
                a[y, x] = HIDE[0] if CB.h2(x, y, 14) < 0.7 else HIDE[1]
    for x in range(x0 - 1, x1 + 2):
        top = y0 + 4 - math.sqrt(max(0.0, (x1 - x0 + 2) ** 2 / 4 - (x - cx) ** 2)) * 0.62
        c.put(x, round(top) - 1, GILT[2] if x < cx else GILT[1])
    for y in range(y0 - 1, y1 + 2):
        c.put(x0 - 1, y, GILT[2])
        c.put(x1 + 1, y, GILT[1])
    for x in range(x0 - 1, x1 + 2):
        c.put(x, y1 + 1, GILT[1])
    # the plate below and its sigil
    for x in range(x0 + 6, x1 - 5):
        c.put(x, 70, GILT[0])
        c.put(x, 78, GILT[0])
    sigil(c, 26.5, 74, aspect)
    # the number, cut in tally strokes of the old numerals above the arch
    numeral(c, num, 26.5, 4)
    # the stitched seam and the dark edge, as on the back
    for x in range(W):
        a[0, x] = a[H - 1, x] = VOID
    for y in range(H):
        a[y, 0] = a[y, W - 1] = VOID
    for x in range(3, W - 3):
        if x % 3:
            a[2, x] = a[H - 3, x] = BONE[0]
    for y in range(3, H - 3):
        if y % 3:
            a[y, 2] = a[y, W - 3] = BONE[0]
    for (x, y) in ((3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)):
        a[y, x] = BONE[2]
    c.free = False


ROMAN = {0: "", 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI",
         12: "XII", 13: "XIII", 14: "XIV", 15: "XV", 16: "XVI", 17: "XVII", 18: "XVIII", 19: "XIX", 20: "XX", 21: "XXI"}


def numeral(c, n, cx, y):
    """old numerals in strokes four pixels tall; nought is an empty ring (the Unwritten, the Silence)"""
    if n is None:
        return
    s = ROMAN.get(n, "")
    if not s:
        c.ring(cx, y + 2, 2.2, GILT[2])
        return
    widths = {"I": 2, "V": 4, "X": 4}
    tot = sum(widths[ch] for ch in s) - 1
    x = cx - tot / 2
    for ch in s:
        if ch == "I":
            c.line(x, y, x, y + 4, GILT[2])
        elif ch == "V":
            c.line(x, y, x + 1.5, y + 4, GILT[2])
            c.line(x + 3, y, x + 1.5, y + 4, GILT[2])
        elif ch == "X":
            c.line(x, y, x + 3, y + 4, GILT[2])
            c.line(x + 3, y, x, y + 4, GILT[2])
        x += widths[ch]


def sigil(c, cx, cy, aspect):
    g = GILT[2]
    if aspect == "bone":            # the upright spine
        for k in range(-2, 3):
            c.line(cx - 1, cy + k * 1.2, cx + 1, cy + k * 1.2, g)
        c.line(cx, cy - 3, cx, cy + 3, GILT[1])
    elif aspect == "soul":          # the needle's eye
        c.ring(cx, cy, 1.5, g, ry=3.0)
        c.put(cx, cy, VOID)
    elif aspect == "flesh":         # the drop
        c.disc(cx, cy + 1, 1.8, BLOOD[2])
        c.line(cx, cy - 3, cx, cy - 1, BLOOD[2])
    elif aspect == "breath":        # the breath going out, a turning
        c.ring(cx, cy, 2.6, g, a0=0.3, a1=5.5)
        c.ring(cx + 0.6, cy, 1.2, g, a0=3.0, a1=8.0)
    else:                           # the Silence: a gap in a ring
        c.ring(cx, cy, 2.6, g, a0=0.9, a1=5.4)


# ---------------------------------------------------------------- the emblems (cx 26.5, the window 8..45 x 14..64)

X0 = 26.5


def hands(c):          # the Gravedigger's Hands: two hands on a spade's haft over a mound
    c.poly([(10, 62), (16, 55), (26, 52), (37, 55), (44, 62)], HIDE[3])
    c.outline([(10, 62), (16, 55), (26, 52), (37, 55), (44, 62)], GILT[1], close=False)
    c.line(X0, 20, X0, 54, GILT[2], 2)
    c.poly([(X0 - 4, 52), (X0 + 4, 52), (X0 + 3, 60), (X0, 62), (X0 - 3, 60)], GILT[1])
    for side, y in ((-1, 26), (1, 34)):
        hx = X0 + side * 2
        c.disc(hx + side * 3, y + 2, 3.2, BONE[1], ry=2.6, lit=BONE[2])
        for k in range(4):
            c.line(hx - side * 1, y + k * 1.4, hx + side * 5, y + k * 1.4 + 0.5, BONE[0])
        c.line(hx + side * 4, y + 3, hx + side * 9, y + 9, BONE[1], 2)


def veil(c):           # the Singed Veil: a moth at a flame, its wings burnt through
    c.line(X0, 50, X0, 58, BONE[1], 2)
    c.disc(X0, 46, 1.6, LIGHT[2], ry=3.2)
    c.disc(X0, 47, 0.8, LIGHT[1])
    for side in (-1, 1):
        c.poly([(X0 + side * 1, 30), (X0 + side * 13, 22), (X0 + side * 15, 30), (X0 + side * 3, 34)], BONE[1])
        c.poly([(X0 + side * 1, 34), (X0 + side * 11, 38), (X0 + side * 8, 42), (X0 + side * 2, 37)], BONE[0])
        c.disc(X0 + side * 10, 28, 1.6, VOID)
        c.disc(X0 + side * 7, 38, 1.2, VOID)
        c.line(X0 + side * 1, 30, X0 + side * 13, 22, GILT[2])
    c.line(X0, 27, X0, 37, GILT[2], 2)
    c.line(X0, 27, X0 - 3, 23, GILT[1])
    c.line(X0, 27, X0 + 3, 23, GILT[1])


def swaddling(c):      # the Swaddling: a bound bundle, the cords crossing
    c.disc(X0, 40, 7, BONE[1], ry=17, lit=BONE[2])
    c.disc(X0, 25, 4, HIDE[0], ry=3.5)
    c.disc(X0 + 0.5, 25.5, 2.4, BONE[0], ry=2.2)
    for k in range(5):
        y = 30 + k * 5
        c.line(X0 - 7, y, X0 + 7, y + 3, GILT[1])
    c.line(X0 - 7, 56, X0 + 7, 30, GILT[0])


def gleaner(c):        # the Gleaner: the scythe, its blade a crescent of bone
    c.line(16, 60, 34, 18, BONE[1], 2)
    c.ring(28, 26, 13, GILT[2], ry=7, a0=math.pi * 1.05, a1=math.pi * 1.9)
    c.ring(28, 27, 11, GILT[1], ry=5, a0=math.pi * 1.1, a1=math.pi * 1.85)
    c.line(21, 44, 27, 46, BONE[2], 2)
    for k in range(3):
        c.line(36 + k * 2, 58, 37 + k * 2, 48 - k, GILT[0])


def saint(c):          # the Weeping Saint: a face in the iron's opening, tears of blood
    c.poly([(X0 - 11, 60), (X0 - 11, 26), (X0, 17), (X0 + 11, 26), (X0 + 11, 60)], HIDE[3])
    c.outline([(X0 - 11, 60), (X0 - 11, 26), (X0, 17), (X0 + 11, 26), (X0 + 11, 60)], GILT[1])
    c.disc(X0, 36, 6, BONE[1], ry=8, lit=BONE[2])
    for side in (-1, 1):
        c.line(X0 + side * 2.5, 34, X0 + side * 3.5, 34, VOID)
        c.line(X0 + side * 3, 35, X0 + side * 3, 47, BLOOD[2])
    c.line(X0 - 1.5, 41, X0 + 1.5, 41, BONE[0])
    for k in range(6):
        c.put(X0 - 9, 30 + k * 5, GILT[2])
        c.put(X0 + 9, 30 + k * 5, GILT[2])


def scholar(c):        # the Scholar's Eye: an open book with an eye on its pages
    c.poly([(10, 50), (X0, 54), (X0, 38), (10, 34)], BONE[1])
    c.poly([(X0, 54), (43, 50), (43, 34), (X0, 38)], BONE[0])
    c.line(X0, 38, X0, 54, GILT[1])
    for k in range(4):
        c.line(13, 40 + k * 3, 23, 43 + k * 3, HIDE[2])
        c.line(30, 43 + k * 3, 40, 40 + k * 3, HIDE[2])
    c.ring(X0, 26, 7, GILT[2], ry=3.5)
    c.disc(X0, 26, 2.4, VOID)
    c.put(X0 - 1, 25, LIGHT[2])


def twin(c):           # the Hanged Twin: a figure hanging head down, its twin standing in the water a breath behind
    def fig(top, d, lit):
        c.disc(X0, top + d * 4, 3.4, lit, ry=3.6)
        c.poly([(X0 - 3, top + d * 8), (X0 + 3, top + d * 8), (X0 + 4, top + d * 18), (X0 - 4, top + d * 18)], BONE[0])
        c.line(X0 - 3, top + d * 8, X0 - 3, top + d * 18, lit)
        c.line(X0 - 6, top + d * 11, X0 + 6, top + d * 11, BONE[1])
    c.line(X0, 15, X0, 17, GILT[2])
    fig(17, 1, BONE[2])
    c.line(9, 39, 44, 39, GILT[2])
    for x in range(10, 44, 3):
        c.put(x, 41, GILT[0])
    fig(61, -1, BONE[1])


def mouths(c):         # the Knot of Mouths: open mouths knotted round one another
    for k, (x, y, r) in enumerate(((X0, 28, 6), (X0 - 7, 42, 5), (X0 + 7, 42, 5), (X0, 54, 4))):
        c.disc(x, y, r, BLOOD[1], ry=r * 0.55)
        c.disc(x, y, r - 1.5, VOID, ry=r * 0.3)
        c.ring(x, y, r, BONE[1], ry=r * 0.55)
        for t in range(-2, 3):
            c.put(x + t * 1.6, y - r * 0.35, BONE[2])
    c.ring(X0, 41, 13, GILT[1], ry=17)


def wick(c):           # the Wick: a candle burning down, the soul in its light
    c.poly([(X0 - 5, 62), (X0 - 5, 40), (X0 + 5, 40), (X0 + 5, 62)], BONE[1])
    c.line(X0 - 5, 40, X0 - 5, 62, BONE[2])
    c.poly([(X0 + 2, 40), (X0 + 4, 40), (X0 + 4, 48), (X0 + 3, 50)], BONE[0])
    c.line(X0, 36, X0, 40, VOID)
    c.disc(X0, 31, 2.4, LIGHT[2], ry=5.5)
    c.disc(X0, 32, 1.1, LIGHT[1], ry=2.5)
    c.ring(X0, 31, 10, GILT[0], ry=11, a0=3.6, a1=5.9)


def pilgrim(c):        # the Pilgrim: a hooded walker with a staff, small under the arch
    c.poly([(X0 - 2, 26), (X0 + 4, 27), (X0 + 7, 56), (X0 - 6, 56)], BONE[0])
    c.poly([(X0 - 1, 22), (X0 + 4, 24), (X0 + 4, 30), (X0 - 2, 30)], BONE[1])
    c.disc(X0 + 1.5, 27, 1.4, VOID)
    c.line(X0 - 8, 20, X0 - 11, 60, GILT[2], 2)
    c.line(X0 - 7, 34, X0 - 2, 36, BONE[1])
    c.line(10, 60, 44, 60, GILT[0])
    for k in range(4):
        c.put(X0 + 8 + k * 3, 59 - k, GILT[1])


def mourner(c):        # the Mourner: long hair falling, cut through by the shears
    c.disc(X0, 24, 4.5, BONE[1], ry=5, lit=BONE[2])
    for k in range(-4, 5):
        c.line(X0 + k * 1.1, 27, X0 + k * 1.6, 56 - abs(k), GILT[1] if k % 2 else GILT[0])
    c.line(X0 - 9, 44, X0 + 9, 40, BONE[2])
    c.line(X0 - 9, 40, X0 + 9, 44, BONE[2])
    c.ring(X0 - 10, 44, 1.6, BONE[2])
    c.ring(X0 - 10, 40, 1.6, BONE[2])
    for k in range(5):
        c.put(X0 - 6 + k * 3, 60 + (k % 2), GILT[1])


def key(c):            # the Ossuary Key: a key of bone, its bow a skull's ring, nine notches on the bit
    c.ring(X0, 24, 6, BONE[1])
    c.ring(X0, 24, 5, BONE[2], a0=3.2, a1=4.8)
    c.disc(X0, 24, 2.5, VOID)
    c.line(X0, 30, X0, 58, BONE[1], 2)
    for k in range(9):
        c.line(X0 + 1, 44 + k * 1.6, X0 + 3 + (k % 3), 44 + k * 1.6, BONE[0] if k % 2 else BONE[2])


def cup(c):            # the Beggar's Cup: an empty bowl held up in two hands, asking at the door
    c.outline([(11, 64), (11, 24), (X0, 17), (42, 24), (42, 64)], GILT[0])
    c.poly([(X0 - 10, 34), (X0 + 10, 34), (X0 + 7, 43), (X0 - 7, 43)], BONE[1])
    c.line(X0 - 10, 34, X0 - 7, 43, BONE[2])
    c.disc(X0, 34, 10, BONE[2], ry=2.2)
    c.disc(X0, 34, 8, VOID, ry=1.3)
    for side in (-1, 1):
        c.disc(X0 + side * 8, 44, 3.2, BONE[0], ry=2.4, lit=BONE[1])
        c.line(X0 + side * 9, 46, X0 + side * 12, 62, BONE[0], 3)


def bell(c):           # the Drowned Bell: a bell under the lines of the water, still ringing
    for k in range(3):
        y = 20 + k * 3
        for x in range(10, 44):
            if (x + k * 2) % 5 < 3:
                c.put(x, y + (1 if (x // 5) % 2 else 0), GILT[0] if k else GILT[1])
    c.poly([(X0 - 3, 32), (X0 + 3, 32), (X0 + 6, 46), (X0 + 9, 52), (X0 - 9, 52), (X0 - 6, 46)], GILT[1])
    c.line(X0 - 3, 32, X0 - 9, 52, GILT[2])
    c.line(X0 - 9, 52, X0 + 9, 52, GILT[2])
    c.disc(X0, 55, 1.6, GILT[2])
    for r in (12, 15):
        c.ring(X0, 46, r, GILT[0], ry=r * 0.45, a0=0.2, a1=math.pi - 0.2)


def coin(c):           # the First Coin: one coin, worn, on an open palm
    c.disc(X0, 32, 9, GILT[1], lit=GILT[2])
    c.ring(X0, 32, 9, GILT[0])
    c.ring(X0, 32, 6, GILT[0])
    c.put(X0, 32, GILT[0])
    c.poly([(11, 52), (18, 46), (X0 + 10, 46), (43, 50), (40, 56), (14, 57)], BONE[1])
    for k in range(4):
        c.line(28 + k * 3, 46, 30 + k * 3, 42, BONE[0])


def kiln(c):           # the Kiln: a domed oven, fire in its mouth, what was given hardening in it
    c.disc(X0, 46, 14, HIDE[3], ry=18)
    c.ring(X0, 46, 14, GILT[1], ry=18, a0=math.pi, a1=2 * math.pi)
    c.line(X0 - 14, 46, X0 - 14, 62, GILT[1])
    c.line(X0 + 14, 46, X0 + 14, 62, GILT[1])
    c.disc(X0, 54, 6, VOID, ry=6)
    c.disc(X0, 57, 4, LIGHT[1], ry=3)
    c.disc(X0, 58, 2, LIGHT[2], ry=1.5)
    for k in range(3):
        c.line(X0 - 9 + k * 9, 36, X0 - 8 + k * 9, 40, GILT[0])


def loom(c):           # the Unravelling Loom: a frame of threads, the middle ones pulled loose
    c.line(12, 20, 41, 20, GILT[2], 2)
    c.line(12, 56, 41, 56, GILT[1], 2)
    for k in range(9):
        x = 14 + k * 3.2
        if 3 <= k <= 5:
            c.line(x, 21, x + (k - 4) * 4, 40, BONE[1])
            c.ring(x + (k - 4) * 6, 46, 2.5, BONE[0], a0=0.0, a1=5.0)
        else:
            c.line(x, 21, x, 55, BONE[1])
    c.disc(X0, 60, 1.5, GILT[2], ry=1)


def lantern(c):        # the Lantern-Wright: a lantern held up, a soul burning small in it
    c.line(X0, 16, X0, 22, GILT[1])
    c.ring(X0, 15, 2, GILT[1], a0=math.pi, a1=2 * math.pi)
    c.poly([(X0 - 7, 24), (X0 + 7, 24), (X0 + 6, 48), (X0 - 6, 48)], HIDE[0])
    c.outline([(X0 - 7, 24), (X0 + 7, 24), (X0 + 6, 48), (X0 - 6, 48)], GILT[2])
    c.line(X0, 24, X0, 48, GILT[0])
    c.disc(X0, 37, 2.4, LIGHT[2], ry=4.5)
    c.disc(X0, 38, 1, LIGHT[1], ry=2)
    c.line(X0 - 8, 22, X0 + 8, 22, GILT[2])
    c.line(X0 - 7, 50, X0 + 7, 50, GILT[1])
    for k in range(3):
        c.line(X0 - 4 + k * 4, 52, X0 - 5 + k * 4, 60, BONE[0])


def choir(c):          # the Drowned Choir: heads under the water's lines, mouths open on one held note
    for x in range(10, 44):
        if x % 4 < 3:
            c.put(x, 21, GILT[1])
            c.put(x + 1, 24, GILT[0])
    for k in range(3):
        x = 15 + k * 11.5
        y = 38 + (k % 2) * 6
        c.disc(x, y, 4.6, BONE[1], ry=5.6, lit=BONE[2])
        c.put(x - 1.6, y - 1.5, VOID)
        c.put(x + 1.6, y - 1.5, VOID)
        c.disc(x, y + 2.4, 1.4, VOID, ry=2.0)
        c.line(x - 3, y + 6, x - 4, y + 12, BONE[0])
        c.line(x + 3, y + 6, x + 4, y + 12, BONE[0])
    for x in range(11, 43, 5):
        c.put(x, 58, GILT[1])
        c.put(x + 2, 60, GILT[0])


def tithe(c):          # the Tithe: ten strokes, the tenth cut away
    for k in range(10):
        x = 12 + k * 3.3
        if k == 9:
            c.line(x, 26, x, 36, BLOOD[2])
            c.line(x + 1, 40, x - 1, 54, BLOOD[1])
        else:
            c.line(x, 26, x, 54, BONE[1] if k % 2 else BONE[2])
    c.line(10, 58, 44, 22, GILT[2])


def crown(c):          # the Hollow Crown: a crown with nothing in it, under the dark moon
    c.disc(X0, 22, 5, GILT[0], lit=GILT[1])
    c.disc(X0 + 2, 21, 4, HIDE[0])
    pts = [(12, 56), (12, 40), (17, 46), (21, 36), (X0, 44), (32, 36), (36, 46), (41, 40), (41, 56)]
    c.outline(pts, GILT[2])
    c.disc(X0, 56, 14.5, VOID, ry=2.5)
    c.line(12, 56, 41, 56, GILT[1])
    for x in (17, X0, 36):
        c.put(x, 50, BONE[2])


def unwritten(c):      # the Unwritten: a blank leaf and a pen held off it
    c.poly([(13, 24), (38, 22), (40, 58), (15, 60)], BONE[1])
    c.line(13, 24, 15, 60, BONE[2])
    c.poly([(36, 34), (44, 18), (45, 19), (38, 36)], GILT[1])
    c.line(37, 35, 35, 39, VOID)


# the callings' cards: the aspects themselves

def a_bone(c):         # the Standing Dead: a spine standing, ribs, a skull, nine vertebrae
    c.disc(X0, 22, 5, BONE[1], ry=5.5, lit=BONE[2])
    for side in (-1, 1):
        c.disc(X0 + side * 2, 22, 1.4, VOID)
    for k in range(9):
        c.line(X0 - 1.5, 30 + k * 3, X0 + 1.5, 30 + k * 3, BONE[2] if k % 2 else BONE[1], 2)
    for k in range(5):
        for side in (-1, 1):
            c.ring(X0 + side * 1, 34 + k * 3, 8 - k * 0.6, BONE[0], ry=2.5, a0=(math.pi * 0.0 if side > 0 else math.pi * 0.5), a1=(math.pi * 0.5 if side > 0 else math.pi))


def a_soul(c):         # the Veiled Crone: a veiled head, the needle, its eye a hole
    c.poly([(X0, 18), (X0 + 11, 32), (X0 + 13, 60), (X0 - 13, 60), (X0 - 11, 32)], BONE[0])
    c.outline([(X0, 18), (X0 + 11, 32), (X0 + 13, 60), (X0 - 13, 60), (X0 - 11, 32)], BONE[1])
    c.disc(X0, 34, 4.5, HIDE[0], ry=6)
    c.line(X0 + 16, 20, X0 + 8, 58, GILT[2])
    c.ring(X0 + 15.5, 23, 1.2, GILT[2], ry=2.2)
    for k in range(5):
        c.line(X0 + 15, 23, X0 - 10 + k * 3, 60, GILT[0])


def a_flesh(c):        # the Mother of the Wheel: a wheel of flesh, a drop at its hub
    c.ring(X0, 38, 14, BLOOD[2], ry=14)
    c.ring(X0, 38, 12, BLOOD[1], ry=12)
    for k in range(8):
        a = k * math.pi / 4
        c.line(X0, 38, X0 + math.cos(a) * 12, 38 + math.sin(a) * 12, BLOOD[1])
    c.disc(X0, 38, 3.4, BLOOD[2], lit=(160, 60, 52))


def a_breath(c):       # the Myriad: breath going out in a turning, small lights carried on it
    for r in (4, 7, 10, 13):
        c.ring(X0 + (r % 3) * 0.5, 38, r, GILT[1] if r % 2 else GILT[2], ry=r * 1.1, a0=0.4, a1=4.8 + r * 0.05)
    for (x, y) in ((14, 24), (39, 28), (17, 52), (37, 55), (X0, 18)):
        c.put(x, y, LIGHT[2])


def a_silence(c):      # the Silence: a ring with a gap, and the gap is everything
    c.disc(X0, 38, 13, VOID)
    c.ring(X0, 38, 13, GILT[2], a0=-1.2, a1=4.0)
    c.ring(X0, 38, 14, GILT[0], a0=-1.2, a1=4.0)


# id, number, aspect, painter (the order of mythology/07's table: 0 is the Unwritten, as the Fool is nought)
MANTLES = [
    ("unwritten", 0, "silence", unwritten), ("pilgrim", 1, "silence", pilgrim), ("digger", 2, "bone", hands),
    ("veil", 3, "soul", veil), ("swaddling", 4, "flesh", swaddling), ("gleaner", 5, "bone", gleaner),
    ("saint", 6, "flesh", saint), ("scholar", 7, "soul", scholar), ("hanged", 8, "soul", twin),
    ("knot", 9, "flesh", mouths), ("wick", 10, "breath", wick), ("mourner", 11, "flesh", mourner),
    ("key", 12, "bone", key), ("cup", 13, "bone", cup), ("bell", 14, "breath", bell), ("coin", 15, "silence", coin),
    ("kiln", 16, "flesh", kiln), ("loom", 17, "soul", loom), ("lanternwright", 18, "breath", lantern),
    ("choir", 19, "breath", choir), ("tithe", 20, "bone", tithe), ("crown", 21, "silence", crown),
]
ASPECTS = [("bone", a_bone), ("soul", a_soul), ("flesh", a_flesh), ("breath", a_breath), ("silence", a_silence)]


def make(paint, num, aspect):
    c = C()
    frame(c, num, aspect)
    paint(c)
    return Image.fromarray(c.a, "RGB").convert("RGBA")


if __name__ == "__main__":
    out = os.path.join(ROOT, "art", "reading", "cards")
    ims = []
    for mid, num, asp, fn in MANTLES:
        im = make(fn, num, asp)
        im.save(os.path.join(out, "m_%s.png" % mid))
        ims.append(im)
    for asp, fn in ASPECTS:
        im = make(fn, None, asp)
        im.save(os.path.join(out, "a_%s.png" % asp))
        ims.append(im)
    print("wrote %d faces" % len(ims))
    if len(sys.argv) > 1:
        cols = 9
        rows = (len(ims) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * (W + 4) * 3, rows * (H + 4) * 3), (8, 6, 8))
        for i, im in enumerate(ims):
            sheet.paste(im.resize((W * 3, H * 3), Image.NEAREST), ((i % cols) * (W + 4) * 3, (i // cols) * (H + 4) * 3))
        sheet.save(sys.argv[1])
