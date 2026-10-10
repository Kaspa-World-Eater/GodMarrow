extends Node2D
## A live flame on every fire a baked place lights (the opening cave's torches, sconces, braziers and candle heaps;
## Derek, 2026-10-10: "the torches are not animated", "none of the realistic fire flicker and pulsing and waving
## lightness, like real fire"). Each flame is drawn by shaders/live_flame.gdshader at the fire's own place and height
## (its light in the zone data: x, y, heightPx over its floor, as the dark layer reads it), its kind by what it is
## (high on a wall: a torch's tongue; a brazier's bed; low and small: a heap of candles), and breathes on its light's
## own clock (fx/flame.gd smooth), so the flame and the light it throws swell and gutter together. Made by core/main.gd
## for zones whose fires are baked into their picture.

const Flame = preload("res://fx/flame.gd")

var zone
var flames: Array = []        # {node, seed}

func bind(z) -> void:
	zone = z
	z.set_meta("live_flames", true)
	var sh: Shader = load("res://shaders/live_flame.gdshader")
	for L in z.d.get("lights", []):
		if str(L.get("type", "")) != "fire":
			continue
		var tp := Vector2(float(L["x"]), float(L["y"]))
		var hpx := float(L.get("heightPx", 0))
		var kind := 0
		var size := Vector2(30, 50)
		var root := Vector2(0.5, 1.0)          # where in the rect the flame stands on its fuel
		if str(L.get("kind", "")) == "floorcandles":
			kind = 3                  # a cluster of candles on the floor or a step, each cluster its own make
			size = Vector2(44, 34)
		elif str(L.get("kind", "")) == "brazier":
			kind = 1                  # a fire down in its bowl: the bowl's opening an ellipse, its front lip hiding the root
			size = Vector2(100, 96)
			root = Vector2(0.5, 0.75)
		elif hpx < 34.0:
			kind = 2                  # low: candles on a heap of the dead's iron, or on a step
			size = Vector2(34, 22)
		elif hpx > 130.0:
			size = Vector2(30, 60)    # the hall's sconces, the highest and largest torches
		var seed := tp.x * 3.1 + tp.y * 7.7
		# where the fire truly is: its own height in the world when the export knows it (zAbs, yards), else its height
		# over the floor under it; and the flame stands in the world's sorted layer by its ground point, so what walks
		# in front of a fire hides it (Derek, 2026-10-10: the brazier "has no depth to it, looks like its pasted on top")
		var ground := Iso.to_screen(tp)
		var fy := ground.y - hpx * 4.0
		if L.has("zAbs"):
			fy = (tp.x + tp.y) * Iso.HY - float(L["zAbs"]) * Iso.lift_px
		var holder := Node2D.new()
		holder.position = ground
		zone.sorted.add_child(holder)
		var n := ColorRect.new()
		n.mouse_filter = Control.MOUSE_FILTER_IGNORE
		n.size = size
		n.position = (Vector2(float(L.get("dxPx", 0)) * 4.0, fy - ground.y) - Vector2(size.x * root.x, size.y * root.y - (4.0 if root.y >= 1.0 else 0.0))).floor()
		var m := ShaderMaterial.new()
		m.shader = sh
		m.set_shader_parameter("seed", seed)
		m.set_shader_parameter("kind", kind)
		m.set_shader_parameter("rect_size", size)
		n.material = m
		holder.add_child(n)
		var at := Vector2(ground.x, fy)
		flames.append({"node": n, "seed": seed, "at": Vector2(ground.x, fy), "reach": float(L.get("radius", 3.0)) * 120.0,
			"h": 60.0 if kind >= 2 else 140.0})
		# its sound, at the fire: a torch crackles, a brazier roars low, candles barely flutter (core/sfx.gd loop)
		var snd := "fire_brazier" if kind == 1 else ("fire_candle" if kind >= 2 else "fire_torch")
		var ap := AudioStreamPlayer2D.new()
		ap.stream = Sfx.loop(snd)
		ap.bus = "World"
		ap.position = at
		ap.max_distance = {"fire_brazier": 1500.0, "fire_torch": 1000.0, "fire_candle": 360.0}[snd]
		ap.attenuation = 1.6
		ap.volume_db = {"fire_brazier": -9.0, "fire_torch": -13.0, "fire_candle": -16.0}[snd] + linear_to_db(maxf(0.0001, float(Settings.sfx_vol)))
		ap.pitch_scale = randf_range(0.9, 1.1)
		add_child(ap)
		ap.play(randf() * 2.9)

func _process(_dt: float) -> void:
	_relight()
	for f in flames:
		var m: ShaderMaterial = (f["node"] as ColorRect).material
		m.set_shader_parameter("breath", Flame.smooth(f["seed"]))
		m.set_shader_parameter("wind", Gust.dir() * Gust.k() * 0.5 if Gust.storm else 0.0)

## the near fires handed to the ground's shader each frame (shaders/baked_ground.gdshader, fires): the sixteen nearest the
## view, each its place, its height, its reach, its breath, and a jitter of its source with the flicker
func _relight() -> void:
	if zone == null or not zone.has_meta("ground_mats"):
		return
	var cam := get_viewport().get_camera_2d()
	var c := cam.get_screen_center_position() if cam else Vector2.ZERO
	var near := flames.duplicate()
	near.sort_custom(func(a, b): return (a["at"] as Vector2).distance_squared_to(c) < (b["at"] as Vector2).distance_squared_to(c))
	var fs: Array = []
	var ff: Array = []
	var t := Time.get_ticks_msec() / 1000.0
	for i in 16:
		if i < near.size() and (near[i]["at"] as Vector2).distance_to(c) < 2200.0:
			var f: Dictionary = near[i]
			var br: float = 1.0 + (Flame.smooth(f["seed"]) - 1.0) * 3.0
			var sd: float = f["seed"]
			fs.append(Vector4(f["at"].x, f["at"].y, f["h"], f["reach"]))
			ff.append(Vector4(br, 3.0 * sin(t * 7.3 + sd) + 1.5 * sin(t * 13.1 + sd * 2.0), 2.0 * sin(t * 5.1 + sd * 1.7), 0.0))
		else:
			fs.append(Vector4.ZERO)
			ff.append(Vector4.ZERO)
	var n := mini(16, near.size())
	for m in zone.get_meta("ground_mats"):
		(m as ShaderMaterial).set_shader_parameter("n_fires", n)
		(m as ShaderMaterial).set_shader_parameter("fires", fs)
		(m as ShaderMaterial).set_shader_parameter("fire_f", ff)
