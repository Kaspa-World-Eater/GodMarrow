extends Node2D
## Where a blow lands, the world answers (Derek 2026-10-05: "effects should never look like they're overlaid on the
## screen, they should be in the game in the world interacting with the world"; "visual oomph"): a flash of light that
## lights the ground and whatever stands near for a breath; chips thrown in arcs that land, bounce once, lie in the dirt
## and fade; under a heavy blow, a crack scored into the ground. All in whole world pixels, drawn on the ground.

const PX := 4.0
var zone
var chips: Array = []      # {p (tile), z (px up), v (tile/s), vz, col, t, life, rest}
var cracks: Array = []     # {pts (screen), t, life}
var flashes: Array = []    # {light, t, life, e}
var motes: Array = []      # embers and ash rising off what burns: {q (screen), v, t, life, ember}
var bursts: Array = []     # {c (screen), rays [[dir, len]], col, t}
var stains: Array = []     # {q (screen), w, t, life}

static func of(z) -> Node2D:
	var n = z.get_node_or_null("Impacts")
	if n == null:
		n = load("res://world/impacts.gd").new()
		n.name = "Impacts"
		n.zone = z
		n.z_index = 1
		z.add_child(n)
	return n

## a blow at tile p from tile `from`; heavy for the big ones; kind: "flesh" | "bone" | "stone"
func hit(p: Vector2, from: Vector2, heavy: bool, kind: String = "flesh") -> void:
	var away := (p - from).normalized() if from != Vector2.INF and from.distance_to(p) > 0.01 else Vector2(randf_range(-1, 1), randf_range(-1, 1)).normalized()
	var n := 16 if heavy else 10
	var cols: Array = {"bone": [Color("#d6cdb4"), Color("#a69a80"), Color("#6e6452")],
		"stone": [Color("#8a8276"), Color("#5e574e"), Color("#3c3731")],
		"flesh": [Color("#7a1414"), Color("#4e0c0c"), Color("#2e0808")],
		"ice": [Color("#e6f4ff"), Color("#a8cfee"), Color("#5f8fbf")],
		"spark": [Color("#ffffff"), Color("#c8dcff"), Color("#7a9ae0")],
		"rot": [Color("#6a4a7a"), Color("#3e2a4a"), Color("#6a3a4a")]}.get(kind, [Color("#7a1414")])
	for i in n:
		var a := away.rotated(randf_range(-0.9, 0.9))
		chips.append({"p": p, "z": 40.0 + randf() * 30.0, "v": a * randf_range(1.2, 3.4) * (1.4 if heavy else 1.0),
			"vz": randf_range(60.0, 160.0) * (1.3 if heavy else 1.0), "col": cols[randi() % cols.size()], "t": 0.0,
			"life": randf_range(2.5, 5.0), "rest": false, "bounced": false, "big": randf() < 0.35, "stain": kind == "flesh" and randf() < 0.6})
	while chips.size() > 160:
		chips.pop_front()
	_flash(p, Color(1.0, 0.75, 0.5) if kind != "bone" else Color(0.95, 0.9, 0.78), 0.3 if heavy else 0.18, 60.0 if heavy else 38.0)
	# the burst at the point of contact: bright streaks for two frames
	var rays: Array = []
	for i in (12 if heavy else 7):
		rays.append([away.rotated(randf_range(-1.3, 1.3)), randf_range(3.0, 7.0) * (1.5 if heavy else 1.0)])
	bursts.append({"c": Iso.to_screen(p) - Vector2(0, 48), "rays": rays, "t": 0.0,
		"col": Color(1.0, 0.95, 0.8) if kind == "bone" else Color(1.0, 0.82, 0.6)})
	if heavy:
		_crack(p, away)

## the incinerating radiant blaze (shaders/radiant_blaze.gdshader): a white-gold column at tile p for secs, its light
## strong while it burns; embers and ash thrown up off it
var blazes: Array = []

func blaze(p: Vector2, secs: float = 3.0, size: float = 1.0) -> void:
	var r := ColorRect.new()
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.size = Vector2(200, 320) * size
	var q := Iso.to_screen(p)
	r.position = ((q - Vector2(r.size.x * 0.5, r.size.y - 16)) / PX).floor() * PX
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/radiant_blaze.gdshader")
	m.set_shader_parameter("seed", randf() * 40.0)
	m.set_shader_parameter("rect_size", r.size)
	r.material = m
	add_child(r)
	var pl := PointLight2D.new()
	pl.color = Color(1.0, 0.8, 0.5)
	pl.set_meta("dark_r", 70.0 * size)
	pl.set_meta("dark_far", 1.8)
	pl.set_meta("dark_core", 0.35)
	pl.position = q + Vector2(0, -60)
	pl.enabled = false
	add_child(pl)
	blazes.append({"node": r, "light": pl, "t": 0.0, "secs": secs, "p": p, "size": size})

## lightning (Derek: "lightning ... be very creative"): a bolt from the sky (or from a to b) as a jagged path in whole
## pixels with forks, a white core and a blue halo; it strikes, goes dark for a breath, strikes again; the ground flashes
## blue-white; where it struck, a Lichtenberg fern is burnt into the ground, glowing then cooling to black.
var bolts: Array = []      # {pts: [screen], forks: [[screen]], t, life}
var ferns: Array = []      # {c (screen), arms: [[screen]], t, life}

func lightning(to: Vector2, from_sky: bool = true, from: Vector2 = Vector2.INF) -> void:
	var b := Iso.to_screen(to)
	var a: Vector2 = (b + Vector2(randf_range(-160, 160), -900)) if from_sky or from == Vector2.INF else Iso.to_screen(from) + Vector2(0, -60)
	if sky == null:
		sky = Node2D.new()
		sky.z_index = 1000
		sky.z_as_relative = false
		sky.draw.connect(_draw_sky)
		add_child(sky)
	bolts.append({"pts": _jag(a, b, 22.0), "forks": [], "t": 0.0, "life": 0.72})
	var bl: Dictionary = bolts[-1]
	for i in 6:
		var k := randi_range(2, bl["pts"].size() - 3)
		var s0: Vector2 = bl["pts"][k]
		var dirv: Vector2 = (b - a).normalized().rotated(randf_range(-1.1, 1.1))
		var f: Array = _jag(s0, s0 + dirv * randf_range(80, 220), 12.0)
		bl["forks"].append(f)
		if randf() < 0.6:                                   # a twig off the fork
			var s1: Vector2 = f[randi_range(1, f.size() - 2)]
			bl["forks"].append(_jag(s1, s1 + dirv.rotated(randf_range(-1.2, 1.2)) * randf_range(30, 80), 8.0))
	_flash(to, Color(0.75, 0.85, 1.0), 0.45, 280.0)
	_screen_flash()
	for k in 4:
		hit(to + Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3)), Vector2.INF, true, "spark")
	_fern(b)
	Game.shake(4.0)

var _flash_layer: CanvasLayer
var _flash_rect: ColorRect
var _flash_t := -1.0

func _screen_flash() -> void:
	if _flash_layer == null:
		_flash_layer = CanvasLayer.new()
		_flash_layer.layer = 40
		_flash_rect = ColorRect.new()
		_flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_flash_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_flash_rect.color = Color(0.8, 0.88, 1.0, 0.0)
		_flash_layer.add_child(_flash_rect)
		add_child(_flash_layer)
	_flash_t = 0.0

func _tick_screen_flash(dt: float) -> void:
	if _flash_t < 0.0 or _flash_rect == null:
		return
	_flash_t += dt
	var t := _flash_t
	var a := 0.0
	if t < 0.05:
		a = 0.55
	elif t < 0.14:
		a = 0.12
	elif t < 0.2:
		a = 0.4
	elif t < 0.5:
		a = 0.4 * (1.0 - (t - 0.2) / 0.3)
	else:
		_flash_t = -1.0
	_flash_rect.color.a = a

func _jag(a: Vector2, b: Vector2, step: float) -> Array:
	var pts: Array = [a]
	var n := maxi(3, int(a.distance_to(b) / step))
	var side := Vector2(-(b - a).y, (b - a).x).normalized()
	for i in range(1, n):
		var u := float(i) / n
		pts.append(a.lerp(b, u) + side * randf_range(-1.0, 1.0) * step * 0.9 * sin(u * PI))
	pts.append(b)
	return pts

func _fern(c: Vector2) -> void:
	var arms: Array = []
	for i in 7:
		var ang := randf() * TAU
		var p := c
		var arm: Array = []
		for k in int(randf_range(6, 12)):
			ang += randf_range(-0.6, 0.6)
			p += Vector2(cos(ang), sin(ang) * 0.5) * PX * 2.0
			arm.append(p)
			if randf() < 0.3:
				var q := p
				var a2 := ang + randf_range(-1.2, 1.2)
				for j in 3:
					q += Vector2(cos(a2), sin(a2) * 0.5) * PX * 1.5
					arm.append(q)
		arms.append(arm)
	ferns.append({"c": c, "arms": arms, "t": 0.0, "life": 18.0})
	while ferns.size() > 12:
		ferns.pop_front()

var sky: Node2D           # the bolts' own layer, above every figure

func _ensure_sky() -> void:
	if sky == null:
		sky = Node2D.new()
		sky.z_index = 1000
		sky.z_as_relative = false
		sky.draw.connect(_draw_sky)
		add_child(sky)

func _draw_sky() -> void:
	_draw_souls(sky)
	_draw_arcs(sky)
	for bl in bolts:
		var t: float = bl["t"]
		# two strikes with a dark breath between: 0-0.12 and 0.2-0.42
		if not (t < 0.12 or (t > 0.2 and t < 0.42)):
			if t >= 0.42:
				# the afterimage: a dark blue ghost of the stroke burnt on the eye, fading
				var gk: float = 1.0 - (t - 0.42) / 0.3
				_px_path(bl["pts"], Color(0.2, 0.28, 0.6, 0.5 * gk), 2, sky)
			continue
		_px_path(bl["pts"], Color(0.35, 0.5, 1.0, 0.3), 7, sky)
		_px_path(bl["pts"], Color(0.55, 0.7, 1.0, 0.6), 4, sky)
		for f in bl["forks"]:
			_px_path(f, Color(0.45, 0.6, 1.0, 0.5), 3, sky)
		_px_path(bl["pts"], Color(1.0, 1.0, 1.0, 1.0), 2, sky)
		for f in bl["forks"]:
			_px_path(f, Color(0.88, 0.94, 1.0, 0.95), 1, sky)

func _px_path(pts: Array, col: Color, w: int, cv: CanvasItem = null) -> void:
	if cv == null:
		cv = self
	for i in pts.size() - 1:
		var a: Vector2 = pts[i]
		var b: Vector2 = pts[i + 1]
		var n := maxi(1, int(a.distance_to(b) / PX))
		for k in n + 1:
			var q := (a.lerp(b, float(k) / n) / PX).floor() * PX
			cv.draw_rect(Rect2(q - Vector2(w / 2, w / 2) * PX, Vector2(w, w) * PX), col)

## frost on the ground (shaders/frost.gdshader): feathers grow out from p for a second, glitter, then melt back
var frosts: Array = []

func frost(p: Vector2, r: float = 1.6, secs: float = 9.0) -> void:
	var hw := r * Iso.HX
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(hw * 2.2, hw * 1.1) / PX).ceil() * PX
	n.position = ((Iso.to_screen(p) - n.size * 0.5) / PX).floor() * PX
	n.z_index = -1
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/frost.gdshader")
	m.set_shader_parameter("seed", randf() * 30.0)
	m.set_shader_parameter("half_px", Vector2(hw, hw * 0.5))
	m.set_shader_parameter("rect_size", n.size)
	n.material = m
	add_child(n)
	frosts.append({"node": n, "t": 0.0, "secs": secs})
	spikes(p, r)
	_flash(p, Color(0.6, 0.8, 1.0), 0.25, 40.0)

## ice spikes bursting up out of the ground: faceted prisms in whole pixels (a lit face, a shaded face, a white edge
## and tip), a cluster that shoots up fast and leans out from its centre, then cracks and sinks as the ice melts
var spike_sets: Array = []

func spikes(p: Vector2, r: float = 1.0, secs: float = 6.0) -> void:
	var c := Iso.to_screen(p)
	var list: Array = []
	for i in int(3 + r * 2.5):
		var a := randf() * TAU
		var d := randf() * r * Iso.HX * 0.5
		var base := c + Vector2(cos(a) * d, sin(a) * d * 0.5)
		var lean := Vector2(cos(a), -1.8).normalized() * randf_range(0.2, 0.5) + Vector2(0, -1)
		list.append({"b": base, "dir": lean.normalized(), "h": randf_range(40, 110) * (1.0 - d / (r * Iso.HX * 0.5 + 1.0) * 0.5), "w": randf_range(18, 30)})
	list.sort_custom(func(x, y): return x["b"].y < y["b"].y)
	spike_sets.append({"list": list, "t": 0.0, "secs": secs})

func _draw_spikes() -> void:
	for ss in spike_sets:
		var t: float = ss["t"]
		var g := 1.0 - pow(1.0 - minf(1.0, t / 0.18), 3.0)                 # shoots up fast
		var sink := smoothstep(ss["secs"] - 1.5, ss["secs"], t)
		for sp in ss["list"]:
			var h: float = sp["h"] * g * (1.0 - sink)
			if h < 4.0:
				continue
			var b: Vector2 = sp["b"]
			var dirv: Vector2 = sp["dir"]
			var side := Vector2(-dirv.y, dirv.x)
			var w: float = sp["w"]
			var tip := b + dirv * h
			# fill the prism pixel by pixel: across from -w/2 to w/2 tapering to the tip
			var n := int(h / PX)
			for k in n:
				var u := float(k) / n
				var half := w * 0.5 * (1.0 - u)
				var cpos := b + dirv * (u * h)
				var m := int(ceil(half / PX))
				for j in range(-m, m + 1):
					var q := ((cpos + side * j * PX) / PX).floor() * PX
					var col := Color(0.62, 0.8, 1.0, 0.92) if j < 0 else Color(0.28, 0.42, 0.72, 0.92)
					if j == 0:
						col = Color(0.92, 0.98, 1.0, 0.95)                    # the ridge catches the light
					elif abs(j) == m:
						col = Color(0.12, 0.2, 0.42, 0.95)                    # the dark edge
					draw_rect(Rect2(q, Vector2(PX, PX)), col)
			draw_rect(Rect2((tip / PX).floor() * PX, Vector2(PX, PX)), Color(1, 1, 1))
			if sink > 0.0:                                                 # cracks as it melts
				var cq := ((b + dirv * h * 0.5) / PX).floor() * PX
				draw_rect(Rect2(cq, Vector2(PX * 2, PX)), Color(0.05, 0.08, 0.16, sink))

## an acid pool (shaders/acid.gdshader): it spreads, bubbles and fumes for secs, then sinks away
var acids: Array = []

func acid(p: Vector2, r: float = 1.3, secs: float = 8.0) -> void:
	var hw := r * Iso.HX
	var fh := 60.0 + r * 30.0
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(hw * 2.4, hw + fh) / PX).ceil() * PX
	var q := Iso.to_screen(p)
	n.position = ((q - Vector2(n.size.x * 0.5, fh + hw * 0.5)) / PX).floor() * PX
	n.z_index = -1
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/acid.gdshader")
	m.set_shader_parameter("seed", randf() * 30.0)
	m.set_shader_parameter("half_px", Vector2(hw, hw * 0.5))
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("fume_h", fh)
	n.material = m
	add_child(n)
	var pl := PointLight2D.new()
	pl.color = Color(0.6, 0.95, 0.3)
	pl.set_meta("dark_r", 24.0 * r)
	pl.set_meta("dark_far", 1.4)
	pl.position = q
	pl.enabled = false
	add_child(pl)
	acids.append({"node": n, "light": pl, "t": 0.0, "secs": secs})

# ------------------------------------------------------------------ souls (the lantern keeps them: Derek's ruling)
## a soul pulled out of the dying: a pale wisp with two dark hollows for eyes and a mouth, rising, then drawn along a
## curve into the pilgrim's lantern, a dithered tail behind it; the lantern flares a little as it takes it
var souls: Array = []      # {p (screen), v, t, trail: [screen], seed, kind}

func soul(at: Vector2, kind: String = "pale") -> void:
	_ensure_sky()
	souls.append({"p": at + Vector2(0, -50), "v": Vector2(randf_range(-30, 30), -randf_range(60, 110)), "t": 0.0, "trail": [], "seed": randf() * 9.0, "kind": kind})

func _tick_souls(dt: float) -> void:
	var sc = get_tree().current_scene
	var h = sc.get("hero") if sc else null
	var tgt := Vector2.INF
	if h and is_instance_valid(h) and not h.dead:
		tgt = h.lantern.global_position if h.get("lantern") and is_instance_valid(h.lantern) else h.position + Vector2(-20, -130)
	for so in souls:
		so["t"] += dt
		var t: float = so["t"]
		var pull := smoothstep(0.5, 1.6, t)
		var wob := Vector2(sin(t * 7.0 + so["seed"]) * 30.0, cos(t * 5.0 + so["seed"]) * 12.0)
		if tgt != Vector2.INF:
			var to: Vector2 = tgt - so["p"]
			so["v"] = so["v"].lerp(to.normalized() * (120.0 + 380.0 * pull), minf(1.0, dt * (1.0 + 5.0 * pull)))
			if to.length() < 14.0 and t > 0.6:
				so["done"] = true
				_flash_at_screen(tgt, Color(0.75, 0.95, 1.0), 0.25)
				if h.get("lantern") and is_instance_valid(h.lantern):
					h.lantern.flare = maxf(h.lantern.flare, 0.6)
		else:
			so["v"].y -= 30.0 * dt
		so["p"] += (so["v"] + wob * (1.0 - pull)) * dt
		so["trail"].push_front(so["p"])
		if so["trail"].size() > 14:
			so["trail"].pop_back()
	souls = souls.filter(func(so): return not so.get("done", false) and so["t"] < 6.0)

func _flash_at_screen(q: Vector2, col: Color, life: float) -> void:
	var pl := PointLight2D.new()
	pl.color = col
	pl.set_meta("dark_r", 26.0)
	pl.position = q
	pl.enabled = false
	add_child(pl)
	flashes.append({"light": pl, "t": 0.0, "life": life})

func _draw_souls(cv: CanvasItem) -> void:
	for so in souls:
		var tr: Array = so["trail"]
		for i in tr.size():
			var u := float(i) / tr.size()
			var q: Vector2 = (tr[i] / PX).floor() * PX
			if (int(q.x / PX) + int(q.y / PX) + i) % 2 == 0 or u < 0.3:
				cv.draw_rect(Rect2(q, Vector2(PX, PX)), Color(0.6, 0.85, 1.0, 0.7 * (1.0 - u)))
		var c: Vector2 = (so["p"] / PX).floor() * PX
		cv.draw_rect(Rect2(c - Vector2(PX, PX * 2), Vector2(PX * 3, PX * 4)), Color(0.8, 0.95, 1.0, 0.9))
		cv.draw_rect(Rect2(c - Vector2(PX * 2, PX), Vector2(PX * 5, PX * 2)), Color(0.7, 0.9, 1.0, 0.55))
		cv.draw_rect(Rect2(c + Vector2(-PX, -PX), Vector2(PX, PX)), Color(0.05, 0.08, 0.14, 0.95))
		cv.draw_rect(Rect2(c + Vector2(PX, -PX), Vector2(PX, PX)), Color(0.05, 0.08, 0.14, 0.95))
		cv.draw_rect(Rect2(c + Vector2(0, PX), Vector2(PX, PX)), Color(0.05, 0.08, 0.14, 0.7))

# ------------------------------------------------------------------ lightning's other forms
## an arc leaping between two points (chain lightning), and a body crackling with charge for a while
var arcs: Array = []       # {a, b (screen), t, life}
var crackles: Array = []   # {node, t, life}

func arc(a: Vector2, b: Vector2) -> void:
	_ensure_sky()
	arcs.append({"a": a, "b": b, "t": 0.0, "life": 0.3})
	_flash_at_screen(b, Color(0.7, 0.8, 1.0), 0.15)

func crackle(m: Node2D, secs: float = 1.2) -> void:
	_ensure_sky()
	crackles.append({"node": m, "t": 0.0, "life": secs})

## chain lightning: from tile a to each target in turn, each crackling after
func chain(a: Vector2, targets: Array) -> void:
	var prev := Iso.to_screen(a) + Vector2(0, -80)
	for m in targets:
		if not is_instance_valid(m):
			continue
		var q: Vector2 = m.position + Vector2(0, -60)
		arc(prev, q)
		crackle(m, 1.0)
		prev = q

func _draw_arcs(cv: CanvasItem) -> void:
	for ar in arcs:
		var pts := _jag(ar["a"], ar["b"], 14.0)
		_px_path(pts, Color(0.45, 0.6, 1.0, 0.5), 3, cv)
		_px_path(pts, Color(1, 1, 1, 1), 1, cv)
	for cr in crackles:
		var n = cr["node"]
		if not is_instance_valid(n) or n.get("spr") == null:
			continue
		var r: Rect2 = n.spr.get_rect()
		var sc: Vector2 = n.spr.scale.abs()
		var box := Rect2(n.position + n.spr.position + r.position * sc, r.size * sc)
		var k: float = 1.0 - cr["t"] / cr["life"]
		for i in int(2 + 3 * k):
			if randf() > 0.6:
				continue
			var a := box.position + Vector2(randf(), randf()) * box.size
			var b := a + Vector2(randf_range(-24, 24), randf_range(-24, 24))
			_px_path(_jag(a, b, 6.0), Color(0.75, 0.85, 1.0, 0.9 * k), 1, cv)

# ------------------------------------------------------------------ miasma
## the breath (shaders/miasma.gdshader): a low creeping body with tendrils and surfacing faces; "cloud" is taller and
## thicker (a choking cloud), "breath" low and wide
var miasmas: Array = []

func miasma(p: Vector2, r: float = 2.0, secs: float = 10.0, kind: String = "breath") -> void:
	var hw := r * Iso.HX
	var rh := (60.0 if kind == "breath" else 140.0) * (0.6 + r * 0.25)
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(hw * 2.3, hw + rh) / PX).ceil() * PX
	var q := Iso.to_screen(p)
	n.position = ((q - Vector2(n.size.x * 0.5, rh + hw * 0.5)) / PX).floor() * PX
	n.z_index = 2
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/miasma.gdshader")
	m.set_shader_parameter("seed", randf() * 30.0)
	m.set_shader_parameter("half_px", Vector2(hw, hw * 0.5))
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("rise_h", rh)
	m.set_shader_parameter("thick", 1.0 if kind == "breath" else 1.5)
	m.set_shader_parameter("drift", Vector2(Gust.dir() * (0.6 + Gust.k()), 0.25))
	n.material = m
	add_child(n)
	miasmas.append({"node": n, "t": 0.0, "secs": secs})

## something burning sheds an ember or a flake of ash (and now and then a curl of smoke); k: how far it has burnt
func ash(p: Vector2, k: float) -> void:
	var q := Iso.to_screen(p) - Vector2(randf_range(-10, 10), randf_range(20, 90) * (1.0 - k * 0.6))
	var ember := randf() < 0.6 - 0.4 * k
	motes.append({"q": q, "v": Vector2(randf_range(-8, 8), -randf_range(30, 70) if ember else -randf_range(10, 25)), "t": 0.0,
		"life": randf_range(0.8, 1.8) if ember else randf_range(2.0, 3.5), "ember": ember, "smoke": not ember and randf() < 0.3})
	while motes.size() > 220:
		motes.pop_front()

func _flash(p: Vector2, col: Color, life: float, r: float) -> void:
	var pl := PointLight2D.new()
	pl.color = col
	pl.set_meta("dark_r", r)
	pl.set_meta("dark_far", 1.4)
	pl.set_meta("dark_core", 0.3)
	pl.position = Iso.to_screen(p)
	pl.enabled = false
	add_child(pl)
	flashes.append({"light": pl, "t": 0.0, "life": life})

func _crack(p: Vector2, away: Vector2) -> void:
	var c := Iso.to_screen(p)
	var pts: Array = []
	for j in 4:
		var ang := atan2(away.y, away.x) + (j - 1.5) * 0.9 + randf_range(-0.3, 0.3)
		var q := c
		var line: Array = [q]
		for s in int(randf_range(4, 8)):
			ang += randf_range(-0.5, 0.5)
			q += Vector2(cos(ang), sin(ang) * 0.5) * PX * 2.0
			line.append(q)
		pts.append(line)
	cracks.append({"pts": pts, "t": 0.0, "life": 6.0})
	while cracks.size() > 24:
		cracks.pop_front()

func _process(dt: float) -> void:
	for c in chips:
		c["t"] += dt
		if c["rest"]:
			continue
		c["vz"] -= 520.0 * dt
		c["z"] += c["vz"] * dt
		c["p"] += c["v"] * dt
		if c["z"] <= 0.0:
			c["z"] = 0.0
			if c.get("stain", false) and not c.get("stained", false):
				c["stained"] = true
				stains.append({"q": Iso.to_screen(c["p"]), "w": 2 if c.get("big", false) else 1, "t": 0.0, "life": randf_range(7.0, 12.0)})
				while stains.size() > 200:
					stains.pop_front()
			if not c["bounced"] and c["vz"] < -60.0:
				c["bounced"] = true
				c["vz"] = -c["vz"] * 0.3
				c["v"] *= 0.4
			else:
				c["rest"] = true
	chips = chips.filter(func(c): return c["t"] < c["life"])
	for bz in blazes:
		bz["t"] += dt
		var u: float = bz["t"] / bz["secs"]
		var lf: float = smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.75, 1.0, u))
		var mt: ShaderMaterial = bz["node"].material
		mt.set_shader_parameter("t", bz["t"])
		mt.set_shader_parameter("life", lf)
		bz["light"].visible = lf > 0.05
		if randf() < dt * 30.0 * lf:
			ash(bz["p"] + Vector2(randf_range(-0.4, 0.4), randf_range(-0.4, 0.4)), 0.0)
		if u >= 1.0:
			bz["node"].queue_free()
			bz["light"].queue_free()
	blazes = blazes.filter(func(bz): return bz["t"] < bz["secs"])
	for ac in acids:
		ac["t"] += dt
		var am: ShaderMaterial = ac["node"].material
		am.set_shader_parameter("t", ac["t"])
		am.set_shader_parameter("spread", 1.0 - pow(1.0 - minf(1.0, ac["t"] / 0.8), 3.0))
		am.set_shader_parameter("fade", 1.0 - smoothstep(ac["secs"] - 2.0, ac["secs"], ac["t"]))
		if ac["t"] >= ac["secs"]:
			ac["node"].queue_free()
			ac["light"].queue_free()
	acids = acids.filter(func(ac): return ac["t"] < ac["secs"])
	for ss in spike_sets:
		ss["t"] += dt
	spike_sets = spike_sets.filter(func(ss): return ss["t"] < ss["secs"])
	for fr in frosts:
		fr["t"] += dt
		var fm: ShaderMaterial = fr["node"].material
		fm.set_shader_parameter("t", fr["t"])
		fm.set_shader_parameter("grow", 1.0 - pow(1.0 - minf(1.0, fr["t"] / 1.2), 3.0))
		fm.set_shader_parameter("melt", smoothstep(fr["secs"] - 3.0, fr["secs"], fr["t"]))
		if fr["t"] >= fr["secs"]:
			fr["node"].queue_free()
	frosts = frosts.filter(func(fr): return fr["t"] < fr["secs"])
	_tick_souls(dt)
	_tick_screen_flash(dt)
	for mi in miasmas:
		mi["t"] += dt
		var mm: ShaderMaterial = mi["node"].material
		mm.set_shader_parameter("t", mi["t"])
		mm.set_shader_parameter("life", smoothstep(0.0, 1.5, mi["t"]) * (1.0 - smoothstep(mi["secs"] - 3.0, mi["secs"], mi["t"])))
		if mi["t"] >= mi["secs"]:
			mi["node"].queue_free()
	miasmas = miasmas.filter(func(mi): return mi["t"] < mi["secs"])
	for ar in arcs:
		ar["t"] += dt
	arcs = arcs.filter(func(ar): return ar["t"] < ar["life"])
	for cr in crackles:
		cr["t"] += dt
	crackles = crackles.filter(func(cr): return cr["t"] < cr["life"])
	if sky:
		sky.queue_redraw()
	for bl in bolts:
		bl["t"] += dt
	bolts = bolts.filter(func(bl): return bl["t"] < bl["life"])
	if sky:
		sky.queue_redraw()
	for fn in ferns:
		fn["t"] += dt
	ferns = ferns.filter(func(fn): return fn["t"] < fn["life"])
	for mo in motes:
		mo["t"] += dt
		mo["v"].x += Gust.dir() * Gust.k() * 40.0 * dt + sin(mo["t"] * 3.0 + mo["q"].y * 0.05) * 6.0 * dt
		mo["q"] += mo["v"] * dt
		mo["v"].y *= 1.0 - 0.6 * dt
	motes = motes.filter(func(mo): return mo["t"] < mo["life"])
	for b in bursts:
		b["t"] += dt
	bursts = bursts.filter(func(b): return b["t"] < 0.1)
	for st in stains:
		st["t"] += dt
	stains = stains.filter(func(st): return st["t"] < st["life"])
	for k in cracks:
		k["t"] += dt
	cracks = cracks.filter(func(k): return k["t"] < k["life"])
	for f in flashes:
		f["t"] += dt
		var pl: PointLight2D = f["light"]
		if is_instance_valid(pl):
			pl.visible = f["t"] < f["life"]
	for f in flashes:
		if f["t"] >= f["life"] and is_instance_valid(f["light"]):
			f["light"].queue_free()
	flashes = flashes.filter(func(f): return f["t"] < f["life"])
	queue_redraw()

func _draw() -> void:
	_draw_spikes()
	for fn in ferns:
		var u: float = fn["t"] / fn["life"]
		var hot := clampf(1.0 - fn["t"] / 1.5, 0.0, 1.0)
		var col := Color(0.04, 0.04, 0.06, 0.75 * (1.0 - smoothstep(0.6, 1.0, u))).lerp(Color(0.75, 0.85, 1.0, 1.0), hot)
		for arm in fn["arms"]:
			for q in arm:
				draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), col)

	for mo in motes:
		var u: float = mo["t"] / mo["life"]
		var mq: Vector2 = (mo["q"] / PX).floor() * PX
		if mo["ember"]:
			var hot := 1.0 - u
			draw_rect(Rect2(mq, Vector2(PX, PX)), Color(1.0, 0.45 + 0.4 * hot, 0.15 + 0.3 * hot * hot, 1.0 - u * u))
		elif mo["smoke"]:
			var r := int(1 + u * 3)
			for yy in range(-r, r + 1):
				for xx in range(-r, r + 1):
					if xx * xx + yy * yy <= r * r and (int(mq.x / PX) + xx + int(mq.y / PX) + yy) % 2 == 0:
						draw_rect(Rect2(mq + Vector2(xx, yy) * PX, Vector2(PX, PX)), Color(0.16, 0.15, 0.15, 0.35 * (1.0 - u)))
		else:
			draw_rect(Rect2(mq, Vector2(PX, PX)), Color(0.45, 0.43, 0.41, 0.7 * (1.0 - u)))
	for st in stains:
		var sa: float = 1.0 - smoothstep(0.6, 1.0, st["t"] / st["life"])
		var sq: Vector2 = (st["q"] / PX).floor() * PX
		draw_rect(Rect2(sq, Vector2(PX * st["w"] * 2, PX)), Color(0.22, 0.03, 0.03, 0.75 * sa))
	for k in cracks:
		var a: float = 1.0 - smoothstep(0.6, 1.0, k["t"] / k["life"])
		for line in k["pts"]:
			for i in range(1, line.size()):
				var q: Vector2 = line[i]
				draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(0.05, 0.04, 0.035, 0.7 * a))
	for c in chips:
		var q := Iso.to_screen(c["p"]) - Vector2(0, c["z"])
		var a: float = 1.0 - smoothstep(0.7, 1.0, c["t"] / c["life"])
		var col: Color = c["col"]
		col.a = a
		var sz := PX * (2.0 if c.get("big", false) else 1.0)
		draw_rect(Rect2((q / PX).floor() * PX, Vector2(sz, sz)), col)
		if c["z"] > 6.0:   # its shadow on the ground under it
			var sq := Iso.to_screen(c["p"])
			draw_rect(Rect2((sq / PX).floor() * PX, Vector2(PX, PX)), Color(0, 0, 0, 0.35 * a))

	for b in bursts:
		var bc: Color = b["col"]
		for r in b["rays"]:
			var dv: Vector2 = Vector2(r[0].x - r[0].y, (r[0].x + r[0].y) * 0.5).normalized()   # the tile way, on screen
			var L: float = r[1] * (0.6 + b["t"] * 8.0)
			var s0 := 1.5
			while s0 < L:
				var q: Vector2 = b["c"] + dv * s0 * PX
				draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(bc, 1.0 - s0 / L * 0.6))
				s0 += 1.0
		draw_rect(Rect2((b["c"] / PX).floor() * PX - Vector2(PX, PX), Vector2(PX * 3, PX * 3)), Color(1, 1, 0.92, 0.9))
