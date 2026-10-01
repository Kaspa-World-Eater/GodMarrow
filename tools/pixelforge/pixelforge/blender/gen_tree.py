"""Grow a tree mesh in Blender (no add-ons): a recursive branching skeleton skinned with the Skin modifier,
gnarled by noise, bare by default (the moor's dead trees), optional needle clusters for pines. Exports GLB.

    blender -b --python gen_tree.py -- --out dead_tree_1.glb --seed 3 --height 5 [--kind dead|pine|willow]
"""

from __future__ import annotations

import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pf_common import script_args  # noqa: E402


def grow(kind: str, seed: int, height: float):
    rnd = random.Random(seed)
    verts: list[Vector] = [Vector((0, 0, 0))]
    edges: list[tuple[int, int]] = []
    radii: list[float] = [height * 0.055]
    leaf_tips: list[Vector] = []

    def branch(start: int, direction: Vector, length: float, radius: float, depth: int) -> None:
        pos = verts[start]
        steps = 3
        idx = start
        d = direction.copy()
        for s in range(steps):
            # gnarl: bend a little at every step, more for dead wood
            jitter = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.1, 0.6))) * (0.3 if kind == "dead" else 0.18)
            d = (d + jitter).normalized()
            if kind == "willow":
                d.z -= 0.25 * s
            pos = pos + d * (length / steps)
            verts.append(pos)
            r = radius * (1 - 0.18 * (s + 1) / steps)
            radii.append(max(r, height * 0.004))
            edges.append((idx, len(verts) - 1))
            idx = len(verts) - 1
        if depth <= 0 or length < height * 0.08:
            leaf_tips.append(pos)
            return
        n = rnd.choice([2, 2, 3]) if depth > 1 else rnd.choice([1, 2, 2])
        for _ in range(n):
            ang = rnd.uniform(0.45, 1.0) if kind != "pine" else rnd.uniform(1.1, 1.4)
            axis = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0.2)).normalized()
            nd = d.copy()
            nd.rotate(__import__("mathutils").Quaternion(axis, ang * rnd.choice([-1, 1])))
            if kind != "willow":
                nd.z = max(abs(nd.z), 0.45 if kind == "dead" else 0.3) + 0.15   # reach up, not out
            else:
                nd.z = abs(nd.z) + 0.3
            branch(idx, nd.normalized(), length * rnd.uniform(0.6, 0.78), radius * rnd.uniform(0.5, 0.7), depth - 1)
        if kind == "pine":   # a leader keeps going up
            branch(idx, Vector((rnd.uniform(-0.1, 0.1), rnd.uniform(-0.1, 0.1), 1)).normalized(), length * 0.8, radius * 0.75, depth - 1)

    trunk_len = height * (0.35 if kind != "pine" else 0.25)
    branch(0, Vector((rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05), 1)).normalized(), trunk_len, radii[0], 4)
    return verts, edges, radii, leaf_tips


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--seed", type=int, default=1)
    p.add_argument("--height", type=float, default=5.0)
    p.add_argument("--kind", choices=["dead", "pine", "willow"], default="dead")
    a = script_args(p)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    verts, edges, radii, tips = grow(a.kind, a.seed, a.height)
    me = bpy.data.meshes.new("tree")
    me.from_pydata([v[:] for v in verts], edges, [])
    me.update()
    ob = bpy.data.objects.new("tree", me)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    sk = ob.modifiers.new("skin", "SKIN")
    sk.use_smooth_shade = False
    for i, v in enumerate(me.skin_vertices[0].data):
        v.radius = (radii[i], radii[i])
        if i == 0:
            v.use_root = True
    sub = ob.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = 1
    bpy.ops.object.modifier_apply(modifier=sk.name)
    bpy.ops.object.modifier_apply(modifier=sub.name)
    # normalise height (the recursion over/undershoots)
    zs = [v.co.z for v in me.vertices]
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]
    s = a.height / max(max(zs) - min(zs), 1e-6)
    spread = max(max(xs) - min(xs), max(ys) - min(ys)) * s
    sxy = min(1.0, a.height * 0.8 / max(spread, 1e-6))   # no wider than 0.8 of the height
    ob.scale = (s * sxy, s * sxy, s)
    bpy.ops.object.transform_apply(scale=True)
    bark = bpy.data.materials.new("bark")
    bark.use_nodes = True
    bsdf = bark.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.16, 0.13, 0.10, 1) if a.kind == "dead" else (0.13, 0.10, 0.08, 1)
    bsdf.inputs["Roughness"].default_value = 0.95
    me.materials.append(bark)
    if a.kind == "pine":
        needles = bpy.data.materials.new("needles")
        needles.use_nodes = True
        nb = needles.node_tree.nodes["Principled BSDF"]
        nb.inputs["Base Color"].default_value = (0.12, 0.2, 0.15, 1)
        nb.inputs["Roughness"].default_value = 0.9
        for t in tips:
            bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=a.height * 0.07, depth=a.height * 0.2, location=(t * s)[:] if False else (t.x * s, t.y * s, t.z * s + a.height * 0.05))
            cone = bpy.context.active_object
            cone.data.materials.append(needles)
            cone.parent = ob
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True)
    print(f"PF_OK glb={out} verts={len(me.vertices)} tips={len(tips)}")


if __name__ == "__main__":
    main()
