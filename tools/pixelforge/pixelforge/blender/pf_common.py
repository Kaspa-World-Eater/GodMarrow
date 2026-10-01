"""Shared helpers for the scripts that run *inside* Blender (``blender --python``).

Keep this file dependency-free: Blender's Python has numpy but not Pillow.
"""

from __future__ import annotations

import argparse
import math
import sys

import bpy  # type: ignore

UV_FRONT = "proj_front"
UV_BACK = "proj_back"
UV_SIDE = "proj_side"
UV_QUARTER = "proj_quarter"


def script_args(parser: argparse.ArgumentParser) -> argparse.Namespace:
    """Parse the arguments after ``--`` on Blender's command line."""
    argv = sys.argv
    rest = argv[argv.index("--") + 1 :] if "--" in argv else []
    return parser.parse_args(rest)


def eevee_engine_id() -> str:
    ids = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    return "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in ids else "BLENDER_EEVEE"


def load_image(path: str):
    img = bpy.data.images.load(path, check_existing=True)
    img.alpha_mode = "STRAIGHT"
    return img


def make_ortho_camera(name: str, location, rotation, ortho_scale: float):
    cam_data = bpy.data.cameras.new(name)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam_data.clip_start = 0.01
    cam_data.clip_end = 1000
    cam = bpy.data.objects.new(name, cam_data)
    cam.location = location
    cam.rotation_euler = rotation
    bpy.context.scene.collection.objects.link(cam)
    return cam


def project_image_onto(obj, image, uv_name: str, camera) -> None:
    """Bake ``image``'s camera projection into a UV map called ``uv_name``.

    The modifier's aspect must be the image's pixel aspect (verified: with
    aspect 1:1 a portrait image only covers the middle of its width).  The
    camera's ``ortho_scale`` spans the image's *larger* side.
    """
    if uv_name not in obj.data.uv_layers:
        obj.data.uv_layers.new(name=uv_name)
    mod = obj.modifiers.new(name=f"pf_{uv_name}", type="UV_PROJECT")
    mod.uv_layer = uv_name
    mod.projector_count = 1
    mod.projectors[0].object = camera
    mod.aspect_x, mod.aspect_y = image.size
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)


def ortho_scale_for_height(image, height: float) -> float:
    """ortho_scale so the image's frame is exactly ``height`` tall."""
    iw, ih = image.size
    return height if ih >= iw else height * iw / ih


def _mix_rgb(nt, fac, color_a, color_b):
    """Mix node: factor 0 -> a, 1 -> b (Blender 4 ShaderNodeMix, legacy fallback)."""
    try:
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        nt.links.new(fac, mix.inputs[0])
        nt.links.new(color_a, mix.inputs[6])
        nt.links.new(color_b, mix.inputs[7])
        return mix.outputs[2]
    except (RuntimeError, KeyError, IndexError):
        mix = nt.nodes.new("ShaderNodeMixRGB")
        nt.links.new(fac, mix.inputs["Fac"])
        nt.links.new(color_a, mix.inputs["Color1"])
        nt.links.new(color_b, mix.inputs["Color2"])
        return mix.outputs["Color"]


def _image_node(nt, image, uv_name):
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Closest"  # the painting's own pixels, never smoothed
    tex.extension = "EXTEND"
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = uv_name
    nt.links.new(uv.outputs["UV"], tex.inputs["Vector"])
    return tex


def _facing(nt, sep, direction, lo=0.45, hi=0.9):
    """0..1 weight for how much the surface faces ``direction`` (unit vector)."""
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    comb.inputs[0].default_value, comb.inputs[1].default_value, comb.inputs[2].default_value = direction
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    nt.links.new(sep.outputs["X"], nt.nodes.new("NodeReroute").inputs[0]) if False else None
    geo_vec = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], geo_vec.inputs[0])
    nt.links.new(sep.outputs["Y"], geo_vec.inputs[1])
    nt.links.new(sep.outputs["Z"], geo_vec.inputs[2])
    nt.links.new(geo_vec.outputs["Vector"], dot.inputs[0])
    nt.links.new(comb.outputs["Vector"], dot.inputs[1])
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["From Min"].default_value = lo
    ramp.inputs["From Max"].default_value = hi
    ramp.clamp = True
    nt.links.new(dot.outputs["Value"], ramp.inputs["Value"])
    return ramp.outputs["Result"]


def build_projection_material(name: str, front_img, back_img=None, side_img=None, quarter_img=None, quarter_sign: int = 1, blend: float = 0.15, shade: float = 0.0):
    """Unlit material: the front image where the surface faces the front, the
    back image behind, the side image on the flanks and the three-quarter image
    on the diagonals (both diagonals: the projection goes through the body).
    ``shade`` > 0 darkens surfaces that face away from a top-front light, a
    little, to help the volume read (0 = the painting's own light only)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])

    tex_front = _image_node(nt, front_img, UV_FRONT)
    mat.node_tree.nodes.active = tex_front
    color = tex_front.outputs["Color"]

    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Normal"], sep.inputs["Vector"])

    if back_img is not None:
        tex_back = _image_node(nt, back_img, UV_BACK)
        color = _mix_rgb(nt, _facing(nt, sep, (0.0, 1.0, 0.0), -blend, blend), color, tex_back.outputs["Color"])
    if side_img is not None:
        tex_side = _image_node(nt, side_img, UV_SIDE)
        absx = nt.nodes.new("ShaderNodeMath")
        absx.operation = "ABSOLUTE"
        nt.links.new(sep.outputs["X"], absx.inputs[0])
        ramp_s = nt.nodes.new("ShaderNodeMapRange")
        ramp_s.inputs["From Min"].default_value = 0.45
        ramp_s.inputs["From Max"].default_value = 0.85
        ramp_s.clamp = True
        nt.links.new(absx.outputs["Value"], ramp_s.inputs["Value"])
        color = _mix_rgb(nt, ramp_s.outputs["Result"], color, tex_side.outputs["Color"])
    if quarter_img is not None:
        tex_q = _image_node(nt, quarter_img, UV_QUARTER)
        c = 0.7071
        w1 = _facing(nt, sep, (quarter_sign * c, -c, 0.0), 0.75, 0.98)
        w2 = _facing(nt, sep, (-quarter_sign * c, -c, 0.0), 0.75, 0.98)
        mx = nt.nodes.new("ShaderNodeMath")
        mx.operation = "MAXIMUM"
        nt.links.new(w1, mx.inputs[0])
        nt.links.new(w2, mx.inputs[1])
        color = _mix_rgb(nt, mx.outputs["Value"], color, tex_q.outputs["Color"])
    if shade > 0:
        # light from above and the front: factor = 1 - shade * (1 - facing(light)) / 2
        light = _facing(nt, sep, (0.0, -0.5, 0.866), -1.0, 1.0)
        m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = "MULTIPLY_ADD"
        nt.links.new(light, m1.inputs[0]); m1.inputs[1].default_value = shade; m1.inputs[2].default_value = 1.0 - shade
        mul = nt.nodes.new("ShaderNodeVectorMath"); mul.operation = "SCALE"
        nt.links.new(color, mul.inputs[0]); nt.links.new(m1.outputs["Value"], mul.inputs["Scale"])
        color = mul.outputs["Vector"]

    nt.links.new(color, emit.inputs["Color"])
    return mat


def assign_material(obj, mat) -> None:
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def bbox_world(obj):
    """(min, max) corners of an object's evaluated bounding box in world space."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(depsgraph)
    pts = [ev.matrix_world @ mathutils_vector(c) for c in ev.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    return lo, hi


def mathutils_vector(c):
    from mathutils import Vector  # type: ignore

    return Vector(c)


def mesh_objects():
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def armature_objects():
    return [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]


def deg(x: float) -> float:
    return math.radians(x)
