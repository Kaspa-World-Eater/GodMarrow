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


VARIANT = 0          # which version of a chamber (Derek: "create variations so we can create a real reusable map")
J = np.random.default_rng(0)


def set_origin(k):
    """each chamber its own place in the world (its own seeds for every bed of plants, every hummock and pool),
    so no two chambers share a foreground; each VARIANT its own place again, and its own layout from J"""
    global C, J
    kk = k + 10 * VARIANT
    J = np.random.default_rng(VARIANT * 97 + k)
    C = np.array([20.0 + 37.0 * kk, 20.0 + 13.0 * kk])
    bs.C = C
    ws.FOCUS = C.copy()


def vb(bb):
    """a variant's bends: each one's swing flipped or not and rescaled, its sharpness its own"""
    if VARIANT == 0:
        return bb
    return tuple((at + J.uniform(-0.12, 0.12), amp * J.choice([-1, 1]) * J.uniform(0.75, 1.25), tight * J.uniform(0.7, 1.4))
                 for (at, amp, tight) in bb)


def clear_of_back(p, d):
    """a set piece moved out across the water until it stands clear of the walk (the ruins never block it)"""
    from scipy.spatial import cKDTree
    kd = cKDTree(bs.LINE)
    p = np.array(p, float)
    for _ in range(60):
        dd, i = kd.query(p)
        if dd >= d:
            break
        away = p - bs.LINE[i]
        p = p + away / (np.linalg.norm(away) + 1e-6) * 0.4
    return p


def jit(p, r=1.2):
    """a variant's set piece moved a little from where variant 0 has it"""
    return p if VARIANT == 0 else p + J.normal(0, r, 2)


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
    bs.LINE = twisting_line(2 + VARIANT, bends=vb(((-0.35, 3.6, 4.0), (0.3, -3.2, 5.0))))
    # the shelf is anchored to this variant's own walk: just behind the Back where it passes the middle of the frame
    mid = bs.LINE[np.argmin(np.hypot(*(bs.LINE - C).T))]
    bs.BED_MODS[:] = [shelf(*(mid - AX * 4.0 + PERP * 1.5), 7.5)]
    bs.DROWNED_TREES = [(C + AX * 6.0 - PERP * 8.0, 0.4, 6.0, 71)]
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = []
    post = jit(C + AX * 1.6 + PERP * 1.6)
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
        txy = np.array([hx, hy]) + AX * (R + 0.4) + PERP * (R + 0.6)        # by the wall, the door side, in view
        tx, ty = txy[0], txy[1]
        u = (X - tx) * np.cos(sa_ + 1.57) + (Y - ty) * np.sin(sa_ + 1.57)
        v = -(X - tx) * np.sin(sa_ + 1.57) + (Y - ty) * np.cos(sa_ + 1.57)
        stack = (np.abs(u) < 0.7) & (np.abs(v) < 0.35)
        brick = np.floor(u / 0.24) + np.floor(v / 0.16) * 7
        # stacked as turf is stacked to dry: a low ridge, the bricks leaned in against each other, stepping down
        sz_ = base + 0.5 - np.floor(np.abs(v) / 0.12) * 0.1 - np.abs(u) * 0.12 + ((np.sin(brick * 12.9) * 4375.5) % 1.0) * 0.06
        gapb = (((u / 0.24) % 1.0) < 0.12) | (((v / 0.16) % 1.0) < 0.15)
        ms = stack & (sz_ > H2)
        H2 = np.where(ms, sz_ - gapb * 0.05, H2)
        part[ms] = 44
        pa_ = np.arctan2(PERP[1], PERP[0]) + 0.3                            # the punt, drawn up at the shelf's edge, in view
        bxy = np.array([hx, hy]) + AX * 4.6 - PERP * 2.8
        bx, by = bxy[0], bxy[1]
        bu = (X - bx) * np.cos(pa_) + (Y - by) * np.sin(pa_)
        bv = -(X - bx) * np.sin(pa_) + (Y - by) * np.cos(pa_)
        hull = (np.abs(bu) < 1.5) & (np.abs(bv) < 0.42 * np.clip(1.4 - np.abs(bu) / 1.5, 0, 1))
        gun = hull & (np.abs(bv) > 0.42 * np.clip(1.4 - np.abs(bu) / 1.5, 0, 1) - 0.07)
        bz = LEVEL + np.where(gun, 0.28, 0.08) - bu * 0.05
        mb = hull & (bz > H2 - 0.15)
        H2 = np.where(mb, bz, H2)
        part[mb] = 45
        # the way they walk: from the door past the fire pit down to the punt, trodden into the peat, a hand lower,
        # bare of moss; and the doorstone, a flat slab worn hollow in its middle by generations of feet
        dpt = np.array([hx + np.cos(door_a) * (R + 0.35), hy + np.sin(door_a) * (R + 0.35)])
        way_pts = [dpt, np.array([px_, py_]) + np.array([np.cos(door_a + 1.4), np.sin(door_a + 1.4)]) * 0.95, np.array([bx, by])]
        tw_ = np.zeros(X.shape, bool)
        for a_, b_ in zip(way_pts[:-1], way_pts[1:]):
            dv = b_ - a_
            L_ = np.hypot(*dv)
            t_ = np.clip(((X - a_[0]) * dv[0] + (Y - a_[1]) * dv[1]) / (L_ * L_), 0, 1)
            dd_ = np.hypot(X - a_[0] - dv[0] * t_, Y - a_[1] - dv[1] * t_)
            tw_ |= dd_ < 0.42 + (vn(X * 3, Y * 3) - 0.5) * 0.18
        tw_ &= (part == 0)
        H2 = np.where(tw_, H2 - 0.04, H2)
        part[tw_] = 46
        ds = np.hypot((X - dpt[0]) / 0.55, (Y - dpt[1]) / 0.4) < 1
        dz = base + 0.06 - np.clip(1 - np.hypot((X - dpt[0]) / 0.3, (Y - dpt[1]) / 0.22), 0, 1) * 0.04
        H2 = np.where(ds, dz, H2)
        part[ds] = 47
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
    tj = (np.abs(np.sin((px - py) * 13)) < 0.18) | (np.abs(np.sin(pz * 19)) < 0.2)   # the cut bricks' joints
    turf = np.array([0.24, 0.16, 0.11]) * (0.4 + vv[..., None] * 0.9) * (1 + (vn(px * 21, py * 21)[..., None] - 0.5) * 0.25)
    turf = np.where(tj[..., None], turf * 0.5, turf)
    col = np.where((st == 44)[..., None], turf, col)
    plank = np.array([0.2, 0.17, 0.13]) * (0.35 + vv[..., None] * 0.8) * (1 - (np.abs(np.sin((px + py) * 18)) < 0.15)[..., None] * 0.35)
    col = np.where((st == 45)[..., None], plank, col)
    trod = np.array([0.15, 0.11, 0.08]) * (0.45 + vv[..., None] * 0.9) * (1 + (vn(px * 9, py * 9)[..., None] - 0.5) * 0.2)
    col = np.where((st == 46)[..., None], trod, col)
    dstone = np.array([0.27, 0.27, 0.25]) * (0.4 + vv[..., None] * 0.9)
    col = np.where((st == 47)[..., None], dstone, col)
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


def fire_trellis(px_, py_):
    """the trellis over the fire pit (Derek: "add a trellis with fire"): two forked posts of grey drowned wood either
    side of the pit, a crossbar laid in their forks, and from it bundles of reed and root hung to dry over the cold
    fire, and a blackened pot on a hook; true thin strokes in the world, each lit pale on its fire side, mirrored where
    water is under it"""
    import bog_plants

    def living(img, w, W, px, py, pz, L, T=0.0):
        water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
        zb = np.full(img.shape[:2], -1e9)
        dep = px + py
        g = float(ws.look(W, W["H"], np.array(px_), np.array(py_)))
        g = max(g, LEVEL + 0.05)
        WOOD, WOOD_L = bs.R_DEAD[3], bs.R_DEAD[5]
        P3 = np.array([bs.PERP[0], bs.PERP[1], 0.0])
        A3 = np.array([bs.AX[0], bs.AX[1], 0.0])
        FIRE = np.array([0.55, 0.62, 0.72])
        ends = []
        for sg in (-1, 1):
            b0 = np.array([px_ + bs.PERP[0] * sg * 0.85, py_ + bs.PERP[1] * sg * 0.85, g])
            top = b0 + np.array([0.0, 0.0, 1.35])
            for off in (0.0, 0.025):                                       # a post two strokes thick
                bog_plants._stroke(img, zb, dep, ws.to_px, b0 + np.array([off, -off, 0]), top + np.array([off, -off, 0]),
                                   WOOD, WOOD_L * 0.75 + FIRE * 0.1, 0.5, water, LEVEL)
            for fk in (-1, 1):                                             # the fork
                bog_plants._stroke(img, zb, dep, ws.to_px, top, top + A3 * fk * 0.12 + np.array([0, 0, 0.2]),
                                   WOOD, WOOD_L, 0.5, water, LEVEL, n=5)
            ends.append(top + np.array([0, 0, 0.08]))
        for off in (0.0, 0.025):                                           # the crossbar
            bog_plants._stroke(img, zb, dep, ws.to_px, ends[0] + np.array([0, 0, off]), ends[1] + np.array([0, 0, off]),
                               WOOD, WOOD_L * 0.8 + FIRE * 0.12, 0.55, water, LEVEL)
        rr = np.random.default_rng(int(px_ * 13) % 997)
        for k, f in enumerate(np.linspace(0.18, 0.82, 5)):                 # what hangs from it
            hp = ends[0] + (ends[1] - ends[0]) * (f + rr.uniform(-0.04, 0.04))
            if k == 2:                                                     # the pot on its hook, over the fire's middle
                bog_plants._stroke(img, zb, dep, ws.to_px, hp, hp - np.array([0, 0, 0.45]), np.array([0.12, 0.1, 0.09]),
                                   np.array([0.12, 0.1, 0.09]), 0.8, water, LEVEL, n=6)
                c = hp - np.array([0, 0, 0.62])
                for dz in np.linspace(-0.12, 0.12, 7):
                    wdt = 0.16 * np.sqrt(max(1 - (dz / 0.13) ** 2, 0.05))
                    bog_plants._stroke(img, zb, dep, ws.to_px, c + np.array([0, 0, dz]) - P3 * wdt, c + np.array([0, 0, dz]) + P3 * wdt,
                                       np.array([0.07, 0.07, 0.07]), np.array([0.2, 0.22, 0.25]), 0.9, water, LEVEL, n=6)
                continue
            ln = rr.uniform(0.25, 0.45)
            col = np.array([0.36, 0.31, 0.2]) if k % 2 else np.array([0.24, 0.17, 0.12])   # reed bundles, root bundles
            for t_ in range(5):
                o_ = (t_ - 2) * 0.018
                bog_plants._stroke(img, zb, dep, ws.to_px, hp + P3 * o_, hp + P3 * (o_ * 1.8) - np.array([0, 0, ln * rr.uniform(0.85, 1.0)]),
                                   col * 0.8, col, 0.8, water, LEVEL, n=6)
        return img
    return living


def hut_smoke(img, w, W, px, py, pz, L, T=0.0):
    """a thin smoke from the smoke hole, rising and leaning with the one wind, thinning as it goes: stepped, see-through,
    dithered only at its edges (the effects method); and the pit's cold light caught on the eave and the door's edge"""
    if "hut" not in W:
        return img
    h = W["hut"]
    GH, GW = img.shape[:2]
    top = (h["c"][0], h["c"][1], h["base"] + h["wall_h"] + h["R"] * 0.95)
    sx, sy = ws.to_px(top)
    ys, xs = np.mgrid[0:GH, 0:GW]
    a = 2 * np.pi * T
    up = (sy - ys)                                                         # px above the smoke hole
    lean = up * 0.22 + np.sin(up * 0.05 - a * 2) * (2 + up * 0.06)        # it leans downwind and wavers
    width = 6 + up * 0.18
    d = np.abs(xs - sx - lean) / np.maximum(width, 1)
    n = vn(xs * 0.08 - a * 0.5, (ys + T * 60) * 0.06)
    dens = np.clip(1 - d, 0, 1) * np.clip(1 - up / 140.0, 0, 1) * (up > 0) * (0.5 + n * 0.8)
    bay = ws.tw.B4[(ys % 4), (xs % 4)]
    alpha = np.where(dens > 0.55, 0.3, np.where(dens > 0.3, 0.18, np.where(dens > 0.12, 0.09 * (bay > 0.5), 0.0)))
    img = img * (1 - alpha[..., None]) + np.array([0.42, 0.44, 0.46]) * alpha[..., None]
    return img


def scene_hut():
    set_origin(2)
    bs.LINE = twisting_line(4 + VARIANT, bends=vb(((-0.5, -3.0, 4.5), (0.15, 3.6, 3.5), (0.65, -2.0, 6.0))))
    hc = jit(C - AX * 4.2 - PERP * 1.0)
    pit = hc + AX * 2.6 + PERP * 0.6
    bs.BED_MODS[:] = [shelf(*(hc + AX * 0.8), 6.5, rise=0.22, seed=9)]
    bs.DROWNED_TREES = [(C + AX * 6.5 + PERP * 7.0, 0.38, 5.5, 72)]
    bs.DROWNED_WALLS = []
    bs.GIANT_RIBS = []
    bs.STRUCTS[:] = [("stump", *(hc - PERP * 4.2 + AX * 1.0), 0.45, 91)]
    bs.EXTRA_STAMPS[:] = [straw_hut(hc[0], hc[1], R=1.8 * (1 if VARIANT == 0 else J.uniform(0.8, 1.2)), pit_at=pit, seed=5 + VARIANT)]
    bs.EXTRA_PAINT[:] = [hut_paint]
    bs.EXTRA_LIVING[:] = [fire_trellis(pit[0], pit[1]), pit_fire(pit[0], pit[1]), hut_smoke]
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
        rim_h = np.maximum(rim_h, H + 0.3 + 0.9 * brow)                     # the rim always stands out of the ground round it
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
    ang_ = np.arctan2(v, u)
    rw = r + wob + (vn(ang_ * 2.2 + 4, 1.0) - 0.5) * 0.22 + (vn(ang_ * 7, r * 3) - 0.5) * 0.08   # no clean ellipse: a
                                                                          # ragged, uneven iris, its pupil drawn a little out of round
    iris = water & (rw > 0.3) & (rw < 0.82)
    thread = np.abs(np.sin(ang_ * 26 + rw * 6)) < 0.25
    ic = np.array([0.2, 0.21, 0.16]) * (0.75 + 0.25 * thread[..., None]) * (1.15 - rw[..., None] * 0.5) * br
    img[iris] = img[iris] * 0.45 + ic[iris]
    ring = water & (np.abs(rw - 0.86) < 0.06)
    img[ring] = img[ring] * 0.6
    pup = water & (np.hypot(u * 0.8, v * 1.25) + wob <= 0.3)
    img[pup] = img[pup] * 0.35
    return img


def serpent_skull(cx, cy, ang, length=8.0, width=8.0, height=1.2, seed=11):
    """THE SERPENT'S SKULL, all but buried (Derek, second review: "The skull should be hump and the top of the eye
    sockets showing"). The bog has swallowed it: only the crown of the cranium breaks the marsh, a broad smooth hump of
    bone, and in front of it the brows, the arched tops of the two great eye sockets, stand just out of the peat with
    black water in the sockets below them. The snout, the jaws and everything under are gone into the bog. Settled a
    little to one side; its crown worn pale; its lower edges slimed where the water stands."""
    ca, sa = np.cos(ang), np.sin(ang)

    def st(X, Y, H, W):
        part = np.zeros(X.shape, int)
        u = ((X - cx) * ca + (Y - cy) * sa) / (length / 2)                   # -1 rear .. +1 front
        v = (-(X - cx) * sa + (Y - cy) * ca) / (width / 2)
        # the hump: a broad dome, highest behind the middle (the braincase), sinking forward toward the buried snout
        r2 = ((u + 0.15) / 0.95) ** 2 + (v / 0.82) ** 2
        rag = (vn(np.arctan2(v, u) * 3 + seed, 2.0) - 0.5) * 0.18             # its waterline not a clean ellipse
        dome = np.sqrt(np.clip(1 - r2 + rag * np.clip(r2, 0, 1) ** 2, 0, None))   # ragged only at its edge, smooth crown
        z = LEVEL - 0.85 + height * dome - np.clip(u - 0.1, 0, None) * 0.9 + v * 0.06
        # the sutures cross the crown; a faint midline ridge (the parietal crest) worn almost away
        z = z + np.exp(-(v / 0.08) ** 2) * np.clip(-u + 0.3, 0, 1) * 0.08
        # the sutures: zigzag seams where the skull's plates meet, one across the crown, one down its middle behind it
        zz = lambda t: (np.abs(((t * 9.0) % 2.0) - 1.0) - 0.5) * 0.05
        sut = (np.abs(u + 0.12 - zz(v)) < 0.022) | ((np.abs(v - zz(u)) < 0.02) & (u < -0.12))
        orb = np.zeros(X.shape, bool)                                     # no sockets (Derek: "just remove them")
        z = z - sut * 0.025 + (vn(X * 9 + seed, Y * 9) - 0.5) * 0.02
        m = (z > H) & (z > LEVEL) & ~orb
        H2 = np.where(orb, np.minimum(H, LEVEL - 0.4), np.where(m, z, H))
        part[m] = 52
        part[m & sut] = 53
        W["no_weed"] = W.get("no_weed", np.zeros(X.shape, bool)) | orb   # deep, still: no drift lies in the sockets
        W["skull"] = dict(cx=cx, cy=cy, ang=ang, length=length, width=width, seed=seed)
        return H2, part
    return st


def serpent_jaws(img, w, W, px, py, pz, L, T=0.0):
    """the skull's jaws and quadrates as true bone rods: the quadrates standing back from the braincase's rear corners,
    the jaws hinged on them, fallen open and splayed, half in the water, a row of small curved teeth along each; each
    shown again in the black mirror"""
    if "skull" not in W:
        return img
    import bone as bonegen
    k = W["skull"]
    ca, sa = np.cos(k["ang"]), np.sin(k["ang"])
    hl, hw = k["length"] / 2, k["width"] / 2
    to_w = lambda u, v, z: (k["cx"] + u * hl * ca - v * hw * sa, k["cy"] + u * hl * sa + v * hw * ca, z)
    rr = np.random.default_rng(k["seed"])
    shapes = []
    for sg in (-1, 1):
        q0 = to_w(-0.78, sg * 0.24, LEVEL + 0.35)                         # the quadrate: from the braincase's corner
        q1 = to_w(-1.0, sg * 0.72, LEVEL + 0.2)                           # back and out to the jaw's hinge
        shapes.append(bonegen.rib(q0, q1, 0.12, 0.09, 0.12, seed=k["seed"] + 3 + sg))
        splay = rr.uniform(0.15, 0.3)
        j1 = to_w(0.95, sg * (0.82 + splay), LEVEL + 0.1)                  # the jaw: hinge to tip, fallen open, splayed
        shapes.append(bonegen.rib(q1, j1, 0.35, 0.15, 0.19, seed=k["seed"] + 7 + sg))
    GH, GW = img.shape[:2]
    dep = px + py
    hero = np.array(ws.HERO, float)
    g = float(ws.look(W, W["H"], np.array(hero[0]), np.array(hero[1])))
    lts = [((hero[0] + 0.25, hero[1] - 0.25, g + 0.7), (0.95, 0.6, 0.32), 2.6 * 1.4)]
    keep = (bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE)
    bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE = bs.R_CROWN, np.array([0.1, 0.09, 0.07]), np.array([0.08, 0.07, 0.06])
    water = ws.look(W, W["bog_water"], px, py) & (L["tg"] == 0)
    mir = []
    for o in shapes:
        m_ = dict(o)
        m_["pts"] = o["pts"].copy()
        m_["pts"][:, 2] = 2 * LEVEL - m_["pts"][:, 2]
        mir.append(m_)
    tmp = np.zeros_like(img)
    hit = np.full((GH, GW), -1e9)
    bonegen.draw(tmp, hit, np.full((GH, GW), -1e9), ws.to_px, mir, lts, ws.SUN, ambient=0.12)
    mm = water & (hit > -1e8)
    img[mm] = np.clip(img[mm] * 0.35 + tmp[mm] * np.array([0.42, 0.46, 0.55]), 0, 1)
    zb = np.full((GH, GW), -1e9)
    shapes.sort(key=lambda o: -(o["pts"][:, 0] + o["pts"][:, 1]).mean())
    bonegen.draw(img, zb, dep, ws.to_px, shapes, lts, ws.SUN, ambient=0.32)     # the jaws catch the sky: pale rods
    bonegen.R_BONE, bonegen.SINEW, bonegen.SPONGE = keep
    # the teeth: small, curved back, along each jaw where it rides above the water
    for o in shapes[-4:]:
        pts = o["pts"]
        if len(pts) < 10 or np.linalg.norm(pts[-1] - pts[0]) < 3.0:
            continue
        for t_ in np.linspace(0.25, 0.92, 9):
            i = int(t_ * (len(pts) - 1))
            p = pts[i]
            if p[2] < LEVEL + 0.02:
                continue
            a = p + np.array([0, 0, 0.12])
            b = a + np.array([0, 0, 0.26]) + (pts[min(i + 2, len(pts) - 1)] - pts[max(i - 2, 0)]) * -0.2
            import bog_plants
            bog_plants._stroke(img, zb, dep, ws.to_px, a, b, bs.R_CROWN[4], bs.R_CROWN[6], 0.8, water, LEVEL, n=4)
    return img


def skull_paint(col, W, px, py, pz, L, vv, gl, st):
    m = (st == 52) | (st == 53)
    if m.any():
        crest = (pz - LEVEL) > 0.12                                           # out of the water the skull is worn pale
        bc = _bone_col(vv * 1.08, px, py, crest)
        bc = np.where((st == 53)[..., None], bc * 0.55, bc)
        bc = np.where(((pz - LEVEL) < 0.12)[..., None], bs._r(bs.R_ALGAE, vv * 0.95), bc)
        mossy = ((pz - LEVEL) < 0.14) & (vn(px * 3.3, py * 3.3) > 0.55)        # moss and slime where the peat meets it
        bc = np.where(mossy[..., None], bs._r(bs.R_MOSS, vv * 0.9 + (vn(px * 13, py * 13) - 0.5) * 0.1), bc)
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
    bs.LINE = twisting_line(6 + VARIANT, bends=vb(((-0.45, 3.4, 5.0), (0.35, -3.0, 4.0))))
    sc = jit(C - AX * 4.8 + PERP * 1.0)
    bs.BED_MODS[:] = [shelf(*(sc), 8.0, rise=0.14, seed=13)]
    bs.DROWNED_TREES = [(C + AX * 5.5 - PERP * 7.5, 0.36, 5.0, 73)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = []
    bs.EXTRA_STAMPS[:] = [eye_socket(sc[0], sc[1], *((4.2, 3.2, 0.4) if VARIANT == 0 else (J.uniform(3.4, 5.0), J.uniform(2.6, 3.6), J.uniform(-0.6, 1.2))), seed=7 + VARIANT)]
    bs.EXTRA_PAINT[:] = [socket_paint]
    bs.EXTRA_LIVING[:] = [socket_eye]
    ws.HERO = bs.LINE[len(bs.LINE) // 2] + AX * 0.2


def scene_skull():
    set_origin(4)
    sk = jit(C - AX * 3.5 + PERP * 0.5, 0.8)
    ang = np.arctan2(PERP[1], PERP[0]) + (0 if VARIANT == 0 else J.uniform(-0.5, 0.5))
    rear = sk - np.array([np.cos(ang), np.sin(ang)]) * 4.6
    t = np.linspace(0, 1, 900)
    # the Back comes in twisting and runs into the skull's rear
    neck_end = rear - np.array([np.cos(ang), np.sin(ang)]) * 1.4            # the neck stops short: a gap where the head came away
    pts = neck_end[None] - np.array([np.cos(ang), np.sin(ang)])[None] * (t * 16)[:, None] + AX[None] * (np.sin(t * 5.0) * 3.0 * t)[:, None]
    bs.LINE = pts[::-1]
    bs.BED_MODS[:] = [shelf(*(sk + AX * 1.0), 7.0, rise=0.1, seed=17)]
    bs.DROWNED_TREES = [(C + AX * 6.0 + PERP * 7.0, 0.4, 6.0, 74)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = [("snag", *(C + AX * 5.0 - PERP * 6.5), 0.4, 5.5, 0.3, 93)]
    bs.EXTRA_STAMPS[:] = [serpent_skull(sk[0], sk[1], ang, seed=11 + VARIANT)]
    bs.EXTRA_PAINT[:] = [skull_paint]
    bs.EXTRA_LIVING[:] = []                                            # the jaws are under the bog with the rest
    import serpent_spine
    serpent_spine.NECK = 7.0
    ws.HERO = rear - np.array([np.cos(ang), np.sin(ang)]) * 1.6 + AX * 0.2   # on the Back, at the skull's rear


def scene_ruins():
    set_origin(5)
    bs.LINE = twisting_line(8 + VARIANT, bends=vb(((-0.4, -3.2, 4.0), (0.4, 2.8, 5.0))))
    rc = clear_of_back(jit(C - AX * 5.0 - PERP * 0.5), 7.0)
    bs.BED_MODS[:] = [shelf(*(rc + AX * 1.0), 7.5, rise=0.2, seed=19)]
    bs.DROWNED_TREES = [(C + AX * 6.0 + PERP * 7.5, 0.4, 6.0, 75)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    post = rc + AX * 3.6 + PERP * 3.0
    bs.STRUCTS[:] = [("post", post[0], post[1], 0.22, 1.8, 95)]
    bs.EXTRA_STAMPS[:] = [ruins(rc[0], rc[1], 0.75 if VARIANT == 0 else J.uniform(0.3, 1.2), seed=21 + VARIANT)]
    bs.EXTRA_PAINT[:] = [ruins_paint]
    bs.EXTRA_LIVING[:] = [tendrils_round_post(post[0], post[1], 1.8, 96)]
    ws.HERO = rc + AX * 1.5 + PERP * 2.0                               # on the old floor, between the walls


def scene_causeway():
    """a branch: the Back passes, and off it the bog folk's board causeway runs away across the water, twisting"""
    set_origin(6)
    bs.LINE = twisting_line(12 + VARIANT, bends=vb(((-0.4, 2.6, 4.0), (0.5, -2.2, 5.0))))
    mid = bs.LINE[len(bs.LINE) // 2]
    t = np.linspace(0, 1, 600)
    away = -AX * 0.75 + PERP * 0.66
    away = away / np.linalg.norm(away)
    side = np.array([-away[1], away[0]])
    start = mid + away * 2.4                                           # from the Back's flank, not across it
    cl = start[None] + away[None] * (t * 14.0)[:, None] + side[None] * (np.sin(t * 6.0 + VARIANT) * 1.6 * t)[:, None]
    bs.CAUSEWAYS[:] = [cl]
    bs.BED_MODS[:] = []
    bs.DROWNED_TREES = [(C - AX * 2.0 + PERP * 7.5, 0.36, 5.0, 76)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = []
    bs.EXTRA_STAMPS[:], bs.EXTRA_PAINT[:], bs.EXTRA_LIVING[:] = [], [], []
    ws.HERO = cl[90] + AX * 0.1                                        # on the boards


# ---------------------------------------------------------------- the Vein-Worms' ground
def worm_ground(cx, cy, seed=29, n_rings=4, spread=2.6):
    """THE VEIN-WORMS' GROUND (the hunter: "The Vein-Worms you know by the ground. A ring of red bubbles, soft as a
    kettle ... They will rise under soft ground and never under a road"). A shelf of soft peat churned dark and wet,
    and on it rings of glossy dark red bubbles, each ring a worm about to rise, some swelling, some already burst into
    a ragged crater; the peat round each ring sunk a little and slick. No red light: the bubbles only catch the moon."""
    rr = np.random.default_rng(seed)
    rings = []
    for k in range(n_rings):
        ang, dist = rr.uniform(0, 2 * np.pi), rr.uniform(0.6, spread)
        rings.append((cx + np.cos(ang) * dist, cy + np.sin(ang) * dist, rr.uniform(0.6, 1.1), int(rr.integers(11, 19)),
                      rr.uniform(0, 1)))

    def st(X, Y, H, W):
        part = np.zeros(X.shape, int)
        d0 = np.hypot(X - cx, Y - cy)
        churn = (d0 < spread + 2.0) & (H > LEVEL - 0.05)
        H2 = np.where(churn, H - 0.04 + (vn(X * 3.5 + seed, Y * 3.5) - 0.5) * 0.08, H)
        part[churn] = 70
        bub = []
        for (rx, ry, R, nb, ph) in rings:
            d = np.hypot(X - rx, Y - ry)
            sink = churn & (d < R + 0.35)
            H2 = np.where(sink, H2 - 0.06 * np.clip(1 - d / (R + 0.35), 0, 1), H2)
            part[sink & (part == 70)] = 71
            for b in range(nb):
                a = 2 * np.pi * b / nb + rr.uniform(-0.12, 0.12)
                bx, by = rx + np.cos(a) * R, ry + np.sin(a) * R
                br = rr.uniform(0.06, 0.11)
                burst = rr.random() < 0.18
                bub.append((bx, by, br, burst, rr.uniform(0, 1)))
                db = np.hypot(X - bx, Y - by)
                if burst:                                                     # a crater, its lip torn
                    m = db < br * 1.4
                    H2 = np.where(m, H2 - 0.05 * np.clip(1 - db / (br * 1.4), 0, 1) + (db > br) * 0.03, H2)
                    part[m] = 73
                else:
                    m = db < br
                    H2 = np.where(m, np.maximum(H2, H2 + np.sqrt(np.clip(br ** 2 - db ** 2, 0, None)) * 0.7), H2)
                    part[m] = 72
        W["worm"] = dict(bub=bub)
        return H2, part
    return st


def worm_paint(col, W, px, py, pz, L, vv, gl, st):
    m = (st >= 70) & (st <= 73)
    if not m.any():
        return col
    peat = bs._r(bs.R_MUD, vv * 0.75 + (vn(px * 6, py * 6) - 0.5) * 0.12)
    slick = bs._r(bs.R_MUD, vv * 0.55) + np.array([0.02, 0.0, 0.0])
    blood = np.array([0.18, 0.03, 0.04]) * (0.35 + vv[..., None] * 0.95)      # black-red, held dark (the fen lesson)
    hi = (L["moon"] > 0.5) & (vn(px * 30, py * 30) > 0.55)                  # a wet glint of moon on a bubble's crown
    bubc = np.where(hi[..., None], np.array([0.3, 0.14, 0.15]), blood)
    crater = np.array([0.1, 0.02, 0.02]) * (0.4 + vv[..., None])
    col = np.where((st == 70)[..., None], peat, col)
    col = np.where((st == 71)[..., None], slick, col)
    col = np.where((st == 72)[..., None], bubc, col)
    col = np.where((st == 73)[..., None], crater, col)
    return col


def scene_worms():
    set_origin(8)
    bs.LINE = twisting_line(16 + VARIANT, bends=vb(((-0.45, 3.0, 4.5), (0.35, -2.6, 5.0))))
    mid = bs.LINE[np.argmin(np.hypot(*(bs.LINE - C).T))]
    wc = mid - AX * 6.0 + PERP * 0.5                                    # the soft ground lies off the Back: never under a road
    bs.BED_MODS[:] = [shelf(*wc, 7.0, rise=0.12, seed=23)]
    bs.DROWNED_TREES = [(C + AX * 6.0 - PERP * 7.0, 0.36, 5.0, 78)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = [("stump", *(wc - PERP * 4.5), 0.45, 97)]
    bs.CAUSEWAYS[:], bs.RIBWALKS[:] = [], []
    bs.EXTRA_STAMPS[:] = [worm_ground(wc[0], wc[1], seed=29 + VARIANT)]
    bs.EXTRA_PAINT[:] = [worm_paint]
    bs.EXTRA_LIVING[:] = []
    ws.HERO = mid + AX * 0.2


def scene_ribwalk():
    """a branch along a great rib: the Back passes, and from its flank a fallen rib runs out over the water, curving, a
    single-file bridge of bone"""
    set_origin(7)
    bs.LINE = twisting_line(14 + VARIANT, bends=vb(((-0.4, -2.4, 4.0), (0.45, 2.0, 5.0))))
    mid = bs.LINE[len(bs.LINE) // 2]
    t = np.linspace(0, 1, 500)
    k_ = len(bs.LINE) // 2
    tg = bs.LINE[k_ + 5] - bs.LINE[k_ - 5]
    tg = tg / np.linalg.norm(tg)
    away = np.array([-tg[1], tg[0]])                                       # square off the Back's flank
    if away @ AX < 0:
        away = -away                                                       # into the open water before us
    away = away * 0.85 + tg * 0.3
    away = away / np.linalg.norm(away)
    side = np.array([-away[1], away[0]])
    start = mid + away * 2.0
    rl = start[None] + away[None] * (t * 12.0)[:, None] + side[None] * ((t ** 1.4) * 4.5)[:, None]   # the rib's own bow
    bs.RIBWALKS[:] = [rl]
    bs.CAUSEWAYS[:] = []
    bs.BED_MODS[:] = []
    bs.DROWNED_TREES = [(C + AX * 5.0 + PERP * 7.0, 0.36, 5.0, 77)]
    bs.DROWNED_WALLS, bs.GIANT_RIBS = [], []
    bs.STRUCTS[:] = []
    bs.EXTRA_STAMPS[:], bs.EXTRA_PAINT[:], bs.EXTRA_LIVING[:] = [], [], []
    ws.HERO = rl[120] + AX * 0.05                                      # out on the rib


SCENES = dict(worms=scene_worms, ribwalk=scene_ribwalk, causeway=scene_causeway, nature=scene_nature, hut=scene_hut, socket=scene_socket, skull=scene_skull, ruins=scene_ruins)

if __name__ == "__main__":
    if ":" in sys.argv[1]:                                               # NAME:VARIANT, e.g. skull:2
        sys.argv[1], VARIANT = sys.argv[1].split(":")[0], int(sys.argv[1].split(":")[1])
    SCENES[sys.argv[1]]()
    if len(sys.argv) > 3 and sys.argv[3] == "value":
        bs.VALUE_ONLY = True
    ws.main(sys.argv[2])
