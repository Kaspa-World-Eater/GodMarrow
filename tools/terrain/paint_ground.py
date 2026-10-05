"""Repaint the zones' ground textures by hand-written rules (assets/ground/set0/<land>/<class>_<n>.webp).

Each texture is 320x160 texels, seamless, seen as the screen sees it: the ground shader (shaders/ground_iso.gdshader)
lays it in screen space at 2 texels per world px, so one 36x18 tile is 72x36 texels and anything lying on the ground
(a cobble, a slab, a puddle) is drawn squashed 2:1. Light comes from the upper left, as everywhere in the game.

Each land keeps its colours: the palette of every texture is taken from the texture it replaces (its tones, darkest to
lightest), and only the drawing is new:
  road     worn cobbles of uneven size, rounded, lit on their upper-left edge, with mud and the odd weed in the joints,
           some stones sunk or gone;
  flags    large irregular slabs with cracks, chipped corners and moss or grime in the seams;
  crypt, barrow, bone   the deep floors: slabs, packed earth with bones, or set bone, by the class;
  main     the land's ground (ash and dead grass on the moor, leaf-litter in the wood, sedge on the fen, burnt heather):
           mottled in broad patches, tufts that lean, pebbles, the odd bone chip;
  dirt     trodden earth: ruts, pocks and pebbles;
  mud      wet earth darker in the hollows, with still puddles that hold a pale sheen.
Water, shallows, bog and arena are left alone (the shader moves the water).

  tools/pixelforge/.venv/Scripts/python tools/terrain/paint_ground.py [--lands moor,wood] [--preview OUT.png] [--apply]
The textures as they were are kept in tools/terrain/original/ (the first --apply copies them; every run paints from
the originals' palettes, so it never stacks).
"""
import argparse, os, shutil
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SET = os.path.join(ROOT, 'assets', 'ground', 'set0')
KEEP = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'original')
W, H = 320, 160
ACT1 = ['moor', 'heath', 'ridge']   # the lands whose roads were rows of neat bricks; the wood's and the fen's mossy stones are kept   # the dungeon floors (crypt, barrow, bone) keep the browser's: laid on the tile grid, as built rooms are
PAINT = {'road', 'flags'}   # dirt and mud keep the browser's (its litter of leaves, twigs and grass beat the redraw)   # 'main' (grass, ash, litter) kept: the browser's is good


# ------------------------------------------------------------------ noise and helpers (all periodic, so it tiles)
def vnoise(scale_x, scale_y, seed):
    """value noise with periods that divide the texture, smooth-stepped"""
    r = np.random.default_rng(seed)
    gx, gy = max(1, W // max(1, scale_x)), max(1, H // max(1, scale_y))
    g = r.random((gy, gx))
    xs = np.arange(W) / W * gx; ys = np.arange(H) / H * gy
    x0 = np.floor(xs).astype(int); y0 = np.floor(ys).astype(int)
    fx = xs - x0; fy = ys - y0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    x1 = (x0 + 1) % gx; y1 = (y0 + 1) % gy
    a = g[np.ix_(y0 % gy, x0 % gx)]; b = g[np.ix_(y0 % gy, x1)]; c = g[np.ix_(y1, x0 % gx)]; d = g[np.ix_(y1, x1)]
    fx = fx[None, :]; fy = fy[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(seed, base=40):
    return 0.55 * vnoise(base, base // 2, seed) + 0.3 * vnoise(base // 2, base // 4, seed + 1) + 0.15 * vnoise(base // 5, base // 10, seed + 2)


BAY = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
BAYT = np.tile(BAY, (H // 4, W // 4))


def quant(v, n):
    """a 0..1 field to n tone steps, dithered at the step edges (pixel art, not a smooth ramp)"""
    return np.clip(np.floor(v * n + (BAYT - 0.5) * 0.6), 0, n - 1).astype(int)


def palette_of(path, n=7, family=None):
    """the tones of a texture, darkest to lightest: the mean colour of each luminance band (so the hue moves smoothly
    along the ramp and never flips between families). family: 'stone' takes only the greyer half of the pixels, 'green'
    the more saturated half, None all of them."""
    a = np.asarray(Image.open(path).convert('RGB')).reshape(-1, 3).astype(float)
    mx, mn = a.max(1), a.min(1)
    sat = (mx - mn) / np.maximum(mx, 1)
    if family == 'stone':
        a = a[sat <= np.median(sat)]
    elif family == 'green':
        a = a[sat >= np.percentile(sat, 60)]
    lum = a @ [0.299, 0.587, 0.114]
    qs = np.percentile(lum, np.linspace(3, 99, n + 1))
    out = []
    for i in range(n):
        m = (lum >= qs[i]) & (lum <= qs[i + 1])
        out.append(a[m].mean(0) if m.any() else a.mean(0))
    return np.array(out)


def ramp_at(pal, t):
    """a colour at 0..1 along the palette (by index, no blending: pixel art)"""
    i = np.clip(np.round(np.asarray(t, float) * (len(pal) - 1)).astype(int), 0, len(pal) - 1)
    return pal[i]


def cells(seed, mean_w, jitter=0.45, squash=2.0):
    """Voronoi cells on a seamless jittered grid, in screen space squashed 2:1 (a stone lying on the ground).
    Returns (id, d1, d2): the nearest cell per texel, its distance and the second distance (d2-d1 = the joint)."""
    r = np.random.default_rng(seed)
    nx = max(2, round(W / mean_w)); ny = max(2, round(H / (mean_w / squash)))
    cw, ch = W / nx, H / ny
    pts = []
    for j in range(ny):
        for i in range(nx):
            pts.append(((i + 0.5 + (r.random() - 0.5) * 2 * jitter) * cw, (j + 0.5 + (r.random() - 0.5) * 2 * jitter) * ch))
    pts = np.array(pts)
    yy, xx = np.mgrid[0:H, 0:W]
    d1 = np.full((H, W), 1e9); d2 = np.full((H, W), 1e9); idx = np.zeros((H, W), int)
    for k, (px, py) in enumerate(pts):
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                dx = xx - (px + ox); dy = (yy - (py + oy)) * squash
                d = np.sqrt(dx * dx + dy * dy)
                closer = d < d1
                d2 = np.where(closer, d1, np.minimum(d2, d))
                idx = np.where(closer, k, idx); d1 = np.where(closer, d, d1)
    return idx, d1, d2, len(pts)


def bevel(idx, inner):
    """1 on a stone's upper-left rim (lit), -1 on its lower-right rim (shadow), 0 inside"""
    up = np.roll(idx, 1, 0) != idx; left = np.roll(idx, 1, 1) != idx
    down = np.roll(idx, -1, 0) != idx; right = np.roll(idx, -1, 1) != idx
    b = np.zeros(idx.shape)
    b[(up | left) & inner] = 1
    b[(down | right) & inner & ~(up | left)] = -1
    return b


def scatter(img, pal, seed, n, size=(1, 2), tone=(0.75, 1.0), mask=None):
    """pebbles: a few texels each, a lit pixel on top and a shadow under"""
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = r.integers(0, W), r.integers(0, H)
        if mask is not None and not mask[y, x]:
            continue
        s = r.integers(size[0], size[1] + 1)
        c = ramp_at(pal, r.uniform(*tone))
        for dy in range(s):
            for dx in range(s * 2):
                img[(y + dy) % H, (x + dx) % W] = c
        img[y % H, (x + s) % W] = ramp_at(pal, 1.0)
        for dx in range(s * 2):
            img[(y + s) % H, (x + dx) % W] = pal[0]


def tufts(img, pal, seed, n, lean=1, tall=(3, 6), tone=(0.55, 1.0), mask=None):
    """grass and sedge: two or three blades from a root, leaning the same way, dark at the root, light at the tip"""
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = int(r.integers(0, W)), int(r.integers(0, H))
        if mask is not None and not mask[y, x]:
            continue
        for b in range(int(r.integers(2, 4))):
            h = int(r.integers(*tall)); dx0 = int(r.integers(-2, 3)); sl = lean * r.uniform(0.2, 0.7) + (b - 1) * 0.35
            for k in range(h):
                t = k / max(1, h - 1)
                c = ramp_at(pal, tone[0] + (tone[1] - tone[0]) * t)
                img[(y - k) % H, int(round(x + dx0 + sl * k)) % W] = c


def cracks(img, pal, seed, n, length=(8, 24), mask=None):
    r = np.random.default_rng(seed)
    for _ in range(n):
        x, y = float(r.integers(0, W)), float(r.integers(0, H))
        if mask is not None and not mask[int(y), int(x)]:
            continue
        ang = r.uniform(0, np.pi)
        for k in range(int(r.integers(*length))):
            ang += r.uniform(-0.6, 0.6)
            x += np.cos(ang); y += np.sin(ang) * 0.5
            xi, yi = int(x) % W, int(y) % H
            if mask is not None and not mask[yi, xi]:
                break
            img[yi, xi] = pal[0]
            img[(yi + 1) % H, xi] = ramp_at(pal, 0.15) if k % 2 else img[(yi + 1) % H, xi]


# ------------------------------------------------------------------ the classes
def paint_road(pal, seed, land, earth=None):
    earth = pal if earth is None else earth
    """cobbles: uneven, rounded, lit upper-left; mud in the joints, weeds, some stones sunk or gone"""
    idx, d1, d2, n = cells(seed, 15, jitter=0.42)
    r = np.random.default_rng(seed + 9)
    joint = (d2 - d1) < 2.4
    tone = r.uniform(0.22, 0.9, n)[idx]                       # each stone its own shade
    gone = r.random(n) < 0.06                                 # a few stones lost: earth there
    shape = np.clip(1 - d1 / 16.0, 0, 1)                      # a stone is rounded: lighter toward its middle
    v = tone + 0.12 * (shape - 0.5) + 0.07 * (fbm(seed + 3, 24) - 0.5)
    inner = ~joint
    b = bevel(np.where(joint, -1, idx), inner)
    v = v + 0.2 * b
    img = ramp_at(pal, np.clip(v, 0, 1))
    stained = (r.random(n) < 0.12)[idx] & ~joint             # a few stones stained with earth or moss
    img[stained] = ((img * 0.55 + ramp_at(earth, np.clip(v, 0, 1)) * 0.45))[stained]
    mud = joint | gone[idx]
    mudv = 0.05 + 0.2 * fbm(seed + 5, 20)
    img[mud] = ramp_at(earth, mudv)[mud]
    scatter(img, earth, seed + 11, 60, size=(1, 1), tone=(0.3, 0.55), mask=mud)
    if land in ('moor', 'wood', 'fen', 'heath', 'ridge'):
        tufts(img, earth, seed + 13, 90, tall=(2, 4), tone=(0.45, 0.85), mask=joint)
    return img


def paint_slabs(pal, seed, mean_w=42, moss=0.0, earth=None):
    earth = pal if earth is None else earth
    """large irregular slabs: worn faces, cracks, chipped corners, grime in the seams"""
    idx, d1, d2, n = cells(seed, mean_w, jitter=0.35)
    r = np.random.default_rng(seed + 9)
    seam = (d2 - d1) < 2.0
    tone = r.uniform(0.25, 0.85, n)[idx]
    wear = fbm(seed + 3, 30)
    v = tone + 0.18 * (wear - 0.5) + 0.06 * (fbm(seed + 4, 8) - 0.5)
    b = bevel(np.where(seam, -1, idx), ~seam)
    v = v + 0.13 * b
    img = ramp_at(pal, np.clip(v, 0, 1))
    img[seam] = ramp_at(earth, 0.04 + 0.14 * wear)[seam]
    cracks(img, pal, seed + 6, 22, mask=~seam)
    scatter(img, pal, seed + 7, 30, size=(1, 1), tone=(0.15, 0.3), mask=~seam)
    if moss > 0:
        m = (fbm(seed + 8, 20) > 1 - moss) & ((d2 - d1) < 6)
        img[m] = ramp_at(earth, 0.45 + 0.3 * fbm(seed + 9, 6))[m]
    return img


def paint_ground(pal, seed, land, variant):
    """the land's own ground: broad mottled patches, leaning tufts, pebbles, the odd bone chip"""
    base = fbm(seed, 60)
    detail = vnoise(6, 3, seed + 2)
    t = quant(0.15 + 0.6 * base + 0.25 * detail, 5) / 4.0
    v = 0.12 + 0.55 * t
    img = ramp_at(pal, v)
    lean = 1 if variant == 0 else -1
    dense = {'moor': 260, 'heath': 180, 'ridge': 200, 'wood': 120, 'fen': 360}.get(land, 200)
    tufts(img, pal, seed + 5, dense, lean=lean, tall=(3, 7) if land == 'fen' else (2, 6), tone=(0.4, 1.0))
    scatter(img, pal, seed + 7, 60, size=(1, 2), tone=(0.5, 0.8))
    if land in ('moor', 'heath', 'ridge'):
        # bone chips and ash: pale flecks, a crack or two in the baked crust
        scatter(img, pal, seed + 8, 14, size=(1, 1), tone=(0.95, 1.0))
        cracks(img, pal, seed + 9, 6, length=(5, 12))
    if land == 'wood':
        # fallen leaves in drifts, a twig here and there
        leaf = fbm(seed + 10, 30) > 0.58
        r = np.random.default_rng(seed + 11)
        for _ in range(500):
            x, y = r.integers(0, W), r.integers(0, H)
            if leaf[y, x]:
                img[y, x] = ramp_at(pal, r.uniform(0.6, 0.95)); img[y, (x + 1) % W] = ramp_at(pal, r.uniform(0.5, 0.8))
    return img


def paint_dirt(pal, seed):
    """trodden earth: ruts running across, pocks, pebbles"""
    v = 0.05 + 0.9 * fbm(seed, 50) + 0.25 * (vnoise(8, 4, seed + 1) - 0.5)
    v = quant(np.clip(v, 0, 1), 7) / 6.0
    ruts = np.abs(np.sin((np.arange(H)[:, None] * 2.0 + np.arange(W)[None, :] * 0.25 + 30 * fbm(seed + 2, 80)) * 2 * np.pi / 40))
    v = v - 0.12 * (ruts < 0.12)
    img = ramp_at(pal, np.clip(v, 0, 1))
    r = np.random.default_rng(seed + 3)
    for _ in range(90):                                       # pocks: a dark dent with a lit lower lip
        x, y = r.integers(0, W), r.integers(0, H)
        img[y, x] = pal[0]; img[y, (x + 1) % W] = pal[0]; img[(y + 1) % H, x] = ramp_at(pal, 0.7)
    scatter(img, pal, seed + 4, 140, size=(1, 2), tone=(0.6, 0.95))
    cracks(img, pal, seed + 5, 10, length=(6, 14))
    return img


def paint_mud(pal, seed):
    """wet earth, darker in the hollows; still puddles that catch a pale sheen at their far edge"""
    f = fbm(seed, 50)
    v = quant(np.clip(0.0 + 1.0 * f, 0, 1), 6) / 5.0 * 0.8 + 0.05
    img = ramp_at(pal, np.clip(v, 0, 1))
    pool = f < 0.36
    img[pool] = ramp_at(pal, 0.05 + 0.1 * vnoise(10, 5, seed + 2))[pool]
    edge = pool & ~np.roll(pool, 1, 0)                         # the far (upper) rim of each puddle catches the sky
    img[edge] = ramp_at(pal, 0.8)
    rim = pool & ~np.roll(pool, -1, 0)
    img[rim] = ramp_at(pal, 0.25)
    scatter(img, pal, seed + 3, 40, size=(1, 1), tone=(0.4, 0.6), mask=~pool)
    return img


def paint_deep(cls, pal, seed):
    if cls == 'crypt':
        return paint_slabs(pal, seed, mean_w=40)
    if cls == 'barrow':                                         # packed earth with stones and bones sunk in it
        img = paint_dirt(pal, seed)
        scatter(img, pal, seed + 20, 30, size=(1, 2), tone=(0.85, 1.0))
        return img
    if cls == 'bone':                                           # set bone: small pale tiles, worn, in dark grout
        return paint_slabs(pal, seed, mean_w=16)
    return None


def paint(land, cls, n, pal, earth):
    seed = (hash(land) % 10000) * 10 + n * 7 + len(cls)
    seed = abs(seed) % (2 ** 31)
    if cls == 'road':
        return paint_road(pal, seed, land, earth)
    if cls == 'flags':
        return paint_slabs(pal, seed, mean_w=44, moss=0.25 if land in ('wood', 'fen') else 0.0, earth=earth)
    if cls == 'main':
        return paint_ground(pal, seed, land, n)
    if cls == 'dirt':
        return paint_dirt(pal, seed)
    if cls == 'mud':
        return paint_mud(pal, seed)
    return paint_deep(cls, pal, seed)


def files(lands):
    for land in lands:
        d = os.path.join(SET, land)
        for f in sorted(os.listdir(d)):
            if not f.endswith('.webp'):
                continue
            cls, n = f[:-5].rsplit('_', 1)
            if cls in PAINT:
                yield land, cls, int(n), f


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--lands', default=','.join(ACT1)); ap.add_argument('--preview'); ap.add_argument('--apply', action='store_true')
    A = ap.parse_args()
    # crc32 instead of hash(): hash() of a str changes between runs
    import zlib
    hash = lambda s: zlib.crc32(s.encode())  # noqa: E731
    lands = A.lands.split(',')
    out = []
    for land, cls, n, f in files(lands):
        src = os.path.join(KEEP, land, f) if os.path.exists(os.path.join(KEEP, land, f)) else os.path.join(SET, land, f)
        fam = 'stone' if cls in ('road', 'flags', 'crypt', 'bone') else None
        pal = palette_of(src, family=fam)
        earth = palette_of(src)
        img = paint(land, cls, n, pal, earth)
        if img is None:
            continue
        new = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGB')
        out.append((land, cls, n, Image.open(src).convert('RGB'), new))
        if A.apply:
            os.makedirs(os.path.join(KEEP, land), exist_ok=True)
            if not os.path.exists(os.path.join(KEEP, land, f)):
                shutil.copy(os.path.join(SET, land, f), os.path.join(KEEP, land, f))
            new.save(os.path.join(SET, land, f), lossless=True)
    if A.preview:
        rows = len(out)
        o = Image.new('RGB', (W * 4 + 10, rows * (H + 6)), (20, 18, 24))
        for i, (land, cls, n, old, new) in enumerate(out):
            y = i * (H + 6)
            o.paste(old, (0, y)); o.paste(new, (W + 10, y))
            # 2x of the new one's middle, as the game shows it
            o.paste(new.crop((80, 40, 240, 120)).resize((W, H), Image.NEAREST), (2 * W + 10, y))
            o.paste(new.crop((0, 0, 160, 80)).resize((W - 10, H), Image.NEAREST), (3 * W + 10, y))
        o.save(A.preview)
    print(len(out), 'textures', 'written' if A.apply else '(preview only)')
