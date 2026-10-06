"""Joint tracks of the motion clips, read straight from the animation library with numpy (no Blender).

The bundled library (``assets/animations/quaternius_ual_standard.glb``, CC0) is a glTF binary: a node tree of
Rigify ``DEF-*`` bones and 46 animations keyed on them. :func:`export_joints` samples every clip at a fixed frame
rate, walks the hierarchy to world space and writes the result once to ``assets/animations/joints.json.gz``;
:func:`load_joints` reads that file back in a few milliseconds. The shape-sprite rig binds its primitives to these
tracks, so a character animates without any 3D tool installed.

Conventions of the exported data (the glTF ones): metres, Y up, the character facing +Z (toward a viewer at +Z),
its left hand on +X. A bone's direction is the +Y axis of its world rotation (Blender bones run along +Y from head
to tail); ``length`` is the distance to its first child, or a nominal value for the leaf bones (head, hands, toes).
Joint names drop the ``DEF-`` prefix: ``hips spine.001 spine.002 spine.003 neck head shoulder.L upper_arm.L
forearm.L hand.L thigh.L shin.L foot.L toe.L`` and the ``.R`` side. Finger bones are left out.
"""
from __future__ import annotations

import gzip
import json
import math
import struct
from pathlib import Path

import numpy as np

LIBRARY = Path(__file__).resolve().parent.parent / "assets" / "animations" / "quaternius_ual_standard.glb"
JOINTS_FILE = Path(__file__).resolve().parent.parent / "assets" / "animations" / "joints.json.gz"
FPS = 24
# the clips PixelForge names, the library clip each comes from, and whether it loops
CLIPS = {
    "idle": ("Idle_Loop", True),
    "walk": ("Walk_Formal_Loop", True),
    "walk_hunched": ("Walk_Loop", True),
    "run": ("Jog_Fwd_Loop", True),
    "sprint": ("Sprint_Loop", True),
    "attack": ("Sword_Attack", False),
    "attack_idle": ("Sword_Idle", True),
    "punch": ("Punch_Cross", False),
    "jab": ("Punch_Jab", False),
    "hit": ("Hit_Chest", False),
    "hit_head": ("Hit_Head", False),
    "death": ("Death01", False),
    "cast": ("Spell_Simple_Shoot", False),
    "cast_idle": ("Spell_Simple_Idle_Loop", True),
    "cast_enter": ("Spell_Simple_Enter", False),
    "roll": ("Roll", False),
    "crouch": ("Crouch_Idle_Loop", True),
    "crouch_walk": ("Crouch_Fwd_Loop", True),
    "jump": ("Jump_Loop", True),
    "torch_idle": ("Idle_Torch_Loop", True),
    "talk": ("Idle_Talking_Loop", True),
    "interact": ("Interact", False),
    "pickup": ("PickUp_Table", False),
    "dance": ("Dance_Loop", True),
}
LEAF_LENGTH = {"head": 0.20, "hand.L": 0.09, "hand.R": 0.09, "toe.L": 0.06, "toe.R": 0.06}
_CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
_N = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


# ------------------------------------------------------------------ glTF reading
def read_glb(path: str | Path) -> tuple[dict, bytes]:
    """The JSON chunk and the binary chunk of a .glb file."""
    data = Path(path).read_bytes()
    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError(f"{path} is not a glTF binary")
    off, js, bin_ = 12, None, b""
    while off < length:
        clen, ctype = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + clen]
        if ctype == 0x4E4F534A:
            js = json.loads(chunk)
        elif ctype == 0x004E4942:
            bin_ = bytes(chunk)
        off += 8 + clen
    if js is None:
        raise ValueError(f"{path} has no JSON chunk")
    return js, bin_


def accessor(js: dict, bin_: bytes, index: int) -> np.ndarray:
    a = js["accessors"][index]
    bv = js["bufferViews"][a["bufferView"]]
    n = _N[a["type"]]
    dt = np.dtype(_CT[a["componentType"]])
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride")
    if stride and stride != n * dt.itemsize:
        rows = [np.frombuffer(bin_, dt, n, off + k * stride) for k in range(a["count"])]
        arr = np.stack(rows)
    else:
        arr = np.frombuffer(bin_, dt, a["count"] * n, off).reshape(a["count"], n)
    return arr.astype(np.float64)


def quat_to_mat(q: np.ndarray) -> np.ndarray:
    """(..., 4) xyzw quaternions -> (..., 3, 3) rotation matrices."""
    q = np.asarray(q, float)
    q = q / (np.linalg.norm(q, axis=-1, keepdims=True) + 1e-12)          # the file rounds to 4 decimals: renormalise
    x, y, z, w = q[..., 0], q[..., 1], q[..., 2], q[..., 3]
    m = np.empty(q.shape[:-1] + (3, 3))
    m[..., 0, 0] = 1 - 2 * (y * y + z * z); m[..., 0, 1] = 2 * (x * y - z * w); m[..., 0, 2] = 2 * (x * z + y * w)
    m[..., 1, 0] = 2 * (x * y + z * w); m[..., 1, 1] = 1 - 2 * (x * x + z * z); m[..., 1, 2] = 2 * (y * z - x * w)
    m[..., 2, 0] = 2 * (x * z - y * w); m[..., 2, 1] = 2 * (y * z + x * w); m[..., 2, 2] = 1 - 2 * (x * x + y * y)
    return m


def mat_to_quat(m: np.ndarray) -> np.ndarray:
    """(3, 3) rotation matrix -> xyzw quaternion (unit)."""
    m = np.asarray(m, float)
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1.0) * 2
        q = [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        q = [0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    elif m[1, 1] > m[2, 2]:
        s = np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        q = [(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    else:
        s = np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
        q = [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s]
    q = np.array(q)
    return q / np.linalg.norm(q)


def _slerp(q0: np.ndarray, q1: np.ndarray, t: float) -> np.ndarray:
    d = float(np.dot(q0, q1))
    if d < 0:
        q1, d = -q1, -d
    if d > 0.9995:
        q = q0 + t * (q1 - q0)
    else:
        th = np.arccos(d)
        q = (np.sin((1 - t) * th) * q0 + np.sin(t * th) * q1) / np.sin(th)
    return q / np.linalg.norm(q)


def _sample(times: np.ndarray, values: np.ndarray, t: float, rotation: bool) -> np.ndarray:
    if t <= times[0]:
        return values[0]
    if t >= times[-1]:
        return values[-1]
    i = int(np.searchsorted(times, t, side="right") - 1)
    f = (t - times[i]) / max(times[i + 1] - times[i], 1e-9)
    if rotation:
        return _slerp(values[i], values[i + 1], f)
    return values[i] * (1 - f) + values[i + 1] * f


def _local(t, r, s) -> np.ndarray:
    m = np.eye(4)
    m[:3, :3] = quat_to_mat(r) * np.asarray(s)[None, :]
    m[:3, 3] = t
    return m


# ------------------------------------------------------------------ export
def export_joints(glb: str | Path = LIBRARY, out: str | Path = JOINTS_FILE, fps: int = FPS, clips: dict | None = None) -> dict:
    """Sample every clip of the library at ``fps`` and write the joint tracks to ``out`` (gzipped JSON).

    Returns a summary dict. ``clips`` maps PixelForge clip names to ``(library clip, loop)``; the default is
    :data:`CLIPS`."""
    js, bin_ = read_glb(glb)
    nodes = js["nodes"]
    parent = {i: None for i in range(len(nodes))}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i
    rest = [(np.array(n.get("translation", [0, 0, 0]), float), np.array(n.get("rotation", [0, 0, 0, 1]), float), np.array(n.get("scale", [1, 1, 1]), float)) for n in nodes]
    names = [n.get("name", f"node{i}") for i, n in enumerate(nodes)]
    keep = [i for i, nm in enumerate(names) if nm.startswith("DEF-") and not any(f in nm for f in ("f_index", "f_middle", "f_ring", "f_pinky", "thumb"))]
    short = {i: names[i][4:] for i in keep}
    order = _topo(parent, keep)
    joints = [short[i] for i in order]
    jparent = [joints.index(short[parent_of(parent, i, keep)]) if parent_of(parent, i, keep) is not None else -1 for i in order]
    anims = {a["name"]: a for a in js.get("animations", [])}
    clips = clips or CLIPS

    def world_all(local_fn) -> np.ndarray:
        W = {}
        def world(i):
            if i in W:
                return W[i]
            m = local_fn(i)
            p = parent[i]
            W[i] = (world(p) @ m) if p is not None else m
            return W[i]
        return np.stack([world(i) for i in order])

    rest_w = world_all(lambda i: _local(*rest[i]))
    lengths = []
    for k, i in enumerate(order):
        kids = [c for c in nodes[i].get("children", []) if c in keep]
        if kids:
            kid = kids[0] if len(kids) == 1 else next((c for c in kids if "neck" in names[c] or "spine" in names[c]), kids[0])
            lengths.append(float(np.linalg.norm(rest_w[order.index(kid)][:3, 3] - rest_w[k][:3, 3])))
        else:
            lengths.append(LEAF_LENGTH.get(joints[k], 0.1))
    data = {
        "source": Path(glb).name, "licence": "CC0 1.0 (Quaternius Universal Animation Library)", "fps": fps,
        "units": "metres", "up": "y", "forward": "z (the character faces +z; its left hand is on +x)",
        "joints": joints, "parents": jparent, "lengths": [round(v, 4) for v in lengths],
        "rest": {"pos": _r(rest_w[:, :3, 3]), "rot": _r(np.stack([mat_to_quat(m[:3, :3]) for m in rest_w]))},
        "clips": {},
    }
    for name, (lib, loop) in clips.items():
        a = anims.get(lib)
        if a is None:
            continue
        chans = {}
        for ch in a["channels"]:
            sm = a["samplers"][ch["sampler"]]
            chans[(ch["target"]["node"], ch["target"]["path"])] = (accessor(js, bin_, sm["input"])[:, 0], accessor(js, bin_, sm["output"]))
        duration = max(float(t.max()) for t, _ in chans.values())
        n = int(round(duration * fps)) + (0 if loop else 1)
        n = max(n, 2)
        pos, rot = [], []
        for f in range(n):
            t = f / fps
            def local(i, t=t):
                tr, ro, sc = rest[i]
                if (i, "translation") in chans:
                    tr = _sample(*chans[(i, "translation")], t, False)
                if (i, "rotation") in chans:
                    ro = _sample(*chans[(i, "rotation")], t, True)
                if (i, "scale") in chans:
                    sc = _sample(*chans[(i, "scale")], t, False)
                return _local(tr, ro, sc)
            w = world_all(local)
            pos.append(w[:, :3, 3])
            rot.append(np.stack([mat_to_quat(m[:3, :3] / np.linalg.norm(m[:3, 0])) for m in w]))
        data["clips"][name] = {"library": lib, "loop": bool(loop), "frames": n, "seconds": round(duration, 4),
                               "pos": _r(np.stack(pos)), "rot": _r(np.stack(rot))}
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out, "wt", compresslevel=9) as fh:
        json.dump(data, fh, separators=(",", ":"))
    return {"ok": True, "file": str(out), "joints": len(joints), "clips": {k: v["frames"] for k, v in data["clips"].items()}, "fps": fps,
            "bytes": out.stat().st_size}


def parent_of(parent: dict, i: int, keep: list[int]) -> int | None:
    p = parent[i]
    while p is not None and p not in keep:
        p = parent[p]
    return p


def _topo(parent: dict, keep: list[int]) -> list[int]:
    depth = {}
    def d(i):
        if i not in depth:
            p = parent_of(parent, i, keep)
            depth[i] = 0 if p is None else d(p) + 1
        return depth[i]
    return sorted(keep, key=lambda i: (d(i), i))


def _r(a: np.ndarray, nd: int = 4) -> list:
    return np.round(np.asarray(a, float), nd).tolist()


# ------------------------------------------------------------------ loading
class JointTracks:
    """The exported tracks: ``names``, ``parents``, ``lengths``, ``rest_pos`` (J, 3), ``rest_rot`` (J, 3, 3) and
    per clip ``pos(clip)`` (F, J, 3) and ``rot(clip)`` (F, J, 3, 3), metres, Y up, facing +Z."""

    def __init__(self, data: dict):
        self.data = data
        self.fps = int(data["fps"])
        self.names: list[str] = list(data["joints"])
        self.index = {n: i for i, n in enumerate(self.names)}
        self.parents: list[int] = list(data["parents"])
        self.lengths = np.array(data["lengths"], float)
        self.rest_pos = np.array(data["rest"]["pos"], float)
        self.rest_rot = quat_to_mat(np.array(data["rest"]["rot"], float))
        self._cache: dict[str, tuple[np.ndarray, np.ndarray]] = {}

    @property
    def clips(self) -> list[str]:
        return list(self.data["clips"])

    def has(self, clip: str) -> bool:
        return clip in self.data["clips"]

    def loop(self, clip: str) -> bool:
        return bool(self.data["clips"][clip]["loop"])

    def frames(self, clip: str) -> int:
        return int(self.data["clips"][clip]["frames"])

    def _get(self, clip: str) -> tuple[np.ndarray, np.ndarray]:
        if clip not in self._cache:
            c = self.data["clips"][clip]
            self._cache[clip] = (np.array(c["pos"], float), quat_to_mat(np.array(c["rot"], float)))
        return self._cache[clip]

    def pos(self, clip: str) -> np.ndarray:
        return self._get(clip)[0]

    def rot(self, clip: str) -> np.ndarray:
        return self._get(clip)[1]

    def pose(self, clip: str, frame: int) -> tuple[np.ndarray, np.ndarray]:
        """(positions (J, 3), rotations (J, 3, 3)) of one frame; frames wrap for loops and clamp otherwise."""
        p, r = self._get(clip)
        n = len(p)
        f = frame % n if self.loop(clip) else min(max(frame, 0), n - 1)
        return p[f], r[f]

    def pose_at(self, clip: str, t: float) -> tuple[np.ndarray, np.ndarray]:
        """The pose at a fractional frame: positions interpolated, rotations slerped between the two nearest
        frames (loops wrap, others clamp), so a clip can be resampled to any frame count without stepping."""
        p, r = self._get(clip)
        n = len(p)
        if self.loop(clip):
            t = t % n
            i0 = int(math.floor(t)); i1 = (i0 + 1) % n
        else:
            t = min(max(t, 0.0), n - 1)
            i0 = int(math.floor(t)); i1 = min(i0 + 1, n - 1)
        f = t - math.floor(t)
        if f < 1e-6 or i0 == i1:
            return p[i0], r[i0]
        q = np.array(self.data["clips"][clip]["rot"], float)[[i0, i1]]
        rot = np.stack([quat_to_mat(_slerp(q[0, j], q[1, j], f)) for j in range(len(self.names))])
        return p[i0] * (1 - f) + p[i1] * f, rot

    def height(self) -> float:
        """Top of the head in the rest pose, metres (head joint plus its nominal length)."""
        h = self.index["head"]
        top = self.rest_pos[h] + self.rest_rot[h][:, 1] * self.lengths[h]
        return float(top[1])

    def summary(self) -> dict:
        return {"fps": self.fps, "joints": self.names, "clips": {c: {"frames": self.frames(c), "loop": self.loop(c)} for c in self.clips},
                "height_m": round(self.height(), 3)}


def load_joints(path: str | Path = JOINTS_FILE) -> JointTracks:
    path = Path(path)
    if not path.exists():
        if LIBRARY.exists():
            export_joints(LIBRARY, path)
        else:
            raise FileNotFoundError(f"no joint tracks at {path} and no animation library at {LIBRARY} to export them from")
    with gzip.open(path, "rt") as fh:
        tr = JointTracks(json.load(fh))
    from .keyed import add_keyed      # posed clips (assets/animations/keyed) beside the library's
    add_keyed(tr)
    return tr
