"""Test 3 (Derek 2026-10-06): "a burning cathedral, towering over burning trees turning to embers blowing in the wind.
Stained glass windows. At the POV of our game."

From the game's iso camera, to docs/PAINTED_STANDARD.md (a height field ray-cast in iso, hue-shifted ramps, light that
tells the story), then living layers:
- the cathedral: a nave with a steep roof, lower aisles walled with buttresses, a transept, a crossing tower with a
  spire (broken, burning at its top), two west towers, a round apse; part of the nave roof fallen in, fire in the hole;
- stained glass: lancets along the aisles, clerestory windows above, a rose window on the facade toward us; lit from
  within by the fire, deep red, gold, blue, green and violet held in dark lead, flickering; some panes broken out;
- the forest round it: conifers and broadleaves, their crowns burning, some charred to black skeletons;
- embers torn off by the wind and streaming across, glinting and winking out; smoke rolling up in plumes, bending with
  the wind, lit orange from below;
- night; the fire is the light: every fire lights the stone and the ground near it, flickering; a cold moon nearly
  smothered.

  python tools/art_study/painted_cathedral.py OUT.png [OUT.webp]
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

RNG = np.random.default_rng(77)
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


RAMPS = {
    "stone": ramp("#0b0a0e", "#17141a", "#261f24", "#3a2e2f", "#55433c", "#7a6150", "#a4846a"),
    "roof":  ramp("#08080b", "#111116", "#1b1b21", "#28282e", "#3a3a40", "#55545a"),          # lead and slate
    "ground": ramp("#080706", "#110e0b", "#1c1611", "#2a2017", "#3c2d1e", "#544028"),         # scorched earth
    "grass": ramp("#07090a", "#0e1310", "#161e14", "#222b18", "#33391e", "#4a4a26"),
    "path":  ramp("#0a090b", "#161316", "#24201f", "#35302b", "#4c443b", "#6a5e50"),
    "char":  ramp("#040303", "#0b0807", "#140f0c", "#1e1611", "#2a1f17"),
    "crown": ramp("#0b0805", "#1f1208", "#3e1c08", "#6e2c0a", "#a8460e", "#e07a1e", "#ffc060"),   # a crown on fire
    "leaf":  ramp("#060807", "#0c110d", "#131b13", "#1c2618", "#28321d"),
}
GROUND, GRASS, PATH, STONE, ROOF, TREE, CHAR = 0, 1, 2, 3, 4, 5, 6

# ------------------------------------------------------------------ the world
N, R, OFF = 60, 8, 22.0
G = N * R
KZ = 8.0
gy, gx = np.mgrid[0:G, 0:G]
WX, WY = (gx + 0.5) / R - OFF, (gy + 0.5) / R - OFF
Hm = (fbm(WX * 0.5, WY * 0.5) - 0.5) * 0.15
Mat = np.full((G, G), GRASS)
Tag = np.zeros((G, G), int)                 # 1 nave/transept walls, 2 aisles, 3 towers, 4 spire, 5 apse, 6 facade
Mat[fbm(WX * 0.3, WY * 0.3) > 0.55] = GROUND
path = (np.abs(WX - 3.0) < 1.4 + (fbm(WY * 0.2, 1) - 0.5)) & (WY > 25)
Mat[path] = PATH


def solid(m, h, mat=STONE, tag=1):
    global Hm
    hh = h if np.isscalar(h) else h
    Hm = np.where(m, np.maximum(Hm, hh), Hm)
    Mat[m] = mat
    Tag[m] = tag


def rect(x0, y0, x1, y1):
    return (WX >= x0) & (WX < x1) & (WY >= y0) & (WY < y1)


# nave (x 0..6, y 2..22), its steep roof running along y; part of it fallen in
nave = rect(0, 2, 6, 22)
roof = 9.0 + (3.0 - np.abs(WX - 3.0)) * 1.25
solid(nave, roof, ROOF, 1)
hole = rect(0.6, 12.5, 5.4, 18.0) & (fbm(WX * 0.8, WY * 0.8) > 0.3)
Hm = np.where(hole, 2.0, Hm)                                    # fallen in: down to the rubble and the fire inside
Tag[hole] = 7
wall_ring = nave & ((WX < 0.45) | (WX > 5.55))                  # the nave's own walls still stand round the hole
Hm = np.where(wall_ring & rect(0, 12.5, 6, 18), 9.0, Hm)
Mat[wall_ring & rect(0, 12.5, 6, 18)] = STONE
# aisles (lower, lean-to roofs) with buttress piers on their outer walls
for (x0, x1, side) in ((-3.0, 0.0, -1), (6.0, 9.0, 1)):
    a = rect(x0, 2, x1, 22)
    lean = 5.0 + (1.0 - np.abs(WX - (0.0 if side < 0 else 6.0)) / 3.0) * 1.6
    solid(a, lean, ROOF, 2)
    xo = x0 if side < 0 else x1
    walls = a & (np.abs(WX - xo) < 0.35)
    Mat[walls] = STONE
for k in range(7):                                              # buttresses stepping in at each stage, a pinnacle on top
    yb = 3.0 + k * 3.0
    for xo, sg in ((-3.0, -1), (9.0, 1)):
        for st_, (dx, hh) in enumerate([(1.0, 3.2), (0.75, 5.0), (0.5, 6.8)]):
            x0_ = xo if sg > 0 else xo - dx
            solid(rect(x0_, yb - 0.32, x0_ + dx, yb + 0.32), hh, STONE, 8)
        pc = xo + sg * 0.25
        dpin = np.maximum(np.abs(WX - pc), np.abs(WY - yb))
        solid(dpin < 0.28, 6.8 + (0.28 - dpin) * 7.5, STONE, 8)
# parapets with notched battlements along the aisles' outer walls and the nave's eaves
for xo in (-3.0, 8.75):
    strip = rect(xo, 2, xo + 0.25, 22)
    solid(strip, 5.5 + 0.35 * ((np.floor(WY * 2.2) % 2) == 0), STONE, 9)
for xo in (-0.05, 5.8):
    strip = rect(xo, 2, xo + 0.25, 22) & ~rect(0, 12.5, 6, 18)
    solid(strip, 9.35 + 0.35 * ((np.floor(WY * 2.2) % 2) == 0), STONE, 9)
# transept (across x, y 8..12)
tr = rect(-5, 8, 11, 12)
solid(tr & ~nave, 9.0 + (2.0 - np.abs(WY - 10.0)) * 1.25, ROOF, 1)
for xe in (-5.0, 10.4):                                         # its end walls, stone, gabled
    solid(rect(xe, 8, xe + 0.6, 12), 9.0 + (2.0 - np.abs(WY - 10.0)) * 1.25, STONE, 1)
# the crossing tower and its spire, broken and burning at its top
ct = rect(1.4, 8.4, 4.6, 11.6)
solid(ct, 15.0, STONE, 3)
d_sp = np.maximum(np.abs(WX - 3.0), np.abs(WY - 10.0))
spire = d_sp < 1.5
sp_h = 15.0 + (1.5 - d_sp) * 7.0
solid(spire, np.minimum(sp_h, 21.0 + (fbm(WX * 3, WY * 3) - 0.5) * 1.2), ROOF, 4)
# the west towers (toward us) and the facade between them
for x0 in (-1.6, 5.0):
    tw = rect(x0, 21.5, x0 + 2.6, 25.0)
    solid(tw, 16.0, STONE, 3)
    d_t = np.maximum(np.abs(WX - (x0 + 1.3)), np.abs(WY - 23.25))
    cap = (d_t < 1.3) & tw
    top = 16.0 + (1.3 - d_t) * (6.0 if x0 < 0 else 2.0)        # the right one's cap fallen
    solid(cap, top, ROOF, 3)
facade = rect(1.0, 22.0, 5.0, 23.4)
solid(facade, 12.0 + (2.0 - np.abs(WX - 3.0)) * 1.4, STONE, 6)
# corner turrets on the west towers, a pointed cap on each
for (cx_, cy_) in [(-1.5, 24.9), (0.9, 24.9), (5.1, 24.9), (7.5, 24.9), (-1.5, 21.6), (7.5, 21.6)]:
    dtu = np.hypot(WX - cx_, WY - cy_)
    solid(dtu < 0.36, 17.2, STONE, 3)
    solid(dtu < 0.36, 17.2 + (0.36 - dtu) * 7.0, ROOF, 3)
# a gabled porch on the facade, its door set deep in concentric arches (drawn on its face)
porch = rect(1.5, 23.4, 4.5, 24.5)
solid(porch, 5.0 + (1.5 - np.abs(WX - 3.0)) * 1.1, STONE, 12)
# the base course: a plinth stepping out round the whole church
cath = (Tag >= 1) & (Tag <= 9) | (Tag == 12)
ring_ = ndimage.binary_dilation(cath, iterations=2) & ~cath
solid(ring_, 0.55, STONE, 13)
# the apse at the east end
dap = np.hypot(WX - 3.0, WY - 2.0)
ap = (dap < 3.0) & (WY < 2.0)
solid(ap, 8.0 + (3.0 - dap) * 0.9, ROOF, 5)
apw = ap & (dap > 2.6)
Mat[apw] = STONE
wall_d = np.maximum(np.abs(WX - 3.0) / 13.0, np.abs(WY - 12.0) / 15.5)
cwall = (np.abs(wall_d - 1.0) < 0.018) & ~((np.abs(WX - 3.0) < 1.6) & (WY > 20))
solid(cwall, 0.9 + (vn(WX * 2, WY * 2) - 0.5) * 0.3 - (fbm(WX * 0.4, WY * 0.4) > 0.66) * 0.6, STONE, 14)
for (gxs, gys) in [(-6.5, 20.5), (-7.5, 18.0), (-6.0, 15.5), (-7.8, 13.0), (-6.3, 10.0), (12.6, 18.5), (13.6, 16.0),
                   (12.2, 13.0), (13.8, 10.5), (12.4, 7.5), (-8.0, 22.5), (11.8, 21.5), (13.0, 23.5), (-5.6, 24.0)]:
    lean_ = RNG.uniform(-0.25, 0.25)
    gs = (np.abs(WX - gxs) < 0.36) & (np.abs(WY - gys - (WX - gxs) * lean_) < 0.1)
    solid(gs, 0.95 - (np.abs(WX - gxs) / 0.36) ** 4 * 0.25, STONE, 15)
pts_ = np.array([(i + RNG.random() * 0.8, j + RNG.random() * 0.7) for i in np.arange(-3, 9, 1.1) for j in np.arange(22, 40, 0.9)])
dd_, ii_ = cKDTree(pts_).query(np.stack([WX.ravel(), WY.ravel()], 1), k=2)
pgap = (dd_[:, 1] - dd_[:, 0]).reshape(G, G)
psid = ii_[:, 0].reshape(G, G)
Hm = np.where(path, Hm + 0.05 * np.clip(pgap / 0.1, 0, 1), Hm)
puddle = path & (fbm(WX * 0.9 + 4, WY * 0.9) > 0.68)
# the forest round it
TREES = []
for k in range(46):
    a = RNG.uniform(0, 2 * np.pi)
    rr = RNG.uniform(14, 30)
    tx, ty = 3 + np.cos(a) * rr * 1.1, 12 + np.sin(a) * rr
    if 24 < ty < 40 and abs(tx - 3) < 3:
        continue                                                # the path
    TREES.append((tx, ty, RNG.uniform(1.2, 2.0), RNG.uniform(6.0, 10.0), False, RNG.random()))

Hb = Hm.copy()
Hb = (Hb + np.roll(Hb, 1, 0) + np.roll(Hb, -1, 0) + np.roll(Hb, 1, 1) + np.roll(Hb, -1, 1)) / 5
GY, GX = np.gradient(Hb, 1.0 / R)


def look(arr, x, y, outside):
    ix_ = np.clip(((x + OFF) * R).astype(int), 0, G - 1)
    iy_ = np.clip(((y + OFF) * R).astype(int), 0, G - 1)
    return np.where((x < -OFF) | (y < -OFF) | (x >= N - OFF) | (y >= N - OFF), outside, arr[iy_, ix_])


# ------------------------------------------------------------------ the camera: the game's iso view
W, H = 400, 280
FOC = (6.0, 13.0)
CX0, CY0 = 200 - (FOC[0] - FOC[1]) * 8, 140 - (FOC[0] + FOC[1]) * 4 + 70
SY, SX = np.mgrid[0:H, 0:W].astype(float)
sxr, syr = SX + 0.5 - CX0, SY + 0.5 - CY0
DZ = 1.0 / 14
hit = np.zeros((H, W), bool)
hz, hx, hy = np.zeros((H, W)), np.zeros((H, W)), np.zeros((H, W))
for z in np.arange(26.0, -0.3, -DZ):
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
nrm = np.where(top[..., None], np.dstack([-GX[iy, ix], -GY[iy, ix], np.ones_like(hx)]),
               np.dstack([-GX[iy, ix], -GY[iy, ix], np.full_like(hx, 0.12)]))
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True) + 1e-6
side = ~top
face_y = side & (nrm[..., 1] > np.abs(nrm[..., 0]))             # faces toward +y (screen lower-left)
face_x = side & ~face_y                                         # faces toward +x (screen lower-right)
u_face = np.where(face_y, hx, hy)                               # along the face

# ------------------------------------------------------------------ the windows (where the stained glass is)
def lancet(u, z, uc, z0, z1, hw):
    """a pointed arch window: straight sides, a pointed top"""
    du = np.abs(u - uc)
    straight = (du < hw) & (z > z0) & (z < z1 - hw * 1.7)
    arch = (z >= z1 - hw * 1.7) & (z < z1) & (np.hypot(du + hw, z - (z1 - hw * 1.7)) < hw * 2.0) & (du < hw)
    return straight | arch


win = np.zeros((H, W), bool)
win_u = np.zeros((H, W))
win_v = np.zeros((H, W))
stone_face = (mat == STONE) & side
# aisle lancets: on the +x outer aisle wall (x = 9), between the buttresses
xw = stone_face & face_x & (np.abs(hx - 9.0) < 0.5)
for k in range(6):
    m = xw & lancet(hy, hz, 4.5 + k * 3.0, 1.4, 5.0, 0.55)
    win |= m
win_alise = win.copy()
# clerestory: the nave's +x wall above the aisle roof
cw = stone_face & face_x & (np.abs(hx - 6.0) < 0.6)
for k in range(9):
    win |= cw & lancet(hy, hz, 3.0 + k * 2.1, 7.0, 9.6, 0.4)
# the towers: tall narrow lancets on their +y and +x faces
tw_face = stone_face & (tag == 3)
for uc in (-0.3, 6.3):
    win |= tw_face & face_y & lancet(hx, hz, uc, 9.0, 14.0, 0.35)
win |= tw_face & face_x & (hx > 7.0) & lancet(hy, hz, 23.25, 9.0, 14.0, 0.35)
win |= tw_face & face_x & (hx > 4.4) & (hx < 4.8) & lancet(hy, hz, 10.0, 10.5, 14.0, 0.35)   # the crossing tower
# the rose window on the facade toward us, a portal below it
fac = stone_face & face_y & (tag == 6)
rose_r = np.hypot(hx - 3.0, hz - 8.6)
rose = fac & (rose_r < 1.55)
portal = fac & lancet(hx, hz, 3.0, 0.0, 4.6, 0.8)
win |= rose

# ------------------------------------------------------------------ light: the moon, cold and faint; the fires
MOON = np.array([-0.62, 0.5, 0.62])
MOON /= np.linalg.norm(MOON)
sh = np.zeros((H, W), bool)
px0, py0, pz0 = hx + nrm[..., 0] * 0.12, hy + nrm[..., 1] * 0.12, hz + 0.02
for k in range(1, 70):
    tt = k * 0.25
    sh |= look(Hm, px0 + MOON[0] * tt, py0 + MOON[1] * tt, -9) > pz0 + MOON[2] * tt + 0.03
ndl_m = np.clip((nrm * MOON).sum(2), 0, 1) * (~sh)
ao = np.zeros((H, W))
for rad in (0.4, 1.0):
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        ao += np.clip((look(Hm, hx + np.cos(a) * rad, hy + np.sin(a) * rad, -9) - hz) / (rad * 1.6), 0, 1)
ao = np.clip(ao / 16 * 1.6, 0, 1)
# the fires: the roof's hole, the spire's top, the burning crowns, light through the windows
FIRES = [(3.0, 15.0, 7.0, 3.2), (3.0, 10.0, 21.5, 1.6), (3.0, 23.0, 3.0, 1.6), (9.5, 12.0, 3.0, 1.0)]
burning_trees = [t for t in TREES if t[5] >= 0.22 and t[5] < 0.8]
for (tx, ty, rad, ht, conifer, ph) in burning_trees:
    FIRES.append((tx, ty, ht * 0.8, 0.9 + rad * 0.3))
fire_light = []
for fi, (fx, fy, fz, st) in enumerate(FIRES):
    LV = np.dstack([fx - hx, fy - hy, fz - hz])
    LD = np.linalg.norm(LV, axis=2) + 1e-6
    fl_ = np.clip((nrm * LV).sum(2) / LD, 0, 1) * st / (1 + (LD / 4.0) ** 2)
    if fi < 2:                                                     # the great fires cast shadows: the towers' lie long
        occ = np.zeros((H, W), bool)
        for k in range(1, 48):
            f_ = k / 48.0
            occ |= (look(Hm, hx + nrm[..., 0] * 0.12 + LV[..., 0] * f_, hy + nrm[..., 1] * 0.12 + LV[..., 1] * f_, -9) > hz + LV[..., 2] * f_ + 0.05) & (f_ < 0.92)
        fl_ = np.where(occ, fl_ * 0.12, fl_)
    fire_light.append(fl_)
fire_light = np.array(fire_light)
bay = B4[SY.astype(int) % 4, SX.astype(int) % 4]

# albedo detail: coursed ashlar on the stone faces, slate courses on the roofs, strokes in the grass
alb = (vn(hx * 5, hy * 5 + hz) - 0.5) * 0.08
course = np.floor(hz / 0.5)
cy_in = (hz / 0.5) % 1.0
bxw = (u_face * 1.2 + course * 0.5) % 1.0
alb += np.where(stone_face, (_P[(np.floor(u_face * 1.2 + course * 0.5).astype(int) * 7 + course.astype(int) * 13) % 1024, 5] - 0.5) * 0.14, 0)
alb += np.where(stone_face & ((cy_in < 0.08) | (bxw < 0.04)), -0.18, 0)
alb += np.where((mat == ROOF) & ((hz * 3.2 % 1) < 0.12), -0.12, 0)
alb += np.where(mat == GRASS, (vn((hx + hy) * 2, (hx - hy) * 8) - 0.5) * 0.18, 0)
# string courses: mouldings running round the walls, a lit top edge and a shadow under
for zc in (2.6, 6.2, 11.0, 14.6):
    alb += np.where(stone_face & (np.abs(hz - zc) < 0.09), 0.16, 0)
    alb += np.where(stone_face & (hz < zc - 0.09) & (hz > zc - 0.22), -0.14, 0)
# rain-streaks down the stone; chipped corners of the ashlar; moss low and in the shade
alb += np.where(stone_face, (vn(u_face * 9.0, hz * 0.7) - 0.5) * 0.12, 0)
alb += np.where(stone_face & (cy_in > 0.78) & (bxw < 0.2) & (vn(u_face * 3, course) > 0.55), -0.14, 0)
# the path's flagstones: each its own tone, the joints dark, their upper edges worn bright
pg = pgap[iy, ix]
alb += np.where((mat == PATH) & top, (_P[psid[iy, ix] % 1024, 3] - 0.5) * 0.18 + np.where(pg < 0.08, -0.4, 0) + np.where((pg > 0.08) & (pg < 0.14), 0.08, 0), 0)
# the roof's lead: sheets with standing seams
alb += np.where((mat == ROOF) & ((u_face * 2.5 % 1) < 0.1) & top, 0.08, 0)
# soot: black rising up the stone above every window and the roof's hole
soot = np.zeros((H, W))
src_soot = win | ((tag == 7) & top)
for k in range(1, 26):
    soot = np.maximum(soot, np.roll(src_soot, -k, axis=0) * (1 - k / 26.0) * (vn(SX * 0.25, (SY + k) * 0.06) > 0.25 + k * 0.015))
alb -= np.where(np.isin(mat, [STONE, ROOF]) & ~win, soot * 0.45, 0)
# the cold rim: the moon catching the edges turned away from the fire; silhouettes lit
edge_ = hit & ~ndimage.binary_erosion(hit | False, iterations=1)
behind_l = np.roll(depth, 1, axis=1) < depth - 0.8
behind_u = np.roll(depth, 1, axis=0) < depth - 0.8
moon_rim = (behind_l | behind_u) & np.isin(mat, [STONE, ROOF, CHAR]) & (ndl_m > 0.05)
glass_cell = np.floor(u_face * 2.6) + np.floor(hz * 1.8) * 17


def glass(t):
    """the stained glass: panes in deep colours held in dark lead, lit from within and flickering"""
    cols = ramp("#b0181e", "#d89a26", "#1e3a9a", "#2a7a3a", "#7a2a90", "#c84a18")
    gu = u_face * 2.6
    gz = hz * 1.8
    lead = ((gu % 1) < 0.18) | ((gz % 1) < 0.14) | (((gu * 2 + gz) % 1) < 0.07)
    pick = _P[(np.floor(gu).astype(int) * 31 + (np.floor(gz / 2)).astype(int) * 5) % 1024, 7]
    c = cols[np.clip((pick * 6).astype(int), 0, 5)]
    fl = 0.75 + 0.25 * np.sin(t * 9 + glass_cell * 0.7) * np.sin(t * 5.3 + glass_cell)
    c = c * (0.7 + 0.5 * fl[..., None])
    # the rose: petals round its centre, rings, a hub
    ang = np.arctan2(hz - 8.6, hx - 3.0)
    rp = rose_r / 1.55
    petal = (np.abs(((ang / (2 * np.pi) * 12) % 1) - 0.5) < 0.08) | (np.abs(rp - 0.55) < 0.05) | (np.abs(rp - 0.95) < 0.06)
    rc = cols[np.clip(((_P[((ang * 3).astype(int) + 9) % 1024, 3] * 0.6 + rp * 0.5) * 6).astype(int) % 6, 0, 5)]
    rc = rc * (0.8 + 0.4 * fl[..., None])
    c = np.where(rose[..., None], rc, c)
    lead = np.where(rose, petal | (rp < 0.16) & ((ang * 4 % 1) < 0.2), lead)
    # tracery: each lancet split by a stone mullion, a quatrefoil in its head; the rose's spokes and cusps
    win_c = np.round(u_face * 1.0 / 3.0) * 3.0
    trac = ~rose & (np.abs((u_face - (np.floor(u_face) + 0.5))) < 0.05)
    lead = lead | trac
    spokes = rose & ((np.abs(((ang / (2 * np.pi) * 12) % 1) - 0.5) < 0.06) | (np.abs(rp - 0.42) < 0.06) | (np.abs(rp - 0.98) < 0.05))
    cusps = rose & (np.abs(rp - 0.42 - 0.12 * np.abs(np.sin(ang * 6))) < 0.04)
    broken = (_P[(glass_cell.astype(int) * 13) % 1024, 9] > 0.9) & ~rose
    c = np.where(lead[..., None], np.array(hexc("#120a08")), c)
    c = np.where((spokes | cusps)[..., None], np.array(hexc("#3a2a24")), c)
    c = np.where(broken[..., None], np.array(hexc("#ffb050")) * (0.8 + 0.2 * fl[..., None]), c)   # broken: the fire behind
    return np.clip(c, 0, 1)


def shade(t):
    flick = np.array([0.8 + 0.2 * np.sin(t * (7 + i) + i * 1.7) * np.sin(t * (3.1 + i * 0.3)) for i in range(len(FIRES))])
    fl_sum = (fire_light * flick[:, None, None]).sum(0)
    stone_k = np.isin(mat, [STONE, ROOF])
    bounce = stone_k * (1 - np.abs(nrm[..., 2])) * np.clip(1.4 - hz * 0.25, 0, 1) * 0.08 * (1 + fl_sum)
    I = (0.06 + 0.05 * nrm[..., 2]) * (1 - ao * 0.8) + ndl_m * 0.2 + bounce
    v = I + fl_sum * np.where(stone_k, 0.55, 0.45) + alb + (bay - 0.5) * 0.03
    rgb = np.zeros((H, W, 3))
    for mid, rn in ((GROUND, "ground"), (GRASS, "grass"), (PATH, "path"), (STONE, "stone"), (ROOF, "roof"), (CHAR, "char")):
        mm = mat == mid
        rp = RAMPS[rn]
        rgb[mm] = rp[np.clip((v[mm] * len(rp)).astype(int), 0, len(rp) - 1)]
    # the trees' crowns: burning (glowing from within, in tongues) or still dark leaves; the burnt ones char
    tm = mat == TREE
    seam = vn(hx * 5 + t * 1.5, hy * 5 + hz * 3 - t * 2.5)
    glow = (seam > 0.62) | ((seam > 0.52) & (vn(hx * 11, hz * 9 - t * 4) > 0.6))
    leafv = np.clip(v * 0.7 + fl_sum * 0.25, 0, 0.99)
    rgb[tm] = RAMPS["leaf"][np.clip((leafv[tm] * 5).astype(int), 0, 4)] * 0.6 + RAMPS["char"][2] * 0.4
    gm = tm & glow
    ev = np.clip((seam - 0.5) * 2.4 + 0.2 * np.sin(t * 8 + hx * 3), 0, 0.99)
    rgb[gm] = RAMPS["crown"][np.clip((2 + ev[gm] * 5).astype(int), 0, 6)]
    # the fire's warmth: stepped, as a painter mixes it
    warm = np.round(np.clip(fl_sum * 1.2, 0, 1) * 4) / 4
    rgb = rgb * (1 - warm[..., None] * 0.35) + rgb * np.array([1.6, 1.05, 0.6]) * warm[..., None] * 0.35
    rgb *= np.where(warm[..., None] > 0.2, 1.0, np.array([0.85, 0.9, 1.08]))    # the cold where the fire does not reach
    rgb[moon_rim & (warm < 0.4)] = np.clip(rgb[moon_rim & (warm < 0.4)] * 0.6 + np.array(hexc("#5a6a86")) * 0.4, 0, 1)
    # the puddles: the fire's light broken in them
    pm = puddle[iy, ix] & top & (mat == PATH)
    rgb[pm] = np.where((vn(hx[pm] * 3, hy[pm] * 12 + t) > 0.5)[..., None], np.array(hexc("#c0581a")) * (0.6 + fl_sum[pm, None] * 0.4), np.array(hexc("#140c08")))
    # coals and ash glowing on the ground under the burning crowns
    near_fire = (fl_sum > 0.9) & np.isin(mat, [GRASS, GROUND]) & top
    coal = near_fire & (vn(hx * 2.5, hy * 2.5) > 0.7) & (vn(hx * 9, hy * 9) > 0.45)
    rgb[coal] = np.where((np.sin(t * 6 + hx[coal] * 9) > 0)[..., None], np.array(hexc("#e0601a")), np.array(hexc("#7a2a0e")))
    ash = near_fire & ~coal & (vn(hx * 1.5, hy * 1.5) > 0.6)
    rgb[ash] = rgb[ash] * 0.5 + np.array(hexc("#3a3634")) * 0.5
    # the glass, and the portal's open dark with fire beyond
    gl = glass(t)
    rgb = np.where(win[..., None], gl, rgb)
    reveal = ndimage.binary_dilation(win, iterations=1) & ~win & hit
    rgb[reveal] = rgb[reveal] * 0.35                                    # the stone reveal round each window, in shadow
    sill = reveal & ~np.roll(win, -1, axis=0) & np.roll(win, 1, axis=0)
    rgb[sill] = np.array(hexc("#8a5a3a"))
    from scipy import ndimage as _nd
    halo = _nd.binary_dilation(win, iterations=3) & ~win & hit
    halo2 = _nd.binary_dilation(win, iterations=6) & ~win & ~halo & hit
    h1 = halo & (bay < 0.7)
    rgb[h1] = rgb[h1] * 0.75 + np.array(hexc("#a85a24")) * 0.25           # the light spilling soft on the stone round it
    h2 = halo2 & (bay < 0.3)
    rgb[h2] = rgb[h2] * 0.85 + np.array(hexc("#7a3a16")) * 0.15
    pf = (tag == 12) & face_y
    dr = np.hypot(hx - 3.0, np.clip(hz - 2.2, 0, None))
    orders = pf & (np.abs(hx - 3.0) < 1.3) & (hz < 4.2)
    rgb[orders & ((dr * 6) % 1 < 0.35)] *= 0.5
    door = pf & (np.abs(hx - 3.0) < 0.55) & (hz < 2.4 + np.sqrt(np.clip(0.3 - (hx - 3.0) ** 2, 0, None)))
    rgb[door] = np.where((vn(hx[door] * 8, hz[door] * 5 - t * 5) > 0.5)[..., None], np.array(hexc("#f08a2a")), np.array(hexc("#4a1406")))
    po = portal & ~win & ~pf
    rgb[po] = np.where((vn(hx[po] * 6, hz[po] * 4 - t * 4) > 0.55)[..., None], np.array(hexc("#e06a1a")), np.array(hexc("#3a1206")))
    # the hole in the roof: the fire inside, seen from above, churning
    hm_ = (tag == 7) & top
    inner = np.clip(0.5 + (vn(hx * 3 - t * 1.5, hy * 3 + t * 2) - 0.5) * 1.2, 0, 1)
    rgb[hm_] = RAMPS["crown"][np.clip((inner[hm_] * 7).astype(int), 0, 6)]
    rgb[~hit] = hexc("#0a0807")
    return np.clip(rgb, 0, 1)


def to_screen(x, y, z=0.0):
    return (x - y) * 8 + CX0, (x + y) * 4 - z * KZ + CY0


# ------------------------------------------------------------------ living layers: flames, smoke, embers, the sky
FRAMP = ramp("#3a0e04", "#7a1e06", "#c0420c", "#ec8018", "#ffc048", "#fff0b0")


def flames(rgb, t, sx, sy, w, h, dpt, seed):
    """a fire's tongues rising from (sx, sy), torn by a fast upward noise, depth-tested against what stands in front"""
    x0, x1 = int(sx - w * 1.4), int(sx + w * 1.4)
    y0, y1 = int(sy - h * 1.2), int(sy + 3)
    x0, x1, y0, y1 = max(x0, 0), min(x1, W - 1), max(y0, 0), min(y1, H - 1)
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
    up = (sy - yy) / h
    sway = np.sin(t * 2.5 + seed + up * 3) * up * w * 0.3 - up * up * w * 1.1 - up * w * 0.3   # leaning hard on the wind
    body = np.clip(1 - np.abs(xx - sx - sway) / (w * (1 - up * 0.7) + 0.5), 0, 1)
    tng = vn((xx - sx) * 0.35 + seed * 7, yy * 0.12 + t * 9) * 0.6 + vn((xx - sx) * 0.8 + seed, yy * 0.25 + t * 14) * 0.4
    heat = body * (1 - up) * 1.6 + (tng - 0.5) * 1.2 * (0.3 + up) * np.clip(body * 3, 0, 1)
    lv = np.clip((heat - 0.25) * 4.2, -1, 5.99)
    m = (lv >= 0) & (depth[y0:y1, x0:x1] <= dpt + 0.8)
    sub = rgb[y0:y1, x0:x1]
    sub[m] = FRAMP[lv[m].astype(int)]


def smoke(rgb, t):
    """plumes rolling up from the roof and the burning crowns, bending with the wind, lit orange from below"""
    dens = np.zeros((H, W))
    sources = [(3.0, 15.0, 12.0, 2.4), (3.0, 10.0, 22.0, 1.6)] + [(tx, ty, ht + 1, 0.9) for (tx, ty, rad, ht, c_, ph) in burning_trees[::2]]
    for (fx, fy, fz, st) in sources:
        sx0, sy0 = to_screen(fx, fy, fz)
        rise = np.clip(sy0 - SY, 0, None)
        cx = sx0 - rise * 0.55 - rise ** 1.4 * 0.004                    # bending away on the wind
        width = 10 + rise * 0.7
        dd = np.abs(SX - cx) / width
        u_ = (SX - cx) * 0.02
        v_ = (SY + t * 14) * 0.012 + u_ * 0.6
        roll = fbm(u_ + 3.0 + t * 0.15, v_) * 0.65 + fbm(u_ * 2.6 + 9, v_ * 2.2 - t * 0.2) * 0.35
        edge = 1 - dd + (roll - 0.5) * 1.1                              # its edge eaten by the turbulence
        dens = np.maximum(dens, np.clip(edge, 0, 1) * (rise > 0) * st * (0.35 + 0.8 * roll) * np.clip(1 - rise / 300, 0, 1))
    lv = dens + (bay - 0.5) * 0.08
    a = np.where(lv > 0.75, 0.82, np.where(lv > 0.5, 0.62, np.where(lv > 0.28, 0.38, np.where(lv > 0.12, 0.16, 0.0))))
    lit_under = np.clip(1 - (130 - SY) / 140, 0, 1)
    col = np.dstack([0.16 + 0.22 * lit_under, 0.11 + 0.08 * lit_under, 0.09 + 0.02 * lit_under])
    col = np.where((vn(SX * 0.06 + t * 0.3, SY * 0.06 - t * 0.5) > 0.6)[..., None] & (lit_under[..., None] > 0.4), col * 1.5, col)
    return rgb * (1 - a[..., None]) + col * a[..., None]


def embers(rgb, t):
    """embers torn off the crowns and the roof, streaming on the wind, glinting, winking out"""
    rg = np.random.default_rng(5)
    srcs = [(3.0, 15.0, 9.0)] * 3 + [(tx, ty, ht) for (tx, ty, rad, ht, c_, ph) in burning_trees]
    for k in range(520):
        sx_, sy_, sz_ = srcs[k % len(srcs)]
        bx, by = to_screen(sx_, sy_, sz_)
        life = rg.uniform(1.5, 4.0)
        ph = rg.uniform(0, life)
        u = ((t + ph) % life) / life
        vx, vy = -rg.uniform(30, 90), -rg.uniform(12, 40)
        x = bx + rg.normal(0, 6) + vx * u * life + np.sin(u * 9 + k) * 6
        y = by + rg.normal(0, 4) + vy * u * life + 18 * (u * life) ** 2 * 0.3
        if 0 <= int(x) < W and 0 <= int(y) < H and u < 0.92:
            glint = np.sin(t * 20 + k * 1.3) > 0.6
            c = hexc("#fff0b0") if (u < 0.25 or glint) else (hexc("#ffa030") if u < 0.6 else hexc("#a03810"))
            rgb[int(y), int(x)] = c
            if u < 0.3 and int(x) + 1 < W:
                rgb[int(y), int(x) + 1] = np.array(c) * 0.6
    return rgb


BARK = ramp("#060404", "#110b09", "#1e1410", "#2e1e16", "#43291c")
LEAF = ramp("#060705", "#0d100b", "#151a10", "#202614", "#2e3318", "#40401c")


def draw_tree(rgb, t, tx, ty, rad, ht, ph, idx):
    """a broadleaf tree in its fire: a tapered trunk forking to limbs, branches and twigs, lit on the side toward the
    blaze; a broad crown of lumpy leaf-clusters at the branch-ends. Three states by ph: engulfed (clusters on fire,
    flames tearing off), half-burnt (some clusters alight, ember seams in the rest), burnt bare (a black skeleton,
    embers glowing along its limbs)."""
    rr = np.random.default_rng(idx * 7 + 3)
    bx, by = to_screen(tx, ty, 0.0)
    dpt = tx + ty
    scale = ht * 8.0                                                  # px of height
    state = 2 if ph < 0.25 else (0 if ph > 0.6 else 1)
    fsx, fsy = to_screen(3.0, 15.0, 8.0)
    lit_dir = np.sign(fsx - bx)                                       # which side faces the blaze
    ends = []
    def limb(x0, y0, ang, L, w, depth_):
        n = max(2, int(L))
        pts = []
        for k in range(n + 1):
            f = k / n
            pts.append((x0 + np.cos(ang + np.sin(f * 3 + idx) * 0.15) * L * f, y0 + np.sin(ang + np.sin(f * 3 + idx) * 0.15) * L * f))
        for k in range(n):
            f = k / n
            ww = max(1, int(round(w * (1 - f * 0.55))))
            px_, py_ = pts[k]
            for j in range(-(ww // 2), ww - ww // 2):
                X, Y = int(round(px_ + j)), int(round(py_))
                if 0 <= X < W and 0 <= Y < H and depth[Y, X] < dpt + 0.3:
                    lit = (j * lit_dir) > 0
                    c = BARK[3 if lit else 1]
                    if state == 2 and ((k + j + int(t * 6)) % 9 == 0) and rr.random() < 0.6:
                        c = FRAMP[2 + int((np.sin(t * 7 + k) + 1) * 1.2)]           # embers glowing along a burnt limb
                    rgb[Y, X] = c
        ex, ey = pts[-1]
        if depth_ > 0:
            for kk in range(2 if depth_ < 3 else 3):
                limb(ex, ey, ang + rr.normal(0, 0.45) + (kk - 1) * 0.55, L * rr.uniform(0.55, 0.75), max(1, w * 0.62), depth_ - 1)
        else:
            ends.append((ex, ey))
    limb(bx, by, -np.pi / 2 + rr.normal(0, 0.08), scale * 0.42, max(3, rad * 3.2), 3)
    if state == 2:
        return []
    # the crown: lumpy clusters at the branch-ends, dark leaves; the fire in some of them
    flames_at = []
    for i, (ex, ey) in enumerate(ends):
        cr = rr.uniform(6, 11) * (rad / 1.6)
        burning = (state == 0 and rr.random() < 0.65) or (state == 1 and rr.random() < 0.3)
        x0, x1 = int(max(ex - cr - 2, 0)), int(min(ex + cr + 2, W - 1))
        y0, y1 = int(max(ey - cr - 2, 0)), int(min(ey + cr * 0.8 + 2, H - 1))
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1].astype(float)
        dd = np.hypot((xx - ex) / cr, (yy - ey) / (cr * 0.8))
        lump = vn(xx * 0.35 + idx * 3, yy * 0.35 + i) * 0.5 + vn(xx * 0.9, yy * 0.9) * 0.25
        m = (dd < 0.8 + lump * 0.45) & (depth[y0:y1, x0:x1] < dpt + 0.3)
        # leaves: lit from above-left dimly by the moon, on the blaze's side by the fire
        sidev = np.clip(((xx - ex) * lit_dir) / cr, -1, 1)
        lv = np.clip(0.18 + (1 - (yy - ey + cr) / (2 * cr)) * 0.15 + sidev * 0.15 + lump * 0.2, 0, 0.99)
        sub = rgb[y0:y1, x0:x1]
        col = LEAF[(lv * 6).astype(int)]
        firelit = sidev > 0.3
        col = np.where(firelit[..., None], col * np.array([1.9, 1.3, 0.8]), col)
        if burning:
            seam = vn(xx * 0.45 + t * 1.2, yy * 0.45 - t * 2.2 + i)
            hot = seam > 0.5
            col = np.where(hot[..., None], FRAMP[np.clip(((seam - 0.5) * 9 + 1).astype(int), 0, 5)], col)
            flames_at.append((ex, ey - cr * 0.5, cr * 0.9, cr * 2.6))
        elif state == 1:
            seam = vn(xx * 0.6 + t, yy * 0.6 - t * 1.5 + i)
            col = np.where((seam > 0.74)[..., None], FRAMP[2], col)        # ember seams
        sub[m] = col[m]
    return [(x, y, w_, h_, dpt + 0.5) for (x, y, w_, h_) in flames_at]


TUFTS = []
for k in range(1800):
    x_, y_ = RNG.uniform(-14, 22), RNG.uniform(-6, 40)
    c_ = (min(G - 1, max(0, int((y_ + OFF) * R))), min(G - 1, max(0, int((x_ + OFF) * R))))
    if Mat[c_] == GRASS and Tag[c_] == 0 and fbm(np.array([x_ * 0.7]), np.array([y_ * 0.7]))[0] > 0.45:
        TUFTS.append((x_, y_, RNG.random()))


def draw_tufts(rgb, t, fl_sum):
    gr = RAMPS["grass"]
    for (x_, y_, r0) in TUFTS:
        sx_, sy_ = to_screen(x_, y_, Hm[min(G - 1, int((y_ + OFF) * R)), min(G - 1, int((x_ + OFF) * R))])
        bx, by = int(sx_), int(sy_)
        if not (0 <= bx < W and 0 <= by < H):
            continue
        heat = fl_sum[by, bx]
        burning = heat > 0.7 and r0 > 0.4
        rr = np.random.default_rng(int(r0 * 1e6))
        for b in range(4 + int(r0 * 4)):
            hgt = rr.uniform(3, 7)
            lean = rr.normal(-0.4, 0.4) - 0.6
            ox = rr.normal(0, 1.4)
            for k in range(int(hgt)):
                f = k / hgt
                px_ = int(round(bx + ox + lean * f * f * 3))
                py_ = by - k
                if 0 <= px_ < W and 0 <= py_ < H and depth[py_, px_] < x_ + y_ + 0.2:
                    if burning and f > 0.5:
                        rgb[py_, px_] = FRAMP[min(5, int(2 + f * 3 + np.sin(t * 9 + b) * 0.8))]
                    else:
                        tv = np.clip(0.15 + f * 0.35 + heat * 0.25, 0, 0.99)
                        rgb[py_, px_] = gr[int(tv * 6)] * (np.array([1.3, 1.0, 0.75]) if heat > 0.3 else 1.0)


def ash_fall(rgb, t):
    rg = np.random.default_rng(21)
    for k in range(160):
        x0, y0 = rg.uniform(0, W + 120), rg.uniform(-H, H)
        sp = rg.uniform(10, 22)
        x = (x0 - t * sp * 2.2 + np.sin(t * 1.5 + k) * 4) % (W + 120) - 60
        y = (y0 + t * sp) % H
        if 0 <= int(x) < W and 0 <= int(y) < H:
            turn = np.sin(t * 4 + k) > 0
            rgb[int(y), int(x)] = np.array(hexc("#8a8480")) if turn else np.array(hexc("#4a4644"))
            if turn and int(x) + 1 < W:
                rgb[int(y), int(x) + 1] = np.array(hexc("#5a5654"))


def shimmer(rgb, t, zones):
    """the heat shimmer: the air above every fire bends what is behind it, in whole pixels"""
    out = rgb.copy()
    m = zones > 0
    off = np.round(np.sin(SY * 0.45 + t * 9 + SX * 0.05) * 1.6 * zones).astype(int)
    xs = np.clip(SX.astype(int) + off, 0, W - 1)
    out[m] = rgb[SY.astype(int)[m], xs[m]]
    return out


def frame(t):
    rgb = shade(t)
    # flames: out of the roof's hole, the spire's broken top, the windows' broken panes, every burning crown
    for (fx, fy, fz, w_, h_, sd) in [(3.0, 13.2, 8.0, 26, 96, 1), (2.2, 15.0, 8.0, 22, 84, 2), (3.8, 16.6, 8.0, 22, 80, 3),
                                    (3.0, 17.6, 8.0, 18, 64, 6), (1.2, 14.0, 8.5, 12, 48, 7), (4.8, 15.0, 8.5, 12, 50, 8),
                                    (3.0, 10.0, 21.0, 10, 38, 4), (3.0, 23.4, 12.0, 8, 22, 5)]:
        sx_, sy_ = to_screen(fx, fy, fz)
        flames(rgb, t, sx_, sy_, w_, h_, fx + fy + fz * 0.001 + 1.5, sd)

    zones = np.zeros((H, W))
    for (fx, fy, fz, st) in FIRES[:3]:
        sx_, sy_ = to_screen(fx, fy, fz + 3)
        zones = np.maximum(zones, np.clip(1 - np.hypot((SX - sx_) / 34, (SY - sy_ + 40) / 60), 0, 1))
    rgb = shimmer(rgb, t, zones)
    flick = np.array([0.8 + 0.2 * np.sin(t * (7 + i) + i * 1.7) * np.sin(t * (3.1 + i * 0.3)) for i in range(len(FIRES))])
    draw_tufts(rgb, t, (fire_light * flick[:, None, None]).sum(0))
    tree_flames = []
    order = sorted(range(len(TREES)), key=lambda i: TREES[i][0] + TREES[i][1])
    for i in order:
        tx, ty, rad, ht, cn, ph = TREES[i]
        tree_flames += draw_tree(rgb, t, tx, ty, rad, ht, ph, i)
    for k, (x, y, w_, h_, d_) in enumerate(tree_flames):
        flames(rgb, t, x, y, w_, h_, d_, 40 + k)
    rgb = smoke(rgb, t)
    rgb = embers(rgb, t)
    ash_fall(rgb, t)
    return np.clip(rgb, 0, 1)


def main(out_png, out_webp=None):
    Image.fromarray((frame(0.4) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(out_png)
    print("saved", out_png)
    if out_webp:
        ims = [Image.fromarray((frame(i / 12.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(36)]
        ims[0].save(out_webp, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=85)
        print("saved", out_webp)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "cathedral.png", sys.argv[2] if len(sys.argv) > 2 else None)
