"""The rig of shape sprites: the motion clips' joints drive the shapes, every frame a real render.

A solid file names a ``bone`` on each shape (or a ``part`` whose entry names the bone). The rig builds the
**author pose**, the standing pose the file was drawn in: the library's rest skeleton scaled to the file's figure
height, arms lowered to hang at the sides, placed on the file's ground line and body axis. For a frame of a clip
it takes the joints' world transforms from the exported tracks (:mod:`pixelforge.joints`), converts them to file
units (y down, the character facing the viewer) and gives each shape the rigid motion that carries its bone from
the author pose to the clip pose. Loose parts (cloth, cords, a hat, a ribbon) take their bone's transform a few
frames late and shear with the bone's velocity and the clip's travel, so hems trail the body; the trailing is
capped at a fraction of the part's height and fades out when the bone is nearly still, so a fast bone never carries
a hem away from the body and a resting part never drifts under a pixel. A hanging part (``hang`` below 1) takes its
bone's position and turn but only that fraction of its tilt, so a skirt hangs from the hips instead of swinging with
the pelvis. The lowest planted foot is held on the ground line. The renderer then z-buffers the moved shell, so draw order, contours, outline,
lights and the shadow come out right in every one of the eight directions.

A flat file (the 2D path) binds its ``parts`` (groups of shapes with a pivot) to bones the same way, in the
picture plane: each part turns about its pivot by the projected bone's change of angle and moves with the
projected joint; the back view mirrors the front unless the file carries per-view shape variants.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from . import shapes as S
from .joints import JointTracks, load_joints

F = np.diag([1.0, -1.0, 1.0])     # glTF (y up) <-> file units (y down)
DIRECTIONS = {"S": 0.0, "SE": 45.0, "E": 90.0, "NE": 135.0, "N": 180.0, "NW": 225.0, "W": 270.0, "SW": 315.0}
GAME_CLIPS = ("idle", "walk", "run", "attack", "cast", "hit", "death")
GROUND_LOCK = {"idle", "walk", "run", "sprint", "attack", "cast", "hit", "punch", "jab", "hit_head", "cast_idle", "attack_idle", "talk",
               "crouch", "crouch_walk", "torch_idle", "walk_hunched", "interact", "dance"}
DRIFT = {"walk": 0.5, "walk_hunched": 0.5, "run": 1.0, "sprint": 1.4, "crouch_walk": 0.3, "roll": 1.0}   # travel per frame at 120 px (the clips are in place)
ARM_CHAIN = ("upper_arm", "forearm", "hand")
DEFAULT_LAG = {"frames": 2, "sway": 0.6, "max": 0.1}
LAG_STILL, LAG_MOVING = 0.1, 0.4           # bone speed (units per frame) below which a lag fades out, above which it is whole
TURN_STEP = 5.0                            # degrees: a bone's drawn turn holds until the clip's is this far from it
MOVE_STEP = 1.5                            # pixels: a body's drawn place holds until the clip's is this far from it
EPS = 1e-9                                 # a turn or move exactly at its step counts as the step (floating point lands a hair under)
GROUND_REACH = 6.0                         # units at 120 px: a foot this close to the clip's floor is planted (mocap feet hover and pitch); higher is flight


def rot_z(deg: float) -> np.ndarray:
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]], float)


def rot_x(deg: float) -> np.ndarray:
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]], float)


def rodrigues(axis: np.ndarray, ang: float) -> np.ndarray:
    """The rotation of ``ang`` radians about the unit vector ``axis``."""
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]], float)
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * (K @ K)


def rotation_angle(Ra: np.ndarray, Rb: np.ndarray) -> float:
    """The angle in degrees between two rotations."""
    tr = float(np.clip((np.trace(Rb @ Ra.T) - 1.0) / 2.0, -1.0, 1.0))
    return math.degrees(math.acos(tr))


def rotation_between(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """The smallest rotation carrying the direction of ``u`` to the direction of ``v`` (identity when either is zero)."""
    nu, nv = float(np.linalg.norm(u)), float(np.linalg.norm(v))
    if nu < 1e-9 or nv < 1e-9:
        return np.eye(3)
    a, b = u / nu, v / nv
    axis = np.cross(a, b)
    n = float(np.linalg.norm(axis))
    c = float(np.clip(np.dot(a, b), -1.0, 1.0))
    if n < 1e-9:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    return rodrigues(axis / n, math.atan2(n, c))


def damp_tilt(R: np.ndarray, hang: float) -> np.ndarray:
    """``R`` with its tilt (how far it turns the vertical axis) scaled by ``hang``: 1 keeps the bone's whole rotation,
    0 keeps only its turn about the vertical, so a garment hangs from its joint instead of swinging with the pelvis
    or the chest."""
    hang = float(hang)
    if hang >= 1.0:
        return R
    up = np.array([0.0, 1.0, 0.0])
    v = R @ up
    ang = math.acos(float(np.clip(v[1], -1.0, 1.0)))
    axis = np.cross(up, v)
    n = float(np.linalg.norm(axis))
    if ang < 1e-6 or n < 1e-9:
        return R
    axis = axis / n
    yaw = rodrigues(axis, ang).T @ R           # R = tilt @ yaw, and yaw keeps the vertical fixed
    return rodrigues(axis, ang * max(hang, 0.0)) @ yaw


def aim(R: np.ndarray, new_dir: np.ndarray) -> np.ndarray:
    """The rotation closest to ``R`` whose +Y axis points along ``new_dir``."""
    d = np.asarray(new_dir, float); d = d / (np.linalg.norm(d) + 1e-9)
    y = R[:, 1]
    v = np.cross(y, d); c = float(np.dot(y, d))
    if np.linalg.norm(v) < 1e-9:
        return R if c > 0 else R @ np.diag([1.0, -1.0, -1.0])
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    Rm = np.eye(3) + vx + vx @ vx * (1 / (1 + c))
    return Rm @ R


class Skeleton:
    """The author pose in file units and the clip poses mapped into the same space."""

    def __init__(self, tracks: JointTracks, height: float, ground: float, cx: float, cz: float = 0.0, arm_drop: float = 78.0,
                 elbow_bend: float = 12.0, joints: dict | None = None):
        self.t = tracks
        self.height, self.ground, self.cx, self.cz = float(height), float(ground), float(cx), float(cz)
        self.s = self.height / tracks.height()
        self.names = tracks.names
        self.index = tracks.index
        pos = self.to_file(tracks.rest_pos)
        rot = np.einsum("ij,njk,kl->nil", F, tracks.rest_rot, F)
        for side, sign in (("L", 1.0), ("R", -1.0)):
            chain = [self.index[f"{b}.{side}"] for b in ARM_CHAIN if f"{b}.{side}" in self.index]
            if not chain:
                continue
            pivot = pos[chain[0]].copy()
            R = rot_z(sign * arm_drop)
            for j in chain:
                pos[j] = pivot + R @ (pos[j] - pivot); rot[j] = R @ rot[j]
            if len(chain) > 1 and elbow_bend:
                pivot = pos[chain[1]].copy()
                R = rot_x(elbow_bend)
                for j in chain[1:]:
                    pos[j] = pivot + R @ (pos[j] - pivot); rot[j] = R @ rot[j]
        self.lengths = tracks.lengths * self.s
        self.pos, self.rot = pos, rot
        if joints:
            self._override(joints)

    def _override(self, joints: dict) -> None:
        """Per-joint head positions from the file move the author pose; a bone re-aims at its moved child."""
        for name, p in joints.items():
            if name in self.index and p is not None:
                self.pos[self.index[name]] = np.array(p, float)
        children = {}
        for j, par in enumerate(self.t.parents):
            if par >= 0:
                children.setdefault(par, []).append(j)
        for name in joints:
            if name not in self.index:
                continue
            j = self.index[name]
            kids = [k for k in children.get(j, []) if self.names[k] in joints]
            if kids:
                self.rot[j] = aim(self.rot[j], self.pos[j] - self.pos[kids[0]])
            par = self.t.parents[j]
            if par >= 0 and self.names[par] not in joints:
                self.rot[par] = aim(self.rot[par], self.pos[par] - self.pos[j])

    def to_file(self, P: np.ndarray) -> np.ndarray:
        out = np.asarray(P, float) * self.s
        out = out.copy()
        out[..., 0] += self.cx
        out[..., 1] = self.ground - out[..., 1]
        out[..., 2] += self.cz
        return out

    def clip_pose(self, clip: str, t: float) -> tuple[np.ndarray, np.ndarray]:
        p, r = self.t.pose_at(clip, t)
        return self.to_file(p), np.einsum("ij,njk,kl->nil", F, r, F)

    def tail(self, j: int, pos=None, rot=None) -> np.ndarray:
        pos = self.pos if pos is None else pos; rot = self.rot if rot is None else rot
        return pos[j] - rot[j][:, 1] * self.lengths[j]      # a bone runs along +Y in glTF, which is -Y here (y down)

    def table(self) -> dict:
        """Every bone's head and tail in file units: what an author draws shapes around."""
        return {n: {"head": [round(float(v), 2) for v in self.pos[j]], "tail": [round(float(v), 2) for v in self.tail(j)],
                    "length": round(float(self.lengths[j]), 2), "parent": self.names[self.t.parents[j]] if self.t.parents[j] >= 0 else None}
                for j, n in enumerate(self.names)}

    def delta(self, j: int, pos_f: np.ndarray, rot_f: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """(R, t) carrying bone ``j`` from the author pose to the clip pose: p' = R p + t."""
        R = rot_f[j] @ self.rot[j].T
        return R, pos_f[j] - R @ self.pos[j]


def skeleton_for(doc: dict, tracks: JointTracks | None = None) -> Skeleton:
    tracks = tracks or load_joints()
    sk = doc.get("skeleton") or {}
    size = doc["size"]
    cx, cz = doc.get("axis", [size[0] / 2, 0.0])
    return Skeleton(tracks, float(sk.get("height", doc.get("height", size[1]))), float(sk.get("ground", doc.get("ground", size[1] - 1))),
                    float(sk.get("cx", cx)), float(sk.get("cz", cz)), float(sk.get("arm_drop", 78.0)), float(sk.get("elbow_bend", 12.0)), sk.get("joints"))


# ---------------------------------------------------------------------------------------------- binding
def _bone_and_lag(spec: dict, parts: dict) -> tuple[str | None, dict | None, float]:
    """A shape's bone, its lag (``{"frames", "sway", "max"}`` or None) and its hang (1 = rigid), from the shape or its part."""
    part = parts.get(spec.get("part"), {}) if spec.get("part") else {}
    bone = spec.get("bone", part.get("bone"))
    lag = spec.get("lag", part.get("lag"))
    if lag is True:
        lag = dict(DEFAULT_LAG)
    hang = float(spec.get("hang", part.get("hang", 1.0)))
    return bone, lag, hang


class Poser:
    """Per-frame transforms of a solid model's shapes for one clip, with lag, sway, drift and the ground lock."""

    def __init__(self, model: S.Model, skel: Skeleton, clip: str, lock: bool | None = None, view: tuple[float, float] | None = None,
                 turn_step: float | None = None):
        """``view`` is (phi, elevation) of the render; with it the ground lock works on the screen: the lowest foot pixel
        lands on one row in every frame, as a drawn sprite's would, whichever foot is planted and however far forward
        it is (at an elevation a forward foot projects lower). Without it the lock holds the feet in file units.
        ``turn_step`` (degrees, :data:`TURN_STEP`; the file's ``view.turn_step`` when given; 0 = continuous) is the
        step every bone's rotation is held to, so a slow turn is a held pose and then a step, never a creep."""
        self.model, self.skel, self.clip = model, skel, clip
        self.view = view
        view_spec = model.doc.get("view") or {}
        self.turn_step = float(view_spec.get("turn_step", TURN_STEP)) if turn_step is None else float(turn_step)
        self.move_step = float(view_spec.get("move_step", MOVE_STEP))
        # the holds: per key the last (t, held value) and a memo of the value at each prepared time
        self._rot_last: dict = {}; self._rot_at: dict = {}
        self._off_last: dict = {}; self._off_at: dict = {}
        if not skel.t.has(clip):
            raise ValueError(f"unknown clip {clip!r}; the library has {skel.t.clips}")
        self.n_src = skel.t.frames(clip)
        self.loop = skel.t.loop(clip)
        self.lock = (clip in GROUND_LOCK) if lock is None else bool(lock)
        self.parts = model.doc.get("parts") or {}
        self.drift = DRIFT.get(clip, 0.0) * skel.height / 120.0
        self._poses: dict[float, tuple[np.ndarray, np.ndarray]] = {}
        toes = [skel.index[n] for n in ("toe.L", "toe.R") if n in skel.index]
        self.toes = toes
        self.author_sole = float(max(skel.pos[j][1] for j in toes)) if toes else skel.ground
        # the ground lock holds the lowest point of the foot shapes themselves (the toe joint sits inside a foot that
        # overhangs it and pitches), or the toe joints when the file has no feet
        self.feet: list[tuple[str, float, np.ndarray, np.ndarray]] = []
        for p in model.prims:
            bone, _, hang = _bone_and_lag(p.spec, self.parts)
            if bone and bone.split(".")[0] in ("foot", "toe") and bone in skel.index:
                vox = model.shell.pos[model.shell.prim == p.index]
                if len(vox):
                    self.feet.append((bone, hang, self._pivot(p) if hang < 1.0 else None, vox))     # the pivot transforms() uses
        self.author_low = float(max(self._screen_low(v) for _, _, _, v in self.feet)) if self.feet else self.author_sole
        self._shifts: dict[float, float] = {}
        self.reach = GROUND_REACH * skel.height / 120.0
        self._floor: float | None = None
        # the box of each part: the shapes of one part are one body (a hat and its crown knob swing and hold together)
        self.part_box: dict[str, np.ndarray] = {}
        for p in model.prims:
            if p.part and not p.carve:
                lo, hi = p.bbox
                if p.part in self.part_box:
                    b = self.part_box[p.part]
                    self.part_box[p.part] = np.array([np.minimum(b[0], lo), np.maximum(b[1], hi)])
                else:
                    self.part_box[p.part] = np.array([lo, hi])

    def box_of(self, p) -> np.ndarray:
        """The box a shape moves by: its part's (all the part's shapes together) or its own."""
        return self.part_box.get(p.part, p.bbox) if p.part else p.bbox

    def _screen_low(self, vox: np.ndarray) -> float:
        """The lowest point of voxels as the view sees it, in file units of screen height (plain y without a view)."""
        if not self.view:
            return float(vox[:, 1].max())
        phi, elev = self.view
        cx, cz = self.skel.cx, self.skel.cz
        zr = -(vox[:, 0] - cx) * math.sin(phi) + (vox[:, 2] - cz) * math.cos(phi)
        return float(((vox[:, 1] - self.skel.ground) * math.cos(math.radians(elev)) + zr * math.sin(math.radians(elev))).max())

    def _pivot(self, p) -> np.ndarray:
        """Where a hanging shape attaches: the top centre of its body's box in the author pose."""
        lo, hi = self.box_of(p)
        return np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])

    def pose(self, t: float):
        key = round(t, 4)
        if key not in self._poses:
            self._poses[key] = self.skel.clip_pose(self.clip, t)
        return self._poses[key]

    def foot_low(self, t: float, hold: bool = True) -> float:
        """The lowest point of the feet at ``t`` as the view sees it (screen file units), before any ground shift."""
        if self.feet:
            low = -1e9
            for bone, hang, piv, vox in self.feet:
                R, tr = self.bone_delta(bone, t, 0.0, hang, piv, hold=hold)
                low = max(low, self._screen_low(vox @ R.T + tr))
            return float(low)
        pos, _ = self.pose(t)
        return float(max(pos[j][1] for j in self.toes))

    def floor(self) -> float:
        """The lowest the feet get in the whole clip: where the clip's own ground is."""
        if self._floor is None:
            self._floor = max(self.foot_low(float(t), hold=False) for t in range(self.n_src))
        return self._floor

    def contact(self, t: float) -> bool:
        """Whether a foot is on the ground this frame (within :data:`GROUND_REACH` of the clip's floor); otherwise the
        figure is in flight and the lock lets it rise."""
        return self.floor() - self.foot_low(t) <= self.reach

    def ground_shift(self, t: float) -> float:
        """How far down (+) the whole figure moves this frame so its lowest foot pixel sits on the ground line: the
        lowest foot voxel is aimed at the centre of the row the author pose's lowest foot pixel is on, so the
        renderer's whole-pixel snap (up to half a pixel either way) can never move it off that row. A foot up to
        ``reach`` units above the clip's floor is planted and pulled onto the line (mocap feet hover and pitch);
        higher is a jump, and the body is pulled down by ``reach`` and otherwise flies."""
        if not self.lock or not (self.toes or self.feet):
            return 0.0
        key = round(t, 4)
        if key not in self._shifts:
            s = self.model.scale
            gy = self.skel.ground if self.view else 0.0
            target = (math.floor((gy + self.author_low) * s) + 0.5) / s - gy      # the row's centre, in screen file units
            low = self.foot_low(t)
            pull = min(self.floor() - low, self.reach)
            ce = math.cos(math.radians(self.view[1])) if (self.view and self.feet) else 1.0
            self._shifts[key] = (target - self.floor() + pull) / max(ce, 0.2)
        return self._shifts[key]

    def bone_delta(self, bone: str, t: float, shift: float = 0.0, hang: float = 1.0, pivot: np.ndarray | None = None, upright_from: str | None = None,
                   hold: bool = True) -> tuple[np.ndarray, np.ndarray]:
        """(R, t) carrying ``bone`` from the author pose to the clip pose at ``t``, the ground shift added. With ``hang``
        below 1 the bone's tilt is damped and the shape hangs from ``pivot`` (its attachment point, in the author
        pose; the bone's head when not given), which follows the bone rigidly. The damping fades as the bone lies
        down: cloth hangs from an upright body and lies along a fallen one. ``hold`` applies the turn hold
        (:meth:`hold_turn`); the late pose a lag looks back at is taken raw."""
        pos, rot = self.pose(t)
        j = self.skel.index[bone]
        R = rot[j] @ self.skel.rot[j].T
        tr = pos[j] - R @ self.skel.pos[j]
        piv = self.skel.pos[j] if pivot is None else np.asarray(pivot, float)
        if hang < 1.0:
            # how upright the body is decides hanging vs lying; by default the bone's own tilt, or another bone's
            # (``upright_from``: plates hung on a thigh judge it by the hips, so a raised knee does not lay them flat)
            Ru = R
            if upright_from and upright_from in self.skel.index:
                ju = self.skel.index[upright_from]
                Ru = rot[ju] @ self.skel.rot[ju].T
            upright = float(np.clip((Ru @ np.array([0.0, 1.0, 0.0]))[1], 0.0, 1.0))
            Rh = damp_tilt(R, hang + (1.0 - hang) * (1.0 - upright))
            tr = (R @ piv + tr) - Rh @ piv
            R = Rh
        if hold:                                      # the drawn turn holds; the pivot (the joint) stays exactly where the clip puts it
            R, tr = self.hold_turn((bone, round(hang, 3)), t, R, tr, piv)
        return R, tr + np.array([0.0, shift, 0.0])

    def pivot_of(self, bone: str, hang: float, p) -> np.ndarray:
        """The point of a shape the renderer snaps to whole pixels: where a hanging shape attaches, else its bone's head."""
        return self._pivot(p) if hang < 1.0 else self.skel.pos[self.skel.index[bone]].copy()

    # ---- the holds: a drawn sprite's parts stay put until they have somewhere to go
    def hold_turn(self, key, t: float, R: np.ndarray, tr: np.ndarray, piv: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """``R`` replaced by the rotation drawn last for ``key`` while the clip's is under ``turn_step`` degrees from it,
        the clip's own rotation once it is that far (so a fast bone is exact and a slow one holds and then steps);
        ``tr`` re-anchored so ``piv`` lands where the clip puts it."""
        if self.turn_step <= 0.0:
            return R, tr
        k = (key, round(t, 4))
        if k in self._rot_at:
            Rq = self._rot_at[k]
        else:
            last = self._rot_last.get(key)
            Rq = R if last is None or rotation_angle(last[1], R) >= self.turn_step - EPS else last[1]
            self._rot_at[k] = Rq; self._rot_last[key] = (t, Rq)
        if Rq is R:
            return R, tr
        return Rq, (R @ piv + tr) - Rq @ piv

    def hold_place(self, key, t: float, R: np.ndarray, tr: np.ndarray, piv: np.ndarray, round_y: bool = False) -> np.ndarray:
        """The move (file units) that puts ``piv``, carried by (``R``, ``tr``), a whole number of screen pixels from
        its author-pose place: the offset drawn last for ``key`` while the clip's is under ``move_step`` pixels from
        it, the rounded clip offset once it is that far. With ``round_y`` the vertical is always the rounded offset
        (the feet: the ground lock aims them at the centre of their row, and rounding cannot take them off it). The
        move is along the screen axes, so the depth is unchanged; every shape of a bone gets the bone's move."""
        if self.move_step <= 0.0:
            return np.zeros(3)
        phi, elev = self.view if self.view else (0.0, 0.0)
        s = self.model.scale
        dx, dy = self.model.screen_offset(piv, R @ piv + tr, phi, elev)
        k = (key, round(t, 4))
        if k in self._off_at:
            hx, hy = self._off_at[k]
        else:
            last = self._off_last.get(key)
            hx = last[1] if last is not None and abs(dx - last[1]) < self.move_step - EPS else math.floor(dx + 0.5)
            hy = (last[2] if last is not None and abs(dy - last[2]) < self.move_step - EPS else math.floor(dy + 0.5)) if not round_y else math.ceil(dy - 0.5)
            self._off_at[k] = (hx, hy); self._off_last[key] = (t, hx, hy)
        cs, sn = math.cos(phi), math.sin(phi)
        ce, se = math.cos(math.radians(elev)), math.sin(math.radians(elev))
        ex = np.array([cs, 0.0, sn]); ey = np.array([-se * sn, ce, se * cs])          # file-space directions of the screen axes
        return (ex * (hx - dx) + ey * (hy - dy)) / s

    def bone_move(self, bone: str, t: float, shift: float) -> np.ndarray:
        """The whole-pixel move of a bone this frame (:meth:`hold_place` on its head, from its held rigid transform)."""
        R, tr = self.bone_delta(bone, t, shift, 1.0)
        head = self.skel.pos[self.skel.index[bone]]
        return self.hold_place(bone, t, R, tr, head, round_y=bone.split(".")[0] in ("foot", "toe"))

    def prepare(self, times) -> None:
        """Run the holds over the frames that will be rendered, in order (twice round a looping clip, so the last frame
        hands the first the same held poses); the memo then answers every frame the same whichever order they are asked."""
        passes = 2 if self.loop else 1
        for _ in range(passes):
            self._rot_at.clear(); self._off_at.clear(); self._shifts.clear()
            for t in times:
                self.transforms(float(t))
                for spec in list(self.model.doc.get("lights", [])) + list(self.model.doc.get("effects", [])):
                    if "bone" in spec:
                        self.point(spec, float(t), {})

    def speed(self, bone: str, t: float) -> float:
        """How far the bone's head moves in this frame, in file units."""
        j = self.skel.index[bone]
        return float(np.linalg.norm(self.pose(t)[0][j] - self.pose(t - 1)[0][j]))

    def transforms(self, t: float) -> dict:
        """Every bound shape's :class:`Motion` at frame ``t``. A loose part gets a drag vector its hem follows: where
        its bone's late pose puts the hem, plus the bone's velocity times ``sway`` and the clip's travel, faded out
        while the bone is nearly still (under :data:`LAG_STILL` units a frame) and capped at ``max`` (0.1) of the
        part's height, so a hat stays on a fast head and a skirt never leaves the hips."""
        shift = self.ground_shift(t)
        out = {}
        for p in self.model.prims:
            bone, lag, hang = _bone_and_lag(p.spec, self.parts)
            if not bone or bone not in self.skel.index:
                continue
            part = self.parts.get(p.spec.get("part"), {}) if p.spec.get("part") else {}
            ub = p.spec.get("upright_from", part.get("upright_from"))
            piv = self._pivot(p) if hang < 1.0 else None
            snap_at = self.pivot_of(bone, hang, p)
            move = self.bone_move(bone, t, shift)
            R, tr = self.bone_delta(bone, t, shift, hang, piv, upright_from=ub)
            if lag:
                # a loose part: where its bone's late pose and velocity would drag the hem, as a vector...
                Rr, trr = self.bone_delta(bone, t, shift, hang, piv, upright_from=ub, hold=False)
                lo, hi = self.box_of(p)
                y0, y1 = float(lo[1]), float(hi[1])
                tl = t - float(lag.get("frames", 2))
                if not self.loop:
                    tl = max(tl, 0.0)
                R1, t1 = self.bone_delta(bone, tl, shift, hang, piv, upright_from=ub, hold=False)
                hem = np.array([(lo[0] + hi[0]) / 2, y1, (lo[2] + hi[2]) / 2])
                j = self.skel.index[bone]
                v = self.pose(t)[0][j] - self.pose(t - 1)[0][j]
                k = float(np.clip((np.linalg.norm(v) - LAG_STILL) / (LAG_MOVING - LAG_STILL), 0.0, 1.0))
                sway = float(lag.get("sway", 0.6))
                d = ((R1 @ hem + t1) - (Rr @ hem + trr)) * k - v * sway * np.array([1.0, 0.5, 1.0]) * k
                d = d + np.array([0.0, 0.0, -self.drift * sway])
                lim = float(lag.get("max", DEFAULT_LAG["max"])) * max(y1 - y0, 1.0)
                n = float(np.linalg.norm(d))
                if n > lim:
                    d = d * (lim / n)
                # ...then as a swing about the top of the part that puts the hem there (a shear would move every voxel
                # by its own fraction of a pixel, which boils). The swing is held like a turn, on top of the bone's own
                # held pose, so a part at rest on its bone is pixel for pixel the bone's and only a real swing shows.
                top = self._pivot(p)
                u = Rr @ (hem - top)
                swing, _ = self.hold_turn(("swing", p.part or p.index), t, rotation_between(u, u + d), np.zeros(3), np.zeros(3))
                Rs = swing @ R
                tr = (R @ top + tr) - Rs @ top
                R = Rs
            out[p.index] = S.Motion(R, tr + move, pivot=snap_at)
        return out

    def point(self, spec: dict, t: float, transforms: dict) -> np.ndarray | None:
        """A file-space point attached to a bone or a shape, moved to the frame."""
        at = np.array(spec.get("at", [self.skel.cx, self.skel.ground, 0.0]), float)
        if "prim" in spec:
            names = {p.name: p.index for p in self.model.prims}
            pi = names.get(spec["prim"])
            if pi is not None and pi in transforms:
                return transforms[pi].point(at)
            return at
        if "bone" in spec and spec["bone"] in self.skel.index:
            bone = spec["bone"]
            shift = self.ground_shift(t)
            R, tr = self.bone_delta(bone, t, shift)
            return R @ at + tr + self.bone_move(bone, t, shift)
        return at

    def anchors(self, t: float, transforms: dict) -> tuple[dict, list, list]:
        """Named anchors of the file plus the moved positions of effects and lights that ride a bone or a shape."""
        anchors = {}
        for name, spec in (self.model.doc.get("anchors") or {}).items():
            pt = self.point(spec, t, transforms)
            if pt is not None:
                anchors[name] = tuple(pt)
        effects, lights = [], []
        for i, ef in enumerate(self.model.doc.get("effects", [])):
            ef = dict(ef)
            if ("bone" in ef or "prim" in ef) and "anchor" not in ef:
                anchors[f"_fx{i}"] = tuple(self.point(ef, t, transforms)); ef["anchor"] = f"_fx{i}"; ef.pop("at", None)
            effects.append(ef)
        for i, li in enumerate(self.model.doc.get("lights", [])):
            li = dict(li)
            if ("bone" in li or "prim" in li) and "anchor" not in li:
                anchors[f"_light{i}"] = tuple(self.point(li, t, transforms)); li["anchor"] = f"_light{i}"; li.pop("at", None)
            lights.append(li)
        return anchors, effects, lights


def canvas_width(doc: dict, clips, tracks: JointTracks | None = None) -> float:
    """The canvas width (file units) that keeps the figure inside the frame through ``clips`` in every direction: the
    farthest any joint gets from the body axis, plus the room the file's own canvas leaves round the author pose
    (the hat, a held staff). The file's width when the clips stay within it."""
    tracks = tracks or load_joints()
    skel = skeleton_for(doc, tracks)
    cx, cz = skel.cx, skel.cz
    parts = doc.get("parts") or {}
    # how far each bone's own shapes reach from its head in the author pose (the hat round the head, a skirt round the hips)
    margin: dict[int, float] = {}
    for i, spec in enumerate(doc["shapes"]):
        bone, _, _ = _bone_and_lag(spec, parts)
        if not bone or bone not in skel.index or spec.get("carve"):
            continue
        j = skel.index[bone]
        lo, hi = S.Prim(spec, i, (cx, cz)).bbox
        corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
        margin[j] = max(margin.get(j, 0.0), float(np.max(np.linalg.norm(corners - skel.pos[j], axis=1))))
    if not margin:
        return float(doc["size"][0])
    js = np.array(sorted(margin)); ms = np.array([margin[j] for j in js])
    reach = 0.0
    for clip in clips:
        clip = clip_source(doc, clip)
        if not tracks.has(clip):
            continue
        for t in range(tracks.frames(clip)):
            pos, _ = skel.clip_pose(clip, float(t))
            reach = max(reach, float(np.max(np.hypot(pos[js, 0] - cx, pos[js, 2] - cz) + ms)))
    return float(max(doc["size"][0], 2 * math.ceil(reach + 2)))


def clip_source(doc: dict, clip: str) -> str:
    """The library clip a game clip is played from: the file's ``clips`` map (``{"attack": "punch"}`` gives a model
    a thrust instead of the stock swing) or the clip itself."""
    m = doc.get("clips") or {}
    return str(m.get(clip, clip))


def frame_times(n_src: int, n_out: int | None, loop: bool) -> list[float]:
    """Evenly spaced source times for ``n_out`` frames (the whole clip, at most ``n_out`` frames)."""
    if not n_out or n_out >= n_src:
        return [float(i) for i in range(n_src)]
    if loop:
        return [i * n_src / n_out for i in range(n_out)]
    return [i * (n_src - 1) / max(n_out - 1, 1) for i in range(n_out)]


def render_clip(doc: dict, clip: str, direction: str = "S", *, tracks: JointTracks | None = None, model: S.Model | None = None,
                scale: float = 1.0, steps: int | None = None, outline="auto", elevation: float | None = None, max_frames: int | None = None,
                square: bool | int = False, passes: bool = False, lock: bool | None = None, turn_step: float | None = None,
                snap: bool = True) -> dict:
    """Every frame of one clip facing one direction. Returns ``{"frames": [rgba, ...], "fps": f, "times": [...], "normal": [...],
    "depth": [...], "parts": [uint16 part-index masks, ...]}``; the fps keeps the clip's real duration when it was thinned to ``max_frames``. ``square`` pads
    each frame to a square canvas (True: the larger side; a number: that side) with the ground kept at the bottom.
    ``turn_step`` (degrees) and ``snap`` are the two rules that keep the pixels still between poses: bones turn in
    steps and bodies move by whole pixels (see :class:`Poser` and :meth:`pixelforge.shapes.Model.render`)."""
    tracks = tracks or load_joints()
    if direction not in DIRECTIONS:
        raise ValueError(f"direction {direction!r} not in {list(DIRECTIONS)}")
    phi = math.radians(DIRECTIONS[direction])
    if S.mode_of(doc) == "flat":
        return render_clip_flat(doc, clip, direction, tracks=tracks, scale=scale, steps=steps, outline=outline, max_frames=max_frames)
    model = model or S.Model(doc, scale, steps)
    skel = skeleton_for(doc, tracks)
    elev = float(doc.get("view", {}).get("elevation", 0.0)) if elevation is None else float(elevation)
    poser = Poser(model, skel, clip_source(doc, clip), lock, view=(phi, elev), turn_step=turn_step)
    oc = S.outline_colour(doc, outline)
    times = frame_times(poser.n_src, max_frames, poser.loop)
    poser.prepare(times)
    frames, normals, depths, parts = [], [], [], []
    for k, t in enumerate(times):
        tf = poser.transforms(t)
        anchors, effects, lights = poser.anchors(t, tf)
        fr = model.render(k, phi, elev, tf, outline=oc, lights=lights, effects=effects, shadow=doc.get("shadow"), anchors=anchors, passes=passes,
                          snap=snap)
        rgba = fr.rgba
        side = (max(model.W, model.H) if square is True else int(square)) if square else 0
        if side:
            rgba = squared(rgba, model.W, model.H, side)
        frames.append(rgba)
        parts.append(squared(fr.parts, model.W, model.H, side) if side else fr.parts)
        if passes:
            normals.append(squared(fr.normal, model.W, model.H, side) if side else fr.normal)
            depths.append(squared(fr.depth, model.W, model.H, side) if side else fr.depth)
    fps = tracks.fps * len(times) / poser.n_src
    return {"frames": frames, "fps": round(fps, 3), "times": times, "loop": poser.loop, "clip": clip, "direction": direction,
            "normal": normals, "depth": depths, "parts": parts, "ground_y": (model.ground * model.scale) + ((side - model.H) if side else 0),
            "axis_x": side / 2 if side else model.W / 2}


def squared(rgba: np.ndarray, W: int, H: int, side: int | None = None) -> np.ndarray:
    """Pad a frame to a square canvas of ``side`` (the larger side when not given) with the body axis (the canvas
    centre column) kept at the centre and the ground at the same distance from the bottom. Works for an RGBA frame
    and for a 2D mask (a parts image) alike."""
    side = max(W, H, int(side or 0))
    out = np.zeros((side, side) + rgba.shape[2:], rgba.dtype)
    ox = (side - W) // 2; oy = side - H
    out[oy:oy + H, ox:ox + W] = rgba
    return out


# ---------------------------------------------------------------------------------------------- the flat path
def flat_transforms(doc: dict, skel: Skeleton, clip: str, t: float, direction: str) -> dict:
    """Per-part (angle, dx, dy, pivot) in file units from the projected bones for the flat path."""
    phi = math.radians(DIRECTIONS[direction])
    if direction in ("N", "NW", "NE"):
        phi = math.radians(DIRECTIONS[direction] - 180.0)     # the back view is the mirrored front, posed the same way
    cs, sn = math.cos(phi), math.sin(phi)
    pos_f, rot_f = skel.clip_pose(clip, t)
    parts = doc.get("parts") or {}

    def proj(p):
        xr = (p[0] - skel.cx) * cs + (p[2] - skel.cz) * sn
        return np.array([skel.cx + xr, p[1]])

    def bone_move(bone: str, at: float) -> tuple[float, np.ndarray, np.ndarray]:
        """The projected bone at time ``at``: its change of angle, the movement of its head, and the author head."""
        j = skel.index[bone]
        pf, rf = (pos_f, rot_f) if at == t else skel.clip_pose(clip, at)
        h_a, t_a = proj(skel.pos[j]), proj(skel.tail(j))
        h_f, t_f = proj(pf[j]), proj(skel.tail(j, pf, rf))
        ang = math.atan2(*(t_f - h_f)[::-1]) - math.atan2(*(t_a - h_a)[::-1])
        return ang, h_f - h_a, h_a

    def lag_of(part: dict, default: float) -> float:
        lag = part.get("lag", default)
        if isinstance(lag, dict):
            lag = lag.get("frames", default)
        return float(lag or 0.0)

    out = {}
    for name, part in parts.items():
        bone = part.get("bone")
        if not bone or bone not in skel.index:
            continue
        ang, d, h_a = bone_move(bone, t - lag_of(part, 0.0))
        pivot = part.get("pivot", [float(h_a[0]), float(h_a[1])])
        out[name] = (ang, float(d[0]), float(d[1]), (float(pivot[0]), float(pivot[1])))
    for name, part in parts.items():          # a loose part without a bone follows its parent's bone, a frame or more late
        if name in out or not part.get("parent"):
            continue
        par = parts.get(part["parent"], {})
        bone = par.get("bone")
        if part["parent"] not in out or not bone or bone not in skel.index:
            continue
        ang, d, _ = bone_move(bone, t - lag_of(part, 1.0))
        out[name] = (ang * float(part.get("follow", 0.5)), float(d[0]), float(d[1]), tuple(part.get("pivot", out[part["parent"]][3])))
    return out


def render_clip_flat(doc: dict, clip: str, direction: str = "S", *, tracks: JointTracks | None = None, scale: float = 1.0, steps: int | None = None,
                     outline="auto", max_frames: int | None = None) -> dict:
    tracks = tracks or load_joints()
    skel = skeleton_for(doc, tracks)
    src = clip_source(doc, clip)
    n_src = tracks.frames(src); loop = tracks.loop(src)
    times = frame_times(n_src, max_frames, loop)
    mirror = direction in ("N", "NW", "NE")
    M = S.build_materials(doc, steps)
    frames, parts = [], []
    for k, t in enumerate(times):
        tf = flat_transforms(doc, skel, src, t, direction)
        d2 = dict(doc); d2["_view"] = direction
        fr = S.render_flat(d2, k, scale=scale, steps=steps, outline=outline, materials=M, transforms=tf, mirror=mirror)
        frames.append(fr.rgba); parts.append(fr.parts)
    return {"frames": frames, "fps": round(tracks.fps * len(times) / n_src, 3), "times": times, "loop": loop, "clip": clip, "direction": direction,
            "normal": [], "depth": [], "parts": parts, "ground_y": float(doc.get("ground", doc["size"][1] - 1)) * scale, "axis_x": doc["size"][0] / 2 * scale}


# ---------------------------------------------------------------------------------------------- the template
def template(height: float = 120.0, ground: float | None = None, cx: float | None = None, tracks: JointTracks | None = None) -> dict:
    """The author pose's bones for a figure of ``height`` units: the table an author (or describe-it) draws around."""
    tracks = tracks or load_joints()
    size = int(math.ceil(height * 1.15))
    ground = float(ground if ground is not None else size - 4)
    cx = float(cx if cx is not None else size / 2)
    sk = Skeleton(tracks, height, ground, cx)
    return {"size": [size, size], "height": height, "ground": ground, "axis": [cx, 0.0], "units_per_metre": round(sk.s, 3), "bones": sk.table()}


def stick_figure(doc_or_template: dict, scale: int = 3, pose: tuple | None = None) -> np.ndarray:
    """A picture of the author pose (or a clip pose): bones as lines, joints as dots, the ground as a line."""
    from PIL import Image, ImageDraw

    tracks = load_joints()
    if "bones" in doc_or_template:
        tpl = doc_or_template
        sk = Skeleton(tracks, tpl["height"], tpl["ground"], tpl["axis"][0])
        W, H = tpl["size"]
    else:
        sk = skeleton_for(doc_or_template, tracks)
        W, H = doc_or_template["size"]
    pos, rot = (sk.pos, sk.rot) if pose is None else pose
    im = Image.new("RGBA", (int(W * scale), int(H * scale)), (40, 40, 46, 255))
    d = ImageDraw.Draw(im)
    d.line([(0, sk.ground * scale), (W * scale, sk.ground * scale)], fill=(90, 90, 100, 255))
    for j, n in enumerate(sk.names):
        h = pos[j]; t_ = sk.tail(j, pos, rot)
        col = (230, 120, 90, 255) if n.endswith(".L") else (90, 170, 230, 255) if n.endswith(".R") else (220, 220, 200, 255)
        d.line([(h[0] * scale, h[1] * scale), (t_[0] * scale, t_[1] * scale)], fill=col, width=max(1, scale // 2))
        d.ellipse([(h[0] * scale - 2, h[1] * scale - 2), (h[0] * scale + 2, h[1] * scale + 2)], fill=col)
    return np.asarray(im)
