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
		chips.append({"p": p, "z": 40.0 + randf() * 30.0, "v": a * randf_range(1.2, 3.4) * (1.4 if heavy else 1.0) * (0.5 if kind == "flesh" else 1.0),
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
	_ensure_sky()
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
		sky = Node2D.new()                 # light: drawn over the darkness on the ghost layer (the night does not grade it)
		sky.draw.connect(_draw_sky)
		_ghost_layer().add_child(sky)

func _draw_sky() -> void:
	_draw_souls(sky)
	_draw_bone(sky)
	_draw_zap(sky)
	_draw_ice(sky)
	_draw_wisps(sky)
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

const SPIKE_PAL := {
	"ice": [Color(0.62, 0.8, 1.0, 0.92), Color(0.28, 0.42, 0.72, 0.92), Color(0.92, 0.98, 1.0, 0.95), Color(0.12, 0.2, 0.42, 0.95)],
	"bone": [Color(0.86, 0.84, 0.78, 1.0), Color(0.48, 0.47, 0.48, 1.0), Color(0.97, 0.96, 0.92, 1.0), Color(0.16, 0.15, 0.17, 1.0)],
}

func spikes(p: Vector2, r: float = 1.0, secs: float = 6.0, pal: String = "ice") -> void:
	var c := Iso.to_screen(p)
	var list: Array = []
	for i in int(3 + r * 2.5):
		var a := randf() * TAU
		var d := randf() * r * Iso.HX * 0.5
		var base := c + Vector2(cos(a) * d, sin(a) * d * 0.5)
		var lean := Vector2(cos(a), -1.8).normalized() * randf_range(0.2, 0.5) + Vector2(0, -1)
		list.append({"b": base, "dir": lean.normalized(), "h": randf_range(40, 110) * (1.0 - d / (r * Iso.HX * 0.5 + 1.0) * 0.5), "w": randf_range(18, 30)})
	list.sort_custom(func(x, y): return x["b"].y < y["b"].y)
	spike_sets.append({"list": list, "t": 0.0, "secs": secs, "pal": pal})

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
					var P: Array = SPIKE_PAL[ss.get("pal", "ice")]
					var col: Color = P[0] if j < 0 else P[1]
					if j == 0:
						col = P[2]                                            # the ridge catches the light
					elif abs(j) == m:
						col = P[3]                                            # the dark edge
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
		# a soul: no face (Derek: no little skulls), a small spirit-mote like the wisps, faint, breathing
		var c: Vector2 = (so["p"] / PX).floor() * PX
		var br := 0.7 + 0.3 * sin(so["t"] * 7.0 + so["seed"])
		for yy in range(-3, 4):
			for xx in range(-3, 4):
				var e := xx * xx + yy * yy
				if e <= 9:
					cv.draw_rect(Rect2(c + Vector2(xx, yy) * PX, Vector2(PX, PX)), Color(0.55, 0.75, 1.0, (0.16 if e > 4 else 0.3) * br))
		cv.draw_rect(Rect2(c, Vector2(PX, PX)), Color(1, 1, 1, 0.95))

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
## miasma is ghostly: it glows faintly of itself, so it lies on a layer over the darkness (layer 5) that still moves
## with the world (follow_viewport), and the night does not grade it
var _ghost: CanvasLayer

func _ghost_layer() -> CanvasLayer:
	if _ghost == null:
		_ghost = CanvasLayer.new()
		_ghost.layer = 6
		_ghost.follow_viewport_enabled = true
		add_child(_ghost)
	return _ghost

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
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/miasma.gdshader")
	m.set_shader_parameter("seed", randf() * 30.0)
	m.set_shader_parameter("half_px", Vector2(hw, hw * 0.5))
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("rise_h", rh)
	m.set_shader_parameter("thick", 1.0 if kind == "breath" else 1.5)
	m.set_shader_parameter("drift", Vector2(Gust.dir() * (0.6 + Gust.k()), 0.25))
	n.material = m
	_ghost_layer().add_child(n)
	miasmas.append({"node": n, "t": 0.0, "secs": secs})

# ------------------------------------------------------------------ breath drawn out (the miasma death)
## Derek: "their breath is being sucked out of their bodies and ethereal". Pale violet threads pulled from the mouth,
## curling up and away, thinning to nothing; drawn on the ghost layer (they glow faintly of themselves)
var breaths: Array = []     # {p (screen), v, t, life, trail}
var _breath_cv: Node2D

func breath_out(mouth: Vector2, k: float) -> void:
	if _breath_cv == null:
		_breath_cv = Node2D.new()
		_breath_cv.draw.connect(_draw_breaths)
		_ghost_layer().add_child(_breath_cv)
	var a := randf_range(-2.4, -0.7)
	breaths.append({"p": mouth + Vector2(randf_range(-4, 4), randf_range(-4, 4)), "v": Vector2(cos(a), sin(a)) * randf_range(40, 90) * (0.6 + k),
		"t": 0.0, "life": randf_range(1.0, 1.8), "trail": [], "ph": randf() * TAU})

func _tick_breaths(dt: float) -> void:
	for b in breaths:
		b["t"] += dt
		b["v"] += Vector2(sin(b["t"] * 4.0 + b["ph"]) * 60.0 + Gust.dir() * Gust.k() * 40.0, -30.0) * dt
		b["p"] += b["v"] * dt
		b["trail"].push_front(b["p"])
		if b["trail"].size() > 18:
			b["trail"].pop_back()
	breaths = breaths.filter(func(b): return b["t"] < b["life"])
	if _breath_cv:
		_breath_cv.queue_redraw()

func _draw_breaths() -> void:
	for b in breaths:
		var u: float = b["t"] / b["life"]
		var tr: Array = b["trail"]
		for i in tr.size():
			var w := float(i) / tr.size()
			var q: Vector2 = (tr[i] / PX).floor() * PX
			var al := (1.0 - w) * (1.0 - u) * 0.8
			if (i % 2 == 0) or w < 0.25:
				_breath_cv.draw_rect(Rect2(q, Vector2(PX, PX)), Color(0.78, 0.72, 1.0, al))

# ------------------------------------------------------------------ the burst (blood)
## a body bursts: a ring of gore thrown wide (heavy chunks and blood), a spray of fine droplets, a red flash, a pool
## larger than a death's, and the ground spattered all round
func gut_burst(p: Vector2) -> void:
	for k in 4:
		hit(p + Vector2(randf_range(-0.2, 0.2), randf_range(-0.2, 0.2)), p + Vector2(randf_range(-1, 1), randf_range(-1, 1)), true, "flesh")
	for i in 26:
		var a := randf() * TAU
		chips.append({"p": p, "z": 50.0, "v": Vector2(cos(a), sin(a)) * randf_range(1.0, 3.0), "vz": randf_range(80.0, 220.0),
			"col": [Color("#a01818"), Color("#6a0c0c"), Color("#c8b0a0")][randi() % 3], "t": 0.0, "life": randf_range(4.0, 7.0),
			"rest": false, "bounced": false, "big": randf() < 0.5, "stain": true})
	_flash(p, Color(1.0, 0.3, 0.25), 0.25, 50.0)
	var sp = load("res://world/splats.gd").at(zone)
	if sp:
		sp._pool(p, 0.8, false)
		for i in 10:
			sp.list.append({"p": p + Vector2(randf_range(-0.8, 0.8), randf_range(-0.6, 0.6)), "r": 0.06 + randf() * 0.12, "t": 30.0, "seed": randf() * 9.0, "col": "r"})
	Game.shake(3.0)

# ------------------------------------------------------------------ pure magic: phosphor wisps
## Derek: "pure magic should look like the wisps, with the shimmering white phosphorus ghostly blue-white trails".
## A wisp: a white-hot point that curves toward its mark; its trail is a long ribbon of phosphor sparks that linger,
## twinkle on and off and fade from white through ghost-blue; it bursts in a scatter of sparks
var wisps: Array = []      # {p, v, to (screen), t, trail: [[pos, born]], done}
var _phos: Array = []
var wsmoke: Array = []     # {q, v, t, life, r, ph}
var wtend: Array = []
var wghosts: Array = []    # {q, t, life}: where a wisp blinked out, a fading image of it      # {q, dir, len, t, life, ph, curl}      # lingering sparks: {q, t, life}

func phosphor(from_tile: Vector2, to_tile: Vector2) -> void:
	_ensure_sky()
	var a := Iso.to_screen(from_tile) + Vector2(0, -90)
	var b := Iso.to_screen(to_tile) + Vector2(0, -60)
	wisps.append({"p": a, "base": a, "from": a, "to": b, "t": 0.0, "u": 0.0, "done": false, "seed": randf() * 50.0,
		"speed": randf_range(0.45, 0.7), "trail": [], "loop": randf() < 0.5})

## a wisp moves like a spirit: its course is a slow curve from its source to its mark, but it does not keep to it: it
## wanders off the line and back (two slow sines), bobs, hesitates (its pace ebbs and surges), and once on the way may
## turn a small loop; near its mark it quickens and dives
func _tick_wisps(dt: float) -> void:
	for w in wisps:
		w["t"] += dt
		var t: float = w["t"]
		var sd: float = w["seed"]
		# a spirit's pace: it drifts, lingers (hovering almost still), then glides on; near the end it is drawn in
		var linger := smoothstep(0.55, 0.95, sin(t * 1.3 + sd) * 0.5 + 0.5)
		var pace := lerpf(1.0, 0.12, linger) * (1.0 + 2.5 * pow(w["u"], 4.0))
		w["u"] = minf(1.0, w["u"] + dt * w["speed"] * 0.75 * pace)
		# the blink: now and then it thins to nothing and is somewhere further along, a ghost of it left behind
		w["blink"] = float(w.get("blink", -1.0))
		w["next_blink"] = float(w.get("next_blink", randf_range(0.6, 1.4)))
		if w["blink"] < 0.0 and t > w["next_blink"] and w["u"] < 0.8:
			w["blink"] = 0.0
			wghosts.append({"q": w["p"], "t": 0.0, "life": 0.7})
		var vis := 1.0
		if w["blink"] >= 0.0:
			w["blink"] += dt
			var bk: float = w["blink"]
			if bk < 0.1:
				vis = 1.0 - bk / 0.1
			elif bk < 0.22:
				vis = 0.0
				if not w.get("jumped", false):
					w["u"] = minf(0.95, w["u"] + randf_range(0.07, 0.13))
					w["jumped"] = true
			elif bk < 0.36:
				vis = (bk - 0.22) / 0.14
			else:
				w["blink"] = -1.0
				w["jumped"] = false
				w["next_blink"] = t + randf_range(0.7, 1.6)
		w["vis"] = vis
		var u: float = w["u"]
		var a: Vector2 = w["from"]
		var b: Vector2 = w["to"]
		var fwd := (b - a).normalized()
		var side := Vector2(-fwd.y, fwd.x)
		var arc := sin(u * PI) * 60.0 * (1.0 if fmod(sd, 2.0) < 1.0 else -1.0)
		var base := a.lerp(b, u) + side * arc + Vector2(0, -sin(u * PI) * 40.0)
		# a lazy spiral round its course: across it and up/down (the "down" half is behind its path: dimmer, smaller)
		var sp_t := t * 2.2 + sd
		var R := 26.0 * (1.0 - u * 0.7)
		var helix := side * cos(sp_t) * R + Vector2(0, sin(sp_t) * R * 0.45)
		w["depth"] = 0.5 + 0.5 * sin(sp_t)                    # 1 in front, 0 behind
		# a slow sway, like something carried on a current underwater
		var sway := side * sin(t * 0.8 + sd * 2.0) * 14.0 + Vector2(0, sin(t * 1.1 + sd) * 7.0)
		var np: Vector2 = base + helix + sway
		var vel: Vector2 = (np - w["p"]) / maxf(dt, 0.001)
		w["p"] = np
		w["trail"].push_front(np)
		if w["trail"].size() > 34:
			w["trail"].pop_back()
		# ghostly smoke shed behind it (puffs that swell, drift and thin away) and now and then a thin tendril that
		# peels off, drifts behind and dissolves
		if randf() < dt * 22.0:
			wsmoke.append({"q": np, "v": -vel.normalized() * randf_range(10, 30) + Vector2(0, -randf_range(4, 12)), "t": 0.0, "life": randf_range(1.0, 2.0), "r": randf_range(2.0, 3.5), "ph": randf() * TAU})
		if randf() < dt * 3.5:
			var back := -vel.normalized()
			var tside := Vector2(-back.y, back.x) * (1.0 if randf() < 0.5 else -1.0)
			wtend.append({"q": np, "dir": (back + tside * randf_range(0.3, 0.9)).normalized(), "len": randf_range(40, 90), "t": 0.0, "life": randf_range(1.0, 1.8), "ph": randf() * TAU, "curl": randf_range(-1.0, 1.0)})
		# soul dust shed behind it: more when it moves fast
		var n := 1 + int(vel.length() / 260.0)
		for k in n:
			_phos.append({"q": np + Vector2(randf_range(-6, 6), randf_range(-6, 6)), "t": 0.0, "life": randf_range(0.8, 2.2),
				"v": Vector2(randf_range(-6, 6), -randf_range(4, 14)), "ph": randf() * TAU, "glint": randf() < 0.05})
		if u >= 1.0:
			w["done"] = true
			for k in 40:
				var aa := randf() * TAU
				_phos.append({"q": np + Vector2(cos(aa), sin(aa) * 0.6) * randf_range(4, 46), "t": 0.0, "life": randf_range(0.6, 1.8),
					"v": Vector2(cos(aa), sin(aa)) * randf_range(10, 40), "ph": randf() * TAU, "glint": randf() < 0.3})
			_flash_at_screen(np, Color(0.75, 0.9, 1.0), 0.25)
	wisps = wisps.filter(func(w): return not w["done"])
	for s in _phos:
		s["t"] += dt
		s["q"] += s["v"] * dt                                  # soul dust settles slowly, drifting
		s["v"] *= 1.0 - 1.5 * dt
		s["v"].x += Gust.dir() * Gust.k() * 10.0 * dt
	_phos = _phos.filter(func(s): return s["t"] < s["life"])
	for m in wsmoke:
		m["t"] += dt
		m["q"] += m["v"] * dt
		m["v"] *= 1.0 - 1.2 * dt
		m["v"].x += (sin(m["t"] * 2.0 + m["ph"]) * 14.0 + Gust.dir() * Gust.k() * 20.0) * dt
	wsmoke = wsmoke.filter(func(m): return m["t"] < m["life"])
	for tn in wtend:
		tn["t"] += dt
		tn["q"] += (tn["dir"] * 14.0 + Vector2(0, -8.0)) * dt
	wtend = wtend.filter(func(tn): return tn["t"] < tn["life"])
	for gh in wghosts:
		gh["t"] += dt
		gh["q"].y -= 10.0 * dt
	wghosts = wghosts.filter(func(gh): return gh["t"] < gh["life"])
	while _phos.size() > 2400:
		_phos.pop_front()

func _draw_wisps(cv: CanvasItem) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	# the ghosts a wisp leaves where it blinked out: a pale ring opening and fading, rising a little
	for gh in wghosts:
		var gu: float = gh["t"] / gh["life"]
		var gc: Vector2 = (gh["q"] / PX).floor()
		var gr := 3 + int(gu * 4.0)
		for k in 16:
			var ang := k / 16.0 * TAU
			var qq := gc + Vector2(round(cos(ang) * gr), round(sin(ang) * gr * 0.8))
			cv.draw_rect(Rect2(qq * PX, Vector2(PX, PX)), Color(0.7, 0.85, 1.0, 0.4 * (1.0 - gu)))
		cv.draw_rect(Rect2(gc * PX, Vector2(PX, PX)), Color(0.85, 0.94, 1.0, 0.5 * (1.0 - gu)))
	# smoke: soft dithered puffs, pale blue-grey, swelling as they thin
	for m in wsmoke:
		var u: float = m["t"] / m["life"]
		var R := int(m["r"] + u * 4.0)
		var c0: Vector2 = (m["q"] / PX).floor()
		for yy in range(-R, R + 1):
			for xx in range(-R, R + 1):
				var e := float(xx * xx + yy * yy) / float(R * R)
				if e > 1.0:
					continue
				var gx := posmod(int(c0.x) + xx, 4)
				var gy := posmod(int(c0.y) + yy, 4)
				var th := float([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][gy * 4 + gx]) / 16.0
				if (1.0 - e) * (1.0 - u) * 1.4 > th:
					cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.62, 0.72, 0.9, 0.16 * (1.0 - u)))
	# tendrils: thin curling lines that drift back and dissolve (pixels drop out from the tip inward)
	for tn in wtend:
		var u: float = tn["t"] / tn["life"]
		var L: float = tn["len"] * (0.4 + 0.6 * minf(1.0, u * 3.0))
		var dirv: Vector2 = tn["dir"]
		var p: Vector2 = tn["q"]
		var steps := int(L / PX)
		for k in steps:
			var f := float(k) / maxf(1.0, steps)
			dirv = dirv.rotated(tn["curl"] * 0.08 + sin(now * 3.0 + tn["ph"] + k * 0.4) * 0.05)
			p += dirv * PX
			if f > 1.0 - u * 1.3:                                  # dissolving from the tip
				continue
			if randf() < u * 0.6:
				continue
			cv.draw_rect(Rect2((p / PX).floor() * PX, Vector2(PX, PX)), Color(0.7, 0.84, 1.0, 0.5 * (1.0 - f) * (1.0 - u)))
	for s in _phos:
		var u: float = s["t"] / s["life"]
		var tw := 0.5 + 0.5 * sin(now * 14.0 + s["ph"])        # scintillation: each mote twinkles on its own beat
		if tw < 0.35:
			continue
		var col := Color(1.0, 1.0, 1.0, (1.0 - u)).lerp(Color(0.55, 0.72, 1.0, 0.85 * (1.0 - u)), smoothstep(0.0, 0.7, u))
		var q: Vector2 = (s["q"] / PX).floor() * PX
		cv.draw_rect(Rect2(q, Vector2(PX, PX)), col)
		if s["glint"] and tw > 0.88 and u < 0.7:             # a cross-shaped glint at the peak of its twinkle
			var gc := Color(1, 1, 1, 0.7 * (1.0 - u))
			for o in [Vector2(PX, 0), Vector2(-PX, 0), Vector2(0, PX), Vector2(0, -PX)]:
				cv.draw_rect(Rect2(q + o, Vector2(PX, PX)), gc)
	for w in wisps:
		# a spirit, not a star: it phases (fades in and out, now and then almost gone), its small soft light trailing
		# a long smoky tail that undulates behind it, thinning to nothing; faint echoes of it linger where it passed
		var t: float = w["t"]
		var sd: float = w["seed"]
		var phase := 0.55 + 0.45 * sin(t * 2.7 + sd) * sin(t * 1.1 + sd * 1.7)
		phase = clampf(phase, 0.4, 1.0) * float(w.get("vis", 1.0)) * (0.55 + 0.45 * float(w.get("depth", 1.0)))
		var orb_r := int(round(5.0 + 2.0 * float(w.get("depth", 1.0))))
		var tr: Array = w["trail"]
		for i in tr.size():
			var k := 1.0 - float(i) / tr.size()
			var q: Vector2 = tr[i]
			if i > 0:
				var dirv: Vector2 = (tr[i - 1] - q).normalized()
				q += Vector2(-dirv.y, dirv.x) * sin(i * 0.55 - t * 9.0) * (1.0 + 7.0 * (1.0 - k))   # the tail undulates
			q = (q / PX).floor() * PX
			var wdt := int(1 + 3.0 * k * k)
			for j in range(-wdt + 1, wdt):
				cv.draw_rect(Rect2(q + Vector2(j * PX, 0), Vector2(PX, PX)), Color(0.62, 0.8, 1.0, 0.59 * k * phase))
			if i % 9 == 4:                                       # an echo of it, lingering faintly
				cv.draw_rect(Rect2(q - Vector2(PX, PX), Vector2(PX * 3, PX * 3)), Color(0.7, 0.85, 1.0, 0.07 * k * phase))
		var c: Vector2 = (w["p"] / PX).floor() * PX
		var rr2 := float(orb_r * orb_r)
		for yy in range(-orb_r, orb_r + 1):
			for xx in range(-orb_r, orb_r + 1):
				var e := float(xx * xx + yy * yy)
				if e <= rr2:
					cv.draw_rect(Rect2(c + Vector2(xx, yy) * PX, Vector2(PX, PX)), Color(0.55, 0.78, 1.0, 0.45 * pow(1.0 - e / rr2, 2.0) * phase))   # glow +40% (Derek)
		cv.draw_rect(Rect2(c - Vector2(PX, 0), Vector2(PX * 3, PX)), Color(0.85, 0.94, 1.0, minf(1.0, 1.12 * phase)))
		cv.draw_rect(Rect2(c - Vector2(0, PX), Vector2(PX, PX * 3)), Color(0.85, 0.94, 1.0, minf(1.0, 1.12 * phase)))
		cv.draw_rect(Rect2(c, Vector2(PX, PX)), Color(1, 1, 1))

# ------------------------------------------------------------------ ice, more forms
## a frost nova: a ring of cold rolls outward over the ground, a white crest of crystals at its front, frost left
## behind it; where it passes, rime glitters a moment
var novas: Array = []      # {c (screen), R (px), t, secs}
## freezing mist: low cold breath that rolls and settles, pale blue, glittering with ice crystals that catch the light
var chills: Array = []     # {q, v, t, life, r}
var glints: Array = []     # {q, t, life}
## an ice shard in flight: a long crystal, a white point, frost motes shed behind it; it bursts in shards and frost
var shards: Array = []     # {p, to, v, t}

func frost_nova(p: Vector2, R: float = 3.5) -> void:
	_ensure_sky()
	novas.append({"c": Iso.to_screen(p), "R": R * Iso.HX, "t": 0.0, "secs": 0.7, "p": p, "Rt": R, "left": false})
	_flash(p, Color(0.65, 0.85, 1.0), 0.3, 60.0)

func cold_mist(p: Vector2, r: float = 2.0, secs: float = 6.0) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p)
	for i in int(18 * r):
		var a := randf() * TAU
		var d := randf() * r * Iso.HX
		chills.append({"q": c + Vector2(cos(a) * d, sin(a) * d * 0.5), "v": Vector2(randf_range(-10, 10), randf_range(-3, 3)),
			"t": -randf() * 1.0, "life": secs * randf_range(0.6, 1.0), "r": randf_range(3.0, 6.0)})

func ice_shard(from_tile: Vector2, to_tile: Vector2) -> void:
	_ensure_sky()
	var a := Iso.to_screen(from_tile) + Vector2(0, -70)
	var b := Iso.to_screen(to_tile) + Vector2(0, -40)
	shards.append({"p": a, "to": b, "v": (b - a).normalized() * 900.0, "t": 0.0, "tile": to_tile})

func _tick_ice(dt: float) -> void:
	for nv in novas:
		nv["t"] += dt
		if not nv["left"] and nv["t"] > nv["secs"] * 0.6:
			nv["left"] = true
			frost(nv["p"], nv["Rt"] * 0.8, 8.0)
	novas = novas.filter(func(nv): return nv["t"] < nv["secs"])
	for ch in chills:
		ch["t"] += dt
		ch["q"] += (ch["v"] + Vector2(Gust.dir() * Gust.k() * 18.0, 0)) * dt
		if ch["t"] > 0.0 and randf() < dt * 0.6:
			glints.append({"q": ch["q"] + Vector2(randf_range(-12, 12), randf_range(-8, 4)), "t": 0.0, "life": randf_range(0.25, 0.6)})
	chills = chills.filter(func(ch): return ch["t"] < ch["life"])
	for gl in glints:
		gl["t"] += dt
	glints = glints.filter(func(gl): return gl["t"] < gl["life"])
	for sh in shards:
		sh["t"] += dt
		sh["p"] += sh["v"] * dt
		for k in 2:
			glints.append({"q": sh["p"] + Vector2(randf_range(-4, 4), randf_range(-4, 4)), "t": 0.0, "life": randf_range(0.2, 0.5)})
		if sh["p"].distance_to(sh["to"]) < 24.0 or sh["t"] > 1.5:
			sh["done"] = true
			for k in 3:
				hit(sh["tile"], sh["tile"] - (sh["v"] as Vector2).normalized(), true, "ice")
			frost(sh["tile"], 0.9, 5.0)
	shards = shards.filter(func(sh): return not sh.get("done", false))

func _draw_ice(cv: CanvasItem) -> void:
	for ch in chills:
		if ch["t"] < 0.0:
			continue
		var u: float = ch["t"] / ch["life"]
		var a: float = sin(u * PI) * 0.38
		var c0: Vector2 = (ch["q"] / PX).floor()
		var R := int(ch["r"] + u * 3.0)
		for yy in range(-R / 2, R / 2 + 1):
			for xx in range(-R, R + 1):
				var e := pow(float(xx) / R, 2) + pow(float(yy) / (R * 0.5), 2)
				if e > 1.0:
					continue
				var th := float([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][posmod(int(c0.y) + yy, 4) * 4 + posmod(int(c0.x) + xx, 4)]) / 16.0
				if (1.0 - e) * 1.3 > th:
					cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.7, 0.85, 1.0, a))
	for gl in glints:
		var gu: float = gl["t"] / gl["life"]
		var q: Vector2 = (gl["q"] / PX).floor() * PX
		var gc := Color(1, 1, 1, 1.0 - gu)
		cv.draw_rect(Rect2(q, Vector2(PX, PX)), gc)
		if gu < 0.4:
			for o in [Vector2(PX, 0), Vector2(-PX, 0), Vector2(0, PX), Vector2(0, -PX)]:
				cv.draw_rect(Rect2(q + o, Vector2(PX, PX)), Color(0.7, 0.88, 1.0, 0.6 * (1.0 - gu)))
	for nv in novas:
		var u: float = nv["t"] / nv["secs"]
		var r: float = nv["R"] * (1.0 - pow(1.0 - u, 2.5))
		var n := int(12 + r / 5.0)
		for k in n:
			var ang := k / float(n) * TAU
			var q: Vector2 = ((nv["c"] + Vector2(cos(ang) * r, sin(ang) * r * 0.5)) / PX).floor() * PX
			var crest := 1.0 - u
			cv.draw_rect(Rect2(q, Vector2(PX, PX)), Color(0.92, 0.97, 1.0, crest))
			if k % 3 == 0:                                   # crystals jutting up at the crest
				for h in int(2 + 3 * crest):
					cv.draw_rect(Rect2(q - Vector2(0, (h + 1) * PX), Vector2(PX, PX)), Color(0.75, 0.9, 1.0, crest * (1.0 - h * 0.2)))
			var q2: Vector2 = ((nv["c"] + Vector2(cos(ang) * r * 0.85, sin(ang) * r * 0.425)) / PX).floor() * PX
			cv.draw_rect(Rect2(q2, Vector2(PX, PX)), Color(0.5, 0.72, 1.0, 0.5 * crest))
	for sh in shards:
		var d: Vector2 = (sh["v"] as Vector2).normalized()
		var side := Vector2(-d.y, d.x)
		for k in 9:
			var w := 1 if k < 6 else 0
			var q: Vector2 = sh["p"] - d * k * PX
			for j in range(-w, w + 1):
				var c := Color(0.92, 0.97, 1.0) if j == 0 else (Color(0.55, 0.78, 1.0) if j < 0 else Color(0.3, 0.48, 0.8))
				cv.draw_rect(Rect2(((q + side * j * PX) / PX).floor() * PX, Vector2(PX, PX)), c)
		cv.draw_rect(Rect2(((sh["p"] + d * PX) / PX).floor() * PX, Vector2(PX, PX)), Color(1, 1, 1))

# ------------------------------------------------------------------ lightning, more forms
## ball lightning: a writhing orb of charge drifting low, its surface crawling with tiny arcs, now and then lashing an
## arc down to the ground (a spark where it lands); it hums, flickers and finally bursts
var balls: Array = []      # {p (screen), v, t, secs, next}
## a charged ground: static crawling over a patch of earth, short arcs leaping between points, blue-white flickers
var fields: Array = []     # {c (screen), R, t, secs}
## a spark nova: a ring of short arcs bursting outward, each forking as it goes
var snovas: Array = []     # {c, t, secs, rays}

func ball_lightning(p: Vector2, secs: float = 5.0) -> void:
	_ensure_sky()
	balls.append({"p": Iso.to_screen(p) + Vector2(0, -60), "v": Vector2(randf_range(-30, 30), 0), "t": 0.0, "secs": secs, "next": 0.2, "lash": []})

func charged_ground(p: Vector2, r: float = 1.8, secs: float = 6.0) -> void:
	_ensure_sky()
	fields.append({"c": Iso.to_screen(p), "R": r * Iso.HX, "t": 0.0, "secs": secs, "arcs": []})

func spark_nova(p: Vector2, r: float = 2.6) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p) + Vector2(0, -20)
	var rays: Array = []
	for i in 14:
		var a := i / 14.0 * TAU + randf_range(-0.15, 0.15)
		rays.append(_jag(c, c + Vector2(cos(a), sin(a) * 0.55) * r * Iso.HX * randf_range(0.8, 1.1), 12.0))
	snovas.append({"c": c, "t": 0.0, "secs": 0.45, "rays": rays})
	_flash(p, Color(0.7, 0.8, 1.0), 0.3, 90.0)

func _tick_zap(dt: float) -> void:
	for b in balls:
		b["t"] += dt
		b["v"] = b["v"].lerp(Vector2(sin(b["t"] * 1.3) * 40.0 + Gust.dir() * Gust.k() * 30.0, cos(b["t"] * 1.7) * 14.0), minf(1.0, dt * 2.0))
		b["p"] += b["v"] * dt
		b["next"] -= dt
		if b["next"] <= 0.0:
			b["next"] = randf_range(0.15, 0.6)
			var gnd: Vector2 = b["p"] + Vector2(randf_range(-50, 50), 60 + randf_range(-6, 10))
			b["lash"] = [_jag(b["p"], gnd, 9.0), 0.12]
			for k in 3:
				_phos.append({"q": gnd + Vector2(randf_range(-6, 6), randf_range(-3, 3)), "t": 0.0, "life": randf_range(0.2, 0.5), "v": Vector2(randf_range(-30, 30), -randf_range(20, 60)), "ph": randf() * TAU, "glint": true})
		if b["lash"].size() == 2:
			b["lash"][1] -= dt
		if b["t"] >= b["secs"]:
			b["done"] = true
			spark_nova(Iso.to_tile(b["p"] + Vector2(0, 60)), 1.6)
	balls = balls.filter(func(b): return not b.get("done", false))
	for f in fields:
		f["t"] += dt
		if randf() < dt * 40.0:
			var a := randf() * TAU
			var d: float = randf() * f["R"]
			var q: Vector2 = f["c"] + Vector2(cos(a) * d, sin(a) * d * 0.5)
			var a2 := a + randf_range(-1.5, 1.5)
			f["arcs"].append([_jag(q, q + Vector2(cos(a2), sin(a2) * 0.5) * randf_range(30, 80), 7.0), 0.12])
		for ar in f["arcs"]:
			ar[1] -= dt
		f["arcs"] = f["arcs"].filter(func(ar): return ar[1] > 0.0)
	fields = fields.filter(func(f): return f["t"] < f["secs"])
	for n in snovas:
		n["t"] += dt
	snovas = snovas.filter(func(n): return n["t"] < n["secs"])

func _draw_zap(cv: CanvasItem) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for f in fields:
		var fade: float = 1.0 - smoothstep(f["secs"] - 1.0, f["secs"], f["t"])
		var fc: Vector2 = (f["c"] / PX).floor()
		var Rg := int(f["R"] / PX)
		var hum := 0.75 + 0.25 * sin(now * 13.0)
		for yy in range(-Rg / 2, Rg / 2 + 1):
			for xx in range(-Rg, Rg + 1):
				var e := pow(float(xx) / Rg, 2) + pow(float(yy) / (Rg * 0.5), 2)
				if e <= 1.0 and posmod(xx + yy, 2) == 0:
					cv.draw_rect(Rect2((fc + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.45, 0.6, 1.0, 0.13 * (1.0 - e) * fade * hum))
		for k in 70:                                          # static: a sparse crawl of pale points over the patch
			var a := fmod(k * 2.39996 + now * (0.5 + k % 3), TAU)
			var d: float = f["R"] * sqrt(fmod(k * 0.618, 1.0))
			if sin(now * 30.0 + k * 3.1) > 0.2:
				var q: Vector2 = f["c"] + Vector2(cos(a) * d, sin(a) * d * 0.5)
				cv.draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(0.75, 0.86, 1.0, 0.85 * fade))
		for ar in f["arcs"]:
			_px_path(ar[0], Color(0.5, 0.65, 1.0, 0.45 * fade), 2, cv)
			_px_path(ar[0], Color(1, 1, 1, fade), 1, cv)
	for b in balls:
		var c: Vector2 = ((b["p"] + Vector2(randf_range(-2, 2), randf_range(-2, 2))) / PX).floor() * PX
		var fl := 0.7 + 0.3 * sin(now * 40.0 + b["t"])
		for ring in [[14, 0.06], [10, 0.12], [6, 0.28], [3, 0.75]]:
			var R: int = ring[0]
			for yy in range(-R, R + 1):
				for xx in range(-R, R + 1):
					if xx * xx + yy * yy <= R * R:
						cv.draw_rect(Rect2(c + Vector2(xx, yy) * PX, Vector2(PX, PX)), Color(0.6, 0.75, 1.0, ring[1] * fl))
		for k in 7:                                           # its surface crawls with arcs, some reaching out
			var a := now * (3.0 + k) + k * 1.7
			var e1 := c + Vector2(cos(a), sin(a)) * 4.0 * PX
			var e2 := c + Vector2(cos(a + 1.2), sin(a + 1.2)) * (7.0 + 5.0 * float(k % 3 == 0)) * PX
			_px_path(_jag(e1, e2, 5.0), Color(0.9, 0.95, 1.0, 0.9), 1, cv)
		cv.draw_rect(Rect2(c - Vector2(PX, PX), Vector2(PX * 3, PX * 3)), Color(1, 1, 1))
		if b["lash"].size() == 2 and b["lash"][1] > 0.0:
			_px_path(b["lash"][0], Color(0.5, 0.65, 1.0, 0.5), 3, cv)
			_px_path(b["lash"][0], Color(1, 1, 1, 1), 1, cv)
	for n in snovas:
		var u: float = n["t"] / n["secs"]
		for ray in n["rays"]:
			var m := int(ray.size() * minf(1.0, u * 2.5))
			var part: Array = ray.slice(int(ray.size() * maxf(0.0, u * 2.0 - 1.0)), max(2, m))
			if part.size() >= 2:
				_px_path(part, Color(0.5, 0.65, 1.0, 0.5 * (1.0 - u)), 3, cv)
				_px_path(part, Color(1, 1, 1, 1.0 - u * 0.6), 1, cv)

# ------------------------------------------------------------------ bone, more forms
## bone spears: ivory spikes burst out of the ground in a cluster (the ice spikes' prisms in bone), a ghost-light
## breathing round them and dust thrown up where they broke the earth; they crumble back after a while
func bone_spears(p: Vector2, r: float = 1.2, secs: float = 5.0) -> void:
	spikes(p, r * 1.6, secs, "bone")
	for k in 4:
		hit(p + Vector2(randf_range(-0.4, 0.4), randf_range(-0.3, 0.3)), Vector2.INF, false, "stone")
	ghost_light(p, r * 1.3, secs)
	Game.shake(2.0)

## the pale ghost-light round bone magic (Diablo II's): a soft cyan halo on the ghost layer, breathing, fading out
var glows: Array = []      # {c (screen), R, t, secs}

func ghost_light(p: Vector2, r: float, secs: float) -> void:
	_ensure_sky()
	glows.append({"c": Iso.to_screen(p) + Vector2(0, -30), "R": r * Iso.HX, "t": 0.0, "secs": secs})

## bone rain: shards of bone falling from the dark, each a pale streak with a cyan breath, driving into the ground and
## standing there a while, a puff of grit where it lands
var bshards: Array = []    # {q, v, land_y, t, stuck, life, ang}

func bone_rain(p: Vector2, r: float = 2.4, n: int = 22, secs: float = 2.0) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p)
	for i in n:
		var a := randf() * TAU
		var d := sqrt(randf()) * r * Iso.HX
		var ground := c + Vector2(cos(a) * d, sin(a) * d * 0.5)
		var drop := randf_range(380, 620)
		var tilt := randf_range(-0.25, 0.25)
		bshards.append({"q": ground + Vector2(tilt * drop, -drop), "v": Vector2(-tilt, 1.0).normalized() * randf_range(900, 1200),
			"ground": ground, "t": -randf() * secs, "stuck": false, "life": randf_range(2.5, 4.0), "ang": Vector2(-tilt, 1.0).normalized()})

## a rib cage: curved ribs rise out of the ground round a mark and close over it, then crumble
var cages: Array = []      # {c, R, t, secs}

func rib_cage(p: Vector2, r: float = 1.1, secs: float = 4.0) -> void:
	_ensure_sky()
	cages.append({"c": Iso.to_screen(p), "R": r * Iso.HX, "t": 0.0, "secs": secs})
	for k in 3:
		hit(p, Vector2.INF, false, "stone")

func _tick_bone(dt: float) -> void:
	for gl in glows:
		gl["t"] += dt
	glows = glows.filter(func(gl): return gl["t"] < gl["secs"])
	for b in bshards:
		b["t"] += dt
		if b["t"] < 0.0:
			continue
		if not b["stuck"]:
			b["q"] += b["v"] * dt
			if b["q"].y >= b["ground"].y:
				b["q"] = b["ground"]
				b["stuck"] = true
				b["t"] = 0.0
				for k in 2:
					hit(Iso.to_tile(b["ground"]), Vector2.INF, false, "bone")
		elif b["t"] > b["life"]:
			b["done"] = true
	bshards = bshards.filter(func(b): return not b.get("done", false))
	for cg in cages:
		cg["t"] += dt
	cages = cages.filter(func(cg): return cg["t"] < cg["secs"])

func _bone_px(cv: CanvasItem, q: Vector2, lit: bool, a: float = 1.0) -> void:
	cv.draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(0.9, 0.88, 0.82, a) if lit else Color(0.5, 0.49, 0.5, a))

func _draw_bone(cv: CanvasItem) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for gl in glows:
		var u: float = gl["t"] / gl["secs"]
		var fa := smoothstep(0.0, 0.15, u) * (1.0 - smoothstep(0.7, 1.0, u)) * (0.75 + 0.25 * sin(now * 4.0))
		var c0: Vector2 = (gl["c"] / PX).floor()
		var R := int(gl["R"] / PX)
		for yy in range(-R, R + 1):
			for xx in range(-R, R + 1):
				var e := pow(float(xx) / R, 2) + pow(float(yy) / (R * 0.7), 2)
				if e <= 1.0:
					cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.55, 0.85, 1.0, 0.14 * (1.0 - e) * fa))
	for b in bshards:
		if b["t"] < 0.0:
			continue
		var dirv: Vector2 = b["ang"]
		var L := 7 if b["stuck"] else 12
		var a: float = 1.0 if not b["stuck"] else 1.0 - smoothstep(b["life"] - 0.8, b["life"], b["t"])
		for k in L:
			var q: Vector2 = b["q"] - dirv * k * PX * (1.0 if b["stuck"] else 1.6)
			if b["stuck"] and k < 2:
				continue                                         # its point is in the ground
			_bone_px(cv, q, k % 3 != 2, a)
			if not b["stuck"]:
				cv.draw_rect(Rect2((q / PX).floor() * PX - Vector2(PX, 0), Vector2(PX * 3, PX)), Color(0.55, 0.85, 1.0, 0.12))
	for cg in cages:
		var u: float = cg["t"] / cg["secs"]
		var rise := 1.0 - pow(1.0 - minf(1.0, cg["t"] / 0.35), 3.0)
		var crumble := smoothstep(0.8, 1.0, u)
		var R: float = cg["R"]
		for i in 8:
			var ang := i / 8.0 * TAU
			var base: Vector2 = cg["c"] + Vector2(cos(ang) * R, sin(ang) * R * 0.5)
			var H := 90.0 * rise
			var steps := int(H / PX)
			for k in steps:
				var f := float(k) / maxf(1.0, steps)
				if randf() < crumble * 1.4 * (1.0 - f + 0.3):
					continue
				var inward: Vector2 = (cg["c"] - base) * (f * f * 0.85)          # the rib curves in over the mark
				var q: Vector2 = base + inward + Vector2(0, -f * H)
				_bone_px(cv, q, i % 2 == 0, 1.0)
				_bone_px(cv, q + Vector2(PX, 0), false, 0.9)
			var kn: Vector2 = base + Vector2(0, -2)
			cv.draw_rect(Rect2((kn / PX).floor() * PX - Vector2(PX, 0), Vector2(PX * 3, PX * 2)), Color(0.82, 0.8, 0.74))
		var c0: Vector2 = (cg["c"] / PX).floor()
		for k in 10:                                             # ghost-light inside the cage
			var q := c0 + Vector2(randi_range(-5, 5), randi_range(-14, 0))
			cv.draw_rect(Rect2(q * PX, Vector2(PX, PX)), Color(0.55, 0.85, 1.0, 0.25 * (1.0 - crumble)))

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
	_tick_bone(dt)
	_tick_zap(dt)
	_tick_ice(dt)
	_tick_wisps(dt)
	_tick_breaths(dt)
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
