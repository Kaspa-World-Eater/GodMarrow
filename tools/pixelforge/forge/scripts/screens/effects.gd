extends "res://scripts/screen.gd"
## Effects: the effects engine (`pixelforge effects`) as an instrument. A saved effect is a graph with two or three
## levers; the rack shows exactly those. Tabs: Effect (the levers) · Layers (effects stacked on one canvas) · Looks
## (ramp bands and palette) · Pick (the library by family, each playing in the picture window as it is chosen) ·
## Export. Advanced shows the graph's node chain under the fine sliders. Every control is a flag of the same command
## an assistant runs (`effects render NAME --lever k=v`, `effects graph FILE`); the picture window plays the strip.

const BLENDS := ["normal", "add", "screen", "lighten", "multiply", "behind"]
const FALLBACK_FAMILIES := ["fire", "spark", "blood", "weather", "water", "magic", "bone", "soul", "weird"]

static var table := {}      # from `effects list --json`: families, effects (name, family, doc, levers, nodes...), palettes, nodes
var by_name := {}           # effect name -> its row of the table

func build() -> void:
	tabs = PackedStringArray(["Effect", "Layers", "Looks", "Pick", "Export"])
	hint_text = "Esc back · LB/RB tabs"
	if state.is_empty():
		state = {"effect": "flame", "levers": {}, "palette": "", "bands": 0, "seed": 1, "frames": 0, "fps": 0.0, "family": "fire",
			"layers": [], "layer": 0, "name": "", "exported": ""}
	if args.has("effect"):
		state["effect"] = String(args["effect"])
	if args.has("palette"):
		state["palette"] = String(args["palette"])
	if args.has("draft") and args["draft"] is Dictionary and String(args["draft"].get("what", "")) == "spell":
		_take_draft(args["draft"])
	tab_from_args()
	_index()
	rebuild()
	if table.is_empty():
		_load_table()
	else:
		preview()

## the library table once per app run (the names, families, levers and node chains the tabs show)
func _load_table() -> void:
	if not app.backend.python_ok():
		return
	run(["effects", "list", "--json"], "reading the effects library", func(r: Dictionary):
		if r.get("ok", false):
			table = r
			_index()
			rebuild()
			preview(), false)

func _index() -> void:
	by_name = {}
	for e in table.get("effects", []):
		by_name[String(e["name"])] = e

func families() -> Array:
	var f: Array = table.get("families", FALLBACK_FAMILIES)
	return f if not f.is_empty() else FALLBACK_FAMILIES

func names(family: String = "all") -> Array:
	var out := []
	for e in table.get("effects", []):
		if family == "all" or String(e["family"]) == family:
			out.append(String(e["name"]))
	return out if not out.is_empty() else [String(state["effect"])]

func row() -> Dictionary:
	return by_name.get(String(state["effect"]), {})

## Describe-it's spell draft: its layers (old kinds or effect names) become the Layers tab's stack
func _take_draft(d: Dictionary) -> void:
	if d.has("spell") and d["spell"] is Dictionary:
		var sp: Dictionary = d["spell"]
		state["name"] = String(sp.get("name", "spell"))
		var layers := []
		for L in sp.get("layers", []):
			layers.append({"effect": String(L.get("kind", "flame")), "palette": String(L.get("palette", "")), "scale": float(L.get("scale", 1.0)),
				"x": float(L.get("x", 0)), "y": float(L.get("y", 0)), "start": int(L.get("start", 0)), "opacity": float(L.get("opacity", 1.0)),
				"blend": "add" if String(L.get("blend", "normal")) == "add" else "normal", "seed": int(L.get("seed", 1)), "levers": {}})
		state["layers"] = layers
		state["layer"] = 0
		tab = 1
		var reads: Array = d.get("read", [])
		if not reads.is_empty():
			app.say("Read: " + ", ".join(PackedStringArray(reads)), 6.0)

func fx_dir() -> String:
	return app.backend.out_dir("fx")

func effect_name() -> String:
	var n := String(state.get("name", ""))
	return n if n != "" else String(state["effect"])

# ------------------------------------------------------------------ rendering
## the arguments of `effects render` for the current effect: its levers, seed, timing, palette, bands
func render_args(out: String) -> Array:
	var a := ["effects", "render", String(state["effect"]), "-o", out, "--as", effect_name(), "--seed", str(int(state["seed"]))]
	var levers: Dictionary = state.get("levers", {})
	for k in levers:
		a += ["--lever", "%s=%s" % [k, T.fmt(float(levers[k]), 3)]]
	if String(state["palette"]) != "":
		a += ["--palette", String(state["palette"])]
	if int(state.get("bands", 0)) > 0:
		a += ["--bands", str(int(state["bands"]))]
	if int(state.get("frames", 0)) > 0:
		a += ["--frames", str(int(state["frames"]))]
	if float(state.get("fps", 0.0)) > 0.0:
		a += ["--fps", str(float(state["fps"]))]
	return a

## the Layers tab's stack as a graph file: one `effect` node per layer, stacked by `layers`
func layers_graph() -> Dictionary:
	var nodes := []
	var images := []
	var blends := []
	var opacities := []
	var i := 0
	for L in state.get("layers", []):
		var id := "l%d" % i
		var n := {"id": id, "op": "effect", "name": String(L.get("effect", "flame")), "levers": L.get("levers", {}), "dx": float(L.get("x", 0)), "dy": float(L.get("y", 0)),
			"scale": float(L.get("scale", 1.0)), "start": int(L.get("start", 0)), "seed": int(L.get("seed", 1))}
		if String(L.get("palette", "")) != "":
			n["palette"] = String(L["palette"])
		nodes.append(n)
		images.append("@" + id)
		blends.append(String(L.get("blend", "normal")))
		opacities.append(float(L.get("opacity", 1.0)))
		i += 1
	nodes.append({"id": "final", "op": "layers", "images": images, "blends": blends, "opacities": opacities})
	return {"size": [96, 72], "frames": 12, "fps": 12.0, "loop": true, "seed": int(state["seed"]), "anchor": [48, 68], "levers": {}, "nodes": nodes, "out": "@final"}

func preview() -> void:
	if not app.backend.python_ok() or table.is_empty():
		return
	request(func():
		var t := ticket()
		if tab == 1 and not (state.get("layers", []) as Array).is_empty():
			_preview_layers(t)
			return
		run(render_args(fx_dir()), "drawing the effect", func(r: Dictionary):
			if r.get("ok", false) and fresh(t):
				_show(String(r.get("png", "")), String(r.get("json", "")))
			, false))

func _preview_layers(t: int) -> void:
	var path := fx_dir().path_join(effect_name() + ".graph.json")
	app.backend.write_json(path, layers_graph())
	run(["effects", "graph", path, "-o", fx_dir(), "--as", effect_name()], "drawing the layers", func(r: Dictionary):
		if r.get("ok", false) and fresh(t):
			_show(String(r.get("png", "")), String(r.get("json", "")))
		, false)

func _show(png: String, meta_file: String) -> void:
	var t := tex(png)
	if t == null:
		return
	var meta := app.backend.read_json(meta_file)
	state["last_png"] = png
	state["last_meta"] = meta
	var pal := String(state["palette"])
	app.scene.show_strip(t, meta, "%s · %s · %d frames at %s a second · %d colours" % [String(meta.get("name", effect_name())), pal if pal != "" else "its own palette",
		int(meta.get("frames", 0)), T.fmt(float(meta.get("fps", 0)), 1), (meta.get("palette", []) as Array).size()])

# ------------------------------------------------------------------ the tabs
func build_tab(i: int) -> void:
	if table.is_empty():
		state_line("Effects · the library is loading")
		add_spacer()
		add_choices(standard_choices([], false))
		return
	match i:
		0: _build_effect()
		1: _build_layers()
		2: _build_looks()
		3: _build_pick()
		4: _build_export()

func on_tab() -> void:
	preview()

func _setv(key: String, value) -> void:
	push_undo()
	state[key] = value
	preview()
	rebuild()

func _set_lever(key: String, value: float) -> void:
	push_undo()
	var levers: Dictionary = state.get("levers", {})
	levers[key] = value
	state["levers"] = levers
	preview()
	rebuild()

func _set_effect(name: String) -> void:
	push_undo()
	state["effect"] = name
	state["levers"] = {}
	state["name"] = ""
	preview()
	rebuild()

## the effect's own levers as a rack of Levers: default, min and max from the library; the typed number lands in its range
func lever_controls() -> Array:
	var out := []
	var e := row()
	var levers: Dictionary = e.get("levers", {})
	var current: Dictionary = state.get("levers", {})
	for k in levers:
		var spec: Dictionary = levers[k]
		var lo := float(spec.get("min", 0.0))
		var hi := float(spec.get("max", 1.0))
		var def := float(spec.get("default", lo))
		var v := float(current.get(k, def))
		var l := W.Lever.new()
		var span := maxf(hi - lo, 1e-6)
		l.init(String(spec.get("label", k)), clampf((v - lo) / span, 0.0, 1.0), clampf((def - lo) / span, 0.0, 1.0),
			func(u): return T.fmt(lo + u * span, 2), Callable(), func(u): _set_lever(k, snappedf(lo + u * span, 0.01)))
		out.append(l)
	return out

func _timing_controls() -> Array:
	var e := row()
	var fr := int(state.get("frames", 0))
	var def_fr := int(e.get("frames", 8))
	var fps := float(state.get("fps", 0.0))
	var def_fps := float(e.get("fps", 12.0))
	var lf := W.Lever.new()
	lf.init("frames", ((fr if fr > 0 else def_fr) - 4.0) / 28.0, (def_fr - 4.0) / 28.0, func(v): return "%d" % int(round(4 + v * 28)), Callable(), func(v): _setv("frames", int(round(4 + v * 28))))
	var lp := W.Lever.new()
	lp.init("fps", ((fps if fps > 0.0 else def_fps) - 4.0) / 20.0, (def_fps - 4.0) / 20.0, func(v): return "%d fps" % int(round(4 + v * 20)), Callable(), func(v): _setv("fps", float(round(4 + v * 20))))
	return [lf, lp]

## the Advanced fold: the seed exact and the ramp bands
func advanced_extra() -> Array:
	if tab in [1, 3, 4]:
		return []
	return [
		fine_slider("seed exact", float(state["seed"]), 1.0, 999.0, 1.0, 0, func(v): _setv("seed", int(round(v)))),
		fine_slider("bands", float(state.get("bands", 0)), 0.0, 12.0, 0.0, 0, func(v): _setv("bands", int(round(v))), func(v): return "the ramp's" if int(v) == 0 else "%d" % int(v)),
	]

func chain_text() -> String:
	var e := row()
	var ops: Array = e.get("nodes", [])
	return "chain: " + " > ".join(PackedStringArray(ops)) if not ops.is_empty() else ""

func _dice() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	_setv("seed", rng.randi_range(1, 999))

## --- Effect: the saved effect's levers
func _build_effect() -> void:
	var e := row()
	var name := String(state["effect"])
	state_line("Effects · %s (%s) · seed %d · %s" % [name, String(e.get("family", "")), int(state["seed"]), String(e.get("doc", ""))], "", 2)
	var list := names(String(state["family"]))
	add_cyclers([
		{"label": "effect", "value": name, "left": func(): _set_effect(_cycle(list, name, -1)), "right": func(): _set_effect(_cycle(list, name, 1))},
		{"label": "seed", "value": str(int(state["seed"])), "left": func(): _setv("seed", maxi(int(state["seed"]) - 1, 1)), "right": func(): _setv("seed", int(state["seed"]) + 1), "set": func(t): _setv("seed", maxi(int(t), 1))},
	])
	if advanced_open:
		dim_line(chain_text())
	var controls := lever_controls() + _timing_controls()
	controls.append(scene_light_lever())
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}, {"label": "Pick effect", "cb": func(): set_tab(3)}], false))

## --- Layers: effects stacked on one canvas, each a card with its own place, scale, start, blend
func _build_layers() -> void:
	var layers: Array = state.get("layers", [])
	if layers.is_empty():
		state_line("Effects · layers · stack effects on one canvas: a flame under sparks under smoke. Add the effect on the bench to start.", "", 2)
		add_spacer()
		add_choices(standard_choices([{"label": "Add layer", "cb": _add_layer}], false))
		return
	var li := clampi(int(state["layer"]), 0, layers.size() - 1)
	state["layer"] = li
	var L: Dictionary = layers[li]
	var eff := String(L.get("effect", ""))
	state_line("Effects · layers · %s · layer %d of %d: %s · %s" % [effect_name(), li + 1, layers.size(), eff, String(L.get("blend", "normal"))])
	var all := names()
	add_cyclers([
		{"label": "layer", "value": str(li + 1), "left": func(): state["layer"] = posmod(li - 1, layers.size()); rebuild(), "right": func(): state["layer"] = posmod(li + 1, layers.size()); rebuild()},
		{"label": "effect", "value": eff, "left": func(): _set_layer("effect", _cycle(all, eff, -1)), "right": func(): _set_layer("effect", _cycle(all, eff, 1))},
		{"label": "blend", "value": String(L.get("blend", "normal")), "left": func(): _set_layer("blend", _cycle(BLENDS, String(L.get("blend", "normal")), -1)), "right": func(): _set_layer("blend", _cycle(BLENDS, String(L.get("blend", "normal")), 1))},
	])
	var controls := []
	var lsc := W.Lever.new()
	lsc.init("scale", (float(L.get("scale", 1.0)) - 0.25) / 2.75, 0.75 / 2.75, func(v): return "x" + T.fmt(0.25 + v * 2.75, 2), Callable(), func(v): _set_layer("scale", snappedf(0.25 + v * 2.75, 0.05)))
	var lx := W.Lever.new()
	lx.init("x", (float(L.get("x", 0)) + 40.0) / 80.0, 0.5, func(v): return "%+d" % int(round(v * 80 - 40)), Callable(), func(v): _set_layer("x", round(v * 80 - 40)))
	var ly := W.Lever.new()
	ly.init("y", (float(L.get("y", 0)) + 40.0) / 80.0, 0.5, func(v): return "%+d" % int(round(v * 80 - 40)), Callable(), func(v): _set_layer("y", round(v * 80 - 40)))
	var lst := W.Lever.new()
	lst.init("start", float(L.get("start", 0)) / 12.0, 0.0, func(v): return "%d fr" % int(round(v * 12)), Callable(), func(v): _set_layer("start", int(round(v * 12))))
	var lop := W.Lever.new()
	lop.init("opacity", float(L.get("opacity", 1.0)), 1.0, func(v): return T.fmt(v, 2), Callable(), func(v): _set_layer("opacity", snappedf(v, 0.05)))
	var lsd := W.Lever.new()
	lsd.init("seed", float(L.get("seed", 1)) / 99.0, 1.0 / 99.0, func(v): return "%d" % int(round(v * 99)), Callable(), func(v): _set_layer("seed", maxi(int(round(v * 99)), 1)))
	controls.append_array([lsc, lx, ly, lst, lop, lsd])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Add layer", "cb": _add_layer}, {"label": "Remove layer", "cb": _remove_layer}, {"label": "Dice", "cb": _dice_layers}], false))

func _set_layer(key: String, value) -> void:
	var layers: Array = state.get("layers", [])
	var li := int(state["layer"])
	if li < 0 or li >= layers.size():
		return
	push_undo()
	layers[li][key] = value
	preview()
	rebuild()

func _add_layer() -> void:
	push_undo()
	var layers: Array = state.get("layers", [])
	layers.append({"effect": String(state["effect"]), "palette": String(state["palette"]), "levers": (state.get("levers", {}) as Dictionary).duplicate(), "scale": 1.0, "x": 0.0, "y": 0.0,
		"start": 0, "opacity": 1.0, "blend": "normal" if layers.is_empty() else "add", "seed": layers.size() + 1})
	state["layers"] = layers
	state["layer"] = layers.size() - 1
	if state["name"] == "":
		state["name"] = "stack"
	preview()
	rebuild()

func _remove_layer() -> void:
	var layers: Array = state.get("layers", [])
	if layers.is_empty():
		return
	push_undo()
	layers.remove_at(int(state["layer"]))
	state["layer"] = 0
	preview()
	rebuild()

func _dice_layers() -> void:
	push_undo()
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for L in state.get("layers", []):
		L["seed"] = rng.randi_range(1, 99)
	preview()
	app.say("New seeds for every layer; Undo takes them back.")

## --- Looks: the palette swatches and the ramp's bands
func _build_looks() -> void:
	var pal := String(state["palette"])
	var bands := int(state.get("bands", 0))
	state_line("Effects · looks · %s · %s · every colour on the sheet is a step of the ramp and nothing else" % ["its own palette" if pal == "" else pal + " palette", "the ramp's bands" if bands == 0 else "%d bands" % bands], "", 2)
	var items := [{"label": ("* " if pal == "" else "") + "its own", "cb": func(): _setv("palette", "")}]
	for p in table.get("palettes", []):
		var pn := String(p)
		items.append({"label": ("* " if pn == pal else "") + pn, "cb": func(): _setv("palette", pn)})
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 6
	c.wrap_width = App.TEXTBOX.size.x - 16
	c.setup(items, 1, app)
	c.row_h = 13
	add_extra(c)
	var lb := W.Lever.new()
	lb.init("bands", float(bands) / 12.0, 0.0, func(v): return "ramp's" if int(round(v * 12)) == 0 else "%d" % int(round(v * 12)), Callable(), func(v): _setv("bands", int(round(v * 12))))
	add_rack([lb] + lever_controls(), 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}], false))

## --- Pick: the library by family; choosing one plays it in the picture window
func _build_pick() -> void:
	var e := row()
	if String(state["family"]) == "all" and e.has("family"):
		state["family"] = String(e["family"])   # open on the current effect's family; "all" is a turn of the cycler away
	var fam := String(state["family"])
	state_line("Effects · pick · %s · %s: %s" % ["every family" if fam == "all" else fam, String(state["effect"]), String(e.get("doc", ""))], "", 2)
	var fams := ["all"] + families()
	add_cyclers([
		{"label": "family", "value": fam, "left": func(): state["family"] = _cycle(fams, fam, -1); rebuild(), "right": func(): state["family"] = _cycle(fams, fam, 1); rebuild()},
	])
	var items := []
	for n in names(fam):
		var nm := String(n)
		var er: Dictionary = by_name.get(nm, {})
		items.append({"label": nm, "line": String(er.get("family", "")) + " · " + ", ".join(PackedStringArray((er.get("levers", {}) as Dictionary).keys())), "on": nm == String(state["effect"]),
			"cb": func(): _set_effect(nm)})
	var cards := W.Cards.new()
	cards.font_size = T.SMALL_SIZE
	cards.setup_cards(items, 4, app)
	add_extra(cards)
	add_choices(standard_choices([{"label": "Use it", "cb": func(): set_tab(0)}, {"label": "Add as layer", "cb": func(): _add_layer(); set_tab(1)}], false))

## --- Export
func _build_export() -> void:
	var exported := String(state.get("exported", ""))
	state_line("Effects · export · %s" % ("in the game's effects" if exported != "" else "Keep writes the strip and its json into the game's art/fx; the add-on plays it at the hero"), "", 2)
	dim_line("The in-game shot is in the picture window." if (state.get("shot", "") != "" and FileAccess.file_exists(String(state["shot"]))) else "See it in the game plays it at the hero on the moor.")
	add_spacer()
	add_choices(standard_choices([{"label": "Put it in the game", "cb": _put_in_game}, {"label": "See it in the game", "cb": _see_in_game}, {"label": "Edit", "cb": _edit_picture}], false))

func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var out := app.game_art("fx")
	var a: Array
	if not (state.get("layers", []) as Array).is_empty():
		var path := fx_dir().path_join(effect_name() + ".graph.json")
		app.backend.write_json(path, layers_graph())
		a = ["effects", "graph", path, "-o", out, "--as", effect_name()]
	else:
		a = render_args(out)
	run(a, "putting it in the game", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["exported"] = out
		app.remember_last("effects", {"title": effect_name(), "note": "in the game", "png": String(state.get("last_png", "")), "meta": state.get("last_meta", {})})
		run(["game-preview", "--import", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game reads its new files", func(_r2): rebuild()))

func _see_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var name := effect_name()
	if app.args.has("script"):
		var shot := fx_dir().path_join("in_game.png")
		run(["game-preview", "--fx", name, "--shot", shot, "--shot-t", "6", "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game takes a look", func(r: Dictionary):
			if r.get("ok", false) and FileAccess.file_exists(shot):
				state["shot"] = shot
				app.scene.show_picture(tex(shot), "in the game")
				rebuild())
	else:
		app.backend.run(["game-preview", "--fx", name, "--game", app.backend.game_dir, "--godot", app.backend.godot], "the game opens", Callable())
		app.say("The game is opening with %s at the hero." % name)

# ------------------------------------------------------------------ Claude on the bench
func claude_context() -> Dictionary:
	return {"effect": String(state["effect"]), "levers": state.get("levers", {}), "palette": String(state["palette"]), "fx_dir": fx_dir(), "layers": state.get("layers", [])}

## a strip Claude drew plays in the window, its effect and levers read back from its json
func on_claude_done(r: Dictionary) -> void:
	var png := pick_changed(r, ".png", fx_dir())
	if png == "":
		png = pick_changed(r, ".png")
	if png != "":
		var meta_file := png.get_basename() + ".json"
		var meta := app.backend.read_json(meta_file)
		if meta.has("effect") and by_name.has(String(meta["effect"])):
			state["effect"] = String(meta["effect"])
		if meta.has("levers") and meta["levers"] is Dictionary:
			state["levers"] = meta["levers"]
		if meta.has("seed"):
			state["seed"] = int(meta["seed"])
		state["name"] = String(meta.get("name", png.get_file().get_basename()))
		_show(png, meta_file)
		rebuild()
		return
	preview()

func on_claude_undone() -> void:
	preview()

# ------------------------------------------------------------------ the standard actions
func keep() -> void:
	if tab == 4:
		_put_in_game()
		return
	app.remember_last("effects", {"title": effect_name(), "note": "kept", "png": String(state.get("last_png", "")), "meta": state.get("last_meta", {})})
	app.say("Kept: the strip and its json are in the project's fx folder.")

func render_all() -> void:
	preview()

func reset() -> void:
	push_undo()
	state["levers"] = {}
	state["seed"] = 1
	state["frames"] = 0
	state["fps"] = 0.0
	state["bands"] = 0
	state["palette"] = ""
	if tab == 1:
		state["layers"] = []
		state["layer"] = 0
	rebuild()
	preview()
	app.audio.blip("clunk")

func start_over_question() -> String:
	return "Start the effect over? Its strips in the project are thrown away; nothing in the game changes."

func do_start_over() -> void:
	var d := fx_dir()
	var da := DirAccess.open(d)
	if da:
		for f in da.get_files():
			DirAccess.remove_absolute(d.path_join(f))
	state = {}
	undo_stack = []
	redo_stack = []
	build()

func on_state_restored() -> void:
	preview()

func scene_light_lever() -> Control:
	var l := W.Lever3.new()
	l.init_lever3("scene light", app.scene.light_mode, 2, PackedStringArray(["off", "sprite only", "on"]), func(s): app.scene.set_light_mode(s); app.cfg["light"] = s; app.save_cfg())
	return l

func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 14
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	c.custom_minimum_size = Vector2(0, 13)
	add_extra(c)
	return c

static func _cycle(list: Array, cur, delta: int):
	var i := list.find(cur)
	return list[posmod(i + delta, list.size())] if not list.is_empty() else cur

## a painted effect (Midjourney, on black) through `effect`: the painted road
func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	var name := slug(p.get_file().get_basename())
	run(["effect", p, name, "-o", fx_dir(), "--kind", "loop", "--frames", "8", "--fps", "12", "--seed", str(int(state["seed"]))], "reading the painted effect", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["name"] = name
		_show(String(r.get("png", "")), String(r.get("json", ""))))

## the editor on the picture the bench made last (every pixel tool, the palette lock on its colours)
func _edit_picture() -> void:
	var png := String(state.get("last_png", ""))
	if png == "" or not FileAccess.file_exists(png):
		app.say("Nothing drawn yet to edit.")
		return
	app.go("editor", {"image": png, "title": effect_name()})
