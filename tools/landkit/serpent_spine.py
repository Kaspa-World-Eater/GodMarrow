"""The Long Back (landkit): the spine of a long-dead serpent god lying through the Sunken Bog, walked as a causeway
(Derek 2026-10-08: "an ancient spine path from a giant snake, covered in algae and dirt and mud ... the vertebrae
sometimes poking through"; its names half remembered and all wrong: the Long Back, Saint Uss's Causeway, Old Coil,
the Stair of the Drowned King). Built from chapter 8 (`art_study/chapters/08-serpent-spine-and-bog-water.md`).

FORM IS LAW: the whole Back is height in the world on the 0.04 yd grid (the depth effect), lit by the engine.
- Each vertebra is a broad, near-pentagonal roof (the neural arch over the body, as Titanoboa's), 1.6 to 2.2 yd long.
  Its wings (the zygapophyses) spread 3 to 4 yd across, and the joints between vertebrae are CHEVRONS pointing forward,
  so each lies over the next like a roof slate. On a bend the joints gape on the outside of the curve and close on the
  inside.
- The neural spines, once a fin down the middle, are broken to worn stumps of their own heights. The zygosphene humps
  in front of each.
- The ribs leave the sides at intervals and arch out and down into the water. Some are broken short.
- The Back rises and sinks along its length. Where it sinks it goes under the water and the marsh, and comes up again.
- OVERGROWN (Derek: "sometimes poking through"): mud packs the joints and lows first, and moss and sedge root in it, so
  the cover lies over the bone everywhere it dips. Bone shows only on its high crowns: the stumps, the wing edges, the
  roofs where feet keep it worn.

  stamp(X, Y, H, line, level, seed) -> (H, part, info)
      line: (N, 2) yd, the Back's centre line, densely sampled; level: the water table (yd)
      part: 0 none, 1 bone (bare), 2 cover (moss and sedge over the bone), 3 mud (joints and lows), 4 rib (bare bone)
      info: s (arc length), v (signed distance across), k (vertebra index), wet (height above water), crown (0..1)
"""
import numpy as np
from scipy.spatial import cKDTree
from kit import vn, fbm

L_V = 1.9          # yd, a vertebra's length along the Back
W_W = 1.75         # yd, the wings' half-span at their widest


def _h(k, salt, seed):
    x = np.sin((np.asarray(k, float) * 12.9898 + salt * 78.233 + seed * 3.17)) * 43758.5453
    return x - np.floor(x)


def _frame(X, Y, line):
    """for each cell: arc length s along the line, signed distance v across it (left +), the line's curvature there"""
    seg = np.diff(line, axis=0)
    sl = np.hypot(seg[:, 0], seg[:, 1])
    s_at = np.concatenate([[0.0], np.cumsum(sl)])
    tree = cKDTree(line)
    d, i = tree.query(np.stack([X.ravel(), Y.ravel()], 1))
    i = np.clip(i, 0, len(line) - 2)
    t = seg[i] / sl[i, None]
    rel = np.stack([X.ravel(), Y.ravel()], 1) - line[i]
    along = np.clip((rel * t).sum(1), -sl[i], sl[i] * 2)
    v = rel[:, 0] * t[:, 1] * -1 + rel[:, 1] * t[:, 0]
    s = s_at[i] + along
    ang = np.arctan2(seg[:, 1], seg[:, 0])
    dang = np.diff(np.unwrap(ang), prepend=np.unwrap(ang)[0])
    curv = np.convolve(dang / np.maximum(sl, 1e-6), np.ones(9) / 9, mode="same")
    return s.reshape(X.shape), v.reshape(X.shape), curv[i].reshape(X.shape), d.reshape(X.shape)


def stamp(X, Y, H, line, level=0.0, seed=7):
    H = H.copy()
    s, v, curv, dist = _frame(X, Y, np.asarray(line, float))
    near = dist < W_W + 3.2
    av = np.abs(v)
    # where the Back rises and sinks along its length (it goes under the marsh and comes up again)
    rise = (fbm(s * 0.045 + seed, 0.5) - 0.5) * 0.9 - 0.12                # low: the water laps at the wings
    base = level + rise
    # where it crosses raised ground (a chamber's shelf), the Back rides on it instead of sinking under it
    from scipy import ndimage as _nd0
    ground = _nd0.gaussian_filter(H, 12)
    base = np.maximum(base, ground - 0.12)
    # THE BODY'S SIZE along the Back (Derek 2026-10-08: "changes in width of the path for different areas"): a serpent's
    # vertebrae grow from the tail to the middle of the body and shrink again; here the Back swells and pinches along
    # its length, so the walk narrows to a hard file in places and opens to room for a fight in others
    s_tab = np.linspace(s[near].min() - 1, s[near].max() + 1, 3000) if near.any() else np.linspace(0, 1, 10)
    sz_tab = np.clip(0.55 + (fbm(s_tab * 0.028 + seed, 1.3) - 0.3) * 1.4, 0.52, 1.32)
    ph_tab = np.concatenate([[0.0], np.cumsum(np.diff(s_tab) / (L_V * sz_tab[1:]))])
    sz = np.interp(s, s_tab, sz_tab)
    # the vertebra and where in it: the joints are chevrons pointing forward (each laps over the next)
    sw = s - 0.16 * av / (W_W * sz) * L_V * sz                           # the arrowhead: joints swept back from the midline
    phi = np.interp(sw, s_tab, ph_tab)
    k = np.floor(phi)
    u = phi - k                                                          # 0 at a joint .. 1 at the next
    Lk = L_V * sz
    wing = W_W * sz * (0.78 + 0.22 * _h(k, 1, seed)) * (0.86 + 0.14 * np.cos(2 * np.pi * (u - 0.3)))
    # a wing snapped off short on one side, now and then, its edge ragged
    snap = (_h(k, 13 + (v > 0), seed) < 0.2)
    wing = np.where(snap, wing * (0.5 + 0.12 * vn(u * 9 + k, 3.0)), wing)
    # the roof: near pentagonal end on (a ridge, falling to the wings, the wings near flat, a rounded lip)
    ridge = 0.42 - 0.16 * np.clip(av / (0.9 * sz), 0, 1)
    wingz = 0.26 - 0.12 * np.clip((av - 0.9 * sz) / np.maximum(wing - 0.9 * sz, 0.1), 0, 1)
    roof = np.where(av < 0.9 * sz, ridge, wingz) * sz
    lip = np.clip((wing - av) / 0.35, 0, 1)                              # the wing's edge rounds down into the water
    roof = roof * np.sqrt(lip) - (1 - lip) * 0.3
    # the joint: a dark crescent; it gapes on the outside of a bend and closes on the inside
    gape = 0.05 + np.clip(-curv * np.sign(v) * 1.6, -0.03, 0.12) * np.clip(av / W_W, 0, 1)
    jd = np.minimum(u, 1 - u) * Lk
    joint = np.clip(1 - jd / np.maximum(gape, 0.02), 0, 1)
    roof = roof - joint * 0.32
    # the zygosphene hump in front of each spine; the spine itself broken to a stump of its own height, worn round
    hump = np.clip(1 - np.hypot((u - 0.16) / 0.1, v / (0.38 * sz)), 0, 1) ** 1.5 * 0.1 * sz
    # the neural spine's stump, each its own: gone to a pit, broken low, standing tall and jagged, or split in two
    kind = _h(k, 11, seed)
    st_h = np.where(kind < 0.2, -0.05, np.where(kind < 0.6, 0.12 + 0.2 * _h(k, 2, seed), 0.4 + 0.45 * _h(k, 2, seed))) * sz
    st_len = (0.16 + 0.2 * _h(k, 3, seed)) * sz
    off = np.where(kind > 0.85, 0.13 * sz, 0.0)                          # split: two prongs
    sd1 = np.hypot((u - 0.45) / st_len, (np.abs(v) - off) / (0.11 * sz))
    stump = np.clip(1 - sd1, 0, 1)
    jag = (vn(u * 23 + k, v * 23) - 0.5) * 0.25 * (kind >= 0.6)             # its broken top torn
    stump = np.sqrt(stump) * st_h * (1 - 0.35 * np.clip((u - 0.45) / st_len, 0, 1) + jag)
    # cracks across the roof and chunks gone from it (the damage of ages; every vertebra its own)
    ca = _h(k, 15, seed) * np.pi
    cr = np.abs((u - 0.5) * Lk * np.cos(ca) + v * np.sin(ca) + (vn(u * 7 + k, v * 7) - 0.5) * 0.12)
    crack = (_h(k, 16, seed) < 0.55) & (cr < 0.025)
    bite_u, bite_v = 0.2 + 0.6 * _h(k, 17, seed), (_h(k, 18, seed) - 0.5) * 2 * wing * 0.7
    bite = (_h(k, 19, seed) < 0.18) & (np.hypot((u - bite_u) * Lk, v - bite_v) < 0.35 * sz + (vn(u * 9, v * 9) - 0.5) * 0.15)
    # the vertebra's own tilt and settling (each lies a little its own way)
    tilt = (_h(k, 4, seed) - 0.5) * 0.22 * v / (W_W * sz) + (_h(k, 5, seed) - 0.5) * 0.16 * sz   # each settled its own way
    # THE BONE'S OWN FORM (Derek 2026-10-08: "the texture of the bone more too, and the depths and curves of it"):
    # - a saddle: the roof dips between the ridge and the wing's keel, then rises to it (the arch is not a flat plate);
    # - the keel along each wing (the zygapophyseal ridge), proud and rounded;
    # - raised rims round each joint, the articular faces standing up before the groove;
    # - nutrient foramina: small deep pits, two to four to a vertebra;
    # - the surface itself: fine pitting of weathered bone, and cracks along its grain (running with the body)
    ws_ = np.clip(av / np.maximum(wing, 0.3), 0, 1)
    saddle = -0.07 * np.sin(np.clip((ws_ - 0.18) / 0.5, 0, 1) * np.pi) * sz
    keel = 0.06 * np.exp(-((ws_ - 0.72) / 0.07) ** 2) * sz * (1 - snap * 0.6)
    rim = 0.05 * np.exp(-((jd - 0.1 * sz) / 0.05) ** 2) * sz * (ws_ < 0.95)
    fx_u, fx_v = 0.3 + 0.4 * _h(k, 24, seed), (_h(k, 25, seed) - 0.5) * 1.2 * sz
    fx2_u, fx2_v = 0.25 + 0.5 * _h(k, 26, seed), -fx_v * 0.8
    foram = (np.hypot((u - fx_u) * Lk, v - fx_v) < 0.05) | (np.hypot((u - fx2_u) * Lk, v - fx2_v) < 0.04)
    pit = (vn(X * 9 + seed, Y * 9) - 0.5) * 0.02                          # pitting a hand across is form; the finer is colour
                                                                          # (form law 0.3: under a pixel it speckles the light)
    grain = np.abs(np.sin(v * 31.0 / sz + vn(s * 1.3, v * 2.0) * 4.0)) < 0.06
    grain = grain & (vn(s * 0.9 + k, v * 3.0) > 0.55)
    zb = (base + roof + hump + stump + tilt + saddle + keel + rim + pit
          - crack * 0.05 - bite * 0.3 - foram * 0.09 - grain * 0.018)
    on_back = near & (av < wing + 0.05)
    # the ribs: one pair per vertebra, most sunk or broken; some arch out of the water
    zr = np.full(X.shape, -9.0)
    side = np.sign(v)
    for sgn in (-1.0, 1.0):
        show = _h(k, 6 + (sgn > 0), seed) < 0.42                          # the Back keeps its ribs (Derek: "don't remove the path ribs")
        reach = (1.2 + 2.0 * _h(k, 8 + (sgn > 0), seed)) * sz             # broken short, or long
        out = (v * sgn - wing * 0.85)
        ur = (u - (0.62 + 0.12 * out / 3.0)) * sz                         # ribs sweep back as they go out
        f_ = np.clip(out / reach, 0, 1)
        thick = (0.2 + 0.06 * _h(k, 10, seed)) * sz * (1 - 0.55 * f_)     # a rib tapers to its tip
        arc = 0.4 * np.sin(f_ * np.pi * 0.65) - f_ ** 1.6 * 0.75          # up off the Back, then down into the water
        r_on = show & (side == sgn) & (out > -0.2) & (out < reach) & (np.abs(ur * L_V) < thick)
        zr = np.where(r_on, base + 0.2 + arc + np.sqrt(np.clip(1 - (ur * L_V / thick) ** 2, 0, 1)) * thick, zr)
    # the overgrowth: mud fills the lows first, moss and sedge root in it, so bone shows only on its crowns
    smooth = base + 0.36 - 0.14 * np.clip(av / W_W, 0, 1)                 # a soft fill over the roof
    grow = (fbm(X * 0.7 + seed, Y * 0.7) - 0.5) * 0.42 + (vn(X * 3.1, Y * 3.1 + seed) - 0.5) * 0.12
    # how buried the Back is changes along it: stretches scoured bare where the water runs over it at flood (whole
    # vertebrae show, roofs, wings and joints), stretches sunk under the growth with only the crowns through
    # (bared and buried in turn along the Back, a stretch every dozen yards or so, never the same length twice)
    expose = np.clip(0.45 + 0.85 * np.sin(s * 2 * np.pi / 13.0 + seed + (fbm(s * 0.05, 7.0 + seed) - 0.5) * 3.0)
                     + (fbm(s * 0.08 + seed * 2, 4.0) - 0.5) * 0.8, 0, 1)
    cover = smooth + 0.1 + grow - expose * 0.34                          # overgrown, but not everywhere
    # moss cushions (Derek: "the green spots look flat and blobby"): domes of real height a hand to a foot across,
    # so the engine lights each one; their colour follows their form in the painter, not a painted patch
    cush = np.clip((vn(X * 5.0 + seed, Y * 5.0) - 0.42) * 2.4, 0, 1) ** 0.6 * 0.07 + (vn(X * 14, Y * 14 + seed) - 0.5) * 0.02
    cover = cover + cush
    # "where the mud clutches and lets go" (the lore): bootholes down the trodden middle, half closed, holding water
    step = 0.42
    fi = np.floor(s / step)
    vf = np.where(fi % 2 == 0, 0.15, -0.15) + (_h(fi, 21, seed) - 0.5) * 0.1
    boot = (np.hypot((s - (fi + 0.5) * step) * 0.9, v - vf) < 0.075) & (_h(fi, 22, seed) < 0.6) & (av < 0.7)
    cover = cover - boot * 0.07
    # where it is bared, the growth only lies in the joints and along the wings' lips: the vertebrae show whole
    cover = np.where(expose > 0.35, np.minimum(cover, zb - 0.03 + joint * 0.3 + (1 - lip) * 0.3 + bite * 0.3), cover)
    # the flank: the mud and growth run on past the wing's edge and slope down into the water, a bank, not a wall
    past = np.clip((av - wing) / (0.9 + 0.5 * vn(s * 0.5 + seed, 3.0)), 0, 1)
    cover = cover - past ** 1.4 * 0.9
    flank = near & (av < wing + 1.4)
    cover = np.where(flank, cover, -9.0)
    Hb = np.where(on_back, np.maximum(zb, cover), np.where(flank, cover, -9.0))
    part = np.zeros(X.shape, int)
    bare = on_back & (zb >= cover)
    grown = flank & ~bare & (Hb > H)
    part[grown] = 2
    part[grown & ((joint > 0.3) | (cover - zb > 0.22) | (past > 0.35))] = 3
    part[bare] = 1
    rib_top = zr > np.maximum(Hb, H)
    part[rib_top] = 4
    Hn = np.maximum(np.maximum(H, Hb), zr)
    Hn = np.where(near, Hn, H)
    crown = np.clip((zb - cover) / 0.2, 0, 1)
    from scipy import ndimage as _nd
    cav = Hn - _nd.gaussian_filter(Hn, 5)                                 # the bone's hollows (-) and crowns (+), for its stain
    info = dict(s=s, v=v, k=k, u=u, wet=Hn - level, crown=crown, on_back=on_back, cush=cush, boot=boot & (part >= 2), cav=cav,
                expose=expose,
                stain=_h(k, 23, seed), sz=sz, wing=wing)
    return Hn, part, info
