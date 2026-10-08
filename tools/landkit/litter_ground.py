"""The old-growth floor (landkit ground generator), replacing the retired fixed leaf tiles (MASTER_RULES 2b.6: the ground
is a world-position generator, every yard its own). From the old-growth chapter: the floor is in layers, this year's
litter over the fermentation layer over the black greasy humus; the litter drifts against things and into the pits and
thins on the mounds, where the humus shows; moss maps the wet and the still; bare mineral soil on the fresh mounds.

ALIVE, NOT QUIET (Derek 2026-10-08: "you lost the life, the ground is 35% too barren now, looks more flat because of the
vast swathes of brown, lack of litter"). The first version painted broad matted patches near one brown; it is retired.
Now every leaf is its own small tilted, curled plate in the world (relief(): real height on the 0.04 yd grid, so the
engine lights each leaf through its own normal and the gaps between them fall into shade, FORM IS LAW), two layers
deep where the litter lies thick, with fallen twigs as raised sticks; and each leaf takes its own colour from its
species and age (rust, ochre, dun, grey, the odd fresh one), so the floor has value at the scale of a leaf, not a
swathe. Moss is green again in its cushions, where the wet map puts it.

  relief(X, Y, litt, seed) -> dH            yards, to add to the ground where nothing stands
  paint(img, m, v, px, py, litt, mat, lamp) -> img      litt: litter depth 0..1+; mat: 0 litter, 1 moss, 2 bare soil
"""
import numpy as np
from kit import vn, ramp

R_HUMUS = ramp("#0b0807", "#140e0b", "#1e1510", "#291d15", "#35261b", "#423021")    # black greasy humus, in the gaps
R_SOIL = ramp("#17120f", "#231c16", "#31271f", "#403228", "#4f3f33")                # bare mineral soil on the fresh mounds
R_MOSS = ramp("#0a110a", "#122013", "#1b2e18", "#263d1d", "#334d22", "#425e29", "#557030")   # moss cushions, green again
# the leaves, by species and age (each its own ramp, hue-shifted: violet darks, warm lights)
LEAF = [
    ramp("#1a0d0a", "#2e140c", "#47200f", "#632d12", "#7e3d16", "#97501f", "#ad652b"),   # rust: oak and beech, this year
    ramp("#1c130a", "#30210f", "#493314", "#62461a", "#7a5a22", "#91702d", "#a5853b"),   # ochre: birch, maple, gone yellow
    ramp("#130d0b", "#21160f", "#312015", "#412b1b", "#513722", "#61432a", "#705032"),   # dun: last year's, darkening
    ramp("#121011", "#1e1a1a", "#2b2524", "#39312e", "#473d38", "#554943", "#62554d"),   # grey: skeletons, bleached
    ramp("#0f120a", "#1b200f", "#2a3014", "#3b4019", "#4d501f", "#5f5f27", "#706d31"),   # fresh: green-gold, just down
]
FAM_P = np.cumsum([0.3, 0.18, 0.34, 0.13, 0.05])                                    # how many of each
DUN = LEAF[2]
for _f in (0, 1, 4):                                                                # a forest floor at night is muted: the
    LEAF[_f] = LEAF[_f] * 0.72 + DUN * 0.28                                         # bright kinds pulled a step toward dun


def _hash(i, j, s):
    h = (i * 374761393 + j * 668265263 + s * 2147483647) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return (h ^ (h >> 16)) / 4294967295.0


def _layer(x, y, cell, seed):
    """one layer of leaves: a jittered grid, each cell's leaf an ellipse at its own angle and size. Returns its
    height above the humus (yards, 0 off the leaf), the leaf's id and its unit position within the leaf (for curl)"""
    gi = np.floor(x / cell).astype(np.int64)
    gj = np.floor(y / cell).astype(np.int64)
    best = np.full(x.shape, 9.0)
    hgt = np.zeros(x.shape)
    lid = np.zeros(x.shape, np.int64)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ci, cj = gi + di, gj + dj
            cx = (ci + _hash(ci, cj, seed)) * cell
            cy = (cj + _hash(ci, cj, seed + 1)) * cell
            ang = _hash(ci, cj, seed + 2) * np.pi
            ln = cell * (0.55 + 0.6 * _hash(ci, cj, seed + 3))                  # half-length
            wd = ln * (0.38 + 0.3 * _hash(ci, cj, seed + 4))                    # half-width
            dx, dy = x - cx, y - cy
            u = (dx * np.cos(ang) + dy * np.sin(ang)) / ln
            v = (-dx * np.sin(ang) + dy * np.cos(ang)) / wd
            d = u * u + v * v
            tilt = (_hash(ci, cj, seed + 5) - 0.5) * 0.03                       # each leaf lies at its own tilt
            curl = 0.008 + 0.014 * _hash(ci, cj, seed + 6)                      # edges curled up, the midrib down
            z = 0.008 + tilt * u + curl * (v * v) - 0.004 * (1 - abs(v)) * (abs(u) < 0.9)
            on = (d < 1.0) & (z + 0.02 > hgt)
            take = on & ((hgt == 0) | (_hash(ci, cj, seed + 7) > 0.35))          # overlaps: the later leaf lies on top
            hgt = np.where(take, np.maximum(z, 0.003), hgt)
            lid = np.where(take, (ci * 92821 + cj * 68917 + seed) & 0x7FFFFFFF, lid)
            best = np.where(take, d, best)
    return hgt, lid, best


def _twigs(x, y, seed):
    """fallen twigs: a few thin raised sticks per square yard, each straight with a kink, lying where they fell"""
    cell = 0.55
    gi = np.floor(x / cell).astype(np.int64)
    gj = np.floor(y / cell).astype(np.int64)
    out = np.zeros(x.shape)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ci, cj = gi + di, gj + dj
            keep = _hash(ci, cj, seed + 11) < 0.45
            cx = (ci + _hash(ci, cj, seed + 12)) * cell
            cy = (cj + _hash(ci, cj, seed + 13)) * cell
            ang = _hash(ci, cj, seed + 14) * np.pi
            ln = 0.12 + 0.3 * _hash(ci, cj, seed + 15)
            th = 0.012 + 0.012 * _hash(ci, cj, seed + 16)
            dx, dy = x - cx, y - cy
            u = dx * np.cos(ang) + dy * np.sin(ang)
            v = -dx * np.sin(ang) + dy * np.cos(ang) - np.where(u > 0, u * (_hash(ci, cj, seed + 17) - 0.5) * 0.5, 0)
            r = np.sqrt(np.clip(1 - (v / th) ** 2, 0, 1)) * th * 1.2
            out = np.maximum(out, np.where(keep & (np.abs(u) < ln) & (np.abs(v) < th), 0.012 + r, 0))
    return out


def relief(X, Y, litt, seed=3):
    """the litter as real height (yards): two layers of leaves where it lies deep, one where thin, the humus between;
    twigs over all. Its id fields are recomputed from world position in paint(), so nothing needs storing"""
    cover = np.clip((litt - 0.2) * 1.4, 0, 1)
    h1, _, _ = _layer(X, Y, CELL1, seed)
    h2, _, _ = _layer(X + 0.031, Y - 0.017, CELL2, seed + 50)
    vis1, vis2 = _visible(X, Y, h1, h2, litt, seed)
    dH = np.where(vis1, h1, 0.0)
    dH = np.where(vis2, np.maximum(dH, h2 + 0.012), dH)
    return np.maximum(dH, _twigs(X, Y, seed))


CELL1, CELL2 = 0.17, 0.2                                                   # a leaf about 5 art px long, as the drawn ones were


def _cov_noise(x, y, seed):
    return vn(x * 2.2 + seed, y * 2.2) * 0.6 + vn(x * 7.0, y * 7.0 + seed) * 0.4


def _drift(x, y, seed):
    """the floor's big structure (the lesson of the "before" floors): drifts where the leaves lie thick, and between
    them broad patches of dark humus and soil with only a few leaves, a yard or two across"""
    return vn(x * 0.55 + seed * 0.3, y * 0.55) * 0.65 + vn(x * 1.5, y * 1.5 + seed) * 0.35


def _visible(x, y, h1, h2, litt, seed):
    cover = np.clip((litt - 0.2) * 1.4, 0, 1)
    dr = np.clip((_drift(x, y, seed) - 0.4) * 3.0, 0, 1) * (0.12 + cover * 0.88)    # 0 in the humus patches .. 1 in a drift;
                                                                                # worn and thin ground (a yard, a path) stays near bare
    n1, n2 = _cov_noise(x, y, seed), _cov_noise(x + 3, y, seed)
    vis1 = (h1 > 0) & (n1 < 0.04 + cover * 0.18 + dr * 0.78)                    # a few leaves even in the humus
    vis2 = (h2 > 0) & (n2 < dr * 0.75)
    return vis1, vis2


def paint(img, m, v, px, py, litt, mat, lamp=None, seed=3):
    if not m.any():
        return img
    x, y = px[m], py[m]
    vv = np.clip(v[m], 0, 0.99)
    lt = litt[m]
    cover = np.clip((lt - 0.2) * 1.4, 0, 1)
    h1, id1, d1 = _layer(x, y, CELL1, seed)
    h2, id2, d2 = _layer(x + 0.031, y - 0.017, CELL2, seed + 50)
    vis1, vis2 = _visible(x, y, h1, h2, lt, seed)
    lid = np.where(vis2, id2, np.where(vis1, id1, -1))
    dd = np.where(vis2, d2, d1)
    col = R_HUMUS[np.clip((vv * 0.9 * len(R_HUMUS)).astype(int), 0, len(R_HUMUS) - 1)]
    on = lid >= 0
    if on.any():
        r1 = (lid[on] * 2654435761 % 4294967296) / 4294967296.0
        r2 = (lid[on] * 40503 % 65536) / 65536.0
        sp_ = vn(x[on] * 0.9 + 11, y[on] * 0.9) * 0.5 + r1 * 0.5              # which tree's leaves lie here: a leaning, not a blotch
        fam = np.searchsorted(FAM_P, np.clip(sp_, 0, 0.999) * FAM_P[-1])
        fam = np.where(lt[on] < 0.45, np.where(fam == 0, 2, fam), fam)          # thin litter: older, darker leaves
        age = (r2 - 0.5) * 0.12                                                  # each leaf a small step of its own
        edge = np.where(dd[on] > 0.72, -0.08, 0.0)                               # a darker rim round each leaf
        t = np.clip(vv[on] * 0.86 + age + edge, 0, 0.99)
        out = np.zeros((on.sum(), 3))
        for f in range(len(LEAF)):
            k = fam == f
            if k.any():
                out[k] = LEAF[f][np.clip((t[k] * len(LEAF[f])).astype(int), 0, len(LEAF[f]) - 1)]
        col[on] = out
    tw = _twigs(x, y, seed) > 0                                                  # the twigs: grey-brown bark, dark ends
    col[tw] = LEAF[3][np.clip((vv[tw] * 0.85 * 7).astype(int), 0, 6)] * np.array([1.05, 0.95, 0.85])
    flk = (~on) & (vn(x * 13 + 5, y * 13) > 0.78) & (_drift(x, y, seed) < 0.5)   # small moss cushions in the humus, not specks
    col[flk] = R_MOSS[np.clip((vv[flk] * 0.9 * len(R_MOSS)).astype(int) + 1, 0, len(R_MOSS) - 1)]
    mt = mat[m]
    soil = R_SOIL[np.clip((vv * len(R_SOIL)).astype(int), 0, len(R_SOIL) - 1)]
    bare = mt == 2
    col[bare & ~on] = soil[bare & ~on]
    moss = mt == 1
    cush = (vn(x * 9, y * 9) - 0.5) * 0.14 + (vn(x * 26, y * 26) - 0.5) * 0.08
    mc = R_MOSS[np.clip(((vv * 0.95 + cush) * len(R_MOSS)).astype(int), 0, len(R_MOSS) - 1)]
    col[moss] = np.where((on & (_hash(lid, 0, 9) < 0.3))[moss][:, None], col[moss], mc[moss])   # a few leaves lie on the moss
    if lamp is not None:                                                         # the lantern warms what it reaches
        warm = np.clip(lamp[m] - 0.1, 0, 1.2)[:, None] * np.array([0.5, 0.24, 0.03])
        col = col * (1 + warm * 0.8)
    img[m] = np.clip(col, 0, 1)
    return img
