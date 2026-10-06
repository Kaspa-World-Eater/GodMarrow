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
		"flesh": [Color("#7a1414"), Color("#4e0c0c"), Color("#2e0808")]}.get(kind, [Color("#7a1414")])
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
