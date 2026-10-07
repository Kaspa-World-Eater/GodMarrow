"""Ground tiles for the ruins of the old road (the game's format: seamless 320x160, see tiles_wood.py).

CHURCH FLAGS (church_flags): the floor of a chapel of the old road, older than the Wood. Laid square to the walls, so
on the screen the joints run along the iso axes; the flag size (0.889 yd, 4.44 / 5) divides the tile's iso period
exactly, so the joints run true across every seam. Each flag its own stone, a little warmer or cooler; some laid
double; their middles worn pale and smooth where feet went for centuries; some cracked, some sunk and holding damp,
now and then one gone to bare earth; moss in every joint, and the leaves the wind brings drifted against the joints'
upwind sides. Form first (each flag's own tilt and wear as a height), then the tone groups, then each thing drawn in.

  python tools/art_study/tiles_ruin.py OUT_DIR
"""
import os
import sys
import numpy as np
from PIL import Image
from tiles_wood import TW, TH, XX, YY, BAY, _P, ramp, pnoise, LITTER, MOSS, EARTH, LIGHT, save, preview

STONE = ramp("#131218", "#211f28", "#312e37", "#443f46", "#5a5455", "#726a66", "#8d8379", "#a69a8b")
N_ = 5                                    # flags per iso period (4.444 yd / 5 = 0.889 yd)


def _h(a, b, s):
    return _P[(a * 73856093 ^ b * 19349663 ^ s * 83492791) % 4096]


def church_flags(seed=0):
    rr = np.random.default_rng(seed + 700)
    # world coordinates of each tile pixel (yards), in units of flags
    u = (XX / 36.0 + YY / 18.0) * (N_ / 4.444)
    v = (YY / 18.0 - XX / 36.0) * (N_ / 4.444)
    i, j = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - i, v - j
    # the period: (i, j) and (i+7, j-7), (i+7, j+7) are the same flag on the tile
    a_, b_ = (i + j) % (2 * N_), (i - j) % (2 * N_)
    # some flags laid double, along u: the joint between a pair is gone
    pair = _h(a_ // 2 * 2 + 1, b_ // 2 * 2, seed + 3) > 0.62
    first = (i % 2 == 0)
    fid_a, fid_b = np.where(pair & ~first, (a_ - 1) % (2 * N_), a_), np.where(pair & ~first, (b_ - 1) % (2 * N_), b_)
    ju = (fu < 0.085) & ~(pair & ~first)
    jv = fv < 0.085
    joint = ju | jv
    tone = (_h(fid_a, fid_b, seed) - 0.5) * 0.08                       # neighbours close in value: a floor, not a board
    warm = _h(fid_a, fid_b, seed + 9)
    sunk = _h(fid_a, fid_b, seed + 17) > 0.88
    gone = _h(fid_a, fid_b, seed + 23) > 0.965
    cracked = _h(fid_a, fid_b, seed + 29) > 0.8
    # form: each flag its own tilt, worn hollow in the middle, its edges rounded; the light reads it (upper left)
    tx, ty = (_h(fid_a, fid_b, seed + 31) - 0.5), (_h(fid_a, fid_b, seed + 37) - 0.5)
    mid = np.hypot(fu - 0.5, fv - 0.5)
    hgt = (fu - 0.5) * tx * 0.5 + (fv - 0.5) * ty * 0.5 - np.clip(0.45 - mid, 0, 1) * 0.25 - np.clip(np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv)) < 0.1, 0, 1) * 0.15
    hgt = hgt - sunk * 0.4
    form = (-tx * 0.6 - ty * 0.2) * 0.14                                # each flag's tilt turns it to or from the light
    worn = np.clip((pnoise(XX, YY, 3, 2, seed + 61) - 0.45) * 2.2, 0, 1) * 0.14   # broad trodden ways across many flags, not dots
    vv = 0.5 + tone + form + worn + (pnoise(XX, YY, 48, 24, seed + 41) - 0.5) * 0.05 + (BAY - 0.5) * 0.06
    vv = vv - sunk * 0.12
    img = STONE[np.clip((vv * len(STONE)).astype(int), 0, len(STONE) - 1)].copy()
    img = img * np.where((warm > 0.7)[..., None], np.array([1.025, 1.0, 0.965]), np.where((warm < 0.25)[..., None], np.array([0.97, 0.99, 1.03]), 1.0))
    # the sunk flags hold the damp: darker, colder, a wet sheen on their low side
    damp = sunk & ~joint
    img[damp] = img[damp] * np.array([0.8, 0.84, 0.92])
    # cracks: one line across a cracked flag, a dark seam with its lit lip
    ca = _h(fid_a, fid_b, seed + 43) * np.pi
    cline = (fu - 0.5) * np.cos(ca) + (fv - 0.5) * np.sin(ca) + np.sin((fu * 7 + fv * 5) * 2.2) * 0.04
    crack = cracked & (np.abs(cline) < 0.035) & ~joint
    img[crack] = STONE[1]
    lip = cracked & (cline > 0.035) & (cline < 0.07) & ~joint
    img[lip] = np.minimum(img[lip] * 1.12, 1)
    # the joints: earth and moss pooled in them, darker at the bottom, moss cushions catching the light
    jm = joint & ~gone
    jl = pnoise(XX, YY, 64, 32, seed + 47)
    img[jm] = np.where((jl[jm] > 0.32)[:, None], MOSS[np.clip((1 + jl[jm] * 3.6).astype(int), 0, len(MOSS) - 1)], EARTH[1])
    # a flag gone: bare earth, its edges the neighbours' broken sides
    g = gone & ~joint
    img[g] = EARTH[np.clip((2 + (pnoise(XX, YY, 80, 40, seed + 53)[g] - 0.5) * 3).astype(int), 0, len(EARTH) - 1)]
    # leaves the wind brought, drifted against the joints' upwind sides (from the upper left)
    for k in range(70):
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        if not (joint[(y + 1) % TH, (x + 1) % TW] or joint[(y + 2) % TH, (x + 2) % TW]):
            continue
        rp = LITTER[rr.integers(0, 3)]
        ang = rr.uniform(0, np.pi)
        for t in np.arange(-1.6, 1.7, 0.5):
            for w in (-0.5, 0, 0.5):
                px = int(x + t * np.cos(ang) - w * np.sin(ang)) % TW
                py = int(y + (t * np.sin(ang) + w * np.cos(ang)) * 0.5) % TH
                img[py, px] = rp[3 if w < 0 else 2]
    return np.clip(img, 0, 1), hgt


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for k in range(2):
        t, h = church_flags(seed=k * 31)
        save(t, os.path.join(out, "church_flags_%d.webp" % k))
        preview(t, os.path.join(out, "church_flags_%d_tiled.png" % k))
    print("ok")
