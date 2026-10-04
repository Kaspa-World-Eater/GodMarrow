extends Control
const T := preload("res://scripts/theme.gd")
const W := preload("res://scripts/widgets.gd")
## scripts/editor/browser.gd: the file browser inside the app, used by every "Choose a file" (a full-screen window
## cannot take a drop from a desktop it covers). It sits over the text box: places on the left (Pictures, Downloads,
## Desktop, Documents, the project, recent), the folder's entries with thumbnails in the middle, a filter cycler and
## the typed path at the foot. The picture window shows the highlighted picture. Click a row to highlight, click
## again (or Enter) to open a folder or choose a file; Backspace goes up; Esc cancels.

const ROW_H := 14
const ROWS := 7
const IMAGE_EXT := ["png", "jpg", "jpeg", "webp", "bmp", "gif"]
const FILTERS := {"pictures": IMAGE_EXT, "models": ["json"], "sounds": ["wav", "ogg", "mp3"], "everything": []}

var app: Node = null
var title := "Choose a file"
var on_pick: Callable
var on_cancel: Callable
var dirs_only := false
var filter := "pictures"
var dir := ""
var entries: Array = []        # [{name, path, is_dir, ext}]
var sel := 0
var scroll := 0
var places: Array = []         # [{label, path}]
var place_i := -1
var thumbs := {}               # path -> Texture2D
var path_edit: LineEdit
var hover_row := -1
var preview_path := ""

func open(a: Node, filters: PackedStringArray, pick: Callable, cancel: Callable, title_: String, want_dir: bool = false) -> void:
	app = a
	on_pick = pick
	on_cancel = cancel
	title = title_
	dirs_only = want_dir
	filter = _filter_of(filters)
	mouse_filter = Control.MOUSE_FILTER_STOP
	places = []
	for p in [["Pictures", OS.get_system_dir(OS.SYSTEM_DIR_PICTURES)], ["Downloads", OS.get_system_dir(OS.SYSTEM_DIR_DOWNLOADS)],
			["Desktop", OS.get_system_dir(OS.SYSTEM_DIR_DESKTOP)], ["Documents", OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS)],
			["Project", app.backend.project_dir], ["Forge", app.backend.pf_root], ["Home", OS.get_environment("HOME") if OS.get_environment("HOME") != "" else OS.get_environment("USERPROFILE")]]:
		if String(p[1]) != "" and DirAccess.dir_exists_absolute(String(p[1])):
			places.append({"label": p[0], "path": p[1]})
	places.append({"label": "Recent", "path": ""})
	path_edit = LineEdit.new()
	path_edit.position = Vector2(8, size.y - 17)
	path_edit.size = Vector2(size.x - 16, 16)
	path_edit.custom_minimum_size = Vector2(0, 16)
	path_edit.add_theme_font_size_override("font_size", T.SMALL_SIZE)
	path_edit.text_submitted.connect(func(t: String): _go(t))
	path_edit.focus_entered.connect(func(): if app: app.say_hint("type a folder or a file and press Enter; Esc leaves the line"))
	add_child(path_edit)
	var start := String(app.cfg.get("last_dir", ""))
	if start == "" or not DirAccess.dir_exists_absolute(start):
		start = places[0]["path"] if places.size() > 1 else OS.get_user_data_dir()
	_list(start)

static func _filter_of(filters: PackedStringArray) -> String:
	var joined := " ".join(filters).to_lower()
	if "json" in joined:
		return "models"
	if "wav" in joined or "ogg" in joined:
		return "sounds"
	if "png" in joined or "jpg" in joined:
		return "pictures"
	return "everything"

func _list(path: String) -> void:
	dir = path.simplify_path()
	entries = []
	sel = 0
	scroll = 0
	place_i = -1
	for i in places.size():
		if String(places[i]["path"]) == dir:
			place_i = i
	var d := DirAccess.open(dir)
	if d == null:
		app.say("Cannot open " + dir)
		return
	d.include_hidden = false
	var subs := Array(d.get_directories())
	subs.sort_custom(func(a, b): return a.to_lower() < b.to_lower())
	for s in subs:
		if not s.begins_with("."):
			entries.append({"name": s, "path": dir.path_join(s), "is_dir": true, "ext": ""})
	if not dirs_only:
		var files := Array(d.get_files())
		files.sort_custom(func(a, b): return a.to_lower() < b.to_lower())
		var exts: Array = FILTERS.get(filter, [])
		for f in files:
			var ext: String = String(f).get_extension().to_lower()
			if exts.is_empty() or ext in exts:
				entries.append({"name": f, "path": dir.path_join(f), "is_dir": false, "ext": ext})
	path_edit.text = dir
	queue_redraw()
	_preview()

func _list_recent() -> void:
	dir = ""
	entries = []
	sel = 0
	scroll = 0
	place_i = places.size() - 1
	for p in app.cfg.get("recent_files", []):
		var s := String(p)
		if FileAccess.file_exists(s) and (filter == "everything" or s.get_extension().to_lower() in FILTERS.get(filter, [])):
			entries.append({"name": s.get_file(), "path": s, "is_dir": false, "ext": s.get_extension().to_lower()})
	path_edit.text = "recent files"
	queue_redraw()
	_preview()

func _go(t: String) -> void:
	path_edit.release_focus()
	if DirAccess.dir_exists_absolute(t):
		_list(t)
	elif FileAccess.file_exists(t):
		_choose(t)
	else:
		app.say("No such file or folder.")

func _choose(path: String) -> void:
	var recent: Array = app.cfg.get("recent_files", [])
	recent.erase(path)
	recent.push_front(path)
	app.cfg["recent_files"] = recent.slice(0, 20)
	app.cfg["last_dir"] = path.get_base_dir() if not DirAccess.dir_exists_absolute(path) else path
	app.save_cfg()
	app.audio.blip("confirm")
	var cb := on_pick
	close()
	if cb.is_valid():
		cb.call(path)

func cancel() -> void:
	var cb := on_cancel
	close()
	if cb.is_valid():
		cb.call()

func close() -> void:
	app.scene.visible = true
	queue_free()

func _activate() -> void:
	if entries.is_empty():
		if dirs_only and dir != "":
			_choose(dir)
		return
	var e: Dictionary = entries[clampi(sel, 0, entries.size() - 1)]
	if e["is_dir"]:
		if dirs_only and Input.is_key_pressed(KEY_SHIFT):
			_choose(String(e["path"]))
		else:
			_list(String(e["path"]))
			app.audio.blip("tab")
	else:
		_choose(String(e["path"]))

func _up() -> void:
	if dir == "":
		return
	var parent := dir.get_base_dir()
	if parent != "" and parent != dir:
		_list(parent)
		app.audio.blip("back")

## the highlighted picture goes to the picture window
func _preview() -> void:
	if entries.is_empty() or sel < 0 or sel >= entries.size():
		return
	var e: Dictionary = entries[sel]
	if e["is_dir"] or not (String(e["ext"]) in IMAGE_EXT):
		return
	var p := String(e["path"])
	if p == preview_path:
		return
	preview_path = p
	var img := Image.load_from_file(p)
	if img:
		app.scene.visible = true
		app.scene.show_picture(ImageTexture.create_from_image(img), "%s · %d x %d" % [p.get_file(), img.get_width(), img.get_height()])

func _thumb(path: String) -> Texture2D:
	if thumbs.has(path):
		return thumbs[path]
	var img := Image.load_from_file(path)
	var tex: Texture2D = null
	if img:
		var k := maxf(img.get_width() / 12.0, img.get_height() / 12.0)
		if k > 1.0:
			img.resize(maxi(int(img.get_width() / k), 1), maxi(int(img.get_height() / k), 1), Image.INTERPOLATE_NEAREST)
		tex = ImageTexture.create_from_image(img)
	thumbs[path] = tex
	return tex

# ------------------------------------------------------------------ drawing
const LEFT_W := 96
const LIST_X := 104
const LIST_Y := 18

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), T.INK)
	var f := T.font("text")
	draw_string(f, Vector2(8, 13), title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE, T.ACCENT)
	var right := "show < %s >   Enter opens or chooses · Backspace up · Esc cancels" % filter
	draw_string(f, Vector2(size.x - 8 - T.text_width(right, T.SMALL_SIZE), 12), right, HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.BONE)
	# places
	for i in places.size():
		var y := LIST_Y + i * ROW_H
		var on := i == place_i
		draw_string(f, Vector2(18, y + 11), String(places[i]["label"]), HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if on else T.BONE)
		if on:
			draw_texture_rect(load("res://scripts/px.gd").arrow(), Rect2(2, y, 16, 14), false)
	draw_rect(Rect2(LEFT_W, LIST_Y, 1, ROWS * ROW_H), T.RULE)
	# the entries
	var list_w := size.x - LIST_X - 8
	if entries.is_empty():
		draw_string(f, Vector2(LIST_X + 4, LIST_Y + 11), "nothing here that fits the filter" if dir != "" else "no recent files", HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.DIM)
	for r in ROWS:
		var i := scroll + r
		if i >= entries.size():
			break
		var e: Dictionary = entries[i]
		var y := LIST_Y + r * ROW_H
		var on := i == sel
		if on:
			draw_rect(Rect2(LIST_X, y, list_w, ROW_H), T.WELL)
			draw_rect(Rect2(LIST_X, y, list_w, 1), T.FRAME2)
			draw_rect(Rect2(LIST_X, y + ROW_H - 1, list_w, 1), T.FRAME2)
		var x := LIST_X + 4
		if e["is_dir"]:
			draw_rect(Rect2(x, y + 3, 10, 8), T.M)
			draw_rect(Rect2(x, y + 2, 5, 2), T.L)
		elif String(e["ext"]) in IMAGE_EXT:
			var t := _thumb(String(e["path"]))
			if t:
				var ts := t.get_size()
				draw_texture_rect(t, Rect2(x + (12 - ts.x) / 2.0, y + 1 + (12 - ts.y) / 2.0, ts.x, ts.y), false)
		else:
			draw_rect(Rect2(x + 1, y + 2, 8, 10), T.D)
			draw_rect(Rect2(x + 1, y + 2, 8, 10), T.L, false, 1.0)
		draw_string(f, Vector2(x + 16, y + 11), String(e["name"]), HORIZONTAL_ALIGNMENT_LEFT, list_w - 24, T.SMALL_SIZE, T.ACCENT if on else T.BONE)
	if entries.size() > ROWS:
		var track := Rect2(size.x - 6, LIST_Y, 3, ROWS * ROW_H)
		draw_rect(track, T.D)
		var k := float(ROWS) / entries.size()
		draw_rect(Rect2(track.position.x, track.position.y + track.size.y * scroll / entries.size(), 3, maxf(track.size.y * k, 4)), T.G)

# ------------------------------------------------------------------ input
func _row_at(p: Vector2) -> int:
	if p.x < LIST_X or p.y < LIST_Y or p.y >= LIST_Y + ROWS * ROW_H:
		return -1
	var i := scroll + int((p.y - LIST_Y) / ROW_H)
	return i if i < entries.size() else -1

func _place_at(p: Vector2) -> int:
	if p.x >= LEFT_W or p.y < LIST_Y:
		return -1
	var i := int((p.y - LIST_Y) / ROW_H)
	return i if i < places.size() else -1

func _gui_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.pressed:
		if ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			scroll = clampi(scroll + 3, 0, maxi(entries.size() - ROWS, 0))
			queue_redraw()
		elif ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			scroll = clampi(scroll - 3, 0, maxi(entries.size() - ROWS, 0))
			queue_redraw()
		elif ev.button_index == MOUSE_BUTTON_LEFT:
			path_edit.release_focus()
			var pi := _place_at(ev.position)
			if pi >= 0:
				if String(places[pi]["path"]) == "":
					_list_recent()
				else:
					_list(String(places[pi]["path"]))
				app.audio.blip("tab")
				return
			if ev.position.y < LIST_Y and ev.position.x > size.x / 2:
				_cycle_filter(1)
				return
			var r := _row_at(ev.position)
			if r >= 0:
				if r == sel or ev.double_click:
					_activate()
				else:
					sel = r
					app.audio.cursor("down")
					queue_redraw()
					_preview()
		elif ev.button_index == MOUSE_BUTTON_RIGHT:
			_up()
	elif ev is InputEventMouseMotion:
		var r := _row_at(ev.position)
		if r != hover_row:
			hover_row = r
	accept_event()

func _cycle_filter(d: int) -> void:
	var names := FILTERS.keys()
	filter = names[posmod(names.find(filter) + d, names.size())]
	app.audio.blip("ratchet")
	if dir == "":
		_list_recent()
	else:
		_list(dir)

## keys the app hands over while the browser is up; true when used
func key(ev: InputEvent) -> bool:
	if path_edit.has_focus():
		if ev is InputEventKey and ev.pressed and ev.keycode == KEY_ESCAPE:
			path_edit.release_focus()
			return true
		return false
	if not (ev is InputEventKey) or not ev.pressed:
		return false
	match ev.keycode:
		KEY_ESCAPE:
			cancel()
		KEY_ENTER, KEY_KP_ENTER:
			_activate()
		KEY_BACKSPACE:
			_up()
		KEY_DOWN:
			sel = clampi(sel + 1, 0, maxi(entries.size() - 1, 0))
			if sel >= scroll + ROWS:
				scroll = sel - ROWS + 1
			app.audio.cursor("down")
			_preview()
		KEY_UP:
			sel = clampi(sel - 1, 0, maxi(entries.size() - 1, 0))
			if sel < scroll:
				scroll = sel
			app.audio.cursor("up")
			_preview()
		KEY_LEFT, KEY_RIGHT:
			if ev.keycode == KEY_LEFT and ev.ctrl_pressed:
				_cycle_filter(-1)
			elif ev.ctrl_pressed:
				_cycle_filter(1)
			else:
				var pi := posmod(place_i + (1 if ev.keycode == KEY_RIGHT else -1), places.size())
				if String(places[pi]["path"]) == "":
					_list_recent()
				else:
					_list(String(places[pi]["path"]))
		KEY_SLASH:
			path_edit.grab_focus()
		KEY_TAB:
			_cycle_filter(1)
		_:
			return false
	queue_redraw()
	return true
