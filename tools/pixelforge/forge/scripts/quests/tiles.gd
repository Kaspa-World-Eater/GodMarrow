extends "res://scripts/quest.gd"
## Make tiles and ground: a painted texture becomes 2:1 iso diamonds with variants and the 16 edge tiles toward a
## second material, plus the TileSet the game loads.

const STEPS := ["Painting", "Tiles", "In the game"]

var tname := ""
var result := {}

func _init() -> void:
	quest_title = "Make tiles and ground"
	steps = STEPS

func begin() -> void:
	if args.has("drop"):
		state["painting"] = String(args["drop"])

func build_step(i: int) -> void:
	match i:
		0: _painting()
		1: _tiles()
		2: _in_game()

func _painting() -> void:
	picture(W.drop_zone("Drop a ground texture here", "Choose a texture", func(): app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; Pictures"]), _dropped)))
	headline("Start with a painted texture")
	words("A square of ground seen from above: grass, mud, ash, stone. It is made seamless and cut into iso diamonds, with six variants so the ground does not repeat.")
	prompt_card()
	next_line("you see the tiles, then put them in the game.")
	var second := String(state.get("second", ""))
	var sb := W.button("Second texture for the edges: " + ("chosen" if second != "" else "none"), "", func():
		app.choose_file(PackedStringArray(["*.png, *.jpg, *.jpeg, *.webp ; Pictures"]), func(p): state["second"] = p; show_step(), "Choose the second texture"))
	right.add_child(sb)
	advanced([
		{"key": "name", "label": "Name", "type": "text", "default": "", "hint": "blank = the file's name"},
		{"key": "variants", "label": "Variants", "type": "int", "default": 6},
		{"key": "tile", "label": "Tile size", "type": "text", "default": "72 36", "hint": "width height, the game's is 72 by 36"},
		{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0},
		{"key": "seed", "label": "Seed", "type": "int", "default": 1},
	])
	if state.has("painting") and not state.get("started", false):
		state["started"] = true
		call_deferred("_dropped", state["painting"])

func on_drop(paths: PackedStringArray) -> void:
	if step == 0 and not paths.is_empty():
		if state.has("painting") and state.get("second", "") == "" and paths[0] != state["painting"]:
			state["second"] = paths[0]
			show_step()
			return
		_dropped(paths[0])

func _dropped(path: String) -> void:
	state["painting"] = path
	var img := Image.load_from_file(path)
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	picture(W.picture(ImageTexture.create_from_image(img)))
	var want := String(adv.get("name", "")).strip_edges()
	tname = W.slug(want if want != "" else path.get_file().get_basename())
	ensure_project(func(): _make(app.backend.out_dir("tiles"), func(): mark_done(0); mark_done(1); go_step(1)))

func _args(out: String) -> Array:
	var a: Array = ["tiles", state["painting"], tname, "-o", out] + flag("variants", "--variants", 6) + flag("colors", "--colors", 0) + flag("seed", "--seed", 1)
	var wh := str(adv.get("tile", "72 36")).split(" ", false)
	if wh.size() == 2 and (wh[0] != "72" or wh[1] != "36"):
		a += ["--tile", wh[0], wh[1]]
	if String(state.get("second", "")) != "":
		a += ["--second", state["second"]]
	return a

func _make(out: String, cb: Callable) -> void:
	run(_args(out), "tiles", func(r: Dictionary):
		result = r
		cb.call())

## the strip is thousands of pixels wide: show the first tiles and a patch laid as ground
func _result_picture() -> void:
	var png := String(result.get("png", ""))
	var img := Image.load_from_file(png) if png != "" else null
	if img == null:
		picture(W.label("(no tiles yet)", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		return
	var tile: Array = result.get("tile", [72, 36])
	var tw := int(tile[0])
	var th := int(tile[1])
	var n := int(result.get("tiles", 1))
	var variants := int(adv.get("variants", 6))
	# a patch 4 by 4 of the variants, then the first edge tiles in a row under it
	var patch := Image.create(tw * 4 + tw, th * 4 + th * 2 + 4, false, Image.FORMAT_RGBA8)
	patch.fill(Color(0, 0, 0, 0))
	var k := 0
	for gy in 4:
		for gx in 4:
			var i := k % maxi(variants, 1)
			k += 1
			var px := (gx - gy) * tw / 2 + tw * 2
			var py := (gx + gy) * th / 2
			patch.blend_rect(img, Rect2i(i * tw, 0, tw, th), Vector2i(px, py))
	for j in mini(5, n - variants):
		patch.blend_rect(img, Rect2i((variants + j) * tw, 0, tw, th), Vector2i(j * tw, th * 4 + th + 2))
	picture(W.picture(ImageTexture.create_from_image(patch)))

func _tiles() -> void:
	_result_picture()
	headline(W.pretty(tname) + " is ground")
	words("%d tiles: %d variants of the ground and the edge tiles toward %s. The game's tile set file is written next to them." % [int(result.get("tiles", 0)), int(adv.get("variants", 6)), "the second texture" if String(state.get("second", "")) != "" else "a plain edge"])
	next_line("the tiles go into the game's tiles folder.")
	big("Put it in the game", func(): go_step(2))
	buttons([W.ghost("Cut them again with the Advanced settings", func(): _make(app.backend.out_dir("tiles"), func(): show_step()))])
	advanced([
		{"key": "variants", "label": "Variants", "type": "int", "default": 6},
		{"key": "tile", "label": "Tile size", "type": "text", "default": "72 36"},
		{"key": "colors", "label": "Colours to keep", "type": "int", "default": 0},
		{"key": "seed", "label": "Seed", "type": "int", "default": 1},
	])

func _in_game() -> void:
	if game_card():
		return
	if not state.get("in_game", false):
		_result_picture()
		headline("Put " + W.pretty(tname) + " in the game")
		words("The tiles and their set go into the game's tiles folder as \"" + tname + "\". The world builder lays them.")
		next_line("the game is told to look.")
		big("Put it in the game", func(): _make(app.backend.game_dir.path_join("art").path_join("tiles"), func(): import_game(func(): state["in_game"] = true; show_step())))
		return
	_result_picture()
	in_game_step(W.pretty(tname) + " is in the game's tiles as \"" + tname + "\". The world builder lays it; the moor keeps its own ground until then.", ["--cls", "miasmancer"], tname)
