extends "res://scripts/screen.gd"
## Effects: the procedural effect sheets (`pixelforge vfx`) and the layered spells (`pixelforge spell`) as an
## instrument (docs/track_notes/spell_rack.md). Tabs: Shape · Layers · Looks · Missile · Export. Every knob is a flag
## of the same command an assistant runs; the picture window plays the strip at game size and 3x.

const KINDS := ["fire", "smoke", "wisp", "burst", "embers", "ring", "bolt", "slash", "circle", "cloud", "shards", "pillar", "decal", "drip", "flash", "ward",
	"vortex", "rain", "ashfall", "fog", "lightning", "swarm", "chain", "rune", "pool", "cookie", "nova", "firewall", "bone_burst",
	"bone_armor_front", "bone_armor_back", "bone_shard_aura_front", "bone_shard_aura_back"]
const MISSILES := ["bone_spear", "teeth", "ice_bolt", "fire_bolt"]
const PALETTES := ["wisp", "lantern", "miasma", "bone", "smoke", "blood", "frost", "amber", "iron", "silver", "poison", "paper", "rain", "white", "black"]
const SPELL_PRESETS := ["fireball", "ward", "soul_drain", "bone_shatter", "lightning_strike"]

var spell := {}            # the spell json when the Layers tab made one
var spell_file := ""

func build() -> void:
	tabs = PackedStringArray(["Shape", "Layers", "Looks", "Missile", "Export"])
	hint_text = "Esc back · LB/RB tabs"
	if state.is_empty():
		state = {"kind": "wisp", "palette": "wisp", "frames": 8, "fps": 10.0, "bands": 6, "seed": 1, "glow": "auto", "haze": "auto", "size": 48,
			"rotations": 16, "missile": "bone_spear", "preset": "fireball", "layer": 0, "name": "", "exported": ""}
	if args.has("draft") and args["draft"] is Dictionary and String(args["draft"].get("what", "")) == "spell":
		_take_draft(args["draft"])
	if args.has("kind"):
		state["kind"] = String(args["kind"])
	if args.has("palette"):
		state["palette"] = String(args["palette"])
	tab_from_args()
	rebuild()
	preview()

## Describe-it's spell draft: its layers become the Layers tab's spell
func _take_draft(d: Dictionary) -> void:
	if d.has("spell") and d["spell"] is Dictionary:
		spell = d["spell"]
		state["name"] = String(spell.get("name", "spell"))
		var layers: Array = spell.get("layers", [])
		if not layers.is_empty():
			state["kind"] = String(layers[0].get("kind", state["kind"]))
			state["palette"] = String(layers[0].get("palette", state["palette"]))
		tab = 1
		var reads: Array = d.get("read", [])
		if not reads.is_empty():
			app.say("Read: " + ", ".join(PackedStringArray(reads)), 6.0)

func fx_dir() -> String:
	return app.backend.out_dir("fx")

func effect_name() -> String:
	var n := String(state.get("name", ""))
	return n if n != "" else String(state["kind"])

## the strip: `vfx <kind> <name> ... --json`, then the picture window plays it
func preview() -> void:
	if not app.backend.python_ok():
		return
	if tab == 1 and not spell.is_empty():
		_preview_spell()
		return
	var kind := String(state["missile"] if tab == 3 else state["kind"])
	var a := ["vfx", kind, effect_name() if tab != 3 else String(state["missile"]), "-o", fx_dir(), "--palette", String(state["palette"]),
		"--frames", str(int(state["frames"])), "--fps", str(float(state["fps"])), "--bands", str(int(state["bands"])), "--seed", str(int(state["seed"])),
		"--glow", String(state["glow"]), "--haze", String(state["haze"]), "--style", app.style_name]
	if tab == 3:
		a += ["--rotations", str(int(state["rotations"]))]
	if int(state.get("size", 0)) > 0 and tab != 3:
		a += ["--size", str(int(state["size"])), str(int(state["size"]))]
	run(a, "drawing the effect", func(r: Dictionary):
		if not r.get("ok", false):
			return
		_show(String(r.get("png", "")), String(r.get("json", "")))
		, false)

func _show(png: String, meta_file: String) -> void:
	var t := tex(png)
	if t == null:
		return
	var meta := app.backend.read_json(meta_file)
	state["last_png"] = png
	state["last_meta"] = meta
	app.scene.show_strip(t, meta, "%s · %s · %d frames at %s a second" % [String(meta.get("name", effect_name())), String(state["palette"]), int(meta.get("frames", 0)), T.fmt(float(meta.get("fps", 0)), 1)])

func _preview_spell() -> void:
	spell_file = fx_dir().path_join(String(spell.get("name", "spell")) + ".spell.json")
	app.backend.write_json(spell_file, spell)
	run(["spell", "render", spell_file, "-o", fx_dir()], "drawing the spell", func(r: Dictionary):
		if not r.get("ok", false):
			return
		_show(String(r.get("png", "")), String(r.get("json", "")))
		, false)

# ------------------------------------------------------------------ the tabs
func build_tab(i: int) -> void:
	match i:
		0: _build_shape()
		1: _build_layers()
		2: _build_looks()
		3: _build_missile()
		4: _build_export()

func on_tab() -> void:
	preview()

func _knob_levers() -> Array:
	var controls := []
	var ls := W.Lever.new()
	ls.init("size", (float(state["size"]) - 16.0) / 112.0, 32.0 / 112.0, func(v): return "%d px" % int(round(16 + v * 112)), Callable(), func(v): _setv("size", round(16 + v * 112)))
	var lf := W.Lever.new()
	lf.init("frames", (float(state["frames"]) - 4.0) / 28.0, 4.0 / 28.0, func(v): return "%d" % int(round(4 + v * 28)), Callable(), func(v): _setv("frames", round(4 + v * 28)))
	var lp := W.Lever.new()
	lp.init("speed", (float(state["fps"]) - 4.0) / 20.0, 6.0 / 20.0, func(v): return "%d fps" % int(round(4 + v * 20)), Callable(), func(v): _setv("fps", round(4 + v * 20)))
	var lb := W.Lever.new()
	lb.init("bands", (float(state["bands"]) - 2.0) / 10.0, 4.0 / 10.0, func(v): return "%d" % int(round(2 + v * 10)), Callable(), func(v): _setv("bands", round(2 + v * 10)))
	var lg := W.Lever3.new()
	lg.init_lever3("glow", {"off": 0, "auto": 1, "on": 2}[String(state["glow"])], 1, PackedStringArray(["off", "auto", "on"]), func(s): _set_str("glow", ["off", "auto", "on"][s]))
	var lh := W.Lever3.new()
	lh.init_lever3("haze", {"off": 0, "auto": 1, "on": 2}[String(state["haze"])], 1, PackedStringArray(["off", "auto", "on"]), func(s): _set_str("haze", ["off", "auto", "on"][s]))
	controls.append_array([ls, lf, lp, lb, lg, lh])
	return controls

func _setv(key: String, value: float) -> void:
	push_undo()
	state[key] = value
	preview()
	rebuild()

func _set_str(key: String, value: String) -> void:
	push_undo()
	state[key] = value
	preview()
	rebuild()

func _dice() -> void:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	_setv("seed", rng.randi_range(1, 999))

## --- Shape
func _build_shape() -> void:
	var kind := String(state["kind"])
	state_line("Effects · shape · %s in %s · seed %d" % [kind, String(state["palette"]), int(state["seed"])])
	add_cyclers([
		{"label": "shape", "value": kind, "left": func(): _set_str("kind", _cycle(KINDS, kind, -1)), "right": func(): _set_str("kind", _cycle(KINDS, kind, 1))},
		{"label": "palette", "value": String(state["palette"]), "left": func(): _set_str("palette", _cycle(PALETTES, String(state["palette"]), -1)), "right": func(): _set_str("palette", _cycle(PALETTES, String(state["palette"]), 1))},
		{"label": "seed", "value": str(int(state["seed"])), "left": func(): _setv("seed", maxi(int(state["seed"]) - 1, 1)), "right": func(): _setv("seed", int(state["seed"]) + 1)},
	])
	var controls := _knob_levers()
	controls.append(scene_light_lever())
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}, {"label": "From a painting", "cb": _from_painting}], false))

func _from_painting() -> void:
	app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; paintings"]), func(p): on_drop(PackedStringArray([p])), "Choose the painted effect")

## a painted effect (Midjourney, on black) through `effect`: the painted road
func on_drop(paths: PackedStringArray) -> void:
	if paths.is_empty():
		return
	var p := paths[0]
	var name := slug(p.get_file().get_basename())
	run(["effect", p, name, "-o", fx_dir(), "--kind", "loop", "--frames", str(int(state["frames"])), "--fps", str(float(state["fps"])), "--seed", str(int(state["seed"]))], "reading the painted effect", func(r: Dictionary):
		if not r.get("ok", false):
			return
		state["name"] = name
		_show(String(r.get("png", "")), String(r.get("json", ""))))

## --- Layers: a spell as a strip of layer cards, each with its knobs
func _build_layers() -> void:
	if spell.is_empty():
		state_line("Effects · layers · a spell is layered effects: fire under a burst under embers. Pick a preset to start from.")
		add_cyclers([
			{"label": "preset", "value": String(state["preset"]), "left": func(): state["preset"] = _cycle(SPELL_PRESETS, String(state["preset"]), -1); rebuild(), "right": func(): state["preset"] = _cycle(SPELL_PRESETS, String(state["preset"]), 1); rebuild()},
		])
		add_spacer()
		add_choices(standard_choices([{"label": "New spell", "cb": _new_spell}], false))
		return
	var layers: Array = spell.get("layers", [])
	var li := clampi(int(state["layer"]), 0, maxi(layers.size() - 1, 0))
	state["layer"] = li
	var L: Dictionary = layers[li] if not layers.is_empty() else {}
	state_line("Effects · layers · %s · layer %d of %d: %s in %s" % [String(spell.get("name", "spell")), li + 1, layers.size(), String(L.get("kind", "")), String(L.get("palette", ""))])
	add_cyclers([
		{"label": "layer", "value": str(li + 1), "left": func(): state["layer"] = posmod(li - 1, maxi(layers.size(), 1)); rebuild(), "right": func(): state["layer"] = posmod(li + 1, maxi(layers.size(), 1)); rebuild()},
		{"label": "kind", "value": String(L.get("kind", "")), "left": func(): _set_layer("kind", _cycle(KINDS, String(L.get("kind", "")), -1)), "right": func(): _set_layer("kind", _cycle(KINDS, String(L.get("kind", "")), 1))},
		{"label": "palette", "value": String(L.get("palette", "")), "left": func(): _set_layer("palette", _cycle(PALETTES, String(L.get("palette", "")), -1)), "right": func(): _set_layer("palette", _cycle(PALETTES, String(L.get("palette", "")), 1))},
		{"label": "blend", "value": String(L.get("blend", "normal")), "left": func(): _set_layer("blend", "add" if String(L.get("blend", "normal")) == "normal" else "normal"), "right": func(): _set_layer("blend", "add" if String(L.get("blend", "normal")) == "normal" else "normal")},
	])
	var controls := []
	var lsc := W.Lever.new()
	lsc.init("scale", (float(L.get("scale", 1.0)) - 0.25) / 2.75, 0.75 / 2.75, func(v): return "x" + T.fmt(0.25 + v * 2.75, 2), Callable(), func(v): _set_layer("scale", snappedf(0.25 + v * 2.75, 0.05)))
	var lsp := W.Lever.new()
	lsp.init("speed", (float(L.get("speed", 1.0)) - 0.25) / 2.75, 0.75 / 2.75, func(v): return "x" + T.fmt(0.25 + v * 2.75, 2), Callable(), func(v): _set_layer("speed", snappedf(0.25 + v * 2.75, 0.05)))
	var lop := W.Lever.new()
	lop.init("opacity", float(L.get("opacity", 1.0)), 1.0, func(v): return T.fmt(v, 2), Callable(), func(v): _set_layer("opacity", snappedf(v, 0.05)))
	var lx := W.Lever.new()
	lx.init("x", (float(L.get("x", 0)) + 32.0) / 64.0, 0.5, func(v): return "%+d" % int(round(v * 64 - 32)), Callable(), func(v): _set_layer("x", round(v * 64 - 32)))
	var ly := W.Lever.new()
	ly.init("y", (float(L.get("y", 0)) + 32.0) / 64.0, 0.5, func(v): return "%+d" % int(round(v * 64 - 32)), Callable(), func(v): _set_layer("y", round(v * 64 - 32)))
	var lr := W.Wheel.new()
	lr.init_wheel("rotation", float(L.get("rotation", 0.0)), 0.0, func(a): return "%d" % int(round(a)), Callable(), func(a): _set_layer("rotation", round(a)))
	var lst := W.Lever.new()
	lst.init("start", float(L.get("start", 0)) / 12.0, 0.0, func(v): return "%d fr" % int(round(v * 12)), Callable(), func(v): _set_layer("start", round(v * 12)))
	var lsd := W.Lever.new()
	lsd.init("seed", float(L.get("seed", 1)) / 99.0, 1.0 / 99.0, func(v): return "%d" % int(round(v * 99)), Callable(), func(v): _set_layer("seed", maxi(int(round(v * 99)), 1)))
	controls.append_array([lsc, lsp, lop, lx, ly, lr, lst, lsd])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Add layer", "cb": _add_layer}, {"label": "Remove layer", "cb": _remove_layer}, {"label": "Randomise", "cb": _randomise_spell}], false))

func _new_spell() -> void:
	var name := String(state["preset"])
	run(["spell", "new", name, "-o", fx_dir(), "--preset", String(state["preset"])], "making the spell", func(r: Dictionary):
		if not r.get("ok", false):
			return
		spell_file = String(r.get("spell", ""))
		spell = app.backend.read_json(spell_file)
		state["name"] = name
		state["layer"] = 0
		_show(String(r.get("png", "")), String(r.get("json", "")))
		rebuild())

func _set_layer(key: String, value) -> void:
	var layers: Array = spell.get("layers", [])
	var li := int(state["layer"])
	if li < 0 or li >= layers.size():
		return
	push_undo()
	layers[li][key] = value
	state["spell"] = spell
	_preview_spell()
	rebuild()

func _add_layer() -> void:
	push_undo()
	var layers: Array = spell.get("layers", [])
	layers.append({"kind": "embers", "palette": String(state["palette"]), "scale": 1.0, "x": 0, "y": 0, "rotation": 0.0, "start": 0, "speed": 1.0, "opacity": 1.0, "blend": "add", "seed": layers.size() + 1})
	spell["layers"] = layers
	state["layer"] = layers.size() - 1
	state["spell"] = spell
	_preview_spell()
	rebuild()

func _remove_layer() -> void:
	var layers: Array = spell.get("layers", [])
	if layers.size() <= 1:
		app.say("A spell keeps at least one layer.")
		return
	push_undo()
	layers.remove_at(int(state["layer"]))
	state["layer"] = 0
	state["spell"] = spell
	_preview_spell()
	rebuild()

func _randomise_spell() -> void:
	push_undo()
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	for L in spell.get("layers", []):
		L["seed"] = rng.randi_range(1, 99)
	state["spell"] = spell
	_preview_spell()
	app.say("New seeds for every layer; Undo takes them back.")

## --- Looks: the palette swatches and the style's own rules
func _build_looks() -> void:
	state_line("Effects · looks · %s palette · the style preset %s decides bands, glow and haze unless the levers say otherwise" % [String(state["palette"]), app.style_name.replace("_", " ")])
	var items := []
	for pal in PALETTES:
		items.append({"label": ("* " if pal == String(state["palette"]) else "") + pal, "cb": func(): _set_str("palette", pal)})
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 6
	c.wrap_width = App.TEXTBOX.size.x - 16
	c.setup(items, 1, app)
	c.row_h = 13
	add_extra(c)
	add_rack(_knob_levers(), 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}], false))

## --- Missile: a flying thing with its headings
func _build_missile() -> void:
	state_line("Effects · missile · %s in %s · %d headings · the game picks the row nearest its heading" % [String(state["missile"]), String(state["palette"]), int(state["rotations"])])
	add_cyclers([
		{"label": "missile", "value": String(state["missile"]), "left": func(): _set_str("missile", _cycle(MISSILES, String(state["missile"]), -1)), "right": func(): _set_str("missile", _cycle(MISSILES, String(state["missile"]), 1))},
		{"label": "headings", "value": str(int(state["rotations"])), "left": func(): _setv("rotations", 8 if int(state["rotations"]) == 16 else 16), "right": func(): _setv("rotations", 16 if int(state["rotations"]) == 8 else 8)},
		{"label": "palette", "value": String(state["palette"]), "left": func(): _set_str("palette", _cycle(PALETTES, String(state["palette"]), -1)), "right": func(): _set_str("palette", _cycle(PALETTES, String(state["palette"]), 1))},
	])
	add_rack(_knob_levers(), 8)
	add_choices(standard_choices([{"label": "Dice", "cb": _dice}], false))

## --- Export
func _build_export() -> void:
	var exported := String(state.get("exported", ""))
	state_line("Effects · export · %s" % ("in the game's effects" if exported != "" else "Keep writes the strip and its json into the game's art/fx; the add-on plays it at the hero"))
	dim_line("The in-game shot is in the picture window." if (state.get("shot", "") != "" and FileAccess.file_exists(String(state["shot"]))) else "See it in the game plays it at the hero on the moor.")
	add_spacer()
	add_choices(standard_choices([{"label": "Put it in the game", "cb": _put_in_game}, {"label": "See it in the game", "cb": _see_in_game}], false))

func _put_in_game() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var out := app.game_art("fx")
	var a: Array
	if not spell.is_empty() and spell_file != "":
		a = ["spell", "render", spell_file, "-o", out]
	else:
		var kind := String(state["kind"])
		a = ["vfx", kind, effect_name(), "-o", out, "--palette", String(state["palette"]), "--frames", str(int(state["frames"])), "--fps", str(float(state["fps"])),
			"--bands", str(int(state["bands"])), "--seed", str(int(state["seed"])), "--glow", String(state["glow"]), "--haze", String(state["haze"]), "--style", app.style_name]
		if kind in MISSILES:
			a += ["--rotations", str(int(state["rotations"]))]
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
	var name := effect_name() if spell.is_empty() else String(spell.get("name", "spell"))
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
	for k in ["frames", "fps", "bands", "seed", "size"]:
		state[k] = {"frames": 8, "fps": 10.0, "bands": 6, "seed": 1, "size": 48}[k]
	state["glow"] = "auto"
	state["haze"] = "auto"
	if tab == 1 and not spell.is_empty():
		spell = {}
		spell_file = ""
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
	spell = {}
	spell_file = ""
	state = {}
	undo_stack = []
	redo_stack = []
	build()

func on_state_restored() -> void:
	if state.has("spell") and state["spell"] is Dictionary:
		spell = state["spell"]
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
