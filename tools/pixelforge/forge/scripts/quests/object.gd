extends "res://scripts/quest.gd"
## Make an object: drop a painting of a barrel, a tree, a banner; it is cut out and pressed to a sprite with a
## footprint; choose whether it sways; put it in the game's object list.

const STEPS := ["Painting", "Cut out", "Sway", "In the game"]
const SWAYS := [["none", "Still", "a barrel, a stone, a grave"], ["canopy", "Sways like a tree", "the crown moves, the trunk stands"],
	["banner", "Flutters like a banner", "hung from the top"], ["flame", "Flickers like a flame", "a brazier, a torch"]]

var oname := ""
var sway := "none"
var result := {}

func _init() -> void:
	quest_title = "Make an object"
	steps = STEPS

func begin() -> void:
	if args.has("drop"):
		state["painting"] = String(args["drop"])

func out_dir() -> String:
	return app.backend.out_dir("objects")

func files_dir() -> String:
	return String(result.get("dir", out_dir().path_join(oname)))

func build_step(i: int) -> void:
	match i:
		0: _painting()
		1: _cut()
		2: _sway()
		3: _in_game()

func _painting() -> void:
	picture(W.drop_zone("Drop your painting here", "Choose a painting", func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; Pictures"]), _dropped)))
	headline("Start with a painting")
	words("One object on a plain background: a barrel, a gravestone, a dead tree, a banner. A sheet of four variations works too (say so in Advanced).")
	next_line("the Forge cuts it out, finds where it stands on the ground, and presses it to the game's pixels.")
	advanced([
		{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = the file's name"},
		{"key": "height", "label": "Height in pixels", "type": "int", "default": 96, "hint": "heroes are about 120"},
		{"key": "variations", "label": "Figures on the sheet", "type": "int", "default": 1},
		{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0, "hint": "0 = every colour"},
		{"key": "outline", "label": "Dark outline", "type": "bool", "default": true},
		{"key": "key_all", "label": "Clear holes too", "type": "bool", "default": false, "hint": "archways, gaps between parts"},
		{"key": "carve", "label": "Carve in 3D", "type": "bool", "default": false, "hint": "the hero way; needs Blender and a sheet of views"},
	])
	if state.has("painting") and not state.get("started", false):
		state["started"] = true
		call_deferred("_dropped", state["painting"])

func on_drop(paths: PackedStringArray) -> void:
	if step == 0 and not paths.is_empty():
		_dropped(paths[0])

func _dropped(path: String) -> void:
	state["painting"] = path
	var img := Image.load_from_file(path)
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	picture(W.picture(ImageTexture.create_from_image(img)))
	var want := String(adv.get("name", "")).strip_edges()
	oname = W.slug(want if want != "" else path.get_file().get_basename())
	ensure_project(func(): _make(out_dir(), false, func(): mark_done(0); mark_done(1); go_step(1)))

func _args(out: String, for_game: bool) -> Array:
	if adv.get("carve", false):
		var a: Array = ["object", state["painting"], oname, "-o", out, "--height", str(float(adv.get("height", 96)) / 100.0)]
		if for_game:
			a += ["--game-objects", app.backend.game_dir.path_join("art").path_join("objects").path_join("objects.json")]
		return a
	var a: Array = ["prop", state["painting"], oname, "-o", out] + flag("height", "--height", 96) + flag("colors", "--colors", 0) + flag("variations", "--variations", 1)
	if not bool(adv.get("outline", true)):
		a.append("--no-outline")
	if bool(adv.get("key_all", false)):
		a.append("--key-all")
	if sway != "none":
		a += ["--sway", sway]
	if for_game:
		a += ["--game-objects", app.backend.game_dir.path_join("art").path_join("objects").path_join("objects.json"), "--hr", "2"]
	return a

func _make(out: String, for_game: bool, cb: Callable) -> void:
	run(_args(out, for_game), "object", func(r: Dictionary):
		result = r
		cb.call())

func _result_picture() -> void:
	var vars: Dictionary = result.get("variations", {})
	if vars.is_empty():
		picture_file(String(result.get("png", "")))
		return
	var keys := vars.keys()
	var first: String = keys[0]
	var entry: Dictionary = vars[first]
	var png := files_dir().path_join("%s_%s.png" % [oname, first])
	if int(entry.get("frames", 1)) > 1:
		var sp := W.strip_player()
		sp.load_sheet(png, entry)
		picture(sp)
	else:
		if keys.size() > 1:
			var r := W.row(6)
			r.alignment = BoxContainer.ALIGNMENT_CENTER
			for k in keys:
				var t := FT.tex(files_dir().path_join("%s_%s.png" % [oname, k]), false)
				if t:
					r.add_child(W.picture(t))
			picture(r)
		else:
			picture_file(png)

func _cut() -> void:
	_result_picture()
	headline(W.pretty(oname) + " is cut out")
	var vars: Dictionary = result.get("variations", {})
	var n := vars.size()
	var sz: Array = vars.values()[0].get("size", [0, 0]) if n > 0 else [0, 0]
	words("%s cut out, %d by %d pixels, standing on its own footprint (the game knows where its feet are)." % ["One object" if n <= 1 else "%d variations" % n, int(sz[0]), int(sz[1])])
	next_line("choose whether it moves in the wind.")
	big("Continue", func(): advance())
	buttons([W.ghost("Do it again with the Advanced settings", func(): _make(out_dir(), false, func(): show_step()))])
	_painting_advanced()

func _painting_advanced() -> void:
	advanced([
		{"key": "height", "label": "Height in pixels", "type": "int", "default": 96},
		{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0},
		{"key": "outline", "label": "Dark outline", "type": "bool", "default": true},
		{"key": "frames", "label": "Sway frames", "type": "int", "default": 8},
		{"key": "fps", "label": "Sway speed", "type": "float", "default": 6.0, "hint": "frames a second"},
	])

func _sway() -> void:
	_result_picture()
	headline("Does it move?")
	words("Pick one and watch. Trees sway at the crown, banners flutter from the top, flames flicker.")
	var g := GridContainer.new()
	g.columns = 2
	g.add_theme_constant_override("h_separation", 6)
	g.add_theme_constant_override("v_separation", 4)
	for s in SWAYS:
		var key: String = s[0]
		var b := W.button(s[1], "ChipOn" if key == sway else "Chip", func():
			sway = key
			_make(out_dir(), false, func(): mark_done(2); show_step()))
		b.tooltip_text = s[2]
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		g.add_child(b)
	right.add_child(g)
	next_line("it goes into the game's object list, ready to be placed.")
	big("Put it in the game", func(): mark_done(2); go_step(3))
	_painting_advanced()

func _in_game() -> void:
	if game_card():
		return
	if not state.get("in_game", false):
		_result_picture()
		headline("Put " + W.pretty(oname) + " in the game")
		words("The sprite goes into the game's objects folder and its list, with the footprint. The world builder can place it as \"" + oname + "\".")
		next_line("the game is told to look, and you can open it.")
		var game_out: String = app.backend.game_dir.path_join("art").path_join("objects")
		big("Put it in the game", func(): _make(game_out, true, func(): import_game(func(): state["in_game"] = true; show_step())))
		return
	_result_picture()
	in_game_step(W.pretty(oname) + " is in the game's object list as \"" + oname + "\". The world builder places it; the moor does not change on its own.", ["--cls", "miasmancer"], oname)
