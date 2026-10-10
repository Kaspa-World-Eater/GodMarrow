extends Node2D
## A title stage: "the Seer's Bowl". The old web title's chapel (zp_title.js), captured whole (tools/cap_chapel2.js ->
## art/ui/title_bowl.png, 480x270 shown x4): the dead god's stone face sunk in the wall, weeping blood into a tarnished
## bronze bowl. A drop swells on the chin and falls; rings spread in the blood and bend the reflection of whoever looks
## down into it (shaders/title_blood.gdshader); the god's dying breath spills over the altar (title_breath.gdshader);
## candles gutter, embers rise, ash falls.
## The stage API (ui/title.gd): order_at(p), label_at(i), hint(); T is the title (mode, fig_hover, order_i, t).

const K := 4.0   # a chapel px in screen px: the captured painting is 480 x 270 shown x4  # 2x2-ok: the chapel's coordinate unit (and its painting's grain until it is re-baked at 960 x 540), not an effect's cell
const AP := 2.0   # the art pixel: the 2 x 2 grid (MASTER_RULES 3.7); every live effect here is drawn in it
const MARROW := Color("#c9974a")
const CARDS := []   # Derek 2026-10-05: "Remove the cards. They were never a good fit."
const SHIFT := -100.0
const CW := 21.0
const CH := 33.0

var T
var fx: Node2D
var fx_back: Node2D
var add_fx: Node2D
var add_big: Node2D
var grain: ColorRect           # the film grain, in art pixels (an inline shader: 960 x 540 cells over the screen)
var lit: ColorRect              # the live-lit chapel, or null (then the captured painting stands)
var dust: Array = []           # specks in the cold shaft, seen only where it catches them
var _w := Vector4.ONE
var _w4 := 1.0
var cand: Array = []           # the web's candles: [x, base y, height, width] in chapel px
var blood: ColorRect
var breath: ColorRect
var cards: Array = []
var rings: Array = []
var drops: Array = []
var sparks: Array = []
var motes: Array = []
var candles: Array = []
var drop_t := 1.4
var chin := Vector2.ZERO
var _glow: Texture2D

func hint() -> String:
	return ""

func _ready() -> void:
	_glow = Lights.radial(128)
	var bg := TextureRect.new()
	bg.texture = load("res://art/ui/title_bowl.png")
	bg.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.size = Vector2(1920, 1080)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	# the web moves the chapel so the face stands in the middle (zz_title54.js:11, SHIFT -100) and fills the strip it
	# never painted on the right with its own left side, mirrored about the face, laid in with a stepped cross-fade
	position.x = SHIFT * K
	var mir := Node2D.new()
	mir.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	mir.draw.connect(_draw_mirror.bind(mir, bg.texture))
	add_child(mir)
	# the chapel lit live (shaders/title_chapel.gdshader): the candles' flicker and the wind truly light the god's face
	lit = _lit_chapel()
	if lit:
		bg.visible = false
		mir.visible = false
		add_child(lit)
		move_child(lit, 0)
	var meta = JSON.parse_string(FileAccess.get_file_as_string("res://art/ui/title_bowl.json"))
	var pal := PackedVector3Array()
	if meta is Dictionary:
		for c in meta.get("candles", []):
			candles.append(Vector2(float(c[0]), float(c[1]) - float(c[2])) * K + Vector2(2, -2))
			cand.append(c)
		var f: Array = meta.get("face", [340, 64, 125])
		chin = Vector2(float(f[0]) - 1.0, float(f[2]))
		for c in meta.get("blood", []):
			pal.append(Vector3(c[0], c[1], c[2]) / 255.0)
	blood = ColorRect.new()
	blood.position = Vector2(340 - 75 - 1, 202 - 32 - 1) * K
	blood.size = Vector2(152, 66) * K
	blood.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var bm := ShaderMaterial.new()
	bm.shader = load("res://shaders/title_blood.gdshader")
	bm.set_shader_parameter("refl", load("res://art/ui/title_refl.png"))
	bm.set_shader_parameter("pal", pal)
	blood.material = bm
	add_child(blood)
	fx_back = Node2D.new()
	fx_back.draw.connect(_draw_back)
	add_child(fx_back)
	breath = ColorRect.new()
	breath.position = Vector2(210, 94) * K
	breath.size = Vector2(260, 176) * K
	breath.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var brm := ShaderMaterial.new()
	brm.shader = load("res://shaders/title_breath.gdshader")
	breath.material = brm
	add_child(breath)
	var back: Texture2D = load("res://art/reading/cards/_back.png")
	for c in CARDS:
		var tex: Texture2D = back if c[0] < 0 else load("res://art/reading/cards/%s.png" % c[1])
		cards.append({"o": c[0], "at": (c[2] as Vector2) * K, "rot": c[3], "lift": 0.0, "tex": tex, "ph": randf() * TAU})
	# the web's order (zp_title.js drawTitleScene): the big candle glows and the blood's red bounce, added; the flames;
	# the small glows round each flame and the embers and ash, added; the film grain over all
	add_big = Node2D.new()
	add_big.material = _add_mat()
	add_big.draw.connect(_draw_add_big)
	add_child(add_big)
	fx = Node2D.new()
	fx.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	fx.draw.connect(_draw_fx)
	add_child(fx)
	add_fx = Node2D.new()
	add_fx.material = _add_mat()
	add_fx.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_fx.draw.connect(_draw_add)
	add_child(add_fx)
	grain = ColorRect.new()
	grain.position.x = -SHIFT * K
	grain.size = Vector2(1920, 1080)
	grain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var gs := Shader.new()
	gs.code = GRAIN_SHADER
	var gm := ShaderMaterial.new()
	gm.shader = gs
	grain.material = gm
	add_child(grain)
	_glow = _linear_glow()

func _process(dt: float) -> void:
	Gust.step(dt)
	var t: float = T.t
	for c in cards:
		var want := 1.0 if c["o"] >= 0 and (T.mode == "main" or T.mode == "order") and (T.fig_hover == c["o"] or T.order_i == c["o"]) else 0.0
		c["lift"] = lerpf(c["lift"], want, minf(1.0, dt * 7.0))
	drop_t -= dt
	if drop_t <= 0.0:
		drop_t = randf_range(1.8, 4.2)
		drops.append({"x": chin.x, "y": chin.y + 1.0, "ty": 202.0 - 4.0 + randf() * 10.0, "v": 10.0})
	for d in drops:
		d["v"] += 380.0 * dt
		d["y"] += d["v"] * dt
		if d["y"] >= d["ty"]:
			d["done"] = true
			rings.append({"x": d["x"], "y": d["ty"], "r": 0.0, "t": 0.0})
			for k in 6:
				sparks.append({"x": d["x"], "y": d["ty"], "vx": (randf() - 0.5) * 34.0, "vy": -34.0 - randf() * 34.0, "t": 0.0})
			if randf() < 0.7:
				Sfx.play("glass", 0.08, randf_range(2.0, 2.4))
	drops = drops.filter(func(d): return not d.get("done", false))
	for r in rings:
		r["t"] += dt
		r["r"] += dt * 14.0 / (1.0 + r["t"] * 0.6)
	rings = rings.filter(func(r): return r["t"] < 3.4)
	for sp in sparks:
		sp["t"] += dt
		sp["vy"] += 260.0 * dt
		sp["x"] += sp["vx"] * dt
		sp["y"] += sp["vy"] * dt
	sparks = sparks.filter(func(sp): return sp["t"] < 0.35)
	var ra := []
	for i in 8:
		ra.append(Vector4(rings[i]["x"], rings[i]["y"], rings[i]["r"], rings[i]["t"]) if i < rings.size() else Vector4(0, 0, 0, -1))
	(blood.material as ShaderMaterial).set_shader_parameter("rings", ra)
	(blood.material as ShaderMaterial).set_shader_parameter("time", t)
	(breath.material as ShaderMaterial).set_shader_parameter("time", t)
	if motes.size() < 46 and randf() < dt * 9.0:
		if randf() < 0.55 and not candles.is_empty():
			var c: Vector2 = candles[randi() % candles.size()] / K
			motes.append({"x": c.x, "y": c.y - 2.0, "vx": randf_range(-2, 2), "vy": -8.0 - randf() * 10.0, "t": 0.0, "life": 1.4 + randf() * 2.2, "ember": true})
		else:
			motes.append({"x": 290.0 + randf() * 120.0, "y": -2.0, "vx": randf_range(-1, 2), "vy": 3.0 + randf() * 4.0, "t": 0.0, "life": 20.0, "ember": false})
	for m in motes:
		m["t"] += dt
		m["x"] += (m["vx"] + sin(t * 1.3 + m["y"] * 0.1) * (3.0 if m["ember"] else 1.5) + Gust.dir() * Gust.k() * (26.0 if m["ember"] else 12.0)) * dt
		m["y"] += m["vy"] * dt
	motes = motes.filter(func(m): return m["t"] < m["life"] and m["y"] < 272.0 and m["y"] > -4.0)
	_light_w()
	# dust turning in the cold shaft from high on the left (the shaft: zp_title.js ttBuildShaft)
	while dust.size() < 34:
		dust.append({"x": randf_range(250.0, 420.0), "y": randf_range(-10.0, 200.0), "ph": randf() * TAU, "v": randf_range(1.5, 4.0)})
	for dd in dust:
		dd["ph"] += dt * 0.6
		dd["y"] += dd["v"] * dt
		dd["x"] += (sin(dd["ph"]) * 1.2 + Gust.dir() * Gust.k() * 9.0 - 0.6) * dt
		if dd["y"] > 230.0 or dd["x"] < 200.0 or dd["x"] > 470.0:
			dd["y"] = randf_range(-10.0, 20.0)
			dd["x"] = randf_range(280.0, 420.0)
	fx.queue_redraw()
	fx_back.queue_redraw()
	add_fx.queue_redraw()
	add_big.queue_redraw()
	(grain.material as ShaderMaterial).set_shader_parameter("frame", float(int(floorf(t * 14.0)) % 4))

func _snap(p: Vector2) -> Vector2:
	return Vector2(floorf(p.x / K) * K, floorf(p.y / K) * K)

func _card_xform(c: Dictionary) -> Transform2D:
	var L: float = c["lift"]
	return Transform2D(lerpf(c["rot"], 0.0, L), Vector2(CW * K / 54.0, CH * K * lerpf(0.55, 1.0, L) / 84.0), 0.0, c["at"] + Vector2(0, -70.0 * L))

const STONE := ["#030204", "#070609", "#0c0a0d", "#121014", "#1a1619", "#231d1d", "#2e2521", "#3c3027", "#4e3d2e", "#654e37", "#826443", "#a27f52"]

func _layer(name: String) -> Texture2D:
	var raw := FileAccess.get_file_as_bytes("res://art/ui/title_light/%s.bin.gz" % name)
	if raw.is_empty():
		return null
	var data := raw.decompress(480 * 270 * 16, FileAccess.COMPRESSION_GZIP)
	if data.size() != 480 * 270 * 16:
		return null
	return ImageTexture.create_from_image(Image.create_from_data(480, 270, false, Image.FORMAT_RGBAF, data))

func _lit_chapel() -> ColorRect:
	var mats := {}
	for n in ["kA", "kB", "kC", "kD", "kE"]:
		var t := _layer(n)
		if t == null:
			return null
		mats[n] = t
	var ov := Image.load_from_file(ProjectSettings.globalize_path("res://art/ui/title_light/over.png"))
	if ov == null:
		return null
	var r := ColorRect.new()
	r.position = Vector2(-SHIFT * K, 0)
	r.size = Vector2(1920, 1080)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/title_chapel.gdshader")
	for n in mats:
		m.set_shader_parameter(n, mats[n])
	m.set_shader_parameter("over", ImageTexture.create_from_image(ov))
	var pal := PackedVector3Array()
	for c in STONE:
		var cc := Color(c)
		pal.append(Vector3(cc.r, cc.g, cc.b))
	m.set_shader_parameter("stone", pal)
	r.material = m
	return r

## each light's strength this frame: the clusters breathe with their candles and sink in a gust, the blood's glow
## swells slowly, the front stubs flicker on their own
func _light_w() -> void:
	if lit == null:
		return
	var t: float = T.t
	var m: ShaderMaterial = lit.material
	# eased, so the stone breathes with the flames rather than sparkling with every flicker
	var want := Vector4(0.9 + 0.2 * _fl(1), 0.9 + 0.2 * _fl(2), 1.0 + 0.08 * sin(t * 0.55), 0.85 + 0.3 * _fl(11))
	var e := minf(1.0, get_process_delta_time() * 6.0)
	_w = _w.lerp(want, e)
	_w4 = lerpf(_w4, 0.85 + 0.3 * _fl(12), e)
	m.set_shader_parameter("w03", _w)
	m.set_shader_parameter("w4", _w4)

## the web's hash (b_core.js), so the grain falls where it fell there
static func whash(x: int, y: int) -> float:
	var h := (x * 374761393 + y * 668265263) & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	return float((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967295.0

func _add_mat() -> CanvasItemMaterial:
	var m := CanvasItemMaterial.new()
	m.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return m

## the web's glow(): a radial gradient from the colour at its middle to nothing at r, linear
func _linear_glow() -> Texture2D:
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 0.5)
	gt.width = 256
	gt.height = 256
	return gt

func _fl(s: float) -> float:
	var t: float = T.t
	# a gust makes every flame flicker faster and dip (Gust: the one wind)
	var g := Gust.k()
	var f := 0.5 + 0.5 * sin(t * (9.0 + 14.0 * g) + s) * sin(t * (5.3 + 9.0 * g) + s * 2.0)
	return f * (1.0 - 0.45 * g)

func _glow_at(n: CanvasItem, x: float, y: float, r: float, rgb: Color, a: float) -> void:
	n.draw_texture_rect(_glow, Rect2((x - r) * K, (y - r) * K, r * 2.0 * K, r * 2.0 * K), false, Color(rgb.r * a, rgb.g * a, rgb.b * a, 1.0))

## a candle's flame (zp_title.js ttDrawFlame): a dark tongue, an orange body leaning with the draught, a hot core,
## a blue root
func _flame(n: CanvasItem, cx: float, top: float, k: float, seed: float) -> void:
	var t: float = T.t
	var fy := top - 2.0
	var g := Gust.k()
	# the breeze lays the flame over and shortens it; in a hard gust its core gutters out for a moment
	var lean := roundf(sin(t * 5.0 + seed) * 0.8 + k * 0.4 + Gust.dir() * g * (2.2 + sin(t * 13.0 + seed) * 0.8))
	var tall := 3.0 + (1.0 if sin(t * 11.0 + seed * 3.0) > 0.3 else 0.0) - roundf(g * 1.6)
	var gutter := g > 0.55 and sin(t * 17.0 + seed * 5.0) > 0.4
	# drawn in art pixels (the web's flame at twice the grain): a rounded dark halo, a body that narrows to a one-pixel
	# tip on the lean side, a pointed core, a blue root
	var o := (Vector2(cx, fy) * K / AP).round() * AP
	var l := lean * 2.0
	var T2 := tall * 2.0
	var tip := l + (1.0 if lean > 0.0 else 0.0)
	var dark := Color("#7a2a10")
	var body := Color("#d0601c")
	_a(n, o, tip, -T2 - 2.0, 1, 1, dark); _a(n, o, l, -T2 - 1.0, 2, 1, dark)
	_a(n, o, -1, -4, 4, 1, dark); _a(n, o, -2, -3, 6, 4, dark); _a(n, o, -1, 1, 4, 1, dark)
	_a(n, o, tip, -T2, 1, 1, body); _a(n, o, l, -T2 + 1.0, 2, T2 - 1.0, body)
	_a(n, o, 0, -4, 2, 6, body)
	if not gutter:
		_a(n, o, 0, -2, 1, 1, Color("#ffc070")); _a(n, o, 0, -1, 2, 3, Color("#ffc070"))
	_a(n, o, 0, 2, 2, 1, Color("#2a3080")); _a(n, o, 0, 3, 1, 1, Color("#2a3080"))

## a rect of art pixels at o (screen px), x y w h counted in art pixels
func _a(n: CanvasItem, o: Vector2, x: float, y: float, w: float, h: float, c: Color) -> void:
	n.draw_rect(Rect2(o + Vector2(x, y) * AP, Vector2(w, h) * AP), c)

## a speck: a bright art pixel, its right and lower neighbours at half (the web's one 4-px pixel, shaped, not a block)
func _speck(n: CanvasItem, q: Vector2, c: Color) -> void:
	n.draw_rect(Rect2(q, Vector2(AP, AP)), c)
	var c2 := Color(c, c.a * 0.5)
	n.draw_rect(Rect2(q + Vector2(AP, 0), Vector2(AP, AP)), c2)
	n.draw_rect(Rect2(q + Vector2(0, AP), Vector2(AP, AP)), c2)

## a point in chapel px, on the art-pixel grid on screen
func _at(x: float, y: float) -> Vector2:
	return (Vector2(x, y) * K / AP).round() * AP

func _draw_fx() -> void:
	for n in cand.size():
		var c: Array = cand[n]
		_flame(fx, float(c[0]), float(c[1]) - float(c[2]), _fl(n), n * 1.7)

func _draw_back() -> void:
	# the drop swelling on the god's chin, then falling, and the crowns it throws up
	var sw := clampf(1.0 - drop_t / 2.4, 0.0, 1.0)
	var ch := _at(chin.x, chin.y)
	if sw > 0.75:   # the bead, full: dark, rounded below, the light caught low on it
		_a(fx_back, ch, 0, 0, 2, 2, Color("#5e1016"))
		_speck(fx_back, ch + Vector2(0, 2) * AP, Color("#b83026"))
	elif sw > 0.3:  # the bead, gathering
		_a(fx_back, ch, 0, 0, 2, 1, Color("#5e1016")); _a(fx_back, ch, 0, 1, 1, 1, Color("#5e1016"))
	for d in drops:
		# a thin trail widening to the drop, the drop, its lit head (in art pixels, so it falls in finer steps)
		var q := _at(d["x"], d["y"])
		_a(fx_back, q, 0, -6, 1, 4, Color("#420a10")); _a(fx_back, q, 0, -2, 2, 2, Color("#420a10"))
		_a(fx_back, q, 0, 0, 2, 3, Color("#84181c")); _a(fx_back, q, 0, 3, 1, 1, Color("#84181c"))
		_speck(fx_back, q, Color("#e8704e"))
	for sp in sparks:
		_speck(fx_back, _at(sp["x"], sp["y"]), Color("#b83026") if sp["t"] < 0.15 else Color("#5e1016"))

func _draw_add_big() -> void:
	var o := Color8(255, 120, 50)
	_glow_at(add_big, 238, 142, 80 + _fl(1) * 6, o, 0.09 + _fl(1) * 0.025)
	_glow_at(add_big, 452, 142, 80 + _fl(2) * 6, o, 0.09 + _fl(2) * 0.025)
	_glow_at(add_big, 340, 202, 95, Color8(140, 16, 20), 0.08)

func _draw_add() -> void:
	for n in cand.size():
		var c: Array = cand[n]
		_glow_at(add_fx, float(c[0]) + 0.5, float(c[1]) - float(c[2]) - 4.0, 10.0 + _fl(n) * 3.0, Color8(255, 150, 70), 0.2)
	for dd in dust:
		var bd: float = ((dd["x"] - 312.0) - (dd["y"] - 30.0) * 0.5) / 1.118
		var sa: float = clampf(1.0 - absf(bd) / 30.0, 0.0, 1.0) * clampf(1.15 - dd["y"] / 170.0, 0.0, 1.0)
		if sa > 0.08:
			_speck(add_fx, _at(dd["x"], dd["y"]), Color(0.8 * sa, 0.88 * sa, 1.0 * sa))
	for m in motes:
		var a: float = maxf(0.0, 1.0 - m["t"] / m["life"]) if m["ember"] else minf(1.0, m["t"]) * 0.5
		var p := _at(m["x"], m["y"])
		var col := Color(1.0 * a, (120.0 + floorf(a * 60.0)) / 255.0 * a, 50.0 / 255.0 * a) if m["ember"] else Color(160 / 255.0 * a * 0.5, 140 / 255.0 * a * 0.5, 120 / 255.0 * a * 0.5)
		_speck(add_fx, p, col)

## the film grain (the web's: 7% of the pixels darkened, a few warm; four frames at 14 a second), one art pixel each
const GRAIN_SHADER := """
shader_type canvas_item;
uniform float frame = 0.0;
float gh(vec2 p) {
	vec3 q = fract(vec3(p.xyx) * 0.1031);
	q += dot(q, q.yzx + 33.33);
	return fract((q.x + q.y) * q.z);
}
void fragment() {
	vec2 c = floor(UV * vec2(960.0, 540.0));   // the art pixel: 2 x 2 screen px over the 1920 x 1080 stage
	float r = gh(c + vec2(frame * 97.0, frame * 61.0 + 7.0));
	COLOR = r < 0.07 ? vec4(0.0, 0.0, 0.0, 70.0 / 255.0) : (r > 0.988 ? vec4(200.0, 170.0, 140.0, 18.0) / 255.0 : vec4(0.0));
}
"""

## the strip right of the chapel: its own left side, mirrored about the face (x 340)
func _draw_mirror(n: Node2D, tex: Texture2D) -> void:
	for i in 7:
		# a stepped cross-fade (six 2 px slices from 368), then the strip itself from 380 to the edge
		var x0 := 368.0 + i * 2.0 if i < 6 else 380.0
		var w := 2.0 if i < 6 else 100.0
		var a := (i + 1) / 7.0 if i < 6 else 1.0
		# screen x0..x0+w (the web's grid) shows the chapel at 580 - x, flipped (this stage stands at SHIFT)
		var sx := 580.0 - x0 - w
		n.draw_set_transform(Vector2((x0 - SHIFT + w) * K, 0), 0.0, Vector2(-1, 1))
		n.draw_texture_rect_region(tex, Rect2(0, 0, w * K, 270 * K), Rect2(sx, 0, w, 270), Color(1, 1, 1, a))
	n.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func order_at(p: Vector2) -> int:
	p -= position
	var best := -1
	var best_y := -INF
	for c in cards:
		if c["o"] < 0:
			continue
		var lp: Vector2 = _card_xform(c).affine_inverse() * p
		if Rect2(-30, -45, 60, 90).has_point(lp) and (c["at"].y + c["lift"] * 1000.0) > best_y:
			best_y = c["at"].y + c["lift"] * 1000.0
			best = c["o"]
	return best

func label_at(i: int) -> Vector2:
	for c in cards:
		if c["o"] == i:
			return c["at"] + Vector2(0, -300) + position
	return Vector2(1360, 500) + position
