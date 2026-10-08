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
	var cov := float(meta.get("cover", 0.0))
	for p in posts:
		var q := tp + (Vector2(p[1], p[0]) if flip else Vector2(p[0], p[1]))
		zone.add_post(q, float(p[2]))
		if cov > 0.0:
			zone.add_cover(q, float(p[2]), cov, str(meta.get("material", "")), holders[0])
	if zone.see != null:                # every object vanishes while it stands between the eye and the pilgrim
		for h in holders:
			zone.see.props.append([h, h])
	if posts.size() > 0:
		zone._cm_taken.append([tp, float(meta.get("radius_yd", 0.5)) * (1.4 if axis == "" else 1.0)])
	return holders

## The wood's layout (Derek 2026-10-07: "the random generation is clustering trees and other objects too much ...
## too many of the same objects ... the small trees cover a lot of the screen ... your seed generation needs to build
## open corridors and spaces"). The generator's spots are only offers: a piece stands there only if it keeps its
## kind's distance from its own kind, leaves the ways open (roads, gates, the arrival, lanterns), and is not in one
## of the wood's clearings; small trees are mostly gone and the rest dead; no variant twice within sight of itself.
const SPACING := {"tree": 5.5, "snag": 7.0, "stump": 4.0, "log": 6.5, "rock": 3.0}
const OPEN_KEYS := ["road", "flags"]
static var _placed := {}             # family -> [[tp, name], ...]
static var _guards: Array = []       # [point, radius]: the ways kept open

static func begin(zone, _s: String) -> void:
	_placed.clear()
	_guards.clear()
	var ar = zone.d.get("arrive", {})
	if ar is Dictionary:
		for k in ar:
			var e = ar[k]
			if e is Dictionary and e.has("x"):
				_guards.append([Vector2(e["x"], e["y"]), 4.5])
			elif e is Array and e.size() >= 2:
				_guards.append([Vector2(e[0], e[1]), 4.5])
	for c in zone.d.get("connections", []):
		if c is Dictionary and c.has("x"):
			_guards.append([Vector2(c["x"], c["y"]), 4.5])
	for L in zone.lanterns:
		_guards.append([Vector2(L["x"], L["y"]), 4.0])

static func _family(role: String) -> String:
	if role.begins_with("tree"):
		return "tree"
	if role.begins_with("log"):
		return "log"
	if role.begins_with("rock"):
		return "rock"
	return role

static func _open_way(zone, tp: Vector2, r: float) -> bool:
	for g in _guards:
		if tp.distance_to(g[0]) < float(g[1]):
			return true
	if zone.ground_cls == null:
		return false
	var n := int(ceil(r))
	for yy in range(-n, n + 1):
		for xx in range(-n, n + 1):
			var c := Vector2i(int(tp.x) + xx, int(tp.y) + yy)
			if Vector2(xx, yy).length() > r or c.x < 0 or c.y < 0 or c.x >= zone.w or c.y >= zone.h:
				continue
			var cls := int(zone.ground_cls[c.y * zone.w + c.x])
			if str(zone.ground_keys.get(str(cls), "")) in OPEN_KEYS:
				return true
	return false

static func _h2(a: int, b: int) -> float:
	return float(absi(hash(Vector2i(a * 7919, b * 104729))) % 1000) / 1000.0

## the wood's clearings: broad, soft-edged gaps in the canopy (value noise on a 12-yard lattice)
static func _clearing(tp: Vector2) -> bool:
	var q := tp / 12.0
	var i := Vector2i(int(floor(q.x)), int(floor(q.y)))
	var f := q - Vector2(i)
	var u := f * f * (Vector2(3, 3) - f * 2.0)
	var v := lerpf(lerpf(_h2(i.x, i.y), _h2(i.x + 1, i.y), u.x), lerpf(_h2(i.x, i.y + 1), _h2(i.x + 1, i.y + 1), u.x), u.y)
	return v > 0.66

static func _room_for(fam: String, tp: Vector2) -> bool:
	var dmin: float = SPACING.get(fam, 0.0)
	for e in _placed.get(fam, []):
		if tp.distance_to(e[0]) < dmin:
			return false
	return true

## a variant not standing within sight of itself
static func pick_fresh(s: String, role: String, tp: Vector2, fam: String) -> String:
	var names: Array = index(s).get("roles", {}).get(role, [])
	if names.is_empty():
		return ""
	var start := absi(int(tp.x * 7919.0) * 31 + int(tp.y * 104729.0) * 17) % names.size()
	for k in names.size():
		var nm: String = names[(start + k) % names.size()]
		var near := false
		for e in _placed.get(fam, []):
			if e[1] == nm and tp.distance_to(e[0]) < 14.0:
				near = true
				break
		if not near:
			return nm
	return names[start]

static func _mark(fam: String, tp: Vector2, name: String) -> void:
	if not _placed.has(fam):
		_placed[fam] = []
	_placed[fam].append([tp, name])

## the zone's sprite placed from the set; true when it was ours to place (even when the rules leave it out)
static func take(zone, s: String, spr: Dictionary) -> bool:
	var key0 := str(spr.get("key", ""))
	if key0.begins_with("lk:"):
		return take_named(zone, str(spr.get("set", s)), key0.substr(3), spr)
	var role := role_of(key0)
	if role == "":
		return false
	var x := float(spr["x"])
	var y := float(spr["y"])
	var tp := Vector2(x, y)
	var dep := float(spr.get("d", x + y))
	var flip := bool(spr.get("flip", false))
	# the generator stood a solid tile under every prop; the piece's own posts are its base now (none when it is left
	# out: then there is nothing there to walk into)
	var tl = spr.get("tile", [int(floor(x)), int(floor(y))])
	zone.free_tile(Vector2i(int(tl[0]), int(tl[1])))
	# the forest towers: every living tree is a towering one; small trees are mostly gone, the rest dead stumps
	var hsh := absi(int(x * 13.0 + y * 7.0))
	if role == "tree_sapling":
		if hsh % 5 != 0:
			return true
		role = "stump"
	elif role.begins_with("tree_") and not index(s).get("roles", {}).get("tree_towering", []).is_empty():
		role = "tree_towering"
	var fam := _family(role)
	if fam != "rock" and _open_way(zone, tp, 2.5):
		return true
	if fam in ["tree", "snag"] and _clearing(tp):
		return true
	if not _room_for(fam, tp):
		return true
	if role == "log":
		# the fresh falls of the big trees still hold their root plates up at the butt
		var cls := 1 + absi(int(x * 13.0 + y * 7.0)) % 5
		var name := pick_fresh(s, "log_c%d" % cls, tp, "log")
		var held := place(zone, s, name, tp, dep, flip)
		if held.is_empty():
			return true
		_mark("log", tp, name)
		var L := float(index(s)["pieces"][name].get("length_yd", 4.0))
		if cls <= 2 and absi(int(x * 3.0 + y * 5.0)) % 2 == 0:
			var bp := tp + (Vector2(0, -L * 0.5 - 0.3) if flip else Vector2(-L * 0.5 - 0.3, 0))
			place(zone, s, pick(s, "rootplate", x, y), bp, bp.x + bp.y, flip, false)
		_life_round(zone, s, tp, L, flip, cls)
		return true
	var name := pick_fresh(s, role, tp, fam)
	if name == "":
		return true
	var held := place(zone, s, name, tp, dep, flip)
	if not held.is_empty():
		_mark(fam, tp, name)
		if role == "tree_towering":
			_canopy_shade(zone, s, tp)
		if role == "stump":
			_life_round(zone, s, tp, 0.0, flip, 4)
		elif role in ["tree_giant", "tree_middle", "tree_towering"]:
			_life_round(zone, s, tp, 0.0, flip, 0)
	return true

## a shot stopped in cover: the object answers by what it is made of. Arrows and bolts stand in wood a while;
## fire takes dry deadwood and runs out over the litter, smoulders in wet; stone throws grit and the shot breaks
static func struck(zone, e: Array, p: Vector2, vel: Vector2, elem: String, look: String, height: float) -> void:
	var mat: String = e[3]
	if OS.has_environment("GM_COVERDBG"):
		print("COVER ", mat, " ", elem, " ", look, " at ", p)
	var AW = load("res://entities/ai/ai_world.gd")
	var w = AW.of(zone)
	var face: Vector2 = p - vel.normalized() * 0.08
	if mat.begins_with("wood") or mat == "earth_roots":
		if elem == "fire":
			if mat == "wood_dead_dry" or mat == "wood_living" and randf() < 0.35:
				w.fire(e[0], float(e[1]) + 0.5, 4.0, 9.0)
				w.wildfire(e[0] + vel.normalized() * -(float(e[1]) + 0.6), 24, 4.0)
			else:
				w.fire(face, 0.5, 2.0, 3.0)                # wet wood: it smoulders and goes out
		elif look in ["arrow", "bolt", "needle"]:
			var st := Stuck.new()
			st.dir = (Iso.to_screen(p + vel.normalized()) - Iso.to_screen(p)).normalized()
			st.h = height
			var a := Iso.to_screen(face)
			st.position = a
			zone.sorted.add_child(st)
		w.grit_burst(face, Color(0.42, 0.32, 0.22), 4, 0.4, height)
	elif mat == "stone":
		w.grit_burst(face, Color(0.55, 0.54, 0.52), 7, 0.6, height)
	Sfx.play("hit" if mat == "stone" else "break", 0.35, randf_range(0.8, 1.1))

## an arrow standing in the wood it struck, its fletching out; gone after a while
class Stuck extends Node2D:
	var dir := Vector2.RIGHT
	var h := 60.0
	var t := 9.0
	func _process(dt: float) -> void:
		t -= dt
		if t < 1.0:
			modulate.a = maxf(t, 0.0)
		if t <= 0.0:
			queue_free()
	func _draw() -> void:
		var o := Vector2(0, -h) - dir * 4.0
		draw_line(o - dir * 16.0, o + dir * 4.0, Color(0.62, 0.55, 0.44), 3.0)
		draw_line(o - dir * 16.0, o - dir * 12.0 + dir.orthogonal() * 4.0, Color(0.75, 0.72, 0.66), 2.0)

## the crown overhead, felt on the floor: a broad dappled shade round the foot of a towering tree, thrown a little
## away from the moon, with flecks where the leaves part
static func _canopy_shade(zone, s: String, tp: Vector2) -> void:
	var names: Array = index(s).get("roles", {}).get("canopy_shade", [])
	if names.is_empty():
		return
	var nm: String = names[absi(int(tp.x * 31.0 + tp.y * 17.0)) % names.size()]
	var meta: Dictionary = index(s)["pieces"].get(nm, {})
	var sh := Sprite2D.new()
	sh.texture = tex("res://art/landkit/%s/%s.webp" % [s, nm])
	if sh.texture == null:
		return
	sh.centered = false
	sh.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sh.scale = Vector2.ONE * Iso.WPX
	sh.offset = -Vector2(meta["foot"][0], meta["foot"][1])
	sh.flip_h = absi(int(tp.x + tp.y)) % 2 == 0
	sh.position = Iso.to_screen(tp + Vector2(1.2, -0.4))
	sh.z_index = -92
	zone.add_child(sh)

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

## a piece the forest generator chose by name (tools/worldgen/forest.py: "lk:<piece>"): it already decided the place,
## the spacing, the open ways and the variant (none the same within a screen), so it stands as it is, solid at its posts
static func take_named(zone, s: String, name: String, spr: Dictionary) -> bool:
	var x := float(spr["x"])
	var y := float(spr["y"])
	var tp := Vector2(x, y)
	var tl = spr.get("tile", [int(floor(x)), int(floor(y))])
	zone.free_tile(Vector2i(int(tl[0]), int(tl[1])))
	var held := place(zone, s, name, tp, float(spr.get("d", x + y)), bool(spr.get("flip", false)), false)
	if held.is_empty():
		return true
	var role := ""
	var roles: Dictionary = index(s).get("roles", {})
	for r in roles:
		if name in roles[r]:
			role = r
			break
	_mark(_family(role), tp, name)
	if role in ["tree_giant", "tree_dying"]:
		_canopy_shade(zone, "old_growth", tp)
	return true
