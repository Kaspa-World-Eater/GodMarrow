extends "res://scripts/screen.gd"
## Home: the narrative line, the nine choices with the selector, the describe line. The picture window shows the
## last thing made, standing in the chosen ground. A painting or a model file dropped anywhere opens the matching
## workbench with it.

const CHOICES := [
	["Characters", "characters"], ["Creatures", "creatures"], ["Objects", "objects"],
	["Effects", "effects"], ["Tiles and ground", "tiles"], ["Interface", "interface"],
	["Sound", "sound"], ["Music", "music"], ["Settings", "settings"],
]
var reading := false
var job_i := 0                  # which job the Jobs panel shows when there are several (newest first)
var jobs_text: Control = null   # the panel's two small lines, updated in place while a job runs
var doctor_lines: PackedStringArray = []   # `claude doctor`'s lines: one a check, shown in the picture window after Doctor
var doctor_sentence := ""                   # its last line: works end to end, or the first failed step and its fix (the state line)
var doctor_ok := false
var doctoring := false

func build() -> void:
	hint_text = "drop a painting anywhere"
	rebuild()
	_show_last()
	# the project's jobs (a Forge reopened shows the ones it can resume)
	app.refresh_jobs(func(): if is_inside_tree(): rebuild())

func build_tab(_i: int) -> void:
	var last: Dictionary = app.cfg.get("last", {})
	var line := "The forge is lit."
	if doctoring or doctor_sentence != "":
		pass
	elif last.has("info"):
		var info: Dictionary = last["info"]
		line = "The forge is lit. On the bench: %s, %s." % [String(info.get("title", "the last thing made")), String(info.get("note", "finished")).to_lower()]
	elif not app.backend.python_ok():
		line = "The forge is lit, but Python was not found: run install.bat once, or set it in Settings."
	else:
		line = "The forge is lit. The bench is clear: pick what to make, drop a painting, or describe it below."
	var jobs := _jobs()
	if not (doctoring or doctor_sentence != ""):
		state_line(line, "", 1 if not jobs.is_empty() else 2)
	add_spacer()
	var items := []
	for c in CHOICES:
		items.append({"label": c[0], "cb": app.go.bind(c[1])})
	add_choices(items, 3)
	var bottom := [
		{"label": "Detail bench", "cb": _open_detail, "hint": "Detail bench · paint the detail that rides a part of the last model on the bench (or the Keeper)"},
		{"label": "Build", "cb": _build, "hint": "Build · the last character on the bench to the game in one go: every clip in eight views with the detail and the light, the atlas, skins.json, the height check"},
		{"label": "Doctor", "cb": _doctor}, {"label": "Exit", "cb": func(): app.request_exit()}]
	jobs_text = null
	if doctoring:
		state_line("Checking Claude on the bench: the executable, the sign-in, the registration, the MCP server, one real round trip. The checks land in the picture window.", "", 2)
	elif doctor_sentence != "":
		state_line("Doctor: " + doctor_sentence, "" if doctor_ok else "Gold", 2)
	if not jobs.is_empty():
		job_i = clampi(job_i, 0, jobs.size() - 1)
		var j: Dictionary = jobs[job_i]
		var l := W.PxText.new()
		l.init(_jobs_lines(), T.DIM, 2, T.SMALL_SIZE)
		rows.add_child(l)
		jobs_text = l
		var st := String(j.get("state", ""))
		if jobs.size() > 1:
			bottom.append({"label": "job", "value": "%d of %d" % [job_i + 1, jobs.size()], "left": func(): job_i = posmod(job_i - 1, jobs.size()); rebuild(),
				"right": func(): job_i = posmod(job_i + 1, jobs.size()); rebuild()})
		if st == "waiting":
			bottom.append({"label": "Approve", "cb": func(): _approve(j)})
		if st in ["interrupted", "failed", "planned"]:
			bottom.append({"label": "Resume", "cb": func(): app.resume_job(String(j["id"])); rebuild()})
		if st in ["running", "waiting", "interrupted", "planned"]:
			bottom.append({"label": "Cancel", "cb": func(): app.cancel_job(String(j["id"])); rebuild()})
		if String(j.get("report_json", "")) != "" or st in ["done", "failed", "cancelled"]:
			bottom.append({"label": "Report", "cb": func(): _report(j)})
	add_choices(bottom)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	row.custom_minimum_size = Vector2(0, 18)
	var l := Label.new()
	l.text = "or describe it:"
	l.theme_type_variation = "Dim"
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(l)
	describe = LineEdit.new()
	describe.placeholder_text = "a hooded necromancer with a skull-topped staff burning green"
	describe.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	describe.text_submitted.connect(func(_t): _describe())
	describe.focus_entered.connect(func(): app.say_hint("Enter opens the workbench for it; Esc leaves the line"))
	describe.focus_exited.connect(func(): app.set_hint(hint_text))
	row.add_child(describe)
	rows.add_child(row)
	if args.has("doctor") and not doctoring and doctor_lines.is_empty():
		call_deferred("_doctor")
	if args.has("describe"):
		describe.text = String(args["describe"])
		if args.has("go"):
			call_deferred("_describe")

func on_key(ev: InputEvent) -> bool:
	# the describe line takes typing when it has the focus; Esc hands the keys back
	if describe and describe.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			describe.release_focus()
			return true
		return false
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_SLASH:
		describe.grab_focus()
		return true
	return false

## the last thing made, on the bench
func _show_last() -> void:
	var last: Dictionary = app.cfg.get("last", {})
	var info: Dictionary = last.get("info", {})
	var kind := String(last.get("kind", ""))
	if kind in ["characters", "creatures", "objects"] and info.has("frames_dir") and DirAccess.dir_exists_absolute(String(info["frames_dir"])):
		var texs := frame_textures(String(info["frames_dir"]))
		if not texs.is_empty():
			app.scene.show_frames(texs, float(info.get("fps", 12.0)), float(info.get("ground_y", texs[0].get_height())), float(info.get("axis_x", texs[0].get_width() / 2.0)), info.get("lights", []))
			return
	if info.has("png") and FileAccess.file_exists(String(info["png"])):
		var t := tex(String(info["png"]))
		if t:
			if kind in ["effects"] and info.has("meta"):
				app.scene.show_strip(t, info["meta"])
			elif kind in ["characters", "creatures", "objects"]:
				var anchor: Array = info.get("anchor", [t.get_width() / 2.0, t.get_height()])
				app.scene.show_still(t, Vector2(float(anchor[0]), float(anchor[1])), info.get("lights", []))
			elif kind == "tiles" and info.has("meta"):
				app.scene.show_tiles(t, info["meta"])
			else:
				app.scene.show_picture(t)
			return
	# nothing yet: the bench stands empty in the chosen ground

## long check lines folded at a width so they fit the picture window
static func _wrapped(lines: PackedStringArray, width: int) -> PackedStringArray:
	var out: PackedStringArray = []
	for l in lines:
		var cur := ""
		for w in String(l).split(" "):
			if cur != "" and cur.length() + 1 + w.length() > width:
				out.append(cur)
				cur = "      " + w
			else:
				cur = w if cur == "" else cur + " " + w
		if cur != "":
			out.append(cur)
	return out

## Doctor: `claude doctor --json`, six checks in order with the fix for the one that fails; the lines stay on the bench
func _doctor() -> void:
	if doctoring:
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	doctoring = true
	doctor_lines = []
	doctor_sentence = ""
	rebuild()
	app.scene.show_text(PackedStringArray(["Checking Claude on the bench..."]), "the doctor")
	app.set_hint("the doctor checks Claude on the bench; the round trip takes a few seconds")
	app.backend.run(["claude", "doctor", "--json"], "claude doctor", func(r: Dictionary):
		doctoring = false
		if not is_inside_tree():
			return
		doctor_lines = []
		for l in r.get("lines", []):
			# one row a check: the mock's path and a long fix are cut so the rows stay on the bench (the terminal has them whole)
			var line := String(l).replace(" (" + String(r.get("mock_script", "")) + ")", "")
			if line.length() > 112:
				line = line.substr(0, 109) + "..."
			doctor_lines.append(line)
		if doctor_lines.is_empty():
			doctor_lines = PackedStringArray(["The doctor could not run: " + String(r.get("error", "no answer")) + ". Run `pixelforge claude doctor` in a terminal."])
		doctor_sentence = String(r.get("sentence", "The doctor is done."))
		doctor_ok = bool(r.get("ok", false))
		app.scene.show_text(_wrapped(doctor_lines, 84), "Claude on the bench: the doctor's six checks")
		app.say(doctor_sentence, 6.0)
		app._claude_status()
		rebuild())

## the classifier: say what you want, the right workbench opens with a draft
func _describe() -> void:
	var text := describe.text.strip_edges()
	if text == "" or reading:
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	reading = true
	describe.editable = false
	app.set_hint("reading it")
	app.backend.run(["describe", text], "describe", func(r: Dictionary):
		reading = false
		if not is_inside_tree():
			return
		describe.editable = true
		app.set_hint(hint_text)
		_described(r, text))

func _described(r: Dictionary, text: String) -> void:
	if not r.get("ok", true) and not r.has("what"):
		app.say(String(r.get("error", "Could not read that.")))
		return
	# a sentence that spans two or more benches is a job: Claude writes the plan, the runner carries it out while Home watches
	var benches: Array = r.get("benches", [])
	if benches.size() >= 2:
		var st: Dictionary = app.claude_state
		if not st.is_empty() and not st.get("ok", false):
			app.say(String(st.get("sentence", "Claude Code is not ready.")))
			return
		app.start_job(text)
		describe.text = ""
		app.say("A job across %d benches: Claude writes the plan." % benches.size(), 4.0)
		rebuild()
		return
	var what := String(r.get("what", "spell"))
	var a := {"describe": text, "draft": r}
	var screen := "effects"
	match what:
		"spell":
			screen = "effects"
		"skin":
			screen = "characters"
		"music":
			screen = "music"
		"shapes":
			screen = "characters"
		"prompt":
			screen = _prompt_screen(r, a)
	app.go(screen, a)

## a painting prompt opens the workbench that will take the painting: a character-sheet prompt goes to Characters
## (the drafter makes a starter model from the words); a world prompt to its kind
static func _prompt_screen(r: Dictionary, a: Dictionary) -> String:
	var kind := ""
	var reads: Array = r.get("read", [])
	if not reads.is_empty():
		var first := String(reads[0])
		if first.begins_with("world prompt, kind "):
			kind = first.trim_prefix("world prompt, kind ").split(":")[0].strip_edges()
	if kind == "" and r.has("kinds"):
		kind = "object"
	a["prompt_kind"] = kind
	match kind:
		"object", "building", "tree", "topdown":
			return "objects"
		"ground":
			return "tiles"
		"ui", "icons", "portrait":
			a["tab"] = {"ui": "Frames", "icons": "Icons", "portrait": "Portraits"}[kind]
			return "interface"
		"missile", "spell_frames", "effect":
			return "effects"
	return "characters"

# ------------------------------------------------------------------ the Detail bench and Build (tools/pixelforge/docs/FROM_THE_GAME.md 3.1, 3.4)
func _last_character() -> Dictionary:
	var lc = app.cfg.get("last_character", {})
	return lc if lc is Dictionary else {}

func _open_detail() -> void:
	var lc := _last_character()
	var model := String(lc.get("model", ""))
	if model != "" and FileAccess.file_exists(model):
		app.go("detail", {"model": model})
	else:
		app.go("detail", {})

## `project build <character>`: the result's lines in the picture window; a warning stays on the state line (no pop-up)
func _build() -> void:
	var lc := _last_character()
	var name := String(lc.get("name", ""))
	if name == "":
		app.say("Open a character on the Characters bench first; Build takes the last one.")
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	var cmd := ["project", "build", name, "-p", app.backend.project_dir]
	if app.backend.game_ok():
		cmd += ["--game", app.backend.game_dir]
	run(cmd, "building %s for the game" % name, func(r: Dictionary):
		if not r.get("ok", false):
			return
		var lines := PackedStringArray(["%s built" % name])
		for l in r.get("lines", []):
			lines.append(String(l))
		app.scene.show_text(lines, "build")
		var warnings: Array = r.get("warnings", [])
		if not warnings.is_empty():
			app.say(String(warnings[0]), 8.0)
		app.remember_last("characters", {"title": name.capitalize(), "note": "built for the game", "png": "", "lines": r.get("lines", [])}))

# ------------------------------------------------------------------ the Jobs panel
## the jobs to show: the ones running under this Forge first (live), then the project's list from disk (job list --json)
func _jobs() -> Array:
	var out := []
	var seen := {}
	for rec in app.job_runs:
		var id := String(rec.get("id", ""))
		var row := {"id": id, "title": rec["title"], "state": "running", "done": rec["done"], "total": rec["total"], "last": rec["last"], "waiting": "", "bench": "", "report_json": ""}
		for j in app.jobs_list:
			if String(j.get("id", "")) == id and id != "":
				row["bench"] = j.get("bench", "")
				row["report_json"] = j.get("report_json", "")
				row["title"] = j.get("title", rec["title"])
		out.append(row)
		if id != "":
			seen[id] = true
	for j in app.jobs_list:
		if not seen.has(String(j.get("id", ""))):
			out.append(j)
	return out

static func state_words(j: Dictionary) -> String:
	match String(j.get("state", "")):
		"running":
			return "running"
		"waiting":
			return "waiting for approval"
		"done":
			return "done"
		"failed":
			return "done, with a step that could not be done"
		"cancelled":
			return "stopped"
		"interrupted":
			return "interrupted"
		"planned":
			return "not started"
	return String(j.get("state", ""))

## two small lines: the job and its state with the step count; then what it is doing, waits for, or made
func _jobs_lines() -> String:
	var jobs := _jobs()
	if jobs.is_empty():
		return ""
	job_i = clampi(job_i, 0, jobs.size() - 1)
	var j: Dictionary = jobs[job_i]
	var total := int(j.get("total", 0))
	var head := "job · %s · %s" % [state_words(j), String(j.get("title", ""))]
	if total > 0:
		head += " · step %d of %d" % [mini(int(j.get("done", 0)) + (1 if String(j.get("state", "")) == "running" else 0), total), total]
	if jobs.size() > 1:
		head = "%d jobs · " % jobs.size() + head.trim_prefix("job · ")
	var second := ""
	match String(j.get("state", "")):
		"running":
			second = String(j.get("last", "working"))
		"waiting":
			second = "next: %s · Approve runs it, Cancel stops the job" % String(j.get("waiting", ""))
		"done":
			second = "%d made · Report shows it on the %s bench" % [int(j.get("made", int(j.get("done", 0)))), String(j.get("bench", "")).replace("_", " ")]
		"failed":
			second = "%d made, %d could not · Report says why · Resume tries again" % [int(j.get("made", 0)), int(j.get("could_not", 0))]
		"interrupted":
			second = "the Forge closed while it ran · Resume carries on from the last finished step"
		"cancelled":
			second = "%d made before it stopped · Report shows them" % int(j.get("made", 0))
		_:
			second = String(j.get("last", ""))
	return head + "\n" + second

## a job's progress line changed (app.job_runs): the panel's words, in place
func on_job_progress() -> void:
	if jobs_text and is_instance_valid(jobs_text):
		jobs_text.set_text(_jobs_lines())
	elif not app.job_runs.is_empty():
		rebuild()

## a job finished, waits, or stopped: the panel and its choices again
func on_job_done(_r: Dictionary) -> void:
	if is_inside_tree():
		rebuild()

func _approve(j: Dictionary) -> void:
	var id := String(j.get("id", ""))
	if id == "":
		return
	app.approve_job(id)
	app.say("Approved: %s" % String(j.get("waiting", "the step")), 3.0)
	rebuild()

## the report opens on the bench it concerns, with its pictures in the window
func _report(j: Dictionary) -> void:
	var path := String(j.get("report_json", ""))
	if path == "":
		app.say("No report yet.")
		return
	var bench := String(j.get("bench", ""))
	if not bench in ["characters", "creatures", "objects", "effects", "tiles", "interface", "sound", "music"]:
		bench = "effects"
	app.go(bench, {"job_report": path})

func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	if p.ends_with(".shapes.json") or p.ends_with(".json"):
		app.go("characters", {"model": p})
		return
	# a picture is a character's reference: the Characters bench places it as it is and Claude draws the model against it
	# (the author loop; the automatic draft from a picture is a retired road)
	var pics: PackedStringArray = []
	for q in paths:
		if q.get_extension().to_lower() in ["png", "jpg", "jpeg", "webp", "bmp", "gif"]:
			pics.append(q)
	if pics.is_empty():
		app.say("That is not a picture the Forge can read (PNG, JPG or WEBP).")
		return
	app.go("characters", {"pictures": pics})
