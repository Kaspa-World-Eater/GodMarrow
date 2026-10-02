extends "res://scripts/quest.gd"
## Make icons, portraits and UI: inventory icons from one flat-lay painting, a head-and-shoulders portrait from a
## front view, or a 9-slice frame from a painted panel.

const STEPS := ["Kind", "Painting", "Result", "In the game"]
const KINDS := [
	["icons", "Inventory icons", "one painting of items laid out flat becomes an icon each", "items"],
	["portrait", "A portrait", "a front view becomes a head-and-shoulders portrait", "portraits"],
	["frame", "A frame", "a painted panel becomes a frame that stretches to any size", "ui"],
]

var kind := ""
var uname := ""
var result := {}

func _init() -> void:
	quest_title = "Make icons, portraits and UI"
	steps = STEPS

func begin() -> void:
	if args.has("kind"):
		kind = String(args["kind"])
		step = 1
	if args.has("drop"):
		state["painting"] = String(args["drop"])
		if kind == "":
			kind = "icons"
		step = 1

func build_step(i: int) -> void:
	match i:
		0: _kind()
		1: _painting()
		2: _result()
		3: _in_game()

func _kind() -> void:
	picture(W.picture(FT.tex("res://assets/pics/ui.png")))
	headline("What would you like?")
	var first: Button = null
	for k in KINDS:
		var key: String = k[0]
		var b := W.button(k[1], "Tile", func(): kind = key; mark_done(0); go_step(1))
		b.custom_minimum_size = Vector2(0, 34)
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		right.add_child(b)
		right.add_child(W.label(k[2], "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
		if first == null:
			first = b
	first_focus = first

func _kind_row() -> Array:
	for k in KINDS:
		if k[0] == kind:
			return k
	return KINDS[0]

func _painting() -> void:
	var k := _kind_row()
	picture(W.drop_zone("Drop your painting here", "Choose a painting", func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; Pictures"]), _dropped)))
	headline(k[1])
	words(W.sentence(k[2]) + ".")
	prompt_card()
	match kind:
		"icons":
			next_line("each item is found, cut out and pressed to an icon at two sizes.")
			advanced([
				{"key": "names", "label": "Names, in reading order", "type": "text", "default": "", "hint": "sword:1x3,ring,hood:2x2 (blank = numbered)"},
				{"key": "cell", "label": "Pixels a cell", "type": "int", "default": 12},
				{"key": "scale", "label": "Big size", "type": "int", "default": 4},
				{"key": "tolerance", "label": "Background tolerance", "type": "float", "default": 0.08},
				{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0},
			])
		"portrait":
			next_line("the head and shoulders are framed and pressed to two sizes.")
			advanced([
				{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = the file's name"},
				{"key": "sizes", "label": "Sizes", "type": "text", "default": "48 96"},
				{"key": "head", "label": "How much of the figure", "type": "float", "default": 0.34},
				{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0},
			])
		_:
			next_line("the borders are found and the frame is written so the game can stretch it.")
			advanced([
				{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = the file's name"},
				{"key": "border", "label": "Borders", "type": "text", "default": "", "hint": "left top right bottom, blank = detected"},
				{"key": "mid", "label": "Edge thickness kept", "type": "int", "default": 8},
			])
	if state.has("painting") and not state.get("started", false):
		state["started"] = true
		call_deferred("_dropped", state["painting"])

func on_drop(paths: PackedStringArray) -> void:
	if step == 1 and not paths.is_empty():
		_dropped(paths[0])

func _dropped(path: String) -> void:
	state["painting"] = path
	var img := Image.load_from_file(path)
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	picture(W.picture(ImageTexture.create_from_image(img)))
	var want := String(adv.get("name", "")).strip_edges()
	var stem := path.get_file().get_basename()
	if path.get_base_dir().get_file() == "views":   # a character's cutout: name it after the character
		stem = path.get_base_dir().get_base_dir().get_file()
	uname = W.slug(want if want != "" else stem)
	ensure_project(func(): _make(app.backend.out_dir(_kind_row()[3]), func(): mark_done(1); go_step(2)))

func _args(out: String) -> Array:
	match kind:
		"icons":
			var a: Array = ["icons", state["painting"], "-o", out] + flag("cell", "--cell", 12) + flag("scale", "--scale", 4) + flag("tolerance", "--tolerance", 0.08) + flag("colors", "--colors", 0)
			if str(adv.get("names", "")).strip_edges() != "":
				a += ["--names", str(adv["names"])]
			return a
		"portrait":
			var a: Array = ["portrait", state["painting"], uname, "-o", out] + flag("head", "--head", 0.34) + flag("colors", "--colors", 0)
			var sz := str(adv.get("sizes", "48 96")).split(" ", false)
			if not sz.is_empty():
				a.append("--sizes")
				for x in sz:
					a.append(x)
			return a
		_:
			var a: Array = ["ui9", state["painting"], uname, "-o", out] + flag("mid", "--mid", 8)
			var b := str(adv.get("border", "")).split(" ", false)
			if b.size() == 4:
				a += ["--border", b[0], b[1], b[2], b[3]]
			return a

func _make(out: String, cb: Callable) -> void:
	run(_args(out), kind, func(r: Dictionary):
		result = r
		cb.call())

func _pngs() -> Array:
	var out := []
	match kind:
		"icons":
			var icons = result.get("icons", {})
			var dir := String(result.get("dir", ""))
			if icons is Dictionary:
				for k in icons:
					var e = icons[k]
					if e is Dictionary and e.has("png"):
						out.append(String(e["png"]))
					elif e is String:
						out.append(e)
					elif dir != "":
						out.append(dir.path_join(String(k) + ".png"))
			elif icons is Array:
				for e in icons:
					if e is Dictionary and e.has("png"):
						out.append(String(e["png"]))
					elif e is String:
						out.append(String(e))
		"portrait":
			var files = result.get("files", [])
			if files is Dictionary:
				for k in files:
					out.append(String(files[k]))
			elif files is Array:
				for f in files:
					out.append(String(f))
		_:
			if result.has("png"):
				out.append(String(result["png"]))
	return out.filter(func(p): return String(p).ends_with(".png"))

func _result_picture() -> void:
	var pngs := _pngs()
	if pngs.is_empty():
		picture(W.label("(nothing to show yet)", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		return
	if pngs.size() == 1:
		picture_file(pngs[0])
		return
	var f := HFlowContainer.new()
	f.add_theme_constant_override("h_separation", 6)
	f.add_theme_constant_override("v_separation", 6)
	for p in pngs.slice(0, 12):
		var t := FT.tex(p, false)
		if t:
			var pic := W.picture(t)
			pic.size_flags_horizontal = 0
			pic.size_flags_vertical = 0
			pic.custom_minimum_size = Vector2(mini(t.get_width(), 96), mini(t.get_height(), 96))
			f.add_child(pic)
	picture(f)

func _result() -> void:
	_result_picture()
	mark_done(2)
	var k := _kind_row()
	match kind:
		"icons":
			headline("%d icons" % int(result.get("found", 0)))
			words("Each item was found and cut out, at the inventory size and four times bigger for the hover.")
		"portrait":
			headline(W.pretty(uname) + "'s portrait")
			words("Head and shoulders, at the sizes the game uses.")
		_:
			headline(W.pretty(uname) + " is a frame")
			var m: Dictionary = result.get("margins", {})
			words("Borders %s. The game stretches the middle and keeps the corners." % (("of %d, %d, %d, %d pixels" % [int(m.get("left", 0)), int(m.get("top", 0)), int(m.get("right", 0)), int(m.get("bottom", 0))]) if not m.is_empty() else "detected"))
	next_line("it goes into the game's %s folder." % k[3])
	big("Put it in the game", func(): go_step(3))
	buttons([W.ghost("Do it again with the Advanced settings", func(): _make(app.backend.out_dir(k[3]), func(): show_step()))])

func _in_game() -> void:
	if game_card():
		return
	var k := _kind_row()
	if not state.get("in_game", false):
		_result_picture()
		headline("Put it in the game")
		words("The files go into the game's %s folder." % k[3])
		next_line("the game is told to look.")
		big("Put it in the game", func(): _make(app.backend.game_dir.path_join("art").path_join(k[3]), func(): import_game(func(): state["in_game"] = true; show_step())))
		return
	_result_picture()
	in_game_step("It is in the game's %s folder." % k[3], ["--cls", "miasmancer"], kind + "_" + uname)
