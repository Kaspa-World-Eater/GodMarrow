extends RefCounted
## scripts/theme.gd: the Forge's look, borrowed from the game (ui/uikit.gd): the same fonts (IM Fell English, IM Fell
## English SC, Silkscreen), near-black panels, bone text, iron studs, the game's own 9-slice frames (assets/ui), dull
## teal for the one thing to do next, dull gold for warnings, amber only for the lantern. Nothing here is imported
## through Godot's import pipeline: fonts and pictures load straight from the files, so the project runs from a
## plain folder with no editor pass.

const BG := Color("#06060a")          # the page behind everything
const INK := Color("#0a090d")         # panels
const INK2 := Color("#12111a")        # raised panels
const SEAM := Color("#050407")
const TEXT := Color("#e8e2d0")        # bone
const MUTED := Color("#a39d8c")
const DIM := Color("#6f6a79")
const FAINT := Color("#5a5563")
const IRON := Color("#3a3446")
const IRON_L := Color("#6a6478")
const IRON_D := Color("#1f1c24")
const TEAL := Color("#44aea6")        # the next thing to do
const TEAL_D := Color("#1d4a4c")
const TEAL_L := Color("#8fe3d2")
const GOLD := Color("#d9a441")        # warnings, things that need you
const GOLD_D := Color("#7a5a24")
const AMBER := Color("#f0a040")       # lanterns only
const GREEN := Color("#9ac070")       # a quiet "done"

static var _fonts := {}
static var _tex := {}
static var _theme: Theme = null

## "pixel" Silkscreen, "pixelb" Silkscreen Bold, "book" IM Fell English, "italic", "sc" IM Fell English SC
static func font(kind: String) -> Font:
	if _fonts.has(kind):
		return _fonts[kind]
	var file: String = {"pixel": "Silkscreen-Regular.ttf", "pixelb": "Silkscreen-Bold.ttf", "book": "IMFeENrm28P.ttf",
		"italic": "IMFeENit28P.ttf", "sc": "IMFeENsc28P.ttf"}.get(kind, "IMFeENrm28P.ttf")
	var f := FontFile.new()
	if f.load_dynamic_font(ProjectSettings.globalize_path("res://assets/fonts/" + file)) != OK:
		_fonts[kind] = ThemeDB.fallback_font
		return _fonts[kind]
	if kind.begins_with("pixel"):
		f.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		f.hinting = TextServer.HINTING_NONE
		f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
		f.oversampling = 1.0
	else:
		f.hinting = TextServer.HINTING_LIGHT
	_fonts[kind] = f
	return f

## a picture from a file (res:// or an absolute path), cached; null when it cannot be read
static func tex(path: String, cache: bool = true) -> Texture2D:
	if cache and _tex.has(path):
		return _tex[path]
	var t: Texture2D = null
	var p := ProjectSettings.globalize_path(path) if path.begins_with("res://") else path
	if FileAccess.file_exists(p):
		var img := Image.load_from_file(p)
		if img:
			t = ImageTexture.create_from_image(img)
	if cache:
		_tex[path] = t
	return t

static func forget(path: String) -> void:
	_tex.erase(path)

## one of the game's 9-slice frames (assets/ui/<name>.png + .json margins) as a StyleBoxTexture
static func nine(name: String, margin_scale: float = 1.0) -> StyleBox:
	var t := tex("res://assets/ui/%s.png" % name)
	if t == null:
		return flat(INK, IRON)
	var m := 10
	var f := FileAccess.open("res://assets/ui/%s.json" % name, FileAccess.READ)
	if f:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary and d.has("margins"):
			m = int(d["margins"].get("left", 10))
	var sb := StyleBoxTexture.new()
	sb.texture = t
	sb.texture_margin_left = m
	sb.texture_margin_right = m
	sb.texture_margin_top = m
	sb.texture_margin_bottom = m
	sb.content_margin_left = m * margin_scale
	sb.content_margin_right = m * margin_scale
	sb.content_margin_top = m * margin_scale
	sb.content_margin_bottom = m * margin_scale
	sb.axis_stretch_horizontal = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
	sb.axis_stretch_vertical = StyleBoxTexture.AXIS_STRETCH_MODE_TILE
	return sb

## a carved stud (uikit.stud): seam, face, a lit top-left edge and a dark bottom-right one
static func stud(face: Color, lit: Color, dark: Color, border: Color = SEAM, pad: Vector2 = Vector2(8, 4)) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = face
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_content_margin_all(0)
	sb.content_margin_left = pad.x
	sb.content_margin_right = pad.x
	sb.content_margin_top = pad.y
	sb.content_margin_bottom = pad.y
	sb.shadow_color = Color(dark, 0.0)
	# the bevel: a lit line along the top and left, a dark one along the bottom and right
	sb.border_width_top = 2
	sb.border_width_left = 2
	sb.border_color = lit
	sb.expand_margin_bottom = 0
	# StyleBoxFlat has one border colour; the dark edge is the shadow, offset down-right
	sb.shadow_color = dark
	sb.shadow_size = 1
	sb.shadow_offset = Vector2(1, 1)
	return sb

static func flat(bg: Color, border: Color = Color(0, 0, 0, 0), width: int = 1, pad: float = 6.0, radius: int = 0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(width if border.a > 0 else 0)
	sb.set_content_margin_all(pad)
	sb.set_corner_radius_all(radius)
	return sb

static func empty() -> StyleBoxEmpty:
	return StyleBoxEmpty.new()

## the Theme every control shares
static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font = font("book")
	t.default_font_size = 10
	# ---- labels
	t.set_color("font_color", "Label", TEXT)
	t.set_font_size("font_size", "Label", 10)
	for v in ["Title", "Muted", "Dim", "Pixel", "PixelDim", "Italic", "Gold", "Teal", "Big", "Small"]:
		t.add_type(v)
		t.set_type_variation(v, "Label")
	t.set_font("font", "Title", font("sc"))
	t.set_font_size("font_size", "Title", 14)
	t.set_color("font_color", "Muted", MUTED)
	t.set_color("font_color", "Dim", DIM)
	t.set_font("font", "Pixel", font("pixel"))
	t.set_font_size("font_size", "Pixel", 8)
	t.set_font("font", "PixelDim", font("pixel"))
	t.set_font_size("font_size", "PixelDim", 8)
	t.set_color("font_color", "PixelDim", DIM)
	t.set_font("font", "Italic", font("italic"))
	t.set_color("font_color", "Italic", MUTED)
	t.set_color("font_color", "Gold", GOLD)
	t.set_color("font_color", "Teal", TEAL)
	t.set_font("font", "Big", font("sc"))
	t.set_font_size("font_size", "Big", 20)
	t.set_font_size("font_size", "Small", 9)
	t.set_color("font_color", "Small", MUTED)
	# ---- buttons: carved iron studs; the primary one in dull teal
	var normal := stud(IRON, IRON_L, Color("#15121a"))
	var hover := stud(Color("#4a4258"), Color("#7a7488"), Color("#15121a"))
	var pressed := stud(Color("#2a2634"), Color("#1a1720"), Color("#4a4258"))
	var disabled := stud(IRON_D, Color("#2e2a36"), Color("#0e0c12"))
	var focus := flat(Color(0, 0, 0, 0), TEAL, 2, 0)
	focus.expand_margin_left = 2
	focus.expand_margin_right = 2
	focus.expand_margin_top = 2
	focus.expand_margin_bottom = 2
	t.set_stylebox("normal", "Button", normal)
	t.set_stylebox("hover", "Button", hover)
	t.set_stylebox("pressed", "Button", pressed)
	t.set_stylebox("disabled", "Button", disabled)
	t.set_stylebox("focus", "Button", focus)
	t.set_font("font", "Button", font("pixel"))
	t.set_font_size("font_size", "Button", 8)
	t.set_color("font_color", "Button", TEXT)
	t.set_color("font_hover_color", "Button", Color.WHITE)
	t.set_color("font_pressed_color", "Button", MUTED)
	t.set_color("font_disabled_color", "Button", FAINT)
	t.set_color("font_focus_color", "Button", TEXT)
	t.set_constant("h_separation", "Button", 4)
	for v in ["Primary", "Ghost", "Tile", "Warn", "Chip", "ChipOn", "Pick"]:
		t.add_type(v)
		t.set_type_variation(v, "Button")
	var pn := stud(TEAL_D, TEAL, Color("#0d1e22"), SEAM, Vector2(12, 7))
	var ph := stud(Color("#276a66"), TEAL_L, Color("#0d1e22"), SEAM, Vector2(12, 7))
	var pp := stud(Color("#163a3c"), Color("#0d1e22"), TEAL, SEAM, Vector2(12, 7))
	var pd := stud(IRON_D, Color("#2e2a36"), Color("#0e0c12"), SEAM, Vector2(12, 7))
	t.set_stylebox("normal", "Primary", pn)
	t.set_stylebox("hover", "Primary", ph)
	t.set_stylebox("pressed", "Primary", pp)
	t.set_stylebox("disabled", "Primary", pd)
	t.set_color("font_color", "Primary", Color("#eafff8"))
	t.set_color("font_hover_color", "Primary", Color.WHITE)
	t.set_font("font", "Primary", font("pixelb"))
	t.set_font_size("font_size", "Primary", 8)
	var gn := flat(Color(0, 0, 0, 0), Color(0, 0, 0, 0), 0, 3)
	var gh := flat(Color(1, 1, 1, 0.06), Color(0, 0, 0, 0), 0, 3)
	t.set_stylebox("normal", "Ghost", gn)
	t.set_stylebox("hover", "Ghost", gh)
	t.set_stylebox("pressed", "Ghost", gh)
	t.set_stylebox("disabled", "Ghost", gn)
	t.set_color("font_color", "Ghost", MUTED)
	t.set_color("font_hover_color", "Ghost", TEXT)
	var wn := stud(GOLD_D, GOLD, Color("#2a1e0a"), SEAM, Vector2(10, 5))
	var wh := stud(Color("#9a7430"), Color("#f0d080"), Color("#2a1e0a"), SEAM, Vector2(10, 5))
	t.set_stylebox("normal", "Warn", wn)
	t.set_stylebox("hover", "Warn", wh)
	t.set_stylebox("pressed", "Warn", wn)
	t.set_color("font_color", "Warn", Color("#fff1c8"))
	# home tiles: a dark plate with an iron rim; teal rim when hovered or focused
	var tn := flat(INK2, Color("#2e2a38"), 1, 6)
	var th := flat(Color("#1a1824"), TEAL, 1, 6)
	var tp := flat(Color("#0e0d14"), TEAL_D, 1, 6)
	t.set_stylebox("normal", "Tile", tn)
	t.set_stylebox("hover", "Tile", th)
	t.set_stylebox("pressed", "Tile", tp)
	t.set_stylebox("disabled", "Tile", tn)
	t.set_stylebox("focus", "Tile", focus)
	# chips (the progress strip, choices): small, flat
	var cn := flat(INK2, Color("#2e2a38"), 1, 3)
	var ch := flat(Color("#1a1824"), IRON_L, 1, 3)
	var con := flat(TEAL_D, TEAL, 1, 3)
	t.set_stylebox("normal", "Chip", cn)
	t.set_stylebox("hover", "Chip", ch)
	t.set_stylebox("pressed", "Chip", ch)
	t.set_stylebox("disabled", "Chip", cn)
	t.set_color("font_color", "Chip", MUTED)
	t.set_color("font_disabled_color", "Chip", FAINT)
	t.set_stylebox("normal", "ChipOn", con)
	t.set_stylebox("hover", "ChipOn", con)
	t.set_stylebox("pressed", "ChipOn", con)
	t.set_stylebox("disabled", "ChipOn", con)
	t.set_color("font_color", "ChipOn", Color("#eafff8"))
	t.set_color("font_disabled_color", "ChipOn", Color("#eafff8"))
	# pick buttons (choices with a picture): like tiles, smaller padding
	t.set_stylebox("normal", "Pick", flat(INK2, Color("#2e2a38"), 1, 4))
	t.set_stylebox("hover", "Pick", flat(Color("#1a1824"), TEAL, 1, 4))
	t.set_stylebox("pressed", "Pick", flat(TEAL_D, TEAL, 1, 4))
	t.set_stylebox("focus", "Pick", focus)
	# ---- panels
	t.set_stylebox("panel", "PanelContainer", flat(INK, Color("#2e2a38"), 1, 8))
	t.set_stylebox("panel", "Panel", flat(INK, Color("#2e2a38"), 1, 0))
	for v in ["Card", "Plate", "Drop", "Bone", "Iron", "Vellum", "Ward", "Dark"]:
		t.add_type(v)
		t.set_type_variation(v, "PanelContainer")
	t.set_stylebox("panel", "Card", flat(INK2, IRON, 1, 10))
	t.set_stylebox("panel", "Plate", flat(Color("#0d0c12"), Color("#221e2a"), 1, 6))
	t.set_stylebox("panel", "Dark", flat(Color("#040408"), Color("#1a1720"), 1, 6))
	t.set_stylebox("panel", "Drop", flat(Color("#0b1416"), TEAL_D, 2, 10))
	t.set_stylebox("panel", "Bone", nine("pf_bone_frame", 0.75))
	t.set_stylebox("panel", "Iron", nine("pf_iron_frame", 0.75))
	t.set_stylebox("panel", "Vellum", nine("pf_vellum_panel", 0.8))
	t.set_stylebox("panel", "Ward", nine("pf_teal_ward_frame", 1.0))
	# ---- text entry
	var le := flat(Color("#1a1518"), Color("#332c34"), 1, 5)
	t.set_stylebox("normal", "LineEdit", le)
	t.set_stylebox("focus", "LineEdit", flat(Color("#1a1518"), TEAL, 1, 5))
	t.set_stylebox("read_only", "LineEdit", flat(Color("#120f12"), Color("#221e2a"), 1, 5))
	t.set_color("font_color", "LineEdit", TEXT)
	t.set_color("font_placeholder_color", "LineEdit", DIM)
	t.set_color("caret_color", "LineEdit", TEAL)
	t.set_color("selection_color", "LineEdit", TEAL_D)
	t.set_font_size("font_size", "LineEdit", 10)
	t.set_stylebox("normal", "TextEdit", le)
	t.set_stylebox("focus", "TextEdit", le)
	t.set_stylebox("read_only", "TextEdit", le)
	t.set_color("font_color", "TextEdit", MUTED)
	t.set_color("font_readonly_color", "TextEdit", MUTED)
	t.set_font("font", "TextEdit", font("pixel"))
	t.set_font_size("font_size", "TextEdit", 8)
	# ---- check buttons / boxes
	t.set_font("font", "CheckButton", font("pixel"))
	t.set_font_size("font_size", "CheckButton", 8)
	t.set_color("font_color", "CheckButton", TEXT)
	t.set_color("font_hover_color", "CheckButton", Color.WHITE)
	t.set_stylebox("normal", "CheckButton", gn)
	t.set_stylebox("hover", "CheckButton", gh)
	t.set_stylebox("pressed", "CheckButton", gn)
	t.set_stylebox("focus", "CheckButton", focus)
	t.set_icon("checked", "CheckButton", _toggle(true))
	t.set_icon("unchecked", "CheckButton", _toggle(false))
	t.set_font("font", "CheckBox", font("pixel"))
	t.set_font_size("font_size", "CheckBox", 8)
	t.set_color("font_color", "CheckBox", TEXT)
	t.set_stylebox("normal", "CheckBox", gn)
	t.set_stylebox("hover", "CheckBox", gh)
	t.set_stylebox("pressed", "CheckBox", gn)
	t.set_stylebox("focus", "CheckBox", focus)
	t.set_icon("checked", "CheckBox", _box(true))
	t.set_icon("unchecked", "CheckBox", _box(false))
	# ---- sliders
	t.set_stylebox("slider", "HSlider", flat(Color("#1a1518"), Color("#332c34"), 1, 0))
	t.set_stylebox("grabber_area", "HSlider", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_area_highlight", "HSlider", flat(TEAL, Color(0, 0, 0, 0), 0, 0))
	t.set_icon("grabber", "HSlider", _grabber(false))
	t.set_icon("grabber_highlight", "HSlider", _grabber(true))
	t.set_icon("grabber_disabled", "HSlider", _grabber(false))
	# ---- scroll bars
	# a bar that can be seen on the near-black page: an iron track 3 px wide (6 on screen) with a lit grabber, so a
	# column with more below it says so
	t.set_stylebox("scroll", "VScrollBar", flat(IRON_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber", "VScrollBar", flat(IRON_L, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_highlight", "VScrollBar", flat(DIM, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_pressed", "VScrollBar", flat(TEAL, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("scroll", "HScrollBar", flat(IRON_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber", "HScrollBar", flat(IRON_L, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_highlight", "HScrollBar", flat(DIM, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("grabber_pressed", "HScrollBar", flat(TEAL, Color(0, 0, 0, 0), 0, 0))
	for bar in ["VScrollBar", "HScrollBar"]:
		for k in ["scroll", "grabber", "grabber_highlight", "grabber_pressed"]:
			var sb: StyleBoxFlat = t.get_stylebox(k, bar)
			if bar == "VScrollBar":
				sb.content_margin_left = 1.5
				sb.content_margin_right = 1.5
			else:
				sb.content_margin_top = 1.5
				sb.content_margin_bottom = 1.5
	# ---- progress bar
	t.set_stylebox("background", "ProgressBar", flat(Color("#1a1518"), Color("#332c34"), 1, 0))
	t.set_stylebox("fill", "ProgressBar", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_color("font_color", "ProgressBar", TEXT)
	# ---- the file dialog (when the system one is not available)
	t.set_stylebox("panel", "FileDialog", flat(INK, IRON, 1, 8))
	t.set_stylebox("panel", "AcceptDialog", flat(INK, IRON, 1, 8))
	t.set_color("title_color", "FileDialog", TEXT)
	t.set_font("title_font", "FileDialog", font("sc"))
	t.set_font_size("title_font_size", "FileDialog", 12)
	t.set_stylebox("panel", "Tree", flat(Color("#0d0c12"), Color("#221e2a"), 1, 4))
	t.set_stylebox("focus", "Tree", flat(Color("#0d0c12"), TEAL, 1, 4))
	t.set_color("font_color", "Tree", TEXT)
	t.set_color("font_selected_color", "Tree", Color("#eafff8"))
	t.set_stylebox("selected", "Tree", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("selected_focus", "Tree", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("normal", "OptionButton", normal)
	t.set_stylebox("hover", "OptionButton", hover)
	t.set_stylebox("pressed", "OptionButton", pressed)
	t.set_stylebox("focus", "OptionButton", focus)
	t.set_font("font", "OptionButton", font("pixel"))
	t.set_font_size("font_size", "OptionButton", 8)
	t.set_color("font_color", "OptionButton", TEXT)
	t.set_stylebox("panel", "PopupMenu", flat(INK, IRON, 1, 4))
	t.set_stylebox("hover", "PopupMenu", flat(TEAL_D, Color(0, 0, 0, 0), 0, 2))
	t.set_color("font_color", "PopupMenu", TEXT)
	t.set_color("font_hover_color", "PopupMenu", Color("#eafff8"))
	t.set_font("font", "PopupMenu", font("pixel"))
	t.set_font_size("font_size", "PopupMenu", 8)
	t.set_stylebox("panel", "PopupPanel", flat(INK, IRON, 1, 6))
	t.set_stylebox("panel", "TooltipPanel", flat(Color("#06060a"), IRON, 1, 5))
	t.set_color("font_color", "TooltipLabel", TEXT)
	t.set_font_size("font_size", "TooltipLabel", 9)
	t.set_stylebox("panel", "ItemList", flat(Color("#0d0c12"), Color("#221e2a"), 1, 4))
	t.set_stylebox("focus", "ItemList", flat(Color("#0d0c12"), TEAL, 1, 4))
	t.set_color("font_color", "ItemList", TEXT)
	t.set_color("font_selected_color", "ItemList", Color("#eafff8"))
	t.set_stylebox("selected", "ItemList", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("selected_focus", "ItemList", flat(TEAL_D, Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("hovered", "ItemList", flat(Color("#1a1824"), Color(0, 0, 0, 0), 0, 0))
	t.set_stylebox("panel", "ScrollContainer", empty())
	_theme = t
	return t

## a small drawn toggle (bone knob on an iron rail, teal when on)
static func _toggle(on: bool) -> Texture2D:
	var img := Image.create(22, 10, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	img.fill_rect(Rect2i(0, 2, 22, 6), SEAM)
	img.fill_rect(Rect2i(1, 3, 20, 4), TEAL_D if on else IRON_D)
	var x := 12 if on else 1
	img.fill_rect(Rect2i(x, 0, 9, 10), SEAM)
	img.fill_rect(Rect2i(x + 1, 1, 7, 8), TEAL if on else IRON_L)
	img.fill_rect(Rect2i(x + 1, 1, 7, 1), TEAL_L if on else Color("#9a94a8"))
	return ImageTexture.create_from_image(img)

static func _box(on: bool) -> Texture2D:
	var img := Image.create(10, 10, false, Image.FORMAT_RGBA8)
	img.fill(SEAM)
	img.fill_rect(Rect2i(1, 1, 8, 8), Color("#1a1518"))
	if on:
		img.fill_rect(Rect2i(2, 2, 6, 6), TEAL)
		img.fill_rect(Rect2i(3, 3, 4, 4), TEAL_L)
	return ImageTexture.create_from_image(img)

static func _grabber(hi: bool) -> Texture2D:
	var img := Image.create(8, 12, false, Image.FORMAT_RGBA8)
	img.fill(SEAM)
	img.fill_rect(Rect2i(1, 1, 6, 10), TEAL if hi else TEXT)
	img.fill_rect(Rect2i(1, 1, 6, 1), Color.WHITE)
	return ImageTexture.create_from_image(img)

## the pointer: a bone arrow with a dark rim, drawn at 2x (cursors are in screen pixels)
static func cursor() -> Texture2D:
	var rows := [
		"X...........", "XX..........", "XOX.........", "XOOX........", "XOOOX.......", "XOOOOX......", "XOOOOOX.....",
		"XOOOOOOX....", "XOOOOOOOX...", "XOOOOOOOOX..", "XOOOOOXXXXX.", "XOOXOOX.....", "XOX.XOOX....", "XX..XOOX....",
		"X....XOOX...", ".....XOOX...", "......XX...."]
	var img := Image.create(24, 34, false, Image.FORMAT_RGBA8)
	img.fill(Color(0, 0, 0, 0))
	for j in rows.size():
		for i in rows[j].length():
			var ch: String = rows[j][i]
			if ch == ".":
				continue
			img.fill_rect(Rect2i(i * 2, j * 2, 2, 2), SEAM if ch == "X" else TEXT)
	return ImageTexture.create_from_image(img)
