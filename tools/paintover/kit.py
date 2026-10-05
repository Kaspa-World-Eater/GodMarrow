"""The paint-over kit: what every character's hand pass shares. A rendered frame comes with its part mask
(frame_NNN.parts.png: which part of the shape file each pixel belongs to), so detail is drawn on its own part, in its own
place, frame by frame, and moves with the body. A character's pass (detail_<name>.py) picks the parts and the strokes.

Frame: the pixels and the part mask, with mask/mul/set/px. axes(): a part's own frame (along and across).
rim(): the light along a part. edges(): the pixels of a part that touch another part or the outside, by side.
run(): the --preview and --apply driver every character's pass uses.
"""
import json, os, shutil, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'pixelforge'))
from pixelforge.shapes import part_table  # noqa: E402


def parts_of(shapes_file):
    """{name: index} and {index: material} for a shape file's parts (the indices in the .parts.png masks)."""
    table, _ = part_table(json.load(open(shapes_file)))
    return {e['name']: e['index'] for e in table}, {e['index']: e['material'] for e in table}


def hashp(x, y, seed=0):
    """a fixed pseudo-random 0..1 per pixel (the same every frame, so specks don't boil)"""
    h = (np.asarray(x, np.int64) * 374761393 + np.asarray(y, np.int64) * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)


class Frame:
    def __init__(self, rgba, parts, view):
        self.a = np.asarray(rgba).astype(np.float64)
        self.p = np.asarray(parts).astype(np.int32)
        self.view = view
        self.solid = self.a[..., 3] > 0
        self.yy, self.xx = np.mgrid[0:self.a.shape[0], 0:self.a.shape[1]]

    def mask(self, idl):
        return np.isin(self.p, list(idl)) & self.solid

    def mul(self, m, k):
        self.a[..., :3] = np.where(m[..., None], np.clip(self.a[..., :3] * k, 0, 255), self.a[..., :3])

    def set(self, m, col, w=1.0):
        col = np.asarray(col, float)
        self.a[..., :3] = np.where(m[..., None], self.a[..., :3] * (1 - w) + col * w, self.a[..., :3])

    def px(self, x, y, col, w=1.0, on=None):
        x, y = int(round(x)), int(round(y))
        if 0 <= y < self.a.shape[0] and 0 <= x < self.a.shape[1] and self.solid[y, x] and (on is None or self.p[y, x] in on):
            self.a[y, x, :3] = self.a[y, x, :3] * (1 - w) + np.asarray(col, float) * w

    def image(self):
        return Image.fromarray(np.clip(self.a, 0, 255).astype(np.uint8), 'RGBA')


def axes(m):
    """a part's own frame: centre, the long axis (pointing down the screen) and its normal; S along, T across"""
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


def edges(m):
    """the pixels of mask m whose neighbour above / left / below / right is outside m"""
    up = m & ~np.roll(m, 1, 0); left = m & ~np.roll(m, 1, 1)
    down = m & ~np.roll(m, -1, 0); right = m & ~np.roll(m, -1, 1)
    return up, left, down, right


def rim(f, m, lit=1.28, dark=0.72):
    """the light along a part: its upper-left edge catches the light, its lower-right edge falls into shadow"""
    up, left, down, right = edges(m)
    f.mul(up | left, lit)
    f.mul((down | right) & ~(up | left), dark)


def run(paint, char_dir, picks=('idle_S', 'idle_SE', 'idle_E', 'idle_NE', 'idle_N', 'walk_SE', 'attack_S'), argv=None):
    """The driver: --preview OUT.png (raw over painted, a few frames) or --apply (every frame; the frames as rendered
    are kept in frames_raw/ and every run paints from them)."""
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview'); ap.add_argument('--apply', action='store_true'); ap.add_argument('--scale', type=int, default=3)
    A = ap.parse_args(argv)
    frames = os.path.join(char_dir, 'frames'); raw = os.path.join(char_dir, 'frames_raw')

    def one(sd, view, nm):
        rgba = Image.open(os.path.join(sd, nm)).convert('RGBA')
        pp = os.path.join(sd, nm[:-4] + '.parts.png')
        return paint(rgba, Image.open(pp), view) if os.path.exists(pp) else rgba

    if A.preview:
        src = raw if os.path.isdir(raw) else frames
        rows = [[], []]
        for c in picks:
            if not os.path.isdir(os.path.join(src, c)):
                continue
            im = Image.open(os.path.join(src, c, 'frame_000.png')).convert('RGBA')
            bb = im.getbbox()
            rows[0].append(im.crop(bb)); rows[1].append(one(os.path.join(src, c), c.split('_')[-1], 'frame_000.png').crop(bb))
        W = sum(i.width for i in rows[0]) + 10 * len(rows[0]); H = max(i.height for i in rows[0])
        o = Image.new('RGBA', (W, H * 2 + 10), (16, 14, 20, 255))
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
        for c in sorted(d for d in os.listdir(raw) if os.path.isdir(os.path.join(raw, d))):
            view = c.split('_')[-1]
            sd, dd = os.path.join(raw, c), os.path.join(frames, c)
            for nm in sorted(os.listdir(sd)):
                if nm.startswith('frame_') and nm.endswith('.png') and not nm.endswith('.parts.png'):
                    one(sd, view, nm).save(os.path.join(dd, nm)); n += 1
        print('painted', n, 'frames')
