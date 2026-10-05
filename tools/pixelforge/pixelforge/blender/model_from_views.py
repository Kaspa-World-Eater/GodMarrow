"""An AI-made shape (.glb, e.g. Hunyuan3D from the painting) -> a clean, coloured, light model for the sprite road.

1. clean: the long sliver triangles the generator leaves (threads from the crown to the feet), loose crumbs, and the
   flat ground stains under the feet are taken off;
2. colour: the painting's own views are projected onto it like slides. Each surface point takes its colour from the
   views that face it and can see it (a ray test: the chest is not painted with the shield in front of it), weighted by
   how squarely it faces each; the one side view is mirrored for the other side (a figure is near enough symmetric);
   what no view sees takes its neighbours' colour. Each picture is fitted to the model's own outline from that side
   (scale and offset searched for the best overlap of the two silhouettes);
3. shrink: reduced to faces= triangles, the colour kept on the points (vertex colour).

  blender -b -P model_from_views.py -- IN.glb OUT.glb front=F.png [side=S.png] [back=B.png] [faces=40000]
     [side_from=-x] [keep_high=HIGH.glb]
source=front: which picture the model was generated from (fitted exactly).
Model axes: up +Z, the figure faces -Y. side_from: -x when the side picture shows the figure facing the picture's right.
Pictures: the figure on plain white (or transparent).
"""
import math, sys, time
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
SRC, OUT = argv[0], argv[1]
opt = dict(a.split('=', 1) for a in argv[2:])
FACES = int(opt.get('faces', 120000))
TEX = int(opt.get('tex', 2048))
T0 = time.time()


def log(*a):
    print('[model]', f'{time.time() - T0:6.1f}s', *a, flush=True)


# ------------------------------------------------------------------ load
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data
log('loaded', len(me.vertices), 'verts', len(me.polygons), 'faces')

# the model's outline as generated, before cleaning: the generator made it from the front picture's whole figure
RAW = np.array([v.co[:] for v in me.vertices])
# ------------------------------------------------------------------ 1. clean
bm = bmesh.new(); bm.from_mesh(me)
bm.edges.ensure_lookup_table()
el = np.array([e.calc_length() for e in bm.edges])
med = float(np.median(el))
zs = np.array([v.co.z for v in bm.verts]); z0, z1 = zs.min(), zs.max(); H = z1 - z0
# slivers: faces with an edge far longer than the mesh's grain and almost no area
def _sliver(f):
    L = max(e.calc_length() for e in f.edges)
    if L < med * 6:
        return False
    width = 2 * f.calc_area() / max(L, 1e-9)                 # the face's height across its longest edge
    return L / max(width, 1e-9) > 30
bad = [f for f in bm.faces if _sliver(f)]
bmesh.ops.delete(bm, geom=bad, context='FACES')
log('slivers removed', len(bad))
# islands: crumbs, and flat stains lying on the ground
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
seen = set(); islands = []
for f in bm.faces:
    if f.index in seen:
        continue
    stack = [f]; isl = []; seen.add(f.index)
    while stack:
        g = stack.pop(); isl.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.index not in seen:
                    seen.add(h.index); stack.append(h)
    islands.append(isl)
big = max(len(i) for i in islands)
kill = []
for isl in islands:
    zmax = max(v.co.z for g in isl for v in g.verts)
    total = sum(len(i) for i in islands)
    if len(isl) < max(12, total * 0.0002) or (zmax < z0 + H * 0.025 and len(isl) < big * 0.2):
        kill += isl
bmesh.ops.delete(bm, geom=list(set(kill)), context='FACES')
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context='VERTS')
bm.to_mesh(me); bm.free(); me.update()
log('islands', len(islands), 'removed faces', len(set(kill)), '->', len(me.polygons), 'faces')

# ------------------------------------------------------------------ 2. colour
V = np.array([v.co[:] for v in me.vertices])
N = np.array([v.normal[:] for v in me.vertices])
bm = bmesh.new(); bm.from_mesh(me); bvh = BVHTree.FromBMesh(bm)
SIDE_NEG = opt.get('side_from', '-x') == '-x'
VIEWS = [('front', np.array([0, 1, 0.]), np.array([1, 0, 0.]), False),
         ('back', np.array([0, -1, 0.]), np.array([-1, 0, 0.]), False)]
if SIDE_NEG:
    VIEWS += [('side', np.array([1, 0, 0.]), np.array([0, -1, 0.]), False), ('side', np.array([-1, 0, 0.]), np.array([0, 1, 0.]), True)]
else:
    VIEWS += [('side', np.array([-1, 0, 0.]), np.array([0, 1, 0.]), False), ('side', np.array([1, 0, 0.]), np.array([0, -1, 0.]), True)]


def load(path, mirror):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)[::-1]
    if mirror:
        px = px[:, ::-1]
    rgb, a = px[..., :3], px[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    fig = (a > 0.5) & ~((mn > 0.86) & (mx - mn < 0.08))
    core = fig.copy()
    for _ in range(2):                                   # two pixels in from the edge: the white never bleeds on
        f2 = core.copy(); f2[1:] &= core[:-1]; f2[:-1] &= core[1:]; f2[:, 1:] &= core[:, :-1]; f2[:, :-1] &= core[:, 1:]
        core = f2
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return lin, fig, core


def fit(fig, u, z, vis, right, exact):
    """the picture's pixels for the model's points from this side: the figure's height (its top to the foot of its
    columns, the ground stains' last half percent left out) is the model's height, and the figure's middle column is
    the model's (the medians, so a spike or a stain to one side does not pull it). Tried against silhouette searches,
    this simple match put the painting's details where they belong best (2026-10-05, the Hemomancer)."""
    ys, xs = np.nonzero(fig)
    top, bot = ys.min(), np.percentile(ys, 99.5)
    # measured on the model as generated (RAW): the cleaning takes the ground stains off its foot, the picture keeps them
    ru, rz = RAW @ right, RAW[:, 2]
    k = (bot - top) / (rz.max() - rz.min())
    cx = np.median(xs) - np.median(ru) * k
    zt = rz.max()
    log('  fit', round(k, 1), 'px per unit')
    return lambda u_, z_: (cx + u_ * k, top + (zt - z_) * k)


col = np.zeros((len(V), 3)); wsum = np.zeros(len(V))
for name, fwd, right, mirror in VIEWS:
    if name not in opt:
        continue
    rgb, fig, core = load(opt[name], mirror)
    Hh, Ww = fig.shape
    u = V @ right; z = V[:, 2]
    facing = np.clip(-(N @ fwd), 0, 1)
    vis = facing > 0.3
    to = fit(fig, u, z, vis, right, name == opt.get('source', 'front') and not mirror)
    px_, py_ = to(u, z)
    ix, iy = np.round(px_).astype(int), np.round(py_).astype(int)
    inside = (ix >= 0) & (iy >= 0) & (ix < Ww) & (iy < Hh)
    back = -fwd
    n = 0
    # the picture the model was made from counts most, a mirrored side least; with the 4th power of facing, the view a
    # surface faces squarely all but wins outright (blending a side view onto the shield's face turned it pink)
    wv = (4.0 if name == opt.get('source', 'front') else 1.0) * (0.5 if mirror else 1.0)
    for i in np.nonzero((facing > 0.08) & inside)[0]:
        if not core[iy[i], ix[i]]:
            continue
        if bvh.ray_cast(Vector(V[i] + N[i] * 1e-4 + back * 1e-4), Vector(back), 10.0)[0] is not None:
            continue
        w = (facing[i] ** 4) * wv
        col[i] += rgb[iy[i], ix[i]] * w; wsum[i] += w; n += 1
    log(name + (' (mirrored)' if mirror else ''), 'painted', n)

known = wsum > 1e-6
col[known] /= wsum[known, None]
nb = [[] for _ in V]
for e in me.edges:
    a, b = e.vertices; nb[a].append(b); nb[b].append(a)
for it in range(200):
    todo = np.nonzero(~known)[0]
    if not len(todo):
        break
    newk = known.copy()
    for i in todo:
        ks = [j for j in nb[i] if known[j]]
        if ks:
            col[i] = col[ks].mean(0); newk[i] = True
    if newk.sum() == known.sum():
        break
    known = newk
log('coloured', int((wsum > 1e-6).sum()), 'from the pictures,', int(known.sum() - (wsum > 1e-6).sum()), 'from neighbours, of', len(V))
attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
attr.data.foreach_set('color', np.concatenate([col, np.ones((len(V), 1))], 1).ravel().astype(np.float32))
me.color_attributes.active_color = attr


def material(name, color_node):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    src = color_node(nt)
    nt.links.new(src.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    return mat


if 'keep_high' in opt:
    me.materials.clear()
    me.materials.append(material('painted', lambda nt: (lambda n: (setattr(n, 'layer_name', 'Col'), n)[1])(nt.nodes.new('ShaderNodeVertexColor'))))
    bpy.ops.export_scene.gltf(filepath=opt['keep_high'], export_format='GLB')

# ------------------------------------------------------------------ 3. shrink
# The colour stays on the points: reducing the model blends each kept point's colour from those it absorbs, and at
# 40,000 faces there are many more coloured points than a 195 px figure has pixels. (A texture bake from the full model
# was tried and dropped: its rays hit the wrong layer where cloth, planks and body lie close.)
dec = ob.modifiers.new('dec', 'DECIMATE'); dec.ratio = min(1.0, FACES / max(1, len(me.polygons)))
bpy.ops.object.modifier_apply(modifier='dec')
me = ob.data
log('reduced to', len(me.polygons), 'faces')
mat = bpy.data.materials.new('painted'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.92
me.materials.clear(); me.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB')
log('wrote', OUT)
