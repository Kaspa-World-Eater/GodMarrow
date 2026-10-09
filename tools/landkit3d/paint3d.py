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
    # the bentwood boxes' paint: red ochre gone brown, the formline's black, over cedar
    "ochre": ramp("#1a0d0c", "#2e1410", "#481d14", "#622819", "#7a3620", "#8f4729"),
    # the Red Water: blood under a grey sky, red by its own colour and never by glow
    "blood": ramp("#0c0405", "#1a0708", "#2a0b0b", "#3c100e", "#4f1712", "#621f16", "#74291b"),
    # pale hairless hides, from the things killed at the wall
    "hide": ramp("#2a2420", "#433a33", "#5e534a", "#7a6d61", "#968878", "#b0a290", "#c8baa6"),
    # cedar weathered silver, and the bleached drift logs
    "cedar": ramp("#1c1c1e", "#2e2e30", "#434242", "#5a5856", "#72706b", "#8b8882", "#a5a199"),
    "basalt": ramp("#0b0b0e", "#16161a", "#222226", "#2f2f33", "#3e3e42", "#4f4f52", "#626266"),
    "ash": ramp("#2a2826", "#45413d", "#625d57", "#807a72", "#9d978e", "#b8b2a8"),
    # the black sand: dry above the tide, and wet, where the Red has just left it
    "sand_dry": ramp("#141315", "#1e1c1e", "#292627", "#353131", "#423d3b", "#504a46", "#5f5853"),
    "sand_wet": ramp("#0d0708", "#170b0c", "#221012", "#2d1617", "#3a1d1d", "#482525"),
    "kelp": ramp("#120708", "#1f0d0b", "#2e150f", "#3e1f14", "#4f2a19"),
    # the drowned dead: bloated skin gone grey-violet and green, the dark marbling of the veins under it
    "corpse": ramp("#1d1a1e", "#302a30", "#463e43", "#5e5459", "#776b6c", "#928580", "#ab9d92", "#c2b5a6"),
    "cloth": ramp("#100e0e", "#1a1717", "#252020", "#312a28", "#3d3431", "#4a3f3a"),
    "dunegrass": ramp("#1a1d12", "#2a2e19", "#3d4122", "#52552c", "#686a37", "#7f7e44"),
    "straw": ramp("#1a1612", "#2b251c", "#40372a", "#574b39", "#6f6049", "#88775b", "#a08f6e"),
    # rain standing in the pits, tea-dark with the leaves' tannin: the dark of the crowns in it, a little grey sky
    "water": ramp("#06080a", "#0c1012", "#12191a", "#1b2423", "#26302e", "#333e3b", "#45504b"),
}
MAT = {1: "ground", 2: "stucco", 3: "brick", 4: "stone", 5: "lacquer", 6: "gold", 7: "tile", 8: "wood", 9: "root",
       10: "iron", 11: "bone", 12: "moss", 13: "cloth", 14: "straw", 15: "water", 16: "boxpaint", 17: "blood",
       18: "hide", 19: "cedar", 20: "basalt", 21: "ash", 22: "kelp", 23: "corpse"}


def tone(rmp, t, dith, band=0.2):
    """t (0..1) to the ramp, with the 4x4 dither only at the step between two tones (within band of the midpoint; a
    big flat surface takes a narrow band, so it lies in flat tones and never stipples)"""
    n = len(rmp)
    f = np.clip(t, 0, 0.999) * n
    i = np.floor(f).astype(int)
    frac = f - i
    i2 = np.where(frac > dith, i + 1, i)
    i2 = np.where((frac > 0.5 - band) & (frac < 0.5 + band), i2, np.round(f - 0.5 + 0.5).astype(int))
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
    Fm = __import__(str(d["floor"])) if "floor" in d else F           # the scene's own floor module
    FM = Fm.maps(X, Y)
    v = v * FM["open"]
    # the enclosure (blend_scene.sky_passes: occlusion out to 12 yd): what sees little of the sky goes dark, inside the
    # hall under its roof, deep in the porch, in a recess; a wall in the open (half its view is ground) is untouched
    if "skyview" in d:
        v = v * np.clip(d["skyview"] / 0.42, 0.25, 1.0) ** 0.75
    # what each surface is, by cause
    wall = np.abs(up) < 0.35                                    # standing faces
    along = np.where(np.abs(n[..., 0]) > np.abs(n[..., 1]), Y, X)   # a wall's own horizontal coordinate
    noise = fbm(X * 0.9 + Y * 0.3, Y * 0.9 + Z * 0.7)
    fine = vn(X * 7 + Z * 5, Y * 7 - Z * 5)
    img = np.zeros((gh, gw, 3))
    exposed = 1.0 - d.get("shelter", np.zeros((gh, gw)))       # what the rain reaches (blend_scene.shelter_pass)
    FALL = roof_fall(X, Z)
    W = wall_maps(n, pos, mat, along, wall)
    for k, name in MAT.items():
        m = mat == k
        if not m.any():
            continue
        t = v[m] + (fine[m] - 0.5) * 0.08
        if name == "stucco":
            # whitewashed lime over brick (the area's brief): it holds the light a step above stone at the same light,
            # so the walls are the piece's big light shape. Where it has failed, by cause (wall_maps), the brick shows
            # the walk and the treads are trodden plaster, never whitewashed: grey with grime, worn through to the
            # brick along the keepers' track from the stair to the door
            # (the wall's lime lies in flat tones shaped only by its stains: no fine grain, a narrow dither band)
            ts = np.where(wall[m], v[m] * (1.55 + W["stain"][m]), t)
            lost = W["lost"][m]
            col = np.where(lost[:, None], brick_tone(along[m], Z[m], t * 0.9, dith[m]),
                           tone(R["stucco"], ts, dith[m], band=np.where(wall[m], 0.06, 0.2)))
            flat_ = ~wall[m]
            col = np.where(flat_[:, None], tone(R["stone"], t * 0.8 + (fine[m] - 0.5) * 0.06, dith[m]), col)
            # the stair's treads: swept every morning for centuries, worn smooth and pale, each nosing rounded and lit;
            # so the stair reads as light treads over the dark of its risers
            tread = flat_ & (X[m] > 7.55) & (X[m] < 9.65) & (np.abs(Y[m]) < 1.25)
            col = np.where(tread[:, None], tone(R["stone"], t * 1.05, dith[m], band=0.08), col)
            track = flat_ & (np.abs(Y[m]) < 0.8 + 0.25 * vn(X[m] * 2.0, 4.0)) & (X[m] > 4.4) & (X[m] < 7.7) & (vn(X[m] * 5.0, Y[m] * 5.0) > 0.42)
            col = np.where(track[:, None], brick_tone(X[m], Y[m] * 0.31, t * 0.8, dith[m]), col)
            # the salt the damp leaves where it dries out, a pale tide just above its line
            col = np.where(W["salt"][m][:, None], tone(R["stucco"], ts * 1.18 + 0.04, dith[m]), col)
            # run-off from the sills: grey-black streaks hanging below each window, down to the damp
            col = np.where(W["streak"][m][:, None], tone(R["stucco"], ts * 0.62, dith[m]), col)
            # the algae: a film on the damp, thickest at the foot and on the faces the light never reaches, dithered
            # where it thins (never blotches)
            a = W["damp"][m] ** 0.8 * np.where(soft[m] < 0.3, 1.0, 0.45)
            alg = wall[m] & (a > 0.3 + dith[m] * 0.55)
            col = np.where(alg[:, None], tone(R["algae"], t * 0.95, dith[m]), col)
            # the edges of what stays are rounded and grey-black with lichen (chapter 09), a band a pixel or two wide
            col = np.where(W["lichen"][m][:, None], tone(R["stucco"], ts * 0.62, dith[m]), col)
            # the cracks the walls settled along, from the windows' corners
            col = np.where(W["crack"][m][:, None], tone(R["stucco"], ts * 0.45, dith[m]), col)
            # the plaster stands proud of the brick: a loss's top edge throws a thin shadow on the brick below it, and
            # its bottom edge, the plaster's broken top, catches the sky (rule 3, the lit lip)
            col = np.where(W["shadow"][m][:, None], col * 0.68, col)
            col = np.where(W["lip"][m][:, None], tone(R["stucco"], ts * 1.25 + 0.05, dith[m]), col)
        elif name == "brick":
            col = brick_tone(along[m], Z[m], t * 0.95, dith[m])
            a = W["damp"][m] ** 0.8 * np.where(soft[m] < 0.3, 1.0, 0.45)
            col = np.where((wall[m] & (a > 0.3 + dith[m] * 0.55))[:, None], tone(R["algae"], t * 0.95, dith[m]), col)
        elif name == "lacquer":
            col = lacquer_paint(m, t, along, Z, W, dith)
            col = keeper_account(col, m, t, X, Y, Z, n, dith)
        elif name == "blood":
            col = sea_paint(m, t, X, Y, Z, n, soft, dith, Fm)
        elif name == "corpse":
            # the drowned: grey-violet and green, the veins' dark marbling showing through, the skin's tight lit tops;
            # where they lie in the sand the Red has soaked up into them
            col = tone(R["corpse"], t * 1.45, dith[m])
            marb = np.abs(vn(X[m] * 9.0 + Y[m] * 3.0, Z[m] * 9.0 + Y[m] * 6.0) - 0.5) < 0.035
            col = np.where(marb[:, None], tone(R["corpse"], t * 0.55, dith[m]), col)
            gnd = Fm.height(X[m], Y[m])
            soak = (Z[m] - gnd) < 0.05 + 0.04 * vn(X[m] * 6.0, Y[m] * 6.0)
            col = np.where(soak[:, None], tone(R["blood"], t * 0.9, dith[m]), col)
        elif name == "boxpaint":
            col = box_paint(m, t, along, Z, dith)
        elif name == "iron":
            # the black stone, polished by knees: dark, and where it faces up a sheen that gives back the light
            col = tone(R["iron"], t, dith[m])
            # where knees and hands have worn it, it gives back the candle in long soft streaks
            lamp = d["lamp"][m] / 0.09 if "lamp" in d else np.zeros(int(m.sum()))
            sheen = (up[m] > 0.9) & (vn(X[m] * 1.5, Y[m] * 5.0) + np.clip(lamp, 0, 1) * 0.12 > 0.7)
            col = np.where(sheen[:, None], tone(R["stone"], t * 0.9 + np.clip(lamp, 0, 1) * 0.15, dith[m]), col)
        elif name == "tile":
            # every tile its own: a course every quarter yard down the slope, a row every third of a yard across; each
            # tile a little lighter or darker, a few gone (the dark beneath), the rust tiles of an older repair in runs
            col = roof_paint(m, t, X, Y, Z, up, FALL, dith)
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
            # (a steep roof sheds its water and holds moss only in patches; flat tops hold it where the rain reaches
            # them, thickest where the water stands, at the foot of what rises from them; under the eaves, none)
            if name == "tile":
                # the roof holds its moss from the eave up, where the water slows and the debris lodges, and along the
                # runs the water takes; the steep upper courses shed it
                fl = FALL[m]
                mossy = (up[m] > 0.3) & (fbm(X[m] * 1.1 + 7, Z[m] * 0.7 + Y[m] * 0.3) * 0.6 + (1 - fl) ** 2 * 0.5
                                         + roof_runs(X[m], fl) * 0.12 > 0.63)
            else:
                stand = np.clip((0.97 - ao[m]) / 0.3, 0, 1)
                mossy = (up[m] > 0.62) & (exposed[m] > 0.5) & (fbm(X[m] * 1.3 + 7, Y[m] * 1.3 + Z[m]) + stand * 0.35 > 0.5)
                # the swept stair has had a season or two to green: moss only in the back corner of each tread
                on_stair = (X[m] > 7.55) & (X[m] < 9.65) & (np.abs(Y[m]) < 1.25)
                mossy &= ~on_stair | (stand > 0.75)
                if "sand" in FM:
                    mossy &= FM["sand"][m] < 0.5                    # nothing greens on the salt sand
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
    # the warm local light (rule 10: a cool key and a warm local light, temperature tinting the tone in steps): the
    # candle's light from blend_scene.lamp_pass, through the real forms with its true shadows, laid in four steps with
    # the dither only where one step meets the next
    if "lamp" in d and d["lamp"].max() > 0:
        Lw = np.clip(d["lamp"] / 0.09, 0, 1.6)
        Lq = np.clip(np.floor(Lw * 3 + dith - 0.35), 0, 4) / 3
        img = img * (1 + Lq[..., None] * np.array([0.85, 0.42, 0.06])) + Lq[..., None] * np.array([0.07, 0.03, 0.0])
    # the paper's tooth, fixed to the world (rule 6): a breath of grain in every tone
    tooth = (vn(X * 31 + Z * 17, Y * 31 - Z * 17) - 0.5) * 0.06
    img = np.clip(img * (1 + tooth[..., None]), 0, 1)
    return img, alpha


LV = 1.3            # the litter painter's light is the wood scene's, a step brighter than this overcast's


def _frac(a):
    return a - np.floor(a)


def brick_tone(along, Z, t, dith):
    """brick by the course (a course 0.075 yd, a brick 0.24 yd, every other course set over by half): each brick its own
    small step of tone, a few burnt dark, a few gone to the hollow behind them"""
    row = np.floor(Z / 0.075)
    cb = np.floor(along / 0.24 + 0.5 * (row % 2))
    h = _frac(np.sin(row * 12.9898 + cb * 78.233) * 43758.5453)
    tt = t + (h - 0.5) * 0.16
    tt = np.where(h > 0.94, tt * 0.5, tt)
    return tone(R["brick"], tt, dith)


# each roof's eave and ridge (temple3d: the main tier, the porch tier, the spirit house), for how far down its slope a
# tile lies: 0 at the eave, 1 at the ridge
ROOFS = [(4.9, 11.0, 4.8, 8.2), (-99.0, 4.9, 5.15, 9.6), (11.0, 99.0, 1.95, 2.35)]


def roof_fall(X, Z):
    f = np.zeros(X.shape)
    for x0, x1, ez, rz in ROOFS:
        q = (X >= x0) & (X < x1)
        f = np.where(q, np.clip((Z - ez) / (rz - ez), 0, 1), f)
    return f


def roof_runs(X, fall):
    """the water's runs down a roof: a few tile columns stained from where the water gathers down to the eave"""
    row = np.floor(X / 0.32)
    h1 = _frac(np.sin(row * 41.3 + 7.1) * 24634.6)
    h2 = _frac(np.sin(row * 17.9 + 2.3) * 13579.2)
    return ((h1 < 0.16) & (fall < 0.25 + 0.7 * h2)).astype(float)


def roof_paint(m, t, X, Y, Z, up, FALL, dith):
    """old green glaze, every tile its own (a course every 0.22 yd down the slope, a tile every 0.32 yd across), by
    cause: the water's runs stain whole columns of tiles from where it gathers down to the eave; the keepers' repairs
    are runs of unglazed tiles along a course where a leak was, a few tiles long, never a block; the tiles gone are
    near the fallen stretch and the eaves, each hole showing its batten over the dark of the hall"""
    x, z, fl = X[m], Z[m], FALL[m]
    row = np.floor(x / 0.32)
    course = np.floor(z / 0.22)
    h = _frac(np.sin(row * 12.9898 + course * 78.233) * 43758.5453)
    tt = t * 0.92 + (h - 0.5) * 0.1
    tt = np.where(roof_runs(x, fl) > 0, tt * 0.78, tt)
    hc = _frac(np.sin(course * 91.7 + 3.3) * 17345.1)
    seg = np.floor((row + hc * 9.0) / 6.0)
    hs = _frac(np.sin(seg * 37.1 + course * 11.3) * 9123.7)
    start = _frac(np.sin(seg * 5.3 + course * 2.9) * 4231.9) * 3.0
    pos_ = (row + hc * 9.0) - seg * 6.0
    rust = (hs < 0.09) & (pos_ >= start) & (pos_ < start + 2.0 + 3.0 * hs / 0.09)
    col = np.where(rust[:, None], tone(R["tile_r"], tt, dith[m]), tone(R["tile_g"], tt, dith[m]))
    breach = np.clip(1.0 - np.maximum(np.maximum(-4.4 - x, x - 2.6), 0) / 1.5, 0, 1) * (Y[m] > 0)
    p_gone = 0.004 + 0.06 * breach * (1 - fl) + 0.02 * (fl < 0.12)
    gone = (_frac(h * 77.7) < p_gone) & (up[m] > 0.3)
    within = _frac(z / 0.22)
    hole = np.where((within > 0.68)[:, None], tone(R["wood"], t * 0.6, dith[m]), tone(R["wood"], t * 0.22, dith[m]))
    return np.where(gone[:, None], hole, col)


def wall_maps(n, pos, mat, along, wall):
    """how the whitewashed stucco has failed, by cause (chapter 09: it drops in sheets, baring the brick in irregular
    continents, the edges of what stays rounded): the rising damp at every wall's foot, its line wandering slowly along
    the wall, a pale tide of salt just above it where the damp dries out; the exposed edges first (a wall's corners, the
    door's jambs, the window reveals, where the form turns); tongues under the sills where the run-off goes, with its
    grey streaks. Elsewhere the lime holds. Never a threshold on noise at the scale of yards (the camouflage trap)"""
    gh, gw = mat.shape
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    st = (mat == 2) & wall
    base = np.where(Z > 0.98, 1.0, -0.1)                # the platform's walk, or the ground at the platform's own faces
    rel = Z - base
    hd = 0.55 + 0.6 * fbm(along * 0.45 + 3.0, 1.7 + base * 5.0)          # the damp's line
    rag = (vn(along * 3.3, Z * 3.3) - 0.5) * 0.24 + (vn(along * 9.0 + 2, Z * 9.0) - 0.5) * 0.09
    damp = np.clip(1.0 - rel / (hd + 0.25), 0, 1) * (np.abs(n[..., 2]) < 0.35)
    lost = st & (rel < hd + rag) & ~(fbm(along * 2.2 + 5, Z * 2.2) > 0.75)   # a few islands of plaster still hold
    salt = st & ~lost & (rel >= hd + rag) & (rel < hd + rag + 0.07 + 0.06 * vn(along * 5.0, 2.0))
    # the exposed edges: where the form turns from column to column (a vertical edge in the world), within a ragged reach
    turn = np.zeros((gh, gw))
    turn[:, :-1] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    turn[:, 1:] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    far = nd.distance_transform_edt(turn < 0.9)                     # a corner, a jamb, a reveal; never a column's roundness
    reach = 1.5 + 3.5 * fbm(along * 1.6, Z * 1.6 + 9.0) * (0.5 + 0.7 * damp)
    lost |= st & (far < reach) & (vn(along * 4.0 + 1, Z * 4.0) > 0.38)
    # under each window: how many rows below a shutter (the run-off from its sill goes straight down the wall)
    lac = mat == 5
    below = np.zeros((gh, gw))
    since = np.full(gw, 999.0)
    for r in range(gh):
        since = np.where(lac[r], 0.0, since + 1.0)
        below[r] = since
    under = st & (below > 0) & (below < 60)
    lost |= under & (below < 3 + 9 * vn(along * 6.0, 3.0)) & (vn(along * 8.0 + 4, Z * 2.0) > 0.42)
    streak = under & ~lost & (vn(along * 14.0, Z * 0.3) > 0.56) & (below < 10 + 30 * vn(along * 3.0, 7.0))
    # the cracks the walls settled along: from each window's lower corners down and outward, wandering; beside each,
    # the plaster bellied and dropped a sheet (the irregular continents), on the side away from the window
    crack = np.zeros((gh, gw), bool)
    lab, nlab = nd.label(lac & wall)
    for k in range(1, nlab + 1):
        q = lab == k
        if q.sum() < 30:
            continue
        a0, a1, z0 = along[q].min(), along[q].max(), Z[q].min()
        rnd = np.random.default_rng(k * 7 + 3)
        for side, ax in ((-1, a0), (1, a1)):
            if rnd.random() < 0.35:
                continue                                              # not every corner cracked
            ln = rnd.uniform(0.7, 1.5)
            slope = rnd.uniform(0.9, 1.6)                             # yards down per yard out
            s_out = side * (along - ax)                               # out from the window's side
            dz = z0 - Z                                               # down from its sill
            onwall = st & (s_out > -0.05) & (dz > -0.05) & (dz < ln)
            wob = (vn(dz * 9.0 + k, 3.0 + side) - 0.5) * 0.08
            dist = np.abs(s_out * slope - dz + wob) / np.hypot(slope, 1.0)
            crack |= onwall & (dist < 0.022)
            sheet = onwall & (s_out * slope - dz + wob > 0) & (dist < 0.12 + 0.18 * vn(dz * 4.0, along * 4.0 + k)) & (dz < ln * 0.8)
            lost |= sheet
    crack &= ~lost
    # the lime's own stains: soft vertical runs, a step lighter or darker in long shapes (never blotches)
    stain = (fbm(along * 0.9 + 2.0, Z * 0.22) - 0.5) * 0.22
    # the edges of what stays: a band of grey-black lichen a pixel or two wide round every loss
    keep = st & ~lost
    lichen = keep & (nd.distance_transform_edt(~lost) < 1.6 + vn(along * 6.0, Z * 6.0))
    # the plaster's broken edges (screen rows run down the wall): shadow on the brick under a top edge, lit lip on top
    same = (n * np.roll(n, 1, 0)).sum(2) > 0.95
    shadow = lost & np.roll(keep, 1, 0) & same
    lip = keep & np.roll(lost, 1, 0) & same
    lichen &= ~lip
    return dict(lost=lost, salt=salt, damp=damp, streak=streak, shadow=shadow, lip=lip, crack=crack, stain=stain,
                lichen=lichen)


def sea_paint(m, t, X, Y, Z, n, soft, dith, Fm):
    """the Red Water with the game's own blood (landkit blood.py, the shader's twin: one blood everywhere, held dark,
    never glowing) at its true depth over the sand, and the lake's ways (library: water): the light broken into dull
    dabs dragged along the swells, never a smooth sheen; dark foam clinging on the breakers' crests in dabs and
    strands; the swash a thin film the sand shows through, its edge pooled dark"""
    import blood as BL
    x, y, z = X[m], Y[m], Z[m]
    g = Fm.height(x, y)
    s_, t_ = (-(x + y) / np.sqrt(2), (x - y) / np.sqrt(2))
    # the blood ramp (blood.py's C0..C3: clot, dark red, the body, a lit red) picked by the real light on the swells,
    # held dark (the library's trap: ketchup); the blood effect's churn only as small clots, stretched along the swell
    churn = fbm(t_ * 0.6 + 2.0, s_ * 2.4)
    # the swells by their real slopes: their backs, turned from us, take the grey sky; their faces toward us are the
    # blood's own dark body (the slope along the shore's normal, pushed so a swell reads as a band of tones)
    n_s = -(n[m][:, 0] + n[m][:, 1]) / np.sqrt(2)
    lv = np.clip(t, 0, 0.6) * 2.0 + n_s * 5.5 + (churn - 0.5) * 0.45
    fr_ = lv - np.floor(lv)
    lv = np.where(np.abs(fr_ - 0.5) < 0.12, lv + (dith[m] - 0.5) * 0.24, lv)          # dither only at a tone's edge
    col = np.where((lv > 1.75)[:, None], BL.C2, np.where((lv > 0.95)[:, None], BL.C1, BL.C0))
    col = col * (0.75 + np.clip(t, 0, 0.6)[:, None] * 0.6)
    light = np.clip(t * 1.25, 0, 0.55)
    # the light in dabs: where the surface turns from us the grey sky lies on it, dragged along the swells' line, few
    V = np.array([0.612, 0.612, 0.5])
    fres = (1 - np.clip((n[m] * V).sum(1), 0, 1)) ** 2
    dab = (fres > 0.22) & (vn(t_ * 0.18 + 3.0, s_ * 4.0) + vn(t_ * 1.1, s_ * 6.0) * 0.25 > 0.78 - fres * 0.35)
    col = np.where(dab[:, None], BL.C2 * 0.95 + np.array([0.05, 0.04, 0.05]), col)
    # the breaker's curl: under the lip the blood is in its own shadow (normals turned down or toward us, deep in)
    hollow = (n[m][:, 2] < 0.2) & (z > 0.15)
    col = np.where(hollow[:, None], BL.C0 * 0.9, col)
    lipf = (n[m][:, 2] > -0.2) & (n[m][:, 2] < 0.55) & (z > 0.55) & (n_s < -0.15)
    col = np.where(lipf[:, None], BL.C1 * 1.1, col)
    # foam: dark, it clings on the breakers' crests in thin strands and lies in strands behind them, never pale blobs
    if hasattr(Fm, "water"):
        _, crest = Fm.water(s_, t_)
        # on the curl: clinging at the lip's leading edge and on the slumped sections, in runs down the face
        # along the lip's top a thin broken line, then strands clinging down the face
        foam = (z > 0.7) & (np.abs(n[m][:, 2] - 0.55) < 0.25) & (vn(t_ * 7.0, z * 9.0) + vn(t_ * 1.3, 2.0) * 0.4 > 0.62)
        foam |= (z > 0.25) & (z < 0.7) & (n[m][:, 2] < 0.3) & (np.abs(vn(t_ * 4.0 + 4, z * 1.5) - 0.5) < 0.04)
        # behind the break, the spent foam lies in strands dragged along the shore, thinning toward the beach
        spent = np.clip((s_ - 66.5) / 6.0, 0, 1) * (s_ < 73.5)
        # dry-brush streaks dragged along the shore (the lake's method), broken where the brush lifts
        foam |= (z < 0.15) & (vn(t_ * 0.22 + 9, s_ * 3.4) > 0.86 - spent * 0.12) & (vn(t_ * 3.0, s_ * 3.0) > 0.3)
        col = np.where(foam[:, None], np.array([0.27, 0.15, 0.14]) * (0.75 + light[:, None]), col)
    # the shallows over the sand: the sand's red-black shows up through the blood, more the shallower, in dithered
    # steps (never contour lines); at its very edge a thin dark wet line, the pigment pooled
    sh = np.clip(1.0 - (z - g) / 0.35, 0, 1)
    thru = sh > 0.25 + dith[m] * 0.5
    col = np.where(thru[:, None], tone(R["sand_wet"], t * 0.85, dith[m]) * 0.55 + BL.C1 * 0.45, col)
    edge = (z - g) < 0.012
    col = np.where(edge[:, None], BL.C0 * 1.1, col)
    return col


def keeper_account(col, m, t, X, Y, Z, n, dith):
    """the keeper's account (the area's in-game text), cut with a knife into the inside of the door, low down, as if by
    someone sitting with their back to it, the lines crowding as they go: pale cuts through the lacquer to the wood"""
    x, y, z = X[m], Y[m], Z[m]
    door = (x > 4.2) & (x < 5.3) & (np.abs(y) < 1.4) & (z > 1.15) & (z < 2.1)
    rowh = 0.07 - (z - 1.15) * 0.02                               # the lines crowd as they go down
    line = np.abs(_frac((2.1 - z) / np.maximum(rowh, 0.03)) - 0.5) < 0.18
    cut = door & line & (vn(x * 40.0 + y * 40.0, z * 3.0) > 0.38)
    return np.where(cut[:, None], tone(R["wood"], t * 1.25, dith[m]), col)


def box_paint(m, t, along, Z, dith):
    """the bentwood boxes of the dead, and the screen's boards: red ochre on cedar, the formline in black (an inset band
    and an ovoid with its dark eye, forms only), a gilt line kept where nothing rubbed it"""
    lab, nlab = nd.label(m)
    u = np.zeros(m.shape)
    w = np.zeros(m.shape)
    for k in range(1, nlab + 1):
        q = lab == k
        a0, a1 = along[q].min(), along[q].max()
        z0, z1 = Z[q].min(), Z[q].max()
        u[q] = (along[q] - a0) / max(a1 - a0, 1e-3)
        w[q] = (Z[q] - z0) / max(z1 - z0, 1e-3)
    u, w = u[m], w[m]
    col = tone(R["ochre"], t * 1.45, dith[m])
    band = (np.minimum(np.minimum(u, 1 - u), np.minimum(w, 1 - w)) < 0.07)
    ov = ((u - 0.5) / 0.3) ** 2 + ((w - 0.52) / 0.24) ** 2
    black = band | ((ov > 0.72) & (ov < 1.0)) | (ov < 0.12)
    col = np.where(black[:, None], tone(R["lacquer"], t, dith[m]), col)
    gilt = (np.abs(ov - 0.42) < 0.08) & (vn(along[m] * 9.0, Z[m] * 9.0) > 0.4)
    return np.where(gilt[:, None], tone(R["gold"], t * 0.9, dith[m]), col)


def lacquer_paint(m, t, along, Z, W, dith):
    """black lacquer over teak (the shutters, the door): crazed and flaking in islands to the grey wood, more toward
    the foot where the wet reaches; the gilt pattern (gold leaf on black) kept only in an inset border and a lozenge,
    in the upper part where the eaves keep the weather off. Each panel's own bounds come from its pixels"""
    lab, nlab = nd.label(m)
    u = np.zeros(m.shape)
    w = np.zeros(m.shape)
    ua = np.zeros(m.shape)
    wa = np.zeros(m.shape)
    for k in range(1, nlab + 1):
        q = lab == k
        a0, a1 = along[q].min(), along[q].max()
        z0, z1 = Z[q].min(), Z[q].max()
        u[q] = (along[q] - a0) / max(a1 - a0, 1e-3)
        w[q] = (Z[q] - z0) / max(z1 - z0, 1e-3)
        ua[q], wa[q] = a1 - a0, z1 - z0
    u, w, ua, wa = u[m], w[m], ua[m], wa[m]
    a, z = along[m], Z[m]
    col = tone(R["lacquer"], t, dith[m])
    flaked = fbm(a * 3.0 + 11.0, z * 3.0) + (1.0 - w) * 0.28 > 0.7
    col = np.where(flaked[:, None], tone(R["wood"], t * 0.95, dith[m]), col)
    inset = np.minimum(np.minimum(u, 1 - u) * ua, np.minimum(w, 1 - w) * wa)
    border = (inset > 0.05) & (inset < 0.095)
    loz = np.abs(u - 0.5) * 2 / 0.75 + np.abs(w - 0.62) * 2 / 0.32
    lozenge = (loz > 0.8) & (loz < 1.0)
    gilt = (border | lozenge) & ~flaked & (w > 0.3) & (vn(a * 7.0 + 3, z * 7.0) > 0.35)
    col = np.where(gilt[:, None], tone(R["gold"], t * 0.9, dith[m]), col)
    return col


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
    soft_ = np.clip((n * KEY).sum(2), 0, 1)
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
    # the black sand, by its wetness (chapter 10): dry grey-black above the tide, red-black and glossy where the Red
    # has just left it, the tide lines of dried red film; the backshore's dune grass in clumps
    if "sand" in FM:
        sd = gm & (FM["sand"] > 0.5) & ~((mat == 15))
        rag = (fbm(X * 0.9 + 3, Y * 0.9) - 0.5) * 0.5 + (vn(X * 4.0, Y * 4.0) - 0.5) * 0.15
        wetp = sd & (FM["wet"] + rag > 0.62)
        damp = sd & ~wetp & (FM["wet"] + rag > 0.32)
        dry = sd & ~wetp & ~damp
        # the ripples read by their lit windward slopes and shaded lee faces: the real normal pushed a step
        img[dry] = tone(R["sand_dry"], v[dry] * 1.05 + (soft_[dry] - 0.45) * 0.45, dith[dry], band=0.1)
        img[damp] = tone(R["sand_dry"], v[damp] * 0.72, dith[damp], band=0.1)
        img[wetp] = tone(R["sand_wet"], v[wetp] * 1.05, dith[wetp], band=0.1)
        # the wet sand gives back the grey sky in dabs where it slopes from us, never a smooth sheen
        Vv = np.array([0.612, 0.612, 0.5])
        fres = (1 - np.clip((d["normal"] * Vv).sum(2), 0, 1)) ** 2
        sh = wetp & (vn(X * 2.6 + 5, Y * 7.0) > 0.8 - fres * 0.3) & (vn(X * 9.0, Y * 9.0) > 0.45)
        img[sh] = tone(R["sand_wet"], v[sh] * 1.5, dith[sh], band=0.1)
        if "print" in FM:
            pr = sd & (FM["print"] > 0.5) & (FM["wet"] + rag > 0.32)
            import blood as BL
            img[pr] = BL.C2 * (0.7 + np.clip(v[pr], 0, 0.5)[:, None])     # each print holds a little of the red
        # the dead bleed into the sand round them: a stain that runs out past each body (the library: a pool hidden
        # under a body must run out past it), lobed, dark at its heart
        dead = (mat == 23) | ((mat == 11) & (FM["sand"] > 0.5))
        if dead.any():
            import blood as BL
            dd_ = nd.distance_transform_edt(~dead)
            reach = 5.0 + 6.0 * fbm(X * 2.2, Y * 2.2) + 4.0 * np.clip((fbm(X * 6, Y * 6) - 0.45) * 2, 0, None) ** 2
            stain = sd & (dd_ < reach)
            deep = stain & (dd_ < reach * 0.45)
            img[stain] = img[stain] * 0.55 + BL.C0 * 0.45                   # soaked dark, never a red rim
            img[deep] = BL.C0 * 1.15 + BL.C1 * 0.25
        wr = sd & (FM["wrack"] > 0.5) & (vn(X * 3.0, Y * 3.0) > 0.7) & (vn(X * 11.0, Y * 11.0) > 0.5)
        img[wr] = tone(R["kelp"], v[wr] * 0.9, dith[wr])
        gr = gm & (FM["grass"] > 0.5) & (vn(X * 2.2 + 4, Y * 2.2) + vn(X * 7, Y * 7) * 0.4 > 0.72)
        img[gr] = tone(R["dunegrass"], v[gr] * 1.1 + (vn(X[gr] * 9, Y[gr] * 9) - 0.5) * 0.15, dith[gr])
    # the stair has not been swept (05-the-last-breath): the leaves lie where they fell, drifted into the back of every
    # tread and against the walls of the walk, where the wind cannot reach (the dark of the occlusion is that shelter)
    flat = ((mat == 2) | (mat == 3) | (mat == 4)) & (up > 0.85)
    if flat.any():
        corner = np.clip((0.97 - ao) / 0.35, 0, 1) ** 1.2
        stair = (X > 7.5) & (X < 10.6) & (np.abs(Y) < 1.7)
        dens = np.clip(0.05 + 0.8 * corner + 0.25 * stair, 0, 0.95)
        # inside the hall the wind hardly reaches: leaves only by the door and under the fallen roof
        if "skyview" in d:
            inside = (d["skyview"] < 0.3) & (d.get("shelter", np.zeros_like(ao)) > 0.5) & (X < 4.0)
            dens = np.where(inside, dens * 0.12, dens)
        img = _leaves_on(img, flat, v, X, Y, dens[flat], np.full(int(flat.sum()), 0.4), 31)
    # leaves lodge only where a steep glazed roof can hold them: the lowest courses, against the eave's lip
    tm = mat == 7
    if tm.any():
        fl = roof_fall(X, pos[..., 2])
        dens = 0.4 * np.clip(1 - fl / 0.14, 0, 1) ** 1.5
        img = _leaves_on(img, tm, v, X, Y, dens[tm], np.full(int(tm.sum()), 0.35), 51)
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
