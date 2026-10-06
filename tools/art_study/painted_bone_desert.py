"""The Bleached Barrens of Ossa: ground tiles (Derek 2026-10-06: "build the desert tiles, bone desert from the lore").

From the lore (docs/wiki/02-world-and-lore.md, 11-codex-voices.md, mythology/03): Act II is the god's bones laid
bare in the far lands, "the long white ridges are its bones"; the Bleached Dunes, white and fine as skin, one "whiter
than the rest, smooth as a brow"; the Chalk Flats and their chalk storms; the Valley of Standing Ribs; bone dust is
sacred, given to the wind; godmarrow, belief settled in long-feared bone, drawn up the Order's wells; the sky over the
Ossa paler than anywhere on the Hide.

Six grounds, each its own designed thing, made as a height field and lit by a pale sun (docs/PAINTED_STANDARD.md):
  1 bleached dune: bone-dust in wind ripples, steep on the lee, gentle on the stoss; cream crests, lavender troughs;
  2 chalk flat: a crust cracked into plates whose edges curl up and catch the light; dark cracks, powder between;
  3 bone bedrock: the god's bone as ground: smooth cortical plates with fine growth-lines, worn through in places to
    the spongy cancellous bone, stained in its pores;
  4 bone scree: splinters and shards of bone half-buried in sand, each with its shadow;
  5 marrow seep: dark amber godmarrow welling out of cracks in the bone, glossy, the sand round it darkened;
  6 sand over bone: the meeting edge, sand drifting onto a plate and pooling in its pores.
All are generated from world coordinates, so they tile without seams.

  python tools/art_study/painted_bone_desert.py OUT.png
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial import cKDTree

RNG = np.random.default_rng(9)
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


# hue-shifted: shadows lean lavender-grey (the pale sky), lights lean warm cream (the sun)
RAMPS = {
    "dune":   ramp("#3e3644", "#5e5462", "#82787e", "#a69c98", "#c6bcae", "#dfd6c4", "#f1ead8", "#fbf7ec"),
    "chalk":  ramp("#3a3a48", "#5a5866", "#7e7c86", "#a4a0a2", "#c8c4bc", "#e2ded4", "#f4f1e8"),
    "bone":   ramp("#352b24", "#574837", "#7c6a52", "#a08b6c", "#c0ab88", "#dac8a6", "#ede1c4", "#f9f2de"),
    "pore":   ramp("#1c120c", "#33221a", "#4e3626", "#6c4e36"),
    "marrow": ramp("#0e0603", "#241004", "#3e1e08", "#5e3010", "#86481a", "#b06a28", "#d89a4a"),
    "wet":    ramp("#2a2226", "#40353a", "#5a4c4c", "#766462"),
}
DUNE, CHALK, BONE, SCREE, SEEP, DRIFT = range(6)
NAMES = ["bleached dune", "chalk flat", "bone bedrock", "bone scree", "marrow seep", "sand over bone"]

# ------------------------------------------------------------------ the world: six patches of ground, 4 x 4 tiles each
T = 4.0                                  # tiles per patch side
GAP = 1.4
R = 28                                   # height cells per tile
NX, NY = 3, 2
WT, HT = NX * (T + GAP), NY * (T + GAP)
G_X, G_Y = int(WT * R), int(HT * R)
gy, gx = np.mgrid[0:G_Y, 0:G_X]
WX, WY = (gx + 0.5) / R, (gy + 0.5) / R
Hm = np.full((G_Y, G_X), -9.0)
Mat = np.full((G_Y, G_X), -1)
cellid = np.zeros((G_Y, G_X))           # per-material feature ids (plates, shards) for tone


def patch_mask(i):
    px, py = (i % NX) * (T + GAP), (i // NX) * (T + GAP)
    return (WX >= px) & (WX < px + T) & (WY >= py) & (WY < py + T)


def ripples(x, y, scale=1.0):
    """wind ripples: a sawtooth, steep on the lee (downwind), gentle on the stoss; their lines wander"""
    u = (x * 0.9 + y * 0.45) * 1.25 * scale + fbm(x * 0.35, y * 0.35) * 1.6
    r = u % 1.0
    saw = np.where(r < 0.72, r / 0.72, (1 - r) / 0.28)
    return saw


def plates(x, y, size, seed):
    pts = []
    rg = np.random.default_rng(seed)
    for i in np.arange(-1, WT + 1, size):
        for j in np.arange(-1, HT + 1, size * 0.9):
            pts.append((i + rg.random() * size * 0.85, j + rg.random() * size * 0.85))
    pts = np.array(pts)
    dd, ii = cKDTree(pts).query(np.stack([x.ravel(), y.ravel()], 1), k=2)
    return (dd[:, 1] - dd[:, 0]).reshape(x.shape), ii[:, 0].reshape(x.shape)


# 1 dune: a long swell with its ripples, a few dark grains in drifts
m = patch_mask(DUNE)
swell = np.sin((WX * 0.5 - WY * 0.3) * 1.3) * 0.12
Hm[m] = (swell + ripples(WX, WY) * 0.06)[m]
Mat[m] = DUNE
# 2 chalk flat: plates, their edges curled up, the cracks between deep
m = patch_mask(CHALK)
gap_c, id_c = plates(WX, WY, 1.05, 3)
curl = 0.05 * np.exp(-gap_c / 0.06)
Hm[m] = np.where(gap_c < 0.085, -0.04, 0.02 + curl)[m]
GAPC = np.where(m, gap_c, 9.0)
Mat[m] = CHALK
cellid[m] = id_c[m]
# 3 bone bedrock: cortical plates (smooth, growth-lines), worn through to cancellous bone in patches
m = patch_mask(BONE)
gap_b, id_b = plates(WX, WY, 1.4, 7)
worn = fbm(WX * 0.9 + 3, WY * 0.9) > 0.58
pore_g, pore_i = plates(WX, WY, 0.17, 11)
pores = worn & (pore_g > 0.055)                                       # the cancellous bone: struts, and holes between
Hb = 0.06 + (fbm(WX * 0.7, WY * 0.7) - 0.5) * 0.05
Hb = np.where(gap_b < 0.05, Hb - 0.05, Hb)                              # the seams between plates
Hb = np.where(worn, Hb - 0.035 - np.where(pores, 0.03, 0.0), Hb)
Hm[m] = Hb[m]
Mat[m] = BONE
cellid[m] = id_b[m]
# 4 scree: sand with shards of bone half-buried
m = patch_mask(SCREE)
Hm[m] = (ripples(WX, WY, 0.8) * 0.04)[m]
Mat[m] = DUNE
shards = np.zeros((G_Y, G_X), bool)
px0, py0 = (SCREE % NX) * (T + GAP), (SCREE // NX) * (T + GAP)
rg = np.random.default_rng(21)
for k in range(18):
    cx, cy = px0 + rg.uniform(0.2, T - 0.2), py0 + rg.uniform(0.2, T - 0.2)
    ang = rg.uniform(0, np.pi)
    ln, wd = rg.uniform(0.3, 0.75), rg.uniform(0.08, 0.15)
    u = (WX - cx) * np.cos(ang) + (WY - cy) * np.sin(ang)
    v = -(WX - cx) * np.sin(ang) + (WY - cy) * np.cos(ang)
    taper = np.clip(1 - np.abs(u) / ln, 0, 1) ** 0.6                   # a splinter: thick in the middle, pointed
    sh = (np.abs(v) < wd * taper) & (np.abs(u) < ln)
    hh = 0.08 + taper * 0.1 * rg.uniform(0.6, 1.2) - np.abs(v) / wd * 0.05
    upd = sh & (hh > Hm)
    Hm = np.where(upd, hh, Hm)
    shards |= sh
    cellid[sh] = k
Mat[shards] = SCREE
# 5 marrow seep: bone with its cracks, the marrow welling from them into a dark pool, the sand round it wet
m = patch_mask(SEEP)
gap_s, id_s = plates(WX, WY, 1.1, 13)
Hs = 0.06 + (fbm(WX * 0.7 + 5, WY * 0.7) - 0.5) * 0.05
Hs = np.where(gap_s < 0.05, Hs - 0.06, Hs)
pc = ((SEEP % NX) * (T + GAP) + T * 0.55, (SEEP // NX) * (T + GAP) + T * 0.55)
pool_d = np.hypot(WX - pc[0], (WY - pc[1]) * 1.2) + (fbm(WX * 1.5, WY * 1.5) - 0.5) * 0.7
pool = pool_d < 0.9
Hs = np.where(pool, 0.02, Hs)
Hm[m] = Hs[m]
Mat[m] = BONE
Mat[m & pool] = SEEP
cellid[m] = id_s[m]
seep_crack = m & (gap_s < 0.05) & (pool_d < 2.0)
wet = m & ~pool & (pool_d < 1.25)
# 6 sand drifting over bone: a bone plate, sand blown onto it from one side, pooling in its pores
m = patch_mask(DRIFT)
gap_d, id_d = plates(WX, WY, 1.3, 17)
pdg, pdi = plates(WX, WY, 0.17, 19)
drift_px = (DRIFT % NX) * (T + GAP)
cover = (WX - drift_px) / T + (fbm(WX * 1.4, WY * 1.4) - 0.5) * 0.6          # sand thicker toward the far side
Hbone = 0.06 + (fbm(WX * 0.7 + 9, WY * 0.7) - 0.5) * 0.05 - np.where(pdg > 0.05, 0.03, 0) * (fbm(WX * 0.9, WY) > 0.45)
Hsand = 0.03 + cover * 0.08 + ripples(WX, WY, 0.9) * 0.03
Hd = np.maximum(Hbone, Hsand)
Hm[m] = Hd[m]
Mat[m] = np.where((Hsand >= Hbone), DUNE, BONE)[m]
cellid[m] = id_d[m]

# ------------------------------------------------------------------ the camera: the game's iso view
KZ = 8.0
W, H = int((WT + HT) * 8) + 16, int((WT + HT) * 4) + 24
CX0, CY0 = HT * 8 + 8, 12
SY, SX = np.mgrid[0:H, 0:W].astype(float)
sxr, syr = SX + 0.5 - CX0, SY + 0.5 - CY0
DZ = 1.0 / 48


def look(arr, x, y, outside):
    ix_ = np.clip((x * R).astype(int), 0, G_X - 1)
    iy_ = np.clip((y * R).astype(int), 0, G_Y - 1)
    return np.where((x < 0) | (y < 0) | (x >= WT) | (y >= HT), outside, arr[iy_, ix_])


hit = np.zeros((H, W), bool)
hz, hx, hy = np.zeros((H, W)), np.zeros((H, W)), np.zeros((H, W))
for z in np.arange(0.3, -0.1, -DZ):
    s = (syr + z * KZ) / 4.0
    x = (s + sxr / 8.0) / 2.0
    y = (s - sxr / 8.0) / 2.0
    hh_ = look(Hm, x, y, -9.0)
    new = (~hit) & (hh_ >= z)
    hit |= new
    hz[new], hx[new], hy[new] = z, x[new], y[new]
# ground this flat needs no ray-cast: each pixel is projected straight to the ground plane (the cast jittered it
# in its height steps, and the light flickered); only the shards keep the cast's lift
plane_x = (syr / 4.0 + sxr / 8.0) / 2.0
plane_y = (syr / 4.0 - sxr / 8.0) / 2.0
lifted = hit & (look(Mat.astype(float), hx, hy, -1) == SCREE)
hx = np.where(lifted, hx, plane_x)
hy = np.where(lifted, hy, plane_y)
hit = (hx >= 0) & (hy >= 0) & (hx < WT) & (hy < HT)
ix = np.clip((hx * R).astype(int), 0, G_X - 1)
iy = np.clip((hy * R).astype(int), 0, G_Y - 1)
hz = Hm[iy, ix]
mat = Mat[iy, ix]
cid = cellid[iy, ix]
hit &= mat >= 0
from scipy import ndimage as _nd
Hsm = _nd.gaussian_filter(np.where(Hm < -5, 0, Hm), 1.2)
GYh, GXh = np.gradient(Hsm, 1.0 / R)
K = 1.6                                                                # relief exaggerated for light, as a painter does
nrm = np.dstack([-GXh[iy, ix] * K, -GYh[iy, ix] * K, np.ones((H, W))])
nrm /= np.linalg.norm(nrm, axis=2, keepdims=True)
SUN = np.array([-0.58, 0.42, 0.7])                                     # a pale sun from the screen's upper left
SUN /= np.linalg.norm(SUN)
ndl = np.clip((nrm * SUN).sum(2), 0, 1)
sh = np.zeros((H, W), bool)
for k in range(1, 40):
    tt = k * 0.012
    sh |= look(Hm, hx + SUN[0] * tt, hy + SUN[1] * tt, -9) > hz + SUN[2] * tt * 0.4 + 0.004
ndl = np.where(sh, ndl * 0.25, ndl)
ao = np.zeros((H, W))
for rad in (0.03, 0.08):
    for a in np.linspace(0, 2 * np.pi, 8, endpoint=False):
        ao += np.clip((look(Hm, hx + np.cos(a) * rad, hy + np.sin(a) * rad, -9) - hz) / (rad * 1.5), 0, 1)
ao = np.clip(ao / 16 * 1.6, 0, 1)
bay = B4[SY.astype(int) % 4, SX.astype(int) % 4]


def shade():
    I = 0.3 + ndl * 0.62 - ao * 0.34
    tooth = (vn(hx * 2.5, hy * 2.5) - 0.5) * 0.04
    v = I + tooth + (bay - 0.5) * 0.03
    rgb = np.zeros((H, W, 3)) + np.array(hexc("#d8d2c8"))             # the pale ground of the sheet
    def put(mask, rn, vv):
        rp = RAMPS[rn]
        rgb[mask] = rp[np.clip((vv[mask] * len(rp)).astype(int), 0, len(rp) - 1)]
    # dune sand: broad tones; a few dark grains gathered in the ripple troughs
    dm = hit & (mat == DUNE)
    put(dm, "dune", v + 0.06)
    # chalk: each plate its own white, the cracks dark and pooled, powder lying in the cracks' mouths
    cm = hit & (mat == CHALK)
    vc = v + (_P[cid.astype(int) % 1024, 5] - 0.5) * 0.08 + 0.05
    put(cm, "chalk", vc)
    gc_ = GAPC[iy, ix]
    lip = cm & (gc_ >= 0.085) & (gc_ < 0.16)
    rgb[lip] = RAMPS["chalk"][np.clip((vc[lip] * 7).astype(int) + 1, 0, 6)]   # the curled edge catching the sun
    crack = cm & (gc_ < 0.085)
    rgb[crack] = RAMPS["chalk"][0]
    rgb[crack & (gc_ > 0.05) & (bay < 0.5)] = RAMPS["chalk"][1]
    # bone: cortical plates with fine growth-lines; worn patches cancellous, stained in the pores
    bm = hit & (mat == BONE)
    growth = (np.sin((hx * 0.7 + hy * 1.1) * 9 + fbm(hx * 1.2, hy * 1.2) * 5) > 0.86) & bm
    vb = v + (_P[cid.astype(int) % 1024, 7] - 0.5) * 0.06 - growth * 0.06
    put(bm, "bone", vb)
    porem = bm & (hz < 0.0)
    pv = np.clip(v * 0.6, 0, 0.99)
    rgb[porem] = RAMPS["pore"][np.clip((pv[porem] * 4).astype(int), 0, 3)]
    seam = bm & (Hm[iy, ix] < 0.0) & ~porem
    rgb[seam] = RAMPS["bone"][1]
    # scree: the shards, bone, their tips brighter, their undersides dark against the sand
    sm = hit & (mat == SCREE)
    put(sm, "bone", v + 0.05 + (_P[cid.astype(int) % 1024, 9] - 0.5) * 0.1)
    # the seep: dark amber marrow, its surface glossy in dragged strokes; the sand and bone round it wet and dark
    mm = hit & (mat == SEEP)
    gloss = vn(hx * 1.6, hy * 6) > 0.68
    vm = 0.25 + (fbm(hx * 1.2, hy * 1.2) - 0.5) * 0.2 + gloss * 0.45 + ndl * 0.1
    put(mm, "marrow", vm)
    wm = hit & wet[iy, ix] & (mat == BONE)
    rgb[wm] = rgb[wm] * 0.6 + RAMPS["marrow"][3] * 0.4
    sc = hit & seep_crack[iy, ix]
    rgb[sc] = RAMPS["marrow"][4]                                        # marrow welling along the cracks
    # light temperature: warm in the sun, cool lavender in the shade
    warm = np.round(np.clip(ndl, 0, 1) * 3) / 3
    rgb = np.where(hit[..., None], rgb * (np.array([0.94, 0.96, 1.04]) + warm[..., None] * np.array([0.08, 0.03, -0.06])), rgb)
    return np.clip(rgb, 0, 1)


def main(out):
    rgb = shade()
    im = Image.fromarray((rgb * 255).astype(np.uint8)).resize((W * 4, H * 4), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for i, nm in enumerate(NAMES):
        px, py = (i % NX) * (T + GAP), (i // NX) * (T + GAP)
        sx, sy = (px - py) * 8 + CX0, (px + py + 2 * T) * 4 + CY0
        d.text((sx * 4 - len(nm) * 3, sy * 4 + 6), nm, fill=(70, 60, 60))
    im.save(out)
    print("saved", out, im.size)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "bone_desert.png")
