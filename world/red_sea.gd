class_name RedSea
extends Node2D
## The Red, live (Derek, 2026-10-10: "what happened to the cool sideways blood foam tide, that effect looked good for
## foam, we need to enhance the blood ocean much much more"). The waves of the Blender loops (tools/landkit3d/
## beach_floor.py's model: the sets coming in on the dying heartbeat, the crest humping and sagging, the heavy roll thrown
## over its own face, the bore, the swash up the real sand and the long drain back, the foam laid as the break runs
## along the crest and carried, torn into lace) played in the game as real 3D, the way the bodies are (entities/
## body3d.gd): a grid of the shore heaved in its own small 3D world, drawn at the art pixel (2 x 2) from the game's own
## iso projection (shaders/red_sea.gdshaderinc to_clip), and laid over the baked ground where the Red is.
##
## The field (tools/landkit3d/sea_field.py: the floor under the water to the centimetre, the rock, the columns) decides
## where water stands; nothing is painted onto the sand.

const AP := 2.0                          # the art pixel, zone px
const P := 5.2                           # one beat, seconds (core/sfx.gd _red_surge, core/main.gd keep step)

var vp: SubViewport
var pic: Sprite2D
var mats: Array = []
var _clock := PackedFloat32Array()       # the heart's clock through one beat (beach_floor.py _CLOCK)
var _size := Vector2i.ZERO
var _wo := -108.0
const RES := 0.25                        # the grid's spacing, yards
const WIN_S := 40.0                      # the window's depth (s) and breadth (t), yards
const WIN_T := 60.0

static func _pulse(x: float, c: float, w: float) -> float:
	var d := fposmod(x - c + 0.5, 1.0) - 0.5
	return exp(-(d / w) * (d / w))

func _init(dir: String, sf: Dictionary, world_o: float, lift_px: float) -> void:
	name = "RedSea"
	# the heart's clock: quick in the beat and the weaker second beat, crawling through the stillness between
	var n := 1024
	_clock.resize(n + 1)
	var acc := 0.0
	var prev := 0.0
	for i in n + 1:
		var x := float(i) / n
		var r := 0.28 + 2.6 * _pulse(x, 0.06, 0.045) + 1.3 * _pulse(x, 0.27, 0.035)
		if i > 0:
			acc += (r + prev) * 0.5 / n
		prev = r
		_clock[i] = acc
	for i in n + 1:
		_clock[i] /= acc
	# the field
	var ns := int(sf["ns"])
	var nt := int(sf["nt"])
	var raw := FileAccess.get_file_as_bytes(dir + "/" + str(sf["file"]))
	var img := Image.create_from_data(ns, nt, false, Image.FORMAT_RGBF, raw)
	var ftex := ImageTexture.create_from_image(img)
	vp = SubViewport.new()
	vp.transparent_bg = true
	vp.own_world_3d = true
	vp.msaa_3d = Viewport.MSAA_DISABLED
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.size = Vector2i(64, 64)
	add_child(vp)
	var cam := Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 100000.0
	cam.near = 0.01
	cam.far = 100000.0
	cam.position = Vector3(0, 0, 50000)
	vp.add_child(cam)
	cam.current = true
	var sea_sh: Shader = load("res://shaders/red_sea.gdshader")
	var lip_sh: Shader = load("res://shaders/red_sea_lip.gdshader")
	_wo = world_o
	# one window of the shore a little larger than the view, a quarter yard apart, slid with the camera (the view holds
	# about 25 yards of s and 44 of t at the camera's zoom; the swells lift the far side up to two yards more)
	_add(_grid(0.0, WIN_S, RES, 0.0, WIN_T, RES), sea_sh, ftex, sf, world_o, lift_px)
	_add(_lip(0.0, WIN_T, 0.1), lip_sh, ftex, sf, world_o, lift_px)
	_dead(ftex, sf, world_o, lift_px)
	pic = Sprite2D.new()
	pic.centered = false
	pic.scale = Vector2(AP, AP)
	pic.texture = vp.get_texture()
	pic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(pic)

func _add(mesh: ArrayMesh, sh: Shader, ftex: Texture2D, sf: Dictionary, world_o: float, lift_px: float) -> void:
	var m := ShaderMaterial.new()
	m.shader = sh
	m.set_shader_parameter("field", ftex)
	m.set_shader_parameter("fgeo", Vector4(float(sf["s0"]), float(sf["t0"]), float(sf["res"]), 0.0))
	m.set_shader_parameter("fn", Vector2(float(sf["ns"]), float(sf["nt"])))
	m.set_shader_parameter("zo", world_o)
	m.set_shader_parameter("lift_px", lift_px)
	m.set_shader_parameter("debug", int(OS.get_environment("GM_SEA_DEBUG")) if OS.get_environment("GM_SEA_DEBUG") != "" else 0)
	mats.append(m)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = m
	mi.custom_aabb = AABB(Vector3(-1e4, -1e4, -1e4), Vector3(2e4, 2e4, 2e4))   # placed by its shader: never culled
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	vp.add_child(mi)

## the dead riding the Red (tools/landkit3d/beach3d.py drowned(): where each floats and which way it lies; the bodies
## from tools/landkit3d/drowned_glb.py), laid on the live surface by shaders/red_sea_body.gdshader
const DEAD := [[68.2, -7.6, 0.6], [71.6, -11.2, -0.9], [73.6, -2.2, 1.9], [67.3, 2.6, -2.2], [65.7, -10.4, 2.8],
		[69.4, -27.5, 1.1], [67.0, 19.5, -0.4], [72.8, 30.5, 2.2], [70.2, 11.0, -1.6]]
const SKIN := {"corpse": Color(0.4, 0.33, 0.33), "cloth": Color(0.17, 0.14, 0.15), "bone": Color(0.6, 0.55, 0.46),
		"hide": Color(0.3, 0.22, 0.2)}

func _dead(ftex: Texture2D, sf: Dictionary, world_o: float, lift_px: float) -> void:
	var path := "res://art/zones/red_shore_drowned.glb"
	if not ResourceLoader.exists(path):
		return
	var root: Node3D = (load(path) as PackedScene).instantiate()
	vp.add_child(root)
	var body_sh: Shader = load("res://shaders/red_sea_body.gdshader")
	for k in DEAD.size():
		var holder := root.find_child("drowned%d" % k, true, false)
		if holder == null:
			continue
		var s0: float = DEAD[k][0]
		var t0: float = DEAD[k][1]
		var yaw: float = DEAD[k][2]
		# its heading in the world, as the builder turned it (beach3d.drowned: wy)
		var d := Vector2(((t0 + sin(yaw)) - (s0 + cos(yaw)) - (t0 - s0)) / sqrt(2.0), ((-(s0 + cos(yaw)) - (t0 + sin(yaw))) - (-s0 - t0)) / sqrt(2.0))
		var wy := atan2(d.y, d.x)
		for mi in holder.find_children("*", "MeshInstance3D", true, false):
			var mesh: Mesh = mi.mesh
			for si in mesh.get_surface_count():
				var mn := ""
				var sm := mesh.surface_get_material(si)
				if sm:
					mn = sm.resource_name
				var m := ShaderMaterial.new()
				m.shader = body_sh
				m.set_shader_parameter("field", ftex)
				m.set_shader_parameter("fgeo", Vector4(float(sf["s0"]), float(sf["t0"]), float(sf["res"]), 0.0))
				m.set_shader_parameter("fn", Vector2(float(sf["ns"]), float(sf["nt"])))
				m.set_shader_parameter("zo", world_o)
				m.set_shader_parameter("lift_px", lift_px)
				m.set_shader_parameter("anchor", Vector2(s0, t0))
				m.set_shader_parameter("wyaw", wy)
				m.set_shader_parameter("kph", 0.37 * k)
				m.set_shader_parameter("debug", int(OS.get_environment("GM_SEA_DEBUG")) if OS.get_environment("GM_SEA_DEBUG") != "" else 0)
				var col: Color = SKIN.get(mn.get_slice(".", 0), SKIN["corpse"])
				m.set_shader_parameter("base", Vector3(col.r, col.g, col.b))
				mats.append(m)
				mi.set_surface_override_material(si, m)
			mi.custom_aabb = AABB(Vector3(-1e4, -1e4, -1e4), Vector3(2e4, 2e4, 2e4))
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

## a grid on the shore: s in VERTEX.x, t in VERTEX.z
static func _grid(sa: float, sb: float, ds: float, ta: float, tb: float, dt: float) -> ArrayMesh:
	var ns := int(ceil((sb - sa) / ds)) + 1
	var nt := int(ceil((tb - ta) / dt)) + 1
	var v := PackedVector3Array()
	v.resize(ns * nt)
	var k := 0
	for j in nt:
		for i in ns:
			v[k] = Vector3(sa + i * ds, 0.0, ta + j * dt)
			k += 1
	var idx := PackedInt32Array()
	idx.resize((ns - 1) * (nt - 1) * 6)
	k = 0
	for j in nt - 1:
		for i in ns - 1:
			var a := j * ns + i
			idx[k] = a
			idx[k + 1] = a + 1
			idx[k + 2] = a + ns
			idx[k + 3] = a + 1
			idx[k + 4] = a + ns + 1
			idx[k + 5] = a + ns
			k += 6
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = v
	arr[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m

## the curl's strip: t in VERTEX.x, the profile's point (0..11) in VERTEX.y
static func _lip(ta: float, tb: float, dt: float) -> ArrayMesh:
	var nt := int(ceil((tb - ta) / dt)) + 1
	var v := PackedVector3Array()
	for j in nt:
		for i in 12:
			v.append(Vector3(ta + j * dt, float(i), 0.0))
	var idx := PackedInt32Array()
	for j in nt - 1:
		for i in 11:
			var a := j * 12 + i
			idx.append_array([a, a + 1, a + 12, a + 1, a + 13, a + 12])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = v
	arr[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	return m

func _heart(x: float) -> float:
	var f := clampf(x, 0.0, 1.0) * (_clock.size() - 1)
	var i := mini(int(f), _clock.size() - 2)
	return lerpf(_clock[i], _clock[i + 1], f - i)

func _process(_dt: float) -> void:
	var cam := get_viewport().get_camera_2d()
	if cam == null:
		return
	# the view in the zone's px, snapped to the art pixel so the sea's pixels sit on the ground's grid
	var view := get_viewport().get_visible_rect().size / cam.zoom
	var tl := (get_global_transform().affine_inverse() * cam.get_screen_center_position()) - view * 0.5
	var o := (tl / AP).floor() * AP - Vector2(AP, AP) * 2.0
	var sz := Vector2i((view / AP).ceil()) + Vector2i(6, 6)
	if sz != _size:
		_size = sz
		vp.size = sz
	pic.position = o
	# the window: centred on the view (the screen's centre back to the shore's s, t), snapped to the grid's spacing so
	# its points always land on the same places of the shore and the surface never swims
	var c := o + Vector2(sz) * AP * 0.5
	var tc := c.x / (72.0 * sqrt(2.0))
	var sc := (-(c.y / 36.0) - 2.0 * _wo) / sqrt(2.0)
	var win := Vector2(floorf((sc - WIN_S * 0.5) / RES) * RES, floorf((tc - WIN_T * 0.5) / RES) * RES)
	var secs := Time.get_ticks_msec() / 1000.0
	var b := secs / P                          # beats (the same clock as the Red's sound: core/main.gd)
	var x := fposmod(b, 1.0)
	var hv := _heart(x)
	var bv := _pulse(x, 0.06, 0.045) + 0.5 * _pulse(x, 0.27, 0.035)
	var g := 0.9 + 0.12 * sin(TAU * b * 0.37 + 1.0)
	for m in mats:
		m.set_shader_parameter("origin", o)
		m.set_shader_parameter("vsize", Vector2(sz) * AP)
		m.set_shader_parameter("heart", hv)
		m.set_shader_parameter("beat_v", bv)
		m.set_shader_parameter("grp", g)
		m.set_shader_parameter("secs", secs)
		m.set_shader_parameter("win", win)
