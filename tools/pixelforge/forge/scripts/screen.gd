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
## Every workbench also has a describe line at the foot of the text box: one sentence goes to Claude Code
## (`pixelforge describe --bench <bench> -p <project> "<words>"`, pixelforge/claude_bridge.py), which works through
## PixelForge's own tools on the same project; the bench shows its progress, reloads what it changed, lights the
## levers that moved, puts its notes on the state line, and Undo puts the files back from the snapshot the run took.

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
var describe: LineEdit = null   # the Claude line (every workbench; Home has its own)
var claude_notes := ""          # the last run's notes, shown on the state line for a while (every rebuild in that time keeps them)
var claude_notes_until := 0
var _values_before := {}        # control values before a Claude run, for the highlight
var _claude_text := ""

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
	describe = null
	build_tab(tab)
	if has_describe_line() and _content_height() + 14 <= App.TEXTBOX.size.y - 3:
		add_describe_line()
	if claude_notes != "":
		if claude_notes_until == 0:
			claude_notes_until = Time.get_ticks_msec() + 12000
		if Time.get_ticks_msec() <= claude_notes_until:
			set_state_text(claude_notes)
		else:
			claude_notes = ""
			claude_notes_until = 0
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

## override: keys the screen wants before the app (return true when used); screens that override call describe_key first
func on_key(ev: InputEvent) -> bool:
	return describe_key(ev)

## the describe line takes typing when it has the focus; Esc hands the keys back; / takes the line
func describe_key(ev: InputEvent) -> bool:
	if describe == null or not is_instance_valid(describe):
		return _no_line_key(ev)
	if describe.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			describe.release_focus()
			return true
		return false
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_SLASH and pending_confirm.is_empty():
		describe.grab_focus()
		return true
	return false

## a full tab has no line: / says where it is
func _no_line_key(ev: InputEvent) -> bool:
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_SLASH and has_describe_line() and (describe == null or not is_instance_valid(describe)):
		app.say("This tab is full; the Claude line is on the bench's other tabs.")
		return true
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

# ------------------------------------------------------------------ Claude on the bench
## workbenches have the line; Home, Settings and the editor do not
func has_describe_line() -> bool:
	return tabs.size() > 0 and not screen_name in ["home", "settings", "editor"]

## the text box rows' declared heights (every widget sets its minimum): a tab that is full keeps its choices and loses the line
func _content_height() -> float:
	var h := 0.0
	for c in rows.get_children():
		if c is Control and c.visible:
			h += c.custom_minimum_size.y + 1
	return h

## the bench's name for `describe --bench`
func bench_name() -> String:
	return screen_name

## override: what is on the bench, for Claude's system prompt (model_file, song, effect, frames_dir...)
func claude_context() -> Dictionary:
	return {}

## override: the run is done; reload what Claude changed (`r.changed` lists the files, `r.notes` the words)
func on_claude_done(_r: Dictionary) -> void:
	pass

## override: Undo put the files back; reload from disk (default: as after any undo)
func on_claude_undone() -> void:
	on_state_restored()

func add_describe_line() -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 4)
	row.custom_minimum_size = Vector2(0, 13)
	var l := Label.new()
	l.text = "Claude:"
	l.theme_type_variation = "SmallDim"
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(l)
	describe = LineEdit.new()
	describe.add_theme_font_size_override("font_size", T.SMALL_SIZE)
	describe.placeholder_text = describe_placeholder()
	describe.text = _claude_text
	describe.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	describe.custom_minimum_size = Vector2(0, 13)
	describe.text_submitted.connect(func(_t): _describe())
	describe.text_changed.connect(func(t): _claude_text = t)
	describe.focus_entered.connect(func(): app.say_hint("Enter hands the line to Claude; Esc leaves the line"))
	describe.focus_exited.connect(func(): app.set_hint(hint_text))
	row.add_child(describe)
	rows.add_child(row)
	return row

## override: the example in the empty line
func describe_placeholder() -> String:
	return {"characters": "a hooded necromancer with a skull-topped staff, taller, a longer cape", "creatures": "a bone hound, low and long",
		"objects": "an iron-bound chest with a skull lock", "effects": "a slow pale wisp with embers", "tiles": "more variants, fewer colours",
		"interface": "a thinner frame edge", "music": "slower, 76 bpm, darker, a held root note to open", "sound": "a duller, longer hit"}.get(screen_name, "describe the change")

## the line goes to Claude: a snapshot first (Undo), then `describe --bench`, progress on the strip, the result reloaded
## a line for the state line that stays through the next rebuilds (12 s)
func say_notes(t: String) -> void:
	claude_notes = t
	claude_notes_until = Time.get_ticks_msec() + 12000

func _describe() -> void:
	if describe == null:
		return
	var text := describe.text.strip_edges()
	if text == "":
		return
	if job != null:
		app.say("Still working on the last thing.")
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	var st: Dictionary = app.claude_state
	if not st.is_empty() and not st.get("ok", false):
		say_notes(String(st.get("sentence", "Claude Code is not ready.")))
		rebuild()
		return
	_values_before = _control_values()
	push_undo()
	describe.editable = false
	app.set_claude_working("starting")
	var a := ["describe", "--bench", bench_name(), "-p", app.backend.project_dir, text, "--context", JSON.stringify(claude_context())]
	run(a, "Claude: " + text, func(r: Dictionary):
		app.set_claude_working("")
		if describe and is_instance_valid(describe):
			describe.editable = true
		if not r.get("ok", false):
			say_notes("Claude: " + plain_error(r))
			rebuild()
			return
		_claude_text = ""
		state["claude_snapshot"] = String(r.get("snapshot", ""))
		var did: Array = r.get("did", [])
		var notes := String(r.get("notes", ""))
		say_notes("Claude: " + (notes if notes != "" else (", ".join(PackedStringArray(did)) if not did.is_empty() else "done, nothing to report")))
		on_claude_done(r)
		rebuild()
		_highlight_changed()
		app.remember_last(screen_name, {"title": text, "note": "by Claude"}))

## the racks' values by control name, to see which levers Claude moved
func _control_values() -> Dictionary:
	var out := {}
	for r in [rack, adv_rack]:
		if r and is_instance_valid(r):
			for c in r.controls:
				if c.has_method("value_text"):
					out[String(c.label)] = c.value_text()
	return out

## the levers whose values changed light up for a moment
func _highlight_changed() -> void:
	var now := _control_values()
	var lit := []
	for r in [rack, adv_rack]:
		if r and is_instance_valid(r):
			for c in r.controls:
				if c.has_method("set_hot") and _values_before.has(String(c.label)) and _values_before[String(c.label)] != now.get(String(c.label), ""):
					c.set_hot(true)
					lit.append(c)
	_values_before = {}
	if lit.is_empty():
		return
	get_tree().create_timer(2.5).timeout.connect(func():
		for c in lit:
			if is_instance_valid(c):
				c.set_hot(false))

## a Claude run's files from the picked list: the first with the extension, in a folder when given
static func pick_changed(r: Dictionary, ext: String, folder: String = "") -> String:
	for f in r.get("changed", []):
		var p := String(f)
		if p.ends_with(ext) and (folder == "" or p.replace("\\", "/").begins_with(folder.replace("\\", "/"))):
			return p
	return ""

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
	if job != null:
		app.say("Still working on the last thing.")
		return
	var snap := String(state.get("claude_snapshot", ""))
	redo_stack.append(JSON.stringify(state))
	var d = JSON.parse_string(undo_stack.pop_back())
	if d is Dictionary:
		state = d
	if snap != "":
		# a Claude run is undone on disk too: the snapshot the run took goes back, what it made since is removed
		app.set_hint("undoing Claude's change")
		app.backend.run(["claude", "undo", snap], "undoing Claude's change", func(r: Dictionary):
			if not is_inside_tree():
				return
			app.set_hint(hint_text)
			say_notes("Claude's change is undone: the files are as they were." if r.get("ok", false) else "Undo could not put the files back: " + plain_error(r))
			on_claude_undone()
			rebuild()
			app.audio.blip("back"))
		return
	on_state_restored()
	rebuild()
	app.audio.blip("back")

func redo() -> void:
	if redo_stack.is_empty():
		app.say("Nothing to redo.")
		return
	var top = JSON.parse_string(redo_stack.back())
	if top is Dictionary and String(top.get("claude_snapshot", "")) != "":
		app.say("Redo cannot run Claude again; describe it once more.")
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
	if String(info.get("step", "")) == "claude":
		var words := String(info.get("note", "")).replace("+", " ")
		app.set_claude_working(words)
		if progress and is_instance_valid(progress):
			progress.set_progress(-1, 1, "Claude: " + words)
		return
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
