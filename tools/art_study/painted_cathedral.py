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
for k in range(7):
    yb = 3.0 + k * 3.0
    for xo in (-3.6, 9.0):
        solid(rect(xo, yb - 0.3, xo + 0.6, yb + 0.3), 6.6 - (0.0 if k % 2 else 0.4), STONE, 2)
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
# the apse at the east end
dap = np.hypot(WX - 3.0, WY - 2.0)
ap = (dap < 3.0) & (WY < 2.0)
solid(ap, 8.0 + (3.0 - dap) * 0.9, ROOF, 5)
apw = ap & (dap > 2.6)
Mat[apw] = STONE
# the forest round it
TREES = []
for k in range(70):
    a = RNG.uniform(0, 2 * np.pi)
    rr = RNG.uniform(14, 30)
    tx, ty = 3 + np.cos(a) * rr * 1.1, 12 + np.sin(a) * rr
    if 24 < ty < 40 and abs(tx - 3) < 3:
        continue                                                # the path
    TREES.append((tx, ty, RNG.uniform(0.9, 1.7), RNG.uniform(4.5, 8.5), RNG.random() < 0.55, RNG.random()))
for (tx, ty, rad, ht, conifer, ph) in TREES:
    d_ = np.hypot(WX - tx, WY - ty)
    burnt = ph < 0.22
    trunk = d_ < 0.22
    solid(trunk, ht * (0.9 if burnt else 0.6), CHAR, 11)
    if burnt:                                                   # burnt out: a black skeleton, a few stubs of limb
        for k in range(4):
            a_ = ph * 40 + k * 1.6
            lx, ly = tx + np.cos(a_) * rad * 0.6, ty + np.sin(a_) * rad * 0.6
            limb = (np.abs((WX - tx) * np.sin(a_) - (WY - ty) * np.cos(a_)) < 0.12) & (np.hypot(WX - tx, WY - ty) < rad * 0.7) & (((WX - tx) * np.cos(a_) + (WY - ty) * np.sin(a_)) > 0)
            solid(limb, ht * (0.55 + k * 0.08) - np.hypot(WX - tx, WY - ty) * 0.8, CHAR, 11)
        continue
    rough = (vn(WX * 3.5, WY * 3.5) - 0.5) * 1.4 + (vn(WX * 9, WY * 9) - 0.5) * 0.6   # a ragged crown, not a cone
    if conifer:
        h_ = ht * (1 - d_ / rad) ** 0.9 + rough * 0.6 + np.where((np.floor(ht * (1 - d_ / rad) * 1.6) % 2) == 0, 0.3, 0)
        m = (d_ < rad * (0.85 + (vn(WX * 3, WY * 3) - 0.5) * 0.4)) & (h_ > ht * 0.25)
    else:
        h_ = ht * 0.5 + np.sqrt(np.clip(rad ** 2 - d_ ** 2, 0, None)) * 1.4 + rough
        m = (d_ < rad) & (vn(WX * 2.2, WY * 2.2) > 0.25)
    solid(m & (h_ > Hm), np.where(m, h_, -9), TREE, 10)

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
for (fx, fy, fz, st) in FIRES:
    LV = np.dstack([fx - hx, fy - hy, fz - hz])
    LD = np.linalg.norm(LV, axis=2) + 1e-6
    fire_light.append(np.clip((nrm * LV).sum(2) / LD, 0, 1) * st / (1 + (LD / 4.0) ** 2))
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
    broken = (_P[(glass_cell.astype(int) * 13) % 1024, 9] > 0.9) & ~rose
    c = np.where(lead[..., None], np.array(hexc("#120a08")), c)
    c = np.where(broken[..., None], np.array(hexc("#ffb050")) * (0.8 + 0.2 * fl[..., None]), c)   # broken: the fire behind
    return np.clip(c, 0, 1)


def shade(t):
    flick = np.array([0.8 + 0.2 * np.sin(t * (7 + i) + i * 1.7) * np.sin(t * (3.1 + i * 0.3)) for i in range(len(FIRES))])
    fl_sum = (fire_light * flick[:, None, None]).sum(0)
    stone_k = np.isin(mat, [STONE, ROOF])
    I = 0.06 + 0.05 * nrm[..., 2] + ndl_m * 0.18 - ao * 0.05
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
    # the glass, and the portal's open dark with fire beyond
    gl = glass(t)
    rgb = np.where(win[..., None], gl, rgb)
    from scipy import ndimage as _nd
    halo = _nd.binary_dilation(win, iterations=3) & ~win & hit
    halo2 = _nd.binary_dilation(win, iterations=6) & ~win & ~halo & hit
    h1 = halo & (bay < 0.7)
    rgb[h1] = rgb[h1] * 0.75 + np.array(hexc("#a85a24")) * 0.25           # the light spilling soft on the stone round it
    h2 = halo2 & (bay < 0.3)
    rgb[h2] = rgb[h2] * 0.85 + np.array(hexc("#7a3a16")) * 0.15
    po = portal & ~win
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
        u_ = (SX - cx) * 0.035
        v_ = (SY + t * 14) * 0.02 + u_ * 0.6
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


def frame(t):
    rgb = shade(t)
    # flames: out of the roof's hole, the spire's broken top, the windows' broken panes, every burning crown
    for (fx, fy, fz, w_, h_, sd) in [(3.0, 13.2, 8.0, 26, 96, 1), (2.2, 15.0, 8.0, 22, 84, 2), (3.8, 16.6, 8.0, 22, 80, 3),
                                    (3.0, 17.6, 8.0, 18, 64, 6), (1.2, 14.0, 8.5, 12, 48, 7), (4.8, 15.0, 8.5, 12, 50, 8),
                                    (3.0, 10.0, 21.0, 10, 38, 4), (3.0, 23.4, 12.0, 8, 22, 5)]:
        sx_, sy_ = to_screen(fx, fy, fz)
        flames(rgb, t, sx_, sy_, w_, h_, fx + fy + fz * 0.001 + 1.5, sd)
    for i, (tx, ty, rad, ht, conifer, ph) in enumerate(burning_trees):
        rr = np.random.default_rng(i)
        for j in range(3):
            fz = ht * rr.uniform(0.45, 0.95)
            ox, oy = rr.uniform(-0.5, 0.5) * rad, rr.uniform(-0.5, 0.5) * rad
            sx_, sy_ = to_screen(tx + ox, ty + oy, fz)
            flames(rgb, t, sx_, sy_, rr.uniform(4, 8) + rad * 2, rr.uniform(14, 30) + ht * 1.6, tx + ty + 2, 10 + i * 3 + j)
    rgb = smoke(rgb, t)
    rgb = embers(rgb, t)
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
