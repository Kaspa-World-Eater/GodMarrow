"""The dead in the Red as live bodies for the game's sea (world/red_sea.gd): the nine of beach3d.drowned(), each built
by the one body builder (body3d.py) at the origin, lying on a flat surface at its own sink, and exported to one glb,
art/zones/red_shore_drowned.glb, one node per body (drowned0..8). The game lays each on the live surface where it
floats, heading as it was, and lets it ride the heave.

  blender --background --python tools/landkit3d/drowned_glb.py
"""
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import parts3d as P                                                          # noqa: E402
import body3d as B                                                           # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "art", "zones", "red_shore_drowned.glb")

# (pose, sink, cloak, roll): beach3d.drowned()'s list, in its order
DEAD = [("prone", 0.0, True, 0.0), ("supine", 0.03, False, 0.0), ("prone", 0.05, False, 0.0), ("prone_reach", 0.0, True, 0.9),
        ("prone", 0.0, True, 0.0), ("prone_reach", 0.02, True, 0.0), ("supine", 0.03, True, 0.0), ("prone_reach", 0.05, False, 0.0),
        ("prone", 0.02, True, 0.0)]


def material(name, idx):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    return m


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for k, (pose, sink, cloak, roll) in enumerate(DEAD):
        holder = bpy.data.objects.new("drowned%d" % k, None)
        bpy.context.scene.collection.objects.link(holder)
        P.init(holder, material)
        # (beach3d: pose "supine" if up else "prone_reach" if k odd else "prone"; cloak or k % 3 == 0)
        B.body("d%d" % k, pose, "bloat", 0.0, 0.0, roll, lambda x, y, sk=sink: -0.1 - sk, seed=100 + k,
               cloak=cloak or k % 3 == 0)
    # the metaball skins to meshes, so the glb carries them
    bpy.ops.object.select_all(action="DESELECT")
    for o in list(bpy.context.scene.objects):
        if o.type in ("META", "CURVE"):
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
    if bpy.context.selected_objects:
        bpy.ops.object.convert(target="MESH")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True)
    print("wrote", OUT)


main()
