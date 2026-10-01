extends Control
const FT := preload("res://scripts/theme.gd")
const W := preload("res://scripts/widgets.gd")
const FSfx := preload("res://scripts/sfx.gd")
const Backend := preload("res://scripts/backend.gd")
## scripts/screen.gd: one screen of the Forge. A header (Back, the title, the log and window buttons), a body, and a
## footer hint. Screens are built in code, grab a first focus so a gamepad or the keyboard can drive them, and get
## told about dropped files. `app` is the shell (scripts/app.gd).

var app: Node
var header: HBoxContainer
var body: VBoxContainer
var footer: Label
var title_label: Label
var first_focus: Control = null
var screen_name := ""
var args := {}

func _init() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_PASS

func setup(a: Node, name_: String, arguments: Dictionary) -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)   # here, not in _init: quests override _init
	app = a
	screen_name = name_
	args = arguments
	var root := W.col(0)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 12
	root.offset_right = -12
	root.offset_top = 6
	root.offset_bottom = -4
	add_child(root)
	header = W.row(6)
	header.custom_minimum_size = Vector2(0, 22)
	root.add_child(header)
	var back := W.ghost("‹ Back", func(): app.back())
	back.name = "Back"
	back.visible = screen_name != "home"
	header.add_child(back)
	title_label = W.title("")
	title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	header.add_child(title_label)
	header.add_child(W.spacer())
	var logb := W.ghost("Log", func(): app.toggle_log())
	header.add_child(logb)
	var winb := W.ghost("Window" if app.is_fullscreen() else "Full screen", func(): app.toggle_fullscreen())
	winb.name = "WindowToggle"
	header.add_child(winb)
	root.add_child(W.rule(FT.IRON))
	body = W.col(6)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(body)
	footer = W.label("", "PixelDim", HORIZONTAL_ALIGNMENT_CENTER)
	footer.custom_minimum_size = Vector2(0, 12)
	root.add_child(footer)
	build()

func set_title(t: String) -> void:
	title_label.text = t

func hint(t: String) -> void:
	footer.text = t

## override: build the body
func build() -> void:
	pass

## override: a file dropped on the window while this screen shows
func on_drop(_paths: PackedStringArray) -> void:
	pass

## override: called when the screen is shown (after the transition)
func on_enter() -> void:
	pass

func focus_first() -> void:
	if first_focus and is_instance_valid(first_focus) and first_focus.is_visible_in_tree():
		first_focus.grab_focus()
		return
	for c in _buttons(body):
		if c.is_visible_in_tree() and not c.disabled and c.focus_mode != Control.FOCUS_NONE:
			c.grab_focus()
			return

func _buttons(n: Node) -> Array:
	var out := []
	for c in n.get_children():
		if c is BaseButton:
			out.append(c)
		out.append_array(_buttons(c))
	return out

## wipe the body and rebuild it (screens that change state use this)
func clear_body() -> void:
	for c in body.get_children():
		body.remove_child(c)
		c.queue_free()

## the standard two-column layout: a picture panel on the left, words and the big action on the right
func two_columns(left_variation: String = "Dark") -> Dictionary:
	var h := W.row(10)
	h.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(h)
	var left := W.panel(left_variation)
	left.custom_minimum_size = Vector2(300, 0)
	left.size_flags_vertical = Control.SIZE_EXPAND_FILL
	h.add_child(left)
	var sc := ScrollContainer.new()
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.follow_focus = true
	h.add_child(sc)
	var right := W.col(6)
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.add_child(right)
	return {"row": h, "left": left, "right": right, "scroll": sc}
