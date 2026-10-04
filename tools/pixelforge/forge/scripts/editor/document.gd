extends RefCounted
const Pal := preload("res://scripts/editor/palette.gd")
const Px := preload("res://scripts/editor/pixels.gd")
## scripts/editor/document.gd: what the editor edits. A frame set is a folder of clips (`<root>/<clip>_<DIR>/
## frame_NNN.png`, what the engine renders and the export reads); a single picture (a tile sheet, an effect strip,
## a portrait) is a set of one frame. Every frame has layers: the base (the file), a paint layer kept beside it in
## `<root>/.layers/`, and any the person adds; the reference painting is a dimmable overlay, not a layer of pixels.
## The palette is the set's own colours. Save flattens the visible layers back into the frame's file.

const DIRS := ["S", "SE", "E", "NE", "N", "NW", "W", "SW"]

class Layer:
	extends RefCounted
	var name := "paint"
	var image: Image = null
	var visible := true
	var opacity := 1.0
	var locked := false
	func _init(n: String = "paint", img: Image = null) -> void:
		name = n
		image = img

class Frame:
	extends RefCounted
	var key := ""              # "idle_S" (a clip and a direction), or "image" for a single picture
	var index := 0
	var path := ""
	var layers: Array = []     # Layer, bottom first
	var dirty := false
	var parts: Image = null    # the part-id mask when the render wrote one (frame_NNN.parts.png)
	var parts_checked := false
	func layer_named(n: String) -> Layer:
		for L in layers:
			if L.name == n:
				return L
		return null
	func base() -> Layer:
		return layers[0] if not layers.is_empty() else null

var root := ""                 # the frames folder, or the picture's folder
var single := false
var keys: Array = []           # the clip_DIR folders present, in the engine's order
var counts := {}               # key -> frame count
var frames := {}               # "key:index" -> Frame (loaded on demand; index = the file's number)
var order := {}                # key -> the file indices in their shown order (a reordered strip)
var palette := Pal.new()
var width := 0
var height := 0
var key := ""                  # the clip and direction showing
var index := 0                 # the frame showing
var active_layer := 1          # paint
var selection := PackedByteArray()
var reference_path := ""
var reference: Image = null
var reference_alpha := 0.5
var reference_on := false
var onion := false
var fps := 12.0
var anims := {}                # animations.json when the set has one

# ------------------------------------------------------------------ opening
## a frame set: every <clip>_<DIR> folder under root; `clip` and `dir` choose the one showing
func open_set(root_: String, clip: String, dir: String) -> bool:
	root = root_
	single = false
	keys = []
	counts = {}
	frames = {}
	var d := DirAccess.open(root)
	if d == null:
		return false
	var found := []
	for sub in d.get_directories():
		if sub.begins_with("."):
			continue
		var n := _count_frames(root.path_join(sub))
		if n > 0:
			found.append(sub)
			counts[sub] = n
	found.sort()
	keys = found
	if keys.is_empty():
		return false
	key = "%s_%s" % [clip, dir]
	if not counts.has(key):
		key = keys[0]
	order = {}
	for k in keys:
		order[k] = range(int(counts[k]))
	index = 0
	anims = _read_json(root.path_join("animations.json"))
	fps = float(anims.get("clip_fps", {}).get(clip_of(key), anims.get("fps", 12.0)))
	var f := frame(key, 0)
	if f == null or f.base() == null or f.base().image == null:
		return false
	width = f.base().image.get_width()
	height = f.base().image.get_height()
	selection = PackedByteArray()
	_build_palette()
	return true

## one picture as a set of one frame
func open_image(path: String) -> bool:
	var img := Image.load_from_file(path)
	if img == null:
		return false
	img.convert(Image.FORMAT_RGBA8)
	root = path.get_base_dir()
	single = true
	keys = ["image"]
	counts = {"image": 1}
	frames = {}
	key = "image"
	index = 0
	width = img.get_width()
	height = img.get_height()
	var f := Frame.new()
	f.key = "image"
	f.index = 0
	f.path = path
	f.layers = [Layer.new("base", img), Layer.new("paint", _paint_layer_for(path, img))]
	frames["image:0"] = f
	order = {"image": [0]}
	selection = PackedByteArray()
	_build_palette()
	return true

static func _count_frames(dir: String) -> int:
	var d := DirAccess.open(dir)
	if d == null:
		return 0
	var n := 0
	for f in d.get_files():
		if f.begins_with("frame_") and f.ends_with(".png") and not f.contains(".parts."):
			n += 1
	return n

static func _read_json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	return d if d is Dictionary else {}

static func clip_of(k: String) -> String:
	var i := k.rfind("_")
	return k.substr(0, i) if i > 0 else k

static func dir_of(k: String) -> String:
	var i := k.rfind("_")
	return k.substr(i + 1) if i > 0 else "S"

func frame_path(k: String, i: int) -> String:
	return root.path_join(k).path_join("frame_%03d.png" % i)

func layer_dir(k: String) -> String:
	return root.path_join(".layers").path_join(k)

## the paint layer kept beside a frame's file, when one was saved
func _paint_layer_for(path: String, base: Image) -> Image:
	var side := path.get_base_dir().path_join(".layers").path_join(path.get_file().get_basename() + ".paint.png") if single else layer_dir(key_of_path(path)).path_join(path.get_file().get_basename() + ".paint.png")
	if FileAccess.file_exists(side):
		var img := Image.load_from_file(side)
		if img and img.get_width() == base.get_width() and img.get_height() == base.get_height():
			img.convert(Image.FORMAT_RGBA8)
			return img
	return Px.blank(base.get_width(), base.get_height())

static func key_of_path(path: String) -> String:
	return path.get_base_dir().get_file()

## the frame, loaded on first use with its base and paint layers
func frame(k: String, i: int) -> Frame:
	var id := "%s:%d" % [k, i]
	if frames.has(id):
		return frames[id]
	if single or not counts.has(k) or i < 0 or i >= int(counts[k]):
		return null
	var p := frame_path(k, i)
	var img := Image.load_from_file(p)
	if img == null:
		return null
	img.convert(Image.FORMAT_RGBA8)
	var f := Frame.new()
	f.key = k
	f.index = i
	f.path = p
	f.layers = [Layer.new("base", img), Layer.new("paint", _paint_layer_for(p, img))]
	frames[id] = f
	return f

## the frame at a shown position (the strip may be reordered)
func at(k: String, pos: int) -> Frame:
	var o: Array = order.get(k, [])
	if pos < 0 or pos >= o.size():
		return null
	return frame(k, int(o[pos]))

func position_of(f: Frame) -> int:
	var o: Array = order.get(f.key, [])
	return o.find(f.index)

func current() -> Frame:
	return at(key, index)

## move the frame at shown position `from` to `to`; every frame of the strip is then saved by its new position
func reorder(k: String, from: int, to: int) -> bool:
	var o: Array = order.get(k, [])
	if from < 0 or to < 0 or from >= o.size() or to >= o.size() or from == to:
		return false
	for i in o.size():
		frame(k, int(o[i]))
	var v = o[from]
	o.remove_at(from)
	o.insert(to, v)
	order[k] = o
	for i in o.size():
		frame(k, int(o[i])).dirty = true
	return true

func set_order(k: String, o: Array) -> void:
	order[k] = o.duplicate()
	for i in o.size():
		var f := frame(k, int(o[i]))
		if f:
			f.dirty = true

func count() -> int:
	return int(counts.get(key, 0))

## the layer being painted (never the reference; a locked layer refuses)
func layer() -> Layer:
	var f := current()
	if f == null:
		return null
	active_layer = clampi(active_layer, 0, f.layers.size() - 1)
	return f.layers[active_layer]

## the part-id mask the render wrote for a frame (frame_NNN.parts.png: one grey level per part), or null
func parts_of(f: Frame) -> Image:
	if f == null:
		return null
	if not f.parts_checked:
		f.parts_checked = true
		var p := f.path.get_basename() + ".parts.png"
		if FileAccess.file_exists(p):
			f.parts = Image.load_from_file(p)
	return f.parts

static func part_at(parts: Image, x: int, y: int) -> int:
	if parts == null or x < 0 or y < 0 or x >= parts.get_width() or y >= parts.get_height():
		return -1
	var c := parts.get_pixel(x, y)
	return -1 if c.a < 0.5 else c.r8

# ------------------------------------------------------------------ composing
func composite(f: Frame = null) -> Image:
	if f == null:
		f = current()
	if f == null:
		return Px.blank(maxi(width, 1), maxi(height, 1))
	return Px.composite(f.layers, width, height)

## the frames of the clip showing, composed (the picture window plays these)
func composites() -> Array:
	var out := []
	for i in count():
		out.append(composite(at(key, i)))
	return out

func set_reference(path: String) -> bool:
	if path == "":
		reference_path = ""
		reference = null
		reference_on = false
		return true
	var img := Image.load_from_file(path)
	if img == null:
		return false
	img.convert(Image.FORMAT_RGBA8)
	reference_path = path
	reference = img
	reference_on = true
	return true

# ------------------------------------------------------------------ the palette
func _build_palette() -> void:
	palette.clear()
	if single:
		palette.add_image(current().base().image)
		return
	# the set's colours: every frame of the clip showing, and the first frame of every other folder
	for i in count():
		var f := at(key, i)
		if f:
			palette.add_image(f.base().image)
	for k in keys:
		if k != key:
			var f := frame(k, 0)
			if f:
				palette.add_image(f.base().image)

# ------------------------------------------------------------------ layers
func add_layer(name: String) -> Layer:
	var f := current()
	if f == null:
		return null
	var L := Layer.new(name, Px.blank(width, height))
	f.layers.append(L)
	active_layer = f.layers.size() - 1
	f.dirty = true
	return L

func remove_layer(i: int) -> bool:
	var f := current()
	if f == null or i <= 0 or i >= f.layers.size():
		return false
	f.layers.remove_at(i)
	active_layer = clampi(active_layer, 0, f.layers.size() - 1)
	f.dirty = true
	return true

## merge layer i down into the one under it
func merge_down(i: int) -> bool:
	var f := current()
	if f == null or i <= 0 or i >= f.layers.size():
		return false
	var top: Layer = f.layers[i]
	var under: Layer = f.layers[i - 1]
	under.image = Px.composite([under, top], width, height)
	f.layers.remove_at(i)
	active_layer = i - 1
	f.dirty = true
	return true

# ------------------------------------------------------------------ saving
## the frame's file gets the flattened picture (every visible layer); the paint layer is kept beside it
func save_frame(f: Frame) -> bool:
	if f == null:
		return false
	var flat := Px.composite(f.layers, width, height)
	var pos := position_of(f)
	var path := f.path if (single or pos < 0) else frame_path(f.key, pos)
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	if flat.save_png(path) != OK:
		return false
	var paint := f.layer_named("paint")
	if paint and paint.image:
		var side := (path.get_base_dir().path_join(".layers") if single else layer_dir(f.key)).path_join(path.get_file().get_basename() + ".paint.png")
		DirAccess.make_dir_recursive_absolute(side.get_base_dir())
		paint.image.save_png(side)
	f.dirty = false
	return true

func save_all() -> int:
	var n := 0
	for id in frames:
		var f: Frame = frames[id]
		if f.dirty and save_frame(f):
			n += 1
	_rekey()
	return n

## after a save, a reordered strip's frames take the file numbers of their positions
func _rekey() -> void:
	if single:
		return
	var fresh := {}
	for k in keys:
		var o: Array = order.get(k, [])
		var identity := true
		for i in o.size():
			if int(o[i]) != i:
				identity = false
		if identity:
			continue
		for i in o.size():
			var f: Frame = frames.get("%s:%d" % [k, int(o[i])])
			if f:
				f.index = i
				f.path = frame_path(k, i)
				fresh["%s:%d" % [k, i]] = f
		order[k] = range(o.size())
	for id in fresh:
		frames[id] = fresh[id]

func dirty_count() -> int:
	var n := 0
	for id in frames:
		if frames[id].dirty:
			n += 1
	return n

## the thumbnail of a frame (its composite, for strips)
func thumb(f: Frame) -> Image:
	return composite(f)
