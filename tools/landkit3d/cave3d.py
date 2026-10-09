"""The opening: the cave under the black cliffs (tools/landkit/passes/opening_cave.md). Where the game begins: a pool
of blood in the dark, where the Red seeps in under the cliffs; stairs cut up the column stumps between walls of
columns, great faces carved in them, a skeleton fixed to the wall holding out its weapon; the hall with the empty
throne set in the open mouth of a colossal face, the heap of everything the ones before left at its feet, the dark
mirrors holding the fires, and the door out through the cliff face.

Fingal's Cave on Staffa is the real thing: a sea cave in columnar basalt. Pass 5 (Derek: "The basalt is too uniform";
"There's no cinematography. No. Ambiance. It doesn't inspire wonder"; chapter 12): the columns are a power diagram of
every girth, rough drums with worn arrises and lost flakes, breakdown at the walls' feet; the faces are deep relief,
bigger than the pilgrim, each raked by its own wisp-fire (the Ice Age carvings were made to move in firelight); the
throne sits in the mouth of a face eight yards tall (Bomarzo's Orcus, the mouth in the rock with a seat inside), lit
from below by the two braziers, the hall's one subject; dark mirrors of obsidian ring the hall, a wisp candle before
each, so the fires multiply into the walls (Burke's infinity). The camera sees in as the game will: the roof and the
near walls are hidden from it (cut to stubs) but still shade."""
import math
import random
import numpy as np
import parts3d as P
import cliff3d as C

FLOOR_MODULE = "floor3d"
LAMPS = []
MIRRORS = []
LAMP_REF = 0.05
SAMPLES = 128                            # the fires' light must be clean: noise in it becomes noise of hue
WISP = (1.0, 0.55, 0.22)                 # the fires: ordinary orange fire (Derek, 2026-10-09: "Change the wisp fire into
                                         # normal orange fires"; it was white-blue wisp-fire before)
RED = (1.0, 0.12, 0.06)                  # the pool's glow (Derek: "glowing red near the pool"; the one red light allowed)

POOL = (0.0, 0.0, 9.5, 7.4)              # the pool chamber: centre x, y and radii (yards)
STAIR = (-4.6, -0.2, -5.8, -19.5)        # the stairs: x from, x to, y from (bottom), y to (top)
HALL = (-1.9, -31.5, 11.0, 9.5)          # the hall, up and to the right, so the stair's carved wall never hides it
BASIN = (-1.6, -1.4, 2.4)                  # the pool itself: centre and the radius of its deep heart
FLOOR_HALL = 6.0
STEPS = 17
DOOR = (5.9, -38.1)
AMBIENT = 0.05                           # nothing reaches in here: the fires make all the light (chapter 12, rule 2)
CARVE_H = 4.2                            # how high the builders dressed the hall's walls before they stopped
WORN = []                                # where countless feet have climbed: (x0, y0, x1, y1, half-width), for the painter
SERENE = True                            # every face carved to Derek's reference (2026-10-09)
MASKS = True                             # every face but the great one is a smooth mask (Derek, 2026-10-09)
FACE_TH = math.radians(222.0)            # where the colossal face is cut in the hall's back wall


def _ell(x, y, e):
    cx, cy, rx, ry = e
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2


def floor_at(x, y, k=0.5):
    """the floor's height where a column stump stands, or None where the rock is solid (a wall)"""
    if _ell(x, y, POOL) < 1.0:
        db = math.hypot(x - BASIN[0], y - BASIN[1])
        if db >= BASIN[2] and _in_runnel(x, y):
            return -0.34 + k * 0.1                                  # the worn channel, under the blood
        if db < BASIN[2]:
            return -0.75 + (0.5 if k > 0.85 else 0.0)              # under the blood, a stump or two rising as islands
        if db < BASIN[2] + 1.3:
            return -0.32 + k * 0.42                                 # the shore: stumps in and out of the blood
        return 0.05 + (k - 0.5) * 0.5
    x0, x1, y0, y1 = STAIR
    if x0 < x < x1 and y1 < y < y0:
        u = (y0 - y) / (y0 - y1)                                    # up the stairs, 0 to 1
        step = math.floor(u * STEPS) / STEPS
        return step * FLOOR_HALL + (k - 0.5) * 0.16
    if _ell(x, y, HALL) < 1.0:
        return FLOOR_HALL + hall_relief(x, y) + (k - 0.5) * 0.04
    return None


def hall_relief(x, y):
    """the hall floor's depth (MASTER_RULES 0.5b; Derek: the starting area's floors too): the flags heaved and sunk
    by the ground beneath in long low swells, and worn into a shallow trough along the way countless feet took from the
    stairs' head to the great face's mouth (the worn way, as real form, not only painted)"""
    heave = 0.11 * (_vn(x * 0.22, y * 0.22, 7) - 0.5) + 0.05 * (_vn(x * 0.6, y * 0.6, 9) - 0.5)
    fx_, fy_ = _face_span()[:2]
    d = _seg_dist(x, y, -2.4, -20.6, fx_, fy_)
    trough = 0.085 * math.exp(-(d / 1.35) ** 2)
    return heave - trough


def inside(x, y):
    return floor_at(x, y) is not None


def carved(x, y):
    """how made the cave is here: 0 in the pool chamber (raw basalt), rising up the stairs, 1 in the hall (Derek: "it
    becomes more carved and more")"""
    return min(1.0, max(0.0, (-y - 8.0) / 11.0))


def _hall_pt(th, r=1.0):
    cx, cy, rx, ry = HALL
    return cx + rx * r * math.cos(th), cy + ry * r * math.sin(th)


def hall_spot(th, r=0.985):
    x, y = _hall_pt(th, r)
    nx, ny = HALL[0] - x, HALL[1] - y
    nl = math.hypot(nx, ny)
    return x, y, nx / nl, ny / nl


# ---- the carved faces ----

def _vn(x, y, s=0):
    """smooth value noise (pure python, for the reliefs' wear)"""
    xi, yi = math.floor(x), math.floor(y)
    fx, fy = x - xi, y - yi
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    def h(i, j):
        v = math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453
        return v - math.floor(v)
    a, b, c, d = h(xi, yi), h(xi + 1, yi), h(xi, yi + 1), h(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy


def _g(dx, dy, sx, sy):
    return math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2))


def face_params(kind, seed):
    """each face its own design (Derek: "The faces needs work"; the brief: "blunt, distinct, worn"): the head's width
    and length, the brow's height, the eyes' spacing, the nose's length, the mouth's width; and for some, what is
    wrong with it (Derek: "they look weird")"""
    r = random.Random(seed * 7919 + 17)
    p = dict(hw=r.uniform(0.56, 0.74), hl=r.uniform(0.92, 1.04), brow=r.uniform(0.2, 0.3), eye=r.uniform(0.23, 0.33),
             eyey=r.uniform(0.04, 0.12), nose=r.uniform(0.75, 1.15), mouthw=r.uniform(0.2, 0.32), mouthy=r.uniform(-0.48, -0.38),
             chin=r.uniform(0.04, 0.09), lift=r.uniform(-0.15, 0.25), third=False, low=0.0, sock2=1.0, stitched=False,
             inner=False, crack=[], broken=None)
    if kind == "plain":
        p.update(hw=0.62, hl=1.0, brow=0.26, eye=0.27, eyey=0.09, nose=0.95, mouthw=0.24, mouthy=-0.42, chin=0.07, lift=0.0)
        return p
    if kind == "mirrormouth":
        p.update(hw=0.62, hl=1.0, brow=0.27, eye=0.27, eyey=0.1, nose=0.85, mouthw=0.3, mouthy=-0.36, chin=0.06, lift=0.0)
        p["crack"] = [(0.2, 1.0, 0.45, 0.2)]
        return p
    if kind == "orcus":
        p.update(hw=0.64, hl=1.0, brow=0.28, eye=0.28, eyey=0.12, nose=0.55, mouthw=0.27, mouthy=-0.45, chin=0.0, lift=0.0)
        p["crack"] = []                                             # one smooth great face
        return p
    # every face but the great one is a mask in the wall's own stone (Derek: "just the features like porcelain mas[ks]
    # but made of the wall ... Nothing in their mouths"): smooth, nothing wrong, no cracks, no broken pieces
    if MASKS:
        return p
    wrong = r.random()
    if wrong < 0.2:
        p["third"] = True                                       # a third socket in the brow
    elif wrong < 0.35:
        p["low"] = r.uniform(0.08, 0.14)                        # one eye fallen lower than the other
    elif wrong < 0.5:
        p["sock2"] = r.uniform(1.5, 1.9)                        # one socket far larger
    elif wrong < 0.62 and kind not in ("mouthless",):
        p["stitched"] = True                                    # the mouth sewn shut in cuts
    elif wrong < 0.72:
        p["inner"] = True                                       # a second small face in the mouth
    for _ in range(r.randint(1, 3)):                            # cracks right across, as the rock split
        x0, y0 = r.uniform(-0.7, 0.7), r.uniform(0.6, 1.1)
        p["crack"].append((x0, y0, x0 + r.uniform(-0.5, 0.5), r.uniform(-1.0, 0.0)))
    if r.random() < 0.55:                                       # a piece broken away to the rough
        p["broken"] = (r.choice((-1, 1)) * r.uniform(0.25, 0.55), r.choice((r.uniform(-0.85, -0.55), r.uniform(0.55, 0.9))),
                       r.uniform(0.22, 0.38))
    return p


def _seg_dist(X, Y, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    t = max(0.0, min(1.0, ((X - x0) * dx + (Y - y0) * dy) / (dx * dx + dy * dy + 1e-9)))
    return math.hypot(X - x0 - dx * t, Y - y0 - dy * t)


def serene_depth(X, Y, kind, seed):
    """a face carved as Derek's reference is (2026-10-09, "Here is a good carved face example"): naturalistic, serene,
    rising out of the rough rock with no outline: the head a true rounded mass tapering to the jaw, its edge broken into
    the rock; soft sockets; heavy closed lids, each a convex form with a dark crease beneath; the nose rising out of the
    brow to a rounded tip, its nostrils in shadow; full lips slightly parted on a dark line; a firm chin. Kinds: closed
    (lids, the default), eyeless (sockets empty), full (open eyes), plain (the mouth open), mouthless, orcus (the maw)"""
    def g(dx, dy, sx, sy):
        return math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2))
    ax = abs(X)
    # the head: wide at the cheekbones, tapering to the jaw and chin; rounded, so the light turns over it
    hw = 0.6 * (1.0 - 0.42 * max(0.0, -Y - 0.15) ** 1.2) * (1.0 - 0.12 * max(0.0, Y - 0.55))
    e = (X / max(hw, 0.12)) ** 2 + (Y / 1.0) ** 2
    rag = (_vn(X * 3.0, Y * 3.0, seed + 41) - 0.5) * 0.35 + (_vn(X * 9.0, Y * 9.0, seed + 42) - 0.5) * 0.12
    wr = min(1.0, 0.3 + max(0.0, min(1.0, (Y - 0.3) / 0.35)) + max(0.0, min(1.0, (ax - 0.3) / 0.25)))
    e2 = e + rag * wr                                                       # the brow and sides break into the rock
    head = 0.21 * max(0.0, 1.0 - e2) ** 0.5
    f = 0.0
    eyx, eyy = 0.25, 0.1
    # brow: soft arcs; the sockets: broad shallow hollows
    for sx in (-1, 1):
        # the brow slanting up to the middle (grief lifts the inner ends and draws them together)
        u_ = (X - sx * eyx) / 0.2
        f += 0.03 * g(X - sx * eyx * 0.9, Y - (0.25 - 0.06 * u_ * sx), 0.17, 0.08)
        f -= 0.075 * g(X - sx * eyx, Y - eyy, 0.16, 0.11)
        if kind in ("eyeless", "orcus"):
            f -= 0.11 * g(X - sx * eyx, Y - eyy, 0.11, 0.08)                  # empty, holding black
        elif kind == "full":
            f += 0.07 * g(X - sx * eyx, Y - eyy, 0.09, 0.055)                 # the open eye, a smooth orb
            f += 0.03 * g(X - sx * eyx, Y - eyy - 0.05, 0.11, 0.025)          # its upper lid
        else:
            # the closed lid: a heavy convex form, its lower edge a sharp dark crease, curving down at the outer corner
            u = (X - sx * eyx) / 0.13
            if abs(u) < 1.2:
                yc = eyy - 0.015 - 0.02 * u * u - 0.035 * max(0.0, u * sx)       # sagging at the outer corner
                f += 0.075 * g(X - sx * eyx, Y - eyy - 0.01, 0.13, 0.06)
                f -= 0.045 * math.exp(-((Y - yc + 0.045) / 0.012) ** 2) * max(0.0, 1 - (u / 1.1) ** 2)
                f -= 0.015 * math.exp(-((Y - yc - 0.065) / 0.018) ** 2) * max(0.0, 1 - (u / 1.0) ** 2)   # the upper crease
    if kind != "orcus" or True:
        f += 0.03 * g(X, Y - 0.29, 0.08, 0.06)                              # the knot between the brows
        for sx in (-1, 1):
            f -= 0.018 * g(X - sx * 0.04, Y - 0.27, 0.012, 0.06)            # the creases between them
        for yy_ in (0.42, 0.5):
            f -= 0.014 * math.exp(-((Y - yy_ - 0.04 * (X / 0.2) ** 2) / 0.014) ** 2) * max(0.0, 1 - (X / 0.22) ** 2)
    # the nose: the bridge rising out of the brow, broadening, to a rounded tip; the wings; the nostrils in shadow
    if -0.24 < Y < 0.2:
        u = (0.2 - Y) / 0.44
        w = 0.05 + 0.05 * u
        f += (0.03 + 0.11 * u) * math.exp(-(X / w) ** 2)
    f += 0.05 * g(X, Y + 0.21, 0.07, 0.06)
    for sx in (-1, 1):
        f += 0.035 * g(X - sx * 0.075, Y + 0.24, 0.045, 0.04)
        f -= 0.05 * g(X - sx * 0.045, Y + 0.275, 0.025, 0.018)
    f -= 0.03 * g(X, Y + 0.3, 0.12, 0.03)                                    # the shadow under the nose
    f -= 0.018 * g(X, Y + 0.33, 0.02, 0.04)                                  # the philtrum
    # cheeks full, the fold from the nose to the mouth soft
    for sx in (-1, 1):
        f += 0.04 * g(X - sx * 0.33, Y + 0.08, 0.13, 0.12)
        f -= 0.02 * g(X - sx * 0.3, Y + 0.3, 0.1, 0.1)                      # hollow under the bone
        f -= 0.012 * g(X - sx * 0.16, Y + 0.33, 0.03, 0.09)
    # the mouth
    if kind != "orcus":
        mw = 0.2
        lip = max(0.0, 1 - (X / mw) ** 2)
        if kind != "mouthless":
            dn = 0.07 * (X / mw) ** 2                                                     # the corners pulled down
            f += 0.03 * lip * g(0, Y + 0.38 + dn + 0.012 * math.exp(-(X / 0.04) ** 2), 1, 0.035)
            f += 0.045 * lip * g(0, Y + 0.465 + dn * 0.6, 1, 0.045)
            f -= 0.05 * lip * math.exp(-((Y + 0.42 + dn * 0.8) / 0.02) ** 2)              # parted on a moan
            f -= 0.05 * max(0.0, 1 - (X / (mw * 0.55)) ** 2 - ((Y + 0.42) / 0.035) ** 2)  # the dark of the open mouth
            if kind == "plain":
                f -= 0.12 * max(0.0, 1 - (X / (mw * 0.75)) ** 2 - ((Y + 0.415) / 0.05) ** 2)   # open
        else:
            f += 0.02 * g(X, Y + 0.42, 0.18, 0.08)
        f -= 0.015 * g(X, Y + 0.54, 0.12, 0.05)                              # under the lower lip
    else:
        ai = arch_inside(X, Y)                                            # the archway (Derek: "more like an archway")
        if ai > 0:
            f -= 0.55 * min(1.0, ai / 0.03)
        f += 0.05 * math.exp(-(ai / 0.04) ** 2)                            # its moulding
    f += 0.05 * g(X, Y + 0.66, 0.15, 0.09)                                   # the chin
    inside_ = min(1.0, max(0.0, (1.0 - e2) / 0.15))
    # cut deep enough to read in the dark and from the side (Derek, 2026-10-09: "a little bit more defined"): the
    # sockets, the nose and the lips throw real shadows in the torchlight
    d = head * 1.2 + f * inside_ * (1.0 if kind == "orcus" else 2.4)
    # the rock round it, rough and broken (the face rises out of it with no outline)
    rock = 0.03 + (_vn(X * 4, Y * 4, seed + 7) - 0.5) * 0.08 + (_vn(X * 13, Y * 13, seed + 8) - 0.5) * 0.03
    edge = max(0.0, max(abs(X) - 0.78, abs(Y) - 0.95) / 0.2)
    rock -= 0.2 * min(1.0, edge) ** 1.5
    k = 0.03                                                                # a smooth maximum: no outline
    hgap = max(k - abs(d - rock), 0.0) / k
    return max(d, rock) + hgap * hgap * k * 0.25


def face_depth(X, Y, kind, wear, seed, pits, p=None):
    """the relief's height (in the face's own height H) at X across (-1..1) and Y up (-1.15..1.15). Carved to be read
    from far off in the dark, as the Bayon's faces at Angkor and the moai are: big simple planes, brows arched over each
    eye with the ridge between rising into the nose, sockets cut deep enough to hold black, the cheek falling away under
    the bone, a mouth or none; each face its own (face_params); worn, cracked and broken by the years; "half" left
    unfinished where the builders stopped; "effaced" chiselled off by someone; "orcus" the colossal face whose mouth is
    a room (Bomarzo)"""
    if p is None:
        p = face_params(kind, seed)
    ax = abs(X)
    e = (X / p["hw"]) ** 2 + (Y / p["hl"]) ** 2
    head = 0.17 * max(0.0, 1.0 - e) ** 0.3
    f = 0.0
    ex, ey = p["eye"], p["eyey"]
    for sx in (-1, 1):
        u = (X - sx * ex) / (0.24 * ex / 0.28)
        if abs(u) < 1.0:
            yb = p["brow"] + 0.07 * (1 - u * u) + (p["lift"] * 0.08 * sx * u if kind != "orcus" else 0.0)
            f += 0.13 * (1 - u ** 6) * math.exp(-((Y - yb - 0.03) / 0.045) ** 2) * (1.0 if Y > yb - 0.03 else 0.25)
    f += 0.09 * math.exp(-((X / 0.07) ** 2 + ((Y - p["brow"] + 0.05) / 0.11) ** 2))
    f += 0.03 * math.exp(-((X / 0.3) ** 2 + ((Y - 0.55) / 0.2) ** 2))
    sock = {"plain": -0.15, "eyeless": -0.24, "orcus": -0.28, "mirrormouth": -0.22, "full": -0.13, "half": -0.13, "blind": -0.07, "closed": -0.09,
            "mouthless": -0.15, "effaced": -0.06}[kind]
    for sx in (-1, 1):
        k2 = p["sock2"] if sx > 0 else 1.0
        eyy = ey - (p["low"] if sx < 0 else 0.0)
        dx, dy = X - sx * ex, Y - eyy
        f += sock * math.exp(-((dx / (0.15 * k2)) ** 4 + (dy / (0.1 * k2)) ** 4))
        if kind in ("full", "half", "mouthless"):
            f += 0.1 * math.exp(-((dx / 0.075) ** 2 + (dy / 0.055) ** 2))
        if kind == "closed":
            f += 0.09 * math.exp(-((dx / 0.12) ** 2 + ((dy + 0.005) / 0.05) ** 2))
            if abs(dx) < 0.12:
                f -= 0.05 * math.exp(-((dy + 0.03 - 0.04 * dx * dx / 0.0144) / 0.012) ** 2)
    if p["third"]:
        f += sock * 0.9 * math.exp(-((X / 0.1) ** 4 + ((Y - p["brow"] - 0.2) / 0.08) ** 4))
    # the nose
    nl = p["nose"]
    ytop, ybot = p["brow"] + 0.02, p["brow"] + 0.02 - 0.58 * nl
    if ybot < Y < ytop:
        u = (ytop - Y) / (ytop - ybot)
        w = 0.045 + 0.075 * u
        f += (0.08 + 0.18 * u) * max(0.0, 1 - (ax / w) ** 4) * min(1.0, (Y - ybot) / 0.03)
    f += 0.06 * math.exp(-((X / 0.12) ** 2 + ((Y - ybot - 0.03) / 0.05) ** 2))
    f -= 0.035 * (math.exp(-(((X - 0.075) / 0.03) ** 2 + ((Y - ybot) / 0.025) ** 2)) + math.exp(-(((X + 0.075) / 0.03) ** 2 + ((Y - ybot) / 0.025) ** 2)))
    for sx in (-1, 1):
        f += 0.05 * math.exp(-(((X - sx * (ex + 0.12)) / 0.12) ** 2 + ((Y + 0.0) / 0.09) ** 2))
        f -= 0.075 * math.exp(-(((X - sx * (ex + 0.04)) / 0.11) ** 2 + ((Y + 0.28) / 0.11) ** 2))
    my, mw = p["mouthy"], p["mouthw"]
    if kind in ("full", "eyeless", "half", "blind", "closed"):
        lip = max(0.0, 1 - (X / mw) ** 2)
        yc = my + 0.03 * X * X / (mw * mw)
        f += 0.06 * lip * math.exp(-((Y - yc - 0.035) / 0.04) ** 2)
        f += 0.07 * lip * math.exp(-((Y - yc + 0.045) / 0.045) ** 2)
        f -= 0.13 * lip * math.exp(-((Y - yc) / 0.014) ** 2)
        if p["stitched"] and abs(Y - yc) < 0.07 and ax < mw * 0.9:
            if abs(((X / mw) * 4.5) % 1.0 - 0.5) < 0.12:
                f -= 0.05                                                   # the stitches, cut across the lips
        if p["inner"]:
            f -= 0.08 * math.exp(-((X / (mw * 0.8)) ** 2 + ((Y - yc) / 0.09) ** 2))
            for sx in (-1, 1):                                              # a small face looking out of the mouth
                f -= 0.03 * math.exp(-(((X - sx * 0.06) / 0.025) ** 2 + ((Y - yc - 0.02) / 0.02) ** 2))
    if kind == "mouthless":
        f += 0.02 * math.exp(-((X / 0.25) ** 2 + ((Y - my) / 0.12) ** 2))
    if kind == "plain":
        lip = max(0.0, 1 - (X / mw) ** 2)
        f += 0.06 * lip * math.exp(-((Y - my - 0.07) / 0.04) ** 2)
        f += 0.07 * lip * math.exp(-((Y - my + 0.08) / 0.045) ** 2)
        mo = (X / (mw * 0.8)) ** 2 + ((Y - my) / 0.075) ** 2
        if mo < 1.0:
            f -= 0.2 * math.sqrt(1.0 - mo)                               # the mouth open, a dark hollow
        f += 0.1 * math.exp(-((X / 0.06) ** 2 + ((Y - 0.12) / 0.08) ** 2)) * 0.0
    if kind == "mirrormouth":
        mo = (X / 0.33) ** 2 + ((Y + 0.36) / 0.33) ** 2
        if mo < 1.0:
            f -= 0.22 * min(1.0, (1.0 - mo) * 4)                       # the round mouth, cut back to hold the mirror
        f += 0.07 * math.exp(-((math.sqrt(mo) - 1.0) / 0.06) ** 2)
    if kind == "orcus":
        mo = (X / 0.42) ** 2 + ((Y + 0.45) / 0.38) ** 2              # a maw (Derek: "Make the mouth taller ... like we
        if mo < 1.0:                                                    # are being eaten")
            f -= 0.55 * math.sqrt(1.0 - mo)
        f += 0.06 * math.exp(-((math.sqrt(mo) - 1.0) / 0.06) ** 2)
    f += p["chin"] * math.exp(-((X / 0.2) ** 2 + ((Y + 0.72 * p["hl"]) / 0.1) ** 2))
    keep = 1.0 - 0.25 * wear
    if kind == "effaced":
        keep = 0.15
    inside_ = min(1.0, max(0.0, (1.12 - e) / 0.2))
    d = head + f * keep * inside_
    if not MASKS:
        for (px, py, pr, pd) in pits:
            d -= pd * 0.5 * math.exp(-(((X - px) / pr) ** 2 + ((Y - py) / pr) ** 2))
    # cracks right across: real grooves, ragged
    for (x0, y0, x1, y1) in p["crack"]:
        cd = _seg_dist(X + (_vn(Y * 9, X * 3, seed + 21) - 0.5) * 0.06, Y, x0, y0, x1, y1)
        d -= 0.045 * math.exp(-(cd / 0.012) ** 2) * inside_
    # a piece broken away to the rough
    if p["broken"]:
        bx, by, br = p["broken"]
        q = math.hypot((X - bx) / br, (Y - by) / (br * 0.8)) + (_vn(X * 6, Y * 6, seed + 31) - 0.5) * 0.5
        if q < 1.0:
            rough = 0.04 + (_vn(X * 14, Y * 14, seed + 32) - 0.5) * 0.05
            d = min(d, rough) if q < 0.85 else d * 0.5 + min(d, rough) * 0.5
    if kind == "effaced":
        d -= 0.03 * max(0.0, _vn(X * 9, Y * 9, seed) - 0.5) * 2 * inside_
    if kind == "half":
        s = min(1.0, max(0.0, (X - 0.05) / 0.12))
        Xw = X + (_vn(X * 2.5, Y * 2.5, seed + 11) - 0.5) * 0.35
        Yw = Y + (_vn(X * 2.5 + 9, Y * 2.5, seed + 12) - 0.5) * 0.35
        bx_, by_ = math.floor(Xw * 5 + 0.5 * math.floor(Yw * 3.3)), math.floor(Yw * 3.3)
        hv = math.sin(bx_ * 12.9898 + by_ * 78.233 + seed) * 43758.5453
        hv -= math.floor(hv)
        rough = 0.12 + (hv - 0.5) * 0.06 + (Xw - bx_ / 5.0) * (0.1 * (hv - 0.3))
        d = d * (1 - s) + rough * s
    surround = 0.02 + (_vn(X * 4, Y * 4, seed + 7) - 0.5) * 0.06 + (_vn(X * 11, Y * 11, seed + 8) - 0.5) * 0.02
    edge = max(0.0, max(abs(X) - 0.78, abs(Y) - 0.95) / 0.2)
    surround -= 0.2 * min(1.0, edge) ** 1.5
    d = max(d, surround * (1.0 - inside_ * 0.7))
    if not MASKS:
        d += (_vn(X * 13, Y * 13, seed + 1) - 0.5) * (0.002 + 0.004 * wear)
    return d


def relief(name, c, nrm, H, kind, seed=0, mat="basalt", wear=0.5, wscale=0.55, back=0.6, nu=36, nv=44):
    """a face carved in the rock as true relief: a closed slab whose front is face_depth, standing on the plane through
    c with normal nrm (horizontal), H tall"""
    nx, ny = nrm
    tx, ty = -ny, nx
    rnd = random.Random(seed)
    pits = [(rnd.uniform(-0.9, 0.9), rnd.uniform(-1.0, 1.0), rnd.uniform(0.02, 0.06), rnd.uniform(0.01, 0.04))
            for _ in range(int(8 + 14 * wear))]
    prm = face_params(kind, seed)
    # fine enough for the features to be form (a lid or a nostril was three or four vertices and rendered as smeared
    # triangles: Derek, "a little bit more defined"): about 28 vertices a yard across, 34 up
    nu, nv = max(nu, int(H * 28)), max(nv, int(H * 34))
    verts = []
    for j in range(nv + 1):
        Y = -1.15 + 2.3 * j / nv
        for i in range(nu + 1):
            X = -1.0 + 2.0 * i / nu
            d = serene_depth(X, Y, "closed" if kind in ("half", "blind", "mirrormouth") else kind, seed) if SERENE else face_depth(X, Y, kind, wear, seed, pits, prm)
            # the rim slopes back into the rock, so the carving rises out of a bulge of the living rock (as Lascaux's
            # beasts rise out of the wall's own swell) and never stands in a box
            b = min(1.0, max(0.0, max((abs(X) - 0.7) / 0.3, (abs(Y) - 0.98) / 0.17)))
            s = b * b * (3 - 2 * b)
            d = (d * (1 - s) + (-(back - 0.04) + (_vn(X * 7, Y * 7, seed + 5) - 0.5) * 0.08) * s) * H
            u, v = X * wscale * H, Y * 0.5 * H
            verts.append((c[0] + tx * u + nx * d, c[1] + ty * u + ny * d, c[2] + v))
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    # the border, carried back into the rock, and the back
    border = [i for i in range(nu + 1)] + [j * (nu + 1) + nu for j in range(1, nv + 1)] + \
             [nv * (nu + 1) + i for i in range(nu - 1, -1, -1)] + [j * (nu + 1) for j in range(nv - 1, 0, -1)]
    b0 = len(verts)
    for q in border:
        x, y, z = verts[q]
        dd = (x - c[0]) * nx + (y - c[1]) * ny
        verts.append((x - nx * (dd + back * H), y - ny * (dd + back * H), z))
    L = len(border)
    for k in range(L):
        faces.append((border[k], border[(k + 1) % L], b0 + (k + 1) % L, b0 + k))
    faces.append(tuple(b0 + k for k in range(L))[::-1])
    o = P.outward(P.poly(name, verts, faces, "carved" if mat in ("basalt", "dressed") else mat))
    bleed(name, c, nrm, H, kind, seed, wscale)
    return o


def bleed(name, c, nrm, H, kind, seed=0, wscale=0.55):
    """every face bleeds (Derek, 2026-10-09: "all of them having blood running out of their nose and mouth"): from
    both nostrils and both corners of the mouth, thin runs of blood following the carved surface straight down over
    the lips and the chin, thickening where they gather, dripping off the slab's foot into a small dark pool. A source
    that falls in a hole (the great face's archway) does not run"""
    nx, ny = nrm
    tx, ty = -ny, nx
    rnd = random.Random(seed * 13 + 5)
    k_ = "closed" if kind in ("half", "blind", "mirrormouth") else kind

    def depth(X, Y):
        return serene_depth(X, Y, k_, seed) if SERENE else 0.0

    def world(X, Y, lift):
        u, v = X * wscale * H, Y * 0.5 * H
        d = depth(X, Y) * H + lift
        return (c[0] + tx * u + nx * d, c[1] + ty * u + ny * d, c[2] + v)

    srcs = [(-0.045, -0.29, 0.6), (0.045, -0.29, 0.6)]
    if kind not in ("mouthless", "orcus"):
        srcs += [(-0.19, -0.45, 1.0), (0.19, -0.45, 1.0)]
    elif kind == "orcus":
        srcs += [(-0.36, -0.4, 1.0), (0.36, -0.4, 1.0)]
    r0 = 0.022 * H                                                        # thick enough to read on the firelit stone
    for q, (X0, Y0, w) in enumerate(srcs):
        if depth(X0, Y0) < -0.12:
            continue
        pts, rads = [], []
        X, Y = X0 + rnd.uniform(-0.01, 0.01), Y0
        while Y > -1.12:
            pts.append(world(X, Y, 0.012 * H))
            gather = 1.0 + 0.6 * max(0.0, (Y0 - Y) / 0.8)
            rads.append(r0 * w * gather * (0.85 + 0.3 * _vn(X * 20, Y * 20, seed + q)))
            Y -= 0.035
            X += 0.006 * math.sin(Y * 23.0 + q * 2.1 + seed) + (rnd.random() - 0.5) * 0.004
            if abs(X) > 0.8:
                break
        if len(pts) > 2:
            P.tube("%s_blood%d" % (name, q), pts, rads, "blood", 6)
            # the drip off the slab's foot and the pool it keeps filling
            bx, by, bz = pts[-1]
            fz = c[2] - 0.575 * H - 0.35
            if bz - fz > 0.05:
                P.tube("%s_drip%d" % (name, q), [(bx, by, bz), (bx + nx * 0.05, by + ny * 0.05, fz + 0.02)],
                       [rads[-1] * 0.7, rads[-1] * 0.5], "blood", 5)
            P.sphere("%s_bpool%d" % (name, q), (bx + nx * 0.25, by + ny * 0.25, fz + 0.01), 0.18 + 0.05 * H ** 0.5, "blood",
                     scale=(1.4, 1.0, 0.08), rot=(0.0, 0.0, rnd.uniform(0, 6.28)))


# ---- the columns ----

def _radius(x, y):
    """each column's girth by where it cooled: thick colonnade and thin entablature in broad zones, never even"""
    s = 0.5 + 0.5 * math.sin(x * 0.33 + 0.8) * math.cos(y * 0.26 - 0.4)
    s = 0.6 * s + 0.4 * _vn(x * 0.45, y * 0.45, 3)
    rnd = _vn(x * 3.1, y * 3.1, 9)
    return 0.22 + 0.62 * s ** 1.4 + (rnd - 0.5) * 0.12


def _near(x, y):
    """the room nearest a wall point: (highest floor, lowest floor) within a few yards, or None"""
    hi, lo = None, None
    for d in (0.8, 1.6, 2.4):
        for ox, oy in ((-d, -d), (d, d), (-d, d), (d, -d), (-d, 0), (d, 0), (0, -d), (0, d)):
            fr = floor_at(x + ox, y + oy)
            if fr is not None:
                hi = fr if hi is None else max(hi, fr)
                lo = fr if lo is None else min(lo, fr)
        if hi is not None:
            return hi, lo
    return None


CUTS = []                                       # where a relief stands: (x, y, nx, ny, half-width, z-from, z-to)


def _in_cut(x, y):
    for (cx, cy, nx, ny, hw, z0, z1) in CUTS:
        dd = (x - cx) * nx + (y - cy) * ny
        aa = -(x - cx) * ny + (y - cy) * nx
        if -2.2 < dd < 1.2 and abs(aa) < hw * 0.74:
            return (z0, z1)
    return None


def _split(poly, rnd, depth=2):
    """a wall column's upper part breaks into the entablature: thin, crooked columns fanned every way"""
    if depth == 0 or len(poly) < 3:
        return [poly]
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    a = rnd.uniform(0, math.pi)
    dx, dy = math.cos(a), math.sin(a)
    p1 = C._clip(poly, cx, cy, dx, dy)
    p2 = C._clip(poly, cx, cy, -dx, -dy)
    out = []
    for p in (p1, p2):
        if len(p) >= 3:
            out += _split(p, rnd, depth - 1)
    return out


def columns():
    """the cave's rock: every column a cell of one power diagram of every girth (chapter 12, section 5), the floor's
    stumps in the pool chamber and the lower stairs, the walls round the rooms, cut low on the camera's side; tall walls
    break at four or five yards into the entablature's thin crooked columns, which rise out of the light"""
    def keep(x, y):
        f = floor_at(x, y)
        if f is not None:
            return carved(x, y) <= 0.4 and _ell(x, y, HALL) > 1.0
        return _near(x, y) is not None
    pts = C.seeds(-27.0, 17.0, -47.0, 13.0, _radius, keep, seed=11)
    rnd = random.Random(2)
    for k, (cx, cy), r, poly in C.cells(pts):
        h1 = C._h(int(cx * 7), int(cy * 7), 5)
        f = floor_at(cx, cy, h1)
        lean = ((C._h(k, 1, 21) - 0.5) * 0.02, (C._h(k, 2, 22) - 0.5) * 0.02)
        age = 0.35 + 0.5 * C._h(k, 3, 7)
        if f is not None:
            cup = 0.05 if h1 < 0.3 else 0.0
            broken = 0.3 * C._h(k, 4, 24) if C._h(k, 5, 25) < 0.3 else 0.0
            C.rough_prism("st%d" % k, poly, -2.0, f, "basalt", k, cup, broken, lean, age, drum=(0.35, 0.9))
            continue
        near = _near(cx, cy)
        if near is None:
            continue
        near_room, near_low = near
        camera_side = any(inside(cx - d, cy - d) for d in (1.0, 2.0, 3.0, 4.5, 6.0, 8.0, 10.0, 13.0, 16.0))
        if camera_side:
            hgt = near_low + 0.45 + h1 * 0.25
            C.rough_prism("wc%d" % k, poly, -2.0, hgt, "cutrock", k, 0.0, 0.0, lean, age)
            continue
        hgt = near_room + 10.0 + h1 * 3.0
        z0 = -2.0
        if near_room > FLOOR_HALL - 0.5:
            z0 = FLOOR_HALL + CARVE_H - 0.1                      # above the temple's carved walls, the raw columns
        cut = _in_cut(cx, cy)
        split_at = near_room + 4.2 + h1 * 1.5
        spans = [(z0, min(hgt, split_at))]
        if cut:
            spans = [(z0, cut[0]), (cut[1], min(hgt, split_at))]
        for q, (za, zb) in enumerate(spans):
            if zb - za > 0.2:
                C.rough_prism("wl%d_%d" % (k, q), poly, za, zb, "basalt", k + q, 0.0, 0.0, lean, age, drum=(1.2, 3.2))
        # the entablature above: the column splits into thin ones, each leaning its own way
        top0 = max(split_at, cut[1] if cut else 0.0)
        if hgt > top0 + 0.5:
            r2 = random.Random(k)
            for q, sub in enumerate(_split(poly, r2, 2 if r > 0.4 else 1)):
                ln = ((r2.random() - 0.5) * 0.08, (r2.random() - 0.5) * 0.08)
                C.rough_prism("we%d_%d" % (k, q), sub, top0, hgt - r2.uniform(0, 1.5), "basalt", k * 5 + q, 0.0,
                              0.0, ln, 0.4, drum=(0.25, 0.6))
        # breakdown at the wall's foot (only where the rock is raw)
        if carved(cx, cy) < 0.5 and rnd.random() < 0.45:
            for q in range(rnd.randint(1, 3)):
                for d in (0.6, 0.9, 1.3):
                    ox, oy = rnd.uniform(-1, 1), rnd.uniform(-1, 1)
                    px, py = cx + ox * d, cy + oy * d
                    ff = floor_at(px, py)
                    if ff is not None and ff > -0.2:
                        sz = rnd.uniform(0.12, 0.38)
                        C.chunk("bd%d_%d" % (k, q), (px, py, ff), sz, "basalt", k * 3 + q)
                        break


def fallen_drums():
    """drums fallen from the roof's columns, lying on the floor where they broke, half sunk among the stumps"""
    rnd = random.Random(19)
    placed = 0
    tries = 0
    while placed < 9 and tries < 400:
        tries += 1
        x, y = rnd.uniform(-9, 9), rnd.uniform(-7, 7)
        f = floor_at(x, y)
        if f is None or _ell(x, y, POOL) > 0.85 or math.hypot(x - BASIN[0], y - BASIN[1]) < BASIN[2] + 1.6:
            continue
        r = rnd.uniform(0.3, 0.55)
        k = rnd.randint(5, 7)
        poly = [(math.cos(2 * math.pi * i / k + rnd.uniform(-0.2, 0.2)) * r, math.sin(2 * math.pi * i / k) * r) for i in range(k)]
        ln = rnd.uniform(0.7, 1.6)
        v, fc = C.rough_prism("fd%d" % placed, poly, 0.0, ln, "basalt", placed, age=0.7, drum=(ln + 1, ln + 2), build=False)
        yaw = rnd.uniform(0, math.pi)
        tilt = rnd.uniform(-0.15, 0.15)
        out = []
        for (px, py, pz) in v:
            pz -= ln / 2
            # lay it down: its length along the yaw, a little tipped
            a = pz
            b = px
            px2 = a * math.cos(yaw) - py * math.sin(yaw)
            py2 = a * math.sin(yaw) + py * math.cos(yaw)
            out.append((x + px2, y + py2, f + r * 0.8 + b + a * tilt))
        P.outward(P.poly("fd%d" % placed, out, fc, "basalt"))
        placed += 1


def gravel():
    """the grit and small breakdown over the raw floor, thickest at the walls' feet"""
    rnd = random.Random(23)
    n = 0
    for _ in range(4000):
        if n >= 420:
            break
        x, y = rnd.uniform(-10, 10), rnd.uniform(-20, 8)
        f = floor_at(x, y)
        if f is None or carved(x, y) > 0.45 or f < -0.15 or _ell(x, y, HALL) < 1.0:
            continue
        nearw = _near(x + 0.0, y) is not None and any(floor_at(x + ox, y + oy) is None for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1)))
        if not nearw and rnd.random() < 0.6:
            continue
        C.chunk("gv%d" % n, (x, y, f), rnd.uniform(0.04, 0.11), "basalt", n, tilt=1.2)
        n += 1


def stairs_cut():
    """the upper steps cut true by the builders: treads squared, each worn hollow down its middle where the feet went,
    the nosing rounded off; dust drifted against each riser (the lowest steps stay rough stumps: the raw becoming the
    made as you climb)"""
    x0, x1, y0, y1 = STAIR
    rnd = random.Random(8)
    for i in range(STEPS):
        ya = y0 - (y0 - y1) * i / STEPS
        yb = y0 - (y0 - y1) * (i + 1) / STEPS
        if carved(0.0, (ya + yb) / 2) <= 0.4:
            continue
        top = FLOOR_HALL * i / STEPS
        for k, (a, b, dz) in enumerate(((x0, x0 + 0.9, 0.0), (x0 + 0.9, x1 - 0.9, -0.06), (x1 - 0.9, x1, 0.0))):
            P.displace(P.box("step%d_%d" % (i, k), (a, yb, -2.0), (b, ya - 0.06, top + dz), "dressed"), 0.025, 0.09, 3)
            P.box("nose%d_%d" % (i, k), (a, ya - 0.08, -2.0), (b, ya, top + dz - 0.05), "dressed")   # the worn nosing
        # dust against the riser
        for q in range(3):
            px = rnd.uniform(x0 + 0.2, x1 - 0.2)
            P.sphere("sdust%d_%d" % (i, q), (px, yb + 0.12, top), rnd.uniform(0.18, 0.4), "ash", scale=(1.6, 0.6, 0.18))
        # the builders' marks cut along the riser, facing whoever climbs (Derek: "Carve runes into the stairs")
        rh = FLOOR_HALL / STEPS
        carve_marks("smark%d" % i, (x0 + 0.3, ya + 0.004, top - rh + 0.09), (1.0, 0.0), None, (0.0, 1.0), (x1 - x0) - 0.6, 0.16, 200 + i)


def hall_floor():
    """the hall's floor of great dressed flags squared to the throne, each its own tilt by a finger, some cracked
    through, some gone, the joints open; dust drifted where no foot goes"""
    cx, cy, rx, ry = HALL
    ux, uy = -0.7071, -0.7071
    ax, ay = 0.7071, -0.7071
    rnd = random.Random(31)
    for i in range(-9, 10):
        for j in range(-12, 13):
            w, l = 1.05 * rnd.uniform(0.9, 1.1), 1.45 * rnd.uniform(0.85, 1.12)
            off = 0.5 * l if j % 2 else 0.0
            px = cx + ux * (i * l + off) + ax * j * w
            py = cy + uy * (i * l + off) + ay * j * w
            if _ell(px, py, HALL) > 0.97:
                continue
            if rnd.random() < 0.05:
                P.sphere("fdust%d_%d" % (i, j), (px, py, FLOOR_HALL - 0.12), 0.55, "ash", scale=(1.0, 1.0, 0.2))
                continue                                            # a flag gone, the hole full of dust
            pieces = [(0.0, 1.0)]
            if rnd.random() < 0.18:
                cut = rnd.uniform(0.3, 0.7)
                pieces = [(0.0, cut), (cut, 1.0)]                   # cracked through
            for q, (s0, s1) in enumerate(pieces):
                hw = w / 2 - 0.04
                la, lb = -l / 2 + 0.04 + (l - 0.08) * s0 + (0.02 if q else 0), -l / 2 + 0.04 + (l - 0.08) * s1 - (0.02 if q == 0 and len(pieces) > 1 else 0)
                tw = rnd.uniform(-0.05, 0.05)
                u2 = (ux * math.cos(tw) - uy * math.sin(tw), ux * math.sin(tw) + uy * math.cos(tw))
                a2 = (-u2[1], u2[0])
                corners = [(px + u2[0] * su + a2[0] * sa * hw, py + u2[1] * su + a2[1] * sa * hw)
                           for su, sa in ((la, -1), (lb, -1), (lb, 1), (la, 1))]
                # each flag follows the floor's heave and the worn way under it (its corners each at the floor's own
                # height there), a finger of its own on top; one in twenty tipped where the ground gave under a corner
                z = FLOOR_HALL + hall_relief(px, py) + rnd.uniform(-0.02, 0.015)
                tz = [hall_relief(cx_, cy_) - hall_relief(px, py) + rnd.uniform(-0.025, 0.025) for cx_, cy_ in corners]
                if rnd.random() < 0.05:
                    tz[rnd.randrange(4)] += rnd.uniform(0.08, 0.14)
                verts = [(x, y, z - 0.4) for x, y in corners] + [(x, y, z + tz[t]) for t, (x, y) in enumerate(corners)]
                faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
                P.displace(P.outward(P.poly("flag%d_%d_%d" % (i, j, q), verts, faces, "dressed")), 0.028, 0.08, 3)
    # dust drifted against the walls and round the pillars' feet: real banks, thick at the wall and thinning out
    # across the flags, tongues of it where the draughts carried it (the drift scale, MASTER_RULES 0.5b)
    for k in range(150):
        th = rnd.uniform(math.radians(130), math.radians(320))
        rr = rnd.uniform(0.84, 0.95)
        x, y = _hall_pt(th, rr)
        big = (0.95 - rr) < 0.04
        r_ = rnd.uniform(0.6, 1.3) if big else rnd.uniform(0.3, 0.7)
        P.sphere("hdust%d" % k, (x, y, FLOOR_HALL + hall_relief(x, y) - 0.03), r_, "ash",
                 scale=(rnd.uniform(1.2, 2.0), 1.0, rnd.uniform(0.14, 0.26) if big else rnd.uniform(0.08, 0.14)),
                 rot=(0.0, 0.0, th + math.pi / 2 + rnd.uniform(-0.3, 0.3)))


def _face_span():
    """the colossal face's place on the back wall: its centre, its normal toward the hall"""
    x, y, nx, ny = hall_spot(FACE_TH, 0.93)
    return x, y, nx, ny


def hall_walls():
    """the temple cut into the living rock round the hall's back: dressed walls to four yards, pilasters, a frieze of
    small faces, the dark mirrors, a cornice, and above it the raw columns where the builders stopped; the colossal face
    breaks through it all"""
    th0, th1 = math.radians(150), math.radians(300)
    n = 40
    kinds = ["closed", "eyeless", "plain", "blind", "closed", "mouthless", "plain", "eyeless", "closed", "blind"]
    fx, fy, fnx, fny = _face_span()
    for k in range(n):
        ta = th0 + (th1 - th0) * k / n
        tb = th0 + (th1 - th0) * (k + 1) / n
        tm = (ta + tb) / 2
        mx, my = _hall_pt(tm, 0.995)
        if math.hypot(mx - fx, my - fy) < 5.6:
            continue                                                # the colossal face is cut here
        a_in, b_in = _hall_pt(ta, 1.0), _hall_pt(tb, 1.0)
        a_out, b_out = _hall_pt(ta, 1.12), _hall_pt(tb, 1.12)
        z0, z1 = FLOOR_HALL - 0.4, FLOOR_HALL + CARVE_H
        verts = [(a_in[0], a_in[1], z0), (b_in[0], b_in[1], z0), (b_out[0], b_out[1], z0), (a_out[0], a_out[1], z0),
                 (a_in[0], a_in[1], z1), (b_in[0], b_in[1], z1), (b_out[0], b_out[1], z1), (a_out[0], a_out[1], z1)]
        faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        P.displace(P.outward(P.poly("cwall%d" % k, verts, faces, "dressed")), 0.06, 0.14, 5)
        nx, ny = HALL[0] - mx, HALL[1] - my
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl
        if k % 3 == 0:
            px, py = mx + nx * 0.18, my + ny * 0.18
            P.box("pil%d" % k, (px - 0.28, py - 0.28, z0), (px + 0.28, py + 0.28, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilcap%d" % k, (px - 0.36, py - 0.36, z1 - 0.3), (px + 0.36, py + 0.36, z1), "dressed", rot_z=math.atan2(ny, nx))
            P.box("pilbase%d" % k, (px - 0.36, py - 0.36, FLOOR_HALL), (px + 0.36, py + 0.36, FLOOR_HALL + 0.3), "dressed", rot_z=math.atan2(ny, nx))
        elif k not in MIRROR_SEGS:
            relief("frieze%d" % k, (mx + nx * 0.02, my + ny * 0.02, FLOOR_HALL + 3.1), (nx, ny), 0.95,
                   kinds[k % len(kinds)], 900 + k, "dressed", 0.7, nu=18, nv=22)
    pts = [(*_hall_pt(th0 + (th1 - th0) * q / 60.0, 0.985), FLOOR_HALL + CARVE_H - 0.05) for q in range(61)]
    pts = [p for p in pts if math.hypot(p[0] - fx, p[1] - fy) > 4.2]
    seg = [pts[0]]
    for p in pts[1:]:
        if math.hypot(p[0] - seg[-1][0], p[1] - seg[-1][1]) > 1.0:
            P.tube("cornice%d" % len(seg), seg, [0.14] * len(seg), "dressed", 6) if len(seg) > 1 else None
            seg = []
        seg.append(p)
    if len(seg) > 1:
        P.tube("cornice_end", seg, [0.14] * len(seg), "dressed", 6)


MIRROR_SEGS = ()                            # the hall wall's segments that hold the dark mirrors (two each side of the face)


def mirror(name, c, nrm, r, seed):
    """a dark mirror of polished obsidian (the smoking mirror; chapter 12): a disc a little dished, set in a ring of
    dressed stone with human teeth set round it, a plate behind seating it in the wall"""
    nx, ny = nrm
    tx, ty = -ny, nx
    n = 32
    verts = [(c[0] - nx * 0.02, c[1] - ny * 0.02, c[2])]
    for i in range(n):
        a = 2 * math.pi * i / n
        verts.append((c[0] + tx * math.cos(a) * r + nx * 0.03, c[1] + ty * math.cos(a) * r + ny * 0.03, c[2] + math.sin(a) * r))
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    o = P.poly(name, verts, faces, "mirror")
    MIRRORS.append((c[0], c[1], c[2], nx, ny, 0.0, r))
    ring = [(c[0] + tx * math.cos(2 * math.pi * i / 40) * (r + 0.07) + nx * 0.04,
             c[1] + ty * math.cos(2 * math.pi * i / 40) * (r + 0.07) + ny * 0.04,
             c[2] + math.sin(2 * math.pi * i / 40) * (r + 0.07)) for i in range(41)]
    P.tube(name + "_ring", ring, [0.075] * 41, "dressed", 6)
    plate = [(c[0] + tx * math.cos(2 * math.pi * i / 24) * (r + 0.22) - nx * 0.06,
              c[1] + ty * math.cos(2 * math.pi * i / 24) * (r + 0.22) - ny * 0.06,
              c[2] + math.sin(2 * math.pi * i / 24) * (r + 0.22)) for i in range(24)]
    P.poly(name + "_plate", plate, [tuple(range(24))], "dressed", 0.1)
    for i in range(14):
        a = 2 * math.pi * (i + 0.5) / 14
        P.sphere("%s_tooth%d" % (name, i), (c[0] + tx * math.cos(a) * (r + 0.17) + nx * 0.06,
                                            c[1] + ty * math.cos(a) * (r + 0.17) + ny * 0.06,
                                            c[2] + math.sin(a) * (r + 0.17)), 0.035, "bone", scale=(0.8, 0.8, 1.2))
    return o


CAM = (-0.612, -0.612, -0.5)            # the camera's look in game coordinates (down the screen's up, 30 degrees down)


def candle_before(name, c, nrm, f, w=18.0):
    """the wisp candle on its stone before a mirror, set where the mirror shows it to whoever stands below: on the
    camera's ray through the mirror's heart, reflected (so the mirror holds a second flame)"""
    nx, ny = nrm
    dx, dy, dz = CAM
    dn = dx * nx + dy * ny
    rx, ry, rz = dx - 2 * dn * nx, dy - 2 * dn * ny, dz
    s = (c[2] - (f + 1.05)) / -rz
    qx, qy = c[0] + rx * s, c[1] + ry * s
    P.box(name + "_stone", (qx - 0.22, qy - 0.22, f - 0.1), (qx + 0.22, qy + 0.22, f + 0.9), "dressed", rot_z=math.atan2(ny, nx))
    rnd = random.Random(len(name))
    for i in range(4):
        P.sphere("%s_wax%d" % (name, i), (qx + rnd.uniform(-0.15, 0.15), qy + rnd.uniform(-0.15, 0.15), f + 0.9), rnd.uniform(0.05, 0.09),
                 "bone", scale=(1.0, 1.0, 0.7))
        P.tube("%s_run%d" % (name, i), [(qx + rnd.uniform(-0.2, 0.2), qy + rnd.uniform(-0.2, 0.2), f + 0.9),
                                        (qx + rnd.uniform(-0.23, 0.23), qy + rnd.uniform(-0.23, 0.23), f + rnd.uniform(0.3, 0.75))],
               [0.025, 0.012], "bone", 4)
    P.cylinder(name + "_wick", (qx, qy, f + 0.9), 0.045, 0.12, "bone", sides=6)
    flame(name, qx, qy, f + 1.05, 0.1, w)


def flame(name, x, y, z, size, w):
    """the wisp-fire itself: its light as a real lamp, its body unseen by the camera (its look is the painter's effect)
    but seen in the mirrors"""
    P.sphere(name + "_flame", (x, y, z + size * 0.6), size, "flame", scale=(0.8, 0.8, 2.0))
    LAMPS.append((x, y, z + size * 0.6, w, WISP))


def torch(name, x, y, z, nx, ny, w=60.0):
    """a wisp-fire torch: a rusted iron bracket out of the wall, a cup, the cold flame"""
    sconce(name, x, y, z, nx, ny)
    flame(name, x + nx * 0.5, y + ny * 0.5, z + 0.1, 0.09, w * 0.65)        # (Derek: "Dim the torches by 35%")


def skeleton(x, y, z, nx, ny):
    """a skeleton fixed to the wall with iron, holding its weapon out over the stairs (the weapon falls when the pilgrim
    passes: the starting weapon)"""
    tx, ty = -ny, nx
    def at(a, h, d):
        return (x + tx * a + nx * d, y + ty * a + ny * d, z + h)
    P.sphere("sk_skull", at(0.0, 0.62, 0.12), 0.11, "bone", scale=(0.9, 0.9, 1.0))
    P.tube("sk_spine", [at(0.0, 0.5, 0.08), at(0.0, -0.1, 0.08)], [0.03, 0.03], "bone", 5)
    for r in range(6):
        h = 0.42 - r * 0.07
        for side in (-1, 1):
            P.tube("sk_rib%d_%d" % (r, side), [at(0, h, 0.1), at(side * 0.13, h - 0.02, 0.16), at(side * 0.18, h - 0.06, 0.07)], [0.012, 0.01, 0.008], "bone", 4)
    P.tube("sk_pelvis", [at(-0.14, -0.12, 0.08), at(0.0, -0.18, 0.12), at(0.14, -0.12, 0.08)], [0.03, 0.035, 0.03], "bone", 5)
    for side in (-1, 1):
        P.tube("sk_leg%d" % side, [at(side * 0.1, -0.18, 0.08), at(side * 0.12, -0.6, 0.1), at(side * 0.12, -1.0, 0.08)], [0.025, 0.022, 0.02], "bone", 5)
    P.tube("sk_armL", [at(-0.18, 0.42, 0.08), at(-0.42, 0.62, 0.06), at(-0.55, 0.85, 0.06)], [0.022, 0.02, 0.018], "bone", 5)
    P.tube("sk_armR", [at(0.18, 0.42, 0.08), at(0.3, 0.35, 0.3), at(0.36, 0.4, 0.55)], [0.022, 0.02, 0.018], "bone", 5)
    P.tube("sk_iron1", [at(-0.2, 0.55, 0.05), at(0.2, 0.55, 0.05)], [0.025, 0.025], "rust", 5)
    P.tube("sk_iron2", [at(-0.62, 0.82, 0.04), at(-0.48, 0.92, 0.04)], [0.025, 0.025], "rust", 5)
    P.tube("sk_sword", [at(0.36, 0.42, 0.62), at(0.36, 0.5, 1.5)], [0.035, 0.008], "rust", 4)
    P.tube("sk_guard", [at(0.2, 0.4, 0.66), at(0.52, 0.4, 0.66)], [0.02, 0.02], "rust", 4)


def chains(x, y, z, k, floor=FLOOR_HALL, step=0.12):
    """a rusted chain hanging from the dark, its links as real loops, the end lying where it lands"""
    rnd = random.Random(k)
    n = int((z - floor) / step) + rnd.randint(2, 6)
    for i in range(n):
        zz = z - i * step
        if zz < floor + 0.05:
            zz = floor + 0.03
            x += 0.1
        P.sphere("ch%d_%d" % (k, i), (x + (0.02 if i % 2 else -0.02), y, zz), 0.05, "rust", scale=(0.4 if i % 2 else 1.0, 1.0 if i % 2 else 0.4, 1.0))


def throne():
    """the empty throne (Derek: "The throne sucks too"): set in the open mouth of a face eight yards tall, cut into a
    mass of the raw columns at the head of the nave (Bomarzo's Orcus: the mouth in the rock with a seat inside). Its
    sockets are empty and lit from below by the two braziers, the brightest fires in the hall. A dais of five worn
    steps; the seat too big for a man; an iron circlet left on it; chains hanging out of the dark into the mouth; the
    heap of everything the ones before left, spilling down the steps (Conan's tomb: "just like the movie"); the
    Stranger's wax and cards on the step"""
    fx, fy, nx, ny = _face_span()
    sx, sy = -ny, nx
    f = FLOOR_HALL
    H = 10.0                                                       # grown, so the archway walks through under the nose
    # the dais, five steps of dressed stone, each worn hollow where the feet went
    for k in range(5):
        dep = 6.2 - k * 1.05
        wid = 8.4 - k * 1.1
        z1 = f + 0.28 * (k + 1)
        cx, cy = fx + nx * (dep / 2 - 0.6), fy + ny * (dep / 2 - 0.6)
        corners = [(cx + nx * a * dep / 2 + sx * b * wid / 2, cy + ny * a * dep / 2 + sy * b * wid / 2) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        verts = [(x, y, f - 0.5) for x, y in corners] + [(x, y, z1) for x, y in corners]
        faces = [(0, 1, 2, 3)[::-1], (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        P.displace(P.outward(P.poly("dais%d" % k, verts, faces, "dressed")), 0.03, 0.1, 4)
        fr = (cx + nx * (dep / 2 + 0.035) - sx * (wid / 2 - 0.5), cy + ny * (dep / 2 + 0.035) - sy * (wid / 2 - 0.5), f + 0.28 * k + 0.06)
        carve_marks("mark%d" % k, fr, (sx, sy), None, (nx, ny), wid - 1.0, 0.17, 90 + k)
    top = f + 1.4
    WORN.append((fx + nx * 7.5, fy + ny * 7.5, fx + nx * 0.2, fy + ny * 0.2, 1.3))       # up the throne's stairs to the mouth
    # the colossal face: its lower lip at the dais top, so the mouth is the throne room
    cz = top - ARCH_BOT * 0.5 * H - 0.1                            # the archway's sill at the top step
    CUTS.append((fx, fy, nx, ny, 0.55 * H, f - 2.0, cz + 0.6 * H))
    relief("orcus", (fx, fy, cz), (nx, ny), H, "orcus", 4242, "basalt", 0.55, back=0.75, nu=64, nv=76)
    # the fires the little faces' mirrors will hold: the braziers, the throne's candles, the heap's candles
    # on the seat's arms' ends and on the top step's front corners
    THRONE_C = [(fx + nx * d + sx * a, fy + ny * d + sy * a, top + b) for a, d, b in ((-3.0, 1.0, 0.14), (3.0, 1.0, 0.14), (-3.6, 0.6, 0.14), (3.6, 0.6, 0.14),
                                                                                    (-1.3, 2.0, -0.14), (1.3, 2.0, -0.14))]
    BRAZ = [(fx + nx * 3.4 + sx * side * 4.8, fy + ny * 3.4 + sy * side * 4.8, f + 1.55) for side in (-1, 1)]
    # (Derek: "You can have one large face with a mirror in its mouth": the small faces that covered it are gone)
    # its key light: an iron fire-basket hanging on chains out of the dark, high and to one side, raking across the
    # whole face so every little face holds its own shadows (rule 19; Derek: "the faces are still to hard to see")
    cbx, cby, cbz = fx + nx * 3.4 - sx * 4.4, fy + ny * 3.4 - sy * 4.4, cz + 1.6
    for i in range(10):
        a_ = 2 * math.pi * i / 10
        P.tube("cresset_bar%d" % i, [(cbx + math.cos(a_) * 0.22, cby + math.sin(a_) * 0.22, cbz - 0.35), (cbx + math.cos(a_) * 0.42, cby + math.sin(a_) * 0.42, cbz + 0.15)],
               [0.03, 0.025], "iron", 4)
    for zz, rr in ((cbz - 0.35, 0.22), (cbz + 0.15, 0.42)):
        P.tube("cresset_ring%d" % int(rr * 100), [(cbx + math.cos(2 * math.pi * q / 20) * rr, cby + math.sin(2 * math.pi * q / 20) * rr, zz) for q in range(21)],
               [0.03] * 21, "iron", 4)
    for i in range(3):
        a_ = 2 * math.pi * i / 3
        chains(cbx + math.cos(a_) * 0.4, cby + math.sin(a_) * 0.4, cbz + 9.0, 760 + i, floor=cbz + 0.15)
    P.sphere("cresset_coals", (cbx, cby, cbz - 0.1), 0.3, "ash", scale=(1, 1, 0.5))
    flame("cresset", cbx, cby, cbz - 0.05, 0.28, 175.0)
    # two sconces high on its flanks, raking across the little faces so each holds its own shadows (rule 19)
    # (the two sconces high on its flanks are gone: Derek, 2026-10-09, "the main face remove two of the torches on the
    # top of the stairs"; the cresset and the candles light it)
    # the throne is gone; the mouth at the top of the throne's stairs is a great dark mirror, the way out (Derek: "Give
    # the room no exit. There will be a large mirror the player looks in in a large face, it reflects nothing but
    # darkness"; "The mirror is the way out, they will walk into it and disappear"; "The large mirror will be at the top
    # of the throne stairs"; the mirror replaces the throne). Its lips frame it; the Stranger's candles burn on the top
    # step either side, where any mirror would hold their flames: black framed by light, the hall's one subject
    mx, my = fx - nx * 0.6, fy - ny * 0.6
    P.box("mouthfloor", (mx - 1.8, my - 1.8, f), (mx + 1.8, my + 1.8, top), "dressed", rot_z=math.atan2(ny, nx))
    # the onyx fills the archway just behind the lips; its border stands just proud of them
    fc = (fx, fy, cz)
    outline = arch_path(fc, (sx, sy), (nx, ny), H, 0.0, 1.7)
    P.poly("voidmirror", outline, [tuple(range(len(outline)))], "voidmirror")
    onyx_arch_frame(fc, (sx, sy), (nx, ny), H, 1.78)
    mc = (fx + nx * 1.7, fy + ny * 1.7, cz + (ARCH_BOT + ARCH_SPRING) * 0.25 * H)
    for k, (cx_, cy_, cz_) in enumerate(THRONE_C):
        P.cylinder("tcandle%d" % k, (cx_, cy_, cz_ - 0.12), 0.06, 0.14, "bone", sides=6)
        flame("tcandle%d" % k, cx_, cy_, cz_ + 0.02, 0.08, 72.0)
    mx, my = mc[0], mc[1]
    # chains hanging out of the dark into the mouth
    for k, (a, b) in enumerate(((-0.9, 0.4), (0.7, -0.2), (1.3, 0.9))):
        chains(fx + sx * a * 1.6 + nx * 1.6, fy + sy * a * 1.6 + ny * 1.6, top + 9.0, 700 + k, floor=top)
    # the braziers: wisp-fire in iron bowls on tall tripods at the dais' foot, lighting the face from below
    for k, side in enumerate((-1, 1)):
        bx, by = fx + nx * 3.4 + sx * side * 4.8, fy + ny * 3.4 + sy * side * 4.8
        for i in range(3):
            a = i * 2.094 + 0.3
            P.tube("tbz%d_leg%d" % (k, i), [(bx + math.cos(a) * 0.45, by + math.sin(a) * 0.45, f), (bx + math.cos(a) * 0.14, by + math.sin(a) * 0.14, f + 1.05)],
                   [0.035, 0.028], "rust", 5)
        P.sphere("tbz%d_bowl" % k, (bx, by, f + 1.1), 0.46, "rust", scale=(1.0, 1.0, 0.42))
        P.sphere("tbz%d_ash" % k, (bx, by, f + 1.21), 0.38, "ash", scale=(1.0, 1.0, 0.2))
        flame("tbz%d" % k, bx, by, f + 1.25, 0.3, 140.0)
    # the heap, in two heaps either side of the stairs' foot (Derek: "All that debris on the throne stairs needs to
    # move"): the stairs climb clear to the mirror; mounds of rotted mail and scale, everything else on them and round
    HEAPS = [(fx + nx * 5.6 + sx * side * 6.3, fy + ny * 5.6 + sy * side * 6.3) for side in (-1, 1)]
    for q, (hx_, hy_) in enumerate(HEAPS):
        P.sphere("heapmound%d" % q, (hx_, hy_, f - 0.35), 2.0, "ash", scale=(1.2, 1.0, 0.36))
    hx, hy = HEAPS[0]
    rnd = random.Random(9)
    ca, sa_ = math.cos(math.atan2(ny, nx)), math.sin(math.atan2(ny, nx))
    def mound_z(x, y):
        best = f
        for (hx_, hy_) in HEAPS:
            dx, dy = x - hx_, y - hy_
            u = (dx * ca + dy * sa_) / (2.0 * 1.2)
            v = (-dx * sa_ + dy * ca) / 2.0
            q = 1 - u * u - v * v
            best = max(best, f - 0.35 + 0.36 * 2.0 * math.sqrt(max(0.0, q)))
        return best
    for i in range(460):
        hx_, hy_ = HEAPS[i % 2]
        r = rnd.uniform(0, 1) ** 0.6 * 2.6
        a = rnd.uniform(0, 2 * math.pi)
        x, y = hx_ + math.cos(a) * r * 1.15, hy_ + math.sin(a) * r
        if abs((x - fx) * sx + (y - fy) * sy) < 4.6:
            continue                                               # nothing on the stairs
        z = mound_z(x, y)
        kind = rnd.random()
        b = rnd.uniform(0, math.pi)
        if kind < 0.16:                                            # a sword driven in, upright or leaning
            ln = rnd.uniform(0.8, 1.15)
            lx, ly = math.cos(b) * rnd.uniform(0, 0.4), math.sin(b) * rnd.uniform(0, 0.4)
            p0 = (x, y, z - 0.25)
            p1 = (x + lx, y + ly, z + ln * 0.85)
            P.tube("heap_us%d" % i, [p0, p1], [0.04, 0.008], "iron", 4)
            gx, gy, gz = x + lx * 0.6, y + ly * 0.6, z + ln * 0.55
            P.tube("heap_ug%d" % i, [(gx - math.sin(b) * 0.15, gy + math.cos(b) * 0.15, gz), (gx + math.sin(b) * 0.15, gy - math.cos(b) * 0.15, gz)], [0.02, 0.02], "rust", 4)
            P.sphere("heap_up%d" % i, (x + lx * 0.95, y + ly * 0.95, z + ln * 0.82), 0.035, "rust")
        elif kind < 0.36:                                          # a sword lying
            ln = rnd.uniform(0.7, 1.0)
            p0, p1 = (x - math.cos(b) * ln / 2, y - math.sin(b) * ln / 2, z), (x + math.cos(b) * ln / 2, y + math.sin(b) * ln / 2, z + rnd.uniform(-0.1, 0.2))
            P.tube("heap_sw%d" % i, [p0, p1], [0.035, 0.006], "iron", 4)
            P.tube("heap_gd%d" % i, [(p0[0] - math.sin(b) * 0.13, p0[1] + math.cos(b) * 0.13, p0[2]),
                                     (p0[0] + math.sin(b) * 0.13, p0[1] - math.cos(b) * 0.13, p0[2])], [0.018, 0.018], "rust", 4)
        elif kind < 0.44:                                          # a spear, leaning on the heap or the steps
            ln = rnd.uniform(1.8, 2.5)
            P.tube("heap_sp%d" % i, [(x, y, z), (x + math.cos(b) * 0.9, y + math.sin(b) * 0.9, z + ln)], [0.025, 0.02], "wood", 4)
            P.tube("heap_sph%d" % i, [(x + math.cos(b) * 0.9, y + math.sin(b) * 0.9, z + ln), (x + math.cos(b) * 1.02, y + math.sin(b) * 1.02, z + ln + 0.32)], [0.035, 0.004], "rust", 4)
        elif kind < 0.6:                                           # a helm, with its rim and a nasal
            P.sphere("heap_hm%d" % i, (x, y, z + 0.08), 0.16, "iron" if i % 3 else "rust", scale=(1.0, 0.9, 0.85))
            P.sphere("heap_hr%d" % i, (x, y, z + 0.02), 0.2, "rust", scale=(1.0, 0.95, 0.15))
            P.tube("heap_hn%d" % i, [(x + math.cos(b) * 0.15, y + math.sin(b) * 0.15, z + 0.16), (x + math.cos(b) * 0.17, y + math.sin(b) * 0.17, z - 0.02)], [0.02, 0.015], "iron", 4)
        elif kind < 0.74:                                          # a shield, leaning
            tilt = rnd.uniform(-0.7, 0.7)
            P.sphere("heap_sh%d" % i, (x, y, z + 0.28), 0.4, "rust", scale=(1.0, 0.1, 1.0), rot=(tilt, 0, b))
            P.sphere("heap_sb%d" % i, (x - math.sin(b) * 0.05, y + math.cos(b) * 0.05, z + 0.28), 0.09, "iron", scale=(1.0, 0.6, 1.0), rot=(tilt, 0, b))
        elif kind < 0.82:                                          # a skull
            P.sphere("heap_sk%d" % i, (x, y, z + 0.08), 0.1, "bone", scale=(1.1, 0.9, 0.95))
        elif kind < 0.92:                                          # long bones
            P.tube("heap_bn%d" % i, [(x, y, z), (x + math.cos(b) * 0.42, y + math.sin(b) * 0.42, z + 0.05)], [0.026, 0.022], "bone", 5)
        else:                                                      # rotted cloth over the heap
            verts = [(x + math.cos(b + q * 1.57) * 0.5, y + math.sin(b + q * 1.57) * 0.4, z + rnd.uniform(-0.05, 0.08)) for q in range(4)]
            P.poly("heap_cl%d" % i, verts, [(0, 1, 2, 3)], "cloth", 0.01)
    # the big things that say what the heap is, at a glance: a banner pole with its rag, a great axe, a hauberk
    P.tube("heap_pole", [(hx + nx * 0.4, hy + ny * 0.4, f + 0.3), (hx - nx * 0.6 + sx * 0.5, hy - ny * 0.6 + sy * 0.5, f + 3.4)], [0.05, 0.04], "wood", 6)
    pt = (hx - nx * 0.6 + sx * 0.5, hy - ny * 0.6 + sy * 0.5, f + 3.4)
    P.poly("heap_banner", [pt, (pt[0] + sx * 0.9, pt[1] + sy * 0.9, pt[2] - 0.1), (pt[0] + sx * 0.8 + nx * 0.1, pt[1] + sy * 0.8 + ny * 0.1, pt[2] - 1.5),
                           (pt[0] + sx * 0.05, pt[1] + sy * 0.05, pt[2] - 1.2)], [(0, 1, 2, 3)], "cloth", 0.01)
    ax0 = (hx + sx * 1.2 + nx * 1.4, hy + sy * 1.2 + ny * 1.4)
    P.tube("heap_axe", [(ax0[0], ax0[1], f + 0.1), (ax0[0] - nx * 0.3, ax0[1] - ny * 0.3, f + 1.6)], [0.04, 0.035], "wood", 5)
    P.box("heap_axeb", (ax0[0] - 0.3, ax0[1] - 0.05, f + 1.35), (ax0[0] + 0.3, ax0[1] + 0.05, f + 1.75), "iron", rot_z=math.atan2(sy, sx))
    P.sphere("heap_mail", (hx - sx * 1.0 + nx * 1.2, hy - sy * 1.0 + ny * 1.2, mound_z(hx - sx * 1.0 + nx * 1.2, hy - sy * 1.0 + ny * 1.2) + 0.05), 0.6,
             "iron", scale=(1.0, 0.7, 0.18), rot=(0.2, 0, 0.6))
    # the Stranger's wax at the dais' left foot, burned down over years, and his cards on the lowest step
    rnd = random.Random(77)
    wx, wy = fx + nx * 5.2 - sx * 3.0, fy + ny * 5.2 - sy * 3.0
    for i in range(14):
        a = rnd.uniform(0, 6.28)
        P.sphere("wax%d" % i, (wx + math.cos(a) * rnd.uniform(0, 0.7), wy + math.sin(a) * rnd.uniform(0, 0.7), f + 0.3), rnd.uniform(0.07, 0.17), "bone",
                 scale=(1.0, 1.0, 0.7))
    cards(wx + nx * 0.6 + sx * 0.8, wy + ny * 0.6 + sy * 0.8, f + 0.29, math.atan2(ny, nx))
    # three of his candles still burn, low at the heap's front: their light rakes across the blades, the helms' rims
    # and the skulls toward whoever comes up, so the heap reads as the things of the ones before (the area's one true
    # detail), not a mound
    for i, (a, b) in enumerate(((5.6, 7.9), (-5.6, 7.9), (7.4, 7.2))):
        cx_, cy_ = fx + nx * b + sx * a, fy + ny * b + sy * a
        P.sphere("swax%d" % i, (cx_, cy_, f + 0.04), 0.12, "bone", scale=(1.0, 1.0, 0.8))
        flame("scandle%d" % i, cx_, cy_, f + 0.16, 0.08, 30.0)


def cards(x, y, z, ang):
    """the Stranger's cards laid on the dais step: the nine of the reading in its spread, face down, one turned"""
    spread = [(0, 0), (0, 0.32), (0, -0.32), (0.45, 0), (-0.45, 0), (0.9, 0.32), (0.9, -0.32), (-0.9, 0.32), (-0.9, -0.32)]
    for i, (a, b) in enumerate(spread):
        cx = x + a * math.cos(ang) - b * math.sin(ang)
        cy = y + a * math.sin(ang) + b * math.cos(ang)
        P.box("card%d" % i, (cx - 0.11, cy - 0.07, z), (cx + 0.11, cy + 0.07, z + 0.012), "boxpaint" if i else "bone", rot_z=ang + (i % 3 - 1) * 0.1)


def pillars():
    """two rows of squared pillars cut from the rock, the nave between them leading to the throne, rising into the dark
    of the roof (out of frame); chains from some, their feet chipped"""
    cx, cy = HALL[0], HALL[1]
    ux, uy = -0.7071, -0.7071
    ax, ay = 0.7071, -0.7071
    for row in (-1, 1):
        for i, du in enumerate((-3.6, 0.8, 5.0)):
            px = cx + ux * du + ax * row * 5.6
            py = cy + uy * du + ay * row * 5.6
            P.displace(P.box("pillar%d_%d" % (row, i), (px - 0.42, py - 0.42, FLOOR_HALL), (px + 0.42, py + 0.42, FLOOR_HALL + 12.0), "dressed", rot_z=math.radians(45)), 0.05, 0.14, 5)
            P.box("pbase%d_%d" % (row, i), (px - 0.56, py - 0.56, FLOOR_HALL), (px + 0.56, py + 0.56, FLOOR_HALL + 0.4), "dressed", rot_z=math.radians(45))
            P.box("pcap%d_%d" % (row, i), (px - 0.52, py - 0.52, FLOOR_HALL + 4.6), (px + 0.52, py + 0.52, FLOOR_HALL + 4.95), "dressed", rot_z=math.radians(45))
            if (i + row) % 2 == 0:
                chains(px + 0.5, py + 0.5, FLOOR_HALL + 4.5, 300 + i * 3 + row)


def door_frame():
    """the door out, framed: two jambs and a lintel cut from the rock, a face in the lintel looking down at whoever
    leaves"""
    dx, dy = DOOR
    nx, ny = HALL[0] - dx, HALL[1] - dy
    nl = math.hypot(nx, ny)
    nx, ny = nx / nl, ny / nl
    tx, ty = -ny, nx
    for side in (-1, 1):
        jx, jy = dx + tx * side * 0.9, dy + ty * side * 0.9
        P.box("jamb%d" % side, (jx - 0.25, jy - 0.25, FLOOR_HALL - 0.2), (jx + 0.25, jy + 0.25, FLOOR_HALL + 3.0), "dressed", rot_z=math.atan2(ny, nx))
    P.box("lintel_door", (dx - 1.3, dy - 0.3, FLOOR_HALL + 3.0), (dx + 1.3, dy + 0.3, FLOOR_HALL + 3.6), "dressed", rot_z=math.atan2(ty, tx))
    relief("doorface", (dx + nx * 0.3, dy + ny * 0.3, FLOOR_HALL + 3.3), (nx, ny), 0.55, "closed", 77, "dressed", 0.6, nu=14, nv=18)


def roof():
    """the cave's roof: hidden from the camera, but it keeps the sky out, so the dark is the cave's own"""
    o = P.box("roof", (-30.0, -50.0, 15.5), (18.0, 14.0, 16.5), "basalt")
    o.visible_camera = False


def pool():
    """the Red come in under the cliffs: the blood standing in the basin, level, its edge soaking into the stone"""
    n = 40
    rr = BASIN[2] + 1.6
    pts = [(BASIN[0] + math.cos(2 * math.pi * k / n) * rr, BASIN[1] + math.sin(2 * math.pi * k / n) * rr, -0.12) for k in range(n)]
    P.poly("pool", pts, [tuple(range(n))], "pool")
    # and the blood standing in the runnels from the faces (Derek liked the pool contained: blood only in the pool and
    # its runnels, never the whole floor)
    for q, (fx_, fy_, nx_, ny_, ux, uy, ln) in enumerate(OOZE_FACES):
        tx, ty = -uy, ux
        a0, a1 = 0.3, ln - BASIN[2] + 0.5
        quad = [(fx_ + ux * a0 + tx * 0.55, fy_ + uy * a0 + ty * 0.55, -0.12), (fx_ + ux * a1 + tx * 0.6, fy_ + uy * a1 + ty * 0.6, -0.12),
                (fx_ + ux * a1 - tx * 0.6, fy_ + uy * a1 - ty * 0.6, -0.12), (fx_ + ux * a0 - tx * 0.55, fy_ + uy * a0 - ty * 0.55, -0.12)]
        P.poly("runnel%d" % q, quad, [(0, 1, 2, 3)], "pool")


def pool_bodies():
    """three who came up out of the blood and did not stand: face down across the shore stumps, half in the blood,
    drowned and bloated, one gone to its bones (they look exactly as the pilgrim did a moment before)"""
    for k, (x0, y0, yaw, rot) in enumerate(((-1.7, 2.6, 0.4, 0), (3.6, -1.3, 2.4, 2), (-0.6, -2.4, -1.1, 0))):
        c, s_ = math.cos(yaw), math.sin(yaw)
        def at(u, w, z):
            x, y = x0 + u * c - w * s_, y0 + u * s_ + w * c
            f = floor_at(x, y) or 0.0
            return (x, y, max(f, -0.12) + z)
        fl = "corpse" if rot < 2 else "bone"
        if rot < 2:
            P.sphere("pb%d_torso" % k, at(0, 0, 0.12), 1.0, fl, scale=(0.45, 0.3, 0.2), rot=(0, 0, yaw))
            P.sphere("pb%d_head" % k, at(0.66, 0.02, 0.08), 0.14, fl, scale=(1.1, 0.9, 0.85))
        else:
            P.tube("pb%d_spine" % k, [at(-0.5, 0, 0.06), at(0.5, 0, 0.08)], [0.035, 0.03], "bone", 6)
            for r in range(9):
                for sd in (-1, 1):
                    P.tube("pb%d_rib%d_%d" % (k, r, sd), [at(0.4 - r * 0.08, 0, 0.1), at(0.36 - r * 0.08, sd * 0.18, 0.17), at(0.32 - r * 0.08, sd * 0.26, 0.02)],
                           [0.015, 0.012, 0.008], "bone", 4)
            P.sphere("pb%d_skull" % k, at(0.68, 0.1, 0.08), 0.12, "bone", scale=(1.2, 0.9, 0.95))
        lr = 0.07 if rot < 2 else 0.03
        for sd in (-1, 1):
            P.tube("pb%d_arm%d" % (k, sd), [at(0.32, sd * 0.28, 0.1), at(0.7, sd * 0.42, 0.05), at(1.05, sd * 0.36, 0.03)], [lr, lr * 0.9, lr * 0.75], fl, 6)
            P.tube("pb%d_leg%d" % (k, sd), [at(-0.6, sd * 0.12, 0.08), at(-1.1, sd * 0.17, 0.05), at(-1.55, sd * 0.22, 0.02)], [lr * 1.3, lr * 1.05, lr * 0.85], fl, 6)


def pool_dead():
    """at the pool's edge, the ones who came up and did not stand: rib cages half sunk in the blood, skulls, long bones
    (the Stranger: "the ones who came up before you and didn't stand")"""
    rnd = random.Random(41)
    bx, by, br = BASIN
    for i in range(16):
        a = rnd.uniform(0, 2 * math.pi)
        r = br + rnd.uniform(-0.9, 0.9)
        x, y = bx + math.cos(a) * r, by + math.sin(a) * r
        f = floor_at(x, y) or 0.0
        z = max(f, -0.18) + 0.02
        kind = rnd.random()
        if kind < 0.35:
            P.sphere("pd_skull%d" % i, (x, y, z + 0.06), 0.1, "bone", scale=(1.1, 0.9, 0.9))
        elif kind < 0.65:
            for k in range(7):
                for sd in (-1, 1):
                    P.tube("pd_rib%d_%d_%d" % (i, k, sd), [(x + k * 0.07, y, z + 0.1), (x + k * 0.07 - 0.03, y + sd * 0.16, z + 0.12),
                                                         (x + k * 0.07 - 0.06, y + sd * 0.22, z - 0.04)], [0.012, 0.01, 0.007], "bone", 4)
            P.tube("pd_spine%d" % i, [(x - 0.05, y, z + 0.08), (x + 0.5, y, z + 0.08)], [0.025, 0.022], "bone", 5)
        else:
            b = rnd.uniform(0, math.pi)
            P.tube("pd_bone%d" % i, [(x, y, z), (x + math.cos(b) * 0.42, y + math.sin(b) * 0.42, z + 0.03)], [0.026, 0.022], "bone", 5)


def offerings(x, y, f, k):
    """at the foot of a face, what pilgrims left it: candle stubs (cold), teeth, a few coins"""
    rnd = random.Random(k)
    for i in range(rnd.randint(3, 6)):
        ox, oy = x + rnd.uniform(0.15, 0.6), y + rnd.uniform(-0.6, 0.6)
        P.cylinder("of_c%d_%d" % (k, i), (ox, oy, f), 0.035, rnd.uniform(0.05, 0.16), "bone", sides=6)
    for i in range(rnd.randint(4, 9)):
        P.sphere("of_t%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.7), y + rnd.uniform(-0.6, 0.6), f + 0.01), 0.018, "bone")
    for i in range(rnd.randint(1, 4)):
        P.cylinder("of_g%d_%d" % (k, i), (x + rnd.uniform(0.1, 0.6), y + rnd.uniform(-0.5, 0.5), f), 0.03, 0.008, "gold", sides=8)


def rags(k, x, y, z, nx, ny):
    """rotted cloth hanging from the cornice, torn into strips"""
    tx, ty = -ny, nx
    rnd = random.Random(k)
    for i in range(5):
        a = (i - 2) * 0.16
        ln = rnd.uniform(1.0, 2.6)
        verts = [(x + tx * (a - 0.06) + nx * 0.05, y + ty * (a - 0.06) + ny * 0.05, z), (x + tx * (a + 0.06) + nx * 0.05, y + ty * (a + 0.06) + ny * 0.05, z),
                 (x + tx * (a + 0.04) + nx * 0.12, y + ty * (a + 0.04) + ny * 0.12, z - ln), (x + tx * (a - 0.05) + nx * 0.12, y + ty * (a - 0.05) + ny * 0.12, z - ln)]
        P.poly("rag%d_%d" % (k, i), verts, [(0, 1, 2, 3)], "cloth", 0.01)


def niche(k, x, y, z, nx, ny):
    """a niche cut in the dressed wall, a skull in it"""
    P.box("niche%d" % k, (x - 0.3, y - 0.3, z), (x + 0.3, y + 0.3, z + 0.6), "lacquer", rot_z=math.atan2(ny, nx))
    P.sphere("nskull%d" % k, (x + nx * 0.22, y + ny * 0.22, z + 0.12), 0.11, "bone", scale=(1.0, 1.0, 1.1))


SPOUTS = []                              # where the blood from the faces' mouths strikes the pool (x, y, z)


def spouting_faces():
    """three raw pillars at the pool's back edge, each with a crude face cut into it, the first carving in the cave
    (the raw becoming the made), and from each mouth a thick rope of blood pouring down into the pool (Derek: "faces on
    the wall having blood pour from their mouths into the pool"; the mascarons of old fountains)"""
    bx, by, br = BASIN
    for k, ang in enumerate((200.0, 228.0, 256.0)):
        a = math.radians(ang)
        px, py = bx + math.cos(a) * (br + 0.9), by + math.sin(a) * (br + 0.9)
        nx, ny = bx - px, by - py
        nl = math.hypot(nx, ny)
        nx, ny = nx / nl, ny / nl
        rnd = random.Random(140 + k)
        poly = [(px + math.cos(2 * math.pi * i / 6 + rnd.uniform(-0.2, 0.2)) * 0.78, py + math.sin(2 * math.pi * i / 6 + rnd.uniform(-0.2, 0.2)) * 0.78)
                for i in range(6)]
        top = rnd.uniform(4.2, 5.4)
        C.rough_prism("spillar%d" % k, poly, -1.6, top, "basalt", 300 + k, 0.0, 0.25 * rnd.random(), (0.0, 0.0), 0.7, drum=(0.8, 2.0))
        H = 1.75 + 0.2 * rnd.random()
        cz = 2.45 + 0.3 * rnd.random()
        fc = (px + nx * 0.58, py + ny * 0.58, cz)
        relief("spface%d" % k, fc, (nx, ny), H, "eyeless", 700 + k, "carved", 0.85, back=0.55, nu=22, nv=26)
        p2 = face_params("eyeless", 700 + k)
        mz = cz + p2["mouthy"] * 0.5 * H
        m0 = (fc[0] + nx * (0.16 * H + 0.04), fc[1] + ny * (0.16 * H + 0.04), mz)
        # the rope of blood: thick from the mouth, arcing out and down, thinning, into the pool; two strands beside it
        for q, (off, rad, reach) in enumerate(((0.0, 0.085, 0.55), (0.06, 0.035, 0.45), (-0.05, 0.03, 0.5))):
            tx_, ty_ = -ny * off, nx * off
            pts, radii = [], []
            for i in range(9):
                s_ = i / 8.0
                out_ = reach * (1 - (1 - s_) ** 2)                      # it leaves the lip and falls
                pts.append((m0[0] + nx * out_ + tx_, m0[1] + ny * out_ + ty_, m0[2] - (m0[2] + 0.12) * s_ ** 1.6))
                radii.append(rad * (1.0 - 0.35 * s_) + (0.02 if i == 0 else 0.0))
            P.tube("spout%d_%d" % (k, q), pts, radii, "blood", 7)
        # the chin and the pillar's foot run with it
        P.tube("spchin%d" % k, [(m0[0] - nx * 0.02, m0[1] - ny * 0.02, mz - 0.05), (fc[0] + nx * 0.2, fc[1] + ny * 0.2, cz - 0.45 * H),
                                (px + nx * 0.8, py + ny * 0.8, 0.4), (px + nx * 0.85, py + ny * 0.85, -0.1)], [0.05, 0.06, 0.07, 0.09], "blood", 6)
        SPOUTS.append((m0[0] + nx * 0.55, m0[1] + ny * 0.55, -0.12))
        if k != 1:
            # a wisp-fire on the pillar's outer side, raking across its face
            side = -1 if k == 0 else 1
            sxp, syp = -ny * side, nx * side
            torch("sptorch%d" % k, px + sxp * 1.3 + nx * 0.5, py + syp * 1.3 + ny * 0.5, cz - 0.25, -sxp * 0.5 + nx * 0.85, -syp * 0.5 + ny * 0.85, 60.0)


def clots():
    """what floats on the blood: clots in dark lumps, gathered toward the edge and round where the streams strike"""
    rnd = random.Random(73)
    bx, by, br = BASIN
    for i in range(38):
        a = rnd.uniform(0, 2 * math.pi)
        r = br * math.sqrt(rnd.random()) * 1.15
        x, y = bx + math.cos(a) * r, by + math.sin(a) * r
        P.sphere("clot%d" % i, (x, y, -0.13), rnd.uniform(0.06, 0.2), "blood", scale=(1.0, rnd.uniform(0.6, 1.0), 0.3), rot=(0, 0, rnd.uniform(0, 3)))


OOZE_TH = (196.0, 214.0, 232.0)          # where the plain faces are cut in the pool chamber's back wall


def _ooze_faces():
    """the plain faces of the pool chamber's back wall: where each stands, its normal (toward the pool and the eye), the
    line its blood runs along to the pool"""
    out = []
    for th in OOZE_TH:
        a = math.radians(th)
        x, y = POOL[0] + POOL[2] * 0.95 * math.cos(a), POOL[1] + POOL[3] * 0.95 * math.sin(a)
        ix, iy = BASIN[0] - x, BASIN[1] - y
        il = math.hypot(ix, iy)
        nx, ny = ix / il + 0.55, iy / il + 0.55
        nl = math.hypot(nx, ny)
        out.append((x, y, nx / nl, ny / nl, ix / il, iy / il, il))
    return out


OOZE_FACES = _ooze_faces()


def _in_runnel(x, y):
    """on the channel the blood has worn from a face's foot to the pool"""
    for (fx, fy, nx, ny, ux, uy, ln) in OOZE_FACES:
        t = (x - fx) * ux + (y - fy) * uy
        if 0.4 < t < ln:
            w = abs(-(x - fx) * uy + (y - fy) * ux)
            if w < 0.45 + 0.15 * math.sin(t * 2.3):
                return True
    return False


def ooze_faces():
    """plain faces cut into the raw columns of the pool chamber's back wall, defined, mouths open, blood oozing from
    each mouth down the chin and the wall and away along a worn channel into the pool (Derek: "have define plain faces
    on the chamber walls, with mouths opens while blood oozes from their mouths in the pool")"""
    for k, (x, y, nx, ny, ux, uy, ln) in enumerate(OOZE_FACES):
        H = 3.0 + 0.2 * (k % 2)
        f = floor_at(x + ux * 1.2, y + uy * 1.2) or 0.05
        cz = f + 0.35 + 0.575 * H
        CUTS.append((x, y, nx, ny, 0.62 * H, -2.0, cz + 0.6 * H))
        relief("ozface%d" % k, (x, y, cz), (nx, ny), H, "plain", 610 + k, "carved", 0.3, back=0.9, nu=30, nv=36)
        p2 = face_params("plain", 610 + k)
        mz = cz + p2["mouthy"] * 0.5 * H
        m0 = (x + nx * (0.16 * H), y + ny * (0.16 * H), mz)
        # the tongue of blood: thick at the lip, sagging down the chin, down the wall, pooling at the foot
        pts = [m0, (m0[0] + nx * 0.12, m0[1] + ny * 0.12, mz - 0.18), (x + nx * 0.36, y + ny * 0.36, cz - 0.5 * H),
               (x + nx * 0.3, y + ny * 0.3, f + 0.5), (x + nx * 0.55, y + ny * 0.55, f + 0.05)]
        P.tube("ooze%d" % k, pts, [0.11, 0.13, 0.1, 0.12, 0.16], "blood", 8)
        for q in range(3):                                               # drips gathering on the chin
            P.sphere("oozedrip%d_%d" % (k, q), (m0[0] + nx * 0.16 + (q - 1) * -ny * 0.12, m0[1] + ny * 0.16 + (q - 1) * nx * 0.12, mz - 0.3 - 0.12 * q),
                     0.05 + 0.02 * q, "blood", scale=(1.0, 1.0, 1.5))
        # a fire on the wall beside it, raking across the face and catching the wet of the blood
        tx_, ty_ = -uy, ux
        torch("oztorch%d" % k, x + ux * 0.55 + tx_ * 0.5 * H, y + uy * 0.55 + ty_ * 0.5 * H, cz + 0.62 * H, ux, uy, 115.0)   # close, above, to one side: grazing
        # where it strikes the pool
        SPOUTS.append((BASIN[0] - ux * (BASIN[2] + 0.4), BASIN[1] - uy * (BASIN[2] + 0.4), -0.12))


# the builders' script: each mark a few straight strokes in a unit box (x across 0..1, y up 0..1), cut into the stone
SCRIPT = [
    [(0.5, 0.0, 0.5, 1.0), (0.5, 0.65, 0.15, 0.95), (0.5, 0.65, 0.85, 0.95)],
    [(0.2, 0.0, 0.2, 1.0), (0.2, 1.0, 0.8, 0.7), (0.8, 0.7, 0.2, 0.4)],
    [(0.15, 0.0, 0.5, 1.0), (0.5, 1.0, 0.85, 0.0), (0.3, 0.45, 0.7, 0.45)],
    [(0.5, 0.0, 0.5, 1.0), (0.15, 0.3, 0.85, 0.7)],
    [(0.2, 0.0, 0.2, 1.0), (0.8, 0.0, 0.8, 1.0), (0.2, 0.5, 0.8, 0.5)],
    [(0.5, 0.0, 0.5, 0.6), (0.5, 0.6, 0.15, 1.0), (0.5, 0.6, 0.85, 1.0)],
    [(0.2, 1.0, 0.8, 0.0), (0.2, 0.0, 0.8, 1.0)],
    [(0.3, 0.0, 0.3, 1.0), (0.3, 1.0, 0.75, 0.75), (0.3, 0.5, 0.75, 0.25)],
    [(0.15, 0.2, 0.5, 1.0), (0.5, 1.0, 0.85, 0.2), (0.15, 0.2, 0.85, 0.2)],
    [(0.5, 0.0, 0.5, 1.0), (0.2, 0.8, 0.8, 0.8), (0.2, 0.2, 0.8, 0.2)],
]


def carve_marks(name, origin, along, up, normal, length, height, seed):
    """a line of marks cut into a stone face (Derek: "Add carved runes into the steps"): the builders' script, no one
    living can read it; each stroke a narrow groove, dark in the stone (narrower than a world pixel, so its dark is
    painted, as the form law allows)"""
    rnd = random.Random(seed)
    ox, oy, oz = origin
    ax, ay = along
    nx, ny = normal
    w = height * 0.62
    gap = height * 0.32
    n = int((length + gap) / (w + gap))
    x0 = (length - n * (w + gap) + gap) / 2.0
    for i in range(n):
        glyph = SCRIPT[rnd.randrange(len(SCRIPT))]
        bx = x0 + i * (w + gap)
        for k, (u0, v0, u1, v1) in enumerate(glyph):
            p0 = (ox + ax * (bx + u0 * w) + nx * 0.004, oy + ay * (bx + u0 * w) + ny * 0.004, oz + v0 * height)
            p1 = (ox + ax * (bx + u1 * w) + nx * 0.004, oy + ay * (bx + u1 * w) + ny * 0.004, oz + v1 * height)
            P.tube("%s_%d_%d" % (name, i, k), [p0, p1], [0.018, 0.018], "lacquer", 4)


def onyx_frame(mc, s_, n_, rx, rz, seed=77):
    """the onyx mirror's border (Derek: "The mirror in the large mouth is not able to be seen, give it an ornate carved
    runic stone border"): two raised rings of smooth carved stone, between them a flat band with the builders' marks
    cut round it, bosses on the outer ring; lit by the candles, it makes the black of the mirror read (dark on light)"""
    sx, sy = s_
    nx, ny = n_
    def at(a, r_add, out, rr=1.0):
        return (mc[0] + sx * math.cos(a) * (rx + r_add) * rr + nx * out, mc[1] + sy * math.cos(a) * (rx + r_add) * rr + ny * out,
                mc[2] + math.sin(a) * (rz + r_add) * rr)
    n = 72
    P.tube("onyx_ring_in", [at(2 * math.pi * i / n, 0.1, 0.08) for i in range(n + 1)], [0.13] * (n + 1), "carved", 8)
    P.tube("onyx_ring_out", [at(2 * math.pi * i / n, 0.62, 0.06) for i in range(n + 1)], [0.1] * (n + 1), "carved", 8)
    # the band between: a flat ring of stone the marks are cut in
    verts, faces = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        verts.append(at(a, 0.16, 0.03))
        verts.append(at(a, 0.56, 0.03))
    for i in range(n):
        a0, b0 = 2 * i, 2 * i + 1
        a1, b1 = 2 * ((i + 1) % n), 2 * ((i + 1) % n) + 1
        faces.append((a0, a1, b1, b0))
    P.poly("onyx_band", verts, faces, "carved", 0.12)
    # the marks round the band, each standing on the band, its up turned outward from the mirror
    rnd = random.Random(seed)
    k = 0
    a = 0.0
    while a < 2 * math.pi - 0.05:
        ca, sa = math.cos(a), math.sin(a)
        # the band's centre line here, its outward (radial) and along (tangent) directions in the wall's plane
        cx_, cy_, cz_ = at(a, 0.36, 0.06)
        rad = (sx * ca * (rx + 0.36), sy * ca * (rx + 0.36), sa * (rz + 0.36))
        rl = math.sqrt(rad[0] ** 2 + rad[1] ** 2 + rad[2] ** 2)
        rad = (rad[0] / rl, rad[1] / rl, rad[2] / rl)
        tan = (-sx * sa * (rx + 0.36), -sy * sa * (rx + 0.36), ca * (rz + 0.36))
        tl = math.sqrt(tan[0] ** 2 + tan[1] ** 2 + tan[2] ** 2)
        tan = (tan[0] / tl, tan[1] / tl, tan[2] / tl)
        glyph = SCRIPT[rnd.randrange(len(SCRIPT))]
        w, h = 0.16, 0.24
        for q, (u0, v0, u1, v1) in enumerate(glyph):
            p0 = tuple(c + tan[i] * (u0 - 0.5) * w + rad[i] * (v0 - 0.5) * h + (nx, ny, 0.0)[i] * 0.07 for i, c in enumerate((cx_, cy_, cz_)))
            p1 = tuple(c + tan[i] * (u1 - 0.5) * w + rad[i] * (v1 - 0.5) * h + (nx, ny, 0.0)[i] * 0.07 for i, c in enumerate((cx_, cy_, cz_)))
            P.tube("onyx_mark%d_%d" % (k, q), [p0, p1], [0.022, 0.022], "lacquer", 4)
        k += 1
        a += 0.27 / ((rx + rz) / 2 + 0.36) * 1.6
    # bosses on the outer ring
    for i in range(12):
        P.sphere("onyx_boss%d" % i, at(2 * math.pi * (i + 0.5) / 12, 0.62, 0.16), 0.13, "carved", scale=(1, 1, 1))


# the way out: an archway through the great face (Derek: "Make the mouth more like an archway and less like an o"),
# in the face's own coordinates (X across, Y up): flat at the step, straight sides, a round arch overhead
ARCH_HW, ARCH_BOT, ARCH_SPRING, ARCH_RISE = 0.34, -0.83, -0.42, 0.18


def arch_inside(X, Y):
    """how far inside the archway a point is (in the face's units; negative outside)"""
    side = ARCH_HW - abs(X)
    bot = Y - ARCH_BOT
    if Y <= ARCH_SPRING:
        return min(side, bot)
    e = (X / ARCH_HW) ** 2 + ((Y - ARCH_SPRING) / ARCH_RISE) ** 2
    return min((1.0 - math.sqrt(e)) * ARCH_RISE, bot)


def arch_path(c, s_, n_, H, off, out, n=64):
    """the archway's outline in the world, grown outward by off (yards), set out from the face's plane by out: from the
    left foot up, over the arch, down to the right foot"""
    sx, sy = s_
    nx, ny = n_
    hw = ARCH_HW * 0.55 * H + off
    zb = c[2] + ARCH_BOT * 0.5 * H
    zs = c[2] + ARCH_SPRING * 0.5 * H
    rise = ARCH_RISE * 0.5 * H + off
    pts = []
    k_side = n // 4
    for i in range(k_side):
        pts.append((-hw, zb + (zs - zb) * i / k_side))
    for i in range(n - 2 * k_side + 1):
        a = math.pi - math.pi * i / (n - 2 * k_side)
        pts.append((math.cos(a) * hw, zs + math.sin(a) * rise))
    for i in range(1, k_side + 1):
        pts.append((hw, zs - (zs - zb) * i / k_side))
    return [(c[0] + sx * u + nx * out, c[1] + sy * u + ny * out, z) for u, z in pts]


def onyx_arch_frame(c, s_, n_, H, out, seed=77):
    """the onyx's border, following the archway (Derek: "an ornate carved runic stone border"): two raised mouldings of
    smooth carved stone, a flat band between them with the builders' marks cut along it, bosses on the outer moulding;
    standing just proud of the lips, so the black reads against lit stone"""
    inner = arch_path(c, s_, n_, H, 0.1, out + 0.08)
    outer = arch_path(c, s_, n_, H, 0.66, out + 0.06)
    P.tube("onyx_ring_in", inner, [0.14] * len(inner), "carved", 8)
    P.tube("onyx_ring_out", outer, [0.11] * len(outer), "carved", 8)
    a_ = arch_path(c, s_, n_, H, 0.18, out + 0.03)
    b_ = arch_path(c, s_, n_, H, 0.6, out + 0.03)
    verts = []
    for p, q in zip(a_, b_):
        verts += [p, q]
    faces = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(len(a_) - 1)]
    P.poly("onyx_band", verts, faces, "carved", 0.12)
    # the marks along the band, each upright to the band's run
    mid = arch_path(c, s_, n_, H, 0.39, out + 0.1, n=120)
    rnd = random.Random(seed)
    nx, ny = n_
    k = 0
    i = 2
    while i < len(mid) - 2:
        p0, p1 = mid[i - 1], mid[i + 1]
        tan = (p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
        tl = math.sqrt(sum(t * t for t in tan)) + 1e-9
        tan = tuple(t / tl for t in tan)
        # the band's across: the cross of the tangent with the face's normal
        up = (tan[1] * 0.0 - tan[2] * ny, tan[2] * nx - tan[0] * 0.0, tan[0] * ny - tan[1] * nx)
        ul = math.sqrt(sum(t * t for t in up)) + 1e-9
        up = tuple(t / ul for t in up)
        glyph = SCRIPT[rnd.randrange(len(SCRIPT))]
        w, h = 0.17, 0.26
        for q, (u0, v0, u1, v1) in enumerate(glyph):
            a = tuple(mid[i][j] + tan[j] * (u0 - 0.5) * w + up[j] * (v0 - 0.5) * h for j in range(3))
            b = tuple(mid[i][j] + tan[j] * (u1 - 0.5) * w + up[j] * (v1 - 0.5) * h for j in range(3))
            P.tube("onyx_mark%d_%d" % (k, q), [a, b], [0.024, 0.024], "lacquer", 4)
        k += 1
        i += 5
    bosses = arch_path(c, s_, n_, H, 0.66, out + 0.16, n=24)
    for j, p in enumerate(bosses[1:-1:2]):
        P.sphere("onyx_boss%d" % j, p, 0.14, "carved")


FACE_TURN = (0.74, 0.67)               # the stair faces turned on the wall to look down the stairs at whoever climbs
def mirror_disc(name, c, nrm3, r, ring_mat="iron"):
    """a small dark mirror of polished obsidian at c, its face turned to nrm3 (any direction), a thin rim round it"""
    nx, ny, nz = nrm3
    L = math.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / L, ny / L, nz / L
    # two axes across the disc
    ax = (-ny, nx, 0.0) if abs(nz) < 0.9 else (1.0, 0.0, 0.0)
    la = math.sqrt(ax[0] ** 2 + ax[1] ** 2 + ax[2] ** 2)
    ax = (ax[0] / la, ax[1] / la, ax[2] / la)
    bx = (ny * ax[2] - nz * ax[1], nz * ax[0] - nx * ax[2], nx * ax[1] - ny * ax[0])
    n = 16
    verts = [(c[0], c[1], c[2])]
    for i in range(n):
        a = 2 * math.pi * i / n
        verts.append((c[0] + (ax[0] * math.cos(a) + bx[0] * math.sin(a)) * r, c[1] + (ax[1] * math.cos(a) + bx[1] * math.sin(a)) * r,
                      c[2] + (ax[2] * math.cos(a) + bx[2] * math.sin(a)) * r))
    P.poly(name, verts, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)], "mirror")
    MIRRORS.append((c[0], c[1], c[2], nx, ny, nz, r))
    ring = [(c[0] + (ax[0] * math.cos(2 * math.pi * i / 20) + bx[0] * math.sin(2 * math.pi * i / 20)) * (r + 0.02) - nx * 0.01,
             c[1] + (ax[1] * math.cos(2 * math.pi * i / 20) + bx[1] * math.sin(2 * math.pi * i / 20)) * (r + 0.02) - ny * 0.01,
             c[2] + (ax[2] * math.cos(2 * math.pi * i / 20) + bx[2] * math.sin(2 * math.pi * i / 20)) * (r + 0.02) - nz * 0.01) for i in range(21)]
    P.tube(name + "_rim", ring, [0.025] * 21, ring_mat, 5)


def toward(c, target):
    """the normal a mirror at c must have for whoever looks down the camera's way to see target in it (the law of
    reflection: halfway between the way back to the eye and the way to the thing)"""
    vx, vy, vz = -CAM[0], -CAM[1], -CAM[2]
    lv = math.sqrt(vx * vx + vy * vy + vz * vz)
    lx, ly, lz = target[0] - c[0], target[1] - c[1], target[2] - c[2]
    ll = math.sqrt(lx * lx + ly * ly + lz * lz)
    return (vx / lv + lx / ll, vy / lv + ly / ll, vz / lv + lz / ll)


def face_of_faces(c, nrm, H, seed, targets):
    """the colossal face made of little faces (Derek: "The big face need to be a bunch of little faces ... the mirror
    can be in the mouths"): its form stays (the arched brows, the sockets, the nose, the mouth that holds the throne),
    its surface covered in small faces, each its own, turned with the big face's surface; the sockets and the mouth
    left empty and black. Each little face's mouth is a dark mirror, turned so it holds one of the fires: the great
    face glitters with fires that are not there"""
    nx, ny = nrm
    tx, ty = -ny, nx
    prm = face_params("orcus", seed)
    rnd = random.Random(seed)
    pits = [(rnd.uniform(-0.9, 0.9), rnd.uniform(-1.0, 1.0), rnd.uniform(0.02, 0.06), rnd.uniform(0.01, 0.04))
            for _ in range(int(8 + 14 * 0.55))]
    def depth(X, Y):
        return face_depth(X, Y, "orcus", 0.55, seed, pits, prm)
    r2 = random.Random(seed + 1)
    kinds = ["closed", "blind", "eyeless", "full", "closed", "mouthless", "half", "closed"]
    k = 0
    j = 0
    Y = 0.98
    while Y > -0.95:
        X = -0.58 + (0.17 if j % 2 else 0.0)
        while X < 0.66:
            Xj, Yj = X + r2.uniform(-0.03, 0.03), Y + r2.uniform(-0.03, 0.03)
            e = (Xj / prm["hw"]) ** 2 + (Yj / prm["hl"]) ** 2
            X += 0.34
            if e > 0.93:
                continue
            head = 0.17 * max(0.0, 1.0 - e) ** 0.3
            d = depth(Xj, Yj)
            mo = (Xj / 0.42) ** 2 + ((Yj + 0.36) / 0.28) ** 2
            if d < head - 0.05 or mo < 1.15:
                continue                                          # the sockets, the mouth, a crack: left empty
            h = 0.01
            dX = (depth(Xj + h, Yj) - depth(Xj - h, Yj)) / (2 * h) * H / (0.55 * H)
            lnx, lny = nx - tx * dX * 0.8, ny - ty * dX * 0.8
            ln = math.hypot(lnx, lny)
            lnx, lny = lnx / ln, lny / ln
            px = c[0] + tx * Xj * 0.55 * H + nx * d * H
            py = c[1] + ty * Xj * 0.55 * H + ny * d * H
            pz = c[2] + Yj * 0.5 * H
            hs = r2.uniform(1.6, 2.1)
            kind = kinds[k % len(kinds)]
            sd = seed * 100 + k
            relief("ff%d" % k, (px + lnx * 0.02, py + lny * 0.02, pz), (lnx, lny), hs, kind, sd, "carved", 0.7,
                   back=0.5, nu=20, nv=24)
            # its mouth a dark mirror, turned to hold one of the fires
            if kind != "mouthless":
                p2 = face_params(kind, sd)
                mz = pz + p2["mouthy"] * 0.5 * hs
                mc = (px + lnx * (0.15 * hs + 0.04), py + lny * (0.15 * hs + 0.04), mz)
                tgt = targets[r2.randrange(len(targets))]
                mirror_disc("ffm%d" % k, mc, toward(mc, tgt), 0.075 * hs / 0.8)
            k += 1
        Y -= 0.36
        j += 1


def sconce(name, x, y, z, nx, ny):
    """a wrought-iron holder for a wisp-fire on the wall (Derek: "The torches on the walls need iron holders"): a plate
    nailed to the rock, an arm curling out and up, a basket of bars round the fire, a drip ring under it"""
    tx, ty = -ny, nx
    P.box(name + "_plate", (x - 0.05, y - 0.16, z - 0.55), (x + 0.05, y + 0.16, z + 0.05), "iron", rot_z=math.atan2(ny, nx))
    for i, h in enumerate((-0.45, -0.05)):
        P.sphere("%s_nail%d" % (name, i), (x + nx * 0.06, y + ny * 0.06, z + h), 0.03, "iron")
    P.tube(name + "_arm", [(x + nx * 0.05, y + ny * 0.05, z - 0.38), (x + nx * 0.3, y + ny * 0.3, z - 0.3),
                          (x + nx * 0.45, y + ny * 0.45, z - 0.12), (x + nx * 0.48, y + ny * 0.48, z + 0.02)], [0.035, 0.032, 0.03, 0.03], "iron", 6)
    P.tube(name + "_curl", [(x + nx * 0.3, y + ny * 0.3, z - 0.3), (x + nx * 0.22, y + ny * 0.22, z - 0.45), (x + nx * 0.3, y + ny * 0.3, z - 0.52),
                           (x + nx * 0.36, y + ny * 0.36, z - 0.45)], [0.02, 0.02, 0.018, 0.016], "iron", 5)
    bx, by = x + nx * 0.5, y + ny * 0.5
    for zz, rr in ((z + 0.02, 0.09), (z + 0.3, 0.15)):
        ring = [(bx + math.cos(2 * math.pi * i / 16) * rr, by + math.sin(2 * math.pi * i / 16) * rr, zz) for i in range(17)]
        P.tube("%s_ring%d" % (name, int(rr * 100)), ring, [0.018] * 17, "iron", 4)
    for i in range(6):
        a = 2 * math.pi * i / 6
        P.tube("%s_bar%d" % (name, i), [(bx + math.cos(a) * 0.09, by + math.sin(a) * 0.09, z + 0.02), (bx + math.cos(a) * 0.15, by + math.sin(a) * 0.15, z + 0.3),
                                       (bx + math.cos(a) * 0.17, by + math.sin(a) * 0.17, z + 0.38)], [0.014, 0.013, 0.008], "iron", 4)
    P.sphere(name + "_pan", (bx, by, z + 0.05), 0.09, "rust", scale=(1, 1, 0.4))


def relics():
    """iron left lying where it fell, through the hall, up the stairs and round the pool (Derek: "more iron relics
    laying around"): swords, broken blades, helms, shields, chains, manacles, spearheads on broken shafts, iron
    candlesticks standing and fallen, a cage, a lantern; nothing is placed, everything dropped"""
    rnd = random.Random(61)
    fx, fy, fnx, fny = _face_span()
    spots = []
    for _ in range(4000):
        if len(spots) >= 150:
            break
        zone = rnd.random()
        if zone < 0.62:
            th = rnd.uniform(0, 2 * math.pi)
            rr = math.sqrt(rnd.random()) * 0.92
            x, y = HALL[0] + HALL[2] * rr * math.cos(th), HALL[1] + HALL[3] * rr * math.sin(th)
            al = (x - fx) * fnx + (y - fy) * fny
            ac = abs(-(x - fx) * fny + (y - fy) * fnx)
            if al < 9.0 and ac < 8.6:
                continue                                        # the stairs climb clear; the heaps have their own
        elif zone < 0.82:
            x, y = rnd.uniform(STAIR[0] + 0.2, STAIR[1] - 0.2), rnd.uniform(STAIR[3], STAIR[2])
        else:
            th = rnd.uniform(0, 2 * math.pi)
            rr = rnd.uniform(0.55, 0.9)
            x, y = POOL[0] + POOL[2] * rr * math.cos(th), POOL[1] + POOL[3] * rr * math.sin(th)
        f = floor_at(x, y)
        if f is None:
            continue
        spots.append((x, y, f))
    for i, (x, y, f) in enumerate(spots):
        kind = rnd.random()
        b = rnd.uniform(0, math.pi)
        cb, sb = math.cos(b), math.sin(b)
        z = f + 0.03
        if kind < 0.2:                                           # a sword, whole or broken
            ln = rnd.uniform(0.45, 1.0)
            P.tube("rl_sw%d" % i, [(x, y, z), (x + cb * ln, y + sb * ln, z + 0.01)], [0.035, 0.008 if ln > 0.7 else 0.03], "iron", 4)
            P.tube("rl_gd%d" % i, [(x - sb * 0.13, y + cb * 0.13, z + 0.02), (x + sb * 0.13, y - cb * 0.13, z + 0.02)], [0.02, 0.02], "rust", 4)
            P.tube("rl_gp%d" % i, [(x, y, z + 0.02), (x - cb * 0.2, y - sb * 0.2, z + 0.02)], [0.022, 0.02], "rust", 4)
        elif kind < 0.33:                                        # a helm on its side
            P.sphere("rl_hm%d" % i, (x, y, z + 0.1), 0.15, "iron", scale=(1.0, 0.9, 0.85), rot=(1.2, 0, b))
        elif kind < 0.43:                                        # a shield, face down or up
            P.sphere("rl_sh%d" % i, (x, y, z + 0.04), 0.36, "rust", scale=(1.0, 1.0, 0.09), rot=(rnd.uniform(-0.15, 0.15), 0, b))
            P.sphere("rl_sb%d" % i, (x, y, z + 0.08), 0.08, "iron", scale=(1.0, 1.0, 0.5))
        elif kind < 0.56:                                        # a length of chain lying in a curve
            n = rnd.randint(6, 14)
            for q in range(n):
                a = b + q * 0.18 * rnd.choice((-1, 1)) * 0.5
                P.sphere("rl_ch%d_%d" % (i, q), (x + math.cos(a) * q * 0.1, y + math.sin(a) * q * 0.1, z + 0.02), 0.05, "rust",
                         scale=(1.0 if q % 2 else 0.4, 0.4 if q % 2 else 1.0, 0.35))
        elif kind < 0.64:                                        # manacles, a pair joined by links
            for s_ in (-1, 1):
                ring = [(x + s_ * 0.12 + math.cos(2 * math.pi * q / 12) * 0.07, y + math.sin(2 * math.pi * q / 12) * 0.07, z + 0.02) for q in range(13)]
                P.tube("rl_mn%d_%d" % (i, s_), ring, [0.016] * 13, "iron", 4)
            P.tube("rl_ml%d" % i, [(x - 0.05, y, z + 0.02), (x + 0.05, y, z + 0.02)], [0.012, 0.012], "iron", 4)
        elif kind < 0.74:                                        # a spearhead on a broken shaft
            ln = rnd.uniform(0.5, 1.4)
            P.tube("rl_sp%d" % i, [(x, y, z), (x + cb * ln, y + sb * ln, z + 0.02)], [0.025, 0.022], "wood", 4)
            P.tube("rl_sph%d" % i, [(x + cb * ln, y + sb * ln, z + 0.02), (x + cb * (ln + 0.3), y + sb * (ln + 0.3), z + 0.02)], [0.04, 0.004], "iron", 4)
        elif kind < 0.88:                                        # an iron candlestick, standing or fallen, wax on it
            if rnd.random() < 0.5:
                P.tube("rl_cs%d" % i, [(x, y, f), (x, y, f + 0.7)], [0.06, 0.025], "iron", 6)
                P.sphere("rl_cc%d" % i, (x, y, f + 0.72), 0.08, "iron", scale=(1, 1, 0.4))
                P.tube("rl_cw%d" % i, [(x, y, f + 0.74), (x, y, f + 0.82)], [0.03, 0.025], "bone", 5)
            else:
                P.tube("rl_cs%d" % i, [(x, y, z + 0.05), (x + cb * 0.7, y + sb * 0.7, z + 0.03)], [0.06, 0.025], "iron", 6)
        elif kind < 0.94:                                        # a hanging cage, fallen, its bars bent
            for q in range(8):
                a = 2 * math.pi * q / 8
                P.tube("rl_cg%d_%d" % (i, q), [(x + math.cos(a) * 0.35, y + math.sin(a) * 0.35, f), (x + math.cos(a) * 0.3, y + math.sin(a) * 0.3, f + 0.9 + rnd.uniform(-0.1, 0.1)),
                                               (x, y, f + 1.15)], [0.02, 0.02, 0.02], "iron", 4)
            ring = [(x + math.cos(2 * math.pi * q / 16) * 0.35, y + math.sin(2 * math.pi * q / 16) * 0.35, f + 0.02) for q in range(17)]
            P.tube("rl_cgr%d" % i, ring, [0.025] * 17, "rust", 4)
        else:                                                    # a lantern, its glass long gone
            P.box("rl_ln%d" % i, (x - 0.1, y - 0.1, f), (x + 0.1, y + 0.1, f + 0.28), "iron", rot_z=b)
            P.tube("rl_lh%d" % i, [(x - 0.07, y, f + 0.28), (x, y, f + 0.4), (x + 0.07, y, f + 0.28)], [0.012, 0.012, 0.012], "iron", 4)


def void_mirror_face():
    """the hall has no door (Derek: "Give the room no exit. There will be a large mirror the player looks in in a large
    face, it reflects nothing but darkness"): a great face rising out of the floor to its chin, its open mouth a great
    dark mirror at a standing pilgrim's height. Two wisp candles stand before it where any mirror would show them; it
    shows nothing, and no pilgrim"""
    x, y, nx, ny = hall_spot(VOID_TH, 0.93)
    H = 6.0
    f = FLOOR_HALL
    cz = f + 1.75 + 0.36 * 0.5 * H
    CUTS.append((x, y, nx, ny, 0.55 * H, f - 2.0, cz + 0.6 * H))
    relief("voidface", (x, y, cz), (nx, ny), H, "mirrormouth", 5151, "carved", 0.5, back=0.7, nu=48, nv=56)
    mc = (x + nx * 0.25, y + ny * 0.25, cz - 0.36 * 0.5 * H)
    tx, ty = -ny, nx
    n = 40
    r = 1.05
    verts = [(mc[0], mc[1], mc[2])]
    for i in range(n):
        a = 2 * math.pi * i / n
        verts.append((mc[0] + tx * math.cos(a) * r, mc[1] + ty * math.cos(a) * r, mc[2] + math.sin(a) * r * 0.92))
    P.poly("voidmirror", verts, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)], "voidmirror")
    ring = [(mc[0] + tx * math.cos(2 * math.pi * i / 48) * (r + 0.06) + nx * 0.03, mc[1] + ty * math.cos(2 * math.pi * i / 48) * (r + 0.06) + ny * 0.03,
             mc[2] + math.sin(2 * math.pi * i / 48) * (r + 0.06) * 0.92) for i in range(49)]
    P.tube("voidring", ring, [0.07] * 49, "iron", 6)
    # two wisp candles on iron stands before it, where any mirror would hold them
    for side in (-1, 1):
        sx_, sy_ = mc[0] + nx * 1.6 + tx * side * 1.1, mc[1] + ny * 1.6 + ty * side * 1.1
        P.tube("vstand%d" % side, [(sx_, sy_, f), (sx_, sy_, f + 1.15)], [0.06, 0.03], "iron", 6)
        P.sphere("vpan%d" % side, (sx_, sy_, f + 1.17), 0.09, "iron", scale=(1, 1, 0.4))
        P.cylinder("vwax%d" % side, (sx_, sy_, f + 1.18), 0.05, 0.12, "bone", sides=6)
        flame("vcandle%d" % side, sx_, sy_, f + 1.32, 0.08, 34.0)


VOID_TH = math.radians(264.0)          # where the void mirror's face is cut in the hall's back wall
STAIR_FACES = ((-8.2, "closed", 3.2), (-12.9, "eyeless", 3.4), (-17.9, "plain", 3.6))   # y, kind, height (yards)


def build(root, material):
    P.init(root, material)
    WORN.append((-2.4, -5.0, -2.4, -20.5, 1.0))                                     # up the cave's stairs
    # the great faces of the stairs first: the wall's columns are cut back where they stand
    wx = STAIR[0] - 0.05
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        f = floor_at(STAIR[0] + 0.4, y) or 0.0
        cz = f + 0.35 + 0.575 * H
        CUTS.append((wx, y, 1.0, 0.0, 0.62 * H, f - 2.0, cz + 0.6 * H))
    fx, fy, fnx, fny = _face_span()
    CUTS.append((fx, fy, fnx, fny, 0.55 * 8.0, -2.0, FLOOR_HALL + 9.0))
    columns()
    fallen_drums()
    gravel()
    roof()
    pool()
    pool_dead()
    pool_bodies()
    ooze_faces()
    clots()
    # the pool's own red glow, low over the blood (the one red light allowed); past it, only the wisp-fires
    # low in the basin, so the stumps round it take the glow and the walls beyond stay the wisp-fire's (Derek: "The
    # only light after the pool comes from the wisp fire torches")
    LAMPS.append((BASIN[0], BASIN[1], -0.06, 85.0, RED))
    LAMPS.append((BASIN[0] - 1.5, BASIN[1] + 0.9, -0.08, 38.0, RED))
    LAMPS.append((BASIN[0] + 1.2, BASIN[1] - 1.1, -0.08, 38.0, RED))
    # the stair faces, each raked by a wisp-fire beside it (chapter 12: carved to move in firelight)
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        f = floor_at(STAIR[0] + 0.4, y) or 0.0
        cz = f + 0.35 + 0.575 * H
        relief("sface%d" % i, (wx + 0.25, y, cz), FACE_TURN, H, kind, 50 + i, "basalt", 0.6 if i else 0.85, back=0.9)
        offerings(wx + 0.5, y, f, 100 + i)
    # each face raked by its own fire from its up-stair side, at the brow's height: the nose throws its shadow over the
    # cheek, a socket half black (chapter 12: carved to be seen in moving light)
    f = floor_at(STAIR[0] + 0.4, -6.4) or 0.0
    torch("torch0", wx + 0.15, -6.0, f + 2.2, 1.0, 0.0, 120.0)
    for i, (y, kind, H) in enumerate(STAIR_FACES):
        fz = (floor_at(STAIR[0] + 0.4, y) or 0.0) + 0.35 + 0.575 * H
        torch("torch%d" % (i + 1), wx + 0.35, y + 0.3, fz + 0.64 * H, FACE_TURN[0], FACE_TURN[1], 140.0)   # above its head
    f = floor_at(STAIR[0] + 0.4, -15.2) or 0.0
    skeleton(wx + 0.3, -15.2, f + 1.5, 1.0, 0.0)
    stairs_cut()
    hall_floor()
    hall_walls()
    pillars()
    # the dark mirrors, a wisp candle before each
    th0, th1 = math.radians(150), math.radians(300)
    for k in MIRROR_SEGS:
        tm = th0 + (th1 - th0) * (k + 0.5) / 40
        x, y, nx, ny = hall_spot(tm, 0.99)
        c = (x + nx * 0.05, y + ny * 0.05, FLOOR_HALL + 2.5)
        mirror("mirror%d" % k, c, (nx, ny), 1.0, k)
        candle_before("mcandle%d" % k, c, (nx, ny), FLOOR_HALL, 16.0)
    # two dim torches far round the hall, so its edges are found, not lit
    for i, th in enumerate((math.radians(160), math.radians(290))):
        x, y, nx, ny = hall_spot(th, 0.975)
        torch("htorch%d" % i, x, y, FLOOR_HALL + 2.2, nx, ny, 28.0)
    for k, th in enumerate([math.radians(155 + 9 * q) for q in range(16)]):
        x, y, nx, ny = hall_spot(th, 0.985)
        if math.hypot(x - fx, y - fy) < 4.8:
            continue
        if k % 4 == 1:
            rags(400 + k, x, y, FLOOR_HALL + CARVE_H - 0.2, nx, ny)
        if k % 5 == 3:
            niche(500 + k, x + nx * 0.02, y + ny * 0.02, FLOOR_HALL + 1.0, nx, ny)
    throne()
    relics()
