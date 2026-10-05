"""Colour a model (an AI-made .glb from the painting, e.g. Hunyuan3D's shape) from the painting's own views.

Each view (front, side, back) is projected onto the model like a slide: a surface point takes its colour from the
views that face it and can see it (a ray test, so the chest is not painted with the shield in front of it), weighted
by how squarely it faces each view; points no view sees take their neighbours' colour. The colour is written per
vertex (dense enough for a sprite), and a material shows it. The figure in each picture is fitted to the model's
outline from that side (height, then centre).

Run inside Blender:
  blender -b -P paint_from_views.py -- IN.glb OUT.glb front=FRONT.png side=SIDE.png back=BACK.png [side_from=-x]
Model axes: up +Z, the figure faces -Y (front camera at -Y). side_from: where the side picture was taken from
(-x: the figure's right side, its front to the picture's right; +x the other side).
"""
import sys
import bpy, bmesh
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opts = dict(a.split('=', 1) for a in argv[2:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = ob.data

V = np.array([v.co[:] for v in me.vertices])
me.calc_normals() if hasattr(me, 'calc_normals') else None
N = np.array([v.normal[:] for v in me.vertices])
bm = bmesh.new(); bm.from_mesh(me)
bvh = BVHTree.FromBMesh(bm)

# view: (camera direction the picture looks along, the picture's right axis in world)
VIEWS = {
    'front': (np.array([0, 1, 0.]), np.array([1, 0, 0.])),
    'back': (np.array([0, -1, 0.]), np.array([-1, 0, 0.])),
    'side': (np.array([1, 0, 0.]), np.array([0, -1, 0.])) if opts.get('side_from', '-x') == '-x' else (np.array([-1, 0, 0.]), np.array([0, 1, 0.])),
}


def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)[::-1]           # top row first
    rgb = px[..., :3]
    a = px[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    fig = (a > 0.5) & ~((mn > 0.86) & (mx - mn < 0.08))             # not the white ground
    # keep off the edge: two pixels in, so the white round the figure never bleeds onto it
    for _ in range(2):
        f2 = fig.copy()
        f2[1:] &= fig[:-1]; f2[:-1] &= fig[1:]; f2[:, 1:] &= fig[:, :-1]; f2[:, :-1] &= fig[:, 1:]
        fig = f2
    # the picture's values are sRGB; colours on the model are linear
    rgb = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    return rgb, fig


def fit(fig, u, z):
    """the figure's box in the picture against the model's outline from this side: scale by height, centre by mass"""
    ys, xs = np.nonzero(fig)
    # the ground stains at the feet widen the box; the figure's top and its column centre are steadier
    top, bot = ys.min(), np.percentile(ys, 99.5)
    k = (bot - top) / (z.max() - z.min())                          # picture px per model unit
    cx_img = np.median(xs)
    cx_mod = np.median(u)
    return lambda uu, zz: (cx_img + (uu - cx_mod) * k, top + (z.max() - zz) * k)


col = np.zeros((len(V), 3)); wsum = np.zeros(len(V))
for name, (fwd, right) in VIEWS.items():
    if name not in opts:
        continue
    rgb, fig = load(opts[name])
    H, W = fig.shape
    u = V @ right
    z = V[:, 2]
    to = fit(fig, u, z)
    facing = np.clip(-(N @ fwd), 0, 1)
    px, py = to(u, z)
    ix, iy = np.round(px).astype(int), np.round(py).astype(int)
    inside = (ix >= 0) & (iy >= 0) & (ix < W) & (iy < H)
    back = -fwd
    for i in np.nonzero((facing > 0.05) & inside)[0]:
        if not fig[iy[i], ix[i]]:
            continue
        o = Vector(V[i] + N[i] * 1e-4 + back * 1e-4)
        hit = bvh.ray_cast(o, Vector(back), 10.0)
        if hit[0] is not None:
            continue                                                 # something stands between it and the picture
        w = facing[i] ** 2
        col[i] += rgb[iy[i], ix[i]] * w
        wsum[i] += w
    print(name, 'painted', int((wsum > 0).sum()))

seen = wsum > 1e-6
col[seen] /= wsum[seen, None]
# what no view sees takes its neighbours' colour, spreading out ring by ring
nb = [[] for _ in V]
for e in me.edges:
    a, b = e.vertices
    nb[a].append(b); nb[b].append(a)
known = seen.copy()
for it in range(60):
    newk = known.copy()
    for i in np.nonzero(~known)[0]:
        ks = [j for j in nb[i] if known[j]]
        if ks:
            col[i] = col[ks].mean(0); newk[i] = True
    if newk.sum() == known.sum():
        break
    known = newk
print('seen', int(seen.sum()), 'filled', int(known.sum() - seen.sum()), 'of', len(V))

attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for i, c in enumerate(col):
    attr.data[i].color = (c[0], c[1], c[2], 1.0)
mat = bpy.data.materials.new('painted'); mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
an = nt.nodes.new('ShaderNodeVertexColor'); an.layer_name = 'Col'
nt.links.new(an.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.9
me.materials.clear(); me.materials.append(mat)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False)
print('wrote', out)
