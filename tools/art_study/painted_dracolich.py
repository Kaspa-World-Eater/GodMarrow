"""Test 2 (Derek 2026-10-06): "Create a ruined statue of the dracolich, in the ruins of a castle, his half eaten form,
through the cracks on the outside, as it's made of cement like carved granite, hints of pulsating rotten flesh peek
through." After the Famine's C-: "your face itself just lacks anything truly defining."

So the defining things come first, and everything is built to serve them:
- the silhouette: rearing on its plinth, the neck arched and the horned head lowered toward us, one great wing raised
  and torn, the other a stump, talons gripping the plinth's edge, the tail coiled round its foot;
- half eaten: bites torn out of the granite in scalloped arcs (neck, flank, wing), the whole right flank and hind leg
  eaten away;
- the statue is a shell: through every crack and bite the dracolich's own rotten flesh shows, bruised and wet,
  veined, pulsing slowly, glistening; ribs of real bone in the open flank; ichor staining the granite below each wound;
- the eye in the carved socket is real: milky, filmed, a slit pupil that moves;
- the jaw cracked open, a strand of rotten tongue hanging from it.
The castle round it in the painted standard (height field, moonlight, shadows, hue-shifted ramps); the statue
inflated from its designed silhouette into a relief that faces us (what made the Famine's face read), then carved.

  python tools/art_study/painted_dracolich.py OUT.png [OUT.webp]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

RNG = np.random.default_rng(41)
_P = RNG.random((1024, 1024))
B4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]).reshape(4, 4) / 16.0 + 1 / 32


def vn(x, y):
    xi, yi = np.floor(x).astype(int), np.floor(y).astype(int)
    xf, yf = x - xi, y - yi
    u, v = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
    def h(a, b):
        return _P[a % 1024, b % 1024]
    return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v


def fbm(x, y):
    return vn(x, y) * 0.55 + vn(x * 2.1 + 9, y * 2.1 + 9) * 0.3 + vn(x * 4.3 + 3, y * 4.3 + 3) * 0.15


def hexc(s):
    s = s.lstrip("#")
    return [int(s[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def ramp(*cs):
    return np.array([hexc(c) for c in cs])


def gauss(x):
    return np.exp(-x * x)


RAMPS = {
    "grass":  ramp("#0d1219", "#16211d", "#243522", "#3c5127", "#5f7230", "#93964f"),
    "dirt":   ramp("#100e15", "#1f181c", "#352822", "#523e2e", "#775b40", "#a5865d"),
    "flags":  ramp("#0e0e17", "#1c1c28", "#2f2e3a", "#494651", "#6d6868", "#9d968a"),
    "wall":   ramp("#0c0c16", "#1a1926", "#2e2b38", "#48434d", "#6d6563", "#a0968a"),
    "moss":   ramp("#0b1214", "#14231b", "#21361f", "#365026", "#577030", "#879447"),
    "granite": ramp("#0d0d13", "#1c1b22", "#302d33", "#4a454a", "#6e6766", "#a19790"),   # grey with a warm cast
    "flesh":  ramp("#12060a", "#2a0b12", "#4a1420", "#6c2230", "#8e3c3c", "#b86a58"),
    "bruise": ramp("#0c0710", "#1c0e22", "#2e1734", "#46264a", "#5e3c5a", "#7c5a70"),
    "bone":   ramp("#1a1610", "#3a3224", "#6a5c42", "#9a8a68", "#c4b68e", "#e2d8b6"),
}
GRASS, DIRT, FLAGS, WALL = 0, 1, 2, 3
MAT_RAMP = {GRASS: "grass", DIRT: "dirt", FLAGS: "flags", WALL: "wall"}

# ------------------------------------------------------------------ the castle (height field)
N, R, OFF = 44, 10, 14.0
G = N * R
KZ = 8.0
gy, gx = np.mgrid[0:G, 0:G]
WX, WY = (gx + 0.5) / R - OFF, (gy + 0.5) / R - OFF
Hm = (fbm(WX * 0.8, WY * 0.8) - 0.5) * 0.08
Mat = np.full((G, G), GRASS)
Tag = np.zeros((G, G), int)
# the courtyard's flagstones, gone to grass at their edges
pts = np.array([(i + RNG.random() * 0.9, j + RNG.random() * 0.8) for i in np.arange(-OFF, N - OFF, 1.2) for j in np.arange(-OFF, N - OFF, 1.0)])
dd, ii = cKDTree(pts).query(np.stack([WX.ravel(), WY.ravel()], 1), k=2)
gap = (dd[:, 1] - dd[:, 0]).reshape(G, G)
sid = ii[:, 0].reshape(G, G)
court = (np.abs(WX - 9.5) < 7.5 + (fbm(WX * 0.4, WY * 0.4) - 0.5) * 3) & (np.abs(WY - 10.5) < 6.5 + (fbm(WX * 0.4 + 5, WY * 0.4) - 0.5) * 3)
lost = _P[sid % 1024, 5] < 0.15
Mat[court & ~lost] = FLAGS
Mat[court & lost] = DIRT
Hm += np.where(court & ~lost, 0.06 * np.clip(gap / 0.1, 0, 1), 0.0)
Mat[court & ~lost & (gap < 0.09)] = DIRT


def box(x0, y0, x1, y1, h, tag=1):
    global Hm
    m = (WX >= x0) & (WX < x1) & (WY >= y0) & (WY < y1)
    hh = h if np.isscalar(h) else h[m]
    Hm[m] = np.maximum(Hm[m], hh)
    Mat[m] = WALL
    Tag[m] = tag
    return m


# the curtain wall behind, broken course by course; a second run down the left
brk = 13.0 - np.floor(np.clip(fbm(WX * 0.35, 2) * 9.0 + np.abs(WX - 6) * 0.5, 0, 26) / 0.5) * 0.5
box(-8.0, -3.0, 24.0, -1.4, np.maximum(brk, 0.6))
brk2 = 11.0 - np.floor(np.clip(fbm(2, WY * 0.35) * 8.0 + np.abs(WY - 2) * 0.55, 0, 26) / 0.5) * 0.5
box(-6.0, -3.0, -4.4, 22.0, np.maximum(brk2, 0.6))
# a great tower at the corner, its top snapped off on a slant
d = np.hypot(WX + 4.2, WY + 1.8)
tower = d < 3.2
Hm = np.where(tower, np.maximum(Hm, 19.0 - (WX + WY) * 0.5 + (fbm(WX * 1.5, WY * 1.5) - 0.5) * 2.0), Hm)
Mat[tower] = WALL
Tag[tower] = 2
# a gate tower on the right, lower, broken
d2 = np.hypot(WX - 20.0, WY + 1.0)
gt = d2 < 2.2
Hm = np.where(gt, np.maximum(Hm, 9.0 - (WX - 20) * 0.6 + (fbm(WX * 2, WY * 2) - 0.5) * 1.6), Hm)
Mat[tower] = WALL
Tag[tower] = 2
# rubble along the wall's foot
for k in range(60):
    cx, cy = RNG.uniform(-4.0, 22), RNG.uniform(-1.3, 1.6)
    if RNG.random() < 0.3:
        cx, cy = RNG.uniform(-4.3, -2.0), RNG.uniform(0, 18)
    s_ = RNG.uniform(0.2, 0.7)
    box(cx, cy, cx + s_ * 1.3, cy + s_, RNG.uniform(0.15, 0.8), 3)
# the plinth
PL = (9.0, 9.4)
box(PL[0] - 2.4, PL[1] - 1.1, PL[0] + 2.4, PL[1] + 1.1, 1.0, 4)
box(PL[0] - 2.65, PL[1] - 1.35, PL[0] + 2.65, PL[1] + 1.35, 0.32, 4)   # its step

Hb = Hm.copy()
for _ in range(1):
    Hb = (Hb + np.roll(Hb, 1, 0) + np.roll(Hb, -1, 0) + np.roll(Hb, 1, 1) + np.roll(Hb, -1, 1)) / 5
GY, GX = np.gradient(Hb, 1.0 / R)


def look(arr, x, y, outside):
    ix_ = np.clip(((x + OFF) * R).astype(int), 0, G - 1)
    iy_ = np.clip(((y + OFF) * R).astype(int), 0, G - 1)
    return np.where((x < -OFF) | (y < -OFF) | (x >= N - OFF) | (y >= N - OFF), outside, arr[iy_, ix_])


# ------------------------------------------------------------------ the camera
W, H = 400, 250
FOC = (5.0, 4.2)
CX0, CY0 = 200 - (FOC[0] - FOC[1]) * 8, 125 - (FOC[0] + FOC[1]) * 4 + 22
SY, SX = np.mgrid[0:H, 0:W].astype(float)
sxr, syr = SX + 0.5 - CX0, SY + 0.5 - CY0
DZ = 1.0 / 18
hit = np.zeros((H, W), bool)
hz, hx, hy = np.zeros((H, W)), np.zeros((H, W)), np.zeros((H, W))
for z in np.arange(22.0, -0.3, -DZ):
    s = (syr + z * KZ) / 4.0
    x = (s + sxr / 8.0) / 2.0
    y = (s - sxr / 8.0) / 2.0
    hh_ = look(Hm, x, y, -9.0)
    new = (~hit) & (hh_ >= z)
    hit |= new
    hz[new], hx[new], hy[new] = z, x[new], y[new]
ix = np.clip(((hx + OFF) * R).astype(int), 0, G - 1)
iy = np.clip(((hy + OFF) * R).astype(int), 0, G - 1)
top = (Hm[iy, ix] - hz) < DZ * 1.6
hz = np.where(top, Hm[iy, ix], hz)
mat = Mat[iy, ix]
tag = Tag[iy, ix]
depth = hx + hy + hz * 0.001
gxh, gyh = GX[iy, ix], GY[iy, ix]
nrm = np.where(top[..., None], np.dstack([-gxh, -gyh, np.ones_like(gxh)]), np.dstack([-gxh, -gyh, np.full_like(gxh, 0.12)]))
m = (tag == 2) & ~top
a_ = np.where(hx < 8, np.arctan2(hy + 1.8, hx + 4.2), np.arctan2(hy + 1.0, hx - 20.0))
nrm[m] = np.dstack([np.cos(a_), np.sin(a_), np.zeros_like(a_)])[m]
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True) + 1e-6

MOON = np.array([-0.62, 0.5, 0.62])
MOON /= np.linalg.norm(MOON)
sh = np.zeros((H, W), bool)
px0, py0, pz0 = hx + nrm[..., 0] * 0.12, hy + nrm[..., 1] * 0.12, hz + 0.02
for k in range(1, 90):
    tt = k * 0.1
    sh |= look(Hm, px0 + MOON[0] * tt, py0 + MOON[1] * tt, -9) > pz0 + MOON[2] * tt + 0.02
ndl = np.clip((nrm * MOON).sum(2), 0, 1) * (~sh)
ao = np.zeros((H, W))
for rad in (0.25, 0.6, 1.0):
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        ao += np.clip((look(Hm, hx + np.cos(a) * rad, hy + np.sin(a) * rad, -9) - hz) / (rad * 1.6), 0, 1)
ao = np.clip(ao / 24 * 1.6, 0, 1)
bay = B4[SY.astype(int) % 4, SX.astype(int) % 4]
alb = (vn(hx * 6 + 71, hy * 6) * 0.6 + vn(hx * 17, hy * 17) * 0.4 - 0.5) * 0.05
gm = mat == GRASS
alb += np.where(gm, (vn((hx * 0.8 + hy * 0.4) * 3.0, (hy * 0.8 - hx * 0.4) * 14.0) - 0.5) * 0.2 + (fbm(hx * 0.8, hy * 0.8) - 0.5) * 0.2 - 0.04, 0)
fm = mat == FLAGS
alb += np.where(fm, (_P[sid[iy, ix] % 1024, 3] - 0.5) * 0.2 + 0.04, 0)
wm = (mat == WALL) & ~top
u_face = np.where(np.abs(nrm[..., 1]) > np.abs(nrm[..., 0]), hx, hy)
course = np.floor(hz / 0.6)
cy_in = (hz / 0.6) % 1.0
bxw = (u_face * 1.1 + course * 0.47) % 1.0
blk = np.floor(u_face * 1.1 + course * 0.47) + course * 13
alb += np.where(wm, (_P[(blk.astype(int) * 17) % 1024, 5] - 0.5) * 0.2, 0)
alb += np.where(wm & ((cy_in < 0.08) | (bxw < 0.04)), -0.3, 0)
alb += np.where(wm & (cy_in > 0.86), 0.12, 0)
alb += np.where((mat == WALL) & top, 0.08, 0)
moss = (mat == WALL) & ((top & (fbm(hx * 2, hy * 2) > 0.52)) | (~top & (hz < 0.6) & (fbm(hx * 3, hz * 3 + hy) > 0.58)))


def shade_world():
    stone = (mat == WALL) | (mat == FLAGS)
    amb = 0.13 + 0.08 * nrm[..., 2] + stone * 0.05
    bounce = (mat == WALL) * (1 - np.abs(nrm[..., 2])) * 0.1
    I = amb * (1 - ao * 0.75) + bounce + ndl * np.where(stone, 0.95, 0.5)
    v = I * 0.8 + alb + (bay - 0.5) * 0.035
    rgb = np.zeros((H, W, 3))
    for mid, rn in MAT_RAMP.items():
        mm = mat == mid
        rgb[mm] = RAMPS[rn][np.clip((v[mm] * 6).astype(int), 0, 5)]
    rgb[moss] = RAMPS["moss"][np.clip((v[moss] * 6).astype(int), 0, 5)]
    rgb *= np.array([0.86, 0.92, 1.06])
    rgb[~hit] = hexc("#07070b")
    return np.clip(rgb, 0, 1), v


def to_screen(x, y, z=0.0):
    return (x - y) * 8 + CX0, (x + y) * 4 - z * KZ + CY0


# ------------------------------------------------------------------ the statue: designed silhouette, inflated, carved
SW, SH = 268, 176
_YY, _XX = np.mgrid[0:SH, 0:SW].astype(float)


def poly(points):
    from PIL import ImageDraw
    im = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(im).polygon([tuple(map(float, q)) for q in points], fill=1)
    return np.array(im) > 0


class Body:
    """A relief built as solid forms in depth (z toward us, px): each part writes where it stands in front."""

    def __init__(self):
        self.Z = np.full((SH, SW), -999.0)
        self.part = np.full((SH, SW), "", dtype=object)

    def put(self, zf, mask, name):
        upd = mask & (zf > self.Z)
        self.Z = np.where(upd, zf, self.Z)
        self.part = np.where(upd, name, self.part)

    def limb(self, pts, r0, r1, z0, z1, name, flat=1.0):
        pts = np.array(pts, float)
        seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
        Lt = seg[-1]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            d = b - a
            L2 = (d * d).sum()
            t = np.clip(((_XX - a[0]) * d[0] + (_YY - a[1]) * d[1]) / L2, 0, 1)
            dist = np.hypot(_XX - a[0] - t * d[0], _YY - a[1] - t * d[1])
            f = (seg[i] + t * np.sqrt(L2)) / Lt
            r = r0 + (r1 - r0) * f
            m = dist < r
            self.put(z0 + (z1 - z0) * f + np.sqrt(np.clip(r * r - dist * dist, 0, None)) * flat, m, name)

    def lump(self, cx, cy, rx, ry, cz, rz, name, rot=0.0):
        c, s_ = np.cos(rot), np.sin(rot)
        u = (_XX - cx) * c + (_YY - cy) * s_
        v = -(_XX - cx) * s_ + (_YY - cy) * c
        e = 1 - (u / rx) ** 2 - (v / ry) ** 2
        self.put(cz + rz * np.sqrt(np.clip(e, 0, None)), e > 0, name)

    def sheet(self, mask, zf, name):
        self.put(np.where(mask, zf, -999), mask, name)


def along(pts, t):
    pts = np.array(pts, float)
    seg = np.cumsum(np.r_[0, np.hypot(*np.diff(pts, axis=0).T)])
    s_ = t * seg[-1]
    i = min(np.searchsorted(seg, s_) - 1, len(pts) - 2)
    i = max(i, 0)
    f = (s_ - seg[i]) / max(seg[i + 1] - seg[i], 1e-6)
    p = pts[i] + (pts[i + 1] - pts[i]) * f
    d = pts[i + 1] - pts[i]
    d = d / (np.hypot(*d) + 1e-6)
    return p, d


def build_statue():
    """Somulo's language (Demon's Crest, Derek's reference), carved as a granite statue: a low stalking profile, the
    long neck reaching forward and the head dropped with the jaw open, a great horn raking back, spines down the whole
    back, the wing-bone arching over the shoulders with its membrane hanging in tatters, planted digitigrade legs with
    splayed claws, the tail spiked. Built from the skeleton out: vertebrae and knuckles as segments, not tubes."""
    xx, yy = _XX, _YY
    B = Body()
    # far legs first (behind)
    B.lump(142, 112, 12, 14, 4, 10, "far")
    B.limb([(142, 118), (138, 140), (134, 156)], 8, 5, 6, 8, "far")
    B.lump(136, 146, 6, 5, 8, 4, "far")
    for k in range(3):
        B.limb([(132, 157), (122 + k * 5, 162)], 3, 2, 8, 9, "farclaw")
    B.lump(212, 108, 16, 18, 4, 12, "far")
    B.limb([(214, 118), (222, 140), (214, 154)], 9, 5, 6, 8, "far")
    for k in range(3):
        B.limb([(212, 156), (202 + k * 5, 162)], 3, 2, 8, 9, "farclaw")
    # the wing, folded: its bone arching up over the shoulders and back, the membrane hanging from it in tatters
    wing_pts = [(126, 74), (146, 28), (184, 16), (214, 30)]
    B.limb(wing_pts, 6, 3, 6, 10, "wingbone")
    for k, tp in enumerate([(232, 62), (222, 70), (206, 74)]):
        B.limb([(214, 30), tp], 3, 1.3, 10, 8, "wingbone")
    B.lump(146, 28, 5, 5, 10, 4, "wingbone")
    B.lump(214, 30, 4.5, 4.5, 10, 4, "wingbone")
    memb = poly([(130, 72), (146, 30), (184, 18), (214, 32), (232, 62), (222, 70), (206, 74), (180, 76), (150, 78)])
    strips = (np.abs(((xx * 0.16 + np.sin(yy * 0.1) * 0.6) % 1) - 0.5) < 0.36) | (yy < 48)
    ragged = yy < 58 + (vn(xx * 0.2, 2) - 0.3) * 30                     # the hem torn to different lengths
    memb &= strips & ragged & ~(vn(xx * 0.2, yy * 0.2) > 0.84)
    B.sheet(memb, 3 + (vn(xx * 0.1, yy * 0.05) - 0.5) * 2, "memb")
    # the body: the ribcage deep at the front, the belly tucked, the hips; the back a ridge of vertebrae with spines
    B.lump(122, 98, 34, 30, 10, 26, "body", rot=-0.1)
    B.lump(160, 102, 34, 24, 10, 22, "body")
    B.lump(196, 92, 22, 22, 10, 22, "body")
    back = [(96, 74), (130, 68), (166, 72), (200, 70), (226, 78)]
    for k in range(13):
        p, d = along(back, k / 12.0)
        nx, ny = d[1], -d[0]
        B.lump(p[0], p[1] + 3, 5, 4, 28, 6, "vert")
        h_ = 9 + 6 * np.sin(k / 12.0 * np.pi)
        B.limb([(p[0], p[1] - 2), (p[0] + 4 + nx * 0, p[1] - h_)], 2.6, 0.5, 30, 28, "spine")
    # the neck: forward from the chest, a chain of vertebrae under the hide, banded
    neck = [(102, 84), (80, 72), (60, 66), (44, 70)]
    B.limb(neck, 15, 10, 26, 34, "neck")
    for k in range(7):
        p, d = along(neck, (k + 0.5) / 7)
        B.lump(p[0], p[1] - 1, 6, 12 - k * 0.6, 34, 4, "neckband", rot=np.arctan2(d[1], d[0]))
        B.limb([(p[0], p[1] - 12 + k * 0.5), (p[0] + 5, p[1] - 20 + k * 0.8)], 2.2, 0.5, 38, 36, "spine")
    # the head, dropped: a long skull, the jaw hanging open, the great horn raking back, spurs behind the jaw
    B.limb([(48, 62), (30, 70), (10, 82)], 11, 5, 36, 42, "skull", flat=0.75)
    B.lump(46, 62, 12, 10, 36, 12, "skull")
    B.lump(40, 58, 7, 4, 46, 4, "brow", rot=-0.35)
    B.limb([(46, 74), (30, 86), (12, 96)], 5.5, 3, 34, 38, "jaw", flat=0.8)
    B.limb([(48, 54), (58, 34), (70, 18), (84, 12)], 5, 1.0, 44, 40, "horn")
    B.limb([(38, 56), (42, 46), (48, 40)], 3, 1, 46, 44, "horn")
    for k in range(3):
        B.limb([(50 + k * 4, 74 + k * 2), (60 + k * 6, 80 + k * 4)], 2.2, 0.5, 38, 36, "spur")
    # near legs, in front: a bulbous shoulder and forearm, knuckled feet, claws splayed
    B.lump(116, 110, 16, 18, 26, 16, "leg")
    B.limb([(116, 118), (110, 140), (104, 156)], 10, 6, 34, 36, "leg")
    B.lump(110, 140, 7, 6, 36, 5, "leg")
    for k in range(4):
        B.limb([(104, 157), (86 + k * 7, 162)], 3.4, 2.6, 36, 38, "leg")
        B.limb([(86 + k * 7, 162), (82 + k * 7, 168), (84 + k * 7, 172)], 2.4, 0.6, 38, 36, "claw")
    B.lump(190, 112, 20, 22, 26, 20, "leg")                            # the thigh, bulbous
    B.limb([(196, 124), (208, 144), (198, 158)], 9, 5, 34, 36, "leg")  # digitigrade: back to the hock, down to the foot
    B.lump(208, 144, 5, 5, 36, 4, "leg")
    for k in range(4):
        B.limb([(196, 158), (178 + k * 7, 164)], 3.2, 2.4, 36, 38, "leg")
        B.limb([(178 + k * 7, 164), (174 + k * 7, 169), (176 + k * 7, 173)], 2.2, 0.6, 38, 36, "claw")
    # the tail, back and down, spiked, its tip a blade
    tail = [(216, 92), (238, 104), (252, 126), (258, 150), (264, 162)]
    B.limb(tail, 11, 3, 22, 18, "tail")
    for k in range(8):
        p, d = along(tail, (k + 0.5) / 8)
        B.limb([(p[0] + d[1] * 6, p[1] - d[0] * 6), (p[0] + d[1] * 13 + d[0] * 3, p[1] - d[0] * 13 + d[1] * 3)], 2, 0.4, 24, 22, "spine")
    Z, part = B.Z, B.part
    show = Z > -500
    keratin = show & np.isin(part, ["horn", "claw", "farclaw", "spine", "spur"])
    # ---- carving: overlapping plates across the hide, bands round the neck, rings round the horn
    rg = np.random.default_rng(3)
    pts_ = np.stack([rg.uniform(0, SW, 1800), rg.uniform(0, SH, 1800)], 1)
    dd_, ii_ = cKDTree(pts_).query(np.stack([xx.ravel(), yy.ravel() * 1.25], 1), k=2)
    sgap = (dd_[:, 1] - dd_[:, 0]).reshape(SH, SW)
    hide = show & np.isin(part, ["body", "leg", "far", "tail", "skull", "jaw", "neck"])
    Z = np.where(hide & (sgap < 0.8), Z - 1.4, Z)
    Z = np.where(show & (part == "neckband") & (np.abs(((xx * 0.24 + yy * 0.06) % 1) - 0.5) > 0.42), Z - 1.4, Z)
    Z = np.where(show & (part == "horn") & (((xx * 0.35 + yy * 0.3) % 1) < 0.22), Z - 0.9, Z)
    orbit = (np.hypot((xx - 38) / 4.5, (yy - 64) / 3.2) < 1) & show
    Z = np.where(orbit, Z - 8, Z)
    mouth = poly([(48, 70), (30, 76), (10, 86), (12, 92), (32, 84), (48, 76)]) & show
    Z = np.where(mouth, Z - 12, Z)
    teeth = np.zeros((SH, SW), bool)
    rt = np.random.default_rng(8)
    x_ = 12.0
    while x_ < 46:
        ty = 70 + (46 - x_) * 0.42 * 0.0 + (x_ - 12) * -0.45 + 15
        ln_ = rt.uniform(3, 7) if rt.random() > 0.2 else 1.5
        teeth |= (np.abs(xx - x_ - (yy - ty) * 0.2) < 1.1 - (yy - ty) / (ln_ * 1.4)) & (yy >= ty) & (yy < ty + ln_)
        by_ = 92 - (x_ - 12) * 0.38
        ln2 = rt.uniform(2.5, 5.5)
        teeth |= (np.abs(xx - x_ - 1.5) < 1.0 - (by_ - yy) / (ln2 * 1.5)) & (yy <= by_) & (yy > by_ - ln2)
        x_ += rt.uniform(3.0, 4.6)
    teeth &= mouth
    Z = np.where(teeth, Z + 10, Z)
    # ---- the breaks: where the granite shell has fallen or been gnawed away, the dracolich's own body shows
    br = np.zeros((SH, SW), bool)
    br |= poly([(108, 84), (150, 80), (176, 90), (178, 116), (160, 126), (128, 124), (110, 110)]) & ~(vn(xx * 0.12, yy * 0.12) > 0.74)
    br |= poly([(64, 60), (80, 58), (86, 76), (70, 82), (60, 74)])        # a band of the neck
    br |= poly([(184, 96), (204, 92), (210, 112), (196, 124), (182, 116)])  # the thigh
    br |= poly([(40, 58), (52, 56), (54, 66), (44, 70)])                  # over the eye: the skull beneath
    ang_edge = vn(xx * 0.35, yy * 0.35) > 0.5
    br = br & (ndimage.binary_erosion(br, iterations=2) | ang_edge)        # edges broken, not smooth
    cracks = ((1 - np.abs(vn(xx * 0.05 + 3, yy * 0.05) * 2 - 1)) > 0.968) & show
    cracks = ndimage.binary_dilation(cracks, iterations=1) & (fbm(xx * 0.1 + 4, yy * 0.1) > 0.5)
    flesh = (br | cracks) & show & ~keratin & ~np.isin(part, ["memb", "wingbone"])
    rim = ndimage.binary_dilation(flesh, iterations=2) & ~flesh & show
    Z = np.where(flesh, Z - 6, Z)
    # inside: ribs and vertebrae, steel-grey bone, the copper flesh hanging between them in ropes
    ribs = np.zeros((SH, SW), bool)
    for k in range(6):
        x0_ = 114 + k * 11
        ribs |= (np.abs(xx - (x0_ + (yy - 84) * 0.28 - (yy - 84) ** 2 * 0.004)) < 2.4 - (yy - 84) * 0.012) & (yy > 82) & (yy < 124 - k)
    ribs &= flesh
    vtb = flesh & (part == "neck") & (np.abs(((xx * 0.18) % 1) - 0.5) < 0.3) & (np.abs(yy - (62 + (xx - 64) * 0.1)) < 6)
    bone = ribs | vtb
    return dict(Z=Z, show=show, part=part, flesh=flesh, rim=rim, bone=bone, orbit=orbit, teeth=teeth, mouth=mouth,
                keratin=keratin, xx=xx, yy=yy)


ST = build_statue()


def light_relief(Z, show):
    Zs = np.where(show, Z, -60.0)
    gy_, gx_ = np.gradient(Zs)
    gx_ = np.clip(gx_, -6, 6)
    gy_ = np.clip(gy_, -6, 6)
    n = np.dstack([-gx_, -gy_, np.ones_like(Z)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.55, -0.55, 0.63])
    L /= np.linalg.norm(L)
    dif = np.clip((n * L).sum(2), 0, 1)
    shad = np.zeros_like(Z, bool)
    for k in range(1, 70):
        sx_ = np.clip((_XX - 0.707 * k).astype(int), 0, SW - 1)
        sy_ = np.clip((_YY - 0.707 * k).astype(int), 0, SH - 1)
        shad |= Zs[sy_, sx_] > Zs + k * 0.81 + 1.0
    dif = np.where(shad, dif * 0.12, dif)
    Zb = Zs.copy()
    for _ in range(6):
        Zb = (Zb + np.roll(Zb, 2, 0) + np.roll(Zb, -2, 0) + np.roll(Zb, 2, 1) + np.roll(Zb, -2, 1)) / 5
    ao_ = np.clip((Zb - Zs) * 0.05, 0, 1) * show
    return n, dif, ao_


# Somulo's palette: one warm family for the rotten flesh, burnt copper to pale gold; a cool steel for everything hard
RAMPS["rot"] = ramp("#0e0603", "#2a1206", "#52260c", "#7e4216", "#b06a2a", "#e0a858")
RAMPS["steel"] = ramp("#14161e", "#2c303e", "#4c5266", "#767e94", "#a8aec0", "#d8dce8")


def paint_statue(t):
    Z, show, part, flesh = ST["Z"], ST["show"].copy(), ST["part"], ST["flesh"]
    xx, yy = ST["xx"], ST["yy"]
    beat = 0.5 + 0.5 * np.sin(t * 2.2) ** 3
    # the flesh in ropes: a noise stretched downward so it hangs in strands, black voids between them; it heaves
    rope = vn(xx * 0.55 + np.sin(yy * 0.05) * 2, yy * 0.07 - t * 0.05)
    void = flesh & (rope < 0.3)
    Zf = np.where(flesh, Z + (rope - 0.5) * 9 + beat * 2.0, Z)
    Zf = np.where(void, Z - 8, Zf)
    n, dif, ao_ = light_relief(Zf, show)
    bay_ = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    I = 0.1 + dif * 1.05 - ao_ * 0.55
    # granite: a broad mottle, darker in its hollows; the hard rim of light along each form's upper edge
    mott = vn(xx * 0.15, yy * 0.15) * 0.6 + vn(xx * 0.45 + 7, yy * 0.45) * 0.4
    v = I * 0.85 + (mott - 0.5) * 0.12 + (bay_ - 0.5) * 0.03
    rgb = RAMPS["granite"][np.clip((v * 6).astype(int), 0, 5)]
    # ichor and rust-dark stains run down from every break
    run = flesh.copy()
    drip = np.zeros_like(show)
    for k in range(20):
        run = np.roll(run, 1, 0) & (vn(xx * 0.45, np.full_like(yy, k * 0.27)) > 0.33 + k * 0.024)
        drip |= run
    drip &= show & ~flesh
    rgb[drip] = rgb[drip] * 0.66 + np.array(hexc("#2a1408")) * 0.34
    mossm = show & ~flesh & (n[..., 1] < -0.45) & (fbm(xx * 0.08 + 2, yy * 0.08) > 0.62)
    rgb[mossm] = RAMPS["moss"][np.clip((v[mossm] * 6).astype(int), 0, 5)]
    # the flesh: copper ropes lit hard along their tops, dark cores, black voids; bone in steel
    fv = I * 0.95 + (rope - 0.5) * 0.15 + beat * 0.04
    fcol = RAMPS["rot"][np.clip((fv * 6).astype(int), 0, 5)]
    rgb = np.where(flesh[..., None], fcol, rgb)
    rgb[void] = RAMPS["rot"][0]
    bn = ST["bone"]
    rgb[bn] = RAMPS["steel"][np.clip(((I[bn] * 0.9 + 0.1) * 6).astype(int), 0, 5)]
    rim = ST["rim"]
    rgb[rim] = RAMPS["granite"][2]
    rgb[rim & np.roll(flesh, 2, 0)] = RAMPS["granite"][4]
    # the mouth's dark; the teeth (granite where the shell holds)
    rgb[ST["mouth"]] = np.array(hexc("#070404"))
    tt_ = ST["teeth"]
    rgb[tt_] = RAMPS["granite"][np.clip(((I[tt_] * 0.7 + 0.2) * 6).astype(int), 0, 5)]
    # the eye: real, in the stone orbit, low and wet, a cold pupil (Somulo's opens: a sliver of steel-blue light)
    orb = ST["orbit"]
    ys, xs = np.nonzero(orb)
    ecx, ecy = xs.mean() + 0.5, ys.mean() + 0.5
    eye = np.hypot((xx - ecx) / 3.6, (yy - ecy) / 2.4) < 1
    open_ = 0.35 + 0.65 * np.clip(np.sin(t * 0.5) * 2, 0, 1)
    rgb[eye] = RAMPS["rot"][1]
    lid = eye & (np.abs(yy - ecy) < 2.4 * open_)
    rgb[lid] = ramp("#3a4250", "#8a98b0", "#cfe0f0")[np.clip((np.clip(1 - np.hypot((xx - ecx) / 3.6, (yy - ecy) / 2.4), 0, 1) * 2.8).astype(int), 0, 2)][lid]
    rgb[lid & (np.abs(xx - ecx - np.sin(t * 0.7)) < 0.6)] = np.array(hexc("#05070a"))
    # a strand of rotten tongue and drool hanging from the jaw
    sway = np.sin(t * 1.1) * 1.4
    for j in range(22):
        tx = 26 + np.sin(j * 0.2) * 1.2 + sway * (j / 22) ** 2
        for w_ in range(-1, 2 if j < 14 else 1):
            X_, Y_ = int(round(tx + w_)), 86 + j
            if 0 <= Y_ < SH and 0 <= X_ < SW:
                rgb[Y_, X_] = RAMPS["rot"][3 if w_ < 0 else 2] if j % 5 else RAMPS["rot"][4]
                show[Y_, X_] = True
    ed = show & ~(np.roll(show, -1, 1) & np.roll(show, -1, 0))
    el = show & ~(np.roll(show, 1, 1) & np.roll(show, 1, 0))
    rgb[ed] *= 0.5
    rgb[el & ~flesh] = np.clip(rgb[el & ~flesh] * 1.22, 0, 1)
    rgb *= np.array([0.9, 0.92, 1.02])
    return np.clip(rgb, 0, 1), show


# where the statue stands: its talons on the plinth's front edge
PSX, PSY = to_screen(PL[0] + 0.0, PL[1] + 1.1, 1.0)
SX0 = int(round(PSX - 150))
SY0 = int(round(PSY - 172))
SDEPTH = PL[0] + PL[1] + 0.6


def frame(t):
    rgb, v = shade_world()
    st, show = paint_statue(t)
    # its shadow cast on the courtyard and the wall behind: the silhouette thrown down-right, softened
    shm = np.zeros((H, W), bool)
    for j in range(SH):
        hgt = SH - j                                                # height above the plinth's top, px
        Y_ = SY0 + SH - int(hgt * 0.3)                              # flattened onto the ground
        for i in np.nonzero(show[j])[0]:
            X_ = SX0 + i + int(hgt * 0.75)                          # thrown away from the moon, down-right
            if 0 <= X_ < W and 0 <= Y_ < H:
                shm[Y_, X_] = True
    shm = ndimage.binary_closing(shm, iterations=2)
    edge = shm & ~ndimage.binary_erosion(shm, iterations=2)
    keep = shm & ((~edge) | (bay < 0.5)) & (depth < SDEPTH + 3) & hit
    rgb[keep] *= 0.55
    for j in range(SH):
        Y_ = SY0 + j
        if not (0 <= Y_ < H):
            continue
        for i in np.nonzero(show[j])[0]:
            X_ = SX0 + i
            if 0 <= X_ < W and (depth[Y_, X_] < SDEPTH + 0.6 or not hit[Y_, X_]):
                rgb[Y_, X_] = st[j, i]
    # a low mist through the courtyard, drifting
    n = fbm(hx * 0.4 + t * 0.05, hy * 0.4 - t * 0.02)
    low = np.clip(1.0 - hz * 1.3, 0, 1)
    lv = np.clip((n - 0.55) * 2.8, 0, 1) * low * hit + (bay - 0.5) * 0.08
    a = np.where(lv > 0.6, 0.2, np.where(lv > 0.35, 0.12, np.where(lv > 0.15, 0.05, 0.0)))[..., None]
    rgb = rgb * (1 - a) + np.array(hexc("#6a7890")) * a
    return np.clip(rgb, 0, 1)


def main(out_png, out_webp=None):
    Image.fromarray((frame(0.4) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(out_png)
    print("saved", out_png)
    if out_webp:
        ims = [Image.fromarray((frame(i / 12.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(36)]
        ims[0].save(out_webp, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=85)
        print("saved", out_webp)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dracolich.png", sys.argv[2] if len(sys.argv) > 2 else None)
