"""The Shrine Keeper's hand pass, drawn on every rendered frame by its part mask (tools/paintover/kit.py), in the
manner of Derek's sheets (docs/concepts/shrine_keeper):
- the veil: long torn strips hanging down it, lighter along their ridges, the gaps dark;
- the robe: hanging folds, a dusty lilac sheen on the ridges, the hem ragged, darker and stained violet;
- the rope: twisted, a light strand and a dark strand alternating along each coil;
- the plates: lit upper-left edges, worn chips, the laces;
- the jars: script brushed round each, a highlight where the light strikes the clay;
- the paper: crisp lit edges, a fold shadow;
- the straw hat: the weave catching light.

  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_keeper.py --preview OUT.png
  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_keeper.py --apply     # every frame, then export-game
"""
import os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import Frame, axes, edges, hashp, parts_of, rim, run, ROOT  # noqa: E402

CHAR = os.environ.get('KEEPER_CHAR', r'C:/Users/derek/PixelForge Projects/godmarrow/characters/keeper_hd')
SHAPES = os.path.join(ROOT, 'tools', 'pixelforge', 'assets', 'shapes', 'characters', 'keeper_hd.shapes.json')
ID, MAT = parts_of(SHAPES)
BY = lambda *mats: [i for i, m in MAT.items() if m in mats]
VEIL, ROBE, ROPE, PLATE, CLAY, PAPER, STRAW = BY('veil'), BY('robe'), BY('rope'), BY('plate'), BY('clay'), BY('paper'), BY('straw')
LILAC = np.array([150.0, 120.0, 160.0])
STAIN = np.array([70.0, 28.0, 96.0])
CHIP = np.array([128.0, 112.0, 136.0])


def hanging(f, ids, period, lit, dark, sheen=None, w=0.2):
    for i in ids:
        m = f.mask([i])
        if m.sum() < 20:
            continue
        c, u, n, S, T = axes(m)
        q = T + 1.8 * np.sin(S * 0.11 + i) + 1.2 * np.sin(T * 0.37 + i * 2)
        ph = np.floor(q) % period
        f.mul(m & (ph == 0), dark)
        f.mul(m & (ph == 1), (1 + dark) / 2)
        if sheen is not None:
            f.set(m & (ph == period // 2), sheen, w)
        else:
            f.mul(m & (ph == period // 2), lit)


def veil(f):
    """the veil hangs: its strips run straight down the screen, wavering a little"""
    m = f.mask(VEIL)
    if not m.any():
        return
    q = f.xx * 0.5 + 0.8 * np.sin(f.yy * 0.15) + hashp(f.xx // 3, 0, 5) * 1.5
    ph = np.floor(q) % 4
    f.mul(m & (ph == 0), 0.62)
    f.mul(m & (ph == 2), 1.25)


def hem(f, ids, col, depth=4, w=0.5):
    for i in ids:
        m = f.mask([i])
        if m.sum() < 20:
            continue
        ys, xs = np.nonzero(m)
        bottom = {}
        for y, x in zip(ys, xs):
            bottom[x] = max(bottom.get(x, -1), y)
        for x, y in bottom.items():
            k = int(hashp(x, 0, i) * depth)
            for dy in range(0, 1 + k):
                f.px(x, y - dy, col, w * (1 - dy / (depth + 1)), [i])


def rope(f):
    for i in ROPE:
        m = f.mask([i])
        if m.sum() < 4:
            continue
        c, u, n, S, T = axes(m)
        ph = np.floor(S * 0.7 + T * 1.4) % 3                # the twist: strands slanting along the coil
        f.mul(m & (ph == 0), 1.35)
        f.mul(m & (ph == 2), 0.62)


def plates(f):
    for i in PLATE:
        m = f.mask([i])
        if m.sum() < 6:
            continue
        rim(f, m, 1.3, 0.7)
        up, left, down, right = edges(m)
        f.set((up | left) & (hashp(f.xx, f.yy, i) < 0.2), CHIP, 0.5)


def jars(f):
    for i in CLAY:
        m = f.mask([i])
        if m.sum() < 6:
            continue
        c, u, n, S, T = axes(m)
        up, left, down, right = edges(m)
        f.mul(up | left, 1.3)
        f.mul(down | right, 0.65)
        # brushed script: short dark strokes in a band round the middle
        band = m & (np.abs(S) < 2.5) & ~(up | left | down | right)
        f.mul(band & (hashp(f.xx // 1, f.yy // 2, i) < 0.4), 0.55)


def paper(f):
    for i in PAPER:
        m = f.mask([i])
        if not m.any():
            continue
        up, left, down, right = edges(m)
        f.mul(up | left, 1.25)
        f.mul(down | right, 0.7)


def straw(f):
    for i in STRAW:
        m = f.mask([i])
        if m.any():
            f.mul(m & ((f.xx * 2 + f.yy) % 5 == 0), 1.25)
            f.mul(m & ((f.xx * 2 + f.yy) % 5 == 2), 0.8)


def paint(rgba, parts, view):
    f = Frame(rgba, parts, view)
    hanging(f, ROBE, 9, 1.18, 0.6, sheen=LILAC, w=0.12)
    veil(f)
    hem(f, ROBE, STAIN, 6, 0.45)
    hem(f, VEIL, (20, 14, 24), 3, 0.5)
    rope(f)
    plates(f)
    jars(f)
    paper(f)
    straw(f)
    return f.image()


if __name__ == '__main__':
    run(paint, CHAR)
