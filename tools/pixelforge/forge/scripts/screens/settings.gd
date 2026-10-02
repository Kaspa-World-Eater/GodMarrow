extends "res://scripts/screen.gd"
## Settings: the window, the sounds, and what this computer has (Python, Blender, Godot, the game, the project).
## Paths are shown only inside "Details", when asked.

var rows: VBoxContainer
var checking := false

func build() -> void:
	set_title("Settings")
	var cols := two_columns("Plate")
	var left: PanelContainer = cols["left"]
	var right: VBoxContainer = cols["right"]
	left.custom_minimum_size = Vector2(250, 0)
	var lv := W.col(8)
	lv.add_child(W.label("How it shows", "Pixel"))
	var fs := CheckButton.new()
	fs.text = "Full screen"
	fs.button_pressed = app.is_fullscreen()
	fs.toggled.connect(func(on):
		FSfx.play("tick")
		if on != app.is_fullscreen():
			app.toggle_fullscreen())
	# the header's button and F11 change the window too: the switch follows them
	app.window_changed.connect(func(): if is_instance_valid(fs): fs.set_pressed_no_signal(app.is_fullscreen()))
	lv.add_child(fs)
	first_focus = fs
	var sd := CheckButton.new()
	sd.text = "Sounds"
	sd.button_pressed = FSfx.enabled
	sd.toggled.connect(func(on): app.set_sound(on))
	lv.add_child(sd)
	lv.add_child(W.rule())
	lv.add_child(W.label("Folders", "Pixel"))
	var pr := W.row(6)
	pr.add_child(W.label("Project: " + app.backend.project_name(), "Small"))
	pr.add_child(W.spacer())
	pr.add_child(W.ghost("Choose…", func(): app.choose_dir(func(p):
		app.backend.project_dir = p
		app.cfg["project"] = p
		app.save_cfg()
		app.say("Project folder set.")
		_refresh(), "Choose the project folder")))
	lv.add_child(pr)
	var gr := W.row(6)
	gr.add_child(W.label("Game: " + ("found" if app.backend.game_ok() else "not found"), "Small"))
	gr.add_child(W.spacer())
	gr.add_child(W.ghost("Choose…", func(): app.choose_dir(func(p):
		app.backend.game_dir = p
		app.say("Game folder set." if app.backend.game_ok() else "That is not the game's folder (it needs the game's project.godot).")
		_refresh(), "Choose the game folder (with project.godot)")))
	lv.add_child(gr)
	lv.add_child(W.rule())
	lv.add_child(W.label("The classic app", "Pixel"))
	lv.add_child(W.label("The older window with every form, for anyone who knows it.", "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	lv.add_child(W.button("Open PixelForge Studio (classic)", "", func():
		app.backend.launch(app.backend.python, PackedStringArray(["-c", Backend.BOOT, app.backend.pf_root, "studio"]))
		app.say("The classic Studio is opening in its own window.")))
	left.add_child(lv)
	right.add_child(W.label("This computer", "Pixel"))
	rows = W.col(3)
	right.add_child(rows)
	var br := W.row(6)
	br.add_child(W.button("Check again", "", _check))
	br.add_child(W.button("Download Blender for me", "Warn", _download_blender))
	right.add_child(br)
	var fold := W.fold("Details")
	fold.body.add_child(W.label("Python:  " + app.backend.python, "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	fold.body.add_child(W.label("PixelForge:  " + app.backend.pf_root, "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	fold.body.add_child(W.label("Project:  " + app.backend.project_dir, "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	fold.body.add_child(W.label("Game:  " + (app.backend.game_dir if app.backend.game_dir != "" else "—"), "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	fold.body.add_child(W.label("Godot:  " + app.backend.godot, "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
	right.add_child(fold)
	hint("Esc goes back  ·  F11 toggles the window  ·  Ctrl+L opens the log")
	_check()

func _refresh() -> void:
	clear_body()
	build()

func _row(name: String, ok: bool, detail: String, fix: String = "") -> void:
	var r := W.row(6)
	var dot := W.label("●", "Pixel")
	dot.add_theme_color_override("font_color", FT.GREEN if ok else FT.GOLD)
	r.add_child(dot)
	var l := W.label(name, "")
	l.custom_minimum_size = Vector2(96, 0)
	r.add_child(l)
	var d := W.label(detail if ok or fix == "" else fix, "Small", HORIZONTAL_ALIGNMENT_LEFT, true)
	r.add_child(d)
	rows.add_child(r)

func _check() -> void:
	if checking:
		return
	for c in rows.get_children():
		c.queue_free()
	if not app.backend.python_ok():
		_row("Python", false, "", "not found: run install.bat once")
		return
	checking = true
	_row("Python", true, "checking this computer…")
	var a := ["doctor"]
	if app.backend.project_exists():
		a += ["--project", app.backend.project_dir]
	app.backend.run(a, "doctor", Callable(), func(r: Dictionary):
		checking = false
		if not is_inside_tree():
			return
		for c in rows.get_children():
			c.queue_free()
		if not r.has("rows"):
			_row("Python", false, "", String(r.get("error", "could not check")))
			return
		var names := {"python": "Python", "numpy": "Number maths", "PIL": "Pictures", "tkinter": "Classic app window", "blender": "Blender (3D)",
			"animation library": "Moves library", "godot (optional)": "Godot", "bpy module (optional)": "", "project": "Project"}
		for x in r["rows"]:
			var nm := String(names.get(x["check"], x["check"]))
			if nm == "":
				continue
			var ok := bool(x["ok"])
			var det := String(x.get("detail", ""))
			var fix := String(x.get("fix", ""))
			if x["check"] == "blender":
				det = "found" if ok else ""
				fix = "not found. The button below downloads it (free, 380 MB)."
			elif x["check"] == "godot (optional)":
				ok = app.backend.godot != "" or not det.begins_with("not on PATH")
				det = "found" if ok else "not found"
			elif x["check"] == "tkinter":
				fix = "not here; the classic app needs it. This app does not."
				det = "present"
			elif x["check"] == "animation library":
				det = "present" if ok else ""
			elif x["check"] == "project":
				det = det
			_row(nm, ok, det, fix)
		_row("Game", app.backend.game_ok(), "found" if app.backend.game_ok() else "", "not found: choose the game folder on the left"))

func _download_blender() -> void:
	if not app.backend.python_ok():
		return
	var a := ["project", "blender-download"]
	if app.backend.project_exists():
		a += ["--project", app.backend.project_dir]
	app.say("Downloading Blender (380 MB). The log shows the progress.", 6.0)
	app.backend.run(a, "blender-download", Callable(), func(r: Dictionary):
		app.say("Blender is ready." if r.get("ok", false) else String(r.get("error", r.get("message", "The download did not finish."))), 5.0)
		if is_inside_tree():
			_check())
