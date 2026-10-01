extends "res://scripts/screen.gd"
## Play the game: starts Godmarrow in its own window.

func build() -> void:
	set_title("Play the game")
	var cols := two_columns("Dark")
	var left: PanelContainer = cols["left"]
	var right: VBoxContainer = cols["right"]
	left.add_child(W.picture(FT.tex("res://assets/pics/play_big.png")))
	right.add_child(W.label("Godmarrow", "Big"))
	right.add_child(W.label("The game opens in its own window with everything the Forge has put in it. Close it to come back here.", "", HORIZONTAL_ALIGNMENT_LEFT, true))
	if not app.backend.game_ok():
		right.add_child(W.card("The game folder was not found", "Settings lets you choose the folder with the game (the one with project.godot).",
			[W.button("Open Settings", "", func(): app.go("settings"))]))
	else:
		var b := W.primary("Start the game", _play)
		right.add_child(b)
		first_focus = b
		right.add_child(W.label("What happens next: Godot starts the game. The first start can take a minute.", "Italic", HORIZONTAL_ALIGNMENT_LEFT, true))
		var fold := W.fold("Advanced")
		fold.body.add_child(W.label("Start on the moor with a hero straight away (the game's own test start):", "Small", HORIZONTAL_ALIGNMENT_LEFT, true))
		var r := W.row(6)
		for cls in ["animancer", "miasmancer", "ossumancer", "monk"]:
			r.add_child(W.chip(W.pretty(cls), false, func(): _preview(cls)))
		fold.body.add_child(r)
		right.add_child(fold)
	hint("Esc goes back")

func _play() -> void:
	app.backend.run(["game-preview", "--play", "--game", app.backend.game_dir] + (["--godot", app.backend.godot] if app.backend.godot != "" else []), "play", Callable(), func(r: Dictionary):
		app.say("The game is starting." if r.get("ok", false) else String(r.get("error", "The game could not start.")), 4.0))

func _preview(cls: String) -> void:
	app.backend.run(["game-preview", "--cls", cls, "--game", app.backend.game_dir] + (["--godot", app.backend.godot] if app.backend.godot != "" else []), "preview", Callable(), func(r: Dictionary):
		app.say("The game is starting on the moor." if r.get("ok", false) else String(r.get("error", "The game could not start.")), 4.0))
