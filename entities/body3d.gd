class_name Body3D
extends Node2D
## A live 3D character drawn as the game's pixel art (Derek, 2026-10-10: "Do we even need to capture frames if we have
## a full 3d working model?", "Wouldn't animations be smoother ... Locked pov"). The pilot is the newborn
## (tools/landkit/passes/the_newborn.md; the body and its clips from tools/landkit3d/newborn3d.py).
##
## The model plays in its own small 3D world inside a SubViewport, seen by a locked orthographic camera at the hero
## sprites' own angle and density (12 degrees, a figure of 195 px, shown at Iso.FIG), so it stands exactly where and
## as large as a sprite hero would; the viewport's picture is drawn here, its foot point on this node, through
## shaders/body3d.gdshader (hard edges, the dark outline, the ramp's steps). It turns to any heading, not eight, and its
## clips blend at the game's frame rate.

const FRAME := 320                       # the viewport (px): the standing figure (195) and the crawl (about 200 across)
const FOOT := Vector2(160, 250)          # the ground point in it
const ELEV := 12.0                       # the hero camera's elevation (deg)
const PX_M := 195.0 / 1.83               # a 1.83 m figure is 195 px tall
const TURN := 7.0                        # how fast it turns to its heading (rad/s scale)
## the clips' own ground speeds in yards a second (tools/landkit3d/newborn_pose.py: a stride over its stance), so a
## clip is played at the rate that keeps its feet and hands planted on the moving ground
const WALK_V := 0.58
const CRAWL_V := 0.19

var vp: SubViewport
var pivot: Node3D                        # turns the model; sinks it (the opening)
var model: Node3D
var anim: AnimationPlayer
var pic: Sprite2D
var yaw := 0.0
var yaw_to := 0.0
var clip := ""
var mats: Array = []                     # the model's surfaces (shaders/body3d_model.gdshader)
var sink := 0.0 :                        # metres under the ground line (the pool's surface): hidden below it
	set(v):
		sink = v
		if pivot:
			pivot.position.y = -v
		for m in mats:
			m.set_shader_parameter("surface_y", 0.0 if v > 0.0005 else -100.0)

func _init(scene_path: String) -> void:
	vp = SubViewport.new()
	vp.size = Vector2i(FRAME, FRAME)
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_DISABLED
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.32, 0.3, 0.34)
	e.ambient_light_energy = 0.55
	env.environment = e
	vp.add_child(env)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = FRAME / PX_M
	cam.near = 0.1
	cam.far = 40.0
	var b := Basis.from_euler(Vector3(-deg_to_rad(ELEV), 0.0, 0.0))
	# the ground point at FOOT: the picture's centre is (FOOT.y - FRAME/2) px above it along the camera's up
	var centre := b.y * ((FOOT.y - FRAME / 2.0) / PX_M)
	cam.transform = Transform3D(b, centre + b.z * 20.0)
	vp.add_child(cam)
	# the light: a key high from the upper left and in front (the sprites' own), a cool rim from behind
	var key := DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.93, 0.85)
	key.light_energy = 1.35
	key.rotation = Vector3(deg_to_rad(-48.0), deg_to_rad(-30.0), 0.0)
	vp.add_child(key)
	var rim := DirectionalLight3D.new()
	rim.light_color = Color(0.72, 0.78, 1.0)
	rim.light_energy = 0.9
	rim.rotation = Vector3(deg_to_rad(-25.0), deg_to_rad(160.0), 0.0)
	vp.add_child(rim)
	pivot = Node3D.new()
	vp.add_child(pivot)
	var ps: PackedScene = load(scene_path)
	model = ps.instantiate()
	pivot.add_child(model)
	for n in model.find_children("*", "AnimationPlayer", true, false):
		anim = n
		break
	_own_surfaces(model)
	if anim:
		for a in ["crawl", "idle", "walk"]:
			if anim.has_animation(a):
				anim.get_animation(a).loop_mode = Animation.LOOP_LINEAR
	pic = Sprite2D.new()
	pic.texture = vp.get_texture()
	pic.centered = false
	pic.offset = -FOOT
	pic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	pic.scale = Vector2.ONE * Iso.FIG
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/body3d.gdshader")
	pic.material = m
	add_child(pic)

## play a clip, blended from the last over `blend` seconds
func play(c: String, blend: float = 0.25, speed: float = 1.0) -> void:
	if anim == null or not anim.has_animation(c):
		return
	anim.speed_scale = speed
	if c != clip:
		clip = c
		anim.play(c, blend)

func length(c: String) -> float:
	return anim.get_animation(c).length if anim and anim.has_animation(c) else 0.0

## face a heading on the ground (tile space: x right-down, y left-down); yaw 0 faces the camera
func face_ground(g: Vector2, at_once: bool = false) -> void:
	if g.length() < 0.001:
		return
	yaw_to = atan2(g.x - g.y, g.x + g.y)
	if at_once:
		yaw = yaw_to

func _process(dt: float) -> void:
	var d := wrapf(yaw_to - yaw, -PI, PI)
	yaw += d * minf(1.0, TURN * dt * 0.5)
	if pivot:
		pivot.rotation.y = yaw

## the glb's materials remade on shaders/body3d_model.gdshader (the same baked textures, and the pool's waterline)
func _own_surfaces(root: Node) -> void:
	var sh: Shader = load("res://shaders/body3d_model.gdshader")
	for mi in root.find_children("*", "MeshInstance3D", true, false):
		var mesh: Mesh = (mi as MeshInstance3D).mesh
		for i in mesh.get_surface_count():
			var src := mesh.surface_get_material(i) as BaseMaterial3D
			var m := ShaderMaterial.new()
			m.shader = sh
			if src:
				m.set_shader_parameter("albedo", src.albedo_color)
				if src.albedo_texture:
					m.set_shader_parameter("albedo_tex", src.albedo_texture)
					m.set_shader_parameter("has_albedo_tex", true)
				m.set_shader_parameter("rough", src.roughness)
				if src.roughness_texture:
					m.set_shader_parameter("rough_tex", src.roughness_texture)
					m.set_shader_parameter("has_rough_tex", true)
				if src.normal_enabled and src.normal_texture:
					m.set_shader_parameter("normal_tex", src.normal_texture)
					m.set_shader_parameter("has_normal_tex", true)
			(mi as MeshInstance3D).set_surface_override_material(i, m)
			mats.append(m)
