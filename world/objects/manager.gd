extends Node2D
## The world's interactive objects in one zone (zz_quests.js, zd_world22.js, d_play.js interact, zz_voice.js,
## zz_landmarks55.js, zz_zz_maw95.js): townsfolk, chests, shrines, god altars and their Heralds, toppled statues,
## lantern-stones, waystones, the errands' relics, captives and shrines, landmarks' inscriptions, the town's safe
## circle. Made by world/objects.gd attach(); a child of the zone, so it goes when the zone goes.
## Click a thing to walk up to it and use it (no markers over anyone); walk into a waystone to learn it and travel.

const Q := preload("res://world/quests.gd")
const NPC := preload("res://world/objects/npc.gd")
const WAYSTONE := preload("res://world/objects/waystone.gd")
const GORE := preload("res://world/objects/gore.gd")
const SHRINE_TEXT := {"echo": "Shrine of Echoes: +50% skill damage", "wisp": "Shrine of the Wisp: more wisps, faster",
	"stone": "Shrine of Stone: +100 armor", "refill": "Refilling Shrine"}
const REACH := {"npc": 1.7, "vendor": 1.7, "chest": 1.5, "shrine": 1.5, "altar": 1.2, "lantern": 1.8, "relic": 1.6,
	"captive": 1.9, "qshrine": 1.7, "wp": 1.0}

static var _tex_cache := {}

var main: Node
var zone: Zone
var hero: Hero
var ui: Node
var passage: Node
var things: Array = []        # {type, o, i, tp, node, name, reach, rect: Callable}
var waystone: Node = null
var gore: Node2D
var pending = null
var hovered = null
var wp_near := false
var lantern_latch := {}
var mark_t := 0.0
var mark_cool := 0.0
var sweep_t := 0.0
var wave := {}
var safe_c := Vector2.ZERO
var safe_r := 0.0
var act_n := 1

func setup(m: Node, z: Zone, h: Hero) -> void:
	name = "WorldObjects"
	main = m
	zone = z
	hero = h
	ui = m.get_node_or_null("GodmarrowWorldUI")
	passage = m.get_node_or_null("WaystonePassage")
	act_n = Q.act_of(z.id)
	gore = GORE.new()
	gore.setup(z)
	gore.hero = h
	z.add_child(gore)
	var sc = z.markers.get("safeCircle")
	if sc is Dictionary:
		safe_c = Vector2(sc["x"], sc["y"])
		safe_r = float(sc["r"])
	for o in z.objects:
		_build(o)
	_clear_settled()
	Bus.monster_killed.connect(_on_kill)
	if Bus.has_signal("herald_felled"):
		Bus.connect("herald_felled", _on_herald)
	_on_enter()

func rebind(h: Hero) -> void:
	hero = h
	if gore:
		gore.hero = h
	pending = null

# ------------------------------------------------------------------ building
func _build(o: Dictionary) -> void:
	var i := int(o.get("i", -1))
	var tp := Vector2(o["x"], o["y"])
	var ty: String = o.get("type", "")
	var mem := Q.obj(zone.id, i)
	match ty:
		"lantern":
			_add("lantern", o, _holder(i), o.get("name", "Lantern"))
		"vendor":
			var n := NPC.new()
			n.setup("vendor", tp)
			zone.sorted.add_child(n)
			_add("vendor", o, n, o.get("name", "Maren the Gravekeeper"))
			_quiet_light(tp, 0.35)
		"chest":
			var h := _holder(i)
			if mem.get("open", false):
				_swap(h, "chest_open")
			_add("chest", o, h, "" if mem.get("open", false) else "Chest", not mem.get("open", false))
		"shrine":
			var h := _holder(i)
			var used: bool = mem.get("used", false) or (o.get("kind", "") == "arcana" and Q.state()["done"].has("shrine:" + zone.id))
			if used:
				_swap(h, "shrine_used")
			_add("shrine", o, h, Q.SHRINE_NAMES.get(o.get("kind", ""), "Shrine"), not used)
		"statue":
			var n := _art_node("statue%d" % (int(o.get("v", 0)) % 3), tp, Vector2(0, 0.3))
			_add("statue", o, n, "", false)
		"altar":
			_build_altar(o, tp, mem)
		"qobj":
			_build_qobj(o, tp, mem)

func _build_qobj(o: Dictionary, tp: Vector2, mem: Dictionary) -> void:
	var i := int(o.get("i", -1))
	match o.get("q", ""):
		"wp":
			waystone = WAYSTONE.new()
			add_child(waystone)
			waystone.setup(zone, o, Q.known_wp(zone.id))
			_add("wp", o, waystone.floor_n, o.get("name", "Waystone"))
			_quiet_light(tp, 0.3, Color(0.55, 0.62, 0.68))
		"npc":
			var role: String = o.get("role", "")
			if role == "stash":
				var h := _holder(i)
				if h == null:
					h = NPC.new()
					h.setup("stash", tp)
					zone.sorted.add_child(h)
				_add("npc", o, h, o.get("name", "The Reliquary Chest"))
			else:
				var n := NPC.new()
				n.setup(role, tp)
				zone.sorted.add_child(n)
				_add("npc", o, n, o.get("name", ""))
				_quiet_light(tp, 0.3)
		"relic":
			var q: String = o.get("qid", "")
			if Q.is_done(q) or mem.get("taken", false):
				return
			var n := _art_node("relic_book", tp)
			_add("relic", o, n, o.get("name", ""))
			_quest_glow(n)
			_quiet_light(tp, 0.55)
		"captive":
			var q: String = o.get("qid", "")
			if Q.is_done(q) or mem.get("freed", false):
				return
			var n := _art_node("captive", tp)
			_add("captive", o, n, o.get("name", ""))
			_quest_glow(n)
			_quiet_light(tp, 0.55)
		"shrine":
			var used: bool = mem.get("used", false) or Q.is_done(o.get("qid", ""))
			var n := _asset_node("shrine_used" if used else "shrine", tp)
			_add("qshrine", o, n, o.get("name", ""), not used)
			if not used:
				_quest_glow(n)
			_quiet_light(tp, 0.5)

func _build_altar(o: Dictionary, tp: Vector2, mem: Dictionary) -> void:
	var god: String = o.get("god", "bone")
	var g: Dictionary = Q.GODS.get(god, Q.GODS["bone"])
	var used: bool = mem.get("used", false) or Q.state()["done"].has("herald:" + god)
	if used:
		o["used"] = true     # AIWorld reads it: a spent altar stays cold
	var n := _asset_node("altar", tp, "decor")
	var beam := Node2D.new()
	beam.set_script(load("res://world/objects/beam.gd"))
	beam.set("col", g["rgb"])
	n.add_child(beam)
	beam.visible = not used and not mem.get("woke", false)
	_add("altar", o, n, "Altar of " + String(g["name"]), not used and not mem.get("woke", false))

func _add(ty: String, o: Dictionary, node: Node2D, nm: String, live: bool = true) -> Dictionary:
	var e := {"type": ty, "o": o, "i": int(o.get("i", -1)), "tp": Vector2(o["x"], o["y"]), "node": node, "name": nm,
		"reach": REACH.get(ty, 1.5), "live": live}
	things.append(e)
	return e

## the sprite the zone already drew for object i
func _holder(i: int) -> Node2D:
	var key := "object:%d" % i
	for c in zone.sorted.get_children():
		if c.has_meta("item") and c.get_meta("item") == key:
			return c
	return null

static func _piece(key: String, cat: String = "") -> Array:
	var e: Dictionary
	var hr := 4.0
	if cat == "decor":
		e = Assets.piece("decor", key)
		hr = 4.0
	else:
		e = Assets.piece("trees", key)
		if e.is_empty():
			e = Assets.piece("world", key)
			hr = 2.0
	if e.is_empty():
		return []
	if e.has("hr"):
		hr = float(e["hr"])
	return [Assets.tex(e["png"]), Vector2(float(e.get("ox", 0)), float(e.get("oy", 0))), hr]

## change the picture of a zone-drawn object (a chest opened, a shrine spent)
func _swap(h: Node2D, key: String) -> void:
	if h == null:
		return
	var p := _piece(key)
	if p.is_empty():
		return
	for c in h.get_children():
		if c is Sprite2D:
			var sp: Sprite2D = c
			sp.texture = p[0]
			var sc := Iso.WPX / float(p[2])
			sp.scale = Vector2(sc, sc)
			sp.offset = Vector2(-(p[0].get_width() - p[1].x) if sp.flip_h else -p[1].x, -p[1].y)
			return

func _asset_node(key: String, tp: Vector2, cat: String = "") -> Node2D:
	var n := Node2D.new()
	n.position = Iso.to_screen(tp)
	var p := _piece(key, cat)
	if not p.is_empty():
		var sp := Sprite2D.new()
		sp.texture = p[0]
		sp.centered = false
		sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var sc := Iso.WPX / float(p[2])
		sp.scale = Vector2(sc, sc)
		sp.offset = -p[1]
		n.add_child(sp)
	zone.sorted.add_child(n)
	return n

## art painted for this port (art/objects, see paint_objects.py)
func _art_node(key: String, tp: Vector2, depth_off: Vector2 = Vector2.ZERO) -> Node2D:
	var meta := _art_meta()
	var e: Dictionary = meta.get(key, {})
	var n := Node2D.new()
	n.position = Iso.to_screen(tp)
	var tex := _art_tex(e.get("png", ""))
	if tex:
		var sp := Sprite2D.new()
		sp.texture = tex
		sp.centered = false
		sp.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		var sc := Iso.WPX / float(e.get("hr", 2))
		sp.scale = Vector2(sc, sc)
		sp.offset = -Vector2(float(e.get("ox", 0)), float(e.get("oy", 0)))
		n.add_child(sp)
	zone.sorted.add_child(n)
	return n

static func _art_meta() -> Dictionary:
	if _tex_cache.has("__meta"):
		return _tex_cache["__meta"]
	var f := FileAccess.open("res://art/objects/objects.json", FileAccess.READ)
	var d = JSON.parse_string(f.get_as_text()) if f else {}
	_tex_cache["__meta"] = d if d is Dictionary else {}
	return _tex_cache["__meta"]

static func _art_tex(path: String) -> Texture2D:
	if path == "":
		return null
	if _tex_cache.has(path):
		return _tex_cache[path]
	var t: Texture2D = null
	if FileAccess.file_exists(path + ".import"):
		t = load(path)
	else:
		var img := Image.load_from_file(ProjectSettings.globalize_path(path))
		if img:
			t = ImageTexture.create_from_image(img)
	_tex_cache[path] = t
	return t

## a faint neutral light so a thing can be found in the dark (the web's light holes); never red
func _quiet_light(tp: Vector2, energy: float, col: Color = Color(0.82, 0.76, 0.66)) -> void:
	var l := PointLight2D.new()
	l.texture = Lights.radial(256)
	l.color = col
	l.energy = energy
	l.texture_scale = 1.3
	l.position = Iso.to_screen(tp) + Vector2(0, -40)
	l.set_meta("dark_dy", 40.0)   # the dark layer lays its pool on the ground
	zone.sorted.add_child(l)

## the faint gold breath under an errand's object (zz_quests qGroundDraw)
func _quest_glow(n: Node2D) -> void:
	var g := Node2D.new()
	g.set_script(load("res://world/objects/beam.gd"))
	g.set("mode", 1)
	g.set("col", Color8(217, 164, 65))
	g.show_behind_parent = true   # on the ground under the thing, never over its body
	n.add_child(g)
	n.move_child(g, 0)

# ------------------------------------------------------------------ zone entry
func _on_enter() -> void:
	var zid := zone.id
	var s := Q.state()
	if act_n > int(s["act"]) and not zid.begins_with("qvault_"):
		s["act"] = act_n
	var fresh := Q.activate(act_n)
	if fresh > 0:
		_later(2.6, func(): Bus.say.emit("New errands are written in your journal (J)", 4.0))
	if Q.is_town(zid):
		if Q.kindle_wp(zid) and waystone:
			waystone.open = 1.0
		if not s["seen"].has("t%d" % act_n):
			s["seen"]["t%d" % act_n] = true
			var tw: Dictionary = Q.TOWN.get(act_n, {})
			if tw.has("greet"):
				_later(2.4, func(): if ui: ui.speak_line(tw["greet"], 6.0))
	# arriving through a waystone
	if passage and passage.on and passage.phase == "wait":
		passage.arrive(zone, hero)

func _later(secs: float, f: Callable) -> void:
	var tm := get_tree().create_timer(secs)
	tm.timeout.connect(func(): if is_instance_valid(self): f.call())

## what the world already settled: fulfilled errands' creatures, a felled boss, a spent Herald
func _clear_settled() -> void:
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.zone != zone:
			continue
		var pk: String = m.pack
		var gone := false
		if pk.begins_with("q") and Q.is_done(pk.substr(1)):
			gone = true
		if m.boss and Q.felled(zone.id):
			gone = true
		if gone:
			m.remove_from_group("monsters")
			m.queue_free()

# ------------------------------------------------------------------ the frame
func _process(dt: float) -> void:
	if hero == null or not is_instance_valid(hero):
		return
	if waystone:
		waystone.tick(dt, Q.known_wp(zone.id))
	_tick_buffs(dt)
	_tick_altars()
	if main.travelling or (passage and passage.on):
		return
	_hover()
	if hero.dead:
		pending = null
		return
	# the town's safe circle: nothing may come in, nothing can hurt you there
	if safe_r > 0.0:
		if hero.tp.distance_to(safe_c) < safe_r:
			hero.invuln = maxf(hero.invuln, 0.15)
		sweep_t -= dt
		if sweep_t <= 0.0:
			sweep_t = 0.25
			_sweep()
	_proximity()
	_pending(dt)
	mark_cool -= dt
	mark_t -= dt
	if mark_t <= 0.0:
		mark_t = 0.4
		if mark_cool <= 0.0:
			_marks()
	if not wave.is_empty():
		wave["t"] = wave.get("t", 0.0) - dt
		if wave["t"] <= 0.0:
			wave["t"] = 0.25
			_wave_check()

func _sweep() -> void:
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.zone != zone or m.dead:
			continue
		if m.tp.distance_to(safe_c) < safe_r + 1.0:
			if m.home.distance_to(safe_c) > safe_r + 2.0:
				m.tp = m.home
				if m.brain:
					m.brain.state = "sleep"
			else:
				m.remove_from_group("monsters")
				m.queue_free()

func _proximity() -> void:
	# waystones: stand in one and it learns you; at the centre the travel panel opens
	if waystone:
		var d := hero.tp.distance_to(waystone.tp)
		if d < 3.2 and Q.kindle_wp(zone.id):
			Sfx.play("shrine", 0.8, 0.8)
			Bus.say.emit("%s knows your step." % zone.d.get("name", "The waystone"), 2.5)
			if ui:
				ui.speak(String(waystone.o.get("name", "Waystone")), String(waystone.o.get("vInscr", "")), -1.0, true)
		if d < 1.1:
			if not wp_near:
				wp_near = true
				_open_waystones()
		elif d > 2.4:
			wp_near = false
			if ui and ui.panel_open():
				ui.close_panel()
	# lantern-stones: remember every one passed within 6 yd; touch one to be restored
	for e in things:
		if e["type"] != "lantern":
			continue
		var d: float = hero.tp.distance_to(e["tp"])
		var key := "%s:%d" % [zone.id, int(e["o"].get("idx", 0))]
		if d < 6.0 and not Q.state()["lanterns"].has(key):
			Q.state()["lanterns"][key] = {"zone": zone.id, "x": e["tp"].x, "y": e["tp"].y, "name": e["name"]}
		if d < 1.3 and not lantern_latch.get(key, false):
			lantern_latch[key] = true
			_touch_lantern(e)
		elif d > 3.0:
			lantern_latch[key] = false

func _hover() -> void:
	var h = _thing_at_mouse()
	if h != hovered:
		hovered = h
		if ui:
			ui.hover(h["name"] if h else "")

func _thing_at_mouse():
	var mp := get_global_mouse_position()
	var mt := Iso.to_tile(mp)
	var best = null
	var by := -1e9
	for e in things:
		if not e["live"] or e["name"] == "":
			continue
		var node: Node2D = e["node"]
		var hit := false
		if node and is_instance_valid(node) and e["type"] != "wp":
			var r := _rect_of(node)
			hit = r.has_point(mp)
		if not hit:
			hit = mt.distance_to(e["tp"]) < (1.4 if e["type"] == "wp" else 0.7)
		if hit and node and node.global_position.y > by:
			by = node.global_position.y
			best = e
	return best

static func _rect_of(node: Node2D) -> Rect2:
	if node.has_method("click_rect"):
		return node.click_rect()
	for c in node.get_children():
		if c is Sprite2D and c.texture:
			var r: Rect2 = c.get_rect()
			return Rect2(c.global_position + r.position * c.scale, r.size * c.scale)
	return Rect2(node.global_position - Vector2(40, 120), Vector2(80, 130))

func _unhandled_input(ev: InputEvent) -> void:
	if hero == null or hero.dead or main.travelling or (passage and passage.on):
		return
	if ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
		var h = _thing_at_mouse()
		if h == null:
			pending = null
			return
		if hero.monster_at_mouse() != null and h["type"] != "npc" and h["type"] != "vendor":
			pending = null
			return
		pending = h
		hero.target = null
		hero.walk_to(_approach(h))
		get_viewport().set_input_as_handled()

func _approach(h: Dictionary) -> Vector2:
	var tp: Vector2 = h["tp"]
	if h["type"] == "wp":
		return tp
	var to := hero.tp - tp
	if to.length() < 0.01:
		return tp
	return tp + to.normalized() * minf(to.length(), float(h["reach"]) * 0.6)

func _pending(_dt: float) -> void:
	if pending == null:
		return
	if hero.target != null:
		pending = null
		return
	var d: float = hero.tp.distance_to(pending["tp"])
	if d <= float(pending["reach"]):
		var h = pending
		pending = null
		hero.walking = false
		_face(h["tp"])
		_interact(h)
		return
	if not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and (not hero.walking or hero.goal.distance_to(pending["tp"]) > float(pending["reach"])):
		hero.walk_to(_approach(pending))

func _face(tp: Vector2) -> void:
	var r := AnimSprite.hero_view(tp - hero.tp, hero.face)
	if r[0] != "":
		hero.view = r[0]
		hero.face = r[1]

# ------------------------------------------------------------------ using things
func _interact(e: Dictionary) -> void:
	if not e["live"]:
		return
	match e["type"]:
		"lantern":
			_touch_lantern(e)
		"vendor", "npc":
			_talk(e)
		"chest":
			_open_chest(e)
		"shrine":
			_use_shrine(e)
		"altar":
			_wake_altar(e)
		"wp":
			_open_waystones()
		"relic":
			_take_relic(e)
		"captive":
			_free_captive(e)
		"qshrine":
			_kneel(e)

func _say(who: String, text: String, inscr: bool = false) -> void:
	if ui:
		ui.speak(who, text, -1.0, inscr)

static func _short(s: String) -> String:
	var i := s.find(",")
	return s.substr(0, i) if i >= 0 else s

func _loot():
	return load("res://items/loot.gd") if ResourceLoader.exists("res://items/loot.gd") else null

func _shop():
	return load("res://items/shop.gd") if ResourceLoader.exists("res://items/shop.gd") else null

func _panel(p: String, who: String) -> void:
	if Bus.has_signal("panel_requested"):
		Bus.emit_signal("panel_requested", p, who)

func _talk(e: Dictionary) -> void:
	var o: Dictionary = e["o"]
	var role: String = "vendor" if e["type"] == "vendor" else String(o.get("role", ""))
	var nm: String = e["name"]
	var s := Q.state()
	match role:
		"vendor":
			_say(_short(nm), Q.bark(act_n, "vendor"))
			_panel("vendor", nm)
		"healer":
			var sh = _shop()
			if sh and sh.has_method("heal"):
				sh.heal(hero, nm)
			else:
				hero.st.hp = hero.st.life_max()
				hero.st.res = hero.st.res_max()
				hero.st.poise = hero.st.poise_max()
			hero.stats_changed.emit()
			_say(_short(nm), Q.bark(act_n, "healer"))
		"smith":
			_say(_short(nm), Q.bark(act_n, "smith"))
			_panel("smith", nm)
		"stash":
			_say(nm, Q.bark(act_n, "stash"), true)
			_panel("stash", nm)
		"giver":
			if not s["seen"].has("giver:" + nm):
				s["seen"]["giver:" + nm] = true
				var pend := Q.pending(act_n)
				var line := ("One errand remains." if pend == 1 else "%d errands remain." % pend) + " The dead are patient. I am less so." if pend > 0 else "Nothing left here that needs you. Go down."
				_say(_short(nm), line)
			else:
				_say(_short(nm), Q.bark(act_n, "giver"))
			_panel("journal", nm)
		"stranger":
			# his own lines and the voice's take turns
			e["alt"] = not e.get("alt", false)
			if e["alt"]:
				if ui:
					ui.speak_line(Q.stranger_line(act_n), 4.5)
			else:
				_say("The Stranger", Q.bark(act_n, "stranger"))

func _touch_lantern(e: Dictionary) -> void:
	var st := hero.st
	st.hp = st.life_max()
	st.res = st.res_max()
	st.poise = st.poise_max()
	hero.stats_changed.emit()
	Sfx.play("kindle")
	var o: Dictionary = e["o"]
	if "last_lantern" in main:
		main.last_lantern = {"zone": zone.id, "x": e["tp"].x, "y": e["tp"].y, "name": e["name"]}
	if hero.skills:
		hero.skills.on_lantern()
	if main.has_method("save_game"):
		main.save_game()
	var key := "%s:%d" % [zone.id, int(o.get("idx", 0))]
	Q.state()["lanterns"][key] = {"zone": zone.id, "x": e["tp"].x, "y": e["tp"].y, "name": e["name"]}
	_say(e["name"], Q.lantern_inscription(zone.id, o), true)
	_panel("lantern", e["name"])

func _open_chest(e: Dictionary) -> void:
	var mem := Q.obj(zone.id, e["i"])
	if mem.get("open", false):
		return
	mem["open"] = true
	e["live"] = false
	e["name"] = ""
	_swap(e["node"], "chest_open")
	Sfx.play("chest")
	var L = _loot()
	if L and L.has_method("open_chest"):
		L.open_chest(zone, e["tp"], int(e["o"].get("ilvl", 1)), hero)

func _use_shrine(e: Dictionary) -> void:
	var o: Dictionary = e["o"]
	var mem := Q.obj(zone.id, e["i"])
	if mem.get("used", false):
		return
	mem["used"] = true
	e["live"] = false
	Sfx.play("shrine")
	_swap(e["node"], "shrine_used")
	var kind: String = o.get("kind", "")
	var st := hero.st
	if kind == "arcana":
		if not Q.state()["done"].has("shrine:" + zone.id):
			Q.state()["done"]["shrine:" + zone.id] = true
			st.arcana_points += 1
			if ui:
				ui.banner("ARCANUM", Color8(232, 214, 160), 3.0)
			Bus.say.emit("A hidden shrine gives up an Arcanum.", 3.0)
	elif kind == "refill":
		st.hp = st.life_max()
		st.res = st.res_max()
		Bus.say.emit(SHRINE_TEXT["refill"], 2.5)
	else:
		_buff(kind, 60.0)
		Bus.say.emit(SHRINE_TEXT.get(kind, "Shrine"), 2.5)
	hero.stats_changed.emit()

## the shrines' blessings last 60 s, kept in hero.st.extra (echo x1.5 skill damage, stone +100 armor, wisp +2 wisps, +100% wisp regrowth)
const BUFF_STATS := {"echo": {"echo": 1.0}, "stone": {"armor": 100.0}, "wisp": {"shrine_wisp": 1.0}}   # echo: skill damage x1.5 (hero_stats.skill_mult); wisp: +2 choir, +100% regrowth (animancer)

func _buff(kind: String, secs: float) -> void:
	var b: Dictionary = Q.state().get("buffs", {})
	Q.state()["buffs"] = b
	if not b.has(kind):
		for k in BUFF_STATS.get(kind, {}):
			hero.st.extra[k] = float(hero.st.extra.get(k, 0.0)) + BUFF_STATS[kind][k]
	b[kind] = secs

func _tick_buffs(dt: float) -> void:
	var b: Dictionary = Q.state().get("buffs", {})
	if b.is_empty() or hero == null:
		return
	for kind in b.keys():
		b[kind] -= dt
		if b[kind] <= 0.0:
			b.erase(kind)
			for k in BUFF_STATS.get(kind, {}):
				hero.st.extra[k] = float(hero.st.extra.get(k, 0.0)) - BUFF_STATS[kind][k]
			hero.stats_changed.emit()

## the altar wakes when you come to it (entities/ai/ai_world.gd AIWorld, which raises the Herald); a click only walks
## you up to it. What we keep: its column goes out once it wakes, and a spent altar stays cold on every return.
func _wake_altar(_e: Dictionary) -> void:
	pass

func _tick_altars() -> void:
	for e in things:
		if e["type"] != "altar":
			continue
		var o: Dictionary = e["o"]
		var woke: bool = o.get("woke", false) or o.get("used", false)
		if woke and e["live"]:
			e["live"] = false
			for c in e["node"].get_children():
				if c is Node2D and c.get("mode") != null:
					c.visible = false
		if o.get("used", false):
			Q.obj(zone.id, e["i"])["used"] = true

func _open_spot(p: Vector2) -> Vector2:
	if not zone.is_solid(p):
		return p
	for r in range(1, 6):
		for k in 12:
			var a := k / 12.0 * TAU
			var q := p + Vector2(cos(a), sin(a)) * r
			if not zone.is_solid(q):
				return q
	return p

func _spawn(kind: String, at: Vector2, level: int, rank: String, mods: Array, pk: String) -> Monster:
	var m: Monster = Brain.spawn(zone, kind, _open_spot(at), level, rank, pk)
	if m and mods.has("Extra Fast"):
		m.mods = mods
		m.speed *= 1.4
	return m

# ------------------------------------------------------------------ errands in the world
func _take_relic(e: Dictionary) -> void:
	var qid: String = e["o"].get("qid", "")
	if Q.st(qid).is_empty() or Q.is_done(qid):
		return
	Q.obj(zone.id, e["i"])["taken"] = true
	e["live"] = false
	_vanish(e["node"])
	Q.complete(qid, hero, zone, e["tp"])

func _free_captive(e: Dictionary) -> void:
	var qid: String = e["o"].get("qid", "")
	if Q.st(qid).is_empty() or Q.is_done(qid):
		return
	var left := 0
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.zone == zone and not m.dead and m.pack == "q" + qid and m.tp.distance_to(e["tp"]) < 12.0:
			left += 1
	if left > 0:
		var who := "Her" if "Nell" in String(e["name"]) or "daughter" in String(e["name"]) else "Its"
		Bus.say.emit("%s keepers still stand (%d). Cut them down first." % [who, left], 2.5)
		return
	Q.obj(zone.id, e["i"])["freed"] = true
	e["live"] = false
	_vanish(e["node"])
	Q.complete(qid, hero, zone, e["tp"])

func _vanish(n: Node2D) -> void:
	if n == null or not is_instance_valid(n):
		return
	var tw := n.create_tween()
	tw.tween_property(n, "modulate:a", 0.0, 0.8)
	tw.tween_callback(n.queue_free)

## the errand's shrine: kneel, and hold it through two waves (5, then 6 with an Extra Fast champion)
func _kneel(e: Dictionary) -> void:
	var qid: String = e["o"].get("qid", "")
	if Q.st(qid).is_empty() or Q.is_done(qid) or not wave.is_empty():
		return
	_start_wave(e, qid, 0)

func _zone_type() -> Array:
	var c := {}
	var lvl := 0
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.zone != zone or m.dead or m.boss or m.rank == "unique" or m.ai == "bomber" or m.has_meta("qwave"):
			continue
		c[m.kind] = c.get(m.kind, 0) + 1
		lvl = maxi(lvl, m.level)
	var best := "hollow"
	var bn := 0
	for k in c:
		if c[k] > bn:
			bn = c[k]
			best = k
	return [best, lvl if lvl > 0 else int(zone.d.get("mlvl", [1, 5])[1])]

func _start_wave(e: Dictionary, qid: String, k: int) -> void:
	var zt := _zone_type()
	var n := 5 if k == 0 else 6
	wave = {"qid": qid, "k": k, "e": e, "t": 1.0}
	var q := Q.quest(qid)
	for i in n:
		var a := float(i) / n * TAU + randf()
		var r := 4.0 + randf() * 2.0
		var p: Vector2 = e["tp"] + Vector2(cos(a), sin(a)) * r
		if zone.is_solid(p):
			continue
		var champ := k == 1 and i == 0
		var m := _spawn(zt[0], p, zt[1], "champion" if champ else "normal", ["Extra Fast"] if champ else [], "qwave_" + qid)
		if m:
			m.set_meta("qwave", qid)
			if m.brain:
				m.brain.wake(m)
			Fx.blood(zone.sorted, m.position + Vector2(0, -20), Vector2.UP, 2)
	Bus.say.emit(("You kneel at %s. The drinkers of light come" % String(q.get("target", "it"))) if k == 0 else "Hold. More of them", 2.5)

func _wave_check() -> void:
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.zone == zone and not m.dead and m.has_meta("qwave") and m.get_meta("qwave") == wave["qid"]:
			return
	var e: Dictionary = wave["e"]
	var qid: String = wave["qid"]
	if int(wave["k"]) == 0:
		_start_wave(e, qid, 1)
		return
	wave = {}
	Q.obj(zone.id, e["i"])["used"] = true
	e["live"] = false
	var old: Node2D = e["node"]
	e["node"] = _asset_node("shrine_used", e["tp"])
	if is_instance_valid(old):
		old.queue_free()
	Q.complete(qid, hero, zone, e["tp"])

# ------------------------------------------------------------------ kills
func _on_kill(m) -> void:
	if not is_instance_valid(self) or m == null or m.zone != zone:
		return
	Q.on_kill(m, zone, hero)

## a Herald unmade (entities/ai/ai_herald.gd emits it; the Arcana system grants the Major Arcanum): remember the god
## and the altar, and the moment's banner
func _on_herald(m, god: String) -> void:
	if not is_instance_valid(self) or m == null or m.zone != zone:
		return
	var s := Q.state()
	for e in things:
		if e["type"] == "altar" and e["o"].get("god", "") == god:
			Q.obj(zone.id, e["i"])["used"] = true
	if s["done"].has("herald:" + god):
		return
	s["done"]["herald:" + god] = true
	s["majors"] = int(s.get("majors", 0)) + 1
	var g: Dictionary = Q.GODS.get(god, {})
	_later(0.9, func():
		if ui:
			ui.banner("MAJOR ARCANUM", Color8(232, 214, 160), 4.0)
			ui.speak("", "%s is unmade. A Major Arcanum is yours to set in your web (press A)." % g.get("herald", "The Herald"), 4.5))

# ------------------------------------------------------------------ landmarks: name and inscription the first time you pass
func _marks() -> void:
	var best = null
	var bd := 1e9
	var marks: Dictionary = Q.state()["marks"]
	for lm in zone.d.get("landmarks", []):
		var key := "%s:%s" % [zone.id, lm.get("id", "")]
		if marks.has(key):
			continue
		var half := minf(10.0, maxf(float(lm.get("fw", 2)), float(lm.get("fh", 2))) / 2.0)
		var c := Vector2(float(lm.get("x0", 0)) + float(lm.get("fw", 2)) / 2.0, float(lm.get("y0", 0)) + float(lm.get("fh", 2)) / 2.0)
		var d := hero.tp.distance_to(c) - half
		if d < 3.4 and d < bd:
			bd = d
			best = lm
	if best == null:
		return
	marks["%s:%s" % [zone.id, best.get("id", "")]] = true
	if ui:
		ui.whisper(String(best.get("name", "")), String(best.get("inscription", "")))
	mark_cool = 22.0

# ------------------------------------------------------------------ waystones
func _open_waystones() -> void:
	if ui == null:
		return
	Q.kindle_wp(zone.id)
	ui.open_waystones(act_n, zone.id, _travel)

func _travel(id: String) -> void:
	if id == zone.id:
		return
	if passage and passage.begin(id):
		return
	# not standing at one: plain travel, to the destination's waystone
	if passage:
		passage.plain(id)
