"""The Sunken Bog's chambers (study scenes; log `tools/landkit/passes/spine_path.md`). Derek 2026-10-08: "large open
marsh areas where the player can walk around a bit and choose different paths. These can be just raw nature in the big,
some can be ancient ruins, maybe a straw hut with a wisp fire in a pit, a giant eye socket and the top of a snake
skull ... Make sure the path can twist and turn too." Like D2's maggot lair: tight walks along the Long Back broken by
these larger places. Each is the bog scene (bog_scene.py) with its own ground, pieces and twisting Back.

  python tools/art_study/bog_chambers.py NAME OUT.png [value]      NAME: nature | ruins | hut | socket | skull
"""
import os
import sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bog_scene as bs                       # noqa: E402
import wood_scene as ws                      # noqa: E402
import vessel                                # noqa: E402
import bog_structures                        # noqa: E402
from kit import vn, fbm                      # noqa: E402

C, AX, PERP, LEVEL = bs.C, bs.AX, bs.PERP, bs.LEVEL


def set_origin(k):
    """each chamber its own place in the world (its own seeds for every bed of plants, every hummock and pool),
    so no two chambers share a foreground"""
    global C
    C = np.array([20.0 + 37.0 * k, 20.0 + 13.0 * k])
    bs.C = C
    ws.FOCUS = C.copy()


def twisting_line(seed, span=17.0, bends=((0.0, 3.4, 3.0),), n=1400):
    """the Back's line for a frame: in from one side, twisting (a few bends of its own sharpness), out the other.
    bends: (where along -1..1, how far it swings in yd, how tight)"""
    t = np.linspace(-1.0, 1.0, n)
    off = np.zeros(n)
    for (at, amp, tight) in bends:
        off = off + amp * np.tanh((t - at) * tight)
    off = off + np.sin(t * 2.3 + seed) * 1.0
    return C[None] + PERP[None] * (t * span)[:, None] + AX[None] * off[:, None]


def shelf(cx, cy, r, rise=0.16, seed=3):
    """a marsh shelf: ground risen just above the water table, hummock and hollow, a wide place to walk and choose"""
    def mod(X, Y, bed):
        from scipy import ndimage as nd
        d = np.hypot(X - cx, Y - cy) / r + (fbm(X * 0.25 + seed, Y * 0.25) - 0.5) * 0.7
        k = np.clip(1.15 - d, 0, 1) ** 0.6
        mean = nd.gaussian_filter(bed, 40)                                 # lift the ground as a whole, keep its own
        # hummock and hollow (the bog's grammar: the hollows still hold water, the hummocks stand out of it)
        hum = (fbm(X * 0.7 + seed, Y * 0.7) - 0.5) * 0.95 + (vn(X * 2.6, Y * 2.6 + seed) - 0.5) * 0.16
        return bed + k * np.clip(LEVEL + rise - mean, 0, None) + k * hum
    return mod
    return mod


def tendrils_round_post(px_, py_, h, seed):
    """the god's tendrils wound up a post, and the pale pustule in their grip"""
    def living(img, w, W, px, py, pz, L, T=0.0):
        GH, GW = img.shape[:2]
        zb = np.full((GH, GW), -1e9)
        dep = px + py
        g = LEVEL
        hero = np.array(ws.HERO, float)
        lts = [((hero[0] + 0.25, hero[1] - 0.25, float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1]))) + 0.7),
                (0.95, 0.6, 0.32), 2.6 * 1.4)]
        rr = np.random.default_rng(seed)
        for k in range(3):
            ph = rr.uniform(0, 2 * np.pi)
            turns = rr.uniform(1.2, 2.2)
            zs = np.linspace(g - 0.1, g + h * rr.uniform(0.55, 0.9), 60)
            a = ph + np.linspace(0, turns * 2 * np.pi, 60)
            rad = 0.26 + 0.04 * np.sin(a * 3)
            P = np.stack([px_ + np.cos(a) * rad, py_ + np.sin(a) * rad, zs], 1)
            vessel.draw(img, zb, dep, ws.to_px, P, 0.075, T, lts, ws.SUN, seed=seed + k, tol=0.35,
                        ramp_=None, taper=True)
        c = (px_ + 0.18, py_ + 0.12, g + h * 0.62)
        img = bog_structures.pustule(img, zb, dep, ws.to_px, c, 0.2, T, ws.SUN)
        return img
    return living


def scene_nature():
    set_origin(1)
    bs.LINE = twisting_line(2, bends=((-0.35, 3.6, 4.0), (0.3, -3.2, 5.0)))
    bs.BED_MODS[:] = [shelf(*(C - AX * 4.5 + PERP * 2.0), 7.5)]
    bs.DROWNED_TREES = [(C + AX * 6.0 - PERP * 8.0, 0.4, 6.0, 71)]
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = []
    post = C + AX * 1.6 + PERP * 1.6
    bs.STRUCTS[:] = [("stump", *(C - AX * 6.0 + PERP * 5.0), 0.55, 81),
                     ("snag", *(C + AX * 2.5 + PERP * 6.5), np.arctan2(PERP[1], PERP[0]) + 0.5, 6.5, 0.36, 82),
                     ("post", post[0], post[1], 0.22, 1.8, 83)]
    bs.EXTRA_LIVING[:] = [tendrils_round_post(post[0], post[1], 1.8, 84)]
    ws.HERO = bs.LINE[len(bs.LINE) // 2] + AX * 0.2                  # on the Back


# ---------------------------------------------------------------- the straw hut and its wisp-fire pit
R_THATCH = None


def straw_hut(hx, hy, R=1.8, wall_h=1.05, pitch=0.95, pit_at=None, seed=5):
    """a bog folk's hut on its hump (they who walk the Long Back): round, its low wall of wattle daubed with peat-mud,
    its roof a cone of reed thatch laid in courses, ragged at the eave, a smoke hole at its peak; before its door a pit
    ringed with stones where wisp-fire burns cold. Height in the world; the door is drawn on the wall's face (part 41)"""
    px_, py_ = pit_at

    def st(X, Y, H, W):
        part = np.zeros(X.shape, int)
        d = np.hypot(X - hx, Y - hy)
        th = np.arctan2(Y - hy, X - hx)
        base = float(np.median(H[(d < R) & (d > R * 0.5)])) if ((d < R) & (d > R * 0.5)).any() else LEVEL + 0.2
        base = max(base, LEVEL + 0.1)
        rag = (vn(th * 9 + seed, 1.0) - 0.5) * 0.12
        wall = d < R + rag
        course = np.floor((R - d) / 0.28)
        roof = base + wall_h + np.clip(R + rag - d, 0, None) * pitch - (((R - d) / 0.28 - course) < 0.2) * 0.03
        roof = roof + (vn(th * 30 + course * 3, d * 6) - 0.5) * 0.04
        hole = d < 0.16
        roof = np.where(hole, base + wall_h + R * pitch - 0.35, roof)
        H2 = np.where(wall & (roof > H), roof, H)
        part[wall] = 40
        # the wall's face shows below the eave: the band of the cone within a hand of its rim is the thatch fringe,
        # the rest of what the camera sees down the side is the daubed wall (painted by height in EXTRA_PAINT)
        # the pit: a ring of stones, a hollow inside
        dp = np.hypot(X - px_, Y - py_)
        ring = (dp > 0.45) & (dp < 0.7)
        stone_id = np.floor((np.arctan2(Y - py_, X - px_) + np.pi) / (2 * np.pi) * 11)
        stone_h = LEVEL + 0.22 + ((np.sin(stone_id * 12.9 + seed) * 4375.5) % 1.0) * 0.12
        gap = (((np.arctan2(Y - py_, X - px_) + np.pi) / (2 * np.pi) * 11) % 1.0) < 0.12
        sz = stone_h - (np.abs(dp - 0.575) / 0.125) ** 2 * 0.1
        mring = ring & ~gap & (sz > H2)
        H2 = np.where(mring, sz, H2)
        part[mring] = 42
        hollow = dp <= 0.45
        H2 = np.where(hollow, np.minimum(H2, LEVEL + 0.05), H2)
        part[hollow] = 43
        # the eave: the thatch overhangs the wall, ragged, a little drooping
        eave = (d >= R + rag) & (d < R + 0.28 + rag * 1.5)
        ez = base + wall_h - (d - R) * 0.6 + (vn(th * 40, 3.0) - 0.5) * 0.06
        me = eave & (ez > H2)
        H2 = np.where(me, ez, H2)
        part[me] = 40
        door_a = np.arctan2(py_ - hy, px_ - hx)
        # what the bog folk keep (the real bog: turf is cut and stacked to dry by the door; a flat punt for the water)
        sa_ = door_a + 1.3
        tx, ty = hx + np.cos(sa_) * (R + 1.1), hy + np.sin(sa_) * (R + 1.1)
        u = (X - tx) * np.cos(sa_ + 1.57) + (Y - ty) * np.sin(sa_ + 1.57)
        v = -(X - tx) * np.sin(sa_ + 1.57) + (Y - ty) * np.cos(sa_ + 1.57)
        stack = (np.abs(u) < 0.7) & (np.abs(v) < 0.35)
        brick = np.floor(u / 0.24) + np.floor(v / 0.16) * 7
        sz_ = base + 0.55 - np.abs(u) * 0.25 + ((np.sin(brick * 12.9) * 4375.5) % 1.0) * 0.06
        gapb = (((u / 0.24) % 1.0) < 0.12) | (((v / 0.16) % 1.0) < 0.15)
        ms = stack & (sz_ > H2)
        H2 = np.where(ms, sz_ - gapb * 0.05, H2)
        part[ms] = 44
        pa_ = door_a - 1.6                                                  # the punt, drawn up at the shelf's edge
        bx, by = hx + np.cos(pa_) * (R + 3.4), hy + np.sin(pa_) * (R + 3.4)
        bu = (X - bx) * np.cos(pa_) + (Y - by) * np.sin(pa_)
        bv = -(X - bx) * np.sin(pa_) + (Y - by) * np.cos(pa_)
        hull = (np.abs(bu) < 1.5) & (np.abs(bv) < 0.42 * np.clip(1.4 - np.abs(bu) / 1.5, 0, 1))
        gun = hull & (np.abs(bv) > 0.42 * np.clip(1.4 - np.abs(bu) / 1.5, 0, 1) - 0.07)
        bz = LEVEL + np.where(gun, 0.28, 0.08) - bu * 0.05
        mb = hull & (bz > H2 - 0.15)
        H2 = np.where(mb, bz, H2)
        part[mb] = 45
        W["hut"] = dict(c=(hx, hy), R=R, base=base, wall_h=wall_h, door=door_a)
        return H2, part
    return st


def hut_paint(col, W, px, py, pz, L, vv, gl, st):
    if "hut" not in W:
        return col
    h = W["hut"]
    hz = pz - h["base"]
    th = np.arctan2(py - h["c"][1], px - h["c"][0])
    d = np.hypot(px - h["c"][0], py - h["c"][1])
    thatch_r = np.array([0.24, 0.2, 0.14])
    tv = vv * 0.9 + (vn(th * 40, hz * 12) - 0.5) * 0.18                       # reed ends: a fine combed grain down the slope
    thatch = thatch_r[None, None] * (0.35 + tv[..., None] * 0.9)
    mossy = vn(px * 4, py * 4) > 0.62
    thatch = np.where(mossy[..., None], np.array([0.14, 0.17, 0.09]) * (0.4 + vv[..., None]), thatch)
    daub = np.array([0.2, 0.17, 0.14]) * (0.35 + vv[..., None] * 0.8) * (1 + (vn(px * 13, pz * 13)[..., None] - 0.5) * 0.25)
    is_hut = st == 40
    side = is_hut & (hz < h["wall_h"] - 0.12) & (d > h["R"] - 0.25)          # the daubed wall below the eave
    fringe = is_hut & (hz >= h["wall_h"] - 0.12) & (hz < h["wall_h"] + 0.12) & (d > h["R"] - 0.3)
    col = np.where(is_hut[..., None], thatch, col)
    col = np.where(side[..., None], daub, col)
    col = np.where(fringe[..., None], thatch * 0.75, col)
    da = np.abs(((th - h["door"] + np.pi) % (2 * np.pi)) - np.pi)
    door = side & (da < 0.28) & (hz < h["wall_h"] - 0.15)
    dframe = side & (da >= 0.28) & (da < 0.36)
    col = np.where(door[..., None], np.array([0.02, 0.018, 0.02]) + vv[..., None] * 0.02, col)
    col = np.where(dframe[..., None], np.array([0.16, 0.13, 0.1]) * (0.5 + vv[..., None]), col)
    hole = is_hut & (d < 0.2) & (hz > h["wall_h"])                         # the smoke hole, dark, soot round it
    col = np.where(hole[..., None], np.array([0.02, 0.02, 0.02]), col)
    soot = is_hut & (d >= 0.2) & (d < 0.45) & (hz > h["wall_h"])
    col = np.where(soot[..., None], col * 0.55, col)
    turf = np.array([0.16, 0.11, 0.08]) * (0.35 + vv[..., None] * 0.8) * (1 + (vn(px * 21, py * 21)[..., None] - 0.5) * 0.3)
    col = np.where((st == 44)[..., None], turf, col)
    plank = np.array([0.2, 0.17, 0.13]) * (0.35 + vv[..., None] * 0.8) * (1 - (np.abs(np.sin((px + py) * 18)) < 0.15)[..., None] * 0.35)
    col = np.where((st == 45)[..., None], plank, col)
    stone = np.array([0.22, 0.23, 0.22]) * (0.35 + vv[..., None] * 0.85) * (1 + (vn(px * 9, py * 9)[..., None] - 0.5) * 0.3)
    col = np.where((st == 42)[..., None], stone, col)
    col = np.where((st == 43)[..., None], np.array([0.05, 0.05, 0.05]) + vv[..., None] * 0.03, col)
    return col


def pit_fire(px_, py_):
    """the wisp-fire in the pit: cold, small, always burning; its pale light on the stones of the ring"""
    import wisp_fire

    def living(img, w, W, px, py, pz, L, T=0.0):
        GH, GW = img.shape[:2]
        keep = wisp_fire.LIFE
        wisp_fire.LIFE = 1.0
        for k, (ox, oy, ph) in enumerate(((0.0, 0.0, 0.1), (0.12, -0.08, 0.55), (-0.1, 0.07, 0.8))):
            img = wisp_fire.draw(img, ws.to_px, np.full((GH, GW), -1e9), [(px_ + ox, py_ + oy, LEVEL + 0.12, ph, 300 + k)], T)
        wisp_fire.LIFE = keep
        d = np.hypot(px - px_, py - py_)
        glow = np.clip(1 - d / 1.9, 0, 1) ** 1.6 * 0.55 * (0.85 + 0.15 * np.sin(2 * np.pi * T * 3))   # it lights its ring
        img = np.clip(img + glow[..., None] * np.array([0.5, 0.6, 0.75]) * 0.45, 0, 1)
        return img
    return living


def scene_hut():
    set_origin(2)
    bs.LINE = twisting_line(4, bends=((-0.5, -3.0, 4.5), (0.15, 3.6, 3.5), (0.65, -2.0, 6.0)))
    hc = C - AX * 4.2 - PERP * 1.0
    pit = hc + AX * 2.6 + PERP * 0.6
    bs.BED_MODS[:] = [shelf(*(hc + AX * 0.8), 6.5, rise=0.22, seed=9)]
    bs.DROWNED_TREES = [(C + AX * 6.5 + PERP * 7.0, 0.38, 5.5, 72)]
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = []
    bs.STRUCTS[:] = [("stump", *(hc - PERP * 4.2 + AX * 1.0), 0.45, 91)]
    bs.EXTRA_STAMPS[:] = [straw_hut(hc[0], hc[1], pit_at=pit)]
    bs.EXTRA_PAINT[:] = [hut_paint]
    bs.EXTRA_LIVING[:] = [pit_fire(pit[0], pit[1])]
    ws.HERO = pit + AX * 0.9 + PERP * 2.2                              # beside the pit, not over it


# ---------------------------------------------------------------- bone set pieces: the eye socket and the skull
def _bone_col(vv, px, py, crest):
    mott = (vn(px * 2.3 + 5, py * 2.3) - 0.5) * 0.14 + (vn(px * 9, py * 9) - 0.5) * 0.05
    b = bs._r(bs.R_BONE, vv * 0.9 + mott)
    c = bs._r(bs.R_CROWN, vv * 0.92 + mott * 0.6)
    return np.where(crest[..., None], c, b)


def eye_socket(cx, cy, rx=4.2, ry=3.2, ang=0.4, seed=7):
    """THE GIANT EYE SOCKET: an orbit of a skull buried in the bog, the god's or the serpent's, the people do not agree.
    Its rim of bone stands out of the peat, thick and high at the brow, thinner at the cheek; its bowl is full of black
    water; deep in it a pale ring shows, the lore's "a pool that looks back like an eye" (Act I: the Hide showing through)"""
    ca, sa = np.cos(ang), np.sin(ang)

    def st(X, Y, H, W):
        part = np.zeros(X.shape, int)
        u = ((X - cx) * ca + (Y - cy) * sa) / rx
        v = (-(X - cx) * sa + (Y - cy) * ca) / ry
        r = np.hypot(u, v) + (fbm(X * 0.8 + seed, Y * 0.8) - 0.5) * 0.08
        th = np.arctan2(v, u)
        brow = np.clip(np.cos(th - 1.9), 0, 1) ** 1.5                      # the brow: the rim's thick high side
        rim_w = 0.08 + 0.16 * brow + (vn(th * 4 + seed, 2.0) - 0.5) * 0.05
        rim_h = LEVEL + 0.25 + 1.4 * brow + (vn(th * 5 + seed, 1.0) - 0.5) * 0.4
        prof = np.clip(1 - ((r - 1.0) / rim_w) ** 2, 0, 1)
        gapc = [0.4 + seed * 0.1, 3.6 + seed * 0.05, 5.1]                    # broken right through in three places
        notch = np.zeros(th.shape, bool)
        for g_ in gapc:
            notch |= np.abs(((th - g_ + np.pi) % (2 * np.pi)) - np.pi) < 0.12 + 0.05 * vn(r * 9, g_)
        rim = rim_h * np.sqrt(prof) + (1 - np.sqrt(prof)) * H
        crack = np.abs(np.sin(th * 23 + vn(th * 3, r * 4) * 3)) < 0.06
        # bone at its own scale: nutrient pits (foramina) in the rim, the outer shell flaked away in patches, the
        # grain running round the orbit
        hs_ = lambda a, b, k: (np.sin(a * 12.9 + b * 78.2 + k * 3.7) * 4375.5) % 1.0
        ci, cj = np.floor(X / 0.6), np.floor(Y / 0.6)
        fx_, fy_ = (ci + 0.2 + 0.6 * hs_(ci, cj, 1)) * 0.6, (cj + 0.2 + 0.6 * hs_(ci, cj, 2)) * 0.6
        foram = (np.hypot(X - fx_, Y - fy_) < 0.06) & (hs_(ci, cj, 3) < 0.35)
        flake = vn(X * 3.1 + seed, Y * 3.1) > 0.66
        grain = np.abs(np.sin(th * 60 + vn(th * 9, r * 9) * 2)) < 0.1
        rim = (rim - crack * 0.06 - foram * 0.08 - flake * 0.035 - grain * 0.012
               + (vn(X * 14 + seed, Y * 14) - 0.5) * 0.04 + (vn(X * 40, Y * 40) - 0.5) * 0.015)
        m = (prof > 0) & ~notch & (rim > H)
        H2 = np.where(m, rim, H)
        part[m] = 50
        bowl = r < 1.0 - rim_w * 0.6
        depth = LEVEL - 0.15 - 0.9 * np.clip(1 - r, 0, 1) ** 0.7
        H2 = np.where(bowl, np.minimum(H2, depth), H2)
        W["socket"] = dict(c=(cx, cy), rx=rx, ry=ry, ang=ang)
        return H2, part
    return st


def socket_paint(col, W, px, py, pz, L, vv, gl, st):
    m = st == 50
    if m.any():
        crest = (pz - LEVEL) > 0.75
        bc = _bone_col(vv, px, py, crest)
        low = (pz - LEVEL) < 0.3
        bc = np.where(low[..., None], bs._r(bs.R_ALGAE, vv * 0.95), bc)          # slimed where the water stood
        col = np.where(m[..., None], bc, col)
    return col


def socket_eye(img, w, W, px, py, pz, L, T=0.0):
    """the pale ring deep in the socket's water: barely there, the iris of something under the bog looking up"""
    if "socket" not in W:
        return img
    s_ = W["socket"]
    ca, sa = np.cos(s_["ang"]), np.sin(s_["ang"])
    u = ((px - s_["c"][0]) * ca + (py - s_["c"][1]) * sa) / (s_["rx"] * 0.42)
    v = (-(px - s_["c"][0]) * sa + (py - s_["c"][1]) * ca) / (s_["ry"] * 0.42)
    r = np.hypot(u, v)
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    br = 0.8 + 0.2 * np.sin(2 * np.pi * T)
    wob = (vn(px * 3 + T * 2, py * 9) - 0.5) * 0.08                          # seen through moving water
    # the eye under the water: a pale clouded iris with fine radial threads, a black pupil, a dull rim round it;
    # dimmed and wobbled by the water over it, but there to be found ("a pool that looks back like an eye")
    rw = r + wob
    ang_ = np.arctan2(v, u)
    iris = water & (rw > 0.3) & (rw < 0.82)
    thread = np.abs(np.sin(ang_ * 26 + rw * 6)) < 0.25
    ic = np.array([0.2, 0.21, 0.16]) * (0.75 + 0.25 * thread[..., None]) * (1.15 - rw[..., None] * 0.5) * br
    img[iris] = img[iris] * 0.45 + ic[iris]
    ring = water & (np.abs(rw - 0.86) < 0.06)
    img[ring] = img[ring] * 0.6
    pup = water & (rw <= 0.3)
    img[pup] = img[pup] * 0.35
    return img


def serpent_skull(cx, cy, ang, length=9.0, width=5.6, height=0.55, seed=11):
    """THE TOP OF THE SERPENT'S SKULL breaking the marsh: a long, flattish braincase, the Back running into its rear;
    a crest along its middle; the two great orbits forward at its sides, full of black water, brow ridges over them;
    the snout tapering to its nostril pits; sutures zigzagging across the plates; the jaws long sunk in the peat"""
    ca, sa = np.cos(ang), np.sin(ang)

    def st(X, Y, H, W):
        part = np.zeros(X.shape, int)
        u = ((X - cx) * ca + (Y - cy) * sa) / (length / 2)                   # -1 rear .. +1 snout
        v = (-(X - cx) * sa + (Y - cy) * ca) / (width / 2)
        # its outline from above: widest behind the eyes (the jaws' hinges), tapering to a rounded snout (a spade)
        w = np.interp(u, [-1.0, -0.75, -0.35, 0.2, 0.6, 0.9, 1.0], [0.55, 0.95, 1.0, 0.78, 0.55, 0.36, 0.0])
        q = v / np.maximum(w, 0.05)
        inside = (np.abs(q) < 1) & (u > -1) & (u < 1)
        z = LEVEL - 0.25 + height * np.sqrt(np.clip(1 - q ** 2, 0, 1)) * np.clip(1.15 - np.abs(u) ** 2.5, 0, 1)
        z = z + np.exp(-(q / 0.1) ** 2) * np.clip(0.5 - u, 0, 1.2) * 0.22       # the crest along the braincase
        # the great eye hollows: forward, at the sides, inside the outline; deep, holding water; a brow ridge over each
        for sg in (-1, 1):
            d = np.hypot((u - 0.25) / 0.28, (q - sg * 0.52) / 0.4)          # big orbits: both seen over the low dome
            z = np.where(d < 1, np.minimum(z, LEVEL - 0.25 - (1 - d) * 0.45), z)
            brow = np.clip(1 - np.abs(d - 1.12) / 0.16, 0, 1) * 0.42         # a raised rim right round each orbit
            z = z + brow * (d >= 1)
            nd_ = np.hypot((u - 0.86) / 0.05, (q - sg * 0.35) / 0.16)       # the nostril pits at the snout
            z = np.where(nd_ < 1, z - 0.3, z)
        z = z + np.clip(u - 0.7, 0, None) * 0.5                               # the snout lifts a little at its tip
        sut = ((np.abs(np.sin(u * 7 + np.sin(q * 9) * 0.5)) < 0.05) | (np.abs(q - np.sin(u * 14) * 0.04) < 0.03)) & inside
        z = z - sut * 0.04 + (vn(X * 18 + seed, Y * 18) - 0.5) * 0.015
        m = inside & (z > H) & (z > LEVEL)                               # below the water line the hollows hold water
        H2 = np.where(inside & (z <= LEVEL), np.minimum(H, LEVEL - 0.3), np.where(m, z, H))
        part[m] = 52
        part[m & sut] = 53
        # the teeth: a row along the jaw's edge at the water line, small, curved back, many (a serpent's are)
        edge_d = (np.abs(q) - 1.0) * np.maximum(w, 0.05) * width / 2          # yd outside the outline
        tid = np.floor((u + 1) * length / 2 / 0.28)
        tph = ((u + 1) * length / 2 / 0.28) - tid
        tooth = (edge_d > -0.05) & (edge_d < 0.22) & (np.abs(tph - 0.5) < 0.3 * (1 - edge_d / 0.22)) & (u > -0.35) & (u < 0.95)
        tz = LEVEL + 0.08 + 0.18 * (1 - edge_d / 0.22) * ((np.sin(tid * 12.9) * 4375.5) % 1.0 > 0.25)
        mt = tooth & (tz > H2)
        H2 = np.where(mt, tz, H2)
        part[mt] = 52
        # the quadrates: the jaws' hinge bones standing back from the rear corners like horns
        for sg in (-1, 1):
            qu, qv = -0.82, sg * 0.88
            qx = cx + (qu * length / 2) * ca - (qv * width / 2) * sa
            qy = cy + (qu * length / 2) * sa + (qv * width / 2) * ca
            dirx, diry = -ca * 0.8 - sa * sg * 0.6, -sa * 0.8 + ca * sg * 0.6
            a_ = (X - qx) * dirx + (Y - qy) * diry
            b_ = -(X - qx) * diry + (Y - qy) * dirx
            rod = (a_ > 0) & (a_ < 1.7) & (np.abs(b_) < 0.2 * (1 - a_ / 2.4))
            rz = LEVEL + 0.55 - a_ * 0.22 + np.sqrt(np.clip(1 - (b_ / 0.2) ** 2, 0, 1)) * 0.12
            mr = rod & (rz > H2)
            H2 = np.where(mr, rz, H2)
            part[mr] = 52
        return H2, part
    return st


def skull_paint(col, W, px, py, pz, L, vv, gl, st):
    m = (st == 52) | (st == 53)
    if m.any():
        crest = (pz - LEVEL) > 0.12                                           # out of the water the skull is worn pale
        bc = _bone_col(vv * 1.08, px, py, crest)
        bc = np.where((st == 53)[..., None], bc * 0.55, bc)
        bc = np.where(((pz - LEVEL) < 0.12)[..., None], bs._r(bs.R_ALGAE, vv * 0.95), bc)
        col = np.where(m[..., None], bc, col)
    return col


# ---------------------------------------------------------------- the drowned village's edge
def ruins(cx, cy, ang, seed=21):
    """the Drowned Village's outskirts on a shelf: a house corner of coursed stone broken down course by course, a
    doorway's two jambs still standing with nothing between them, a flagged floor gone tilting into the peat"""
    import drowned
    ca, sa = np.cos(ang), np.sin(ang)

    def st(X, Y, H, W):
        walls = [(cx, cy, ang, 5.0, 2.2, seed), (cx - sa * 2.4 + ca * 2.5, cy + ca * 2.4 + sa * 2.5, ang + np.pi / 2, 4.8, 1.6, seed + 1)]
        H2, dp, _ = drowned.stamp(X, Y, H, [], walls, LEVEL)
        part = np.where(dp > 0, 55, 0)
        u = (X - cx) * ca + (Y - cy) * sa
        v = -(X - cx) * sa + (Y - cy) * ca
        # the floor: flags, each its own tilt, the joints dark, sinking toward one side
        W["ruin_c"] = (cx, cy)
        # the floor lies before the house corner, toward the viewer (it was laid behind its walls, unseen)
        fa = (X - cx) * AX[0] + (Y - cy) * AX[1]
        fp = (X - cx) * PERP[0] + (Y - cy) * PERP[1]
        fl = (fa > 0.6) & (fa < 4.2 + (vn(fp * 0.8, 2.0) - 0.5) * 1.6) & (np.abs(fp) < 3.4 + (vn(fa * 0.8, 5.0) - 0.5) * 1.4)
        edge_r = np.clip(np.minimum(fa - 0.6, 3.4 - np.abs(fp)) / 1.2, 0, 1)      # at its margins the flags go under the peat
        u, v = fp + 10, fa + 10                                             # the flags' own courses run with the view
        fi, fj = np.floor(u / 0.8), np.floor(v / 0.6 + (np.floor(u / 0.8) % 2) * 0.5)
        hs = lambda a, b, k: (np.sin(a * 12.9 + b * 78.2 + k * 3.7) * 4375.5) % 1.0
        tilt = (hs(fi, fj, 1) - 0.5) * 0.14 * ((u / 0.8 - fi) - 0.5) + (hs(fi, fj, 2) - 0.5) * 0.14 * ((v / 0.6 - fj) - 0.5)
        fz = LEVEL + 0.24 - fa * 0.03 + tilt - (hs(fi, fj, 3) < 0.12) * 0.2    # sinking toward the water, a few flags gone
        joint = (((u / 0.8) % 1.0) < 0.06) | ((((v / 0.6) + (fi % 2) * 0.5) % 1.0) < 0.07)
        fz = fz - joint * 0.04
        gone = hs(fi, fj, 7) > 0.25 + edge_r * 0.75
        mf = fl & (part == 0) & ~gone                                      # the floor is laid into the shelf, its edge ragged
        H2 = np.where(mf, fz, H2)
        part = np.where(mf, 54, part)
        part = np.where(mf & joint, 56, part)
        # the doorway: two jambs, the lintel long fallen
        for sg in (-1, 1):
            jx, jy = cx + ca * (sg * 0.75) - sa * 4.7, cy + sa * (sg * 0.75) + ca * 4.7
            jm = (np.abs((X - jx) * ca + (Y - jy) * sa) < 0.28) & (np.abs(-(X - jx) * sa + (Y - jy) * ca) < 0.32)
            jz = LEVEL + 1.9 + sg * 0.22 - (vn(X * 9, Y * 9) - 0.5) * 0.1
            jm = jm & (jz > H2)
            H2 = np.where(jm, jz, H2)
            part = np.where(jm, 55, part)
        # the lintel, fallen across the threshold before the jambs, and a spill of rubble
        lx, ly = cx + ca * 0.0 - sa * 5.6, cy + sa * 0.0 + ca * 5.6
        la = (X - lx) * np.cos(ang + 0.25) + (Y - ly) * np.sin(ang + 0.25)
        lb = -(X - lx) * np.sin(ang + 0.25) + (Y - ly) * np.cos(ang + 0.25)
        ml = (np.abs(la) < 1.1) & (np.abs(lb) < 0.25)
        lz = LEVEL + 0.42 + la * 0.06
        ml = ml & (lz > H2)
        H2 = np.where(ml, lz, H2)
        part = np.where(ml, 55, part)
        rr_ = np.random.default_rng(seed + 5)
        for k in range(9):
            rx_, ry_ = cx + rr_.normal(0, 1.4) + AX[0] * 1.2, cy + rr_.normal(0, 1.4) + AX[1] * 1.2
            a_ = rr_.uniform(0, np.pi)
            ru = (X - rx_) * np.cos(a_) + (Y - ry_) * np.sin(a_)
            rv = -(X - rx_) * np.sin(a_) + (Y - ry_) * np.cos(a_)
            sz = rr_.uniform(0.2, 0.42)
            mr = (np.abs(ru) < sz) & (np.abs(rv) < sz * 0.6)
            rz = LEVEL + 0.2 + rr_.uniform(0.05, 0.3) + ru * 0.1
            mr = mr & (rz > H2)
            H2 = np.where(mr, rz, H2)
            part = np.where(mr, 55, part)
        return H2, part
    return st


def ruins_paint(col, W, px, py, pz, L, vv, gl, st):
    m = (st == 54) | (st == 55) | (st == 56)
    if m.any():
        wetz = pz - LEVEL
        crs = np.floor(wetz / 0.4)                                          # each block its own stone: its course,
        blk = np.floor((px * 0.8 + py * 0.8) / 0.9 + crs * 0.5)            # its length, its own grey
        bv = ((np.sin(blk * 12.9 + crs * 7.1) * 4375.5) % 1.0 - 0.5) * 0.16
        stone = bs._r(bs.R_STONE, vv * 0.9 + (vn(px * 5, py * 5) - 0.5) * 0.08 + bv * (st == 55))
        course = (((wetz % 0.4) < 0.04) | ((((px * 0.8 + py * 0.8) / 0.9 + crs * 0.5) % 1.0) < 0.06)) & (st == 55)
        stone = np.where(course[..., None], stone * 0.5, stone)
        top = (st == 55) & (vn(px * 5 + 2, py * 5) > 0.45) & (wetz > 0.6)
        stone = np.where(top[..., None], bs._r(bs.R_MOSS, vv * 0.85), stone)
        stone = np.where((wetz < 0.3)[..., None], bs._r(bs.R_ALGAE, vv * 0.95), stone)
        moss = (vn(px * 2.2, py * 2.2) > 0.62) & (st == 54)                  # moss creeping over the flags from the peat, in broad tongues
        stone = np.where(moss[..., None], bs._r(bs.R_MOSS, vv * 0.9), stone)
        fpa = (px - W["ruin_c"][0]) * PERP[0] + (py - W["ruin_c"][1]) * PERP[1] + 10
        faa = (px - W["ruin_c"][0]) * AX[0] + (py - W["ruin_c"][1]) * AX[1] + 10
        fid = np.floor(fpa / 0.8) * 13 + np.floor(faa / 0.6 + (np.floor(fpa / 0.8) % 2) * 0.5)
        fv = ((np.sin(fid * 12.9) * 4375.5) % 1.0 - 0.5) * 0.22                 # every flag its own grey, worn paler
        flag = bs._r(bs.R_STONE, vv * 0.92 + fv) * np.array([1.04, 1.0, 0.96])
        flag = np.where(moss[..., None], bs._r(bs.R_MOSS, vv * 0.9), flag)
        stone = np.where((st == 54)[..., None], flag, stone)
        stone = np.where((st == 56)[..., None], bs._r(bs.R_MUD, vv * 0.6), stone)
        col = np.where(m[..., None], stone, col)
    return col


def scene_socket():
    set_origin(3)
    bs.LINE = twisting_line(6, bends=((-0.45, 3.4, 5.0), (0.35, -3.0, 4.0)))
    sc = C - AX * 4.8 + PERP * 1.0
    bs.BED_MODS[:] = [shelf(*(sc), 8.0, rise=0.14, seed=13)]
    bs.DROWNED_TREES = [(C + AX * 5.5 - PERP * 7.5, 0.36, 5.0, 73)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = []
    bs.EXTRA_STAMPS[:] = [eye_socket(sc[0], sc[1])]
    bs.EXTRA_PAINT[:] = [socket_paint]
    bs.EXTRA_LIVING[:] = [socket_eye]
    ws.HERO = bs.LINE[len(bs.LINE) // 2] + AX * 0.2


def scene_skull():
    set_origin(4)
    sk = C - AX * 3.5 + PERP * 0.5
    ang = np.arctan2(PERP[1], PERP[0])
    rear = sk - np.array([np.cos(ang), np.sin(ang)]) * 4.6
    t = np.linspace(0, 1, 900)
    # the Back comes in twisting and runs into the skull's rear
    pts = rear[None] - np.array([np.cos(ang), np.sin(ang)])[None] * (t * 16)[:, None] + AX[None] * (np.sin(t * 5.0) * 3.0 * t)[:, None]
    bs.LINE = pts[::-1]
    bs.BED_MODS[:] = [shelf(*(sk + AX * 1.0), 7.0, rise=0.1, seed=17)]
    bs.DROWNED_TREES = [(C + AX * 6.0 + PERP * 7.0, 0.4, 6.0, 74)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = [("snag", *(C + AX * 5.0 - PERP * 6.5), 0.4, 5.5, 0.3, 93)]
    bs.EXTRA_STAMPS[:] = [serpent_skull(sk[0], sk[1], ang)]
    bs.EXTRA_PAINT[:] = [skull_paint]
    bs.EXTRA_LIVING[:] = []
    ws.HERO = rear - np.array([np.cos(ang), np.sin(ang)]) * 1.6 + AX * 0.2   # on the Back, at the skull's rear


def scene_ruins():
    set_origin(5)
    bs.LINE = twisting_line(8, bends=((-0.4, -3.2, 4.0), (0.4, 2.8, 5.0)))
    rc = C - AX * 5.0 - PERP * 0.5
    bs.BED_MODS[:] = [shelf(*(rc + AX * 1.0), 7.5, rise=0.2, seed=19)]
    bs.DROWNED_TREES = [(C + AX * 6.0 + PERP * 7.5, 0.4, 6.0, 75)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    post = rc + AX * 3.6 + PERP * 3.0
    bs.STRUCTS[:] = [("post", post[0], post[1], 0.22, 1.8, 95)]
    bs.EXTRA_STAMPS[:] = [ruins(rc[0], rc[1], 0.75)]
    bs.EXTRA_PAINT[:] = [ruins_paint]
    bs.EXTRA_LIVING[:] = [tendrils_round_post(post[0], post[1], 1.8, 96)]
    ws.HERO = rc + AX * 1.5 + PERP * 2.0                               # on the old floor, between the walls


SCENES = dict(nature=scene_nature, hut=scene_hut, socket=scene_socket, skull=scene_skull, ruins=scene_ruins)

if __name__ == "__main__":
    SCENES[sys.argv[1]]()
    if len(sys.argv) > 3 and sys.argv[3] == "value":
        bs.VALUE_ONLY = True
    ws.main(sys.argv[2])
