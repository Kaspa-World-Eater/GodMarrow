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
var env: Environment
var key: DirectionalLight3D
var rim: DirectionalLight3D
var lamps: Array = []                    # the world's lights near the body, placed where they truly are (light_from)
var world_lit := false                   # lit only by the world's lights (light_from), not the fixed key and rim
const N_LAMPS := 4
const YD_M := 0.9144
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
	var we := WorldEnvironment.new()
	var e := Environment.new()
	env = e
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.32, 0.3, 0.34)
	e.ambient_light_energy = 0.55
	we.environment = e
	vp.add_child(we)
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
	key = DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.93, 0.85)
	key.light_energy = 1.35
	key.rotation = Vector3(deg_to_rad(-48.0), deg_to_rad(-30.0), 0.0)
	vp.add_child(key)
	rim = DirectionalLight3D.new()
	rim.light_color = Color(0.72, 0.78, 1.0)
	rim.light_energy = 0.9
	rim.rotation = Vector3(deg_to_rad(-25.0), deg_to_rad(160.0), 0.0)
	vp.add_child(rim)
	for i in N_LAMPS:
		var o := OmniLight3D.new()
		o.visible = false
		o.shadow_enabled = false
		o.omni_attenuation = 1.2
		vp.add_child(o)
		lamps.append(o)
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

## lit by the world's own lights, not a fixed key (pass 4; MASTER_RULES 0c: underground the fires make all the light,
## no fill, ambient about 0.08): the strongest few of the zone's lights at the body's place `tp` (tiles), each an omni
## light in the body's little world where it truly stands from the body (the ground's axes turned to the camera's, its
## height above the body's floor, its colour and reach), the pool's raw red glow among them. Call every frame or so.
func light_from(lights: Array, tp: Vector2) -> void:
	if not world_lit:
		world_lit = true
		key.visible = false
		rim.visible = false
		env.ambient_light_color = Color(0.5, 0.42, 0.45)
		env.ambient_light_energy = 0.08
	var floor_yd := Iso.lift(tp) / Iso.lift_px
	var best: Array = []
	for L in lights:
		var t := String(L.get("type", ""))
		if t != "fire" and t != "raw":
			continue
		var lt := Vector2(float(L.get("x", 0)), float(L.get("y", 0)))
		var R := float(L.get("radius", 3.0)) if t == "fire" else float(L.get("radiusPx", 36.0)) / 18.0
		var a := float(L.get("a", 1.0)) if t == "fire" else 0.9
		var d := lt.distance_to(tp)
		var reach := R * 1.6
		if d > reach:
			continue
		var w := a * pow(1.0 - d / reach, 2.0)
		var h := (Iso.lift(lt) / Iso.lift_px + float(L.get("heightPx", 0)) / 21.0) if t == "fire" else floor_yd + 0.15
		best.append([w, lt, h, reach, a, String(L.get("rgb", "255,150,72")), t])
	best.sort_custom(func(p, q): return p[0] > q[0])
	for i in lamps.size():
		var o: OmniLight3D = lamps[i]
		if i >= best.size():
			o.visible = false
			continue
		var b: Array = best[i]
		var g: Vector2 = b[1] - tp
		o.position = Vector3((g.x - g.y) / sqrt(2.0), float(b[2]) - floor_yd, (g.x + g.y) / sqrt(2.0)) * YD_M
		o.omni_range = float(b[3]) * YD_M
		var rgb: PackedStringArray = String(b[5]).split(",")
		o.light_color = Color8(int(rgb[0]), int(rgb[1]), int(rgb[2]))
		o.light_energy = (2.8 if b[6] == "fire" else 1.6) * float(b[4])
		o.visible = true

func _process(dt: float) -> void:
	var d := wrapf(yaw_to - yaw, -PI, PI)
	yaw += d * minf(1.0, TURN * dt * 0.5)
	if pivot:
		pivot.rotation.y = yaw
	if not drips.is_empty():
		_drip_tick()

## blood streaming off it (the newborn's pass 7; Derek: "gore and blood streaming off"): from each low point of the
## body (the chin, the wrists, the elbows, the knees, the chest, the belly) a strand hangs straight down whatever the
## pose, starting inside the limb so only what is below the skin shows, each on its own clock: it lengthens, necks, and
## lets a bead go, which falls to the floor. Crawling, the blood pours from the chest and the face; standing, from the
## fingers and the chin. Hidden while the body is under the surface.
var drips: Array = []                    # {att: BoneAttachment3D, strand, bead, period, phase, base}
const DRIP_BONES := [["DEF-head", 0.07], ["DEF-hand.L", 0.03], ["DEF-hand.R", 0.03], ["DEF-forearm.L", 0.04],
	["DEF-forearm.R", 0.04], ["DEF-shin.L", 0.05], ["DEF-shin.R", 0.05], ["DEF-spine.003", 0.11],
	["DEF-spine.001", 0.1], ["DEF-hand.L", 0.03], ["DEF-hand.R", 0.03], ["DEF-head", 0.06]]

func enable_drips() -> void:
	var sk: Skeleton3D = null
	for n in model.find_children("*", "Skeleton3D", true, false):
		sk = n
		break
	if sk == null:
		return
	var mat := StandardMaterial3D.new()
	# fresh blood running off: brighter and wetter than the coat drying on the skin, so it reads against it and the
	# candles catch a wet highlight on it
	mat.albedo_color = Color(0.2, 0.012, 0.016)
	mat.roughness = 0.06
	mat.metallic_specular = 1.0
	for i in DRIP_BONES.size():
		var e: Array = DRIP_BONES[i]
		var att := BoneAttachment3D.new()
		att.bone_name = e[0]
		sk.add_child(att)
		var cm := CylinderMesh.new()
		cm.top_radius = 0.014 + 0.003 * (i % 3)          # thick, slow blood: a finger's width, so the game's scale shows it
		cm.bottom_radius = 0.007
		cm.height = 1.0
		cm.radial_segments = 6
		cm.rings = 1
		var st := MeshInstance3D.new()
		st.mesh = cm
		st.material_override = mat
		st.top_level = true
		vp.add_child(st)
		var sm := SphereMesh.new()
		sm.radius = 0.014
		sm.height = 0.03
		sm.radial_segments = 6
		sm.rings = 4
		var bd := MeshInstance3D.new()
		bd.mesh = sm
		bd.material_override = mat
		bd.top_level = true
		vp.add_child(bd)
		drips.append({"att": att, "strand": st, "bead": bd, "period": 0.9 + 0.23 * float((i * 7) % 5),
			"phase": float((i * 13) % 10) / 10.0, "base": float(e[1])})

func _drip_tick() -> void:
	var under := sink > 0.0005
	var t := Time.get_ticks_msec() / 1000.0
	for d in drips:
		var st: MeshInstance3D = d["strand"]
		var bd: MeshInstance3D = d["bead"]
		if under:
			st.visible = false
			bd.visible = false
			continue
		var top: Vector3 = (d["att"] as BoneAttachment3D).global_position
		var ph := fmod(t / float(d["period"]) + float(d["phase"]), 1.0)
		# the strand: from inside the limb down past the skin, lengthening as it fills, then letting go
		var vis := 0.03 + 0.14 * ph * ph
		var ln: float = float(d["base"]) + vis
		var floor_y := -sink
		ln = minf(ln, maxf(0.01, top.y - floor_y - 0.005))
		st.visible = true
		st.global_transform = Transform3D(Basis.from_scale(Vector3(1.0, ln, 1.0)), top - Vector3(0, ln / 2.0, 0))
		# the bead let go at the end of each cycle, falling until it meets the floor
		var fall := ph * float(d["period"])
		var by := top.y - ln - 0.5 * 9.8 * fall * fall * 0.35
		bd.visible = ph < 0.45 and by > floor_y + 0.01
		bd.global_position = Vector3(top.x, by, top.z)

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
