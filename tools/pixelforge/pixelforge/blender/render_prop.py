"""Render a 3D model (GLB / FBX / OBJ) as a game prop: the game's camera (orthographic, 30 degrees above, the
object turned to the iso diagonal), a lantern-world light rig (warm key from the upper left, cold teal fill and
rim, dark world), ambient occlusion and soft shadows, and a painterly material pass (procedural grime and bump
on every material) so flat low-poly kits read as weathered, lit objects. Writes a PNG with alpha plus a JSON
with the ground anchor. No Pillow here.

    blender -b --python render_prop.py -- --model crypt.glb --out crypt.png --height 3.2 [--yaw 45] [--ppu 108]
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pf_common import deg, eevee_engine_id, make_ortho_camera, script_args  # noqa: E402


def import_model(path: str) -> list:
    before = set(bpy.data.objects)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        raise SystemExit(f"PF_ERR unknown model format {ext}")
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type in ("LIGHT", "CAMERA"):
            bpy.data.objects.remove(o, do_unlink=True)
    new = [o for o in new if o.name in bpy.data.objects]
    meshes = [o for o in new if o.type == "MESH"]
    return meshes, [o for o in new if o.parent is None]


def bbox(meshes) -> tuple[Vector, Vector]:
    lo = Vector((math.inf,) * 3)
    hi = Vector((-math.inf,) * 3)
    for m in meshes:
        for c in m.bound_box:
            p = m.matrix_world @ Vector(c)
            lo = Vector(min(a, b) for a, b in zip(lo, p))
            hi = Vector(max(a, b) for a, b in zip(hi, p))
    return lo, hi


def painterly(mat, grime: float, bump: float, dust: float) -> None:
    """Add weathering to a material in place: multiply by a dark noise, bump the normal with it, dust the tops."""
    if mat is None or not mat.use_nodes:
        return
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        return
    base_link = next((l for l in nt.links if l.to_socket == bsdf.inputs["Base Color"]), None)
    base_src = base_link.from_socket if base_link else None
    base_val = tuple(bsdf.inputs["Base Color"].default_value)
    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 18.0
    tex.inputs["Detail"].default_value = 6.0
    tex.inputs["Roughness"].default_value = 0.7
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["Object"], tex.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (1 - grime, 1 - grime, 1 - grime, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMixRGB")
    mul.blend_type = "MULTIPLY"
    mul.inputs["Fac"].default_value = 1.0
    if base_src is not None:
        nt.links.new(base_src, mul.inputs["Color1"])
    else:
        mul.inputs["Color1"].default_value = base_val
    nt.links.new(ramp.outputs["Color"], mul.inputs["Color2"])
    # dust / moss on upward faces: mix toward a pale bone tone by normal.z
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs["Vector"])
    pw = nt.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 3.0
    pw.use_clamp = True   # downward faces (negative z) must not drive the mix negative (it overshoots to orange)
    nt.links.new(sep.outputs["Z"], pw.inputs[0])
    sc = nt.nodes.new("ShaderNodeMath")
    sc.operation = "MULTIPLY"
    sc.inputs[1].default_value = dust
    sc.use_clamp = True
    nt.links.new(pw.outputs[0], sc.inputs[0])
    dmix = nt.nodes.new("ShaderNodeMixRGB")
    dmix.blend_type = "MIX"
    dmix.inputs["Color2"].default_value = (0.62, 0.58, 0.48, 1)
    nt.links.new(mul.outputs["Color"], dmix.inputs["Color1"])
    nt.links.new(sc.outputs[0], dmix.inputs["Fac"])
    nt.links.new(dmix.outputs["Color"], bsdf.inputs["Base Color"])
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = bump
    bmp.inputs["Distance"].default_value = 0.05
    nt.links.new(tex.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.85
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.2


def light_rig(center: Vector, radius: float) -> None:
    def lamp(name, kind, loc, color, energy, size=2.0):
        d = bpy.data.lights.new(name, kind)
        d.color = color
        d.energy = energy
        if kind == "SUN":
            d.angle = math.radians(12)
        else:
            d.shadow_soft_size = size
        o = bpy.data.objects.new(name, d)
        bpy.context.scene.collection.objects.link(o)
        o.location = loc
        direction = center - Vector(loc)
        o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        return o

    r = radius * 4
    lamp("pf_key", "SUN", (center.x - r, center.y - r * 0.6, center.z + r * 1.2), (1.0, 0.93, 0.80), 3.2)        # warm, upper left front
    lamp("pf_fill", "SUN", (center.x + r, center.y - r * 0.4, center.z + r * 0.5), (0.55, 0.78, 0.80), 0.9)       # cold teal fill from the right
    lamp("pf_rim", "SUN", (center.x + r * 0.4, center.y + r, center.z + r * 0.8), (0.60, 0.95, 0.92), 1.6)        # teal rim from behind
    world = bpy.context.scene.world or bpy.data.worlds.new("pf_world")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.045, 0.06, 0.07, 1)
        bg.inputs[1].default_value = 1.0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--model", required=True, nargs="+", help="one or more model files (kit parts)")
    p.add_argument("--stack", action="store_true", help="several parts: put each on top of the previous one (modular towers, crypt + roof)")
    p.add_argument("--out", required=True)
    p.add_argument("--height", type=float, default=0.0, help="scale the model to this height in metres (0 = keep)")
    p.add_argument("--yaw", type=float, default=45.0, help="turn the model (degrees) so a corner faces the camera")
    p.add_argument("--elevation", type=float, default=30.0)
    p.add_argument("--ppu", type=float, default=108.0, help="render pixels per metre (heroes are ~108 at 195 px)")
    p.add_argument("--margin", type=int, default=6)
    p.add_argument("--samples", type=int, default=16)
    p.add_argument("--grime", type=float, default=0.45)
    p.add_argument("--bump", type=float, default=0.35)
    p.add_argument("--dust", type=float, default=0.25)
    p.add_argument("--ground-shadow", action="store_true", help="catch a soft shadow on an invisible ground plane")
    a = script_args(p)

    if len(a.model) == 1 and a.model[0].lower().endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(a.model[0]))
        for o in list(bpy.data.objects):
            if o.type in ("LIGHT", "CAMERA"):
                bpy.data.objects.remove(o, do_unlink=True)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    meshes, tops = [], []
    z_off = 0.0
    if len(a.model) == 1 and a.model[0].lower().endswith(".blend"):
        meshes = [o for o in bpy.data.objects if o.type == "MESH"]
        tops = [o for o in bpy.data.objects if o.parent is None]
    for path in ([] if meshes else a.model):
        m, t = import_model(os.path.abspath(path))
        if a.stack:
            lo_p, hi_p = bbox(m)
            for o in t:
                o.location.z += z_off
            bpy.context.view_layer.update()
            z_off += hi_p.z - lo_p.z
        meshes += m
        tops += t
    if not meshes:
        raise SystemExit("PF_ERR no mesh in the model")
    # one parent to turn and scale (the import's own top-level nodes go under it)
    root = bpy.data.objects.new("pf_root", None)
    scene.collection.objects.link(root)
    for o in tops:
        o.parent = root
    lo, hi = bbox(meshes)
    if a.height > 0 and hi.z - lo.z > 1e-6:
        root.scale = (a.height / (hi.z - lo.z),) * 3
    root.rotation_euler = (0, 0, math.radians(a.yaw))
    bpy.context.view_layer.update()
    lo, hi = bbox(meshes)
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)   # centred, feet on the ground
    bpy.context.view_layer.update()
    lo, hi = bbox(meshes)
    center = (lo + hi) / 2
    radius = max((hi - lo).length / 2, 0.5)

    for m in meshes:
        for slot in m.material_slots:
            painterly(slot.material, a.grime, a.bump, a.dust)
        for poly in m.data.polygons:
            poly.use_smooth = False   # kits are faceted on purpose; keep the planes, the bump adds the grain

    if a.ground_shadow:
        bpy.ops.mesh.primitive_plane_add(size=radius * 8, location=(0, 0, 0))
        plane = bpy.context.active_object
        plane.is_shadow_catcher = True
        plane.visible_camera = False   # Eevee: use a holdout-ish dark material instead
        pm = bpy.data.materials.new("pf_ground")
        pm.use_nodes = True
        pm.blend_method = "BLEND"
        bsdf = pm.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
        bsdf.inputs["Alpha"].default_value = 0.0
        plane.data.materials.append(pm)

    light_rig(center, radius)
    elev = math.radians(a.elevation)
    # frame: the camera looks along +Y tilted down by `elevation`; ortho size spans the object's screen extent
    cam_dist = radius * 10
    cam = make_ortho_camera("pf_cam", (0, -cam_dist * math.cos(elev), center.z + cam_dist * math.sin(elev)), (math.pi / 2 - elev, 0, 0), 1.0)
    scene.camera = cam
    bpy.context.view_layer.update()   # a camera made a moment ago has no world matrix until the scene updates
    # screen extents of the bbox corners
    inv = cam.matrix_world.inverted()
    xs, ys = [], []
    for cx in (lo.x, hi.x):
        for cy in (lo.y, hi.y):
            for cz in (lo.z, hi.z):
                v = inv @ Vector((cx, cy, cz))
                xs.append(v.x); ys.append(v.y)
    w_m, h_m = max(xs) - min(xs), max(ys) - min(ys)
    px_w, px_h = int(math.ceil(w_m * a.ppu)) + 2 * a.margin, int(math.ceil(h_m * a.ppu)) + 2 * a.margin
    cam.data.ortho_scale = max(px_w, px_h) / a.ppu
    # shift so the object is centred in the frame
    cam.data.shift_x = ((max(xs) + min(xs)) / 2) / cam.data.ortho_scale
    cam.data.shift_y = ((max(ys) + min(ys)) / 2) / cam.data.ortho_scale
    scene.render.resolution_x, scene.render.resolution_y = px_w, px_h
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.engine = eevee_engine_id()
    try:
        scene.eevee.taa_render_samples = a.samples
        scene.eevee.use_gtao = True
        scene.eevee.gtao_distance = radius * 0.6
        scene.eevee.use_soft_shadows = True
    except Exception:  # noqa: BLE001
        pass
    scene.view_settings.view_transform = "Standard"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    # ground anchor: where (0,0,0) lands in the image
    g = inv @ Vector((0, 0, 0))
    ax = px_w / 2 + (g.x - (max(xs) + min(xs)) / 2) * a.ppu
    ay = px_h / 2 - (g.y - (max(ys) + min(ys)) / 2) * a.ppu
    meta = {"model": a.model if len(a.model) > 1 else a.model[0], "size": [px_w, px_h], "anchor": [round(ax, 1), round(ay, 1)], "ppu": a.ppu, "yaw": a.yaw,
            "height_m": round(hi.z - lo.z, 3), "footprint_m": [round(hi.x - lo.x, 3), round(hi.y - lo.y, 3)]}
    with open(os.path.splitext(out)[0] + ".json", "w") as f:
        json.dump(meta, f, indent=1)
    print(f"PF_OK png={out} size={px_w}x{px_h} anchor={ax:.0f},{ay:.0f}")


if __name__ == "__main__":
    main()
