extends Control
const T := preload("res://scripts/theme.gd")
const W := preload("res://scripts/widgets.gd")
## scripts/editor/browser.gd: the file browser inside the app, used by every "Choose a file" (a full-screen window
## cannot take a drop from a desktop it covers). It sits over the text box: places on the left (Pictures, Downloads,
## Desktop, Documents, a Midjourney folder when one exists, the project, recent), the folder's entries with
## thumbnails in the middle (newest first, so a fresh Midjourney download is at the top; N sorts by name), a filter
## cycler and the typed path at the foot (Backspace goes up a folder). The picture window shows the highlighted picture. Thumbnails and previews
## are read on a worker thread (a 2048 px webp takes a tenth of a second to decode; the frame never waits for it).
## Click a row to highlight, click again (or Enter) to open a folder or choose a file; Backspace goes up; Esc cancels.

const ROW_H := 14
const ROWS := 7
const IMAGE_EXT := ["png", "jpg", "jpeg", "webp", "bmp", "gif"]
const FILTERS := {"pictures": IMAGE_EXT, "models": ["json"], "sounds": ["wav", "ogg", "mp3"], "everything": []}
const THUMB := 12              # the thumbnail's longest side, in text-box pixels
const PREVIEW_MAX := 1024      # the preview's longest side (the picture window is smaller than this at any scale)

var app: Node = null
var title := "Choose a file"
var on_pick: Callable
var on_cancel: Callable
var dirs_only := false
var filter := "pictures"
var dir := ""
var entries: Array = []        # [{name, path, is_dir, ext, mtime}]
var sel := 0
var scroll := 0
var places: Array = []         # [{label, path}]
var place_i := -1
var newest_first := true
var thumbs := {}               # path -> Texture2D (null while nothing could be read)
var previews := {}             # path -> Texture2D
var path_edit: LineEdit
var hover_row := -1
var preview_path := ""
# the worker that decodes pictures
var _thread: Thread
var _mutex := Mutex.new()
var _sem := Semaphore.new()
var _queue: Array = []         # paths waiting
var _queued := {}              # path -> true while waiting or decoding
var _ready: Array = []         # [{path, thumb: Image, preview: Image, w, h}] decoded, for the main thread
var _quit := false

func open(a: Node, filters: PackedStringArray, pick: Callable, cancel: Callable, title_: String, want_dir: bool = false) -> void:
	app = a
	on_pick = pick
	on_cancel = cancel
	title = title_
	dirs_only = want_dir
	filter = _filter_of(filters)
	mouse_filter = Control.MOUSE_FILTER_STOP
	newest_first = bool(app.cfg.get("browser_newest_first", true))
	places = _places()
	path_edit = LineEdit.new()
	path_edit.position = Vector2(8, size.y - 17)
	path_edit.size = Vector2(size.x - 16, 16)
	path_edit.custom_minimum_size = Vector2(0, 16)
	path_edit.add_theme_font_size_override("font_size", T.SMALL_SIZE)
	path_edit.text_submitted.connect(func(t: String): _go(t))
	path_edit.focus_entered.connect(func(): if app: app.say_hint("type a folder or a file and press Enter; Esc leaves the line"))
	add_child(path_edit)
	_thread = Thread.new()
	_thread.start(_work)
	var start := String(app.cfg.get("last_dir", ""))
	if start == "" or not DirAccess.dir_exists_absolute(start):
		start = places[0]["path"] if places.size() > 1 else OS.get_user_data_dir()
	_list(start)

## the quick places: the system folders (with the plain Windows and OneDrive paths when the system does not say),
## a Midjourney folder under any of them, the project, the Forge, home, recent
func _places() -> Array:
	var home := OS.get_environment("HOME") if OS.get_environment("HOME") != "" else OS.get_environment("USERPROFILE")
	var one := OS.get_environment("OneDrive")
	var out := []
	for item in [["Pictures", OS.SYSTEM_DIR_PICTURES], ["Downloads", OS.SYSTEM_DIR_DOWNLOADS], ["Desktop", OS.SYSTEM_DIR_DESKTOP], ["Documents", OS.SYSTEM_DIR_DOCUMENTS]]:
		var label: String = item[0]
		var cands := [OS.get_system_dir(item[1])]
		if home != "":
			cands.append(home.path_join(label))
		if one != "":
			cands.append(one.path_join(label))
		for c in cands:
			if String(c) != "" and DirAccess.dir_exists_absolute(String(c)):
				out.append({"label": label, "path": String(c)})
				break
	var mj := _midjourney_folder(out)
	if mj != "":
		out.append({"label": "Midjourney", "path": mj})
	for p in [["Project", app.backend.project_dir], ["Forge", app.backend.pf_root], ["Home", home]]:
		if String(p[1]) != "" and DirAccess.dir_exists_absolute(String(p[1])):
			out.append({"label": p[0], "path": p[1]})
	out.append({"label": "Recent", "path": ""})
	return out

## a folder named after Midjourney (any case, "MJ" too) directly under Downloads, Pictures, Desktop or Documents
static func _midjourney_folder(places_: Array) -> String:
	for pl in places_:
		var d := DirAccess.open(String(pl["path"]))
		if d == null:
			continue
		for sub in d.get_directories():
			var low := sub.to_lower()
			if low.contains("midjourney") or low == "mj" or low.begins_with("mj_") or low.begins_with("mj "):
				return String(pl["path"]).path_join(sub)
	return ""

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
		if not s.begins_with(".") and s != "__pycache__":
			entries.append({"name": s, "path": dir.path_join(s), "is_dir": true, "ext": "", "mtime": 0})
	if not dirs_only:
		var files := []
		var exts: Array = FILTERS.get(filter, [])
		for f in d.get_files():
			if f.begins_with("."):
				continue
			var ext: String = String(f).get_extension().to_lower()
			if exts.is_empty() or ext in exts:
				var p := dir.path_join(f)
				files.append({"name": f, "path": p, "is_dir": false, "ext": ext, "mtime": FileAccess.get_modified_time(p) if newest_first else 0})
		_sort_files(files)
		entries.append_array(files)
	path_edit.text = dir
	queue_redraw()
	_preview()

## newest first (the default: a fresh download is at the top), else by name
func _sort_files(files: Array) -> void:
	if newest_first:
		files.sort_custom(func(a, b): return a["mtime"] > b["mtime"] if a["mtime"] != b["mtime"] else a["name"].to_lower() < b["name"].to_lower())
	else:
		files.sort_custom(func(a, b): return a["name"].to_lower() < b["name"].to_lower())

func _toggle_sort() -> void:
	newest_first = not newest_first
	app.cfg["browser_newest_first"] = newest_first
	app.save_cfg()
	app.audio.blip("ratchet")
	if dir == "":
		_list_recent()
	else:
		_list(dir)

func _list_recent() -> void:
	dir = ""
	entries = []
	sel = 0
	scroll = 0
	place_i = places.size() - 1
	for p in app.cfg.get("recent_files", []):
		var s := String(p)
		if FileAccess.file_exists(s) and (filter == "everything" or s.get_extension().to_lower() in FILTERS.get(filter, [])):
			entries.append({"name": s.get_file(), "path": s, "is_dir": false, "ext": s.get_extension().to_lower(), "mtime": 0})
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
	_stop_worker()
	queue_free()

func _exit_tree() -> void:
	_stop_worker()

func _stop_worker() -> void:
	if _thread == null:
		return
	_mutex.lock()
	_quit = true
	_mutex.unlock()
	_sem.post()
	if _thread.is_started():
		_thread.wait_to_finish()
	_thread = null

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

# ------------------------------------------------------------------ pictures, decoded off the frame
## the highlighted picture goes to the picture window (as soon as the worker has it)
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
	if previews.has(p) and previews[p] != null:
		_show_preview(p)
	else:
		_enqueue(p)

func _show_preview(p: String) -> void:
	var t: Texture2D = previews.get(p)
	if t == null:
		return
	var wh: Array = previews.get(p + "#size", [t.get_width(), t.get_height()])
	app.scene.visible = true
	app.scene.show_picture(t, "%s · %d x %d" % [p.get_file(), int(wh[0]), int(wh[1])])

## the thumbnail, when the worker has decoded it; asked for otherwise
func _thumb(path: String) -> Texture2D:
	if thumbs.has(path):
		return thumbs[path]
	_enqueue(path)
	return null

func _enqueue(path: String) -> void:
	if _thread == null:
		return
	_mutex.lock()
	if not _queued.has(path):
		_queued[path] = true
		_queue.append(path)
		_sem.post()
	_mutex.unlock()

## the worker: decode one picture at a time into a thumbnail and a preview no larger than the window needs
func _work() -> void:
	while true:
		_sem.wait()
		_mutex.lock()
		if _quit:
			_mutex.unlock()
			return
		var path: String = _queue.pop_front() if not _queue.is_empty() else ""
		_mutex.unlock()
		if path == "":
			continue
		var img := Image.load_from_file(path)
		var item := {"path": path, "thumb": null, "preview": null, "w": 0, "h": 0}
		if img != null and img.get_width() > 0 and img.get_height() > 0:
			item["w"] = img.get_width()
			item["h"] = img.get_height()
			if img.is_compressed():
				img.decompress()
			var pv := img
			var k := maxf(img.get_width() / float(PREVIEW_MAX), img.get_height() / float(PREVIEW_MAX))
			if k > 1.0:
				pv = img.duplicate()
				pv.resize(maxi(int(img.get_width() / k), 1), maxi(int(img.get_height() / k), 1), Image.INTERPOLATE_BILINEAR)
			item["preview"] = pv
			var th := img.duplicate()
			while th.get_width() > THUMB * 4 and th.get_height() > THUMB * 4:
				th.shrink_x2()
			var kt := maxf(th.get_width() / float(THUMB), th.get_height() / float(THUMB))
			if kt > 1.0:
				th.resize(maxi(int(th.get_width() / kt), 1), maxi(int(th.get_height() / kt), 1), Image.INTERPOLATE_LANCZOS)
			item["thumb"] = th
		_mutex.lock()
		_ready.append(item)
		_mutex.unlock()

## the main thread takes what the worker decoded: textures, the preview when it is still the highlighted one
func _process(_dt: float) -> void:
	if _thread == null:
		return
	_mutex.lock()
	var got: Array = _ready.duplicate()
	_ready.clear()
	for it in got:
		_queued.erase(it["path"])
	_mutex.unlock()
	if got.is_empty():
		return
	for it in got:
		var p: String = it["path"]
		thumbs[p] = ImageTexture.create_from_image(it["thumb"]) if it["thumb"] != null else null
		previews[p] = ImageTexture.create_from_image(it["preview"]) if it["preview"] != null else null
		previews[p + "#size"] = [it["w"], it["h"]]
		if p == preview_path:
			_show_preview(p)
	queue_redraw()

# ------------------------------------------------------------------ drawing
const LEFT_W := 96
const LIST_X := 104
const LIST_Y := 18

## a long name shortened in the middle so its end (a counter, the id's tail, the extension) still shows
static func _elide(s: String, w: float, size_: int) -> String:
	if T.text_width(s, size_) <= w:
		return s
	var keep := mini(10, s.length() / 2)
	var tail := s.substr(s.length() - keep)
	var head := s.substr(0, s.length() - keep)
	while head.length() > 1 and T.text_width(head + "..." + tail, size_) > w:
		head = head.substr(0, head.length() - 1)
	return head + "..." + tail

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), T.INK)
	var f := T.font("text")
	draw_string(f, Vector2(8, 13), title, HORIZONTAL_ALIGNMENT_LEFT, -1, T.TEXT_SIZE, T.ACCENT)
	var right := "show < %s > · %s · Enter opens · Esc cancels" % [filter, "newest first" if newest_first else "by name"]
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
				draw_texture_rect(t, Rect2(x + (THUMB - ts.x) / 2.0, y + 1 + (THUMB - ts.y) / 2.0, ts.x, ts.y), false)
			else:
				draw_rect(Rect2(x + 1, y + 2, 10, 10), T.D)      # still decoding (or unreadable): a dim square
		else:
			draw_rect(Rect2(x + 1, y + 2, 8, 10), T.D)
			draw_rect(Rect2(x + 1, y + 2, 8, 10), T.L, false, 1.0)
		draw_string(f, Vector2(x + 16, y + 11), _elide(String(e["name"]), list_w - 28, T.SMALL_SIZE), HORIZONTAL_ALIGNMENT_LEFT, -1, T.SMALL_SIZE, T.ACCENT if on else T.BONE)
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
				# the header's right half: the filter on its left part, the sort order on its right
				if ev.position.x > size.x * 0.68:
					_toggle_sort()
				else:
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
		KEY_N:
			_toggle_sort()
		_:
			return false
	queue_redraw()
	return true
