extends RefCounted
const T := preload("res://scripts/theme.gd")
## scripts/frame.gd: the Forge's frame drawn as late-SNES pixel art at the app's logic resolution (640x360, one image
## pixel = one logic pixel, integer scaled on screen). Carved stone bands with chips, cracks and moss; an iron strap
## round the outside with rivets; iron window rims with corner plates; chain links hanging at the corners; sconces
## (two torches on the side bands, two candles on the bottom band) whose flames are real frames and whose light
## re-shades the stone around them in dither; a worn wooden sill under the text box for the foot line; a carved
## keystone plaque for the banner; corner details (a skull, a moth, a key, a rat). Every environment of the picture
## window has its own stone, moss and light colour. Nothing is anti-aliased; every colour is one of the ramps below.
##
## Hooks for the effects engine: anchors() names points on the frame (torches, candles, brazier, drips, banner,
## corners, sill ends) in logic pixels; the sconces' flames are drawn by the app from flame_frames().

const W := 640
const H := 360
const PIC := Rect2i(22, 27, 596, 140)
const TEXTBOX := Rect2i(22, 183, 596, 136)
const SILL := Rect2i(19, 322, 602, 16)      # the wooden ledge under the text box: the foot line sits on it
const BAND_TOP := 24
const BAND_BOTTOM := 338
const BAND_SIDE := 19
const BLOCK := 30                            # nominal block length along a band

# shared materials: iron (the straps, rims, brackets), wood (the sill, the tab signs), gold, flame, bone
const IRON := ["#07060b", "#17151e", "#2a2733", "#443f50", "#66607a", "#8c86a0", "#b3adc2"]
const WOOD := ["#0e0905", "#1f130a", "#32200f", "#473017", "#5c4222", "#745632", "#8c6c42"]
const GOLD := ["#3d2a10", "#6b4f25", "#a67d36", "#d9b05c", "#f0d78f", "#fff6d0"]
const FLAME := ["#4a1206", "#9a2e0a", "#d8641a", "#f0a030", "#f8d060", "#fff4c0"]
const BONE := ["#4a4538", "#8f8974", "#b8b19a", "#d9d2bc", "#f0ebd8"]
const MOSS_DEFAULT := ["#1b2e18", "#2b4a24", "#3f6a30"]

## stone ramps (7 tones, dark to light, hue-shifted: cool shadows, warmer lights), moss, the light each place throws
const ENV := {
	"dungeon": {"stone": ["#0a0810", "#1a1620", "#2c2634", "#403a4a", "#564f62", "#726a7c", "#908897"], "moss": ["#1b2e18", "#2b4a24", "#3f6a30"], "moss_k": 0.5, "light": "#f0a848", "frost": false},
	"crypt": {"stone": ["#08090a", "#151917", "#232a26", "#343d37", "#47524a", "#5c6a5e", "#778676"], "moss": ["#1a2e24", "#254634", "#346246"], "moss_k": 0.7, "light": "#8ce0b0", "frost": false},
	"moor": {"stone": ["#0b0a07", "#1c1810", "#2f281a", "#443a27", "#5a4d35", "#73644a", "#8d7e60"], "moss": ["#20331a", "#345426", "#4f7a34"], "moss_k": 1.0, "light": "#f4b860", "frost": false},
	"fen": {"stone": ["#06090b", "#10191b", "#1a2a2b", "#263c3c", "#33504e", "#466863", "#5e8279"], "moss": ["#1a3222", "#285236", "#3a7046"], "moss_k": 1.0, "light": "#b0f070", "frost": false},
	"snow": {"stone": ["#12151c", "#262c38", "#3d4654", "#586374", "#76829a", "#98a4b8", "#bcc6d6"], "moss": ["#2a3a44", "#3c5260", "#56707e"], "moss_k": 0.15, "light": "#ffe4b8", "frost": true},
	"plain": {"stone": ["#101010", "#202020", "#323232", "#444444", "#565656", "#6a6a6a", "#808080"], "moss": ["#2a2a2a", "#333333", "#3c3c3c"], "moss_k": 0.0, "light": "#ffffff", "frost": false},
}

const BAYER := [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

static var _cache := {}
static var _blocks := {}

static func bayer(x: int, y: int) -> float:
	return (float(BAYER[(y & 3) * 4 + (x & 3)]) + 0.5) / 16.0

static func hash2(x: int, y: int, seed: int = 0) -> float:
	var h := (x * 374761393 + y * 668265263 + seed * 2246822519) & 0x7fffffff
	h = ((h ^ (h >> 13)) * 1274126177) & 0x7fffffff
	return float(h ^ (h >> 16)) / 2147483647.0

# ------------------------------------------------------------------ anchors (hooks for effects)
## named points in logic pixels: where a torch, candle, brazier or drip effect would attach to the frame
static func anchors() -> Dictionary:
	var a := {
		"torch_left": Vector2(9, 88), "torch_right": Vector2(630, 88),
		"candle_left": Vector2(46, 346), "candle_right": Vector2(594, 346),
		"brazier": Vector2(320, 348), "banner": Vector2(320, 14),
		"corner_tl": Vector2(10, 10), "corner_tr": Vector2(629, 10), "corner_bl": Vector2(10, 349), "corner_br": Vector2(629, 349),
		"sill_left": Vector2(22, 330), "sill_right": Vector2(618, 330),
		"chain_tl": Vector2(9, 30), "chain_tr": Vector2(630, 30), "chain_bl": Vector2(9, 330), "chain_br": Vector2(630, 330),
	}
	for i in 6:
		a["drip_%d" % (i + 1)] = Vector2(60 + i * 104, BAND_TOP)
	return a

## the sconces: name, kind (torch / candle), the flame's foot in logic pixels, and the stone patch its light re-shades
static func sconces() -> Array:
	return [
		{"name": "torch_left", "kind": "torch", "at": Vector2i(9, 88), "patch": Rect2i(0, 50, BAND_SIDE, 76)},
		{"name": "torch_right", "kind": "torch", "at": Vector2i(630, 88), "patch": Rect2i(W - BAND_SIDE, 50, BAND_SIDE, 76)},
		{"name": "candle_left", "kind": "candle", "at": Vector2i(46, 346), "patch": Rect2i(18, BAND_BOTTOM, 56, H - BAND_BOTTOM)},
		{"name": "candle_right", "kind": "candle", "at": Vector2i(594, 346), "patch": Rect2i(W - 74, BAND_BOTTOM, 56, H - BAND_BOTTOM)},
	]

# ------------------------------------------------------------------ the frame
## the whole frame for an environment, cached; the window fields stay transparent apart from the recess dither
static func frame(env: String) -> Texture2D:
	var key := "frame_" + env
	if _cache.has(key):
		return _cache[key]
	var img := Image.create_empty(W, H, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var e: Dictionary = ENV.get(env, ENV["dungeon"])
	_paint_bands(img, e, Rect2i(0, 0, W, H), null)
	_paint_rims(img)
	_paint_sill(img)
	_paint_plaque(img, e)
	_paint_corners(img, e)
	_paint_sconces(img, e)
	_paint_recess(img, PIC, 6, 4)
	_paint_recess(img, TEXTBOX, 4, 3)
	var tex := ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex

## the stone round a sconce re-shaded by its light at level 0..3 (level 0 = the plain stone), cached per environment
static func light_patch(env: String, s: Dictionary, level: int) -> Texture2D:
	var key := "patch_%s_%s_%d" % [env, s["name"], level]
	if _cache.has(key):
		return _cache[key]
	var r: Rect2i = s["patch"]
	var img := Image.create_empty(r.size.x, r.size.y, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	var e: Dictionary = ENV.get(env, ENV["dungeon"])
	var lt := {"at": Vector2(s["at"]), "k": level / 3.0, "radius": 34.0 if s["kind"] == "torch" else 24.0, "colour": Color(e["light"])}
	_paint_bands(img, e, r, lt)
	# the bracket under the flame sits on the patch too, so the light does not paint over it
	_paint_sconce_bracket(img, s, -r.position)
	var tex := ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex

## the stone bands inside `area` (image coordinates = logic minus area.position); `lt` = a light to shade by
static func _paint_bands(img: Image, e: Dictionary, area: Rect2i, lt) -> void:
	var stone: Array = e["stone"]
	var moss: Array = e["moss"]
	var moss_k: float = e["moss_k"]
	var frost: bool = e["frost"]
	var lit: Array = []
	if lt != null:
		var lc: Color = lt["colour"]
		for c in stone:
			lit.append(Color(c).lerp(lc, 0.28))
	for yy in area.size.y:
		var y := area.position.y + yy
		for xx in area.size.x:
			var x := area.position.x + xx
			var band := _band_of(x, y)
			if band == 0:
				continue
			var c: Color
			if band == 5:
				c = _strap(x, y)
			else:
				var l := 0.0
				if lt != null:
					var d: float = Vector2(x, y).distance_to(lt["at"]) / lt["radius"]
					if d < 1.0:
						l = (1.0 - d) * (1.0 - d) * lt["k"]
				c = _stone_px(x, y, band, stone, moss, moss_k, frost, l, lit)
			img.set_pixel(xx, yy, c)

## 0 = not on the stone; 1 top, 2 bottom, 3 left, 4 right, 6 mullion; 5 = the outer iron strap
static func _band_of(x: int, y: int) -> int:
	if x < 0 or y < 0 or x >= W or y >= H:
		return 0
	if x < 4 or y < 4 or x >= W - 4 or y >= H - 4:
		return 5
	if y < BAND_TOP:
		return 1
	if y >= BAND_BOTTOM:
		return 2
	if x < BAND_SIDE:
		return 3
	if x >= W - BAND_SIDE:
		return 4
	if y >= PIC.end.y + 3 and y < TEXTBOX.position.y - 3 and x >= BAND_SIDE and x < W - BAND_SIDE:
		return 6
	return 0

## the iron strap round the very outside: a lit outer bead, a dark groove, rivets every 16 px
static func _strap(x: int, y: int) -> Color:
	var d := mini(mini(x, y), mini(W - 1 - x, H - 1 - y))
	var along := x if (y < 4 or y >= H - 4) else y
	var rivet := (along % 16) >= 7 and (along % 16) <= 8 and d >= 1 and d <= 2
	if rivet:
		return Color(IRON[6] if d == 1 and (along % 16) == 7 else IRON[1])
	if d == 0:
		return Color(IRON[0])
	if d == 1:
		return Color(IRON[5] if (y < 4 or x < 4) else IRON[3])
	if d == 2:
		return Color(IRON[3])
	return Color(IRON[1])

## the block a band pixel lies in: along-coordinate u, across v (0 at the outer face), the band's thickness
static func _block_coords(x: int, y: int, band: int) -> Vector3i:
	match band:
		1:
			return Vector3i(x, y - 4, BAND_TOP - 4)
		2:
			return Vector3i(x + 7, H - 5 - y, H - 4 - BAND_BOTTOM)
		3:
			return Vector3i(y + 11, x - 4, BAND_SIDE - 4)
		4:
			return Vector3i(y + 23, W - 5 - x, BAND_SIDE - 4)
		_:
			return Vector3i(x + 13, y - (PIC.end.y + 3), TEXTBOX.position.y - 3 - PIC.end.y - 3)

## per-block facts (its start and length along the band, its chips, its crack), cached
static func _block(band: int, k: int) -> Dictionary:
	var key := band * 100000 + k
	if _blocks.has(key):
		return _blocks[key]
	var seed := band * 7919 + 17
	var j0 := int(round((hash2(k, 1, seed) - 0.5) * 6.0))
	var j1 := int(round((hash2(k + 1, 1, seed) - 0.5) * 6.0))
	var start := k * BLOCK + j0
	var length := BLOCK + j1 - j0
	var b := {"start": start, "len": length, "chips": [], "crack": {}, "moss": hash2(k, 3, seed), "tone": 0}
	# tone: most blocks are the middle tone, a few a shade lighter or darker
	var tr := hash2(k, 4, seed)
	b["tone"] = 1 if tr > 0.86 else (-1 if tr < 0.14 else 0)
	# chips: a bite from one or two corners
	var nchips := 1 if hash2(k, 5, seed) < 0.55 else (2 if hash2(k, 6, seed) < 0.5 else 0)
	for i in nchips:
		var corner := int(hash2(k, 7 + i, seed) * 4.0) % 4
		var r := 2 if hash2(k, 9 + i, seed) < 0.6 else 3
		b["chips"].append([corner, r])
	# a crack: a wandering 1-px line through about a third of the blocks
	if hash2(k, 11, seed) < 0.36:
		var cr := {}
		var thick: int = [20, 18, 15, 15, 0, 7][band] if band < 6 else 7
		var px := int(hash2(k, 12, seed) * (length - 4)) + 2
		var py := 0
		var dir := 1 if hash2(k, 13, seed) < 0.5 else -1
		var steps: int = thick - 1
		for s in steps:
			cr[Vector2i(px, py)] = true
			py += 1
			var r := hash2(k, 20 + s, seed)
			if r < 0.3:
				px += dir
			elif r < 0.4:
				dir = -dir
				px += dir
			px = clampi(px, 1, length - 2)
			if r > 0.92 and s > 2:
				break
		b["crack"] = cr
	_blocks[key] = b
	return b

static func _stone_px(x: int, y: int, band: int, stone: Array, moss: Array, moss_k: float, frost: bool, light: float, lit: Array) -> Color:
	var bc := _block_coords(x, y, band)
	var u := bc.x
	var v := bc.y
	var thick := bc.z
	var k := int(floor(float(u) / BLOCK))
	var b := _block(band, k)
	if u < int(b["start"]):
		k -= 1
		b = _block(band, k)
	elif u >= int(b["start"]) + int(b["len"]):
		k += 1
		b = _block(band, k)
	var lu := u - int(b["start"])
	var lv := v
	var length := int(b["len"])
	var bay := bayer(x, y)
	var grain := hash2(x, y, 99)
	# mortar between blocks and along the band's inner face
	var mortar := lu == length - 1 or lv == thick - 1
	var tone := 3 + int(b["tone"])
	var is_moss := false
	var is_frost := false
	if mortar:
		tone = 0 if grain > 0.25 else 1
		# moss grows in the joints, more near the bottom of the frame
		var mk: float = moss_k * (0.9 if band == 2 else (0.35 + 0.4 * (float(y) / H)))
		if mk > 0.0 and hash2(x / 2, y / 2, 5) < mk * 0.55 and float(b["moss"]) > 0.3:
			is_moss = true
	else:
		# bevel: lit top-left faces, dark bottom-right
		if lv == 0 or lu == 0:
			tone += 1
			if (lv == 0 and lu % 5 == 2) or (lu == 0 and lv % 4 == 1):
				tone += 1
		elif lv == thick - 2 or lu == length - 2:
			tone -= 1
		else:
			# a soft ramp across the block: lighter towards its top, dithered
			var f := 1.0 - float(lv) / maxf(thick - 2, 1.0)
			if f > 0.62 and bay < (f - 0.62) * 2.2:
				tone += 1
			elif f < 0.38 and bay < (0.38 - f) * 2.0:
				tone -= 1
		# grain speckle
		if grain < 0.05:
			tone -= 1
		elif grain > 0.965:
			tone += 1
		# chips: a bite off a corner, shown as the darker inner stone with a lit lower lip
		for ch in b["chips"]:
			var corner: int = ch[0]
			var r: int = ch[1]
			var cx := 0 if corner % 2 == 0 else length - 2
			var cy := 0 if corner < 2 else thick - 2
			var d := absi(lu - cx) + absi(lv - cy)
			if d <= r:
				tone = 1 if d < r else 2
				if lv == cy + r or (corner < 2 and lv - cy == r - absi(lu - cx)):
					tone = 4
		# the crack
		var cr: Dictionary = b["crack"]
		if cr.has(Vector2i(lu, lv)):
			tone = 0
		elif cr.has(Vector2i(lu - 1, lv)) or cr.has(Vector2i(lu, lv - 1)):
			tone = mini(tone + 1, 5)
		# moss creeping up from the inner joints on the lower blocks
		var near_joint := lv >= thick - 4 or lu >= length - 3
		var mk2: float = moss_k * (0.5 if band == 2 else 0.18 * (float(y) / H) * 2.0)
		if near_joint and mk2 > 0.0 and float(b["moss"]) > 0.45 and hash2(x / 2, y / 2, 6) < mk2 * 0.5 and grain < 0.75:
			is_moss = true
		# frost on the upper faces of the blocks in the snow
		if frost and lv <= 1 and hash2(x, y, 8) < 0.45:
			is_frost = true
	if light > 0.0:
		tone += int(floor(light * 3.2 + bay * 0.9))
	tone = clampi(tone, 0, 6)
	if is_frost:
		return Color(BONE[4] if bay < 0.5 else BONE[3])
	if is_moss:
		var mt := 1 if bay < 0.6 else 2
		if light > 0.3:
			mt = 2
		return Color(moss[mt] if not mortar else moss[0 if bay < 0.5 else 1])
	if light > 0.12 and lit.size() == 7 and bay < light * 1.6:
		return lit[tone]
	return Color(stone[tone])

# ------------------------------------------------------------------ rims, sill, plaque, corners, sconces
static func _px(img: Image, x: int, y: int, c: Color) -> void:
	if x >= 0 and y >= 0 and x < img.get_width() and y < img.get_height():
		img.set_pixel(x, y, c)

static func _rect(img: Image, r: Rect2i, c: Color) -> void:
	var rr := r.intersection(Rect2i(0, 0, img.get_width(), img.get_height()))
	if rr.size.x > 0 and rr.size.y > 0:
		img.fill_rect(rr, c)

## an iron window rim: three pixels thick with a lit top-left and a dark bottom-right, rivets every 24 px, corner plates
static func _paint_rims(img: Image) -> void:
	for win in [PIC, TEXTBOX]:
		var r := Rect2i(win.position - Vector2i(3, 3), win.size + Vector2i(6, 6))
		for strip in [Rect2i(r.position, Vector2i(r.size.x, 3)), Rect2i(r.position.x, r.end.y - 3, r.size.x, 3), Rect2i(r.position, Vector2i(3, r.size.y)), Rect2i(r.end.x - 3, r.position.y, 3, r.size.y)]:
			_rect(img, strip, Color(IRON[1]))
		# outer line: lit on top and left, dark below and right
		_rect(img, Rect2i(r.position, Vector2i(r.size.x, 1)), Color(IRON[5]))
		_rect(img, Rect2i(r.position, Vector2i(1, r.size.y)), Color(IRON[5]))
		_rect(img, Rect2i(r.position.x, r.end.y - 1, r.size.x, 1), Color(IRON[0]))
		_rect(img, Rect2i(r.end.x - 1, r.position.y, 1, r.size.y), Color(IRON[0]))
		# middle line: mid iron with a lit sheen on top
		_rect(img, Rect2i(r.position.x + 1, r.position.y + 1, r.size.x - 2, 1), Color(IRON[4]))
		_rect(img, Rect2i(r.position.x + 1, r.position.y + 1, 1, r.size.y - 2), Color(IRON[3]))
		_rect(img, Rect2i(r.position.x + 1, r.end.y - 2, r.size.x - 2, 1), Color(IRON[2]))
		_rect(img, Rect2i(r.end.x - 2, r.position.y + 1, 1, r.size.y - 2), Color(IRON[2]))
		# inner line: the dark lip against the field
		_rect(img, Rect2i(r.position.x + 2, r.position.y + 2, r.size.x - 4, 1), Color(IRON[0]))
		_rect(img, Rect2i(r.position.x + 2, r.position.y + 2, 1, r.size.y - 4), Color(IRON[0]))
		_rect(img, Rect2i(r.position.x + 2, r.end.y - 3, r.size.x - 4, 1), Color(IRON[3]))
		_rect(img, Rect2i(r.end.x - 3, r.position.y + 2, 1, r.size.y - 4), Color(IRON[3]))
		# rivets along the middle line
		var x := r.position.x + 12
		while x < r.end.x - 8:
			_px(img, x, r.position.y + 1, Color(IRON[6]))
			_px(img, x + 1, r.position.y + 1, Color(IRON[2]))
			_px(img, x, r.end.y - 2, Color(IRON[5]))
			_px(img, x + 1, r.end.y - 2, Color(IRON[0]))
			x += 24
		var y := r.position.y + 12
		while y < r.end.y - 8:
			_px(img, r.position.x + 1, y, Color(IRON[6]))
			_px(img, r.position.x + 1, y + 1, Color(IRON[2]))
			_px(img, r.end.x - 2, y, Color(IRON[5]))
			_px(img, r.end.x - 2, y + 1, Color(IRON[0]))
			y += 24
		# corner plates: a 7x7 iron square with a bevel and a rivet
		for cp in [r.position, Vector2i(r.end.x - 7, r.position.y), Vector2i(r.position.x, r.end.y - 7), r.end - Vector2i(7, 7)]:
			_rect(img, Rect2i(cp, Vector2i(7, 7)), Color(IRON[2]))
			_rect(img, Rect2i(cp, Vector2i(7, 1)), Color(IRON[5]))
			_rect(img, Rect2i(cp, Vector2i(1, 7)), Color(IRON[5]))
			_rect(img, Rect2i(cp.x, cp.y + 6, 7, 1), Color(IRON[0]))
			_rect(img, Rect2i(cp.x + 6, cp.y, 1, 7), Color(IRON[0]))
			_px(img, cp.x + 3, cp.y + 3, Color(IRON[6]))
			_px(img, cp.x + 4, cp.y + 3, Color(IRON[4]))
			_px(img, cp.x + 3, cp.y + 4, Color(IRON[4]))
			_px(img, cp.x + 4, cp.y + 4, Color(IRON[0]))

## the wooden sill under the text box: two planks, grain streaks, worn lighter where hands rest, nails at the ends
static func _paint_sill(img: Image) -> void:
	var r := SILL
	for yy in r.size.y:
		var y := r.position.y + yy
		for xx in r.size.x:
			var x := r.position.x + xx
			var tone := 3
			if yy == 0:
				tone = 5
			elif yy == 1:
				tone = 4
			elif yy == 8:
				tone = 0          # the seam between the planks
			elif yy == 9:
				tone = 4
			elif yy >= r.size.y - 2:
				tone = 1 if yy == r.size.y - 1 else 2
			else:
				var g := hash2(x / 7 + (yy / 4) * 31, yy, 21)
				var streak := hash2(x / 13, yy + 100, 22)
				if g < 0.12:
					tone = 2
				elif streak > 0.9:
					tone = 4
				# worn lighter towards the middle, dithered
				var mid := 1.0 - absf(float(xx) / r.size.x - 0.5) * 2.0
				if mid > 0.55 and bayer(x, y) < (mid - 0.55) * 0.9:
					tone += 1
				# knots
				if hash2(x / 40, yy / 6, 23) < 0.06 and (xx % 40) >= 18 and (xx % 40) <= 21 and yy % 8 >= 3 and yy % 8 <= 5:
					tone = 1
			img.set_pixel(x, y, Color(WOOD[clampi(tone, 0, 6)]))
	for nx in [r.position.x + 4, r.end.x - 6]:
		for ny in [r.position.y + 3, r.position.y + 11]:
			_px(img, nx, ny, Color(IRON[6]))
			_px(img, nx + 1, ny, Color(IRON[3]))
			_px(img, nx, ny + 1, Color(IRON[3]))
			_px(img, nx + 1, ny + 1, Color(IRON[0]))

## the banner's keystone: a carved plaque set into the top band with a gold inlay line and studs
static func plaque_rect() -> Rect2i:
	return Rect2i(230, 0, 180, 31)

static func _paint_plaque(img: Image, e: Dictionary) -> void:
	var stone: Array = e["stone"]
	var r := plaque_rect()
	for yy in r.size.y:
		for xx in r.size.x:
			var x := r.position.x + xx
			var y := r.position.y + yy
			# the keystone's sides lean outward: trim the top corners
			var lean := (r.size.y - 1 - yy) / 5
			if xx < lean or xx >= r.size.x - lean:
				continue
			var tone := 4
			var d := mini(mini(xx - lean, r.size.x - 1 - lean - xx), mini(yy, r.size.y - 1 - yy))
			if d == 0:
				tone = 0 if yy == r.size.y - 1 or xx >= r.size.x - 1 - lean else 6
			elif d == 1:
				tone = 5 if yy < r.size.y - 2 and xx - lean < r.size.x - 2 else 2
			elif d == 2:
				tone = 3
			elif d >= 4 and d <= 5:
				tone = 2   # the carved recess the title sits in
			else:
				tone = 3
				if hash2(x, y, 31) < 0.06:
					tone = 2
				elif hash2(x, y, 32) > 0.96:
					tone = 4
			img.set_pixel(x, y, Color(stone[tone]))
	# gold inlay just inside the recess
	for xx in range(5, r.size.x - 5):
		_px(img, r.position.x + xx, r.position.y + 3, Color(GOLD[2] if xx % 6 < 3 else GOLD[1]))
		_px(img, r.position.x + xx, r.end.y - 4, Color(GOLD[1] if xx % 6 < 3 else GOLD[0]))
	for s in [[r.position.x + 7, r.position.y + 8], [r.end.x - 9, r.position.y + 8], [r.position.x + 7, r.end.y - 10], [r.end.x - 9, r.end.y - 10]]:
		_px(img, s[0], s[1], Color(GOLD[4]))
		_px(img, s[0] + 1, s[1], Color(GOLD[3]))
		_px(img, s[0], s[1] + 1, Color(GOLD[3]))
		_px(img, s[0] + 1, s[1] + 1, Color(GOLD[0]))
	# the shadow the plaque throws on the stone beside it
	for yy in range(2, r.size.y - 1):
		var y := r.position.y + yy
		var lean := (r.size.y - 1 - yy) / 5
		var x := r.end.x - lean
		var c := img.get_pixel(x, y)
		if c.a > 0.0:
			img.set_pixel(x, y, c.darkened(0.45))
		x = r.position.x + lean - 1
		c = img.get_pixel(x, y)
		if c.a > 0.0 and bayer(x, y) < 0.5:
			img.set_pixel(x, y, c.darkened(0.3))

static func _sprite(img: Image, rows: PackedStringArray, ox: int, oy: int, key: Dictionary) -> void:
	for j in rows.size():
		for i in rows[j].length():
			var ch := rows[j][i]
			if key.has(ch):
				_px(img, ox + i, oy + j, Color(key[ch]))

## corner plates with chain links, a skull (top left), a moth (top right), a key on a nail (bottom left), a rat (bottom right)
static func _paint_corners(img: Image, _e: Dictionary) -> void:
	# chains: three links hanging from a ring on each corner plate, over the side band
	for side in [0, 1]:
		var x := 7 if side == 0 else W - 12
		for top in [true, false]:
			var y0 := 26 if top else BAND_BOTTOM - 24
			_chain(img, x, y0, 3)
	var ik := {"k": IRON[0], "d": IRON[1], "m": IRON[3], "l": IRON[5], "h": IRON[6]}
	var bk := {"k": IRON[0], "a": BONE[0], "b": BONE[1], "c": BONE[2], "d": BONE[3], "e": BONE[4], "g": GOLD[3], "G": GOLD[4], "y": GOLD[1]}
	# the skull, resting on the top-left quoin
	_sprite(img, PackedStringArray([
		"..ccdc..", ".cdeedc.", "cdeeeedc", "cdeeeedc", "ckkdekkc", "ckkdekkc", ".cddkddc", "..cdcdc.", "..kckck."]), 6, 7, bk)
	# the moth on the top-right stone, wings open
	_sprite(img, PackedStringArray([
		"b.....b", ".ba.ab.", "bcdkdcb", "cddkddc", ".cakac.", "..b.b.."]), W - 16, 9, bk)
	# the key hanging from a nail, bottom left
	_sprite(img, PackedStringArray([
		"...h...", "..yGy..", ".y...y.", ".y...y.", "..yGy..", "...g...", "...g...", "...gg..", "...g...", "...gg.."]), 4, BAND_BOTTOM - 1, bk)
	# the rat, bottom right, tail curling
	_sprite(img, PackedStringArray([
		".......mm", "..mmmm.mk", ".mllmmmmk", "mlkllmmk.", ".m.m.m.k.", "......kk."]), W - 18, H - 13, ik)

static func _chain(img: Image, x: int, y0: int, links: int) -> void:
	# the ring on the plate
	_px(img, x + 1, y0, Color(IRON[5])); _px(img, x + 2, y0, Color(IRON[5]))
	_px(img, x, y0 + 1, Color(IRON[4])); _px(img, x + 3, y0 + 1, Color(IRON[2]))
	_px(img, x + 1, y0 + 2, Color(IRON[3])); _px(img, x + 2, y0 + 2, Color(IRON[1]))
	var y := y0 + 3
	for i in links:
		# a tall oval link, then a short edge-on one
		_px(img, x + 1, y, Color(IRON[5])); _px(img, x + 2, y, Color(IRON[4]))
		_px(img, x, y + 1, Color(IRON[4])); _px(img, x + 3, y + 1, Color(IRON[1]))
		_px(img, x, y + 2, Color(IRON[3])); _px(img, x + 3, y + 2, Color(IRON[0]))
		_px(img, x + 1, y + 3, Color(IRON[2])); _px(img, x + 2, y + 3, Color(IRON[0]))
		_px(img, x + 1, y + 4, Color(IRON[4])); _px(img, x + 2, y + 4, Color(IRON[2]))
		_px(img, x + 1, y + 5, Color(IRON[3])); _px(img, x + 2, y + 5, Color(IRON[1]))
		y += 6

## the brackets the flames stand in (the flames themselves are frames, drawn by the app)
static func _paint_sconces(img: Image, _e: Dictionary) -> void:
	for s in sconces():
		_paint_sconce_bracket(img, s, Vector2i.ZERO)

static func _paint_sconce_bracket(img: Image, s: Dictionary, off: Vector2i) -> void:
	var at: Vector2i = s["at"] + off
	var ik := {"k": IRON[0], "d": IRON[1], "m": IRON[3], "l": IRON[5], "h": IRON[6], "w": WOOD[4], "W": WOOD[6], "v": WOOD[2],
		"b": BONE[3], "c": BONE[2], "a": BONE[1], "g": GOLD[3], "y": GOLD[1]}
	if s["kind"] == "torch":
		# an iron ring holding a wrapped torch, on an arm bolted to the stone
		_sprite(img, PackedStringArray([
			".lmmmd.", "lk...kd", ".vWwvd.", "..WwV..", "..wvd..", "..wvd..", ".lmmmd.", "..hmd..", "..lmd..", "...k..."]), at.x - 3, at.y, ik)
	else:
		# a candle in a brass dish, wax run down one side
		_sprite(img, PackedStringArray([
			"..bcb..", "..bcb..", ".bbcab.", "..bca..", ".ygggy.", "y.....y", ".ykkky."]), at.x - 3, at.y, ik)

## the recess: a dithered shadow cast by the rim along the field's top and left, so the window reads as set in
static func _paint_recess(img: Image, win: Rect2i, top: int, left: int) -> void:
	var k := Color(0, 0, 0, 1)
	for yy in top:
		var f := 1.0 - float(yy) / top
		for x in range(win.position.x, win.end.x):
			if bayer(x, win.position.y + yy) < f * f * 0.9:
				img.set_pixel(x, win.position.y + yy, k)
	for xx in left:
		var f := 1.0 - float(xx) / left
		for y in range(win.position.y + top, win.end.y):
			if bayer(win.position.x + xx, y) < f * f * 0.7:
				img.set_pixel(win.position.x + xx, y, k)

# ------------------------------------------------------------------ flames
## eight frames of a flame: a tongue that leans and licks, a hot core, an ember above it on two of the frames
static func flame_frames(kind: String) -> Array:
	var key := "flames_" + kind
	if _cache.has(key):
		return _cache[key]
	var out := []
	var fw := 7 if kind == "torch" else 5
	var fh := 12 if kind == "torch" else 8
	for f in 8:
		var img := Image.create_empty(fw, fh, false, Image.FORMAT_RGBA8)
		img.fill(Color(0, 0, 0, 0))
		var ph := f / 8.0 * TAU
		var height := (fh - 2) + int(round(sin(ph) * 1.0))
		var lean := int(round(sin(ph * 2.0 + 1.0) * (1.0 if kind == "torch" else 0.6)))
		var cx := fw / 2
		for r in height:
			# the tongue narrows towards the tip; the lean grows with height
			var fr := float(r) / height
			var half := (fw / 2.0) * (1.0 - fr * fr) + 0.3
			var ox := int(round(lean * fr * 1.5))
			if r == height - 1:
				half = 0.4
			var y := fh - 1 - r
			for i in range(-3, 4):
				var d := absf(i) / maxf(half, 0.5)
				if absf(i) > half:
					continue
				var tone := 2
				if fr < 0.25:
					tone = 3 if d < 0.6 else 2
				if fr >= 0.15 and fr < 0.6:
					tone = 5 if d < 0.35 else (4 if d < 0.7 else 2)
				elif fr >= 0.6 and fr < 0.85:
					tone = 4 if d < 0.4 else 2
				elif fr >= 0.85:
					tone = 2 if d < 0.5 else 1
				if fr < 0.1 and d > 0.7:
					tone = 1
				_px(img, cx + i + ox, y, Color(FLAME[tone]))
		if f == 2 or f == 6:
			_px(img, cx + lean + (1 if f == 2 else -1), fh - 2 - height, Color(FLAME[3]))
		out.append(ImageTexture.create_from_image(img))
	_cache[key] = out
	return out

## the light level (0..3) a flame frame throws, so the stone breathes with it
static func flame_level(frame: int, breath: float) -> int:
	var h := 0.5 + 0.5 * sin(frame / 8.0 * TAU)
	return clampi(int(round(h * 1.4 + breath * 1.8)), 0, 3)
