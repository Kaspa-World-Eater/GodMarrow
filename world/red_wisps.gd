extends Node2D
## Wisp-fire drifting out on the Red (Derek, 2026-10-10: "add some wisp fires drifting out in the ocean"). Wisp-fire as
## the fire section has it (tools/art_study/library/objects/fire-candles-wax.md): a cold teardrop flame off the blood,
## white core, pale blue-white body, dim blue-grey edge, torn at the tip; it flares, burns a while and dies; a faint
## cold glow on the blood. Never "fireflies": the game says wisp-fire. Each hovers half a yard over the water between
## four and twenty yards past the waterline (the shore field, world/baked_ground.gd), born within sight of the pilgrim
## (the shore is long; born anywhere along it, they were never met).
##
## Rare, and alive (Derek, 2026-10-10: "make the wisps fires more rare and move organically like a real wisp"): about
## three burn at once, not nine; each lies dark a while between its lives. A will-o'-the-wisp never travels like a
## thing on a rail: it drifts, its way wandering and its pace easing up and down; it hesitates, slowing into a hover that
## still breathes (a moving hold, docs/animation/02-method.md); sometimes it darts a yard or two, a small draw back first
## and an ease out at the end with a little overshoot (slow in, slow out); sometimes it fades out and comes back a few
## yards off, as if it had never been where you looked. It bobs slowly on two clocks. Its flame trails its motion: it
## leans back from the way it moves, follows through when it stops and swings past upright before it settles.

const N := 4                 # slots; with their dark spells between lives, about three burn at once
const SPEED := 0.32          # its wandering pace at most, yards a second (a dart is quicker)

var zone
var shore: Dictionary
var wisps: Array = []

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
		n.visible = false
		add_child(n)
		var L := PointLight2D.new()
		L.color = Color(0.62, 0.76, 1.0)
		L.set_meta("dark_r", 13.0)       # the dark layer's wisp pool, in web world px: faint and small
		L.set_meta("dark_core", 0.2)
		L.set_meta("dark_far", 1.2)
		L.visible = false
		add_child(L)
		# the first few already burning at different ages once the pilgrim is in the world, the rest still dark
		var w := {"node": n, "light": L, "seed": 50.0 + i * 13.7, "off": 0.01 if i < 3 else randf_range(2.0, 8.0),
			"age0": randf_range(0.1, 0.7) if i < 3 else 0.0}
		wisps.append(w)

## yards past the waterline at a tile (negative: out on the Red)
func _din(tp: Vector2) -> float:
	var img: Image = shore["img"]
	var u := clampf(tp.x / float(shore["w"]), 0.0, 0.999)
	var v := clampf(tp.y / float(shore["h"]), 0.0, 0.999)
	return (img.get_pixel(int(u * img.get_width()), int(v * img.get_height())).r - 0.5) * float(shore["span"])

func _ok(tp: Vector2) -> bool:
	var d := _din(tp)
	return d < -4.0 and d > -20.0

## a place on the water within sight of `near`, between `r0` and `r1` yards from it
func _place(near: Vector2, r0: float, r1: float) -> Vector2:
	for tries in 60:
		var a := randf() * TAU
		var tp := near + Vector2(cos(a), sin(a)) * randf_range(r0, r1)
		if _ok(tp):
			return tp
	return Vector2(-1.0, -1.0)

func _spawn(w: Dictionary, age: float) -> void:
	var h = zone.get("hero_ref")
	var near: Vector2 = h.tp if h != null and is_instance_valid(h) else Vector2(float(shore["w"]), float(shore["h"])) * 0.5
	# the nearest water in sight first; from the back of the cove, the nearest water there is
	var tp := _place(near, 3.0, 13.0)
	for band in [[13.0, 24.0], [24.0, 40.0]]:
		if tp.x < 0.0:
			tp = _place(near, band[0], band[1])
	if tp.x < 0.0:
		for tries in 80:
			tp = Vector2(randf() * float(shore["w"]), randf() * float(shore["h"]))
			if _ok(tp):
				break
	w["tp"] = tp
	w["vel"] = Vector2.ZERO
	w["T"] = randf_range(11.0, 19.0)
	w["t"] = age * float(w["T"])
	w["h"] = randf_range(0.4, 0.7)
	w["lean"] = 0.0
	w["lean_v"] = 0.0
	w["lift"] = 0.0
	w["blinked"] = false
	w["fade"] = 1.0
	w["off"] = 0.0
	_mode(w, "drift")

func _mode(w: Dictionary, m: String) -> void:
	w["mode"] = m
	w["mt"] = 0.0
	match m:
		"drift":
			w["mdur"] = randf_range(2.0, 5.0)
		"hover":
			w["mdur"] = randf_range(0.9, 2.6)
		"dart":
			# a yard or two, quickly, roughly the way it was going or off to a side
			var base: Vector2 = w["vel"]
			var a := (base.angle() if base.length() > 0.01 else randf() * TAU) + randf_range(-1.3, 1.3)
			var to: Vector2 = w["tp"] + Vector2(cos(a), sin(a)) * randf_range(1.2, 2.6)
			if not _ok(to):
				to = w["tp"] - Vector2(cos(a), sin(a)) * randf_range(1.0, 2.0)
			if not _ok(to):
				_mode(w, "hover")
				return
			w["from"] = w["tp"]
			w["to"] = to
			w["mdur"] = randf_range(0.55, 0.85)
		"blink":
			var to := _place(w["tp"], 2.5, 5.5)
			if to.x < 0.0:
				_mode(w, "hover")
				return
			w["to"] = to
			w["mdur"] = randf_range(1.6, 2.4)      # out, a dark beat, back in somewhere else
			w["blinked"] = true

func _next(w: Dictionary) -> void:
	var r := randf()
	match String(w["mode"]):
		"drift":
			if r < 0.5:
				_mode(w, "hover")
			elif r < 0.8:
				_mode(w, "dart")
			elif r < 0.92 and not w["blinked"] and float(w["t"]) < float(w["T"]) * 0.7:
				_mode(w, "blink")
			else:
				_mode(w, "drift")
		"hover":
			_mode(w, "dart" if r < 0.35 else "drift")
		_:
			_mode(w, "hover" if r < 0.6 else "drift")

## a dart's path along its line, 0..1 over its time: a small draw back, the rush, an overshoot that settles
static func _dart_u(u: float) -> float:
	var back := -0.07 * sin(PI * clampf(u / 0.18, 0.0, 1.0))
	var go := smoothstep(0.12, 0.8, u)
	var over := 0.08 * sin(PI * clampf((u - 0.7) / 0.3, 0.0, 1.0))
	return go + back + over

func _process(dt: float) -> void:
	if wisps.is_empty():
		return
	var wind := Vector2(1.0, 0.0)
	if zone.d.has("wind"):
		wind = Vector2(float(zone.d["wind"][0]), float(zone.d["wind"][1]))
	for w in wisps:
		var n: ColorRect = w["node"]
		var L: PointLight2D = w["light"]
		if float(w["off"]) > 0.0:
			w["off"] = float(w["off"]) - dt
			n.visible = false
			L.visible = false
			if float(w["off"]) <= 0.0:
				_spawn(w, float(w.get("age0", 0.0)))
				w["age0"] = 0.0
			continue
		w["t"] = float(w["t"]) + dt
		var T: float = w["T"]
		if float(w["t"]) >= T:
			w["off"] = randf_range(3.5, 9.0)      # dark a while before it burns again, somewhere else
			n.visible = false
			L.visible = false
			continue
		var s: float = w["seed"]
		var t: float = w["t"]
		var old: Vector2 = w["tp"]
		var tp := old
		w["mt"] = float(w["mt"]) + dt
		var u := float(w["mt"]) / float(w["mdur"])
		var fade := 1.0
		match String(w["mode"]):
			"drift":
				# a wandering way and a pace that eases up and down on its own slow clocks, a little downwind
				var a := s + 0.9 * sin(t * 0.23 + s) + 0.6 * sin(t * 0.61 + s * 2.3)
				var pace := SPEED * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * 0.37 + s * 1.7), 2.0))
				var want := Vector2(cos(a), sin(a)) * pace + wind * 0.04
				w["vel"] = (w["vel"] as Vector2).lerp(want, 1.0 - exp(-dt * 1.2))
			"hover":
				# slowing into a hold that still breathes: a slight circling where it hangs
				var want := Vector2(sin(t * 1.1 + s), cos(t * 0.8 + s)) * 0.03
				w["vel"] = (w["vel"] as Vector2).lerp(want, 1.0 - exp(-dt * 2.2))
			"dart":
				var p: Vector2 = (w["from"] as Vector2).lerp(w["to"], _dart_u(minf(u, 1.0)))
				w["vel"] = (p - old) / maxf(dt, 0.001)
				tp = p
			"blink":
				# fades out where it is, is gone a beat, and comes back in at the new place
				w["vel"] = (w["vel"] as Vector2).lerp(Vector2.ZERO, 1.0 - exp(-dt * 2.0))
				fade = 1.0 - smoothstep(0.0, 0.3, u) + smoothstep(0.58, 1.0, u)
				if u >= 0.45 and not w.has("jumped"):
					w["jumped"] = true
					tp = w["to"]
					old = tp
					w["vel"] = Vector2.ZERO
		if String(w["mode"]) != "dart":
			tp = tp + (w["vel"] as Vector2) * dt
			# kept out on the water: turned back from the shore and from the far Red
			if not _ok(tp):
				tp = old
				w["vel"] = -(w["vel"] as Vector2) * 0.4
		w["tp"] = tp
		if u >= 1.0:
			w.erase("jumped")
			_next(w)
		# alive: it flares in, burns, gutters out; a slow breathing of its own; dims as it fades in a blink
		var k := t / T
		var life := smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.82, 1.0, k))
		life *= 0.82 + 0.18 * sin(t * 0.9 + s * 3.1) * sin(t * 0.43 + s)
		life *= fade
		# the bob: slow, on two clocks; a dart lifts it a little
		var dart_lift := 0.12 * sin(PI * clampf(u, 0.0, 1.0)) if String(w["mode"]) == "dart" else 0.0
		w["lift"] = lerpf(float(w["lift"]), dart_lift, 1.0 - exp(-dt * 6.0))
		var bob := 0.07 * sin(t * TAU / 4.3 + s) + 0.04 * sin(t * TAU / 2.6 + s * 2.0) + float(w["lift"])
		var at := Iso.to_screen(tp) - Vector2(0.0, (float(w["h"]) + bob) * Iso.lift_px)
		# the flame trails its motion: a spring, so it follows through and swings past upright when it stops
		var sv := (Iso.to_screen(tp) - Iso.to_screen(old)) / maxf(dt, 0.001)
		var lean_to := clampf(-sv.x / 60.0, -1.0, 1.0) + 0.15 * wind.x
		var lv: float = w["lean_v"]
		var ln: float = w["lean"]
		lv += ((lean_to - ln) * 26.0 - lv * 5.0) * dt
		ln += lv * dt
		w["lean_v"] = lv
		w["lean"] = clampf(ln, -1.2, 1.2)
		var mat := n.material as ShaderMaterial
		mat.set_shader_parameter("life", life)
		mat.set_shader_parameter("wind", float(w["lean"]))
		mat.set_shader_parameter("breath", 0.9 + 0.25 * sin(t * 1.7 + s) + 0.3 * clampf(sv.length() / 120.0, 0.0, 1.0))
		n.visible = life > 0.01
		# on the 2 x 2 art grid: the rect's corner on an even screen px
		n.position = ((at - Vector2(n.size.x * 0.5, n.size.y)) / 2.0).floor() * 2.0
		L.position = Iso.to_screen(tp)
		L.visible = life > 0.25
