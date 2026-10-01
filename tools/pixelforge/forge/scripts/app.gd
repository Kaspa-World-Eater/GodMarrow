extends Control
const FT := preload("res://scripts/theme.gd")
const FSfx := preload("res://scripts/sfx.gd")
const W := preload("res://scripts/widgets.gd")
const Backend := preload("res://scripts/backend.gd")
const Screen := preload("res://scripts/screen.gd")
## scripts/app.gd: the shell. Holds the Backend, the screen stack, the transitions, the log drawer, the custom
## cursor and the keys that work everywhere: Esc (or the gamepad's B) goes one screen back, F11 toggles the
## window, L opens the log. Files dropped on the window go to the screen that is showing.

const SCREENS := {
	"boot": "res://scripts/screens/boot.gd",
	"home": "res://scripts/screens/home.gd",
	"settings": "res://scripts/screens/settings.gd",
	"play": "res://scripts/screens/play.gd",
	"character": "res://scripts/quests/character.gd",
	"object": "res://scripts/quests/object.gd",
	"spell": "res://scripts/quests/spell.gd",
	"tiles": "res://scripts/quests/tiles.gd",
	"ui": "res://scripts/quests/ui.gd",
	"sound": "res://scripts/quests/sound.gd",
	"fix": "res://scripts/quests/fix.gd",
}

var args := {}
var cfg := {}
var backend: Backend
var sfx: FSfx
var stack: Array = []          # [name, args] of the screens under the current one
var current: Screen = null
var layer: Control            # where screens live
var veil: ColorRect           # the fade between screens
var drawer: PanelContainer    # the log drawer
var log_text: TextEdit
var toast: Label
var toast_t := 0.0
var transitioning := false

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = FT.theme()
	var bg := ColorRect.new()
	bg.color = FT.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	var grain: Control = load("res://scripts/grain.gd").new()
	add_child(grain)
	sfx = FSfx.new()
	add_child(sfx)
	backend = Backend.new()
	backend.setup(args)
	add_child(backend)
	backend.line.connect(func(_j, l): _log_append(l))
	layer = Control.new()
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(layer)
	_build_drawer()
	toast = W.label("", "Pixel", HORIZONTAL_ALIGNMENT_CENTER)
	toast.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	toast.offset_top = -40
	toast.offset_bottom = -26
	toast.offset_left = -200
	toast.offset_right = 200
	toast.modulate.a = 0.0
	add_child(toast)
	veil = ColorRect.new()
	veil.color = Color(0, 0, 0, 0)
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(veil)
	Input.set_custom_mouse_cursor(FT.cursor(), Input.CURSOR_ARROW, Vector2(0, 0))
	get_window().files_dropped.connect(_on_files_dropped)
	var first := String(args.get("screen", "boot"))
	if first != "boot" and not SCREENS.has(first):
		first = "home"
	_show(first, args, false)
	if args.has("log"):
		get_tree().create_timer(float(args.get("log", "1"))).timeout.connect(func(): if not drawer.visible: toggle_log())

# ------------------------------------------------------------------ screens
func go(name: String, a: Dictionary = {}) -> void:
	if transitioning or not SCREENS.has(name):
		return
	if current:
		stack.append([current.screen_name, current.args])
	FSfx.play("open")
	_show(name, a, true)

func back() -> void:
	if transitioning:
		return
	if stack.is_empty():
		if current and current.screen_name != "home":
			_show("home", {}, true)
		return
	var prev: Array = stack.pop_back()
	FSfx.play("back")
	_show(prev[0], prev[1], true)

func home() -> void:
	stack.clear()
	_show("home", {}, true)

func _show(name: String, a: Dictionary, animate: bool) -> void:
	transitioning = true
	if animate:
		var tw := create_tween()
		tw.tween_property(veil, "color:a", 1.0, 0.14)
		await tw.finished
	if current:
		current.queue_free()
		current = null
	var s: Screen = load(SCREENS[name]).new()
	current = s
	layer.add_child(s)
	s.setup(self, name, a)
	if animate:
		_slide(s, 6.0)
		var tw2 := create_tween().set_parallel(true)
		tw2.tween_property(veil, "color:a", 0.0, 0.16)
		tw2.tween_method(_slide.bind(s), 6.0, 0.0, 0.18).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		await tw2.finished
	_slide(s, 0.0)
	transitioning = false
	s.on_enter()
	s.focus_first()

## the new screen slides up a few pixels as it fades in: offsets, not position, so the full-rect anchors keep its size
func _slide(s: Control, y: float) -> void:
	if is_instance_valid(s):
		s.offset_top = y
		s.offset_bottom = y

# ------------------------------------------------------------------ the log drawer
func _build_drawer() -> void:
	drawer = W.panel("Card")
	drawer.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	drawer.offset_top = -130
	drawer.offset_left = 12
	drawer.offset_right = -12
	drawer.offset_bottom = -2
	drawer.visible = false
	var v := W.col(4)
	var h := W.row(6)
	h.add_child(W.label("What ran, and what it said", "Small"))
	h.add_child(W.spacer())
	h.add_child(W.ghost("Copy", func(): DisplayServer.clipboard_set("\n".join(backend.log_lines)); say("Copied.")))
	h.add_child(W.ghost("Close", func(): toggle_log()))
	v.add_child(h)
	log_text = W.log_view()
	v.add_child(log_text)
	drawer.add_child(v)
	add_child(drawer)

func toggle_log() -> void:
	drawer.visible = not drawer.visible
	if drawer.visible:
		log_text.text = "\n".join(backend.log_lines)
		log_text.scroll_vertical = 1e9
	FSfx.play("tick")

func _log_append(_l: String) -> void:
	if drawer.visible:
		log_text.text = "\n".join(backend.log_lines)
		log_text.scroll_vertical = 1e9

## a short line at the bottom that fades
func say(t: String, seconds: float = 2.4) -> void:
	toast.text = t
	toast.modulate.a = 1.0
	toast_t = seconds

func _process(dt: float) -> void:
	if toast_t > 0.0:
		toast_t -= dt
		if toast_t < 0.6:
			toast.modulate.a = maxf(toast_t / 0.6, 0.0)

# ------------------------------------------------------------------ window
func is_fullscreen() -> bool:
	var m := DisplayServer.window_get_mode()
	return m == DisplayServer.WINDOW_MODE_FULLSCREEN or m == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN

func toggle_fullscreen() -> void:
	if is_fullscreen():
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		DisplayServer.window_set_size(Vector2i(1280, 720))
		var sc := DisplayServer.screen_get_size()
		DisplayServer.window_set_position((sc - Vector2i(1280, 720)) / 2)
		cfg["windowed"] = true
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		cfg["windowed"] = false
	save_cfg()
	if current:
		var b := current.header.get_node_or_null("WindowToggle")
		if b:
			b.text = "Window" if is_fullscreen() else "Full screen"

func set_sound(on: bool) -> void:
	FSfx.enabled = on
	cfg["sound"] = on
	save_cfg()

func save_cfg() -> void:
	load("res://scripts/main.gd").save_cfg(cfg)

# ------------------------------------------------------------------ input
func _unhandled_input(ev: InputEvent) -> void:
	if ev.is_action_pressed("ui_cancel"):
		if drawer.visible:
			toggle_log()
		else:
			back()
		get_viewport().set_input_as_handled()
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_F11:
			toggle_fullscreen()
		elif ev.keycode == KEY_L and ev.ctrl_pressed:
			toggle_log()

func _on_files_dropped(paths: PackedStringArray) -> void:
	if current:
		FSfx.play("drop")
		current.on_drop(paths)

# ------------------------------------------------------------------ helpers for screens
func python_missing_card() -> Control:
	return W.card("Python was not found", "PixelForge runs on Python. Run install.bat once (next to this app); it sets everything up.",
		[W.button("Check again", "", func(): backend.setup(args); if current: current.on_enter())])

## pick a file with the system dialog when there is one, else the Forge's own dark one
func choose_file(filters: PackedStringArray, on_pick: Callable, title: String = "Choose a painting") -> void:
	var fd := FileDialog.new()
	fd.title = title
	fd.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	fd.access = FileDialog.ACCESS_FILESYSTEM
	fd.filters = filters
	fd.use_native_dialog = true
	fd.size = Vector2i(520, 300)
	fd.current_dir = cfg.get("last_dir", OS.get_system_dir(OS.SYSTEM_DIR_PICTURES))
	fd.file_selected.connect(func(p: String):
		cfg["last_dir"] = p.get_base_dir()
		save_cfg()
		on_pick.call(p)
		fd.queue_free())
	fd.canceled.connect(func(): fd.queue_free())
	add_child(fd)
	fd.popup_centered()

func choose_dir(on_pick: Callable, title: String = "Choose a folder") -> void:
	var fd := FileDialog.new()
	fd.title = title
	fd.file_mode = FileDialog.FILE_MODE_OPEN_DIR
	fd.access = FileDialog.ACCESS_FILESYSTEM
	fd.use_native_dialog = true
	fd.size = Vector2i(520, 300)
	fd.dir_selected.connect(func(p: String): on_pick.call(p); fd.queue_free())
	fd.canceled.connect(func(): fd.queue_free())
	add_child(fd)
	fd.popup_centered()
