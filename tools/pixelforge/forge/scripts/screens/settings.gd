extends "res://scripts/screen.gd"
## Settings: the window (full screen, the window's scale), the sounds and the music with their levels, the folders
## (project, game), Blender, what this computer has (`doctor --json`), and the style preset cards with their
## animated examples in the picture window. Everything persists in the user folder (forge_settings.json).

const STYLES := ["godmarrow", "gothic_hd", "rendered_arpg", "snes", "handheld", "indie", "painterly"]
const STYLE_TITLES := {"godmarrow": "Godmarrow", "gothic_hd": "Gothic hi-res", "rendered_arpg": "Rendered ARPG", "snes": "SNES", "handheld": "Handheld", "indie": "Indie", "painterly": "Painterly"}
var report: Array = []
var checking := false
var strips := {}

func build() -> void:
	tabs = PackedStringArray(["Window", "Folders", "Style", "This computer"])
	hint_text = "Esc back · LB/RB tabs"
	strips = app.backend.read_json(ProjectSettings.globalize_path("res://assets/styles/strips.json"))
	tab_from_args()
	rebuild()
	_show_style()
	if tab == 3:
		_check()

func build_tab(i: int) -> void:
	match i:
		0: _build_window()
		1: _build_folders()
		2: _build_style()
		3: _build_computer()

func on_tab() -> void:
	if tab == 3 and report.is_empty():
		_check()
	_show_style()

func _show_style() -> void:
	var name := app.style_name
	var png := ProjectSettings.globalize_path("res://assets/styles/%s.png" % name)
	var t := tex(png)
	if t and strips.has(name):
		app.scene.show_strip(t, strips[name], "%s · the Keeper and a wisp in this look" % String(STYLE_TITLES.get(name, name)))

## --- Window
func _build_window() -> void:
	state_line("Settings · window · %s · sounds %s · music %s" % ["full screen" if app.is_fullscreen() else "a window", "on" if app.audio.sounds_on else "off", "on" if app.audio.music_on else "off"])
	var scale := int(app.cfg.get("scale", 2))
	add_cyclers([
		{"label": "screen", "value": "full" if app.is_fullscreen() else "window", "left": func(): app.toggle_fullscreen(); rebuild(), "right": func(): app.toggle_fullscreen(); rebuild()},
		{"label": "window scale", "value": "%dx" % scale, "left": func(): _set_scale(scale - 1), "right": func(): _set_scale(scale + 1)},
		{"label": "sounds", "value": "on" if app.audio.sounds_on else "off", "left": func(): app.set_sounds(false); rebuild(), "right": func(): app.set_sounds(true); rebuild()},
		{"label": "music", "value": "on" if app.audio.music_on else "off", "left": func(): app.set_music(false); rebuild(), "right": func(): app.set_music(true); rebuild()},
		{"label": "motion", "value": "reduced" if app.reduced_motion else "full", "left": func(): _set_reduced(true), "right": func(): _set_reduced(false)},
	])
	var ls := W.Lever.new()
	ls.init("sound level", app.audio.sound_volume, 0.8, func(v): return "%d%%" % int(round(v * 100)), func(v): app.audio.sound_volume = v, func(v): app.cfg["sound_volume"] = v; app.save_cfg(); app.audio.blip("confirm"))
	var lm := W.Lever.new()
	lm.init("music level", app.audio.music_volume, 0.6, func(v): return "%d%%" % int(round(v * 100)), func(v): app.audio.music_volume = v, func(v): app.cfg["music_volume"] = v; app.save_cfg())
	add_rack([ls, lm, scene_light_lever()], 8)
	add_choices([{"label": "Reset settings", "cb": _reset_all}, {"label": "Back", "cb": func(): app.back()}])

func _set_scale(k: int) -> void:
	app.cfg["scale"] = clampi(k, 1, 4)
	app.save_cfg()
	if not app.is_fullscreen():
		DisplayServer.window_set_size(Vector2i(640 * int(app.cfg["scale"]), 360 * int(app.cfg["scale"])))
	rebuild()

func _set_reduced(on: bool) -> void:
	app.reduced_motion = on
	app.scene.reduced_motion = on
	app.cfg["reduced_motion"] = on
	app.save_cfg()
	rebuild()

func _reset_all() -> void:
	confirm("Reset every setting to how the Forge came? The project and game folders are forgotten; nothing on disk changes.", func():
		var keep_last = app.cfg.get("last", {})
		app.cfg = {"last": keep_last}
		app.save_cfg()
		app.audio.sounds_on = true
		app.audio.sound_volume = 0.8
		app.audio.music_volume = 0.6
		app.set_music(true)
		app.backend.setup(app.args, app.cfg)
		app.set_style(app.backend.project_style("godmarrow"))
		rebuild())

## --- Folders
func _build_folders() -> void:
	state_line("Settings · folders · project %s · game %s · Blender %s" % [app.backend.project_name() if app.backend.project_name() != "" else "none", "found" if app.backend.game_ok() else "not found", _blender_state()])
	dim_line("The project folder holds everything the Forge makes; the game folder is where Put it in the game writes; Blender is only for the painting road.", 2)
	add_spacer()
	add_choices([
		{"label": "Choose project", "cb": func(): app.choose_dir(func(p):
			app.backend.project_dir = p
			app.cfg["project"] = p
			app.save_cfg()
			app.set_style(app.backend.project_style(app.style_name))
			app._foot_update()
			rebuild(), "Choose the project folder")},
		{"label": "Choose game", "cb": func(): app.choose_dir(func(p):
			if app.backend.is_game_folder(p):
				app.backend.game_dir = p
				app.cfg["game"] = p
				app.save_cfg()
				app.say("Game folder set.")
			else:
				app.say("That is not the game's folder (it needs the game's project.godot).")
			rebuild(), "Choose the game folder")},
		{"label": "Choose Blender", "cb": func(): app.choose_file(PackedStringArray(["*.exe, blender ; Blender"]), func(p):
			run(["project", "set", "--blender", p, "-p", app.backend.project_dir], "pointing the project at Blender", func(_r): rebuild()), "Choose the Blender executable")},
		{"label": "Download Blender", "cb": _download_blender},
		{"label": "New project folder", "cb": func(): app.backend.ensure_project(app.style_name, func(_r): app._foot_update(); rebuild())},
		{"label": "Back", "cb": func(): app.back()},
	])

func _blender_state() -> String:
	for row in report:
		if String(row.get("check", "")) == "blender":
			return "found" if bool(row.get("ok", false)) else "not found"
	return "unchecked"

func _download_blender() -> void:
	if not app.backend.project_exists():
		app.say("Make the project folder first.")
		return
	run(["project", "blender-download", "-p", app.backend.project_dir], "downloading Blender (380 MB)", func(r: Dictionary):
		app.say("Blender is ready." if r.get("ok", false) else plain_error(r), 5.0)
		report = []
		rebuild())

## --- Style: the preset cards with their animated examples
func _build_style() -> void:
	var name := app.style_name
	state_line("Settings · style · %s · one look per game: figure height, palette, outline, bands" % String(STYLE_TITLES.get(name, name)))
	var items := []
	for st in STYLES:
		items.append({"label": String(STYLE_TITLES.get(st, st)), "line": st.replace("_", " "), "on": st == name, "cb": func(): _set_style(st)})
	var cards := W.Cards.new()
	cards.font_size = T.SMALL_SIZE
	cards.setup_cards(items, 4, app)
	cards.row_h = 22
	cards.custom_minimum_size = Vector2(0, 22 * ceili(items.size() / 4.0))
	add_extra(cards)
	add_spacer()
	add_choices([{"label": "Use for the project", "cb": _apply_style}, {"label": "Back", "cb": func(): app.back()}])

func _set_style(st: String) -> void:
	app.set_style(st)
	_show_style()
	rebuild()

func _apply_style() -> void:
	if not app.backend.project_exists():
		app.backend.ensure_project(app.style_name, func(_r): app._foot_update(); app.say("Project made in %s." % app.style_name.replace("_", " ")))
		return
	run(["project", "set", "--style", app.style_name, "-p", app.backend.project_dir], "setting the project's style", func(r: Dictionary):
		if r.get("ok", false):
			app.say("The project renders in %s now." % app.style_name.replace("_", " ")))

## --- This computer: doctor --json
func _build_computer() -> void:
	state_line("Settings · this computer · %s" % ("checking" if checking else ("Python was not found: run install.bat once, or set PIXELFORGE_PYTHON" if not app.backend.python_ok() else (("%d checks" % report.size()) if not report.is_empty() else "not checked yet"))))
	var names := {"python": "Python", "numpy": "numbers", "PIL": "pictures", "tkinter": "classic window", "blender": "Blender", "animation library": "motion clips", "godot (optional)": "Godot", "bpy module (optional)": "", "project": "project", "scipy": "music"}
	var lines := []
	for row in report:
		var nm := String(names.get(String(row.get("check", "")), String(row.get("check", ""))))
		if nm == "":
			continue
		var ok := bool(row.get("ok", false))
		lines.append("%s %s%s" % ["+" if ok else "-", nm, ("" if ok else (": " + String(row.get("fix", row.get("detail", ""))).split("\n")[0]))])
	lines.append("%s game %s" % ["+" if app.backend.game_ok() else "-", "found" if app.backend.game_ok() else "not found: choose it under Folders"])
	var l := W.PxText.new()
	l.init("   ".join(PackedStringArray(lines)), T.DIM, 3, T.SMALL_SIZE)
	rows.add_child(l)
	add_spacer()
	add_choices([{"label": "Check again", "cb": _check}, {"label": "Download Blender", "cb": _download_blender}, {"label": "Back", "cb": func(): app.back()}])

func _check() -> void:
	if checking or not app.backend.python_ok():
		return
	checking = true
	var a := ["doctor"]
	if app.backend.project_exists():
		a += ["--project", app.backend.project_dir]
	run(a, "checking this computer", func(r: Dictionary):
		checking = false
		if not is_inside_tree():
			return
		report = r.get("rows", [])
		rebuild())

func keep() -> void:
	app.save_cfg()
	app.say("Settings are kept as you change them.")

func render_all() -> void:
	pass

func reset() -> void:
	_reset_all()

func start_over() -> void:
	_reset_all()

func scene_light_lever() -> Control:
	var l := W.Lever3.new()
	l.init_lever3("scene light", app.scene.light_mode, 2, PackedStringArray(["off", "sprite only", "on"]), func(s): app.scene.set_light_mode(s); app.cfg["light"] = s; app.save_cfg())
	return l

func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 10
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	return c
