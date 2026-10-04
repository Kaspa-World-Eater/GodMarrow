"""The parts kit: the costume pieces that were written from scratch for the Hemomancer, as functions.

Each function returns a list of shape dicts (or, for rivets, a rule dict) in the ``.shapes.json`` language of
:mod:`pixelforge.shapes`, placed in file units around the 120-unit author pose unless told otherwise, so the next
character reuses them instead of copying 170 entries by hand: chains (links alternating face-on and edge-on, so a
row of ovals reads as a chain), spike rings and rows, rivet rows, a plank skirt split per leg (the front planks ride
each thigh with ``upright_from`` the hips, the back planks the hips), spiked greaves with a knee cop, shackles with a
broken chain, locs that follow the mantle, a back cape kept to a strip. ``shapes draft`` calls them from the nouns of
a describe line (``chains``, ``spikes``, ``rivets``, ``plank skirt``, ``greaves``, ``shackles``, ``locs``, ``cape``);
``docs/concepts/hemomancer/shapes/make_hemomancer_shapes.py`` is the worked example that builds a whole character
from them.

Conventions: ``cx`` is the body axis; ``X(v)`` mirrors an x for the right side; a ``side`` is ``"L"`` or ``"R"`` (the
character's left is +x); ``bind`` carries ``bone`` or ``part`` (and anything else every shape should get); ``px``
ranges mark the large-size-only detail (fingers, rivets, specks) and the small-size twins.
"""
from __future__ import annotations

import math
import random

LARGE = [90, None]        # the size variants: detail that exists from 90 px of figure height up
SMALL = [None, 90]


def mirror(cx: float, sg: int):
    """``X(v)``: v for the left side, its mirror about ``cx`` for the right."""
    return lambda v: cx + sg * (v - cx)


def on_ellipse(cx: float, rx: float, rz: float, deg: float, cz: float = 0.0) -> tuple[float, float]:
    """A point round the body axis: angle 0 is straight ahead (+z), 90 the character's left (+x)."""
    a = math.radians(deg)
    return cx + rx * math.sin(a), cz + rz * math.cos(a)


# ---------------------------------------------------------------------------------------------- chains and rivets
def chain(name: str, points: list, *, step: float = 2.0, material: str = "chain", link=(1.5, 0.95, 0.55), thin=(1.5, 0.5, 0.9), **bind) -> list[dict]:
    """Links along a polyline: alternating face-on and edge-on ovals ``step`` units apart, so it reads as a chain. A
    run that goes more across than down lays its links across; a hanging run lays them down. Face-on links are a
    tone up, edge-on a tone down. ``bind``: the bone or part the chain rides."""
    out = []
    k = 0
    for (ax, ay, az), (bx, by, bz) in zip(points, points[1:]):
        L = math.dist((ax, ay, az), (bx, by, bz)); n = max(1, int(L / step))
        horiz = abs(bx - ax) > abs(by - ay)
        for i in range(n):
            f = i / n; c = [ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f]
            big = list(link) if horiz else [link[1], link[0], link[2]]
            edge = list(thin) if horiz else [thin[1], thin[0], thin[2]]
            out.append(dict(name=f"{name}{k}", kind="ellipsoid", centre=c, radii=big if k % 2 == 0 else edge, material=material, t=1 if k % 2 == 0 else -1, **bind))
            k += 1
    return out


def chain_loop(name: str, cx: float, y: float, *, rx: float, rz: float, cz: float = 0.0, deg0: float, deg1: float, sag: float = 9.0, bulge: float = 1.4,
               points: int = 9, material: str = "chain", **bind) -> list[dict]:
    """A loop of chain hanging between two angles round the body (a belt chain's swag): the path sags ``sag`` units
    at its middle and bulges ``bulge`` out from the body."""
    pts = []
    a0, a1 = math.radians(deg0), math.radians(deg1)
    for i in range(points):
        f = i / (points - 1); a = a0 + (a1 - a0) * f
        pts.append([cx + rx * math.sin(a), y + sag * math.sin(math.pi * f), cz + rz * math.cos(a) + bulge * math.sin(math.pi * f)])
    return chain(name, pts, material=material, **bind)


def rivet_row(*, every: int = 3, which: int = 0, y: float | None = None, dy: tuple | None = None, z_from: float | None = None, px=LARGE) -> dict:
    """A rule that puts a rivet (a highlight pixel with a shadow under it) every ``every`` units of x along a row: at
    file ``y`` (a one-unit band round it), or ``dy`` [d0, d1] from the shape's centre, from ``z_from`` toward the
    viewer (so the back of a plate has none). Large size only by default."""
    rule: dict = {}
    if y is not None:
        rule["y"] = [y - 0.5, y + 0.5]
    if dy is not None:
        rule["dy"] = list(dy)
    rule["every_x"] = [every, which]
    if z_from is not None:
        rule["z"] = [z_from, None]
    rule["rivet"] = True
    if px:
        rule["px"] = list(px)
    return rule


# ---------------------------------------------------------------------------------------------- spikes
def spike_ring(name: str, cx: float, y: float, cz: float, r0: float, spikes: list, *, material: str = "rustiron", bone: str = "head",
               radii=(0.75, 0.3), radii_small=(1.0, 0.55)) -> list[dict]:
    """Spikes out from a band round the head (a crown): ``spikes`` is ``[(deg, length, rise), ...]``, each a capsule
    from radius ``r0`` outward, lifting ``rise`` units toward the tip. Every spike has a thicker small-size twin
    (``<name>_s``) so the crown reads at 76 px."""
    out = []
    for i, (deg, length, rise) in enumerate(spikes):
        a = math.radians(deg)
        p0 = [cx + r0 * math.sin(a), y, cz + r0 * math.cos(a)]
        p1 = [cx + (r0 + length) * math.sin(a), y - rise, cz + (r0 + length) * math.cos(a)]
        out.append(dict(name=f"{name}{i}", kind="capsule", a=p0, b=p1, r=list(radii), material=material, bone=bone, px=LARGE))
        out.append(dict(name=f"{name}{i}_s", kind="capsule", a=p0, b=p1, r=list(radii_small), material=material, bone=bone, px=SMALL))
    return out


def upright_spikes(name: str, cx: float, cz: float, y0: float, spikes: list, *, r_in=(6.4, 6.6), r_out=(7.6, 7.8), material: str = "rustiron",
                   bone: str = "head", radii=(0.7, 0.28), radii_small=(0.95, 0.5)) -> list[dict]:
    """Spikes standing up from a crown band and leaning out: ``spikes`` is ``[(deg, top_y), ...]``; each rises from
    radius ``r_in`` at ``y0`` to radius ``r_out`` at ``top_y``. With small-size twins."""
    out = []
    for i, (deg, top) in enumerate(spikes):
        a = math.radians(deg)
        p0 = [cx + r_in[0] * math.sin(a), y0, cz + r_in[1] * math.cos(a)]
        p1 = [cx + r_out[0] * math.sin(a), top, cz + r_out[1] * math.cos(a)]
        out.append(dict(name=f"{name}{i}", kind="capsule", a=p0, b=p1, r=list(radii), material=material, bone=bone, px=LARGE))
        out.append(dict(name=f"{name}{i}_s", kind="capsule", a=p0, b=p1, r=list(radii_small), material=material, bone=bone, px=SMALL))
    return out


def spike_row(name: str, spikes: list, *, material: str = "rustiron", rules=None, **bind) -> list[dict]:
    """A row of spikes as capsules: ``spikes`` is ``[(a, b, r), ...]`` (``r`` a number or ``[r_base, r_tip]``).
    ``rules``: a list for every spike, or a function of the spike's index (a different wear seed each)."""
    out = []
    for k, (a, b, r) in enumerate(spikes):
        rl = rules(k) if callable(rules) else rules
        s = dict(name=f"{name}{k}", kind="capsule", a=list(a), b=list(b), r=r, material=material, **bind)
        if rl:
            s["rules"] = rl
        out.append(s)
    return out


# ---------------------------------------------------------------------------------------------- the plank skirt
def plank_skirt(name: str, cx: float, belt_y: float, degs: list, *, radius: float = 12.2, about_z: float = -0.6, tilt: float = 4.0, half_w: float = 2.5,
                depth: float = 0.95, round_: float = 0.4, material: str = "plank", heights=(17.0, 20.5), rnd: random.Random | None = None,
                parts=("planks_L", "planks_R", "planks_back"), front_until: float = 100.0, rules=None, tones=(-1, 0, 0, 1)) -> list[dict]:
    """Planks hanging from a belt round the hips, one box per angle in ``degs`` (0 = front, +90 = the character's
    left), each turned to face out and tilted ``tilt`` degrees. The planks over the left and right legs (within
    ``front_until`` degrees of the front) go to ``parts[0]`` and ``parts[1]``, the back planks to ``parts[2]``, so
    with the matching ``parts`` entry (:func:`plank_skirt_parts`) each leg carries its own planks through a walk and
    the thighs never come through them. Plank heights are drawn from ``heights`` (``rnd``) or fixed; ``rules(i, h,
    seed)`` gives each plank its wear."""
    out = []
    lo, hi = heights if isinstance(heights, (tuple, list)) else (heights, heights)
    for i, deg in enumerate(degs):
        h = rnd.uniform(lo, hi) if rnd is not None and lo != hi else float(lo)
        seed = 50 + i
        part = parts[0] if 0 < deg <= front_until else parts[1] if -front_until <= deg < 0 else parts[2]
        t = rnd.choice(list(tones)) if rnd is not None else 0
        s = dict(name=f"{name}{i}", kind="box", centre=[cx, belt_y + h, radius], half=[half_w, h, depth], round=round_, material=material, part=part,
                 t=t, rotate={"x": tilt, "y": deg, "about": [cx, belt_y, about_z]})
        rl = rules(i, h, seed) if rules else [{"dy": [None, -h + 1.5], "t": 1}, {"dy": [h - 2.0, None], "t": -1}, {"hash": [0.05, seed, 2], "t": -3, "px": LARGE}]
        if rl:
            s["rules"] = rl
        out.append(s)
    return out


def plank_skirt_parts(parts=("planks_L", "planks_R", "planks_back"), *, lag_front=None, lag_back=None, hang_front: float = 0.3, hang_back: float = 0.4,
                      upright_from: str = "hips") -> dict:
    """The ``parts`` entries a plank skirt needs: the front planks on each thigh, hanging from the belt
    (``upright_from`` the hips, so a raised knee does not lay them flat), the back planks on the hips."""
    return {
        parts[0]: {"bone": "thigh.L", "lag": lag_front or {"frames": 1, "sway": 0.3}, "hang": hang_front, "upright_from": upright_from},
        parts[1]: {"bone": "thigh.R", "lag": lag_front or {"frames": 1, "sway": 0.3}, "hang": hang_front, "upright_from": upright_from},
        parts[2]: {"bone": "hips", "lag": lag_back or {"frames": 1, "sway": 0.5}, "hang": hang_back},
    }


# ---------------------------------------------------------------------------------------------- iron on the legs and wrists
def greave(side: str, cx: float, *, leg_x: float = 75.04, top: float = 101.0, bottom: float = 124.0, z: float = 3.6, half_w: float = 4.6, depth: float = 1.5,
           round_: float = 0.8, knee_y: float = 98.6, material: str = "rustiron", spikes: bool = True, knee_cop: bool = True, rivets: bool = True,
           wear_seed: int = 81, spike_rows: list | None = None) -> list[dict]:
    """A rusted iron greave on one shin: a riveted plate (lames every 4 units, a highlight along the top, rivet rows
    at the top and bottom), a knee cop, and with ``spikes`` a knee spike up and out, a row of spikes out the outer
    side, two forward and a short one on the inner edge (``spike_rows`` replaces that list: ``[(a, b, r), ...]`` for
    the left side, mirrored for the right). ``leg_x`` is the left shin's x; the right is mirrored about ``cx``."""
    sg = 1 if side == "L" else -1
    X = mirror(cx, sg)
    bone = f"shin.{side}"
    mid = (top + bottom) / 2; half_h = (bottom - top) / 2
    rules = [{"every_y": [4, 0], "t": -1}, {"dy": [None, -half_h + 1.5], "t": 1}, {"hash": [0.08, wear_seed, 2], "t": -2}]
    if rivets:
        rules += [rivet_row(y=top + 2, every=3, which=0, z_from=z - 0.6), rivet_row(y=bottom - 2, every=3, which=1, z_from=z - 0.6)]
    out = [dict(name=f"greave.{side}", kind="box", centre=[X(leg_x), mid, z], half=[half_w, half_h, depth], round=round_, material=material, bone=bone, rules=rules)]
    if knee_cop:
        out.append(dict(name=f"kneecop.{side}", kind="ellipsoid", centre=[X(leg_x), knee_y, z - 0.2], radii=[5.0, 4.0, 3.2], material=material, bone=bone,
                        rules=[{"dy": [None, -1.5], "t": 1}, {"every_y": [2, 0], "t": -1}]))
    if spikes:
        rows = spike_rows if spike_rows is not None else [
            ([leg_x + 1.46, knee_y - 0.6, z + 2.0], [leg_x + 5.46, knee_y - 4.6, z + 6.9], [1.3, 0.25]),      # the knee spike, up and out
            ([leg_x + 3.96, top + 3, z - 0.1], [leg_x + 10.46, top + 0.5, z + 1.9], [1.0, 0.2]),             # a row out the outer side
            ([leg_x + 3.96, top + 9, z - 0.1], [leg_x + 10.96, top + 7, z + 1.9], [1.0, 0.2]),
            ([leg_x + 3.96, top + 15, z - 0.1], [leg_x + 10.46, top + 13.5, z + 1.4], [1.0, 0.2]),
            ([leg_x + 3.96, top + 21, z - 0.6], [leg_x + 8.96, top + 20, z + 0.9], [0.9, 0.2]),
            ([leg_x - 1.04, top + 6, z + 1.4], [leg_x - 2.04, top + 3, z + 5.9], [0.9, 0.2]),                # two forward
            ([leg_x - 1.04, top + 16, z + 1.4], [leg_x - 2.04, top + 13, z + 5.4], [0.9, 0.2]),
            ([leg_x - 3.44, top + 8, z - 0.1], [leg_x - 4.64, top + 6.5, z + 2.4], [0.7, 0.2])]              # a short one on the inner edge
        mirrored = [([X(a[0]), a[1], a[2]], [X(b[0]), b[1], b[2]], r) for a, b, r in rows]
        out += spike_row(f"legspike", mirrored, material=material, bone=bone, rules=lambda k: [{"hash": [0.3, 90 + k, 1], "t": 1}])
        for s in out[-len(rows):]:
            s["name"] = s["name"] + f".{side}"
    return out


def thigh_plate(side: str, cx: float, *, leg_x: float = 75.04, y: float = 86.0, z: float = 4.0, half=(4.4, 8.0, 1.0), material: str = "rustiron",
                spike: bool = True, rivets: bool = True) -> list[dict]:
    """An iron plate on the front of one thigh (lames, a dark lower edge, a rivet row near the top) with a spike out
    the side; it rides the thigh bone rigidly (a plate, not a hanging thing)."""
    sg = 1 if side == "L" else -1
    X = mirror(cx, sg)
    rules = [{"every_y": [4, 1], "t": -1}, {"dy": [half[1] - 1.5, None], "t": -2}]
    if rivets:
        rules.append(rivet_row(dy=(-half[1] + 1, -half[1] + 2), every=3, which=0))
    out = [dict(name=f"thighplate.{side}", kind="box", centre=[X(leg_x), y, z], half=list(half), round=0.6, material=material, bone=f"thigh.{side}", rules=rules)]
    if spike:
        out.append(dict(name=f"thighspike.{side}", kind="capsule", a=[X(leg_x + 3.46), y - 2, z + 0.2], b=[X(leg_x + 6.96), y - 3, z + 3.5], r=[0.8, 0.2],
                        material=material, bone=f"thigh.{side}"))
    return out


def shackle(side: str, cx: float, *, wrist=(89.3, 70.2, -1.0), radii=(4.3, 1.7, 4.0), material: str = "rustiron", chain_points: list | None = None,
            chain_material: str = "chain", rivets: bool = True) -> list[dict]:
    """An iron shackle round one wrist (a flat ring with a highlight on top and a rivet row facing out) and a broken
    length of chain hanging from it (``chain_points``: the left wrist's path, mirrored for the right; three links of
    a hang by default). Both ride the forearm."""
    sg = 1 if side == "L" else -1
    X = mirror(cx, sg)
    bone = f"forearm.{side}"
    rules = [{"dy": [None, -0.6], "t": 1}]
    if rivets:
        rules.append(rivet_row(every=3, which=0, z_from=2.5))
    out = [dict(name=f"shackle.{side}", kind="ellipsoid", centre=[X(wrist[0]), wrist[1], wrist[2]], radii=list(radii), material=material, bone=bone, rules=rules)]
    pts = chain_points if chain_points is not None else [[wrist[0] + 4.1, wrist[1] + 1.3, 0.5], [wrist[0] + 5.1, wrist[1] + 7.8, 1.5], [wrist[0] + 4.7, wrist[1] + 15.8, 2.0]]
    out += chain(f"wristchain{side}_", [[X(p[0]), p[1], p[2]] for p in pts], material=chain_material, bone=bone)
    return out


# ---------------------------------------------------------------------------------------------- hair and cloth
def locs(name: str, cx: float, *, head_y: float = 21.0, back_degs=(115, 135, 152, 168, 180, 192, 208, 225, 245), front_degs=(62, 80, 98, -62, -80, -98),
         back_end=(58.0, -3.0, 7.0), front_end=(52.0, 0.0, 8.0), material: str = "locs", rnd: random.Random | None = None,
         parts=("locs", "locs_front")) -> list[dict]:
    """Locs as strands of two capsules each: the back strands leave the head at ``back_degs`` round the skull, bend
    out over the shoulders and mantle at the shoulder line and hang to about ``back_end`` (a y plus a random spread
    from ``rnd``); the front strands fall in front of the shoulders to ``front_end``. The back strands make one part
    (``parts[0]``), the front ones another, so each hangs from the chest and swings after it (see
    :func:`locs_parts`)."""
    out = []
    for i, deg in enumerate(back_degs):
        x0, z0 = on_ellipse(cx, 6.4, 6.8, deg, -1.0)
        x1, z1 = on_ellipse(cx, 10.6, 10.0, deg + (deg - 180) * 0.15, -0.6)
        x2, z2 = on_ellipse(cx, 10.4, 12.2, deg + (deg - 180) * 0.25, -0.4)
        y2 = back_end[0] + (rnd.uniform(back_end[1], back_end[2]) if rnd is not None else 0.0)
        for j, (pa, pb) in enumerate([([x0, head_y, z0], [x1, 34, z1]), ([x1, 34, z1], [x2, y2, z2])]):
            out.append(dict(name=f"{name}_b{i}_{j}", kind="capsule", a=pa, b=pb, r=[1.15, 0.95] if j == 0 else [0.95, 0.7], material=material, part=parts[0],
                            rules=[{"every_y": [3, i % 3], "t": -1}, {"dz": [None, -0.4], "t": -1}]))
    for i, deg in enumerate(front_degs):
        x0, z0 = on_ellipse(cx, 6.2, 6.6, deg, -0.6)
        side = 1 if deg > 0 else -1
        xe = cx + side * (4.6 + (abs(deg) - 62) * 0.12)
        out.append(dict(name=f"{name}_f{i}_0", kind="capsule", a=[x0, head_y, z0], b=[xe + side * 2.2, 31, 9.2], r=[1.1, 0.95], material=material, part=parts[1],
                        rules=[{"every_y": [3, i % 3], "t": -1}]))
        y1 = front_end[0] + (rnd.uniform(front_end[1], front_end[2]) if rnd is not None else 0.0)
        out.append(dict(name=f"{name}_f{i}_1", kind="capsule", a=[xe + side * 2.2, 31, 9.2], b=[xe, y1, 12.4], r=[0.95, 0.65], material=material, part=parts[1],
                        rules=[{"every_y": [3, (i + 1) % 3], "t": -1}]))
    return out


def locs_parts(parts=("locs", "locs_front"), bone: str = "spine.003") -> dict:
    return {parts[0]: {"bone": bone, "lag": {"frames": 2, "sway": 0.5}, "hang": 0.5},
            parts[1]: {"bone": bone, "lag": {"frames": 1, "sway": 0.4}, "hang": 0.6}}


def back_cape(name: str = "cape", *, y=(32, 122), rx=(10.0, 0.07), rz=(9.2, 0.095), thickness: float = 1.6, strip: float = 0.7216,
              hem=None, material: str = "mantle", part: str = "cape", bump=None, rules=None, holes=None) -> dict:
    """A cape as a ring kept to a strip down the back (``strip`` = the half-width in radians; 0.72 is a narrow cape,
    1.4 a wide one), with a ragged hem and folds (and ``holes`` ``{"p", "band", "seed"}`` for a torn one). Give its
    part ``hang`` 0.3 and a lag so it swings after the chest (:func:`cape_parts`)."""
    out = dict(name=name, kind="ring", y=list(y), rx=list(rx), rz=list(rz), thickness=thickness, keep={"back_strip": strip},
               hem=hem or {"tongues": 7, "depth": 9, "seed": 6}, material=material, part=part, bump=bump or {"folds": [0.5, 6, 1.5]},
               rules=rules or [{"every_angle": [11, 0], "t": -1}, {"hem_band": [0, 4], "t": -1}])
    if holes:
        out["holes"] = holes
    return out


def cape_parts(part: str = "cape", bone: str = "spine.003") -> dict:
    return {part: {"bone": bone, "lag": {"frames": 2, "sway": 0.7}, "hang": 0.3}}


def chest_chain(name: str = "chestchain", points: list | None = None, *, shoulder=(81, 36.5, 13.0), hip=(60, 61, 15.0), bow: float = 1.5,
                material: str = "chain", bone: str = "spine.002", link=(1.8, 1.15, 0.65), thin=(1.8, 0.6, 1.0)) -> list[dict]:
    """A chain across the chest from one shoulder to the other hip, in front of the mantle, the locs and a tabard
    (``z`` 13-15.5 at 120 units; lower z hid it under the Hemomancer's locs facing south). ``points`` gives the path
    outright; without it the chain bows ``bow`` units out from the straight line between ``shoulder`` and ``hip``."""
    if points is None:
        mid = [(shoulder[k] + hip[k]) / 2 for k in range(3)]
        points = [list(shoulder), [mid[0], mid[1], mid[2] + bow], list(hip)]
    return chain(name, points, material=material, bone=bone, link=link, thin=thin)
