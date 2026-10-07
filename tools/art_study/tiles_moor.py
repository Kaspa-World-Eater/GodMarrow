"""Ground tiles for the Ashen Moor (the game's format: seamless 320x160, as tiles_wood.py).

THE LORE (docs/wiki/02-world-and-lore.md; 11-codex-voices.md, the surveyor): the Moor is the god's cheek, where it
struck first. "The ash is warm because the flesh beneath is still cooling"; "the ground draws in with the cold and lets
out with the warm, as a face does"; black glass forms where a Husk's blood ran into the ash; the ground scatter is
stones, ash, bone chips, black glass, straw.

ASH (ash_0): grey ash laid in long wind-drifts (strokes along the wind, the painted standard's dry brush), caked into
thin crusts where the dew sets it, cracked; in the hollows between drifts a faint warm under-colour where the flesh
below is cooling (the warmth, never a glow); scattered: bone chips, beads and splinters of black glass catching the
moon, cinders, a few blades of dead straw.
HIDE (hide_0): where the ash has blown thin the god's skin shows: grey-mauve hide, pores close and dark, coarse hairs
lying flat with the wind, creases, a dusting of ash in every hollow.

  python tools/art_study/tiles_moor.py OUT_DIR
"""
import os
import sys
import numpy as np
from tiles_wood import TW, TH, XX, YY, BAY, ramp, pnoise, pfbm, save, preview

ASH = ramp("#16141a", "#221f25", "#2f2b30", "#3e393b", "#4f4947", "#625a55", "#776d65", "#8b8077")
WARM = np.array([0.55, 0.28, 0.2])                     # the flesh's warmth under the ash
BONE = ramp("#4a4440", "#77706a", "#a39a8e", "#c2b8a8")
GLASS = ramp("#060508", "#0d0b10", "#1a1820")
HIDE = ramp("#140f13", "#21181d", "#2f2328", "#3e3035", "#4e3e42", "#5f4c4f")   # grey-mauve skin, dark under the moon
STRAW = ramp("#2e2618", "#4a3d24", "#6b5a34")


def ash_0(seed=0):
    rr = np.random.default_rng(seed + 800)
    # ---- 1. the form: long wind-drifts. The wind blows along the screen's long axis, a little down: the drifts are
    # stretched noise along it, steep on the lee side, with fine ripples on their backs
    # every wave whole periods across the tile, so it repeats without a seam: phase = 2pi (a x/TW + b y/TH)
    drift = pnoise(XX, YY, 2, 3, seed + 1) * 0.6 + pnoise(XX, YY, 4, 6, seed + 2) * 0.3 + pnoise(XX, YY, 8, 12, seed + 3) * 0.1
    phase = 2 * np.pi * (2 * XX / TW + 9 * YY / TH) + pnoise(XX, YY, 3, 2, seed + 4) * 5.0
    rip = (np.sin(phase) * 0.5 + 0.5) ** 3                           # sharp crests, long soft troughs
    rip = rip * np.clip((drift - 0.35) * 3, 0, 1)                    # ripples only on the drifts' backs
    hgt = drift * 3.0 + rip * 0.22
    gy = np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)
    gx = np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)
    lit = np.clip(-gx * 0.6 - gy * 0.9, -1, 1)                       # the moon from the upper left
    # tone groups: the drift's back, its lee, the hollow between
    v = 0.5 + lit * 0.9 + (drift - 0.5) * 0.35 + (BAY - 0.5) * 0.05
    v = 0.5 + (v - 0.5) * 0.7                                        # quieter: open ground stays quiet
    v = np.round(v * 5) / 5                                          # broad flat tones, as painted
    img = ASH[np.clip((v * len(ASH)).astype(int), 0, len(ASH) - 1)].copy()
    # ---- 2. the warmth in the hollows: a faint red-brown under-colour, never a glow
    hollow = np.clip((0.42 - drift) * 3.0, 0, 1) * (pnoise(XX, YY, 5, 3, seed + 5) > 0.45)
    img = img * (1 - hollow[..., None] * 0.18) + WARM * 0.25 * hollow[..., None] * 0.18 / 0.25 * 0.6
    # ---- 3. crust: where the dew caked it, thin plates with dark hairline cracks, lit on their upwind lip
    cr = pnoise(XX, YY, 10, 5, seed + 6) > 0.58
    from tiles_wood import pworley
    f1, f2, _ = pworley(XX, YY, 60, seed + 7)
    crack = cr & ((f2 - f1) < 0.5)
    img[crack] = img[crack] * 0.62
    lip = cr & ((f2 - f1) >= 0.5) & ((f2 - f1) < 1.1)
    img[lip] = np.minimum(img[lip] * 1.08, 1)
    # ---- 4. what lies in it
    def dab(x, y, pts, col):
        for (dx, dy, k) in pts:
            img[(y + dy) % TH, (x + dx) % TW] = col[k]
    for _ in range(12):                                              # bone chips: a lit top, a dark under-edge
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        L = int(rr.integers(1, 4))
        for i in range(L):
            img[y % TH, (x + i) % TW] = BONE[2 if i == 0 else 1]
        img[(y + 1) % TH, x % TW] = img[(y + 1) % TH, x % TW] * 0.6
    for _ in range(7):                                               # black glass: a bead, its glint, a dark pool round it
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        dab(x, y, [(0, 0, 0), (1, 0, 0), (0, 1, 1), (1, 1, 0)], GLASS)
        img[y % TH, x % TW] = np.array([0.55, 0.58, 0.66])            # the moon in it
    for _ in range(18):                                              # cinders
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        img[y % TH, x % TW] = img[y % TH, x % TW] * 0.5
    for _ in range(9):                                               # dead straw, lying with the wind
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        for i in range(int(rr.integers(3, 6))):
            img[(y + i // 3) % TH, (x + i) % TW] = STRAW[1 + (i % 2)]
    return np.clip(img, 0, 1), hgt


def hide_0(seed=0):
    """the god's skin where the ash has blown thin"""
    rr = np.random.default_rng(seed + 900)
    base = pnoise(XX, YY, 4, 2, seed + 1) * 0.6 + pnoise(XX, YY, 10, 5, seed + 2) * 0.4
    crease = np.abs(np.sin((XX * 0.12 + YY * 0.33) + pnoise(XX, YY, 3, 2, seed + 3) * 6)) < 0.06
    v = 0.48 + (base - 0.5) * 0.4 + (BAY - 0.5) * 0.05
    v = np.round(v * 6) / 6
    img = HIDE[np.clip((v * len(HIDE)).astype(int), 0, len(HIDE) - 1)].copy()
    img[crease] = img[crease] * 0.55
    lipc = np.roll(crease, -1, 0) & ~crease
    img[lipc] = np.minimum(img[lipc] * 1.15, 1)
    # pores: close, dark, each a one-pixel pit with a lit upper rim
    for _ in range(520):
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        img[y, x] = img[y, x] * 0.5
        img[(y - 1) % TH, x] = np.minimum(img[(y - 1) % TH, x] * 1.1, 1)
    # coarse hairs lying flat with the wind: dark strokes from a pore
    for _ in range(150):                                             # coarse hairs: long, in tufts, lying with the wind
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        for t in range(int(rr.integers(1, 4))):
            L = int(rr.integers(5, 10))
            for i in range(L):
                img[(y + t + i // 3) % TH, (x + i) % TW] = HIDE[0] if i < L - 2 else np.array([0.42, 0.38, 0.36])   # pale tips
    # ash dusted into every hollow
    dust = (base < 0.45) & (pnoise(XX, YY, 20, 10, seed + 4) > 0.5)
    img[dust] = img[dust] * 0.5 + ASH[5] * 0.5
    return np.clip(img, 0, 1), base


PUTRID = ramp("#120a0e", "#21111a", "#33182a", "#4a2333", "#5f3138", "#74443d", "#8a5a45")      # flesh going bad
NECRO = ramp("#0b0809", "#181012", "#26181a")                                                     # the dead black of it
SICK = ramp("#2a2a14", "#43401c", "#5f5a28", "#7c7634")                                           # the yellow-green of the going
MOULD = np.array([0.6, 0.64, 0.56])


def putrid_0(seed=0):
    """flesh gone putrid, spreading over the Moor like a disease of the skin: mottled bruise-purple and liver-red,
    sickly yellow-green where it is going, black where it has died; blisters lit on their tops, some burst; mould
    blooming in pale fuzzy rosettes; pale fungal threads branching through it"""
    rr = np.random.default_rng(seed + 1000)
    mot = pnoise(XX, YY, 12, 6, seed + 1) * 0.5 + pnoise(XX, YY, 26, 13, seed + 2) * 0.3 + pnoise(XX, YY, 50, 25, seed + 3) * 0.2
    v = 0.25 + mot * 0.6 + (BAY - 0.5) * 0.05
    v = np.round(v * 6) / 6
    img = PUTRID[np.clip((v * len(PUTRID)).astype(int), 0, len(PUTRID) - 1)].copy()
    going = (pnoise(XX, YY, 10, 5, seed + 4) + (BAY - 0.5) * 0.12) > 0.62
    img[going] = img[going] * 0.4 + SICK[np.clip((v[going] * len(SICK)).astype(int), 0, len(SICK) - 1)] * 0.6
    dead = (pnoise(XX, YY, 14, 7, seed + 5) + (BAY - 0.5) * 0.12) > 0.7
    img[dead] = NECRO[np.clip((v[dead] * 3).astype(int), 0, 2)]
    for _ in range(45):                                             # blisters
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        r = int(rr.integers(1, 4))
        burst = rr.random() < 0.3
        for dy in range(-r, r + 1):
            for dx in range(-r * 2, r * 2 + 1):
                q = (dx / (1.4 * r)) ** 2 + (dy / r) ** 2
                if q <= 1:
                    py, px = (y + dy) % TH, (x + dx) % TW
                    if burst and q < 0.4:
                        img[py, px] = NECRO[0]
                    else:
                        img[py, px] = np.minimum(img[py, px] * (1.25 if dy < 0 else 0.75), 1)
    for _ in range(30):                                             # mould rosettes
        x, y = int(rr.integers(0, TW)), int(rr.integers(0, TH))
        r = rr.uniform(2, 5)
        for dy in range(-4, 5):
            for dx in range(-7, 8):
                d = np.hypot(dx / 1.6, dy)
                if d < r / 2 and rr.random() < (0.85 - d / r):              # fuzz, densest at the heart
                    img[(y + dy) % TH, (x + dx) % TW] = img[(y + dy) % TH, (x + dx) % TW] * 0.4 + MOULD * 0.6
    for _ in range(16):                                             # fungal threads
        x, y, a = rr.uniform(0, TW), rr.uniform(0, TH), rr.uniform(0, 2 * np.pi)
        for i in range(int(rr.integers(20, 50))):
            a += rr.normal(0, 0.35)
            x, y = x + np.cos(a), y + np.sin(a) * 0.5
            img[int(y) % TH, int(x) % TW] = img[int(y) % TH, int(x) % TW] * 0.35 + np.array([0.7, 0.68, 0.6]) * 0.65
    return np.clip(img, 0, 1), mot


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    for name, fn in (("ash", ash_0), ("hide", hide_0), ("putrid", putrid_0)):
        t, _ = fn(0)
        save(t, os.path.join(out, "%s_0.webp" % name))
        preview(t, os.path.join(out, "%s_0_tiled.png" % name))
    print("ok")
