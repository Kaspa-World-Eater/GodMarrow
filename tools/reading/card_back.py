"""The back of every card in the Reading (art/reading/cards/_back.png, 54 x 84, drawn x3 by ui/reading.gd).

Derek, 2026-10-09: "make the backs look cooler and more esoteric, representing the lore somehow". From the bible's sky
(mythology/02, "The sky"): the grandmothers say coins were laid on the dead god's eyes, the pale moon and the tarnished
one, and the sun is the third eye that would not close; the Crone's people say every thread passes through the Eye,
the hole in her needle. So the back is a card of tanned hide (the Hide), stitched round its edge with bone thread, nine
tally notches down each long side (the Order's count); worn gilt threads run in from the edge and all pass through one
eye at the centre whose pupil is a hole, with a pale light bleeding round it; above it the pale coin, below it the
tarnished one. Point-symmetric but for the two coins, so the back says little about which way up a card lies.

  python tools/reading/card_back.py [PREVIEW.png]
"""
import os
import sys
import math
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H = 54, 84
CX, CY = (W - 1) / 2.0, (H - 1) / 2.0
RING = 14.0

HIDE = [(18, 10, 10), (27, 15, 13), (36, 21, 17), (46, 28, 21)]       # the tanned field, dark to light
GILT = [(74, 54, 26), (122, 92, 44), (176, 138, 70), (222, 190, 120)]  # worn gold leaf
BONE = [(96, 84, 66), (168, 154, 126), (216, 205, 178)]
SILVER = [(74, 54, 26), (150, 116, 58), (206, 172, 104)]                  # the pale coin, in the card's own gilt
TARN = [(27, 15, 13), (58, 40, 22), (96, 72, 36)]                           # the tarnished coin: gilt gone dark into the hide
LIGHT = [(122, 104, 72), (214, 196, 150), (246, 236, 206)]
VOID = (5, 3, 4)


def h2(x, y, s=0):
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def build():
    img = np.zeros((H, W, 3), np.uint8)
    # the hide: a mottled field, darker toward the edge (worn by hands), each pixel a step of the ramp
    for y in range(H):
        for x in range(W):
            m = 0.55 * h2(x // 3, y // 3, 1) + 0.3 * h2(x // 2, y // 2, 2) + 0.15 * h2(x, y, 3)
            r = math.hypot((x - CX) / (W / 2), (y - CY) / (H / 2))
            v = m * 0.9 + 0.55 - 0.45 * r
            img[y, x] = HIDE[int(np.clip(v * 3.2, 0, 3))]

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            img[y, x] = c

    # the threads: gilt lines from points along the edge, each running straight into the eye's pupil, worn: dotted
    # where the gold has rubbed away, brighter near the centre where they gather
    ex, ey = CX, CY
    starts = []
    for k in range(9):
        t = (k + 0.5) / 9.0
        starts += [(4 + t * (W - 9), 4), (4 + t * (W - 9), H - 5)]
    for k in range(5):
        t = (k + 0.5) / 5.0
        starts += [(4, 12 + t * (H - 25)), (W - 5, 12 + t * (H - 25))]
    for sx, sy in starts:
        L = math.hypot(ex - sx, ey - sy)
        for i in range(int(L * 1.6)):
            u = i / (L * 1.6)
            x, y = sx + (ex - sx) * u, sy + (ey - sy) * u
            if math.hypot(x - CX, y - CY) < RING + 1.0:
                break
            xi, yi = int(round(x)), int(round(y))
            if h2(xi, yi, 9) < 0.18 + 0.25 * (1 - u):                 # rubbed away, more at the edge
                continue
            put(xi, yi, GILT[1] if u > 0.55 else GILT[0])

    # the ring: the Eye every thread passes through; inside it the hide darkens a step, and nine gilt studs are set in it
    # (the count), the uppermost brightest
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - CX, y - CY)
            if d < RING - 0.5:
                c = img[y, x]
                k = max(0, [tuple(h) for h in HIDE].index(tuple(c)) - 1) if tuple(c) in [tuple(h) for h in HIDE] else 0
                img[y, x] = HIDE[k]
            elif d < RING + 0.5:
                img[y, x] = GILT[1] if (x + y) % 3 else GILT[0]
    for k in range(9):
        a = -math.pi / 2 + k * 2 * math.pi / 9
        x, y = int(round(CX + math.cos(a) * RING)), int(round(CY + math.sin(a) * RING))
        put(x, y, GILT[3] if k == 0 else GILT[2])

    # the eye: an almond of bone round a clouded white, the pupil a hole with the light bleeding round it
    for y in range(H):
        for x in range(W):
            dx, dy = (x - CX) / 9.0, (y - CY)
            half = 5.2 * max(0.0, 1.0 - dx * dx) ** 0.9                  # the almond's half height at this column
            if abs(dx) <= 1.0 and abs(dy) <= half + 0.5:
                edge = abs(abs(dy) - half) < 0.75 or abs(dx) > 0.93
                if edge:
                    put(x, y, GILT[2] if dy < 0 else GILT[1])
                else:
                    rr = math.hypot(x - CX, (y - CY) * 1.05)
                    if rr < 2.6:
                        put(x, y, VOID)                                    # the hole
                    elif rr < 3.5:
                        put(x, y, LIGHT[2] if (x + y) % 2 == 0 else LIGHT[1])   # the light bleeding round it
                    elif rr < 4.4:
                        put(x, y, BONE[1] if h2(x, y, 5) > 0.3 else BONE[0])    # the clouded white
                    else:
                        put(x, y, BONE[2] if dy < 0 else BONE[1])
    # rays of the bleeding light, thin, between the threads, out past the almond (the sun is a hole)
    for k in range(12):
        a = k * math.pi / 6 + math.pi / 12
        for i in range(10, 13):
            x, y = CX + math.cos(a) * i * 0.95, CY + math.sin(a) * i * 0.75
            if (i + k) % 2 == 0:
                put(int(round(x)), int(round(y)), LIGHT[0])

    # the two coins on the axis: the pale above, the tarnished below, a bite out of the pale where the dark crosses it
    def coin(cy, ramp, bite):
        for y in range(H):
            for x in range(W):
                d = math.hypot(x - CX, y - cy)
                if d <= 5.0:
                    if bite and math.hypot(x - (CX + 3.4), y - (cy - 2.6)) < 3.0:
                        continue
                    if d > 4.1:
                        put(x, y, ramp[0])                                 # the rim
                    else:
                        lit = (CX - x) + (cy - y)                          # lit from the upper left
                        put(x, y, ramp[2] if lit > 2.5 else ramp[1] if lit > -2.0 else ramp[0])
        # the coin's mark: a ring and a dot, worn
        for a in range(16):
            t = a * math.pi / 8
            if a % 3:
                put(int(round(CX + math.cos(t) * 2.6)), int(round(cy + math.sin(t) * 2.6)), ramp[0])
        put(int(CX), int(cy), ramp[0])
    coin(CY - 24, SILVER, True)
    coin(CY + 24, TARN, False)

    # the border: a stitched seam of bone thread just inside a dark edge, nine tally notches down each long side
    for x in range(W):
        for y in (0, H - 1):
            put(x, y, VOID)
    for y in range(H):
        for x in (0, W - 1):
            put(x, y, VOID)
    for x in range(1, W - 1):
        for y in (1, H - 2):
            put(x, y, HIDE[0])
    for y in range(1, H - 1):
        for x in (1, W - 2):
            put(x, y, HIDE[0])
    for x in range(3, W - 3):
        if x % 3 != 0:
            put(x, 2, BONE[0])
            put(x, H - 3, BONE[0])
    for y in range(3, H - 3):
        if y % 3 != 0:
            put(2, y, BONE[0])
            put(W - 3, y, BONE[0])
    for k in range(9):
        y = int(round(14 + k * (H - 29) / 8.0))
        for x in (3, 4):
            put(x, y, GILT[1])
            put(W - 1 - x, H - 1 - y, GILT[1])
    # bone studs at the corners
    for (x, y) in ((3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)):
        put(x, y, BONE[2])
    return Image.fromarray(img, "RGB").convert("RGBA")


if __name__ == "__main__":
    im = build()
    out = os.path.join(ROOT, "art", "reading", "cards", "_back.png")
    im.save(out)
    print("wrote", out)
    if len(sys.argv) > 1:
        im.resize((W * 6, H * 6), Image.NEAREST).save(sys.argv[1])
