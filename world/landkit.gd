class_name Landkit
extends RefCounted
## The landkit objects in a zone (tools/landkit/: each a generator painting a reusable object with its normal map,
## collision posts and combat data; tools/landkit/build_set.py writes a whole ecosystem's set into art/landkit/<set>/
## with index.json). A zone of that land has its trees, deadwood and stones stood in from the set by role
## (the generator's sprite keys say what stands where), every one lit by the lantern through its normal map
## (shaders/cm_prop_lit.gdshader), solid at its foot (zone.add_post), long ones cut into strips that each sort at
## their own depth (a log lies across many tiles), and the floor life the ecosystem puts round them derived from them
## (ferns in the damp beside logs, fungus on the soft wood, moss at the feet). --landkit=0 switches it off.

const SETS := {"wood": "old_growth"}
const ROLE := {
	"sp_oldgrowth_ancient": "tree_giant", "sp_oldgrowth_mature": "tree_middle", "sp_oldgrowth_young": "tree_young",
	"sp_oldgrowth_sapling": "tree_sapling", "sp_oldgrowth_dying": "tree_dying", "sp_oldgrowth_dead": "snag",
	"sp_oldgrowth_snag": "snag", "sp_oldgrowth_stump": "stump", "sp_oldgrowth_fallen": "log", "rk": "rock",
}
const KX := 18.0                # world px per yard along a tile's x (tools/landkit/kit.py)
const STRIP := 24               # px per depth strip of a long object

static var _index := {}
static var _tex := {}

class Prop extends Node2D:
	var spr: Sprite2D           # what world/see_through.gd measures (a tree's crown)

static func set_for(land: String) -> String:
	var sc = Engine.get_main_loop().current_scene
	if sc and sc.get("args") is Dictionary and str(sc.args.get("landkit", "1")) == "0":
		return ""
	var s: String = SETS.get(land, "")
	if s == "" or not FileAccess.file_exists("res://art/landkit/%s/index.json" % s):
		return ""
	return s

static func index(s: String) -> Dictionary:
	if not _index.has(s):
		var f := FileAccess.open("res://art/landkit/%s/index.json" % s, FileAccess.READ)
		_index[s] = JSON.parse_string(f.get_as_text()) if f else {}
	return _index[s]

static func tex(path: String) -> Texture2D:
	if _tex.has(path):
		return _tex[path]
	var t: Texture2D = null
	if ResourceLoader.exists(path):
		t = load(path)
	else:                       # not imported yet (fresh from the generator): read the file itself
		var img := Image.load_from_file(ProjectSettings.globalize_path(path))
		if img:
			t = ImageTexture.create_from_image(img)
	_tex[path] = t
	return t

static func ground(s: String, base: Dictionary) -> Dictionary:
	var out := base.duplicate()
	var g: Dictionary = index(s).get("ground", {})
	for k in g:
		var arr: Array = []
		for p in g[k]:
			arr.append("res://art/landkit/%s/%s" % [s, p])
		out[k] = arr
	return out

static func role_of(key: String) -> String:
	var k := key
	while k.length() > 0 and k[-1] >= "0" and k[-1] <= "9":
		k = k.substr(0, k.length() - 1)
	return ROLE.get(k, "")

## a piece of that role, the same one for the same place every time
static func pick(s: String, role: String, x: float, y: float, salt: int = 0) -> String:
	var names: Array = index(s).get("roles", {}).get(role, [])
	if names.is_empty():
		return ""
	var hsh := absi(int(x * 7919.0) * 31 + int(y * 104729.0) * 17 + salt * 7)
	return names[hsh % names.size()]

static var _mats := {}

## lit by the lantern through its normal map (shaders/landkit_lit.gdshader), swaying when sway > 0
static func lit(flip: bool, sway: float, canopy := false) -> ShaderMaterial:
	var key := "%s/%.2f/%s" % [flip, sway, canopy]
	if not _mats.has(key):
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/landkit_lit.gdshader")
		m.set_shader_parameter("flipped", flip)
		m.set_shader_parameter("sway", sway)
		m.set_shader_parameter("canopy", canopy)
		_mats[key] = m
	return _mats[key]

static func _sprite(s: String, file: String, flip: bool, sway: float, canopy := false) -> Sprite2D:
	var sp := Sprite2D.new()
	var ct := CanvasTexture.new()
	ct.diffuse_texture = tex("res://art/landkit/%s/%s.webp" % [s, file])
	ct.normal_texture = tex("res://art/landkit/%s/%s_n.webp" % [s, file])
	sp.texture = ct
	sp.centered = false
	sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sp.scale = Vector2.ONE * Iso.WPX
	sp.flip_h = flip
	sp.material = lit(flip, sway, canopy)
	return sp

## stand one piece at tile position tp (depth dep). Returns its holder(s), or [] when there is no room.
static func place(zone, s: String, name: String, tp: Vector2, dep: float, flip: bool, check_room := true) -> Array:
	var meta: Dictionary = index(s).get("pieces", {}).get(name, {})
	if meta.is_empty():
		return []
	var posts: Array = meta.get("posts", [])
	if check_room:
		for p in posts:
			var q := tp + (Vector2(p[1], p[0]) if flip else Vector2(p[0], p[1]))
			if not zone._cm_room(q, float(p[2])):
				return []
	var foot := Vector2(meta["foot"][0], meta["foot"][1])
	var size := Vector2(meta["size"][0], meta["size"][1])
	var anchor := Iso.to_screen(tp)
	var holders: Array = []
	var axis: String = meta.get("axis", "")
	var layers: Array = meta.get("layers", [""])
	var main := Prop.new()
	if axis != "":
		# a long object: column strips, each sorted at the depth of the object's axis under it
		var c0 := 0
		while c0 < int(size.x):
			var c1 := mini(c0 + STRIP, int(size.x))
			var sx := (c0 + c1) * 0.5 - foot.x
			var off := sx / KX * (1.0 if axis == "x" else -1.0)
			var h := Prop.new()
			var sp := _sprite(s, name, flip, 0.0)
			sp.region_enabled = true
			sp.region_rect = Rect2(c0, 0, c1 - c0, size.y)
			sp.offset = Vector2((foot.x - c1) if flip else (c0 - foot.x), -foot.y)
			h.position = Vector2(anchor.x, (dep + off) * Iso.HY)
			sp.position = Vector2(0, anchor.y - (dep + off) * Iso.HY)
			h.add_child(sp)
			h.spr = sp
			holders.append(h)
			c0 = c1
	else:
		main.position = Vector2(anchor.x, dep * Iso.HY)
		for L in layers:
			var file: String = name if L in ["", "trunk"] else name + "_" + L
			var sp := _sprite(s, file, flip, float(meta.get("sway", 0.0)) if L == "crown" else 0.0, L == "crown")
			sp.offset = Vector2(-(size.x - foot.x) if flip else -foot.x, -foot.y)
			sp.position = Vector2(0, anchor.y - dep * Iso.HY)
			main.add_child(sp)
			main.spr = sp
		holders.append(main)
	for h in holders:
		h.set_meta("landkit", name)
		h.set_meta("item", str(meta.get("kind", "")))
		zone.sorted.add_child(h)
	# the moon's shadow on the ground under it
	var shp := "res://art/landkit/%s/%s_shadow.webp" % [s, name]
	if FileAccess.file_exists(shp):
		var sh := Sprite2D.new()
		sh.texture = tex(shp)
		sh.centered = false
		sh.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		sh.scale = Vector2.ONE * Iso.WPX
		sh.flip_h = flip
		sh.offset = Vector2(-(size.x - foot.x) if flip else -foot.x, -foot.y)
		sh.position = anchor
		sh.z_index = -90
		sh.modulate.a = 0.45
		zone.add_child(sh)
	for p in posts:
		var q := tp + (Vector2(p[1], p[0]) if flip else Vector2(p[0], p[1]))
		zone.add_post(q, float(p[2]))
	var big := float(meta.get("height", 0.0)) > 2.5
	if big and zone.see != null:
		for h in holders:
			zone.see.props.append([h, h])
	if posts.size() > 0:
		zone._cm_taken.append([tp, float(meta.get("radius_yd", 0.5)) * (1.4 if axis == "" else 1.0)])
	return holders

## the zone's sprite placed from the set; true when it was ours to place (even if there was no room for it)
static func take(zone, s: String, spr: Dictionary) -> bool:
	var role := role_of(str(spr.get("key", "")))
	if role == "":
		return false
	var x := float(spr["x"])
	var y := float(spr["y"])
	var tp := Vector2(x, y)
	var dep := float(spr.get("d", x + y))
	var flip := bool(spr.get("flip", false))
	if role == "log":
		# the fresh falls of the big trees still hold their root plates up at the butt
		var cls := 1 + absi(int(x * 13.0 + y * 7.0)) % 5
		var name := pick(s, "log_c%d" % cls, x, y)
		var held := place(zone, s, name, tp, dep, flip)
		if held.is_empty():
			return true
		var L := float(index(s)["pieces"][name].get("length_yd", 4.0))
		if cls <= 2 and absi(int(x * 3.0 + y * 5.0)) % 2 == 0:
			var bp := tp + (Vector2(0, -L * 0.5 - 0.3) if flip else Vector2(-L * 0.5 - 0.3, 0))
			place(zone, s, pick(s, "rootplate", x, y), bp, bp.x + bp.y, flip, false)
		_life_round(zone, s, tp, L, flip, cls)
		return true
	var name := pick(s, role, x, y)
	if name == "":
		return true
	var held := place(zone, s, name, tp, dep, flip)
	if not held.is_empty():
		if role == "stump":
			_life_round(zone, s, tp, 0.0, flip, 4)
		elif role in ["tree_giant", "tree_middle"]:
			_life_round(zone, s, tp, 0.0, flip, 0)
	return true

## the floor life a fallen log, a stump or a great foot makes round itself
static func _life_round(zone, s: String, tp: Vector2, L: float, flip: bool, cls: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(Vector2i(int(tp.x * 10), int(tp.y * 10)))
	var spots: Array = []
	var along := Vector2(0, 1) if flip else Vector2(1, 0)
	var side := Vector2(1, 0) if flip else Vector2(0, 1)
	var n := 2 + rng.randi_range(0, 3)
	for i in n:
		var t := rng.randf_range(-0.5, 0.5) * L
		var off := (0.7 + rng.randf() * 0.8) * (1.0 if rng.randf() < 0.5 else -1.0)
		var role := "fern"
		if cls >= 3 and rng.randf() < 0.45:
			role = "mushroom"
			off *= 0.6
		elif cls == 0 and rng.randf() < 0.5:
			role = "moss"
		elif rng.randf() < 0.3:
			role = "bracken"
		spots.append([role, tp + along * t + side * off])
	for e in spots:
		var q: Vector2 = e[1]
		if not zone._cm_room(q, 0.2):
			continue
		var name := pick(s, e[0], q.x, q.y)
		var meta: Dictionary = index(s)["pieces"].get(name, {})
		var file: String = name + ("_1" if int(meta.get("frames", 1)) > 1 else "_0")
		var sp := Sprite2D.new()
		sp.texture = tex("res://art/landkit/%s/%s.webp" % [s, file])
		if sp.texture == null:
			continue
		sp.centered = false
		sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		sp.scale = Vector2.ONE * Iso.WPX
		var foot := Vector2(meta["foot"][0], meta["foot"][1])
		sp.offset = -foot
		sp.flip_h = rng.randf() < 0.5
		if bool(meta.get("sway", false)):
			sp.material = lit(false, 0.7)
		var h := Node2D.new()
		var a := Iso.to_screen(q)
		h.position = Vector2(a.x, (q.x + q.y) * Iso.HY)
		sp.position = Vector2(0, a.y - (q.x + q.y) * Iso.HY)
		h.add_child(sp)
		h.set_meta("item", "flora")
		zone.sorted.add_child(h)
