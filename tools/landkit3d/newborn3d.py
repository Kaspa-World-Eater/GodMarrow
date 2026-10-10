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


def reshape(new):
    """the doll's tells taken out of the rest-pose skin (pass 3), in place:
    - the shoulders: its deltoid shells sat on as round caps; pulled in toward the body and down, and smoothed, so the
      shoulder slopes from the neck into the arm as flesh does;
    - the skull: an egg; given a jaw that narrows under the cheekbones, a chin a little forward and low, and the
      occiput's swell behind, so even under the caul it is a head and not a ball."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(new.data)
    cap = []
    for v in bm.verts:
        x, y, z = v.co
        for sx in (1.0, -1.0):
            d = math.sqrt((x - sx * 0.2) ** 2 + (y - 0.0) ** 2 + (z - 1.43) ** 2)
            if d < 0.12:
                k = (1.0 - d / 0.12) ** 2
                v.co.x -= sx * 0.022 * k
                v.co.z -= 0.012 * k
                cap.append(v)
        if z > 1.55:
            # the face's lower half narrows into the jaw; the chin comes forward and down a touch
            if z < 1.68:
                t = (1.68 - z) / 0.13
                v.co.x *= 1.0 - 0.16 * t
                if y < -0.03:
                    v.co.y -= 0.012 * t
            # the occiput swells behind, above the nape
            oy, oz = y - 0.07, z - 1.7
            v.co.y += 0.018 * math.exp(-(oy * oy + oz * oz) / (2 * 0.05 ** 2))
    bmesh.ops.smooth_vert(bm, verts=list(set(cap)), factor=0.8, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bmesh.ops.smooth_vert(bm, verts=list(set(cap)), factor=0.8, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    # (pass 8) the doll's cuff grooves at its joints, which a 2 cm remesh leaves as faint rings (bracers, standing):
    # the skin smoothed round each joint until the ring is gone, the limb's own mass kept
    joints = []
    for sx in (1.0, -1.0):
        joints += [Vector((sx * 0.739, 0.065, 1.441)), Vector((sx * 0.466, 0.07, 1.441)), Vector((sx * 0.089, 0.0, 0.532)),
                   Vector((sx * 0.089, 0.036, 0.104)), Vector((sx * 0.089, 0.0, 0.93))]
    ring = [v for v in bm.verts if min((v.co - j).length for j in joints) < 0.075]
    for _ in range(8):
        bmesh.ops.smooth_vert(bm, verts=ring, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(new.data)
    bm.free()


def one_skin(arm, body, voxel=0.02, faces=24000):
    """the Mannequin's skin rebuilt as one continuous body (pass 2): the doll's segments and ball joints at the elbows,
    hips and knees fused by a voxel remesh in the rest pose (2 cm: coarser than the grooves between the segments, so
    it fills them; the hands become mitts, which is all 20 px can show), subdivided and smoothed, brought down to a
    game budget, and its bone
    weights carried back from the original by the nearest surface. Returns the new body."""
    bpy.ops.object.select_all(action="DESELECT")
    new = body.copy()
    new.data = body.data.copy()
    bpy.context.scene.collection.objects.link(new)
    new.modifiers.clear()
    new.vertex_groups.clear()
    new.data.remesh_voxel_size = voxel
    new.data.remesh_voxel_adaptivity = 0.0
    bpy.context.view_layer.objects.active = new
    new.select_set(True)
    bpy.ops.object.voxel_remesh()
    sd = new.modifiers.new("sub", "SUBSURF")
    sd.levels = 1
    bpy.ops.object.modifier_apply(modifier="sub")
    sm = new.modifiers.new("smooth", "SMOOTH")
    sm.factor = 0.6
    sm.iterations = 4
    bpy.ops.object.modifier_apply(modifier="smooth")
    dc = new.modifiers.new("dec", "DECIMATE")
    dc.ratio = min(1.0, faces / max(1, len(new.data.polygons)))
    bpy.ops.object.modifier_apply(modifier="dec")
    reshape(new)
    for vg in body.vertex_groups:
        new.vertex_groups.new(name=vg.name)
    dt = new.modifiers.new("weights", "DATA_TRANSFER")
    dt.object = body
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"
    dt.layers_vgroup_select_dst = "NAME"
    bpy.ops.object.modifier_apply(modifier="weights")
    am = new.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    new.parent = arm
    for p in new.data.polygons:
        p.use_smooth = True
    name = body.name
    bpy.data.objects.remove(body, do_unlink=True)
    new.name = name
    print("one skin: %d faces, %d groups" % (len(new.data.polygons), len(new.vertex_groups)))
    return new


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
    # (pass 8) the arms lie level in the rest pose, so streaks long in the height ringed them (cuffs, when they hang):
    # on the arms the runs are long along the arm instead, chosen by how far out from the body's axis a point is
    mpa = N.new("ShaderNodeMapping")
    mpa.inputs["Scale"].default_value = (0.7, 9.0, 9.0)
    L.new(tc.outputs["Object"], mpa.inputs["Vector"])
    runa = N.new("ShaderNodeTexNoise")
    runa.inputs["Scale"].default_value = 3.0
    runa.inputs["Detail"].default_value = 3.0
    L.new(mpa.outputs["Vector"], runa.inputs["Vector"])
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Object"], sep.inputs["Vector"])
    ax = N.new("ShaderNodeMath")
    ax.operation = "ABSOLUTE"
    L.new(sep.outputs["X"], ax.inputs[0])
    armk = N.new("ShaderNodeMapRange")
    armk.inputs["From Min"].default_value = 0.2
    armk.inputs["From Max"].default_value = 0.27
    L.new(ax.outputs["Value"], armk.inputs["Value"])
    mixr = N.new("ShaderNodeMix")
    mixr.data_type = "FLOAT"
    L.new(armk.outputs["Result"], mixr.inputs["Factor"])
    L.new(runs.outputs["Fac"], mixr.inputs["A"])
    L.new(runa.outputs["Fac"], mixr.inputs["B"])
    runk = N.new("ShaderNodeMapRange")                            # only the strongest streaks are fresh runs
    runk.inputs["From Min"].default_value = 0.55
    runk.inputs["From Max"].default_value = 0.68
    L.new(mixr.outputs["Result"], runk.inputs["Value"])
    ramp = N.new("ShaderNodeValToRGB")                            # the blotches: dried to tacky
    cr = ramp.color_ramp
    cr.elements[0].position = 0.46
    cr.elements[0].color = (0.007, 0.002, 0.002, 1)        # dried, near black
    cr.elements[1].position = 0.56
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
    """clots and caul lumps, each on its bone: small clots on the shoulder
    blades, the small of the back, the belly, and a torn flap of caul down the right forearm. Each is laid onto the
    skin where it was aimed (the nearest point of the body's surface), sunk to half its thickness, never floating."""
    clot = gore_material("clot", (0.035, 0.005, 0.006), 0.4)
    caul = gore_material("caul", (0.16, 0.05, 0.045), 0.35)
    mw = arm.matrix_world
    # (bone, offset from the bone's head in armature space at rest (m), radii, material)
    spec = [
        ("DEF-spine.003", (0.08, 0.13, 0.02), (0.035, 0.022, 0.03), clot),       # on the shoulder blade, small
        ("DEF-spine.003", (-0.07, 0.13, -0.03), (0.03, 0.02, 0.04), clot),
        ("DEF-spine.002", (0.03, 0.12, 0.05), (0.07, 0.03, 0.05), caul),
        ("DEF-spine.001", (-0.04, 0.12, 0.02), (0.05, 0.03, 0.04), clot),
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
        sc.render.bake.margin = 16                      # wide: the islands are small, and any black between them shows
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


def _vnoise(p, f, seed):
    """a smooth value noise in [0, 1] (mathutils' noise, offset by a seed)"""
    from mathutils import noise
    return 0.5 + 0.5 * noise.noise(Vector((p.x * f + seed, p.y * f - seed, p.z * f + 0.37 * seed)))


def caul_shell(body):
    """the caul it was born in, torn and still clinging (pass 2; the lore: "The pilgrim looks exactly like the corpses
    on the beach", who lie hooded): a membrane over the skull like a wet hood, so no face can be told, draped off the
    shoulders and down the upper back, torn through in holes, its hem ragged, strands of it hanging from the hem. Made
    from the body's own faces (head, shoulders, upper back), lifted off the skin, so it keeps their bone weights and
    moves with the body."""
    import bmesh
    mat = bpy.data.materials.get("caul_shell") or gore_material("caul_shell", (0.045, 0.011, 0.011), 0.42)
    body.data.materials.append(mat)
    mi = len(body.data.materials) - 1
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.normal_update()

    def region(c):
        # (pass 3) only the back of the scalp and the upper back: a clinging shell over the whole skull and the
        # shoulders read as a helmet and pauldrons, since a hood cannot fall by its weight in every pose
        if c.z > 1.62:
            return c.y > -0.03 + 0.04 * _vnoise(c, 12.0, 4.4)       # the back and top of the scalp, ragged at the brow
        if abs(c.x) > 0.13 + 0.04 * _vnoise(c, 11.0, 1.7):
            return False
        return c.y > 0.02 and c.z > 1.1 + 0.18 * _vnoise(c, 9.0, 3.1)   # down the upper back, the hem ragged

    faces = [f for f in bm.faces if region(f.calc_center_median())]
    dup = bmesh.ops.duplicate(bm, geom=faces)
    nf = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMFace)]
    nv = {v for f in nf for v in f.verts}
    for v in nv:
        # it clings: lifted only a few millimetres, in wrinkles, thicker where it has bunched
        lift = 0.004 + 0.012 * _vnoise(v.co, 19.0, 5.3) ** 3
        v.co += v.normal * lift
    # torn: holes through it where the noise runs high (never over the face, which it hides whole)
    tear = [f for f in nf if _vnoise(f.calc_center_median(), 15.0, 8.2) > 0.57]
    bmesh.ops.delete(bm, geom=tear, context="FACES")
    nf = [f for f in nf if f.is_valid]
    for f in nf:
        f.material_index = mi
        f.smooth = True
    # strands: from the lowest edges of the hem, thin strips of it hanging straight down (at rest) a hand's length
    edges = {e for f in nf for e in f.edges if e.is_boundary}
    low = sorted(edges, key=lambda e: (e.verts[0].co.z + e.verts[1].co.z))
    made = 0
    for e in low:
        c = (e.verts[0].co + e.verts[1].co) / 2
        if c.z > 1.35 or _vnoise(c, 31.0, 2.2) < 0.62 or made >= 26:
            continue
        ln = 0.05 + 0.12 * _vnoise(c, 41.0, 6.6)
        r = bmesh.ops.extrude_edge_only(bm, edges=[e])
        vs = [g for g in r["geom"] if isinstance(g, bmesh.types.BMVert)]
        for v in vs:
            v.co.z -= ln
            v.co += (c - v.co) * 0.45                                  # narrowing to its tip
        made += 1
    bm.to_mesh(body.data)
    bm.free()
    for p in body.data.polygons:
        if p.material_index == mi:
            p.use_smooth = True
    print("caul: %d faces, %d strands" % (sum(1 for p in body.data.polygons if p.material_index == mi), made))


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
    """each clip keyed at 30 fps from newborn_pose and laid on its own NLA track (the glb's animation of that name).
    Every pose is laid with the animation system off (no action, no tracks: otherwise the clips already keyed are
    evaluated over the pose as it is laid, and the first frames of each later clip came out wrong), its values kept,
    and the curves written after; each rotation kept on the same side as the one before it, so nothing flips between
    keys."""
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    arm.animation_data_create()
    ad = arm.animation_data
    bones = [pb for pb in arm.pose.bones if pb.name.startswith("DEF-") and "f_" not in pb.name and "thumb" not in pb.name]
    for c in clips:
        ad.action = None
        for tr in ad.nla_tracks:
            tr.mute = True
        sec = NP.CLIPS[c][0]
        n = int(round(sec * FPS))
        vals = {pb.name: ([], []) for pb in bones}
        for f in range(n + 1):
            lay(arm, NP.pose(c, f / FPS))
            for pb in bones:
                q = pb.rotation_quaternion.copy()
                rots = vals[pb.name][1]
                if rots and q.dot(rots[-1]) < 0.0:
                    q.negate()
                vals[pb.name][0].append(pb.location.copy())
                rots.append(q)
        act = bpy.data.actions.new(c)
        act.use_fake_user = True
        ad.action = act
        for pb in bones:
            locs, rots = vals[pb.name]
            for path, seq, k in (("location", locs, 3), ("rotation_quaternion", rots, 4)):
                for ix in range(k):
                    fc = act.fcurve_ensure_for_datablock(arm, 'pose.bones["%s"].%s' % (pb.name, path), index=ix)
                    fc.keyframe_points.add(len(seq))
                    co = []
                    for f, v in enumerate(seq):
                        co += [float(f), float(v[ix])]
                    fc.keyframe_points.foreach_set("co", co)
                    for kp in fc.keyframe_points:
                        kp.interpolation = "LINEAR"
                    fc.update()
        ad.action = None
        tr = ad.nla_tracks.new()
        tr.name = c
        tr.strips.new(c, 0, act)
    for tr in ad.nla_tracks:
        tr.mute = False
    reset(arm)


def export_glb(arm, body, out, clips):
    os.makedirs(out, exist_ok=True)
    body = one_skin(arm, body)
    coat(arm, body)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier="lumps")
    bake_coat(body, out)
    caul_shell(body)
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
