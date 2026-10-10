"""The newborn in Blender: the real body, posed from newborn_pose.py, coated in the pool, rendered in eight views.

    blender --background --python newborn3d.py -- MODE OUT [CLIPS]

MODE `still` renders a few frames in two views for checking; `sticks` writes every frame's bone lines to OUT (json) for
the stick pass (newborn_sticks.py); `render` renders every frame of CLIPS (default all) in all eight views to OUT/.

**The body** is the Quaternius Universal Animation Library's Mannequin (CC0, tools/pixelforge/assets/animations): a
skinned person of 1.83 m with real anatomy (the ribcage, the belly, the pelvis, the limbs' muscle) and no face, which is
the newborn exactly: "a suggestion of a person", "a generic new body" (Derek, 2026-10-10). It replaces the stick-limbed
stand-in (MASTER_RULES 2.3).

**The coat** (the brief): the skin under drying blood and caul, wet where fresh, near black where it has dried, a lumpy
coagulated surface (a displacement of the skin), clots on the shoulders and the back, a matted mass where hair will be;
and the blood streaming off it: every frame, strands hang straight down from the body's lowest points (the anchors
chosen by the posed skin's normals), growing and dropping on their own clocks.

**The pose** (laid each frame): the trunk by local bends, the limbs by analytic two-bone IK to the pose's wrists and
ankles with the elbows and knees bent toward their poles, the hands and feet aimed.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import newborn_pose as NP  # noqa: E402

GLB = os.path.join(HERE, "..", "pixelforge", "assets", "animations", "quaternius_ual_standard.glb")
FIG_PX = 195                   # the hero's figure height in frame px (art/sprites/*_hd.json, figure_height)
BODY_M = 1.83                  # the Mannequin's height
PX_M = FIG_PX / BODY_M
FRAME = 440                    # frame px (square), the ground point at FOOT
FOOT = (220, 330)
SS = 2                         # rendered at 2x, reduced by area
ELEV = 12.0                    # the hero camera's elevation (deg)
VIEWS = {"down": 0, "front": 45, "side": 90, "back": 135, "up": 180, "front_l": -45, "side_l": -90, "back_l": -135}


# ---------------------------------------------------------------- the body

def load():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    for o in list(bpy.data.objects):
        if o.name not in ("Rig", "Mannequin"):
            bpy.data.objects.remove(o, do_unlink=True)
    arm = bpy.data.objects["Rig"]
    arm.animation_data_clear()
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return arm, bpy.data.objects["Mannequin"]


def coat_material():
    """the coat: blood drying on skin. Most of it dried near black and matte in blotches; fresh blood in runs that go
    straight down the body as it stood up out of the pool (a noise stretched along the height, so the streaks are
    vertical, never rings round the limbs), dark red and wet; the noise in the object's own space so it rides on the
    body as it moves."""
    m = bpy.data.materials.new("coat")
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    bsdf = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexCoord")
    big = N.new("ShaderNodeTexNoise")
    big.inputs["Scale"].default_value = 4.5
    big.inputs["Detail"].default_value = 8.0
    big.inputs["Roughness"].default_value = 0.6
    L.new(tc.outputs["Object"], big.inputs["Vector"])
    mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (9.0, 9.0, 0.7)          # streaks: fine across, long down
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    runs = N.new("ShaderNodeTexNoise")
    runs.inputs["Scale"].default_value = 3.0
    runs.inputs["Detail"].default_value = 3.0
    L.new(mp.outputs["Vector"], runs.inputs["Vector"])
    runk = N.new("ShaderNodeMapRange")                            # only the strongest streaks are fresh runs
    runk.inputs["From Min"].default_value = 0.55
    runk.inputs["From Max"].default_value = 0.68
    L.new(runs.outputs["Fac"], runk.inputs["Value"])
    ramp = N.new("ShaderNodeValToRGB")                            # the blotches: dried to tacky
    cr = ramp.color_ramp
    cr.elements[0].position = 0.42
    cr.elements[0].color = (0.007, 0.002, 0.002, 1)        # dried, near black
    cr.elements[1].position = 0.62
    cr.elements[1].color = (0.06, 0.008, 0.009, 1)         # tacky, dark red
    L.new(big.outputs["Fac"], ramp.inputs["Fac"])
    mixc = N.new("ShaderNodeMix")
    mixc.data_type = "RGBA"
    mixc.inputs["B"].default_value = (0.15, 0.010, 0.014, 1)    # a fresh run
    L.new(runk.outputs["Result"], mixc.inputs["Factor"])
    L.new(ramp.outputs["Color"], mixc.inputs["A"])
    L.new(mixc.outputs["Result"], bsdf.inputs["Base Color"])
    rough = N.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.78               # dried: matte
    rough.inputs["To Max"].default_value = 0.28               # a fresh run: wet
    L.new(runk.outputs["Result"], rough.inputs["Value"])
    L.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    bsdf.inputs["Specular IOR Level"].default_value = 0.45
    bump = N.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    fine = N.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 40.0
    L.new(tc.outputs["Object"], fine.inputs["Vector"])
    L.new(fine.outputs["Fac"], bump.inputs["Height"])
    L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def gore_material(name, col, rough):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.8
    return m


def coat(arm, body):
    """the coat over the Mannequin: one material, a coagulated, lumpy surface"""
    mat = coat_material()
    body.data.materials.clear()
    body.data.materials.append(mat)
    for p in body.data.polygons:
        p.material_index = 0
        p.use_smooth = True
    tex = bpy.data.textures.new("lumps", "CLOUDS")
    tex.noise_scale = 0.045
    tex.noise_depth = 2
    d = body.modifiers.new("lumps", "DISPLACE")
    d.texture = tex
    d.texture_coords = "LOCAL"
    d.strength = 0.012
    d.mid_level = 0.5
    # the displacement before the armature: it rides on the body as it bends
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_move_to_index(modifier="lumps", index=0)
    return mat


def clots(arm, body):
    """clots and caul lumps, each on its bone: the matted mass over the skull, clots on the shoulders, the shoulder
    blades, the small of the back, the belly, and a torn flap of caul down the right forearm. Each is laid onto the
    skin where it was aimed (the nearest point of the body's surface), sunk to half its thickness, never floating."""
    clot = gore_material("clot", (0.035, 0.005, 0.006), 0.4)
    caul = gore_material("caul", (0.16, 0.05, 0.045), 0.35)
    mw = arm.matrix_world
    # (bone, offset from the bone's head in armature space at rest (m), radii, material)
    spec = [
        ("DEF-head", (0.0, 0.02, 0.14), (0.085, 0.10, 0.06), clot),      # the matted mass of the hair
        ("DEF-head", (0.05, 0.04, 0.10), (0.04, 0.06, 0.05), clot),
        ("DEF-head", (-0.05, 0.05, 0.09), (0.035, 0.05, 0.05), clot),
        ("DEF-head", (0.0, 0.07, 0.05), (0.06, 0.04, 0.07), clot),        # down the back of the skull
        ("DEF-spine.003", (0.11, 0.08, 0.10), (0.06, 0.035, 0.045), clot),
        ("DEF-spine.003", (-0.10, 0.09, 0.06), (0.05, 0.03, 0.06), clot),
        ("DEF-spine.002", (0.03, 0.12, 0.05), (0.07, 0.03, 0.05), caul),
        ("DEF-spine.001", (-0.04, 0.12, 0.02), (0.05, 0.03, 0.04), clot),
        ("DEF-spine.001", (0.02, -0.12, 0.04), (0.06, 0.03, 0.04), caul),
        ("DEF-upper_arm.L", (0.10, 0.03, -0.03), (0.06, 0.03, 0.035), clot),
        ("DEF-forearm.R", (-0.12, 0.0, -0.04), (0.09, 0.035, 0.025), caul),
        ("DEF-thigh.R", (0.0, 0.07, -0.15), (0.04, 0.03, 0.08), clot),
        ("DEF-hips", (0.0, 0.12, 0.02), (0.07, 0.03, 0.05), caul),
    ]
    for i, (bn, off, rad, mat) in enumerate(spec):
        b = arm.data.bones[bn]
        head = mw @ b.head_local
        aim_at = head + Vector(off)
        ok, loc, nrm, _ = body.closest_point_on_mesh(body.matrix_world.inverted() @ aim_at)
        if ok:
            aim_at = body.matrix_world @ (loc - nrm * min(rad) * 0.45)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=9, location=aim_at)
        o = bpy.context.active_object
        o.name = "clot%d" % i
        o.scale = rad
        bpy.ops.object.transform_apply(scale=True)
        for v in o.data.vertices:                        # lumpy, never a ball
            n = v.co.normalized()
            v.co += n * 0.012 * math.sin(v.co.x * 61 + i) * math.cos(v.co.z * 47 - i)
        o.data.materials.append(mat)
        for p in o.data.polygons:
            p.use_smooth = True
        m = o.matrix_world.copy()
        o.parent = arm
        o.parent_type = "BONE"
        o.parent_bone = bn
        o.matrix_world = m


# ---------------------------------------------------------------- posing

def _upd():
    bpy.context.view_layer.update()


def reset(arm):
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)
    _upd()


def bend(pb, deg_x=0.0, deg_z=0.0, deg_y=0.0):
    q = Quaternion((1, 0, 0), math.radians(deg_x)) @ Quaternion((0, 0, 1), math.radians(deg_z)) \
        @ Quaternion((0, 1, 0), math.radians(deg_y))
    pb.rotation_quaternion = q
    _upd()


def aim(pb, d):
    """swing the bone so its length points along d (armature space), keeping its own twist"""
    d = Vector(d).normalized()
    m = pb.matrix.copy()
    y = m.col[1].xyz.normalized()
    q = y.rotation_difference(d)
    r = q.to_matrix() @ m.to_3x3()
    nm = r.to_4x4()
    nm.translation = m.translation
    pb.matrix = nm
    _upd()


def ik2(root, target, l1, l2, pole):
    """the joint of a two-bone chain from root to target, bent toward the pole direction"""
    root, target, pole = Vector(root), Vector(target), Vector(pole)
    dv = target - root
    d = min(dv.length, (l1 + l2) * 0.999)
    u = dv.normalized()
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    v = pole - u * pole.dot(u)
    v = v.normalized() if v.length > 1e-6 else Vector((0, 0, 1))
    return root + u * a + v * h, root + u * d


def lay(arm, p):
    """lay the pose p (newborn_pose) on the rig"""
    reset(arm)
    B = arm.pose.bones
    hips = B["DEF-hips"]
    q = Quaternion((0, 0, 1), math.radians(p.get("yaw", 0.0))) @ Quaternion((0, 1, 0), math.radians(p.get("roll", 0.0))) \
        @ Quaternion((1, 0, 0), math.radians(p["pitch"]))
    m = hips.matrix.copy()
    r = q.to_matrix() @ m.to_3x3()
    nm = r.to_4x4()
    nm.translation = Vector(p["hips"])
    hips.matrix = nm
    _upd()
    side = p.get("side", (0, 0, 0))
    for i, bn in enumerate(("DEF-spine.001", "DEF-spine.002", "DEF-spine.003")):
        bend(B[bn], p["spine"][i], side[i])
    bend(B["DEF-neck"], p["neck"], 0.0, p.get("head_turn", 0.0) * 0.5)
    bend(B["DEF-head"], p["head"], 0.0, p.get("head_turn", 0.0) * 0.5)
    for s in ("L", "R"):
        sg = 1.0 if s == "L" else -1.0
        ua, fa, hd = B["DEF-upper_arm." + s], B["DEF-forearm." + s], B["DEF-hand." + s]
        w = p.get("wrist." + s)
        if w is None:
            # hanging: the arm falls from the shoulder, a little forward and out, the elbow soft
            sw = math.radians(p.get("arm_swing." + s, 0.0))
            sh = ua.head.copy()
            down = Vector((sg * 0.12, -math.sin(sw) * 0.9 - 0.12, -1.0)).normalized()
            w = sh + down * (NP.UPPER + NP.FORE) * 0.97
            pole = Vector((sg * 0.3, 0.6, 0.0))
        else:
            pole = Vector(p["elbow." + s])
        elbow, wrist = ik2(ua.head, w, NP.UPPER, NP.FORE, pole)
        aim(ua, elbow - ua.head)
        aim(fa, wrist - fa.head)
        aim(hd, p.get("hand." + s, (sg * 0.1, -0.3, -1.0)))
    for s in ("L", "R"):
        th, sh, ft = B["DEF-thigh." + s], B["DEF-shin." + s], B["DEF-foot." + s]
        knee, ankle = ik2(th.head, p["ankle." + s], NP.THIGH, NP.SHIN, p["knee." + s])
        aim(th, knee - th.head)
        aim(sh, ankle - sh.head)
        aim(ft, p["foot." + s])


# ---------------------------------------------------------------- the drips

_drips = []


def drips(body, t, seed=0):
    """blood streaming off: from the lowest-facing points of the posed skin, strands hanging straight down, each on
    its own clock (it grows, necks, and its bead drops), and some beads already falling below"""
    global _drips
    for o in _drips:
        bpy.data.objects.remove(o, do_unlink=True)
    _drips = []
    deps = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(deps)
    me = ev.to_mesh()
    mw = body.matrix_world
    mat = bpy.data.materials.get("drip") or gore_material("drip", (0.15, 0.01, 0.014), 0.12)
    cands = []
    for v in me.vertices:
        n = (mw.to_3x3() @ v.normal).normalized()
        if n.z < -0.55:
            h = (v.index * 2654435761 + seed) % 1000
            if h < 9:
                cands.append((mw @ v.co, h))
    ev.to_mesh_clear()
    verts, faces = [], []

    def strand(top, length, r0):
        base = len(verts)
        rings = 5
        for i in range(rings + 1):
            k = i / rings
            rr = r0 * (1.0 - 0.6 * k) + (0.9 * r0 * max(0.0, (k - 0.75) / 0.25))    # thinning, then the bead
            z = top.z - length * k
            for j in range(6):
                a = 2 * math.pi * j / 6
                verts.append((top.x + rr * math.cos(a), top.y + rr * math.sin(a), z))
        for i in range(rings):
            for j in range(6):
                a0, a1 = base + i * 6 + j, base + i * 6 + (j + 1) % 6
                faces.append((a0, a1, a1 + 6, a0 + 6))

    for co, h in cands:
        if co.z < 0.03:
            continue
        period = 0.9 + (h % 7) * 0.17
        ph = (t / period + h / 1000.0) % 1.0
        length = min(co.z - 0.01, 0.025 + 0.11 * ph)
        strand(co, length, 0.006 + 0.003 * (h % 3))
        if ph < 0.35 and co.z > 0.2:                         # the last bead, still falling
            fall = (ph / 0.35) * (co.z - 0.05)
            b = Vector((co.x, co.y, co.z - 0.14 - fall))
            if b.z > 0.02:
                strand(b, 0.03, 0.007)
    if verts:
        mesh = bpy.data.meshes.new("drips")
        mesh.from_pydata(verts, [], faces)
        o = bpy.data.objects.new("drips", mesh)
        bpy.context.scene.collection.objects.link(o)
        mesh.materials.append(mat)
        for p in mesh.polygons:
            p.use_smooth = True
        _drips.append(o)


# ---------------------------------------------------------------- the camera, the light, the render

def stage():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 48
    sc.cycles.use_denoising = False
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x = sc.render.resolution_y = FRAME * SS
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.05, 0.06, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    sc.world = w
    cam_d = bpy.data.cameras.new("cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = FRAME / PX_M
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    e = math.radians(ELEV)
    d = Vector((0, math.cos(e), -math.sin(e)))            # looking along +Y and down: the body faces -Y, the camera
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # the ground point (0,0,0) to FOOT in the frame: shift the camera along its own up and right
    up = cam.matrix_world.to_3x3() @ Vector((0, 1, 0))
    cam.location = -d * 20.0
    cam.location += up * ((FOOT[1] - FRAME / 2) / PX_M) * 1.0
    sc.camera = cam
    # the key: high, from the camera's upper left (the game's sun and fire come from above); a cool rim from behind
    for name, en, rot, col, size in (("key", 4.0, (50, -25, -35), (1.0, 0.93, 0.85), 4.0),
                                     ("rim", 3.0, (-60, 0, 160), (0.75, 0.8, 1.0), 3.0)):
        ld = bpy.data.lights.new(name, "SUN")
        ld.energy = en
        ld.color = col
        ld.angle = math.radians(size)
        lo = bpy.data.objects.new(name, ld)
        lo.rotation_euler = [math.radians(a) for a in rot]
        sc.collection.objects.link(lo)
    return cam


def frames_of(clips):
    for c in clips:
        for i, t in enumerate(NP.times(c)):
            yield c, i, t


# ---------------------------------------------------------------- the live body: a .glb for Godot

FPS = 30


def bake_coat(body, out, size=1024):
    """the procedural coat baked to the body's own textures (glTF carries images, not node noise): colour, roughness
    and the fine grain's normal"""
    sc = bpy.context.scene
    # the Mannequin's own UV layers are empty (every corner at 0, 0): a fresh unwrap, the only layer
    while body.data.uv_layers:
        body.data.uv_layers.remove(body.data.uv_layers[0])
    body.data.uv_layers.new(name="UVMap")
    if True:
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(island_margin=0.01)
        bpy.ops.object.mode_set(mode="OBJECT")
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 8
    for o in bpy.data.objects:
        o.select_set(False)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    mat = body.data.materials[0]
    N, L = mat.node_tree.nodes, mat.node_tree.links
    imgs = {}
    for kind, btype, cs in (("col", "DIFFUSE", "sRGB"), ("rough", "ROUGHNESS", "Non-Color"), ("nrm", "NORMAL", "Non-Color")):
        img = bpy.data.images.new("newborn_" + kind, size, size)
        img.colorspace_settings.name = cs
        node = N.new("ShaderNodeTexImage")
        node.image = img
        N.active = node
        if btype == "DIFFUSE":
            sc.render.bake.use_pass_direct = False
            sc.render.bake.use_pass_indirect = False
            sc.render.bake.use_pass_color = True
        sc.render.bake.margin = 6
        bpy.ops.object.bake(type=btype)
        img.filepath_raw = os.path.join(out, "newborn_%s.png" % kind)
        img.file_format = "PNG"
        img.save()
        imgs[kind] = img
        N.remove(node)
    # the export material: the baked images on a plain principled surface
    for n in list(N):
        if n.type not in ("OUTPUT_MATERIAL", "BSDF_PRINCIPLED"):
            N.remove(n)
    bsdf = N["Principled BSDF"]
    tc = N.new("ShaderNodeTexImage")
    tc.image = imgs["col"]
    L.new(tc.outputs["Color"], bsdf.inputs["Base Color"])
    tr = N.new("ShaderNodeTexImage")
    tr.image = imgs["rough"]
    sep = N.new("ShaderNodeSeparateColor")
    L.new(tr.outputs["Color"], sep.inputs["Color"])
    L.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    tn = N.new("ShaderNodeTexImage")
    tn.image = imgs["nrm"]
    nm = N.new("ShaderNodeNormalMap")
    L.new(tn.outputs["Color"], nm.inputs["Color"])
    L.new(nm.outputs["Normal"], bsdf.inputs["Normal"])


def join_clots(arm, body):
    """the clots made part of the skin, each wholly on its bone, so the game's skeleton carries them"""
    reset(arm)
    clots_ = [o for o in bpy.data.objects if o.name.startswith("clot")]
    for o in clots_:
        bn = o.parent_bone
        m = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = m
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        g = o.vertex_groups.new(name=bn)
        g.add([v.index for v in o.data.vertices], 1.0, "REPLACE")
    for o in bpy.data.objects:
        o.select_set(o in clots_ or o == body)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()


def key_clips(arm, clips):
    """each clip keyed at 30 fps from newborn_pose and laid on its own NLA track (the glb's animation of that name)"""
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    arm.animation_data_create()
    bones = [pb for pb in arm.pose.bones if pb.name.startswith("DEF-") and "f_" not in pb.name and "thumb" not in pb.name]
    for c in clips:
        sec = NP.CLIPS[c][0]
        act = bpy.data.actions.new(c)
        act.use_fake_user = True
        arm.animation_data.action = act
        n = int(round(sec * FPS))
        for f in range(n + 1):
            lay(arm, NP.pose(c, f / FPS))
            for pb in bones:
                pb.keyframe_insert("location", frame=f)
                pb.keyframe_insert("rotation_quaternion", frame=f)
        arm.animation_data.action = None
        tr = arm.animation_data.nla_tracks.new()
        tr.name = c
        tr.strips.new(c, 0, act)
    reset(arm)


def export_glb(arm, body, out, clips):
    os.makedirs(out, exist_ok=True)
    coat(arm, body)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier="lumps")
    bake_coat(body, out)
    clots(arm, body)
    join_clots(arm, body)
    key_clips(arm, clips)
    for o in bpy.data.objects:
        o.select_set(o in (arm, body))
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, "newborn.glb"), export_format="GLB", use_selection=True,
                              export_animation_mode="NLA_TRACKS", export_force_sampling=True,
                              export_def_bones=False, export_image_format="AUTO")
    print("glb", os.path.join(out, "newborn.glb"))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    mode, out = argv[0], argv[1]
    clips = argv[2].split(",") if len(argv) > 2 else list(NP.CLIPS)
    arm, body = load()
    if mode == "glb":
        export_glb(arm, body, out, clips)
        return
    if mode == "sticks":
        data = {}
        for c, i, t in frames_of(clips):
            lay(arm, NP.pose(c, t))
            data["%s/%d" % (c, i)] = {pb.name: [list(arm.matrix_world @ pb.head), list(arm.matrix_world @ pb.tail)]
                                     for pb in arm.pose.bones if "f_" not in pb.name and "thumb" not in pb.name}
        json.dump(data, open(out, "w"))
        print("sticks", len(data))
        return
    coat(arm, body)
    clots(arm, body)
    stage()
    os.makedirs(out, exist_ok=True)
    views = VIEWS if mode == "render" else {"front": 45, "side": 90}
    sel = list(frames_of(clips))
    if mode == "still":
        n = int(argv[3]) if len(argv) > 3 else 3
        sel = [f for c in clips for f in [x for x in sel if x[0] == c][:: max(1, len([x for x in sel if x[0] == c]) // n)]]
    for c, i, t in sel:
        lay(arm, NP.pose(c, t))
        drips(body, t, seed=hash(c) % 997)
        for vn, yaw in views.items():
            arm.rotation_euler = (0, 0, math.radians(yaw))
            for o in _drips:
                o.rotation_euler = (0, 0, math.radians(yaw))
            _upd()
            bpy.context.scene.render.filepath = os.path.join(out, "%s_%s_%02d.png" % (c, vn, i))
            bpy.ops.render.render(write_still=True)
    print("rendered", len(sel) * len(views))


if __name__ == "__main__":
    main()
