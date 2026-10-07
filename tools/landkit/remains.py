"""The dead of the Hollow Wood (landkit). THE LORE (the hunter, docs/wiki/12b-codex-interviews.md): "You can tell how
long a thing's been dead in the Wood by which way it's lying. Fresh, it lies any way it fell. A day on, it lies with
its head toward the ring. Three days, it's moved a hand toward it. I've marked them with sticks. Nobody drags them.
The ground takes them the way a sleeper pulls the blanket up."

So: a picker's remains at true size (about 1.8 yd long), lying on its back, head toward the ring: the skull, the
ribcage open, the spine, the pelvis, the long bones of arms and legs; the rags it died in (dark cloth over the trunk
and thighs); sunk a little into the litter as the ground takes it; moss on the oldest. At its head the hunter's
marker stick stands, a strip of cloth knotted to it. Age: 0 fresh-ish (cloth whole, no moss) .. 1 old (bones bare,
moss, half sunk).

  F, info = body(seed, age)      F.H heights, F.M materials (local: x along the body, head at -x)
  paint_body(img, m, v, n, lx, ly, lz, M, info, side)
"""
import numpy as np
from kit import Field, ramp, vn

BONE, RAG, STICK, CLOTH = 1, 2, 3, 4
R_BONE = ramp("#1a1715", "#2c2724", "#433d38", "#5c554d", "#78706a", "#958b80", "#b2a798", "#cbc1b0")
R_RAG = ramp("#0f0d10", "#1a1619", "#262023", "#332a2b", "#403534")
R_STICK = ramp("#1a1210", "#2e221b", "#463527", "#5e4a36")
R_STRIP = ramp("#2a1416", "#40201f", "#583029")                     # a strip of dyed cloth, faded to rust


def body(seed=1, age=0.5):
    rr = np.random.default_rng(seed)
    F = Field(1.3, res=0.015)
    X, Y = F.X, F.Y
    H = np.full(X.shape, -9.0)
    M = np.zeros(X.shape, int)
    sink = 0.02 + age * 0.05

    def blob(cx, cy, rx, ry, h, mat):
        nonlocal H, M
        e = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
        z = h * np.sqrt(np.clip(1 - e, 0, 1)) - sink
        m = (e < 1) & (z > H) & (z > 0.005)
        H = np.where(m, z, H)
        M = np.where(m, mat, M)

    def bone(ax, ay, bx, by, r, mat=BONE):
        n_ = int(max(np.hypot(bx - ax, by - ay) / 0.02, 2))
        for t in np.linspace(0, 1, n_):
            blob(ax + (bx - ax) * t, ay + (by - ay) * t, r * (1.15 if t < 0.08 or t > 0.92 else 1.0), r, r * 0.9, mat)
    # the skull at -x (toward the ring), the jaw dropped a little
    blob(-0.8, 0.0, 0.12, 0.1, 0.14, BONE)
    blob(-0.68, 0.0, 0.06, 0.07, 0.07, BONE)
    # the spine and the open ribcage
    bone(-0.62, 0, 0.05, 0, 0.025)
    for i in range(6):
        x = -0.55 + i * 0.07
        for sgn in (-1, 1):
            bone(x, 0, x + 0.04, sgn * (0.17 - abs(i - 2) * 0.01), 0.014)
    # the pelvis
    blob(0.1, 0.0, 0.08, 0.13, 0.07, BONE)
    # arms: thrown out a little, as it fell
    for sgn in (-1, 1):
        ex, ey = -0.35 + rr.uniform(-0.05, 0.1), sgn * rr.uniform(0.32, 0.45)
        bone(-0.5, sgn * 0.17, ex, ey, 0.022)
        bone(ex, ey, ex + rr.uniform(0.15, 0.3), ey + sgn * rr.uniform(-0.05, 0.12), 0.018)
    # legs
    for sgn in (-1, 1):
        kx, ky = 0.5, sgn * rr.uniform(0.08, 0.16)
        bone(0.12, sgn * 0.08, kx, ky, 0.028)
        bone(kx, ky, 0.92, ky + sgn * rr.uniform(0.0, 0.06), 0.022)
    # the rags it died in: over the trunk and thighs, thinner with age
    rag = (np.abs(X + 0.15) < 0.42) & (np.abs(Y) < 0.22 + vn(X * 6, 1) * 0.06) & (vn(X * 9 + seed, Y * 9) > age * 0.55)
    rz = 0.045 + (vn(X * 12, Y * 12) - 0.5) * 0.02 - sink
    H = np.where(rag & (rz > H), rz, H)
    M = np.where(rag & (rz >= H - 1e-6), RAG, M)
    # the hunter's marker stick at the head, a strip of cloth knotted to it
    sx, sy = -1.05, rr.uniform(-0.1, 0.1)
    st = np.hypot(X - sx, Y - sy) < 0.022
    H = np.where(st, 0.8 + rr.uniform(-0.1, 0.1), H)
    M = np.where(st, STICK, M)
    F.H, F.M = H, M
    return F, dict(seed=seed, age=age, stick=(sx, sy))


def layout(seed=1, age=0.5):
    """the body as drawn parts (local yards: x along it, head at -x; z up), for drawing at small sizes where a height
    field cannot hold a bone one pixel wide: [(kind, points, width)] and the rag's outline"""
    rr = np.random.default_rng(seed)
    parts = [("skull", [(-0.8, 0.0, 0.1)], 0.12), ("jaw", [(-0.68, 0.0, 0.05)], 0.06),
             ("spine", [(-0.62, 0, 0.04), (0.05, 0, 0.04)], 1)]
    for i in range(6):
        x = -0.55 + i * 0.07
        for sgn in (-1, 1):
            parts.append(("rib", [(x, 0, 0.06), (x + 0.04, sgn * (0.17 - abs(i - 2) * 0.01), 0.03)], 1))
    parts.append(("pelvis", [(0.1, 0.0, 0.05)], 0.11))
    for sgn in (-1, 1):
        ex, ey = -0.35 + rr.uniform(-0.05, 0.1), sgn * rr.uniform(0.32, 0.45)
        parts.append(("arm", [(-0.5, sgn * 0.17, 0.03), (ex, ey, 0.02), (ex + rr.uniform(0.15, 0.3), ey + sgn * rr.uniform(-0.05, 0.12), 0.02)], 1))
        kx, ky = 0.5, sgn * rr.uniform(0.08, 0.16)
        parts.append(("leg", [(0.12, sgn * 0.08, 0.03), (kx, ky, 0.03), (0.92, ky + sgn * rr.uniform(0.0, 0.06), 0.02)], 1))
    rag = [(-0.57, -0.24), (0.27, -0.26), (0.32, 0.0), (0.27, 0.25), (-0.57, 0.22)]
    stick = (-1.05, rr.uniform(-0.1, 0.1), 0.8 + rr.uniform(-0.1, 0.1))
    return dict(parts=parts, rag=rag if age < 0.85 else rag[:3] + [(-0.1, 0.1)], stick=stick, age=age)


def paint_body(img, m, v, n, lx, ly, lz, M, info, side):
    age = info["age"]
    bone = m & (M == BONE)
    bv = v * 0.9 + 0.08 + (vn(lx * 40, ly * 40) - 0.5) * 0.06 - age * 0.06
    img[bone] = R_BONE[np.clip((bv[bone] * len(R_BONE)).astype(int), 0, len(R_BONE) - 1)]
    stain = bone & (lz < 0.04)                                           # the earth's stain on what lies in it
    img[stain] = img[stain] * np.array([0.75, 0.7, 0.62])
    moss = bone & (vn(lx * 14 + 3, ly * 14) > 0.85 - age * 0.25)
    img[moss] = img[moss] * 0.4 + np.array([0.13, 0.2, 0.1]) * 0.6
    sock = bone & (np.hypot(lx + 0.83, ly - 0.035) < 0.03) | bone & (np.hypot(lx + 0.83, ly + 0.035) < 0.03)
    img[sock] = np.array([0.03, 0.025, 0.025])                           # the eye sockets, toward the ring
    rag = m & (M == RAG)
    img[rag] = R_RAG[np.clip(((v[rag] * 0.8 + (vn(lx[rag] * 20, ly[rag] * 20) - 0.5) * 0.1) * len(R_RAG)).astype(int), 0, len(R_RAG) - 1)]
    st = m & (M == STICK)
    img[st] = R_STICK[np.clip((v[st] * len(R_STICK)).astype(int), 0, len(R_STICK) - 1)]
    strip = st & (np.abs(lz - 0.62) < 0.05)
    img[strip] = R_STRIP[1]
    return img
