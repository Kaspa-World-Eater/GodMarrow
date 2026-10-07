"""The old wood's floor life as reusable scatter sprites (landkit; zone.gd's scatter layer takes still pieces and
swaying ones with three frames). No collision: a body walks through them; no cover.

FERN CLUMP: five to nine fronds arching out of a crown; each frond a stem curving up then down, with paired leaflets
  shortening toward the tip; the lit side warm green, the shade side blue-green; three sway frames (the tips move most).
BRACKEN DRIFT: taller, coarser fronds held flat like hands, more of them, half of them going rust in the dying wood.
MOSS CUSHION: a domed mound of moss, lumpy, its top lit, its foot dark where it meets the litter, a few spore stalks.
MUSHROOM CLUSTER: three to seven caps of different sizes on pale stems, gills dark beneath, the crowns lit; one kind
  pale and one kind rust-brown.

  python tools/landkit/flora.py OUT_DIR
"""
import os
import sys
import json
import numpy as np
from PIL import Image
from kit import ramp, hexc, KX, KY, KZ, MOON

FROND = ramp("#0e1610", "#16241a", "#22341f", "#304625", "#42582b", "#576c33", "#6e7f3c")
RUSTF = ramp("#24130c", "#3a1f12", "#55301a", "#704322", "#8c5a2c")
MOSS = ramp("#0b120f", "#121d14", "#1a2a18", "#24381c", "#304621", "#3e5427", "#4e632d", "#5f7234")
CAP_P = ramp("#2a2220", "#5e5146", "#9a8a72", "#c8b998", "#e8dcc0")
CAP_R = ramp("#24130e", "#4a2818", "#704026", "#985a34", "#b87a4a")


def to_s(p, foot):
    return (p[0] - p[1]) * KX + foot[0], (p[0] + p[1]) * KY - p[2] * KZ + foot[1]


def line(img, x0, y0, x1, y1, col):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for k in range(n + 1):
        f = k / max(n, 1)
        i, j = int(round(y0 + (y1 - y0) * f)), int(round(x0 + (x1 - x0) * f))
        if 0 <= i < img.shape[0] and 0 <= j < img.shape[1]:
            img[i, j] = [*col, 1.0]


def fern(seed, frames=3, bracken=False):
    rr = np.random.default_rng(seed)
    W, H = (72, 48) if not bracken else (84, 60)
    foot = (W / 2, H - 6)
    nf = rr.integers(5, 10) if not bracken else rr.integers(8, 13)
    fronds = []
    for f in range(nf):
        ang = rr.uniform(0, 2 * np.pi)
        ln = rr.uniform(0.55, 0.9) if not bracken else rr.uniform(0.7, 1.1)
        hg = rr.uniform(0.3, 0.55) if not bracken else rr.uniform(0.5, 0.8)
        rust = bracken and rr.random() < 0.5
        fronds.append((ang, ln, hg, rust, rr.uniform(0.7, 1.3)))
    fronds.sort(key=lambda q: np.sin(q[0]) + np.cos(q[0]))                 # far fronds first
    out = []
    for fr in range(frames):
        sway = (fr - (frames - 1) / 2) * 0.12
        img = np.zeros((H, W, 4))
        # the crown's dark pool on the litter
        yy, xx = np.mgrid[0:H, 0:W]
        pool = ((xx - foot[0]) / 9.0) ** 2 + ((yy - foot[1] - 0.5) / 2.5) ** 2 < 1
        img[pool] = [0, 0, 0, 0.45]
        for (ang, ln, hg, rust, flex) in fronds:
            rp = RUSTF if rust else FROND
            dg = np.array([np.cos(ang), np.sin(ang), 0.0])
            sd = np.array([-dg[1], dg[0], 0.0])
            # the frond as a filled blade: its width swelling then tapering, its edge toothed by the leaflets,
            # a darker midrib, the side toward the moon lit
            pts = []
            for i in range(28):
                t = i / 27
                sw = sway * flex * t * t
                p = dg * ln * t + np.array([sw, -sw, hg * 4 * t * (1 - t) * (1.0 if t < 0.5 else 1.15) - 0.05 * t])
                pts.append((t, p))
            lit = (dg[0] * MOON[0] + dg[1] * MOON[1]) > -0.1
            for (t, p) in pts:
                if t < 0.08:
                    continue
                wmax = (0.15 if not bracken else 0.2) * np.sin(np.pi * min(t * 1.15, 1.0)) ** 0.6 * (1 - t * 0.5)
                tooth = 0.75 + 0.25 * (np.sin(t * 60) > 0)                        # the leaflets' notches
                for sg in (-1, 1):
                    for k in range(5):
                        q = p + sd * sg * wmax * tooth * k / 4 + np.array([0, 0, -0.03 * k / 4])
                        qs = to_s(q, foot)
                        i_, j_ = int(round(qs[1])), int(round(qs[0]))
                        if not (0 <= i_ < img.shape[0] and 0 <= j_ < img.shape[1]):
                            continue
                        side_lit = (sg < 0) == lit
                        tone = 2 + t * 2.2 + (1.2 if side_lit else -0.4) - (k == 0) * 1.0
                        img[i_, j_] = [*rp[int(np.clip(tone, 0, len(rp) - 1))], 1.0]
        out.append(img)
    return out


def moss_cushion(seed):
    rr = np.random.default_rng(seed)
    W, H = 40, 22
    rx, ry = rr.uniform(12, 17), rr.uniform(5, 7)
    hgt = rr.uniform(5, 8)
    img = np.zeros((H, W, 4))
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    cx, cy = W / 2, H - 4
    from kit import vn
    for j in range(H):
        for i in range(W):
            u, v = (i - cx) / rx, (j - (cy - hgt * 0.5)) / (ry + hgt * 0.5)
            lump = (vn(i * 0.5 + seed, j * 0.5) - 0.5) * 0.25
            if u * u + v * v < 1 + lump:
                up = np.clip(-v * 0.8 - u * 0.4 + 0.4, 0, 1)                    # lit on its upper left
                tone = int(np.clip(1 + up * 5 + (vn(i * 1.3, j * 1.3) - 0.5) * 1.5, 0, 7))
                img[j, i] = [*MOSS[tone], 1.0]
                if v > 0.7:
                    img[j, i, :3] *= 0.65                                       # its foot dark against the litter
    for k in range(rr.integers(3, 7)):                                          # a few spore stalks
        sx, sy = int(cx + rr.uniform(-rx * 0.5, rx * 0.5)), int(cy - hgt * 0.6 + rr.uniform(-2, 2))
        for q in range(3):
            if 0 <= sy - q < H:
                img[sy - q, sx] = [*MOSS[6], 1.0]
        if 0 <= sy - 3 < H:
            img[sy - 3, sx] = [0.55, 0.42, 0.28, 1.0]
    return [img]


def mushrooms(seed, pale=True):
    rr = np.random.default_rng(seed)
    W, H = 30, 20
    img = np.zeros((H, W, 4))
    cap = CAP_P if pale else CAP_R
    n = rr.integers(3, 8)
    spots = sorted([(rr.uniform(6, W - 6), rr.uniform(H - 7, H - 3), rr.choice([1, 1, 2, 2, 3])) for _ in range(n)], key=lambda q: q[1])
    for (x, y, size) in spots:
        ix, iy = int(x), int(y)
        stem = size + 1
        for j in range(stem):
            img[iy - j, ix] = [*CAP_P[1], 1.0]
        top = iy - stem
        for dx in range(-size, size + 1):
            img[top, ix + dx] = [*cap[0], 1.0]                                  # gills, dark beneath
            img[top - 1, ix + dx] = [*cap[2], 1.0]
        for dx in range(-size + 1, size):
            img[top - 2, ix + dx] = [*cap[3], 1.0]
        img[top - 2 if size > 1 else top - 1, ix - max(size - 1, 0)] = [*cap[4], 1.0]   # the lit crown
        img[iy + 1, ix + 1] = [0, 0, 0, 0.4]
    return [img]


def save(frames, name, out, sway, foot):
    os.makedirs(out, exist_ok=True)
    for k, f in enumerate(frames):
        Image.fromarray((np.clip(f, 0, 1) * 255).astype(np.uint8), "RGBA").save(os.path.join(out, "%s_%d.webp" % (name, k)), lossless=True)
    json.dump(dict(kind="flora/" + name.split("_")[0], frames=len(frames), sway=sway, foot=list(foot), posts=[], cover=0.0,
                   material="plant"), open(os.path.join(out, name + ".json"), "w"), indent=1)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "flora"
    for s in range(1, 4):
        save(fern(s), "fern_%d" % s, out, True, (36, 42))
        save(fern(s + 10, bracken=True), "bracken_%d" % s, out, True, (42, 54))
        save(moss_cushion(s), "moss_%d" % s, out, False, (20, 18))
        save(mushrooms(s, pale=(s % 2 == 1)), "mushroom_%d" % s, out, False, (15, 17))
    print("flora done")
