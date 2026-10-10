extends Node2D
## Wisp-fire drifting out on the Red (Derek, 2026-10-10: "add some wisp fires drifting out in the ocean"). Wisp-fire as
## the fire section has it (tools/art_study/library/objects/fire-candles-wax.md): a cold teardrop flame off the blood,
## white core, pale blue-white body, dim blue-grey edge, torn at the tip; it flares, burns a while and dies; a faint
## cold glow on the blood. Never "fireflies": the game says wisp-fire. Nine of them, each hovering half a yard over the
## water between four and twenty yards past the waterline (the shore field, world/baked_ground.gd), drifting slowly
## downwind, flaring in, burning, guttering out, and born again elsewhere on the water, within sight of the pilgrim (the
## shore is long; born anywhere along it, they were never met).

const N := 9

var zone
var shore: Dictionary
var wisps: Array = []        # {tp, t, life, node, light, h, seed}

func bind(z) -> void:
	zone = z
	shore = z.get_meta("shore", {})
	z_index = 898
	if shore.is_empty():
		return
	var sh: Shader = load("res://shaders/live_flame.gdshader")
	for i in N:
		var n := ColorRect.new()
		n.mouse_filter = Control.MOUSE_FILTER_IGNORE
		n.size = Vector2(26, 50)
		var m := ShaderMaterial.new()
		m.shader = sh
		m.set_shader_parameter("kind", 0)
		m.set_shader_parameter("cold", true)
		m.set_shader_parameter("rect_size", n.size)
		m.set_shader_parameter("seed", 50.0 + i * 13.7)
		n.material = m
		add_child(n)
		var L := PointLight2D.new()
		L.color = Color(0.62, 0.76, 1.0)
		L.set_meta("dark_r", 13.0)       # the dark layer's wisp pool, in web world px: faint and small
		L.set_meta("dark_core", 0.2)
		L.set_meta("dark_far", 1.2)
		L.visible = false
		add_child(L)
		var w := {"node": n, "light": L, "seed": 50.0 + i * 13.7}
		_spawn(w, randf() * 0.9)
		wisps.append(w)

## yards past the waterline at a tile (negative: out on the Red)
func _din(tp: Vector2) -> float:
	var img: Image = shore["img"]
	var u := clampf(tp.x / float(shore["w"]), 0.0, 0.999)
	var v := clampf(tp.y / float(shore["h"]), 0.0, 0.999)
	return (img.get_pixel(int(u * img.get_width()), int(v * img.get_height())).r - 0.5) * float(shore["span"])

func _spawn(w: Dictionary, age: float) -> void:
	var h = zone.get("hero_ref")
	var near: Vector2 = h.tp if h != null and is_instance_valid(h) else Vector2(float(shore["w"]), float(shore["h"])) * 0.5
	for tries in 80:
		var tp := near + Vector2(randf_range(-18.0, 18.0), randf_range(-18.0, 18.0))
		if tries > 50:
			tp = Vector2(randf() * float(shore["w"]), randf() * float(shore["h"]))
		var d := _din(tp)
		if d < -4.0 and d > -20.0:
			w["tp"] = tp
			break
	w["T"] = randf_range(9.0, 16.0)
	w["t"] = age * float(w["T"])
	w["h"] = randf_range(0.35, 0.7)

func _process(dt: float) -> void:
	if wisps.is_empty():
		return
	var wind := Vector2(1.0, 0.0)
	if zone.d.has("wind"):
		wind = Vector2(float(zone.d["wind"][0]), float(zone.d["wind"][1]))
	for w in wisps:
		w["t"] += dt
		var T: float = w["T"]
		if w["t"] >= T:
			_spawn(w, 0.0)
			continue
		var k: float = w["t"] / T
		var life := smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.82, 1.0, k))
		var tp: Vector2 = w["tp"] + wind * 0.12 * dt + Vector2(sin(w["t"] * 0.7 + w["seed"]), cos(w["t"] * 0.5 + w["seed"])) * 0.05 * dt
		w["tp"] = tp
		var bob: float = sin(w["t"] * 1.3 + w["seed"]) * 0.06
		var at := Iso.to_screen(tp) - Vector2(0.0, (float(w["h"]) + bob) * Iso.lift_px)
		var n: ColorRect = w["node"]
		n.position = (at - Vector2(n.size.x * 0.5, n.size.y)).floor()
		(n.material as ShaderMaterial).set_shader_parameter("life", life)
		var L: PointLight2D = w["light"]
		L.position = Iso.to_screen(tp)
		L.visible = life > 0.25
