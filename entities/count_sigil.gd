class_name CountSigil
extends Node2D
## The Ossuarch's count, hung over the head of whatever he has cursed (the user, 2026-09-30: "a white geometric symbol
## number thing, ghostly and ethereal above their head"). A ring of nine points, the curse's own figure inside it,
## and the count's numeral at its heart. Each notch lights a point and draws the next line of the figure; at nine the
## count closes: the sigil swells and thins away. White and pale, slow: it breathes and turns, it never flickers.
## Kinds: "open" (Open Count: the nine-pointed star, drawn stroke by stroke), "fewer" (The Fewer: one line standing
## alone), "weigh" (The Weighing: a beam and two pans), "stair" (The Ninth Stair: nine steps going down).
## Use: CountSigil.on(monster, kind) returns the sigil (one per monster); sigil.count = n; sigil.close().
## Test: --arena=5 --sigils.

const R := 34.0
var kind := "open"
var count := 0
var shown := 0.0          # the count as drawn, easing toward count
var t := 0.0
var closing := -1.0
var motes: Array = []
var font: Font

static func on(m: Node2D, k: String) -> CountSigil:
	var s: CountSigil = m.get_node_or_null("CountSigil")
	if s == null:
		s = CountSigil.new()
		s.name = "CountSigil"
		m.add_child(s)
	s.kind = k
	return s

func _ready() -> void:
	z_index = 60
	z_as_relative = false
	var mat := CanvasItemMaterial.new()
	mat.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED   # the dark never hides it
	material = mat
	font = load("res://ui/uikit.gd").font("sc")
	var p = get_parent()
	var r: float = p.radius if "radius" in p else 0.3
	position = Vector2(0, -150.0 * clampf(r / 0.3, 0.8, 2.2) - 30.0)
	modulate.a = 0.0

func close() -> void:
	closing = 0.0

func _process(dt: float) -> void:
	t += dt
	if has_meta("demo"):   # --sigils: the count climbs on its own, to show every step
		count = mini(9, int(t / 0.7) + int(get_meta("demo")))
	shown = move_toward(shown, float(count), dt * 6.0)
	var p = get_parent()
	# hang just over its head, wherever the head is this frame
	if p and "spr" in p and p.spr is Sprite2D and p.spr.texture:
		var top: float = p.spr.position.y + p.spr.get_rect().position.y * absf(p.spr.scale.y)
		position.y = lerpf(position.y, top - R - 8.0, minf(1.0, dt * 8.0)) if t > 0.1 else top - R - 8.0
	if p == null or ("dead" in p and p.dead and closing < 0.0):
		closing = 0.0 if closing < 0.0 else closing
	if closing >= 0.0:
		closing += dt
		scale = Vector2.ONE * (1.0 + closing * 1.4)
		modulate.a = maxf(0.0, 1.0 - closing / 0.6)
		if closing > 0.6:
			queue_free()
	else:
		modulate.a = minf(1.0, modulate.a + dt * 2.0)
	# a few pale threads drift up off it
	if randf() < dt * 6.0:
		var a := randf() * TAU
		motes.append({"p": Vector2(cos(a), sin(a)) * R * randf_range(0.6, 1.1), "v": Vector2(randf_range(-4, 4), -12.0 - randf() * 10.0), "t": 0.0, "life": 1.2 + randf()})
	for m in motes:
		m["t"] += dt
		m["p"] += m["v"] * dt
	motes = motes.filter(func(m): return m["t"] < m["life"])
	queue_redraw()

func _pt(i: int, rot: float) -> Vector2:
	var a := -PI / 2.0 + i / 9.0 * TAU + rot
	return Vector2(cos(a), sin(a)) * R

func _draw() -> void:
	var breath := 0.78 + 0.12 * sin(t * 1.6)
	var bob := Vector2(0, sin(t * 1.1) * 3.0)
	var W := Color(0.92, 0.94, 0.97, 0.78 * breath)
	var WB := Color(1.0, 1.0, 1.0, 0.85 * breath)
	var FAINT := Color(0.85, 0.88, 0.95, 0.28 * breath)
	var rot := t * 0.12
	draw_set_transform(bob, 0.0, Vector2.ONE)
	# the ring and its nine points
	draw_arc(Vector2.ZERO, R + 5.0, 0.0, TAU, 48, FAINT, 1.0)
	draw_arc(Vector2.ZERO, R, 0.0, TAU, 9 * 4, W, 1.2)
	var n := int(floorf(shown + 0.001))
	for i in 9:
		var q := _pt(i, rot)
		var lit := i < n
		var s := 3.0 if lit else 2.0
		draw_colored_polygon(PackedVector2Array([q + Vector2(0, -s), q + Vector2(s, 0), q + Vector2(0, s), q + Vector2(-s, 0)]), WB if lit else W)
	# the curse's figure, drawn as far as the count has gone
	var k := shown / 9.0
	match kind:
		"open":
			for i in 9:   # the nine-pointed star {9/4}, a stroke per notch
				var f := clampf(shown - i, 0.0, 1.0)
				if f <= 0.0:
					continue
				var a := _pt(i * 4 % 9, rot)
				var b := _pt((i + 1) * 4 % 9, rot)
				draw_line(a, a.lerp(b, f), W, 1.2)
		"fewer":
			draw_line(Vector2(0, -R * 0.7), Vector2(0, R * 0.7), W, 1.4)
			for i in 9:
				var y := -R * 0.6 + i * R * 0.15
				if i >= n:
					draw_circle(Vector2(-R * 0.35 if i % 2 == 0 else R * 0.35, y), 1.4, FAINT)
		"weigh":
			var tilt := k * 0.5
			var l := Vector2(-R * 0.6, 0).rotated(tilt)
			var r := Vector2(R * 0.6, 0).rotated(tilt)
			draw_line(Vector2(0, -R * 0.55), Vector2(0, R * 0.2), W, 1.2)
			draw_line(l + Vector2(0, -R * 0.3), r + Vector2(0, -R * 0.3), W, 1.2)
			draw_arc(l + Vector2(0, -R * 0.1), R * 0.2, 0.0, PI, 8, W, 1.0)
			draw_arc(r + Vector2(0, -R * 0.1), R * 0.2, 0.0, PI, 8, W, 1.0)
		"stair":
			for i in 9:
				var x0 := -R * 0.62 + i * R * 0.14
				var y0 := -R * 0.5 + i * R * 0.12
				var c := WB if i < n else FAINT
				draw_line(Vector2(x0, y0), Vector2(x0 + R * 0.14, y0), c, 1.2)
				draw_line(Vector2(x0 + R * 0.14, y0), Vector2(x0 + R * 0.14, y0 + R * 0.12), c, 1.2)
	# the numeral at its heart
	var txt := str(clampi(int(roundf(shown)), 0, 9))
	var fs := 38
	var sz := font.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs)
	draw_string(font, Vector2(-sz.x / 2.0, sz.y * 0.32), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, WB)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for m in motes:
		var a: float = clampf(1.0 - m["t"] / m["life"], 0.0, 1.0)
		draw_rect(Rect2(m["p"] + bob, Vector2(2, 2)), Color(0.9, 0.93, 1.0, 0.35 * a))
