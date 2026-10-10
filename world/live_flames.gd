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
	z_index = 899
	var sh: Shader = load("res://shaders/live_flame.gdshader")
	for L in z.d.get("lights", []):
		if str(L.get("type", "")) != "fire":
			continue
		var tp := Vector2(float(L["x"]), float(L["y"]))
		var hpx := float(L.get("heightPx", 0))
		var kind := 0
		var size := Vector2(30, 50)
		if str(L.get("kind", "")) == "floorcandles":
			kind = 3                  # a cluster of wax stubs on the floor or a step, each with its flame
			size = Vector2(30, 26)
		elif str(L.get("kind", "")) == "brazier":
			kind = 1
			size = Vector2(60, 58)
		elif hpx < 34.0:
			kind = 2                  # low: candles on a heap of the dead's iron, or on a step
			size = Vector2(34, 22)
		elif hpx > 130.0:
			size = Vector2(30, 60)    # the hall's sconces, the highest and largest torches
		var seed := tp.x * 3.1 + tp.y * 7.7
		var n := ColorRect.new()
		n.mouse_filter = Control.MOUSE_FILTER_IGNORE
		n.size = size
		var at := Iso.to_screen(tp) + Vector2(float(L.get("dxPx", 0)), -hpx) * 4.0
		n.position = (at - Vector2(size.x * 0.5, size.y - 4.0)).floor()
		var m := ShaderMaterial.new()
		m.shader = sh
		m.set_shader_parameter("seed", seed)
		m.set_shader_parameter("kind", kind)
		m.set_shader_parameter("rect_size", size)
		n.material = m
		add_child(n)
		flames.append({"node": n, "seed": seed})
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
	for f in flames:
		var m: ShaderMaterial = (f["node"] as ColorRect).material
		m.set_shader_parameter("breath", Flame.smooth(f["seed"]))
		m.set_shader_parameter("wind", Gust.dir() * Gust.k() * 0.5 if Gust.storm else 0.0)
