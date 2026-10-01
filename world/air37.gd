extends Node2D
## world/air37.gd: what hangs in the air of each place that world/atmos.gd and world/weather.gd did not yet carry,
## from the web's older atmosphere, still alive in v105 (y_light21.js:313-466, zz_env.js:33-82). Drawn by the
## atmosphere's layer, over the dark (world/atmos.gd makes one and calls bind).
## - the fen's fireflies: a quarter of its motes, a dithered green-white glow that breathes (y_light21.js:387);
## - the underground's slow dust, pale specks drifting down (y_light21.js:388);
## - pale shafts of light through cracks in the vaults, anchored to certain floor tiles, dithered, with motes falling
##   through them and a cold pool where they land (y_light21.js:433-466, 154);
## - torn mist puffs drifting across the ground (ztMist): the fen always, the moor more by night, a little in the vaults;
## - the dawn's long low rays (zz_env.js:66-72; the dusk's rays are red and are left out by the user's rule, as are the
##   orange night embers over the moor);
## - by day, a few bright motes hanging in the light (zz_env.js:74-79);
## - moonlit clearings (zz_zz_moon86.js:13-56): two or three in each outdoor place lie under a gap in the cloud; at night
##   motes fall slowly there, and standing in one your poise comes back half again as fast and your wounds close a
##   little (the web's pool of moonlight never reached its dark layer in v105, so there is none here either);
## - light through the canopy (zz_zz_moon86.js:58-74): in the woods by day, long pale shafts slant down through the
##   leaves, drifting as the crowns move, dust turning in them; gone at dusk.

const Flame = preload("res://fx/flame.gd")
const PX := 4.0
const TALL := [2, 3, 5, 7, 8, 9, 10]
const WATER := 4
const FLOOR := 6

var zone: Zone
var hero
var clearings: Array = []    # {tp, s, said}
var woods := false
const R_MOON := 2.3
var dark
var kind := "moor"           # moor | fen | deep (atmosKind)
var outdoor := false
var t := 0.0
var motes: Array = []        # fireflies and dust (screen px, carried by the camera)
var mist: Array = []         # {tp, k, s, a, t, life, z}
var dmotes: Array = []       # day motes (screen px)
var last_cam := Vector2.INF
var pools: Array = []        # PointLights under the shafts (the dark layer opens a pool for each)
var cracks: Array = []       # the floor tiles under a crack in the vault (found once per place)
var add: Node2D              # what is laid on as light (shafts, rays, the fireflies' glow)
static var _mist: Array = []
static var _shaft: Texture2D
static var _rays: Texture2D

func bind(z: Zone, d, h = null) -> void:
	zone = z
	hero = h
	dark = d
	outdoor = z.d.get("outdoor", false)
	var th := str(z.d.get("theme", ""))
	kind = "fen" if th == "fen" else ("moor" if th == "moor" or th == "" else "deep")
	motes.clear()
	mist.clear()
	dmotes.clear()
	last_cam = Vector2.INF
	pools.clear()
	cracks.clear()
	var land := z.id + str(z.d.get("theme", ""))
	woods = outdoor and RegEx.create_from_string("wood|root|tree|fern|hunter|gully|grove|forest").search(land) != null and not RegEx.create_from_string("fen|bog|drowned|mire|marsh").search(land) and not RegEx.create_from_string("burnt|ash_shore|heath").search(z.id)
	_find_clearings()
	if not outdoor and kind == "deep":
		for y in int(z.h):
			for x in int(z.w):
				if Flame.hash2(x * 13 + 7, y * 17 + 3) >= 0.9955 and z.type_at(Vector2(x, y)) == FLOOR:
					cracks.append(Vector2i(x, y))
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if add == null:
		add = Node2D.new()
		var mat := CanvasItemMaterial.new()
		mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
		add.material = mat
		add.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add.draw.connect(_draw_add)
		add_child(add)

func _vs() -> Vector2:
	return get_viewport_rect().size

func _xf() -> Transform2D:
	return get_viewport().get_canvas_transform()

func _process(dt: float) -> void:
	if zone == null or not is_instance_valid(zone):
		return
	dt = minf(dt, 0.05)
	t += dt
	var vs := _vs()
	var xf := _xf()
	var cam := xf.affine_inverse() * (vs / 2.0)
	var dcam := Vector2.ZERO if last_cam == Vector2.INF else (cam - last_cam)
	last_cam = cam
	var dk := Game.day_k() if outdoor else 0.0
	# fireflies over the fen, dust under the ground
	var want := 15 if kind == "fen" else (18 if kind == "deep" else 0)
	while motes.size() < want:
		motes.append({"p": Vector2(randf() * vs.x, (40.0 + randf() * (270.0 - 60.0)) * PX if kind == "fen" else randf() * vs.y), "t": 0.0,
			"life": (6.0 + randf() * 8.0) if kind == "fen" else 40.0, "s": randf() * 100.0, "vy": 0.0 if kind == "fen" else 1.5 + randf() * 2.5})
	for m in motes:
		m["t"] += dt
		if kind == "fen":
			m["p"] += Vector2(sin(t * 1.3 + m["s"]) * 6.0, cos(t * 1.1 + m["s"] * 2.0) * 4.0) * PX * dt
		else:
			m["p"] += Vector2(sin(t * 0.4 + m["s"]) * 2.0, m["vy"]) * PX * dt
		m["p"] -= dcam
	motes = motes.filter(func(m): return m["t"] < m["life"] and Rect2(Vector2(-80, -80), vs + Vector2(160, 120)).has_point(m["p"]))
	# the mist puffs, born round the view and wandering across it
	var tl := Iso.to_tile(cam)
	var n := 0 if Settings.fewer_fx else (16 if kind == "fen" else (11 if outdoor else 6))
	while mist.size() < n:
		mist.append({"tp": tl + Vector2(randf_range(-12, 12), randf_range(-12, 12)), "k": randi() % 3, "s": randf() * TAU, "a": 0.5 + randf() * 0.5, "t": 0.0, "life": 14.0 + randf() * 10.0, "z": 1.0 + randf() * 4.0})
	for q in mist:
		q["t"] += dt
		q["tp"] += Vector2(0.12 + sin(t * 0.2 + q["s"]) * 0.06, -(0.05 + cos(t * 0.17 + q["s"]) * 0.05)) * dt
		if q["t"] > q["life"] or (q["tp"] as Vector2).distance_to(tl) > 16.0:
			q["tp"] = tl + Vector2(randf_range(-12, 12), randf_range(4, 12))
			q["t"] = 0.0
			q["life"] = 14.0 + randf() * 10.0
	# day motes in the open
	if outdoor and dk > 0.3:
		while dmotes.size() < 14:
			dmotes.append({"p": Vector2(randf() * vs.x, randf() * vs.y), "s": randf() * TAU, "t": 0.0, "life": 6.0 + randf() * 6.0})
		for d in dmotes:
			d["t"] += dt
			d["p"] += Vector2(sin(t * 0.5 + d["s"]) * 4.0, 2.0 + cos(t * 0.3 + d["s"])) * PX * dt - dcam
		dmotes = dmotes.filter(func(d): return d["t"] < d["life"] and d["p"].y < vs.y + 16)
	else:
		dmotes.clear()
	_shaft_pools(xf, vs)
	_rest(dt)
	queue_redraw()
	if add:
		add.queue_redraw()

# ------------------------------------------------------------------ moonlit clearings
func _night() -> float:
	return 1.0 - Game.day_k() if outdoor else 0.0

func _find_clearings() -> void:
	clearings.clear()
	if not outdoor or RegEx.create_from_string("town|camp").search(zone.id) != null:
		return
	var r := RandomNumberGenerator.new()
	r.seed = hash(zone.id) ^ 0x86a1
	var W := maxi(20, zone.w)
	var H := maxi(20, zone.h)
	var want := 2 + r.randi() % 2
	var start: Vector2 = Vector2(zone.arrive.get("x", -99), zone.arrive.get("y", -99)) if zone.arrive is Dictionary else Vector2(-99, -99)
	for n in 900:
		if clearings.size() >= want:
			break
		var x := 6 + r.randi() % (W - 12)
		var y := 6 + r.randi() % (H - 12)
		var open := true
		for j in range(-3, 4):
			for i in range(-3, 4):
				if zone.is_solid(Vector2(x + i + 0.5, y + j + 0.5)):
					open = false
		if not open or start.distance_to(Vector2(x, y)) < 8.0:
			continue
		var far := true
		for c in clearings:
			if (c["tp"] as Vector2).distance_to(Vector2(x, y)) < 18.0:
				far = false
		if far:
			clearings.append({"tp": Vector2(x + 0.5, y + 0.5), "s": r.randf() * 99.0, "said": false})

## the rest a clearing gives: poise back half again as fast, a little life
func _rest(dt: float) -> void:
	if hero == null or not is_instance_valid(hero) or hero.dead or _night() < 0.35:
		return
	for c in clearings:
		if hero.tp.distance_to(c["tp"]) < R_MOON * 0.8:
			var st = hero.st
			st.poise = minf(st.poise_max(), st.poise + 15.0 * dt)
			st.hp = minf(st.life_max(), st.hp + st.life_max() * 0.006 * dt)
			if not c["said"]:
				c["said"] = true
				Bus.say.emit("A gap in the cloud. The moon finds this one place, and lets you breathe.", 3.0)

# ------------------------------------------------------------------ the vault shafts
func _shaft_tiles(xf: Transform2D, vs: Vector2) -> Array:
	var out := []
	var view := Rect2(Vector2(-300, -200), vs + Vector2(600, 900))
	for c in cracks:
		if view.has_point(xf * Iso.to_screen(Vector2(c.x + 0.5, c.y + 0.5))):
			out.append([c.x, c.y, 0.75 + 0.25 * sin(t * 0.5 + c.x)])
	return out

func _shaft_pools(xf: Transform2D, vs: Vector2) -> void:
	var tiles := _shaft_tiles(xf, vs)
	while pools.size() < tiles.size():
		var l := PointLight2D.new()
		l.texture = Lights.radial(64)
		l.color = Color8(170, 185, 215)
		l.shadow_enabled = false
		l.set_meta("dark_r", 34.0)
		l.set_meta("dark_core", 0.3)
		l.set_meta("dark_far", 1.5)
		l.set_meta("dark_w", 0.4)
		zone.sorted.add_child(l)
		pools.append(l)
	for i in pools.size():
		var l: PointLight2D = pools[i]
		if not is_instance_valid(l):
			continue
		l.visible = i < tiles.size()
		if l.visible:
			var s: Array = tiles[i]
			l.position = Iso.to_screen(Vector2(s[0] + 0.5, s[1] + 0.5))
			l.set_meta("dark_r", 24.0 * s[2])

static func shaft_tex() -> Texture2D:
	if _shaft:
		return _shaft
	var w := 64
	var h := 150
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	for j in h:
		var k := j / float(h)
		var cx := 12.0 + (1.0 - k) * 36.0
		var hw := 5.0 + k * 9.0 + (1.0 - k) * 4.0
		for i in w:
			var u := absf(i - cx) / hw
			if u >= 1.0:
				continue
			var streak := 0.75 + 0.25 * sin(i * 0.9 + j * 0.25)
			var v := (1.0 - u * u) * pow(k, 1.3) * streak * 3.0
			var b := (float(Flame.BAY4[((j & 3) << 2) + (i & 3)]) + 0.5) / 16.0
			var lv := mini(3, int(v) + (1 if (v - int(v) - 0.3) * 2.5 > b else 0))
			if lv <= 0:
				continue
			img.set_pixel(i, j, Color8(150, 164, 196, lv * 34))
	_shaft = ImageTexture.create_from_image(img)
	return _shaft

static func mist_tex(k: int) -> Texture2D:
	if _mist.size() > k:
		return _mist[k]
	while _mist.size() <= k:
		var i0 := _mist.size()
		var w := 64 + i0 * 24
		var h := 10 + i0 * 3
		var seed := i0 * 17
		var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
		var vn := func(u: float, v: float) -> float:
			var i := int(floor(u))
			var j := int(floor(v))
			var fu := u - i
			var fv := v - j
			var su := fu * fu * (3.0 - 2.0 * fu)
			var sv := fv * fv * (3.0 - 2.0 * fv)
			var a := Flame.hash2(i + seed, j)
			var b2 := Flame.hash2(i + 1 + seed, j)
			var c2 := Flame.hash2(i + seed, j + 1)
			var d2 := Flame.hash2(i + 1 + seed, j + 1)
			return (a + (b2 - a) * su) * (1.0 - sv) + (c2 + (d2 - c2) * su) * sv
		for j in h:
			for i in w:
				var dx := (i - w / 2.0) / (w / 2.0)
				var dy := (j - h / 2.0) / (h / 2.0)
				var d := dx * dx + dy * dy
				if d > 1.0:
					continue
				var n: float = vn.call(i / 9.0, j / 3.0) * 0.7 + vn.call(i / 3.5, j / 1.6 + 5.0) * 0.3
				var v := ((1.0 - d) * 1.3 + n - 0.95) * 2.2
				var b := (float(Flame.BAY4[((j & 3) << 2) + (i & 3)]) + 0.5) / 16.0
				var lv := mini(2, int(v) + (1 if (v - int(v) - 0.3) * 2.5 > b else 0))
				if lv <= 0:
					continue
				img.set_pixel(i, j, Color8(196, 206, 214, 150 if lv > 1 else 80))
		_mist.append(ImageTexture.create_from_image(img))
	return _mist[k]

static func rays_tex() -> Texture2D:
	if _rays:
		return _rays
	var w := 170
	var h := 380
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	for j in h:
		var k := j / float(h)
		var cx := w - 26.0 - k * (w - 52.0)
		var hw := 10.0 + k * 16.0
		for i in w:
			var u := absf(i - cx) / hw
			if u >= 1.0:
				continue
			var v := (1.0 - u * u) * (0.35 + 0.65 * sin(k * PI)) * (0.8 + 0.2 * sin(i * 0.7 + j * 0.13)) * 3.0
			var b := (float(Flame.BAY4[((j & 3) << 2) + (i & 3)]) + 0.5) / 16.0
			var lv := mini(3, int(v) + (1 if (v - int(v) - 0.3) * 2.5 > b else 0))
			if lv <= 0:
				continue
			img.set_pixel(i, j, Color8(236, 206, 140, lv * 30))
	_rays = ImageTexture.create_from_image(img)
	return _rays

# ------------------------------------------------------------------ drawing
func _draw() -> void:
	if zone == null or not is_instance_valid(zone):
		return
	var vs := _vs()
	var xf := _xf()
	var dk := Game.day_k() if outdoor else 0.0
	# the mist: only over open ground (not on walls, nor on water but in the fen)
	var base := 0.2 if kind == "fen" else (0.08 + 0.12 * (1.0 - dk) if outdoor else 0.06)
	for q in mist:
		var tp: Vector2 = q["tp"]
		var ty := zone.type_at(tp.floor())
		if ty in TALL or (kind != "fen" and ty == WATER):
			continue
		var fade: float = minf(1.0, minf(q["t"] / 3.0, (q["life"] - q["t"]) / 3.0))
		var img := mist_tex(q["k"])
		var sz := img.get_size() * PX
		var p: Vector2 = xf * (Iso.to_screen(tp) - Vector2(0, q["z"] * PX))
		if not Rect2(Vector2(-320, -80), vs + Vector2(640, 160)).has_point(p):
			continue
		var col := Color(1, 1, 1, base * q["a"] * fade)
		draw_texture_rect(img, Rect2(((p - sz / 2.0) / PX).round() * PX, sz), false, col)
		if q["k"] == 2:
			draw_texture_rect(img, Rect2(((p - sz / 2.0) / PX + Vector2(20.0 + sin(t * 0.3 + q["s"]) * 6.0, -2.0)).round() * PX, sz), false, col)
	# fireflies and dust
	for m in motes:
		var fade := minf(1.0, minf(m["t"] / 0.6, (m["life"] - m["t"]) / 0.8))
		var p: Vector2 = ((m["p"] as Vector2) / PX).round() * PX
		if kind == "fen":
			var b := 0.5 + 0.5 * sin(t * 3.0 + m["s"])
			draw_rect(Rect2(p, Vector2(PX, PX)), Color(220 / 255.0, 1.0, 180 / 255.0, b * fade))
		else:
			draw_rect(Rect2(p, Vector2(PX, PX)), Color(Color("#d8d0c0"), 0.3 * fade * (0.6 + 0.4 * sin(t * 2.0 + m["s"]))))
	# day: a few bright motes hanging in the light
	for d in dmotes:
		var f: float = minf(1.0, minf(d["t"] / 1.5, (d["life"] - d["t"]) / 1.5)) * dk * (0.5 + 0.5 * sin(t * 2.0 + d["s"] * 3.0))
		draw_rect(Rect2(((d["p"] as Vector2) / PX).round() * PX, Vector2(PX, PX)), Color(232 / 255.0, 224 / 255.0, 200 / 255.0, 0.45 * f))

	# motes falling in the moonlight
	var nk := _night()
	if nk >= 0.35:
		for c in clearings:
			for i in 14:
				var ph := fmod(t * 0.12 + i * 0.137 + c["s"], 1.0)
				var an := fmod(i * 2.4 + c["s"], TAU)
				var rr := fmod(i * 0.37 + c["s"], 1.0) * R_MOON * 0.8
				var p: Vector2 = xf * Iso.to_screen((c["tp"] as Vector2) + Vector2(cos(an), sin(an)) * rr)
				var q := Vector2(roundf(p.x / PX + sin(t + i) * 2.0), roundf(p.y / PX - 40.0 * (1.0 - ph))) * PX
				draw_rect(Rect2(q, Vector2(PX, PX)), Color(Color("#dde6f4"), 0.5 * sin(ph * PI) * nk))

## what is laid on as light: the shafts, the dawn rays, the fireflies' glow
func _draw_add() -> void:
	if zone == null or not is_instance_valid(zone):
		return
	var vs := _vs()
	var xf := _xf()
	var dk := Game.day_k() if outdoor else 0.0
	# the vault shafts (laid on with screen: a light that brightens, never darkens)
	for s in _shaft_tiles(xf, vs):
		var p: Vector2 = xf * Iso.to_screen(Vector2(s[0] + 0.5, s[1] + 0.5))
		var tex := shaft_tex()
		add.draw_texture_rect(tex, Rect2(((p / PX).round() + Vector2(-12, -150 + 4)) * PX, Vector2(64, 150) * PX), false, Color(1, 1, 1, 0.6 * s[2]))
		for i in 4:
			var k := fmod(t * 0.08 + i * 0.27 + s[0] * 0.1, 1.0)
			var mp := (p / PX).round() + Vector2(36.0 - k * 34.0 + sin(i * 5.0) * 4.0, -146.0 + k * 140.0)
			add.draw_rect(Rect2(mp.round() * PX, Vector2(PX, PX)), Color(Color("#eef0ff"), 0.6 * sin(k * PI)))
	# dawn: long low rays through the trees (the dusk's are red: left out)
	if outdoor and Game.hour_name() == "dawn":
		var k := sin((Game.phase() - 0.9) / 0.1 * PI)
		var r := rays_tex()
		for i in 3:
			var x := roundf((480.0 * 0.12 + i * 480.0 * 0.3 + sin(t * 0.13 + i) * 18.0) - fmod(last_cam.x / PX * 0.3, 60.0))
			add.draw_texture_rect(r, Rect2(Vector2(x, -10) * PX, r.get_size() * PX), false, Color(1, 1, 1, 0.5 * k * (0.7 + 0.3 * sin(t * 0.4 + i * 2.0))))
	if kind == "fen":
		for m in motes:
			var fade := minf(1.0, minf(m["t"] / 0.6, (m["life"] - m["t"]) / 0.8))
			var b := 0.5 + 0.5 * sin(t * 3.0 + m["s"])
			var p: Vector2 = ((m["p"] as Vector2) / PX).round() * PX
			var g := Flame.dither_glow(4, Color8(150, 255, 110))
			add.draw_texture_rect(g, Rect2(p - Vector2(4, 4) * PX, g.get_size() * PX), false, Color(1, 1, 1, 0.5 * b * fade * (1.2 - dk * 0.6)))
	# light through the canopy: long pale shafts slanting down, world-anchored and drifting, dust turning in them
	if woods and dk >= 0.25 and not Settings.fewer_fx:
		var a0 := 0.11 * minf(1.0, (dk - 0.25) / 0.4)
		var span := 190.0
		var camx := (xf.affine_inverse() * Vector2.ZERO).x / PX
		var off := fmod(fmod(camx * 0.9, span) + span, span)
		var VH := vs.y / PX
		for i in range(-2, 5):
			var x0 := i * span - off + 60.0 + sin(t * 0.13 + i) * 6.0
			var w := 22.0 + float(posmod(posmod(i * 37, 3) + 3, 3)) * 12.0
			var br := 0.7 + 0.3 * sin(t * 0.21 + i * 1.7)
			var c0 := Color(244 / 255.0, 232 / 255.0, 200 / 255.0, a0 * br)
			var c1 := Color(244 / 255.0, 232 / 255.0, 200 / 255.0, 0.0)
			var pts := PackedVector2Array([Vector2(x0, -10), Vector2(x0 + w, -10), Vector2(x0 + w + 110, VH + 10), Vector2(x0 + 110, VH + 10)])
			for k in pts.size():
				pts[k] *= PX
			add.draw_polygon(pts, PackedColorArray([c0, c0, c1, c1]))
			for n in 6:
				var u := fmod(t * 0.05 + n * 0.19 + i * 0.3, 1.0)
				var px := x0 + w * 0.5 + u * 110.0 + sin(t * 0.7 + n) * 4.0
				var py := -10.0 + u * (VH + 20.0)
				add.draw_rect(Rect2(Vector2(roundf(px), roundf(py)) * PX, Vector2(PX, PX)), Color(Color("#f6ecd2"), 0.5 * sin(u * PI) * dk))
