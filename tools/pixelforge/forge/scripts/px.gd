extends RefCounted
const T := preload("res://scripts/theme.gd")
## scripts/px.gd: the controls drawn one pixel at a time (the dagger selector, levers, wheels, chain pulls, the
## three-stop lever, sliders, ramps, dice), as Images turned into textures and cached. The frame itself is frame.gd.
## Nothing here is anti-aliased: a control is a tiny canvas drawn at 1 px and shown at a whole multiple, in the
## frame's iron, gold, wood and bone ramps.

const BAYER := [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

static var _cache := {}

static func bayer(x: int, y: int) -> float:
	return (float(BAYER[(y & 3) * 4 + (x & 3)]) + 0.5) / 16.0

static func _tex(key: String, img: Image) -> Texture2D:
	var t := ImageTexture.create_from_image(img)
	_cache[key] = t
	return t

static func _blank(w: int, h: int) -> Image:
	var img := Image.create_empty(w, h, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	return img

static func _px(img: Image, x: int, y: int, c: Color) -> void:
	if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
		img.set_pixel(x, y, c)

## the selector: a 16x14 dagger pointing right (pommel and guard in gold, a wrapped grip, a steel blade); `shimmer`
## 0 or 1 moves the blade's highlight, the two-frame shimmer that plays when the selector moves
const DAGGER := [
	"................",
	"................",
	"................",
	"......kk........",
	"......GG........",
	".kk..kGGkkkkkkk.",
	"kPPwbwGGSSSSSSSk",
	"kPPwbwGGmmmmmmk.",
	".kk..kGGkkkkkk..",
	"......GG........",
	"......kk........",
	"................",
	"................",
	"................",
]
static func arrow(shimmer: int = 0) -> Texture2D:
	var key := "dagger%d" % shimmer
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var pal := {"k": F.IRON[0], "P": F.GOLD[4], "G": F.GOLD[3], "g": F.GOLD[1], "w": F.BONE[3], "b": F.WOOD[2],
		"S": F.IRON[6], "s": F.IRON[5], "m": F.IRON[4], "d": F.IRON[2]}
	var img := _blank(16, 14)
	for j in DAGGER.size():
		for i in DAGGER[j].length():
			var ch: String = DAGGER[j][i]
			if pal.has(ch):
				_px(img, i, j, Color(pal[ch]))
	# the highlight running along the blade's edge
	var hx := 8 if shimmer == 0 else 11
	_px(img, hx, 6, Color("#ffffff")); _px(img, hx + 1, 6, Color("#ffffff")); _px(img, hx + 2, 6, Color("#ffffff"))
	_px(img, hx + 1, 7, Color(F.IRON[6]))
	_px(img, 1, 6, Color(F.GOLD[5]))
	return _tex(key, img)

## the dagger in its three-frame flash: white, then bright, then itself
static func arrow_flash(step: int) -> Texture2D:
	var key := "arrowflash%d" % step
	if _cache.has(key):
		return _cache[key]
	var base := arrow().get_image()
	var img := _blank(16, 14)
	for y in 14:
		for x in 16:
			var c := base.get_pixel(x, y)
			if c.a > 0:
				img.set_pixel(x, y, Color("#ffffff") if step == 0 else c.lightened(0.45) if step == 1 else c)
	return _tex(key, img)

## the mouse pointers at 2x (cursors are in screen pixels): a pointing hand over anything that can be clicked, a
## closed hand over what can be dragged
static func cursor_hand() -> Texture2D:
	return _cursor_rows("hand", ["....XX......", "...XOOX.....", "...XOOX.....", "...XOOX.....", "...XOOXXX...", "...XOOXOOXX.",
		".XXXOOXOOXOX", "XOOXOOOOOOOX", "XOOOOOOOOOOX", ".XOOOOOOOOOX", ".XOOOOOOOOX.", "..XOOOOOOOX.", "..XOOOOOOX..", "...XXXXXX..."])

static func cursor_grab() -> Texture2D:
	return _cursor_rows("grab", ["............", "....XXXX....", "..XXOOOOXX..", ".XOOOOOOOOX.", ".XOOOOOOOOX.", "XOOOOOOOOOOX",
		"XOOOOOOOOOOX", "XOOOOOOOOOOX", ".XOOOOOOOOX.", ".XOOOOOOOOX.", "..XOOOOOOX..", "...XXXXXX..."])

static func _cursor_rows(key: String, rows: Array) -> Texture2D:
	if _cache.has(key):
		return _cache[key]
	var img := _blank(rows[0].length() * 2, rows.size() * 2)
	for j in rows.size():
		for i in rows[j].length():
			var ch: String = rows[j][i]
			if ch == ".":
				continue
			img.fill_rect(Rect2i(i * 2, j * 2, 2, 2), Color("#15141a") if ch == "X" else T.BONE)
	return _tex(key, img)

## the pointer: a bone arrow with a dark rim, at 2x (cursors are in screen pixels)
static func cursor() -> Texture2D:
	if _cache.has("cursor"):
		return _cache["cursor"]
	var rows := ["X..........", "XX.........", "XOX........", "XOOX.......", "XOOOX......", "XOOOOX.....", "XOOOOOX....",
		"XOOOOOOX...", "XOOOOOOOX..", "XOOOOOOOOX.", "XOOOOOXXXXX", "XOOXOOX....", "XOX.XOOX...", "XX..XOOX...", "X....XOOX..", ".....XOOX..", "......XX..."]
	var img := _blank(22, 34)
	for j in rows.size():
		for i in rows[j].length():
			var ch: String = rows[j][i]
			if ch == ".":
				continue
			img.fill_rect(Rect2i(i * 2, j * 2, 2, 2), Color("#15141a") if ch == "X" else T.BONE)
	return _tex("cursor", img)

## the iron bracket plate every lever stands in: a dithered vertical ramp, a bevel, four rivets
static func _plate(img: Image, w: int, h: int) -> void:
	var F := preload("res://scripts/frame.gd")
	for y in h:
		for x in w:
			var f := float(y) / maxf(h - 1, 1.0)
			var tone := 2
			var b := bayer(x, y)
			if f < 0.3 and b < (0.3 - f) * 2.2:
				tone = 3
			elif f > 0.7 and b < (f - 0.7) * 2.2:
				tone = 1
			var g := F.hash2(x, y, 41)
			if g < 0.05:
				tone -= 1
			elif g > 0.96:
				tone += 1
			if x == 0:
				tone = 5
			elif y == 0:
				tone = 6
			elif x == w - 1 or y == h - 1:
				tone = 0
			elif x == w - 2 or y == h - 2:
				tone = 1
			elif x == 1 or y == 1:
				tone = 3
			img.set_pixel(x, y, Color(F.IRON[clampi(tone, 0, 6)]))
	for r in [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]:
		_px(img, r[0], r[1], Color(F.IRON[6])); _px(img, r[0] + 1, r[1], Color(F.IRON[3]))
		_px(img, r[0], r[1] + 1, Color(F.IRON[3])); _px(img, r[0] + 1, r[1] + 1, Color(F.IRON[0]))

## the carved slot down the plate's middle, with its lit lower lip
static func _slot(img: Image, w: int, h: int) -> void:
	var F := preload("res://scripts/frame.gd")
	var x0 := int(w / 2) - 2
	for y in range(4, h - 4):
		_px(img, x0, y, Color(F.IRON[0])); _px(img, x0 + 1, y, Color("#000000")); _px(img, x0 + 2, y, Color("#000000")); _px(img, x0 + 3, y, Color(F.IRON[1]))
	for x in range(x0, x0 + 4):
		_px(img, x, 4, Color(F.IRON[0])); _px(img, x, h - 5, Color(F.IRON[3]))

## the handle: a gold-and-bone grip over an iron bar, a shadow under it
static func _handle(img: Image, w: int, y0: int, hot: bool) -> void:
	var F := preload("res://scripts/frame.gd")
	for x in range(1, w - 1):
		_px(img, x, y0 + 2, Color(F.IRON[5])); _px(img, x, y0 + 3, Color(F.IRON[3])); _px(img, x, y0 + 4, Color(F.IRON[1]))
	for x in range(2, w - 2):
		_px(img, x, y0 + 5, Color(F.IRON[0]))
	_px(img, 1, y0 + 2, Color(F.IRON[3])); _px(img, w - 2, y0 + 2, Color(F.IRON[1]))
	for x in range(3, w - 3):
		_px(img, x, y0, Color(F.GOLD[4])); _px(img, x, y0 + 1, Color(F.GOLD[3] if x % 2 else F.GOLD[2]))
	_px(img, 3, y0, Color(F.GOLD[2])); _px(img, w - 4, y0, Color(F.GOLD[2])); _px(img, w - 4, y0 + 1, Color(F.GOLD[1])); _px(img, 3, y0 + 1, Color(F.GOLD[1]))
	_px(img, 5, y0, Color("#ffffff") if hot else Color(F.GOLD[5]))
	if hot:
		_px(img, 6, y0, Color("#ffffff"))

## an iron lever in a slotted bracket (14x26): value 0..1 = the handle's height
static func lever(v: float, w: int = 14, h: int = 28, hot: bool = false) -> Texture2D:
	var q := int(round(clampf(v, 0.0, 1.0) * 40.0))
	var key := "lever%d_%d_%d_%s" % [w, h, q, hot]
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var img := _blank(w, h)
	_plate(img, w, h)
	_slot(img, w, h)
	# the scale beside the slot
	var y := 5
	while y < h - 5:
		_px(img, int(w / 2) - 4, y, Color(F.IRON[4])); _px(img, int(w / 2) + 3, y, Color(F.IRON[1]))
		y += 4
	var y0 := 4 + int(round((1.0 - q / 40.0) * (h - 14)))
	_handle(img, w, y0, hot)
	return _tex(key, img)

## the three-stop lever (scene light: off / sprite lights only / on): notches at the stops
static func lever3(v: int, w: int = 14, h: int = 28, hot: bool = false) -> Texture2D:
	var key := "lever3_%d_%d_%s" % [h, v, hot]
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var img := _blank(w, h)
	_plate(img, w, h)
	_slot(img, w, h)
	var top := 4
	var bottom := h - 10
	var stops := [bottom, int((top + bottom) / 2), top]
	for sy in stops:
		for x in [int(w / 2) - 4, int(w / 2) - 3, int(w / 2) + 2, int(w / 2) + 3]:
			_px(img, x, sy + 3, Color(F.IRON[4])); _px(img, x, sy + 4, Color(F.IRON[0]))
	_handle(img, w, stops[clampi(v, 0, 2)], hot)
	return _tex(key, img)

## a valve wheel (22x22): a toothed iron rim lit from the top left, a worn face with a groove, four spokes that turn
## with it (the gold one marks the angle a, degrees, 0 = up), a hub
static func wheel(a: float, size: int = 22, hot: bool = false) -> Texture2D:
	var q := int(round(fposmod(a, 360.0) / 3.0)) % 120
	var key := "wheel%d_%d_%s" % [size, q, hot]
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var img := _blank(size, size)
	var cx := (size - 1) / 2.0
	var cy := (size - 1) / 2.0
	var ang := deg_to_rad(q * 3.0 - 90.0)
	for y in size:
		for x in size:
			var dv := Vector2(x - cx, y - cy)
			var d := dv.length()
			if d > cx + 0.5:
				continue
			var lit := (dv.x * -0.6 + dv.y * -0.8) / cx
			var b := bayer(x, y)
			var tone := 2
			if d > cx - 1.3:
				# the rim's outer ring with the teeth cut into it
				var ta := fposmod(dv.angle() - ang, TAU / 12.0)
				var notch := ta < 0.14 or ta > TAU / 12.0 - 0.14
				tone = 0 if notch else (5 if lit > 0.3 else (3 if lit > -0.3 else 1))
			elif d > cx - 3.2:
				tone = 4 if (lit > 0.1 and b < lit + 0.3) else (3 if lit > -0.4 else 2)
				if F.hash2(x, y, 43) < 0.08:
					tone -= 1
			elif d > cx - 4.2:
				tone = 0 if lit < 0.2 else 1
			elif d > 3.6:
				tone = 2
				if lit > 0.15 and b < lit * 1.2:
					tone = 3
				elif lit < -0.2 and b < -lit:
					tone = 1
				if d > 6.2 and d < 7.0:
					tone -= 1
				var g := F.hash2(x, y, 44)
				if g < 0.06:
					tone -= 1
				elif g > 0.95:
					tone += 1
			else:
				tone = 3 if lit > 0.1 else 2
				if d > 2.8:
					tone = 5 if lit > 0.3 else 0
			img.set_pixel(x, y, Color(F.IRON[clampi(tone, 0, 6)]))
	# the iron spokes, then the gold one on top
	for k in [1, 2, 3]:
		var t: float = ang + k * TAU / 4.0
		var r := 3.0
		while r < cx - 3.5:
			var sx := int(round(cx + cos(t) * r))
			var sy := int(round(cy + sin(t) * r))
			_px(img, sx, sy, Color(F.IRON[4]))
			_px(img, sx, sy + 1, Color(F.IRON[1]))
			r += 0.5
	var r := 2.0
	while r < cx - 1.4:
		var sx := int(round(cx + cos(ang) * r))
		var sy := int(round(cy + sin(ang) * r))
		_px(img, sx, sy, Color("#ffffff") if (hot and r > cx - 4.5) else Color(F.GOLD[4] if r > cx - 5.0 else F.GOLD[3]))
		_px(img, sx, sy + 1, Color(F.GOLD[1]))
		r += 0.5
	_px(img, int(round(cx)), int(round(cy)), Color(F.GOLD[4]))
	_px(img, int(round(cx)) - 1, int(round(cy)) - 1, Color(F.IRON[6]))
	return _tex(key, img)

## a chain pull (12x26): an iron bracket, a chain of links, a wooden T-grip with gold caps; on = pulled down;
## sway -1/0/1 leans the lower chain and the grip a pixel (the swing after a pull)
static func pull(on: bool, w: int = 12, h: int = 30, hot: bool = false, sway: int = 0) -> Texture2D:
	var key := "pull_%d_%s_%s_%d" % [h, on, hot, sway]
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var img := _blank(w, h)
	for x in range(2, w - 2):
		_px(img, x, 0, Color(F.IRON[5])); _px(img, x, 1, Color(F.IRON[2])); _px(img, x, 2, Color(F.IRON[0]))
	_px(img, 5, 1, Color(F.IRON[0])); _px(img, 6, 1, Color(F.IRON[0]))
	_px(img, 2, 1, Color(F.IRON[6])); _px(img, w - 3, 1, Color(F.IRON[6]))
	var len := h - 5 if on else int(h / 2) - 2
	var y := 3
	var i := 0
	while y < len - 1:
		var sw := sway if y > (3 + len) / 2 else 0
		if i % 2 == 0:
			_px(img, 5 + sw, y, Color(F.IRON[5])); _px(img, 6 + sw, y, Color(F.IRON[3]))
			_px(img, 5 + sw, y + 1, Color(F.IRON[3])); _px(img, 6 + sw, y + 1, Color(F.IRON[1]))
		else:
			_px(img, 5 + sw, y, Color(F.IRON[4])); _px(img, 6 + sw, y, Color(F.IRON[4]))
			_px(img, 5 + sw, y + 1, Color(F.IRON[2])); _px(img, 6 + sw, y + 1, Color(F.IRON[0]))
		y += 2
		i += 1
	# the ring the grip hangs from
	_px(img, 5 + sway, len - 1, Color(F.GOLD[3])); _px(img, 6 + sway, len - 1, Color(F.GOLD[1]))
	# the T-grip: wood with gold caps
	for x in range(2, w - 2):
		var top := Color(F.WOOD[6]) if not hot else Color("#ffffff")
		_px(img, x + sway, len, top if x > 2 and x < w - 3 else Color(F.GOLD[4]))
		_px(img, x + sway, len + 1, Color(F.WOOD[4]) if x > 2 and x < w - 3 else Color(F.GOLD[3]))
		_px(img, x + sway, len + 2, Color(F.WOOD[1]) if x > 2 and x < w - 3 else Color(F.GOLD[0]))
	_px(img, 5 + sway, len + 1, Color(F.WOOD[5]))
	if on:
		_px(img, 1 + sway, len + 1, Color(F.GOLD[4])); _px(img, w - 2 + sway, len + 1, Color(F.GOLD[4]))
	return _tex(key, img)

## a plain pixel slider for the Advanced fold (track w x 7, grabber 3 x 7): an iron channel with a gold stud
static func slider(v: float, w: int = 60, hot: bool = false) -> Texture2D:
	var q := int(round(clampf(v, 0.0, 1.0) * (w - 3)))
	var key := "slider%d_%d_%s" % [w, q, hot]
	if _cache.has(key):
		return _cache[key]
	var F := preload("res://scripts/frame.gd")
	var img := _blank(w, 7)
	for x in w:
		_px(img, x, 2, Color(F.IRON[0])); _px(img, x, 3, Color(F.IRON[1])); _px(img, x, 4, Color(F.IRON[3]))
		if x % 10 == 0:
			_px(img, x, 1, Color(F.IRON[4])); _px(img, x, 5, Color(F.IRON[2]))
	for y in range(1, 6):
		_px(img, 0, y, Color(F.IRON[4])); _px(img, w - 1, y, Color(F.IRON[2]))
	for x in range(1, q):
		_px(img, x, 3, Color(F.GOLD[1]))
	var col := [F.GOLD[4], F.GOLD[3], F.GOLD[3], F.GOLD[2], F.GOLD[2], F.GOLD[1], F.GOLD[0]]
	for y in 7:
		_px(img, q, y, Color(F.IRON[0])); _px(img, q + 1, y, Color("#ffffff") if (hot and y < 2) else Color(col[y])); _px(img, q + 2, y, Color(F.IRON[0]))
	return _tex(key, img)

## a swatch strip for a material ramp (each step 8x6 with a dark seam)
static func ramp(colors: Array) -> Texture2D:
	var key := "ramp" + ",".join(colors)
	if _cache.has(key):
		return _cache[key]
	var n := maxi(colors.size(), 1)
	var img := _blank(n * 8, 6)
	for i in n:
		img.fill_rect(Rect2i(i * 8, 0, 8, 6), Color(str(colors[i])))
		img.fill_rect(Rect2i(i * 8, 5, 8, 1), T.K)
		img.fill_rect(Rect2i(i * 8 + 7, 0, 1, 6), T.K)
	return _tex(key, img)

## a small pixel dice face (for "another tune")
static func dice(face: int) -> Texture2D:
	var key := "dice%d" % face
	if _cache.has(key):
		return _cache[key]
	var img := _blank(9, 9)
	for y in 9:
		for x in 9:
			img.set_pixel(x, y, T.K if (x == 0 or y == 0 or x == 8 or y == 8) else T.H)
	var pips := {1: [[4, 4]], 2: [[2, 2], [6, 6]], 3: [[2, 2], [4, 4], [6, 6]], 4: [[2, 2], [6, 2], [2, 6], [6, 6]],
		5: [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]], 6: [[2, 2], [6, 2], [2, 4], [6, 4], [2, 6], [6, 6]]}
	for p in pips.get(clampi(face, 1, 6), []):
		_px(img, p[0], p[1], T.K)
	return _tex(key, img)

## a dithered ellipse (the turntable under the figure), drawn into a canvas item
static func draw_disc(ci: CanvasItem, cx: float, cy: float, rx: float, ry: float, c1: Color, c2: Color, px: int = 2) -> void:
	var x0 := int(floor((cx - rx) / px)) * px
	var x1 := int(ceil((cx + rx) / px)) * px
	var y0 := int(floor((cy - ry) / px)) * px
	var y1 := int(ceil((cy + ry) / px)) * px
	var y := y0
	while y <= y1:
		var x := x0
		while x <= x1:
			var dx := (x + px / 2.0 - cx) / rx
			var dy := (y + px / 2.0 - cy) / ry
			var d := dx * dx + dy * dy
			if d <= 1.0:
				var k := 1.0 - d
				var b := bayer(x / px, y / px)
				if k > 0.85:
					ci.draw_rect(Rect2(x, y, px, px), c2 if b < 0.5 else c1)
				elif k > b * 0.9:
					ci.draw_rect(Rect2(x, y, px, px), c1)
			x += px
		y += px
