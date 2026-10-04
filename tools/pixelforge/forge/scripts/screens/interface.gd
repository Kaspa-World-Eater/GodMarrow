extends "res://scripts/screen.gd"
## Interface: frames (a painted panel into a 9-slice and a StyleBox: `ui9`), icons (one flat-lay painting into
## inventory icons: `icons`), portraits (a front view into head-and-shoulders portraits: `portrait`), and the Forge's
## own pixel faces. Tabs: Frames · Icons · Portraits · Fonts.

func build() -> void:
	tabs = PackedStringArray(["Frames", "Icons", "Portraits", "Fonts"])
	hint_text = "drop a painting anywhere"
	if state.is_empty():
		state = {"image": String(args.get("painting", "")), "mid": 8, "cell": 12, "scale": 4, "names": "", "head": 0.34, "sizes": "48 96", "exported": "", "name": ""}
	tab_from_args()
	rebuild()
	if String(state["image"]) != "":
		make()
	elif tab == 3:
		_show_fonts()

func out_dir() -> String:
	return app.backend.out_dir(["ui", "items", "portraits", "fonts"][tab])

func thing_name() -> String:
	var n := String(state.get("name", ""))
	if n == "" and String(state["image"]) != "":
		n = slug(String(state["image"]).get_file().get_basename())
	return n if n != "" else ["frame", "icons", "portrait", "font"][tab]

func make(out: String = "", then: Callable = Callable()) -> void:
	var img := String(state["image"])
	if img == "" or tab == 3:
		return
	var o := out if out != "" else out_dir()
	var a: Array
	match tab:
		0:
			a = ["ui9", img, thing_name(), "-o", o, "--mid", str(int(state["mid"]))]
		1:
			a = ["icons", img, "-o", o, "--cell", str(int(state["cell"])), "--scale", str(int(state["scale"]))]
			if String(state["names"]) != "":
				a += ["--names", String(state["names"])]
		2:
			a = ["portrait", img, thing_name(), "-o", o, "--head", str(float(state["head"])), "--sizes"]
			for sz in String(state["sizes"]).split(" "):
				a.append(sz)
	run(a, ["cutting the frame", "cutting the icons", "cutting the portrait", ""][tab], func(r: Dictionary):
		if not r.get("ok", false):
			return
		_show(r)
		rebuild()
		if then.is_valid():
			then.call(r))

## what came out: the 9-slice, the icons, the portraits (the first PNG the result names)
func _show(r: Dictionary) -> void:
	var png := _first_png(r)
	state["last_png"] = png
	var t := tex(png)
	if t:
		app.scene.show_picture(t, "%s · %s" % [thing_name(), ["9-slice frame", "icons", "portrait", ""][tab]])

static func _first_png(v) -> String:
	if v is String and String(v).ends_with(".png"):
		return String(v)
	if v is Dictionary:
		for k in ["png", "texture", "file"]:
			if v.has(k) and v[k] is String and String(v[k]).ends_with(".png"):
				return String(v[k])
		for k in v:
			var p := _first_png(v[k])
			if p != "":
				return p
	if v is Array:
		for it in v:
			var p := _first_png(it)
			if p != "":
				return p
	return ""

func build_tab(i: int) -> void:
	if i == 3:
		_build_fonts()
		return
	if String(state["image"]) == "":
		state_line(["The bench is empty. Drop a painted panel or frame: the margins are found and a stretching 9-slice comes out.",
			"The bench is empty. Drop one flat-lay painting of items: each becomes an inventory icon at 4x and 1x.",
			"The bench is empty. Drop a front-view cutout: the head and shoulders become portraits at 48 and 96 px."][i], "", 2)
		add_spacer()
		add_choices([{"label": "Choose a painting", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): on_drop(PackedStringArray([p])), "Choose the painting")},
			{"label": "Describe one", "cb": func(): app.go("home")}])
		return
	match i:
		0:
			state_line("Interface · frames · %s · a 9-slice with %d px of each edge kept, and the StyleBox the game loads" % [String(state["image"]).get_file(), int(state["mid"])])
			add_spacer()
			var lm := W.Lever.new()
			lm.init("edge", (float(state["mid"]) - 2.0) / 30.0, 6.0 / 30.0, func(v): return "%d px" % int(round(2 + v * 30)), Callable(), func(v): _setv("mid", round(2 + v * 30)))
			add_rack([lm], 8)
		1:
			state_line("Interface · icons · %s · %d art px a cell, drawn at %dx and 1x · names in reading order" % [String(state["image"]).get_file(), int(state["cell"]), int(state["scale"])])
			add_spacer()
			var lc := W.Lever.new()
			lc.init("cell", (float(state["cell"]) - 8.0) / 24.0, 4.0 / 24.0, func(v): return "%d px" % int(round(8 + v * 24)), Callable(), func(v): _setv("cell", round(8 + v * 24)))
			var ls := W.Lever.new()
			ls.init("scale", (float(state["scale"]) - 1.0) / 5.0, 3.0 / 5.0, func(v): return "%dx" % int(round(1 + v * 5)), Callable(), func(v): _setv("scale", round(1 + v * 5)))
			add_rack([lc, ls], 8)
		2:
			state_line("Interface · portraits · %s · the head takes %d%% of the figure · sizes %s" % [String(state["image"]).get_file(), int(round(float(state["head"]) * 100)), String(state["sizes"])])
			add_spacer()
			var lh := W.Lever.new()
			lh.init("head", (float(state["head"]) - 0.2) / 0.4, 0.35, func(v): return "%d%%" % int(round((0.2 + v * 0.4) * 100)), Callable(), func(v): _setv("head", snappedf(0.2 + v * 0.4, 0.02)))
			add_rack([lh], 8)
	add_choices(standard_choices([{"label": "Another painting", "cb": func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): on_drop(PackedStringArray([p])), "Choose the painting")},
		{"label": "Put it in the game", "cb": _put_in_game}], false))

func _build_fonts() -> void:
	state_line("Interface · fonts · the Forge's faces: Jacquard 12 for the banner, VT323 for the text, Silkscreen for tiny marks (all OFL)", "", 2)
	add_spacer()
	add_choices(standard_choices([], false))

func _show_fonts() -> void:
	app.scene.show_text(PackedStringArray(["PixelForge  (Jacquard 12, the banner face, drawn at 2x its grid)", "The quick brown fox jumps over the lazy dog  (VT323, the text face)",
		"0123456789  Keep · Render all · Undo · Reset · Start over · Advanced", "a hooded necromancer with a skull-topped staff burning green"]), "the pixel faces")

func _setv(key: String, value: float) -> void:
	push_undo()
	state[key] = value
	make()
	rebuild()

func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var out := app.game_art(["ui", "items", "portraits", ""][tab])
	make(out, func(_r):
		state["exported"] = out
		app.remember_last("interface", {"title": thing_name(), "note": "in the game", "png": String(state.get("last_png", ""))})
		run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game reads its new files", func(_r2): rebuild()))

func keep() -> void:
	if tab == 3:
		app.say("The faces are the Forge's own; nothing to keep.")
		return
	app.remember_last("interface", {"title": thing_name(), "note": "kept", "png": String(state.get("last_png", ""))})
	app.say("Kept in the project.")

func reset() -> void:
	push_undo()
	state["mid"] = 8
	state["cell"] = 12
	state["scale"] = 4
	state["head"] = 0.34
	make()
	rebuild()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start over? What was cut from the painting is thrown away; the painting is kept."

func do_start_over() -> void:
	var img := String(state["image"])
	state = {"image": img, "mid": 8, "cell": 12, "scale": 4, "names": "", "head": 0.34, "sizes": "48 96", "exported": "", "name": ""}
	undo_stack = []
	redo_stack = []
	rebuild()
	make()

func on_state_restored() -> void:
	make()

func on_tab() -> void:
	if tab == 3:
		_show_fonts()
	elif String(state["image"]) != "":
		make()

func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	if Image.load_from_file(p) == null:
		app.say("That is not a picture the Forge can read.")
		return
	push_undo()
	state["image"] = p
	state["name"] = ""
	if tab == 3:
		tab = 0
	make()
	rebuild()
