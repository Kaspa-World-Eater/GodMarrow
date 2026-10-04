extends "res://scripts/screen.gd"
## Tiles and ground: a painted ground texture into iso diamonds with variants and transition tiles
## (`pixelforge tiles`, docs/track_notes/tile_rack.md). Tabs: Source · Edges · Variants · Export. The picture window
## lays the variants as a small iso patch so repetition shows, with the transition tiles in a row under it.

func build() -> void:
	tabs = PackedStringArray(["Source", "Edges", "Variants", "Export"])
	hint_text = "drop a ground painting anywhere"
	if state.is_empty():
		state = {"texture": String(args.get("painting", "")), "second": "", "name": "", "variants": 6, "seed": 1, "colors": 0, "tile_w": 0, "tile_h": 0, "exported": ""}
	tab_from_args()
	rebuild()
	if String(state["texture"]) != "":
		make()

func tiles_dir() -> String:
	return app.backend.out_dir("tiles")

func tile_name() -> String:
	var n := String(state.get("name", ""))
	if n == "" and String(state["texture"]) != "":
		n = slug(String(state["texture"]).get_file().get_basename())
	return n if n != "" else "ground"

## `tiles <texture> <name> -o ... --json`, then the patch
func make(out_dir: String = "", then: Callable = Callable()) -> void:
	if String(state["texture"]) == "":
		return
	var out := out_dir if out_dir != "" else tiles_dir()
	var a := ["tiles", String(state["texture"]), tile_name(), "-o", out, "--variants", str(int(state["variants"])), "--seed", str(int(state["seed"])), "--style", app.style_name]
	if String(state["second"]) != "":
		a += ["--second", String(state["second"])]
	if int(state["colors"]) > 0:
		a += ["--colors", str(int(state["colors"]))]
	if int(state["tile_w"]) > 0 and int(state["tile_h"]) > 0:
		a += ["--tile", str(int(state["tile_w"])), str(int(state["tile_h"]))]
	run(a, "cutting the tiles", func(r: Dictionary):
		if not r.get("ok", false):
			return
		var t := tex(String(r.get("png", "")))
		var meta := app.backend.read_json(String(r.get("json", "")))
		if t:
			state["last_png"] = String(r.get("png", ""))
			state["last_meta"] = meta
			var tile: Array = r.get("tile", [0, 0])
			app.scene.show_tiles(t, meta, "%s · %d tiles of %dx%d" % [tile_name(), int(r.get("tiles", 0)), int(tile[0]), int(tile[1])])
		rebuild()
		if then.is_valid():
			then.call(r))

func build_tab(i: int) -> void:
	if String(state["texture"]) == "":
		state_line("The bench is empty. Drop a painted ground texture (the seamless kind) here; a second one makes the transition tiles between them.", "", 2)
		add_spacer()
		add_choices([{"label": "Choose a texture", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): on_drop(PackedStringArray([p])), "Choose the ground texture")},
			{"label": "Describe one", "cb": func(): app.go("home")}])
		return
	match i:
		0: _build_source()
		1: _build_edges()
		2: _build_variants()
		3: _build_export()

func _common_levers() -> Array:
	var lv := W.Lever.new()
	lv.init("variants", (float(state["variants"]) - 1.0) / 11.0, 5.0 / 11.0, func(v): return "%d" % int(round(1 + v * 11)), Callable(), func(v): _setv("variants", round(1 + v * 11)))
	var lc := W.Lever.new()
	lc.init("colours", float(state["colors"]) / 64.0, 0.0, func(v): return "all" if int(round(v * 64)) == 0 else "%d" % int(round(v * 64)), Callable(), func(v): _setv("colors", round(v * 64)))
	var ls := W.Lever.new()
	ls.init("seed", float(state["seed"]) / 99.0, 1.0 / 99.0, func(v): return "%d" % int(round(v * 99)), Callable(), func(v): _setv("seed", maxi(int(round(v * 99)), 1)))
	return [lv, lc, ls]

func _setv(key: String, value: float) -> void:
	push_undo()
	state[key] = value
	make()
	rebuild()

func _build_source() -> void:
	state_line("Tiles · source · %s%s · the diamond is the style's (%s)" % [String(state["texture"]).get_file(), (" blended with " + String(state["second"]).get_file()) if String(state["second"]) != "" else "", app.style_name.replace("_", " ")])
	add_spacer()
	var controls := _common_levers()
	var tw := W.Lever.new()
	tw.init("tile width", float(state["tile_w"]) / 128.0, 0.0, func(v): return "style" if int(round(v * 128)) < 16 else "%d" % int(round(v * 128)), Callable(), func(v): _set_tile(round(v * 128)))
	controls.append(tw)
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Another texture", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): on_drop(PackedStringArray([p])), "Choose the ground texture")}], false))

func _set_tile(w: float) -> void:
	push_undo()
	if w < 16:
		state["tile_w"] = 0
		state["tile_h"] = 0
	else:
		var tw := int(round(w / 4.0) * 4)
		state["tile_w"] = tw
		state["tile_h"] = tw / 2
	make()
	rebuild()

func _build_edges() -> void:
	state_line("Tiles · edges · %s" % (("sixteen transition tiles between %s and %s, one per edge bitmask" % [String(state["texture"]).get_file(), String(state["second"]).get_file()]) if String(state["second"]) != "" else "no second material yet: choose one (or drop it here) for the transition tiles"), "", 2)
	add_spacer()
	add_rack(_common_levers(), 8)
	add_choices(standard_choices([{"label": "Blend with", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): push_undo(); state["second"] = p; make(); rebuild(), "Choose the second material")},
		{"label": "No blend", "cb": func(): push_undo(); state["second"] = ""; make(); rebuild()}], false))

func _build_variants() -> void:
	state_line("Tiles · variants · %d cut from the texture with seed %d; the patch shows how they repeat" % [int(state["variants"]), int(state["seed"])])
	add_spacer()
	add_rack(_common_levers(), 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}], false))

func _dice() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	_setv("seed", rng.randi_range(1, 99))

func _build_export() -> void:
	state_line("Tiles · export · %s" % ("in the game's tiles" if String(state.get("exported", "")) != "" else "Keep writes the strip, its json and the TileSet into the game's art/tiles"))
	add_spacer()
	add_choices(standard_choices([{"label": "Put it in the game", "cb": _put_in_game}], false))

func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	make(app.game_art("tiles"), func(_r):
		state["exported"] = app.game_art("tiles")
		app.remember_last("tiles", {"title": tile_name(), "note": "in the game", "png": String(state.get("last_png", "")), "meta": state.get("last_meta", {})})
		run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game reads its new files", func(_r2): rebuild()))

func keep() -> void:
	if tab == 3:
		_put_in_game()
		return
	app.remember_last("tiles", {"title": tile_name(), "note": "kept", "png": String(state.get("last_png", "")), "meta": state.get("last_meta", {})})
	app.say("Kept: the tiles are in the project's tiles folder.")

func render_all() -> void:
	make()

func reset() -> void:
	push_undo()
	state["variants"] = 6
	state["seed"] = 1
	state["colors"] = 0
	state["tile_w"] = 0
	state["tile_h"] = 0
	make()
	rebuild()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start the tiles over? The cut tiles in the project are thrown away; the paintings are kept."

func do_start_over() -> void:
	var d := tiles_dir()
	var da := DirAccess.open(d)
	if da:
		for f in da.get_files():
			DirAccess.remove_absolute(d.path_join(f))
	var t := String(state["texture"])
	state = {"texture": t, "second": "", "name": "", "variants": 6, "seed": 1, "colors": 0, "tile_w": 0, "tile_h": 0, "exported": ""}
	undo_stack = []
	redo_stack = []
	rebuild()
	make()

func on_state_restored() -> void:
	make()

func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	if Image.load_from_file(p) == null:
		app.say("That is not a picture the Forge can read.")
		return
	push_undo()
	if String(state["texture"]) == "" or tab != 1:
		state["texture"] = p
		state["name"] = ""
	else:
		state["second"] = p
	make()
	rebuild()
