extends "res://scripts/screen.gd"
## Home: the Describe-it bar and the nine tiles. Like a game's menu: pick what you want to make.

const TILES := [
	["character", "Make a character", "a painting becomes a hero that walks in 8 directions"],
	["object", "Make an object", "a barrel, a tree, a banner, with a footprint"],
	["spell", "Make a spell or effect", "missiles, novas, walls, bursts, armour"],
	["tiles", "Make tiles and ground", "a texture becomes iso ground with edges"],
	["ui", "Make icons, portraits and UI", "inventory icons, a portrait, a frame"],
	["sound", "Make sounds and music", "the score and the small sounds"],
	["fix", "Fix up a picture", "recolour, glow, erase, restore"],
	["play", "Play the game", "see it all in Godmarrow"],
	["settings", "Settings", "window, sounds, Blender, folders"],
]

var describe: LineEdit
var make_btn: Button

func build() -> void:
	set_title("PIXELFORGE")
	header.get_node("Back").visible = false
	var sub := W.label("what would you like to make?", "Italic")
	header.add_child(sub)
	header.move_child(sub, 2)
	# the Describe-it bar
	var bar := W.row(6)
	describe = LineEdit.new()
	describe.placeholder_text = "Describe it in plain words: a wisp lantern spell, pale blue, slow, with embers"
	describe.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	describe.text_submitted.connect(func(_t): _describe())
	bar.add_child(describe)
	make_btn = W.primary("Make it", _describe)
	bar.add_child(make_btn)
	body.add_child(bar)
	# the tiles
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 6)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(grid)
	var first: Button = null
	for t in TILES:
		var key: String = t[0]
		var b := W.tile(t[1], t[2], FT.tex("res://assets/pics/%s.png" % key), func(): app.go(key))
		grid.add_child(b)
		if first == null:
			first = b
	first_focus = first
	hint("Drop a painting on any tile to start with it  ·  Esc goes back  ·  F11 window")
	if args.has("describe"):
		describe.text = String(args["describe"])
		if args.has("go"):
			call_deferred("_describe")

## the classifier: say what you want, the right quest opens with a draft
func _describe() -> void:
	var text := describe.text.strip_edges()
	if text == "":
		describe.grab_focus()
		return
	if not app.backend.python_ok():
		app.say("Python was not found; see Settings.")
		return
	make_btn.disabled = true
	make_btn.text = "Reading…"
	app.backend.run(["describe", text], "describe", Callable(), _described.bind(text))

func _described(r: Dictionary, text: String) -> void:
	make_btn.disabled = false
	make_btn.text = "Make it"
	if not r.get("ok", true) and not r.has("what"):
		app.say(String(r.get("error", "Could not read that.")))
		return
	var what := String(r.get("what", "spell"))
	var a := {"describe": text, "draft": r}
	var screen: String = {"spell": "spell", "skin": "fix", "music": "sound", "prompt": "character"}.get(what, "spell")
	app.go(screen, a)

func on_drop(paths: PackedStringArray) -> void:
	# a painting dropped on Home: a wide picture is a turnaround sheet (a character); a tall one an object
	if paths.is_empty():
		return
	var img := Image.load_from_file(paths[0])
	if img == null:
		app.say("That is not a picture the Forge can read.")
		return
	var wide := img.get_width() >= img.get_height() * 1.6
	app.go("character" if wide else "object", {"drop": paths[0]})
