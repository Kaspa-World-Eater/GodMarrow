extends Control
const T := preload("res://scripts/theme.gd")
const PX := preload("res://scripts/px.gd")
const W := preload("res://scripts/widgets.gd")
const App := preload("res://scripts/app.gd")
## scripts/screen.gd: one screen of the Forge, laid out in the text box: a state line, the rack (or the Advanced
## fold's plain sliders), the choices line, and whatever the tab needs between them. The picture window above is
## the app's scene; a screen tells it what to show. Workbenches extend this with tabs; Home is a screen with none.
## Every workbench carries its own undo stack (JSON snapshots of `state`), Reset (this tab's controls back to
## their defaults) and Start over (this thing's work thrown away after one plain confirmation, inside the window).

var app: App
var screen_name := ""
var args := {}
var tabs: PackedStringArray = []
var tab := 0
var state := {}                 # the screen's facts (names, files, values): what undo snapshots
var undo_stack: Array = []
var redo_stack: Array = []
var advanced_open := false
var job = null                  # the running Backend.Job, when one is
var rows: VBoxContainer
var state_label: Control
var rack: Control = null
var adv_rack: Control = null
var choices: Control = null
var extra: Array = []           # controls between the rack and the choices (timeline, cards, ramps)
var progress: Control = null
var groups: Array = []          # the selector's groups, top to bottom
var pending_confirm := {}
var hint_text := ""
var busy_words := ""

func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS

func setup(a: App, name_: String, arguments: Dictionary) -> void:
	app = a
	screen_name = name_
	args = arguments
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rows = VBoxContainer.new()
	rows.add_theme_constant_override("separation", 1)
	rows.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	rows.offset_left = 8
	rows.offset_right = -8
	rows.offset_top = 3
	rows.offset_bottom = -1
	rows.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(rows)
	if args.has("advanced"):
		advanced_open = true
	build()

## the --tab argument, once the screen has named its tabs (screens call this after setting `tabs`)
func tab_from_args() -> void:
	if args.has("tab") and tabs.size() > 0:
		var want := String(args["tab"])
		for i in tabs.size():
			if tabs[i].to_lower() == want.to_lower() or str(i) == want:
				tab = i

## override: read the arguments, set the state, then call rebuild()
func build() -> void:
	rebuild()

## wipe the text box and build the current tab again (the screen's content is cheap to make)
func rebuild() -> void:
	for c in rows.get_children():
		rows.remove_child(c)
		c.queue_free()
	rack = null
	adv_rack = null
	choices = null
	progress = null
	extra = []
	groups = []
	state_label = null
	build_tab(tab)
	app.set_tabs(tabs, tab, self)
	app.set_groups(groups)
	app.set_hint(hint_text)

## override: fill the text box for tab i (state_line, rack, choices...)
func build_tab(_i: int) -> void:
	pass

func set_tab(i: int) -> void:
	if i == tab or i < 0 or i >= tabs.size():
		return
	tab = i
	advanced_open = false
	rebuild()
	on_tab()

## override: after a tab change
func on_tab() -> void:
	pass

## override: a file dropped on the window while this screen shows
func on_drop(_paths: PackedStringArray) -> void:
	pass

## override: after the dissolve, the screen is in view
func on_enter() -> void:
	pass

## override: keys the screen wants before the app (return true when used)
func on_key(_ev: InputEvent) -> bool:
	return false

## a screen may keep a job running when the person leaves; override to say no
func can_leave() -> bool:
	return true

# ------------------------------------------------------------------ pieces
func state_line(text: String, variation: String = "", lines: int = 1) -> Control:
	var l := W.PxText.new()
	var c := T.BONE
	if variation == "Gold":
		c = T.GOLD
	elif variation == "Dim":
		c = T.DIM
	elif variation == "Accent":
		c = T.ACCENT
	l.init(text, c, lines)
	rows.add_child(l)
	state_label = l
	return l

func dim_line(text: String, lines: int = 1) -> Control:
	var l := W.PxText.new()
	l.init(text, T.DIM, lines)
	rows.add_child(l)
	return l

func small_line(text: String, colour: Color = T.DIM) -> Control:
	var l := W.PxText.new()
	l.init(text, colour, 1, T.SMALL_SIZE)
	rows.add_child(l)
	return l

func set_state_text(text: String) -> void:
	if state_label and is_instance_valid(state_label):
		state_label.set_text(text)

## the rack: a list of W.Knob controls (Lever / Wheel / Pull / Lever3) laid in `cols` columns. With the Advanced
## fold open the same controls show as plain pixel sliders with their exact values (finer steps), plus whatever
## fine values the screen adds in advanced_extra().
func add_rack(controls: Array, cols: int = 8) -> Control:
	if advanced_open:
		return add_advanced(sliders_of(controls) + advanced_extra(), 3)
	var r := W.Rack.new()
	r.setup(controls, app, cols)
	rows.add_child(r)
	rack = r
	groups.append(r)
	return r

## override: extra plain sliders for the Advanced fold (the fine values the levers round)
func advanced_extra() -> Array:
	return []

## a plain slider for every pixel control: the same value, the same words under it, finer steps; the control itself
## rides along hidden so its callbacks (what the screen gave it) stay alive
static func sliders_of(controls: Array) -> Array:
	var out := []
	for k in controls:
		var sl := W.PxSlider.new()
		if k is W.Wheel:
			sl.init(k.label, k.angle, -180.0, 180.0, k.default_angle, 0, func(v): k.set_angle(v, false))
			sl.on_commit = func(_v): if k.on_commit.is_valid(): k.on_commit.call(k.angle)
		elif k is W.Pull:
			sl.init(k.label, 1.0 if k.on else 0.0, 0.0, 1.0, 1.0 if k.default > 0.5 else 0.0, 0, func(v): k.set_on(v > 0.5))
		elif k is W.Lever3:
			sl.init(k.label, float(k.stop), 0.0, 2.0, round(k.default * 2.0), 0, func(v): k.set_stop(int(round(v))))
		elif k is W.Knob:
			sl.init(k.label, k.value, 0.0, 1.0, k.default, 3, func(v): k.set_value(v, false))
			sl.on_commit = func(_v): if k.on_commit.is_valid(): k.on_commit.call(k.value)
		else:
			continue
		sl.fmt = func(_v): return k.value_text()
		k.visible = false
		sl.add_child(k)
		out.append(sl)
	return out

## a plain slider with a range of its own (for advanced_extra)
static func fine_slider(name: String, v: float, lo: float, hi: float, def: float, places: int, commit: Callable, fmt: Callable = Callable()) -> Control:
	var sl := W.PxSlider.new()
	sl.init(name, v, lo, hi, def, places, Callable())
	sl.on_commit = commit
	sl.fmt = fmt
	return sl

## the Advanced fold: plain sliders in two columns (shown instead of the rack when open)
func add_advanced(sliders: Array, cols: int = 2) -> Control:
	var r := W.SliderRack.new()
	r.setup(sliders, app, cols)
	rows.add_child(r)
	adv_rack = r
	groups.append(r)
	return r

func add_extra(c: Control, as_group: bool = true) -> Control:
	rows.add_child(c)
	extra.append(c)
	if as_group:
		groups.append(c)
	return c

func add_spacer() -> void:
	var c := Control.new()
	c.size_flags_vertical = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rows.add_child(c)

## the choices line: [{label, cb}] in `cols` columns
func add_choices(items: Array, cols: int = 0) -> Control:
	var c := W.Choices.new()
	if cols > 0:
		c.setup(items, cols, app)
	else:
		c.flow = true
		c.flow_gap = 8
		c.row_h = 15
		c.wrap_width = App.TEXTBOX.size.x - 16
		c.setup(items, 1, app)
	rows.add_child(c)
	choices = c
	groups.append(c)
	return c

func add_progress() -> Control:
	var p := W.Progress.new()
	p.custom_minimum_size = Vector2(0, 20)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	rows.add_child(p)
	progress = p
	return p

## the standard choices every workbench has, plus the tab's own in front
func standard_choices(front: Array = [], with_render_all: bool = true) -> Array:
	var items := front.duplicate()
	items.append({"label": "Keep", "cb": keep})
	if with_render_all:
		items.append({"label": "Render all", "cb": render_all})
	items.append({"label": "Undo", "cb": undo})
	items.append({"label": "Reset", "cb": reset})
	items.append({"label": "Start over", "cb": start_over})
	items.append({"label": "Advanced" if not advanced_open else "Levers", "cb": toggle_advanced})
	return items

# ------------------------------------------------------------------ the standard actions (override what applies)
func keep() -> void:
	app.say("Nothing to keep yet.")

func render_all() -> void:
	app.say("Nothing to render yet.")

func toggle_advanced() -> void:
	advanced_open = not advanced_open
	rebuild()
	app.audio.blip("tab")

## Reset: this tab's controls back to their defaults
func reset() -> void:
	push_undo()
	for r in [rack, adv_rack]:
		if r and is_instance_valid(r):
			for c in r.controls:
				if c.has_method("reset"):
					c.reset()
	app.audio.blip("clunk")

## Start over: one plain confirmation inside the window, then do_start_over()
func start_over() -> void:
	confirm(start_over_question(), do_start_over)

func start_over_question() -> String:
	return "Start over? This bench's work is thrown away; what was dropped on it is kept."

func do_start_over() -> void:
	state = {}
	undo_stack = []
	redo_stack = []
	rebuild()

## a question with Yes / No in the choices line; Esc is No
func confirm(question: String, yes: Callable) -> void:
	pending_confirm = {"question": question, "yes": yes}
	for c in rows.get_children():
		rows.remove_child(c)
		c.queue_free()
	groups = []
	rack = null
	adv_rack = null
	choices = null
	extra = []
	state_line(question, "Gold")
	add_spacer()
	add_choices([{"label": "Yes", "cb": func(): pending_confirm = {}; yes.call()}, {"label": "No", "cb": func(): pending_confirm = {}; rebuild()}])
	app.set_groups(groups)
	app.focus_on(choices, 1, false)

# ------------------------------------------------------------------ undo
func push_undo() -> void:
	undo_stack.append(JSON.stringify(state))
	if undo_stack.size() > 60:
		undo_stack.pop_front()
	redo_stack = []

func undo() -> void:
	if undo_stack.is_empty():
		app.say("Nothing to undo.")
		return
	redo_stack.append(JSON.stringify(state))
	var d = JSON.parse_string(undo_stack.pop_back())
	if d is Dictionary:
		state = d
	on_state_restored()
	rebuild()
	app.audio.blip("back")

func redo() -> void:
	if redo_stack.is_empty():
		app.say("Nothing to redo.")
		return
	undo_stack.append(JSON.stringify(state))
	var d = JSON.parse_string(redo_stack.pop_back())
	if d is Dictionary:
		state = d
	on_state_restored()
	rebuild()
	app.audio.blip("confirm")

## override: after undo/redo put `state` back (write files, refresh the preview)
func on_state_restored() -> void:
	pass

# ------------------------------------------------------------------ running the pipeline
## run one command; the strip shows progress; `on_done` gets the result; a stopped step shows its plain line
func run(args: Array, words: String, on_done: Callable, with_progress: bool = true) -> void:
	if job != null:
		app.say("Still working on the last thing.")
		return
	busy_words = words
	if with_progress:
		if progress == null or not is_instance_valid(progress):
			add_progress()
			if choices and is_instance_valid(choices):
				rows.move_child(progress, choices.get_index())
		progress.set_progress(-1, 1, words)
	app.audio.set_state("working")
	app.set_hint("working: " + words)
	job = app.backend.run(args, words, func(r: Dictionary):
		job = null
		if not is_inside_tree():
			return
		if progress and is_instance_valid(progress):
			progress.queue_free()
			progress = null
		app.audio.set_state("home")
		if not r.get("ok", false):
			app.say(plain_error(r))
		app.set_hint(hint_text)
		on_done.call(r))

func on_progress(info: Dictionary) -> void:
	if progress and is_instance_valid(progress):
		var done := int(info.get("done", "0"))
		var total := int(info.get("total", "1"))
		var what := String(info.get("clip", "")) + " " + String(info.get("dir", ""))
		progress.set_progress(done, total, busy_words + (": " + what.strip_edges() if what.strip_edges() != "" else "") + "  %d of %d" % [done, total])

## the plain words of a stopped step, with the fix it names
static func plain_error(r: Dictionary) -> String:
	var e := String(r.get("error", "The step stopped."))
	return e.split("\n")[0].strip_edges()

func stop_job() -> void:
	if job != null:
		app.backend.cancel(job)

## a texture from a file on disk (never cached: the pipeline rewrites files)
static func tex(path: String) -> Texture2D:
	if path == "" or not FileAccess.file_exists(path):
		return null
	var img := Image.load_from_file(path)
	if img == null:
		return null
	return ImageTexture.create_from_image(img)

## the frames of a clip folder (frame_000.png ...)
static func frame_textures(dir: String) -> Array:
	var out := []
	var d := DirAccess.open(dir)
	if d == null:
		return out
	var names := []
	for f in d.get_files():
		if f.begins_with("frame_") and f.ends_with(".png") and not f.contains(".parts."):
			names.append(f)
	names.sort()
	for f in names:
		var img := Image.load_from_file(dir.path_join(f))
		if img:
			out.append(ImageTexture.create_from_image(img))
	return out

static func slug(s: String) -> String:
	var out := ""
	for ch in s.to_lower():
		if (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9"):
			out += ch
		elif not out.ends_with("_") and out != "":
			out += "_"
	out = out.trim_suffix("_")
	return out if out != "" else "thing"

static func pretty(s: String) -> String:
	return s.replace("_", " ").capitalize()
