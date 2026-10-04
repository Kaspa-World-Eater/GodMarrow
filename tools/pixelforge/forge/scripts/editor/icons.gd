extends RefCounted
const T := preload("res://scripts/theme.gd")
## scripts/editor/icons.gd: the editor's tool icons, drawn one pixel at a time (12x12, shown at 2x so they read at
## 1280x720), in the controls' iron and gold: X the dark rim, O bone, G gold, L light iron, M mid iron, . clear.
## Also the anchor glyph for a dropped effect and the transparency checker behind a frame.

static var _cache := {}

const ICONS := {
	"pencil": [
		"........XXX.", ".......XGGX.", "......XGGX..", ".....XOOX...", "....XOOX....", "...XOOX.....",
		"..XOOX......", ".XOOX.......", ".XOX........", ".XXX........", "............", "............"],
	"brush": [
		".......XXXX.", "......XGGGX.", ".....XGGGX..", "....XGGGX...", "...XXGGX....", "..XOOXX.....",
		".XOOOX......", ".XOOOX......", ".XOOX.......", "..XX........", "............", "............"],
	"eraser": [
		"............", "......XXXXX.", ".....XLLLLX.", "....XLLLLXX.", "...XLLLLXOX.", "..XLLLLXOX..",
		".XOOOOXOX...", ".XOOOOOX....", ".XOOOOX.....", ".XXXXXX.....", "............", "............"],
	"fill": [
		"....XX......", "...XOOX.....", "..XOOOOX....", ".XOOOOOOX...", ".XOOOOOOX...", ".XXOOOOX.XX.",
		"...XOOX..XGX", "....XX...XGX", "..........GX", "....XXXXXX..", "...XGGGGGGX.", "....XXXXXX.."],
	"line": [
		"............", "..........XX", ".........XOX", "........XOX.", ".......XOX..", "......XOX...",
		".....XOX....", "....XOX.....", "...XOX......", "..XOX.......", ".XOX........", ".XX........."],
	"rect": [
		"............", ".XXXXXXXXXX.", ".XOOOOOOOOX.", ".XOXXXXXXOX.", ".XOX....XOX.", ".XOX....XOX.",
		".XOX....XOX.", ".XOX....XOX.", ".XOXXXXXXOX.", ".XOOOOOOOOX.", ".XXXXXXXXXX.", "............"],
	"ellipse": [
		"............", "....XXXX....", "..XXOOOOXX..", ".XOOXXXXOOX.", ".XOX....XOX.", "XOX......XOX",
		"XOX......XOX", ".XOX....XOX.", ".XOOXXXXOOX.", "..XXOOOOXX..", "....XXXX....", "............"],
	"wand": [
		".....X......", "....XGX.....", "..X.XGX.X...", "...XGGGX....", "XGGGGGGGGGX.", "...XGGGX....",
		"..X.XGX.X...", "....XGX.....", ".....XOX....", "......XOX...", ".......XOX..", "........XX.."],
	"lasso": [
		"............", "...XXXXXX...", "..XOOOOOOX..", ".XOX....XOX.", ".XOX....XOX.", ".XOX....XOX.",
		"..XOOOOOOX..", "...XXXOOX...", "......XOX...", ".....XOX....", ".....XX.....", "............"],
	"select": [
		"XXX..XX..XXX", "XOX..XO..XOX", "XX........XX", "............", "XO........OX", "XO........OX",
		"............", "XX........XX", "XOX..XO..XOX", "XXX..XX..XXX", "............", "............"],
	"move": [
		".....XX.....", "....XOOX....", "...XOOOOX...", ".....OO.....", "..X..OO..X..", ".XO.OOOO.OX.",
		".XO.OOOO.OX.", "..X..OO..X..", ".....OO.....", "...XOOOOX...", "....XOOX....", ".....XX....."],
	"clone": [
		"..XXXXX.....", ".XOOOOOX....", ".XO...OX....", ".XO.XXXXXXX.", ".XO.XGGGGGX.", ".XOOXGGGGGX.",
		"....XGGGGGX.", "....XGGGGGX.", "....XGGGGGX.", "....XXXXXXX.", "............", "............"],
	"eyedropper": [
		".........XX.", "........XGGX", ".......XGGGX", "......XXGGX.", ".....XOXXX..", "....XOOX....",
		"...XOOX.....", "..XOOX......", ".XOOX.......", "XOOX........", "XXX.........", "............"],
	"hand": [
		"....X.X.....", "...XOXOX.X..", "...XOXOXXOX.", ".X.XOXOXXOX.", "XOXXOOOOOOX.", "XOOXOOOOOOX.",
		".XOOOOOOOOX.", ".XOOOOOOOX..", "..XOOOOOOX..", "...XOOOOX...", "...XXXXXX...", "............"],
}

static func tool_icon(name: String, hot: bool) -> Texture2D:
	var key := "tool_%s_%s" % [name, hot]
	if _cache.has(key):
		return _cache[key]
	var rows: Array = ICONS.get(name, ICONS["pencil"])
	var img := Image.create_empty(12, 12, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	for j in rows.size():
		var row: String = rows[j]
		for i in row.length():
			var ch := row[i]
			var c: Color
			match ch:
				"X": c = T.K
				"O": c = (Color("#ffffff") if hot else T.BONE)
				"G": c = (T.GH if hot else T.G)
				"L": c = T.L
				"M": c = T.M
				_: continue
			img.set_pixel(i, j, c)
	var tex := ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex

## the anchor glyph: a gold diamond with a dark rim (9x9); `on` is the picked one
static func anchor_glyph(on: bool) -> Texture2D:
	var key := "anchor_%s" % on
	if _cache.has(key):
		return _cache[key]
	var img := Image.create_empty(9, 9, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	for y in 9:
		for x in 9:
			var d := absi(x - 4) + absi(y - 4)
			if d == 4:
				img.set_pixel(x, y, T.K)
			elif d < 4:
				img.set_pixel(x, y, (Color("#ffffff") if on else T.GH) if d <= 1 else (T.GH if on else T.G))
	var tex := ImageTexture.create_from_image(img)
	_cache[key] = tex
	return tex

## the checker behind see-through pixels, in two dark tones
static func checker() -> Texture2D:
	if _cache.has("checker"):
		return _cache["checker"]
	var img := Image.create_empty(2, 2, false, Image.FORMAT_RGBA8)
	img.set_pixel(0, 0, Color("#17161d")); img.set_pixel(1, 1, Color("#17161d"))
	img.set_pixel(1, 0, Color("#0f0e13")); img.set_pixel(0, 1, Color("#0f0e13"))
	var tex := ImageTexture.create_from_image(img)
	_cache["checker"] = tex
	return tex
