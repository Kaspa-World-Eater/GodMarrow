class_name Lights
extends RefCounted
## Soft light textures made once and shared.

static var _cache := {}

static func radial(size: int) -> Texture2D:
	if _cache.has(size):
		return _cache[size]
	var g := Gradient.new()
	g.set_color(0, Color(1, 1, 1, 1))
	g.set_color(1, Color(1, 1, 1, 0))
	g.add_point(0.35, Color(1, 1, 1, 0.55))
	g.add_point(0.7, Color(1, 1, 1, 0.12))
	var t := GradientTexture2D.new()
	t.gradient = g
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	t.width = size
	t.height = size
	_cache[size] = t
	return t

## the lantern's pool: a bright core, three stepped rings, a faint ring at the edge (the web's dark layer, v64/v76)
static func pool(size: int) -> Texture2D:
	var key := "pool%d" % size
	if _cache.has(key):
		return _cache[key]
	var img := Image.create(size, size, false, Image.FORMAT_RGBA8)
	var c := size * 0.5
	for y in size:
		for x in size:
			var r := Vector2(x + 0.5 - c, y + 0.5 - c).length() / c
			var v := 0.0
			if r < 0.3:
				v = 1.0
			elif r < 0.5:
				v = 0.78
			elif r < 0.68:
				v = 0.56
			elif r < 0.84:
				v = 0.34
			elif r < 0.9:
				v = 0.2
			elif r < 1.0:
				v = 0.08 * (1.0 - (r - 0.9) / 0.1)
			# soften each step's edge a little so the rings read without hard aliasing
			img.set_pixel(x, y, Color(1, 1, 1, v))
	var t := ImageTexture.create_from_image(img)
	_cache[key] = t
	return t

## a lantern or fire light that breathes and flickers a little
static func flicker(parent: Node, pos: Vector2, col: Color, energy: float, scale: float, shadows: bool = false) -> PointLight2D:
	var l := PointLight2D.new()
	l.texture = radial(512)
	l.color = col
	l.energy = energy
	l.texture_scale = scale
	l.position = pos
	l.shadow_enabled = shadows
	l.shadow_filter = Light2D.SHADOW_FILTER_PCF5
	l.shadow_color = Color(0, 0, 0, 0.75)
	l.set_script(load("res://scripts/flicker.gd"))
	parent.add_child(l)
	return l
