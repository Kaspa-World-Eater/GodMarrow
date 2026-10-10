"""One body for every dead (tools/landkit/passes/the_dead.md; the study, tools/art_study/chapters/15-the-dead.md).

Derek, 2026-10-09: "Bodies look bad". The dead were a sphere for a torso and tubes for limbs (MASTER_RULES 2.3). Here
one builder makes every body, in every place, from one skeleton at true size: `body(name, pose, state, x, y, yaw,
support)` lays it on whatever lies under it (`support(x, y)`: the floor's height there) and returns its parts.

- **The pilgrim's own shape** (the area's lore: "The pilgrim looks exactly like the corpses on the beach"): the
  proportions of a body 1.80 m tall (chapter 15, section 2), a hooded cloak and a rope belt.
- **Flesh as joined masses, never spheres and tubes:** Blender metaballs, so the ribcage's barrel, the belly and the
  pelvis, the shoulders, the limbs' bellies, the hands and the feet melt into one skin while each still reads
  (chapter 15, 6b to 6e); a limb is several masses along its straight bone, thick where the muscle is.
- **It lies by its weight** (6f): every joint is laid on the ground beneath it and every bone is a straight line
  between its joints, raised just enough to clear what lies under it (the upper hull), so it bridges hollows and
  never bends into them; the masses flatten a little where they press.
- **States** (6h) from the same skeleton: `fresh`, `bloat` (the belly a dome, everything puffed), `rot` (sunk,
  thinned, the ribs showing), `bone` (the skeleton only, in the collapsed cloak).
- **The cloak** (6i): a second, larger shell over the trunk, the upper arms and thighs, the hood over the head, its hem
  spread on the ground round the hips.

Units: yards (a metre is 1.0936 yd). Material names are parts3d's: `corpse` (skin), `cloth`, `bone`.
"""
import math
import random
import bpy
from mathutils import Vector, Quaternion
import parts3d as P

M = 1.0936                  # yards a metre
REACH = 0.672               # a metaball's visible radius over its set radius (stiffness 2, threshold 0.6)
RES = 0.022                 # the shell's resolution (yards)

# the joints of a body lying straight, face down, in its own frame: u along it (toward the head), w across it (its
# left), in metres from the pelvis (chapter 15, sections 2a and 2b: thigh 0.45, shin 0.42, upper arm 0.30, forearm
# 0.26, hand 0.19, shoulders 0.19 out, hips 0.09 out)
REST = {
    "pelvis": (0.0, 0.0), "lumbar": (0.14, 0.0), "chest": (0.34, 0.0), "neck": (0.56, 0.0), "head": (0.68, 0.0),
    "sh_l": (0.50, 0.19), "sh_r": (0.50, -0.19), "hip_l": (-0.04, 0.09), "hip_r": (-0.04, -0.09),
}
SEG = {"upper": 0.30, "fore": 0.26, "hand": 0.19, "thigh": 0.45, "shin": 0.42, "foot": 0.22}

# poses: each limb's heading from the shoulder or hip (degrees from +u, the head's way, turning toward +w, the body's
# left; so a left limb's heading lies in 0..180 and a right one's in -180..0) and the bend at its middle joint (the
# same sense); the trunk's curl and roll (0 face down, 180 face up, 90 on its side), the head's turn
POSES = {
    "prone":       dict(arm_l=(168, 6), arm_r=(-55, -80), leg_l=(176, 0), leg_r=(-166, 38), curl=0, roll=0, head=70),
    "prone_reach": dict(arm_l=(16, 8), arm_r=(-22, -8), leg_l=(178, 0), leg_r=(-175, 6), curl=0, roll=0, head=10),
    "supine":      dict(arm_l=(118, 18), arm_r=(-124, -18), leg_l=(171, 0), leg_r=(-171, 0), curl=0, roll=180, head=55),
    "side":        dict(arm_l=(96, 62), arm_r=(112, 40), leg_l=(128, 78), leg_r=(140, 62), curl=28, roll=90, head=20),
}


def _rot(v, a):
    c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)


def skeleton(pose, x, y, yaw, support, jit, curl_side=1):
    """the joints in the world (yards), each laid on the ground under it at its own thickness"""
    p = POSES[pose]
    sc = M * jit["h"]
    # the trunk's chain, curled about the lumbar for a body lying on its side
    J = {}
    curl = math.radians(p["curl"]) * curl_side
    for k, (u, w) in REST.items():
        if p["roll"] == 90:
            w *= 0.25                         # on its side the shoulders and hips stack one over the other
        if u > 0.14 and curl:
            du, dw = _rot((u - 0.14, w), curl)
            u, w = 0.14 + du, dw
        J[k] = (u, w)

    def limb(root, names, lens, head, bend):
        a = math.radians(head)
        pts = [J[root]]
        for i, (nm, ln) in enumerate(zip(names, lens)):
            if i == 1:
                a += math.radians(bend)
            elif i == 2:
                a += math.radians(bend) * 0.25
            if p["curl"] and root.startswith("sh"):
                a += curl
            pr = pts[-1]
            pts.append((pr[0] + math.cos(a) * ln, pr[1] + math.sin(a) * ln))
            J[nm] = pts[-1]
    for side, s in (("l", 1), ("r", -1)):
        ha, hb = p["arm_" + side]
        limb("sh_" + side, ["elb_" + side, "wri_" + side, "fin_" + side], [SEG["upper"], SEG["fore"], SEG["hand"]], ha, hb)
        la, lb = p["leg_" + side]
        limb("hip_" + side, ["kne_" + side, "ank_" + side, "toe_" + side], [SEG["thigh"], SEG["shin"], SEG["foot"]], la, lb)
    # into the world
    W = {}
    for k, (u, w) in J.items():
        dx, dy = _rot((u * sc, w * sc * jit["w"]), yaw)
        W[k] = [x + dx, y + dy, 0.0]
    return W


# each mass: (joint a, joint b, radius across, radius up (yards before the state), where along a-b, material)
def masses(state, roll):
    up = 1.0
    side = roll == 90
    f = dict(fresh=1.0, bloat=1.18, rot=0.78, wax=1.02).get(state, 1.0)
    belly = dict(fresh=1.0, bloat=1.9, rot=0.55, wax=1.05).get(state, 1.0)
    A = []
    # the trunk: the ribcage's barrel widest at the eighth rib, the belly, the pelvis; flattened on the side it lies on
    def tr(a, b, t, rw, rh):
        if side:
            rw, rh = rh * 1.05, rw * 0.92
        A.append((a, b, t, rw, rh, "corpse"))
    tr("pelvis", "lumbar", 0.0, 0.165 * f, 0.105 * f)
    tr("pelvis", "lumbar", 0.75, 0.14 * f, 0.11 * belly)
    tr("lumbar", "chest", 0.55, 0.15 * f, 0.125 * (belly * 0.5 + 0.5))
    tr("chest", "neck", 0.15, 0.165 * f, 0.13 * f)
    tr("chest", "neck", 0.6, 0.18 * f, 0.115 * f)
    tr("neck", "head", 0.15, 0.06 * f, 0.055 * f)
    tr("neck", "head", 1.0, 0.085 * f, 0.1 * f)
    for s in "lr":
        A.append(("sh_" + s, "chest", 0.08, 0.08 * f, 0.075 * f, "corpse"))            # the deltoid's cap
        A.append(("sh_" + s, "elb_" + s, 0.4, 0.058 * f, 0.054 * f, "corpse"))          # the arm's belly
        A.append(("sh_" + s, "elb_" + s, 0.9, 0.046 * f, 0.044 * f, "corpse"))          # the elbow
        A.append(("elb_" + s, "wri_" + s, 0.25, 0.052 * f, 0.046 * f, "corpse"))         # the forearm's bulk near the elbow
        A.append(("elb_" + s, "wri_" + s, 0.85, 0.036 * f, 0.03 * f, "corpse"))         # the wrist
        A.append(("wri_" + s, "fin_" + s, 0.3, 0.048 * f, 0.024 * f, "corpse"))         # the palm
        A.append(("wri_" + s, "fin_" + s, 0.62, 0.044 * f, 0.02 * f, "corpse"))         # the knuckles
        A.append(("wri_" + s, "fin_" + s, 0.86, 0.036 * f, 0.022 * f, "corpse"))        # the fingers, half curled under
        A.append(("hip_" + s, "kne_" + s, 0.3, 0.092 * f, 0.088 * f, "corpse"))         # the thigh
        A.append(("hip_" + s, "kne_" + s, 0.82, 0.066 * f, 0.064 * f, "corpse"))        # the knee
        A.append(("kne_" + s, "ank_" + s, 0.32, 0.062 * f, 0.06 * f, "corpse"))         # the calf, a third down
        A.append(("kne_" + s, "ank_" + s, 0.88, 0.04 * f, 0.04 * f, "corpse"))          # the ankle
        A.append(("ank_" + s, "toe_" + s, 0.4, 0.05 * f, 0.042 * f, "corpse"))          # the heel and arch
        A.append(("ank_" + s, "toe_" + s, 0.85, 0.048 * f, 0.03 * f, "corpse"))         # the ball and toes
    return A


def _clear(Wj, support, a, b, ra):
    """lay a straight bone a-b on the upper hull of the ground under it: raise both ends just enough to clear it"""
    pa, pb = Vector(Wj[a]), Vector(Wj[b])
    need = 0.0
    for i in range(9):
        u = i / 8.0
        q = pa.lerp(pb, u)
        g = support(q.x, q.y) + ra
        need = max(need, g - q.z)
    if need > 0:
        Wj[a][2] += need
        Wj[b][2] += need


def body(name, pose, state, x, y, yaw, support, seed=0, cloak=True):
    """build one dead body; returns the Blender objects"""
    rnd = random.Random(seed)
    jit = dict(h=1.0 + rnd.uniform(-0.03, 0.03), w=1.0 + rnd.uniform(-0.05, 0.05))
    p = POSES[pose]
    Wj = skeleton(pose, x, y, yaw, support, jit, curl_side=1 if rnd.random() < 0.5 else -1)
    if state == "bone":
        return bones(name, Wj, support, rnd, p["roll"], cloak)
    A = masses(state, p["roll"])
    # every joint on the ground under it, at the thickness of what it carries; then each bone cleared straight
    thick = {}
    for (a, b, t, rw, rh, _) in A:
        for j, k in ((a, 1.0 - t), (b, t)):
            thick[j] = max(thick.get(j, 0.0), rh * k)
    for j, q in Wj.items():
        q[2] = support(q[0], q[1]) + thick.get(j, 0.05) * 0.85            # pressed a little flat where it lies
    for (a, b, t, rw, rh, _) in A:
        _clear(Wj, support, a, b, rh * 0.8)
    objs = [_shell(name, Wj, A, rnd, 1.0)]
    if cloak:
        objs.append(_cloak(name + "c", Wj, A, rnd, state))
    return objs


def _mb(name):
    mb = bpy.data.metaballs.new(name)
    mb.resolution = RES
    mb.render_resolution = RES
    mb.threshold = 0.6
    ob = bpy.data.objects.new(name, mb)
    bpy.context.scene.collection.objects.link(ob)
    return mb, ob


def _el(mb, co, rw, rh, along, length=0.0):
    """an ellipsoid mass at co, long along the bone, rw across it and rh up, set so its visible size is what's asked"""
    e = mb.elements.new(type="ELLIPSOID")
    e.co = co
    R = max(rw, rh, length) / REACH
    e.radius = R
    e.size_x = max(length, rw) / REACH / R * 1.0 if length else rw / REACH / R
    e.size_y = rw / REACH / R
    e.size_z = rh / REACH / R
    e.stiffness = 2.0
    d = Vector((along[0], along[1], 0.0))
    if d.length > 1e-6:
        e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
    return e


def _mesh(ob, name, mat):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.data.objects.remove(ob, do_unlink=True)
    return P._link(name, me, mat)


def _shell(name, Wj, A, rnd, grow):
    mb, ob = _mb(name)
    for (a, b, t, rw, rh, _) in A:
        pa, pb = Vector(Wj[a]), Vector(Wj[b])
        q = pa.lerp(pb, t)
        seg = (pb - pa)
        ln = seg.length
        # the mass runs along its bone: about two thirds of the segment for a limb, rounder on the trunk
        length = min(ln * 0.42, 0.3) + rw * 0.4
        _el(mb, q, rw * grow, rh * grow, (seg.x, seg.y), length * grow)
    return _mesh(ob, name, "corpse")


def _cloak(name, Wj, A, rnd, state):
    """the hooded cloak, wet (chapter 15, section 4): plastered on the high forms so the body reads through it (the
    shoulder blades, the buttocks, the backs of the thighs), the hood collapsed onto the skull, a few small sharp folds
    only where it leaves the body (pooled at the waist, gathered by the rope belt), the hem spread on the ground in a few
    uneven lobes"""
    mb, ob = _mb(name)
    def covered(a, b, t):
        # a pilgrim's cloak runs to mid-calf, its sleeves to the wrist: the trunk, the hood, the whole arm but the hand,
        # the thigh and the knee, the calf's upper half
        if a in ("pelvis", "lumbar", "chest", "neck") or a.startswith("sh") or a.startswith("hip") or a.startswith("elb"):
            return not (a.startswith("elb") and t > 0.8)
        if a.startswith("kne"):
            return t < 0.5
        return False
    for (a, b, t, rw, rh, _) in A:
        if covered(a, b, t):
            pa, pb = Vector(Wj[a]), Vector(Wj[b])
            q = pa.lerp(pb, t)
            seg = pb - pa
            g = 1.05 if b != "head" else 1.1                        # wet: tight on the body; the hood on the skull
            _el(mb, q + Vector((0, 0, 0.008)), rw * g + 0.006, rh * g + 0.006, (seg.x, seg.y),
                (min(seg.length * 0.42, 0.3) + rw * 0.4) * g)
    ax = Vector(Wj["neck"]) - Vector(Wj["pelvis"])
    ax.z = 0
    ln = ax.length
    ax = ax / max(ln, 1e-6)
    sd = Vector((-ax.y, ax.x, 0))
    top = lambda j: Vector(Wj[j])
    # the high forms the wet cloth shows: the shoulder blades and the buttocks
    for s_ in (-1, 1):
        for (j, u, w, r, h) in (("chest", 0.08, 0.075, 0.06, 0.055), ("pelvis", -0.05, 0.065, 0.075, 0.07)):
            q = top(j) + ax * u * M + sd * s_ * w * M
            q.z = Vector(Wj[j]).z + 0.09
            _el(mb, q, r, h * 0.6, (ax.x, ax.y), r)
    # a few small sharp folds where the cloth leaves the body: pooled at the waist, running out from the high forms
    lw = top("lumbar")
    for k in range(6):
        ang = (k - 2.5) * 0.45 + rnd.uniform(-0.15, 0.15)
        d = (ax * math.cos(ang) * 0.3 + sd * math.sin(ang)).normalized()
        q = lw + d * rnd.uniform(0.1, 0.16)
        q.z = lw.z + 0.08
        _el(mb, q, 0.014, 0.016, (d.x, d.y), 0.07)
    # the hem: wet wool spread on the ground in a few uneven lobes about the hips and down the thighs
    for k in range(5):
        j = ("pelvis", "kne_l", "kne_r", "hip_l", "hip_r")[k]
        q = top(j) + sd * rnd.uniform(-0.12, 0.12) + ax * rnd.uniform(-0.12, 0.05)
        q.z = q.z - 0.07
        r = rnd.uniform(0.14, 0.22)
        _el(mb, q, r, 0.025, (rnd.uniform(-1, 1), rnd.uniform(-1, 1)), r * rnd.uniform(1.0, 1.5))
    shell = _mesh(ob, name, "cloth")
    # the rope belt gathering the cloth at the waist: a twisted cord round the body, its knot and hanging ends
    if state != "bone":
        pts = []
        c = top("lumbar") * 0.6 + top("pelvis") * 0.4
        for k in range(17):
            th = k / 16.0 * 2 * math.pi
            p_ = c + sd * math.cos(th) * 0.165 * M + Vector((0, 0, math.sin(th) * 0.1))
            p_.z = max(p_.z, Vector(Wj["pelvis"]).z - 0.05)
            pts.append(tuple(p_))
        P.tube(name + "belt", pts, [0.012] * len(pts), "straw", 5)
        kn = c + sd * 0.17 * M
        P.tube(name + "beltend", [tuple(kn), tuple(kn + sd * 0.06 - ax * 0.12)], [0.011, 0.009], "straw", 5)
    return shell


def bones(name, Wj, support, rnd, roll, cloak):
    """gone to bone: the skeleton of the same joints, the skull and jaw apart, the ribs fallen in, a hand scattered;
    the cloak a collapsed sack along the spine"""
    for q in Wj.values():
        q[2] = support(q[0], q[1]) + 0.03
    objs = []
    def rod(a, b, r, nm):
        pa, pb = Vector(Wj[a]), Vector(Wj[b])
        objs.append(P.tube(name + nm, [tuple(pa), tuple(pb)], [r, r * 0.85], "bone", 6))
    for s in "lr":
        rod("sh_" + s, "elb_" + s, 0.018, "hum" + s)
        rod("elb_" + s, "wri_" + s, 0.014, "rad" + s)
        rod("hip_" + s, "kne_" + s, 0.024, "fem" + s)
        rod("kne_" + s, "ank_" + s, 0.02, "tib" + s)
    rod("pelvis", "neck", 0.022, "spine")
    sp = Vector(Wj["pelvis"])
    nk = Vector(Wj["neck"])
    ax = (nk - sp)
    ax.z = 0
    ax.normalize()
    side = Vector((-ax.y, ax.x, 0))
    for k in range(10):
        c = sp.lerp(nk, 0.45 + k * 0.05)
        for sd in (-1, 1):
            w = 0.16 - abs(k - 4) * 0.012
            tip = c + side * sd * w * (0.8 + 0.3 * rnd.random())
            tip.z = support(tip.x, tip.y) + 0.01
            mid = c + side * sd * w * 0.6
            mid.z = c.z + 0.05 * (0.5 + rnd.random() * 0.5)
            objs.append(P.tube("%srib%d%d" % (name, k, sd), [tuple(c), tuple(mid), tuple(tip)], [0.008, 0.007, 0.005], "bone", 4))
    hd = Vector(Wj["head"]) + side * rnd.uniform(-0.05, 0.05)
    objs.append(P.sphere(name + "skull", tuple(hd + Vector((0, 0, 0.05))), 0.1, "bone", scale=(1.15, 0.85, 0.85)))
    pl = Vector(Wj["pelvis"])
    objs.append(P.sphere(name + "pelv", tuple(pl + Vector((0, 0, 0.03))), 0.13, "bone", scale=(0.7, 1.25, 0.45)))
    if cloak:
        mb, ob = _mb(name + "c")
        for j in ("pelvis", "lumbar", "chest", "neck"):
            q = Vector(Wj[j])
            _el(mb, q + Vector((0, 0, 0.0)), 0.2, 0.05, (ax.x, ax.y), 0.22)
        objs.append(_mesh(ob, name + "c", "cloth"))
    return objs
