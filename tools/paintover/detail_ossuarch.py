"""The Ossuarch's hand pass, drawn on every rendered frame by its part mask (tools/paintover/kit.py), in the manner of
Derek's painting (docs/concepts/ossuarch/ossuarch_009202c4_2.png):
- the iron: its upper-left edges lit and its lower-right in shadow; bright chips worn along the edges; the pale dust
  settled where each plate tucks under the one above it;
- the cloth: long hanging folds, a teal sheen on the ridges, the hem ragged and darker;
- the bone: a bright point where the light strikes each charm, a shadow under it;
- the plume: a brighter core and flickering edges;
- the mail: a glint on every other ring.

  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_ossuarch.py --preview OUT.png
  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_ossuarch.py --apply     # every frame, then export-game
"""
import os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import Frame, axes, edges, hashp, parts_of, rim, run, ROOT  # noqa: E402

CHAR = os.environ.get('OSS_CHAR', r'C:/Users/derek/PixelForge Projects/godmarrow/characters/ossuarch')
SHAPES = os.path.join(ROOT, 'tools', 'pixelforge', 'assets', 'shapes', 'characters', 'ossuarch.shapes.json')
ID, MAT = parts_of(SHAPES)

IRON = [i for i, m in MAT.items() if m in ('iron', 'ironw')]
CLOTH = [i for i, m in MAT.items() if m == 'cloth']
BONE = [i for i, m in MAT.items() if m == 'bone']
PLUME = [i for i, m in MAT.items() if m == 'plume']
MAIL = [i for i, m in MAT.items() if m == 'mail']
DUST = np.array([118.0, 110.0, 100.0])
TEAL = np.array([58.0, 104.0, 90.0])
CHIP = np.array([150.0, 136.0, 128.0])


def iron(f):
    for i in IRON:
        m = f.mask([i])
        if m.sum() < 6:
            continue
        rim(f, m, 1.3, 0.7)
        up, left, down, right = edges(m)
        h = hashp(f.xx, f.yy, i)
        # worn chips along the lit edges: a few bright warm-grey pixels
        f.set((up | left) & (h < 0.18), CHIP, 0.55)
        # dust where this plate meets the one above it (its top edge, inside another part's outline)
        above_other = up & (np.roll(f.p, 1, 0) != f.p) & np.roll(f.solid, 1, 0)
        f.set(above_other & (h > 0.35), DUST, 0.32)
        # grime: faint dark blotches inside the plate
        inner = m & ~(up | left | down | right)
        f.mul(inner & (hashp(f.xx // 2, f.yy // 2, i + 7) < 0.12), 0.78)


def cloth(f):
    for i in CLOTH:
        m = f.mask([i])
        if m.sum() < 20:
            continue
        c, u, n, S, T = axes(m)
        q = T + 2.2 * np.sin(S * 0.09 + i) + 1.4 * np.sin(T * 0.31 + i * 2)
        ph = np.floor(q) % 10
        f.mul(m & (ph == 0), 0.6)                       # the deep of each fold
        f.mul(m & (ph == 1), 0.82)
        f.set(m & (ph == 4), TEAL, 0.22)                # a teal sheen along each ridge
        # the hem: the lowest pixels of each column ragged and darker
        ys, xs = np.nonzero(m)
        bottom = {}
        for y, x in zip(ys, xs):
            bottom[x] = max(bottom.get(x, -1), y)
        for x, y in bottom.items():
            k = int(hashp(x, 0, i) * 4)
            for dy in range(0, 1 + k):
                f.px(x, y - dy, (8, 12, 11), 0.5, [i])


def bone(f):
    for i in BONE:
        m = f.mask([i])
        if not m.any():
            continue
        up, left, down, right = edges(m)
        f.mul(up | left, 1.18)
        f.mul((down | right) & ~(up | left), 0.62)
    # the shadow each bone throws on what is behind it: one pixel down and right
    allb = f.mask(BONE)
    sh = np.roll(np.roll(allb, 1, 0), 1, 1) & ~allb & f.solid
    f.mul(sh, 0.55)


def plume(f):
    m = f.mask(PLUME)
    if not m.any():
        return
    up, left, down, right = edges(m)
    core = m & ~(up | left | down | right)
    core2 = core & ~edges(core)[0] & ~edges(core)[1] & ~edges(core)[2] & ~edges(core)[3]
    f.mul(core2, 1.16)
    h = hashp(f.xx, f.yy, 99)
    f.mul((up | left | right) & (h < 0.3), 0.75)        # the flickering edge


def mail(f):
    m = f.mask(MAIL)
    if m.any():
        f.mul(m & ((f.xx + f.yy) % 2 == 0), 1.35)
        f.mul(m & ((f.xx + f.yy) % 4 == 1), 0.7)


def paint(rgba, parts, view):
    f = Frame(rgba, parts, view)
    mail(f)
    iron(f)
    cloth(f)
    bone(f)
    plume(f)
    return f.image()


if __name__ == '__main__':
    run(paint, CHAR)
