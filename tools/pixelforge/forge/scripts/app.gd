extends Control
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
const W := preload("res://scripts/widgets.gd")
const Backend := preload("res://scripts/backend.gd")
const Audio := preload("res://scripts/audio.gd")
const Scene := preload("res://scripts/scene.gd")
const Frame := preload("res://scripts/frame.gd")
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
const STATUS_Y := 341           # the status words on the bottom band, between the candles
const STATUS_X := 58
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
var foot_project: Control
var foot_style: Control
var foot_claude: Control        # "Claude  ready" on the foot line (gold when something is wrong, a pulse while it works)
var foot_hint: Control
var callouts: Control = null    # the "?" overlay while it shows
var title_ctrl: Control         # the title line's strip (hover, clicks)
var title_hover := ""           # the title item under the pointer
var title_press := ""           # the title item just clicked (its plate sinks for a moment)
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
var hover_words := ""           # the hint for the control under the pointer, while it rests there (wins over the selection's)
var reduced_motion := false
# the selector
var groups: Array = []
var gi := -1
var sel_t := 0.0
var flash := -1.0
var shimmer := -1.0             # the dagger's two-frame shimmer after a move
var hover_drop := false
var style_name := "godmarrow"
var flame_frame := 0           # the sconces' flames: eight frames at 10 fps
var flame_t := 0.0
var claude_state := {}          # `claude status --json`: ok, state (ready | not_found | not_signed_in), sentence
var claude_working := ""        # the current progress line while Claude works on a bench ("" when idle)
var jobs_list: Array = []       # `job list --json`: the project's jobs, newest first (id, title, state, done, total, waiting, last, bench, report_json)
var job_runs: Array = []        # the jobs running under this Forge right now: {id, title, last, done, total, job (the Backend.Job)}

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
	audio.set_level(String(cfg.get("sound_level", "quiet" if bool(cfg.get("sounds", true)) else "off")))
	if args.has("nosound"):
		audio.sounds_on = false
	audio.sound_volume = float(cfg.get("sound_volume", 0.8))
	audio.music_volume = float(cfg.get("music_volume", 0.6))
	audio.music_on = not args.has("nomusic") and not args.has("nosound") and bool(cfg.get("music", true))
	add_child(audio)
	backend = Backend.new()
	backend.setup(args, cfg)
	add_child(backend)
	backend.progress.connect(_on_progress)
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
	_build_title_strip()
	# the chrome over everything: border, banner, rims, the title-line toggles
	chrome = Control.new()
	chrome.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	chrome.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chrome.draw.connect(_draw_chrome)
	add_child(chrome)
	for n in [foot_project, foot_style, foot_claude, foot_hint, get_node("GroundLabel"), envs_ctrl]:
		move_child(n, chrome.get_index() + 1)
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
	Input.set_custom_mouse_cursor(PX.cursor_hand(), Input.CURSOR_POINTING_HAND, Vector2(10, 0))
	Input.set_custom_mouse_cursor(PX.cursor_grab(), Input.CURSOR_DRAG, Vector2(12, 12))
	get_window().files_dropped.connect(_on_files_dropped)
	style_name = backend.project_style(String(cfg.get("style", "godmarrow")))
	_foot_update()
	_claude_status()
	refresh_jobs()
	var first := String(args.get("screen", "home"))
	if not SCREENS.has(first):
		first = "home"
	_show(first, args, false)
	audio.set_state("home")
	if args.has("log"):
		get_tree().create_timer(float(args.get("log", "1"))).timeout.connect(func(): if not drawer.visible: toggle_log())
	if args.has("hover"):
		# test hook: --hover=x,y puts the mouse there (logic pixels) so a screenshot shows the hover state
		var parts := String(args["hover"]).split(",")
		if parts.size() == 2:
			get_tree().create_timer(1.2).timeout.connect(_hover_to.bind(Vector2(float(parts[0]), float(parts[1]))))
	if args.has("script") or args.has("edits"):
		var d: Node = load("res://scripts/driver.gd").new()
		d.app = self
		d.path = String(args.get("script", ""))
		d.json_path = String(args.get("edits", ""))
		add_child(d)

## the mouse moved to a logic point, and the controls told (the hover state follows the pointer)
func _hover_to(p: Vector2) -> void:
	var wp: Vector2 = get_viewport().get_screen_transform() * p
	Input.warp_mouse(wp)
	var ev := InputEventMouseMotion.new()
	ev.position = wp
	ev.global_position = wp
	Input.parse_input_event(ev)

# ------------------------------------------------------------------ the foot line
func _build_foot() -> void:
	foot_project = _foot_label("")
	foot_style = _foot_label("")
	foot_claude = _foot_label("")
	foot_hint = _foot_label("")
	foot_hint.colour = T.BONE
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
	envs_ctrl.edge = true
	envs_ctrl.plates = false
	add_child(envs_ctrl)
	_foot_layout()

func _foot_label(text: String) -> Control:
	var l := W.EdgedLabel.new()
	l.position = Vector2(0, FOOT_Y)
	l.size = Vector2(100, 14)
	l.text = text
	add_child(l)
	return l

## the foot is two lines: the sill carries the hint (what the thing in hand does and how to change it) and the ground
## picker; the bottom band, between the candles, carries the status words (project, style, Claude)
func _foot_layout() -> void:
	var gap := 12.0
	var env_w := envs_ctrl.flow_width()
	envs_ctrl.size = Vector2(env_w, 14)
	envs_ctrl.position = Vector2(TEXTBOX.end.x - env_w, FOOT_Y)
	var ground_x := envs_ctrl.position.x - T.text_width("ground", T.SMALL_SIZE) - 6
	foot_hint.position = Vector2(TEXTBOX.position.x, FOOT_Y)
	foot_hint.size.x = maxf(ground_x - gap - TEXTBOX.position.x, 10)
	var x := STATUS_X
	for l in [foot_project, foot_style, foot_claude]:
		l.position = Vector2(x, STATUS_Y)
		l.size.x = T.text_width(l.text, T.SMALL_SIZE) + 2
		x += l.size.x + gap
	if not has_node("GroundLabel"):
		var gl := _foot_label("ground")
		gl.name = "GroundLabel"
		gl.colour = T.BONE
	var gl: Control = get_node("GroundLabel")
	gl.position = Vector2(ground_x, FOOT_Y)
	gl.size.x = T.text_width("ground", T.SMALL_SIZE) + 2

func _foot_update() -> void:
	foot_project.text = "project  " + (backend.project_name() if backend.project_name() != "" else "none")
	foot_style.text = "style  " + style_name.replace("_", " ")
	_foot_claude()
	_show_hint(hint_text)
	for i in envs_ctrl.items.size():
		envs_ctrl.items[i]["dim"] = Scene.ENV_ORDER[i] != scene.env
	envs_ctrl.queue_redraw()
	_foot_layout()

func _pick_env(e: String) -> void:
	scene.set_env(e)
	chrome.queue_redraw()
	cfg["env"] = e
	save_cfg()
	_foot_update()

func set_hint(t: String) -> void:
	hint_text = t
	_show_hint(t)

func say_hint(t: String) -> void:
	foot_hint.text = t

## the pointer rests on a control: the hint names it; "" when it leaves (back to the thing in hand)
func hover_hint(h: String) -> void:
	hover_words = h
	if h != "":
		foot_hint.text = h
	else:
		_hint_focus()

## the hint line shows the words, unless the pointer rests on something (its words stay until it leaves)
func _show_hint(t: String) -> void:
	foot_hint.text = hover_words if hover_words != "" else t

# ------------------------------------------------------------------ the chrome
## the frame (frame.gd) for the chosen ground, the sconces' light and flames, the banner on its keystone, the title
## line's toggles on iron nameplates
func _draw_chrome() -> void:
	var c := chrome
	c.draw_texture(Frame.frame(scene.env), Vector2.ZERO)
	# the sconces: the stone round each flame re-shaded at the flame's light level, then the flame's frame
	var sc := Frame.sconces()
	for i in sc.size():
		var s: Dictionary = sc[i]
		var fi := (flame_frame + i * 3) % 8
		var breath := 0.5 + 0.5 * sin(sel_t * (1.7 if i % 2 == 0 else 1.3) + i)
		var lvl := Frame.flame_level(fi, breath) if not reduced_motion else 2
		if lvl > 0:
			c.draw_texture(Frame.light_patch(scene.env, s, lvl), Vector2(s["patch"].position))
		var frames: Array = Frame.flame_frames(String(s["kind"]))
		var tex: Texture2D = frames[fi if not reduced_motion else 0]
		var at: Vector2i = s["at"]
		c.draw_texture(tex, Vector2(at.x - tex.get_width() / 2, at.y - tex.get_height() + (1 if s["kind"] == "torch" else 0)))
	# a hovering file: the frame answers
	if hover_drop:
		c.draw_rect(Rect2(PIC.position - Vector2(2, 2), PIC.size + Vector2(4, 4)), T.ACCENT, false, 2.0)
	# a dark ledger strip behind the status words on the bottom band (stone is busy; the words stay readable)
	var sx := float(STATUS_X) - 4.0
	var ex := foot_claude.position.x + foot_claude.size.x + 4.0
	c.draw_rect(Rect2(sx, STATUS_Y - 1, ex - sx, 15), Color(0, 0, 0, 0.5))
	c.draw_rect(Rect2(sx, STATUS_Y - 1, ex - sx, 1), Color(0, 0, 0, 0.8))
	c.draw_rect(Rect2(sx, STATUS_Y + 13, ex - sx, 1), Color(Frame.IRON[3], 0.5))
	# the banner: blackletter on the keystone, a dark edge behind it
	var bf := T.font("black")
	var title := "PixelForge"
	var tw := bf.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.BANNER_SIZE).x
	var bx := floorf((CANVAS.x - tw) / 2.0)
	_edged(c, bf, Vector2(bx, 23), title, T.BANNER_SIZE, T.FRAME, T.BLACK)
	# the title line: the back plate and the breadcrumbs on the left, the toggles on the right
	var f := T.font("text")
	for it in _title_items():
		var r: Rect2 = it["rect"]
		var lab := String(it["label"])
		var hov := lab == title_hover and (it["cb"] as Callable).is_valid()
		var prs := lab == title_press
		if it.get("plate", true):
			_nameplate(c, r, hov, prs)
		var col: Color = it["col"]
		if prs:
			col = Color("#ffffff")
		elif hov:
			col = Color(Frame.GOLD[4])
		_edged(c, f, Vector2(r.position.x + 5, 23 + (1 if prs else 0)), lab, T.SMALL_SIZE, col, T.BLACK)

## the title line's items: {label, rect, col, cb, plate}; the crumbs are clickable (each goes back to its screen)
func _title_items() -> Array:
	var out := []
	var y := 12.0
	var h := 13.0
	# right side, laid from the right edge: exit, window, log, music, ?
	var x := CANVAS.x - 30.0
	for it in [["exit", request_exit, T.ACCENT], ["window" if is_fullscreen() else "full screen", toggle_fullscreen, T.ACCENT],
			["log", toggle_log, Color(Frame.GOLD[4]) if drawer.visible else T.ACCENT],
			["music " + ("on" if audio.music_on else "off"), func(): set_music(not audio.music_on), Color(Frame.GOLD[4]) if audio.music_on else T.ACCENT],
			["?", show_callouts, Color(Frame.GOLD[4]) if (callouts and callouts.visible) else T.ACCENT]]:
		var w := T.text_width(String(it[0]), T.SMALL_SIZE) + 10
		x -= w
		out.append({"label": it[0], "rect": Rect2(x, y, w, h), "col": it[2], "cb": it[1]})
		x -= 8
	var right_edge := x
	# left side: back, then the crumbs
	var at_home: bool = current == null or (current.screen_name == "home" and stack.is_empty())
	var bw := T.text_width("< back", T.SMALL_SIZE) + 10
	out.append({"label": "< back", "rect": Rect2(30, y, bw, h), "col": Color(Frame.GOLD[2]) if at_home else T.ACCENT, "cb": back})
	x = 30 + bw + 10
	var crumbs := _crumbs()
	# drop the oldest crumbs when they would run into the keystone
	var limit := minf(Frame.plaque_rect().position.x - 6, right_edge)
	while crumbs.size() > 1:
		var total := 0.0
		for cr in crumbs:
			total += T.text_width(String(cr["label"]), T.SMALL_SIZE) + 10 + 10
		if x + total <= limit:
			break
		crumbs.pop_front()
	for k in crumbs.size():
		var cr: Dictionary = crumbs[k]
		var w := T.text_width(String(cr["label"]), T.SMALL_SIZE) + 10
		var last := k == crumbs.size() - 1
		out.append({"label": cr["label"], "rect": Rect2(x, y, w, h), "col": T.BONE if last else T.ACCENT, "cb": cr.get("cb", Callable()), "plate": not last})
		x += w
		if not last:
			out.append({"label": ">", "rect": Rect2(x, y, 10, h), "col": T.DIM, "cb": Callable(), "plate": false})
			x += 10
	return out

## where we are: the screens under this one (clickable: back to them), this screen, its tab
func _crumbs() -> Array:
	var out := []
	for k in stack.size():
		var nm := String(stack[k][0])
		if nm == "home":
			continue
		out.append({"label": _crumb_name(nm), "cb": go_back_to.bind(k)})
	if current:
		out.append({"label": _crumb_name(current.screen_name)})
		if tabs_ctrl.visible and tabs_ctrl.current >= 0 and tabs_ctrl.current < tabs_ctrl.names.size():
			out.append({"label": tabs_ctrl.names[tabs_ctrl.current]})
	return out

static func _crumb_name(nm: String) -> String:
	if nm == "editor":
		return "Edit"
	if nm == "tiles":
		return "Tiles"
	return nm.capitalize()

## back to the k-th screen under this one (a crumb clicked)
func go_back_to(k: int) -> void:
	if transitioning or k < 0 or k >= stack.size():
		return
	if current and not current.can_leave():
		return
	var target: Array = stack[k]
	stack.resize(k)
	audio.blip("back")
	_show(target[0], target[1], true)

## light text with a one-pixel dark edge behind it (the frame's stone and wood are busy)
static func _edged(ci: CanvasItem, f: Font, at: Vector2, s: String, size: int, col: Color, edge: Color) -> void:
	for o in [Vector2(1, 0), Vector2(-1, 0), Vector2(0, 1), Vector2(0, -1), Vector2(1, 1)]:
		ci.draw_string(f, at + o, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, edge)
	ci.draw_string(f, at, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)

## a small iron nameplate: dark plate, lit top edge, dark foot, a rivet at each end; hovered, a gold edge; pressed,
## the lit and dark edges swap so it sinks
static func _nameplate(ci: CanvasItem, r: Rect2, hov: bool = false, prs: bool = false) -> void:
	ci.draw_rect(r, Color(Frame.IRON[2] if hov else Frame.IRON[1]))
	var top := Color(Frame.GOLD[3] if hov else Frame.IRON[4])
	var bot := Color(Frame.IRON[0])
	if prs:
		top = Color(Frame.IRON[0])
		bot = Color(Frame.IRON[4])
	ci.draw_rect(Rect2(r.position, Vector2(r.size.x, 1)), top)
	ci.draw_rect(Rect2(r.position, Vector2(1, r.size.y)), top)
	ci.draw_rect(Rect2(r.position.x, r.end.y - 1, r.size.x, 1), bot)
	ci.draw_rect(Rect2(r.end.x - 1, r.position.y, 1, r.size.y), bot)
	for x in [r.position.x + 2, r.end.x - 4]:
		ci.draw_rect(Rect2(x, r.position.y + 2, 1, 1), Color(Frame.IRON[6]))
		ci.draw_rect(Rect2(x + 1, r.position.y + 3, 1, 1), Color(Frame.IRON[0]))
		ci.draw_rect(Rect2(x, r.end.y - 4, 1, 1), Color(Frame.IRON[5]))
		ci.draw_rect(Rect2(x + 1, r.end.y - 3, 1, 1), Color(Frame.IRON[0]))

## named points on the frame (torches, candles, brazier, drips, corners) for effects placed on it later
func frame_anchors() -> Dictionary:
	return Frame.anchors()

## the title line is a strip that takes the mouse: hover lights an item and names it on the hint line, a click works it
func _build_title_strip() -> void:
	title_ctrl = Control.new()
	title_ctrl.position = Vector2(0, 8)
	title_ctrl.size = Vector2(CANVAS.x, 20)
	title_ctrl.mouse_filter = Control.MOUSE_FILTER_STOP
	title_ctrl.gui_input.connect(_title_input)
	title_ctrl.mouse_exited.connect(func(): _title_hover(""))
	add_child(title_ctrl)

func _title_input(ev: InputEvent) -> void:
	var p: Vector2 = ev.position + title_ctrl.position
	if ev is InputEventMouseMotion:
		var hit := ""
		for it in _title_items():
			var r: Rect2 = it["rect"]
			if (it["cb"] as Callable).is_valid() and r.grow(2).has_point(p):
				hit = String(it["label"])
		_title_hover(hit)
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT and not transitioning:
		_title_click(p)

func _title_hover(label: String) -> void:
	if label == title_hover:
		return
	title_hover = label
	title_ctrl.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND if label != "" else Control.CURSOR_ARROW
	hover_hint(_title_hint(label))
	chrome.queue_redraw()

## what a title item does, for the hint line
func _title_hint(label: String) -> String:
	match label:
		"":
			return ""
		"< back":
			return "back · the screen under this one (Esc or B)"
		"?":
			return "? · labelled callouts over this bench; any key closes them"
		"log":
			return "log · the drawer of what the Forge did (Ctrl+L)"
		"exit":
			return "exit · leave the Forge (it asks when work is unsaved)"
		"full screen":
			return "full screen · fill the screen, pixels whole"
		"window":
			return "window · the Forge in a window instead"
	if label.begins_with("music"):
		return label + " · the Forge's own tune; the volume is in Settings"
	return label + " · back to this screen"

## the title line's items are clickable
func _title_click(p: Vector2) -> bool:
	for it in _title_items():
		var r: Rect2 = it["rect"]
		if r.grow(2).has_point(p):
			var cb: Callable = it["cb"]
			if cb.is_valid():
				audio.blip("confirm")
				title_press = String(it["label"])
				chrome.queue_redraw()
				get_tree().create_timer(0.12).timeout.connect(func(): title_press = ""; chrome.queue_redraw())
				cb.call()
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

## the foot's Claude word: a label in the label grey, gold when something wants doing, an ember pulse while it works
func _foot_claude() -> void:
	foot_claude.text = claude_label().replace(": ", "  ").replace(" (install Claude Code)", "")
	var col := T.DIM
	if claude_working != "":
		col = Color(Frame.GOLD[4]) if int(sel_t * 6.0) % 2 == 0 else T.ACCENT
	elif not claude_state.is_empty() and not claude_state.get("ok", false):
		col = Color(Frame.GOLD[4])
	elif claude_state.is_empty() and not backend.python_ok():
		col = Color(Frame.GOLD[4])
	foot_claude.colour = col
	foot_claude.queue_redraw()

## "Claude: ready / working / not found / not signed in", for the foot line
func claude_label() -> String:
	if claude_working != "":
		return "Claude: working"
	if claude_state.is_empty():
		return "Claude: ..." if backend.python_ok() else "Claude: no Python"
	match String(claude_state.get("state", "")):
		"ready":
			return "Claude: ready"
		"not_signed_in":
			return "Claude: not signed in"
		_:
			return "Claude: not found (install Claude Code)"

## `claude status --json` once at launch; when ready but PixelForge's tools are not registered, `claude register` does it
func _claude_status() -> void:
	if not backend.python_ok():
		return
	backend.run(["claude", "status"], "claude status", func(r: Dictionary):
		claude_state = r
		_foot_update()
		if r.get("ok", false) and not r.get("registered", true):
			backend.run(["claude", "register"], "claude register", func(r2: Dictionary):
				if r2.get("ok", false):
					claude_state["registered"] = true))

## a bench's Claude run reports its progress here (the title line pulses; the words go to the foot)
func set_claude_working(words: String) -> void:
	claude_working = words
	if words != "":
		foot_hint.text = "Claude: " + words
	_foot_update()

# ------------------------------------------------------------------ jobs (pixelforge job ...: a sentence that spans benches)
## every PF_PROGRESS line: a job's lines keep its record here (the Home panel reads them); the rest goes to the screen
func _on_progress(j, info: Dictionary) -> void:
	if String(info.get("step", "")) == "job":
		var words := String(info.get("note", "")).replace("+", " ")
		for rec in job_runs:
			if rec["job"] == j:
				if String(info.get("id", "")) != "":
					rec["id"] = String(info["id"])
				rec["done"] = int(info.get("done", "0"))
				rec["total"] = int(info.get("total", "0"))
				rec["last"] = words
		say_hint("job: " + words)
		if current and current.has_method("on_job_progress"):
			current.on_job_progress()
		return
	if current and current.has_method("on_progress"):
		current.on_progress(info)

## `job list --json`, kept in jobs_list; cb runs when it is in (Home rebuilds)
func refresh_jobs(cb: Callable = Callable()) -> void:
	if not backend.python_ok() or not backend.project_exists():
		jobs_list = []
		if cb.is_valid():
			cb.call()
		return
	backend.run(["job", "list", "-p", backend.project_dir], "job list", func(r: Dictionary):
		if r.get("ok", false):
			jobs_list = r.get("jobs", [])
		if cb.is_valid():
			cb.call())

## one sentence that spans benches becomes a job: Claude writes the plan, the runner carries it out as this Forge's child
func start_job(sentence: String) -> void:
	var a := ["job", "start", sentence, "-p", backend.project_dir]
	if backend.game_ok():
		a += ["--game", backend.game_dir]
	_run_job(a, sentence)

func approve_job(id: String) -> void:
	_run_job(["job", "approve", id, "--run", "-p", backend.project_dir], job_title(id))

func resume_job(id: String) -> void:
	_run_job(["job", "resume", id, "-p", backend.project_dir], job_title(id))

## stop: the runner under this Forge is killed (it is our child), and the job's state on disk says cancelled
func cancel_job(id: String) -> void:
	for rec in job_runs.duplicate():
		if String(rec["id"]) == id and rec["job"] != null:
			backend.cancel(rec["job"])
	backend.run(["job", "cancel", id, "-p", backend.project_dir], "job cancel", func(_r: Dictionary):
		refresh_jobs(func(): if current and current.has_method("on_job_done"): current.on_job_done({"ok": true, "state": "cancelled", "id": id})))

func _run_job(a: Array, title: String) -> void:
	var rec := {"id": "", "title": title, "last": "planning", "done": 0, "total": 0, "job": null}
	for x in a:
		if x is String and String(x).begins_with("20") and String(x).length() >= 15:
			rec["id"] = String(x)     # approve / resume carry the id already
	rec["job"] = backend.run(a, "job: " + title, func(r: Dictionary): _job_done(rec, r))
	job_runs.append(rec)
	audio.set_state("working")
	if current and current.has_method("on_job_progress"):
		current.on_job_progress()

func _job_done(rec: Dictionary, r: Dictionary) -> void:
	job_runs.erase(rec)
	if job_runs.is_empty():
		audio.set_state("home")
	set_hint(hint_text)
	if not r.get("ok", false):
		say(String(r.get("error", "The job stopped.")).split("\n")[0])
	refresh_jobs(func(): if current and current.has_method("on_job_done"): current.on_job_done(r))

func job_title(id: String) -> String:
	for j in jobs_list:
		if String(j.get("id", "")) == id:
			return String(j.get("title", id))
	return id

func job_running(id: String) -> bool:
	for rec in job_runs:
		if String(rec["id"]) == id or (id == "" and rec["job"] != null):
			return true
	return false

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
	hover_words = ""
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
	chrome.queue_redraw()
	s.on_enter()
	_first_focus()
	# the first time a bench opens, its callouts show once (not under the test hooks, unless --help asks)
	var seen: Dictionary = cfg.get("help_seen", {})
	var testing := args.has("shot") or args.has("script") or args.has("edits")
	if name != "home" and (args.has("help") or (not testing and not seen.has(name))):
		seen[name] = true
		cfg["help_seen"] = seen
		save_cfg()
		show_callouts()

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
	chrome.queue_redraw()

func set_groups(gs: Array) -> void:
	groups = []
	if callouts and is_instance_valid(callouts):
		callouts.queue_redraw()   # the bench rebuilt under the callouts: their tags follow the new groups
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
	if moved:
		shimmer = 0.0
	_hint_focus()
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

## the hint bar names the thing under the selector and how to change it
func _hint_focus() -> void:
	var g := current_group()
	if g == null:
		_show_hint(hint_text)
		return
	var h := ""
	if g == envs_ctrl:
		h = "ground · the place the thing stands in; click or Enter"
	elif g.has_method("hint_of"):
		h = String(g.hint_of(_sel_of(g)))
	_show_hint(h if h != "" else hint_text)

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
					shimmer = 0.0
					_hint_focus()
					selector.queue_redraw()
					return
				k += step
		return
	if j == i:
		return
	g.set_sel(j)
	audio.cursor(dir)
	shimmer = 0.0
	_hint_focus()
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
	var tex := PX.arrow(0)
	if shimmer >= 0.0 and not reduced_motion:
		tex = PX.arrow(int(shimmer * 12.0) % 2)
	if flash >= 0.0:
		tex = PX.arrow_flash(int(flash * 12.0))
	selector.draw_texture_rect(tex, Rect2(at + Vector2(nudge, 0), Vector2(16, 14)), false)

func _process(dt: float) -> void:
	sel_t += dt
	if flash >= 0.0:
		flash += dt
		if flash > 0.25:
			flash = -1.0
	if shimmer >= 0.0:
		shimmer += dt
		if shimmer > 0.34:
			shimmer = -1.0
	selector.queue_redraw()
	if toast_t > 0.0:
		toast_t -= dt
		if toast_t <= 0.0:
			toast.visible = false
	if not reduced_motion:
		flame_t += dt
		var fi := int(flame_t * 10.0) % 8
		if fi != flame_frame:
			flame_frame = fi
			chrome.queue_redraw()
	elif int(sel_t * 4.0) % 2 == 0:
		chrome.queue_redraw()
	if claude_working != "" and int(sel_t * 6.0) % 2 != int((sel_t - dt) * 6.0) % 2:
		_foot_claude()

# ------------------------------------------------------------------ the "?" callouts
## labelled callouts over the bench: a tag by every group saying how it is worked, a legend of the keys; any key
## or click closes it
func show_callouts() -> void:
	if callouts and is_instance_valid(callouts):
		callouts.queue_free()
		callouts = null
		chrome.queue_redraw()
		return
	var o := Control.new()
	o.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	o.mouse_filter = Control.MOUSE_FILTER_STOP
	o.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	o.draw.connect(_draw_callouts.bind(o))
	o.gui_input.connect(func(ev): if ev is InputEventMouseButton and ev.pressed: show_callouts())
	add_child(o)
	move_child(o, dissolve.get_index())
	callouts = o
	audio.blip("tab")
	chrome.queue_redraw()

func _draw_callouts(o: Control) -> void:
	var f := T.font("text")
	# a dither over the text box so the tags stand out
	var tb := TEXTBOX
	var y := tb.position.y
	while y < tb.end.y:
		var x := tb.position.x + (2 if int(y) % 4 == 0 else 0)
		while x < tb.end.x:
			o.draw_rect(Rect2(x, y, 1, 1), Color(0, 0, 0, 0.55))
			x += 4
		y += 2
	var tags := []
	for g in groups:
		if not g.visible or g.item_count() == 0:
			continue
		var words := ""
		var at := Vector2.ZERO
		if g == tabs_ctrl:
			# above the signs, on the picture window's foot, so no tab name is covered
			words = "tabs: LB and RB, Tab, or click"
			at = Vector2(PIC.end.x - T.text_width(words, T.SMALL_SIZE) - 14, PIC.end.y - 15)
		elif g == envs_ctrl:
			words = "ground: the place it stands in"
			at = Vector2(get_node("GroundLabel").position.x - T.text_width(words, T.SMALL_SIZE) - 18, FOOT_Y + 1)
		elif g is W.SliderRack:
			words = "sliders: drag, or click the number to type"
			at = layer.position + g.position + Vector2(g.size.x - T.text_width(words, T.SMALL_SIZE) - 14, 1)
		elif g is W.RampRack:
			words = "ramps: Enter or click picks one"
			at = layer.position + g.position + Vector2(g.size.x - T.text_width(words, T.SMALL_SIZE) - 14, 0)
		elif g is W.Rack:
			# one short word over each control (the columns are narrow), the long form in one tag under the rack
			for c in g.controls:
				var how := "drag"
				if c is W.Wheel:
					how = "turn"
				elif c is W.Pull:
					how = "pull"
				elif c is W.Lever3:
					how = "cycle"
				tags.append([how, layer.position + g.position + c.position + Vector2(floorf((c.size.x - T.text_width(how, T.SMALL_SIZE) - 10) / 2.0), 2)])
			words = "levers: drag up or down, or scroll; wheels: drag round; type a value: click the number under it"
			at = layer.position + g.position + Vector2(g.size.x - T.text_width(words, T.SMALL_SIZE) - 14, g.size.y - 14)
		elif g is W.Timeline:
			words = "frames: click one, drag to reorder"
			at = layer.position + g.position + Vector2(g.size.x - T.text_width(words, T.SMALL_SIZE) - 14, 0)
		elif g is W.Choices:
			var cyc := false
			for it in g.items:
				if it.has("value"):
					cyc = true
			words = "< > left and right change it; click a value to type" if cyc else "choices: Enter or click; the dagger marks the one in hand"
			at = layer.position + g.position + Vector2(g.size.x - T.text_width(words, T.SMALL_SIZE) - 14, -1)
		if words != "":
			tags.append([words, at])
	tags.append(["Esc or B: back   arrows or d-pad: move   Enter or A: choose   Ctrl+L: the log   click or any key closes this", Vector2(TEXTBOX.position.x + 6, TEXTBOX.end.y - 16)])
	for tg in tags:
		var w := T.text_width(String(tg[0]), T.SMALL_SIZE) + 10
		var p: Vector2 = tg[1]
		p.x = clampf(p.x, 4.0, CANVAS.x - w - 4.0)
		var r := Rect2(p, Vector2(w, 13))
		o.draw_rect(r, Color(Frame.IRON[1]))
		PX.outline(o, r, Color(Frame.GOLD[3]))
		_edged(o, f, Vector2(r.position.x + 5, r.position.y + 11), String(tg[0]), T.SMALL_SIZE, Color(Frame.GOLD[4]), T.BLACK)

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
	set_sound_level("quiet" if on else "off")

## the sounds level: off | quiet (the cursor blip, the select click, back) | full (levers, wheels, pulls, drops too)
func set_sound_level(l: String) -> void:
	audio.set_level(l)
	cfg["sound_level"] = audio.level
	cfg["sounds"] = audio.level != "off"
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
	if callouts and is_instance_valid(callouts):
		if (ev is InputEventKey and ev.pressed) or (ev is InputEventJoypadButton and ev.pressed):
			show_callouts()
			get_viewport().set_input_as_handled()
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

func _on_files_dropped(paths: PackedStringArray) -> void:
	hover_drop = false
	chrome.queue_redraw()
	if current:
		audio.blip("drop")
		if current.screen_name == "characters" and not current.old_roads_on():
			# a picture dropped on the Characters bench is the reference and nothing else (the automatic draft from a
			# picture is retired): the bench opens again with it beside whatever model stands there
			var pics: PackedStringArray = []
			for q in paths:
				if q.get_extension().to_lower() in ["png", "jpg", "jpeg", "webp", "bmp", "gif"]:
					pics.append(q)
			if not pics.is_empty():
				var a: Dictionary = current.args.duplicate()
				a.erase("pictures")
				a["painting"] = pics[0]
				var model_file := String(current.state.get("model_file", ""))
				if model_file != "" and not a.has("character"):
					a["model"] = model_file
				_show("characters", a, false)
				return
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
