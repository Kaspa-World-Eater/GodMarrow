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
from scipy import ndimage as nd                       # noqa: E402
import litter_ground as LG                            # noqa: E402
import floor3d as F                                   # noqa: E402

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
    "leaf": ramp("#22120d", "#3a1d10", "#552a14", "#723c1b", "#8d5226", "#a46a34"),
    "algae": ramp("#121a17", "#1b2a22", "#26392b", "#304634", "#3c553e"),
    "straw": ramp("#1a1612", "#2b251c", "#40372a", "#574b39", "#6f6049", "#88775b", "#a08f6e"),
    # rain standing in the pits, tea-dark with the leaves' tannin: the dark of the crowns in it, a little grey sky
    "water": ramp("#06080a", "#0c1012", "#12191a", "#1b2423", "#26302e", "#333e3b", "#45504b"),
}
MAT = {1: "ground", 2: "stucco", 3: "brick", 4: "stone", 5: "lacquer", 6: "gold", 7: "tile", 8: "wood", 9: "root",
       10: "iron", 11: "bone", 12: "moss", 13: "cloth", 14: "straw", 15: "water"}


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
    # the floor's causes at every pixel's world position (floor3d): the same floor the 3D build stood on. The canopy is
    # the broad shape of the light: the giants stand back from the kept ground, so the sky reaches it; under them, dim
    FM = F.maps(X, Y)
    v = v * FM["open"]
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
            continue                                                  # painted from its causes after the loop
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
    img = paint_floor(img, d, v, FM, dith)
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


LV = 1.3            # the litter painter's light is the wood scene's, a step brighter than this overcast's


def _leaves_on(img, m, v, X, Y, dens, lt, seed):
    """leaves lying on a surface (stone, water) with its own colour left between them: the floor's own leaves
    (litter_ground), a leaf where its cell's hash falls under the density"""
    x, y = X[m], Y[m]
    h1, lid, dd = LG._layer(x, y, LG.CELL1, seed)
    on = (h1 > 0) & (LG._hash(lid, 0, 21) < dens)
    if on.any():
        cur = img[m]
        cur[on] = LG.leaf_colours(lid[on], dd[on], x[on], y[on], np.clip(v[m][on] * LV, 0, 0.99), lt[on])
        img[m] = cur
    return img


def paint_floor(img, d, v, FM, dith):
    """the forest floor from its causes (floor3d), with the floor's own leaves (landkit litter_ground: every leaf its
    own, Derek's standing ruling that the ground stays alive): moss on the mounds, the cushion colonies and the kept
    ground, with a few leaves lying on it; the leaf-fall drifted deep into the pits, the hollows and the platform's
    trench and lying thin between; bare wet earth on the worn way; the fallen roof's shards on its bank; rain in the
    pits; and on the stair, which has not been swept, the leaves where they fell"""
    n, pos, mat, ao = d["normal"], d["pos"], d["mat"], d["ao"]
    X, Y = pos[..., 0], pos[..., 1]
    up = n[..., 2]
    gm = mat == 1
    if gm.any():
        litt = np.clip(FM["litter"] * 1.5 + 0.1, 0, 1.25)
        # the moss is its cushions (real form, floor3d), so it thins cushion by cushion and never ends in an edge; the
        # kept ground's young carpet breaks up into cushions where the sweeping stopped. Leaves lie over every
        # cushion's rim (the floor's own leaves, so a rim is notched leaf by leaf, never a clean oval)
        h1, lid, _ = LG._layer(X, Y, LG.CELL1, 3)
        over = (h1 > 0) & (LG._hash(lid, 0, 23) < 0.7)
        mossy = (FM["cushion"] > 0.014 + 0.01 * vn(X * 3.1, Y * 3.1)) & ~(over & (FM["cushion"] < 0.045))
        # the carpet's edge is no line: past the stones the leaves lie over it more and more, each leaf deciding
        # for itself (its own hash against how kept the ground is), until only the cushions hold out
        k = FM["kept"]
        covered = (h1 > 0) & (LG._hash(lid, 0, 29) > np.clip((k - 0.4) / 0.45, 0, 0.8))   # a few autumns lie on it too
        mossy |= (k > 0.4 + 0.12 * vn(X * 1.9 + 2, Y * 1.9)) & ~covered
        lmat = np.where(mossy, 1, 0)
        # bare earth where nothing lies: the worn way, the trench, and every bank too steep to hold the leaves (the
        # windthrows' torn faces)
        bank = (up < 0.8) & (FM["wild"] > 0.5)
        lmat = np.where((FM["path"] > 0.45) | (FM["trench"] > 0.65) | bank, 2, lmat)
        # where the leaves lie thick, by cause: deep in the hollows and the trench, over most of the forest's floor,
        # thinner on the kept ground, thin on the mounds; never the generator's own noise patches of bare humus
        drift = np.clip(0.62 + 0.5 * FM["hollow"] + 0.2 * FM["wild"] - 0.55 * FM["mound"] - 0.22 * FM["kept"]
                        + (vn(X * 0.9 + 7, Y * 0.9) - 0.5) * 0.35, 0, 1)
        img = LG.paint(img, gm, np.clip(v * LV, 0, 0.99), X, Y, litt, lmat, flecks=False, drift=drift)
        # the wet darkens what it soaks: the rut down the worn way, the trench, the pits' banks
        wet = gm & (FM["wet"] > 0.3)
        img[wet] = img[wet] * (1 - 0.32 * np.clip(FM["wet"][wet], 0, 1))[:, None]
        # the fallen roof's shards on its bank, each its own plate of glazed clay, green or an old rust repair
        rb = gm & (FM["rubble"] > 0.15)
        if rb.any():
            x, y = X[rb], Y[rb]
            h1, sid, sd = LG._layer(x, y, 0.13, 77)
            dens = np.clip((FM["rubble"][rb] - 0.15) * 1.8, 0, 0.97)
            on = (h1 > 0) & (LG._hash(sid, 0, 5) < dens)
            r = LG._hash(sid, 0, 6)
            tt = np.clip(v[rb] * 1.15 + (r - 0.5) * 0.14 - (sd > 0.7) * 0.1, 0, 0.99)
            col = np.where((r < 0.2)[:, None], tone(R["tile_r"], tt, dith[rb]), tone(R["tile_g"], tt, dith[rb]))
            cur = img[rb]
            cur[on] = col[on]
            img[rb] = cur
    # the stair has not been swept (05-the-last-breath): the leaves lie where they fell, drifted into the back of every
    # tread and against the walls of the walk, where the wind cannot reach (the dark of the occlusion is that shelter)
    flat = ((mat == 2) | (mat == 3) | (mat == 4)) & (up > 0.85)
    if flat.any():
        corner = np.clip((0.97 - ao) / 0.35, 0, 1) ** 1.2
        stair = (X > 7.5) & (X < 10.6) & (np.abs(Y) < 1.7)
        dens = np.clip(0.05 + 0.8 * corner + 0.25 * stair, 0, 0.95)
        img = _leaves_on(img, flat, v, X, Y, dens[flat], np.full(int(flat.sum()), 0.4), 31)
    # rain standing in the pits: tea-dark and still, the crowns' dark in it and a little grey sky toward its far side;
    # pigment pooled in a dark band at the wet edge, a few leaves afloat
    wm = mat == 15
    if wm.any():
        # the far bank's dark is mirrored along the pool's far edge (the top, from this camera); nearer us the water
        # gives back the higher things, the crowns' gaps and the grey sky
        below = np.zeros(wm.shape)
        for r in range(1, wm.shape[0]):
            below[r] = np.where(wm[r], np.where(wm[r - 1], below[r - 1] + 1, 0), 0)
        sky = np.clip(0.2 + 0.035 * below + 0.12 * (vn(X * 0.5 + 3, Y * 0.5) - 0.5) + 0.12 * (FM["open"] - 0.85) * 4, 0, 0.6)
        img[wm] = tone(R["water"], sky[wm], dith[wm])
        shore = wm & ~nd.binary_erosion(wm, iterations=1)
        img[shore] = tone(R["water"], sky[shore] * 0.45, dith[shore])
        img = _leaves_on(img, wm & ~shore, v, X, Y, np.full(int((wm & ~shore).sum()), 0.1), np.full(int((wm & ~shore).sum()), 0.3), 41)
    return img


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
