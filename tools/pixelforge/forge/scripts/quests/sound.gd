extends "res://scripts/quest.gd"
## Make sounds and music: the score's cues (pick one, hear it, try another tune, keep it) and the synthesised
## sound effects. Nothing is sampled; every note is generated.

const STEPS := ["Kind", "Pick", "Listen", "In the game"]
const MODES := ["aeol", "dor", "phr", "hij", "mixo", "ion"]

var kind := ""
var cue := ""
var cues: Array = []
var result := {}
var player: AudioStreamPlayer
var seed_n := -1
var sfx_files: Array = []

func _init() -> void:
	quest_title = "Make sounds and music"
	steps = STEPS

func begin() -> void:
	player = AudioStreamPlayer.new()
	add_child(player)
	if args.has("draft") and args["draft"].get("what", "") == "music":
		kind = "music"
		cue = String(args["draft"].get("cue", "a1_wild"))
		state["knobs"] = args["draft"].get("knobs", {})
		step = 2
		state["auto"] = true
	if args.has("kind"):
		kind = String(args["kind"])
		step = 1
	if args.has("cue"):
		kind = "music"
		cue = String(args["cue"])
		step = 2
		state["auto"] = true
	if args.has("silent"):
		state["silent"] = true

func build_step(i: int) -> void:
	match i:
		0: _kind()
		1: _pick()
		2: _listen()
		3: _in_game()

func _kind() -> void:
	picture(W.picture(FT.tex("res://assets/pics/sound.png")))
	headline("Music, or sounds?")
	var m := W.button("Music: the score", "Tile", func(): kind = "music"; mark_done(0); go_step(1))
	m.custom_minimum_size = Vector2(0, 34)
	right.add_child(m)
	words("A looping cue for every act's camp, wilds and depths, the bosses and the title. Pick one, hear it, try another tune for the same place.", "Small")
	var s := W.button("Sound effects", "Tile", func(): kind = "sfx"; mark_done(0); mark_done(1); go_step(2))
	s.custom_minimum_size = Vector2(0, 34)
	right.add_child(s)
	words("Eighteen small sounds: a hit, a bone click, a pour, glass, a cast, a wisp, a coin. Hear each; keep them all.", "Small")
	first_focus = m

func _pick() -> void:
	if kind == "sfx":
		go_step(2)
		return
	if cues.is_empty():
		picture(W.label("reading the score…", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		headline("The score")
		run(["music", "list"], "music list", func(r: Dictionary):
			cues = r.get("cues", [])
			show_step())
		return
	var sc := ScrollContainer.new()
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var v := W.col(2)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var first: Button = null
	for c in cues:
		var key := String(c["key"])
		var b := W.button("%s  ·  %s" % [String(c.get("title", key)), String(c.get("description", ""))], "Chip", func(): cue = key; seed_n = -1; mark_done(1); _make(app.backend.out_dir("music"), func(): go_step(2)))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.clip_text = true
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.tooltip_text = "act %d, %s" % [int(c.get("act", 0)), String(c.get("place", ""))]
		v.add_child(b)
		if first == null:
			first = b
	sc.add_child(v)
	picture(sc)
	first_focus = first
	headline("Pick a place")
	words("Every cue is a place in the game. Picking one renders a short version to hear (a few seconds of work).")
	next_line("you hear it, and can ask for another tune for the same place.")
	advanced([{"key": "seconds", "label": "Seconds to hear", "type": "float", "default": 20.0}])

func _args(out: String, for_game: bool) -> Array:
	var a: Array = ["music", cue, "-o", out]
	if for_game:
		a += ["--seconds", "120", "--format", "ogg"]
	else:
		a += ["--seconds", str(adv.get("seconds", 20.0))]
	if seed_n >= 0:
		a += ["--seed", str(seed_n)]
	for k in ["bpm", "root", "sc"]:
		if str(adv.get(k, "")).strip_edges() != "":
			a += ["--set", "%s=%s" % [k, str(adv[k])]]
	var knobs: Dictionary = state.get("knobs", {})
	for k in knobs:
		if not adv.has(k) or str(adv.get(k, "")) == "":
			a += ["--set", "%s=%s" % [k, str(knobs[k])]]
	return a

func _make(out: String, cb: Callable) -> void:
	run(_args(out, false), "music", func(r: Dictionary):
		result = r
		cb.call())

func _wav() -> String:
	for f in result.get("files", []):
		if String(f).ends_with(".wav"):
			return String(f)
	return ""

func _play(path: String, loop: bool = true) -> void:
	player.stop()
	if path == "" or not FileAccess.file_exists(path):
		return
	var s := AudioStreamWAV.load_from_file(path)
	if s == null:
		app.say("Could not play that file.")
		return
	if loop:
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_end = s.data.size() / (2 if s.format == AudioStreamWAV.FORMAT_16_BITS else 1) / (2 if s.stereo else 1)
	player.stream = s
	player.volume_db = -6.0
	player.play()

func _listen() -> void:
	if kind == "sfx":
		_listen_sfx()
		return
	if state.get("auto", false) and result.is_empty():
		picture(W.label("rendering…", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		headline(W.pretty(cue))
		if cues.is_empty():
			run(["music", "list"], "music list", func(r: Dictionary):
				cues = r.get("cues", [])
				show_step())
			return
		_make(app.backend.out_dir("music"), func(): mark_done(0); mark_done(1); show_step())
		return
	var png := ""
	for f in result.get("files", []):
		if String(f).ends_with(".png"):
			png = String(f)
	if png != "":
		picture_file(png)
	else:
		picture(W.picture(FT.tex("res://assets/pics/sound.png")))
	mark_done(2)
	var title := W.pretty(cue)
	for c in cues:
		if String(c["key"]) == cue:
			title = String(c.get("title", cue))
	headline(title)
	words("Playing. The picture is its waveform and spectrogram. Another tune keeps the place and the mood and rolls new notes.")
	next_line("the full two-minute loop goes into the game's music, where that place plays it.")
	var wav := _wav()
	if wav != "" and not state.get("silent", false):
		_play(wav)
	big("Keep it: put it in the game", func(): player.stop(); go_step(3))
	buttons([
		W.button("Another tune", "", func(): seed_n = (seed_n + 1) if seed_n >= 0 else 2; _make(app.backend.out_dir("music"), func(): show_step())),
		W.ghost("Play again", func(): _play(_wav())),
		W.ghost("Quiet", func(): player.stop()),
	])
	advanced([
		{"key": "seconds", "label": "Seconds to hear", "type": "float", "default": 20.0},
		{"key": "bpm", "label": "Tempo", "type": "text", "default": "", "hint": "beats a minute, blank = the cue's"},
		{"key": "root", "label": "Key", "type": "text", "default": "", "hint": "a note number, 45 is A"},
		{"key": "sc", "label": "Mode", "type": "choice", "default": "", "choices": ["", "aeol", "dor", "phr", "hij", "mixo", "ion"], "hint": "phr darker, hij eastern"},
	], "The cue's knobs, as the command line takes them (music --set).")

func _listen_sfx() -> void:
	if sfx_files.is_empty():
		picture(W.label("making the sounds…", "Dim", HORIZONTAL_ALIGNMENT_CENTER))
		headline("Sound effects")
		run(["sfx", "all", "-o", app.backend.out_dir("sfx")], "sfx", func(r: Dictionary):
			sfx_files = r.get("files", [])
			show_step())
		return
	var f := HFlowContainer.new()
	f.add_theme_constant_override("h_separation", 4)
	f.add_theme_constant_override("v_separation", 4)
	var first: Button = null
	for p in sfx_files:
		var path := String(p)
		if not path.ends_with(".wav"):
			continue
		var b := W.chip(W.pretty(path.get_file().get_basename()), false, func(): _play(path, false))
		b.focus_mode = Control.FOCUS_ALL
		f.add_child(b)
		if first == null:
			first = b
	picture(f)
	first_focus = first
	mark_done(2)
	headline("%d sounds" % sfx_files.size())
	words("Click one to hear it. Each is synthesised from noise and a few tones, so no two are quite alike.")
	next_line("they all go into the game's sounds folder.")
	big("Keep them: put them in the game", func(): go_step(3))
	advanced([{"key": "variations", "label": "Takes of each", "type": "int", "default": 1}])

func _in_game() -> void:
	if game_card():
		return
	if not state.get("in_game", false):
		if kind == "sfx":
			headline("Put the sounds in the game")
			words("The sounds go into the game's sounds folder.")
			big("Put them in the game", func():
				run(["sfx", "all", "-o", app.backend.game_dir.path_join("art").path_join("sfx")] + flag("variations", "--variations", 1), "sfx to game", func(_r): import_game(func(): state["in_game"] = true; show_step())))
			return
		headline("Put " + W.pretty(cue) + " in the game")
		words("The full two-minute loop is rendered (a minute or two of work) into the game's music, where that place plays it.")
		next_line("the game is told to look.")
		big("Put it in the game", func():
			run(_args(app.backend.game_dir.path_join("audio").path_join("music"), true), "music to game", func(_r): import_game(func(): state["in_game"] = true; show_step())))
		return
	if kind == "sfx":
		in_game_step("The sounds are in the game's sounds folder.", ["--cls", "miasmancer"], "sfx")
	else:
		in_game_step(W.pretty(cue) + " is in the game's music; its place plays it.", ["--cls", "miasmancer"], cue)

func _exit_tree() -> void:
	if player:
		player.stop()
