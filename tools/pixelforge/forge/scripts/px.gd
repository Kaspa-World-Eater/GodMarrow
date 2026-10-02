extends RefCounted
const T := preload("res://scripts/theme.gd")
## scripts/px.gd: everything drawn one pixel at a time (the mockup's border, skulls, arrow, levers, wheels, chain
## pulls and the three-stop lever), as Images turned into textures and cached. Nothing here is anti-aliased: a
## control is a tiny canvas drawn at 1 px and shown at a whole multiple.

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

## the ornate border at 1 border pixel = 2 screen pixels (w, h in border pixels: 320x180 for the 640x360 canvas).
## A thorned double rim with a dark inner line, vine studs along the rims, skulls in the corners and a gap at the
## top for the banner. The field inside stays transparent.
static func border(w: int, h: int, gap: int = 44) -> Texture2D:
	var key := "border%dx%d" % [w, h]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(w, h)
	var F := T.FRAME
	var D := T.FRAME2
	var K := Color("#15141a")
	for x in range(3, w - 3):
		for yy in [4, 5, h - 5, h - 6]:
			_px(img, x, yy, F)
		_px(img, x, 8, D)
		_px(img, x, h - 9, D)
		if x % 6 == 0:
			_px(img, x, 2, D)
			_px(img, x, h - 3, D)
		if x % 12 == 3:
			_px(img, x, 6, D); _px(img, x + 1, 7, D); _px(img, x, h - 7, D); _px(img, x + 1, h - 8, D)
		if x % 12 == 9:
			_px(img, x, 3, F); _px(img, x, h - 4, F)
	for y in range(3, h - 3):
		for xx in [4, 5, w - 5, w - 6]:
			_px(img, xx, y, F)
		_px(img, 8, y, D)
		_px(img, w - 9, y, D)
		if y % 6 == 0:
			_px(img, 2, y, D)
			_px(img, w - 3, y, D)
		if y % 12 == 3:
			_px(img, 6, y, D); _px(img, 7, y + 1, D); _px(img, w - 7, y, D); _px(img, w - 8, y + 1, D)
		if y % 12 == 9:
			_px(img, 3, y, F); _px(img, w - 4, y, F)
	# thorns
	var x := 8
	while x < w - 8:
		_px(img, x, 1, F); _px(img, x + 1, 0, F); _px(img, x, h - 2, F); _px(img, x + 1, h - 1, F)
		x += 10
	var y := 8
	while y < h - 8:
		_px(img, 1, y, F); _px(img, 0, y + 1, F); _px(img, w - 2, y, F); _px(img, w - 1, y + 1, F)
		y += 10
	for c in [[2, 2], [w - 7, 2], [2, h - 7], [w - 7, h - 7]]:
		_skull(img, c[0], c[1], F, D, K)
	# the banner's gap
	for gx in range(int(w / 2) - gap, int(w / 2) + gap):
		for gy in range(0, 10):
			_px(img, gx, gy, Color(0, 0, 0, 0))
	return _tex(key, img)

static func _skull(img: Image, cx: int, cy: int, F: Color, D: Color, K: Color) -> void:
	var rows := [[0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [0, 1, 0, 1, 0]]
	for j in rows.size():
		for i in rows[j].size():
			if rows[j][i]:
				_px(img, cx + i, cy + j, F)
	_px(img, cx + 1, cy + 2, K); _px(img, cx + 3, cy + 2, K)
	_px(img, cx + 2, cy + 6, D); _px(img, cx + 2, cy + 7, D)

## the selector: an 8x7 pixel arrow (shown at 2x)
static func arrow() -> Texture2D:
	if _cache.has("arrow"):
		return _cache["arrow"]
	var img := _blank(8, 7)
	for y in 7:
		_px(img, 0, y, T.GD); _px(img, 1, y, T.G)
	for y in range(1, 6):
		_px(img, 2, y, T.G); _px(img, 3, y, T.GH)
	for y in range(2, 5):
		_px(img, 4, y, T.GH); _px(img, 5, y, T.G)
	_px(img, 6, 3, T.G); _px(img, 7, 3, T.GD)
	return _tex("arrow", img)

## the arrow in its three-frame flash: white, then bright, then itself
static func arrow_flash(step: int) -> Texture2D:
	var key := "arrowflash%d" % step
	if _cache.has(key):
		return _cache[key]
	var base := arrow().get_image()
	var img := _blank(8, 7)
	for y in 7:
		for x in 8:
			var c := base.get_pixel(x, y)
			if c.a > 0:
				img.set_pixel(x, y, Color("#ffffff") if step == 0 else c.lightened(0.45) if step == 1 else c)
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

## an iron lever in a slotted bracket (14x28): value 0..1 = the handle's height
static func lever(v: float, w: int = 14, h: int = 28, hot: bool = false) -> Texture2D:
	var q := int(round(clampf(v, 0.0, 1.0) * 40.0))
	var key := "lever%d_%d_%d_%s" % [w, h, q, hot]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(w, h)
	for y in h:
		for x in w:
			var c := T.D
			if x == 0 or y == 0:
				c = T.L
			if x == w - 1 or y == h - 1:
				c = T.K
			if (x + y) % 7 == 0 and x > 1 and x < w - 2 and y > 1 and y < h - 2:
				c = T.M
			img.set_pixel(x, y, c)
	for y in range(3, h - 3):
		_px(img, 6, y, T.K); _px(img, 7, y, T.K); _px(img, 5, y, T.K if y % 2 else T.D); _px(img, 8, y, T.M)
	var y := 4
	while y < h - 3:
		_px(img, 2, y, T.L); _px(img, w - 3, y, T.L)
		y += 4
	for b in [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]:
		_px(img, b[0], b[1], T.H)
	var y0 := 3 + int(round((1.0 - q / 40.0) * (h - 12)))
	for x in range(1, w - 1):
		_px(img, x, y0 + 2, T.L); _px(img, x, y0 + 3, T.M); _px(img, x, y0 + 4, T.D); _px(img, x, y0 + 5, T.K)
	for x in range(4, w - 4):
		_px(img, x, y0, Color("#ffffff") if hot else T.GH); _px(img, x, y0 + 1, T.GH if hot else T.G)
	_px(img, 4, y0, T.GD); _px(img, w - 5, y0 + 1, T.GD); _px(img, 3, y0 + 2, T.K); _px(img, w - 4, y0 + 2, T.K)
	return _tex(key, img)

## the three-stop lever (scene light: off / sprite lights only / on)
static func lever3(v: int, w: int = 14, h: int = 28, hot: bool = false) -> Texture2D:
	var key := "lever3_%d_%s" % [v, hot]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(w, h)
	for y in h:
		for x in w:
			var c := T.D
			if x == 0 or y == 0:
				c = T.L
			if x == w - 1 or y == h - 1:
				c = T.K
			img.set_pixel(x, y, c)
	for y in range(3, h - 3):
		_px(img, 6, y, T.K); _px(img, 7, y, T.K)
	for yy in [4, int(h / 2), h - 4]:
		for x in range(3, w - 3):
			_px(img, x, yy, T.M)
	var y0: int = [h - 6, int(h / 2) - 2, 2][clampi(v, 0, 2)]
	for x in range(1, w - 1):
		_px(img, x, y0 + 2, T.L); _px(img, x, y0 + 3, T.M); _px(img, x, y0 + 4, T.K)
	for x in range(4, w - 4):
		_px(img, x, y0, Color("#ffffff") if hot else T.GH); _px(img, x, y0 + 1, T.GH if hot else T.G)
	return _tex(key, img)

## a valve wheel (22x22): dithered iron face, rim rivets, one gold spoke at angle a (degrees, 0 = up)
static func wheel(a: float, size: int = 22, hot: bool = false) -> Texture2D:
	var q := int(round(fposmod(a, 360.0) / 3.0)) % 120
	var key := "wheel%d_%d_%s" % [size, q, hot]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(size, size)
	var cx := (size - 1) / 2.0
	var cy := (size - 1) / 2.0
	for y in size:
		for x in size:
			var d := Vector2(x - cx, y - cy).length()
			if d > cx + 0.5:
				continue
			var lit := ((x - cx) * -0.6 + (y - cy) * -0.8) / cx
			var b := bayer(x, y)
			var c: Color
			if d > cx - 1.2:
				c = T.L if lit > 0.25 else T.K
			elif d > cx - 3.2:
				c = T.M if (lit + 0.2 > b * 0.8) else T.D
			elif d > cx - 4.2:
				c = T.K
			elif d > 3.5:
				c = T.D if (lit * 0.6 + 0.5 > b) else T.K
			else:
				c = T.M if lit > 0 else T.D
			img.set_pixel(x, y, c)
	for k in 8:
		var t := k / 8.0 * TAU
		_px(img, int(round(cx + cos(t) * (cx - 2.2))), int(round(cy + sin(t) * (cy - 2.2))), T.H)
	var t := deg_to_rad(q * 3.0 - 90.0)
	var r := 2.0
	while r < cx - 1:
		var x := int(round(cx + cos(t) * r))
		var y := int(round(cy + sin(t) * r))
		_px(img, x, y, (Color("#ffffff") if hot else T.GH) if r > cx - 4 else T.G)
		r += 0.5
	_px(img, int(round(cx)), int(round(cy)), T.GH)
	return _tex(key, img)

## a chain pull (12x30): a short chain with a gold handle; on = pulled down
static func pull(on: bool, w: int = 12, h: int = 30, hot: bool = false) -> Texture2D:
	var key := "pull_%s_%s" % [on, hot]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(w, h)
	for x in range(3, w - 3):
		_px(img, x, 0, T.L); _px(img, x, 1, T.D)
	_px(img, 5, 1, T.H); _px(img, 6, 1, T.H)
	var len := h - 8 if on else int(h / 2) - 3
	for y in range(2, len):
		var c := T.L if y % 2 else T.M
		_px(img, 5, y, c); _px(img, 6, y, c)
	for y in range(len, len + 6):
		for x in range(3, w - 3):
			var e: Color
			if y == len or x == 3:
				e = Color("#ffffff") if hot else T.H
			elif y == len + 5 or x == w - 4:
				e = T.K
			elif x == 5 and y == len + 2:
				e = T.GH
			else:
				e = T.G
			_px(img, x, y, e)
	if on:
		_px(img, 2, len + 2, T.GH); _px(img, w - 3, len + 2, T.GH)
	return _tex(key, img)

## a plain pixel slider for the Advanced fold (track w x 5, grabber 3 x 7)
static func slider(v: float, w: int = 60, hot: bool = false) -> Texture2D:
	var q := int(round(clampf(v, 0.0, 1.0) * (w - 3)))
	var key := "slider%d_%d_%s" % [w, q, hot]
	if _cache.has(key):
		return _cache[key]
	var img := _blank(w, 7)
	for x in w:
		_px(img, x, 2, T.K); _px(img, x, 3, T.D); _px(img, x, 4, T.K)
		if x % 10 == 0:
			_px(img, x, 1, T.M); _px(img, x, 5, T.M)
	for x in range(0, q):
		_px(img, x, 3, T.GD)
	for y in 7:
		_px(img, q, y, T.K); _px(img, q + 1, y, Color("#ffffff") if hot else T.GH if y < 3 else T.G); _px(img, q + 2, y, T.K)
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
