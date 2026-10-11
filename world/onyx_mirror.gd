extends Node2D
## The onyx in the colossal face's mouth, live (Derek, 2026-10-10: "put a black onyx mirror in the mouth that shows a
## weird distorted reflection"): the archway's own outline (tools/landkit3d/cave_export.py, the zone's "onyx") drawn
## over the bake's black through shaders/onyx_mirror.gdshader, sorted where the mouth stands so whoever walks before it
## is drawn in front. When the newborn comes near it the body's second camera (entities/body3d.gd mirror_view) shows it
## as this mirror would, and the stone takes it in, wrong.

const NEAR := 9.0                        # tiles: past this the mirror holds no one

var zone
var game                                 # core/main.gd: its hero, as it changes
var poly: Polygon2D
var mat: ShaderMaterial
var c0 := Vector2.ZERO                   # the sill's centre (tiles)
var n := Vector2.ZERO                    # the way the mirror faces (tiles)
var _rp := Vector2.INF                   # where the reflection is drawn: it follows a beat late

func _init(z, g) -> void:
	zone = z
	game = g
	name = "OnyxMirror"
	var o: Dictionary = z.d["onyx"]
	var pts: Array = o["pts"]
	n = Vector2(float(o["n"][0]), float(o["n"][1]))
	var a: Array = pts[0]
	var b: Array = pts[pts.size() - 1]
	c0 = (Vector2(float(a[0]), float(a[1])) + Vector2(float(b[0]), float(b[1]))) * 0.5
	var zs := float(a[2])
	# sorted where a body standing at the sill would be (the bands' rule: the depth, not the lift)
	position = Vector2((c0.x - c0.y) * Iso.HX, (c0.x + c0.y) * Iso.HY)
	var sp := PackedVector2Array()
	var top := 1e9
	for p in pts:
		var s := Vector2((float(p[0]) - float(p[1])) * Iso.HX, (float(p[0]) + float(p[1])) * Iso.HY - float(p[2]) * Iso.lift_px)
		sp.append(s - position)
		top = minf(top, s.y)
	poly = Polygon2D.new()
	poly.polygon = sp
	mat = ShaderMaterial.new()
	mat.shader = load("res://shaders/onyx_mirror.gdshader")
	mat.set_shader_parameter("base_pos", position)
	mat.set_shader_parameter("sill", Vector2(position.x, position.y - zs * Iso.lift_px))
	mat.set_shader_parameter("top_y", top)
	poly.material = mat
	add_child(poly)

func _process(dt: float) -> void:
	var cam := get_viewport().get_camera_2d()
	if cam:
		mat.set_shader_parameter("zoom", cam.zoom.x)
	var hero = game.hero if game else null
	var b3 = hero.body3d if hero != null and is_instance_valid(hero) else null
	if b3 == null or not is_instance_valid(b3):
		mat.set_shader_parameter("has_refl", false)
		return
	var tp: Vector2 = hero.tp
	var d := tp.distance_to(c0)
	if d > NEAR + 1.0:
		b3.mirror_view(false)
		mat.set_shader_parameter("has_refl", false)
		return
	var tex: Texture2D = b3.mirror_view(true, n)
	# where the mirror puts it: the body's ground point reflected in the mirror's plane, on its own floor's height
	var tq := tp - 2.0 * (tp - c0).dot(n) * n
	var foot := Vector2((tq.x - tq.y) * Iso.HX, (tq.x + tq.y) * Iso.HY - Iso.lift(tp))
	var sz := Vector2(Body3D.FRAME, Body3D.FRAME) * Iso.FIG
	mat.set_shader_parameter("refl", tex)
	mat.set_shader_parameter("has_refl", true)
	# it comes after you a beat late: the pose is yours as you make it, its place slides after you
	var want := foot - Body3D.FOOT * Iso.FIG
	_rp = want if _rp == Vector2.INF else _rp.lerp(want, 1.0 - exp(-dt * 1.6))
	mat.set_shader_parameter("refl_pos", _rp)
	mat.set_shader_parameter("refl_size", sz)
	mat.set_shader_parameter("refl_k", clampf(1.0 - (d - 2.5) / (NEAR - 2.5), 0.0, 1.0))
