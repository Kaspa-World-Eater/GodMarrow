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
		if kind == "flesh":
			spray(p, away, 0.6)

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
	_draw_absence(sky)
	_draw_radiance(sky)
	_draw_miasma2(sky)
	_draw_slash(sky)
	_draw_blood(sky)
	_draw_acid(sky)
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
					var sc: Color = m.get("col", Color(0.62, 0.72, 0.9))
					cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(sc.r, sc.g, sc.b, 0.16 * (1.0 - u) * (2.0 if m.has("col") else 1.0)))
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
		if s.get("acid", false):
			col = Color(0.62, 0.86, 0.2, 1.0 - u)
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

# ------------------------------------------------------------------ acid, more forms
## an acid glob: a swollen green drop arcing through the air, dripping as it flies; it bursts where it lands into a
## splatter of droplets (each a small sizzling pool) round a central pool
var globs: Array = []      # {a, b (screen), t, secs, h}
## acid dripping from above (a broken vessel, a corroded ceiling): drops in long fall, each leaving a hissing spot
var drips2: Array = []     # {x, y, ground, v, t}

func acid_glob(from_tile: Vector2, to_tile: Vector2) -> void:
	_ensure_sky()
	var a := Iso.to_screen(from_tile) + Vector2(0, -70)
	var b := Iso.to_screen(to_tile)
	globs.append({"a": a, "b": b, "tile": to_tile, "t": 0.0, "secs": maxf(0.35, a.distance_to(b) / 700.0), "h": 120.0})

func acid_drip(p: Vector2, r: float = 1.0, secs: float = 6.0) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p)
	for i in int(10 * r * secs / 3.0):
		var a := randf() * TAU
		var d := randf() * r * Iso.HX * 0.6
		var g := c + Vector2(cos(a) * d, sin(a) * d * 0.5)
		drips2.append({"q": g + Vector2(0, -randf_range(300, 500)), "ground": g, "v": 0.0, "t": -randf() * secs})

func _tick_acid(dt: float) -> void:
	for gb in globs:
		gb["t"] += dt
		var u: float = minf(1.0, gb["t"] / gb["secs"])
		gb["p"] = gb["a"].lerp(gb["b"], u) + Vector2(0, -4.0 * gb["h"] * u * (1.0 - u))
		if randf() < dt * 30.0:
			_phos.append({"q": gb["p"], "t": 0.0, "life": 0.35, "v": Vector2(randf_range(-10, 10), 60), "ph": 0.0, "glint": false, "acid": true})
		if u >= 1.0:
			gb["done"] = true
			acid(gb["tile"], 0.9, 7.0)
			for k in 7:
				var aa := randf() * TAU
				acid(gb["tile"] + Vector2(cos(aa), sin(aa)) * randf_range(0.6, 1.3), randf_range(0.2, 0.35), randf_range(4.0, 6.0))
			for k in 10:
				var aa := randf() * TAU
				chips.append({"p": gb["tile"], "z": 10.0, "v": Vector2(cos(aa), sin(aa)) * randf_range(1.0, 3.0), "vz": randf_range(60, 140),
					"col": [Color("#b8e040"), Color("#6a9a18"), Color("#3a5a10")][randi() % 3], "t": 0.0, "life": 1.5, "rest": false, "bounced": false, "big": false})
	globs = globs.filter(func(gb): return not gb.get("done", false))
	for dr in drips2:
		dr["t"] += dt
		if dr["t"] < 0.0:
			continue
		if not dr.get("landed", false):
			dr["v"] += 1400.0 * dt
			dr["q"].y += dr["v"] * dt
			if dr["q"].y >= dr["ground"].y:
				dr["landed"] = true
				acid(Iso.to_tile(dr["ground"]), randf_range(0.15, 0.3), randf_range(3.0, 5.0))
	drips2 = drips2.filter(func(dr): return not dr.get("landed", false))

func _draw_acid(cv: CanvasItem) -> void:
	for gb in globs:
		if not gb.has("p"):
			continue
		var c: Vector2 = (gb["p"] / PX).floor() * PX
		for yy in range(-3, 4):
			for xx in range(-3, 4):
				var e := xx * xx + yy * yy
				if e <= 9:
					var col := Color(0.42, 0.66, 0.1) if e > 4 else Color(0.64, 0.86, 0.2)
					if xx <= -1 and yy <= -1 and e <= 4:
						col = Color(0.88, 1.0, 0.55)
					cv.draw_rect(Rect2(c + Vector2(xx, yy) * PX, Vector2(PX, PX)), col)
	for dr in drips2:
		if dr["t"] < 0.0:
			continue
		var q: Vector2 = (dr["q"] / PX).floor() * PX
		cv.draw_rect(Rect2(q, Vector2(PX, PX * 3)), Color(0.55, 0.8, 0.15, 0.9))
		cv.draw_rect(Rect2(q + Vector2(0, PX * 2), Vector2(PX, PX)), Color(0.85, 1.0, 0.5))

# ------------------------------------------------------------------ blood, more forms (the Hemomancer's)
## an arterial spray: a wound pumps a jet of droplets in pulses (three beats, each weaker), arcing and spattering
var sprays: Array = []     # {p (tile), dir (tile), t, secs}
## a blood whip: a thick red lash cracking out along a curve from the caster, flinging droplets at its tip
var whips: Array = []      # {a, b (screen), t, secs, side}
## boiling blood: a pool that seethes, bubbles swelling and bursting, a red steam rising off it
var boils: Array = []      # {p, node, t, secs}

func spray(p: Vector2, dir: Vector2, secs: float = 0.9) -> void:
	sprays.append({"p": p, "dir": dir.normalized(), "t": 0.0, "secs": secs})

func blood_whip(from_tile: Vector2, to_tile: Vector2) -> void:
	_ensure_sky()
	whips.append({"a": Iso.to_screen(from_tile) + Vector2(0, -70), "b": Iso.to_screen(to_tile) + Vector2(0, -40), "tile": to_tile,
		"t": 0.0, "secs": 0.35, "side": 1.0 if randf() < 0.5 else -1.0, "hit": false, "from": from_tile})

func boil(p: Vector2, r: float = 1.4, secs: float = 8.0) -> void:
	_ensure_sky()
	var sp = load("res://world/splats.gd").at(zone)
	if sp:
		sp._pool(p, r, false)
	boils.append({"p": p, "c": Iso.to_screen(p), "R": r * Iso.HX, "t": 0.0, "secs": secs, "bub": []})

func _tick_blood(dt: float) -> void:
	for sr in sprays:
		sr["t"] += dt
		var u: float = sr["t"] / sr["secs"]
		var beat := pow(maxf(0.0, sin(u * 3.0 * PI)), 2.0) * (1.0 - u * 0.7)      # three pulses, weakening
		for k in int(beat * 4.0):
			var d: Vector2 = (sr["dir"] as Vector2).rotated(randf_range(-0.25, 0.25))
			chips.append({"p": sr["p"], "z": 55.0, "v": d * randf_range(1.5, 3.2) * (0.6 + beat), "vz": randf_range(40, 110),
				"col": [Color("#a01818"), Color("#6a0c0c")][randi() % 2], "t": 0.0, "life": randf_range(3.0, 6.0),
				"rest": false, "bounced": false, "big": false, "stain": true})
	sprays = sprays.filter(func(sr): return sr["t"] < sr["secs"])
	for wh in whips:
		wh["t"] += dt
		if not wh["hit"] and wh["t"] > wh["secs"] * 0.55:
			wh["hit"] = true
			spray(wh["tile"], wh["tile"] - wh["from"], 0.5)
			hit(wh["tile"], wh["from"], true, "flesh")
	whips = whips.filter(func(wh): return wh["t"] < wh["secs"])
	for bo in boils:
		bo["t"] += dt
		if randf() < dt * 9.0:
			var a := randf() * TAU
			var d: float = sqrt(randf()) * bo["R"] * 0.8
			bo["bub"].append({"q": bo["c"] + Vector2(cos(a) * d, sin(a) * d * 0.5), "t": 0.0, "life": randf_range(0.4, 0.9), "r": randf_range(2, 4)})
		for bb in bo["bub"]:
			bb["t"] += dt
			if bb["t"] >= bb["life"] and not bb.get("popped", false):
				bb["popped"] = true
				wsmoke.append({"q": bb["q"], "v": Vector2(randf_range(-6, 6), -randf_range(20, 40)), "t": 0.0, "life": randf_range(0.8, 1.5), "r": 2.0, "ph": randf() * TAU, "col": Color(0.7, 0.2, 0.2)})
		bo["bub"] = bo["bub"].filter(func(bb): return bb["t"] < bb["life"] + 0.15)
	boils = boils.filter(func(bo): return bo["t"] < bo["secs"])

func _draw_blood(cv: CanvasItem) -> void:
	for wh in whips:
		var u: float = wh["t"] / wh["secs"]
		var reach := minf(1.0, u * 2.2)                       # it cracks out fast, then the lash falls back
		var slack := maxf(0.0, u - 0.55) / 0.45
		var a: Vector2 = wh["a"]
		var b: Vector2 = wh["b"]
		var side: Vector2 = Vector2(-(b - a).y, (b - a).x).normalized() * wh["side"]
		var n := 28
		for k in int(n * reach):
			var f := float(k) / n
			var q := a.lerp(b, f) + side * sin(f * PI) * 50.0 * (1.0 - slack) + Vector2(0, f * f * 60.0 * slack)
			var w := 3 if f < 0.5 else (2 if f < 0.85 else 1)
			for j in range(-w + 1, w):
				var col := Color(0.62, 0.06, 0.08) if j == 0 else Color(0.36, 0.02, 0.04)
				if j == 0 and k % 4 == 0:
					col = Color(0.9, 0.3, 0.28)                 # wet glints along it
				cv.draw_rect(Rect2(((q + side * j * PX) / PX).floor() * PX, Vector2(PX, PX)), col)
	for bo in boils:
		for bb in bo["bub"]:
			var bu: float = bb["t"] / bb["life"]
			var c: Vector2 = (bb["q"] / PX).floor() * PX
			var r := int(bb["r"] * minf(1.0, bu * 1.2))
			if bb.get("popped", false):
				for k in 8:
					var ang := k / 8.0 * TAU
					cv.draw_rect(Rect2(c + (Vector2(cos(ang), sin(ang) * 0.6) * (r + 2) * PX / PX).floor() * PX, Vector2(PX, PX)), Color(0.85, 0.25, 0.22, 0.8))
				continue
			for yy in range(-r, r + 1):
				for xx in range(-r, r + 1):
					if xx * xx + yy * yy <= r * r:
						var col := Color(0.55, 0.05, 0.08)
						if xx <= -r / 2 and yy <= -r / 2:
							col = Color(0.95, 0.45, 0.4)               # the bubble's lit skin
						cv.draw_rect(Rect2(c + Vector2(xx, yy) * PX, Vector2(PX, PX)), col)

# ------------------------------------------------------------------ melee: slashes and echoes
## a slash: the blade's smear, a crescent swept round the striker on the ground's plane (so it lies in the world, an
## ellipse, not a sticker on the screen). The head is white-hot steel, the body pale steel thinning to a cold blue at
## the inner edge, the tail dithering away; two echoes (afterimages of the blade) trail it, bluer and fainter. The
## crescent is thickest just behind the head, needle-thin at the tail. kind 0 sweeps one way, 1 the other, 2 is the
## overhead: an upright arc in the blow's own plane, from over the shoulder down into the ground ahead, where it
## strikes dust and a ring of force. Heavy blows are wider, longer, and leave three echoes.
var slashes: Array = []    # {c, at, dir, R, a0, a1, t, kind, heavy}
## a cut: where the blade met flesh, a bright line laid across the body against the stroke, and speed-lines bursting
var cuts: Array = []       # {c, d, t, heavy}
var rings: Array = []      # {c, R, t, secs}
const B4 := [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const SWIPE := 0.1         # how long the blade takes to cross the arc

func slash(at: Vector2, dir: Vector2, kind: int = 0, heavy: bool = false, reach: float = 1.5) -> void:
	_ensure_sky()
	var base := dir.angle()
	var span := (3.4 if heavy else 2.8)
	var sgn := 1.0 if kind != 1 else -1.0
	slashes.append({"at": at, "dir": dir.normalized(), "c": Iso.to_screen(at) + Vector2(0, -78), "R": reach * (1.15 if heavy else 0.95),
		"a0": base - span * 0.5 * sgn, "a1": base + span * 0.5 * sgn, "t": 0.0, "kind": kind, "heavy": heavy, "struck": false})

func cut(p: Vector2, dir: Vector2, heavy: bool = false) -> void:
	_ensure_sky()
	cuts.append({"c": Iso.to_screen(p) + Vector2(0, -40), "d": (Iso.to_screen(p + dir) - Iso.to_screen(p)).normalized(), "t": 0.0, "heavy": heavy})

## the point on a slash's arc at angle-param f (0 tail .. 1 head side), at radius scale k, in screen space
func _slash_pt(sl: Dictionary, a: float, k: float) -> Vector2:
	if sl["kind"] == 2:
		# the overhead: phi runs from over the shoulder (behind, high) to down into the ground ahead
		var phi := lerpf(1.9, -0.35, a)
		var R: float = sl["R"] * k
		var h := Iso.to_screen(sl["dir"] * R * cos(phi)) - Iso.to_screen(Vector2.ZERO)
		return sl["c"] + h + Vector2(0, -sin(phi) * R * Iso.HX * 0.75 + 44.0 * (1.0 - clampf(sin(phi) + 0.6, 0.0, 1.0)) * 0.0)
	var ang := lerpf(sl["a0"], sl["a1"], a)
	return sl["c"] + Iso.to_screen(Vector2(cos(ang), sin(ang)) * sl["R"] * k) - Iso.to_screen(Vector2.ZERO)

func _tick_slash(dt: float) -> void:
	for sl in slashes:
		sl["t"] += dt
		var head := minf(1.0, sl["t"] / SWIPE)
		if sl["t"] < SWIPE and randf() < dt * 60.0:          # glints thrown off the edge as it goes
			var q := _slash_pt(sl, head, 1.0)
			_phos.append({"q": q, "t": 0.0, "life": randf_range(0.15, 0.35), "v": (q - sl["c"]).normalized() * randf_range(40, 90), "ph": 0.0, "glint": randf() < 0.4})
		if sl["kind"] == 2 and not sl["struck"] and sl["t"] >= SWIPE:
			sl["struck"] = true                              # the overhead buries itself in the ground: dust, a ring
			var gp: Vector2 = sl["at"] + sl["dir"] * sl["R"] * 0.9
			rings.append({"c": Iso.to_screen(gp), "R": (1.6 if sl["heavy"] else 1.1) * Iso.HX, "t": 0.0, "secs": 0.32})
			for k in (6 if sl["heavy"] else 3):
				hit(gp + Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3)), Vector2.INF, false, "stone")
			Game.shake(3.0 if sl["heavy"] else 1.6)
	slashes = slashes.filter(func(sl): return sl["t"] < 0.42)
	for ct in cuts:
		ct["t"] += dt
	cuts = cuts.filter(func(ct): return ct["t"] < 0.2)
	for rg in rings:
		rg["t"] += dt
	rings = rings.filter(func(rg): return rg["t"] < rg["secs"])

## one crescent of the smear, its head at hd and tail at tl (0..1 along the arc), alpha scale al, cold (0..1) shifts
## it toward the echo's blue
func _crescent(cv: CanvasItem, sl: Dictionary, tl: float, hd: float, al: float, cold: float) -> void:
	if hd - tl < 0.01:
		return
	var L: float = (_slash_pt(sl, hd, 1.0) - _slash_pt(sl, tl, 1.0)).length()
	var n := maxi(3, int(L / PX * 1.3))
	var W := (6.0 if sl["heavy"] else 4.0)
	var seen := {}
	for i in n + 1:
		var f := i / float(n)                             # 0 at the tail, 1 at the head
		var a := lerpf(tl, hd, f)
		var w := W * sin(PI * pow(f, 0.55)) + 0.6          # thickest just behind the head
		var o := _slash_pt(sl, a, 1.0)
		var inn := _slash_pt(sl, a, 0.74)
		var band := maxf(1.0, o.distance_to(inn) / PX)      # the band's depth in cells, filled from the edge in
		var steps := int(ceil(band * w / W))
		for k in steps:
			var q := o.lerp(inn, k / band)
			var cellp := (q / PX).floor()
			var key := Vector2i(cellp)
			if seen.has(key):
				continue
			seen[key] = true
			var kk := k / maxf(1.0, float(steps))           # 0 at the cutting edge, 1 at the inner edge
			var col: Color
			if k == 0 and f > 0.55:
				col = Color(1, 1, 1)                          # the white-hot edge near the head
			elif kk < 0.45:
				col = Color(0.86, 0.9, 0.95)
			else:
				col = Color(0.5, 0.62, 0.85)
			col = col.lerp(Color(0.45, 0.6, 1.0), cold)
			var aa := al * minf(1.0, f * 2.6) * (1.0 - kk * kk * 0.6)
			# dither the fade on the grid: a cell is drawn whole or not at all (the title's method)
			var th: float = (B4[(posmod(int(cellp.y), 4)) * 4 + posmod(int(cellp.x), 4)] + 0.5) / 16.0
			if aa > th * 0.9:
				cv.draw_rect(Rect2(cellp * PX, Vector2(PX, PX)), Color(col.r, col.g, col.b, minf(1.0, 0.55 + aa * 0.45)))

func _draw_slash(cv: CanvasItem) -> void:
	for sl in slashes:
		var t: float = sl["t"]
		var echoes := [[0.0, 1.0, 0.0], [0.03, 0.5, 0.6], [0.06, 0.26, 1.0]]
		if sl["heavy"]:
			echoes.append([0.09, 0.14, 1.0])
		for e in range(echoes.size() - 1, -1, -1):
			var te: float = t - echoes[e][0]
			if te <= 0.0:
				continue
			var hd := 1.0 - pow(1.0 - minf(1.0, te / SWIPE), 2.0)   # it snaps across, easing out
			var len0 := 0.75 if sl["heavy"] else 0.6
			var shrink := clampf((te - SWIPE) / 0.22, 0.0, 1.0)     # once across, the tail catches up to the head
			var tl := maxf(0.0, hd - len0 * (1.0 - shrink))
			var al: float = echoes[e][1] * (1.0 - shrink * 0.6)
			if e == 0 and te >= SWIPE * 0.8 and te < SWIPE * 0.8 + 0.035:
				al = 2.0                                          # the impact frame: drawn whole, no dither
			_crescent(cv, sl, tl, hd, al, echoes[e][2])
	for ct in cuts:
		var u: float = ct["t"] / 0.2
		var d: Vector2 = ct["d"]
		var nrm := Vector2(-d.y, d.x)
		var L := (70.0 if ct["heavy"] else 48.0) * (0.5 + 0.5 * minf(1.0, u * 5.0))
		var lines := [nrm.rotated(0.5)] if not ct["heavy"] else [nrm.rotated(0.6), nrm.rotated(-0.6)]
		if u < 0.3:                                        # the impact star: a white diamond and four long rays
			var sr := int((5.0 if ct["heavy"] else 3.0) * (1.0 - u / 0.3) + 1.0)
			var c0: Vector2 = (ct["c"] / PX).floor()
			for yy in range(-sr, sr + 1):
				for xx in range(-sr, sr + 1):
					var dd := absi(xx) + absi(yy)
					if dd <= sr and (dd <= sr / 2 or xx == 0 or yy == 0):
						cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(1, 1, 1) if dd <= sr / 2 else Color(0.75, 0.85, 1.0, 0.9))
			for k in range(sr, sr * 3):
				for o in [Vector2(k, 0), Vector2(-k, 0), Vector2(0, k * 0.6), Vector2(0, -k * 0.6)]:
					cv.draw_rect(Rect2((c0 + o.floor()) * PX, Vector2(PX, PX)), Color(0.85, 0.92, 1.0, 0.7 * (1.0 - float(k) / (sr * 3))))
		for ln in lines:
			var n := int(L / PX)
			var side := Vector2(-ln.y, ln.x)
			for k in range(-n, n + 1):
				var q: Vector2 = ct["c"] + ln * k * PX
				var edge := absf(k) / float(n)
				if u > 0.4 and edge > 1.0 - (u - 0.4) / 0.6:
					continue
				var thick := 1 if edge > 0.55 else 2           # a rent through the air, tapered at both ends
				for j in thick:
					cv.draw_rect(Rect2(((q + side * j * PX) / PX).floor() * PX, Vector2(PX, PX)), Color(1, 1, 1, 1.0 - u * 0.5) if (edge < 0.6 and j == 0) else Color(0.62, 0.74, 1.0, 0.85 - u * 0.6))
		for k in (8 if ct["heavy"] else 5):               # speed-lines bursting from the cut along the stroke
			var ang := d.angle() + (k - 2.0) * 0.32
			var r0 := 10.0 + u * 70.0
			for j in 3:
				var q: Vector2 = ct["c"] + Vector2(cos(ang), sin(ang) * 0.7) * (r0 + j * PX)
				cv.draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(0.9, 0.95, 1.0, (1.0 - u) * 0.8))
	for rg in rings:
		var u: float = rg["t"] / rg["secs"]
		var R: float = rg["R"] * (0.3 + 0.7 * (1.0 - pow(1.0 - u, 3.0)))
		var n := int(R * 0.5)
		for k in n:
			var ang := k / float(n) * TAU
			var q: Vector2 = rg["c"] + Vector2(cos(ang) * R, sin(ang) * R * 0.5)
			var cellp := (q / PX).floor()
			var th: float = (B4[(posmod(int(cellp.y), 4)) * 4 + posmod(int(cellp.x), 4)] + 0.5) / 16.0
			if 1.0 - u > th:
				cv.draw_rect(Rect2(cellp * PX, Vector2(PX, PX)), Color(0.85, 0.82, 0.74, 0.9))

# ------------------------------------------------------------------ miasma, more forms
## a gyre: the breath gathering into a slow turning wheel of violet haze, wisps spiralling in toward a heart that
## glows faintly and pulses; dithered puffs, ghostly, no line anywhere
var gyres: Array = []      # {c (screen), R, t, secs, puffs}
## a bladder: a swollen violet sac on the ground, its skin veined, swelling with slow breaths until it bursts with a
## sigh, a ring of breath thrown out and a low patch of miasma left where it was
var bladders: Array = []   # {p (tile), c (screen), t, swell, burst}
## a vent: a crack in the ground exhaling thin violet threads in slow sighs, rising and curling and thinning away
var vents: Array = []      # {c, t, secs, threads}
const MIASMA_COL := Color(0.66, 0.54, 0.98)

func gyre(p: Vector2, r: float = 1.8, secs: float = 8.0) -> void:
	_ensure_sky()
	gyres.append({"c": Iso.to_screen(p) + Vector2(0, -24), "R": r * Iso.HX, "t": 0.0, "secs": secs, "puffs": []})

func bladder(p: Vector2, swell: float = 2.2) -> void:
	_ensure_sky()
	bladders.append({"p": p, "c": Iso.to_screen(p), "t": 0.0, "swell": swell, "burst": false, "seed": randf() * 10.0})

func vent(p: Vector2, secs: float = 10.0) -> void:
	_ensure_sky()
	vents.append({"c": Iso.to_screen(p), "t": 0.0, "secs": secs, "threads": [], "next": 0.0})

func _tick_miasma2(dt: float) -> void:
	for g in gyres:
		g["t"] += dt
		var fade: float = 1.0 - smoothstep(g["secs"] - 1.5, g["secs"], g["t"])
		if fade > 0.2 and randf() < dt * 30.0:
			g["puffs"].append({"a": float(randi() % 3) / 3.0 * TAU + g["t"] * 1.1 + randf_range(-0.25, 0.25), "r": g["R"] * randf_range(0.85, 1.05),
				"h": randf_range(-4, 4), "t": 0.0, "life": randf_range(1.8, 2.8), "s": randf_range(2.5, 4.5)})
		for pf in g["puffs"]:
			pf["t"] += dt
			pf["a"] += dt * (0.9 + 40.0 / maxf(8.0, pf["r"]))     # faster as it nears the heart
			pf["r"] = maxf(0.0, pf["r"] - dt * g["R"] * 0.35)
			pf["h"] -= dt * 6.0
		g["puffs"] = g["puffs"].filter(func(pf): return pf["t"] < pf["life"] and pf["r"] > 3.0)
	gyres = gyres.filter(func(g): return g["t"] < g["secs"])
	for bl in bladders:
		bl["t"] += dt
		if not bl["burst"] and bl["t"] >= bl["swell"]:
			bl["burst"] = true
			bl["bt"] = 0.0
			miasma(bl["p"], 1.3, 6.0, "breath")
			for k in 18:                                       # the sigh: a ring of breath thrown out low
				var a := k / 18.0 * TAU
				wsmoke.append({"q": bl["c"] + Vector2(cos(a) * 8.0, sin(a) * 4.0 - 6.0), "v": Vector2(cos(a) * 70.0, sin(a) * 35.0 - 8.0),
					"t": 0.0, "life": randf_range(1.0, 1.6), "r": randf_range(2.0, 3.2), "ph": randf() * TAU, "col": MIASMA_COL})
			for k in 8:                                        # shreds of the sac's skin
				var a2 := randf() * TAU
				chips.append({"p": bl["p"], "z": 8.0, "v": Vector2(cos(a2), sin(a2)) * randf_range(0.8, 2.0), "vz": randf_range(40, 110),
					"col": [Color("#5a3f6e"), Color("#3a2848"), Color("#8a6aa0")][randi() % 3], "t": 0.0, "life": 3.0, "rest": false, "bounced": false, "big": false})
		if bl["burst"]:
			bl["bt"] += dt
	bladders = bladders.filter(func(bl): return not bl["burst"] or bl["bt"] < 0.6)
	for v in vents:
		v["t"] += dt
		v["next"] -= dt
		if v["t"] < v["secs"] - 1.0 and v["next"] <= 0.0:
			v["next"] = randf_range(0.12, 0.35)
			var a := randf_range(-2.0, -1.1)
			v["threads"].append({"p": v["c"] + Vector2(randf_range(-14, 14), randf_range(-3, 3)), "v": Vector2(cos(a), sin(a)) * randf_range(20, 36),
				"t": 0.0, "life": randf_range(1.8, 2.8), "trail": [], "ph": randf() * TAU})
		for th in v["threads"]:
			th["t"] += dt
			th["v"] += Vector2(sin(th["t"] * 2.6 + th["ph"]) * 26.0 + Gust.dir() * Gust.k() * 20.0, -8.0) * dt
			th["p"] += th["v"] * dt
			th["trail"].push_front(th["p"])
			if th["trail"].size() > 26:
				th["trail"].pop_back()
		v["threads"] = v["threads"].filter(func(th): return th["t"] < th["life"])
	vents = vents.filter(func(v): return v["t"] < v["secs"] or v["threads"].size() > 0)

## a soft dithered puff of the breath: solid cells kept or dropped on the Bayer grid, so it reads as haze in pixels
func _haze(cv: CanvasItem, c: Vector2, r: float, col: Color, a: float) -> void:
	var c0 := (c / PX).floor()
	var R := int(ceil(r))
	for yy in range(-R, R + 1):
		for xx in range(-R, R + 1):
			var e := (xx * xx + yy * yy) / maxf(1.0, r * r)
			if e > 1.0:
				continue
			var q := c0 + Vector2(xx, yy)
			var th: float = (B4[posmod(int(q.y), 4) * 4 + posmod(int(q.x), 4)] + 0.5) / 16.0
			if a * (1.0 - e) > th:
				cv.draw_rect(Rect2(q * PX, Vector2(PX, PX)), Color(col.r, col.g, col.b, 0.3))
			elif a * (1.0 - e) > th * 0.4:
				cv.draw_rect(Rect2(q * PX, Vector2(PX, PX)), Color(col.r, col.g, col.b, 0.1))   # the haze's thin undercoat

func _draw_miasma2(cv: CanvasItem) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	for g in gyres:
		var fade: float = smoothstep(0.0, 1.0, g["t"]) * (1.0 - smoothstep(g["secs"] - 1.5, g["secs"], g["t"]))
		for pf in g["puffs"]:
			var u: float = pf["t"] / pf["life"]
			var q: Vector2 = g["c"] + Vector2(cos(pf["a"]) * pf["r"], sin(pf["a"]) * pf["r"] * 0.5 + pf["h"])
			_haze(cv, q, pf["s"] * (0.6 + 0.4 * (pf["r"] / g["R"])), MIASMA_COL, fade * sin(PI * u) * 0.9)
		var pulse := 0.5 + 0.5 * sin(now * 2.2)                 # the heart: the faintest glow, breathing
		_haze(cv, g["c"], 4.0 + pulse * 1.5, Color(0.8, 0.7, 1.0), fade * (0.35 + 0.25 * pulse))
	for bl in bladders:
		var c: Vector2 = (bl["c"] / PX).floor()
		if bl["burst"]:
			var u: float = bl["bt"] / 0.6                      # the torn sac, collapsing
			for xx in range(-3, 4):
				if randf() > u:
					cv.draw_rect(Rect2((c + Vector2(xx, 0)) * PX, Vector2(PX, PX)), Color(0.24, 0.16, 0.3, 1.0 - u))
			continue
		var k: float = bl["t"] / bl["swell"]
		var breath := 0.5 + 0.5 * sin(bl["t"] * (3.0 + k * 9.0))   # its breaths quicken as it nears bursting
		var rx := 4.0 + k * 4.0 + breath * 0.9
		var ry := 3.0 + k * 4.0 + breath * 1.0
		for yy in range(-int(ry * 2), 1):
			for xx in range(-int(rx) - 1, int(rx) + 2):
				var ex := xx / rx
				var ey := (yy + ry) / ry
				var e := ex * ex + ey * ey
				if e > 1.0:
					continue
				var col := Color(0.42, 0.3, 0.52)
				if ex < -0.2 and ey < -0.2 and e < 0.55:
					col = Color(0.72, 0.6, 0.86)                      # the lit, stretched skin
				elif e > 0.75:
					col = Color(0.2, 0.12, 0.26)                      # its dark rim
				var vv := absf(sin(xx * 1.7 + bl["seed"]) * 2.0 + yy * 0.6)
				if vv < 0.3 and e < 0.8:
					col = col.lerp(Color(0.85, 0.55, 0.95), 0.4 + 0.6 * breath * k)   # veins, glowing as it strains
				cv.draw_rect(Rect2((c + Vector2(xx, yy)) * PX, Vector2(PX, PX)), col)
		if k > 0.6 and randf() < 0.3:                      # it leaks a little before it goes
			wsmoke.append({"q": bl["c"] + Vector2(randf_range(-8, 8), -ry * PX), "v": Vector2(randf_range(-5, 5), -randf_range(12, 22)),
				"t": 0.0, "life": 1.0, "r": 1.6, "ph": randf() * TAU, "col": MIASMA_COL})
	for v in vents:
		var c1: Vector2 = (v["c"] / PX).floor()
		for xx in range(-4, 5):                              # the crack itself, a faint violet light down in it
			var yy := int(round(sin(xx * 1.3) * 0.8))
			cv.draw_rect(Rect2((c1 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.12, 0.08, 0.14))
			if absi(xx) < 3:
				cv.draw_rect(Rect2((c1 + Vector2(xx, yy - 1)) * PX, Vector2(PX, PX)), Color(0.7, 0.55, 1.0, 0.25 + 0.15 * sin(now * 2.0 + xx)))
		for th in v["threads"]:
			var u: float = th["t"] / th["life"]
			var tr: Array = th["trail"]
			for i in tr.size():
				var w := float(i) / tr.size()
				var al := (1.0 - w) * sin(PI * minf(1.0, u * 1.2)) * 0.85
				if i % 2 == 0 or w < 0.3:
					cv.draw_rect(Rect2((tr[i] / PX).floor() * PX, Vector2(PX, PX)), Color(MIASMA_COL.r, MIASMA_COL.g, MIASMA_COL.b, al))
				if w < 0.35:
					cv.draw_rect(Rect2((tr[i] / PX).floor() * PX + Vector2(PX, 0), Vector2(PX, PX)), Color(MIASMA_COL.r, MIASMA_COL.g, MIASMA_COL.b, al * 0.35))

# ------------------------------------------------------------------ radiance (the open hand: erasing light)
## the wiki (05-class-empty-hand.md): "noon with no shadow: white fire, glare, a brightness so complete it leaves
## nothing to see"; the Peak's gold leaf "gives back so much light that the face beneath it disappears".
## glare: a patch of the world washed out (shaders/radiance_glare.gdshader, on the ghost layer so it erases even the
## night); lance: a shaft of white noon driven from a to b, gold at its skin, gold leaf shaken off it; halo: a ring of
## gold-leaf flakes turning round a point, each flake thinning to a line as it turns edge-on; leaf: gold leaf falling,
## see-sawing, flashing as it catches the light
var glares: Array = []     # {node, light, t, secs}
var lances: Array = []     # {a, b (screen), t, secs}
var halos: Array = []      # {c, R, t, secs, n}
var leaves: Array = []     # {q, v, t, life, ph}

func glare(p: Vector2, r: float = 1.6, secs: float = 3.0) -> void:
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(r * Iso.HX * 2.4, r * Iso.HX * 1.2 + 60.0) / PX).ceil() * PX
	var q := Iso.to_screen(p)
	n.position = ((q - n.size * 0.5 - Vector2(0, 20)) / PX).floor() * PX
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/radiance_glare.gdshader")
	m.set_shader_parameter("seed", randf() * 40.0)
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("life", 0.0)
	n.material = m
	_ghost_layer().add_child(n)
	var pl := PointLight2D.new()
	pl.color = Color(1.0, 0.92, 0.7)
	pl.set_meta("dark_r", r * Iso.HX * 1.1)
	pl.set_meta("dark_far", 1.6)
	pl.set_meta("dark_core", 0.6)
	pl.position = q
	pl.enabled = false
	add_child(pl)
	glares.append({"node": n, "light": pl, "t": 0.0, "secs": secs, "p": p, "r": r})

func lance(from_tile: Vector2, to_tile: Vector2, secs: float = 0.55) -> void:
	_ensure_sky()
	lances.append({"a": Iso.to_screen(from_tile) + Vector2(0, -60), "b": Iso.to_screen(to_tile) + Vector2(0, -40), "t": 0.0, "secs": secs})
	glare(to_tile, 0.8, 1.2)

func halo(p: Vector2, r: float = 0.9, secs: float = 4.0) -> void:
	_ensure_sky()
	halos.append({"c": Iso.to_screen(p) + Vector2(0, -96), "R": r * Iso.HX, "t": 0.0, "secs": secs, "n": 16})

func gold_leaf(p: Vector2, r: float = 1.2, n: int = 10) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p)
	for i in n:
		leaves.append({"q": c + Vector2(randf_range(-r, r) * Iso.HX, randf_range(-160, -60)), "v": Vector2(0, randf_range(14, 24)),
			"t": 0.0, "life": randf_range(2.5, 4.0), "ph": randf() * TAU, "ground": c.y + randf_range(-r, r) * Iso.HY})

func _tick_radiance(dt: float) -> void:
	for gl in glares:
		gl["t"] += dt
		var u: float = gl["t"] / gl["secs"]
		var lf: float = (1.0 - pow(1.0 - minf(1.0, u / 0.08), 3.0)) * (1.0 - smoothstep(0.65, 1.0, u))   # it flares, then fades slow
		var mt: ShaderMaterial = gl["node"].material
		mt.set_shader_parameter("t", gl["t"])
		mt.set_shader_parameter("life", lf)
		gl["light"].visible = lf > 0.05
		if randf() < dt * 6.0 * lf:
			gold_leaf(gl["p"], gl["r"] * 0.7, 1)
		if u >= 1.0:
			gl["node"].queue_free()
			gl["light"].queue_free()
	glares = glares.filter(func(gl): return gl["t"] < gl["secs"])
	for ln in lances:
		ln["t"] += dt
		if ln["t"] < 0.2 and randf() < dt * 40.0:
			var f := randf()
			var q: Vector2 = (ln["a"] as Vector2).lerp(ln["b"], f)
			leaves.append({"q": q, "v": Vector2(randf_range(-30, 30), randf_range(-40, 10)), "t": 0.0, "life": randf_range(1.2, 2.2), "ph": randf() * TAU, "ground": q.y + 60.0})
	lances = lances.filter(func(ln): return ln["t"] < ln["secs"])
	for h in halos:
		h["t"] += dt
	halos = halos.filter(func(h): return h["t"] < h["secs"])
	for lf2 in leaves:
		lf2["t"] += dt
		lf2["v"].y = minf(lf2["v"].y + 10.0 * dt, 30.0)
		lf2["q"] += Vector2(sin(lf2["t"] * 2.6 + lf2["ph"]) * 24.0 + Gust.dir() * Gust.k() * 14.0, lf2["v"].y) * dt   # see-sawing down
		if lf2["q"].y >= lf2["ground"]:
			lf2["q"].y = lf2["ground"]
			lf2["v"].y = 0.0
	leaves = leaves.filter(func(lf2): return lf2["t"] < lf2["life"])

func _draw_radiance(cv: CanvasItem) -> void:
	for ln in lances:
		var u: float = ln["t"] / ln["secs"]
		var reach := minf(1.0, u / 0.12)                       # driven out in a blink, then it thins and goes
		var a: Vector2 = ln["a"]
		var b: Vector2 = a.lerp(ln["b"], reach)
		var w := 3.0 * (1.0 - smoothstep(0.3, 1.0, u)) + 0.8 * sin(ln["t"] * 60.0) * (1.0 - u)
		var dirv := (b - a).normalized()
		var side := Vector2(-dirv.y, dirv.x)
		var n := int(a.distance_to(b) / PX)
		for k in n + 1:
			var q := a + dirv * k * PX
			var ww := int(ceil(w))
			for j in range(-ww - 1, ww + 2):
				var aj := absi(j)
				var col: Color
				if aj <= ww / 2:
					col = Color(1, 1, 0.96)
				elif aj <= ww:
					col = Color(1.0, 0.86, 0.5)
				else:
					col = Color(0.9, 0.6, 0.25, 0.6)
				col.a *= 1.0 - smoothstep(0.5, 1.0, u)
				cv.draw_rect(Rect2(((q + side * j * PX) / PX).floor() * PX, Vector2(PX, PX)), col)
	for h in halos:
		var fa: float = smoothstep(0.0, 0.4, h["t"]) * (1.0 - smoothstep(h["secs"] - 0.8, h["secs"], h["t"]))
		for i in h["n"]:
			var ang: float = h["t"] * 1.4 + i / float(h["n"]) * TAU
			var q: Vector2 = h["c"] + Vector2(cos(ang) * h["R"], sin(ang) * h["R"] * 0.35)
			var turn := absf(sin(h["t"] * 5.0 + i * 1.3))             # a flake turning: broad, then edge-on
			var c0 := (q / PX).floor() * PX
			var front := sin(ang) > 0.0
			var col := Color(1.0, 0.86, 0.5, fa) if turn > 0.5 else Color(0.75, 0.5, 0.2, fa)
			if turn > 0.92:
				col = Color(1, 1, 0.95, fa)                                # it catches the light
			cv.draw_rect(Rect2(c0, Vector2(PX * (3.0 if turn > 0.5 else 1.0), PX * 2.0)), Color(col.r, col.g, col.b, col.a * (1.0 if front else 0.55)))
	for lf2 in leaves:
		var u: float = lf2["t"] / lf2["life"]
		var turn := absf(sin(lf2["t"] * 6.0 + lf2["ph"]))
		var c0: Vector2 = (lf2["q"] / PX).floor() * PX
		var al := 1.0 - smoothstep(0.7, 1.0, u)
		var col := Color(1.0, 0.84, 0.45, al) if turn > 0.4 else Color(0.7, 0.48, 0.2, al)
		if turn > 0.94:
			col = Color(1, 1, 0.95, al)
		cv.draw_rect(Rect2(c0, Vector2(PX * (2.0 if turn > 0.4 else 1.0), PX)), col)

# ------------------------------------------------------------------ absence (the closed hand: erasing dark)
## the wiki: "Absence, the closed hand, erases with dark: the palm that swallows, the pinch, the gate that closes over
## the sun"; its sand is black and pours up, "falling the wrong way".
## hush: a hole in the world (shaders/absence_hush.gdshader) drawing the scene in and draining it to nothing; black
## sand: grains rising off the ground, quickening upward, each with a short trail; gate: two dark leaves closing over a
## spot until the dark is a line, then shut, sand thrown up; pinch: the air pinched to a point, dark streaks drawn in
var hushes: Array = []     # {node, t, secs, p, r}
var bsand: Array = []      # {q, v, t, life}
var gates: Array = []      # {c, H, W, t, secs}
var pinches: Array = []    # {c, t, secs, rays}

func hush(p: Vector2, r: float = 1.4, secs: float = 4.0) -> void:
	_ensure_sky()
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(r * Iso.HX * 2.0 * 1.6, r * Iso.HX * 1.6) / PX).ceil() * PX
	var q := Iso.to_screen(p)
	n.position = ((q - n.size * 0.5) / PX).floor() * PX
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/absence_hush.gdshader")
	m.set_shader_parameter("seed", randf() * 40.0)
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("life", 0.0)
	n.material = m
	_ghost_layer().add_child(n)
	hushes.append({"node": n, "t": 0.0, "secs": secs, "p": p, "r": r})

func black_sand(p: Vector2, r: float = 0.8, n: int = 12) -> void:
	_ensure_sky()
	var c := Iso.to_screen(p)
	for i in n:
		var a := randf() * TAU
		var d := sqrt(randf()) * r * Iso.HX
		bsand.append({"q": c + Vector2(cos(a) * d, sin(a) * d * 0.5), "v": Vector2(randf_range(-6, 6), -randf_range(10, 30)), "t": -randf() * 0.4,
			"life": randf_range(1.0, 1.8), "tr": []})

func gate(p: Vector2, secs: float = 0.7) -> void:
	_ensure_sky()
	gates.append({"c": Iso.to_screen(p) + Vector2(0, -60), "p": p, "H": 150.0, "W": 70.0, "t": 0.0, "secs": secs, "shut": false})

func pinch(p: Vector2) -> void:
	_ensure_sky()
	var rays: Array = []
	for i in 10:
		rays.append([randf() * TAU, randf_range(40, 70)])
	pinches.append({"c": Iso.to_screen(p) + Vector2(0, -50), "p": p, "t": 0.0, "secs": 0.45, "rays": rays, "done": false})

func _tick_absence(dt: float) -> void:
	for hs in hushes:
		hs["t"] += dt
		var u: float = hs["t"] / hs["secs"]
		var lf: float = smoothstep(0.0, 0.25, u) * (1.0 - smoothstep(0.75, 1.0, u))   # it opens slow, closes slow
		var mt: ShaderMaterial = hs["node"].material
		mt.set_shader_parameter("t", hs["t"])
		mt.set_shader_parameter("life", lf)
		if randf() < dt * 14.0 * lf:
			black_sand(hs["p"], hs["r"] * 0.8, 1)
		if u >= 1.0:
			hs["node"].queue_free()
	hushes = hushes.filter(func(hs): return hs["t"] < hs["secs"])
	for sd in bsand:
		sd["t"] += dt
		if sd["t"] < 0.0:
			continue
		sd["v"].y -= 120.0 * dt                                # falling the wrong way, quickening
		sd["v"].x += sin(sd["t"] * 5.0 + sd["q"].x) * 10.0 * dt
		sd["q"] += sd["v"] * dt
		sd["tr"].push_front(sd["q"])
		if sd["tr"].size() > 4:
			sd["tr"].pop_back()
	bsand = bsand.filter(func(sd): return sd["t"] < sd["life"])
	for gt in gates:
		gt["t"] += dt
		if not gt["shut"] and gt["t"] >= gt["secs"] * 0.7:
			gt["shut"] = true
			black_sand(gt["p"], 0.5, 20)
			Game.shake(1.5)
	gates = gates.filter(func(gt): return gt["t"] < gt["secs"])
	for pc in pinches:
		pc["t"] += dt
		if not pc["done"] and pc["t"] >= pc["secs"] * 0.6:
			pc["done"] = true
			black_sand(pc["p"], 0.3, 8)
	pinches = pinches.filter(func(pc): return pc["t"] < pc["secs"])

func _draw_absence(cv: CanvasItem) -> void:
	for sd in bsand:
		if sd["t"] < 0.0:
			continue
		var u: float = sd["t"] / sd["life"]
		var tr: Array = sd["tr"]
		for i in tr.size():
			var col := Color(0.03, 0.02, 0.04, (1.0 - u) * (1.0 - i * 0.22))
			if i == 0 and fmod(sd["t"] * 7.0 + sd["life"] * 13.0, 1.0) < 0.35:
				col = Color(0.5, 0.44, 0.58, 1.0 - u)               # a grain catching what little light there is
			cv.draw_rect(Rect2((tr[i] / PX).floor() * PX, Vector2(PX, PX)), col)
	for gt in gates:
		var u: float = gt["t"] / gt["secs"]
		var close := pow(minf(1.0, u / 0.7), 2.2)              # the leaves close, slow then fast
		var W: float = gt["W"] * (1.0 - close) + 4.0
		var H: float = gt["H"] * (1.0 - 0.3 * close)
		var fade := 1.0 - smoothstep(0.7, 1.0, u)
		var c0: Vector2 = (gt["c"] / PX).floor()
		var hy := int(H / PX / 2.0)
		for yy in range(-hy, hy + 1):
			var f := float(yy) / hy
			var hw := int(W / PX / 2.0 * sqrt(maxf(0.0, 1.0 - f * f)))   # an eye shape, pointed top and bottom
			for xx in range(-hw, hw + 1):
				var col := Color(0.015, 0.01, 0.025, fade)
				if absi(xx) == hw:
					col = Color(0.62, 0.54, 0.78, fade)              # the leaves' edges, catching what light is left
				elif absi(xx) == hw - 1:
					col = Color(0.2, 0.16, 0.28, fade)
				cv.draw_rect(Rect2((c0 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), col)
	for pc in pinches:
		var u: float = pc["t"] / pc["secs"]
		var c: Vector2 = pc["c"]
		for ry in pc["rays"]:
			var r0: float = ry[1] * (1.0 - u)
			var r1: float = maxf(0.0, r0 - 18.0)
			var dirv := Vector2(cos(ry[0]), sin(ry[0]) * 0.6)
			var n := int((r0 - r1) / PX)
			for k in n:
				var q := c + dirv * (r1 + k * PX)
				var lead := k == n - 1                                 # the outer tip of each streak is lit, the rest is dark
				cv.draw_rect(Rect2((q / PX).floor() * PX, Vector2(PX, PX)), Color(0.6, 0.52, 0.76, 1.0 - u * 0.5) if lead else Color(0.02, 0.015, 0.03, 0.9 * (1.0 - u * 0.5)))
		var dr := int(3.0 * sin(PI * u))
		var c1 := (c / PX).floor()
		for yy in range(-dr, dr + 1):
			for xx in range(-dr, dr + 1):
				if xx * xx + yy * yy <= dr * dr:
					cv.draw_rect(Rect2((c1 + Vector2(xx, yy)) * PX, Vector2(PX, PX)), Color(0.01, 0.005, 0.02) if xx * xx + yy * yy < dr * dr - 1 else Color(0.36, 0.3, 0.46))

# ------------------------------------------------------------------ lakes (painted: shaders/lake.gdshader)
## water or blood lying in the ground, on the floor layer (under every figure, lit by the night like the ground).
## Rings spread where anything wades through it (the pilgrim, creatures) and where drops fall; blood bubbles now and
## then. kind: "water" or "blood".
var lakes: Array = []      # {node, p, R (tiles), kind, rings: [[x, y, age, str]], last: {id: pos}}

func lake(p: Vector2, r: float = 2.0, kind: String = "water") -> Node:
	var hw := r * Iso.HX
	var n := ColorRect.new()
	n.mouse_filter = Control.MOUSE_FILTER_IGNORE
	n.size = (Vector2(hw * 2.6, hw * 1.4) / PX).ceil() * PX
	var q := Iso.to_screen(p)
	n.position = ((q - n.size * 0.5) / PX).floor() * PX
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/lake.gdshader")
	m.set_shader_parameter("seed", randf() * 40.0)
	m.set_shader_parameter("rect_size", n.size)
	m.set_shader_parameter("half_px", Vector2(hw, hw * 0.5))
	m.set_shader_parameter("kind", 1 if kind == "blood" else 0)
	m.set_shader_parameter("world_ofs", n.position)
	n.material = m
	if zone and zone.get("floor_layer"):
		zone.floor_layer.add_child(n)
	else:
		add_child(n)
	lakes.append({"node": n, "p": p, "R": r, "kind": kind, "rings": [], "last": {}, "t": 0.0})
	return n

func _lake_ring(lk: Dictionary, tile: Vector2, strength: float) -> void:
	var n: ColorRect = lk["node"]
	var sp := Iso.to_screen(tile) - n.position
	lk["rings"].append([sp.x, sp.y, 0.0, strength])
	while lk["rings"].size() > 8:
		lk["rings"].pop_front()

func _tick_lakes(dt: float) -> void:
	var bodies: Array = []
	if zone:
		bodies = get_tree().get_nodes_in_group("monsters").filter(func(m): return is_instance_valid(m) and not m.dead and m.zone == zone)
		var sc = get_tree().current_scene
		var h = sc.get("hero") if sc else null
		if h and is_instance_valid(h):
			bodies.append(h)
	for lk in lakes:
		var n: ColorRect = lk["node"]
		if not is_instance_valid(n):
			continue
		lk["t"] += dt
		var blood: bool = lk["kind"] == "blood"
		for b in bodies:
			var dv: Vector2 = b.tp - lk["p"]
			if dv.length() > lk["R"] * 0.8:
				continue
			var id: int = b.get_instance_id()
			var last: Vector2 = lk["last"].get(id, Vector2.INF)
			if last == Vector2.INF or last.distance_to(b.tp) > (0.35 if blood else 0.25):
				lk["last"][id] = b.tp
				_lake_ring(lk, b.tp, 1.0)
		if randf() < dt * (1.2 if blood else 0.7):          # a drop falling in, or blood bubbling up
			var a := randf() * TAU
			var d: float = sqrt(randf()) * lk["R"] * 0.6
			_lake_ring(lk, lk["p"] + Vector2(cos(a), sin(a)) * d, 0.5 if blood else 0.6)
		for rg in lk["rings"]:
			rg[2] += dt
		lk["rings"] = lk["rings"].filter(func(rg): return rg[2] < 1.6)
		var arr: Array = []
		for i in 8:
			arr.append(Vector4(lk["rings"][i][0], lk["rings"][i][1], lk["rings"][i][2], lk["rings"][i][3]) if i < lk["rings"].size() else Vector4(0, 0, 0, 0))
		var m: ShaderMaterial = n.material
		m.set_shader_parameter("ripples", arr)
		m.set_shader_parameter("t", lk["t"])
		m.set_shader_parameter("wind", Vector2(Gust.dir(), Gust.k()))
	lakes = lakes.filter(func(lk): return is_instance_valid(lk["node"]))

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
	_tick_lakes(dt)
	_tick_absence(dt)
	_tick_radiance(dt)
	_tick_miasma2(dt)
	_tick_slash(dt)
	_tick_blood(dt)
	_tick_acid(dt)
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
