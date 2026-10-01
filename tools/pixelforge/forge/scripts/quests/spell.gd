extends "res://scripts/quest.gd"
## Make a spell or effect: pick a shape (missile, nova, wall, burst, armour, or one of the spell presets), pick a
## look (the game's palettes), watch it play, put it in the game and fly it there.

const STEPS := ["Shape", "Look", "Watch", "In the game"]
# key, name, vfx kind (or "spell:<preset>"), one line
const SHAPES := [
	["missile", "Missile", "bone_spear", "a spear that spins and sheds chips"],
	["nova", "Nova", "nova", "a ring of shards on the ground"],
	["wall", "Wall", "firewall", "a looping wall of flame"],
	["burst", "Burst", "burst", "one flash that grows and dissolves"],
	["armour", "Armour", "bone_armor_front", "fragments circling a figure"],
	["fire", "Fire", "fire", "a flame that breathes"],
	["smoke", "Smoke", "smoke", "a column that rises"],
	["wisp", "Wisp", "wisp", "a lit spirit"],
	["ring", "Ring", "ring", "a halo on the ground"],
	["lightning", "Lightning", "lightning", "a bolt from above"],
	["ward", "Ward", "ward", "a standing shield"],
	["vortex", "Vortex", "vortex", "a whirl"],
	["embers", "Embers", "embers", "sparks drifting up"],
	["rune", "Rune", "rune", "a sigil that lights"],
	["cloud", "Cloud", "cloud", "a puff that spreads"],
]
const PRESETS := [["fireball", "Fireball"], ["ward", "Mirror ward"], ["soul_drain", "Soul drain"], ["bone_shatter", "Bone shatter"],
	["lightning_strike", "Lightning strike"], ["frost_nova", "Frost nova"], ["fire_wall", "Fire wall"], ["corpse_burst", "Corpse burst"], ["bone_spear_hit", "Spear hit"]]
const LOOKS := {
	"wisp": ["#0b1c20", "#1d4a4c", "#3f9c92", "#8fe3d2", "#eafff8"], "lantern": ["#2a1206", "#7a3d10", "#d08a2a", "#f3c75c", "#fff1b0"],
	"miasma": ["#140b1e", "#3a1f52", "#6d3f9a", "#a97fd1", "#e3d2f5"], "bone": ["#1a1712", "#4a4336", "#8f8470", "#c9bfa6", "#f0ead8"],
	"smoke": ["#1a1b1f", "#2e3036", "#45484f", "#5c6068", "#767a83"], "frost": ["#0b1a26", "#1f4a63", "#4d93b3", "#9ad4e8", "#eafaff"],
	"poison": ["#0d1a0c", "#234d1e", "#4f8f3a", "#95c860", "#e3ffb8"], "amber": ["#2a1a05", "#7a4a0c", "#c98a1e", "#f0c24a", "#fff0b8"],
	"silver": ["#141a22", "#3a4a5a", "#7f93a6", "#c2d2dd", "#f2f7fa"], "paper": ["#2a2318", "#6b5a3a", "#b09a6a", "#e2d3a8", "#fff6dc"],
	"iron": ["#121214", "#2e2f33", "#55575c", "#80838a", "#aeb2b9"], "black": ["#050507", "#15141a", "#2a2831", "#423f4a", "#5b5866"],
	"blood": ["#140202", "#300606", "#480a0a", "#5c1010", "#701616"],
}
const LOOK_ORDER := ["wisp", "lantern", "miasma", "bone", "frost", "poison", "amber", "silver", "paper", "smoke", "iron", "black", "blood"]
const SHAPE_LOOK := {"missile": "bone", "nova": "frost", "wall": "lantern", "burst": "lantern", "armour": "bone", "fire": "lantern", "smoke": "smoke",
	"wisp": "wisp", "ring": "wisp", "lightning": "frost", "ward": "silver", "vortex": "miasma", "embers": "lantern", "rune": "wisp", "cloud": "smoke"}

var shape := ""
var look := ""
var sname := ""
var result := {}
var meta := {}

func _init() -> void:
	quest_title = "Make a spell or effect"
	steps = STEPS

func begin() -> void:
	if args.has("draft") and args["draft"].get("what", "") == "spell":
		state["draft_text"] = String(args.get("describe", ""))
		step = 2
		sname = W.slug(String(args["draft"].get("spell", {}).get("name", "spell")))
		state["described"] = true
	if args.has("shape"):
		shape = String(args["shape"])
		look = String(args.get("look", SHAPE_LOOK.get(shape, "wisp")))
		if args.has("play"):
			step = 2
			state["auto"] = true

func fx_dir() -> String:
	return app.backend.out_dir("fx")

func build_step(i: int) -> void:
	match i:
		0: _shape()
		1: _look()
		2: _watch()
		3: _in_game()

func _shape() -> void:
	var v := W.col(4)
	v.add_child(W.label("Shapes", "Pixel"))
	var g := GridContainer.new()
	g.columns = 5
	g.add_theme_constant_override("h_separation", 3)
	g.add_theme_constant_override("v_separation", 3)
	var first: Button = null
	for s in SHAPES:
		var key: String = s[0]
		var b := W.pick(s[1], W.ramp_tex(LOOKS[SHAPE_LOOK[key]], 36, 10), func(): shape = key; look = SHAPE_LOOK.get(key, "wisp"); mark_done(0); go_step(1), Vector2(54, 34))
		b.tooltip_text = s[3]
		g.add_child(b)
		if first == null:
			first = b
	v.add_child(g)
	v.add_child(W.label("Whole spells (layered, as the game casts them)", "Pixel"))
	var f := HFlowContainer.new()
	f.add_theme_constant_override("h_separation", 3)
	f.add_theme_constant_override("v_separation", 3)
	for p in PRESETS:
		var key: String = p[0]
		f.add_child(W.chip(p[1], false, func(): shape = "spell:" + key; look = ""; sname = key; mark_done(0); mark_done(1); _make(fx_dir(), false, func(): go_step(2))))
	v.add_child(f)
	picture(v)
	first_focus = first
	headline("Pick a shape")
	words("A missile flies, a nova spreads on the ground, a wall stands and burns, a burst flashes once, armour circles a figure. The whole spells are the game's own, layered.")
	next_line("you pick its colours, and it plays.")

func _look() -> void:
	var g := GridContainer.new()
	g.columns = 4
	g.add_theme_constant_override("h_separation", 4)
	g.add_theme_constant_override("v_separation", 4)
	var first: Button = null
	for k in LOOK_ORDER:
		var b := W.pick(W.pretty(k), W.ramp_tex(LOOKS[k], 48, 12), func(): look = k; _named(); mark_done(1); _make(fx_dir(), false, func(): go_step(2)), Vector2(66, 36))
		g.add_child(b)
		if first == null or k == look:
			first = b
	picture(g)
	first_focus = first
	headline("Pick a look")
	words("Each is one of the game's colour ramps, dark to bright. Glow only where the game allows it: fire, wisps, bursts and magic.")
	next_line("the effect is drawn and plays here.")
	advanced([{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = shape and look"}])

func _named() -> void:
	var want := String(adv.get("name", "")).strip_edges()
	sname = W.slug(want if want != "" else shape + "_" + look)

func _kind() -> String:
	for s in SHAPES:
		if s[0] == shape:
			return s[2]
	return shape

func _args(out: String, for_game: bool) -> Array:
	if shape.begins_with("spell:"):
		return ["spell", "new", sname, "-o", out, "--preset", shape.substr(6), "--gif"]
	var a: Array = ["vfx", _kind(), sname, "-o", out, "--palette", look, "--gif"]
	a += flag("frames", "--frames", 8) + flag("fps", "--fps", 10.0) + flag("bands", "--bands", 6) + flag("seed", "--seed", 1) + flag("glow", "--glow", "auto")
	if str(adv.get("size", "")).strip_edges() != "":
		var wh := str(adv["size"]).split(" ", false)
		if wh.size() == 2:
			a += ["--size", wh[0], wh[1]]
	var rot := int(adv.get("rotations", 0))
	if shape == "missile" and for_game and rot == 0:
		rot = 16
	if rot > 1:
		a += ["--rotations", str(rot)]
	return a

func _make(out: String, for_game: bool, cb: Callable) -> void:
	run(_args(out, for_game), "effect", func(r: Dictionary):
		result = r
		_read_meta(String(r.get("json", "")))
		cb.call())

func _describe(cb: Callable) -> void:
	run(["describe", String(state.get("draft_text", "")), "-o", fx_dir()], "describe", func(r: Dictionary):
		result = r.get("export", {})
		sname = W.slug(String(r.get("spell", {}).get("name", sname)))
		_read_meta(String(result.get("json", "")))
		cb.call())

func _read_meta(path: String) -> void:
	meta = {}
	var f := FileAccess.open(path, FileAccess.READ)
	if f:
		var d = JSON.parse_string(f.get_as_text())
		if d is Dictionary:
			meta = d

func _watch() -> void:
	if state.get("described", false) and result.is_empty():
		picture(W.label("drawing what you described…", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		headline(W.pretty(sname))
		_describe(func(): mark_done(0); mark_done(1); show_step())
		return
	if state.get("auto", false) and result.is_empty():
		_named()
		picture(W.label("drawing…", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		headline(W.pretty(sname))
		_make(fx_dir(), false, func(): mark_done(0); mark_done(1); show_step())
		return
	var png := String(result.get("png", ""))
	var sp := W.strip_player()
	if not sp.load_sheet(png, meta):
		picture(W.label("(nothing to show yet)", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
	else:
		picture(sp)
	mark_done(2)
	headline(W.pretty(sname) + " plays")
	var layers: Array = meta.get("layers", [])
	words("%d frames at %d a second, %s. %s" % [int(meta.get("frames", 0)), int(meta.get("fps", 0)), "looping" if meta.get("loop", true) else "once",
		("Layers: " + ", ".join(layers) + ".") if not layers.is_empty() else ""])
	next_line("it goes into the game's effects and you can fly it there.")
	big("Put it in the game", func(): go_step(3))
	if args.has("autoput") and not state.get("auto_went", false):
		state["auto_went"] = true
		call_deferred("go_step", 3)
	var again := W.ghost("Draw it again", func(): _make(fx_dir(), false, func(): show_step()))
	var other := W.ghost("Another look", func(): go_step(1))
	buttons([again, other])
	if not shape.begins_with("spell:") and not state.get("described", false):
		advanced([
			{"key": "frames", "label": "Frames", "type": "int", "default": 8},
			{"key": "fps", "label": "Speed", "type": "float", "default": 10.0, "hint": "frames a second"},
			{"key": "size", "label": "Size", "type": "text", "default": "", "hint": "width height, blank = the shape's own"},
			{"key": "bands", "label": "Colour bands", "type": "int", "default": 6},
			{"key": "seed", "label": "Seed", "type": "int", "default": 1, "hint": "another number, another drawing"},
			{"key": "glow", "label": "Glow", "type": "choice", "default": "auto", "choices": ["auto", "on", "off"]},
			{"key": "rotations", "label": "Headings", "type": "int", "default": 0, "hint": "missiles: 16 in the game"},
		], "The real settings of the effect, as the command line takes them.")

func _in_game() -> void:
	if game_card():
		return
	var game_fx: String = app.backend.game_dir.path_join("art").path_join("fx")
	if not state.get("in_game", false):
		var sp := W.strip_player()
		sp.load_sheet(String(result.get("png", "")), meta)
		picture(sp)
		headline("Put " + W.pretty(sname) + " in the game")
		words("The sheet and its list go into the game's effects. A missile gets 16 headings so it can fly any way.")
		next_line("the game is told to look, then you can fly it on the moor.")
		big("Put it in the game", func():
			if state.get("described", false):
				run(["describe", String(state.get("draft_text", "")), "-o", game_fx], "put in the game", func(_r): import_game(func(): state["in_game"] = true; show_step()))
			else:
				_make(game_fx, true, func(): import_game(func(): state["in_game"] = true; show_step())))
		if args.has("autoput") and not state.get("auto_put", false):
			state["auto_put"] = true
			call_deferred("_auto_press")
		return
	var sp2 := W.strip_player()
	sp2.load_sheet(String(result.get("png", "")), meta)
	picture(sp2)
	in_game_step(W.pretty(sname) + " is in the game's effects as \"" + sname + "\". \"See it\" plays it at the hero on the moor.", ["--fx", sname, "--cls", "miasmancer"], sname)
