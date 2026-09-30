extends CanvasLayer
## ui/title.gd: the title. The game opens on the world itself: the pilgrims' camp on the Ashen Moor at dusk, the
## camera drifting slowly over it while the ash falls, letterboxed, the title cue playing (the web's zz_zz_music96
## "title"). Over it, the name and a few carved lines:
##   Continue (when a pilgrim is saved) · A New Pilgrim (asks once if it would forget a saved one) · The Codex ·
##   Options · Leave.
## Continue simply lets the world go on; a new pilgrim reloads the scene with Game.skip_title set.

const U := preload("res://ui/uikit.gd")
const SaveIO := preload("res://core/save.gd")
const BONE := Color("#dcd3c2")
const BONE_D := Color("#a39a8b")
const ASH := Color("#6f685f")
const MARROW := Color("#c9974a")

var main: Node
var root: Control
var rows: Array = []
var hover := -1
var confirm_new := false
var t := 0.0
var leaving := -1.0          # >= 0: fading out into play
var codex: Control

func _init(m: Node) -> void:
	main = m

func _ready() -> void:
	layer = 25
	process_mode = Node.PROCESS_MODE_ALWAYS
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	root.draw.connect(_draw)
	root.gui_input.connect(_gui)
	add_child(root)
	codex = load("res://ui/codex.gd").new()
	codex.visible = false
	codex.on_close = func(): root.visible = true
	add_child(codex)
	_build()

func _build() -> void:
	rows.clear()
	if SaveIO.exists():
		rows.append(["Continue", "continue"])
		rows.append(["Forget the old pilgrim and begin?" if confirm_new else "A New Pilgrim", "new"])
	else:
		rows.append(["Begin", "new"])
	rows.append(["The Codex", "codex"])
	rows.append(["Options", "options"])
	rows.append(["Leave", "leave"])

func _row_rect(i: int) -> Rect2:
	var vs := root.get_viewport_rect().size
	return Rect2(150, vs.y * 0.5 + i * 58.0, 640, 50)

var _test_done := false
func _process(dt: float) -> void:
	t += dt
	if OS.has_environment("GM_TITLE_ACT") and t > 1.0 and not _test_done:
		_test_done = true
		for a in OS.get_environment("GM_TITLE_ACT").split(","):
			_act(a)
	if leaving >= 0.0:
		leaving += dt
		if leaving >= 1.2:
			main.title_done()
			queue_free()
			return
	root.queue_redraw()

func _gui(ev: InputEvent) -> void:
	if leaving >= 0.0:
		return
	if ev is InputEventMouseMotion:
		var h := -1
		for i in rows.size():
			if _row_rect(i).has_point(ev.position):
				h = i
		if h != hover and h >= 0:
			Sfx.play("page_close", 0.25, 1.4)
		hover = h
	elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		for i in rows.size():
			if _row_rect(i).has_point(ev.position):
				_act(rows[i][1])
				return

func _unhandled_key_input(ev: InputEvent) -> void:
	if leaving >= 0.0 or not root.visible or not (ev is InputEventKey) or not ev.pressed:
		return
	if ev.keycode == KEY_ENTER or ev.keycode == KEY_SPACE:
		_act(rows[maxi(0, hover)][1])
	elif ev.keycode == KEY_DOWN:
		hover = (hover + 1) % rows.size()
	elif ev.keycode == KEY_UP:
		hover = (hover - 1 + rows.size()) % rows.size()
	get_viewport().set_input_as_handled()

func _act(a: String) -> void:
	match a:
		"continue":
			Sfx.play("kindle", 0.8)
			leaving = 0.0
		"new":
			if SaveIO.exists() and not confirm_new:
				confirm_new = true
				_build()
				return
			Sfx.play("kindle", 0.8)
			Game.skip_title = true
			Game.force_new = true
			if SaveIO.exists():
				DirAccess.remove_absolute(ProjectSettings.globalize_path(SaveIO.FILE))
			get_tree().reload_current_scene()
		"codex":
			Sfx.play("page_open")
			root.visible = false
			codex.open_book(0)
		"options":
			if main.hud and main.hud.pause:
				main.hud.pause.open()
				main.hud.pause.page = "options"
		"leave":
			get_tree().quit()

func _draw() -> void:
	var vs := root.get_viewport_rect().size
	var fade_in := clampf(t / 2.5, 0.0, 1.0)
	var out := clampf(leaving / 1.2, 0.0, 1.0) if leaving >= 0.0 else 0.0
	var a := (1.0 - out)
	# the letterbox, and a darkening at the left where the words stand
	var bar := 90.0 * (1.0 - out)
	root.draw_rect(Rect2(0, 0, vs.x, bar), Color(0, 0, 0, 1))
	root.draw_rect(Rect2(0, vs.y - bar, vs.x, bar), Color(0, 0, 0, 1))
	for i in 24:
		var k := float(i) / 24.0
		root.draw_rect(Rect2(k * vs.x * 0.55, bar, vs.x * 0.55 / 24.0 + 1.0, vs.y - bar * 2.0), Color(0, 0, 0, 0.8 * (1.0 - k) * (1.0 - k * 0.3) * a))
	# the name, spaced like a carving, and the line under it
	var sc := U.font("sc")
	var fi := U.font("italic")
	var name := "GODMARROW"
	var x := 150.0
	var y := vs.y * 0.5 - 150.0
	for c in name:
		root.draw_string(sc, Vector2(x + 3, y + 3), c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112, Color(0, 0, 0, 0.7 * a))
		root.draw_string(sc, Vector2(x, y), c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112, Color(BONE, a))
		x += sc.get_string_size(c, HORIZONTAL_ALIGNMENT_LEFT, -1, 112).x + 14.0
	root.draw_line(Vector2(152, y + 28), Vector2(152 + 90, y + 28), Color(MARROW, 0.8 * a), 2.0)
	root.draw_string(fi, Vector2(152, y + 72), "Put your hand flat on the ground. It is still warm.", HORIZONTAL_ALIGNMENT_LEFT, -1, 27, Color(BONE_D, a))
	# the lines
	for i in rows.size():
		var r := _row_rect(i)
		var on := i == hover
		var col := BONE if on else BONE_D
		if rows[i][1] == "new" and confirm_new:
			col = MARROW
		if on:
			root.draw_string(sc, r.position + Vector2(-34, 36), "❧", HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(MARROW, a))
		root.draw_string(sc, r.position + Vector2(0, 36), rows[i][0], HORIZONTAL_ALIGNMENT_LEFT, -1, 32, Color(col, a))
	root.draw_string(fi, Vector2(152, vs.y - bar - 22), "Act I · the Ashen Moor and what lies under it", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(ASH, a))
	# out of black at the start
	if fade_in < 1.0:
		root.draw_rect(Rect2(Vector2.ZERO, vs), Color(0, 0, 0, 1.0 - fade_in))
