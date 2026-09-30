class_name Foreground
extends CanvasLayer
## The near dark (wiki 06 §3, principle 9: "dark foreground, lit midground, glimmering background"). Things between the
## eye and the pilgrim: grass, reeds and dead branches on the moor and in the woods, broken stone and fallen columns under
## the ground. They stand nearer than the world, so they slide past faster than it (parallax), and they are only ever seen
## at the frame's edges and foot, never over the pilgrim. They are almost black; only the edge the light finds is picked
## out (the key from the upper left), coloured by whatever light is near (the dark layer's light_at). Grass, reeds and
## branches lean in the wind like everything else.

const WPX := 4.0
const PAR := 1.45              # how much nearer than the world they stand (screen motion ×PAR)
const BODY := Color8(9, 9, 13)
const MID := Color8(17, 17, 23)
const RIM := Color8(50, 51, 59)
var zone: Zone
var hero: Hero
var dark: DarkLayer
var anchors: Array = []        # {tp, kind, tex}
var pool: Array = []           # Sprite2D
var mats := {}
var texs := {}                 # kind -> Array[Texture2D] (instance cache)

func _ready() -> void:
	layer = 7

func bind(z: Zone, h: Hero, d: DarkLayer) -> void:
	zone = z
	hero = h
	dark = d
	anchors.clear()
	for s in pool:
		s.visible = false
	var kinds := _kinds()
	if kinds.is_empty():
		return
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(zone.id) ^ 0x5eed
	var n := int(zone.w * zone.h / 10.0)
	for i in n:
		var tp := Vector2(rng.randf() * zone.w, rng.randf() * zone.h)
		var kind: String = _pick(kinds, rng)
		var tset: Array = _texset(kind)
		anchors.append({"tp": tp, "kind": kind, "tex": tset[rng.randi() % tset.size()], "flip": rng.randf() < 0.5})

## what grows (or lies) near the eye here, with weights
func _kinds() -> Dictionary:
	var s: String = str(zone.d.get("theme", "")) + " " + zone.id
	if zone.d.get("town", false) or s.contains("town") or s.contains("camp"):
		return {"grass": 1.0}
	if zone.d.get("outdoor", false):
		if s.contains("fen") or s.contains("marsh") or s.contains("mire"):
			return {"reeds": 0.55, "grass": 0.37, "branch": 0.08}
		if s.contains("wood") or s.contains("grove") or s.contains("forest"):
			return {"grass": 0.55, "reeds": 0.1, "branch": 0.2, "trunk": 0.15}
		return {"grass": 0.6, "reeds": 0.15, "branch": 0.25}
	return {}   # under the ground the rooms are close enough already: nothing stands between the eye and the pilgrim

func _pick(k: Dictionary, rng: RandomNumberGenerator) -> String:
	var tot := 0.0
	for v in k.values():
		tot += float(v)
	var r := rng.randf() * tot
	for key in k:
		r -= float(k[key])
		if r <= 0.0:
			return key
	return k.keys()[0]

func _mat(kind: String) -> ShaderMaterial:
	if kind == "rubble" or kind == "column" or kind == "trunk":
		return null
	if not mats.has(kind):
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/sway.gdshader")
		m.set_shader_parameter("amp", {"grass": 7.0, "reeds": 12.0, "branch": 6.0}[kind])
		m.set_shader_parameter("speed", {"grass": 2.0, "reeds": 1.6, "branch": 0.9}[kind])
		mats[kind] = m
	return mats[kind]

func _process(_dt: float) -> void:
	if zone == null or hero == null or not is_instance_valid(hero) or anchors.is_empty():
		return
	var vp := get_viewport()
	var vs := vp.get_visible_rect().size
	var c2 := vp.get_camera_2d()
	if c2 == null:
		return
	var cc := c2.get_screen_center_position()
	var zm := c2.zoom.x
	for m in mats.values():
		m.set_shader_parameter("wind", Game.wind)
	var used := 0
	for a in anchors:
		var s: Vector2 = vs * 0.5 + (Iso.to_screen(a["tp"]) - cc) * zm * PAR
		var tex: Texture2D = a["tex"]
		var tw := tex.get_width() * WPX
		var th := tex.get_height() * WPX
		if s.x < -tw or s.x > vs.x + tw or s.y < 0.0 or s.y > vs.y + th:
			continue
		var xs := s.x / vs.x
		var ys := s.y / vs.y
		# only at the frame's edges and foot: never over the pilgrim
		var side := maxf(1.0 - smoothstep(0.12, 0.18, xs), smoothstep(0.82, 0.88, xs)) * smoothstep(0.3, 0.45, ys)
		var foot := smoothstep(0.8, 0.85, ys)
		var tall: bool = a["kind"] == "trunk" or a["kind"] == "branch" or a["kind"] == "column"
		var k := side if tall else maxf(side, foot)
		if k < 0.03:
			continue
		var sp: Sprite2D
		if used < pool.size():
			sp = pool[used]
		else:
			sp = Sprite2D.new()
			sp.centered = false
			sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			sp.scale = Vector2.ONE * WPX
			add_child(sp)
			pool.append(sp)
		used += 1
		sp.visible = true
		sp.texture = tex
		sp.material = _mat(a["kind"])
		sp.flip_h = a["flip"]
		sp.position = Vector2(roundf(s.x - tw * 0.5), roundf(s.y - th))
		# the rim takes the colour of the light near it; the body stays near black
		var la: Array = dark.light_at(s) if dark else [0.3, Color(0.62, 0.66, 0.78)]
		var lum: float = la[0]
		var col: Color = la[1]
		var g := 0.3 + 1.1 * lum
		sp.modulate = Color(col.r * g, col.g * g, col.b * g, k)
	for i in range(used, pool.size()):
		pool[i].visible = false

# ------------------------------------------------------------------ the shapes (drawn at world grain, then ×4)

func _texset(kind: String) -> Array:
	if texs.has(kind):
		return texs[kind]
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(kind) + 71
	var out: Array = []
	for i in 6:
		var img: Image
		match kind:
			"grass": img = _grass(rng)
			"reeds": img = _reeds(rng)
			"branch": img = _branch(rng)
			"trunk": img = _trunk(rng)
			"rubble": img = _rubble(rng)
			_: img = _column(rng)
		_rim(img)
		out.append(ImageTexture.create_from_image(img))
	texs[kind] = out
	return out

func _blank(w: int, h: int) -> Image:
	var img := Image.create(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	return img

func _put(img: Image, x: int, y: int, c: Color) -> void:
	if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
		img.set_pixel(x, y, c)

## the key light from the upper left finds the top and left edge of every shape
func _rim(img: Image) -> void:
	var w := img.get_width()
	var h := img.get_height()
	var rim: Array = []
	for y in h:
		for x in w:
			if img.get_pixel(x, y).a < 0.5:
				continue
			# thin things (a blade, a twig) keep only their tip; thick ones take the light along their upper-left edge
			var up := y == 0 or img.get_pixel(x, y - 1).a < 0.5
			var left := x == 0 or img.get_pixel(x - 1, y).a < 0.5
			var right_full := x + 1 < w and img.get_pixel(x + 1, y).a >= 0.5 and x + 2 < w and img.get_pixel(x + 2, y).a >= 0.5
			if (up and (right_full or left == false)) or (up and y > 0 and _tip(img, x, y)) or (left and right_full and (x + y) % 3 != 0):
				rim.append(Vector2i(x, y))
	for p in rim:
		img.set_pixel(p.x, p.y, RIM)

func _tip(img: Image, x: int, y: int) -> bool:
	# the top pixel of a thin stroke: nothing above it or beside above it
	for dx in [-1, 0, 1]:
		var xx: int = x + dx
		if xx >= 0 and xx < img.get_width() and img.get_pixel(xx, y - 1).a >= 0.5:
			return false
	return true

func _grass(rng: RandomNumberGenerator) -> Image:
	var w := rng.randi_range(40, 70)
	var h := rng.randi_range(18, 34)
	var img := _blank(w, h)
	for x in w:
		if rng.randf() > 0.72:
			continue
		var u := float(x) / float(w) * 2.0 - 1.0
		var bh := int(h * rng.randf_range(0.35, 1.0) * (1.0 - u * u * 0.6))
		var lean := rng.randf_range(-0.5, 0.5)
		for y in bh:
			var px := x + int(round(lean * float(y * y) / float(maxi(1, bh))))
			_put(img, px, h - 1 - y, BODY if rng.randf() < 0.85 else MID)
	for x in range(int(w * 0.1), int(w * 0.9)):
		_put(img, x, h - 1, BODY)
		_put(img, x, h - 2, BODY)
	return img

func _reeds(rng: RandomNumberGenerator) -> Image:
	var w := rng.randi_range(24, 40)
	var h := rng.randi_range(50, 80)
	var img := _blank(w, h)
	for i in rng.randi_range(6, 11):
		var x0 := rng.randi_range(3, w - 4)
		var bh := int(h * rng.randf_range(0.55, 1.0))
		var lean := rng.randf_range(-0.25, 0.25)
		var top := Vector2i.ZERO
		for y in bh:
			var px := x0 + int(round(lean * float(y * y) / float(bh)))
			_put(img, px, h - 1 - y, BODY)
			top = Vector2i(px, h - 1 - y)
		if rng.randf() < 0.6:   # a seed head
			for yy in 5:
				_put(img, top.x, top.y + yy, BODY)
				_put(img, top.x + 1, top.y + 1 + yy, BODY)
	for x in range(2, w - 2):
		if rng.randf() < 0.8:
			for y in rng.randi_range(2, 6):
				_put(img, x, h - 1 - y, BODY)
	return img

func _branch(rng: RandomNumberGenerator) -> Image:
	var w := 120
	var h := 160
	var img := _blank(w, h)
	var x0 := float(rng.randi_range(45, 75))
	_limb(img, rng, Vector2(x0, h - 1), deg_to_rad(-90.0 + rng.randf_range(-22, 22)), 7.0, 0)
	return img

func _limb(img: Image, rng: RandomNumberGenerator, p: Vector2, ang: float, th: float, depth: int) -> void:
	var ln := rng.randf_range(12.0, 24.0) * (1.0 - depth * 0.1)
	var steps := int(ln)
	for i in steps:
		ang += rng.randf_range(-0.12, 0.12)
		p += Vector2(cos(ang), sin(ang))
		var r := th * 0.5
		for dy in range(-int(ceil(r)), int(ceil(r)) + 1):
			for dx in range(-int(ceil(r)), int(ceil(r)) + 1):
				if Vector2(dx, dy).length() <= maxf(0.5, r):
					_put(img, int(round(p.x)) + dx, int(round(p.y)) + dy, BODY)
	if depth >= 6 or th < 0.8:
		return
	var n := 2 if rng.randf() < 0.75 else 3
	for j in n:
		var da := rng.randf_range(0.3, 0.7) * (-1.0 if j % 2 == 0 else 1.0)
		_limb(img, rng, p, ang + da, th * 0.66, depth + 1)

## a great dead trunk passing close: taller than the frame, a few stubs and one torn limb
func _trunk(rng: RandomNumberGenerator) -> Image:
	var w := 90
	var h := 300
	var img := _blank(w, h)
	var tw := rng.randf_range(24.0, 36.0)
	var lean := rng.randf_range(-0.06, 0.06)
	var cx := w * 0.5
	for y in h:
		var yy := h - 1 - y
		var wd := tw * (1.0 - float(y) / float(h) * 0.35) + (10.0 * pow(maxf(0.0, 1.0 - float(y) / 18.0), 2.0))   # the root flare
		var x0 := cx + lean * y - wd * 0.5
		for x in int(wd):
			var groove := (x % 7 == 3) and rng.randf() < 0.8
			_put(img, int(x0) + x, yy, MID if groove else BODY)
	for i in rng.randi_range(2, 4):
		var y := rng.randi_range(80, 260)
		var side := -1.0 if rng.randf() < 0.5 else 1.0
		var at := Vector2(cx + lean * y + side * tw * 0.3, h - 1 - y)
		_limb(img, rng, at, deg_to_rad(-90.0 + side * rng.randf_range(35, 65)), rng.randf_range(4.0, 7.0), 2)
	return img

func _rubble(rng: RandomNumberGenerator) -> Image:
	var w := rng.randi_range(50, 80)
	var h := rng.randi_range(20, 36)
	var img := _blank(w, h)
	for i in rng.randi_range(3, 6):
		var bw := rng.randi_range(10, 26)
		var bh := rng.randi_range(4, h - 2)
		var bx := rng.randi_range(0, w - bw)
		for x in bw:
			var top := bh - int(abs(sin(x * 0.9 + i))) * rng.randi_range(0, 2)
			for y in top:
				_put(img, bx + x, h - 1 - y, BODY if rng.randf() < 0.9 else MID)
	return img

func _column(rng: RandomNumberGenerator) -> Image:
	var w := rng.randi_range(22, 30)
	var h := rng.randi_range(120, 200)
	var img := _blank(w + 8, h)
	for x in w:
		var broken := h - rng.randi_range(0, 6) - (4 if x * 2 > w else 0)
		for y in broken:
			_put(img, 4 + x, h - 1 - y, MID if (x % 4 == 1 and rng.randf() < 0.9) else BODY)
	# the plinth
	for x in w + 8:
		for y in 4:
			_put(img, x, h - 1 - y, BODY)
	return img
