"""Rig a finished, coloured 3D model (model3d.py: the painting made 3D) on the library mannequin, so every library clip
plays on it. The model keeps its own shape and colour; it borrows the mannequin's skeleton, weights and clips.

1. both stand with their feet at z=0 on the origin; the mannequin is scaled and its arms swung down (an A-pose) until
   it fills the model best: most of the mannequin's skin inside the model;
2. the jointed doll is fused into one skin (fit_template.fuse), posed so, and its weights carried to the model's
   points by the nearest surface;
3. the model is "unposed": each point taken back through its own blend of bone moves (the inverse of the skinning), so
   the model rests in the mannequin's rest pose and the clips, made for that rest pose, move it right;
4. bones get Mixamo names (fit_template.rename_bones), the mannequin's skin is dropped, and the file is saved in the
   form the template rig step reads (api.rig with model_mode "template"): one armature with the library's actions,
   one mesh skinned to it.

  blender -b -P rig_model.py -- --model M.glb --library LIB.glb --out OUT.blend [--height 1.8] [--name N]
"""
from __future__ import annotations

import argparse, os, sys

import bpy
import numpy as np
from mathutils import Matrix
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fit_template import import_mannequin, pose_arms, clear_pose, evaluated_vertices, rename_bones, scale_location_curves  # noqa: E402
from pf_common import script_args  # noqa: E402


def load_model(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    if len(new) > 1:
        bpy.ops.object.join()
    m = bpy.context.view_layer.objects.active
    m.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # glTF splits points wherever a corner's colour differs; merged again the skin is closed, which the heat weights need
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')
    return m


def place(obj_points_setter, pts, height):
    lo, hi = pts.min(0), pts.max(0)
    s = height / (hi[2] - lo[2])
    shift = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])
    return s, shift


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', required=True); p.add_argument('--library', required=True); p.add_argument('--out', required=True)
    p.add_argument('--height', type=float, default=1.8); p.add_argument('--name', default='Character')
    a = script_args(p)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # ---- the model: feet on the ground, centred, the given height
    model = load_model(os.path.abspath(a.model))
    mv = np.array([v.co[:] for v in model.data.vertices])
    s, shift = place(None, mv, a.height)
    mv = (mv - shift) * s
    model.data.vertices.foreach_set('co', mv.ravel())
    model.data.update()
    bvh = BVHTree.FromObject(model, bpy.context.evaluated_depsgraph_get())

    def inside_share(pts):
        """the share of points inside the model: the nearest surface's normal points away from them"""
        n_in = 0
        for q in pts:
            hit = bvh.find_nearest(q)
            if hit[0] is not None and (np.array(hit[0]) - q) @ np.array(hit[1]) > 0:
                n_in += 1
        return n_in / max(1, len(pts))

    # ---- the mannequin, at the model's height first
    arm, doll = import_mannequin(os.path.abspath(a.library))
    d0 = np.array([v.co[:] for v in doll.data.vertices])
    lo, hi = d0.min(0), d0.max(0)
    base_s = a.height / (hi[2] - lo[2])
    dshift = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]])

    def set_scale(k):
        """the doll and its bones at height a.height * k (from their original rest)"""
        ss = base_s * k
        doll.data.vertices.foreach_set('co', ((d0 - dshift) * ss).ravel()); doll.data.update()
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode='EDIT')
        for eb in arm.data.edit_bones:
            h0, t0 = eb.get('pf_h0'), eb.get('pf_t0')
            if h0 is None:
                eb['pf_h0'] = list(eb.head); eb['pf_t0'] = list(eb.tail); h0, t0 = eb['pf_h0'], eb['pf_t0']
            eb.head = ((np.array(h0[:]) - dshift) * ss).tolist(); eb.tail = ((np.array(t0[:]) - dshift) * ss).tolist()
        bpy.ops.object.mode_set(mode='OBJECT')
        return ss

    # the figure under the crown, cloth and spikes: try heights and arm swings, keep the one most inside the model
    best = None
    sample = None
    for k in (0.78, 0.82, 0.86, 0.9, 0.94, 0.98):
        set_scale(k)
        if sample is None:
            sample = np.random.default_rng(1).choice(len(doll.data.vertices), size=min(1500, len(doll.data.vertices)), replace=False)
        for ang in (0, 15, 25, 35, 45, 55, 65, 72, 78, 84):
            pose_arms(arm, ang)
            sc = inside_share(evaluated_vertices(doll)[sample])
            if best is None or sc > best[0]:
                best = (sc, k, ang)
        clear_pose(arm)
    sc, k, ang = best
    ss = set_scale(k)
    scale_location_curves(ss)
    print(f'PF_INFO fit: mannequin at {k:.2f} of the model height, arms {ang} deg, {sc:.2f} inside')

    # ---- weights: Blender's heat weights, computed on the model itself against a copy of the skeleton whose rest is
    # the pose that fits the model (the nearest-surface weights of the thin mannequin tore the robe: a fold near a leg
    # took the leg)
    pose_arms(arm, ang)
    bpy.ops.object.select_all(action='DESELECT'); arm.select_set(True); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.duplicate()
    fit_arm = bpy.context.view_layer.objects.active
    fit_arm.animation_data_clear()
    bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.armature_apply(selected=False); bpy.ops.object.mode_set(mode='OBJECT')
    bpy.data.objects.remove(doll, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    model.select_set(True); fit_arm.select_set(True); bpy.context.view_layer.objects.active = fit_arm
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    heat_ok = any(len(v.groups) for v in model.data.vertices[:2000])
    print('PF_INFO heat weights', 'ok' if heat_ok else 'FAILED (falling back to envelope)')
    if not heat_ok:
        bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
    model.parent = None
    for m_ in list(model.modifiers):
        model.modifiers.remove(m_)
    bpy.ops.object.select_all(action='DESELECT'); model.select_set(True); bpy.context.view_layer.objects.active = model
    bones = {b.name for b in arm.data.bones}
    for g in list(model.vertex_groups):
        if g.name not in bones:
            model.vertex_groups.remove(g)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.data.objects.remove(fit_arm, do_unlink=True)

    # ---- unpose: each point back through the inverse of its own blend of bone moves
    names = [b.name for b in arm.data.bones]
    mats = np.array([np.array((arm.pose.bones[n].matrix @ arm.data.bones[n].matrix_local.inverted())) for n in names])
    gidx = {g.index: names.index(g.name) for g in model.vertex_groups}
    pts = np.array([v.co[:] for v in model.data.vertices])
    rest = pts.copy()
    for i, v in enumerate(model.data.vertices):
        M = np.zeros((4, 4)); wt = 0.0
        for g in v.groups:
            if g.group in gidx and g.weight > 0:
                M += g.weight * mats[gidx[g.group]]; wt += g.weight
        if wt > 1e-6:
            M /= wt
            rest[i] = (np.linalg.inv(M) @ np.append(pts[i], 1.0))[:3]
    model.data.vertices.foreach_set('co', rest.ravel()); model.data.update()
    clear_pose(arm)

    # ---- one mesh on the armature; the mannequin's skins gone; Mixamo names
    am = model.modifiers.new('Armature', 'ARMATURE'); am.object = arm
    model.parent = arm
    model.name = model.data.name = a.name
    for poly in model.data.polygons:
        poly.use_smooth = True
    rename_bones(arm)
    for eb in arm.data.bones:
        for key in ('pf_h0', 'pf_t0'):
            if key in eb:
                del eb[key]
    out = os.path.abspath(a.out); os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out)
    print(f'PF_OK blend={out} verts={len(model.data.vertices)} bones={len(arm.data.bones)} actions={len(bpy.data.actions)} mode=template')


if __name__ == '__main__':
    main()
