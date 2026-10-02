extends "res://scripts/screen.gd"
## scripts/quest.gd: a guided path of screens. One big action per screen, a picture of what you get, one line of
## what happens next, the progress strip along the top, an Advanced fold with the step's real settings (the CLI's
## flags, closed by default), and the log drawer for the curious. A quest subclass names its steps and builds each
## one; this class runs the commands, shows a stopped step as a card with the fix it names, and keeps the strip.

var steps: Array = []            # the step names on the strip
var step := 0                    # the one showing
var done: Array = []             # indices finished
var state := {}                  # the quest's own facts (names, files)
var adv := {}                    # Advanced values (filled with defaults by advanced())
var chain := false               # run the automatic steps one after another
var job = null                   # the running Backend.Job
var strip_box: HBoxContainer
var left: PanelContainer
var right: VBoxContainer
var action_btn: Button = null
var working_label: Label = null
var spin_t := 0.0
var working := false
var sub_progress := ""
var quest_title := "Quest"

func build() -> void:
	set_title(quest_title)
	strip_box = W.row(0)
	strip_box.custom_minimum_size = Vector2(0, 16)
	body.add_child(strip_box)
	var cols := two_columns("Dark")
	left = cols["left"]
	right = cols["right"]
	hint("Esc goes back  ·  Enter does the big thing  ·  the strip above is where you are")
	if args.has("advanced"):
		adv["_open"] = true
	# Describe-it's draft for a painting: the prompt to paint, shown on the first screen (prompt_card)
	if args.has("draft") and args["draft"] is Dictionary and String(args["draft"].get("what", "")) == "prompt":
		state["prompt"] = String(args["draft"].get("prompt", ""))
		state["prompt_kind"] = String(args.get("prompt_kind", ""))
	begin()
	show_step()

## override: read the arguments (a dropped painting, a character to continue) and set `step`
func begin() -> void:
	pass

## override: fill `left` (the picture) and `right` (the words and the action) for step i
func build_step(_i: int) -> void:
	pass

func show_step() -> void:
	for c in left.get_children():
		left.remove_child(c)
		c.queue_free()
	for c in right.get_children():
		right.remove_child(c)
		c.queue_free()
	action_btn = null
	working_label = null
	first_focus = null
	_strip()
	build_step(step)
	if not app.transitioning:
		focus_first()

func _strip() -> void:
	for c in strip_box.get_children():
		strip_box.remove_child(c)
		c.queue_free()
	strip_box.add_child(W.strip(steps, step, done, func(i): if not working: go_step(i)))

func go_step(i: int) -> void:
	step = clampi(i, 0, steps.size() - 1)
	FSfx.play("tick")
	show_step()

func advance() -> void:
	if step < steps.size() - 1:
		go_step(step + 1)

func mark_done(i: int) -> void:
	if not i in done:
		done.append(i)

func is_done(i: int) -> bool:
	return i in done

# ------------------------------------------------------------------ pieces of a step
func picture(ctrl: Control) -> void:
	for c in left.get_children():
		left.remove_child(c)
		c.queue_free()
	left.add_child(ctrl)

func picture_file(path: String) -> void:
	var t := FT.tex(path, false)
	if t:
		picture(W.picture(t))
	else:
		picture(W.label("(no picture yet)", "Dim", HORIZONTAL_ALIGNMENT_CENTER))

func headline(text: String) -> Label:
	var l := W.label(text, "Big", HORIZONTAL_ALIGNMENT_LEFT, true)
	right.add_child(l)
	return l

func words(text: String, variation: String = "") -> Label:
	var l := W.label(text, variation, HORIZONTAL_ALIGNMENT_LEFT, true)
	right.add_child(l)
	return l

func next_line(text: String) -> void:
	var l := W.label("What happens next: " + text, "Italic", HORIZONTAL_ALIGNMENT_LEFT, true)
	right.add_child(l)

func big(text: String, cb: Callable) -> Button:
	var b := W.primary(text, cb)
	right.add_child(b)
	action_btn = b
	first_focus = b
	return b

func small(text: String, cb: Callable, variation: String = "") -> Button:
	var b := W.button(text, variation, cb)
	right.add_child(b)
	return b

func buttons(list: Array) -> HBoxContainer:
	var r := W.row(6)
	for b in list:
		r.add_child(b)
	right.add_child(r)
	return r

## the Describe-it draft: the Midjourney prompt for what was described, with a button to copy it
func prompt_card() -> void:
	if String(state.get("prompt", "")) == "":
		return
	words("Here is the Midjourney prompt for what you described. Copy it, paint it, and drop the painting here.", "Small")
	var pb := W.button("Copy the prompt", "", func(): DisplayServer.clipboard_set(String(state["prompt"])); app.say("Prompt copied."))
	right.add_child(pb)
	first_focus = pb

## the Advanced fold: the step's real settings with the defaults filled in
func advanced(spec: Array, note: String = "") -> void:
	var f := W.fold("Advanced")
	if note != "":
		f.body.add_child(W.label(note, "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	f.body.add_child(W.params(spec, adv))
	right.add_child(f)
	if adv.get("_open", false):
		f.set_open(true)

func flag(key: String, flag_name: String, default = null) -> Array:
	## the CLI flag for an Advanced value, only when it differs from the default
	if not adv.has(key):
		return []
	var v = adv[key]
	if default != null and str(v) == str(default):
		return []
	if v is bool:
		return [flag_name] if v else []
	if str(v) == "":
		return []
	return [flag_name, str(v)]

# ------------------------------------------------------------------ running a command
## run one command for this step. On success `on_ok(result)`; a stop shows a card with the fix it names.
func run(cli: Array, label: String, on_ok: Callable, on_line: Callable = Callable()) -> void:
	if not app.backend.python_ok():
		fail({"error": "Python was not found. Run install.bat once, next to this app."})
		return
	working = true
	sub_progress = ""
	# the big button waits while the command runs and gets its own words and its own job back after (never a
	# second job bound to it: a stop is retried from the card)
	var btn := action_btn
	var btn_text := btn.text if btn else ""
	if btn:
		btn.disabled = true
		btn.text = "Working…"
	working_label = W.label("", "Teal")
	working_label.add_theme_font_override("font", FT.font("pixel"))
	working_label.add_theme_font_size_override("font_size", 8)
	right.add_child(working_label)
	var stop := W.ghost("Stop", func(): if job: app.backend.cancel(job))
	right.add_child(stop)
	var cur := step
	job = app.backend.run(cli, label, func(l: String): _line(l); if on_line.is_valid(): on_line.call(l),
		func(r: Dictionary):
			job = null
			working = false
			if not is_inside_tree() or step != cur:
				return
			if is_instance_valid(stop):
				stop.queue_free()
			if is_instance_valid(working_label):
				working_label.queue_free()
			if btn and is_instance_valid(btn):
				btn.disabled = false
				btn.text = btn_text
			if r.get("ok", false):
				FSfx.play("done")
				on_ok.call(r)
			else:
				chain = false
				FSfx.play("fail")
				fail(r))

func _line(l: String) -> void:
	if l.begins_with("PF_PROGRESS"):
		var d := {}
		for part in l.substr(11).strip_edges().split(" "):
			var kv := part.split("=")
			if kv.size() == 2:
				d[kv[0]] = kv[1]
		if d.has("action"):
			sub_progress = "filmed " + String(d["action"]).replace("_", " ")
	elif l.begins_with("  ") and ("MB" in l) and ("/" in l):
		sub_progress = "downloaded " + l.strip_edges()
	elif l.begins_with("[") and "]" in l:
		sub_progress = l.substr(l.find("]") + 1).strip_edges()

func _process(dt: float) -> void:
	spin_t += dt
	if working and working_label and is_instance_valid(working_label):
		var dots := ["·  ", "·· ", "···", " ··", "  ·", "   "]
		working_label.text = dots[int(spin_t * 4.0) % dots.size()] + "  " + (sub_progress if sub_progress != "" else "working")

## a stopped step: the plain reason and the fix it names
func fail(r: Dictionary) -> void:
	var msg := String(r.get("error", r.get("reason", "The step stopped.")))
	var plain := msg
	var btns: Array = []
	if "Blender was not found" in msg or "Blender" in msg and "not found" in msg:
		plain = "Blender does the 3D part. It is free and the Forge can fetch it for you (380 MB, no installer)."
		btns.append(W.button("Download Blender for me", "Warn", func(): download_blender()))
		btns.append(W.ghost("I have it: choose it", func(): app.choose_file(PackedStringArray(["*.exe, blender ; Blender"]), func(p):
			run(["project", "set", "--blender", p, "--project", app.backend.project_dir], "set blender", func(_x): retry()), "Choose blender.exe")))
	elif "Godot was not found" in msg:
		plain = "Godot (the game engine) was not found. Settings lets you choose it."
		btns.append(W.button("Open Settings", "", func(): app.go("settings")))
	elif "Python" in msg and "not found" in msg or "install.bat" in msg:
		plain = msg
		btns.append(W.button("Open Settings", "", func(): app.go("settings")))
	else:
		plain = _plain(msg)
		btns.append(W.button("Try again", "", func(): retry()))
	btns.append(W.ghost("Show the log", func(): if not app.drawer.visible: app.toggle_log()))
	if r.get("cancelled", false):
		plain = "Stopped. Nothing was broken; try again when you like."
	var c := W.card("This step stopped", plain, btns)
	right.add_child(c)
	first_focus = btns[0]
	focus_first()

## the pipeline's messages, trimmed of what a person cannot use (paths, command lines)
func _plain(msg: String) -> String:
	var first := msg.split("\n")[0]
	if "(`" in first:
		first = first.split("(`")[0]
	if first.begins_with("Blender failed"):
		return "Blender stopped partway; the log has what it said. Try again, and if it keeps stopping, Settings has Download Blender for me, which gets the version the Forge knows."
	if "could not identify a front view" in first:
		return "The painting's figures could not be told apart. Use a plain background, keep the figures apart, or try Advanced: more figures on the sheet."
	if "no figures found" in first:
		return "No figure was found on the painting. The background should be one flat colour."
	if "already exists" in first:
		return "There is already one with that name. Pick another name in Advanced."
	return first.strip_edges()

## override: run the current step again
func retry() -> void:
	show_step()

func download_blender() -> void:
	run(["project", "blender-download", "--project", app.backend.project_dir], "blender-download", func(_r): retry())

## test hook (--autoput): press the big action for the person
func _auto_press(cb: Callable = Callable()) -> void:
	if cb.is_valid():
		cb.call()
	elif action_btn and is_instance_valid(action_btn) and not action_btn.disabled:
		action_btn.pressed.emit()

# ------------------------------------------------------------------ the project and the game
## the project folder exists (made on first use, with the game's style)
func ensure_project(cb: Callable) -> void:
	if app.backend.project_exists():
		cb.call()
		return
	run(["project", "new", app.backend.project_dir, "--name", "Forge", "--style", "godmarrow"], "new project", func(_r): cb.call())

func game_card() -> bool:
	## true when the game folder is missing (and a card was shown)
	if app.backend.game_ok():
		return false
	right.add_child(W.card("The game folder was not found", "Settings lets you choose the folder with the game (the one with project.godot). Everything made so far is kept in the project.",
		[W.button("Open Settings", "", func(): app.go("settings"))]))
	return true

## after new files land in the game, Godot has to notice them (an import pass, a few seconds)
func import_game(cb: Callable) -> void:
	run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "import into the game", func(_r): cb.call())

func see_in_game(extra: Array, cb: Callable = Callable()) -> void:
	run(["game-preview", "--game", app.backend.game_dir, "--godot", app.backend.godot] + extra, "see it in the game", func(r):
		app.say("The game is opening in its own window.", 4.0)
		if cb.is_valid():
			cb.call(r))

func screenshot_in_game(extra: Array, name: String, cb: Callable) -> void:
	var shot: String = app.backend.out_dir("shots").path_join(name + ".png")
	run(["game-preview", "--game", app.backend.game_dir, "--godot", app.backend.godot, "--shot", shot, "--shot-t", "5"] + extra, "screenshot in the game", func(r):
		FT.forget(shot)
		cb.call(shot if r.get("ok", false) else ""))

## the standard last step: it is in the game; see it (the game's --skin, --fx or --place hook), screenshot it
func in_game_step(what: String, see_args: Array, shot_name: String) -> void:
	headline("It is in the game.")
	words(what)
	var see := big("See it in the game", func(): see_in_game(see_args))
	var take := func(): screenshot_in_game(see_args, shot_name, func(p):
		if p != "":
			picture_file(p)
			app.say("Screenshot taken; it is in the project's shots folder.", 4.0))
	var shot_b := small("Take a screenshot", take)
	if args.has("autoput") and not state.get("auto_shot", false):
		state["auto_shot"] = true
		call_deferred("_auto_press", take)
	words("The game opens in its own window; close it to come back. A screenshot takes about ten seconds and shows here.", "Small")
	var home_b := W.ghost("Back to the start", func(): app.home())
	buttons([home_b])
	first_focus = see
