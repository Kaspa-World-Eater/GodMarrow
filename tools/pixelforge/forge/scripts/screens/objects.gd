extends "res://scripts/screens/characters.gd"
## Objects: a shape model without bones (a chest, a skull, a dead tree) through the same engine, as stills with foot
## anchors. Tabs: Reference · Model · Materials · Behaviour · Export. The model lives under the project's objects
## folder; `shapes still` draws it, `shapes object` writes the game's PNGs and the objects.json entries, and
## `game-preview --place` stands it beside the hero for a look.

const OBJ_DIRS := ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]

func build() -> void:
	tabs = PackedStringArray(["Reference", "Model", "Materials", "Behaviour", "Export"])
	hint_text = "Esc back · LB/RB tabs"
	if state.is_empty():
		state = {"name": "", "title": "", "model_file": "", "painting": String(args.get("painting", "")), "direction": "S", "clip": "", "frame": 0,
			"part": "", "shape": -1, "material": "", "emissive": 0, "exported": "", "in_game": false, "shot": "", "hr": 2.0, "dirs": "S"}
	library = app.backend.read_json(app.backend.pf_root.path_join("assets/shapes/materials.json"))
	tab = 0 if state["painting"] != "" else 1
	tab_from_args()
	rebuild()
	if args.has("model"):
		import_model(String(args["model"]))
	elif args.has("painting"):
		app.scene.show_compare(tex(String(args["painting"])), null, "the reference")

func char_dir() -> String:
	return app.backend.project_dir.path_join("objects").path_join(String(state["name"]))

func model_path() -> String:
	return char_dir().path_join(String(state["name"]) + ".shapes.json")

## an object file: copied into the project's objects folder (no character, no clips), then onto the bench
func import_model(path: String) -> void:
	var d := app.backend.read_json(path)
	if d.is_empty() or not d.has("shapes"):
		app.say("That is not a shape model (.shapes.json).")
		return
	var name := slug(String(d.get("name", path.get_file().split(".")[0])))
	state["name"] = name
	state["title"] = String(d.get("name", name)).capitalize()
	app.backend.ensure_project(app.style_name, func(_r):
		if not is_inside_tree():
			return
		DirAccess.make_dir_recursive_absolute(char_dir())
		if path.simplify_path() != model_path().simplify_path():
			app.backend.copy_file(path, model_path())
		_model_loaded())

func _model_loaded() -> void:
	doc = app.backend.read_json(model_path())
	orig = app.backend.read_json(model_path())
	state["model_file"] = model_path()
	state["title"] = String(doc.get("name", state["name"])).capitalize()
	rebuild()
	refresh_preview()

## the object's standing picture: the file's own frame (its animation rules) facing the chosen direction. A request
## (see characters.gd refresh_preview): quick turns draw the last facing once, and a stale render is ignored.
func refresh_preview() -> void:
	if not has_model():
		return
	request(_render_still)

func _render_still() -> void:
	if not has_model() or not is_inside_tree():
		return
	var d := String(state["direction"])
	var fr := int(state.get("frame", 0))
	var out := previews_dir().path_join("still_%s_%d.png" % [d, fr])
	var t_ := ticket()
	run(["shapes", "still", model_path(), "-o", out, "--direction", d, "--frame", str(fr), "--style", app.style_name, "--zoom", "1"], "drawing the object", func(r: Dictionary):
		if not r.get("ok", false) or not fresh(t_) or d != String(state["direction"]) or fr != int(state.get("frame", 0)):
			return
		var t := tex(String(r.get("png", out)))
		if t == null:
			return
		var anchor: Array = r.get("anchor", [t.get_width() / 2.0, t.get_height()])
		state["last_lights"] = r.get("lights", [])
		state["last_anchor"] = anchor
		app.scene.show_still(t, Vector2(float(anchor[0]), float(anchor[1])), r.get("lights", []), "%s · %s · frame %d" % [String(state["title"]), d, fr])
		if tab == 0:
			_show_compare(t)
		, false)

func show_clip(_force_render: bool = false) -> void:
	refresh_preview()

func build_tab(i: int) -> void:
	if not has_model():
		_build_empty()
		return
	match i:
		0: _build_reference()
		1: _build_model()
		2: _build_materials()
		3: _build_behaviour()
		4: _build_export()

func on_tab() -> void:
	refresh_preview()

func _build_empty() -> void:
	state_line("The bench is empty. Drop a shape model (.shapes.json) of an object, or a reference painting, or start from an example.")
	add_spacer()
	add_choices([
		{"label": "Choose a model file", "cb": func(): app.choose_file(PackedStringArray(["*.json ; shape models"]), import_model, "Choose a shape model")},
		{"label": "Chest", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/objects/chest.shapes.json"))},
		{"label": "Skull", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/objects/skull.shapes.json"))},
		{"label": "Dead tree", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/objects/dead_tree.shapes.json"))},
		{"label": "Describe one", "cb": func(): app.go("home")},
	])

## --- Behaviour: the still's own frames, the camera, the shadow and the world scale
func _build_behaviour() -> void:
	var fr := int(state.get("frame", 0))
	state_line("%s · behaviour · frame %d · %d effects, %d lights · %s" % [String(state["title"]), fr, doc.get("effects", []).size(), doc.get("lights", []).size(),
		"the file's own rules play through the frames" if not doc.get("effects", []).is_empty() else "a still: no effects in the file"])
	add_cyclers([
		{"label": "frame", "value": str(fr), "left": func(): _set_frame(fr - 1), "right": func(): _set_frame(fr + 1)},
		{"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(OBJ_DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(OBJ_DIRS, String(state["direction"]), 1))},
	])
	var controls := []
	var le := W.Lever.new()
	le.init("camera", float(doc.get("view", {}).get("elevation", 30)) / 45.0, float(orig.get("view", {}).get("elevation", 30)) / 45.0, func(v): return "%d deg" % int(round(v * 45)), Callable(), func(v): _set_view("elevation", round(v * 45)))
	var lh := W.Lever.new()
	lh.init("world scale", (float(state.get("hr", 2.0)) - 1.0) / 3.0, 1.0 / 3.0, func(v): return T.fmt(1.0 + v * 3.0, 1) + " tx/px", Callable(), func(v): state["hr"] = snappedf(1.0 + v * 3.0, 0.5))
	var lsh := W.Pull.new()
	lsh.init_pull("shadow", doc.get("shadow") != null, orig.get("shadow") != null, func(on): _set_shadow(on))
	var lg := W.Lever.new()
	lg.init("height", clampf(float(doc.get("height", 30)) / 160.0, 0.0, 1.0), clampf(float(orig.get("height", 30)) / 160.0, 0.0, 1.0), func(v): return "%d tx" % int(round(v * 160)), Callable(), func(v): _set_height(round(v * 160)))
	controls.append_array([le, lh, lsh, lg, scene_light_lever()])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Next frame", "cb": func(): _set_frame(int(state.get("frame", 0)) + 1)}], false))

func _set_frame(f: int) -> void:
	state["frame"] = posmod(f, 8)
	refresh_preview()
	rebuild()

func _set_view(key: String, value: float) -> void:
	push_undo()
	if not doc.has("view") or not (doc["view"] is Dictionary):
		doc["view"] = {}
	doc["view"][key] = value
	save_doc()
	refresh_preview()
	rebuild()

func _set_shadow(on: bool) -> void:
	push_undo()
	if on:
		doc["shadow"] = orig.get("shadow") if orig.get("shadow") != null else {"radii": [float(doc.get("size", [40, 40])[0]) / 4.0, 4.0], "colour": "#4b4a4f"}
	else:
		doc["shadow"] = null
	save_doc()
	refresh_preview()

func _set_height(h: float) -> void:
	push_undo()
	doc["height"] = h
	save_doc()
	refresh_preview()
	rebuild()

## --- Export: the object's PNGs with foot anchors into the project, the game, and a look in the game
func _build_export() -> void:
	var exported := String(state.get("exported", ""))
	state_line("%s · export · %s" % [String(state["title"]), ("written%s" % (", in the game's objects" if state.get("in_game", false) else "")) if exported != "" else "PNGs with foot anchors per facing, plus an objects.json entry"])
	dim_line("The in-game shot is in the picture window." if (state.get("shot", "") != "" and FileAccess.file_exists(String(state["shot"]))) else "Facings: S alone for a ground object, or all eight for one the world turns.")
	add_cyclers([
		{"label": "facings", "value": String(state.get("dirs", "S")), "left": func(): _toggle_dirs(), "right": func(): _toggle_dirs()},
		{"label": "facing", "value": String(state["direction"]), "left": func(): _pick_direction(_cycle(OBJ_DIRS, String(state["direction"]), -1)), "right": func(): _pick_direction(_cycle(OBJ_DIRS, String(state["direction"]), 1))},
		{"label": "scene light", "value": ["off", "sprite only", "on"][app.scene.light_mode], "left": func(): _set_scene_light(app.scene.light_mode - 1), "right": func(): _set_scene_light(app.scene.light_mode + 1)},
	])
	add_spacer()
	add_choices(standard_choices([
		{"label": "Export PNGs", "cb": _export_sheets},
		{"label": "Put it in the game", "cb": _put_in_game},
		{"label": "See it in the game", "cb": _see_in_game},
		{"label": "Take it out", "cb": _take_out},
	], false))

func _toggle_dirs() -> void:
	state["dirs"] = "all" if String(state.get("dirs", "S")) == "S" else "S"
	rebuild()

func _dirs_arg() -> String:
	return "S,SE,E,NE,N,NW,W,SW" if String(state.get("dirs", "S")) == "all" else "S"

func _last_png() -> String:
	return previews_dir().path_join("still_%s_%d.png" % [String(state["direction"]), int(state.get("frame", 0))])

func _export_sheets(then: Callable = Callable()) -> void:
	var out := char_dir().path_join("export")
	run(["shapes", "object", model_path(), "-o", out, "--name", String(state["name"]), "--directions", _dirs_arg(), "--style", app.style_name, "--hr", str(state.get("hr", 2.0))], "writing the object", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["exported"] = out
		app.remember_last("objects", {"title": String(state["title"]), "note": "written", "png": _last_png(), "anchor": state.get("last_anchor", []), "lights": state.get("last_lights", [])})
		rebuild()
		if then.is_valid():
			then.call())

func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var objects := app.game_art("objects")
	var name := String(state["name"])
	var backup := char_dir().path_join("game_backup")
	for f in [name + ".png", name + ".json", "objects.json"]:
		if FileAccess.file_exists(objects.path_join(f)):
			app.backend.copy_file(objects.path_join(f), backup.path_join(f))
	run(["shapes", "object", model_path(), "-o", objects, "--name", name, "--directions", _dirs_arg(), "--style", app.style_name, "--hr", str(state.get("hr", 2.0)),
		"--game-objects", objects.path_join("objects.json")], "putting it in the game", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["in_game"] = true
		state["exported"] = objects
		app.remember_last("objects", {"title": String(state["title"]), "note": "in the game", "png": _last_png(), "anchor": state.get("last_anchor", []), "lights": state.get("last_lights", [])})
		run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game reads its new files", func(_r2):
			rebuild()))

func _see_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var name := String(state["name"])
	if app.args.has("script"):
		var shot := previews_dir().path_join("in_game.png")
		run(["game-preview", "--place", name, "--shot", shot, "--shot-t", "6", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game takes a look", func(r: Dictionary):
			if r.get("ok", false) and FileAccess.file_exists(shot):
				state["shot"] = shot
				app.scene.show_picture(tex(shot), "in the game")
				rebuild())
	else:
		app.backend.run(["game-preview", "--place", name, "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game opens", Callable())
		app.say("The game is opening with %s beside the hero." % String(state["title"]))

func _take_out() -> void:
	var objects := app.game_art("objects")
	var name := String(state["name"])
	var backup := char_dir().path_join("game_backup")
	var restored := 0
	for f in [name + ".png", name + ".json", "objects.json"]:
		var b := backup.path_join(f)
		if FileAccess.file_exists(b):
			app.backend.copy_file(b, objects.path_join(f))
			restored += 1
		elif f != "objects.json" and FileAccess.file_exists(objects.path_join(f)):
			DirAccess.remove_absolute(objects.path_join(f))
	state["in_game"] = false
	app.say("Taken out of the game%s." % (": the earlier files are back" if restored > 0 else ""))
	rebuild()

func keep() -> void:
	if not has_model():
		return
	save_doc()
	if tab == 4:
		_export_sheets()
	else:
		app.remember_last("objects", {"title": String(state["title"]), "note": "kept", "png": _last_png(), "anchor": state.get("last_anchor", []), "lights": state.get("last_lights", [])})
		app.say("Kept.")

## the eight facings drawn in turn (an object has no clips)
func render_all() -> void:
	if not has_model():
		return
	save_doc()
	var out := previews_dir().path_join("turn")
	run(["shapes", "object", model_path(), "-o", out, "--name", String(state["name"]), "--directions", "S,SE,E,NE,N,NW,W,SW", "--style", app.style_name], "drawing the eight facings", func(r: Dictionary):
		if r.get("ok", false):
			app.say("Eight facings drawn; the facing wheel shows each.")
			refresh_preview())

func start_over_question() -> String:
	return "Start %s over? Its previews and exports are thrown away; the model file as it was imported is kept." % String(state["title"])

func do_start_over() -> void:
	if not has_model():
		return
	for sub in ["previews", "export"]:
		var d := char_dir().path_join(sub)
		if DirAccess.dir_exists_absolute(d):
			_rm_tree(d)
	doc = orig.duplicate(true)
	save_doc()
	state["exported"] = ""
	state["in_game"] = false
	state.erase("edits"); state.erase("ramps"); state.erase("lights"); state.erase("motion")
	undo_stack = []
	redo_stack = []
	rebuild()
	refresh_preview()

func reset() -> void:
	if not has_model():
		return
	push_undo()
	match tab:
		1:
			state.erase("edits")
			_apply_edits()
		2:
			state.erase("ramps")
			state.erase("lights")
			doc["materials"] = orig.get("materials", {}).duplicate(true)
			doc["lights"] = orig.get("lights", []).duplicate(true)
			doc["effects"] = orig.get("effects", []).duplicate(true)
		3:
			doc["view"] = orig.get("view", {}).duplicate(true)
			doc["shadow"] = orig.get("shadow")
			doc["height"] = orig.get("height", 30)
			state["hr"] = 2.0
			state["frame"] = 0
	save_doc()
	rebuild()
	refresh_preview()
	app.audio.blip("clunk")

func on_state_restored() -> void:
	if not has_model():
		return
	_apply_edits()
	_apply_ramps()
	save_doc()
	refresh_preview()
