"""Pictures of a coloured model (vertex colour or texture), unlit, so the colours show as they are: front,
three-quarter, side and back. blender -b -P look_views.py -- MODEL.glb OUTPREFIX  -> OUTPREFIX_{0,45,90,180}.png"""
import bpy, math, sys
from mathutils import Vector
argv = sys.argv[sys.argv.index('--')+1:]
src, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
mn=Vector((1e9,)*3); mx=Vector((-1e9,)*3)
for o in objs:
    for c in o.bound_box:
        w=o.matrix_world@Vector(c); mn=Vector(map(min,mn,w)); mx=Vector(map(max,mx,w))
ctr=(mn+mx)/2; size=max(mx-mn)
mat=bpy.data.materials.new('flat'); mat.use_nodes=True; nt=mat.node_tree
for n in list(nt.nodes): nt.nodes.remove(n)
em=nt.nodes.new('ShaderNodeEmission'); outn=nt.nodes.new('ShaderNodeOutputMaterial')
nt.links.new(em.outputs[0], outn.inputs['Surface'])
for o in objs:
    if o.data.color_attributes:
        vc=nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name=o.data.color_attributes[0].name
        nt.links.new(vc.outputs['Color'], em.inputs['Color'])
    else:   # a textured model: its own base colour image
        img=None
        for m in o.data.materials:
            if m and m.use_nodes:
                for n in m.node_tree.nodes:
                    if n.type=='TEX_IMAGE' and n.image: img=n.image
        if img:
            tx=nt.nodes.new('ShaderNodeTexImage'); tx.image=img; nt.links.new(tx.outputs['Color'], em.inputs['Color'])
    o.data.materials.clear(); o.data.materials.append(mat)
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE_NEXT'; sc.view_settings.view_transform='Standard'
sc.render.resolution_x=800; sc.render.resolution_y=800
w=bpy.data.worlds.new('w'); sc.world=w; w.color=(0.05,0.05,0.06)
cam=bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=size*1.15
piv=bpy.data.objects.new('piv',None); sc.collection.objects.link(piv); piv.location=ctr
for o in objs: o.parent=piv; o.matrix_parent_inverse=piv.matrix_world.inverted()
cam.location=ctr+Vector((0,-size*3,0)); cam.rotation_euler=(math.radians(90),0,0)
for ang in (0,45,90,180):
    piv.rotation_euler=(0,0,math.radians(ang)); bpy.context.view_layer.update()
    sc.render.filepath=out+f'_{ang}.png'; bpy.ops.render.render(write_still=True)
