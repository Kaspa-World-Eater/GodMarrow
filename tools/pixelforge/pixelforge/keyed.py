"""Keyed clips: animation posed key by key, the way pixel animators work (pose to pose), instead of motion capture.

The library's mocap clips (joints.py) move like a generic person: even spacing, no held anticipation, no smear, arcs
that wander. A keyed clip is a list of poses, each held for a number of frames, so a blow can be what the art study
asks for (tools/art_study/STUDY.md): anticipation held, the strike over in a frame or two, the follow-through past
the target and held, a quick recovery.

A pose starts from a base (a frame of a library clip, e.g. the sword-ready idle) and turns joints about themselves.
Each turn is given in WORLD terms of the character (glTF: Y up, facing +Z, its left hand on +X):
  ["y", 30]  turn about the vertical: the body twists toward its left (positive) / right
  ["x", 20]  pitch: the part tips forward (positive) / back
  ["z", 15]  roll: the part tips toward the character's right side (positive) / left
A turn carries everything below that joint with it (turning the spine turns the arms and head). Turns are applied
parent first, so "hips" then "spine.002" then "upper_arm.R" compose as a body would.
``aim`` points a bone along a world direction ({"upper_arm.L": [0.2, -0.8, 0.4]}: down and a little forward),
applied after the turns; it is the easier control for arms and legs.
``move`` shifts the whole body (hips) in metres: a lunge, a crouch.

Files: assets/animations/keyed/<clip>.json
  {"base": ["attack_idle", 0], "loop": false,
   "keys": [{"hold": 3, "move": [0, -0.05, 0], "turn": {"spine.002": [["y", -35]], "upper_arm.R": [["z", -120]]}}, ...]}
A key may start from its own library frame instead (``"from": ["attack", 6]``): the strongest poses of a mocap
clip, picked one per game frame and pushed further, is how a weightless even-spaced clip becomes a keyed one.
``load_joints`` adds every keyed clip to the tracks, so ``clips: {"attack": "strike"}`` in a shapes file plays it.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

KEYED_DIR = Path(__file__).resolve().parent.parent / "assets" / "animations" / "keyed"
AXES = {"x": np.array([1.0, 0, 0]), "y": np.array([0, 1.0, 0]), "z": np.array([0, 0, 1.0])}


def _rot(axis: str, deg: float) -> np.ndarray:
    a = AXES[axis]
    t = math.radians(deg)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]], float)
    return np.eye(3) + math.sin(t) * K + (1 - math.cos(t)) * (K @ K)


def _children(parents: list[int]) -> list[list[int]]:
    ch: list[list[int]] = [[] for _ in parents]
    for i, p in enumerate(parents):
        if p >= 0:
            ch[p].append(i)
    return ch


def _subtree(ch: list[list[int]], j: int) -> list[int]:
    out, stack = [], [j]
    while stack:
        k = stack.pop()
        out.append(k)
        stack.extend(ch[k])
    return out


def _depth(parents: list[int], j: int) -> int:
    d = 0
    while parents[j] >= 0:
        j = parents[j]
        d += 1
    return d


def pose(tracks, base_pos: np.ndarray, base_rot: np.ndarray, key: dict) -> tuple[np.ndarray, np.ndarray]:
    """Base world transforms (J,3) and (J,3,3) turned by a key's ``turn`` and shifted by its ``move``."""
    pos = base_pos.copy()
    rot = base_rot.copy()
    ch = _children(tracks.parents)
    turns = key.get("turn", {})
    for name in sorted(turns, key=lambda n: _depth(tracks.parents, tracks.index[n])):
        j = tracks.index[name]
        R = np.eye(3)
        for ax, deg in turns[name]:
            R = _rot(ax, float(deg)) @ R
        piv = pos[j].copy()
        for k in _subtree(ch, j):
            pos[k] = piv + R @ (pos[k] - piv)
            rot[k] = R @ rot[k]
    # aims: point a bone (its head-to-tail, +Y) along a world direction, carrying what hangs below it; parent first
    aims = key.get("aim", {})
    for name in sorted(aims, key=lambda n: _depth(tracks.parents, tracks.index[n])):
        j = tracks.index[name]
        cur = rot[j][:, 1] / (np.linalg.norm(rot[j][:, 1]) + 1e-12)
        tgt = np.array(aims[name], float)
        tgt = tgt / (np.linalg.norm(tgt) + 1e-12)
        ax = np.cross(cur, tgt)
        sn = np.linalg.norm(ax)
        if sn < 1e-6:
            continue
        ang = math.atan2(sn, float(np.dot(cur, tgt)))
        a3 = ax / sn
        K = np.array([[0, -a3[2], a3[1]], [a3[2], 0, -a3[0]], [-a3[1], a3[0], 0]], float)
        R = np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * (K @ K)
        piv = pos[j].copy()
        for k in _subtree(ch, j):
            pos[k] = piv + R @ (pos[k] - piv)
            rot[k] = R @ rot[k]
    mv = np.array(key.get("move", [0, 0, 0]), float)
    if np.any(mv):
        pos = pos + mv
    return pos, rot


def build(tracks, spec: dict) -> dict:
    """A keyed clip spec to the stored clip form (pos lists and quaternions per frame)."""
    from .joints import mat_to_quat
    bc, bf = spec.get("base", ["idle", 0])
    bp, br = tracks.pose(bc, int(bf))
    P, Q = [], []
    for key in spec["keys"]:
        if "from" in key:                       # this key starts from another library frame (a chosen mocap pose)
            kp, kr = tracks.pose(key["from"][0], int(key["from"][1]))
        else:
            kp, kr = bp, br
        p, r = pose(tracks, kp, kr, key)
        q = np.array([mat_to_quat(m) for m in r])
        for _ in range(max(1, int(key.get("hold", 1)))):
            P.append(np.round(p, 5).tolist())
            Q.append(np.round(q, 5).tolist())
    return {"library": "keyed", "loop": bool(spec.get("loop", False)), "frames": len(P),
            "seconds": round(len(P) / float(tracks.fps), 4), "pos": P, "rot": Q, "keys": [int(k.get("hold", 1)) for k in spec["keys"]]}


def add_keyed(tracks) -> None:
    """Every keyed clip in assets/animations/keyed into the tracks (they override a library clip of the same name)."""
    if not KEYED_DIR.exists():
        return
    for f in sorted(KEYED_DIR.glob("*.json")):
        spec = json.loads(f.read_text(encoding="utf8"))
        tracks.data["clips"][f.stem] = build(tracks, spec)
        tracks._cache.pop(f.stem, None)
