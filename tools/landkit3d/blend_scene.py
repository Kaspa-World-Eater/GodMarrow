"""Run inside Blender (blender --background --python blend_scene.py -- SCENE OUT_DIR [FOCUS_X FOCUS_Y [W H]]).

The 3D road (tools/landkit/passes/thai_temple.md, the trial): the forms are built as real geometry in the game's own
coordinates (yards; x screen right-down, y screen left-down, z up), seen by an orthographic camera matched to the
game's camera exactly (a yard is 18 x 9 engine px on the ground and 21 px of height), and Blender renders only the
DATA of them, never a look: per pixel the surface's normal, its world position, its material, its ambient occlusion
and the moon on it (lambert and shadow). paint3d.py paints from those, with our ramps and rules (FORM IS LAW: the
light comes from the real form; the paint only gives it its material).

The game's axes are mirrored against a right-handed world, so everything is built under one parent that flips y (and
squeezes z by 21/22.05, the camera's own height ratio at a 30 degree look), and the passes are flipped back.
"""
import bpy
import sys
import os
import math
import importlib
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

KX, KY, KZ = 18.0, 9.0, 21.0
GW, GH = 480, 270
K = KX / math.cos(math.radians(45))            # px per yard along the screen's own axes (25.46)
ZSQ = KZ / (K * math.cos(math.radians(30)))      # the game's height ratio against a true 30 degree camera (0.952)
SUN = Vector((-0.62, 0.22, 0.75)).normalized()   # the moon (wood_scene.SUN), in game coordinates


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def game_root():
    """the parent everything is built under: game coordinates in, Blender's out"""
    root = bpy.data.objects.new("GAME", None)
    bpy.context.scene.collection.objects.link(root)
    root.scale = (1.0, -1.0, ZSQ)
    return root


def setup_camera(focus, gw=GW, gh=GH):
    sc = bpy.context.scene
    cam_d = bpy.data.cameras.new("cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = max(gw, gh) / K
    cam_d.sensor_fit = "AUTO"
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    cam.rotation_euler = (math.radians(60.0), 0.0, math.radians(45.0))
    f = Vector((focus[0], -focus[1], 0.0))            # the focus on the ground (Blender space)
    fwd = cam.rotation_euler.to_matrix() @ Vector((0.0, 0.0, -1.0))
    cam.location = f - fwd * 80.0
    cam_d.clip_end = 400.0
    sc.camera = cam
    sc.render.resolution_x = gw
    sc.render.resolution_y = gh
    sc.render.resolution_percentage = 100
    return cam


def setup_sun():
    sun = bpy.data.lights.new("moon", "SUN")
    sun.energy = 1.0
    sun.angle = math.radians(0.6)
    o = bpy.data.objects.new("moon", sun)
    bpy.context.scene.collection.objects.link(o)
    d = Vector((SUN.x, -SUN.y, SUN.z * ZSQ)).normalized()   # toward the moon, in Blender space
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    return o


def setup_render(samples=24):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.cycles.pixel_filter_type = "BOX"
    sc.cycles.filter_width = 0.01                      # one ray per pixel centre's neighbourhood: crisp art pixels
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.0
    sc.world = w
    vl = sc.view_layers[0]
    vl.use_pass_normal = True
    vl.use_pass_position = True
    vl.use_pass_ambient_occlusion = True
    vl.use_pass_material_index = True
    vl.use_pass_diffuse_direct = True
    sc.cycles.ao_bounces_render = 0
    bpy.context.scene.world.light_settings.distance = 3.0   # AO reach: 3 yd


def material(name, index):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (0.8, 0.8, 0.8, 1.0)
    b.inputs["Roughness"].default_value = 1.0
    m.pass_index = index
    return m


def render_passes(out_dir):
    """render, then read every pass back as numpy and save them (game coordinates) to out_dir/passes.npz"""
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    rl = nt.nodes.new("CompositorNodeRLayers")
    outs = {}
    for key in ("Normal", "Position", "AO", "IndexMA", "DiffDir", "Alpha"):
        fo = nt.nodes.new("CompositorNodeOutputFile")
        fo.base_path = os.path.join(out_dir, "_p")
        fo.format.file_format = "OPEN_EXR"
        fo.format.color_depth = "32"
        fo.file_slots[0].path = key + "_"
        nt.links.new(rl.outputs[key], fo.inputs[0])
        outs[key] = fo
    bpy.ops.render.render(write_still=False)
    P = {}
    for key in outs:
        f = [x for x in os.listdir(os.path.join(out_dir, "_p")) if x.startswith(key + "_")]
        img = bpy.data.images.load(os.path.join(out_dir, "_p", sorted(f)[-1]))
        a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)[::-1]
        P[key] = a
    gw, gh = sc.render.resolution_x, sc.render.resolution_y
    n = P["Normal"][..., :3].copy()
    n[..., 1] = -n[..., 1]
    n[..., 2] = n[..., 2] / ZSQ
    n /= np.linalg.norm(n, axis=2, keepdims=True) + 1e-9
    pos = P["Position"][..., :3].copy()
    pos[..., 1] = -pos[..., 1]
    pos[..., 2] = pos[..., 2] / ZSQ
    sky = sky_passes(out_dir, outs)
    np.savez_compressed(os.path.join(out_dir, "passes.npz"), normal=n, pos=pos, ao=P["AO"][..., 0],
                        mat=np.round(P["IndexMA"][..., 0]).astype(np.int16), moon=P["DiffDir"][..., 0],
                        alpha=P["Alpha"][..., 0], shelter=sky["shelter"], skyview=sky["skyview"], gw=gw, gh=gh)


def sky_passes(out_dir, outs):
    """a second look, at the sky (MASTER_RULES 6: weather happens in the world, by what it reaches). A sun straight
    down shows what the rain falls on: shelter is 1 where an eave, a roof or a crown keeps it off. The occlusion out to
    12 yd shows how much of the overcast each surface sees (skyview): low inside the hall, under the porch, deep in a
    recess, where the 3 yd contact occlusion can't tell. The camera and the forms are the same, so the pixels match"""
    sc = bpy.context.scene
    moon = bpy.data.objects["moon"]
    rot = moon.rotation_euler.copy()
    moon.rotation_euler = (0.0, 0.0, 0.0)                     # a sun with no turn points straight down
    dist = sc.world.light_settings.distance
    sc.world.light_settings.distance = 12.0
    for key, fo in outs.items():
        fo.file_slots[0].path = key + "sky_"
    bpy.ops.render.render(write_still=False)
    got = {}
    for key in ("DiffDir", "AO"):
        f = [x for x in os.listdir(os.path.join(out_dir, "_p")) if x.startswith(key + "sky_")]
        img = bpy.data.images.load(os.path.join(out_dir, "_p", sorted(f)[-1]))
        got[key] = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)[::-1][..., 0]
    moon.rotation_euler = rot
    sc.world.light_settings.distance = dist
    for key, fo in outs.items():
        fo.file_slots[0].path = key + "_"
    return dict(shelter=(got["DiffDir"] < 0.02).astype(np.float32), skyview=got["AO"])


def to_heightfield(root, focus, half=17.0, res=0.05):
    """the same scene as a height field (the trial's version A, our engine's way): rays straight down give the top
    surface at every 0.05 yd and its material; everything under it (beneath the eaves, the porch roof, the bare
    rafters) is filled solid to the ground, as one height per place must. Then the forms are replaced by that field"""
    deps = bpy.context.evaluated_depsgraph_get()
    sc = bpy.context.scene
    xs = np.arange(focus[0] - half, focus[0] + half, res)
    ys = np.arange(focus[1] - half, focus[1] + half, res)
    nx, ny = len(xs), len(ys)
    Hh = np.zeros((ny, nx), np.float32)
    Mi = np.ones((ny, nx), np.int16)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            ok, loc, nrm, fi, ob, mx = sc.ray_cast(deps, Vector((x, -y, 60.0)), Vector((0.0, 0.0, -1.0)))
            if ok:
                Hh[j, i] = loc.z / ZSQ
                mats = ob.data.materials if ob and ob.type == "MESH" else []
                if len(mats):
                    Mi[j, i] = mats[0].pass_index
    for o in list(bpy.data.objects):
        if o.type == "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    verts = [(float(x), float(y), float(Hh[j, i])) for j, y in enumerate(ys) for i, x in enumerate(xs)]
    faces = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(ny - 1) for i in range(nx - 1)]
    me = bpy.data.meshes.new("heightfield")
    me.from_pydata(verts, [], faces)
    names = {v: k for k, v in __import__("parts3d").MATS.items()}
    slots = sorted(set(int(v) for v in np.unique(Mi)))
    for k in slots:
        me.materials.append(material(names.get(k, "ground"), k))
    slot_of = {k: s for s, k in enumerate(slots)}
    fm = [slot_of[int(Mi[j, i])] for j in range(ny - 1) for i in range(nx - 1)]
    me.polygons.foreach_set("material_index", fm)
    me.update()
    o = bpy.data.objects.new("heightfield", me)
    sc.collection.objects.link(o)
    o.parent = root


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:]
    scene, out_dir = argv[0], argv[1]
    focus = (float(argv[2]), float(argv[3])) if len(argv) > 3 else (0.0, 0.0)
    gw, gh = (int(argv[4]), int(argv[5])) if len(argv) > 5 else (GW, GH)
    os.makedirs(out_dir, exist_ok=True)
    clear()
    root = game_root()
    mod = importlib.import_module(scene)
    mod.build(root, material)
    if "--heightfield" in argv:
        to_heightfield(root, focus)
    setup_camera(focus, gw, gh)
    setup_sun()
    setup_render()
    render_passes(out_dir)
    print("passes saved", out_dir)
