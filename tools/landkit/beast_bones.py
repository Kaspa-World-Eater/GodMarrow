"""The bones of the Wood's horned beasts (landkit), for the Blind Face (Derek 2026-10-07: "scatter some bones across the
ground"). The game has no animals, and the lore never names what these were: on the Burnt Heath "seven great horned
carcasses lie in a ring facing the same way". The Hollow Wood's hunter: "You can tell how long a thing's been dead in
the Wood by which way it's lying. Fresh, it lies any way it fell. A day on, it lies with its head toward the ring ...
The ground takes them the way a sleeper pulls the blanket up." So each beast's remains lie with the skull toward the
north (where every trunk bends, the Root Deep), more truly the older they are; the older, the deeper the ground has
taken them and the further its small bones have gone.

Built from the shared ray-cast bone (bone.py: its tube and skull, its weathered surface), as true forms:
- the SKULL with two HORNS sweeping back and out from the brow, ridged and tapering;
- the SPINE as a chain of vertebrae, short knobbed tubes, curving as it settled;
- RIBS, collapsed flat either side of it, bowed;
- LONG BONES (the limbs), knobbed at both heads, some fallen apart from the rest.

  beast(origin, north, ground, age, size, seed) -> shapes for bone.draw
      ground(x, y) -> the ground's height there; age 0 fresh .. 1 long dead
"""
import numpy as np
import bone as bonegen


def _tube(pts, r0, r1, knob=True, seed=1):
    pts = np.array(pts, float)
    n = len(pts)
    s = np.linspace(0, 1, n)
    head = 1 + (0.6 * (np.exp(-(s / 0.08) ** 2) + np.exp(-((1 - s) / 0.08) ** 2)) if knob else 0)
    rad = (r0 * (1 - s) + r1 * s) * head
    d = pts[-1] - pts[0]
    side = np.cross(d, [0, 0, 1.0])
    side = side / (np.linalg.norm(side) + 1e-9) if np.linalg.norm(side) > 1e-6 else np.array([1.0, 0, 0])
    return dict(kind="tube", pts=pts, ra=rad, rb=rad * 0.85, side=side, seed=seed, brk=[2.0, 2.0])


def beast(origin, north, ground, age=0.5, size=1.0, seed=1):
    rr = np.random.default_rng(seed)
    o = np.array(origin, float)
    nv = np.array(north, float) / np.linalg.norm(north)
    jit = rr.normal(0, 0.9 * (1 - age) + 0.08)                   # the fresh lie any way; the old point true north
    ax = np.array([nv[0] * np.cos(jit) - nv[1] * np.sin(jit), nv[0] * np.sin(jit) + nv[1] * np.cos(jit)])
    pp = np.array([-ax[1], ax[0]])
    sink = 0.25 + age * 0.55                                     # how far the ground has taken it (of each bone's radius)

    def at(p, r):
        return np.array([p[0], p[1], ground(p[0], p[1]) + r * (1 - sink)])

    shapes = []
    S = size
    # the skull, its face down toward the ground and forward toward the north, the horns sweeping back
    sk = o + ax * 0.75 * S
    sz = 0.21 * S
    c = at(sk, sz * 0.7)
    shapes.append(bonegen.skull(c, sz, (ax[0], ax[1], -0.35), seed=seed + 1))
    # the long face of a beast, not a man: the muzzle runs out forward, narrowing to the snout
    mz = [at(sk + ax * (sz * 0.5 + f * 0.34 * S), (0.065 - f * 0.03) * S) for f in np.linspace(0, 1, 8)]
    shapes.append(_tube(mz, 0.07 * S, 0.035 * S, knob=False, seed=seed + 5))
    for sgn in (-1, 1):
        base = c + np.array([pp[0] * sgn * sz * 0.55 - ax[0] * sz * 0.2, pp[1] * sgn * sz * 0.55 - ax[1] * sz * 0.2, sz * 0.35])
        L = rr.uniform(0.38, 0.5) * S
        pts = []
        for k in range(16):
            f = k / 15
            sweep = pp * sgn * f * L * 0.95 - ax * f * L * 0.18           # out wide to either side
            curl = ax * (f ** 2) * L * 0.45                                # the tips curling forward
            q = base[:2] + sweep + curl
            zq = max(base[2] + (f ** 2) * L * 0.3 * (1 - age * 0.6), ground(q[0], q[1]) + 0.03)   # and up
            pts.append((q[0], q[1], zq))
        shapes.append(_tube(pts, 0.065 * S, 0.01 * S, knob=False, seed=seed + 2 + (sgn > 0)))
    # the spine, settled in a gentle curve behind the skull
    bend = rr.uniform(-0.5, 0.5)
    spine = []
    for k in range(7):
        f = k / 6
        q = o + ax * (0.55 - f * 1.2) * S + pp * np.sin(f * 2.2) * bend * 0.25 * S
        spine.append(q)
    for k in range(6):
        if rr.random() < age * 0.35:                             # the small bones go first
            continue
        a, b = spine[k], spine[k] + (spine[k + 1] - spine[k]) * 0.7
        r = 0.035 * S
        shapes.append(_tube([at(a, r), at((a + b) / 2, r), at(b, r)], r, r * 0.9, seed=seed + 10 + k))
    # ribs, collapsed flat either side, bowed
    for k in range(1, 5):
        for sgn in (-1, 1):
            if rr.random() < age * 0.3:
                continue
            a = spine[k]
            L = (0.42 - abs(k - 2.5) * 0.05) * S
            dirv = pp * sgn * 0.85 - ax * 0.35
            pts = []
            for j in range(12):
                f = j / 11
                q = a + dirv * f * L + ax * np.sin(f * np.pi) * 0.08 * S
                pts.append(at(q, 0.02 * S) + np.array([0, 0, np.sin(f * np.pi) * 0.05 * S * (1 - age)]))
            shapes.append(_tube(pts, 0.022 * S, 0.014 * S, knob=False, seed=seed + 20 + k * 2 + (sgn > 0)))
    # the long bones: two lie near where the legs fell, one or two dragged off a little
    for k in range(4):
        L = rr.uniform(0.42, 0.6) * S
        far = 0.3 + (k >= 2) * rr.uniform(0.4, 0.9) * (0.4 + age)
        q0 = o - ax * rr.uniform(0.0, 0.5) * S + pp * rr.choice([-1, 1]) * far * S
        th = rr.uniform(-np.pi, np.pi)
        d = np.array([np.cos(th), np.sin(th)])
        r = 0.04 * S
        pts = [at(q0 + d * L * f, r) for f in np.linspace(0, 1, 8)]
        shapes.append(_tube(pts, r, r * 0.85, seed=seed + 40 + k))
    return shapes
