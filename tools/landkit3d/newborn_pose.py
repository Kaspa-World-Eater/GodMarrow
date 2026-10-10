"""The newborn's motion as key poses on a timing sheet (tools/landkit/passes/the_newborn.md; docs/animation/02-method.md).

Pure Python (no Blender): `pose(clip, t)` returns the body's intent at `t` seconds, which `newborn3d.py` lays on the
Mannequin's rig by analytic IK. The body faces -Y, its left is +X, Z is up, metres; the clips are in place (the game
moves the body), so a planted hand slides back under it at the clip's travel speed.

The intent:
- `hips`: the pelvis (the DEF-hips head) in the world; `pitch` (deg, + tips the trunk forward), `roll` (+ drops the
  left side), `yaw`;
- `spine`: the forward bend of spine.001, .002, .003 (deg, + rounds the back, - arches it); `side`: their side bend;
- `neck`, `head`: forward bend (deg, + hangs the head); `head_turn`;
- `wrist.L/R`, `ankle.L/R`: where the hand and the foot go; `elbow.L/R`, `knee.L/R`: the pole each joint bends toward;
- `hand.L/R`, `foot.L/R`: the direction the hand and the foot point.

What it is thinking (02, section 1): nothing yet. It has a body before it has a self; it moves because the body wants
up out of the warm, and every move costs it.
"""
import math

CLIPS = {
    # clip: (seconds, frames, loop, travel m/s)
    "crawl": (2.6, 16, True, 0.174),     # hands: a stride of 0.3 m over a stance of 0.66 of the cycle
    "slip": (1.8, 12, False, 0.06),
    "retch": (3.2, 20, False, 0.0),
    "rise": (5.6, 32, False, 0.0),
    "idle": (3.2, 8, True, 0.0),
    "walk": (1.9, 12, True, 0.53),       # feet: 0.6 m over a stance of 0.6
}

THIGH, SHIN = 0.40, 0.43
UPPER, FORE = 0.274, 0.273


def lerp(a, b, k):
    return a + (b - a) * k


def ease(k):
    k = min(1.0, max(0.0, k))
    return k * k * (3.0 - 2.0 * k)


def v3(a, b, k):
    return tuple(lerp(a[i], b[i], k) for i in range(3))


def keyed(keys, t):
    """a value from (time, value) keys, eased between them (numbers or 3-tuples)"""
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, a), (t1, b) in zip(keys, keys[1:]):
        if t <= t1:
            k = ease((t - t0) / max(1e-6, t1 - t0))
            return v3(a, b, k) if isinstance(a, tuple) else lerp(a, b, k)
    return keys[-1][1]


# ---------------------------------------------------------------- on all fours

HAND_Y = -0.72      # where a hand plants, ahead of the pelvis
KNEE_Y = 0.02       # where a knee rests, under the hip
HAND_X = 0.17
KNEE_X = 0.12


def fours(t, cyc, stride, v, slack=0.0):
    """the crawl's limbs at time t: contralateral (right hand with left knee), each hand lifting low and each knee
    dragging along the ground, never lifted. `slack` (0..1) sinks everything a little more."""
    out = {}
    lead = {"wrist.R": 0.0, "knee.L": 0.08, "wrist.L": 0.5, "knee.R": 0.58}
    swing = 0.34
    for limb, ph0 in lead.items():
        ph = (t / cyc + ph0) % 1.0
        side = 1.0 if limb.endswith(".L") else -1.0
        hand = limb.startswith("wrist")
        if ph < swing:                         # the swing: forward, from the back of the stride to the front
            k = ease(ph / swing)
            y = lerp(stride / 2, -stride / 2, k)
            lift = (0.05 if hand else 0.0) * math.sin(math.pi * k)
        else:                                  # the stance: planted, sliding back under the body
            k = (ph - swing) / (1.0 - swing)
            y = lerp(-stride / 2, stride / 2, k)
            lift = 0.0
        if hand:
            out[limb] = (side * HAND_X, HAND_Y + y, 0.05 + lift)
            out["plant." + limb] = 0.0 if ph < swing else 1.0
        else:
            ky = KNEE_Y + y
            out["kneept." + limb[-1]] = (side * KNEE_X, ky, 0.055)
    return out


def crawl_body(t, cyc, slack=0.0):
    """the trunk over the four limbs: sagging, rocking side to side toward the planted knee, the head hanging and
    lagging the shoulders (02: the head leads a turn, but a dead weight lags)"""
    w = 2.0 * math.pi * t / cyc
    return {
        "hips": (0.025 * math.sin(w + 0.4), 0.0, 0.47 - 0.015 * math.cos(2 * w) - 0.04 * slack),
        "pitch": 82.0 + 2.0 * math.sin(2 * w),
        "roll": 5.0 * math.sin(w + 0.3),
        "yaw": 4.0 * math.sin(w),
        "spine": (-6.0 + 2 * math.cos(2 * w), -2.0, 8.0 + 3 * math.cos(2 * w - 0.6)),
        "side": (2.0 * math.sin(w), 3.0 * math.sin(w), 3.0 * math.sin(w - 0.5)),
        "neck": 30.0 + 5.0 * math.sin(2 * w - 1.1) + 10 * slack,
        "head": 20.0 + 6.0 * math.sin(2 * w - 1.6),
        "head_turn": 6.0 * math.sin(w - 1.0),
    }


def legs_from_knees(p, extra_drag=0.0):
    """the shins lie back along the ground from the knees, the feet top-down, toes trailing (one foot drags wider)"""
    for s in ("L", "R"):
        k = p.pop("kneept." + s)
        side = 1.0 if s == "L" else -1.0
        p["ankle." + s] = (k[0] + side * (0.04 + (0.05 if s == "R" else 0.0) + extra_drag), k[1] + 0.40, 0.11)
        p["knee." + s] = (k[0] + side * 0.05, k[1] - 0.6, -0.4)         # the knee bends down-forward onto the ground
        p["foot." + s] = (side * 0.15, 0.8, -0.32)
    return p


def arms_poles(p):
    for s in ("L", "R"):
        side = 1.0 if s == "L" else -1.0
        p["elbow." + s] = (side * 0.6, 0.3, 0.6)                           # elbows out and back, the arms bowed
        p["hand." + s] = (side * 0.15, -1.0, -0.25)
    return p


def crawl(t):
    cyc, stride = CLIPS["crawl"][0], 0.3
    p = crawl_body(t, cyc)
    p.update(fours(t, cyc, stride, CLIPS["crawl"][3]))
    return arms_poles(legs_from_knees(p))


def slip(t):
    """the left hand plants, skids forward and out in the blood, the left shoulder and the head drop nearly to the
    stone, and it pushes itself back up. Begins and ends on the crawl's first pose (held limbs)."""
    p = crawl(0.0)
    # 0.0-0.35 the hand slides out; 0.35-0.7 the fall; 0.7-1.1 down, still; 1.1-1.8 back up
    out = keyed([(0.0, 0.0), (0.3, 0.5), (0.55, 1.0), (1.05, 1.0), (1.8, 0.0)], t)
    sink = keyed([(0.0, 0.0), (0.3, 0.2), (0.6, 1.0), (1.1, 0.92), (1.45, 0.4), (1.8, 0.0)], t)
    wl = p["wrist.L"]
    p["wrist.L"] = (wl[0] + 0.22 * out, wl[1] - 0.18 * out, 0.05)
    hx, hy, hz = p["hips"]
    p["hips"] = (hx + 0.03 * sink, hy, hz - 0.03 * sink)
    p["pitch"] += 10.0 * sink
    p["roll"] += 16.0 * sink
    p["neck"] += 18.0 * sink
    p["head"] += 10.0 * sink
    p["elbow.L"] = (0.9, 0.0, 0.4 - 0.3 * sink)
    return p


def retch(t):
    """it stops on all fours. The back arches up (the cat's hump), the belly pulls in, the head drops between the
    arms, and it heaves: three convulsions, the last the one that brings it up (the game throws the gore on the third,
    at RETCH_THROW seconds)."""
    p = crawl(0.0)
    hump = keyed([(0.0, 0.0), (0.5, 0.35), (0.9, 1.0), (1.2, 0.6), (1.45, 1.0), (1.75, 0.55), (2.0, 1.25),
                  (2.3, 0.9), (2.7, 0.3), (3.2, 0.0)], t)
    jolt = keyed([(0.0, 0.0), (0.85, 0.0), (0.95, 1.0), (1.15, 0.0), (1.4, 0.0), (1.5, 1.0), (1.7, 0.0),
                  (1.95, 0.0), (2.05, 1.6), (2.35, 0.3), (3.2, 0.0)], t)
    s1, s2, s3 = p["spine"]
    p["spine"] = (s1 + 14 * hump, s2 + 16 * hump, s3 + 10 * hump)
    hx, hy, hz = p["hips"]
    p["hips"] = (hx, hy + 0.04 * jolt, hz + 0.03 * hump)
    p["pitch"] += 4 * hump
    p["neck"] += 22 * hump + 8 * jolt
    p["head"] += 10 * hump - 14 * jolt                                    # the jaw thrown open and forward
    for s in ("L", "R"):
        w = p["wrist." + s]
        p["wrist." + s] = (w[0], w[1] + 0.03 * jolt, w[2])
    return p


RETCH_THROW = 2.05


def stand_pose(t, breath_cyc=3.2, sway=1.0):
    """standing, hunched: the newborn's idle. The weight in the hips, the head low, the arms hanging off the shoulders
    with the hands half closed; a slow breath and a sway, never still (02: moving holds)."""
    w = 2.0 * math.pi * t / breath_cyc
    p = {
        "hips": (0.02 * sway * math.sin(w * 0.5), 0.0, 0.865 + 0.006 * math.sin(w)),
        "pitch": 10.0 + 1.5 * math.sin(w),
        "roll": 2.5 * sway * math.sin(w * 0.5),
        "yaw": 0.0,
        "spine": (8.0 + 2 * math.sin(w), 8.0 + 2 * math.sin(w), 10.0 + 3 * math.sin(w - 0.4)),
        "side": (1.5 * math.sin(w * 0.5), 1.0, 0.0),
        "neck": 18.0 + 3 * math.sin(w - 0.8),
        "head": 10.0 + 2 * math.sin(w - 1.2),
        "head_turn": 4.0,
    }
    for s in ("L", "R"):
        side = 1.0 if s == "L" else -1.0
        p["wrist." + s] = None                      # the arms hang: newborn3d lets them fall under gravity
        p["ankle." + s] = (side * 0.11 + (0.03 if s == "R" else 0.0), -0.03 + (0.06 if s == "R" else 0.0), 0.10)
        p["knee." + s] = (side * 0.15, -1.0, 0.5)
        p["foot." + s] = (side * 0.25, -1.0, -0.35)
    return p


def idle(t):
    return stand_pose(t)


def walk(t):
    """the hunched walk: short steps, the left foot planted flat, the right dragged, its toe never quite leaving the
    stone; the trunk dips onto the left leg and the head bobs after it."""
    cyc, stride, v = CLIPS["walk"][0], 0.6, CLIPS["walk"][3]
    p = stand_pose(t, sway=0.0)
    w = 2.0 * math.pi * t / cyc
    p["pitch"] = 14.0 + 3 * math.sin(2 * w)
    p["spine"] = (8.0, 8.0, 10.0)
    p["neck"] = 18.0 + 5 * math.sin(2 * w - 1.4)
    p["roll"] = 4.0 * math.sin(w)
    hx, hy, hz = p["hips"]
    p["hips"] = (0.035 * math.sin(w), hy, 0.85 + 0.022 * math.cos(2 * w))
    for s, ph0 in (("L", 0.0), ("R", 0.5)):
        side = 1.0 if s == "L" else -1.0
        ph = (t / cyc + ph0) % 1.0
        swing = 0.4
        if ph < swing:
            k = ease(ph / swing)
            y = lerp(stride / 2, -stride / 2, k)
            lift = (0.09 if s == "L" else 0.025) * math.sin(math.pi * k)
        else:
            k = (ph - swing) / (1 - swing)
            y = lerp(-stride / 2, stride / 2, k)
            lift = 0.0
        p["ankle." + s] = (side * 0.11, y, 0.10 + lift)
        p["foot." + s] = (side * 0.2, -1.0, -0.35 if s == "L" else -0.8)    # the dragged foot points down, toe scraping
        # the arms swing a little, dead, opposite the legs
        p["arm_swing." + s] = 14.0 * math.sin(w + (0 if s == "R" else math.pi))
    return p


def rise(t):
    """it struggles to stand (Derek: "before it struggles to stand up"):
    0.0-1.1  from all fours it sits back onto its heels, the hands dragging back along the stone;
    1.1-2.0  the trunk comes up, kneeling, the hands on the thighs, the head still hanging;
    2.0-2.7  the right foot comes forward and plants, the knee up, the right hand on it;
    2.7-3.4  it pushes: the hips lift, the body shaking
    3.4-3.9  it fails, and drops back onto the left knee, the left hand down on the stone to catch it;
    3.9-5.0  again, slower: up, swaying, the left foot dragged in beside the right;
    5.0-5.6  it stands, and settles into the idle's first pose."""
    a = crawl(0.0)
    st = stand_pose(0.0)
    # the key bodies
    kneel_heels = {"hips": (0.0, 0.18, 0.30), "pitch": 70.0, "spine": (8.0, 10.0, 14.0), "neck": 30.0, "head": 18.0}
    kneel_up = {"hips": (0.0, 0.10, 0.62), "pitch": 22.0, "spine": (8.0, 10.0, 12.0), "neck": 24.0, "head": 14.0}
    proposal = {"hips": (0.0, 0.10, 0.55), "pitch": 34.0, "spine": (10.0, 10.0, 12.0), "neck": 22.0, "head": 12.0}
    push = {"hips": (0.0, 0.0, 0.78), "pitch": 46.0, "spine": (12.0, 12.0, 12.0), "neck": 20.0, "head": 10.0}
    fail = {"hips": (0.04, 0.12, 0.50), "pitch": 40.0, "spine": (14.0, 14.0, 16.0), "neck": 30.0, "head": 16.0}
    up = {"hips": (0.0, 0.0, 0.86), "pitch": 30.0, "spine": (8.0, 8.0, 10.0), "neck": 20.0, "head": 12.0}
    body_a = {k: a[k] for k in ("hips", "pitch", "spine", "neck", "head")}
    body_st = {k: st[k] for k in ("hips", "pitch", "spine", "neck", "head")}
    keys = [(0.0, body_a), (1.1, kneel_heels), (2.0, kneel_up), (2.7, proposal), (3.4, push), (3.9, fail),
            (4.4, proposal), (5.0, up), (5.6, body_st)]
    p = {}
    for k in ("hips", "pitch", "neck", "head"):
        p[k] = keyed([(tt, b[k]) for tt, b in keys], t)
    p["spine"] = keyed([(tt, tuple(b["spine"])) for tt, b in keys], t)
    shake = 0.0
    if 2.8 < t < 3.45 or 4.5 < t < 5.0:
        shake = math.sin(t * 2 * math.pi * 7.0)
    p["roll"] = keyed([(0.0, 0.0), (3.4, 4.0), (3.9, 14.0), (4.4, 6.0), (5.0, 3.0), (5.6, 0.0)], t) + 1.5 * shake
    p["yaw"] = 0.0
    p["side"] = (0.0, 0.0, 0.0)
    p["head_turn"] = keyed([(0.0, 0.0), (3.9, -8.0), (5.6, 4.0)], t)
    hx, hy, hz = p["hips"]
    p["hips"] = (hx, hy, hz + 0.006 * shake)
    # the legs: the left knee stays down until the end; the right foot comes forward at 2.0-2.7
    kl = a["ankle.L"]
    p["ankle.L"] = keyed([(0.0, kl), (1.1, (0.13, 0.48, 0.10)), (4.4, (0.13, 0.48, 0.10)), (5.0, (0.10, 0.12, 0.12)),
                          (5.6, st["ankle.L"])], t)
    p["knee.L"] = keyed([(0.0, a["knee.L"]), (1.1, (0.2, -0.6, -0.4)), (4.4, (0.2, -0.6, -0.4)),
                         (5.0, (0.2, -1.0, 0.3)), (5.6, st["knee.L"])], t)
    p["foot.L"] = keyed([(0.0, a["foot.L"]), (4.4, (0.15, 0.8, -0.58)), (5.0, (0.2, -0.4, -0.9)), (5.6, st["foot.L"])], t)
    p["ankle.R"] = keyed([(0.0, a["ankle.R"]), (1.1, (-0.13, 0.48, 0.10)), (2.0, (-0.13, 0.48, 0.10)),
                          (2.7, (-0.14, -0.30, 0.10)), (3.9, (-0.14, -0.30, 0.10)), (4.4, (-0.14, -0.26, 0.10)),
                          (5.6, st["ankle.R"])], t)
    p["knee.R"] = keyed([(0.0, a["knee.R"]), (1.1, (-0.2, -0.6, -0.4)), (2.0, (-0.2, -0.6, -0.4)),
                         (2.7, (-0.2, -1.0, 0.4)), (5.6, st["knee.R"])], t)
    p["foot.R"] = keyed([(0.0, a["foot.R"]), (2.0, (-0.15, 0.8, -0.58)), (2.7, (-0.2, -1.0, -0.3)),
                         (5.6, st["foot.R"])], t)
    # the hands: dragged back to the thighs, the right onto the right knee, the left down to catch the fall
    p["wrist.L"] = keyed([(0.0, a["wrist.L"]), (1.1, (0.20, -0.25, 0.05)), (2.0, (0.12, -0.20, 0.50)),
                          (3.4, (0.14, -0.22, 0.52)), (3.75, (0.30, -0.35, 0.05)), (4.4, (0.30, -0.32, 0.05)),
                          (5.0, (0.16, -0.18, 0.62)), (5.6, (0.21, -0.14, 0.80))], t)
    p["wrist.R"] = keyed([(0.0, a["wrist.R"]), (1.1, (-0.20, -0.25, 0.05)), (2.0, (-0.12, -0.20, 0.50)),
                          (2.7, (-0.15, -0.36, 0.56)), (4.4, (-0.15, -0.34, 0.54)), (5.0, (-0.16, -0.22, 0.68)),
                          (5.6, (-0.21, -0.14, 0.80))], t)
    for s in ("L", "R"):
        side = 1.0 if s == "L" else -1.0
        p["elbow." + s] = (side * 0.6, 0.4, 0.3)
        p["hand." + s] = (side * 0.15, -1.0, -0.4)
    return p


def pose(clip, t):
    return {"crawl": crawl, "slip": slip, "retch": retch, "rise": rise, "idle": idle, "walk": walk}[clip](t)


def times(clip):
    sec, n, loop, _ = CLIPS[clip]
    # a loop's frames divide the cycle; a one-shot's run from its first pose to its last
    return [sec * i / n for i in range(n)] if loop else [sec * i / (n - 1) for i in range(n)]
