extends Control
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
## scripts/scene.gd: the picture window. An ambient ground (scene.gdshader) with swappable environments, torches
## whose flames flicker and whose pools breathe with them, motes, fog; the thing on the bench standing in it with its
## own lights cast onto the backdrop (read from the model file's lights through `shapes still --json`); a turntable
## under the figure; a frame ruler along the bottom; a scene-light lever with three stops (off / sprite lights only
## / on). It also shows plain pictures (a painting, a tile sheet), effect strips and the compare view.

const CHUNK := 2
const ENVS := {
	"dungeon": {"pal": ["#0a090e", "#16141c", "#221f2a", "#302c3a", "#403c4c", "#5c5668"], "warm": [60, 40, 20], "sky": 0.0, "fog": 0.0, "floor": 0, "torches": 2},
	"crypt": {"pal": ["#08080a", "#101014", "#1a1a20", "#26262e", "#34343e", "#4c4c5a"], "warm": [40, 52, 48], "sky": 0.0, "fog": 0.25, "floor": 1, "torches": 2},
	"moor": {"pal": ["#0c0e0c", "#161c16", "#222c20", "#303c2c", "#42503a", "#606e54"], "warm": [70, 50, 24], "sky": 0.5, "fog": 0.35, "floor": 2, "torches": 1},
	"fen": {"pal": ["#090c0e", "#10181a", "#182628", "#203436", "#2c4646", "#3e605e"], "warm": [48, 64, 40], "sky": 0.3, "fog": 0.6, "floor": 3, "torches": 1},
	"snow": {"pal": ["#12141a", "#282c36", "#464c5a", "#6e7686", "#969eb0", "#c8cedc"], "warm": [80, 60, 40], "sky": 0.8, "fog": 0.3, "floor": 4, "torches": 1},
	"plain": {"pal": ["#2e2d32", "#3e3d42", "#4e4d52", "#5e5d62", "#6e6d72", "#7e7d82"], "warm": [0, 0, 0], "sky": 0.0, "fog": 0.0, "floor": 5, "torches": 0},
}
const ENV_ORDER := ["dungeon", "crypt", "moor", "fen", "snow", "plain"]

var env := "dungeon"
var light_mode := 2                 # 0 off, 1 sprite lights only, 2 on
var mode := "empty"                 # empty | still | frames | picture | strip | compare | text | tiles
var t := 0.0
var fl1 := 1.0
var fl2 := 1.0
var rng := RandomNumberGenerator.new()
var motes: Array = []
var ground: ColorRect
var mat: ShaderMaterial
var reduced_motion := false
# what stands on the bench
var still_tex: Texture2D = null
var still_anchor := Vector2(0, 0)   # the foot point in picture pixels
var frames: Array = []              # Texture2D per frame
var frame_fps := 12.0
var frame_t := 0.0
var frame_i := 0
var playing := true
var ground_y := 0.0                 # the ground row in the frames
var axis_x := 0.0
var lights: Array = []              # [{x, y, colour, radius, strength, pulse, flame}] in picture pixels
var caption := ""
var onion := false
var picture: Texture2D = null       # a plain picture (fit, whole pixels)
var picture_zoom := 0
var strip_tex: Texture2D = null     # an effect sheet
var strip_meta := {}
var compare_left: Texture2D = null
var compare_right: Texture2D = null
var compare_zoom := 3
var text_lines: PackedStringArray = []
var tiles_tex: Texture2D = null
var tiles_meta := {}
var figure_zoom := 1                # whole numbers; a thing taller than the window stands at a half or a quarter (see figure_scale)
var figure_h := 0.0                 # the thing's painted height above its foot point, in picture pixels
var turntable := true
var ruler := true

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	rng.seed = 7
	ground = ColorRect.new()
	ground.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ground.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ground.show_behind_parent = true
	mat = ShaderMaterial.new()
	mat.shader = load("res://scripts/scene.gdshader")
	ground.material = mat
	add_child(ground)
	for m in 14:
		motes.append([rng.randf(), rng.randf(), rng.randf() * TAU])
	set_env(env)
	resized.connect(_apply_size)
	_apply_size()

func _apply_size() -> void:
	mat.set_shader_parameter("size", Vector2(floor(size.x / CHUNK), floor(size.y / CHUNK)))
	mat.set_shader_parameter("chunk", float(CHUNK))

func scene_size() -> Vector2:
	return Vector2(floor(size.x / CHUNK), floor(size.y / CHUNK))

func set_env(name: String) -> void:
	if not ENVS.has(name):
		return
	env = name
	var e: Dictionary = ENVS[name]
	for i in 6:
		mat.set_shader_parameter("pal%d" % i, Color(e["pal"][i]))
	mat.set_shader_parameter("warm", Vector3(e["warm"][0] / 255.0, e["warm"][1] / 255.0, e["warm"][2] / 255.0))
	mat.set_shader_parameter("sky", float(e["sky"]))
	mat.set_shader_parameter("fog", float(e["fog"]))
	mat.set_shader_parameter("floor_kind", int(e["floor"]))
	mat.set_shader_parameter("torches", int(e["torches"]))
	queue_redraw()

func set_light_mode(m: int) -> void:
	light_mode = clampi(m, 0, 2)
	mat.set_shader_parameter("light_mode", light_mode)
	queue_redraw()

# ------------------------------------------------------------------ what to show
func clear() -> void:
	mode = "empty"
	still_tex = null
	frames = []
	lights = []
	picture = null
	strip_tex = null
	compare_left = null
	compare_right = null
	tiles_tex = null
	caption = ""
	queue_redraw()

## one rendered picture of the thing, standing on the floor; `anchor` = its foot point; `lts` = its lights.
## The window holds one still: this one replaces whatever stood there (there is no list of sprites to pile up).
func show_still(tex: Texture2D, anchor: Vector2, lts: Array = [], cap: String = "") -> void:
	clear()
	mode = "still"
	still_tex = tex
	still_anchor = anchor
	figure_h = _painted_height(tex, anchor.y)
	lights = lts
	caption = cap

## how tall the thing stands above its foot point: the first painted row to the foot (a picture is mostly air)
static func _painted_height(tex: Texture2D, foot: float) -> float:
	if tex == null:
		return foot
	var img := tex.get_image()
	if img == null or img.is_empty():
		return foot
	var r := img.get_used_rect()
	return foot - r.position.y if r.size.y > 0 else foot

## how many figures the next draw paints in the window: one still, one frame (three with onion skin), else none
func figures() -> int:
	if mode == "still" and still_tex:
		return 1
	if mode == "frames" and not frames.is_empty():
		return 3 if onion and frames.size() > 1 else 1
	return 0

## the figure's zoom in the window: `figure_zoom`, halved while the thing stands taller than the floor line
## (a godmarrow hero is 195 px, the window 140: he stands at a half, whole, instead of cut off at the shoulders)
func figure_scale() -> float:
	var h := figure_h if mode in ["still", "frames"] else 0.0
	var room := floorf(size.y * 0.9) - 4.0
	var z := float(figure_zoom)
	while z > 0.25 and h * z > room and room > 0.0:
		z *= 0.5
	return z

## the frames of a clip, playing; ground_y / axis_x from the clip's render
func show_frames(texs: Array, fps: float, gy: float, ax: float, lts: Array = [], cap: String = "") -> void:
	clear()
	mode = "frames"
	frames = texs
	frame_fps = maxf(fps, 0.1)
	ground_y = gy
	axis_x = ax
	figure_h = _painted_height(texs[0] if not texs.is_empty() else null, gy)
	lights = lts
	caption = cap
	frame_t = 0.0
	frame_i = 0

func show_picture(tex: Texture2D, cap: String = "", zoom: int = 0) -> void:
	clear()
	mode = "picture"
	picture = tex
	picture_zoom = zoom
	caption = cap

func show_strip(tex: Texture2D, meta: Dictionary, cap: String = "") -> void:
	clear()
	mode = "strip"
	strip_tex = tex
	strip_meta = meta
	caption = cap
	frame_t = 0.0

func show_compare(left: Texture2D, right: Texture2D, cap: String = "") -> void:
	clear()
	mode = "compare"
	compare_left = left
	compare_right = right
	caption = cap

func show_text(lines: PackedStringArray, cap: String = "") -> void:
	clear()
	mode = "text"
	text_lines = lines
	caption = cap

## a tile strip laid as a small iso patch so repetition shows
func show_tiles(tex: Texture2D, meta: Dictionary, cap: String = "") -> void:
	clear()
	mode = "tiles"
	tiles_tex = tex
	tiles_meta = meta
	caption = cap

func set_frame(i: int) -> void:
	if frames.is_empty():
		return
	frame_i = posmod(i, frames.size())
	frame_t = frame_i / frame_fps
	queue_redraw()

# ------------------------------------------------------------------ time
func _process(dt: float) -> void:
	if reduced_motion:
		dt = 0.0
	t += dt
	fl1 = 0.8 + 0.25 * sin(t * 1.7) + 0.12 * sin(t * 5.3 + 1.0)
	fl2 = 0.8 + 0.25 * sin(t * 1.3 + 2.0) + 0.12 * sin(t * 4.7)
	mat.set_shader_parameter("t", t)
	mat.set_shader_parameter("fl1", fl1)
	mat.set_shader_parameter("fl2", fl2)
	if mode == "frames" and playing and not frames.is_empty():
		frame_t += dt
		frame_i = int(frame_t * frame_fps) % frames.size()
	if mode == "strip" and playing:
		frame_t += dt
	_push_lights()
	queue_redraw()

## where the sprite's own lights sit, in scene pixels, for the shader
func _push_lights() -> void:
	var origin := _sprite_origin()
	var z := figure_scale()
	var n := mini(lights.size(), 4)
	mat.set_shader_parameter("nlights", n if mode in ["still", "frames"] else 0)
	var kinds := Vector4(0, 0, 0, 0)
	for i in n:
		var li: Dictionary = lights[i]
		var p := (origin + Vector2(float(li.get("x", 0)), float(li.get("y", 0))) * z) / CHUNK
		var strength := float(li.get("strength", 1.0)) * 1.3
		var radius := maxf(float(li.get("radius", 20)) * z * 1.6, 6.0) / CHUNK
		mat.set_shader_parameter("la%d" % i, Vector4(p.x, p.y, radius, strength))
		var c := Color(str(li.get("colour", "#7dff78")))
		mat.set_shader_parameter("lc%d" % i, Vector3(c.r, c.g, c.b))
		var flame := 1.0 if bool(li.get("flame", false)) or float(li.get("pulse", 0.0)) > 0.3 else 0.0
		kinds[i] = flame
	mat.set_shader_parameter("lk", kinds)

## the sprite picture's top-left in window pixels: its foot point on the floor line, its axis on the centre
func _sprite_origin() -> Vector2:
	var floor_y := floorf(size.y * 0.9)
	var cx := floorf(size.x * 0.5)
	var z := figure_scale()
	if mode == "still" and still_tex:
		return Vector2(cx - floor(still_anchor.x * z), floor_y - floor(still_anchor.y * z))
	if mode == "frames" and not frames.is_empty():
		return Vector2(cx - floor(axis_x * z), floor_y - floor(ground_y * z))
	return Vector2(cx, floor_y)

# ------------------------------------------------------------------ drawing
func _draw() -> void:
	var w := size.x
	var h := size.y
	var cap := caption
	if mode == "picture":
		ground.visible = false
		draw_rect(Rect2(0, 0, w, h), T.WELL)
		_draw_picture(picture, Rect2(2, 2, w - 4, h - 16), picture_zoom)
	elif mode == "compare":
		ground.visible = false
		draw_rect(Rect2(0, 0, w, h), T.WELL)
		_draw_compare()
	elif mode == "text":
		ground.visible = false
		draw_rect(Rect2(0, 0, w, h), T.WELL)
		var y := 14
		for l in text_lines:
			draw_string(T.font("text"), Vector2(8, y), l, HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE, T.BONE)
			y += T.TEXT_SIZE
	elif mode == "tiles":
		ground.visible = false
		draw_rect(Rect2(0, 0, w, h), T.WELL)
		_draw_tiles()
	elif mode == "strip":
		ground.visible = true
		_draw_scene_overlay()
		_draw_strip()
	else:
		ground.visible = true
		_draw_scene_overlay()
		var z := figure_scale()
		if mode == "still" and still_tex:
			var o := _sprite_origin()
			draw_texture_rect(still_tex, Rect2(o, (still_tex.get_size() * z).floor()), false)
		elif mode == "frames" and not frames.is_empty():
			var o := _sprite_origin()
			var tex: Texture2D = frames[frame_i]
			if onion and frames.size() > 1:
				var prev: Texture2D = frames[posmod(frame_i - 1, frames.size())]
				var next: Texture2D = frames[posmod(frame_i + 1, frames.size())]
				draw_texture_rect(prev, Rect2(o, (prev.get_size() * z).floor()), false, Color(0.5, 0.7, 1.0, 0.35))
				draw_texture_rect(next, Rect2(o, (next.get_size() * z).floor()), false, Color(1.0, 0.6, 0.5, 0.35))
			draw_texture_rect(tex, Rect2(o, (tex.get_size() * z).floor()), false)
			if ruler:
				_draw_ruler()
		if z < 1.0 and cap != "":
			cap += " · at a half" if z >= 0.5 else " · at a quarter"
	if cap != "":
		var f := T.font("text")
		var cw := f.get_string_size(cap, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE).x
		draw_rect(Rect2(w - cw - 8, h - 14, cw + 6, 13), Color(T.INK, 0.8))
		draw_string(f, Vector2(w - cw - 5, h - 4), cap, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.DIM)

## the parts of the scene drawn over the shader: the torch flames, the motes and the turntable
func _draw_scene_overlay() -> void:
	var e: Dictionary = ENVS[env]
	var sw := floorf(size.x / CHUNK)
	var sh := floorf(size.y / CHUNK)
	var cy := sh * 0.42
	if turntable and mode in ["still", "frames"] and int(e["floor"]) != 5:
		var o := _sprite_origin()
		var fy := floorf(size.y * 0.9)
		var cx := floorf(size.x * 0.5)
		var rx := 46.0
		var z := figure_scale()
		if mode == "still" and still_tex:
			rx = maxf(still_tex.get_width() * z * 0.34, 30.0)
		elif mode == "frames" and not frames.is_empty():
			rx = maxf(frames[0].get_width() * z * 0.3, 30.0)
		PX.draw_disc(self, cx, fy + 2, rx, rx * 0.22, Color(e["pal"][1]), Color(e["pal"][0]), CHUNK)
		PX.draw_disc(self, cx, fy + 2, rx * 0.86, rx * 0.22 * 0.86, Color(e["pal"][2]), Color(e["pal"][1]), CHUNK)
		if o.y > 0.0:
			pass
	if light_mode == 2 and int(e["torches"]) >= 1:
		_flame(floor(sw * 0.27), floor(sh * 0.46), fl1)
	if light_mode == 2 and int(e["torches"]) >= 2:
		_flame(floor(sw * 0.73), floor(sh * 0.46), fl2)
	if int(e["floor"]) != 5:
		for m in motes.size():
			var mo: Array = motes[m]
			var mx := floorf(mo[0] * sw * 0.8 + sw * 0.1 + sin(t * 0.8 + m) * 3.0)
			var my := floorf(sh - fmod(t * 6.0 + mo[1] * sh, sh))
			if my > cy - 10 and my < sh - 2 and mx > 1 and mx < sw - 1:
				var k := 1.0 if fmod(m + t, 2.0) < 1.0 else 0.6
				draw_rect(Rect2(mx * CHUNK, my * CHUNK, CHUNK, CHUNK), Color(200 * k / 255.0, 170 * k / 255.0, 90 * k / 255.0))

func _flame(x: float, y: float, f: float) -> void:
	for k in 9:
		for i in range(-2, 3):
			var hh := int(round((7 - abs(i) * 2) * f + sin(t * 6.0 + i * 2.0) * 0.8))
			if k < hh:
				var core := i == 0 and k < 3
				var c := Color(1.0, 240 / 255.0, 180 / 255.0) if core else Color(230 / 255.0, 150 / 255.0, 60 / 255.0)
				draw_rect(Rect2((x + i) * CHUNK, (y - k) * CHUNK, CHUNK, CHUNK), c)
	# the torch's bracket under the flame
	draw_rect(Rect2((x - 1) * CHUNK, (y + 1) * CHUNK, 3 * CHUNK, CHUNK), T.D)
	draw_rect(Rect2(x * CHUNK, (y + 2) * CHUNK, CHUNK, 3 * CHUNK), T.K)

## the frame ruler along the bottom: one tick per frame, the current one lit
func _draw_ruler() -> void:
	var n := frames.size()
	if n < 2:
		return
	var w := size.x
	var span := minf(n * 6.0, w - 40.0)
	var x0 := floorf((w - span) / 2.0)
	var y := size.y - 6
	draw_rect(Rect2(x0 - 2, y - 1, span + 4, 5), Color(T.INK, 0.85))
	for i in n:
		var x := x0 + floorf(i * span / n)
		var on := i == frame_i
		draw_rect(Rect2(x, y if on else y + 1, 3 if on else 2, 3 if on else 1), T.ACCENT if on else T.DIM)

func _draw_picture(tex: Texture2D, area: Rect2, zoom: int) -> void:
	if tex == null:
		return
	var ts := tex.get_size()
	var z := minf(area.size.x / ts.x, area.size.y / ts.y)
	if z >= 1.0:
		z = floorf(z)
	if zoom > 0:
		z = minf(z, float(zoom))
	var dst := Rect2(area.position + ((area.size - ts * z) / 2.0).floor(), ts * z)
	draw_texture_rect(tex, dst, false)

func _draw_compare() -> void:
	var w := size.x
	var h := size.y
	var half := floorf(w / 2.0)
	draw_rect(Rect2(half, 0, 1, h), T.FRAME2)
	if compare_left:
		_draw_picture(compare_left, Rect2(2, 2, half - 4, h - 16), 0)
	if compare_right:
		var ts := compare_right.get_size()
		var z := clampi(compare_zoom, 1, 4)
		while z > 1 and (ts.x * z + ts.x > half - 12 or ts.y * z > h - 16):
			z -= 1
		var total: float = ts.x * z + (6.0 + ts.x if z > 1 else 0.0)
		var x0 := half + floorf((half - total) / 2.0)
		var y0 := floorf((h - 14 - ts.y * z) / 2.0)
		draw_texture_rect(compare_right, Rect2(Vector2(x0, y0), ts * z), false)
		draw_string(T.font("text"), Vector2(x0, 10), "%dx" % z, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.DIM)
		if z > 1:
			draw_texture_rect(compare_right, Rect2(Vector2(x0 + ts.x * z + 6, y0 + ts.y * z - ts.y), ts), false)
			draw_string(T.font("text"), Vector2(x0 + ts.x * z + 6, 10), "1x", HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.DIM)

## an effect sheet: the frames played at 1x and beside it at 3x, standing on the floor
func _draw_strip() -> void:
	if strip_tex == null:
		return
	var n := int(strip_meta.get("frames", 1))
	var fw := int(strip_meta.get("frame_width", strip_tex.get_width() / maxi(n, 1)))
	var fh := int(strip_meta.get("frame_height", strip_tex.get_height()))
	var fps := float(strip_meta.get("fps", 10.0))
	var loop := bool(strip_meta.get("loop", true))
	var rows := int(strip_meta.get("rotations", 1))
	var i := 0
	if fps > 0.0:
		var k := int(frame_t * fps)
		if loop:
			i = k % maxi(n, 1)
		else:
			i = k % maxi(n + int(fps * 0.6), 1)
			if i >= n:
				i = -1
	var r := 0
	if rows > 1:
		r = int(frame_t * 0.5) % rows
	var fy := floorf(size.y * 0.9)
	var cx := floorf(size.x * 0.5)
	var z := 3
	while z > 1 and fh * z > size.y - 20:
		z -= 1
	if i >= 0:
		var src := Rect2(i * fw, r * fh, fw, fh)
		draw_texture_rect_region(strip_tex, Rect2(cx - fw * z / 2.0 - fw / 2.0 - 8, fy - fh * z, fw * z, fh * z), src)
		draw_texture_rect_region(strip_tex, Rect2(cx + fw * z / 2.0 - fw / 2.0 + 8, fy - fh, fw, fh), src)
	if ruler and n > 1:
		var span := minf(n * 6.0, size.x - 40.0)
		var x0 := floorf((size.x - span) / 2.0)
		var y := size.y - 6
		for k in n:
			var on := k == i
			draw_rect(Rect2(x0 + floorf(k * span / n), y if on else y + 1, 3 if on else 2, 3 if on else 1), T.ACCENT if on else T.DIM)

## a small iso patch of the tile strip's variants, at 1x, so repetition shows
func _draw_tiles() -> void:
	if tiles_tex == null:
		return
	var tw := int(tiles_meta.get("tile", [72, 36])[0])
	var th := int(tiles_meta.get("tile", [72, 36])[1])
	var variants := int(tiles_meta.get("variants", 1))
	var total := int(tiles_tex.get_width() / maxi(tw, 1))
	var cx := floorf(size.x / 2.0)
	var cy := floorf(size.y / 2.0) - 8
	var k := 0
	for row in 5:
		for col in 5:
			var x := cx + (col - row) * tw / 2.0 - tw / 2.0
			var y := cy + (col + row) * th / 2.0 - th * 2.5
			var v := (row * 7 + col * 3 + k) % maxi(variants, 1)
			draw_texture_rect_region(tiles_tex, Rect2(x, y, tw, th), Rect2(v * tw, 0, tw, th))
	if total > variants:
		# the transition tiles in a row under the patch
		var y := size.y - th - 16
		var n := mini(total - variants, 16)
		var x0 := cx - n * (tw / 2.0 + 2) / 2.0
		for i in n:
			draw_texture_rect_region(tiles_tex, Rect2(x0 + i * (tw / 2.0 + 2), y, tw / 2.0, th / 2.0), Rect2((variants + i) * tw, 0, tw, th))
