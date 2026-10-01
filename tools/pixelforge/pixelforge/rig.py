"""Estimate a humanoid skeleton from the front silhouette.

Mixamo asks a person to drag markers onto the chin, wrists, elbows, knees and
groin.  We place the same landmarks automatically from canonical human
proportions, then snap the horizontal positions to the silhouette (shoulders
to the body's width, hands to the outermost pixels at hand height).  The
result is a JSON spec of joints the Blender script turns into an armature.

Coordinates: x in [-0.5, 0.5] of the silhouette width (left = character's
right), z in [0, 1] of the height (0 = feet).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

# canonical heights (fraction of total height) for a standing adult
CANON = {
    "head_top": 1.0,
    "head": 0.935,
    "neck": 0.87,
    "shoulder": 0.815,
    "chest": 0.72,
    "spine": 0.62,
    "hips": 0.53,
    "elbow": 0.63,
    "wrist": 0.46,
    "hand_tip": 0.40,
    "knee": 0.28,
    "ankle": 0.05,
    "toe": 0.0,
}


def _mask(image: Image.Image) -> np.ndarray:
    a = np.asarray(image.convert("RGBA"))[..., 3] > 127
    ys, xs = np.nonzero(a)
    return a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def _row(mask: np.ndarray, z: float) -> np.ndarray:
    h = mask.shape[0]
    r = int(round((1 - z) * (h - 1)))
    return mask[min(max(r, 0), h - 1)]


def _runs(row: np.ndarray) -> list[tuple[int, int]]:
    out, x, n = [], 0, len(row)
    while x < n:
        if row[x]:
            s = x
            while x < n and row[x]:
                x += 1
            out.append((s, x))
        else:
            x += 1
    return out


def estimate_skeleton(front: Image.Image) -> dict:
    m = _mask(front)
    h, w = m.shape

    def nx(px: float) -> float:  # pixel column -> normalised x
        return (px / (w - 1)) - 0.5

    def body_extent(z: float) -> tuple[float, float]:
        """x range of the widest run at height z (the torso, not an arm)."""
        runs = _runs(_row(m, z))
        if not runs:
            return (-0.1, 0.1)
        x0, x1 = max(runs, key=lambda r: r[1] - r[0])
        return nx(x0), nx(x1 - 1)

    def outer_extent(z: float) -> tuple[float, float]:
        runs = _runs(_row(m, z))
        if not runs:
            return (-0.2, 0.2)
        return nx(runs[0][0]), nx(runs[-1][1] - 1)

    sl, sr = body_extent(CANON["shoulder"])
    shoulder_half = max((sr - sl) * 0.42, 0.06)
    hl, hr = outer_extent(CANON["wrist"])
    # hands: outermost pixels at wrist height, pulled slightly inward
    hand_l = min(hl + 0.03, -shoulder_half)
    hand_r = max(hr - 0.03, shoulder_half)
    hip_l, hip_r = body_extent(CANON["hips"])
    hip_half = max((hip_r - hip_l) * 0.22, 0.05)
    cx = 0.0

    joints = {
        "hips": (cx, CANON["hips"]),
        "spine": (cx, CANON["spine"]),
        "chest": (cx, CANON["chest"]),
        "neck": (cx, CANON["neck"]),
        "head": (cx, CANON["head"]),
        "head_top": (cx, CANON["head_top"]),
        "shoulder_L": (shoulder_half, CANON["shoulder"]),
        "shoulder_R": (-shoulder_half, CANON["shoulder"]),
        "elbow_L": ((shoulder_half + hand_r) / 2, CANON["elbow"]),
        "elbow_R": ((-shoulder_half + hand_l) / 2, CANON["elbow"]),
        "wrist_L": (hand_r, CANON["wrist"]),
        "wrist_R": (hand_l, CANON["wrist"]),
        "hand_L": (hand_r, CANON["hand_tip"]),
        "hand_R": (hand_l, CANON["hand_tip"]),
        "hip_L": (hip_half, CANON["hips"] - 0.02),
        "hip_R": (-hip_half, CANON["hips"] - 0.02),
        "knee_L": (hip_half, CANON["knee"]),
        "knee_R": (-hip_half, CANON["knee"]),
        "ankle_L": (hip_half, CANON["ankle"]),
        "ankle_R": (-hip_half, CANON["ankle"]),
        "toe_L": (hip_half, CANON["toe"]),
        "toe_R": (-hip_half, CANON["toe"]),
    }
    return {"version": 1, "aspect": float(w / h), "joints": {k: [float(x), float(z)] for k, (x, z) in joints.items()}}


def write_skeleton(spec: dict, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(spec, indent=1) + "\n")
    return path


# ----------------------------------------------------------------------------------------- per-view fit (the pixel road)
# The 2D puppet needs a skeleton in every painted view, in the view's own pixels, with the arms found on the
# silhouette (an A-pose sheet shows them beside the body), the feet found at the bottom, a skirt or robe noticed
# (one wide run where two legs would be) and, for a side or three-quarter view, which way the figure faces.
# ``fit_view`` is that: it returns pixel coordinates, not the normalised ones of ``estimate_skeleton``.

VIEW_KINDS = ("front", "back", "side", "quarter")


def _bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        raise ValueError("the cutout is empty")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def _run_containing(runs: list[tuple[int, int]], x: float) -> tuple[int, int] | None:
    for s, e in runs:
        if s <= x < e:
            return (s, e)
    return None


def _central_run(runs: list[tuple[int, int]], cx: float) -> tuple[int, int] | None:
    """The run under ``cx``, else the widest run (a body always has one)."""
    if not runs:
        return None
    hit = _run_containing(runs, cx)
    return hit or max(runs, key=lambda r: r[1] - r[0])


def _body_width(runs: list[tuple[int, int]], lo: int, hi: int) -> int:
    """Opaque pixels of a row inside the body's columns ``lo..hi`` (shreds beside the body do not count)."""
    return sum(min(e, hi) - max(s, lo) for s, e in runs if min(e, hi) > max(s, lo))


def fit_view(image: Image.Image, view: str = "front", facing: str | None = None, skirt: bool | None = None, hem_z: float | None = None) -> dict:
    """A 2D skeleton fitted to one painted view, in the image's pixels (x right, y down).

    Returns ``{"view", "facing", "box", "width", "height", "joints": {name: [x, y]}, "skirt": bool, "hem": y|None,
    "hem_z", "hips_width", "cx"}``. ``facing`` (``left`` | ``right``) is where a side or three-quarter figure looks
    on the screen; it is detected from the feet when not given. ``skirt`` and ``hem_z`` (the hem's height as a
    fraction of the figure) override the detection, so the side and back views can take the front's answer. Joint
    names follow the motion library (``shoulder_L`` is the figure's own left: on the screen's right in a front
    view, on its left in a back view, the near arm in a side view facing left).
    """
    if view not in VIEW_KINDS:
        raise ValueError(f"view must be one of {VIEW_KINDS}")
    a = np.asarray(image.convert("RGBA"))[..., 3] > 127
    x0, y0, x1, y1 = _bbox(a)
    m = a[y0:y1, x0:x1]
    h, w = m.shape
    Z = CANON

    def row(z: float) -> int:
        return int(min(max(round((1.0 - z) * (h - 1)), 0), h - 1))

    def runs_at(z: float) -> list[tuple[int, int]]:
        return _runs(m[row(z)])

    # the body's centre column: the middle of the widest run, over the trunk (the median of several rows, so a
    # row that lands between two legs or on a hanging cord cannot pull it aside)
    centres = []
    for z in np.arange(0.55, 0.81, 0.05):
        rr = runs_at(float(z))
        if rr:
            r = max(rr, key=lambda q: q[1] - q[0])
            centres.append((r[0] + r[1] - 1) / 2.0)
    cx = float(np.median(centres)) if centres else (w - 1) / 2.0
    # the hips: the run under the centre at hip height (a little higher when the hip row falls between the legs)
    hr = None
    for z in (Z["hips"], Z["hips"] + 0.03, Z["hips"] + 0.06):
        hr = _run_containing(runs_at(z), cx)
        if hr is not None:
            break
    if hr is None:
        rr = runs_at(Z["hips"])
        hr = max(rr, key=lambda r: r[1] - r[0]) if rr else (0, w)
    hips_width = float(hr[1] - hr[0])
    body_lo, body_hi = int(hr[0] - 0.15 * w), int(hr[1] + 0.15 * w)

    def centre(z: float) -> float:
        """The middle of the body's run at that height: the run under the centre column, else the nearest run
        when it is close (a leaning figure), else the centre column itself (a row between two legs)."""
        rr = runs_at(z)
        r = _run_containing(rr, cx)
        if r is None and rr:
            near = min(rr, key=lambda q: min(abs(q[0] - cx), abs(q[1] - 1 - cx)))
            if min(abs(near[0] - cx), abs(near[1] - 1 - cx)) <= 0.08 * w:
                r = near
        return cx if r is None else (r[0] + r[1] - 1) / 2.0

    # ----------------------------------------------------------------- skirt / robe: one wide run where legs would be
    if skirt is None:
        def wide(z: float) -> bool:
            r = _central_run(runs_at(z), cx)
            return bool(r and (r[1] - r[0]) >= 0.75 * hips_width)
        skirt = hips_width > 0 and wide(0.35) and wide(0.2)
    hem_row = None
    if skirt and hem_z is not None:
        hem_row = row(hem_z)
    elif skirt:
        # from the bottom up: the first band of rows (1.5% of the height) as wide as the body is the hem; two
        # separate runs with a gap between them are feet, not a hem, and a thin wide line is a shadow's remains
        need = max(8, int(0.015 * h))
        streak = 0
        for r in range(h - 1, row(0.5), -1):
            rr = _runs(m[r])
            big = [q for q in rr if q[1] - q[0] >= 0.03 * w and min(q[1], body_hi) > max(q[0], body_lo)]
            two_feet = len(big) == 2 and big[1][0] - big[0][1] >= 0.06 * hips_width
            ok = _body_width(rr, body_lo, body_hi) >= 0.6 * hips_width and not two_feet
            streak = streak + 1 if ok else 0
            if streak >= need:
                hem_row = r + need - 1
                break
        if hem_row is None:
            skirt = False
    hem_z_out = (1.0 - hem_row / max(h - 1, 1)) if hem_row is not None else None

    # ------------------------------------------------------------------ feet: the rows under the hem (else the bottom 4%)
    foot_top = (hem_row + 1) if hem_row is not None else row(0.04)
    foot_runs: list[tuple[int, int]] = []
    for r in range(max(foot_top, row(0.12)), h):
        foot_runs.extend(q for q in _runs(m[r]) if q[1] - q[0] >= 0.04 * w)
    if not foot_runs:
        foot_runs = [q for r in range(row(0.03), h) for q in _runs(m[r])] or [(int(cx) - 1, int(cx) + 1)]
    feet_lo = min(s for s, _ in foot_runs)
    feet_hi = max(e for _, e in foot_runs)

    if view in ("side", "quarter"):
        if facing not in ("left", "right"):
            facing = "left" if (cx - feet_lo) >= (feet_hi - 1 - cx) else "right"
    else:
        facing = "none"
    fwd = -1.0 if facing == "left" else 1.0

    J: dict[str, tuple[float, float]] = {}
    for name, key in (("hips", "hips"), ("spine", "spine"), ("chest", "chest"), ("neck", "neck"), ("head", "head")):
        J[name] = (centre(Z[key]), float(row(Z[key])))
    J["head_top"] = (centre(0.95), 0.0)

    if view in ("front", "back", "quarter"):
        body = _central_run(runs_at(Z["shoulder"]), cx) or hr
        half = max((body[1] - body[0]) * 0.42, 0.06 * w)
        sx_l, sx_r = cx - half, cx + half   # screen-left / screen-right shoulders

        # ---------------------------------------------------------------- arms: follow the side runs down from the shoulders
        def arm(side: int) -> dict[str, tuple[float, float]]:
            shoulder = (sx_l if side < 0 else sx_r, float(row(Z["shoulder"])))
            start_r, end_r = row(Z["shoulder"]), row(0.30)
            prev = shoulder[0]
            pts: list[tuple[int, float]] = []
            gap = 0
            for r in range(start_r, end_r + 1):
                rr = _runs(m[r])
                body_r = _central_run(rr, cx)
                if body_r is None:
                    continue
                cands = [q for q in rr if q != body_r and q[1] - q[0] >= 0.01 * w
                         and ((q[1] <= body_r[0] + 1) if side < 0 else (q[0] >= body_r[1] - 1))]
                if not cands:
                    gap += 1
                    if gap > 0.08 * h and pts:   # cloth may cross the arm for a stretch; the arm goes on below it
                        break
                    continue
                q = min(cands, key=lambda q: abs((q[0] + q[1]) / 2 - prev))
                c = (q[0] + q[1] - 1) / 2.0
                if pts and abs(c - prev) > 0.12 * w:   # a stray shred far from the arm's line
                    gap += 1
                    continue
                gap = 0
                pts.append((r, c))
                prev = c
            if len(pts) < 0.06 * h:
                # no separate arm run (arms along the body): hang it beside the body on canonical heights
                x = (sx_l - 0.02 * w) if side < 0 else (sx_r + 0.02 * w)
                return {"shoulder": shoulder, "elbow": (x, float(row(Z["elbow"]))), "wrist": (x, float(row(Z["wrist"]))), "hand": (x, float(row(Z["hand_tip"])))}
            r1 = pts[-1][0]
            tail = [c for r, c in pts if r >= r1 - 0.03 * h]
            hand = (float(np.mean(tail)), float(r1))
            wrist_r = r1 - 0.08 * h
            near = [p for p in pts if abs(p[0] - wrist_r) <= 0.03 * h]
            wrist = (float(np.mean([c for _, c in near])), float(wrist_r)) if near else (hand[0], float(wrist_r))
            elbow_r = row(Z["elbow"])
            near = [p for p in pts if abs(p[0] - elbow_r) <= 0.03 * h]
            if near:
                elbow = (float(np.mean([c for _, c in near])), float(elbow_r))
            else:   # an A-pose arm is nearly straight: the elbow sits on the shoulder-wrist line
                t = (elbow_r - shoulder[1]) / max(wrist[1] - shoulder[1], 1.0)
                elbow = (shoulder[0] + t * (wrist[0] - shoulder[0]), float(elbow_r))
            return {"shoulder": shoulder, "elbow": elbow, "wrist": wrist, "hand": hand}

        left_arm, right_arm = arm(-1), arm(+1)   # screen-left, screen-right

        # ---------------------------------------------------------------- legs: the feet at the bottom
        hip_half = max(hips_width * 0.22, 0.05 * w)
        feet = sorted(foot_runs, key=lambda q: q[0])
        groups: list[list[tuple[int, int]]] = []
        for q in feet:   # cluster the foot runs of every row into left / right feet by overlap
            for g in groups:
                if min(q[1], max(e for _, e in g)) > max(q[0], min(s for s, _ in g)):
                    g.append(q)
                    break
            else:
                groups.append([q])
        groups = [g for g in groups if len(g) >= 3]
        if len(groups) >= 2:
            lf, rf = min(groups, key=lambda g: np.mean([s for s, _ in g])), max(groups, key=lambda g: np.mean([e for _, e in g]))
            ank_l = float(np.mean([(s + e - 1) / 2 for s, e in lf]))
            ank_r = float(np.mean([(s + e - 1) / 2 for s, e in rf]))
        else:
            ank_l, ank_r = cx - hip_half, cx + hip_half

        def leg(hx: float, ax: float) -> dict[str, tuple[float, float]]:
            return {"hip": (hx, float(row(Z["hips"] - 0.02))), "knee": ((hx + ax) / 2, float(row(Z["knee"]))),
                    "ankle": (ax, float(row(Z["ankle"]))), "toe": (ax, float(h - 1)), "toe_tip": (ax, float(h - 1))}

        left_leg, right_leg = leg(cx - hip_half, ank_l), leg(cx + hip_half, ank_r)
        # the figure's own left is on the screen's right in a front view and on the screen's left seen from behind
        if view == "back":
            L_arm, R_arm, L_leg, R_leg = left_arm, right_arm, left_leg, right_leg
        else:
            L_arm, R_arm, L_leg, R_leg = right_arm, left_arm, right_leg, left_leg
        for side, arm_j, leg_j in (("L", L_arm, L_leg), ("R", R_arm, R_leg)):
            for k, v in arm_j.items():
                J[f"{k}_{side}"] = v
            for k, v in leg_j.items():
                J[f"{k}_{side}"] = v
    else:
        # ----------------------------------------------------------------- side view: everything on the body's centre line
        sh = (centre(Z["shoulder"]), float(row(Z["shoulder"])))
        # the near arm hangs a little in front of the body's centre line; the far arm is its clone, drawn behind
        near = {"shoulder": sh, "elbow": (centre(Z["elbow"]) + fwd * 0.04 * w, float(row(Z["elbow"]))),
                "wrist": (centre(Z["wrist"]) + fwd * 0.08 * w, float(row(Z["wrist"]))),
                "hand": (centre(Z["hand_tip"]) + fwd * 0.09 * w, float(row(Z["hand_tip"])))}
        toe_x = float(feet_lo if facing == "left" else feet_hi - 1)
        heel_x = float(feet_hi - 1 if facing == "left" else feet_lo)
        ankle_x = heel_x + 0.3 * (toe_x - heel_x)
        leg = {"hip": (centre(Z["hips"] - 0.02), float(row(Z["hips"] - 0.02))), "knee": (centre(Z["knee"]), float(row(Z["knee"]))),
               "ankle": (ankle_x, float(row(Z["ankle"]))), "toe": (ankle_x + 0.75 * (toe_x - ankle_x), float(h - 1)), "toe_tip": (toe_x, float(h - 1))}
        near_side = "L" if facing == "left" else "R"   # a figure facing screen-left shows its left side to the camera
        far_side = "R" if near_side == "L" else "L"
        for k, v in near.items():
            J[f"{k}_{near_side}"] = v
            J[f"{k}_{far_side}"] = v
        for k, v in leg.items():
            J[f"{k}_{near_side}"] = v
            J[f"{k}_{far_side}"] = v

    joints = {k: [float(x0 + x), float(y0 + y)] for k, (x, y) in J.items()}
    return {
        "version": 1,
        "view": view,
        "facing": facing,
        "box": [x0, y0, x1, y1],
        "width": int(w),
        "height": int(h),
        "cx": float(x0 + cx),
        "hips_width": hips_width,
        "skirt": bool(skirt),
        "hem": (int(y0 + hem_row) if hem_row is not None else None),
        "hem_z": hem_z_out,
        "joints": joints,
    }
