"""Render every animation of a rigged character from N directions as PNG frames.

Run inside Blender::

    blender -b wraith_rigged.blend --python render_sprites.py -- --out renders \
        --directions 8 --size 256 --elevation 30 --step 2 [--actions walk,idle] [--ppu 140]

Camera: orthographic, ``elevation`` degrees above the ground (Diablo 2 is about
30), circling the character.  Direction names follow the isometric convention
of where the character *faces on screen*: S (toward the player), SW, W, NW, N,
NE, E, SE.

Every frame of every action is framed identically so the sprites line up in a
sheet.  ``--ppu`` (pixels per Blender unit) forces the same scale across
characters; without it the framing is fitted to this character and the value
used is written to ``manifest.json`` so you can reuse it.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # type: ignore

from pf_common import armature_objects, bbox_world, deg, eevee_engine_id, make_ortho_camera, mesh_objects, script_args  # noqa: E402

DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]


def render_to(path: str, size: int) -> None:
    """Render the current frame to ``path``. ``PF_FAKE_RENDER=1`` writes a blank
    image instead (for tests on machines without a display)."""
    if os.environ.get("PF_FAKE_RENDER"):
        img = bpy.data.images.new("pf_blank", size, size, alpha=True)
        img.filepath_raw = path
        img.file_format = "PNG"
        img.save()
        bpy.data.images.remove(img)
        return
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def anchor_xy(arm, meshes) -> tuple[float, float]:
    """Ground-plane point the camera orbits: the hips bone if there is one, else
    the mesh centre.  Following it keeps a walk that is not 'in place' centred."""
    if arm is not None:
        for name in ("mixamorig:Hips", "mixamorig1:Hips", "Hips", "hips", "pelvis", "Pelvis"):
            pb = arm.pose.bones.get(name)
            if pb is not None:
                w = arm.matrix_world @ pb.head
                return float(w.x), float(w.y)
    lo = [math.inf] * 2
    hi = [-math.inf] * 2
    for m in meshes:
        l, h = bbox_world(m)
        lo = [min(lo[i], l[i]) for i in range(2)]
        hi = [max(hi[i], h[i]) for i in range(2)]
    return (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2


def pass_material(kind: str, ortho: float):
    """Unlit material that paints camera-space normals or depth, for lighting
    the sprite cards in the game. Normal: xyz -> rgb (0.5 = flat). Depth: 0 =
    nearest to the camera, 1 = one ortho-frame deep (so the map is in sprite
    pixels: depth * frame height)."""
    mat = bpy.data.materials.new(f"pf_pass_{kind}")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    if kind == "normal":
        # world normal -> camera space
        tr = nt.nodes.new("ShaderNodeVectorTransform")
        tr.vector_type = "NORMAL"
        tr.convert_from = "WORLD"
        tr.convert_to = "CAMERA"
        nt.links.new(geo.outputs["Normal"], tr.inputs["Vector"])
        scale = nt.nodes.new("ShaderNodeVectorMath")
        scale.operation = "MULTIPLY_ADD"
        scale.inputs[1].default_value = (0.5, 0.5, 0.5)
        scale.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(tr.outputs["Vector"], scale.inputs[0])
        nt.links.new(scale.outputs["Vector"], emit.inputs["Color"])
    else:
        cam = nt.nodes.new("ShaderNodeCameraData")  # View Z Depth
        rng = nt.nodes.new("ShaderNodeMapRange")
        rng.inputs["From Min"].default_value = 50.0 - ortho  # camera sits 50 units out
        rng.inputs["From Max"].default_value = 50.0 + ortho
        rng.clamp = True
        nt.links.new(cam.outputs["View Z Depth"], rng.inputs["Value"])
        nt.links.new(rng.outputs["Result"], emit.inputs["Color"])
    return mat


def direction_names(n: int) -> list[str]:
    if n == 8:
        return DIRECTIONS
    if n == 4:
        return ["S", "W", "N", "E"]
    if n == 16:
        return [f"{DIRECTIONS[i // 2]}{'' if i % 2 == 0 else '+'}" for i in range(16)]
    return [f"d{i:02d}" for i in range(n)]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", required=True)
    p.add_argument("--directions", type=int, default=8)
    p.add_argument("--size", type=int, default=256)
    p.add_argument("--elevation", type=float, default=30.0)
    p.add_argument("--step", type=int, default=2, help="render every Nth frame")
    p.add_argument("--per-clip", type=int, default=0, help="render exactly N evenly spaced frames per clip (0 = use --step); the game only keeps 6-8")
    p.add_argument("--actions", help="comma-separated action names (default: all)")
    p.add_argument("--ppu", type=float, help="pixels per unit; fixes the scale across characters")
    p.add_argument("--margin", type=float, default=1.08)
    p.add_argument("--samples", type=int, default=8)
    p.add_argument("--passes", default="color", help="comma list of color,normal,depth (extra passes go to <out>_normal, <out>_depth)")
    a = script_args(p)

    scene = bpy.context.scene
    arms = armature_objects()
    meshes = mesh_objects()
    if not meshes:
        raise SystemExit("no mesh in the .blend")
    arm = arms[0] if arms else None
    wanted = [s.strip() for s in a.actions.split(",")] if a.actions else None
    actions = [act for act in bpy.data.actions if not wanted or act.name in wanted]
    if arm is None or not actions:
        actions = [None]  # still: one frame, no animation

    # ---------------------------------------------------------- framing pass
    lo_all = [math.inf] * 3
    hi_all = [-math.inf] * 3
    frame_plan: list[tuple[object, list[int]]] = []
    for act in actions:
        if act is not None:
            arm.animation_data_create()
            arm.animation_data.action = act
            start, end = (int(round(v)) for v in act.frame_range)
            if a.per_clip > 0:
                n = max(2, min(a.per_clip, end - start + 1))
                frames = sorted({start + int(round(i * (end - start) / n)) for i in range(n)})
            else:
                frames = list(range(start, end + 1, max(1, a.step)))
        else:
            frames = [scene.frame_current]
        frame_plan.append((act, frames))
        for f in frames[:: max(1, len(frames) // 12)]:  # sample for speed
            scene.frame_set(f)
            ax, ay = anchor_xy(arm, meshes)
            for m in meshes:
                lo, hi = bbox_world(m)
                lo = [lo[0] - ax, lo[1] - ay, lo[2]]
                hi = [hi[0] - ax, hi[1] - ay, hi[2]]
                lo_all = [min(x, y) for x, y in zip(lo_all, lo)]
                hi_all = [max(x, y) for x, y in zip(hi_all, hi)]
    # anything within this XY distance of the anchor stays in frame at any yaw
    radius = math.hypot(max(abs(lo_all[0]), abs(hi_all[0])), max(abs(lo_all[1]), abs(hi_all[1])))
    z_span = hi_all[2] - lo_all[2]
    z_mid = (hi_all[2] + lo_all[2]) / 2
    elev = deg(a.elevation)
    needed = max(2 * radius, z_span * math.cos(elev) + 2 * radius * math.sin(elev)) * a.margin
    ortho = a.size / a.ppu if a.ppu else needed
    if a.ppu and needed > ortho:
        print(f"PF_WARN --ppu {a.ppu} clips this character (needs ortho {needed:.2f}, has {ortho:.2f})")
    ppu = a.size / ortho

    # ------------------------------------------------------------- render setup
    # Subdivision on an already-dense mesh multiplies render time 5-7x for no
    # visible gain at sprite size: drop it for meshes that are dense already.
    for m in meshes:
        for mod in m.modifiers:
            if mod.type == "SUBSURF" and len(m.data.polygons) > 8000:
                mod.render_levels = 0
                mod.levels = 0
    scene.render.engine = eevee_engine_id()
    try:
        scene.eevee.taa_render_samples = a.samples
    except AttributeError:
        pass
    scene.render.resolution_x = scene.render.resolution_y = a.size
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 50
    scene.view_settings.view_transform = "Standard"  # keep the painted colors as-is
    scene.render.dither_intensity = 0.0
    if not any(o.type == "LIGHT" for o in scene.objects):
        sun = bpy.data.lights.new("pf_sun", "SUN")
        sun.energy = 3.0
        sun_obj = bpy.data.objects.new("pf_sun", sun)
        sun_obj.rotation_euler = (deg(50), deg(10), deg(-30))
        scene.collection.objects.link(sun_obj)

    dist = 50.0
    cam = make_ortho_camera("pf_render_cam", (0, -dist, z_mid), (deg(90) - elev, 0, 0), ortho)
    scene.camera = cam
    names = direction_names(a.directions)
    out_root = os.path.abspath(a.out)
    manifest = {
        "directions": names,
        "size": a.size,
        "elevation": a.elevation,
        "ortho_scale": ortho,
        "ppu": ppu,
        "z_mid": z_mid,
        "z_min": lo_all[2],
        "z_max": hi_all[2],
        "passes": [p.strip() for p in a.passes.split(",") if p.strip()],
        "fps": scene.render.fps / max(1, a.step),
        "actions": {},
    }
    passes = [p.strip() for p in a.passes.split(",") if p.strip()]
    pass_mats = {name: (None if name == "color" else pass_material(name, ortho)) for name in passes}
    view_layer = bpy.context.view_layer
    total = 0
    for act, frames in frame_plan:
        if act is not None:
            arm.animation_data.action = act
        act_name = act.name if act is not None else "still"
        span = max(1, (frames[-1] - frames[0]) + (frames[1] - frames[0] if len(frames) > 1 else 1))
        manifest["actions"][act_name] = {"frames": len(frames), "source_frames": frames,
                                         "fps": scene.render.fps * len(frames) / span}   # playback speed that keeps the clip's real duration
        for fi, f in enumerate(frames):
            scene.frame_set(f)
            ax, ay = anchor_xy(arm, meshes)
            for di, dname in enumerate(names):
                yaw = 2 * math.pi * di / a.directions
                cam.location = (ax + dist * math.cos(elev) * math.sin(yaw), ay - dist * math.cos(elev) * math.cos(yaw), z_mid + dist * math.sin(elev))
                cam.rotation_euler = (deg(90) - elev, 0, yaw)
                for pname in passes:
                    view_layer.material_override = pass_mats[pname]
                    root = out_root if pname == "color" else f"{out_root}_{pname}"
                    path = os.path.join(root, act_name, dname, f"frame_{fi:03d}.png")
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    render_to(path, a.size)
                    total += 1
        print(f"PF_PROGRESS action={act_name} frames={len(frames)}")
    view_layer.material_override = None
    with open(os.path.join(out_root, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"PF_OK renders={total} ppu={ppu:.2f} out={out_root}")


if __name__ == "__main__":
    main()
