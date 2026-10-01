"""Render a patch of ground for iso tiles: a square of terrain turned to the iso diagonal, displaced by noise
(ruts, mounds), with a material preset (grass, mud, ash, stone, bone-field, water), lit by the same lantern-world
rig as the props (``render_prop.py``). Two patches with the same seed share geometry, so a 2D blend between
them (grass -> stone) keeps one lighting. No Pillow.

    blender -b --python render_ground.py -- --out grass.png --material grass --seed 1 --tiles 4 --tile-m 0.471 --ppu 108
"""

from __future__ import annotations

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pf_common import deg, eevee_engine_id, make_ortho_camera, script_args  # noqa: E402
from render_prop import light_rig  # noqa: E402

MATERIALS = {   # base dark, base light, detail colour, detail scale, roughness, displacement
    "grass": ((0.08, 0.11, 0.07), (0.14, 0.19, 0.11), (0.17, 0.22, 0.12), 40.0, 0.95, 0.04),
    "mud": ((0.07, 0.06, 0.05), (0.14, 0.11, 0.09), (0.10, 0.08, 0.06), 25.0, 0.6, 0.05),
    "ash": ((0.10, 0.10, 0.11), (0.19, 0.19, 0.20), (0.24, 0.23, 0.22), 30.0, 0.95, 0.03),
    "stone": ((0.14, 0.15, 0.17), (0.26, 0.27, 0.30), (0.10, 0.10, 0.11), 8.0, 0.85, 0.015),
    "bone": ((0.30, 0.27, 0.22), (0.55, 0.51, 0.42), (0.20, 0.18, 0.14), 20.0, 0.9, 0.05),
    "water": ((0.03, 0.07, 0.08), (0.08, 0.16, 0.17), (0.12, 0.22, 0.22), 15.0, 0.15, 0.01),
    "snow": ((0.55, 0.60, 0.66), (0.80, 0.84, 0.88), (0.50, 0.55, 0.62), 25.0, 0.8, 0.05),
}


def ground_material(name: str, seed: int):
    dark, light, detail, scale, rough, _ = MATERIALS[name]
    mat = bpy.data.materials.new(f"ground_{name}")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    big = nt.nodes.new("ShaderNodeTexNoise")
    big.inputs["Scale"].default_value = 9.0
    big.inputs["Detail"].default_value = 3.0
    big.noise_dimensions = "4D"
    big.inputs["W"].default_value = seed * 7.1
    nt.links.new(coord.outputs["Object"], big.inputs["Vector"])
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = scale
    fine.inputs["Detail"].default_value = 8.0
    fine.inputs["Roughness"].default_value = 0.75
    fine.noise_dimensions = "4D"
    fine.inputs["W"].default_value = seed * 3.3
    nt.links.new(coord.outputs["Object"], fine.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (*light, 1)
    nt.links.new(big.outputs["Fac"], ramp.inputs["Fac"])
    mask = nt.nodes.new("ShaderNodeMath")
    mask.operation = "GREATER_THAN"
    mask.inputs[1].default_value = 0.7
    nt.links.new(fine.outputs["Fac"], mask.inputs[0])
    mix = nt.nodes.new("ShaderNodeMixRGB")
    mix.inputs["Color2"].default_value = (*detail, 1)
    nt.links.new(ramp.outputs["Color"], mix.inputs["Color1"])
    nt.links.new(mask.outputs[0], mix.inputs["Fac"])
    nt.links.new(mix.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = rough
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    bump.inputs["Distance"].default_value = 0.03
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--material", choices=sorted(MATERIALS), default="grass")
    p.add_argument("--seed", type=int, default=1)
    p.add_argument("--tiles", type=int, default=4, help="tiles per side of the patch")
    p.add_argument("--tile-m", type=float, default=0.471, help="tile side in metres (72 px wide diamond at 108 ppu)")
    p.add_argument("--ppu", type=float, default=108.0)
    p.add_argument("--elevation", type=float, default=30.0)
    p.add_argument("--samples", type=int, default=16)
    a = script_args(p)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    side = a.tiles * a.tile_m
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=a.tiles * 24, y_subdivisions=a.tiles * 24, size=side)
    ground = bpy.context.active_object
    ground.rotation_euler = (0, 0, math.radians(45))
    # displacement: noise on the vertices (same seed -> same geometry for every material)
    import random
    rnd = random.Random(a.seed)
    disp = MATERIALS[a.material][5]
    tex = bpy.data.textures.new("disp", "CLOUDS")
    tex.noise_scale = side / 3
    tex.noise_depth = 3
    tex.noise_basis = "ORIGINAL_PERLIN"
    mod = ground.modifiers.new("disp", "DISPLACE")
    mod.texture = tex
    mod.strength = disp * 2
    mod.mid_level = 0.5
    mod.texture_coords = "GLOBAL"
    ground.location = (0, 0, 0)
    ground.data.materials.append(ground_material(a.material, a.seed))
    for poly in ground.data.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.update()
    light_rig(Vector((0, 0, 0)), side)
    elev = math.radians(a.elevation)
    cam_dist = side * 6
    cam = make_ortho_camera("pf_cam", (0, -cam_dist * math.cos(elev), cam_dist * math.sin(elev)), (math.pi / 2 - elev, 0, 0), 1.0)
    scene.camera = cam
    bpy.context.view_layer.update()
    # the patch on screen: a diamond `side*sqrt2` wide and `side*sqrt2*sin(elev)` tall
    w_m = side * math.sqrt(2)
    h_m = w_m * math.sin(elev)
    px_w, px_h = int(round(w_m * a.ppu)), int(round(h_m * a.ppu))
    cam.data.ortho_scale = max(w_m, h_m)
    cam.data.shift_y = 0.0
    scene.render.resolution_x, scene.render.resolution_y = px_w, px_h
    scene.render.film_transparent = True
    scene.render.engine = eevee_engine_id()
    try:
        scene.eevee.taa_render_samples = a.samples
        scene.eevee.use_gtao = True
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
    tile_w = a.tile_m * math.sqrt(2) * a.ppu
    print(f"PF_OK png={out} size={px_w}x{px_h} tiles={a.tiles} tile_w={tile_w:.2f} tile_h={tile_w * math.sin(elev):.2f}")


if __name__ == "__main__":
    main()
