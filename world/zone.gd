class_name Zone
extends Node2D
## One zone, rebuilt from the web build's own export (data/zones/<id>_s<seed>.json, see tools/export_zones.js):
## the tile grid (collision, pathing, sight), the painted ground, the wall and cliff blocks, every drawn sprite (trees,
## rocks, props, decor, landmarks, objects), the ground scatter, the lights and the ambient light by hour.

signal built

const SOLID_TYPES := [2, 3, 4, 5, 7, 8, 9, 10, 15]
const SIGHT_TYPES := [2, 3, 5, 7, 8, 9, 10, 15]
const WALLISH := [5, 7, 10, 15]

var id := ""
var seed := 0
var d: Dictionary
var w := 0
var h := 0
var types := PackedByteArray()
var solid := PackedByteArray()
var astar := AStarGrid2D.new()
var ground_mat: ShaderMaterial   # the ground shader (the wind reaches its water)
var shadow_layer: Node2D
var sorted: Node2D           # the y-sorted layer: everything that stands up
var floor_layer: Node2D      # ground decals, scatter, corpses' blood
var objects: Array = []
var lanterns: Array = []
var connections: Array = []
var arrive := {}
var markers := {}
var wall_nodes: Array = []
var hero_ref: Hero

static func rle(a: Array, n: int) -> PackedByteArray:
	var out := PackedByteArray()
	out.resize(n)
	var i := 0
	var k := 0
	while k < a.size() - 1:
		var v := int(a[k])
		var c := int(a[k + 1])
		for j in c:
			if i < n:
				out[i] = v
			i += 1
		k += 2
	return out

static func hash2(x: int, y: int) -> float:
	var hh := (x * 374761393 + y * 668265263) & 0xffffffff
	hh = ((hh ^ (hh >> 13)) * 1274126177) & 0xffffffff
	return float((hh ^ (hh >> 16)) & 0xffffffff) / 4294967295.0

func load_zone(zid: String, zseed: int) -> void:
	id = zid
	seed = zseed
	d = Data.zone(zid, zseed)
	w = int(d["grid"]["w"])
	h = int(d["grid"]["h"])
	types = rle(d["grid"]["cells"], w * h)
	solid.resize(w * h)
	for i in w * h:
		solid[i] = 1 if SOLID_TYPES.has(int(types[i])) else 0
	astar.region = Rect2i(0, 0, w, h)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()
	for y in h:
		for x in w:
			if solid[y * w + x]:
				astar.set_point_solid(Vector2i(x, y), true)
	markers = d.get("markers", {})
	arrive = d.get("arrive", {})
	connections = d.get("connections", [])
	objects = d.get("objects", [])
	lanterns = markers.get("lanterns", [])
	floor_layer = Node2D.new()
	floor_layer.z_index = -50
	add_child(floor_layer)
	shadow_layer = Node2D.new()      # figures' shadows: over the ground and its flat pieces, under everything standing
	shadow_layer.z_index = -20
	add_child(shadow_layer)
	sorted = Node2D.new()
	sorted.y_sort_enabled = true
	add_child(sorted)
	_ground()
	_scatter()
	_walls()
	_sprites()
	_lights()
	built.emit()

# ------------------------------------------------------------------ queries
func type_at(t: Vector2) -> int:
	var x := int(floor(t.x))
	var y := int(floor(t.y))
	if x < 0 or y < 0 or x >= w or y >= h:
		return 7
	return types[y * w + x]

func is_solid(t: Vector2) -> bool:
	var x := int(floor(t.x))
	var y := int(floor(t.y))
	if x < 0 or y < 0 or x >= w or y >= h:
		return true
	return solid[y * w + x] == 1

func blocks_sight(t: Vector2) -> bool:
	return SIGHT_TYPES.has(type_at(t))

## a body of radius r moving from p by v, sliding along solid tiles (the web moves x and y separately)
func move(p: Vector2, v: Vector2, r: float = 0.25) -> Vector2:
	var q := p
	var nx := Vector2(p.x + v.x, p.y)
	if not _blocked(nx, r):
		q.x = nx.x
	var ny := Vector2(q.x, q.y + v.y)
	if not _blocked(ny, r):
		q.y = ny.y
	return q

func _blocked(p: Vector2, r: float) -> bool:
	return is_solid(p + Vector2(r, 0)) or is_solid(p + Vector2(-r, 0)) or is_solid(p + Vector2(0, r)) or is_solid(p + Vector2(0, -r))

func line_clear(a: Vector2, b: Vector2) -> bool:
	var n := int(ceil(a.distance_to(b) * 3.0))
	for i in range(1, n + 1):
		if is_solid(a.lerp(b, float(i) / n)):
			return false
	return true

func sight_clear(a: Vector2, b: Vector2) -> bool:
	var n := int(ceil(a.distance_to(b) * 3.0))
	for i in range(1, n):
		if blocks_sight(a.lerp(b, float(i) / n)):
			return false
	return true

func path(a: Vector2, b: Vector2) -> PackedVector2Array:
	var ai := Vector2i(clampi(int(a.x), 0, w - 1), clampi(int(a.y), 0, h - 1))
	var bi := Vector2i(clampi(int(b.x), 0, w - 1), clampi(int(b.y), 0, h - 1))
	if astar.is_point_solid(bi):
		bi = _nearest_open(bi)
	if astar.is_point_solid(ai):
		ai = _nearest_open(ai)
	var ids := astar.get_id_path(ai, bi, true)
	var out := PackedVector2Array()
	for c in ids:
		out.append(Vector2(c.x + 0.5, c.y + 0.5))
	if out.size() > 0 and not is_solid(b):
		out[out.size() - 1] = b
	return out

func _nearest_open(c: Vector2i) -> Vector2i:
	for r in range(1, 8):
		for dy in range(-r, r + 1):
			for dx in range(-r, r + 1):
				var q := c + Vector2i(dx, dy)
				if q.x >= 0 and q.y >= 0 and q.x < w and q.y < h and not astar.is_point_solid(q):
					return q
	return c

# ------------------------------------------------------------------ the ground
func _ground() -> void:
	var land: String = d.get("land", "moor")
	var set := Assets.ground(land)
	var classes := rle(d["ground"]["classes"], w * h)
	var tex_keys: Dictionary = d["ground"]["texKeys"]
	ground_cls = classes
	ground_keys = tex_keys
	var images: Array[Image] = []
	var layer_a := PackedInt32Array()
	var layer_b := PackedInt32Array()
	layer_a.resize(16)
	layer_b.resize(16)
	var cache := {}
	var fallback := {"bog": ["mud", "water", "main"], "shallow": ["water", "mud", "main"], "water": ["shallow", "mud"], "arena": ["flags", "crypt", "barrow", "bone"], "flags": ["road", "dirt"], "mud": ["dirt"], "main": ["dirt"], "crypt": ["flags"], "barrow": ["flags"], "bone": ["flags"]}
	var wet := PackedInt32Array()
	wet.resize(16)
	for cid in range(1, 15):
		var key: String = tex_keys.get(str(cid), "main")
		wet[cid] = 1 if key in ["water", "shallow"] else 0
		var arr: Array = set.get(key, [])
		if arr.is_empty():
			for alt in fallback.get(key, []):
				if set.has(alt):
					arr = set[alt]
					break
		if arr.is_empty():
			for k2 in set:
				arr = set[k2]
				break
		for vi in 2:
			var p: String = arr[min(vi, arr.size() - 1)]
			if not cache.has(p):
				var img: Image = Assets.tex(p).get_image()
				img.convert(Image.FORMAT_RGBA8)
				if img.get_width() != 320 or img.get_height() != 160:
					img.resize(320, 160, Image.INTERPOLATE_NEAREST)
				cache[p] = images.size()
				images.append(img)
			if vi == 0:
				layer_a[cid] = cache[p]
			else:
				layer_b[cid] = cache[p]
	var tarr := Texture2DArray.new()
	tarr.create_from_images(images)
	var cimg := Image.create_from_data(w, h, false, Image.FORMAT_R8, classes)
	var ctex := ImageTexture.create_from_image(cimg)
	var poly := Polygon2D.new()
	poly.polygon = PackedVector2Array([Iso.to_screen(Vector2(0, 0)), Iso.to_screen(Vector2(w, 0)), Iso.to_screen(Vector2(w, h)), Iso.to_screen(Vector2(0, h))])
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/ground_iso.gdshader")
	m.set_shader_parameter("gtex", tarr)
	m.set_shader_parameter("cls", ctex)
	m.set_shader_parameter("layer_a", layer_a)
	m.set_shader_parameter("layer_b", layer_b)
	m.set_shader_parameter("grid_size", Vector2(w, h))
	m.set_shader_parameter("wet", wet)
	ground_mat = m
	var gains := {"fen": 0.78, "ridge": 0.86, "bone": 0.84, "ossa": 0.86, "a5": 0.88, "shog": 0.9}
	m.set_shader_parameter("gain", gains.get(land, 1.0))
	poly.material = m
	poly.z_index = -100
	add_child(poly)

# ------------------------------------------------------------------ scatter (small ground litter, exported as images)
func _scatter() -> void:
	var sc0 = d.get("scatter")
	if not (sc0 is Dictionary) or sc0.is_empty():
		return
	var sc: Dictionary = sc0
	if sc.is_empty():
		return
	var texs := {}
	var sway := {}
	for s in sc.get("sprites", []):
		var fr: Array = s.get("frames", [])
		if fr.is_empty():
			continue
		var frames: Array = []
		for uri in fr:
			var img := Image.new()
			if img.load_png_from_buffer(Marshalls.base64_to_raw(String(uri).split(",")[1])) == OK:
				frames.append(ImageTexture.create_from_image(img))
		if frames.is_empty():
			continue
		texs[s["id"]] = frames[mini(1, frames.size() - 1)]
		if bool(s.get("sway", false)) and frames.size() >= 3:
			sway[s["id"]] = frames
	# the still litter in one batch; grass and reeds in their own layer, leaning with the wind (Game.wind)
	var still: Array = []
	var moving: Array = []
	for it in sc.get("items", []):
		(moving if sway.has(it[2]) else still).append(it)
	var layer := ScatterLayer.new()
	layer.items = still
	layer.texs = texs
	floor_layer.add_child(layer)
	if not moving.is_empty():
		var sl := ScatterLayer.new()
		sl.items = moving
		sl.texs = texs
		sl.sway = sway
		floor_layer.add_child(sl)

# ------------------------------------------------------------------ walls and cliffs
func _walls() -> void:
	var info: Dictionary = d["walls"]["info"]
	var faces := {}
	for c in d["walls"]["cells"]:
		if int(c[3]) != 1:
			continue
		var x := int(c[0])
		var y := int(c[1])
		var t := int(c[2])
		var inf: Dictionary = info.get(str(t), {})
		var b := WallBlock.new()
		b.tile = Vector2i(x, y)
		b.kind = inf.get("builder", "cliff")
		var hp: float = float(c[4]) if (c[4] is float or c[4] is int) else 64.0
		if t == 15:
			hp = 30.0 + 11.0 * floor(hash2(3 * x, 5 * y) * 4.0)
		b.height = hp * Iso.WPX
		var fk: String = inf.get("wtexFace", "")
		var tk: String = inf.get("wtexTop", "")
		b.face_tex = Assets.tex(Assets.meta["wtex"][fk]) if fk != "" and Assets.meta["wtex"].has(fk) else null
		b.top_tex = Assets.tex(Assets.meta["wtex"][tk]) if tk != "" and Assets.meta["wtex"].has(tk) else null
		b.show_left = not WALLISH.has(type_at(Vector2(x + 0.5, y + 1.5)))
		b.show_right = not WALLISH.has(type_at(Vector2(x + 1.5, y + 0.5)))
		b.position = Iso.to_screen(Vector2(x + 0.5, y + 0.5))
		sorted.add_child(b)
		wall_nodes.append(b)

# ------------------------------------------------------------------ every drawn sprite (trees, rocks, props, decor, landmarks, objects)
func _sprites() -> void:
	for s in d.get("sprites", []):
		var tex: Texture2D = null
		var ox := 0.0
		var oy := 0.0
		var hr := 2.0
		var key: String = s["key"]
		if key.begins_with("p_crows"):
			key = key.replace("p_crows", "p_offering")   # no animals in the world: the crow props become offerings
		var set_name: String = s.get("set", "w55")
		if set_name == "landmark":
			tex = load("res://art/landmarks/%s.webp" % key) if ResourceLoader.exists("res://art/landmarks/%s.webp" % key) else null
			var lm := _landmark_meta(key)
			if lm.is_empty() or tex == null:
				continue
			ox = lm["foot"][0]
			oy = lm["foot"][1]
			hr = 2.0
		else:
			var e: Dictionary
			if set_name == "decor":
				e = Assets.piece("decor", key)
				hr = 4.0
			else:
				e = Assets.piece("trees", key)
				if not e.is_empty():
					hr = float(e.get("hr", 4))
				else:
					e = Assets.piece("world", key)
					hr = 2.0
			if e.is_empty():
				continue
			tex = Assets.tex(e["png"])
			ox = float(e.get("ox", tex.get_width() * 0.5))
			oy = float(e.get("oy", tex.get_height()))
			if e.has("hr"):
				hr = float(e["hr"])
		if tex == null:
			continue
		var holder := Node2D.new()
		var anchor := Iso.to_screen(Vector2(s["x"], s["y"]))
		var dep: float = float(s.get("d", float(s["x"]) + float(s["y"])))
		holder.position = Vector2(anchor.x, dep * Iso.HY)
		var sp := Sprite2D.new()
		sp.texture = tex
		var sm := _sway_mat(key)
		if sm:
			sp.material = sm
		sp.centered = false
		sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var sc := Iso.WPX / hr * float(s.get("scale", 1.0))
		sp.scale = Vector2(sc, sc)
		sp.flip_h = bool(s.get("flip", false))
		sp.offset = Vector2(-(tex.get_width() - ox) if sp.flip_h else -ox, -oy)
		sp.position = Vector2(0, anchor.y - dep * Iso.HY)
		holder.add_child(sp)
		holder.set_meta("item", s.get("item", ""))
		sorted.add_child(holder)

var _lm_meta := {}
func _landmark_meta(key: String) -> Dictionary:
	if _lm_meta.is_empty():
		var f := FileAccess.open("res://art/landmarks/landmarks.json", FileAccess.READ)
		if f:
			var j = JSON.parse_string(f.get_as_text())
			if j is Dictionary:
				for k in j:
					_lm_meta[k] = j[k]
			elif j is Array:
				for e in j:
					_lm_meta[e.get("key", "")] = e
	var v = _lm_meta.get(key, _lm_meta.get(key.trim_prefix("lm_"), {}))
	return v if v is Dictionary else {}

# ------------------------------------------------------------------ lights
func _lights() -> void:
	for L in d.get("lights", []):
		var rgb: Array = String(L.get("rgb", "255,180,110")).split(",")
		var col := Color8(int(rgb[0]), int(rgb[1]), int(rgb[2]))
		var p: Vector2
		var rad := 3.0
		if L["type"] == "fire":
			p = Iso.to_screen(Vector2(L["x"], L["y"])) + Vector2(float(L.get("dxPx", 0)) * Iso.WPX, -float(L.get("heightPx", 0)) * Iso.WPX)
			rad = float(L.get("radius", 4.0))
		elif L["type"] == "raw":
			p = Iso.to_screen(Vector2(L["x"], L["y"]))
			rad = float(L.get("radiusPx", 40.0)) / 36.0
		else:
			p = Iso.to_screen(Vector2(L["x"], L["y"]))
			rad = float(L.get("radiusPx", 36.0)) / 36.0
		var a := float(L.get("a", 1.0))
		var fl := Lights.flicker(sorted, p, col, clampf(a * 0.45, 0.2, 1.3), rad * Iso.HX * 2.0 / 512.0 * 1.2, L["type"] == "fire")
		fl.set_meta("dark_skip", true)   # the dark layer draws these pools itself, from the data
		fl.enabled = false

func ambient_at(phase: float) -> Color:
	var arr: Array = d.get("ambient", {}).get("byPhase", [])
	if arr.is_empty():
		return Color(0.4, 0.42, 0.46)
	# the web blends the sky smoothly through the hour (ambient37: smoothstep of dayK); the export samples it every
	# 1/24 of the day, so blend between the two rows either side
	var i0 := 0
	for i in arr.size():
		if float(arr[i]["phase"]) <= phase:
			i0 = i
	var a0: Dictionary = arr[i0]
	var a1: Dictionary = arr[(i0 + 1) % arr.size()]
	var p0 := float(a0["phase"])
	var p1 := float(a1["phase"]) if i0 + 1 < arr.size() else 1.0 + float(arr[0]["phase"])
	var k := clampf((phase - p0) / maxf(0.0001, p1 - p0), 0.0, 1.0)
	var c0: Array = a0["rgb"]
	var c1: Array = a1["rgb"]
	return Color8(int(c0[0]), int(c0[1]), int(c0[2])).lerp(Color8(int(c1[0]), int(c1[1]), int(c1[2])), k)


## the wind's materials (shaders/sway.gdshader): young trees lean a little, cloth and cobwebs more, chains swing
var sway_mats := {}
var ground_cls = null        # the ground class per tile (for footsteps)
var ground_keys := {}

## what the ground is made of under a tile, as the feet hear it: wet | stone | leaf | ash
func surface_at(t: Vector2) -> String:
	var x := int(floor(t.x))
	var y := int(floor(t.y))
	if ground_cls == null or x < 0 or y < 0 or x >= w or y >= h:
		return "stone"
	var key: String = ground_keys.get(str(ground_cls[y * w + x]), "main")
	if key in ["water", "shallow", "bog", "mud"]:
		return "wet"
	if key in ["flags", "road", "crypt", "barrow", "bone", "arena"] or not d.get("outdoor", false):
		return "stone"
	var th: String = str(d.get("theme", ""))
	if th.contains("wood") or th.contains("root") or th.contains("fen"):
		return "leaf"
	return "ash"
func _sway_mat(key: String) -> ShaderMaterial:
	var kind := ""
	if key.contains("_sapling") or key.contains("_young"):
		kind = "tree"
	elif key.begins_with("p_cloth") or key.begins_with("p_cobweb") or key.begins_with("p_banner"):
		kind = "cloth"
	elif key.begins_with("p_chains") or key.begins_with("p_wallchain") or key.begins_with("p_gibbet") or key.begins_with("p_cage"):
		kind = "chain"
	if kind == "":
		return null
	if not sway_mats.has(kind):
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/sway.gdshader")
		m.set_shader_parameter("amp", {"tree": 5.0, "cloth": 9.0, "chain": 4.0}[kind])
		m.set_shader_parameter("speed", {"tree": 1.1, "cloth": 2.2, "chain": 1.6}[kind])
		sway_mats[kind] = m
	return sway_mats[kind]
