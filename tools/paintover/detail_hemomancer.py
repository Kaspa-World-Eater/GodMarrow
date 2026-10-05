"""Hand-placed detail on every frame of the Hemomancer, drawn on the PixelForge render before it is packed for the game.
Each frame comes with its part mask (frame_NNN.parts.png: which part of the shape file every pixel belongs to), so
each detail is drawn on its own part in its own place, frame by frame, and moves with the body: the face (brow, eye
sockets, the nose's ridge, cheekbones), the muscles of chest, belly and back, the light along every limb, the wraps
of the bandages and leg-cloth, the folds of the shawl and cape, the grain of the planks and their bleeding nail holes,
the lit edges of the iron, the strands of the locs. Then the finish of paint_hemomancer.py (form light, ink, drips).

  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_hemomancer.py --preview OUT.png
  tools/pixelforge/.venv/Scripts/python tools/paintover/detail_hemomancer.py --apply     # every frame, then export-game
The frames as rendered are kept in frames_raw/ beside frames/ (made by the first --apply; every run paints from them).
"""
import argparse, json, os, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paint_hemomancer as finish

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHAR = os.environ.get('HEMO_CHAR', r'C:/Users/derek/PixelForge Projects/godmarrow/characters/hemomancer_paint')
SHAPES = os.path.join(ROOT, 'tools', 'pixelforge', 'assets', 'shapes', 'characters', 'hemomancer.shapes.json')
INK = np.array([22.0, 12.0, 18.0])

sys.path.insert(0, os.path.join(ROOT, 'tools', 'pixelforge'))
from pixelforge.shapes import part_table  # noqa: E402

TABLE, _ = part_table(json.load(open(SHAPES)))
ID = {e['name']: e['index'] for e in TABLE}
MAT = {e['index']: e['material'] for e in TABLE}


def ids(*names):
    return [ID[n] for n in names if n in ID]


def ids_mat(*mats):
    return [i for i, m in MAT.items() if m in mats]


SKIN = ids('chest', 'waist', 'delt.L', 'delt.R', 'upper_arm.L', 'upper_arm.R', 'hand.L', 'hand.R', 'hand_s.L', 'hand_s.R', 'neck',
           'foot.L', 'foot.R', 'toe.L', 'toe.R', 'finger0.L', 'finger1.L', 'finger2.L', 'finger0.R', 'finger1.R', 'finger2.R')
CLOTH = ids('cowl', 'mantle', 'tabard', 'cape')
PLANK = ids('planks_L', 'planks_R', 'planks_back', 'shield')
WRAP = ids('thigh.L', 'thigh.R', 'shin.L', 'shin.R')
BAND = ids('forearm.L', 'forearm.R')
IRON = ids_mat('rustiron')
CHAIN = ids_mat('chain')
LOCS = ids('locs', 'locs_front', 'beard', 'hair_cap')


class Frame:
    def __init__(self, rgba, parts, view):
        self.a = rgba.astype(np.float64)
        self.p = parts.astype(np.int32)
        self.view = view
        self.solid = self.a[..., 3] > 0

    def mask(self, idl):
        return np.isin(self.p, idl) & self.solid

    def mul(self, m, k):
        self.a[..., :3] = np.where(m[..., None], np.clip(self.a[..., :3] * k, 0, 255), self.a[..., :3])

    def set(self, m, col, w=1.0):
        col = np.asarray(col, float)
        self.a[..., :3] = np.where(m[..., None], self.a[..., :3] * (1 - w) + col * w, self.a[..., :3])

    def px(self, x, y, col, w=1.0, on=None):
        x, y = int(round(x)), int(round(y))
        if 0 <= y < self.a.shape[0] and 0 <= x < self.a.shape[1] and self.solid[y, x] and (on is None or self.p[y, x] in on):
            self.a[y, x, :3] = self.a[y, x, :3] * (1 - w) + np.asarray(col, float) * w

    def mean(self, m):
        return self.a[..., :3][m].mean(0) if m.any() else np.array([90.0, 60, 50])


def axes(m):
    """a part's own frame: centre, the long axis (pointing down the screen) and its normal; s along, t across"""
    ys, xs = np.nonzero(m)
    c = np.array([xs.mean(), ys.mean()])
    P = np.stack([xs - c[0], ys - c[1]], 1)
    if len(xs) < 3:
        u = np.array([0.0, 1.0])
    else:
        w, v = np.linalg.eigh(P.T @ P)
        u = v[:, 1]
        if u[1] < 0:
            u = -u
    n = np.array([-u[1], u[0]])
    S = np.zeros(m.shape); T = np.zeros(m.shape)
    S[ys, xs] = P @ u; T[ys, xs] = P @ n
    return c, u, n, S, T


def rim(f, m, lit=1.28, dark=0.72):
    """the light along a limb: its upper-left edge catches the light, its lower-right edge falls into shadow"""
    up = m & ~np.roll(m, 1, 0); left = m & ~np.roll(m, 1, 1)
    down = m & ~np.roll(m, -1, 0); right = m & ~np.roll(m, -1, 1)
    f.mul(up | left, lit)
    f.mul((down | right) & ~(up | left), dark)


def face(f):
    head = f.mask(ids('head'))
    if not head.any() or f.view in ('N', 'NE', 'NW'):
        return
    ys, xs = np.nonzero(head)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0 + 1, y1 - y0 + 1
    sk = f.mean(head)
    lit = np.minimum(255, sk * 1.55 + np.array([14, 8, 0]))
    dark = sk * 0.35 + INK * 0.5
    on = ids('head')
    ey = y0 + int(h * 0.44)
    side = {'S': 0, 'SE': 1, 'SW': -1, 'E': 2, 'W': -2}.get(f.view, 0)
    if abs(side) < 2:
        cx = (x0 + x1) / 2 + side * w * 0.14
        sp = w * (0.2 if side == 0 else 0.17)
        for e, k in ((-1, 1.0), (1, 1.0)):
            ex = cx + e * sp
            near = (e == side) or side == 0
            # the brow ridge, lit; under it the socket in shadow with one cold point of wet in it
            for dx in (-1, 0, 1):
                f.px(ex + dx, ey - 2, lit, 0.85, on)
            f.px(ex, ey, dark, 1.0, on); f.px(ex + 1, ey, dark, 1.0, on); f.px(ex, ey + 1, dark, 0.6, on)
            if near:
                f.px(ex - (1 if e < 0 else 0), ey, (200, 190, 175), 0.7, on)
            # the cheekbone below and outside the eye
            f.px(ex + e * 1.5, ey + 3, lit, 0.55, on)
        # the nose: a lit ridge, a shadow under it
        for dy in range(0, 4):
            f.px(cx - 0.5, ey + dy, lit, 0.6, on)
        f.px(cx + 0.5, ey + 4, dark, 0.8, on); f.px(cx - 1.5, ey + 4, dark, 0.5, on)
        # the mouth's line above the beard
        for dx in (-1, 0, 1):
            f.px(cx + dx, ey + 7, dark, 0.7, on)
    else:
        d = 1 if side > 0 else -1
        ex = (x1 - w * 0.3) if d > 0 else (x0 + w * 0.3)
        for dx in (-1, 0, 1):
            f.px(ex + dx, ey - 2, lit, 0.85, on)
        f.px(ex, ey, dark, 1.0, on); f.px(ex + d, ey, (200, 190, 175), 0.6, on)
        nx = x1 if d > 0 else x0
        for dy in range(0, 4):
            f.px(nx, ey + dy, lit, 0.5, on)
        f.px(nx - d, ey + 5, dark, 0.7, on)
        f.px(ex - d * 2, ey + 3, lit, 0.5, on)


def body(f):
    front = f.view in ('S', 'SE', 'SW')
    back = f.view in ('N', 'NE', 'NW')
    for nm in ('chest', 'waist'):
        m = f.mask(ids(nm))
        if m.sum() < 12:
            continue
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        w, h = x1 - x0 + 1, y1 - y0 + 1
        sk = f.mean(m)
        lit = np.minimum(255, sk * 1.45 + np.array([10, 6, 0]))
        dark = sk * 0.55 + INK * 0.3
        cx = (x0 + x1) / 2 + {'SE': 0.12, 'SW': -0.12, 'NE': -0.12, 'NW': 0.12}.get(f.view, 0) * w
        on = ids(nm)
        if front or back:
            # the line down the middle (the breastbone, the belly's furrow, the spine)
            for y in range(y0 + 2, y1 - 1):
                f.px(cx, y, dark, 0.75, on)
        if front and nm == 'chest':
            # the pectorals' lower edge, a shallow curve, lit above, shadowed under
            for x in range(x0 + 1, x1):
                u = (x - cx) / max(1.0, w / 2)
                y = y0 + h * 0.55 - (u * u) * h * 0.18
                f.px(x, y, dark, 0.8, on); f.px(x, y - 1, lit, 0.45, on)
        if front and nm == 'waist':
            # the belly's bands
            for k in (0.3, 0.62):
                y = y0 + h * k
                for x in range(int(cx - w * 0.28), int(cx + w * 0.28) + 1):
                    f.px(x, y, dark, 0.6, on); f.px(x, y - 1, lit, 0.35, on)
        if back and nm == 'chest':
            # the shoulder blades
            for e in (-1, 1):
                bx = cx + e * w * 0.25
                for k in range(-2, 3):
                    f.px(bx + k * 0.6 * e, y0 + h * 0.3 + abs(k), lit, 0.4, on)
                    f.px(bx + k * 0.6 * e, y0 + h * 0.3 + abs(k) + 1, dark, 0.5, on)
    # every limb: lit along its upper-left edge, shadowed along the lower-right; a highlight down its lit side
    for i in SKIN:
        m = f.mask([i])
        if m.sum() < 4:
            continue
        rim(f, m, 1.3, 0.7)
        if m.sum() > 30:
            c, u, n, S, T = axes(m)
            side = -1 if n[0] > 0 else 1                  # the normal that points left catches the light
            hl = m & (np.abs(T - side * (np.abs(T[m]).max() * 0.45)) < 0.8)
            f.mul(hl, 1.18)


def stripes(f, idl, every, lit=1.22, dark=0.66, slant=0.0, across=True):
    for i in idl:
        m = f.mask([i])
        if m.sum() < 8:
            continue
        c, u, n, S, T = axes(m)
        q = (S if across else T) + slant * (T if across else S)
        ph = np.floor(q) % every
        f.mul(m & (ph == 0), dark)
        f.mul(m & (ph == 1), lit)


def cloth(f):
    for i in CLOTH:
        m = f.mask([i])
        if m.sum() < 20:
            continue
        c, u, n, S, T = axes(m)
        wrap = MAT and i in ids('cowl', 'mantle')
        # the folds: hanging ones on the cape and tabard run down it; the shawl's are wound round, slanting
        q = T + (0.7 * S if wrap else 0.08 * np.sin(S * 0.25) * 6)
        ph = np.floor(q) % 6
        f.mul(m & (ph == 0), 0.62)
        f.mul(m & (ph == 1), 0.8)
        f.mul(m & (ph == 3), 1.2)
        # the hem: the lowest pixels ragged and dark with blood and filth
        ys, xs = np.nonzero(m)
        bottom = {}
        for y, x in zip(ys, xs):
            bottom[x] = max(bottom.get(x, -1), y)
        for x, y in bottom.items():
            k = (x * 7) % 5
            for dy in range(0, 2 + k % 3):
                f.px(x, y - dy, (60, 14, 20), 0.55, [i])


def planks(f):
    for i in PLANK:
        m = f.mask([i])
        if m.sum() < 20:
            continue
        c, u, n, S, T = axes(m)
        # the grain running down each board, and a darker seam every few pixels
        ph = np.floor(T + 0.15 * np.sin(S * 0.4)) % 4
        f.mul(m & (ph == 0), 0.72)
        f.mul(m & (ph == 2), 1.12)
        # nail holes, each bleeding down the wood
        smin, smax = S[m].min(), S[m].max()
        tmin, tmax = T[m].min(), T[m].max()
        for ss in (0.25, 0.6):
            for tt in np.arange(tmin + 3, tmax - 1, 6):
                p = c + u * (smin + (smax - smin) * ss) + n * tt
                x, y = int(round(p[0])), int(round(p[1]))
                if not (0 <= y < m.shape[0] and 0 <= x < m.shape[1] and m[y, x]):
                    continue
                f.px(x, y, INK, 1.0, [i]); f.px(x + 1, y, INK, 0.8, [i]); f.px(x, y - 1, (150, 140, 128), 0.5, [i])
                for dy in range(1, 3 + (x * 3 + y) % 4):
                    f.px(x, y + dy, (96, 12, 16), 0.85 - dy * 0.1, [i])


def iron(f):
    for i in IRON:
        m = f.mask([i])
        if m.any():
            rim(f, m, 1.45, 0.62)
    for i in CHAIN:
        m = f.mask([i])
        if m.any():
            ys, xs = np.nonzero(m)
            for y, x in zip(ys, xs):
                if (x + y) % 2 == 0:
                    f.px(x, y, np.minimum(255, f.a[y, x, :3] * 1.5 + 10), 1.0)


def locs(f):
    for i in LOCS:
        m = f.mask([i])
        if m.sum() < 6:
            continue
        c, u, n, S, T = axes(m)
        ph = np.floor(T) % 3
        f.set(m & (ph == 0), (70, 66, 82), 0.45)       # a cold sheen down each strand
        f.mul(m & (ph == 2), 0.7)


def paint(rgba, parts, view):
    f = Frame(np.asarray(rgba), np.asarray(parts), view)
    body(f)
    face(f)
    stripes(f, BAND, 3, slant=0.35)                 # the bandages wound round the forearms
    stripes(f, WRAP, 3, slant=-0.2)                 # the leg-cloth
    cloth(f)
    planks(f)
    iron(f)
    locs(f)
    im = Image.fromarray(np.clip(f.a, 0, 255).astype(np.uint8), 'RGBA')
    return finish.paint(im)


def clips():
    fr = os.path.join(CHAR, 'frames')
    return sorted(d for d in os.listdir(fr) if os.path.isdir(os.path.join(fr, d)))


def one(src_dir, dst_dir, view, name):
    rgba = Image.open(os.path.join(src_dir, name)).convert('RGBA')
    pp = os.path.join(src_dir, name[:-4] + '.parts.png')
    if not os.path.exists(pp):
        return rgba
    return paint(rgba, Image.open(pp), view)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview'); ap.add_argument('--apply', action='store_true'); ap.add_argument('--scale', type=int, default=3)
    A = ap.parse_args()
    frames = os.path.join(CHAR, 'frames'); raw = os.path.join(CHAR, 'frames_raw')
    if A.preview:
        src = raw if os.path.isdir(raw) else frames
        picks = [(c, 'frame_000.png') for c in ['idle_S', 'idle_SE', 'idle_E', 'idle_NE', 'idle_N', 'walk_SW', 'attack_S'] if os.path.isdir(os.path.join(src, c))]
        rows = [[], []]
        for c, nm in picks:
            im = Image.open(os.path.join(src, c, nm)).convert('RGBA')
            bb = im.getbbox()
            rows[0].append(im.crop(bb)); rows[1].append(one(os.path.join(src, c), None, c.split('_')[-1], nm).crop(bb))
        W = sum(i.width for i in rows[0]) + 10 * len(picks); H = max(i.height for i in rows[0])
        o = Image.new('RGBA', (W, H * 2 + 10), (40, 36, 44, 255))
        for r, fs in enumerate(rows):
            x = 0
            for im in fs:
                o.alpha_composite(im, (x, r * (H + 10) + H - im.height)); x += im.width + 10
        o.resize((o.width * A.scale, o.height * A.scale), Image.NEAREST).save(A.preview)
        print(A.preview)
    if A.apply:
        if not os.path.isdir(raw):
            shutil.copytree(frames, raw)
        n = 0
        for c in clips():
            view = c.split('_')[-1]
            sd, dd = os.path.join(raw, c), os.path.join(frames, c)
            for nm in sorted(os.listdir(sd)):
                if nm.endswith('.png') and not nm.endswith('.parts.png') and nm.startswith('frame_'):
                    one(sd, dd, view, nm).save(os.path.join(dd, nm)); n += 1
        print('painted', n, 'frames')
