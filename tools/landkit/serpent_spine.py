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
    # the vertebra and where in it: the joints are chevrons pointing forward (each laps over the next)
    sw = s - 0.16 * av / W_W * L_V                                       # the arrowhead: joints swept back from the midline
    k = np.floor(sw / L_V)
    u = sw / L_V - k                                                     # 0 at a joint .. 1 at the next
    wing = W_W * (0.82 + 0.18 * _h(k, 1, seed)) * (0.86 + 0.14 * np.cos(2 * np.pi * (u - 0.3)))
    # the roof: near pentagonal end on (a ridge, falling to the wings, the wings near flat, a rounded lip)
    ridge = 0.42 - 0.16 * np.clip(av / 0.9, 0, 1)
    wingz = 0.26 - 0.12 * np.clip((av - 0.9) / max(W_W - 0.9, 0.1), 0, 1)
    roof = np.where(av < 0.9, ridge, wingz)
    lip = np.clip((wing - av) / 0.35, 0, 1)                              # the wing's edge rounds down into the water
    roof = roof * np.sqrt(lip) - (1 - lip) * 0.3
    # the joint: a dark crescent; it gapes on the outside of a bend and closes on the inside
    gape = 0.05 + np.clip(-curv * np.sign(v) * 1.6, -0.03, 0.12) * np.clip(av / W_W, 0, 1)
    jd = np.minimum(u, 1 - u) * L_V
    joint = np.clip(1 - jd / np.maximum(gape, 0.02), 0, 1)
    roof = roof - joint * 0.32
    # the zygosphene hump in front of each spine; the spine itself broken to a stump of its own height, worn round
    hump = np.clip(1 - np.hypot((u - 0.16) / 0.1, v / 0.38), 0, 1) ** 1.5 * 0.1
    st_h = 0.15 + 0.55 * _h(k, 2, seed) ** 1.6
    st_len = 0.18 + 0.2 * _h(k, 3, seed)
    stump = np.clip(1 - np.hypot((u - 0.45) / st_len, v / 0.13), 0, 1)
    stump = np.sqrt(stump) * st_h * (1 - 0.35 * np.clip((u - 0.45) / st_len, 0, 1))   # the broken face slopes back
    # the vertebra's own tilt and settling (each lies a little its own way)
    tilt = (_h(k, 4, seed) - 0.5) * 0.12 * v / W_W + (_h(k, 5, seed) - 0.5) * 0.08
    zb = base + roof + hump + stump + tilt
    on_back = near & (av < wing + 0.05)
    # the ribs: one pair per vertebra, most sunk or broken; some arch out of the water
    zr = np.full(X.shape, -9.0)
    side = np.sign(v)
    for sgn in (-1.0, 1.0):
        show = _h(k, 6 + (sgn > 0), seed) < 0.42
        reach = 1.2 + 2.0 * _h(k, 8 + (sgn > 0), seed)                    # broken short, or long
        out = (v * sgn - wing * 0.85)
        ur = (u - (0.62 + 0.12 * out / 3.0))                              # ribs sweep back as they go out
        f_ = np.clip(out / reach, 0, 1)
        thick = (0.2 + 0.06 * _h(k, 10, seed)) * (1 - 0.55 * f_)          # a rib tapers to its tip
        arc = 0.4 * np.sin(f_ * np.pi * 0.65) - f_ ** 1.6 * 0.75          # up off the Back, then down into the water
        r_on = show & (side == sgn) & (out > -0.2) & (out < reach) & (np.abs(ur * L_V) < thick)
        zr = np.where(r_on, base + 0.2 + arc + np.sqrt(np.clip(1 - (ur * L_V / thick) ** 2, 0, 1)) * thick, zr)
    # the overgrowth: mud fills the lows first, moss and sedge root in it, so bone shows only on its crowns
    smooth = base + 0.36 - 0.14 * np.clip(av / W_W, 0, 1)                 # a soft fill over the roof
    grow = (fbm(X * 0.7 + seed, Y * 0.7) - 0.5) * 0.42 + (vn(X * 3.1, Y * 3.1 + seed) - 0.5) * 0.12
    cover = smooth + 0.1 + grow                                          # overgrown: bone only on its crowns
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
    info = dict(s=s, v=v, k=k, u=u, wet=Hn - level, crown=crown, on_back=on_back)
    return Hn, part, info
