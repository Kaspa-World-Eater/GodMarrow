"""The Seer's Bowl chapel (web/triune_desktop/src/zp_title.js ttBuildBg + ttBuildShaft), rebuilt in Python to learn how
it was painted, line for line. Run: python chapel.py OUT.png [--diff art/ui/title_bowl.png]

How it is made (the lessons, docs/ART_METHOD.md):
 1. Every surface is a HEIGHT FIELD, sculpted from sums of soft bumps (B), not drawn outlines.
 2. Normals from the height gradient; several POINT LIGHTS with height (z), N.L^1.5, soft 1/(1+(d/r)^2) falloff;
    a dull red bounce from the blood; one COLD SHAFT from high left as the only blue.
 3. AMBIENT OCCLUSION: height minus its box blur darkens every hollow (sockets, mortar, cracks).
 4. Brightness is sqrt-mapped onto ONE SHORT RAMP (12 stone tones), with a 4x4 ORDERED DITHER at every soft edge,
    and rare single-pixel specks: pixel art, never a gradient.
 5. Hand-placed STORY details over the lit form: random-walk tears and cracks, chains, wax drips, runes, stains.
 6. A VIGNETTE and a dark contact shadow seat everything; the light pools where the eye should go.
"""
import math, sys
import numpy as np
from PIL import Image

W, H = 480, 270


def i32(v):
    v &= 0xFFFFFFFF
    return v - (1 << 32) if v & 0x80000000 else v


def imul(a, b):
    return i32((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF))


def hash_(x, y):
    h = i32(int(x) * 374761393 + int(y) * 668265263)
    h = imul(h ^ ((h & 0xFFFFFFFF) >> 13), 1274126177)
    return (((h ^ ((h & 0xFFFFFFFF) >> 16)) & 0xFFFFFFFF)) / 4294967295


def jround(x):
    return math.floor(x + 0.5)


def clamp(v, a, b):
    return a if v < a else b if v > b else v


def C(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


STONE = [C(c) for c in ['#030204', '#070609', '#0c0a0d', '#121014', '#1a1619', '#231d1d', '#2e2521', '#3c3027', '#4e3d2e', '#654e37', '#826443', '#a27f52']]
BRZ = [C(c) for c in ['#050303', '#0f0905', '#1b1008', '#2a190c', '#3d2512', '#553418', '#704622', '#945e2e', '#c08644', '#ecc47e']]
BLD = [C(c) for c in ['#070103', '#120205', '#1f0408', '#2e060c', '#420a10', '#5e1016', '#84181c', '#b83026', '#e8704e']]
WAX = [C(c) for c in ['#140f0b', '#2c2319', '#4a3d2c', '#6e5c42', '#948060', '#bca47a', '#dcc79a']]
IRON = [C(c) for c in ['#040405', '#0b0b0d', '#151518', '#222226', '#34333a', '#4e4b52']]
PAT = [C(c) for c in ['#0a1410', '#132219', '#1d3326', '#2a4735']]
GX, GY, HZ, FS = 340, 64, 139, 1.14
CHIN = GY + jround(54 * FS) - 1
BX, BY = GX, 198
ORX, ORY, IRX, IRY = 92, 42, 81, 36
SX, SY, SRX, SRY = GX, 202, 75, 32
B4 = [v / 16 - 0.47 for v in [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]]
RUNES = ['10001|01010|00100|01010|10001', '11111|00100|00100|00100|11111', '10101|10101|11111|00100|00100', '01110|10001|10101|10001|01110', '11100|10010|11100|10100|10010', '00100|01110|10101|00100|00100', '10000|11000|10100|10010|11111', '11011|01010|00100|01010|11011', '01010|11111|01010|11111|01010', '00111|01000|11111|00010|11100']
LIGHTS = [dict(x=236, y=140, z=34, i=1.7, r=90), dict(x=452, y=140, z=34, i=1.7, r=90), dict(x=GX, y=196, z=44, i=0.55, r=105, red=1),
          dict(x=248, y=238, z=18, i=0.5, r=55), dict(x=434, y=238, z=18, i=0.5, r=55)]
CANDLES = [[220, 167, 6, 3], [226, 161, 18, 4], [233, 164, 12, 4], [240, 159, 26, 5], [247, 166, 9, 3], [437, 168, 7, 3], [444, 159, 28, 5], [452, 164, 16, 4], [459, 161, 21, 4], [466, 167, 9, 3], [244, 254, 12, 4], [252, 258, 6, 3], [436, 254, 14, 4], [428, 259, 7, 3]]
NZ = np.array([hash_(i & 63, (i >> 6) + 777) for i in range(64 * 64)], dtype=np.float32).tolist()


def noise(x, y):
    xi, yi = math.floor(x), math.floor(y)
    fx, fy = x - xi, y - yi
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    i0, i1, j0, j1 = xi & 63, (xi + 1) & 63, (yi & 63) * 64, ((yi + 1) & 63) * 64
    a, b, c, d = NZ[j0 + i0], NZ[j0 + i1], NZ[j1 + i0], NZ[j1 + i1]
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy


def fbm(x, y):
    return noise(x, y) * 0.55 + noise(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + noise(x * 4.3 + 3, y * 4.3 + 41) * 0.15


def face(u, v):
    u /= FS; v /= FS
    hw = math.sqrt(max(0, 47 * 47 - ((v - 20) * 1.38) ** 2)) if v > 20 else 47 - max(0, -v - 28) * 0.55
    if hw < 1:
        return None
    e = 1 - (u / hw) ** 2 - ((v / 54) ** 2 if v < 0 else (v / 56) ** 2 * 0.5)
    if e <= 0:
        return None

    def B(cu, cv, rx, ry, a):
        d = ((u - cu) / rx) ** 2 + ((v - cv) / ry) ** 2
        return a * (1 - d) * (1 - d) if d < 1 else 0
    h = 22 * math.sqrt(e)
    h += B(-16, -13, 19, 5.5, 7) + B(16, -13, 19, 5.5, 7) + B(0, -13, 9, 5, 3)
    for s in (-1, 1):
        h += B(17 * s, -4, 12, 8, -13) + B(17 * s, -3, 8.5, 3.8, 6.5) + B(17 * s, 1.5, 9, 1.4, -2.5)
        h += B(28 * s, 8, 11, 7, 5) + B(22 * s, 26, 9, 10, -6) + B(13 * s, 36, 5, 8, -2.5) + B(40 * s, -2, 8, 14, -3)
        h += B(4 * s, 20, 2.6, 1.6, -5)
    if -11 < v < 21:
        w_ = 2.6 + (v + 11) * 0.14
        k = min(1, (v + 11) / 6)
        if abs(u) < w_:
            h += (1 - (u / w_) ** 2) * (5 + (v + 11) * 0.25) * k
    h += B(0, 17, 6, 4, 3.5) + B(0, 27, 3, 4, -1.5) + B(0, 50, 14, 7, 5) + B(0, 43.5, 10, 2.2, -2.5)
    if v < -18:
        h += 0.7 * math.sin(v * 0.95) * max(0, 1 - (u / 30) ** 2)
    mcv = 36 + (u / 11) ** 2 * 2.6
    md = (u / 11) ** 2 + ((v - mcv) / (3.4 - (u / 11) ** 2 * 1.6)) ** 2
    lip = (u / 16) ** 2 + ((v - 35) / 9) ** 2
    if lip < 1:
        h += 4.5 * (1 - lip)
    return (h, 1 if md < 1 else 0, e)


def veil(u, v):
    u /= FS; v /= FS
    au = abs(u)
    if v < 16:
        d = math.hypot(u / 60, (v - 16) / 84)
        if d >= 1:
            return 0
        q = 1 - d
    else:
        hw = 60 + (v - 16) * 0.35
        if au >= hw:
            return 0
        q = 1 - au / hw
    top = clamp((16 - v) / 40, 0, 1)
    ang = math.atan2(v - 16, u)
    fold = (1 - top) * math.sin(au * 0.42 + v * 0.04 + math.sin(v * 0.07) * 1.2) * 2.6 + top * math.sin(ang * 26) * 2
    return min(q * 3, 1) * (9 + 7 * q) + fold * min(1, q * 4)


def jmod(a, b):
    return math.fmod(a, b)


def halo(u, v):
    r = math.hypot(u, (v + 10) / 0.97)
    a = math.atan2(v + 10, u)
    R0 = 80
    broken = 0.15 < a < 0.8
    h = 0
    if abs(r - R0) < 5 and not (broken and abs(r - R0) > -1):
        h = 5 * (1 - ((r - R0) / 5) ** 2)
        bead = abs(jmod(jmod(a * 30 / math.pi, 1) + 1, 1) - 0.5)
        if abs(r - R0) < 2.2 and bead < 0.22:
            h += 1.6
    if not broken:
        for k in range(26):
            ta = -math.pi + k / 26 * math.pi * 2 + 0.06
            ln = 9 + hash_(k, 5) * 12
            da = math.atan2(math.sin(a - ta), math.cos(a - ta))
            t = (r - R0 - 4) / ln
            if t < 0 or t > 1 or (hash_(k, 9) < 0.18 and t > 0.45):
                continue
            half = 2.8 * (1 - t) + 0.3
            if abs(da * r) < half:
                h = max(h, 3.2 * (1 - t) + 0.8 - abs(da * r) / half)
    return h


def f32(v):
    return float(np.float32(v))


def build(rec=None):
    """rec: a dict to fill with the light layers (chapel_light.py) as the painting is made"""
    w, hgt = W, H
    phase = ['wall']
    if rec is not None:
        rec['k'] = np.zeros((hgt, w, 5)); rec['pre0'] = np.zeros((hgt, w)); rec['cold'] = np.zeros((hgt, w)); rec['mult'] = np.zeros((hgt, w))
        rec['add'] = np.zeros((hgt, w)); rec['rf'] = np.zeros((hgt, w)); rec['g'] = np.zeros((hgt, w)); rec['speck'] = np.zeros((hgt, w))
        rec['over'] = np.zeros((hgt, w, 4)); rec['crack'] = np.zeros((hgt, w)); rec['stain'] = np.zeros((hgt, w)); rec['shaft'] = np.zeros((hgt, w, 3))
    N = w * hgt
    Hm = [0.0] * N
    Cv = [0] * N
    Fm = [0] * N
    D = np.zeros((hgt, w, 4), dtype=np.float64)   # JS Uint8ClampedArray, stored with clampbyte()

    def cb(x):
        x = 0.0 if x != x else x
        return float(min(255, max(0, round(x))))   # round half to even, as the clamped array stores

    def put(i, j, col):
        if i < 0 or j < 0 or i >= w or j >= hgt:
            return
        D[j, i, 0] = cb(col[0]); D[j, i, 1] = cb(col[1]); D[j, i, 2] = cb(col[2]); D[j, i, 3] = 255
        if rec is not None and phase[0] == 'detail':
            rec['over'][j, i] = (D[j, i, 0], D[j, i, 1], D[j, i, 2], 255)

    def dith(i, j):
        return B4[(j & 3) * 4 + (i & 3)]
    courses = []
    y, r = 0, 0
    while y < HZ:
        h2 = 15 + math.floor(hash_(r, 3) * 7)
        cuts = []
        x = -math.floor(hash_(r, 31) * 40)
        while x < w + 60:
            cuts.append(x)
            x += 24 + math.floor(hash_(r, x + 500) * 34)
        courses.append(dict(y=y, h=h2, cuts=cuts))
        y += h2
        r += 1
    cr = 0
    for j in range(HZ):
        while cr + 1 < len(courses) and courses[cr + 1]["y"] <= j:
            cr += 1
        Cc = courses[cr]
        top = j - Cc["y"]
        ci = 0
        cuts = Cc["cuts"]
        for i in range(w):
            while ci + 1 < len(cuts) and cuts[ci + 1] <= i:
                ci += 1
            inb = i - cuts[ci]
            bw = (cuts[ci + 1] if ci + 1 < len(cuts) else float('nan')) - cuts[ci]
            edge = min(top, Cc["h"] - 1 - top, inb, bw - 1 - inb) if bw == bw else float('nan')
            hh = 1.6 + hash_(ci, cr + 90) * 1.2 + (fbm(i * 0.16, j * 0.16) - 0.5) * 2 - ((2 - edge) * 0.7 if edge < 2 else 0)
            if top == 0 or inb == 0:
                hh = -2.2
            elif edge < 3 and hash_(i >> 1, j >> 1) < 0.3:
                hh -= 1.4
            if j >= HZ - 12:
                t = j - (HZ - 12)
                hh = [2, 4, 5, 5, 4, 2, 1, 1, 2, 3, 3, 2][t] + (hash_(i >> 1, j) - 0.5) * 0.6
                if i % 23 == 0:
                    hh -= 1.2
            u, v = i - GX, j - GY
            abv = j < HZ - 12
            f = face(u, v) if abv else None
            vl = veil(u, v) if abv else 0
            o = j * w + i
            hem = -24 + (u / FS / 40) ** 2 * 7
            vs = v / FS
            gr = (fbm(i * 0.3, j * 0.3) - 0.5) * 1.6 + (hash_(i, j + 1) - 0.5) * 0.5
            if f and vs > hem + 2.5:
                Hm[o] = f32(f[0] + 2 + gr); Cv[o] = f[1]; Fm[o] = 1
            elif f and vs > hem - 1:
                Hm[o] = f32(f[0] + 5.5 - (vs - hem) * 0.4 + gr * 0.5); Fm[o] = 3
            elif vl > 0:
                Hm[o] = f32(vl + gr * 0.8); Fm[o] = 3
            else:
                hl = halo(u, v) if abv else 0
                Hm[o] = f32(hl + 0.8 + (hash_(i, j) - 0.5) * 0.5 if hl > 0 else hh)
                if hl > 0:
                    Fm[o] = 2

    def crack(sx, sy, n, dx, seed):
        px, py = sx, sy
        for k in range(n):
            o = jround(py) * w + jround(px)
            if 0 <= o < N:
                Hm[o] = f32(Hm[o] - 3)
            py += 1
            px += dx + (hash_(k, seed) - 0.5) * 1.6
            if hash_(k, seed + 1) < 0.05:
                qx, qy = px, py
                for q in range(10):
                    qx += (hash_(q, seed + k) - 0.3) * 1.5
                    qy += 0.8
                    o2 = jround(qy) * w + jround(qx)
                    if 0 <= o2 < N:
                        Hm[o2] = f32(Hm[o2] - 2.5)
    crack(GX + 9, GY - 52, 44, 0.25, 11); crack(GX + 20, GY - 8, 30, 0.05, 21); crack(GX - 30, GY - 40, 26, -0.2, 31); crack(GX - 8, GY + 40, 16, -0.15, 41)
    crack(GX + 54, 2, 40, 0.3, 51); crack(GX - 60, 8, 34, -0.3, 61); crack(270, 60, 60, -0.1, 71); crack(430, 30, 80, 0.12, 81); crack(120, 0, 120, 0.1, 91)
    Bl = [0.0] * N
    T2 = [0.0] * N
    R = 4
    for j in range(HZ):
        s = 0.0
        for i in range(-R, R + 1):
            s += Hm[j * w + clamp(i, 0, w - 1)]
        for i in range(w):
            T2[j * w + i] = f32(s / (2 * R + 1))
            s += Hm[j * w + clamp(i + R + 1, 0, w - 1)] - Hm[j * w + clamp(i - R, 0, w - 1)]
    for i in range(w):
        s = 0.0
        for j in range(-R, R + 1):
            s += T2[clamp(j, 0, HZ - 1) * w + i]
        for j in range(HZ):
            Bl[j * w + i] = f32(s / (2 * R + 1))
            s += T2[clamp(j + R + 1, 0, HZ - 1) * w + i] - T2[clamp(j - R, 0, HZ - 1) * w + i]

    def vign(i, j):
        e = min(i * 1.2, w - i, (hgt - j) * 1.8)
        k = 0.3 + 0.7 * e / 60 if e < 60 else 1
        k *= 0.3 + 0.7 * clamp((j + 10) / 130, 0, 1)
        return k

    def rgb(i, j, val, red):
        t = math.floor(math.sqrt(max(0, val)) * 12.5 + dith(i, j) * 1.1 + (1 if hash_(i, j + 5) > 0.985 else 0) - (1 if hash_(i + 3, j) > 0.97 else 0))
        col = STONE[clamp(t, 0, 11)]
        return (min(255, col[0] * (1 + red * 0.55)), col[1] * (1 - red * 0.3), col[2] * (1 - red * 0.25)) if red > 0 else col
    for j in range(HZ):
        for i in range(w):
            o = j * w + i
            if Cv[o]:
                phase[0] = 'detail'
                put(i, j, STONE[3] if not Cv[o - w] else ((22, 14, 30) if hash_(i, j) < 0.25 else STONE[0]))
                phase[0] = 'wall'
                continue
            hx = (Hm[o + 1] - Hm[o - 1]) * 0.8 if 0 < i < w - 1 else 0
            hy = (Hm[o + w] - Hm[o - w]) * 0.8 if 0 < j < HZ - 1 else 0
            nl = math.hypot(hx, hy, 1)
            nx, ny, nz = -hx / nl, -hy / nl, 1 / nl
            val = 0.008 + max(0, -nx * 0.55 - ny * 0.62 + nz * 0.4) ** 2 * 0.07
            red = 0
            sky = val
            for li, L in enumerate(LIGHTS):
                lx, ly, lz = L["x"] - i, L["y"] - j, L["z"] - Hm[o]
                d = math.hypot(lx, ly, lz)
                ndl = max(0, (nx * lx + ny * ly + nz * lz) / d)
                k = ndl ** 1.5 * L["i"] / (1 + (d / L["r"]) ** 2)
                val += k * 0.8
                if rec is not None:
                    rec['k'][j, i, li] = k
                if L.get("red"):
                    red += k * 1.6
            bd = abs((i - 312) - (j - 30) * 0.5) / 1.118
            beam = clamp(1 - bd / 30, 0, 1) ** 1.5 * clamp(1.2 - j / 140, 0, 1)
            cold = beam * max(0, -nx * 0.5 - ny * 0.75 + nz * 0.45) * 0.55
            val += cold
            cf = cold / (val + 0.0001)
            ao = clamp(1 + (Hm[o] - Bl[o]) * 0.2, 0.15, 1.25)
            mlt = ao * vign(i, j) * (1 if Fm[o] else 0.72 + 0.4 * noise(i * 0.45, j * 0.025 + 30))
            val *= mlt
            if j == HZ - 1 or j == HZ - 2:
                val *= 0.35
                mlt *= 0.35
            if rec is not None:
                rec['pre0'][j, i] = sky + cold; rec['cold'][j, i] = cold; rec['mult'][j, i] = mlt; rec['g'][j, i] = 0.8
                rec['rf'][j, i] = 1 if ny > 0 else 0.4
                rec['speck'][j, i] = (1 if hash_(i, j + 5) > 0.985 else 0) - (1 if hash_(i + 3, j) > 0.97 else 0)
            cc = rgb(i, j, val, min(0.8, red * (1 if ny > 0 else 0.4)))
            put(i, j, (cc[0] * (1 - 0.4 * cf), cc[1] * (1 - 0.12 * cf), min(255, cc[2] * (1 + 0.35 * cf))) if cf > 0.05 else cc)
    phase[0] = 'detail'
    F = FS
    ey = GY + jround(2 * F)

    def sign(x):
        return (x > 0) - (x < 0)

    def tear(sx, out, seed, ln, wet):
        px, py = sx, ey
        for k in range(ln):
            ix, iy = jround(px), jround(py)
            if not Fm[iy * w + ix]:
                break
            put(ix, iy, BLD[4 if k < 3 else (4 if hash_(k, seed) < 0.12 else 3)])
            if k < 4 or (k < 30 and hash_(k, seed + 5) < 0.25):
                put(ix + 1, iy, BLD[2])
            if wet and k % 7 == 3:
                put(ix - sign(out), iy, BLD[5])
            py += 1
            f = k / ln
            px += out * 0.06 + (hash_(k, seed) - 0.5) * 0.3
            if f > 0.7 and hash_(k, seed + 9) < (f - 0.7) * 3:
                break
    tear(GX - jround(17 * F), -1, 3, 66, 1); tear(GX + jround(17 * F), 1, 7, 64, 1)
    for j in range(CHIN - 9, CHIN + 1):
        for i in range(GX - 8, GX + 8):
            if Fm[j * w + i] and hash_(i, j) < 0.2 + (j - CHIN + 9) * 0.07:
                put(i, j, BLD[4 if j == CHIN else 2 + (1 if hash_(i + 1, j) < 0.2 else 0)])
    put(GX - 2, CHIN - 1, BLD[6]); put(GX + 3, CHIN - 4, BLD[5])

    def chain(cx, ln):
        for y in range(ln):
            lk = y // 4
            side = lk & 1
            lit = clamp(0.25 + 0.5 * (y / ln), 0, 1) * vign(cx, y)
            tn = jround(lit * 4)
            cy = y % 4
            if side:
                put(cx, y, IRON[clamp(tn + (1 if cy == 1 else 0), 0, 5)]); put(cx + 1, y, IRON[clamp(tn - 1, 0, 5)])
            elif cy == 0 or cy == 3:
                put(cx - 1, y, IRON[clamp(tn, 0, 5)]); put(cx, y, IRON[clamp(tn + 1, 0, 5)]); put(cx + 1, y, IRON[clamp(tn, 0, 5)]); put(cx + 2, y, IRON[1])
            else:
                put(cx - 1, y, IRON[clamp(tn + 1, 0, 5)]); put(cx + 2, y, IRON[clamp(tn - 1, 0, 5)]); put(cx, y, IRON[0]); put(cx + 1, y, IRON[0])
        a = 0.0
        while a < 6.28:
            px = jround(cx + 0.5 + math.cos(a) * 3.5)
            py = jround(ln + 3 + math.sin(a) * 3.5)
            put(px, py, IRON[2 if a > 3.14 else 4])
            a += 0.25
    chain(262, 58); chain(270, 36); chain(418, 46); chain(470, 72)
    phase[0] = 'floor'
    vpY = HZ - 300
    rows = [HZ, HZ + 8, HZ + 20, HZ + 37, HZ + 60, HZ + 92, 999]
    for j in range(HZ, hgt):
        r = 0
        while rows[r + 1] <= j:
            r += 1
        sc = (HZ - vpY) / (j - vpY)
        roff = hash_(r, 17) * 50
        for i in range(w):
            val = 0.02
            for li, L in enumerate(LIGHTS):
                dx = L["x"] - i
                dy = (L["y"] + 14 - j) * 2.1
                c_ = L["i"] * 0.5 / (1 + (dx * dx + dy * dy) / (L["r"] * L["r"] * 0.9))
                val += c_
                if rec is not None:
                    rec['k'][j, i, li] = c_
            v_base = val
            mf, af = 1.0, 0.0
            vx = GX + (i - GX) * sc + roff
            cell = math.floor(vx / 52)
            inx = jmod(jmod(vx, 52) + 52, 52)
            pm = 0.72 + (fbm(i * 0.12, j * 0.3) - 0.5) * 0.55 + (hash_(cell, r + 40) - 0.5) * 0.25
            val *= pm; mf *= pm
            if j == rows[r] and r > 0:
                val *= 0.2; mf *= 0.2
            elif j == rows[r] + 1 and r > 0:
                val *= 1.25; mf *= 1.25
            if inx < sc * 1.2:
                val *= 0.25; mf *= 0.25
            elif inx < sc * 2.4:
                val *= 1.2; mf *= 1.2
            if j == HZ:
                val = val * 1.5 + 0.06; mf *= 1.5; af = 0.06
            sh = math.hypot((i - BX) / (ORX + 12), (j - BY - 22) / (ORY + 10))
            if sh < 1:
                val *= 0.3 + 0.6 * sh * sh; mf *= 0.3 + 0.6 * sh * sh; af *= 0.3 + 0.6 * sh * sh
            vg_ = vign(i, j)
            val *= vg_; mf *= vg_; af *= vg_
            if rec is not None:
                rec['pre0'][j, i] = 0.02; rec['mult'][j, i] = mf; rec['add'][j, i] = af; rec['g'][j, i] = 1.0
                rec['speck'][j, i] = (1 if hash_(i, j + 5) > 0.985 else 0) - (1 if hash_(i + 3, j) > 0.97 else 0)
            put(i, j, rgb(i, j, val, 0))
    flat = D.reshape(-1)

    def scale_at(o, k):
        flat[o] = cb(flat[o] * k)
    for k in range(7):
        px = 200 + hash_(k, 3) * 270
        py = HZ + 3 + hash_(k, 4) * 110
        q = 0
        while q < 30 + hash_(k, 5) * 40:
            o = (jround(py) * w + jround(px)) * 4
            if 0 < o < flat.size:
                scale_at(o, 0.4); scale_at(o + 1, 0.4); scale_at(o + 2, 0.4)
                if rec is not None:
                    rec['crack'][o // 4 // w, (o // 4) % w] += 1
            px += 1
            py += (hash_(q, k + 7) - 0.5) * 1.3
            q += 1

    def stain(sx, sy, rx, ry, k2):
        for j in range(-ry, ry + 1):
            for i in range(-rx, rx + 1):
                if (i / rx) ** 2 + (j / ry) ** 2 < 0.6 + 0.4 * noise((sx + i) * 0.3, (sy + j) * 0.3 + k2):
                    o = ((sy + j) * w + sx + i) * 4
                    if 0 <= o < flat.size:
                        flat[o] = cb(flat[o] * 0.7 + 14); flat[o + 1] = cb(flat[o + 1] * 0.35); flat[o + 2] = cb(flat[o + 2] * 0.4)
                        if rec is not None:
                            rec['stain'][o // 4 // w, (o // 4) % w] += 1
    phase[0] = 'detail'
    stain(300, 160, 18, 5, 1); stain(410, 172, 10, 3, 2); stain(280, 262, 24, 6, 3); stain(398, 258, 14, 4, 4); stain(215, 190, 9, 3, 5)

    def inE(i, j, cx, cy, rx, ry):
        return ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1
    aL = math.atan2((LIGHTS[0]["y"] - BY) / ORY, (LIGHTS[0]["x"] - BX) / ORX)
    aR = math.atan2((LIGHTS[1]["y"] - BY) / ORY, (LIGHTS[1]["x"] - BX) / ORX)
    for j in range(BY, hgt):
        for i in range(BX - ORX, BX + ORX + 1):
            if inE(i, j, BX, BY + 50, 34, 9) and not inE(i, j, BX, BY + 14, ORX - 6, ORY - 2):
                u = (i - BX) / 34
                put(i, j, BRZ[clamp(math.floor(1.6 + abs(u) * 2 * (1 if abs(u) > 0.7 else 0.3) + dith(i, j)), 0, 4)])
                continue
            if not inE(i, j, BX, BY + 14, ORX - 6, ORY - 2) or inE(i, j, BX, BY, ORX, ORY):
                continue
            u = (i - BX) / (ORX - 6)
            v = (j - BY - 14) / (ORY - 2)
            L = 0.16 + max(0, abs(u) - 0.62) * 1.5 + (0.1 if v > 0.88 else 0) + dith(i, j) * 0.14 - max(0, v - 0.4) * 0.2
            if abs(abs(u) - 0.8) < 0.02:
                L += 0.25
            if abs(v + 0.1 - u * u * 0.05) < 0.06:
                L += 0.1
            pt = fbm(i * 0.2, j * 0.25)
            if pt > 0.7 and v > 0.1 and hash_(i, j) < 0.5:
                put(i, j, PAT[clamp(math.floor((pt - 0.7) * 12 + dith(i, j)), 0, 2)])
            else:
                put(i, j, BRZ[clamp(math.floor(L * 9), 0, 6)])
    for bx, ln, s in [[BX - 22, 16, 1], [BX + 9, 26, 2], [BX + 30, 11, 3], [BX - 50, 9, 4]]:
        px = bx
        for k in range(ln):
            py = BY + ORY - 3 + k + jround(abs(bx - BX) * -0.18 * 0)
            put(jround(px), py, BLD[5 if k == ln - 1 else 3])
            if k < ln - 2:
                put(jround(px) + 1, py, BLD[2])
            px += (hash_(k, s) - 0.5) * 0.4
        put(jround(px), BY + ORY - 3 + ln, BLD[6])
    for j in range(hgt):
        for i in range(BX - ORX, BX + ORX + 1):
            o = math.hypot((i - BX) / ORX, (j - BY) / ORY)
            n = math.hypot((i - BX) / IRX, (j - BY) / IRY)
            if o > 1 or n < 1:
                continue
            ang = math.atan2((j - BY) / ORY, (i - BX) / ORX)
            lit = max(math.cos(ang - aL), math.cos(ang - aR), 0) ** 4
            across = (1 - o) / (1 - IRX / ORX)
            L = 0.2 + lit * 0.5 + (0.18 if across < 0.12 else -0.14 if across > 0.88 else 0) + dith(i, j) * 0.12 + (fbm(i * 0.4, j * 0.4) - 0.5) * 0.18
            if lit > 0.9 and 0.3 < across < 0.55:
                L = 1.08
            if math.sin(ang) > 0.2 and across > 0.35 and fbm(i * 0.25 + 5, j * 0.3) > 0.7 and hash_(i, j) < 0.6:
                put(i, j, PAT[clamp(math.floor(1 + dith(i, j) * 2), 0, 3)])
            else:
                put(i, j, BRZ[clamp(math.floor(L * 9), 0, 9)])
    for k in range(22):
        a = k / 22 * math.pi * 2 + 0.1
        mr = (1 + IRX / ORX) / 2
        cx = BX + math.cos(a) * ORX * mr
        cy = BY + math.sin(a) * ORY * mr
        g = RUNES[k % len(RUNES)].split('|')
        front = math.sin(a) > 0
        sy = 1 if front else 0.8
        for r in range(5):
            for q in range(5):
                if g[r][q] == '1':
                    px = jround(cx - 2 + q)
                    py = jround(cy - 2 + r * sy)
                    put(px, py, BRZ[0])
                    if r + 1 >= 5 or g[r + 1][q] != '1':
                        put(px, py + 1, BRZ[4])
    for j in range(hgt):
        for i in range(BX - IRX, BX + IRX + 1):
            if not inE(i, j, BX, BY, IRX, IRY) or inE(i, j, SX, SY, SRX, SRY):
                continue
            u = (i - BX) / IRX
            L = 0.1 + abs(u) * 0.22 + dith(i, j) * 0.1
            if j > SY:
                L -= 0.1
            put(i, j, BRZ[clamp(math.floor(L * 8), 0, 3)])
    for cx, by, ch, cw in CANDLES:
        x0 = cx - (cw >> 1)
        for i in range(-cw - 2, cw + 3):
            for j in range(-2, 2):
                if (i / (cw + 2.5)) ** 2 + (j / 2.2) ** 2 < 1 and hash_(i + cx, j + by) < 0.9:
                    put(cx + i, by + j, WAX[2 if j < 0 else 1])
        for c2 in range(cw):
            top = ch - (1 if hash_(c2, cx) < 0.35 else 0) - (1 if (c2 == 0 or c2 == cw - 1) else 0)
            for r in range(top):
                t = 3 + (1 if c2 == 0 else -1 if c2 == cw - 1 else 0) + (1 if r > top - 4 else 0) - (1 if r < 3 else 0)
                if hash_(cx + c2, by - r) < 0.12:
                    t -= 1
                put(x0 + c2, by - r, WAX[clamp(t, 0, 6)])
        for dc, s in [[-1, 1], [cw, 2]]:
            if hash_(cx, s) < 0.7:
                l = 2 + math.floor(hash_(cx, s + 4) * ch * 0.6)
                for r in range(l):
                    put(x0 + dc, by - ch + 2 + r, WAX[5 if r == l - 1 else 4])
        put(cx, by - ch, WAX[5]); put(cx, by - ch - 1, (20, 12, 8))
    # the cold shaft, added ('lighter') over the whole painting
    for j in range(H):
        for i in range(W):
            bd = ((i - 312) - (j - 30) * 0.5) / 1.118
            a = clamp(1 - abs(bd) / 32, 0, 1) * clamp(1.15 - j / 170, 0, 1) * (0.55 + 0.45 * noise(bd * 0.18 + 40, 3))
            q = a * 3 + B4[(j & 3) * 4 + (i & 3)] * 0.9
            if q < 0.6:
                continue
            al = (60 if q > 1.8 else 38 if q > 1.1 else 20) / 255
            if rec is not None:
                rec['shaft'][j, i] = (70 * al, 84 * al, 110 * al)
            D[j, i, 0] = cb(D[j, i, 0] + 70 * al); D[j, i, 1] = cb(D[j, i, 1] + 84 * al); D[j, i, 2] = cb(D[j, i, 2] + 110 * al)
    return D.astype(np.uint8)


if __name__ == "__main__":
    out = sys.argv[1]
    img = build()
    Image.fromarray(img, "RGBA").save(out)
    if "--diff" in sys.argv:
        ref = np.array(Image.open(sys.argv[sys.argv.index("--diff") + 1]).convert("RGBA")).astype(int)
        me = img.astype(int)
        d = np.abs(ref[..., :3] - me[..., :3]).max(axis=2)
        print("pixels exact:", int((d == 0).sum()), "of", d.size, " within 2:", int((d <= 2).sum()), " max diff:", int(d.max()))
        ys, xs = np.nonzero(d > 2)
        if len(xs):
            print("worst region bbox:", xs.min(), ys.min(), xs.max(), ys.max())
        Image.fromarray(np.clip(d * 8, 0, 255).astype(np.uint8)).save(out.replace(".png", "_diff.png"))
