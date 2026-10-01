"""Export the animation library's joint tracks, once, so the pixel path never needs Blender.

Run inside Blender::

    blender -b --python export_joints.py -- --library quaternius_ual_standard.glb --out joints.json.gz
        [--clips Idle_Loop,Walk_Formal_Loop,...] [--all]

For every clip the forge maps (``LIBRARY_CLIPS`` below mirrors ``rig_character.py``) the world position of
the joints that matter is written per frame, normalised to the mannequin's height (floor = 0, top of the
skull = 1; the character faces -Y, its left side is +X, Z is up).  The result is a small gzip JSON that
``pixelforge/puppet.py`` loads with the standard library alone.

No Pillow here (Blender's Python has none); no numpy either, so the bundled interpreter's numpy state
does not matter.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # type: ignore

from pf_common import script_args  # noqa: E402

# joint name -> (DEF bone, "head" | "tail")
JOINTS = {
    "hips": ("DEF-hips", "head"),
    "spine": ("DEF-spine.001", "head"),
    "chest": ("DEF-spine.003", "head"),
    "neck": ("DEF-neck", "head"),
    "head": ("DEF-head", "head"),
    "head_top": ("DEF-head", "tail"),
    "shoulder_L": ("DEF-upper_arm.L", "head"),
    "elbow_L": ("DEF-forearm.L", "head"),
    "wrist_L": ("DEF-hand.L", "head"),
    "hand_L": ("DEF-f_middle.01.L", "tail"),
    "shoulder_R": ("DEF-upper_arm.R", "head"),
    "elbow_R": ("DEF-forearm.R", "head"),
    "wrist_R": ("DEF-hand.R", "head"),
    "hand_R": ("DEF-f_middle.01.R", "tail"),
    "hip_L": ("DEF-thigh.L", "head"),
    "knee_L": ("DEF-shin.L", "head"),
    "ankle_L": ("DEF-foot.L", "head"),
    "toe_L": ("DEF-toe.L", "head"),
    "toe_tip_L": ("DEF-toe.L", "tail"),
    "hip_R": ("DEF-thigh.R", "head"),
    "knee_R": ("DEF-shin.R", "head"),
    "ankle_R": ("DEF-foot.R", "head"),
    "toe_R": ("DEF-toe.R", "head"),
    "toe_tip_R": ("DEF-toe.R", "tail"),
}

# forge clip -> (library action, loop); the same table as rig_character.LIBRARY_CLIPS
LIBRARY_CLIPS = {
    "idle": ("Idle_Loop", True),
    "walk": ("Walk_Formal_Loop", True),
    "walk_hunched": ("Walk_Loop", True),
    "run": ("Jog_Fwd_Loop", True),
    "sprint": ("Sprint_Loop", True),
    "attack": ("Sword_Attack", False),
    "attack_idle": ("Sword_Idle", True),
    "punch": ("Punch_Cross", False),
    "hit": ("Hit_Chest", False),
    "death": ("Death01", False),
    "cast": ("Spell_Simple_Shoot", False),
    "cast_idle": ("Spell_Simple_Idle_Loop", True),
    "roll": ("Roll", False),
    "crouch": ("Crouch_Idle_Loop", True),
    "crouch_walk": ("Crouch_Fwd_Loop", True),
    "jump": ("Jump_Loop", True),
    "torch_idle": ("Idle_Torch_Loop", True),
    "interact": ("Interact", False),
    "pickup": ("PickUp_Table", False),
}


def mesh_height(arm) -> tuple[float, float]:
    """Floor and top of the skinned body: the meshes the armature deforms (the library also carries a stray
    icosphere round the origin, which must not set the floor)."""
    lo, hi = float("inf"), float("-inf")
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        skinned = o.parent == arm or any(m.type == "ARMATURE" and m.object == arm for m in o.modifiers)
        if not skinned:
            continue
        for v in o.data.vertices:
            z = (o.matrix_world @ v.co).z
            lo, hi = min(lo, z), max(hi, z)
    if lo == float("inf"):
        return 0.0, 1.0
    return lo, hi


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--library", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--clips", help="comma list of library action names (default: the forge's mapped clips)")
    p.add_argument("--all", action="store_true", help="every action in the library")
    a = script_args(p)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(a.library))
    arms = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not arms:
        raise SystemExit("no armature in the library")
    arm = arms[0]
    floor, top = mesh_height(arm)
    height = max(top - floor, 1e-6)
    missing = [j for j, (b, _) in JOINTS.items() if b not in arm.pose.bones]
    if missing:
        raise SystemExit(f"bones missing for joints {missing}")

    def sample() -> list[list[float]]:
        out = []
        for name, (bone, end) in JOINTS.items():
            pb = arm.pose.bones[bone]
            v = arm.matrix_world @ (pb.head if end == "head" else pb.tail)
            out.append([round(v.x / height, 4), round(v.y / height, 4), round((v.z - floor) / height, 4)])
        return out

    scene = bpy.context.scene
    fps = float(scene.render.fps)
    if a.all:
        wanted = sorted(act.name for act in bpy.data.actions)
    elif a.clips:
        wanted = [c.strip() for c in a.clips.split(",") if c.strip()]
    else:
        wanted = sorted({lib for lib, _ in LIBRARY_CLIPS.values()} | {"A_TPose"})
    loops = {lib: loop for lib, loop in LIBRARY_CLIPS.values()}
    arm.animation_data_create()
    clips = {}
    for name in wanted:
        act = bpy.data.actions.get(name)
        if act is None:
            print(f"PF_WARN no action {name}")
            continue
        arm.animation_data.action = act
        start, end = act.frame_range
        frames = list(range(int(start), int(end) + 1))
        tracks = []
        for f in frames:
            scene.frame_set(f)
            tracks.append(sample())
        clips[name] = {"fps": fps, "loop": bool(loops.get(name, name.endswith("_Loop"))), "frames": tracks}
        print(f"PF_INFO {name}: {len(frames)} frames")
    arm.animation_data.action = None
    # the rest pose (T-pose), for the rest bone lengths
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    scene.frame_set(0)
    rest = sample()
    data = {
        "version": 1,
        "source": os.path.basename(a.library),
        "licence": "CC0 1.0 (Quaternius Universal Animation Library)",
        "axes": "x = the figure's left, y = behind it (it faces -y), z = up; floor 0, top of the skull 1",
        "height": height,
        "joints": list(JOINTS),
        "rest": rest,
        "map": {k: v[0] for k, v in LIBRARY_CLIPS.items()},
        "clips": clips,
    }
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with gzip.open(out, "wt", encoding="utf-8") as fh:
        json.dump(data, fh, separators=(",", ":"))
    print(f"PF_OK out={out} clips={len(clips)} frames={sum(len(c['frames']) for c in clips.values())} bytes={os.path.getsize(out)}")


if __name__ == "__main__":
    main()
