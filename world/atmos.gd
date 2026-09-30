class_name Atmos
extends CanvasLayer
## The world's breath (zz_atmos62.js), drawn over the dark and lit by it (the dark layer's light_at): five layers that
## live in the world and take their colour from the light round them, never red.
##  1. mist banks drifting over the ground, bright only where a lantern or fire reaches them;
##  2. dust turning in the hero's lantern light;
##  3. soul-lights: a few pale wandering lights in the open at dusk and night, each lighting the ground under it;
##  4. leaves shaken loose on the moor and in the woods, tumbling on the wind;
##  5. cloud shadows sliding over the land by day.
## One shared gust (Game.wind) moves mist, leaves, dust and clouds.

const WPX := 4.0             # screen px per world px
var zone: Zone
var hero: Hero
var dark: DarkLayer
var canvas: Node2D
var mist: Array = []
var dust: Array = []
var souls: Array = []
var leaves: Array = []
var clouds: Array = []
var embers: Array = []       # dusk: embers lifting off the ash (orange motes, never a light)
var motes: Array = []        # dawn: gold dust in the long light
var dapple: Array = []       # the woods by day: patches of light through the canopy, drifting
var add_canvas: Node2D       # the additive layer (dapple, motes)
var gust := 0.0
var gust_t := 0.0
var gust_v := 0.0
var t := 0.0
var last_cam := Vector2.INF
var _mist_tex: Array = []     # (instance caches: static Resources crash Godot at exit)
var _cloud_tex: Texture2D
var _halo: Texture2D

func _ready() -> void:
	layer = 6
	canvas = Node2D.new()
	canvas.draw.connect(_draw_all)
	add_child(canvas)
	add_canvas = Node2D.new()
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	add_canvas.material = mat
	add_canvas.draw.connect(_draw_add)
	add_child(add_canvas)
	if _mist_tex.is_empty():
		_mist_tex = [_blob(110, 30, 1.1), _blob(84, 24, 1.0), _blob(150, 40, 1.3)]
		_cloud_tex = _blob(220, 110, 0.9)
		_halo = _blob(9, 9, 1.5)

func bind(z: Zone, h: Hero, d: DarkLayer) -> void:
	zone = z
	hero = h
	dark = d
	mist.clear()
	dust.clear()
	souls.clear()
	leaves.clear()
	clouds.clear()
	embers.clear()
	motes.clear()
	dapple.clear()

## a dithered white blob, the web's mist sprite (world px)
static func _blob(w: int, h: int, soft: float) -> Texture2D:
	var BAY := [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	for j in h:
		for i in w:
			var dx := (i - w / 2.0 + 0.5) / (w / 2.0)
			var dy := (j - h / 2.0 + 0.5) / (h / 2.0)
			var d := sqrt(dx * dx + dy * dy)
			if d >= 1.0:
				continue
			var n := (sin(i * 0.37 + j * 0.91) + sin(i * 0.13 - j * 0.29 + 2.0)) * 0.12
			var v := pow(1.0 - d, soft) + n
			if v <= (BAY[((j & 3) << 2) + (i & 3)] + 0.5) / 16.0 * 0.9:
				continue
			img.set_pixel(i, j, Color.WHITE)
	var tex := ImageTexture.create_from_image(img)
	return tex

func _woody() -> bool:
	var s: String = str(zone.d.get("theme", "")) + " " + zone.id
	for k in ["wood", "moor", "ashoak", "grove", "root", "fern", "hollow"]:
		if s.contains(k):
			return true
	return false

func _fenish() -> bool:
	var s: String = str(zone.d.get("theme", "")) + " " + zone.id
	for k in ["fen", "bog", "drown", "sunken", "marsh"]:
		if s.contains(k):
			return true
	return false

func _process(dt: float) -> void:
	if zone == null or not is_instance_valid(zone) or hero == null or not is_instance_valid(hero):
		return
	t += dt
	var outdoor: bool = zone.d.get("outdoor", false)
	var dk := Game.day_k() if outdoor else 0.0
	var night := (1.0 - dk) if outdoor else 1.0
	# the gust: a slow wind with a stronger breath every 8-20 s
	gust_t -= dt
	if gust_t <= 0.0:
		gust_t = randf_range(8.0, 20.0)
		gust_v = randf_range(0.6, 1.0)
	gust_v = maxf(0.0, gust_v - dt * 0.35)
	gust += ((0.25 + gust_v) - gust) * minf(1.0, dt * 1.5)
	var wind := (sin(t * 0.21) * 0.5 + 0.8) * gust
	Game.wind = wind
	var c := hero.tp
	# 1. mist banks round the camera, anchored to the ground
	var want := 18 if _fenish() else (int(round(6 + 8 * night)) if outdoor else 8)
	while mist.size() < want:
		mist.append({"p": c + Vector2(randf_range(-10, 10), randf_range(-10, 10)), "k": randi() % 3, "t": 0.0, "life": randf_range(18, 40), "d": randf_range(0.5, 1.0), "ph": randf() * 6.0})
	for m in mist:
		m["t"] += dt
		m["p"] += Vector2(wind * 0.35, -wind * 0.12) * dt
	mist = mist.filter(func(m): return m["t"] < m["life"] and m["p"].distance_to(c) < 15.0)
	# 2. dust in the lantern light
	if not hero.dead:
		while dust.size() < 10:
			dust.append({"o": Vector2(randf_range(-26, 26), randf_range(-36, 6)), "v": Vector2(randf_range(-2, 2), randf_range(-3, -0.5)), "t": 0.0, "life": randf_range(3, 7), "ph": randf() * 6.0})
		for d in dust:
			d["t"] += dt
			d["o"] += Vector2(d["v"].x + wind * 3.0 + sin(t * 0.9 + d["ph"]) * 2.0, d["v"].y + cos(t * 0.7 + d["ph"]) * 1.2) * dt
		dust = dust.filter(func(d): return d["t"] < d["life"] and absf(d["o"].x) < 40 and d["o"].y > -50 and d["o"].y < 12)
	# 3. soul-lights: out in the open when the light fails
	var sw := int(round(2.0 * maxf(0.0, night - 0.3))) if outdoor else 0
	while souls.size() < sw:
		var a := randf() * TAU
		var r := randf_range(6, 14)
		var sl := {"p": c + Vector2(cos(a), sin(a)) * r, "h": randf_range(8, 16), "t": 0.0, "life": randf_range(14, 30), "ph": randf() * 6.0, "v": Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3))}
		var L := PointLight2D.new()     # its pool on the ground (the dark layer draws it: dark_r)
		L.texture = Lights.radial(64)
		L.color = Color8(170, 214, 200)
		L.energy = 0.0
		L.set_meta("dark_r", 30.0)
		L.set_meta("dark_core", 0.2)
		L.set_meta("dark_w", 0.4)
		zone.sorted.add_child(L)
		sl["light"] = L
		souls.append(sl)
	for s in souls:
		s["t"] += dt
		s["p"] += (s["v"] + Vector2(sin(t * 0.3 + s["ph"]) * 0.25 + wind * 0.1, cos(t * 0.23 + s["ph"]) * 0.25)) * dt
		var L2: PointLight2D = s["light"]
		if is_instance_valid(L2):
			L2.position = Iso.to_screen(s["p"])
			var f := minf(1.0, minf(s["t"] / 2.0, (s["life"] - s["t"]) / 3.0))
			L2.visible = f > 0.2
	for s in souls.duplicate():
		if s["t"] >= s["life"] or s["p"].distance_to(c) > 24.0 or souls.size() > sw:
			if is_instance_valid(s["light"]):
				s["light"].queue_free()
			souls.erase(s)
	# 4. leaves (screen space), shaken loose from the trees on screen
	var vs := get_viewport().get_visible_rect().size
	var cam := hero.position
	var dcam := Vector2.ZERO if last_cam == Vector2.INF else cam - last_cam
	last_cam = cam
	if _woody() and outdoor:
		if randf() < (0.25 + gust * 1.2) * dt and leaves.size() < 40:
			leaves.append({"p": Vector2(randf_range(-80, vs.x), randf_range(-40, vs.y * 0.6)), "v": Vector2(0, randf_range(5, 9) * WPX), "t": 0.0, "life": randf_range(4, 8), "ph": randf() * 6.0, "col": 0 if randf() < 0.6 else (1 if randf() < 0.6 else 2)})
	for l in leaves:
		l["t"] += dt
		l["v"].x += (wind * 24.0 * WPX - l["v"].x) * minf(1.0, dt)
		l["p"] += Vector2(l["v"].x + sin(t * 2.3 + l["ph"]) * 6.0 * WPX, l["v"].y + cos(t * 1.7 + l["ph"]) * 3.0 * WPX) * dt - dcam
	leaves = leaves.filter(func(l): return l["t"] < l["life"] and l["p"].x > -120 and l["p"].x < vs.x + 120 and l["p"].y < vs.y + 80)
	# 5. clouds: only in the open by day
	var cw := 2 if outdoor and dk > 0.2 else 0
	while clouds.size() < cw:
		clouds.append({"p": Vector2(randf_range(-vs.x * 0.6, vs.x * 0.9), randf_range(-160, vs.y)), "s": randf_range(0.9, 1.6), "t": 0.0, "life": randf_range(40, 70)})
	for k in clouds:
		k["t"] += dt
		k["p"] += Vector2((4.0 + wind * 8.0) * WPX, 1.2 * WPX) * dt - dcam
	clouds = clouds.filter(func(k): return k["t"] < k["life"] and k["p"].x < vs.x + 800 and k["p"].y < vs.y + 480)
	# dusk embers, dawn motes, the canopy's dapple (screen space, carried with the camera)
	var hr := Game.hour_name() if outdoor else ""
	if hr == "dusk" and randf() < 6.0 * dt and embers.size() < 30:
		embers.append({"p": Vector2(randf_range(0, vs.x), randf_range(vs.y * 0.3, vs.y)), "v": Vector2(randf_range(-4, 4), randf_range(-14, -6)) * WPX, "t": 0.0, "life": randf_range(2.5, 5.0), "ph": randf() * 6.0})
	for e in embers:
		e["t"] += dt
		e["p"] += (e["v"] + Vector2(wind * 10.0 * WPX + sin(t * 2.0 + e["ph"]) * 3.0 * WPX, 0)) * dt - dcam
	embers = embers.filter(func(e): return e["t"] < e["life"])
	if hr == "dawn" and randf() < 5.0 * dt and motes.size() < 26:
		motes.append({"p": Vector2(randf_range(0, vs.x), randf_range(0, vs.y)), "t": 0.0, "life": randf_range(3.0, 6.0), "ph": randf() * 6.0})
	for mo in motes:
		mo["t"] += dt
		mo["p"] += Vector2(wind * 6.0 * WPX + sin(t * 0.8 + mo["ph"]) * 2.0 * WPX, -1.5 * WPX + cos(t * 0.6 + mo["ph"]) * 1.5 * WPX) * dt - dcam
	motes = motes.filter(func(mo): return mo["t"] < mo["life"])
	var wd := 5 if (outdoor and _woody() and zone.d.get("theme", "") != "moor" and dk > 0.4) else 0
	while dapple.size() < wd:
		dapple.append({"p": Vector2(randf_range(-200, vs.x), randf_range(-100, vs.y)), "s": randf_range(0.6, 1.3), "t": 0.0, "life": randf_range(12, 24), "k": randi() % 3})
	for dp in dapple:
		dp["t"] += dt
		dp["p"] += Vector2((2.0 + wind * 5.0) * WPX, 0.6 * WPX) * dt - dcam
	dapple = dapple.filter(func(dp): return dp["t"] < dp["life"] and dp["p"].x < vs.x + 400)
	if wd == 0:
		dapple.clear()
	canvas.queue_redraw()
	add_canvas.queue_redraw()

func _light(vp_pt: Vector2) -> Array:
	return dark.light_at(vp_pt) if dark else [0.5, Color(0.6, 0.6, 0.7)]

func _draw_all() -> void:
	if zone == null or not is_instance_valid(zone) or hero == null or not is_instance_valid(hero):
		return
	var xf := canvas.get_viewport().get_canvas_transform()
	var vs := canvas.get_viewport().get_visible_rect().size
	var outdoor: bool = zone.d.get("outdoor", false)
	var dk := Game.day_k() if outdoor else 0.0
	# 5. clouds: a gentle shade drifting over the ground
	for k in clouds:
		var f := minf(1.0, minf(k["t"] / 6.0, (k["life"] - k["t"]) / 6.0)) * clampf((dk - 0.2) * 2.0, 0.0, 1.0)
		var sz: Vector2 = _cloud_tex.get_size() * WPX * float(k["s"])
		canvas.draw_texture_rect(_cloud_tex, Rect2(k["p"], sz), false, Color(0.1, 0.1, 0.16, 0.16 * f))
	# 1. mist: its brightness is the light it sits in
	for m in mist:
		var tex: Texture2D = _mist_tex[m["k"]]
		var sz2: Vector2 = tex.get_size() * WPX
		var p: Vector2 = xf * Iso.to_screen(m["p"])
		if p.x > vs.x + sz2.x or p.y > vs.y + sz2.y or p.x < -sz2.x or p.y < -sz2.y:
			continue
		var L := _light(p)
		var l: float = L[0]
		var lc: Color = L[1]
		var f2: float = minf(1.0, minf(m["t"] / 5.0, (m["life"] - m["t"]) / 5.0)) * m["d"] * (0.6 + 0.4 * sin(t * 0.4 + m["ph"]))
		var col := Color((130.0 * lc.r * l + 44.0) / 255.0, (136.0 * lc.g * l + 50.0) / 255.0, (144.0 * lc.b * l + 62.0) / 255.0, minf(0.26, (0.06 + 0.16 * minf(1.3, l)) * f2))
		canvas.draw_texture_rect(tex, Rect2(p - sz2 / 2.0, sz2), false, col)
	# 2. dust in the lantern light
	if not hero.dead:
		var lp: Vector2 = xf * (hero.position + Vector2(28, -90))
		for d in dust:
			var q: Vector2 = lp + d["o"] * WPX
			var L3 := _light(q)
			var l3: float = L3[0]
			if l3 < 0.55:
				continue
			var f3: float = minf(1.0, minf(d["t"] / 0.8, (d["life"] - d["t"]) / 1.2)) * minf(1.0, (l3 - 0.55) * 2.2) * (0.55 + 0.45 * sin(t * 3.0 + d["ph"]))
			var c3: Color = L3[1]
			canvas.draw_rect(Rect2(q.snapped(Vector2(WPX, WPX)), Vector2(WPX, WPX)), Color(0.78 * c3.r + 0.2, 0.77 * c3.g + 0.2, 0.73 * c3.b + 0.2, 0.55 * f3))
	# 3. soul-lights: a pale core and a breath of halo, bobbing slowly
	for s in souls:
		var f4 := minf(1.0, minf(s["t"] / 2.0, (s["life"] - s["t"]) / 3.0))
		var b := 0.7 + 0.3 * sin(t * 2.1 + s["ph"])
		var p4: Vector2 = xf * (Iso.to_screen(s["p"]) + Vector2(0, (-float(s["h"]) + sin(t * 0.9 + s["ph"]) * 2.0) * WPX))
		p4 = p4.snapped(Vector2(WPX, WPX))
		var hs := _halo.get_size() * WPX
		canvas.draw_texture_rect(_halo, Rect2(p4 - hs / 2.0, hs), false, Color(0.51, 0.75, 0.69, 0.35 * f4 * b))
		canvas.draw_rect(Rect2(p4, Vector2(2, 2) * WPX), Color(0.9, 0.96, 0.93, 0.95 * f4 * b))
		canvas.draw_rect(Rect2(p4 + Vector2(-WPX, 0), Vector2(WPX, 2 * WPX)), Color(0.9, 0.96, 0.93, 0.5 * f4 * b))
		canvas.draw_rect(Rect2(p4 + Vector2(2 * WPX, 0), Vector2(WPX, 2 * WPX)), Color(0.9, 0.96, 0.93, 0.5 * f4 * b))
	# eye-shine (zz_zz_cine76.js): beyond the pool, what watches you shows as two points catching the lantern
	var night := (1.0 - dk) if outdoor else 1.0
	if night >= 0.35 and not hero.dead:
		var F: Vector2 = hero.lantern.tp if hero.lantern and is_instance_valid(hero.lantern) else hero.tp
		var R: float = hero.light_radius() * 0.55
		var lc: Color = Color8(255, 214, 170)
		var ecol := Color(minf(1.0, lc.r * 0.6 + 0.43), minf(1.0, lc.g * 0.6 + 0.39), minf(1.0, lc.b * 0.5 + 0.31))
		for m in hero.get_tree().get_nodes_in_group("monsters"):
			if m.dead or m.buried or m.flying or m.zone != zone:
				continue
			var dd: float = m.tp.distance_to(F)
			if dd < R * 1.05 or dd > R * 3.2:
				continue
			var tx: float = (hero.tp.x - hero.tp.y) - (m.tp.x - m.tp.y)
			if absf(tx) > 0.4 and signf(tx) != float(m.face):
				continue
			var e: Dictionary = m.get_meta("eye", {})
			if e.is_empty():
				e = {"blink": t + 2.0 + randf() * 4.0, "s": randf() * TAU, "on": randf() < 0.8}
				m.set_meta("eye", e)
			if not e["on"]:
				continue
			if t > e["blink"]:
				if t > e["blink"] + 0.14:
					e["blink"] = t + 2.5 + randf() * 5.0
				continue
			var hunting: bool = m.brain != null and m.brain.state in ["chase", "wind", "strike"]
			var fade := minf(1.0, (dd - R * 1.05) / (R * 0.4)) * minf(1.0, (R * 3.2 - dd) / (R * 0.8))
			var ea := (0.85 if hunting else 0.45) * fade * night * (0.85 + 0.15 * sin(t * 3.0 + e["s"]))
			if ea < 0.05 or m.spr == null or m.spr.texture == null:
				continue
			var sz: Vector2 = m.spr.texture.get_size()
			var top: Vector2 = xf * (m.global_position + m.spr.offset)
			var cx := top.x + sz.x / 2.0 + float(m.face) * maxf(4.0, sz.x * 0.08)
			var cy := top.y + sz.y * 0.2
			var gap := 12.0 if sz.x > 136.0 else 8.0
			var ec := ecol
			ec.a = ea
			canvas.draw_rect(Rect2(Vector2(cx - gap, cy).snapped(Vector2(WPX, WPX)), Vector2(WPX, WPX)), ec)
			canvas.draw_rect(Rect2(Vector2(cx + gap - WPX, cy).snapped(Vector2(WPX, WPX)), Vector2(WPX, WPX)), ec)
	# dusk embers: small orange motes lifting off the ash (matter, not light)
	for e in embers:
		var f6 := minf(1.0, minf(e["t"] / 0.5, (e["life"] - e["t"]) / 1.5))
		canvas.draw_rect(Rect2((e["p"] as Vector2).snapped(Vector2(WPX, WPX)), Vector2(WPX, WPX)), Color(0.85, 0.46, 0.18, 0.75 * f6))
	# 4. leaves: two-pixel flakes that flip as they tumble, lit by what they pass through
	var LEAF := [[Color("#6e3a1c"), Color("#9a5a2a")], [Color("#5a5a2a"), Color("#7c7a3a")], [Color("#3e2a1c"), Color("#5e4630")]]
	for l in leaves:
		var p5: Vector2 = (l["p"] as Vector2).snapped(Vector2(WPX, WPX))
		var fl := sin(t * 6.0 + l["ph"]) > 0.0
		var L5 := _light(p5)
		var c5: Color = LEAF[l["col"]][1 if fl else 0]
		c5.a = minf(1.0, minf(l["t"] / 0.5, (l["life"] - l["t"]) / 0.8)) * minf(1.0, 0.35 + float(L5[0]) * 0.7)
		canvas.draw_rect(Rect2(p5, Vector2((2 if fl else 1) * WPX, WPX)), c5)
		if not fl:
			canvas.draw_rect(Rect2(p5 + Vector2(0, WPX), Vector2(WPX, WPX)), c5)


## the additive layer: the canopy's dapple and the dawn's gold dust (light added, never a glow on an attack)
func _draw_add() -> void:
	if zone == null or not is_instance_valid(zone):
		return
	var dk := Game.day_k() if zone.d.get("outdoor", false) else 0.0
	for dp in dapple:
		var f := minf(1.0, minf(dp["t"] / 4.0, (dp["life"] - dp["t"]) / 4.0)) * dk
		var tex: Texture2D = _mist_tex[dp["k"]]
		var sz: Vector2 = Vector2(tex.get_height(), tex.get_height()) * WPX * 2.2 * float(dp["s"])
		add_canvas.draw_texture_rect(tex, Rect2(dp["p"], sz), false, Color(0.16, 0.15, 0.09, 0.5 * f))
	for mo in motes:
		var f2 := minf(1.0, minf(mo["t"] / 0.8, (mo["life"] - mo["t"]) / 1.2)) * (0.6 + 0.4 * sin(t * 3.0 + mo["ph"]))
		add_canvas.draw_rect(Rect2((mo["p"] as Vector2).snapped(Vector2(WPX, WPX)), Vector2(WPX, WPX)), Color(0.5, 0.4, 0.18, 0.7 * f2))
