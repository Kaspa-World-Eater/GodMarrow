"""Paint the 3D road's data passes (blend_scene.py) into our pixel art: every pixel's material from its real surface
(its normal, its place in the world, how sheltered it is), lit by the overcast sky and the moon through the true form
and its true shadows, snapped to each material's short hue-shifted ramp with the ordered dither only where one tone
meets the next (PAINTED_STANDARD; chapter 09's recipes for a Thai temple rotting in a wet forest).

  python tools/landkit3d/paint3d.py PASSES_DIR OUT.png [HERO_X HERO_Y HERO_Z] [FOCUS_X FOCUS_Y]
"""
import os
import sys
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(HERE, "..", "landkit"))
from kit import ramp, vn, fbm, B4                     # noqa: E402

KX, KY, KZ = 18.0, 9.0, 21.0
KEY = np.array([-0.62, 0.22, 0.75]) / np.linalg.norm([-0.62, 0.22, 0.75])

# each material's ramp, dark to light, darks leaning violet-blue and lights warm (rule 9)
R = {
    "ground": ramp("#0d120f", "#151d16", "#1e2a1c", "#2a3a22", "#384a29", "#4a5d31", "#5e723b"),
    "soil": ramp("#120e10", "#1c1617", "#29201c", "#382b23", "#47372b", "#594634"),
    "stucco": ramp("#2a2c35", "#43454c", "#5e5f62", "#7b7a77", "#999690", "#b7b2a8", "#d2cbbd"),
    "brick": ramp("#24141a", "#3b1d1d", "#572821", "#743626", "#8f4a30", "#a9603d", "#c27a50"),
    "stone": ramp("#1d2027", "#2e3237", "#42464a", "#585b5c", "#6f716f", "#888984", "#a3a39b"),
    "lacquer": ramp("#08070c", "#110e14", "#1b161c", "#271f24", "#33292c"),
    "gold": ramp("#2a1c10", "#46301a", "#6a4a22", "#8f672e", "#b3883d", "#d1a955", "#e8c77a"),
    "tile_g": ramp("#0f1a17", "#18291f", "#223b28", "#2e4f31", "#3d633b", "#507846", "#6a8f55"),
    "tile_r": ramp("#1d1012", "#2f1714", "#472218", "#5f2f1c", "#783f24", "#90522f", "#a7693d"),
    "wood": ramp("#141215", "#211d1f", "#322b29", "#453a34", "#5a4b41", "#6f5d50", "#85715f"),
    "root": ramp("#3a2f33", "#584a49", "#786662", "#98857c", "#b5a495", "#cfc0ad", "#e4d8c4"),
    "iron": ramp("#0e0f13", "#1a1b20", "#27282c", "#36363a", "#47464a"),
    "bone": ramp("#2e2a28", "#4a443d", "#6a6155", "#8b7f6e", "#ab9e88", "#c7bba2", "#ddd3bb"),
    "moss": ramp("#0e1710", "#152515", "#1e351b", "#284722", "#355a2a", "#456e33", "#58833e"),
    "algae": ramp("#121a17", "#1b2a22", "#26392b", "#304634", "#3c553e"),
}
MAT = {1: "ground", 2: "stucco", 3: "brick", 4: "stone", 5: "lacquer", 6: "gold", 7: "tile", 8: "wood", 9: "root",
       10: "iron", 11: "bone", 12: "moss", 13: "cloth"}


def tone(rmp, t, dith):
    """t (0..1) to the ramp, with the 4x4 dither only at the step between two tones"""
    n = len(rmp)
    f = np.clip(t, 0, 0.999) * n
    i = np.floor(f).astype(int)
    frac = f - i
    i2 = np.where(frac > dith, i + 1, i)
    i2 = np.where((frac > 0.3) & (frac < 0.7), i2, np.round(f - 0.5 + 0.5).astype(int))
    return rmp[np.clip(i2, 0, n - 1)]


def paint(d):
    n, pos, mat, ao, moon, alpha = d["normal"], d["pos"], d["mat"], d["ao"], d["moon"], d["alpha"]
    gh, gw = mat.shape
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    up = n[..., 2]
    dith = B4[np.arange(gh)[:, None] % 4, np.arange(gw)[None, :] % 4]
    # the light: the overcast sky above everything (more on what faces up, less in what is sheltered), the moon thin
    # through the cloud with its true shadows, and the deep dark in the crevices (ambient occlusion from the form)
    mn = moon / max(float(moon.max()), 1e-6)
    # overcast (Derek: "almost always overcast"): the sky's light from above, the brighter side of the cloud toward the
    # upper left (rule 11) as a soft key with no hard edge, the moon's true shadow only a breath, the crevices deep
    soft = np.clip((n * KEY).sum(2), 0, 1)
    sky = 0.5 + 0.5 * up
    occ = ao ** 1.6
    v = (0.05 + sky * 0.3 * occ + soft * 0.28 * (0.45 + 0.55 * occ) + mn * 0.1) * 0.86   # a deep wood: dim even by day
    # what each surface is, by cause
    wall = np.abs(up) < 0.35                                    # standing faces
    along = np.where(np.abs(n[..., 0]) > np.abs(n[..., 1]), Y, X)   # a wall's own horizontal coordinate
    noise = fbm(X * 0.9 + Y * 0.3, Y * 0.9 + Z * 0.7)
    fine = vn(X * 7 + Z * 5, Y * 7 - Z * 5)
    img = np.zeros((gh, gw, 3))
    for k, name in MAT.items():
        m = mat == k
        if not m.any():
            continue
        t = v[m] + (fine[m] - 0.5) * 0.08
        if name == "stucco":
            # stucco fails by cause: the rising damp eats the wall's foot, the drip off the eaves its head, the corners
            # first; elsewhere it holds, in islands the size of a hand to a man (not camouflage: small, ragged, few)
            low = np.clip(1.0 - (Z[m] - 1.0) / 1.6, 0, 1)
            lose = fbm(along[m] * 2.6 + Z[m] * 0.4, Z[m] * 2.6 + 3.0) + low * 0.32
            lost = lose > 0.66
            col = np.where(lost[:, None], tone(R["brick"], t * 0.85, dith[m]), tone(R["stucco"], t, dith[m]))
            # the wet: algae only low on the shade side; thin black streaks down from the eaves and the sills
            shade = wall[m] & (mn[m] < 0.05) & (low > 0.4) & (vn(along[m] * 3.0, Z[m] * 3.0) > 0.5)
            col = np.where(shade[:, None], tone(R["algae"], t * 0.85, dith[m]), col)
            streak = wall[m] & (vn(along[m] * 13.0, Z[m] * 0.25) > 0.7) & ~lost
            col = np.where(streak[:, None], col * 0.7, col)
        elif name == "tile":
            # every tile its own: a course every quarter yard down the slope, a row every third of a yard across; each
            # tile a little lighter or darker, a few gone (the dark beneath), the rust tiles of an older repair in runs
            row = np.floor(X[m] / 0.32)
            course = np.floor(Z[m] / 0.22)
            h = np.sin(row * 12.9898 + course * 78.233) * 43758.5453
            h = h - np.floor(h)
            rust = vn(row * 0.45 + 3.0, course * 0.5) > 0.74              # an older repair, here and there, in patches
            base = np.where(rust[:, None], tone(R["tile_r"], t + (h - 0.5) * 0.12, dith[m]),
                            tone(R["tile_g"], t + (h - 0.5) * 0.12, dith[m]))
            gone = (h > 0.975) & (up[m] > 0.3)
            col = np.where(gone[:, None], tone(R["wood"], t * 0.5, dith[m]), base)
        elif name == "gold":
            # gold survives where nothing touched it (the recesses); on the exposed faces it has gone to the lacquer
            kept = (ao[m] < 0.78) | (noise[m] > 0.62)
            col = np.where(kept[:, None], tone(R["gold"], t * 1.05, dith[m]), tone(R["lacquer"], t, dith[m]))
        elif name == "ground":
            # the rainforest floor: a moss carpet in broad tones; the needle-litter of the spruce in drifts where the
            # moss thins; dark worn earth only where feet went (the way to the stair)
            drift = fbm(X[m] * 0.7 + 11, Y[m] * 0.7)
            needles = (drift < 0.45) & (vn(X[m] * 9, Y[m] * 9) > 0.35)
            worn = (np.abs(Y[m]) < 1.6) & (X[m] > 9.5) & (X[m] < 16)
            col = tone(R["ground"], t * (0.9 + 0.2 * drift), dith[m])
            col = np.where(needles[:, None], tone(R["soil"], t * 1.05, dith[m]), col)
            col = np.where(worn[:, None], tone(R["soil"], t * 0.8, dith[m]), col)
        elif name in R:
            col = tone(R[name], t, dith[m])
        else:
            col = tone(R["stone"], t, dith[m])
        # moss on whatever faces the sky and holds the wet: stone, stucco, brick, tile, wood
        if name in ("stucco", "brick", "stone", "tile", "wood"):
            # (a steep roof sheds its water and holds moss only in patches; flat tops hold it everywhere the wet stays)
            mossy = (up[m] > (0.6 if name == "tile" else 0.62)) & (fbm(X[m] * 1.3 + 7, Y[m] * 1.3 + Z[m]) > (0.6 if name == "tile" else 0.46))
            col = np.where(mossy[:, None], tone(R["moss"], t, dith[m]), col)
        img[m] = col
    # the form's own edges: where the surface turns, the lip toward the light catches it and the far lip goes dark
    # (rule 3, the lit lip; from the real normals, nothing painted on)
    nd_ = np.zeros((gh, gw))
    nd_[:-1, :] += np.linalg.norm(n[1:, :] - n[:-1, :], axis=2)
    nd_[:, :-1] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    edge = (nd_ > 0.5) & (mat != 1)
    lit = np.clip((n * KEY).sum(2), 0, 1)
    img = np.where((edge & (lit > 0.35))[..., None], np.clip(img * 1.22 + 0.02, 0, 1), img)
    img = np.where((edge & (lit < 0.1))[..., None], img * 0.78, img)
    # the paper's tooth, fixed to the world (rule 6): a breath of grain in every tone
    tooth = (vn(X * 31 + Z * 17, Y * 31 - Z * 17) - 0.5) * 0.06
    img = np.clip(img * (1 + tooth[..., None]), 0, 1)
    return img, alpha


def place_hero(big, d, hero, focus, gw, gh):
    """the game's own Ossuarch at true size (Iso.FIG 0.78), his feet on the given point, hidden behind what is nearer"""
    meta = json.load(open(os.path.join(ROOT, "art", "sprites", "ossuarch_hd.json")))
    sheet = Image.open(os.path.join(ROOT, "art", "sprites", "ossuarch_hd.png")).convert("RGBA")
    _, x, y, w, h, dx, dy = meta["idx"]["idle/front_l/0"]
    fr = sheet.crop((x, y, x + w, y + h))
    k = 0.78
    fr = fr.resize((max(1, int(w * k)), max(1, int(h * k))), Image.NEAREST)
    hx, hy, hz = hero
    sx = ((hx - hy) - (focus[0] - focus[1])) * KX + gw / 2
    sy = ((hx + hy) - (focus[0] + focus[1])) * KY - hz * KZ + gh / 2
    X0, Y0 = int(sx * 4 + dx * k), int(sy * 4 + dy * k)
    a = np.array(fr).astype(float) / 255
    pos = d["pos"]
    nearer = (pos[..., 0] + pos[..., 1]) > (hx + hy) + 0.25
    near4 = np.repeat(np.repeat(nearer & (d["alpha"] > 0.5), 4, 0), 4, 1)
    H, W = big.shape[:2]
    for j in range(a.shape[0]):
        yy = Y0 + j
        if not (0 <= yy < H):
            continue
        for i0 in range(a.shape[1]):
            xx = X0 + i0
            if 0 <= xx < W and a[j, i0, 3] > 0.5 and not near4[yy, xx]:
                big[yy, xx] = a[j, i0, :3]
    return big


if __name__ == "__main__":
    pdir, out = sys.argv[1], sys.argv[2]
    d = dict(np.load(os.path.join(pdir, "passes.npz")))
    img, alpha = paint(d)
    gh, gw = img.shape[:2]
    big = np.repeat(np.repeat(img, 4, 0), 4, 1)
    if len(sys.argv) > 5:
        hero = tuple(float(v) for v in sys.argv[3:6])
        focus = tuple(float(v) for v in sys.argv[6:8]) if len(sys.argv) > 7 else (0.0, 0.0)
        big = place_hero(big, d, hero, focus, gw, gh)
    Image.fromarray((np.clip(big, 0, 1) * 255).astype(np.uint8)).save(out)
    print("saved", out)
