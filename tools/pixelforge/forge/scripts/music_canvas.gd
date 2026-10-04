extends Control
const T := preload("res://scripts/theme.gd")
## scripts/music_canvas.gd: the Music bench's picture, drawn in the picture window as pixels. Four views: the
## pattern (a 16-step grid of the six lanes for one bar, and under it a piano roll of the chosen lane, or the drum
## rows), the tracks (one column a lane: instrument, level, tone, pan, mute, solo), the song (the sections as boxes
## in a row with the playhead) and a text card (the library piece, the export). The screen tells it what to show
## and gets clicks back through callables; the running cursor is a one-pixel line.

const LANES := ["lead", "counter", "pad", "bass", "sparkle", "drums"]
const DRUM_ROWS := [["kick", 36], ["snare", 38], ["stick", 37], ["clap", 39], ["hat", 42], ["hat open", 46], ["tom low", 41], ["tom mid", 45], ["tom high", 48], ["crash", 49], ["ride", 51]]
const NOTE_NAMES := ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const GRID_X := 52
const CELL_W := 32
const LANE_Y := 11
const LANE_H := 10
const ROLL_Y := 72
const ROLL_ROW := 4
const DRUM_ROW := 6

var mode := "pattern"            # pattern | tracks | song | card
var song := {}
var pattern := "A"
var bar := 0
var lane := "lead"
var cursor_step := 0
var cursor_pitch := 72
var roll_low := 60               # the lowest pitch row of the piano roll
var root := 0
var scale_steps: Array = []      # the scale's semitone steps
var play_frac := -1.0            # 0..1 across the shown bar, -1 when the shown bar is not playing
var play_bar := -1               # the pattern bar that is playing, for the header
var play_section := -1
var play_song_frac := -1.0       # 0..1 across the whole song (the song view)
var grid_focus := false
var section := 0
var card_lines: PackedStringArray = []
var card_title := ""
var hover := Vector2(-1, -1)
var on_cell: Callable            # (step, pitch, button)   a click in the roll
var on_lane: Callable            # (lane, step)            a click in the lanes overview (step -1 from the tracks view)
var on_section: Callable         # (index)                 a click on a section box
var on_focus: Callable           # ()                      the canvas was clicked: it wants the keys
var app: Node = null

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	position = Vector2.ZERO

func roll_rows() -> int:
	return int((size.y - ROLL_Y) / ROLL_ROW)

func set_song(s: Dictionary) -> void:
	song = s
	root = int(s.get("root", 0))
	queue_redraw()

func pattern_bars() -> int:
	if song.is_empty() or not song["patterns"].has(pattern):
		return 1
	return int(song["patterns"][pattern].get("bars", 1))

## the notes of a lane inside the shown bar
func notes_in_bar(ln: String) -> Array:
	var out := []
	if song.is_empty() or not song["patterns"].has(pattern):
		return out
	var lo := bar * 16
	for n in song["patterns"][pattern]["notes"].get(ln, []):
		var s := int(n["s"])
		if s >= lo and s < lo + 16:
			out.append(n)
	return out

func in_scale(p: int) -> bool:
	return scale_steps.is_empty() or ((p - root) % 12 + 12) % 12 in scale_steps

static func note_name(p: int) -> String:
	return NOTE_NAMES[((p % 12) + 12) % 12] + str(int(p / 12) - 1)

func drum_name(p: int) -> String:
	for d in DRUM_ROWS:
		if int(d[1]) == p:
			return String(d[0])
	return str(p)

## centre the roll on the lane's notes (or its natural octave)
func centre_roll() -> void:
	var ps := []
	for n in notes_in_bar(lane):
		ps.append(int(n["p"]))
	if ps.is_empty():
		ps = [cursor_pitch]
	ps.sort()
	var mid: int = ps[ps.size() / 2]
	roll_low = mid - roll_rows() / 2
	queue_redraw()

func keep_cursor_visible() -> void:
	if lane == "drums":
		return
	if cursor_pitch < roll_low:
		roll_low = cursor_pitch
	elif cursor_pitch >= roll_low + roll_rows():
		roll_low = cursor_pitch - roll_rows() + 1
	queue_redraw()

# ------------------------------------------------------------------ drawing
func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), T.WELL)
	if song.is_empty():
		_text(8, 14, "the song is loading", T.DIM, T.TEXT_SIZE)
		return
	match mode:
		"pattern":
			_draw_pattern()
		"tracks":
			_draw_tracks()
		"song":
			_draw_song()
		_:
			_draw_card()

func _text(x: float, y: float, s: String, c: Color, sz: int = T.SMALL_SIZE) -> void:
	draw_string(T.font("text"), Vector2(x, y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, sz, c)

func _text_w(s: String, sz: int = T.SMALL_SIZE) -> float:
	return T.text_width(s, sz)

func _header(line: String) -> void:
	_text(4, 9, line, T.DIM)

func _draw_pattern() -> void:
	var pat: Dictionary = song["patterns"][pattern]
	var li: Dictionary = song["lanes"][lane]
	var inst := String(li.get("instrument", "")).replace("_", " ")
	var cur := (drum_name(cursor_pitch) if lane == "drums" else note_name(cursor_pitch))
	var playing := ("  playing bar %d" % (play_bar + 1)) if play_bar >= 0 else ""
	_header("%s  bar %d of %d   %s: %s   cursor %s at step %d%s" % [pattern, bar + 1, int(pat["bars"]), lane, inst, cur, cursor_step + 1, playing])
	# the lanes overview: six rows, sixteen cells
	for i in LANES.size():
		var ln: String = LANES[i]
		var y := LANE_Y + i * LANE_H
		var on := ln == lane
		var muted: bool = song["lanes"][ln].get("mute", false)
		draw_rect(Rect2(0, y, size.x, LANE_H - 1), Color(T.ACCENT, 0.10) if on else (T.INK if i % 2 == 0 else T.WELL))
		_text(3, y + 8, ln, T.ACCENT if on else (T.RULE if muted else T.DIM))
		if song["lanes"][ln].get("solo", false):
			_text(GRID_X - 10, y + 8, "s", T.GOLD)
		for k in 16:
			var x := GRID_X + k * CELL_W
			draw_rect(Rect2(x, y, 1, LANE_H - 1), T.FRAME2 if k % 4 == 0 else T.RULE)
		for n in notes_in_bar(ln):
			var s0 := int(n["s"]) - bar * 16
			var w := maxf(float(n["l"]) * CELL_W - 2, 3.0)
			var x := GRID_X + s0 * CELL_W + 1 + float(n.get("o", 0.0)) * CELL_W
			w = minf(w, GRID_X + 16 * CELL_W - x - 1)
			var v := float(n["v"])
			var c := T.ACCENT if on else T.BONE
			c.a = 0.35 + v * 0.65
			if muted:
				c = Color(T.DIM, 0.4)
			draw_rect(Rect2(x, y + 2, w, LANE_H - 5), c)
	draw_rect(Rect2(GRID_X + 16 * CELL_W, LANE_Y, 1, 6 * LANE_H - 1), T.FRAME2)
	# the roll: the chosen lane's notes against pitch (or the drum rows)
	var ry := ROLL_Y
	draw_rect(Rect2(0, ry - 2, size.x, 1), T.FRAME2)
	if lane == "drums":
		for i in DRUM_ROWS.size():
			var y := ry + i * DRUM_ROW
			if y + DRUM_ROW > size.y:
				break
			var num := int(DRUM_ROWS[i][1])
			var hot := num == cursor_pitch
			draw_rect(Rect2(0, y, size.x, DRUM_ROW - 1), Color(T.ACCENT, 0.08) if hot else (T.INK if i % 2 else T.WELL))
			_text(3, y + 6, String(DRUM_ROWS[i][0]), T.ACCENT if hot else T.DIM)
			for k in 16:
				draw_rect(Rect2(GRID_X + k * CELL_W, y, 1, DRUM_ROW - 1), T.FRAME2 if k % 4 == 0 else T.RULE)
			for n in notes_in_bar("drums"):
				if int(n["p"]) == num:
					var s0 := int(n["s"]) - bar * 16
					var c := T.ACCENT
					c.a = 0.4 + float(n["v"]) * 0.6
					draw_rect(Rect2(GRID_X + s0 * CELL_W + 1, y + 1, CELL_W - 3, DRUM_ROW - 3), c)
	else:
		var rows := roll_rows()
		for r in rows:
			var p := roll_low + (rows - 1 - r)
			var y := ry + r * ROLL_ROW
			var is_root := ((p - root) % 12 + 12) % 12 == 0
			var sc := in_scale(p)
			draw_rect(Rect2(GRID_X, y, 16 * CELL_W, ROLL_ROW), (Color(T.ACCENT, 0.16) if is_root else Color(T.BONE, 0.07)) if sc else T.WELL)
			if is_root or r == rows - 1 or (r == 0 and not in_scale(p + 1) and p % 12 != root):
				_text(GRID_X - 4 - _text_w(note_name(p)), y + 6, note_name(p), T.ACCENT if is_root else T.DIM)
			if p == cursor_pitch:
				draw_rect(Rect2(0, y, GRID_X - 1, ROLL_ROW), Color(T.ACCENT, 0.18))
		for k in 17:
			draw_rect(Rect2(GRID_X + k * CELL_W, ry, 1, rows * ROLL_ROW), T.FRAME2 if k % 4 == 0 else T.RULE)
		for n in notes_in_bar(lane):
			var p := int(n["p"])
			if p < roll_low or p >= roll_low + rows:
				continue
			var y := ry + (rows - 1 - (p - roll_low)) * ROLL_ROW
			var s0 := int(n["s"]) - bar * 16
			var x := GRID_X + s0 * CELL_W + 1 + float(n.get("o", 0.0)) * CELL_W
			var w := maxf(float(n["l"]) * CELL_W - 2, 3.0)
			w = minf(w, GRID_X + 16 * CELL_W - x - 1)
			var c := T.ACCENT
			c.a = 0.45 + float(n["v"]) * 0.55
			draw_rect(Rect2(x, y, w, ROLL_ROW - 1), c)
			draw_rect(Rect2(x, y, 1, ROLL_ROW - 1), T.GH)
		# notes above or below the window: small marks in the margin
		var above := 0
		var below := 0
		for n in notes_in_bar(lane):
			if int(n["p"]) >= roll_low + rows:
				above += 1
			elif int(n["p"]) < roll_low:
				below += 1
		if above:
			_text(size.x - 30, ry + 10, "%d above" % above, T.DIM)
		if below:
			_text(size.x - 30, size.y - 3, "%d below" % below, T.DIM)
	# the cell cursor
	var cy := _row_y(cursor_pitch)
	if cy >= 0:
		var h := (DRUM_ROW - 1) if lane == "drums" else ROLL_ROW
		draw_rect(Rect2(GRID_X + cursor_step * CELL_W, cy, CELL_W, h), T.GH if grid_focus else T.GOLD, false, 1.0)
	# the playhead
	if play_frac >= 0.0:
		var px := GRID_X + floorf(play_frac * 16 * CELL_W)
		draw_rect(Rect2(px, LANE_Y, 1, size.y - LANE_Y), T.BONE)

func _row_y(p: int) -> float:
	if lane == "drums":
		for i in DRUM_ROWS.size():
			if int(DRUM_ROWS[i][1]) == p:
				return ROLL_Y + i * DRUM_ROW
		return -1
	var rows := roll_rows()
	if p < roll_low or p >= roll_low + rows:
		return -1
	return ROLL_Y + (rows - 1 - (p - roll_low)) * ROLL_ROW

func _draw_tracks() -> void:
	_header("%s   %s   %d bpm   lanes: instrument, level, tone, pan; m = muted, s = solo" % [String(song.get("title", "")), _key_text(), int(song["tempo"])])
	var cw := floorf(size.x / 6.0)
	for i in LANES.size():
		var ln: String = LANES[i]
		var li: Dictionary = song["lanes"][ln]
		var x := i * cw
		var on := ln == lane
		draw_rect(Rect2(x + 2, 12, cw - 4, size.y - 14), Color(T.ACCENT, 0.08) if on else T.INK)
		draw_rect(Rect2(x + 2, 12, cw - 4, 1), T.FRAME2)
		_text(x + 6, 24, ln, T.ACCENT if on else T.BONE, T.TEXT_SIZE)
		_text(x + 6, 36, String(li.get("instrument", "")).replace("_", " "), T.DIM)
		# level: a vertical meter of 20 segments
		var vol := float(li.get("volume", 0.8))
		var segs := 20
		for k in segs:
			var lit := (float(k) / segs) < vol
			var y := size.y - 10 - k * 4
			draw_rect(Rect2(x + 8, y, 10, 3), (T.ACCENT if k < 16 else T.GOLD) if lit else T.D)
		_text(x + 22, size.y - 8, "level %d" % int(round(vol * 100)), T.DIM)
		var tone := float(li.get("tone", 0.5))
		for k in 10:
			draw_rect(Rect2(x + 22 + k * 5, size.y - 22, 4, 3), T.ACCENT if (float(k) / 10) < tone else T.D)
		_text(x + 22, size.y - 26, "tone %d" % int(round(tone * 100)), T.DIM)
		var pan := float(li.get("pan", 0.0))
		draw_rect(Rect2(x + 22, size.y - 42, 50, 1), T.M)
		draw_rect(Rect2(x + 22 + floorf((pan + 1.0) * 0.5 * 48), size.y - 44, 3, 5), T.GH)
		_text(x + 22, size.y - 48, "pan " + ("centre" if absf(pan) < 0.03 else ("L %d" % int(round(-pan * 100)) if pan < 0 else "R %d" % int(round(pan * 100)))), T.DIM)
		var flags := ""
		if li.get("mute", false):
			flags += "m "
		if li.get("solo", false):
			flags += "s"
		if flags != "":
			_text(x + cw - 8 - _text_w(flags), 24, flags, T.GOLD)
		var count := 0
		if song["patterns"].has(pattern):
			count = (song["patterns"][pattern]["notes"].get(ln, []) as Array).size()
		_text(x + 6, 48, "%d notes in %s" % [count, pattern], T.DIM)

func _draw_song() -> void:
	var total := 0
	var secs: Array = song["sections"]
	for s in secs:
		total += int(song["patterns"][s["pattern"]]["bars"]) * int(s["repeat"])
	_header("%s   %s   %d bpm   %d bars, %s   sections: pattern x repeats, +n = transposed" % [String(song.get("title", "")), _key_text(), int(song["tempo"]), total, _seconds_text(total)])
	var x := 4.0
	var w_total := size.x - 8
	var bar_w := w_total / maxf(total, 1)
	for i in secs.size():
		var s: Dictionary = secs[i]
		var bars := int(song["patterns"][s["pattern"]]["bars"]) * int(s["repeat"])
		var w := floorf(bars * bar_w) - 2
		var on := i == section
		var playing := i == play_section
		draw_rect(Rect2(x, 16, w, 60), Color(T.ACCENT, 0.12) if on else T.INK)
		draw_rect(Rect2(x, 16, w, 60), T.ACCENT if on else (T.BONE if playing else T.FRAME2), false, 1.0)
		if w > 20:
			_text(x + 4, 30, String(s["name"]), T.ACCENT if on else T.BONE, T.TEXT_SIZE if w > 48 else T.SMALL_SIZE)
			_text(x + 4, 44, "%s x%d" % [String(s["pattern"]), int(s["repeat"])], T.DIM)
			if int(s["transpose"]) != 0:
				_text(x + 4, 56, "%+d" % int(s["transpose"]), T.GOLD)
			_text(x + 4, 70, "%d bar%s" % [bars, "" if bars == 1 else "s"], T.DIM)
		x += w + 2
	# the bar ruler and the playhead
	for b in total + 1:
		var bx := 4 + floorf(b * bar_w)
		draw_rect(Rect2(bx, 82, 1, 4 if b % 4 == 0 else 2), T.FRAME2)
		if b % 4 == 0 and b < total:
			_text(bx + 2, 96, str(b + 1), T.DIM)
	if play_song_frac >= 0.0:
		var px := 4 + floorf(play_song_frac * w_total)
		draw_rect(Rect2(px, 14, 1, 76), T.BONE)
	_text(4, size.y - 16, "patterns: " + ", ".join(song["patterns"].keys()), T.DIM)
	var fx: Dictionary = song["fx"]
	_text(4, size.y - 4, "sound: %d Hz, %d bits, %d voices, crunch %.2f, echo %.2f, hall %.2f" % [int(fx["rate"]), int(fx["bits"]), int(fx["voices"]), float(fx["crunch"]), float(fx["echo"]), float(fx["reverb"])], T.DIM)

func _draw_card() -> void:
	var y := 16
	if card_title != "":
		_text(8, y, card_title, T.BONE, T.TEXT_SIZE)
		y += 16
	for l in card_lines:
		for part in _wrap(l, size.x - 16):
			_text(8, y, part, T.DIM)
			y += 12
			if y > size.y - 2:
				return

func _wrap(s: String, width: float) -> PackedStringArray:
	var out: PackedStringArray = []
	var line := ""
	for word in s.split(" "):
		var trial := word if line == "" else line + " " + word
		if _text_w(trial) > width and line != "":
			out.append(line)
			line = word
		else:
			line = trial
	if line != "":
		out.append(line)
	return out

func _key_text() -> String:
	return "%s %s" % [NOTE_NAMES[root], String(song.get("scale", "minor")).replace("_", " ")]

func _seconds_text(bars: int) -> String:
	var secs := bars * 240.0 / maxf(float(song["tempo"]), 1.0)
	return "%d:%02d" % [int(secs) / 60, int(secs) % 60]

# ------------------------------------------------------------------ the mouse
func _cell_at(p: Vector2) -> Array:
	## [step, pitch] under the point in the roll, or [] when outside
	if p.x < GRID_X or p.x >= GRID_X + 16 * CELL_W or p.y < ROLL_Y:
		return []
	var step := int((p.x - GRID_X) / CELL_W)
	if lane == "drums":
		var i := int((p.y - ROLL_Y) / DRUM_ROW)
		if i < 0 or i >= DRUM_ROWS.size():
			return []
		return [step, int(DRUM_ROWS[i][1])]
	var rows := roll_rows()
	var r := int((p.y - ROLL_Y) / ROLL_ROW)
	if r < 0 or r >= rows:
		return []
	return [step, roll_low + (rows - 1 - r)]

func _gui_input(ev: InputEvent) -> void:
	if song.is_empty():
		return
	if ev is InputEventMouseMotion:
		hover = ev.position
		if mode == "pattern":
			var c := _cell_at(ev.position)
			if not c.is_empty() and (c[0] != cursor_step or c[1] != cursor_pitch) and grid_focus:
				cursor_step = c[0]
				cursor_pitch = c[1]
				queue_redraw()
		return
	if ev is InputEventMouseButton and ev.pressed:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP or ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			if mode == "pattern" and lane != "drums":
				var d := 12 if ev.shift_pressed else 2
				roll_low += d if ev.button_index == MOUSE_BUTTON_WHEEL_UP else -d
				queue_redraw()
			return
		if on_focus.is_valid():
			on_focus.call()
		var p: Vector2 = ev.position
		match mode:
			"pattern":
				if p.y >= LANE_Y and p.y < LANE_Y + 6 * LANE_H:
					var i := int((p.y - LANE_Y) / LANE_H)
					var step := int(clampf((p.x - GRID_X) / CELL_W, 0, 15)) if p.x >= GRID_X else -1
					if on_lane.is_valid():
						on_lane.call(LANES[i], step)
				else:
					var c := _cell_at(p)
					if not c.is_empty():
						cursor_step = c[0]
						cursor_pitch = c[1]
						if on_cell.is_valid():
							on_cell.call(c[0], c[1], ev.button_index)
			"tracks":
				var i := int(p.x / floorf(size.x / 6.0))
				if i >= 0 and i < 6 and on_lane.is_valid():
					on_lane.call(LANES[i], -1)
			"song":
				var total := 0
				for s in song["sections"]:
					total += int(song["patterns"][s["pattern"]]["bars"]) * int(s["repeat"])
				var bar_w := (size.x - 8) / maxf(total, 1)
				var x := 4.0
				for i in song["sections"].size():
					var s: Dictionary = song["sections"][i]
					var w := floorf(int(song["patterns"][s["pattern"]]["bars"]) * int(s["repeat"]) * bar_w)
					if p.x >= x and p.x < x + w and p.y >= 14 and p.y <= 78:
						if on_section.is_valid():
							on_section.call(i)
						return
					x += w
