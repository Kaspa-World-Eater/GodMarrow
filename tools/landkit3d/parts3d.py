"""Reusable 3D parts for the 3D road (run inside Blender): every form is built in the game's coordinates (yards) under
the scene's GAME parent (blend_scene.game_root). Boxes, slabs from their corner points, tubes along a path with a
radius per point (horns, serpents, roots, rods), and spheres. Materials by name and pass index (blend_scene.material)."""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

ROOT = None
MAT = None

MATS = {"ground": 1, "stucco": 2, "brick": 3, "stone": 4, "lacquer": 5, "gold": 6, "tile": 7, "wood": 8, "root": 9,
        "iron": 10, "bone": 11, "moss": 12, "cloth": 13, "straw": 14, "water": 15,
        "boxpaint": 16}


def init(root, material):
    global ROOT, MAT
    ROOT, MAT = root, material


def _link(name, mesh, mat):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    o.parent = ROOT
    mesh.materials.append(MAT(mat, MATS[mat]))
    return o


def box(name, lo, hi, mat, rot_z=0.0, pivot=None, tilt=None):
    """an axis box from lo to hi (yards), turned rot_z about z round its centre (or pivot); tilt=(axis, angle, pivot)"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    c = (Vector(lo) + Vector(hi)) / 2
    s = Vector(hi) - Vector(lo)
    bmesh.ops.scale(bm, vec=s, verts=bm.verts)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    if rot_z:
        p = Vector(pivot) if pivot else c
        bmesh.ops.rotate(bm, cent=p, matrix=Matrix.Rotation(rot_z, 3, "Z"), verts=bm.verts)
    if tilt:
        ax, ang, p = tilt
        bmesh.ops.rotate(bm, cent=Vector(p), matrix=Matrix.Rotation(ang, 3, ax), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    return _link(name, me, mat)


def poly(name, verts, faces, mat, thick=0.0):
    """a mesh from points and faces; thick > 0 makes it a solid slab (solidify)"""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    o = _link(name, me, mat)
    if thick:
        m = o.modifiers.new("solid", "SOLIDIFY")
        m.thickness = thick
        m.offset = -1.0
    return o


def grid(name, xs, ys, H, mat):
    """a height field as a smooth mesh: H[j, i] is the height (yards) at (xs[i], ys[j]); used for ground that is only a
    height (floor3d), where the 3D road needs it as real form under everything else"""
    nx, ny = len(xs), len(ys)
    verts = [(float(xs[i]), float(ys[j]), float(H[j, i])) for j in range(ny) for i in range(nx)]
    faces = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(ny - 1) for i in range(nx - 1)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(faces))
    me.update()
    return _link(name, me, mat)


def quad_slab(name, a, b, c, d, mat, thick=0.15):
    return poly(name, [a, b, c, d], [(0, 1, 2, 3)], mat, thick)


def tube(name, pts, radii, mat, sides=8, cap=True):
    """a tube along points, its radius per point (a horn tapering, a serpent's body, a root)"""
    pts = [Vector(p) for p in pts]
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(up).normalized()
        v = t.cross(u).normalized()
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            ring.append(bm.verts.new(p + (u * math.cos(a) + v * math.sin(a)) * radii[i]))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(sides):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    o = _link(name, me, mat)
    o.data.shade_smooth() if hasattr(o.data, "shade_smooth") else None
    return o


def sphere(name, c, r, mat, scale=(1, 1, 1)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=1.0)
    bmesh.ops.scale(bm, vec=Vector(scale) * r, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(c), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    o = _link(name, me, mat)
    return o


def cylinder(name, c, r, h, mat, sides=12):
    return tube(name, [c, (c[0], c[1], c[2] + h)], [r, r], mat, sides)


def displace(o, strength=0.05, size=0.4, subdiv=2):
    """a surface's own relief (stucco bellied, stone pitted): subdivide and push by a noise, true geometry"""
    m = o.modifiers.new("sub", "SUBSURF")
    m.subdivision_type = "SIMPLE"
    m.levels = m.render_levels = subdiv
    t = bpy.data.textures.new(o.name + "_n", "CLOUDS")
    t.noise_scale = size
    d = o.modifiers.new("disp", "DISPLACE")
    d.texture = t
    d.strength = strength
    d.texture_coords = "GLOBAL"
    return o
