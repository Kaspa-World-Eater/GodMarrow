extends Control
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
const W := preload("res://scripts/widgets.gd")
const Backend := preload("res://scripts/backend.gd")
const Audio := preload("res://scripts/audio.gd")
const Scene := preload("res://scripts/scene.gd")
## scripts/app.gd: the shell, in the framing of docs/mockups/forge_app_v8.html. One ornate pixel frame with the
## banner set into its top edge, the picture window above, the text box below with the tabs on its top edge, the
## foot line with the project, the style, a hint and the ground picker. Holds the Backend, the audio graph, the
## screens, the selector (the only animated thing in the chrome: a pixel arrow nudging one pixel on a two-frame
## cycle, a three-frame flash on select), the Bayer dissolve between screens, the log drawer and the keys that work
## everywhere: Esc / B back, Enter / A select, arrows and the d-pad move, LB/RB tabs, F11 window, Ctrl+L log.

const SCREENS := {
	"home": "res://scripts/screens/home.gd",
	"characters": "res://scripts/screens/characters.gd",
	"creatures": "res://scripts/screens/creatures.gd",
	"objects": "res://scripts/screens/objects.gd",
	"effects": "res://scripts/screens/effects.gd",
	"tiles": "res://scripts/screens/tiles.gd",
	"interface": "res://scripts/screens/interface.gd",
	"sound": "res://scripts/screens/sound.gd",
	"music": "res://scripts/screens/music.gd",
	"settings": "res://scripts/screens/settings.gd",
	"editor": "res://scripts/screens/editor.gd",
}
const CANVAS := Vector2(640, 360)
const PIC := Rect2(22, 27, 596, 140)
const TEXTBOX := Rect2(22, 183, 596, 136)
const TABS_H := 14
const FOOT_Y := 322
const DISSOLVE_STEPS := 4
const DISSOLVE_FPS := 24.0

signal window_changed

var args := {}
var cfg := {}
var backend: Backend
var audio: Audio
var scene: Scene
var stack: Array = []           # [name, args] of the screens under the current one
var current: Control = null
var layer: Control              # where the screen's text box content lives
var pic_layer: Control          # over the picture window, for a screen's own view (the editor's canvas)
var browser: Control = null     # the in-app file browser while it is up
var exit_asked := false
var tabs_ctrl: W.Tabs
var envs_ctrl: W.Choices
var foot_project: Label
var foot_style: Label
var foot_hint: Label
var chrome: Control             # the border, banner, window rims, title-line toggles
var selector: Control           # the arrow overlay
var dissolve: ColorRect
var dissolve_mat: ShaderMaterial
var drawer: Control             # the log drawer
var log_text: TextEdit
var toast: Label
var toast_t := 0.0
var transitioning := false
var hint_text := ""
var reduced_motion := false
# the selector
var groups: Array = []
var gi := -1
var sel_t := 0.0
var flash := -1.0
var hover_drop := false
var style_name := "godmarrow"

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	theme = T.theme()
	reduced_motion = args.has("reduced") or bool(cfg.get("reduced_motion", false))
	var bg := ColorRect.new()
	bg.color = T.INK
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	audio = Audio.new()
	audio.sounds_on = not args.has("nosound") and bool(cfg.get("sounds", true))
	audio.sound_volume = float(cfg.get("sound_volume", 0.8))
	audio.music_volume = float(cfg.get("music_volume", 0.6))
	audio.music_on = not args.has("nomusic") and not args.has("nosound") and bool(cfg.get("music", true))
	add_child(audio)
	backend = Backend.new()
	backend.setup(args, cfg)
	add_child(backend)
	backend.progress.connect(func(_j, info): if current and current.has_method("on_progress"): current.on_progress(info))
	backend.line.connect(func(_j, _l): _log_follow())
	# the picture window
	scene = Scene.new()
	scene.position = PIC.position
	scene.size = PIC.size
	scene.reduced_motion = reduced_motion
	add_child(scene)
	scene.set_env(String(args.get("env", cfg.get("env", "dungeon"))))
	scene.set_light_mode(int(args.get("light", cfg.get("light", 2))))
	# a screen's own view over the picture window (the editor's canvas lives here)
	pic_layer = Control.new()
	pic_layer.position = PIC.position
	pic_layer.size = PIC.size
	pic_layer.mouse_filter = Control.MOUSE_FILTER_PASS
	pic_layer.clip_contents = true
	add_child(pic_layer)
	# the text box's content layer
	layer = Control.new()
	layer.position = TEXTBOX.position
	layer.size = TEXTBOX.size
	layer.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.clip_contents = true
	add_child(layer)
	_build_foot()
	# the chrome over everything: border, banner, rims, the title-line toggles
	chrome = Control.new()
	chrome.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	chrome.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chrome.draw.connect(_draw_chrome)
	add_child(chrome)
	# the tabs, set into the text box's top rim (drawn over the chrome: each name's field cuts the rim under it)
	tabs_ctrl = W.Tabs.new()
	tabs_ctrl.position = Vector2(TEXTBOX.position.x, TEXTBOX.position.y - TABS_H + 1)
	tabs_ctrl.size = Vector2(TEXTBOX.size.x, TABS_H + 2)
	tabs_ctrl.visible = false
	add_child(tabs_ctrl)
	selector = Control.new()
	selector.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	selector.mouse_filter = Control.MOUSE_FILTER_IGNORE
	selector.draw.connect(_draw_selector)
	add_child(selector)
	_build_drawer()
	toast = Label.new()
	toast.position = Vector2(TEXTBOX.position.x + 8, TEXTBOX.end.y - 1)
	toast.size = Vector2(TEXTBOX.size.x - 16, 16)
	toast.theme_type_variation = "Gold"
	toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	toast.visible = false
	add_child(toast)
	dissolve = ColorRect.new()
	dissolve.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dissolve.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dissolve_mat = ShaderMaterial.new()
	dissolve_mat.shader = load("res://scripts/dissolve.gdshader")
	dissolve_mat.set_shader_parameter("level", 0.0)
	dissolve_mat.set_shader_parameter("ink", T.INK)
	dissolve.material = dissolve_mat
	dissolve.visible = false
	add_child(dissolve)
	Input.set_custom_mouse_cursor(PX.cursor(), Input.CURSOR_ARROW, Vector2(0, 0))
	get_window().files_dropped.connect(_on_files_dropped)
	style_name = backend.project_style(String(cfg.get("style", "godmarrow")))
	_foot_update()
	var first := String(args.get("screen", "home"))
	if not SCREENS.has(first):
		first = "home"
	_show(first, args, false)
	audio.set_state("home")
	if args.has("log"):
		get_tree().create_timer(float(args.get("log", "1"))).timeout.connect(func(): if not drawer.visible: toggle_log())
	if args.has("script") or args.has("edits"):
		var d: Node = load("res://scripts/driver.gd").new()
		d.app = self
		d.path = String(args.get("script", ""))
		d.json_path = String(args.get("edits", ""))
		add_child(d)

# ------------------------------------------------------------------ the foot line
func _build_foot() -> void:
	foot_project = _foot_label("")
	foot_style = _foot_label("")
	foot_hint = _foot_label("")
	foot_hint.clip_text = true
	envs_ctrl = W.Choices.new()
	envs_ctrl.font_size = T.SMALL_SIZE
	envs_ctrl.arrow_gap = 11
	envs_ctrl.flow = true
	envs_ctrl.flow_gap = 4
	var items := []
	for e in Scene.ENV_ORDER:
		items.append({"label": e, "cb": _pick_env.bind(e)})
	envs_ctrl.setup(items, 6, self)
	envs_ctrl.row_h = 14
	envs_ctrl.dim_unselected = true
	add_child(envs_ctrl)
	_foot_layout()

func _foot_label(text: String) -> Label:
	var l := Label.new()
	l.position = Vector2(0, FOOT_Y)
	l.size = Vector2(100, 14)
	l.text = text
	l.theme_type_variation = "SmallDim"
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(l)
	return l

## the foot flows: project, style, the hint (clipped to what is left), the ground picker on the right
func _foot_layout() -> void:
	var gap := 12.0
	var env_w := envs_ctrl.flow_width()
	envs_ctrl.size = Vector2(env_w, 14)
	envs_ctrl.position = Vector2(TEXTBOX.end.x - env_w, FOOT_Y)
	var ground_x := envs_ctrl.position.x - T.text_width("ground", T.SMALL_SIZE) - 6
	var x := TEXTBOX.position.x
	foot_project.position.x = x
	foot_project.size.x = T.text_width(foot_project.text, T.SMALL_SIZE) + 2
	x += foot_project.size.x + gap
	foot_style.position.x = x
	foot_style.size.x = T.text_width(foot_style.text, T.SMALL_SIZE) + 2
	x += foot_style.size.x + gap
	foot_hint.position.x = x
	foot_hint.size.x = maxf(ground_x - gap - x, 10)
	if not has_node("GroundLabel"):
		var gl := _foot_label("ground")
		gl.name = "GroundLabel"
		gl.theme_type_variation = "Small"
		gl.add_theme_color_override("font_color", T.BONE)
	var gl: Label = get_node("GroundLabel")
	gl.position = Vector2(ground_x, FOOT_Y)
	gl.size.x = T.text_width("ground", T.SMALL_SIZE) + 2

func _foot_update() -> void:
	foot_project.text = "project  " + (backend.project_name() if backend.project_name() != "" else "none")
	foot_style.text = "style  " + style_name.replace("_", " ")
	foot_hint.text = hint_text
	for i in envs_ctrl.items.size():
		envs_ctrl.items[i]["dim"] = Scene.ENV_ORDER[i] != scene.env
	envs_ctrl.queue_redraw()
	_foot_layout()

func _pick_env(e: String) -> void:
	scene.set_env(e)
	cfg["env"] = e
	save_cfg()
	_foot_update()

func set_hint(t: String) -> void:
	hint_text = t
	foot_hint.text = t

func say_hint(t: String) -> void:
	foot_hint.text = t

# ------------------------------------------------------------------ the chrome
func _draw_chrome() -> void:
	var c := chrome
	# the window rims: a dark line inside a black one
	for r in [PIC, TEXTBOX]:
		c.draw_rect(Rect2(r.position - Vector2(3, 3), r.size + Vector2(6, 6)), T.BLACK, false, 1.0)
		c.draw_rect(Rect2(r.position - Vector2(2, 2), r.size + Vector2(4, 4)), T.FRAME2, false, 2.0)
	# a hovering file: the frame answers
	if hover_drop:
		c.draw_rect(Rect2(PIC.position - Vector2(2, 2), PIC.size + Vector2(4, 4)), T.ACCENT, false, 2.0)
	# the border, at 2 screen pixels per border pixel, with the banner's gap
	var border := PX.border(int(CANVAS.x / 2), int(CANVAS.y / 2))
	c.draw_texture_rect(border, Rect2(Vector2.ZERO, CANVAS), false)
	# the banner: blackletter, set into the top edge
	var bf := T.font("black")
	var title := "PixelForge"
	var tw := bf.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.BANNER_SIZE).x
	var bx := floorf((CANVAS.x - tw) / 2.0)
	c.draw_rect(Rect2(bx - 10, 0, tw + 20, 22), T.INK)
	c.draw_string(bf, Vector2(bx + 2, 20), title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.BANNER_SIZE, T.BLACK)
	c.draw_string(bf, Vector2(bx, 18), title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.BANNER_SIZE, T.FRAME)
	# the title line's toggles, right of the banner: music and the log
	var f := T.font("text")
	var mtxt := "music " + ("on" if audio.music_on else "off")
	var ltxt := "log"
	var mx := CANVAS.x - 36 - T.text_width(mtxt, T.SMALL_SIZE) - 26 - T.text_width(ltxt, T.SMALL_SIZE)
	c.draw_rect(Rect2(mx - 4, 14, T.text_width(mtxt, T.SMALL_SIZE) + 8, 12), T.INK)
	c.draw_string(f, Vector2(mx, 24), mtxt, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if audio.music_on else T.BONE)
	var lx := CANVAS.x - 36 - T.text_width(ltxt, T.SMALL_SIZE)
	c.draw_rect(Rect2(lx - 4, 14, T.text_width(ltxt, T.SMALL_SIZE) + 8, 12), T.INK)
	c.draw_string(f, Vector2(lx, 24), ltxt, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if drawer.visible else T.BONE)
	# the window toggle and exit, left
	var wtxt := "window" if is_fullscreen() else "full screen"
	c.draw_rect(Rect2(32, 14, T.text_width(wtxt, T.SMALL_SIZE) + 8, 12), T.INK)
	c.draw_string(f, Vector2(36, 24), wtxt, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
	var ex := 36 + T.text_width(wtxt, T.SMALL_SIZE) + 22
	c.draw_rect(Rect2(ex - 4, 14, T.text_width("exit", T.SMALL_SIZE) + 8, 12), T.INK)
	c.draw_string(f, Vector2(ex, 24), "exit", HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)

## the title line's toggles are text; a click on them
func _title_click(p: Vector2) -> bool:
	if p.y < 12 or p.y > 28:
		return false
	var mtxt := "music " + ("on" if audio.music_on else "off")
	var mw := T.text_width(mtxt, T.SMALL_SIZE)
	var lw := T.text_width("log", T.SMALL_SIZE)
	var mx := CANVAS.x - 36 - mw - 26 - lw
	var lx := CANVAS.x - 36 - lw
	if p.x >= mx - 4 and p.x <= mx + mw + 4:
		set_music(not audio.music_on)
		return true
	if p.x >= lx - 4 and p.x <= lx + lw + 4:
		toggle_log()
		return true
	var ww := T.text_width("window" if is_fullscreen() else "full screen", T.SMALL_SIZE)
	if p.x >= 32 and p.x <= 40 + ww:
		toggle_fullscreen()
		return true
	var ex := 36 + ww + 22
	if p.x >= ex - 4 and p.x <= ex + T.text_width("exit", T.SMALL_SIZE) + 4:
		request_exit()
		return true
	return false

## leaving: straight out, or one plain line in the text box when the bench has unsaved work
func request_exit() -> void:
	if current and current.has_method("has_unsaved") and current.has_unsaved() and not exit_asked:
		exit_asked = true
		current.confirm("Unsaved work on the bench. Leave without saving?", func(): get_tree().quit())
		return
	save_cfg()
	get_tree().quit()

# ------------------------------------------------------------------ screens
func go(name: String, a: Dictionary = {}) -> void:
	if transitioning or not SCREENS.has(name):
		return
	if current and not current.can_leave():
		return
	if current:
		stack.append([current.screen_name, current.args])
	_show(name, a, true)

func back() -> void:
	if transitioning:
		return
	if current and current.pending_confirm.size() > 0:
		current.pending_confirm = {}
		exit_asked = false
		current.rebuild()
		audio.blip("back")
		return
	if current and current.advanced_open:
		current.toggle_advanced()
		audio.blip("back")
		return
	if stack.is_empty():
		if current and current.screen_name != "home":
			audio.blip("back")
			_show("home", {}, true)
		return
	var prev: Array = stack.pop_back()
	audio.blip("back")
	_show(prev[0], prev[1], true)

func home() -> void:
	stack.clear()
	_show("home", {}, true)

func _show(name: String, a: Dictionary, animate: bool) -> void:
	transitioning = true
	if animate and not reduced_motion:
		await _dissolve(true)
	if current:
		current.queue_free()
		current = null
	groups = []
	gi = -1
	scene.clear()
	tabs_ctrl.visible = false
	var s: Control = load(SCREENS[name]).new()
	current = s
	layer.add_child(s)
	s.setup(self, name, a)
	if name == "home":
		audio.set_state("home")
	if animate and not reduced_motion:
		await _dissolve(false)
	else:
		dissolve.visible = false
	transitioning = false
	s.on_enter()
	_first_focus()

## the pixel dissolve: a Bayer-threshold wipe over the frame, four steps at 24 fps each way
func _dissolve(inward: bool) -> void:
	dissolve.visible = true
	for i in range(1, DISSOLVE_STEPS + 1):
		var k := float(i) / DISSOLVE_STEPS
		dissolve_mat.set_shader_parameter("level", k if inward else 1.0 - k)
		await get_tree().create_timer(1.0 / DISSOLVE_FPS).timeout
	if not inward:
		dissolve.visible = false

func set_tabs(names: PackedStringArray, cur: int, screen: Control) -> void:
	if names.is_empty():
		tabs_ctrl.visible = false
		return
	tabs_ctrl.visible = true
	tabs_ctrl.setup(names, cur, self, func(i): screen.set_tab(i))

func set_groups(gs: Array) -> void:
	groups = []
	if tabs_ctrl.visible:
		groups.append(tabs_ctrl)
	groups.append_array(gs)
	groups.append(envs_ctrl)
	for g in groups:
		if g.has_method("set_active"):
			g.set_active(false)
	gi = -1

func _first_focus() -> void:
	for i in groups.size():
		var g = groups[i]
		if g is W.Choices and g != envs_ctrl and g.item_count() > 0:
			focus_on(g, 0, false)
			return
	for i in groups.size():
		if groups[i] != tabs_ctrl and groups[i] != envs_ctrl and groups[i].item_count() > 0:
			focus_on(groups[i], 0, false)
			return

## put the selector on item i of group g (a blip when it moved by the mouse's hover)
func focus_on(g: Control, i: int, from_hover: bool) -> void:
	var k := groups.find(g)
	if k < 0:
		return
	var moved := gi != k or (g.has_method("item_count") and i != _sel_of(g))
	if gi >= 0 and gi < groups.size() and gi != k:
		groups[gi].set_active(false)
	gi = k
	g.set_active(true)
	g.set_sel(i)
	if moved and from_hover:
		audio.cursor("right")
	selector.queue_redraw()

func _sel_of(g: Control) -> int:
	if g is W.Choices:
		return g.sel
	if g is W.Tabs:
		return g.current
	if g is W.Rack:
		return g.sel
	if g is W.Timeline:
		return g.current
	return 0

func current_group() -> Control:
	return groups[gi] if gi >= 0 and gi < groups.size() else null

func select_current() -> void:
	var g := current_group()
	if g == null:
		return
	audio.blip("confirm")
	flash = 0.0
	selector.queue_redraw()
	g.activate(_sel_of(g))

## the arrows and the d-pad: within the group, then to the next group up or down
func move(dir: String) -> void:
	var g := current_group()
	if g == null:
		_first_focus()
		return
	# a control under the selector takes up/down (a lever) or left/right (a wheel) first
	if g.has_method("step") and g.step(1, dir):
		return
	var n: int = g.item_count()
	var cols: int = g.columns()
	var i := _sel_of(g)
	var j := i
	if g.has_method("neighbour"):
		j = g.neighbour(i, dir)
		if j < 0:
			j = -1 if dir in ["left", "up"] else n
	else:
		match dir:
			"right":
				j = i + 1
			"left":
				j = i - 1
			"down":
				j = i + cols
			"up":
				j = i - cols
	if j < 0 or j >= n or n == 0:
		if dir in ["down", "up", "right", "left"]:
			var step := 1 if dir in ["down", "right"] else -1
			if dir in ["right", "left"] and (j >= 0 and j < n):
				return
			var k := gi + step
			while k >= 0 and k < groups.size():
				var ng: Control = groups[k]
				if ng.item_count() > 0 and ng.visible:
					if gi >= 0:
						groups[gi].set_active(false)
					gi = k
					ng.set_active(true)
					var ni: int = 0 if step > 0 else ng.item_count() - 1
					if dir in ["up", "down"] and ng.columns() > 1:
						ni = clampi((i % cols) if step > 0 else (ng.item_count() - 1 - (ng.columns() - 1 - (i % cols))), 0, ng.item_count() - 1)
						if step < 0:
							ni = clampi(((ng.item_count() - 1) / ng.columns()) * ng.columns() + (i % cols), 0, ng.item_count() - 1)
					ng.set_sel(ni)
					audio.cursor(dir)
					selector.queue_redraw()
					return
				k += step
		return
	if j == i:
		return
	g.set_sel(j)
	audio.cursor(dir)
	selector.queue_redraw()

func next_tab(delta: int) -> void:
	if not tabs_ctrl.visible:
		return
	var i := posmod(tabs_ctrl.current + delta, maxi(tabs_ctrl.item_count(), 1))
	tabs_ctrl.set_sel(i)
	audio.blip("tab")

# ------------------------------------------------------------------ the selector (the one animated thing)
func _draw_selector() -> void:
	var g := current_group()
	if g == null or not g.visible:
		return
	var r: Rect2 = g.item_rect(_sel_of(g))
	var at := r.position + Vector2(-18, floor((r.size.y - 14) / 2.0))
	if g is W.Rack or g is W.SliderRack or g is W.RampRack:
		at = r.position + Vector2(-16, 0)
	if g == tabs_ctrl:
		at = r.position + Vector2(-18, 0)
	if g != tabs_ctrl and g != envs_ctrl:
		at += layer.position
	elif g == envs_ctrl:
		at = r.position + Vector2(-13, 0)
	var nudge := 0 if reduced_motion else (int(sel_t * 4.0) % 2)
	var tex := PX.arrow()
	if flash >= 0.0:
		tex = PX.arrow_flash(int(flash * 12.0))
	selector.draw_texture_rect(tex, Rect2(at + Vector2(nudge, 0), Vector2(16, 14)), false)

func _process(dt: float) -> void:
	sel_t += dt
	if flash >= 0.0:
		flash += dt
		if flash > 0.25:
			flash = -1.0
	selector.queue_redraw()
	if toast_t > 0.0:
		toast_t -= dt
		if toast_t <= 0.0:
			toast.visible = false
	if int(sel_t * 4.0) % 2 == 0:
		chrome.queue_redraw()

# ------------------------------------------------------------------ the log drawer
func _build_drawer() -> void:
	drawer = Control.new()
	drawer.position = TEXTBOX.position
	drawer.size = TEXTBOX.size
	drawer.visible = false
	drawer.mouse_filter = Control.MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = T.INK
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	drawer.add_child(bg)
	var head := Label.new()
	head.text = "what ran, and what it said   (Ctrl+L closes; Ctrl+C copies)"
	head.theme_type_variation = "SmallDim"
	head.position = Vector2(6, 2)
	head.size = Vector2(TEXTBOX.size.x - 12, 14)
	drawer.add_child(head)
	log_text = TextEdit.new()
	log_text.editable = false
	log_text.position = Vector2(4, 16)
	log_text.size = Vector2(TEXTBOX.size.x - 8, TEXTBOX.size.y - 18)
	log_text.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	log_text.scroll_fit_content_height = false
	drawer.add_child(log_text)
	add_child(drawer)

func toggle_log() -> void:
	drawer.visible = not drawer.visible
	if drawer.visible:
		log_text.text = "\n".join(backend.log_lines)
		log_text.scroll_vertical = 1e9
	audio.blip("tab")
	chrome.queue_redraw()

func _log_follow() -> void:
	if drawer.visible:
		log_text.text = "\n".join(backend.log_lines)
		log_text.scroll_vertical = 1e9

## a short line under the text box that fades
func say(t: String, seconds: float = 3.0) -> void:
	toast.text = t
	toast.visible = true
	toast_t = seconds

# ------------------------------------------------------------------ window and settings
func is_fullscreen() -> bool:
	var m := DisplayServer.window_get_mode()
	return m == DisplayServer.WINDOW_MODE_FULLSCREEN or m == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN

func toggle_fullscreen() -> void:
	if is_fullscreen():
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
		var k := int(cfg.get("scale", 2))
		DisplayServer.window_set_size(Vector2i(640 * k, 360 * k))
		var sc := DisplayServer.screen_get_size()
		DisplayServer.window_set_position((sc - Vector2i(640 * k, 360 * k)) / 2)
		cfg["windowed"] = true
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		cfg["windowed"] = false
	save_cfg()
	chrome.queue_redraw()
	window_changed.emit()

func set_music(on: bool) -> void:
	audio.set_music(on)
	cfg["music"] = on
	save_cfg()
	chrome.queue_redraw()

func set_sounds(on: bool) -> void:
	audio.sounds_on = on
	cfg["sounds"] = on
	save_cfg()

func set_style(name: String) -> void:
	style_name = name
	cfg["style"] = name
	save_cfg()
	_foot_update()

func save_cfg() -> void:
	load("res://scripts/main.gd").save_cfg(cfg)

func remember_last(kind: String, info: Dictionary) -> void:
	cfg["last"] = {"kind": kind, "info": info, "when": Time.get_datetime_string_from_system()}
	save_cfg()

# ------------------------------------------------------------------ input
func _unhandled_input(ev: InputEvent) -> void:
	if transitioning:
		return
	if browser and is_instance_valid(browser):
		if browser.key(ev):
			get_viewport().set_input_as_handled()
		return
	if current and current.on_key(ev):
		get_viewport().set_input_as_handled()
		return
	if ev.is_action_pressed("ui_cancel"):
		if drawer.visible:
			toggle_log()
		else:
			back()
		get_viewport().set_input_as_handled()
	elif ev.is_action_pressed("ui_accept"):
		select_current()
		get_viewport().set_input_as_handled()
	elif ev.is_action_pressed("ui_right", true):
		move("right")
	elif ev.is_action_pressed("ui_left", true):
		move("left")
	elif ev.is_action_pressed("ui_down", true):
		move("down")
	elif ev.is_action_pressed("ui_up", true):
		move("up")
	elif ev is InputEventJoypadButton and ev.pressed:
		if ev.button_index == JOY_BUTTON_LEFT_SHOULDER:
			next_tab(-1)
		elif ev.button_index == JOY_BUTTON_RIGHT_SHOULDER:
			next_tab(1)
	elif ev is InputEventKey and ev.pressed and not ev.echo:
		if ev.keycode == KEY_F11:
			toggle_fullscreen()
		elif ev.keycode == KEY_L and ev.ctrl_pressed:
			toggle_log()
		elif ev.keycode == KEY_M and ev.ctrl_pressed:
			set_music(not audio.music_on)
		elif ev.keycode == KEY_Z and ev.ctrl_pressed and current:
			current.undo()
		elif ev.keycode == KEY_Y and ev.ctrl_pressed and current:
			current.redo()
		elif ev.keycode == KEY_Q or ev.keycode == KEY_BRACKETLEFT or (ev.keycode == KEY_TAB and ev.shift_pressed):
			next_tab(-1)
		elif ev.keycode == KEY_E or ev.keycode == KEY_BRACKETRIGHT or ev.keycode == KEY_TAB:
			next_tab(1)
		elif ev.keycode == KEY_C and ev.ctrl_pressed and drawer.visible:
			DisplayServer.clipboard_set("\n".join(backend.log_lines))
			say("Copied the log.")
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		if _title_click(ev.position):
			get_viewport().set_input_as_handled()

func _on_files_dropped(paths: PackedStringArray) -> void:
	hover_drop = false
	chrome.queue_redraw()
	if current:
		audio.blip("drop")
		current.on_drop(paths)

# ------------------------------------------------------------------ helpers for screens
## pick a file: the Forge's own browser over the text box (editor/browser.gd); every "Choose a file" comes here
func choose_file(filters: PackedStringArray, on_pick: Callable, title: String = "Choose a painting") -> void:
	_open_browser(filters, on_pick, title, false)

func choose_dir(on_pick: Callable, title: String = "Choose a folder") -> void:
	_open_browser(PackedStringArray([]), on_pick, title, true)

func _open_browser(filters: PackedStringArray, on_pick: Callable, title: String, want_dir: bool) -> void:
	if browser and is_instance_valid(browser):
		browser.close()
	var b: Control = load("res://scripts/editor/browser.gd").new()
	b.position = TEXTBOX.position
	b.size = TEXTBOX.size
	add_child(b)
	move_child(b, drawer.get_index())
	browser = b
	b.open(self, filters, func(p):
		browser = null
		on_pick.call(p), func(): browser = null, title, want_dir)
	audio.blip("tab")

func _exit_tree() -> void:
	Input.set_custom_mouse_cursor(null)
	PX._cache.clear()
	T._fonts.clear()

## the game folder's art sub-folder, made if missing; "" when there is no game
func game_art(sub: String) -> String:
	if not backend.game_ok():
		return ""
	var d := backend.game_dir.path_join("art").path_join(sub)
	DirAccess.make_dir_recursive_absolute(d)
	return d
