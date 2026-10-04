extends "res://scripts/screen.gd"
## Music: the music editor. A song (tempo, key, scale lock, six lanes, patterns of 16-step bars, chained sections)
## lives in the project's music folder as current.song.json; every change is one `pixelforge music edit` operation,
## every sound one `pixelforge music play-bar` or `render`, so an assistant does exactly what the person does. The
## picture window holds the canvas (scripts/music_canvas.gd): the grid and piano roll, the tracks, the song's
## sections. Tabs: Tracks (lane, instrument, level, tone, pan, mute, solo), Pattern (the grid: notes by click and
## by keyboard, copy, paste, transpose, reverse, double, halve, humanise, quantise, generate), Song (tempo, key,
## scale, sections, the sound), Library (premade pieces by genre, compose a new one from genre and seed), Export
## (Keep as a game cue, save the song, WAV/OGG).

const Canvas := preload("res://scripts/music_canvas.gd")
const LANES := ["lead", "counter", "pad", "bass", "sparkle", "drums"]
const LOOPS := ["bar", "pattern", "section", "song"]
const NOTE_NAMES := ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const LENGTHS := [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0, 16.0]
const DRUM_NUMBERS := [36, 38, 37, 39, 42, 46, 41, 45, 48, 49, 51]
const DEFAULT_PIECE := "forge_home"

var canvas: Canvas
var player: AudioStreamPlayer
var table := {}                 # from `music list`: pieces, genres, moods, instruments, scales, scale_intervals, drums
var pending_ops: Array = []
var edit_job = null
var render_job = null
var dirty_audio := false
var clip_mode := ""             # what the player holds: bar | pattern | section | song
var clip_bars := 1
var clip_start_bar := 0         # for section / song: the absolute bar the clip starts at
var clip_seconds := 0.0
var grid_focus := false
var name_edit: LineEdit = null
var instruments: Array = []     # names, melodic
var kits: Array = []            # names, drums

func build() -> void:
	tabs = PackedStringArray(["Tracks", "Pattern", "Song", "Library", "Export"])
	hint_text = "Space plays · G the grid · Esc back"
	if state.is_empty():
		state = {"song": {}, "path": "", "pattern": "", "bar": 0, "lane": "lead", "section": 0, "step": 0, "pitch": 73, "length": 2.0, "vel": 0.8,
				 "loop": "bar", "genre": "all", "mood": "dark", "seed": 7, "name": "", "clipboard": [], "exported": "", "humanise": 0.4, "live": true, "piece": ""}
	player = AudioStreamPlayer.new()
	add_child(player)
	canvas = Canvas.new()
	canvas.app = app
	canvas.size = app.scene.size
	canvas.on_cell = _cell_clicked
	canvas.on_lane = _lane_clicked
	canvas.on_section = _section_clicked
	canvas.on_focus = func(): _set_grid_focus(true)
	app.scene.show_text(PackedStringArray([]), "music")
	app.scene.add_child(canvas)
	tab_from_args()
	if args.has("draft") and args["draft"] is Dictionary and String(args["draft"].get("what", "")) == "music":
		state["piece"] = String(args["draft"].get("piece", ""))
	rebuild()
	if not app.backend.python_ok():
		app.say("PixelForge's Python was not found; see Settings.")
		return
	app.backend.run(["music", "list"], "the music table", func(r: Dictionary):
		if not is_inside_tree():
			return
		if r.get("ok", false):
			table = r
			instruments = []
			kits = []
			for it in r.get("instruments", []):
				if it.get("drums", false):
					kits.append(String(it["name"]))
				else:
					instruments.append(String(it["name"]))
		rebuild())
	_open_first()

## the song to start on: --song=FILE, --library=NAME, the folder's current song, else the Forge's theme
func _open_first() -> void:
	var cur := music_dir().path_join("current.song.json")
	if args.has("song") and FileAccess.file_exists(String(args["song"])):
		app.backend.copy_file(String(args["song"]), cur)
		_load_file(cur)
	elif args.has("library") or String(state.get("piece", "")) != "":
		_load_library(String(args.get("library", state.get("piece", DEFAULT_PIECE))), false)
	elif FileAccess.file_exists(cur):
		_load_file(cur)
	else:
		_load_library(DEFAULT_PIECE, false)

func music_dir() -> String:
	return app.backend.out_dir("music")

func song() -> Dictionary:
	return state["song"]

func has_song() -> bool:
	return not state["song"].is_empty()

func pat_name() -> String:
	var s := song()
	if s.is_empty():
		return ""
	if not s["patterns"].has(state["pattern"]):
		state["pattern"] = s["patterns"].keys()[0]
	return String(state["pattern"])

func pat() -> Dictionary:
	return song()["patterns"][pat_name()]

func lane_info(ln: String) -> Dictionary:
	return song()["lanes"][ln]

func key_text() -> String:
	var s := song()
	return "%s %s" % [NOTE_NAMES[int(s["root"])], String(s["scale"]).replace("_", " ")]

func _load_file(path: String) -> void:
	var d := app.backend.read_json(path)
	if d.is_empty():
		app.say("The song file could not be read.")
		return
	state["path"] = path
	state["song"] = d
	# start on the first section whose pattern has a tune (an intro without the lead is a poor first sight)
	state["pattern"] = d["patterns"].keys()[0]
	state["section"] = 0
	for i in d["sections"].size():
		var pn: String = d["sections"][i]["pattern"]
		if not (d["patterns"][pn]["notes"].get("lead", []) as Array).is_empty() or i == d["sections"].size() - 1:
			state["pattern"] = pn
			state["section"] = i
			break
	state["bar"] = 0
	if String(state["name"]) == "":
		state["name"] = slug(String(d.get("title", "song")))
	_clamp_cursor()
	canvas.set_song(d)
	_sync_canvas()
	canvas.centre_roll()
	rebuild()

func _load_library(name: String, say: bool = true) -> void:
	var cur := music_dir().path_join("current.song.json")
	run(["music", "load", name, "-o", cur], "loading %s" % name, func(r: Dictionary):
		if r.get("ok", false):
			state["name"] = name
			_load_file(cur)
			if say:
				app.say("%s is on the bench." % String(r.get("title", name)))
			if player.playing:
				dirty_audio = true
				_render_current(), false)

# ------------------------------------------------------------------ the tabs
func build_tab(i: int) -> void:
	if not has_song():
		state_line("Music · the song is loading")
		add_spacer()
		add_choices(standard_choices([], false))
		return
	match i:
		0:
			_tracks_tab()
		1:
			_pattern_tab()
		2:
			_song_tab()
		3:
			_library_tab()
		_:
			_export_tab()
	_sync_canvas()

func on_tab() -> void:
	_set_grid_focus(false)

func _sync_canvas() -> void:
	if canvas == null or not has_song():
		return
	canvas.set_song(song())
	canvas.mode = ["tracks", "pattern", "song", "card", "card"][tab]
	canvas.pattern = pat_name()
	canvas.bar = int(state["bar"])
	canvas.lane = String(state["lane"])
	canvas.cursor_step = int(state["step"])
	canvas.cursor_pitch = int(state["pitch"])
	canvas.section = int(state["section"])
	canvas.grid_focus = grid_focus
	canvas.scale_steps = _scale_steps()
	if tab == 3:
		_library_card()
	elif tab == 4:
		_export_card()
	canvas.keep_cursor_visible()
	canvas.visible = not (tab == 4 and app.scene.mode == "picture")
	canvas.queue_redraw()

func _scale_steps() -> Array:
	var si: Dictionary = table.get("scale_intervals", {})
	var sc := String(song().get("scale", "minor"))
	if si.has(sc):
		return si[sc]
	if sc == "minor":
		return [0, 2, 3, 5, 7, 8, 10]
	if sc == "major":
		return [0, 2, 4, 5, 7, 9, 11]
	return []

func _tracks_tab() -> void:
	var ln := String(state["lane"])
	var li := lane_info(ln)
	state_line("Tracks · %s · %s · %s · %d bpm · lane %s: %s" % [String(song().get("title", "")), key_text(), "scale lock on" if song().get("scale_lock", true) else "free notes", int(song()["tempo"]), ln, String(li["instrument"]).replace("_", " ")])
	var inst := String(li["instrument"])
	var pool: Array = kits if ln == "drums" else instruments
	add_cyclers([
		{"label": "lane", "value": ln, "left": func(): _pick_lane(-1), "right": func(): _pick_lane(1)},
		{"label": "instrument", "value": inst.replace("_", " "), "left": func(): _cycle_instrument(pool, inst, -1), "right": func(): _cycle_instrument(pool, inst, 1)},
		{"label": "loop", "value": String(state["loop"]), "left": func(): _cycle_loop(-1), "right": func(): _cycle_loop(1)},
	])
	var controls := []
	var lv := W.Lever.new()
	lv.init("level", float(li["volume"]), 0.8, func(v): return "%d" % int(round(v * 100)), Callable(), func(v): _lane_set("volume", snappedf(v, 0.01)))
	var lt := W.Lever.new()
	lt.init("tone", float(li["tone"]), 0.5, func(v): return "%d" % int(round(v * 100)), Callable(), func(v): _lane_set("tone", snappedf(v, 0.01)))
	var lp := W.Lever.new()
	lp.init("pan", (float(li["pan"]) + 1.0) / 2.0, 0.5, func(v): return _pan_text(v * 2.0 - 1.0), Callable(), func(v): _lane_set("pan", snappedf(v * 2.0 - 1.0, 0.05)))
	var pm := W.Pull.new()
	pm.init_pull("mute", bool(li.get("mute", false)), false, Callable(), func(on): _op({"op": "mute", "lane": ln, "on": on}, func(): lane_info(ln)["mute"] = on))
	var ps := W.Pull.new()
	ps.init_pull("solo", bool(li.get("solo", false)), false, Callable(), func(on): _op({"op": "solo", "lane": ln, "on": on}, func(): lane_info(ln)["solo"] = on))
	controls.append_array([lv, lt, lp, pm, ps])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play", "cb": _play_or_stop}, {"label": "Hear lane", "cb": _audition_lane},
		{"label": "Generate lane", "cb": _generate_lane}, {"label": "Clear lane", "cb": func(): _op({"op": "clear", "pattern": pat_name(), "lane": ln}, func(): pat()["notes"][ln] = [])}], false))

static func _pan_text(p: float) -> String:
	if absf(p) < 0.03:
		return "centre"
	return ("L %d" if p < 0 else "R %d") % int(round(absf(p) * 100))

func _pattern_tab() -> void:
	var ln := String(state["lane"])
	var p := pat()
	var notes_here := canvas.notes_in_bar(ln).size()
	state_line("Pattern %s · bar %d/%d · %s: %s · %d notes · %s%s" % [pat_name(), int(state["bar"]) + 1, int(p["bars"]), ln, String(lane_info(ln)["instrument"]).replace("_", " "), notes_here, key_text(), " locked" if song().get("scale_lock", true) else ", any note"])
	var pitch_text := canvas.drum_name(int(state["pitch"])) if ln == "drums" else Canvas.note_name(int(state["pitch"]))
	add_cyclers([
		{"label": "pattern", "value": pat_name(), "left": func(): _pick_pattern(-1), "right": func(): _pick_pattern(1)},
		{"label": "bar", "value": str(int(state["bar"]) + 1), "left": func(): _set_bar(int(state["bar"]) - 1), "right": func(): _set_bar(int(state["bar"]) + 1)},
		{"label": "lane", "value": ln, "left": func(): _pick_lane(-1), "right": func(): _pick_lane(1)},
		{"label": "note", "value": pitch_text, "left": func(): _move_pitch(-1), "right": func(): _move_pitch(1)},
		{"label": "length", "value": _len_text(float(state["length"])), "left": func(): _cycle_length(-1), "right": func(): _cycle_length(1)},
		{"label": "velocity", "value": str(int(round(float(state["vel"]) * 100))), "left": func(): _set_vel(float(state["vel"]) - 0.1), "right": func(): _set_vel(float(state["vel"]) + 0.1)},
		{"label": "lock", "value": "on" if song().get("scale_lock", true) else "off", "left": _toggle_lock, "right": _toggle_lock},
		{"label": "loop", "value": String(state["loop"]), "left": func(): _cycle_loop(-1), "right": func(): _cycle_loop(1)},
	])
	var pn := pat_name()
	var bar := int(state["bar"])
	var ops := W.Choices.new()
	ops.font_size = T.SMALL_SIZE
	ops.arrow_gap = 12
	ops.flow = true
	ops.flow_gap = 6
	ops.wrap_width = App.TEXTBOX.size.x - 16
	ops.setup([
		{"label": "Place", "cb": func(): _toggle_note(int(state["step"]), int(state["pitch"]))},
		{"label": "Copy bar", "cb": _copy_bar}, {"label": "Paste bar", "cb": _paste_bar},
		{"label": "Up", "cb": func(): _op({"op": "transpose", "pattern": pn, "lane": ln, "semitones": 1, "in_scale": true, "bar": bar})},
		{"label": "Down", "cb": func(): _op({"op": "transpose", "pattern": pn, "lane": ln, "semitones": -1, "in_scale": true, "bar": bar})},
		{"label": "Octave +", "cb": func(): _op({"op": "transpose", "pattern": pn, "lane": ln, "semitones": 12, "bar": bar})},
		{"label": "Octave -", "cb": func(): _op({"op": "transpose", "pattern": pn, "lane": ln, "semitones": -12, "bar": bar})},
		{"label": "Reverse", "cb": func(): _op({"op": "reverse", "pattern": pn, "lane": ln, "bar": bar})},
		{"label": "Double", "cb": func(): _op({"op": "double", "pattern": pn, "lane": ln})},
		{"label": "Halve", "cb": func(): _op({"op": "halve", "pattern": pn, "lane": ln})},
		{"label": "Humanise", "cb": func(): _op({"op": "humanise", "pattern": pn, "lane": ln, "amount": float(state["humanise"]), "seed": int(state["seed"]), "bar": bar})},
		{"label": "Quantise", "cb": func(): _op({"op": "quantise", "pattern": pn, "lane": ln, "bar": bar})},
		{"label": "Clear bar", "cb": func(): _op({"op": "clear", "pattern": pn, "lane": ln, "bar": bar}, func(): _local_clear(ln, bar))},
		{"label": "Generate bar", "cb": func(): _op({"op": "generate_bar", "pattern": pn, "bar": bar, "seed": _dice_seed()})},
		{"label": "Generate lane", "cb": _generate_lane},
		{"label": "Add pattern", "cb": func(): _op({"op": "pattern_add", "copy_of": pn, "add_section": true})},
	], 1, app)
	ops.row_h = 13
	add_extra(ops)
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play", "cb": _play_or_stop}, {"label": "Grid", "cb": func(): _set_grid_focus(true)}], false))

func _song_tab() -> void:
	var s := song()
	var si := clampi(int(state["section"]), 0, s["sections"].size() - 1)
	state["section"] = si
	var sec: Dictionary = s["sections"][si]
	var total := _total_bars()
	var tr := int(sec["transpose"])
	state_line("Song · %s · %s · %d bpm · %d parts, %d bars (%s) · part %d: %s x%d%s" % [String(s.get("title", "")), key_text(), int(s["tempo"]), s["sections"].size(), total, _mmss(total), si + 1, String(sec["pattern"]), int(sec["repeat"]), (" %+d" % tr) if tr != 0 else ""])
	var pats: Array = s["patterns"].keys()
	var cur_pat := String(sec["pattern"])
	var rep := int(sec["repeat"])
	var root := int(s["root"])
	add_cyclers([
		{"label": "part", "value": str(si + 1), "left": func(): _pick_section(-1), "right": func(): _pick_section(1)},
		{"label": "plays", "value": cur_pat, "left": func(): _op({"op": "section_set", "index": si, "pattern": _cycle(pats, cur_pat, -1)}), "right": func(): _op({"op": "section_set", "index": si, "pattern": _cycle(pats, cur_pat, 1)})},
		{"label": "x", "value": str(rep), "left": func(): _op({"op": "section_set", "index": si, "repeat": rep - 1}), "right": func(): _op({"op": "section_set", "index": si, "repeat": rep + 1})},
		{"label": "shift", "value": "%+d" % tr, "left": func(): _op({"op": "section_set", "index": si, "transpose": tr - 1}), "right": func(): _op({"op": "section_set", "index": si, "transpose": tr + 1})},
		{"label": "key", "value": NOTE_NAMES[root], "left": func(): _op({"op": "set_key", "root": posmod(root - 1, 12)}), "right": func(): _op({"op": "set_key", "root": posmod(root + 1, 12)})},
		{"label": "scale", "value": String(s["scale"]).replace("_", " "), "left": func(): _cycle_scale(-1), "right": func(): _cycle_scale(1)},
	])
	var fx: Dictionary = s["fx"]
	var controls := []
	var lt := W.Lever.new()
	lt.init("tempo", (float(s["tempo"]) - 40.0) / 160.0, (110.0 - 40.0) / 160.0, func(v): return "%d bpm" % int(round(40 + v * 160)), Callable(), func(v): _op({"op": "set_tempo", "tempo": round(40 + v * 160)}))
	var lc := W.Lever.new()
	lc.init("crunch", float(fx["crunch"]), 0.2, func(v): return T.fmt(v, 2), Callable(), func(v): _fx("crunch", snappedf(v, 0.01)))
	var lb := W.Lever.new()
	lb.init("bits", (float(fx["bits"]) - 4.0) / 12.0, 1.0, func(v): return "%d bits" % int(round(4 + v * 12)), Callable(), func(v): _fx("bits", int(round(4 + v * 12))))
	var le := W.Lever.new()
	le.init("echo", float(fx["echo"]), 0.25, func(v): return T.fmt(v, 2), Callable(), func(v): _fx("echo", snappedf(v, 0.01)))
	var lh := W.Lever.new()
	lh.init("hall", float(fx["reverb"]), 0.3, func(v): return T.fmt(v, 2), Callable(), func(v): _fx("reverb", snappedf(v, 0.01)))
	var lz := W.Lever.new()
	lz.init("hall size", (float(fx["reverb_size"]) - 0.3) / 3.7, (1.6 - 0.3) / 3.7, func(v): return "%s s" % T.fmt(0.3 + v * 3.7, 1), Callable(), func(v): _fx("reverb_size", snappedf(0.3 + v * 3.7, 0.1)))
	var lvx := W.Lever.new()
	lvx.init("voices", float(fx["voices"]) / 16.0, 0.5, func(v): return ("%d" % int(round(v * 16))) if v > 0.03 else "all", Callable(), func(v): _fx("voices", int(round(v * 16))))
	var lr := W.Pull.new()
	lr.init_pull("32 kHz", int(fx["rate"]) == 32000, true, Callable(), func(on): _fx("rate", 32000 if on else 44100))
	controls.append_array([lt, lc, lb, le, lh, lz, lvx, lr])
	add_rack(controls, 8)
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play part", "cb": func(): if player.playing: _stop() else: _play("section")},
		{"label": "Play all", "cb": func(): _play("song")},
		{"label": "Add part", "cb": func(): _op({"op": "section_add", "pattern": cur_pat, "at": si + 1})},
		{"label": "Remove", "cb": func(): _op({"op": "section_remove", "index": si}, func(): state["section"] = maxi(si - 1, 0))},
		{"label": "Left", "cb": func(): _move_section(si, -1)},
		{"label": "Right", "cb": func(): _move_section(si, 1)},
		{"label": "New pattern", "cb": func(): _op({"op": "pattern_add", "bars": 4, "add_section": true})}], false))

func _move_section(si: int, delta: int) -> void:
	var to := si + delta
	if to < 0 or to >= song()["sections"].size():
		return
	_op({"op": "section_move", "index": si, "to": to}, func(): state["section"] = to)

func _library_tab() -> void:
	var pieces: Array = table.get("pieces", [])
	var genre := String(state["genre"])
	var shown := []
	for p in pieces:
		if genre == "all" or String(p.get("genre", "")) == genre:
			shown.append(p)
	state_line("Library · %d pieces%s · each an editable song · Compose: a new one from genre, mood, seed" % [shown.size(), "" if genre == "all" else " of " + genre.replace("_", " ")])
	var genres := ["all"]
	for g in table.get("genres", []):
		genres.append(String(g["name"]))
	var moods: Array = table.get("moods", ["dark"])
	var mood := String(state["mood"])
	add_cyclers([
		{"label": "genre", "value": genre.replace("_", " "), "left": func(): _set_state("genre", _cycle(genres, genre, -1)), "right": func(): _set_state("genre", _cycle(genres, genre, 1))},
		{"label": "mood", "value": mood, "left": func(): _set_state("mood", _cycle(moods, mood, -1)), "right": func(): _set_state("mood", _cycle(moods, mood, 1))},
		{"label": "seed", "value": str(int(state["seed"])), "left": func(): _set_state("seed", maxi(int(state["seed"]) - 1, 1)), "right": func(): _set_state("seed", int(state["seed"]) + 1)},
	])
	var items := []
	for p in shown:
		var nm := String(p["name"])
		items.append({"label": String(p.get("title", nm)), "cb": func(): _load_library(nm), "dim": nm != String(state["name"])})
	if items.is_empty():
		items.append({"label": "the library is loading" if table.is_empty() else "no pieces of this genre", "cb": func(): pass})
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 8
	c.wrap_width = App.TEXTBOX.size.x - 16
	c.dim_unselected = true
	c.setup(items, 1, app)
	c.row_h = 13
	add_extra(c)
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play", "cb": _play_or_stop}, {"label": "Compose", "cb": _compose}, {"label": "Dice", "cb": _dice_compose}], false))

func _set_state(key: String, value) -> void:
	state[key] = value
	rebuild()

func _dice_compose() -> void:
	_dice_seed()
	_compose()

func _library_card() -> void:
	var s := song()
	canvas.card_title = "%s   %s   %d bpm   %d bars (%s)" % [String(s.get("title", "")), key_text(), int(s["tempo"]), _total_bars(), _mmss(_total_bars())]
	var lines: PackedStringArray = []
	if s.has("words"):
		lines.append(String(s["words"]))
	lines.append("genre %s, mood %s, seed %d" % [String(s.get("genre", "")).replace("_", " "), String(s.get("mood", "")), int(s.get("seed", 0))])
	var inst := []
	for ln in LANES:
		inst.append("%s: %s" % [ln, String(s["lanes"][ln]["instrument"]).replace("_", " ")])
	lines.append(", ".join(inst.slice(0, 3)))
	lines.append(", ".join(inst.slice(3)))
	var secs := []
	for sec in s["sections"]:
		secs.append("%s x%d%s" % [String(sec["pattern"]), int(sec["repeat"]), (" %+d" % int(sec["transpose"])) if int(sec["transpose"]) != 0 else ""])
	lines.append("sections: " + "  ".join(secs))
	var fx: Dictionary = s["fx"]
	lines.append("sound: %d Hz, %d bits, %d voices, crunch %.2f, echo %.2f, hall %.2f" % [int(fx["rate"]), int(fx["bits"]), int(fx["voices"]), float(fx["crunch"]), float(fx["echo"]), float(fx["reverb"])])
	lines.append("")
	lines.append("Enter on a name loads it onto the bench; Compose writes a new piece in the chosen genre, mood and seed.")
	canvas.card_lines = lines

func _export_tab() -> void:
	var s := song()
	var where := app.backend.game_dir.path_join("audio").path_join("music") if app.backend.game_ok() else "(no game folder set)"
	var nm := String(state["name"])
	state_line("Export · %s · %s · %d bpm · %d bars (%s) · Keep writes %s.ogg and %s.song.json into %s" % [String(s.get("title", "")), key_text(), int(s["tempo"]), _total_bars(), _mmss(_total_bars()), nm, nm, where], "", 2)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	var l := Label.new()
	l.text = "name:"
	l.theme_type_variation = "Dim"
	row.add_child(l)
	name_edit = LineEdit.new()
	name_edit.text = nm
	name_edit.placeholder_text = "the cue's name in the game, like a1_town or forge_home"
	name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_edit.text_changed.connect(func(t: String): state["name"] = slug(t) if t != "" else "")
	name_edit.text_submitted.connect(func(_t): name_edit.release_focus(); rebuild())
	name_edit.focus_entered.connect(func(): app.say_hint("type the name; Enter keeps it, Esc leaves the line"))
	name_edit.focus_exited.connect(func(): app.set_hint(hint_text))
	row.add_child(name_edit)
	rows.add_child(row)
	var t := Label.new()
	t.text = "a seamless loop at the game's loudness; the OGG is what the game plays, the WAV is for other tools"
	t.theme_type_variation = "SmallDim"
	t.clip_text = true
	rows.add_child(t)
	add_spacer()
	add_choices(standard_choices([{"label": "Stop" if player.playing else "Play whole", "cb": _play_whole_or_stop},
		{"label": "Save song", "cb": _save_song}, {"label": "WAV", "cb": func(): _export("wav")}, {"label": "OGG", "cb": func(): _export("ogg")},
		{"label": "Name", "cb": func(): if name_edit: name_edit.grab_focus()}], false))

func _play_whole_or_stop() -> void:
	if player.playing:
		_stop()
	else:
		_play("song")

func _export_card() -> void:
	var nm := String(state["name"])
	canvas.card_title = "%s   as %s" % [String(song().get("title", "")), nm]
	var lines: PackedStringArray = []
	lines.append("Keep: the loop into the game's audio/music as %s.ogg, with %s.song.json beside it so it can be edited again." % [nm, nm])
	lines.append("Save song: the song file alone, into the project's music folder.")
	lines.append("WAV / OGG: a render into the project's music folder; the picture shows its waveform and spectrogram.")
	if String(state["exported"]) != "":
		lines.append("")
		lines.append("last written: " + String(state["exported"]))
	canvas.card_lines = lines

# ------------------------------------------------------------------ cyclers and small helpers
func add_cyclers(items: Array) -> Control:
	var c := W.Choices.new()
	c.font_size = T.SMALL_SIZE
	c.arrow_gap = 12
	c.flow = true
	c.flow_gap = 8
	c.wrap_width = App.TEXTBOX.size.x - 16
	c.setup(items, maxi(items.size(), 1), app)
	c.row_h = 13
	add_extra(c)
	return c

static func _cycle(list: Array, cur, delta: int):
	var i := list.find(cur)
	return list[posmod(i + delta, list.size())] if not list.is_empty() else cur

func _len_text(l: float) -> String:
	if l == floor(l):
		return "%d step%s" % [int(l), "" if int(l) == 1 else "s"]
	return "%s steps" % T.fmt(l, 2)

func _mmss(bars: int) -> String:
	var secs := bars * 240.0 / maxf(float(song()["tempo"]), 1.0)
	return "%d:%02d" % [int(secs) / 60, int(secs) % 60]

func _total_bars() -> int:
	var n := 0
	for sec in song()["sections"]:
		n += int(song()["patterns"][sec["pattern"]]["bars"]) * int(sec["repeat"])
	return n

func _pick_lane(delta: int) -> void:
	state["lane"] = _cycle(LANES, state["lane"], delta)
	var ln := String(state["lane"])
	if ln == "drums" and not (int(state["pitch"]) in DRUM_NUMBERS):
		state["pitch"] = 36
	elif ln != "drums" and int(state["pitch"]) < 24:
		state["pitch"] = {"lead": 73, "counter": 61, "pad": 61, "bass": 37, "sparkle": 85}.get(ln, 61)
	rebuild()
	canvas.centre_roll()

func _lane_clicked(ln: String, step: int) -> void:
	if ln != String(state["lane"]):
		state["lane"] = ln
		_pick_lane(0)
	if step >= 0:
		state["step"] = step
	if tab == 0:
		rebuild()
	_sync_canvas()
	app.audio.cursor("right")

func _section_clicked(i: int) -> void:
	state["section"] = i
	_sync_pattern_to_section()
	rebuild()

func _pick_pattern(delta: int) -> void:
	var pats: Array = song()["patterns"].keys()
	state["pattern"] = _cycle(pats, pat_name(), delta)
	state["bar"] = 0
	rebuild()
	if player.playing and String(state["loop"]) in ["bar", "pattern"]:
		dirty_audio = true
		_render_current()

func _set_bar(b: int) -> void:
	state["bar"] = posmod(b, int(pat()["bars"]))
	rebuild()
	if player.playing and String(state["loop"]) == "bar":
		dirty_audio = true
		_render_current()

func _pick_section(delta: int) -> void:
	state["section"] = posmod(int(state["section"]) + delta, song()["sections"].size())
	_sync_pattern_to_section()
	rebuild()

func _sync_pattern_to_section() -> void:
	var sec: Dictionary = song()["sections"][clampi(int(state["section"]), 0, song()["sections"].size() - 1)]
	state["pattern"] = sec["pattern"]
	state["bar"] = 0

func _cycle_loop(delta: int) -> void:
	state["loop"] = _cycle(LOOPS, state["loop"], delta)
	rebuild()
	if player.playing:
		clip_mode = String(state["loop"])
		dirty_audio = true
		_render_current()

func _cycle_length(delta: int) -> void:
	var i := LENGTHS.find(float(state["length"]))
	if i < 0:
		i = 2
	state["length"] = LENGTHS[clampi(i + delta, 0, LENGTHS.size() - 1)]
	rebuild()

func _set_vel(v: float) -> void:
	state["vel"] = snappedf(clampf(v, 0.1, 1.0), 0.1)
	rebuild()

func _toggle_lock() -> void:
	var on: bool = not song().get("scale_lock", true)
	_op({"op": "scale_lock", "on": on}, func(): song()["scale_lock"] = on)

func _cycle_scale(delta: int) -> void:
	var scales: Array = table.get("scales", ["major", "minor", "dorian", "phrygian"])
	_op({"op": "set_key", "scale": _cycle(scales, song()["scale"], delta)})

func _cycle_instrument(pool: Array, cur: String, delta: int) -> void:
	if pool.is_empty():
		return
	var nxt := String(_cycle(pool, cur, delta))
	var ln := String(state["lane"])
	_op({"op": "set_lane", "lane": ln, "instrument": nxt}, func(): lane_info(ln)["instrument"] = nxt)

func _lane_set(key: String, v) -> void:
	var ln := String(state["lane"])
	_op({"op": "set_lane", "lane": ln, key: v}, func(): lane_info(ln)[key] = v)

func _fx(key: String, v) -> void:
	_op({"op": "set_fx", "name": key, "value": v}, func(): song()["fx"][key] = v)

func _dice_seed() -> int:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	state["seed"] = rng.randi_range(1, 999)
	return int(state["seed"])

func _clamp_cursor() -> void:
	state["step"] = clampi(int(state["step"]), 0, 15)

# ------------------------------------------------------------------ notes
func _move_pitch(delta: int) -> void:
	var ln := String(state["lane"])
	if ln == "drums":
		state["pitch"] = _cycle(DRUM_NUMBERS, int(state["pitch"]), delta)
	else:
		var p := int(state["pitch"]) + delta
		if song().get("scale_lock", true) and absi(delta) == 1:
			p = _snap(p, delta)
		state["pitch"] = clampi(p, 24, 108)
	_sync_canvas()
	if tab == 1:
		rebuild()

## the nearest note of the scale, in the direction given (0 = nearest, ties up)
func _snap(p: int, direction: int = 0) -> int:
	var steps := _scale_steps()
	if steps.is_empty():
		return p
	var root := int(song()["root"])
	var up := p
	var down := p
	while not (posmod(up - root, 12) in steps):
		up += 1
	while not (posmod(down - root, 12) in steps):
		down -= 1
	if direction > 0:
		return up
	if direction < 0:
		return down
	return up if (up - p) <= (p - down) else down

func _cell_clicked(step: int, pitch: int, button: int) -> void:
	state["step"] = step
	state["pitch"] = pitch
	if button == MOUSE_BUTTON_RIGHT:
		_remove_note(step, pitch)
	else:
		_toggle_note(step, pitch)

func _note_at(ln: String, step: int, pitch: int) -> Dictionary:
	var abs_step := int(state["bar"]) * 16 + step
	for n in pat()["notes"][ln]:
		if int(n["s"]) == abs_step and int(n["p"]) == pitch:
			return n
	return {}

func _toggle_note(step: int, pitch: int) -> void:
	var ln := String(state["lane"])
	if ln != "drums" and song().get("scale_lock", true):
		pitch = _snap(pitch)
		state["pitch"] = pitch
	if not _note_at(ln, step, pitch).is_empty():
		_remove_note(step, pitch)
		return
	var abs_step := int(state["bar"]) * 16 + step
	var note := {"s": abs_step, "p": pitch, "v": float(state["vel"]), "l": 1.0 if ln == "drums" else float(state["length"])}
	_op({"op": "set_note", "pattern": pat_name(), "lane": ln, "step": abs_step, "pitch": pitch, "vel": note["v"], "length": note["l"]},
		func(): pat()["notes"][ln].append(note))
	app.audio.blip("confirm")

func _remove_note(step: int, pitch: int) -> void:
	var ln := String(state["lane"])
	var abs_step := int(state["bar"]) * 16 + step
	if _note_at(ln, step, pitch).is_empty():
		return
	_op({"op": "remove_note", "pattern": pat_name(), "lane": ln, "step": abs_step, "pitch": pitch}, func(): _local_remove(ln, abs_step, pitch))
	app.audio.blip("back")

func _local_remove(ln: String, abs_step: int, pitch: int) -> void:
	var kept := []
	for n in pat()["notes"][ln]:
		if not (int(n["s"]) == abs_step and int(n["p"]) == pitch):
			kept.append(n)
	pat()["notes"][ln] = kept

## the note under the cursor: its length ([ ]) or its velocity (- =)
func _nudge_note(what: String, delta: int) -> void:
	var ln := String(state["lane"])
	var n := _note_at(ln, int(state["step"]), int(state["pitch"]))
	if n.is_empty():
		return
	if what == "length":
		var i := LENGTHS.find(float(n["l"]))
		var nl: float = LENGTHS[clampi((i if i >= 0 else 2) + delta, 0, LENGTHS.size() - 1)]
		_op({"op": "set_length", "pattern": pat_name(), "lane": ln, "step": int(n["s"]), "pitch": int(n["p"]), "length": nl}, func(): n["l"] = nl)
		state["length"] = nl
	else:
		var nv := snappedf(clampf(float(n["v"]) + 0.1 * delta, 0.1, 1.0), 0.1)
		_op({"op": "set_velocity", "pattern": pat_name(), "lane": ln, "step": int(n["s"]), "pitch": int(n["p"]), "vel": nv}, func(): n["v"] = nv)
		state["vel"] = nv

func _local_clear(ln: String, bar: int) -> void:
	var kept := []
	for n in pat()["notes"][ln]:
		if int(n["s"]) < bar * 16 or int(n["s"]) >= (bar + 1) * 16:
			kept.append(n)
	pat()["notes"][ln] = kept

func _copy_bar() -> void:
	var ln := String(state["lane"])
	var clip := []
	for n in canvas.notes_in_bar(ln):
		var c: Dictionary = n.duplicate()
		c["s"] = int(n["s"]) - int(state["bar"]) * 16
		clip.append(c)
	state["clipboard"] = clip
	app.say("%d notes of %s copied; Paste bar puts them in the bar shown." % [clip.size(), ln])

func _paste_bar() -> void:
	var clip: Array = state["clipboard"]
	if clip.is_empty():
		app.say("Nothing copied yet: Copy bar first.")
		return
	var ln := String(state["lane"])
	var bar := int(state["bar"])
	_op({"op": "paste", "pattern": pat_name(), "lane": ln, "at": bar * 16, "clipboard": clip}, func(): _local_paste(ln, bar, clip))

func _local_paste(ln: String, bar: int, clip: Array) -> void:
	_local_clear(ln, bar)
	for n in clip:
		var c: Dictionary = n.duplicate()
		c["s"] = int(n["s"]) + bar * 16
		pat()["notes"][ln].append(c)

func _generate_lane() -> void:
	_op({"op": "generate_lane", "pattern": pat_name(), "lane": String(state["lane"]), "seed": _dice_seed()})

func _compose() -> void:
	var genre := String(state["genre"])
	if genre == "all":
		genre = String(song().get("genre", "dungeon_synth"))
		if genre == "":
			genre = "dungeon_synth"
	var cur := music_dir().path_join("current.song.json")
	push_undo()
	run(["music", "compose", "-o", cur, "--genre", genre, "--mood", String(state["mood"]), "--seed", str(int(state["seed"])), "--bars", "32"], "composing a %s piece" % genre.replace("_", " "), func(r: Dictionary):
		if r.get("ok", false):
			state["name"] = slug(String(r.get("title", genre)))
			_load_file(cur)
			app.say("%s: %s, %d bars." % [String(r.get("title", "")), String(r.get("key", "")), int(r.get("bars", 0))])
			if player.playing:
				dirty_audio = true
				_render_current(), false)

# ------------------------------------------------------------------ edits: the bench first, then the pipeline
## apply an operation: `local` changes the song on the bench at once (the pipeline's answer replaces it)
func _op(op: Dictionary, local: Callable = Callable()) -> void:
	if not has_song():
		return
	push_undo()
	if local.is_valid():
		local.call()
	pending_ops.append(op)
	dirty_audio = true
	_flush_ops()
	rebuild()

func _flush_ops() -> void:
	if edit_job != null or pending_ops.is_empty() or String(state["path"]) == "":
		return
	var a := ["music", "edit", String(state["path"])]
	for op in pending_ops:
		a.append("--op")
		a.append(JSON.stringify(op))
	pending_ops = []
	edit_job = app.backend.run(a, "editing", func(r: Dictionary):
		edit_job = null
		if not is_inside_tree():
			return
		if not r.get("ok", false):
			app.audio.blip("fail")
			app.say(plain_error(r))
		var d := app.backend.read_json(String(state["path"]))
		if not d.is_empty():
			state["song"] = d
			if not d["patterns"].has(state["pattern"]):
				state["pattern"] = d["patterns"].keys()[0]
			state["section"] = clampi(int(state["section"]), 0, d["sections"].size() - 1)
			state["bar"] = clampi(int(state["bar"]), 0, int(d["patterns"][state["pattern"]]["bars"]) - 1)
			rebuild()
		if not pending_ops.is_empty():
			_flush_ops()
		elif dirty_audio and player.playing and bool(state["live"]):
			_render_current())

func on_state_restored() -> void:
	if has_song() and String(state["path"]) != "":
		app.backend.write_json(String(state["path"]), song())
		dirty_audio = true
		if player.playing:
			_render_current()

# ------------------------------------------------------------------ playing
func _play_or_stop() -> void:
	if player.playing:
		_stop()
	else:
		_play(String(state["loop"]))

func _stop() -> void:
	player.stop()
	canvas.play_frac = -1.0
	canvas.play_bar = -1
	canvas.play_section = -1
	canvas.play_song_frac = -1.0
	canvas.queue_redraw()
	rebuild()

func _play(mode: String) -> void:
	if not has_song() or String(state["path"]) == "":
		return
	clip_mode = mode
	dirty_audio = true
	_render_current(true)

func _audition_lane() -> void:
	clip_mode = "bar" if String(state["loop"]) == "bar" else "pattern"
	_render_clip(clip_mode, String(state["lane"]), true)

## render what the loop setting says and (re)start the player on it
func _render_current(start: bool = false) -> void:
	if render_job != null or not has_song():
		return
	if edit_job != null or not pending_ops.is_empty():
		return   # the edit lands first; its callback comes back here
	_render_clip(clip_mode if clip_mode != "" else String(state["loop"]), "", start or not player.playing)

func _render_clip(mode: String, only_lane: String, start: bool) -> void:
	var path := String(state["path"])
	var out := music_dir().path_join("bar.wav")
	var a := ["music", "play-bar", path, "-o", music_dir(), "--name", "bar.wav"]
	var bars := 1
	var start_bar := 0
	match mode:
		"bar":
			a += ["--pattern", pat_name(), "--bar", str(int(state["bar"]))]
			start_bar = int(state["bar"])
		"pattern":
			a += ["--pattern", pat_name()]
			bars = int(pat()["bars"])
		"section":
			a += ["--section", str(int(state["section"]))]
			var sec: Dictionary = song()["sections"][clampi(int(state["section"]), 0, song()["sections"].size() - 1)]
			bars = int(song()["patterns"][sec["pattern"]]["bars"]) * int(sec["repeat"])
			start_bar = _section_start(int(state["section"]))
		_:
			a = ["music", "render", path, "-o", music_dir(), "--name", "preview", "--no-preview"]
			out = music_dir().path_join("preview.wav")
			bars = _total_bars()
	if only_lane != "":
		a += ["--lanes", only_lane]
	dirty_audio = false
	var was_mode := mode
	render_job = app.backend.run(a, "rendering", func(r: Dictionary):
		render_job = null
		if not is_inside_tree():
			return
		if not r.get("ok", false):
			app.audio.blip("fail")
			app.say(plain_error(r))
			return
		var s := AudioStreamWAV.load_from_file(out)
		if s == null:
			return
		s.loop_mode = AudioStreamWAV.LOOP_FORWARD
		s.loop_begin = 0
		s.loop_end = int(s.data.size() / (4 if s.stereo else 2))
		var pos := player.get_playback_position() if player.playing else 0.0
		clip_mode = was_mode
		clip_bars = bars
		clip_start_bar = start_bar
		clip_seconds = s.get_length()
		player.stream = s
		player.volume_db = linear_to_db(maxf(app.audio.music_volume, 0.01))
		app.audio.set_music(false)
		player.play(0.0 if start else fmod(pos, maxf(clip_seconds, 0.01)))
		rebuild()
		if dirty_audio and bool(state["live"]):
			_render_current())

func _section_start(i: int) -> int:
	var n := 0
	for k in mini(i, song()["sections"].size()):
		var sec: Dictionary = song()["sections"][k]
		n += int(song()["patterns"][sec["pattern"]]["bars"]) * int(sec["repeat"])
	return n

## which section, pattern and pattern bar the absolute bar `b` of the song is
func _locate(b: int) -> Array:
	var n := 0
	for k in song()["sections"].size():
		var sec: Dictionary = song()["sections"][k]
		var pb := int(song()["patterns"][sec["pattern"]]["bars"])
		var len := pb * int(sec["repeat"])
		if b < n + len:
			return [k, String(sec["pattern"]), (b - n) % pb]
		n += len
	return [-1, "", 0]

func _process(_dt: float) -> void:
	if canvas == null or not has_song() or not player.playing:
		return
	var bar_s := 240.0 / maxf(float(song()["tempo"]), 1.0)
	var pos := player.get_playback_position()
	var cur := int(pos / bar_s) % maxi(clip_bars, 1)
	var frac := fmod(pos, bar_s) / bar_s
	match clip_mode:
		"bar":
			canvas.play_bar = int(state["bar"])
			canvas.play_frac = frac
			canvas.play_section = -1
			canvas.play_song_frac = -1.0
		"pattern":
			canvas.play_bar = cur
			canvas.play_frac = frac if cur == int(state["bar"]) else -1.0
			canvas.play_section = -1
			canvas.play_song_frac = -1.0
		_:
			var where := _locate(clip_start_bar + cur)
			canvas.play_section = int(where[0])
			canvas.play_bar = int(where[2]) if String(where[1]) == pat_name() else -1
			canvas.play_frac = frac if (String(where[1]) == pat_name() and int(where[2]) == int(state["bar"])) else -1.0
			var total := maxi(_total_bars(), 1)
			canvas.play_song_frac = (clip_start_bar + cur + frac) / total
	canvas.queue_redraw()

# ------------------------------------------------------------------ keeping and exporting
func keep() -> void:
	if not app.backend.game_ok():
		app.say("No game folder is set; see Settings.")
		return
	var name := String(state["name"])
	if name == "":
		app.say("Give the cue a name on the Export tab first.")
		return
	var out := app.backend.game_dir.path_join("audio").path_join("music")
	run(["music", "export", String(state["path"]), "-o", out, "--name", name, "--format", "ogg", "--no-preview"], "writing %s into the game" % name, func(r: Dictionary):
		if r.get("ok", false):
			state["exported"] = String(r.get("kept", out))
			app.say("%s is in the game's music (%s s, rendered in %s s)." % [name, str(r.get("seconds", "")), str(r.get("render_seconds", ""))])
			app.remember_last("music", {"title": name, "note": "kept", "png": ""})
			rebuild())

func _export(fmt: String) -> void:
	var name := String(state["name"])
	if name == "":
		name = "song"
	run(["music", "render", String(state["path"]), "-o", music_dir(), "--name", name, "--format", fmt], "rendering %s" % name, func(r: Dictionary):
		if r.get("ok", false):
			var files: Array = r.get("files", [])
			state["exported"] = String(files[0]) if not files.is_empty() else ""
			var t := tex(String(r.get("png", "")))
			if t:
				app.scene.show_picture(t, "%s · %s s · waveform and spectrogram" % [name, str(r.get("seconds", ""))])
				canvas.visible = false
			app.say("%s written (%s s, rendered in %s s)." % [String(state["exported"]).get_file(), str(r.get("seconds", "")), str(r.get("render_seconds", ""))])
			rebuild())

func _save_song() -> void:
	var name := String(state["name"])
	if name == "":
		name = "song"
	var dst := music_dir().path_join(name + ".song.json")
	if app.backend.write_json(dst, song()):
		state["exported"] = dst
		app.say("%s saved." % dst.get_file())
		rebuild()

func render_all() -> void:
	_play("song")

func reset() -> void:
	push_undo()
	app.audio.blip("clunk")
	match tab:
		0:
			var ln := String(state["lane"])
			var defaults := {"volume": 0.8, "tone": 0.5, "pan": 0.0, "mute": false, "solo": false}
			_op({"op": "set_lane", "lane": ln, "volume": 0.8, "tone": 0.5, "pan": 0.0, "mute": false, "solo": false}, func(): lane_info(ln).merge(defaults, true))
		2:
			var defaults := {"crunch": 0.2, "bits": 16, "echo": 0.25, "reverb": 0.3, "reverb_size": 1.6, "voices": 8, "rate": 32000}
			for k in defaults:
				pending_ops.append({"op": "set_fx", "name": k, "value": defaults[k]})
				song()["fx"][k] = defaults[k]
			dirty_audio = true
			_flush_ops()
			rebuild()
		_:
			state["length"] = 2.0
			state["vel"] = 0.8
			rebuild()

func start_over_question() -> String:
	return "Start the music over? The song on the bench goes back to the Forge's theme; what was kept in the game stays."

func do_start_over() -> void:
	_stop()
	undo_stack = []
	redo_stack = []
	state["name"] = ""
	state["clipboard"] = []
	state["bar"] = 0
	state["section"] = 0
	state["lane"] = "lead"
	_load_library(DEFAULT_PIECE, false)

func can_leave() -> bool:
	player.stop()
	if app.cfg.get("music", true):
		app.audio.set_music(true)
	return true

func _exit_tree() -> void:
	if canvas and is_instance_valid(canvas):
		canvas.queue_free()

# ------------------------------------------------------------------ the keyboard framing
func _set_grid_focus(on: bool) -> void:
	grid_focus = on
	if canvas:
		canvas.grid_focus = on
		canvas.queue_redraw()
	if on:
		app.say_hint("grid: arrows move, Enter places or removes, [ ] length, - = velocity, PgUp PgDn octave, Tab next lane, Esc leaves the grid")
	else:
		app.set_hint(hint_text)

func on_key(ev: InputEvent) -> bool:
	if name_edit and is_instance_valid(name_edit) and name_edit.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			name_edit.release_focus()
			return true
		return false
	if not (ev is InputEventKey and ev.pressed) or not has_song():
		return false
	if ev.keycode == KEY_SPACE and not ev.echo:
		_play_or_stop()
		return true
	if not grid_focus:
		if ev.keycode == KEY_G and not ev.echo and tab == 1:
			_set_grid_focus(true)
			return true
		return false
	match ev.keycode:
		KEY_ESCAPE:
			_set_grid_focus(false)
			return true
		KEY_LEFT:
			state["step"] = int(state["step"]) - 1
			if int(state["step"]) < 0:
				state["step"] = 15
				_set_bar(int(state["bar"]) - 1)
			app.audio.cursor("left")
		KEY_RIGHT:
			state["step"] = int(state["step"]) + 1
			if int(state["step"]) > 15:
				state["step"] = 0
				_set_bar(int(state["bar"]) + 1)
			app.audio.cursor("right")
		KEY_UP:
			_move_pitch(1)
			app.audio.cursor("up")
		KEY_DOWN:
			_move_pitch(-1)
			app.audio.cursor("down")
		KEY_PAGEUP:
			_move_pitch(12)
		KEY_PAGEDOWN:
			_move_pitch(-12)
		KEY_ENTER, KEY_KP_ENTER:
			_toggle_note(int(state["step"]), int(state["pitch"]))
		KEY_DELETE, KEY_BACKSPACE:
			_remove_note(int(state["step"]), int(state["pitch"]))
		KEY_BRACKETLEFT:
			_nudge_note("length", -1)
		KEY_BRACKETRIGHT:
			_nudge_note("length", 1)
		KEY_MINUS:
			_nudge_note("velocity", -1)
		KEY_EQUAL:
			_nudge_note("velocity", 1)
		KEY_TAB:
			_pick_lane(-1 if ev.shift_pressed else 1)
		_:
			return false
	_sync_canvas()
	return true
