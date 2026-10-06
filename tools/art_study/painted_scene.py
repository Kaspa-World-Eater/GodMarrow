"""A painted ruin scene, rendered the title's way (godmarrow-title-method: height fields, real lights, ramp + dither,
living layers) to the painted standard (docs/PAINTED_STANDARD.md). Derek 2026-10-06: "I think you can do better on
the environment and ruins, refine it all."

What the first pass lacked, and what this does instead:
- form: every prop and the ground are one height field in the world, ray-cast in iso, so faces, tops, occlusion and
  cast shadows are real, not painted guesses;
- light: cool moonlight from the upper left plus a warm brazier that flickers; shadows cast by both; ambient
  occlusion where things meet the ground;
- colour: hue-shifted ramps (shadows go blue-violet, lights go warm), and the light's temperature tints the tone;
- paint: tones quantised to six per material, dither only nudging boundaries, strokes in the albedo (rain-streaks down
  stone faces, wind strokes in grass), a paper tooth fixed to the world;
- detail where it counts: block courses with chipped lit edges, flutes on the pillars, a carved ring on a gravestone,
  moss on the tops and in the joints, ivy, rubble, grass tufts overlapping the feet of things, a puddle with the sky in
  it.

  python tools/art_study/painted_scene.py OUT.png [OUT.webp]
"""
import sys
import numpy as np
from PIL import Image

RNG = np.random.default_rng(11)
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


# hue-shifted ramps: the darks lean blue-violet, the lights lean warm
RAMPS = {
    "grass": ramp("#0d1219", "#16211d", "#243522", "#3c5127", "#657a33", "#a3a457"),
    "dry":   ramp("#121219", "#25221f", "#3f3726", "#625431", "#8f7c44", "#c4b26b"),
    "dirt":  ramp("#100e15", "#1f181c", "#352822", "#523e2e", "#775b40", "#a5865d"),
    "flags": ramp("#0e0e17", "#1d1d29", "#31303d", "#4c4954", "#726c6d", "#a79e90"),
    "stone": ramp("#0c0c16", "#1b1a28", "#302d3b", "#4b4651", "#736b69", "#aa9f8f"),
    "moss":  ramp("#0b1214", "#14231b", "#21361f", "#365026", "#577030", "#879447"),
    "mud":   ramp("#09090f", "#141219", "#221d21", "#372d2b", "#524337", "#786652"),
}
GRASS, DIRT, FLAGS, STONE, GRAVE, MUD, DRY = 0, 1, 2, 3, 4, 5, 6
MAT_RAMP = {GRASS: "grass", DIRT: "dirt", FLAGS: "flags", STONE: "stone", GRAVE: "stone", MUD: "mud", DRY: "dry"}

# ------------------------------------------------------------------ the world
N, R = 44, 12                  # tiles, cells per tile
OFF = 12.0                     # the world runs from -OFF, so it fills the frame's corners
G = N * R
KZ = 8.0                       # logical px per tile of height; a tile is 16 x 8 logical px
gy, gx = np.mgrid[0:G, 0:G]
WX, WY = (gx + 0.5) / R - OFF, (gy + 0.5) / R - OFF
Hm = np.zeros((G, G))
Mat = np.full((G, G), GRASS)
Tag = np.zeros((G, G), int)    # which prop a cell belongs to (pillars: 10+i, graves: 20+i, wall: 1)
pillars, graves = [], []

# ground: gentle bumps, bare dirt along the path's edges and round the ruin, a dry patch, a mud hollow with a puddle
Hm += (fbm(WX * 0.9, WY * 0.9) - 0.5) * 0.12
path_c = 11.5 + 1.8 * np.sin(WX * 0.32 + 0.6)
pd = np.abs(WY - path_c)
on_path = pd < 1.25 + (fbm(WX * 0.7, WY * 0.7) - 0.5) * 0.5
Mat[(pd < 2.0 + fbm(WX * 0.5 + 3, WY * 0.5) * 0.8) & ~on_path] = DIRT
Mat[(fbm(WX * 0.35 + 7, WY * 0.35) > 0.62) & (Mat == GRASS)] = DRY
# flagstones on the path: jittered voronoi, each stone a little proud, the joints sunk
pts = np.array([(i + RNG.random() * 0.9, j + RNG.random() * 0.8) for i in np.arange(-OFF, N - OFF, 1.25) for j in np.arange(-OFF, N - OFF, 1.0)])
from scipy.spatial import cKDTree  # noqa: E402
tree = cKDTree(pts)
dd, ii = tree.query(np.stack([WX.ravel(), WY.ravel()], 1), k=2)
gap = (dd[:, 1] - dd[:, 0]).reshape(G, G)
sid = ii[:, 0].reshape(G, G)
missing = (_P[sid % 1024, (sid * 7) % 1024] < 0.12)                  # a few stones gone, earth showing
Mat[on_path & ~missing] = FLAGS
Mat[on_path & missing] = DIRT
Hm += np.where(on_path & ~missing, 0.07 * np.clip(gap / 0.1, 0, 1), 0.0)
joint = on_path & ~missing & (gap < 0.1)
Mat[joint] = DIRT
# stones half-sunk in the grass
for k in range(26):
    cx, cy = RNG.random() * 24 - 1, RNG.random() * 24 - 2
    rr_ = 0.12 + RNG.random() * 0.18
    m = (np.hypot(WX - cx, (WY - cy) * 1.2) < rr_) & (Mat == GRASS)
    Hm[m] += 0.08 + RNG.random() * 0.06
    Mat[m] = FLAGS
# mud hollow and puddle
md = np.hypot(WX - 15.0, (WY - 15.6) * 1.3)
Mat[md < 1.6 + (fbm(WX, WY) - 0.5) * 0.6] = MUD
Hm -= np.clip(1.4 - md, 0, 1) * 0.08
puddle = md < 0.9 + (fbm(WX * 1.4, WY * 1.4) - 0.5) * 0.4

# the ruined wall: an L of blocks, its top broken away course by course (courses 0.5 tile)
def box(x0, y0, x1, y1, h, mat, tag):
    m = (WX >= x0) & (WX < x1) & (WY >= y0) & (WY < y1)
    Hm[m] = np.maximum(Hm[m], h if np.isscalar(h) else h[m])
    Mat[m] = mat
    Tag[m] = tag
    return m

brk = 3.6 - np.floor(np.clip((WX - 6.0) * 0.55 + fbm(WX * 0.6, 3) * 2.0 - 0.6, 0, 6) / 0.5) * 0.5   # steps down eastward
box(5.0, 5.0, 11.8, 5.75, np.maximum(brk, 0.5), STONE, 1)
brk2 = 3.6 - np.floor(np.clip((WY - 5.0) * 0.7 + fbm(3, WY * 0.6) * 2.0 - 0.4, 0, 6) / 0.5) * 0.5
box(5.0, 5.0, 5.75, 10.4, np.maximum(brk2, 0.5), STONE, 1)
# a doorway gap in the long wall
gapm = (WX > 8.0) & (WX < 9.1) & (WY < 5.8) & (WY >= 5.0)
Hm[gapm] = 0.25
# rubble fallen from it: small blocks
for k in range(16):
    cx, cy = 6.2 + RNG.random() * 6.5, 6.0 + RNG.random() * 1.6
    if RNG.random() < 0.4:
        cx, cy = 6.0 + RNG.random() * 1.4, 6.0 + RNG.random() * 4.5
    s = 0.18 + RNG.random() * 0.22
    box(cx, cy, cx + s * 1.3, cy + s, 0.12 + RNG.random() * 0.25, STONE, 2)

# pillars: fluted, snapped off at different heights; one drum fallen and lying
def pillar(cx, cy, r, h, tag):
    d = np.hypot(WX - cx, WY - cy)
    m = d < r
    top = h - (fbm(WX * 3 + tag, WY * 3) - 0.3) * 0.7                # the jagged break
    Hm[m] = np.maximum(Hm[m], top[m])
    Mat[m] = STONE
    Tag[m] = tag
    base = (d < r + 0.16) & ~m                                        # its plinth
    Hm[base] = np.maximum(Hm[base], 0.22)
    Mat[base] = STONE
    Tag[base] = 2
    pillars.append((cx, cy, r, tag))

pillar(14.6, 7.6, 0.55, 5.6, 10)
pillar(17.6, 10.6, 0.55, 2.2, 11)
pillar(11.6, 8.4, 0.5, 3.4, 12)
# the fallen drum, lying along x
ax_d = np.abs(WY - 13.2)
along = (WX > 17.0) & (WX < 18.4)
m = along & (ax_d < 0.5)
Hm[m] = np.maximum(Hm[m], 0.5 + np.sqrt(np.clip(0.25 - ax_d[m] ** 2, 0, 1)))
Mat[m] = STONE
Tag[m] = 13

# gravestones: thin slabs facing the viewer (+y), rounded heads
def grave(cx, cy, w, h, tag):
    m = (np.abs(WX - cx) < w / 2) & (np.abs(WY - cy) < 0.09)
    u = (WX - cx) / (w / 2)
    top = h - (1 - np.sqrt(np.clip(1 - u * u, 0, 1))) * w * 0.5
    Hm[m] = np.maximum(Hm[m], top[m])
    Mat[m] = GRAVE
    Tag[m] = tag
    mound = (np.hypot((WX - cx) / (w * 0.7), (WY - cy - 0.45) / 0.5) < 1) & (Tag == 0)
    Hm[mound] += 0.07 * (1 - np.hypot((WX[mound] - cx) / (w * 0.7), (WY[mound] - cy - 0.45) / 0.5))
    Mat[mound] = DIRT
    graves.append((cx, cy, w, h, tag))

grave(8.3, 14.6, 0.85, 1.7, 20)
grave(9.9, 15.4, 0.75, 1.4, 21)
grave(7.0, 16.2, 0.8, 1.5, 22)

# a brazier on a short drum, its fire the warm light
BRZ = (12.6, 12.4)
d = np.hypot(WX - BRZ[0], WY - BRZ[1])
Hm[d < 0.3] = np.maximum(Hm[d < 0.3], 0.95)
bowl = d < 0.5
Hm[bowl] = np.maximum(Hm[bowl], np.where(d[bowl] > 0.38, 1.22, 1.08))   # a rim, the coals sunk inside
Mat[d < 0.5] = STONE
Tag[d < 0.5] = 30
coals = d < 0.38
LAMP = np.array([BRZ[0], BRZ[1], 1.55])

# a softened copy for normals
def blur(a, k=1):
    out = a.copy()
    for _ in range(k):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out

Hb = blur(Hm, 1)
GY, GX = np.gradient(Hb, 1.0 / R)


def H_at(x, y):
    ix = np.clip(((x + OFF) * R).astype(int), 0, G - 1)
    iy = np.clip(((y + OFF) * R).astype(int), 0, G - 1)
    out = Hm[iy, ix]
    return np.where((x < -OFF) | (y < -OFF) | (x >= N - OFF) | (y >= N - OFF), -9.0, out)


# ------------------------------------------------------------------ the camera: iso ray-cast
W, H = 320, 196
FOC = (11.6, 10.6)             # the frame's centre, in tiles
CX0, CY0 = 160 - (FOC[0] - FOC[1]) * 8, 98 - (FOC[0] + FOC[1]) * 4 + 18
SY, SX = np.mgrid[0:H, 0:W].astype(float)
sx, sy = SX + 0.5 - CX0, SY + 0.5 - CY0
DZ = 1.0 / 20
ZMAX = 7.0
def cell(x, y):
    return min(G - 1, max(0, int((y + OFF) * R))), min(G - 1, max(0, int((x + OFF) * R)))
hit = np.zeros((H, W), bool)
hz = np.zeros((H, W))
hx = np.zeros((H, W))
hy = np.zeros((H, W))
for z in np.arange(ZMAX, -0.6, -DZ):
    s = (sy + z * KZ) / 4.0
    x = (s + sx / 8.0) / 2.0
    y = (s - sx / 8.0) / 2.0
    h = H_at(x, y)
    new = (~hit) & (h >= z)
    hit |= new
    hz[new], hx[new], hy[new] = z, x[new], y[new]
ix = np.clip(((hx + OFF) * R).astype(int), 0, G - 1)
iy = np.clip(((hy + OFF) * R).astype(int), 0, G - 1)
hh = Hm[iy, ix]
top = (hh - hz) < DZ * 1.6
hz = np.where(top, hh, hz)
mat = Mat[iy, ix]
tag = Tag[iy, ix]
depth = hx + hy + hz * 0.001

# normals: tops from the softened field's slope, sides horizontal from its gradient (facing the viewer)
gxh, gyh = GX[iy, ix], GY[iy, ix]
nt = np.dstack([-gxh, -gyh, np.ones_like(gxh)])
ns = np.dstack([-gxh, -gyh, np.full_like(gxh, 0.12)])
nrm = np.where(top[..., None], nt, ns)
# pillars: true cylinder normals plus flutes on their sides
for (cx, cy, r, tg) in pillars:
    m = (tag == tg) & ~top
    ang = np.arctan2(hy - cy, hx - cx)
    fl = np.where(np.sin(ang * 8) > 0.35, -0.32, 0.12)            # eight flutes: a groove turns its face away
    nx, ny = np.cos(ang + fl), np.sin(ang + fl)
    nrm[m] = np.dstack([nx, ny, np.zeros_like(nx)])[m]
m = (tag == 13) & True                                               # the drum: a lying cylinder's normal
nrm[m] = np.dstack([np.zeros_like(hy), (hy - 13.2), (hz - 0.5)])[m] + np.array([0.0, 0.0, 0.01])
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True) + 1e-6

# ------------------------------------------------------------------ light
MOON = np.array([-0.62, 0.5, 0.78])
MOON /= np.linalg.norm(MOON)


def march_shadow(px, py, pz, d, n=70, step=0.09):
    occ = np.zeros(px.shape, bool)
    for k in range(1, n):
        t = k * step
        x, y, z = px + d[0] * t, py + d[1] * t, pz + d[2] * t + 0.03
        occ |= H_at(x, y) > z
    return occ


moon_sh = march_shadow(hx + nrm[..., 0] * 0.14, hy + nrm[..., 1] * 0.14, hz + nrm[..., 2] * 0.05, MOON)
# ambient occlusion: how much of the near field stands above this point
ao = np.zeros((H, W))
for rad in (0.22, 0.5, 0.9):
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        ao += np.clip((H_at(hx + np.cos(a) * rad, hy + np.sin(a) * rad) - hz) / (rad * 1.6), 0, 1)
ao = np.clip(ao / 24.0 * 1.6, 0, 1)
ndl_m = np.clip((nrm * MOON).sum(2), 0, 1) * (~moon_sh)
# the brazier: direction, falloff, its own shadows (computed once; its flicker scales it per frame)
LV = np.dstack([LAMP[0] - hx, LAMP[1] - hy, LAMP[2] - hz])
LD = np.linalg.norm(LV, axis=2)
LVn = LV / (LD[..., None] + 1e-6)
lamp_sh = np.zeros((H, W), bool)
for k in range(1, 40):
    f = k / 40.0
    x, y, z = hx + nrm[..., 0] * 0.14 + LV[..., 0] * f, hy + nrm[..., 1] * 0.14 + LV[..., 1] * f, hz + LV[..., 2] * f + 0.03
    lamp_sh |= (H_at(x, y) > z) & (f < 0.93)
ndl_w = np.clip((nrm * LVn).sum(2), 0, 1) * (~lamp_sh) / (1 + (LD / 2.6) ** 2)

# ------------------------------------------------------------------ albedo detail (in world/face coordinates)
bay = B4[(SY.astype(int)) % 4, (SX.astype(int)) % 4]
alb = np.zeros((H, W))
tooth = (vn(hx * 6 + 71, hy * 6) * 0.6 + vn(hx * 17, hy * 17) * 0.4 - 0.5) * 0.05
alb += tooth
# grass and dry: wind strokes, darker clumps
gm = (mat == GRASS) | (mat == DRY)
st = vn((hx * 0.8 + hy * 0.4) * 3.0, (hy * 0.8 - hx * 0.4) * 14.0)
alb += np.where(gm, (st - 0.5) * 0.2 + (fbm(hx * 0.8, hy * 0.8) - 0.5) * 0.26 - 0.05, 0)
clump = gm & (vn(hx * 3.5 + 11, hy * 3.5) > 0.7)
alb += np.where(clump, -0.12, 0)                                        # darker clumps of thicker grass
# dirt: long strokes, pebbles (a lit top and a pooled dark under)
dm = (mat == DIRT) | (mat == MUD)
alb += np.where(dm, (vn(hx * 2.0, hy * 9.0) - 0.5) * 0.18, 0)
peb = vn(hx * 9 + 5, hy * 9) > 0.86
alb += np.where(dm & peb, 0.22, 0)
# flagstones: each stone its own tone, the joints dark, the stone's upper-left edge lit
fm = (mat == FLAGS) & top
gp = gap[iy, ix]
stone_tone = (_P[sid[iy, ix] % 1024, 3] - 0.5) * 0.22
alb += np.where(fm, stone_tone + (vn(hx * 1.5, hy * 1.5) - 0.5) * 0.08, 0)
alb += np.where(fm & (gp < 0.17), 0.1, 0)                               # each stone's worn, lit rim
# wall faces: courses of blocks, staggered; mortar sunk; each block's top edge lit and corners chipped
wm = (tag == 1) & ~top
u_face = np.where(np.abs(nrm[..., 1]) > np.abs(nrm[..., 0]), hx, hy)
course = np.floor(hz / 0.5)
cy_in = (hz / 0.5) % 1.0
bx = (u_face * 1.15 + course * 0.47) % 1.0
blk_id = np.floor(u_face * 1.15 + course * 0.47) + course * 13
alb += np.where(wm, (_P[(blk_id.astype(int) * 17) % 1024, 5] - 0.5) * 0.3 + 0.04, 0)
alb += np.where(wm & ((cy_in < 0.09) | (bx < 0.05)), -0.5, 0)               # mortar
alb += np.where(wm & (cy_in > 0.86), 0.18, 0)                             # the block's lit top edge
chip = wm & (cy_in > 0.78) & (bx < 0.2) & (vn(blk_id * 3.0, 1.0) > 0.5)
alb += np.where(chip, -0.3, 0)
for (cx, cy, r, tg) in pillars:
    m = (tag == tg) & ~top
    ang = np.arctan2(hy - cy, hx - cx)
    sv = np.sin(ang * 8)
    alb[m & (sv > 0.35)] -= 0.16
    alb[m & (sv > -0.05) & (sv <= 0.35)] += 0.1
# rain-streaks down every stone face
sm = ((mat == STONE) | (mat == GRAVE)) & ~top
alb += np.where(sm, (vn(u_face * 6.0, hz * 0.8) - 0.5) * 0.14, 0)
# wall and stone tops: rough, lighter, joints
tm = (mat == STONE) & top
alb += np.where(tm, 0.08 + (vn(hx * 8, hy * 8) - 0.5) * 0.2, 0)
# graves: a carved ring and worn lettering on the face, cut in (dark) with a lit lower lip
for (cx, cy, w, h, tg) in graves:
    m = (tag == tg) & ~top
    gu = hx - cx
    rr = np.hypot(gu * 1.0, (hz - (h - 0.42)) * 1.0)
    ring = (np.abs(rr - 0.16) < 0.035) | (rr < 0.04)
    alb[m & ring] -= 0.45
    lip = (np.abs(rr - 0.2) < 0.025) & (hz < h - 0.42)
    alb[m & lip] += 0.2
    for k in range(3):
        ly = h - 0.78 - k * 0.14
        letters = (np.abs(hz - ly) < 0.025) & (np.abs(gu) < w * 0.32 - k * 0.04) & (vn(hx * 40, k * 3.0) > 0.35)
        alb[m & letters] -= 0.35
# moss: on stone tops and in the lower courses where water sits; in the path's joints
moss = ((mat == STONE) | (mat == GRAVE)) & ((top & (fbm(hx * 2, hy * 2) > 0.56)) | (~top & (hz < 0.45) & (fbm(hx * 3, hz * 3 + hy) > 0.62)))
moss |= (mat == DIRT) & on_path[iy, ix] & (fbm(hx * 2 + 4, hy * 2) > 0.45)       # moss in the joints
moss_m = moss & (mat != GRASS)

# the rim: a prop pixel whose neighbour up or to the left is much further back (the silhouette's lit edge)
propm = (tag > 0) & (tag != 2)
behind_l = np.roll(depth, 1, axis=1) < depth - 0.6
behind_u = np.roll(depth, 1, axis=0) < depth - 0.6
rim = (propm & (behind_l | behind_u) & (ndl_m > 0.05)).astype(float)

# ------------------------------------------------------------------ shade a frame
def shade(flick=1.0):
    stone = (mat == STONE) | (mat == GRAVE) | (mat == FLAGS)
    amb = 0.14 + 0.08 * nrm[..., 2] + stone * 0.06
    bounce = stone * (1 - np.abs(nrm[..., 2])) * np.clip(1.2 - hz * 0.25, 0.3, 1) * 0.14     # light thrown back up off the ground into shade
    I = amb * (1 - ao * 0.75) + bounce + ndl_m * np.where(stone, 1.0, 0.42) + ndl_w * 1.2 * flick
    I = I + rim * 0.22                                               # the lit rim where a prop's edge meets what is behind
    v = I * 0.78 + alb + (bay - 0.5) * 0.035
    rgb = np.zeros((H, W, 3))
    for mid, rn in MAT_RAMP.items():
        m = mat == mid
        if not m.any():
            continue
        rp = RAMPS[rn]
        idx = np.clip((v[m] * len(rp)).astype(int), 0, len(rp) - 1)
        rgb[m] = rp[idx]
    rpm = RAMPS["moss"]
    idx = np.clip((v[moss_m] * 0.95 * len(rpm)).astype(int), 0, len(rpm) - 1)
    rgb[moss_m] = rpm[idx]
    # the puddle: the night sky in it, dragged strokes of moonlight, the brazier's glow broken on it
    pm = puddle[iy, ix] & top & (mat == MUD)
    sky = vn(hx * 2.0, hy * 10.0)
    pv = 0.18 + (sky > 0.6) * 0.25 + (sky > 0.8) * 0.25 + ndl_w * 0.6 * flick * (vn(hx * 3, hy * 12) > 0.55)
    pc = ramp("#06070d", "#0d1220", "#1b2538", "#34445e", "#62728c", "#a3aec0")
    rgb[pm] = pc[np.clip((pv[pm] * 6).astype(int), 0, 5)]
    # light temperature: warm where the brazier wins, cool where the moon does; stepped, as a painter mixes
    wr = ndl_w * flick / (ndl_w * flick + ndl_m * 0.5 + 0.12)
    wr = np.round(np.clip(wr, 0, 1) * 3) / 3
    tint = np.dstack([0.86 + wr * 0.34, 0.92 + wr * 0.02, 1.06 - wr * 0.3])
    rgb = np.clip(rgb * tint, 0, 1)
    cm = coals[iy, ix] & top
    glow = 0.5 + 0.5 * flick + (vn(hx * 9, hy * 9) - 0.5) * 0.6
    cr = ramp("#2a0a06", "#6a1a08", "#b23a10", "#e87020", "#ffc060")
    rgb[cm] = cr[np.clip((glow[cm] * 3.2).astype(int), 0, 4)]
    rgb[~hit] = hexc("#07070b")
    return rgb, v


# ------------------------------------------------------------------ living layers: grass tufts, ivy, the fire
def to_screen(x, y, z=0.0):
    return (x - y) * 8 + CX0, (x + y) * 4 - z * KZ + CY0


tufts = []
for k in range(2200):
    x, y = RNG.random() * 26 - 1, RNG.random() * 26 - 2
    iyy, ixx = cell(x, y)
    mt = Mat[iyy, ixx]
    if mt not in (GRASS, DRY) or Tag[iyy, ixx] != 0:
        continue
    near = Hm[max(0, iyy - 6):iyy + 7, max(0, ixx - 6):ixx + 7].max() > 0.3          # thicker at the feet of things
    if not near and (fbm(np.array([x * 0.8]), np.array([y * 0.8]))[0] < 0.55 or RNG.random() < 0.5):
        continue
    tufts.append((x, y, mt, near, RNG.random()))


def draw_tufts(rgb, v, sway):
    for (x, y, mt, near, r0) in tufts:
        sxp, syp = to_screen(x, y, Hm[cell(x, y)])
        bxp, byp = int(sxp), int(syp)
        if not (0 <= bxp < W and 0 <= byp < H):
            continue
        dpt = x + y
        base_v = v[byp, bxp] if (hit[byp, bxp] and tag[byp, bxp] == 0) else 0.26
        rp = RAMPS["grass" if mt == GRASS else "dry"]
        nb = 4 + int(r0 * 4) + (3 if near else 0)
        rr = np.random.default_rng(int(r0 * 1e6))
        for b in range(nb):
            hgt = rr.uniform(3, 8) * (1.4 if near else 1.0)
            lean = rr.normal(0.4, 0.5) + sway * (0.6 + 0.4 * np.sin(x * 0.7 + y * 0.3))
            ox = rr.normal(0, 1.4)
            for k in range(int(hgt)):
                f = k / hgt
                px_ = int(round(bxp + ox + lean * f * f * 3))
                py_ = byp - k
                if 0 <= px_ < W and 0 <= py_ < H and depth[py_, px_] < dpt + 0.15:
                    tv = base_v * 0.85 + 0.02 + f * 0.26
                    rgb[py_, px_] = rp[np.clip(int(tv * 6), 0, 5)]


ivy = []
for k in range(30):
    x = 5.0 + RNG.random() * 6.8
    ivy.append((x, 5.75, RNG.random()))
for k in range(16):
    y = 5.0 + RNG.random() * 5.4
    ivy.append((5.75, y, RNG.random()))


def draw_ivy(rgb, sway):
    rp = RAMPS["moss"]
    for (x, y, r0) in ivy:
        hcol = Hm[cell(x - 0.09, y - 0.09)]
        if hcol < 0.8 or fbm(np.array([x * 1.3]), np.array([y * 1.3]))[0] < 0.5:
            continue
        sxp, syp = to_screen(x, y, hcol)
        L = int(6 + r0 * 16)
        for k in range(L):
            px_ = int(round(sxp + np.sin(k * 0.5 + r0 * 9) * 0.8 + sway * 0.4 * k / L))
            py_ = int(syp + k)
            if 0 <= px_ < W and 0 <= py_ < H and tag[py_, px_] == 1:
                lit = 0.55 if nrm[py_, px_, 1] > 0.5 else 0.3
                rgb[py_, px_] = rp[np.clip(int((lit + (k % 3 == 0) * 0.12) * 6), 0, 5)]


def draw_fire(rgb, t):
    fx, fy = to_screen(BRZ[0], BRZ[1], 1.05)
    fx, fy = int(fx), int(fy)
    fr = ramp("#3a1206", "#8a2a0a", "#d0601a", "#f0a040", "#fff0c0")
    for yy in range(-14, 1):
        f = -yy / 14.0
        wdt = (1 - f) * 4.0 + 0.5
        sh = np.sin(t * 9 + yy * 0.7) * f * 1.6
        for xx in range(-5, 6):
            q = abs(xx - sh) / wdt
            if q > 1:
                continue
            n = vn(np.array([xx * 0.6 + 3.0]), np.array([yy * 0.5 + t * 6]))[0]
            heat = (1 - q) * (1 - f) * 1.6 + n * 0.5 - f * 0.4
            if heat < 0.25:
                continue
            rgb[fy + yy, fx + xx] = fr[np.clip(int(heat * 3.2), 0, 4)]
    # glow: a few warm cells breathing round it, dithered
    for yy in range(-20, 6):
        for xx in range(-16, 17):
            d = np.hypot(xx, yy * 1.3) / 18
            if d < 1 and B4[(fy + yy) % 4, (fx + xx) % 4] < (1 - d) * 0.25:
                p = rgb[fy + yy, fx + xx]
                rgb[fy + yy, fx + xx] = np.clip(p * 1.25 + np.array([0.08, 0.03, 0.0]), 0, 1)


flowers = []
for k in range(9):                                   # a few drifts of flowers, not a scatter
    cx, cy = RNG.random() * 22, RNG.random() * 22 - 1
    kind = RNG.random()
    for j in range(14):
        x, y = cx + RNG.normal(0, 0.55), cy + RNG.normal(0, 0.4)
        if Mat[cell(x, y)] in (GRASS, DRY) and Tag[cell(x, y)] == 0:
            flowers.append((x, y, kind))


def draw_flowers(rgb, sway):
    pale = [np.array(hexc("#cfc8b4")), np.array(hexc("#9e93b8")), np.array(hexc("#e8e2cf"))]
    for (x, y, r0) in flowers:
        sxp, syp = to_screen(x, y, Hm[cell(x, y)])
        stem = 2 + int((x * 7.3 + y * 3.1) % 3)
        px_ = int(sxp + sway * 0.6)
        py_ = int(syp) - stem
        if 0 <= px_ < W - 1 and 1 <= py_ < H and depth[py_, px_] < x + y + 0.15:
            lit = 1.0 if ndl_m[min(H - 1, int(syp)), min(W - 1, int(sxp))] > 0.2 else 0.62
            c = pale[int(r0 * 3)] * lit
            rgb[py_, px_] = c                                   # the bloom: a lit head, its shaded side
            rgb[py_, px_ + 1] = c * 0.62
            for k in range(1, stem):
                rgb[py_ + k, px_] = RAMPS["grass"][2]


def draw_mist(rgb, t):
    # a low ground mist lying in the hollows, drifting; cool, in stepped dithered layers, under the props' knees
    n = fbm(hx * 0.45 + t * 0.06, hy * 0.45 - t * 0.03)
    low = np.clip(1.0 - hz * 1.6, 0, 1) * np.clip(1.0 - (Hb[iy, ix] + 0.05) * 6.0, 0.25, 1)   # thickest in the hollows
    dens = np.clip((n - 0.4) * 2.4, 0, 1) * low * hit
    lv = dens + (bay - 0.5) * 0.08                       # solid layers; the dither only where one meets the next
    step = np.where(lv > 0.55, 0.36, np.where(lv > 0.3, 0.22, np.where(lv > 0.12, 0.1, 0.0)))
    mc = np.array(hexc("#5d6a86"))
    a = step[..., None]
    rgb[:] = rgb * (1 - a) + mc * a


def draw_embers(rgb, t):
    fx, fy = to_screen(BRZ[0], BRZ[1], 1.15)
    er = np.random.default_rng(5)
    for k in range(14):
        ph = er.random()
        life = 1.6 + er.random()
        u = ((t + ph * life) % life) / life
        x = fx + np.sin(u * 7 + k) * 3 * u + er.normal(0, 2)
        y = fy - 6 - u * 40
        if 0 <= int(x) < W and 0 <= int(y) < H and u < 0.9:
            rgb[int(y), int(x)] = np.array(hexc("#ffd080")) if u < 0.3 else np.array(hexc("#d06020")) * (1.1 - u)


def frame(t):
    flick = 0.85 + 0.15 * np.sin(t * 11) * np.sin(t * 4.3 + 1)
    sway = np.sin(t * 2.2) * 0.8 + 0.4
    rgb, v = shade(flick)
    draw_mist(rgb, t)
    draw_tufts(rgb, v, sway)
    draw_flowers(rgb, sway)
    draw_ivy(rgb, sway)
    draw_fire(rgb, t)
    draw_embers(rgb, t)
    return rgb


def main(out_png, out_webp=None):
    rgb = frame(0.3)
    Image.fromarray((rgb * 255).astype(np.uint8)).resize((W * 4, H * 4), Image.NEAREST).save(out_png)
    print("saved", out_png)
    if out_webp:
        ims = [Image.fromarray((frame(i / 15.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(30)]
        ims[0].save(out_webp, save_all=True, append_images=ims[1:], duration=66, loop=0, quality=85)
        print("saved", out_webp)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "painted_scene.png", sys.argv[2] if len(sys.argv) > 2 else None)
