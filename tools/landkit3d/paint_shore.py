"""Paint the Red Water's beach (beach3d.py's passes) by study chapter 13, in the cave painter's manner: every tone from
the light that truly reaches it, on our ramps, with quiet darks.

The light is an overcast (chapter 13, section 5): the sky's dome by how much of it each surface sees (the 12 yd sky
pass) and how it faces up, a soft key from the bright side of the cloud (the moon pass, blurred: soft shadows), the
contacts darkest. No sun glints, no sparkle path, nothing glowing (no red light: the blood is red by its colour).

  The sea: an oxblood body, opaque, darker in the hollows; on it the grey sky by Fresnel, so the backs of the waves
  tilted away from us catch a grey-pink glaze and the faces toward us go dark (the wave reads from its own normals).
  What the reflection pass sees in it (the cliffs) darkens the glaze.
  The foam: stage A (the bore's lumps, real form) pale rose lit as a solid; stage B painted on the water as a living
  mask, a sheet torn into lace by holes that grow as it ages, collecting in the bays and stranded at the swash's top.
  The sand by its state: the glossy film a mirror of the grey sky (the cliffs and the pilgrim dark in it), the wet
  matte band the darkest, the drying band mottled (the horns first), the dry charcoal lit on its grain; a maroon stain
  below the high-tide line drying to brown crust, the swash marks' arcs, the prints holding a little of the red.

  python tools/landkit3d/paint_shore.py PASSES_DIR OUT.(png|webp) [HERO_X HERO_Y HERO_Z FOCUS_X FOCUS_Y]
"""
import os
import sys
import math
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import paint3d as P3                                   # noqa: E402
from paint3d import R, tone, vn, fbm, B4, _frac        # noqa: E402
from scipy import ndimage as nd                       # noqa: E402
import shore_floor as S                               # noqa: E402

CAM = np.array([-0.612, -0.612, -0.5])
VIEW = -CAM / np.linalg.norm(CAM)
SKY = 0.78                                             # the overcast's brightness, as the water mirrors it
# the sea: oxblood to near black, up through the grey-pink glaze the sky lays on it (chapter 13, section 6)
R_SEA = P3.ramp("#0a0708", "#110909", "#1a0b0b", "#280d0e", "#3a1112", "#4c1819", "#5f2829", "#743d3d", "#8b5857",
                "#a37572")
# blood's foam: pale rose fresh, salmon-maroon draining, brown when dried
R_FOAM = P3.ramp("#2e1216", "#4a2026", "#6a3239", "#8a4a50", "#a7676b", "#c08b8b", "#d6aeaa", "#e6cbc5")
R_SAND = R["black_sand"]
R_WET = P3.ramp("#060507", "#0a080b", "#0f0c10", "#151116", "#1c171c")
R_PEB = P3.ramp("#08080a", "#101013", "#19191d", "#232328", "#2e2e34", "#3b3b42", "#4a4a52")
R_BONE_OLD = P3.ramp("#161214", "#251e1e", "#362c29", "#4b3e37", "#635347", "#7d6b5a", "#98856f", "#b3a086")
R_DRIFT = P3.ramp("#1b1a1c", "#2a2829", "#3b3837", "#4e4a47", "#625d58", "#77716a", "#8d867d", "#a29b90")


def _hash(a, s=0.0):
    return _frac(np.sin(a * 12.9898 + s * 78.233) * 43758.5453)


def projector(d):
    pos, alpha = d["pos"], d["alpha"]
    jj, ii = np.nonzero(alpha > 0.5)
    sel = np.linspace(0, len(jj) - 1, min(len(jj), 6000)).astype(int)
    A = np.c_[pos[jj[sel], ii[sel]], np.ones(len(sel))]
    cx, *_ = np.linalg.lstsq(A, ii[sel] + 0.5, rcond=None)
    cy, *_ = np.linalg.lstsq(A, jj[sel] + 0.5, rcond=None)

    def proj(p):
        q = np.c_[np.atleast_2d(p), np.ones(len(np.atleast_2d(p)))]
        return q @ cx, q @ cy
    return proj


def cells(u, v, size, seed):
    """the distance to the nearest of a jittered grid of points (a cellular noise): the lace's holes"""
    gu, gv = u / size, v / size
    iu, iv = np.floor(gu), np.floor(gv)
    best = np.full(u.shape, 9.0)
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            cu, cv = iu + a, iv + b
            pu = cu + _hash(cu * 17.0 + cv * 3.1, seed)
            pv = cv + _hash(cu * 5.3 + cv * 11.0, seed + 1.0)
            r = 0.55 + 0.9 * _hash(cu * 2.1 + cv * 7.7, seed + 2.0)          # every hole its own size
            best = np.minimum(best, np.hypot(gu - pu, gv - pv) / r)
    return best


KEY = np.array([-0.62, 0.22, 0.75]) / np.linalg.norm([-0.62, 0.22, 0.75])   # the overcast's bright side (blend_scene.SUN)
RAKE = np.array([-0.88, 0.3, 0.36]) / np.linalg.norm([-0.88, 0.3, 0.36])     # the dawn's bright band, low over the upper left: rakes the sand


def form_tones(n, ao, cast):
    """the five tones of a rounded form (MASTER_RULES 0.5c; Derek: the bones "looking very flat"): the light side
    turned to the bright cloud, the halftone, the core shadow where the form turns away (the darkest of the form itself),
    the reflected light where its underside takes the sand's bounce, and the cast shadow it throws (the moon pass). The
    overcast alone is too soft to turn a bone; this is the turn, as a value offset (about -0.3 to +0.3)"""
    lam = (n * KEY).sum(-1)
    # (2026-10-10, Derek: "the bones look flat too"): the turn made stronger, and the dawn's low rake across it (as the
    # sand's), so the lit side, the terminator and the bounce read as a round shaft at the game's size
    lr = np.clip((n * RAKE).sum(-1), 0, 1)
    light_ = np.clip(lam, 0, 1) ** 0.8 * 0.36 + 0.16 * (lr - 0.35)
    core = np.exp(-((lam + 0.08) / 0.16) ** 2) * 0.32                        # the band where the form turns from the light
    under = np.clip(-n[..., 2], 0, 1) + np.clip(-lam - 0.25, 0, 1)
    refl = np.clip(under, 0, 1) * 0.14                                        # the sand's bounce into the underside
    contact = (1.0 - np.clip(ao, 0, 1)) ** 1.5 * 0.3                          # the occlusion where it meets the sand
    return light_ - core + refl - contact - (1.0 - cast) * 0.1


def light(d):
    """the overcast at every pixel: (the light 0..1, the soft key alone)"""
    n, ao = d["normal"], d["ao"]
    sky = np.clip(d["skyview"], 0, 1)
    dome = sky * (0.55 + 0.45 * np.clip(n[..., 2], -0.2, 1))
    # the key: the bright side of the cloud turns every form (its angle), but an overcast casts no hard shadow: what
    # stands only softens the light behind it a little, wide and short (Derek: "the shadows being cast from objects look
    # pretty bad"; they were the moon pass's hard shadows, long dark streaks fanning from every bone)
    z_ = float(d.get("zoom", 1.0))
    lam = np.clip((n * KEY).sum(-1), 0, 1)
    moon = d["moon"].astype(np.float64)
    cast = np.where(lam > 0.08, np.clip(moon / (lam + 1e-3), 0, 1), 1.0)
    cast = nd.gaussian_filter(cast, 7.0 * z_)
    key = lam * (1.0 - 0.32 * (1.0 - cast))
    T = 0.66 * dome + 0.32 * key + 0.04
    T = T * (0.55 + 0.45 * np.clip(ao, 0, 1) ** 1.4)
    return np.clip(T, 0, 1), key


def paint(d, t, hero=None):
    import beach_floor as BF
    n, pos, mat, ao, alpha = d["normal"], d["pos"], d["mat"], d["ao"], d["alpha"]
    obj = d["obj"] if "obj" in d else np.zeros(mat.shape, np.int32)
    gh, gw = mat.shape
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    s, tt = S.st(X, Y)
    up = n[..., 2]
    dith = B4[np.arange(gh)[:, None] % 4, np.arange(gw)[None, :] % 4]
    T, key = light(d)
    oh = _hash(obj.astype(np.float64))
    oh2 = _hash(obj.astype(np.float64), 7.0)
    img = np.zeros((gh, gw, 3))
    proj = projector(d)
    g = BF.height_st(s, tt)
    c = BF.cusp(tt)
    fr, top, ps, rising = BF.swash_front(tt, t)
    lim = BF.last_limit(tt)
    ht = BF.high_tide(tt)
    age = BF.foam_age(s, tt, t)

    # ---- the sand by its state ----
    m = mat == 1
    # the sand's raking light (see the dry sand below): the big forms from the smoothed rake in clean groups, the
    # ripples' fine relief on top
    z_ = float(d.get("zoom", 1.0))
    lr = np.clip((n * RAKE).sum(-1), 0, 1)
    lr_big = nd.gaussian_filter(lr, 5.0 * z_)
    groups = np.floor(lr_big * 4.0 + 0.5) / 4.0
    RAKE_T = 0.1 + 0.3 * groups + 0.22 * np.clip(lr - lr_big, -0.3, 0.3) - np.where(lr < 0.12, 0.05, 0.0)
    if m.any():
        tm, sm, tm_t = T[m], s[m], tt[m]
        wet = sm > lim[m]
        drying = (sm > lim[m] - 1.8) & ~wet
        # dry first on the horns and the high spots: the drying band's mottle
        mott = fbm(X[m] * 1.3, Y[m] * 1.3) + 0.35 * np.clip(c[m], 0, 1) - (sm - (lim[m] - 1.8)) / 1.8 * 0.6
        dry_patch = drying & (mott > 0.22)
        dry = ~wet & (~drying | dry_patch)
        # dry: charcoal lifted by its grain tops, paler where the wind sorted it finer on the backshore
        fine = np.clip((BF.BERM_S - 0.6 - sm) / 3.0, 0, 1)
        grain = vn(X[m] * 41.0, Y[m] * 41.0)
        # (2026-10-10, Derek: the sand "reads as a flat grey plain, not as sand, theres no curves to the ground ... the
        # desert sand tile we made was way better"): the overcast's dome lit every slope alike, so the landforms and the
        # ripples melted into one tone. As the dune (painted_dune.py): a low raking light, the dawn's bright band low
        # over the screen's upper left, turns the forms; the big forms take their tone from it smoothed, stepped into a
        # few clean groups (each lit face one tone, each shaded face another), and the ripples' own relief rides on top,
        # subordinate, their lee faces a step darker
        vd = tm * 0.22 + 0.06 * fine + np.where(grain > 0.78, 0.06, 0.0) - np.where(grain < 0.16, 0.035, 0.0)
        vd = vd + RAKE_T[m]
        # laid in dry-brush strokes along the ripple crests (the painted standard, rule 4): a stretched noise, long
        # along the shore and thin across it, a step lighter where the brush catches the tops, a step darker in the
        # hollows, only where the light grazes
        stroke = vn(tm_t * 0.9 + fbm(sm * 0.3, tm_t * 0.3) * 1.5, sm * 9.0)
        lit = np.clip((tm - 0.35) * 3.0, 0, 1)
        vd = vd + np.where(stroke > 0.7, 0.07, np.where(stroke < 0.22, -0.05, 0.0)) * lit
        cd = tone(R_SAND, np.clip(vd, 0, 0.99), dith[m], band=0.08)
        # wet matte: the darkest value in the frame, the grain gone
        vw = tm * 0.55 + (vn(X[m] * 5, Y[m] * 5) - 0.5) * 0.05
        vw = vw + np.where(vn(tm_t * 0.7 + 3, sm * 7.0) > 0.74, 0.05, 0.0) * np.clip((tm - 0.3) * 3.0, 0, 1)
        cw = tone(R_WET, np.clip(vw, 0, 0.99), dith[m], band=0.06)
        col = np.where(dry[:, None], cd, cw)
        # the stain (chapter 13, section 6): below the high-tide line the Red has filmed the sand; wet it is maroon, dried
        # it is a brown-black crust in patches; clean charcoal above
        below = sm > ht[m]
        stain_w = below & ~dry
        col = np.where(stain_w[:, None], col * 0.92 + np.array([0.016, 0.003, 0.004]) * (0.5 + tm[:, None]), col)
        crust = below & dry & (fbm(X[m] * 2.2 + 9, Y[m] * 2.2) > 0.48)
        col = np.where(crust[:, None], col * 0.7 + np.array([0.05, 0.028, 0.024]) * (0.4 + tm[:, None]), col)
        # the swash marks: the last few waves' tops, seaward-concave arcs of fine grit and pink residue, crossing; the
        # freshest lowest; broken, a pixel wide
        for k in range(5):
            cell = np.floor(tm_t / BF.CUSP + 0.5)
            rk = (4.0 + 2.2 * BF._h1(cell * 3.0 + k, 17.0 + k) - 1.4 * c[m]) * (0.85 + 0.06 * k)
            line = BF.WATER - rk + 0.25 * np.sin(tm_t * (0.6 + 0.1 * k) + k)
            on = ((np.abs(sm - line) < 0.06 + 0.02 * k) & (vn(tm_t * 1.3 + k * 7, sm * 0.5) > 0.45)
                  & (vn(X[m] * 23 + k, Y[m] * 23) > 0.62) & (sm < fr[m] - 0.15))
            ck = np.array([0.16, 0.1, 0.1]) if k < 2 else np.array([0.1, 0.075, 0.07])
            col = np.where(on[:, None], col * 0.4 + ck * (0.5 + tm[:, None]) * 0.9, col)
        # beyond the cove's back rim: ground no one walks and the camera cannot honestly see (as Diablo II leaves what
        # lies past its walls): near dark, a breath of the sand's own grain
        beyond = (BF.cove_d(sm, tm_t) > 2.5) & (sm < BF.COVE_MID)
        col = np.where(beyond[:, None], tone(R_WET, np.clip(0.12 + tm * 0.12 + (grain - 0.5) * 0.06, 0, 0.99), dith[m], band=0.04), col)
        # the prints (the one true detail): each hollow holds the blood that came up out of the Red with the feet,
        # dark and glossy, the sky caught on its far lip; the squeezed ridge round it a breath lighter where the key finds it
        _, dep = BF.prints(sm, tm_t)
        blood = dep > 0.014
        bcol = np.array([0.1, 0.022, 0.026]) * (0.55 + 0.6 * tm[:, None])
        col = np.where(blood[:, None], bcol, col)
        far = blood & (n[m][:, 2] < 0.93) & ((n[m] * VIEW).sum(1) < 0.45)
        col = np.where(far[:, None], np.array([0.3, 0.17, 0.18]) * (0.6 + 0.5 * tm[:, None]), col)
        lip = (~blood) & (dep <= 0) & (BF.trail_dist(sm, tm_t) < 0.3) & (key[m] > 0.62)
        col = np.where(lip[:, None], col * 1.15 + 0.01, col)
        img[m] = col

    # ---- the stones the sea sorted ----
    m = mat == 4
    if m.any():
        tm = T[m]
        wetp = s[m] > lim[m]
        v = tm * (0.75 + 0.35 * oh[m]) * np.where(wetp, 0.7, 1.0)
        col = tone(R_PEB, np.clip(v, 0, 0.99), dith[m], band=0.1)
        # a tiny wet highlight on the rounded tops of the wet ones; a rare chip of green glass
        hi = wetp & (up[m] > 0.9) & (key[m] > 0.6) & (oh2[m] > 0.4)
        col = np.where(hi[:, None], np.array([0.36, 0.33, 0.36]), col)
        glass = oh[m] < 0.012
        col = np.where(glass[:, None], np.array([0.17, 0.32, 0.27]) * (0.6 + tm[:, None]), col)
        img[m] = col

    # ---- the cliffs' basalt (report 07's stone, under the overcast) ----
    m = mat == 20
    if m.any():
        tm = T[m]
        wall = np.abs(up[m]) < 0.4
        along = np.where(np.abs(n[m][:, 0]) > np.abs(n[m][:, 1]), Y[m], X[m])
        # the cave's raw stone (Derek: "that raw gritty rough texture that you did inside of the cave"; paint_cave's
        # basalt): each column its own step of value; laid in strokes along the column on its faces and across its top
        tb = tm * (0.6 + 0.42 * oh[m]) + (oh2[m] - 0.5) * 0.05
        st_w = vn(along * 5.0 + oh[m] * 13, Z[m] * 0.5) - 0.5
        st_t = vn((X[m] + Y[m]) * 3.0 + oh[m] * 7, (X[m] - Y[m]) * 0.8) - 0.5
        lit_ = np.clip(tm * 2.0, 0, 1)
        tb = tb + np.where(wall, st_w, st_t) * 0.22 * lit_
        # grit: the rough grain of the rock, pale specks where a crystal catches the light, dark pits between
        grit = vn(X[m] * 37 + Z[m] * 13, Y[m] * 37 - Z[m] * 11)
        tb = np.where((grit > 0.76) & (tm > 0.3), tb + 0.045, tb)       # the pale specks held back in daylight (they
        tb = np.where((grit < 0.22) & (tm > 0.08), tb - 0.09, tb)        # read as snow), the dark grain kept
        grit2 = vn(X[m] * 71 + 3, Y[m] * 71 + Z[m] * 71)
        tb = np.where((grit2 > 0.8) & (tm > 0.1), tb - 0.07, tb)
        pit = vn(X[m] * 9 + 5, Y[m] * 9 + Z[m] * 9) > 0.8
        tb = np.where(pit, tb - 0.08, tb)
        # each drum read by its joint: the gap between drums holds the dark
        tb = np.where(wall & (ao[m] < 0.55), tb * 0.55, tb)
        # long dark runs down the faces where the weather has wept from every joint
        weep = wall & (vn(along * 9.0 + oh[m] * 17, Z[m] * 0.18) > 0.72) & (vn(along * 3, Z[m] * 2) > 0.3)
        tb = np.where(weep, tb * 0.72, tb)
        # wet and red-black below the splash line, where the Red reaches them
        splash = (Z[m] < 1.4 + 0.5 * vn(along * 0.8, 2.0)) & (s[m] > 60.0)
        tb = np.where(splash, tb * 0.6, tb)
        col = tone(R["basalt"], np.clip(tb * 0.78, 0, 0.99), dith[m], band=0.1)
        col = np.where(splash[:, None], col * 0.75 + np.array([0.05, 0.008, 0.01]), col)
        # rust weeping down from the joints in long thin runs; pale mineral in the crevices where the light finds it
        rust = wall & (vn(along * 7.0 + oh[m] * 31, Z[m] * 0.3) > 0.74) & (oh2[m] > 0.35) & (tm > 0.18) & ~splash
        col = np.where(rust[:, None], col * 0.55 + tone(R["rust"], np.clip(tb * 1.1, 0, 0.99), dith[m]) * 0.45, col)
        zeo = (ao[m] < 0.55) & (vn(X[m] * 19 + Z[m] * 7, Y[m] * 19 - Z[m] * 7) > 0.8) & (tm > 0.12)
        col = np.where(zeo[:, None], col * 0.4 + np.array([0.52, 0.55, 0.56]) * (0.35 + tm[:, None]) * 0.6, col)
        # the tide marks (the area page: "tide marks of dried red film"): wavering bands of dried blood crust round the
        # columns at the heights past tides reached, brown-black, each one broken
        for lvl, wd in ((0.55, 0.06), (0.95, 0.08), (1.45, 0.06), (2.05, 0.05)):
            zl = lvl + 0.12 * (vn(along * 1.3 + lvl * 7, 1.0) - 0.5)
            band = wall & (np.abs(Z[m] - zl) < wd) & (vn(along * 6 + lvl * 3, Z[m] * 4) > 0.35) & (s[m] > 58.0)
            # dried crust is matte and browner, a step lighter than the wet black rock round it
            col = np.where(band[:, None], col * 0.35 + np.array([0.2, 0.1, 0.085]) * (0.5 + tm[:, None]), col)
        # grey-green lichen crusts on the dry high ledges facing up
        lich = (up[m] > 0.55) & (Z[m] > 3.0) & (vn(X[m] * 9, Y[m] * 9) > 0.8)
        col = np.where(lich[:, None], col * 0.4 + np.array([0.2, 0.23, 0.2]) * (0.4 + tm[:, None]) * 0.8, col)
        img[m] = col

    # the weeping (the cave's, paint_cave): water has seeped from every crevice of the columns for longer than anyone
    # remembers and run down the faces below, leaving long dark mineral tears, a pale crust at their lips
    stone = (mat == 20) & (np.abs(up) < 0.4)
    crev = stone & (ao < 0.42)
    run = np.zeros((gh, gw))
    acc = crev.astype(float)
    colv = vn(np.arange(gw)[None, :] * 0.35 + 0.0 * np.arange(gh)[:, None], np.zeros((gh, gw)) + 3.0)
    for k_ in range(1, int(22 * float(d.get("zoom", 1.0)))):              # the run's length in world terms
        acc = np.roll(acc, 1, axis=0) * (0.9 + 0.08 * colv)
        acc[0, :] = 0
        run = np.maximum(run, acc)
    weep_c = stone & ~crev & (run > 0.45) & (vn(X * 3.0 + Y * 3.0, Z * 0.15) > 0.35)
    img = np.where(weep_c[..., None], img * 0.62, img)
    lipm = weep_c & ~np.roll(weep_c, 1, axis=1) & (T > 0.2)
    img = np.where(lipm[..., None], np.clip(img + np.array([0.05, 0.06, 0.06]) * T[..., None], 0, 1), img)

    # ---- the bone jam (Derek: "Turn the logs into bones"), and any drift wood: old and weathered, split along the
    # grain, pitted, spume caught on the seaward sides; the near plane, so dark but for the tops the sky finds ----
    big_bone = (mat == 11) & (obj > 0)
    if big_bone.any():
        sizes = np.bincount(obj[big_bone].ravel())
        big_bone &= sizes[np.clip(obj, 0, len(sizes) - 1)] > 25          # the jam's bones, not the dead's small ones
    for m, rmp in ((mat == 19, R_DRIFT), (big_bone, R_BONE_OLD)):
        if not m.any():
            continue
        tm = T[m]
        # each piece's own axis (its pixels' long direction on the ground), so the grain runs along it: split in long
        # checks, ridged, a breath lighter on the ridges
        along = np.zeros(int(m.sum()))
        across = np.zeros(int(m.sum()))
        om = obj[m]
        xm, ym = X[m], Y[m]
        for o in np.unique(om):
            k_ = om == o
            if k_.sum() < 6:
                continue
            px, py = xm[k_], ym[k_]
            cx_, cy_ = px.mean(), py.mean()
            cov = np.cov(np.stack([px - cx_, py - cy_]))
            w_, v_ = np.linalg.eigh(cov)
            ax = v_[:, 1]
            along[k_] = (px - cx_) * ax[0] + (py - cy_) * ax[1]
            across[k_] = -(px - cx_) * ax[1] + (py - cy_) * ax[0]
        ridge = vn(across * 26.0 + Z[m] * 26.0 + oh[m] * 40, along * 0.6)
        lift = 0.58 if rmp is R_BONE_OLD else 0.42                      # bone reads as bone: an old ivory-grey
        # turned as a volume: the five tones of form, so each bone is a round shaft with a lit side, a core shadow
        # and the sand's bounce under it, never a flat strip
        v = tm * (lift + 0.18 * oh[m]) + form_tones(n[m], ao[m], np.clip(d["moon"][m], 0, 1)) + (ridge - 0.5) * 0.08
        check = (np.abs(ridge - 0.5) < 0.04) & (vn(along * 1.5 + oh[m] * 9, across * 4) > 0.45)
        v = np.where(check, v - 0.18, v)
        if rmp is R_BONE_OLD:
            pit = (vn(X[m] * 19 + Z[m] * 11, Y[m] * 19 - Z[m] * 7) > 0.78) & (tm > 0.2)
            v = np.where(pit, v - 0.1, v)
        col = tone(rmp, np.clip(v, 0, 0.99), dith[m], band=0.06)
        seaward = n[m][:, 0] * (-1 / math.sqrt(2)) + n[m][:, 1] * (-1 / math.sqrt(2))       # toward +s
        spume = (seaward > 0.35) & (vn(X[m] * 6 + 3, Y[m] * 6 + Z[m] * 6) > 0.6) & (s[m] > 47.5)
        col = np.where(spume[:, None], tone(R_FOAM, np.clip(0.25 + tm * 0.45, 0, 0.99), dith[m]), col)
        img[m] = col

    # ---- the rest by their ramps ----
    for k, name in P3.MAT.items():
        if name in ("ground", "stone", "basalt", "cedar", "pool", "mirror", "foam"):
            continue
        m = mat == k
        if name == "bone":
            m = m & ~big_bone
        if not m.any():
            continue
        tm = T[m]
        rounded = name in ("corpse", "cloth", "bone", "wood", "iron", "rust", "kelp", "straw")
        if name in R:
            v_ = tm * (0.85 + 0.25 * oh[m]) * (0.8 if rounded else 1.0)
            if rounded:
                v_ = v_ + form_tones(n[m], ao[m], np.clip(d["moon"][m], 0, 1)) * 0.9
            col = tone(R[name], np.clip(v_, 0, 0.99), dith[m])
        else:
            col = tone(R["stone"], tm, dith[m])
        if name == "blood":
            col = tone(R["blood"], np.clip(tm * 0.2, 0, 0.99), dith[m])
        if name in ("corpse", "cloth") and True:
            # the drowned: out in the Red, soaked and stained with it; cloth goes near black, skin blotched dark red,
            # a wet glaze on the tops where the grey sky catches it
            insea = s[m] > BF.WATER - 1.0
            stain = np.where(insea, 0.6 if name == "cloth" else 0.5, 0.0)[:, None]
            col = col * (1 - stain) + np.array([0.09, 0.02, 0.025]) * (0.5 + tm[:, None]) * stain
            glaze = insea & (up[m] > 0.85) & (key[m] > 0.55) & (vn(X[m] * 9, Y[m] * 9) > 0.55)
            col = np.where(glaze[:, None], col * 0.6 + np.array([0.3, 0.2, 0.21]) * 0.5, col)
        if name in ("corpse", "cloth", "bone"):
            # the dead and their rags: wet where the Red still reaches them, stained below the high-tide line
            wb = s[m] > ht[m]
            col = np.where(wb[:, None], col * 0.72 + np.array([0.05, 0.01, 0.012]), col)
        img[m] = col

    # ---- the sea ----
    m = mat == 24
    if m.any():
        nm = n[m]
        cos = np.clip((nm * VIEW).sum(1), 0.02, 1)
        F = 0.02 + 0.98 * (1 - cos) ** 5
        depth = Z[m] - g[m]
        # what the surface mirrors: the grey sky, or something standing (the cliffs) that darkens it
        refl = d["refl"] if "refl" in d else np.zeros(pos.shape[:2] + (4,))
        hit = refl[m][:, 3] > 0.5
        rb = np.full(int(m.sum()), SKY)
        rb = np.where(hit, 0.12, rb)
        # the body: oxblood, darker in the hollows and the trough, under the lip darkest
        body = 0.05 + 0.05 * T[m]
        hb_s = BF.heart(t)
        v = body * (1 - F) + F * rb * 2.0
        # the swash sheet thinning over the sand: its last feathered edge shows the sand through, a maroon stain
        thin = np.clip(depth / 0.05, 0, 1)
        v = v * (0.75 + 0.25 * thin)
        # a breath of the wind's small ripples on the surface (no drawn lines: the swell's own normals carry the form)
        v = v + (vn(s[m] * 3.0 + tt[m] * 0.4, tt[m] * 6.0) - 0.5) * 0.02
        # faint strokes along the swell's run, the brush dragged with the flow; heavier where the glaze lies
        runs = vn(s[m] * 0.8 + fbm(tt[m] * 0.25, s[m] * 0.25) * 1.2, tt[m] * 6.0 - hb_s * 2.0)
        v = v + np.where(runs > 0.74, 0.025, np.where(runs < 0.2, -0.015, 0.0)) * (0.4 + 6.0 * F)
        col = tone(R_SEA, np.clip(v * 1.9, 0, 0.99), dith[m], band=0.05)
        # the skin (blood is thick: Derek): a dull film over the heavy surface, wrinkled into slow folds where the beat
        # has pushed it together (near the shore and behind the bore), smooth and lacquered where it lies still
        hb = BF.heart(t)
        push = np.clip(1.2 - np.abs(sm_ := s[m]) * 0 - (sm_ - BF.WATER) / 6.0, 0, 1) * (0.5 + 0.5 * vn(tt[m] * 0.4, sm_ * 0.4 + 3))
        wr = np.abs(_frac(vn(sm_ * 1.6 + hb * 0.3, tt[m] * 0.7) * 6.0 + fbm(X[m] * 1.5, Y[m] * 1.5) * 1.5) - 0.5) < 0.05
        crease = wr & (push > 0.45) & (vn(X[m] * 5, Y[m] * 5) > 0.35)
        col = np.where(crease[:, None], col * 0.72, col)
        # on the steep face the skin is stretched as the wave climbs: pulled into long slow streaks running down the
        # slope, a dull grey-pink sheen on the stretched lines, dark creases between, strongest where the face is steepest
        steep = np.clip((1.0 - n[m][:, 2]) * 3.0, 0, 1)
        flow = vn(tt[m] * 4.5 + fbm(sm_ * 0.4, tt[m] * 0.4) * 2.0, sm_ * 0.45 - hb * 0.6)
        broken = vn(X[m] * 2.2 + 7, Y[m] * 2.2 + Z[m] * 3) > 0.5          # the skin tears: no streak runs the whole face
        sheen_s = (flow > 0.8) & (steep > 0.4) & broken
        crease_s = (flow < 0.12) & (steep > 0.4) & ~broken
        col = np.where(sheen_s[:, None], col * 0.75 + np.array([0.2, 0.12, 0.12]) * 0.55, col)
        col = np.where(crease_s[:, None], col * 0.78, col)
        clot = (vn(X[m] * 1.7 + 40, Y[m] * 1.7) > 0.8) & (vn(X[m] * 6.0, Y[m] * 6.0) > 0.45) & (sm_ < BF.WATER + 6)
        col = np.where(clot[:, None], col * 0.8 + np.array([0.025, 0.012, 0.01]), col)
        edge = depth < 0.02
        col = np.where(edge[:, None], col * 0.6 + img[m] * 0.0 + np.array([0.06, 0.02, 0.022]), col)
        img[m] = col
        img = lace(img, d, m, s, tt, X, Y, age, fr, top, ps, rising, c, T, dith, t)

    # ---- the foam's lumps (stage A): solid, lit as a mass, their undersides and the forward shadow dark ----
    m = mat == 32
    if m.any():
        tm = T[m]
        # lit as one heaped mass: the tops that face the sky pale, the sides salmon, the contacts between the lumps and
        # the froth's foot dark, pocked with bubbles
        v = 0.08 + 0.5 * tm + 0.22 * np.clip(up[m], 0, 1) ** 2 - 0.25 * (1 - np.clip(ao[m], 0, 1)) + (oh[m] - 0.5) * 0.06
        pores = vn(X[m] * 37 + Z[m] * 23, Y[m] * 37 - Z[m] * 19) > 0.78
        v = np.where(pores, v - 0.12, v)
        img[m] = tone(R_FOAM, np.clip(v, 0, 0.99), dith[m], band=0.06)

    # ---- the glossy film: a mirror of the grey sky ----
    img = gloss(img, d, proj, T, dith)
    # the form's edges where the light grazes them (the lit lip a step up), never on the water
    ndf = np.zeros((gh, gw))
    ndf[:-1, :] += np.linalg.norm(n[1:, :] - n[:-1, :], axis=2)
    ndf[:, :-1] += np.linalg.norm(n[:, 1:] - n[:, :-1], axis=2)
    edge = (ndf > 0.6) & ((mat == 20) | (mat == 19) | (mat == 4)) & (key > 0.5)
    img = np.where(edge[..., None], np.clip(img * 1.18 + 0.01, 0, 1), img)
    # quiet darks: nothing but the contacts below the frame's darkest note
    floor_ = (alpha > 0.5) & (ao > 0.3)
    img = np.where(floor_[..., None], np.maximum(img, np.array([0.022, 0.018, 0.024])), img)
    img = np.where((alpha > 0.5)[..., None], img, R_SEA[1])
    tooth = (vn(X * 31 + Z * 17, Y * 31 - Z * 17) - 0.5) * 0.04
    return np.clip(img * (1 + tooth[..., None]), 0, 1), alpha


def lace(img, d, m, s, tt, X, Y, age, fr, top, ps, rising, c, T, dith, t):
    """stage B (chapter 13, section 3): the foam the bore laid, thinning as it ages and tearing into lace, holes in a
    sheet that grow and stretch; thickest where the water converges (the bays, the swash's top, the lee of the stacks);
    blood's foam lives long. A living mask on the water, never a scrolling texture"""
    out = img.copy()
    jj, ii = np.nonzero(m)
    sm, tm_ = s[m], tt[m]
    a = age[m]
    import beach_floor as BF
    zone = (sm < BF.break_s(tm_) - 0.6)
    amt = np.exp(-a / 0.45) * zone
    # the swash's top: a line of foam stranded as the uprush stops, draining as the backwash leaves it
    psm = ps[m]
    stranded = (np.abs(sm - top[m] - 0.15) < 0.25) & (psm > 0.18) & (psm < 0.6)
    amt = np.maximum(amt, stranded * 0.8)
    # the bays gather it
    amt = amt * (0.75 + 0.45 * np.clip(-c[m], 0, 1))
    # the holes: the sheet's cells stretched along the shore by the run of the water, opening as it ages
    u = tm_ * 0.75 + 0.15 * vn(sm * 0.8, tm_ * 0.8)
    v = sm * 1.25 - a * 0.6
    holes = cells(u, v, 0.3, 5.0)
    big = cells(u * 0.5 + 3, v * 0.5, 0.32, 9.0)
    open_ = 0.35 + 0.9 * a
    sheet = (holes > open_) & (big > 0.25 + 0.5 * a) & (amt > 0.18 + 0.25 * (fbm(X[m] * 0.9, Y[m] * 0.9) - 0.5))
    # the sheet has relief: fullest midway between its holes, thinning to dark edges round each one, pocked with small
    # bubbles; thick froth is a salmon-maroon that only goes pale where it is freshest and fullest
    full = np.clip((holes - open_) / 0.35, 0, 1)
    pores = cells(u * 3.1 + 5, v * 3.1, 0.3, 11.0) < 0.3
    lv = np.clip(0.03 + amt * 0.22 + T[m] * 0.12 - a * 0.25 + full * 0.22, 0, 0.55)
    lv = np.where(pores, lv - 0.12, lv)
    col = tone(R_FOAM, np.clip(lv, 0, 0.55), dith[m], band=0.06)
    # the thinnest strands half there: the sheet's edges draining into the red
    rim = sheet & (holes < open_ + 0.12)
    col = np.where(rim[:, None], col * 0.45 + img[m] * 0.55, col)
    out[jj, ii] = np.where(sheet[:, None], col, img[m])
    return out


def gloss(img, d, proj, T, dith):
    """the glossy film (mat 28): wet black sand under a sheet of draining water mirrors the grey sky, the lightest of the
    wet values; what stands above it (the cliffs, the dead, the logs) shows in it upside down and dark, softened by the
    film's own wrinkles"""
    mm = d["mat"] == 28
    if not mm.any() or "refl" not in d:
        return img
    out = img.copy()
    pos, refl = d["pos"], d["refl"]
    gh, gw = mm.shape
    jj, ii = np.nonzero(mm)
    hit = refl[jj, ii, 3] > 0.5
    P_ = refl[jj, ii, :3]
    sx, sy = proj(P_)
    # the film's wrinkles shift what it shows, a pixel or two along the shore
    wob = (vn(pos[jj, ii, 0] * 3.0, pos[jj, ii, 1] * 9.0) - 0.5) * 3.0
    sxi = np.clip((sx + wob).astype(int), 0, gw - 1)
    syi = np.clip(sy.astype(int), 0, gh - 1)
    on = (sx >= 0) & (sx < gw) & (sy >= 0) & (sy < gh)
    seen = hit & on & (np.linalg.norm(pos[syi, sxi] - P_, axis=1) < 0.5)
    # the sky in it: brightest where the film is thickest and flattest (low on the face), its wrinkles long along the
    # shore
    ss_, _ = S.st(pos[jj, ii, 0], pos[jj, ii, 1])
    lowf = np.clip((ss_ - 62.5) / 3.5, 0, 1)
    sky = tone(R_SAND, np.clip(0.46 + 0.16 * lowf + (vn(pos[jj, ii, 0] * 1.2, pos[jj, ii, 1] * 4.0) - 0.5) * 0.06, 0, 0.99),
               dith[jj, ii], band=0.04) * np.array([1.0, 0.8, 0.8])
    col = np.where(seen[:, None], img[syi, sxi] * 0.55 + sky * 0.1, np.where(hit[:, None], R_WET[2], sky))
    # where the film runs thinnest (its upper edge), the dark wet sand shows through in patches
    ed = np.zeros(mm.shape)
    ed[mm] = 1
    dist = nd.distance_transform_edt(ed)[jj, ii]
    patchy = (dist < 3 * float(d.get("zoom", 1.0))) & (vn(pos[jj, ii, 0] * 7, pos[jj, ii, 1] * 7) > 0.5)
    col = np.where(patchy[:, None], img[jj, ii] * 0.5 + col * 0.5, col)
    out[jj, ii] = col
    return out


def place_hero(big, d, hero, focus, gw, gh):
    """the Ossuarch at true size, and where he stands on the glossy film or in the sheet, his reflection under him,
    upside down, dark and broken by the water's wrinkles (chapter 13: the film shows the pilgrim)"""
    meta = json.load(open(os.path.join(P3.ROOT, "art", "sprites", "ossuarch_hd.json")))
    sheet = Image.open(os.path.join(P3.ROOT, "art", "sprites", "ossuarch_hd.png")).convert("RGBA")
    _, x, y, w, h, dx, dy = meta["idx"]["idle/front_l/0"]
    fr = sheet.crop((x, y, x + w, y + h))
    k = 0.78
    fr = fr.resize((max(1, int(w * k)), max(1, int(h * k))), Image.NEAREST)
    a = np.array(fr).astype(float) / 255
    hx, hy, hz = hero
    sx = ((hx - hy) - (focus[0] - focus[1])) * P3.KX + gw / 2
    sy = ((hx + hy) - (focus[0] + focus[1])) * P3.KY - hz * P3.KZ + gh / 2
    X0, Y0 = int(sx * 4 + dx * k), int(sy * 4 + dy * k)
    feet = int(sy * 4)
    glossy = np.isin(d["mat"], (28, 24))
    g4 = np.repeat(np.repeat(glossy, 4, 0), 4, 1)
    H, W = big.shape[:2]
    for j in range(a.shape[0]):
        yy = 2 * feet - (Y0 + j) + 2
        if not (0 <= yy < H):
            continue
        sh = int(round(math.sin(yy * 0.35) * 2.0))
        for i0 in range(a.shape[1]):
            xx = X0 + i0 + sh
            if 0 <= xx < W and a[j, i0, 3] > 0.5 and g4[yy, xx] and (yy // 2) % 4 != 0:
                big[yy, xx] = big[yy, xx] * 0.5 + a[j, i0, :3] * 0.25
    return P3.place_hero(big, d, hero, focus, gw, gh)


def main():
    args = list(sys.argv[1:])
    frames = 1
    if "--frames" in args:
        frames = int(args[args.index("--frames") + 1])
        del args[args.index("--frames"):args.index("--frames") + 2]
    pdir, out = args[0], args[1]
    d = dict(np.load(os.path.join(pdir, "passes.npz")))
    hero = tuple(float(v) for v in args[2:5]) if len(args) > 4 else None
    focus = tuple(float(v) for v in args[5:7]) if len(args) > 6 else (0.0, 0.0)
    t = float(d["time"]) if "time" in d else 0.0
    img, alpha = paint(d, t, hero)
    gh, gw = img.shape[:2]
    big = np.repeat(np.repeat(img, 4, 0), 4, 1)
    if hero:
        big = place_hero(big, d, hero, focus, gw, gh)
    Image.fromarray((np.clip(big, 0, 1) * 255).astype(np.uint8)).save(out)
    print("saved", out)


if __name__ == "__main__":
    main()
