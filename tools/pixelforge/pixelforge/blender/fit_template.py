"""Humanoid-first model: fit the library mannequin to the art, then paint it.

Instead of carving a hull from silhouettes and auto-rigging it, start from the
bundled CC0 mannequin (Quaternius UAL: a clean human mesh already skinned to the
armature that drives its 46 clips), then **conform it to the painting**:

1. scale the mannequin to the character's height, feet on the ground;
2. fuse the jointed doll (102 loose segments and joint balls) into one
   watertight skin (voxel remesh), carrying the skin weights over;
3. pose the arms down into the sheet's A-pose (the angle whose silhouette best
   matches the carved hull), shrink-wrap the posed skin onto the hull carved
   from the painting, and carry each vertex's displacement back to the rest
   pose through its heaviest bone, so the clips (authored against the rest
   pose) still play;
4. project the front / back / side / three-quarter art onto it exactly as the
   hull gets painted (``pf_common``).

The result keeps the mannequin's topology and weights, so every library clip
plays directly: no retargeting, clean knees and elbows, hands that are hands.
Bones are renamed to Mixamo names so the renderer and the rest of the pipeline
treat it like any other rig.

Runs inside Blender (no Pillow).  ``PF_OK`` on success.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pf_common import (  # noqa: E402
    UV_BACK, UV_FRONT, UV_QUARTER, UV_SIDE, assign_material, build_projection_material, deg, load_image,
    make_ortho_camera, ortho_scale_for_height, script_args,
)
from rig_character import LIBRARY_MAP, R  # noqa: E402
from build_mesh import build_hull_from_spec  # noqa: E402



# ------------------------------------------------------------------ mannequin
def import_mannequin(path: str):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    mesh = next(o for o in new if o.type == "MESH" and o.vertex_groups and o.find_armature() == arm)
    for o in new:
        if o not in (arm, mesh):
            bpy.data.objects.remove(o, do_unlink=True)
    if arm.animation_data:   # the import leaves a clip playing; the fit needs the bare rest pose
        arm.animation_data.action = None
    for o in (arm, mesh):   # bake object transforms into the data so everything is in world metres
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return arm, mesh


def fuse(arm, mesh, voxel: float):
    """One watertight skin from the jointed doll; weights carried over by nearest vertex."""
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.duplicate()
    fused = bpy.context.view_layer.objects.active
    fused.name = "pf_skin"
    for mod in list(fused.modifiers):
        fused.modifiers.remove(mod)
    rm = fused.modifiers.new("pf_remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    rm.use_smooth_shade = True
    bpy.ops.object.modifier_apply(modifier=rm.name)
    sm = fused.modifiers.new("pf_round", "SMOOTH")
    sm.factor = 0.8
    sm.iterations = 3
    bpy.ops.object.modifier_apply(modifier=sm.name)
    # weights: nearest vertex of the doll
    bpy.ops.object.select_all(action="DESELECT")
    fused.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.data_transfer(data_type="VGROUP_WEIGHTS", vert_mapping="NEAREST", layers_select_src="ALL", layers_select_dst="NAME", use_create=True)
    bpy.context.view_layer.objects.active = fused
    am = fused.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    fused.parent = arm
    bpy.data.objects.remove(mesh, do_unlink=True)
    return fused


ARM_BONES = {"L": LIBRARY_MAP["LeftArm"], "R": LIBRARY_MAP["RightArm"]}


def pose_arms(arm, angle_deg: float) -> None:
    """Swing the upper arms down from the T-pose by ``angle_deg`` about the world Y axis (an A-pose)."""
    from mathutils import Matrix

    for side, name in ARM_BONES.items():
        pb = arm.pose.bones[name]
        rest = arm.matrix_world @ arm.data.bones[name].matrix_local
        head = rest.translation.copy()
        sign = 1.0 if head.x > 0 else -1.0   # a +X arm swings down with +angle about Y, a -X arm with -angle
        rot = Matrix.Translation(head) @ Matrix.Rotation(np.radians(angle_deg) * sign, 4, "Y") @ Matrix.Translation(-head)
        pb.matrix_basis = rest.inverted() @ rot @ rest   # parents unposed: pose world = rest @ basis
    bpy.context.view_layer.update()


def clear_pose(arm) -> None:
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()


def evaluated_vertices(mesh) -> np.ndarray:
    dg = bpy.context.evaluated_depsgraph_get()
    return np.array([v.co[:] for v in mesh.evaluated_get(dg).data.vertices], dtype=np.float64)


def dominant_rotations(arm, mesh) -> np.ndarray:
    """Per-vertex 3x3 rotation of the current pose: that of the vertex's heaviest bone (pose @ rest^-1)."""
    names = [b.name for b in arm.data.bones]
    mats = np.array([(arm.pose.bones[n].matrix @ arm.data.bones[n].matrix_local.inverted()).to_3x3()[:] for n in names])
    group_to_bone = {g.index: names.index(g.name) for g in mesh.vertex_groups if g.name in names}
    out = np.tile(np.eye(3), (len(mesh.data.vertices), 1, 1))
    for i, v in enumerate(mesh.data.vertices):
        best = max((g for g in v.groups if g.group in group_to_bone), key=lambda g: g.weight, default=None)
        if best is not None:
            out[i] = mats[group_to_bone[best.group]]
    return out


def inside_score(pts: np.ndarray, vox: np.ndarray, width: float, depth: float, height: float) -> float:
    """Fraction of points whose front-view cell (x, z) is inside the hull silhouette."""
    rows, _, cols = vox.shape
    front = vox.any(axis=1)   # z, x
    xi = np.clip(((pts[:, 0] + width / 2) / width * cols).astype(int), 0, cols - 1)
    zi = np.clip(((height - pts[:, 2]) / height * rows).astype(int), 0, rows - 1)
    return float(front[zi, xi].mean())


def arm_vertices(arm, mesh) -> np.ndarray:
    """Indices of the vertices the arm bones drive most (the only part a pose angle moves)."""
    arm_bones = {LIBRARY_MAP[k] for k in ("LeftArm", "LeftForeArm", "LeftHand", "RightArm", "RightForeArm", "RightHand")}
    groups = {g.index for g in mesh.vertex_groups if g.name in arm_bones or any(g.name.startswith(b) for b in arm_bones)}
    out = []
    for i, v in enumerate(mesh.data.vertices):
        best = max(v.groups, key=lambda g: g.weight, default=None)
        if best is not None and best.group in groups:
            out.append(i)
    return np.array(out, dtype=int)


def legs_visible(vox: np.ndarray) -> bool:
    """Two silhouette runs at knee height in the front view = the legs show (no robe)."""
    rows = vox.shape[0]
    band = vox[int(rows * 0.72):int(rows * 0.9)].any(axis=1)   # z, x
    def nruns(occ):
        return int(np.count_nonzero(np.diff(np.concatenate([[0], occ.astype(int), [0]])) == 1))
    return int(np.median([nruns(r) for r in band])) >= 2


def fcurves(action):
    if hasattr(action, "fcurves") and action.fcurves is not None and len(action.fcurves):
        return action.fcurves
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for cb in strip.channelbags:
                out.extend(cb.fcurves)
    return out


def rename_bones(arm) -> None:
    """Library (Rigify DEF-) names -> Mixamo names, in the bones and in every action's paths."""
    table = {lib: R + ours for ours, lib in LIBRARY_MAP.items() if lib in arm.data.bones}
    for old, new in table.items():
        arm.data.bones[old].name = new
    for act in bpy.data.actions:
        for fc in fcurves(act):
            for old, new in table.items():
                fc.data_path = fc.data_path.replace(f'["{old}"]', f'["{new}"]')
            if fc.group and fc.group.name in table:
                fc.group.name = table[fc.group.name]


def scale_location_curves(scale: float) -> None:
    for act in bpy.data.actions:
        for fc in fcurves(act):
            if fc.data_path.endswith("location"):
                for kp in fc.keyframe_points:
                    kp.co[1] *= scale
                    kp.handle_left[1] *= scale
                    kp.handle_right[1] *= scale


def project_posed(mesh, posed: np.ndarray, image, uv_name: str, camera) -> None:
    """The UV projection ``pf_common.project_image_onto`` makes, but from given (posed) vertex positions:
    the art shows the A-pose, the rest pose is a T, so the paint is laid on while the arms are down."""
    bpy.context.view_layer.update()   # a camera made a moment ago has no world matrix until the scene updates
    inv = np.array(camera.matrix_world.inverted()[:])
    pc = (inv @ np.c_[posed, np.ones(len(posed))].T).T[:, :3]
    iw, ih = image.size
    scale = camera.data.ortho_scale
    sx, sy = (scale, scale * ih / iw) if iw >= ih else (scale * iw / ih, scale)
    uv = np.c_[0.5 + pc[:, 0] / sx, 0.5 + pc[:, 1] / sy]
    if uv_name not in mesh.data.uv_layers:
        mesh.data.uv_layers.new(name=uv_name)
    layer = mesh.data.uv_layers[uv_name]
    loop_v = np.empty(len(mesh.data.loops), dtype=int)
    mesh.data.loops.foreach_get("vertex_index", loop_v)
    layer.data.foreach_set("uv", uv[loop_v].astype(np.float32).ravel())


# ------------------------------------------------------------------ main
def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--library", required=True, help="the mannequin + clips .glb")
    p.add_argument("--spec", required=True, help="hull spec json (voxels, aspect, thickness)")
    p.add_argument("--front", required=True)
    p.add_argument("--back")
    p.add_argument("--side")
    p.add_argument("--quarter")
    p.add_argument("--shade", type=float, default=0.0)
    p.add_argument("--arm-angle", type=float, default=0.0, help="A-pose arm swing from the T-pose, degrees (0 = pick the best of 35/50/65/80)")
    p.add_argument("--voxel", type=float, default=0.0, help="remesh voxel size in metres (0 = height/90)")
    p.add_argument("--force", action="store_true", help="fit even when the silhouette shows no legs (a robe): normally that falls back to the hull")
    p.add_argument("--height", type=float, default=1.8)
    p.add_argument("--name", default="Character")
    p.add_argument("--out", required=True)
    p.add_argument("--fbx")
    a = script_args(p)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    spec = json.load(open(a.spec))
    if spec.get("mode") != "hull":
        raise SystemExit("PF_ERR the template fit needs a hull spec (front + side views)")
    vox = np.array([[[c == "1" for c in row] for row in layer] for layer in spec["voxels"]], dtype=bool)
    if not a.force and not legs_visible(vox):
        print("PF_FALLBACK hull: the silhouette shows no legs (a robe or a skirt); the carved hull suits it better")
        return
    width, depth = a.height * spec["aspect"], a.height * spec["thickness"]
    arm, doll = import_mannequin(os.path.abspath(a.library))

    # 1. normalise: feet at z=0, centred, height = a.height (mesh, bones and the clips' root motion)
    verts0 = np.array([v.co[:] for v in doll.data.vertices], dtype=np.float64)
    lo, hi = verts0.min(axis=0), verts0.max(axis=0)
    s = a.height / (hi[2] - lo[2])
    shift = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])
    for v in doll.data.vertices:
        v.co = ((np.array(v.co[:]) - shift) * s).tolist()
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in arm.data.edit_bones:
        eb.head = ((np.array(eb.head[:]) - shift) * s).tolist()
        eb.tail = ((np.array(eb.tail[:]) - shift) * s).tolist()
    bpy.ops.object.mode_set(mode="OBJECT")
    scale_location_curves(s)

    # 2. one skin
    mesh = fuse(arm, doll, a.voxel or a.height / 90)
    rest = np.array([v.co[:] for v in mesh.data.vertices], dtype=np.float64)

    # 3. A-pose, shrink-wrap onto the hull, back to rest
    hull, _ = build_hull_from_spec(spec, a.height, "pf_hull")
    best = None
    arm_idx = arm_vertices(arm, mesh)
    for angle in ((a.arm_angle,) if a.arm_angle else tuple(range(25, 86, 5))):
        pose_arms(arm, angle)
        score = inside_score(evaluated_vertices(mesh)[arm_idx], vox, width, depth, a.height)
        if best is None or score > best[0]:
            best = (score, float(angle))
    score, angle = best
    pose_arms(arm, angle)
    posed = evaluated_vertices(mesh)
    sw = mesh.modifiers.new("pf_wrap", "SHRINKWRAP")
    sw.target = hull
    sw.wrap_method = "NEAREST_SURFACEPOINT"
    wrapped = evaluated_vertices(mesh)
    mesh.modifiers.remove(sw)
    rot = dominant_rotations(arm, mesh)
    disp = wrapped - posed
    fitted = rest + np.einsum("nji,nj->ni", rot, disp)   # R^-1 = R^T
    for v, co in zip(mesh.data.vertices, fitted):
        v.co = co.tolist()
    mesh.data.update()
    clear_pose(arm)
    bpy.data.objects.remove(hull, do_unlink=True)
    mesh.name = mesh.data.name = a.name
    moved = float(np.abs(disp).max())
    print(f"PF_INFO arm angle {angle:.0f} deg (inside {score:.2f}), max wrap {moved:.3f} m, {len(mesh.data.vertices)} verts")

    # 4. paint, exactly as the hull is painted, but with the model in the painting's pose
    pose_arms(arm, angle)
    posed = evaluated_vertices(mesh)
    front = load_image(os.path.abspath(a.front))
    back = load_image(os.path.abspath(a.back)) if a.back else None
    side = load_image(os.path.abspath(a.side)) if a.side else None
    quarter = load_image(os.path.abspath(a.quarter)) if a.quarter else None
    qsign = int(spec.get("quarter_sign", 1) or 1)
    cam_f = make_ortho_camera("pf_cam_front", (0, -10, a.height / 2), (deg(90), 0, 0), ortho_scale_for_height(front, a.height))
    project_posed(mesh, posed, front, UV_FRONT, cam_f)
    if back is not None:
        cam_b = make_ortho_camera("pf_cam_back", (0, 10, a.height / 2), (deg(90), 0, deg(180)), ortho_scale_for_height(back, a.height))
        project_posed(mesh, posed, back, UV_BACK, cam_b)
    if side is not None:
        cam_s = make_ortho_camera("pf_cam_side", (10, 0, a.height / 2), (deg(90), 0, deg(90)), ortho_scale_for_height(side, a.height))
        project_posed(mesh, posed, side, UV_SIDE, cam_s)
    if quarter is not None:
        c = 0.7071
        cam_q = make_ortho_camera("pf_cam_quarter", (10 * qsign * c, -10 * c, a.height / 2), (deg(90), 0, deg(45) * qsign), ortho_scale_for_height(quarter, a.height))
        project_posed(mesh, posed, quarter, UV_QUARTER, cam_q)
    bpy.context.view_layer.update()
    clear_pose(arm)
    rename_bones(arm)
    mesh.data.materials.clear()
    assign_material(mesh, build_projection_material(f"{a.name}_paint", front, back, side, quarter, qsign, shade=a.shade))
    for poly in mesh.data.polygons:
        poly.use_smooth = True
    for img in (front, back, side, quarter):
        if img is not None:
            img.pack()

    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    if a.fbx:
        bpy.ops.object.select_all(action="DESELECT")
        mesh.select_set(True); arm.select_set(True)
        bpy.ops.export_scene.fbx(filepath=os.path.abspath(a.fbx), use_selection=True, path_mode="COPY", embed_textures=True)
    print(f"PF_OK blend={out} verts={len(mesh.data.vertices)} bones={len(arm.data.bones)} actions={len(bpy.data.actions)} mode=template")


if __name__ == "__main__":
    main()
