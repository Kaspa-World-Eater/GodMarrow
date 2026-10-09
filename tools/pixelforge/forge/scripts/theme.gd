extends RefCounted
## scripts/theme.gd: the Forge's palette and faces (tools/pixelforge/docs/track_notes/gui_look.md, docs/mockups/forge_app_v8.html).
## Near-black, bone, iron and a dull ember gold for pointers and values; the blackletter banner face, the pixel text
## face for everything else. Every colour here is one of the mockup's. Fonts load straight from the files, no import.

const BG := Color("#0a0a0d")          # behind everything
const INK := Color("#0f0e13")         # the frame's field
const WELL := Color("#0c0b10")        # the picture window and text box fields
const BONE := Color("#d9d2bc")        # text
const DIM := Color("#8f8974")         # quieter text, labels
const FRAME := Color("#b8b19a")       # the border's lit lines
const FRAME2 := Color("#6d6756")      # the border's dark lines, the window rims
const ACCENT := Color("#d9b05c")      # the selector, the chosen thing, values (ember gold)
const GOLD := Color("#c9a24a")        # warnings
const BLOOD := Color("#7a2a2a")
const RULE := Color("#2e2b38")        # dotted rules
const BLACK := Color("#000000")
# the controls' iron and gold (the mockup's C table)
const K := Color("#0a0910")
const D := Color("#2a2733")
const M := Color("#4d475c")
const L := Color("#8a8398")
const H := Color("#b8b19a")
const G := Color("#d9b05c")
const GH := Color("#f0d78f")
const GD := Color("#6b4f25")

const TEXT_SIZE := 16           # VT323 in the 640x360 canvas (32 px on a 1280x720 screen)
const SMALL_SIZE := 12          # names and values under the controls
const BANNER_SIZE := 36         # Jacquard 12 at 3x its grid (the mockup's 48 css px in an 860 px frame = 36 in the 640 canvas)

static var _fonts := {}
static var _theme: Theme = null

## "black" Jacquard 12 (the banner), "text" VT323 (everything else), "tiny" Silkscreen (the frame ruler's numbers)
static func font(kind: String) -> Font:
	if _fonts.has(kind):
		return _fonts[kind]
	var file: String = {"black": "Jacquard12-Regular.ttf", "text": "VT323-Regular.ttf", "tiny": "Silkscreen-Regular.ttf"}.get(kind, "VT323-Regular.ttf")
	var f := FontFile.new()
	if f.load_dynamic_font(ProjectSettings.globalize_path("res://assets/fonts/" + file)) != OK:
		_fonts[kind] = ThemeDB.fallback_font
		return _fonts[kind]
	f.antialiasing = TextServer.FONT_ANTIALIASING_NONE
	f.hinting = TextServer.HINTING_NONE
	f.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
	f.generate_mipmaps = false
	f.allow_system_fallback = false
	_fonts[kind] = f
	return f

static func text_width(s: String, size: int = TEXT_SIZE, kind: String = "text") -> float:
	return font(kind).get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x

## the Theme the few stock controls share (labels, the describe line)
static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font = font("text")
	t.default_font_size = TEXT_SIZE
	t.set_color("font_color", "Label", BONE)
	t.set_font_size("font_size", "Label", TEXT_SIZE)
	for v in ["Dim", "Accent", "Small", "SmallDim", "Gold"]:
		t.add_type(v)
		t.set_type_variation(v, "Label")
	t.set_color("font_color", "Dim", DIM)
	t.set_color("font_color", "Accent", ACCENT)
	t.set_color("font_color", "Gold", GOLD)
	t.set_font_size("font_size", "Small", SMALL_SIZE)
	t.set_font_size("font_size", "SmallDim", SMALL_SIZE)
	t.set_color("font_color", "SmallDim", DIM)
	# the foot line sits on the frame's wooden sill: a one-pixel dark edge keeps it readable
	for v in ["Small", "SmallDim"]:
		t.set_color("font_outline_color", v, BLACK)
		t.set_constant("outline_size", v, 1)
	var le := StyleBoxFlat.new()
	le.bg_color = WELL
	le.set_border_width_all(0)
	le.set_content_margin_all(0)
	le.content_margin_left = 2
	t.set_stylebox("normal", "LineEdit", le)
	t.set_stylebox("focus", "LineEdit", le)
	t.set_stylebox("read_only", "LineEdit", le)
	t.set_color("font_color", "LineEdit", BONE)
	t.set_color("font_placeholder_color", "LineEdit", DIM)
	t.set_color("caret_color", "LineEdit", ACCENT)
	t.set_color("selection_color", "LineEdit", Color(ACCENT, 0.35))
	t.set_font_size("font_size", "LineEdit", TEXT_SIZE)
	var te := StyleBoxFlat.new()
	te.bg_color = INK
	te.set_content_margin_all(2)
	t.set_stylebox("normal", "TextEdit", te)
	t.set_stylebox("focus", "TextEdit", te)
	t.set_stylebox("read_only", "TextEdit", te)
	t.set_color("font_color", "TextEdit", DIM)
	t.set_color("font_readonly_color", "TextEdit", DIM)
	t.set_font_size("font_size", "TextEdit", SMALL_SIZE)
	# the file dialog, when the system has none: dark, in the text face
	var panel := StyleBoxFlat.new()
	panel.bg_color = INK
	panel.border_color = FRAME2
	panel.set_border_width_all(2)
	panel.set_content_margin_all(6)
	for cls in ["FileDialog", "AcceptDialog", "PopupPanel", "PopupMenu"]:
		t.set_stylebox("panel", cls, panel)
	t.set_color("title_color", "FileDialog", BONE)
	t.set_font("title_font", "FileDialog", font("text"))
	t.set_font_size("title_font_size", "FileDialog", TEXT_SIZE)
	var btn := StyleBoxFlat.new()
	btn.bg_color = D
	btn.border_color = L
	btn.set_border_width_all(1)
	btn.set_content_margin_all(3)
	t.set_stylebox("normal", "Button", btn)
	t.set_stylebox("hover", "Button", btn)
	t.set_stylebox("pressed", "Button", btn)
	t.set_stylebox("focus", "Button", btn)
	t.set_color("font_color", "Button", BONE)
	t.set_font_size("font_size", "Button", SMALL_SIZE)
	var list := StyleBoxFlat.new()
	list.bg_color = WELL
	list.set_content_margin_all(2)
	t.set_stylebox("panel", "Tree", list)
	t.set_stylebox("focus", "Tree", list)
	t.set_color("font_color", "Tree", BONE)
	t.set_font_size("font_size", "Tree", SMALL_SIZE)
	var sel := StyleBoxFlat.new()
	sel.bg_color = Color(ACCENT, 0.3)
	t.set_stylebox("selected", "Tree", sel)
	t.set_stylebox("selected_focus", "Tree", sel)
	t.set_stylebox("panel", "ItemList", list)
	t.set_color("font_color", "ItemList", BONE)
	t.set_font_size("font_size", "ItemList", SMALL_SIZE)
	t.set_stylebox("selected", "ItemList", sel)
	t.set_stylebox("selected_focus", "ItemList", sel)
	t.set_font_size("font_size", "OptionButton", SMALL_SIZE)
	t.set_stylebox("normal", "OptionButton", btn)
	t.set_stylebox("hover", "OptionButton", btn)
	t.set_stylebox("pressed", "OptionButton", btn)
	t.set_stylebox("focus", "OptionButton", btn)
	t.set_color("font_color", "OptionButton", BONE)
	t.set_font_size("font_size", "PopupMenu", SMALL_SIZE)
	t.set_color("font_color", "PopupMenu", BONE)
	t.set_stylebox("panel", "ScrollContainer", StyleBoxEmpty.new())
	_theme = t
	return t

## "hue 0.5" style formatting for the values under the controls
static func fmt(v: float, places: int = 2) -> String:
	if places <= 0:
		return str(int(round(v)))
	return String.num(v, places)
