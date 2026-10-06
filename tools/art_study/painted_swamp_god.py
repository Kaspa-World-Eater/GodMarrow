"""The wreck of a forgotten dead god: a colossal stone face lying back in a swamp, half sunk. Derek 2026-10-06: "Paint
the wrecked ruin of a forgotten dead god as a decrepit statue half sunk in a swamp. This will be a test of your
abilities."

Rendered as painted_scene.py is (docs/PAINTED_STANDARD.md, the title's method): one height field ray-cast in iso,
moonlight with cast shadows, ambient occlusion, hue-shifted ramps, then living layers. New here:
- water that is a surface of its own: the god and the dead trees reflected in it (the reflected ray marched up through
  the field and read back off the painted image, broken by ripples), the shallows clear enough to show the sunk lips
  and chin, duckweed and lily pads lying on it, a tide-line of algae stained on the stone;
- a sculpted face in the field: brow, closed lids, one socket broken open, the nose, cheekbones, lips under the
  water, a cracked diadem with spikes, a temple broken away; a hand rising from the water, fingers curled, one snapped;
- a faint ghost-light kept in the broken eye, lighting the face round it and the water below;
- tears of dark stain down from the eyes; flecks of tarnished gilding left in the diadem; moss and lichen;
- heavy mist lying on the water, reeds, dead trees, soul-lights drifting.

  python tools/art_study/painted_swamp_god.py OUT.png [OUT.webp]
"""
import sys
import numpy as np
from PIL import Image

RNG = np.random.default_rng(23)
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
    "god":   ramp("#0a0d12", "#161c22", "#27302f", "#3f4842", "#646a5e", "#999a85"),    # old stone, green-grey
    "algae": ramp("#070b0b", "#0f1714", "#18251b", "#253620", "#3a4c28", "#5a6a36"),
    "moss":  ramp("#0b1214", "#14231b", "#21361f", "#365026", "#577030", "#879447"),
    "mud":   ramp("#08090c", "#121216", "#1e1b1d", "#2f2926", "#463b31", "#62533f"),
    "hum":   ramp("#0b1015", "#121c1a", "#1d2b1e", "#2e4122", "#48592b", "#6e7a3c"),    # hummock grass
    "water": ramp("#050504", "#0d0b08", "#17130f", "#221c15", "#30281e", "#453a2b"),
    "teeth": ramp("#1a1610", "#3a3224", "#6a5c42", "#9a8a68", "#c4b68e", "#ddd2ae"),
    "scum":  ramp("#0a110c", "#132015", "#1d301b", "#2c4320", "#435a28", "#647334"),
}
GOD, MUD, HUM, WATER = 0, 1, 2, 3
MAT_RAMP = {GOD: "god", MUD: "mud", HUM: "hum", 4: "teeth"}

# ------------------------------------------------------------------ the world
N, R, OFF = 44, 10, 14.0
G = N * R
KZ = 8.0
WL = 0.0                                        # the water's level
gy, gx = np.mgrid[0:G, 0:G]
WX, WY = (gx + 0.5) / R - OFF, (gy + 0.5) / R - OFF
Hm = -0.45 + (fbm(WX * 0.35, WY * 0.35) - 0.5) * 0.3          # the drowned floor
Mat = np.full((G, G), MUD)
# hummocks of grass and mud banks
hm = fbm(WX * 0.22 + 4, WY * 0.22)
isl = hm > 0.6
Hm = np.where(isl, Hm + (hm - 0.6) * 3.2, Hm)
Mat[isl & (Hm > 0.08)] = HUM
Tag = np.zeros((G, G), int)

# --- the face: lying back, forehead toward -x-y (up the screen), chin toward +x+y, sunk to the lips
CF = np.array([9.6, 9.0])
fa, fb = 4.4, 6.2
u = ((WX - CF[0]) - (WY - CF[1])) / np.sqrt(2)                 # across the face (screen right is +u)
v = ((WX - CF[0]) + (WY - CF[1])) / np.sqrt(2)                 # down the face, crown to chin
U, V = u / fa, v / fb
AU = np.abs(U)
# One of the Gorrhaun, the Famines (docs/wiki/mythology/01: "god-bodies the height of hills that had been worshipped so
# long they never stopped moving after they died; whole kingdoms worshipped them by walking up the ramp into them").
# Forgotten, and a god nobody remembers starves: the face is gaunt, the skin drawn over the skull, the temples and
# cheeks fallen in, the sockets empty, the nose's tip gone to a dark hollow, the mouth hanging open with its long
# teeth, the old processional ramp climbing out of the bog into it between the arches of its ribs.
# Planes, not a dome (Derek: "too round, not face like"): an outline wide at the temples, cornered at the cheekbones,
# narrowing down the jaw; a profile down the middle; the sides turning away hard; tilted back to look up at us.
w_out = np.interp(V, [-1.0, -0.85, -0.55, -0.3, -0.05, 0.12, 0.4, 0.62, 0.82, 0.95, 1.0],
                     [0.3, 0.68, 0.86, 0.9, 0.9, 0.86, 0.66, 0.56, 0.42, 0.3, 0.0])
inside = (AU < w_out) & (V > -1.0) & (V < 1.0)
base = np.interp(V, [-1.0, -0.8, -0.5, -0.32, -0.22, 0.0, 0.3, 0.5, 0.7, 0.86, 1.0],
                    [0.2, 0.85, 1.12, 1.25, 1.06, 1.0, 0.98, 1.0, 1.04, 0.92, 0.3])
fall = (AU / np.maximum(w_out, 1e-3)) ** 2.2
h = base - fall * 0.9
h += 0.3 * gauss((V + 0.27) / 0.045) * np.clip((0.8 - AU) / 0.2, 0, 1)        # the brow ridge, a hard shelf
h -= 0.24 * gauss(np.hypot((AU - 0.78) / 0.12, (V + 0.25) / 0.16))             # the temples fallen in
h += 0.3 * gauss(np.hypot((AU - 0.62) / 0.13, (V - 0.06) / 0.08))              # the cheekbones, sharp
h -= 0.4 * gauss(np.hypot((AU - 0.52) / 0.14, (V - 0.36) / 0.15))              # the cheeks starved hollow
for sx_ in (-1, 1):                                             # the sockets, empty and deep
    r = np.hypot((U - sx_ * 0.37) / 0.22, (V + 0.08) / 0.13)
    h -= 0.72 * np.clip(1 - r * r, 0, 1) ** 0.4
nw = np.interp(V, [-0.22, -0.1, 0.1, 0.22], [0.05, 0.06, 0.08, 0.09])
nh = np.interp(V, [-0.24, -0.12, 0.0, 0.16, 0.22, 0.24], [0.0, 0.12, 0.3, 0.5, 0.42, 0.0])
h += nh * np.clip(1 - (U / nw) ** 2, 0, 1) ** 0.7                # the bridge of the nose; its tip broken away
h -= 0.45 * np.clip(1 - np.hypot(U / 0.1, (V - 0.3) / 0.06) ** 2, 0, 1) ** 0.5   # the dark hollow where it was
mouth = (AU < 0.26 - (V - 0.62) ** 2 * 2) & (V > 0.5) & (V < 0.75)
h = np.where(mouth, -0.9, h)                                    # the mouth, hanging open, the bog in it
teeth = np.zeros_like(h, bool)
for row_v, lo in ((0.52, True), (0.73, False)):
    for k in range(-4, 5):
        tu = k * 0.052
        tm = (np.abs(U - tu) < 0.019) & (np.abs(V - row_v - (0.03 if lo else -0.03)) < 0.04) & (AU < 0.24)
        if (k * 7 + (3 if lo else 0)) % 5 == 0:
            continue                                            # a tooth lost
        teeth |= tm
h = np.where(teeth, np.where(V < 0.62, 0.62, 0.55), h)           # long teeth standing at the gums
h += 0.06 * gauss((V + 0.66) / 0.04) * (AU < w_out - 0.04)      # a worn band across the brow
RS = 1.7
h = h * RS - V * 2.5 - 0.5 - U * 0.22                            # tilted back, sunk to the jaw, rolled a little
crack = 1 - np.abs(vn((U * 0.8 + V * 0.6) * 2.4 + 7, (V - U) * 1.3 + vn(U * 6, V * 6) * 0.6) * 2 - 1)
h -= np.where(crack > 0.955, 0.3, 0.0)
fine = 1 - np.abs(vn(U * 9 + 1, V * 9) * 2 - 1)
h -= np.where(fine > 0.975, 0.07, 0.0)
face = inside & (h > Hm) & False           # the head is carved as a relief facing us (head_relief below)
Hm = np.where(face, h, Hm)
Mat[face] = GOD
Tag[face] = 1
TEETH = 4
Mat[face & teeth] = TEETH
# the head's size on screen, and where its waterline and mouth fall (the relief is built after the camera is set)
FW, FH = 60, 80                                                 # the face's half-width and half-height, px
TOPY = -1.62                                                    # the cowl's peak, in face units
HEAD_WL = 0.84                                                  # the waterline, in face units (-1 brow-top .. 1 chin)
HW = int(2 * 1.62 * FW)
WLROW = int((HEAD_WL - TOPY) * FH)
HH = WLROW + 2
SILL = 0.8                                                      # the portal's sill, just above the water
MOUTH_PX = (HEAD_WL - SILL) * FH                                # the sill's height above the water, px
EV = np.array([1.0, 1.0]) / np.sqrt(2)
tv = (WX - CF[0]) * EV[0] + (WY - CF[1]) * EV[1]                # along the ramp, out from the head toward us
tu = (WX - CF[0]) * EV[1] - (WY - CF[1]) * EV[0]                # across it
T_TOP, T_END = 0.7, 7.5
Z_TOP = (MOUTH_PX + 4 * np.sqrt(2) * T_TOP) / KZ               # so the top step meets the mouth on screen
ramp_m = (np.abs(tu) < 0.62) & (tv > T_TOP) & (tv < T_END)
rh = Z_TOP + (tv - T_TOP) / (T_END - T_TOP) * (-0.25 - Z_TOP)
rh = np.floor(rh / 0.14) * 0.14                                  # steps
rh -= np.where(fbm(WX * 2, WY * 2) > 0.68, 0.22, 0.0)            # broken treads
m = ramp_m & (rh > Hm)
Hm = np.where(m, rh, Hm)
Mat[m] = GOD
Tag[m] = 12
posts = []
for k in range(8):                                              # the pilgrim-posts along it, some fallen to stumps
    pt = T_TOP + 0.6 + k * 0.85
    for side in (-1, 1):
        px = CF[0] + EV[0] * pt + EV[1] * side * 0.9
        py = CF[1] + EV[1] * pt - EV[0] * side * 0.9
        ht = Z_TOP + (pt - T_TOP) / (T_END - T_TOP) * (-0.25 - Z_TOP) + (0.9 if (k * 3 + side) % 4 else 0.25)
        d = np.hypot(WX - px, WY - py)
        mm = (d < 0.16) & (ht > Hm)
        Hm = np.where(mm, ht, Hm)
        Mat[mm] = GOD
        Tag[mm] = 13
# its ribs, arching out of the bog on either side of the ramp
for j in range(0):                                              # (cut: at this size they read as lumps, not ribs)
    tj = 3.0 + j * 1.1
    for side in (-1, 1):
        ru = side * tu
        arc = 1.8 * np.sin(np.clip((ru - 1.2) / 2.2, 0, 1) * np.pi) * (1.0 - j * 0.1)
        rib = (np.abs(tv - tj - (ru - 1.2) * 0.25) < 0.075) & (ru > 1.2) & (ru < 3.4)
        if j == 2 and side == 1:
            rib &= ru < 2.0                                     # one snapped
        m = rib & (arc > Hm)
        Hm = np.where(m, arc, Hm)
        Mat[m] = GOD
        Tag[m] = 14

for k in range(10):
    a_ = RNG.uniform(-1.4, 1.4)
    cx, cy = CF[0] + EV[0] * RNG.uniform(-0.3, 1.2) + EV[1] * a_ * 3.2, CF[1] + EV[1] * RNG.uniform(-0.3, 1.2) - EV[0] * a_ * 3.2
    if abs(a_) < 0.35:
        continue                                                # not on the ramp
    s_ = RNG.uniform(0.22, 0.4)
    m = (np.abs(WX - cx) < s_ * 1.3) & (np.abs(WY - cy) < s_) & (0.2 + s_ * 0.5 > Hm)
    Hm = np.where(m, 0.1 + s_ * 0.6, Hm)
    Mat[m] = GOD
    Tag[m] = 10
# --- the hand rising from the bog: starved, the fingers long and thin, the nails long, one snapped
CH = np.array([4.6, 16.4])
fingers = [(-1.1, 4.0, 0.32), (-0.37, 5.2, 0.34), (0.37, 4.8, 0.33), (1.1, 1.6, 0.3)]   # (offset, height, radius)
for i, (off, tall, rad) in enumerate(fingers):
    px, py = CH[0] + off * 0.7, CH[1] - off * 0.7
    d = np.hypot(WX - px, WY - py)
    curl = np.clip((WX - px + WY - py) * 0.6, -0.3, 0.3)
    top = tall + curl - (0 if i != 3 else (fbm(WX * 7, WY * 7) - 0.4) * 0.5) - (d / rad) ** 2 * 0.35
    m = (d < rad) & (top > Hm)
    Hm = np.where(m, top, Hm)
    Mat[m] = GOD
    Tag[m] = 4 + i
d = np.hypot(WX - (CH[0] + 1.2), WY - (CH[1] + 1.0))
m = (d < 0.32) & (2.4 > Hm)
Hm = np.where(m, 2.4, Hm)
Mat[m] = GOD
Tag[m] = 8
d = np.hypot((WX - CH[0] - 0.3) / 1.4, (WY - CH[1] - 0.3) / 1.0)
m = (d < 1) & (0.1 - d * 0.3 > Hm)
Hm = np.where(m, 0.1 - d * 0.3, Hm)
Mat[m] = GOD
Tag[m] = 9

water_cell = Hm < WL
Heff = np.maximum(Hm, WL)


def blur(a, k=1):
    out = a.copy()
    for _ in range(k):
        out = (out + np.roll(out, 1, 0) + np.roll(out, -1, 0) + np.roll(out, 1, 1) + np.roll(out, -1, 1)) / 5
    return out


Hb = blur(Hm, 1)
GY, GX = np.gradient(Hb, 1.0 / R)


def look(arr, x, y, outside):
    ix = np.clip(((x + OFF) * R).astype(int), 0, G - 1)
    iy = np.clip(((y + OFF) * R).astype(int), 0, G - 1)
    return np.where((x < -OFF) | (y < -OFF) | (x >= N - OFF) | (y >= N - OFF), outside, arr[iy, ix])


# ------------------------------------------------------------------ the camera
W, H = 400, 250
FOC = (3.9, 3.2)
CX0, CY0 = 200 - (FOC[0] - FOC[1]) * 8, 125 - (FOC[0] + FOC[1]) * 4 + 22
SY, SX = np.mgrid[0:H, 0:W].astype(float)
sxr, syr = SX + 0.5 - CX0, SY + 0.5 - CY0
DZ = 1.0 / 18
hit = np.zeros((H, W), bool)
hz, hx, hy = np.zeros((H, W)), np.zeros((H, W)), np.zeros((H, W))
for z in np.arange(12.0, WL - 0.2, -DZ):
    s = (syr + z * KZ) / 4.0
    x = (s + sxr / 8.0) / 2.0
    y = (s - sxr / 8.0) / 2.0
    hh_ = look(Heff, x, y, -9.0)
    new = (~hit) & (hh_ >= z)
    hit |= new
    hz[new], hx[new], hy[new] = z, x[new], y[new]
ix = np.clip(((hx + OFF) * R).astype(int), 0, G - 1)
iy = np.clip(((hy + OFF) * R).astype(int), 0, G - 1)
hh = Heff[iy, ix]
top = (hh - hz) < DZ * 1.6
hz = np.where(top, hh, hz)
mat = Mat[iy, ix].copy()
tag = Tag[iy, ix]
wat = water_cell[iy, ix] & top
mat[wat] = WATER
depth = hx + hy + hz * 0.001
gxh, gyh = GX[iy, ix], GY[iy, ix]
nrm = np.where(top[..., None], np.dstack([-gxh, -gyh, np.ones_like(gxh)]), np.dstack([-gxh, -gyh, np.full_like(gxh, 0.12)]))
for i, (off, tall, rad) in enumerate(fingers):                  # fingers: cylinder normals on their sides
    px, py = CH[0] + off * 0.7, CH[1] - off * 0.7
    m = (tag == 4 + i) & ~top
    a = np.arctan2(hy - py, hx - px)
    nrm[m] = np.dstack([np.cos(a), np.sin(a), np.zeros_like(a)])[m]
nrm[wat] = [0, 0, 1]
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True) + 1e-6

# ------------------------------------------------------------------ light
MOON = np.array([-0.72, 0.5, 0.5])            # low, raking across the face so its relief casts shadow
MOON /= np.linalg.norm(MOON)
sh = np.zeros((H, W), bool)
px0, py0, pz0 = hx + nrm[..., 0] * 0.12, hy + nrm[..., 1] * 0.12, hz + 0.02
for k in range(1, 80):
    t = k * 0.1
    sh |= look(Hm, px0 + MOON[0] * t, py0 + MOON[1] * t, -9) > pz0 + MOON[2] * t + 0.02
ndl = np.clip((nrm * MOON).sum(2), 0, 1) * (~sh)
ao = np.zeros((H, W))
for rad in (0.25, 0.6, 1.0):
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        ao += np.clip((look(Hm, hx + np.cos(a) * rad, hy + np.sin(a) * rad, -9) - hz) / (rad * 1.6), 0, 1)
ao = np.clip(ao / 24 * 1.6, 0, 1)
# the ghost-light kept in the broken eye (the right socket)
EYE = np.array([CF[0] + (0.37 * fa + -0.08 * fb) / np.sqrt(2), CF[1] + (-0.37 * fa + -0.08 * fb) / np.sqrt(2), 0.0])
EYE[2] = look(Hm, np.array([EYE[0]]), np.array([EYE[1]]), 0)[0] + 0.4
LV = np.dstack([EYE[0] - hx, EYE[1] - hy, EYE[2] - hz])
LD = np.linalg.norm(LV, axis=2)
ndl_e = np.clip((nrm * (LV / (LD[..., None] + 1e-6))).sum(2), 0, 1) / (1 + (LD / 2.0) ** 2)
ndl_e = np.where(LD < 0.3, 1.0, ndl_e)

# ------------------------------------------------------------------ albedo
bay = B4[SY.astype(int) % 4, SX.astype(int) % 4]
alb = (vn(hx * 6 + 71, hy * 6) * 0.6 + vn(hx * 17, hy * 17) * 0.4 - 0.5) * 0.05
godm = (mat == GOD) | (mat == 4)
alb += np.where(godm, (vn(hx * 1.0, hy * 1.0 + hz) - 0.5) * 0.12 + (vn((hx - hy) * 3, hz * 0.5) - 0.5) * 0.05, 0)
# tears: dark streaks run down from the eyes toward the chin (down the face is +v)
fu = ((hx - CF[0]) - (hy - CF[1])) / np.sqrt(2) / fa
fv = ((hx - CF[0]) + (hy - CF[1])) / np.sqrt(2) / fb
for sx_ in (-1, 1):
    tear = (np.abs(fu - sx_ * 0.37 - np.sin(fv * 9) * 0.01) < 0.016 + (fv + 0.02) * 0.04) & (fv > 0.02) & (fv < 0.3)
    alb[godm & (tag == 1) & tear] -= 0.16 * (1 - (fv[godm & (tag == 1) & tear] - 0.02) / 0.28)
for i, (off, tall, rad) in enumerate(fingers):
    m = (tag == 4 + i) & ~top
    for kz in (tall * 0.49, tall * 0.78):
        alb[m & (np.abs(hz - kz) < 0.07)] -= 0.28                   # a knuckle's crease
        alb[m & (np.abs(hz - kz - 0.11) < 0.04)] += 0.1             # the swell above it, lit
    if i != 3:
        px, py = CH[0] + off * 0.7, CH[1] - off * 0.7
        a = np.arctan2(hy - py, hx - px)
        nail = m & (hz > tall * 0.86) & (np.abs(a - 0.78) < 0.6)
        alb[nail] += 0.12
        alb[m & (np.abs(hz - tall * 0.86) < 0.04) & (np.abs(a - 0.78) < 0.6)] -= 0.2
# tide-line: the stone stained dark and green where the water has risen and fallen
tide = godm & (hz < WL + 0.42)
# moss and lichen
featz = (tag == 1) & (np.abs(fu) < 0.62) & (fv > -0.5) & (fv < 0.75)
moss = godm & top & (nrm[..., 2] > 0.8) & (fbm(hx * 1.8, hy * 1.8) > 0.58) & ~featz
lichen = godm & (vn(hx * 7 + 3, hy * 7 + hz * 3) > 0.84) & ~tide
# tarnished gilding left in the diadem band and on the spikes' lee
gild = np.zeros_like(godm)
# hummocks: strokes
alb += np.where(mat == HUM, (vn((hx + hy) * 2, (hx - hy) * 9) - 0.5) * 0.2, 0)


def shade_land():
    amb = 0.13 + 0.08 * nrm[..., 2]
    I = amb * (1 - ao * 0.85) + ndl * np.where(godm, 1.25, 0.8)
    v = I * 0.78 + alb + (bay - 0.5) * 0.035
    rgb = np.zeros((H, W, 3))
    for mid, rn in MAT_RAMP.items():
        m = mat == mid
        rp = RAMPS[rn]
        rgb[m] = rp[np.clip((v[m] * 6).astype(int), 0, 5)]
    for msk, rn, k in ((tide, "algae", 1.0), (moss, "moss", 0.95)):
        rp = RAMPS[rn]
        rgb[msk] = rp[np.clip((v[msk] * k * 6).astype(int), 0, 5)]
    rgb[lichen] = np.array(hexc("#8b8f72")) * np.clip(v[lichen] * 1.6, 0.5, 1.0)[..., None]
    gc = ramp("#3a2a12", "#6a4c1c", "#a07a30", "#d4aa50")
    rgb[gild] = gc[np.clip((v[gild] * 5).astype(int), 0, 3)]
    # temperature: cool moon everywhere
    rgb *= np.array([0.86, 0.92, 1.06])
    return np.clip(rgb, 0, 1), v


def to_screen(x, y, z=0.0):
    return (x - y) * 8 + CX0, (x + y) * 4 - z * KZ + CY0


# ------------------------------------------------------------------ the head: carved as a relief facing us
# A sculptor's relief: depth toward the viewer over the head's outline, lit from the upper left, so a face's planes
# read directly (Derek: "too round, not face like"). It lolls a little to its left; it is sunk to the jaw.
def head_relief():
    """The Famine's head, carved as a relief facing us. Not a ghoul's skull: a god's statue, worn by its worship.
    A heavy cowl with deep folds frames it and shades the brow; one eye is a sculpted half-lidded stone eye, the
    other broken out to a socket where a ghost-light is kept; the face is long, with hunger folds down the cheeks;
    the mouth was cut by its kingdoms into a squared portal (jambs, a lintel across the upper lip, the middle teeth
    knocked out) and the steps go on up into the dark inside; votive niches are cut along the cheekbones, a band of
    notches across the brow. Lit from the upper left with real self-shadow (the cowl, the nose, the lids cast it)."""
    yy, xx = np.mgrid[0:HH, 0:HW].astype(float)
    x0 = (xx + 0.5 - HW / 2) / FW
    y0 = (yy + 0.5) / FH + TOPY
    ang = 0.1
    X = x0 * np.cos(ang) + (y0 - 0.2) * np.sin(ang)
    Y = -x0 * np.sin(ang) + (y0 - 0.2) * np.cos(ang) + 0.2
    AX = np.abs(X)
    # the outline of the face, long and gaunt, and the cowl round it
    fw_ = np.interp(Y, [-1.0, -0.6, -0.3, 0.0, 0.08, 0.3, 0.55, 0.8, 0.95, 1.05], [0.62, 0.8, 0.84, 0.84, 0.86, 0.74, 0.66, 0.58, 0.46, 0.0])
    hw_ = np.interp(Y, [TOPY, TOPY + 0.1, TOPY + 0.35, -1.0, -0.6, -0.2, 0.3, 0.84], [0.0, 0.16, 0.5, 0.84, 1.08, 1.24, 1.42, 1.6])
    hw_ = hw_ + (fbm(Y * 4.0 + np.sign(X) * 3, np.sign(X)) - 0.5) * 0.18 - (vn(Y * 9, np.sign(X) * 5) > 0.8) * 0.08   # worn, chipped
    rim = -0.62 + 0.16 * X * X                                      # the cowl's opening, an arch over the brow
    face = (AX < fw_) & (Y > rim)
    hood = (AX < hw_) & ~face
    show = (face | hood) & (y0 < HEAD_WL)
    # ---- the cowl: thick at its rim, falling away to its edges, in long folds
    t_ = np.clip((AX - fw_) / np.maximum(hw_ - fw_, 1e-3), 0, 1)
    fold_ph = X * 11 + np.sin(Y * 2.6 + X) * 1.8 + Y * np.sign(X) * 1.2      # folds hanging, splaying as they fall
    Rh = 0.95 - t_ ** 1.3 * 0.7 + 0.16 * np.sin(fold_ph) * (0.3 + t_) + 0.06 * np.sin(X * 5 + 1)
    Rh = np.where(Y < rim + 0.05, Rh, Rh)                          # over the crown the cowl closes
    Rh += 0.1 * gauss((Y - rim) / 0.05) * (AX < fw_ + 0.05)        # the rim's thick hem
    Rh -= np.clip(TOPY + 0.45 - Y, 0, 1) * 0.5                     # the peak
    # ---- the face
    # ---- the face, built in layers (STUDY.md round 7): the skull, the muscles on it, the fat in its hollows (a
    # Famine has almost none), and the skin drawn taut over all. The carving and the weather come after.
    def _soft(a_, k_):
        out_ = a_.copy()
        for _ in range(k_):
            out_ = (out_ + np.roll(out_, 1, 0) + np.roll(out_, -1, 0) + np.roll(out_, 1, 1) + np.roll(out_, -1, 1)) / 5
        return out_
    def blob(cx_, cy_, rx_, ry_):
        return gauss(np.hypot((X - cx_) / rx_, (Y - cy_) / ry_))
    def mblob(cx_, cy_, rx_, ry_):
        return np.maximum(blob(cx_, cy_, rx_, ry_), blob(-cx_, cy_, rx_, ry_))
    def band(x0_, y0_, x1_, y1_, w_):                               # a strap between two points, both sides
        out_ = np.zeros_like(X)
        for sg in (-1, 1):
            px_, py_ = X * sg - x0_, Y - y0_
            dx_, dy_ = x1_ - x0_, y1_ - y0_
            tt = np.clip((px_ * dx_ + py_ * dy_) / (dx_ * dx_ + dy_ * dy_), 0, 1)
            d_ = np.hypot(px_ - tt * dx_, py_ - tt * dy_)
            out_ = np.maximum(out_, gauss(d_ / w_) * np.sin(np.pi * np.clip(tt, 0.02, 0.98)) ** 0.5)
        return out_
    # -- bone: the cranium's front, the brow, the orbits, the nasal bones and the opening beneath, the cheekbones and
    #    their arches, the temple's hollow behind them, the upper jaw over the teeth, the jaw
    S = 0.5 * np.clip(1 - (X / 0.9) ** 2 - ((Y + 0.3) / 0.85) ** 2, 0, 1) ** 0.5
    S += 0.18 * np.clip(1 - ((Y + 0.27) / np.where(Y > -0.27, 0.035, 0.1)) ** 2, 0, 1) * np.clip((0.76 - AX) / 0.12, 0, 1)   # brow, a sharp lower edge
    orb = ((AX - 0.36) / 0.2) ** 4 + ((Y + 0.08) / 0.14) ** 4
    S -= 0.42 * np.clip(1 - orb, 0, 1) ** 0.3                          # the orbits, steep-walled
    S += 0.1 * gauss(X / 0.035) * ((Y > -0.22) & (Y < 0.1)) * np.clip((0.1 - Y) / 0.08, 0.3, 1)   # the nasal bones
    S += 0.16 * mblob(0.6, 0.07, 0.1, 0.07)                           # the zygoma's body
    arch_ = (np.abs(Y - 0.05) < 0.035) & (AX > 0.6) & (AX < 0.93)
    S += np.where(arch_, 0.1, 0.0)                                    # the arch, standing proud
    S -= 0.16 * mblob(0.8, -0.3, 0.1, 0.22)                           # the temporal fossa behind it
    S += 0.22 * np.clip(1 - (X / 0.36) ** 2, 0, 1) ** 0.5 * ((Y > 0.3) & (Y < 0.58))   # the maxilla over the teeth's curve
    jw_ = np.interp(Y, [0.55, 0.62, 0.8, 0.95, 1.0], [0.6, 0.62, 0.5, 0.3, 0.0])
    S = np.maximum(S, np.where((AX < jw_) & (Y > 0.55), 0.24 * np.clip(1 - (AX / np.maximum(jw_, 1e-3)) ** 2, 0, 1) ** 0.4 + 0.06 * blob(0, 0.9, 0.14, 0.06), -1))
    S += 0.08 * band(0.68, 0.1, 0.62, 0.62, 0.04)                      # the ramus rising to the ear
    S += 0.04 * gauss((Y - (0.95 - (AX - 0.2) * 0.62)) / 0.025) * ((AX > 0.18) & (AX < 0.62))   # the jaw's lower edge
    # -- muscle (a starved god's, wasted to a third)
    MW = 0.35
    M = np.zeros_like(X)
    M += 0.16 * mblob(0.78, -0.25, 0.12, 0.26)                        # temporalis, filling the temple (wasted: sunk)
    M += 0.14 * band(0.7, 0.1, 0.62, 0.62, 0.07)                      # masseter, the block from the arch to the angle
    M += 0.03 * np.clip((-0.3 - Y) / 0.2, 0, 1) * (AX < 0.7)          # frontalis, a thin sheet
    M += 0.07 * np.exp(-((np.sqrt(np.maximum(orb, 0)) - 1.15) / 0.3) ** 2) * (Y > -0.2)   # orbicularis oculi: the soft lower rim
    M += 0.08 * band(0.58, 0.12, 0.3, 0.52, 0.045)                    # zygomaticus, cheekbone to the mouth's corner
    M += 0.05 * mblob(0.46, 0.42, 0.1, 0.12)                          # buccinator, deep in the cheek
    M += 0.06 * np.exp(-((np.hypot(X / 0.27, (Y - 0.56) / 0.12) - 1) / 0.35) ** 2)   # orbicularis oris, round the lips
    # -- fat (almost none)
    FED = 0.08
    Fp = 0.12 * mblob(0.78, -0.25, 0.12, 0.2) + 0.16 * mblob(0.48, 0.38, 0.12, 0.13) + 0.06 * mblob(0.4, 0.1, 0.12, 0.06)
    # -- skin: an envelope over bone and what lies on it, drawn taut across the hollows, softened by its thickness
    E = np.maximum(S + 0.015, S + M * MW + Fp * FED)
    E = np.maximum(E, _soft(E, 4) - 0.05)                             # taut: it bridges the narrow pits a little
    E = _soft(E, 2)
    R = E * 1.15 + 0.06 - (np.clip(AX / np.maximum(fw_, 1e-3), 0, 1) ** 3) * 0.2   # the sides turning away
    R -= np.clip(rim + 0.18 - Y, 0, 1) * 1.2                          # the brow going under the cowl's rim
    cart = (AX < 0.17) & (Y > -0.6) & (Y < -0.4)                      # a name-panel on the brow
    cart_in = (AX < 0.13) & (Y > -0.57) & (Y < -0.43)
    R = np.where(cart & ~cart_in, R + 0.04, R)
    R = np.where(cart_in, R - 0.03 + (vn(X * 60, Y * 8) - 0.5) * 0.012, R)       # its name chiselled out, rough
    # the eyes: the left a half-lidded stone eye; the right broken out
    # the socket: a hard upper rim under the brow, a soft lower one sloping out to the cheek
    ex, ey = (X + 0.36) / 0.17, (Y + 0.075) / 0.07
    al_ = np.clip(1 - ex * ex, 0, 1) ** 0.7
    almond = (np.abs(ex) < 1) & (np.abs(ey) < al_)  # the eye: an almond, pointed at its corners
    R += np.where(almond, 0.3 * np.clip(1 - ex * ex - ey * ey * 0.5, 0, 1) ** 0.5, 0)    # the eyeball, set back in the orbit
    lid_y = -0.2 + ex * 0.08                                         # cast down: the lid hangs to below the middle
    lid = almond & (ey < lid_y + 0.25)
    R = np.where(lid, R + 0.05 + 0.02 * np.clip(1 - ex * ex, 0, 1), R)   # the heavy upper lid
    lidline = almond & (np.abs(ey - (lid_y + 0.25)) < 0.16)          # its edge, incised
    crease = (np.abs(ey - (-al_ - 0.35)) < 0.16) & (np.abs(ex) < 0.95)   # the crease above, cut
    R = np.where(crease, R - 0.025, R)
    lowlid = (np.abs(ey - al_) < 0.18) & (np.abs(ex) < 0.95)
    R = np.where(lowlid, R + 0.02, R)
    pupil = np.zeros_like(R, bool)
    rr = np.hypot((X - 0.36) / 0.2, (Y + 0.09) / 0.13)
    broke = rr < 1 + (vn(X * 20, Y * 20) - 0.5) * 0.25
    R = np.where(broke, R - 0.45 * np.clip(1 - rr * rr, 0.3, 1), R)  # broken out, ragged
    # the nose: the bridge is the nasal bones under the skin; the cartilage and the tip broken away, the skull's
    # pear-shaped opening shows beneath
    # the cartilage carries the nose on down from the bones: a wedge with a flat top and side planes, its tip broken
    # off in a ragged line; under the break, two small dark hollows where the nostrils were
    nw = np.interp(Y, [-0.2, 0.0, 0.15, 0.24], [0.04, 0.055, 0.075, 0.085])
    brk = 0.22 + (vn(X * 40, 3.0) - 0.5) * 0.05
    nh = np.interp(Y, [-0.22, -0.1, 0.05, 0.18], [0.0, 0.08, 0.16, 0.22]) * (Y < brk)
    R += nh * np.clip(np.minimum(1.0, (1 - AX / nw) * 2.4), 0, 1)
    R += 0.05 * gauss(np.hypot((AX - 0.09) / 0.035, (Y - 0.24) / 0.035))      # what is left of the wings
    nasal = (np.hypot((AX - 0.035) / 0.03, (Y - 0.27) / 0.03) < 1)
    R = np.where(nasal, R - 0.15, R)
    # the mouth: cut into a squared portal
    portal = (AX < 0.19) & (Y > 0.48) & (Y < SILL + 0.06)
    jamb = (AX >= 0.19) & (AX < 0.26) & (Y > 0.44) & (Y < SILL + 0.06)
    lintel = (AX < 0.26) & (Y > 0.42) & (Y <= 0.48)
    R = np.where(jamb | lintel, R + 0.06, R)
    gcell = (np.floor((X + 1) * 18), np.floor((Y - 0.42) / 0.02))
    lintel_cut = lintel & (_P[(gcell[0].astype(int) * 7 + gcell[1].astype(int) * 3) % 1024, 21] > 0.55)   # glyphs cut in the lintel
    R = np.where(portal, -0.6, R)
    teeth = (AX >= 0.26) & (AX < 0.32) & (Y > 0.5) & (Y < 0.72) & ((np.floor(Y * 30) % 3) == 1)   # a few side teeth left
    R = np.where(teeth, R + 0.03, R)
    # votive niches along the cheekbones
    niche = np.zeros_like(R, bool)
    for k in range(4):
        for sgn in (-1, 1):
            cx_, cy_ = sgn * (0.5 + k * 0.08), 0.14 + k * 0.035
            niche |= (np.abs(X - cx_) < 0.026) & (np.abs(Y - cy_) < 0.035)
    R = np.where(niche, R - 0.12, R)
    crack = 1 - np.abs(vn((X * 0.9 + Y * 0.5) * 3.0 + 9, (Y - X) * 1.6 + vn(X * 8, Y * 8) * 0.6) * 2 - 1)
    cr = (crack > 0.965) & face & (X > 0.15)                         # cracks on the broken side only
    R = np.where(cr, R - 0.05, R)
    RR = np.where(face, R, Rh)
    # ---- masonry, irregular (Derek: "more irregular and the lines less intense"; STUDY.md round 5, the Bayon):
    # stones of every size fitted without mortar, courses only roughly level, hairline joints that read only where
    # the light rakes them, edges weathered round, the carving running straight across the joints
    from scipy.spatial import cKDTree
    rgs = np.random.default_rng(31)
    pts = []
    yv = TOPY - 0.05
    while yv < HEAD_WL + 0.1:
        chh = rgs.uniform(0.07, 0.15) if yv < -0.6 else rgs.uniform(0.13, 0.26)
        xv = -1.8 + rgs.uniform(0, 0.2)
        while xv < 1.8:
            bwid = rgs.uniform(0.12, 0.34) * (1.0 if yv < -0.6 else 1.6)
            pts.append((xv + bwid / 2, (yv + chh / 2 + rgs.normal(0, chh * 0.12)) * 1.6))
            xv += bwid
        yv += chh
    pts = np.array(pts)
    tree = cKDTree(pts)
    dd_, ii_ = tree.query(np.stack([X.ravel(), Y.ravel() * 1.6], 1), k=2)
    gap_ = ((dd_[:, 1] - dd_[:, 0])).reshape(X.shape)
    bid = (ii_[:, 0].reshape(X.shape) * 7) % 1024
    joint = gap_ < np.where(face, 0.008, 0.012)
    round_ = np.clip(gap_ / 0.05, 0, 1) ** 0.5                       # each stone's edge worn round
    RR = RR + np.where(joint, -0.012, (round_ - 1) * np.where(face, 0.004, 0.012)) * show
    chip = hood & (_P[bid, 11] > 0.8) & (gap_ < 0.04) & (vn(X * 30, Y * 30) > 0.5)
    RR = np.where(chip, RR - 0.02, RR)
    missing = hood & (_P[bid, 13] > 0.95) & (Y > TOPY + 0.4)        # a few stones of the cowl fallen out
    RR = np.where(missing, RR - 0.16, RR)
    cv_ = np.zeros_like(X)
    RR = np.where(show, RR, -1.0)
    # ---- light: normals, the moon from the upper left, real self-shadow, occlusion
    gy_, gx_ = np.gradient(RR)
    K = 44.0
    n = np.dstack([-gx_ * K, -gy_ * K, np.ones_like(RR)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.55, -0.55, 0.63])
    L /= np.linalg.norm(L)
    dif = np.clip((n * L).sum(2), 0, 1)
    shad = np.zeros_like(RR, bool)
    rise = L[2] / np.hypot(L[0], L[1]) / K                          # height gained per px toward the light
    for k in range(1, 40):
        sx_ = np.clip((xx + L[0] / np.hypot(L[0], L[1]) * k).astype(int), 0, HW - 1)
        sy_ = np.clip((yy + L[1] / np.hypot(L[0], L[1]) * k).astype(int), 0, HH - 1)
        shad |= RR[sy_, sx_] > RR + rise * k + 0.01
    dif = np.where(shad & show, dif * 0.15, dif)
    Rb = RR.copy()
    for _ in range(8):
        Rb = (Rb + np.roll(Rb, 2, 0) + np.roll(Rb, -2, 0) + np.roll(Rb, 2, 1) + np.roll(Rb, -2, 1)) / 5
    ao = np.clip((Rb - RR) * 3.0, 0, 1) * show
    bay_ = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    I = 0.1 + dif * 0.95 - ao * 0.5 + (1 - n[..., 2]) * 0.06 * (n[..., 0] > 0.3)   # a little bounce on the right
    alb = (vn(xx * 0.08, yy * 0.02) - 0.5) * 0.1 + (vn(xx * 0.4, yy * 0.4) - 0.5) * 0.03
    alb = np.where(hood, alb - 0.04 + (vn(xx * 0.05, yy * 0.015 + 3) - 0.5) * 0.1, alb)   # the cowl: rain-streaked
    tear = (np.abs(X + 0.36 - np.sin(Y * 20) * 0.006) < 0.016 + (Y - 0.02) * 0.03) & (Y > 0.02) & (Y < 0.4)
    alb = np.where(tear & face, alb - 0.12, alb)                    # a dark stain run down from the stone eye
    alb = alb + (_P[bid, 15] - 0.5) * np.where(face, 0.04, 0.09)   # each stone its own, a little
    alb = np.where(joint, alb - np.where(face, 0.025, 0.05), alb)   # hairlines, low contrast
    # stains run down from every ledge: the brow, the eye's lower rim, the lips' corners
    for (sx0, sy0, ln_) in ((-0.36, 0.0, 0.32), (0.36, 0.0, 0.34), (-0.26, 0.5, 0.3), (0.26, 0.5, 0.3)):
        stn = (np.abs(X - sx0 - np.sin(Y * 30 + sx0 * 9) * 0.008) < 0.02 + (Y - sy0) * 0.04) & (Y > sy0) & (Y < sy0 + ln_)
        alb = np.where(stn & face, alb - 0.07 * np.clip(1 - (Y - sy0) / ln_, 0, 1), alb)
    v = I * 0.86 + alb + (bay_ - 0.5) * 0.035
    rgb = RAMPS["god"][np.clip((v * 6).astype(int), 0, 5)]
    tide = show & (y0 > HEAD_WL - 0.13)
    rgb[tide] = RAMPS["algae"][np.clip((v[tide] * 0.9 * 6).astype(int), 0, 5)]
    moss = show & hood & (fbm(xx * 0.07, yy * 0.07) > 0.56) & (n[..., 1] < -0.1)
    moss |= show & face & (np.abs(Y - rim) < 0.06) & (fbm(xx * 0.1 + 4, yy * 0.1) > 0.5)
    rgb[moss] = RAMPS["moss"][np.clip((v[moss] * 6).astype(int), 0, 5)]
    ros = vn(xx * 0.22 + 3, yy * 0.22)
    lich = show & (ros > 0.78) & (n[..., 1] < -0.15) & (fbm(xx * 0.05 + 2, yy * 0.05) > 0.55) & ~tide & ~moss & ~portal & ~broke
    rgb[lich] = np.array(hexc("#8b8f72")) * np.clip(v[lich] * 1.5, 0.45, 1.0)[..., None]
    rgb[teeth] = RAMPS["teeth"][np.clip(((I[teeth] * 0.6 + 0.08) * 6).astype(int), 0, 5)]
    rgb[lidline] *= 0.5
    rgb[lintel_cut] *= 0.55
    rgb[pupil & show] *= 0.7
    cf_top = cart & ~cart_in & (Y < -0.585)                         # the name-panel's frame: a lit upper edge, a dark lower
    cf_bot = cart & ~cart_in & (Y > -0.415)
    rgb[cf_top & show] = np.clip(rgb[cf_top & show] * 1.4 + 0.04, 0, 1)
    rgb[cf_bot & show] *= 0.5
    rgb[cart_in & show] = rgb[cart_in & show] * 0.85 + np.array(hexc("#3a3f3c")) * 0.15
    rgb[missing & show] = RAMPS["god"][0] * 1.2                     # the dark behind a fallen block
    jm = joint & hood & show & ~moss & (fbm(xx * 0.12 + 7, yy * 0.12) > 0.64)
    rgb[jm] = rgb[jm] * 0.5 + RAMPS["moss"][2] * 0.5                 # moss in a few joints
    # the cowl's hem: a carved border of lozenges along the opening
    hem = hood & (AX < fw_ + 0.13) & (Y > rim - 0.02)
    lz = (np.abs(((Y * 9) % 1) - 0.5) + np.abs(((AX - fw_) / 0.13) - 0.5) * 0.8) < 0.32
    rgb[hem & lz & show] = np.clip(rgb[hem & lz & show] * 1.25, 0, 1)
    rgb[hem & ~lz & show & (((Y * 9) % 1) < 0.12)] *= 0.6
    # inside the portal: the steps going on up into the dark, each tread's lip faintly lit
    inside = portal & show
    step_row = ((SILL + 0.06 - Y) * FH).astype(int)
    dark = np.array(hexc("#050505"))
    rgb[inside] = dark
    lit_rows = inside & (step_row % 4 == 0) & (step_row < 22)
    fade = np.clip(1 - step_row / 22.0, 0, 1)
    rgb[lit_rows] = (np.array(hexc("#2a2d2c")) * fade[lit_rows][..., None] + dark * (1 - fade[lit_rows][..., None]))
    rgb[niche & show] = np.array(hexc("#0a0b0b"))
    rgb[nasal & show] = np.array(hexc("#0a0a0a"))
    # the silhouette: lit edge up-left, dark edge down-right
    edge_dark = show & ~(np.roll(show, -1, 1) & np.roll(show, -1, 0))
    edge_lit = show & ~(np.roll(show, 1, 1) & np.roll(show, 1, 0))
    rgb[edge_dark] *= 0.55
    rgb[edge_lit] = np.clip(rgb[edge_lit] * 1.25, 0, 1)
    # old moss hanging in strands from the cowl's rim, creepers down its sides
    rg = np.random.default_rng(9)
    for k in range(11):
        sxk = rg.uniform(-0.9, 0.9)
        rx_ = int(HW / 2 + sxk * FW)
        ry_ = int((-0.62 + 0.16 * sxk * sxk + 0.02 - TOPY) * FH)
        L_ = int(rg.uniform(3, 12) * (1.6 if k % 4 == 0 else 1.0))
        for j in range(L_):
            px_, py_ = rx_ + int(round(np.sin(j * 0.6 + k) * 0.6)), ry_ + j
            if 0 <= px_ < HW and 0 <= py_ < HH and show[py_, px_]:
                rgb[py_, px_] = RAMPS["moss"][3 if j < L_ * 0.6 else 2] if j % 3 else RAMPS["moss"][4]
    for k in range(8):
        sd = 1 if k % 2 else -1
        y_ = rg.uniform(-1.1, -0.3)
        x_ = sd * (np.interp(y_, [TOPY, -1.0, -0.6, -0.2], [0.2, 0.84, 1.08, 1.24]) - 0.05)
        px_, py_ = HW / 2 + x_ * FW, (y_ - TOPY) * FH
        for j in range(int(rg.uniform(20, 50))):
            px_ += np.sin(j * 0.3 + k) * 0.7 + sd * 0.15
            py_ += 1
            ix_, iy_ = int(px_), int(py_)
            if 0 <= ix_ < HW and 0 <= iy_ < HH and show[iy_, ix_]:
                rgb[iy_, ix_] = RAMPS["moss"][2]
                if j % 5 == 0 and ix_ + 1 < HW:
                    rgb[iy_, ix_ + 1] = RAMPS["moss"][4]          # a leaf catching the moon
    rgb *= np.array([0.86, 0.92, 1.06])
    sock_r = broke & face
    r = rr
    return np.clip(rgb, 0, 1), show, n, xx, yy, X, Y, sock_r, I, RR


HEAD = head_relief()
HSX, HSY = to_screen(CF[0], CF[1], 0.0)
HX0 = int(round(HSX - HW / 2))
HY0 = int(round(HSY - WLROW))
HEAD_DEPTH = CF[0] + CF[1]
# the head stands in the scene: it hides what is behind it, and is hidden by what stands in front (the ramp, posts)
_hrgb, _hshow = HEAD[0], HEAD[1]
for j in range(HH):
    for i in range(HW):
        if _hshow[j, i]:
            X_, Y_ = HX0 + i, HY0 + j
            if 0 <= X_ < W and 0 <= Y_ < H and (depth[Y_, X_] < HEAD_DEPTH + 0.3 or wat[Y_, X_] or not hit[Y_, X_]):
                depth[Y_, X_] = HEAD_DEPTH
                wat[Y_, X_] = False


def draw_head(rgb, t):
    hrgb, show, n, xx, yy, X, Y, sock_r, I, RR = HEAD
    pulse = 0.75 + 0.25 * np.sin(t * 2.0) * np.sin(t * 0.7 + 1)
    out = hrgb.copy()
    # the ghost-flame burning down inside the broken socket (Derek: "it doesn't look like it's coming from a hollow
    # socket, more like you pasted the inferno on top"). Three things make a fire sit inside a hollow: its root is
    # hidden behind the socket's lower rim, so it climbs up out of the dark; it lights the hollow from within (the
    # inner walls, and the underside of the brow above it, lit from below); and its cool tongues are thin enough
    # to see the stone through, only the core solid. The cheek under the rim gets little of its light.
    ys, xs = np.nonzero(sock_r)
    sx_c = xs.mean()
    s_top, s_bot = ys.min(), ys.max()
    s_w = (xs.max() - xs.min()) / 2.0
    root_y = s_bot - (s_bot - s_top) * 0.3                            # the flame's root, down in the hollow
    fl = 0.8 + 0.2 * np.sin(t * 13) * np.sin(t * 7.3 + 1)
    # its light, from a point down in the socket, by the carved surface's own angles
    zf = RR[int(root_y), int(sx_c)] + 0.02
    Lx, Ly, Lz = sx_c - xx, (root_y - 4) - yy, (zf - RR) * 44.0
    Ld = np.sqrt(Lx * Lx + Ly * Ly + Lz * Lz) + 1e-3
    lit = np.clip((n[..., 0] * Lx + n[..., 1] * Ly + n[..., 2] * Lz) / Ld, 0, 1) / (1 + (Ld / 24.0) ** 2) * fl * 1.5
    below = (yy > root_y + 2) & ~sock_r                                # under the lower rim: the rim keeps the light off
    lit = np.where(below, lit * 0.25, lit)
    rim_d = np.hypot((xx - sx_c) / max(s_w, 1), (yy - (s_top + s_bot) / 2) / max((s_bot - s_top) / 2, 1))
    # inside the hollow: the depth behind the flame dark; a ring of inner wall near the rim catching the light,
    # strongest on the upper wall (it faces down into the fire), weaker on the lower
    upper = yy < (s_top + s_bot) / 2
    wall = np.clip((rim_d - 0.5) / 0.38, 0, 1) * np.where(upper, 1.0, 0.45) * fl
    lit = np.where(sock_r, wall, lit)
    lv = np.round(np.clip(lit * 1.6, 0, 0.85) * 4) / 4
    gc = np.array(hexc("#7fd8e0"))
    out[sock_r] = np.array(hexc("#03090b"))                           # the hollow's depth
    out = np.where((lv > 0)[..., None] & show[..., None], out * (1 - lv[..., None] * 0.55) + gc * lv[..., None] * 0.6, out)
    # the flame: tongues torn from a fast upward noise, the width of the socket, rising out of it and over the brow
    dxp = (xx - sx_c) / max(s_w * 0.85, 4.0)
    up = (root_y - yy) / 44.0
    sway_ = np.sin(t * 3.1 + up * 5) * up * 0.3
    body = np.clip(1 - np.abs(dxp - sway_) / (1.0 - up * 0.65), 0, 1)
    near_ = np.clip(body * 3.0, 0, 1)
    tongues = vn((xx - sx_c) * 0.5, yy * 0.12 + t * 7.5) * 0.55 + vn((xx - sx_c) * 1.1 + 5, yy * 0.25 + t * 12.5) * 0.45
    split = np.clip(np.abs(np.sin((xx - sx_c) * 0.42 + np.sin(t * 2.3) * 1.2)), 0, 1)   # gaps between the tongues
    heat = body * (1 - up * 0.8) * 1.75 + ((tongues - 0.5) * 1.3 * (0.3 + up)) * near_ - (1 - split) * up * 0.5
    heat = np.where((up > -0.02) & (up < 1.1), heat, 0) * fl
    hidden = (yy > root_y - 1) & ~sock_r                               # the root, behind the lower rim
    fc = ramp("#0b2f38", "#1b6672", "#46a8b4", "#9ae2e8", "#effcfc")
    lvh = np.clip((heat - 0.28) * 3.9, -1, 4.99)
    fm = (lvh >= 0) & show & ~hidden
    bay_ = B4[yy.astype(int) % 4, xx.astype(int) % 4]
    for k in range(5):
        m = fm & (lvh.astype(int) == k)
        if k <= 1:
            m &= bay_ < (0.45 if k == 0 else 0.75)                     # the cool outer tongues thin: the stone through them
            out[m] = out[m] * 0.45 + fc[k] * 0.55 * 1.6
        else:
            out[m] = fc[k]
    out = np.clip(out, 0, 1)
    # ghost-smoke off the tongues' tips, and motes breaking off and rising
    for k in range(4):
        ph = (t * 0.6 + k * 0.25) % 1.0
        cx_s = sx_c + np.sin(ph * 5 + k * 2) * 5 * ph
        cy_s = root_y - 40 - ph * 24
        rr_s = 2 + ph * 4
        sm = (np.hypot(xx - cx_s, (yy - cy_s) * 1.3) < rr_s) & show & (bay_ < (1 - ph) * 0.45)
        out[sm] = out[sm] * 0.6 + np.array(hexc("#5e9298")) * 0.4
    for k in range(6):
        ph = (t * 0.9 + k * 0.167) % 1.0
        mx = int(sx_c + np.sin(ph * 7 + k * 1.9) * (3 + ph * 8))
        my = int(root_y - 30 - ph * 36)
        if 0 <= mx < HW and 0 <= my < HH and show[my, mx] and ph < 0.85:
            out[my, mx] = np.array(hexc("#dffafa")) if ph < 0.4 else np.array(hexc("#6fc4cc"))
    for j in range(HH):
        Y_ = HY0 + j
        if not (0 <= Y_ < H):
            continue
        row = show[j]
        if not row.any():
            continue
        for i in np.nonzero(row)[0]:
            X_ = HX0 + i
            if 0 <= X_ < W and depth[Y_, X_] == HEAD_DEPTH:
                rgb[Y_, X_] = out[j, i]
        # its reflection in the bog, broken by ripples
        Ym = int(HSY + (HSY - Y_))
        dist = Ym - HSY
        if 0 <= Ym < H and (dist < 40 or (Ym + int(t * 4)) % 3 != 0):
            off = int(round(np.sin(Ym * 0.9 + t * 3.0) * (1.0 + dist * 0.03)))
            k = 0.42 * np.clip(1 - dist / 110.0, 0.15, 1)
            for i in np.nonzero(row)[0]:
                X_ = HX0 + i + off
                if 0 <= X_ < W and wat[Ym, X_]:
                    rgb[Ym, X_] = out[j, i] * k + np.array(hexc("#0b0a08")) * (1 - k)
    # the waterline: a dark lip, broken pale ripples
    for i in range(HW):
        X_ = HX0 + i
        if 0 <= X_ < W and 0 <= int(HSY) < H and show[WLROW - 1, i]:
            rgb[int(HSY), X_] = np.array(hexc("#050504"))
            if (i + int(t * 6)) % 7 < 2 and int(HSY) + 1 < H:
                rgb[int(HSY) + 1, X_] = np.array(hexc("#46504e"))


# reflection: march each water pixel's mirrored ray up through the field; read the painted image where it lands
rx, ry, rz = hx.copy(), hy.copy(), np.full((H, W), WL)
rhit = np.zeros((H, W), bool)
rsx, rsy = np.zeros((H, W)), np.zeros((H, W))
for k in range(1, 130):
    t = k * 0.055
    x, y, z = hx - t, hy - t, WL + t
    hh_ = look(Hm, x, y, -9)
    new = wat & (~rhit) & (hh_ >= z)
    rhit |= new
    sx_, sy_ = to_screen(x, y, z)
    rsx[new], rsy[new] = sx_[new], sy_[new]
# underwater: how far the sunk stone lies beneath, so the shallows show it
under = WL - Hm[iy, ix]
see_god = wat & (Mat[iy, ix] == GOD) & (under < 0.5)

# ------------------------------------------------------------------ living layers
trees = []
for (x, y, ht, sd) in [(1.6, 4.0, 62, 1), (21.5, 2.6, 70, 2), (2.6, 17.6, 54, 3), (20.6, 18.4, 58, 4)]:
    trees.append((x, y, ht, sd))
reeds = []
for k in range(600):
    x, y = RNG.random() * 30 - 4, RNG.random() * 30 - 5
    hh_ = Hm[min(G - 1, int((y + OFF) * R)), min(G - 1, int((x + OFF) * R))]
    if -0.18 < hh_ < 0.12 and Mat[min(G - 1, int((y + OFF) * R)), min(G - 1, int((x + OFF) * R))] != GOD and fbm(np.array([x * 0.7]), np.array([y * 0.7]))[0] > 0.5:
        reeds.append((x, y, RNG.random()))
pads = []
for k in range(140):
    x, y = RNG.random() * 26 - 2, RNG.random() * 26 - 3
    ixx, iyy = min(G - 1, int((x + OFF) * R)), min(G - 1, int((y + OFF) * R))
    if water_cell[iyy, ixx] and Hm[iyy, ixx] > -0.4 and fbm(np.array([x * 0.5 + 9]), np.array([y * 0.5]))[0] > 0.55:
        pads.append((x, y, RNG.random()))


def plot(rgb, x, y, c, dpt=None):
    x, y = int(round(x)), int(round(y))
    if 0 <= x < W and 0 <= y < H and (dpt is None or depth[y, x] < dpt + 0.2):
        rgb[y, x] = c
        return True
    return False


def draw_tree(rgb, x, y, ht, sd, sway, mirror=False):
    r = np.random.default_rng(sd)
    bx, by = to_screen(x, y, 0)
    bark = ramp("#07080b", "#121418", "#1f2226", "#383a3a")
    def limb(px, py, ang, L, w, depth_):
        n = int(L)
        for k in range(n):
            f = k / max(1, n)
            qx = px + np.cos(ang) * k + np.sin(k * 0.3 + sd) * 0.6
            qy = py + np.sin(ang) * k
            ww = int(max(1, round(w * (1 - f * 0.6))))
            for j in range(ww):
                c = bark[3] if (j == 0 and ww > 1) else (bark[2] if j == 1 else bark[0])
                X, Y = qx + j, qy
                if mirror:
                    Y = 2 * by - Y
                    if not (0 <= int(Y) < H and 0 <= int(X) < W and wat[int(Y), int(X)]):
                        continue
                    c = c * 0.6 + np.array(hexc("#0a1214")) * 0.4
                    plot(rgb, X + np.sin(Y * 0.7 + sway * 3) * 0.8, Y, c)
                else:
                    plot(rgb, X, Y, c, x + y)
        if depth_ > 0:
            ex, ey = px + np.cos(ang) * n, py + np.sin(ang) * n
            for kk in range(2):
                limb(ex, ey, ang + r.normal(0, 0.6) + (0.5 if kk else -0.5), L * 0.6, max(1, w * 0.62), depth_ - 1)
    limb(bx, by, -np.pi / 2 + r.normal(0, 0.1), ht * 0.5, 7, 3)


def draw_reeds(rgb, sway, mirror=False):
    rp = RAMPS["hum"]
    for (x, y, r0) in reeds:
        bx, by = to_screen(x, y, 0)
        n = 3 + int(r0 * 4)
        rr = np.random.default_rng(int(r0 * 1e6))
        for b in range(n):
            ht = rr.uniform(6, 16)
            gx_, gy_ = to_screen(CF[0], CF[1], 1.0)
            lean = np.sign(gx_ - bx) * 1.1 + rr.normal(0, 0.25) + sway * 0.25   # every reed bends toward it
            ox = rr.normal(0, 1.2)
            for k in range(int(ht)):
                f = k / ht
                X = bx + ox + lean * f * f * 3
                Y = by - k
                c = rp[np.clip(int((0.15 + f * 0.45) * 6), 0, 5)]
                if mirror:
                    Y = 2 * by + k
                    if 0 <= int(Y) < H and 0 <= int(X) < W and wat[int(Y), int(X)]:
                        plot(rgb, X, Y, c * 0.55)
                else:
                    plot(rgb, X, Y, c, x + y)
            if b % 3 == 0:                                     # a cattail head
                X = bx + ox + lean * 3 * 0.64
                for k in range(3):
                    if not mirror:
                        plot(rgb, X, by - ht * 0.8 + k, np.array(hexc("#2a1a10")) if k else np.array(hexc("#4a3020")), x + y)


def frame(t):
    rgb, v = shade_land()
    pulse = 0.75 + 0.25 * np.sin(t * 2.0) * np.sin(t * 0.7 + 1)
    gcol = np.array(hexc("#9fe0e8"))
    land = rgb.copy()
    # the water
    ripple = (vn(hx * 3 + t * 0.6, hy * 9) - 0.5) * 2.0 + np.sin((hx + hy) * 14 - t * 3) * 0.6
    sxq = np.clip((rsx + ripple * 1.2).astype(int), 0, W - 1)
    syq = np.clip(rsy.astype(int), 0, H - 1)
    refl = land[syq, sxq]
    sky_v = 0.1 + (vn(hx * 1.2, hy * 6 + t * 0.2) > 0.84) * 0.16 + (vn(hx * 1.6 + 5, hy * 10) > 0.94) * 0.22
    sky = RAMPS["water"][np.clip((sky_v * 6).astype(int), 0, 5)] * np.array([0.9, 1.0, 1.15])
    wcol = np.where(rhit[..., None], refl * 0.72 + np.array(hexc("#06100f")) * 0.28, sky)
    # the shallows: the sunk lips and chin seen through
    sg = see_god
    thr = np.clip(1 - under / 0.5, 0, 1)
    sunk = RAMPS["algae"][np.clip(((v * 0.8 + 0.2) * 6).astype(int), 0, 5)]
    wcol = np.where(sg[..., None], wcol * (1 - thr[..., None] * 0.6) + sunk * thr[..., None] * 0.6, wcol)
    # the eye's light broken on the water below it

    # duckweed lying in drifts, breaking the reflection
    scum = wat & (fbm(hx * 0.9 + 3, hy * 0.9) > 0.6) & (Hm[iy, ix] > -0.3)
    sv = 0.25 + (vn(hx * 6, hy * 6) - 0.5) * 0.25 + (fbm(hx * 0.9 + 3, hy * 0.9) - 0.6) * 1.2
    scol = RAMPS["scum"][np.clip((sv * 6).astype(int), 0, 5)]
    wcol = np.where(scum[..., None], scol, wcol)
    rgb = np.where(wat[..., None], wcol, rgb)
    # a dark lip where water meets stone or bank
    edge = wat & ((~np.roll(wat, -1, 0)) | (~np.roll(wat, 1, 1)))
    rgb[edge & ~scum] *= 0.55
    draw_head(rgb, t)
    # living layers: reflections first, then what stands
    sway = np.sin(t * 1.7) * 0.6 + 0.3
    for tr in trees:
        draw_tree(rgb, *tr, sway, mirror=True)
    draw_reeds(rgb, sway, mirror=True)
    for (x, y, r0) in pads:                                     # lily pads, a notch, a lit rim; a pale flower now and then
        cx, cy = to_screen(x, y, 0)
        rad = 2 + int(r0 * 2.5)
        for yy in range(-rad, rad + 1):
            for xx in range(-rad * 2, rad * 2 + 1):
                if (xx / 2) ** 2 + yy * yy <= rad * rad and not (xx > 0 and abs(yy) < 1):
                    c = RAMPS["scum"][3 if yy < 0 else 2]
                    if (xx / 2) ** 2 + yy * yy > (rad - 0.8) ** 2 and yy < 0:
                        c = RAMPS["scum"][4]
                    plot(rgb, cx + xx, cy + yy, c, x + y)
        if r0 > 0.82:
            plot(rgb, cx - 1, cy - 2, np.array(hexc("#d8d0c8")), x + y)
            plot(rgb, cx, cy - 2, np.array(hexc("#b8a8b8")), x + y)
    draw_reeds(rgb, sway)
    # mist lying on the water in solid layers, drifting
    n = fbm(hx * 0.4 + t * 0.05, hy * 0.4 - t * 0.02)
    low = np.clip(1.1 - hz * 1.3, 0, 1)
    lv = np.clip((n - 0.55) * 2.8, 0, 1) * low * hit + (bay - 0.5) * 0.08
    a = np.where(lv > 0.6, 0.2, np.where(lv > 0.35, 0.12, np.where(lv > 0.15, 0.05, 0.0)))[..., None]
    rgb = rgb * (1 - a) + np.array(hexc("#6a7890")) * a
    for tr in trees:
        draw_tree(rgb, *tr, sway)
    # soul-lights drifting over the water, a faint halo, their reflections
    for k in range(5):
        ph = k * 1.7
        wx_ = 8 + k * 2.2 + np.sin(t * 0.6 + ph) * 1.2
        wy_ = 12 + np.cos(t * 0.45 + ph * 1.3) * 2.5 - k * 0.6
        wz = 0.9 + np.sin(t * 1.3 + ph) * 0.25
        sx_, sy_ = to_screen(wx_, wy_, wz)
        _, gy_ = to_screen(wx_, wy_, 0)
        fl = 0.6 + 0.4 * np.sin(t * 5 + ph * 3)
        for yy in range(-3, 4):
            for xx in range(-3, 4):
                dd = abs(xx) + abs(yy)
                if dd <= 3:
                    al = (1.0 if dd == 0 else 0.5 if dd == 1 else 0.18) * fl
                    for (X, Y, m_) in ((sx_ + xx, sy_ + yy, 1.0), (sx_ + xx, 2 * gy_ - sy_ + yy, 0.45)):
                        X, Y = int(X), int(Y)
                        if 0 <= X < W and 0 <= Y < H and (m_ == 1.0 or wat[Y, X]):
                            rgb[Y, X] = rgb[Y, X] * (1 - al * m_) + np.array(hexc("#d8f4f6")) * al * m_
    return np.clip(rgb, 0, 1)


def main(out_png, out_webp=None):
    Image.fromarray((frame(0.4) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST).save(out_png)
    print("saved", out_png)
    if out_webp:
        ims = [Image.fromarray((frame(i / 12.0) * 255).astype(np.uint8)).resize((W * 3, H * 3), Image.NEAREST) for i in range(36)]
        ims[0].save(out_webp, save_all=True, append_images=ims[1:], duration=83, loop=0, quality=85)
        print("saved", out_webp)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "swamp_god.png", sys.argv[2] if len(sys.argv) > 2 else None)
