extends Node2D
## Godmarrow (Godot): the game scene. Builds the zone from the export, the hero, the creatures, light and camera,
## moves between zones through their gates and caves, and handles death and the lantern's return.

var zone: Zone
var hero: Hero
var cam: Camera2D
var ambient: CanvasModulate
var hud: Node
var args := {}
var last_lantern := {}        # {zone, x, y}
var remnant := {}             # {zone, x, y, gold}
var travelling := false

func _ready() -> void:
	randomize()
	Assets.load_meta()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=")
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	Game.new_run()
	if args.has("cls"):
		Game.cls = args["cls"]
	if args.has("hour"):
		Game.clock = float(args["hour"]) * Game.day_len
	ambient = CanvasModulate.new()
	add_child(ambient)
	cam = Camera2D.new()
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 8.0
	add_child(cam)
	Bus.monster_killed.connect(_on_kill)
	if ResourceLoader.exists("res://ui/hud.gd"):
		hud = load("res://ui/hud.gd").new()
		add_child(hud)
	await enter(args.get("zone", "moor"), "")
	if args.has("demo"):
		_demo()

func enter(zid: String, from: String) -> void:
	travelling = true
	var old_stats: HeroStats = hero.st if hero else null
	var old_skills: SkillBook = hero.skills if hero else null
	if zone:
		zone.queue_free()
		zone = null
		hero = null
		await get_tree().process_frame
	zone = Zone.new()
	add_child(zone)
	move_child(zone, 0)
	zone.load_zone(zid, Game.seed_for(zid))
	var at: Vector2
	if from == "__lantern" and not last_lantern.is_empty():
		at = Vector2(last_lantern["x"], last_lantern["y"] + 1.2)
	elif from != "" and zone.arrive.has(from):
		at = Vector2(zone.arrive[from]["x"], zone.arrive[from]["y"])
	else:
		at = Vector2(zone.markers["start"]["x"], zone.markers["start"]["y"])
	hero = Hero.new()
	hero.st = old_stats
	hero.skills = old_skills
	zone.sorted.add_child(hero)
	hero.setup(zone, Game.cls, at)
	hero.died.connect(_on_hero_died)
	for m in zone.d.get("monsters", []):
		# the safe circle of a town holds no creatures
		var sc = zone.markers.get("safeCircle")
		if sc is Dictionary and Vector2(m["x"], m["y"]).distance_to(Vector2(sc["x"], sc["y"])) < float(sc["r"]):
			continue
		var mon := Monster.new()
		zone.sorted.add_child(mon)
		mon.setup(zone, m)
	cam.position = hero.position
	cam.reset_smoothing()
	if hud and hud.has_method("bind"):
		hud.bind(hero, zone)
	Bus.zone_entered.emit(zid)
	Bus.say.emit(zone.d.get("name", zid), 3.0)
	await get_tree().create_timer(0.5).timeout
	travelling = false

func _process(_dt: float) -> void:
	if hero == null or zone == null or travelling:
		return
	cam.position = hero.position + Vector2(0, -40)
	var amb := zone.ambient_at(Game.phase())
	ambient.color = amb.darkened(0.3)
	# gates and caves: walk onto one to go through
	for c in zone.connections:
		var p := Vector2(c["x"], c["y"])
		if hero.tp.distance_to(p) < 0.8 and not hero.dead:
			enter(c["to"], zone.id)
			return
	# lantern-stones: pass within 6 yd to kindle one (your return point)
	for L in zone.lanterns:
		var lp := Vector2(L["x"], L["y"])
		if hero.tp.distance_to(lp) < 6.0 and (last_lantern.get("zone", "") != zone.id or Vector2(last_lantern.get("x", 0), last_lantern.get("y", 0)) != lp):
			last_lantern = {"zone": zone.id, "x": lp.x, "y": lp.y, "name": L.get("name", "")}
			Bus.say.emit("The lantern at %s knows you." % L.get("name", "the stone"), 2.5)
	# the remnant: what the lantern kept waits where you fell
	if not remnant.is_empty() and remnant["zone"] == zone.id and not hero.dead:
		var rp := Vector2(remnant["x"], remnant["y"])
		if hero.tp.distance_to(rp) > 2.5:
			remnant["armed"] = true
		elif remnant.get("armed", false) and hero.tp.distance_to(rp) < 0.9:
			hero.st.inv.gold += int(remnant["gold"])
			hero.st.kept = 0
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.25)
			remnant = {}
			Bus.say.emit("The lantern takes back what it kept.", 2.5)
			hero.stats_changed.emit()
	_cut_walls()

## walls in front of the hero go thin so he is never lost behind them (the web cuts them to a stub)
func _cut_walls() -> void:
	for b: WallBlock in zone.wall_nodes:
		var t := Vector2(b.tile) + Vector2(0.5, 0.5)
		var dt := t - hero.tp
		if absf(dt.x) > 5.0 or absf(dt.y) > 5.0:
			if b._fade_to != 1.0:
				b.set_cut(false)
			continue
		b.set_cut((t.x + t.y) > (hero.tp.x + hero.tp.y) and dt.length() < 4.0)

# ------------------------------------------------------------------ kills, death, return
func _on_kill(m: Monster) -> void:
	if hero == null:
		return
	var gain := 1.0
	if hero.st.level > m.level + 5:
		gain = maxf(0.1, 1.0 - 0.15 * (hero.st.level - m.level - 5))
	if hero.st.add_xp(int(round(m.xp * gain))):
		Bus.level_up.emit(hero.st.level)
		Bus.say.emit("You feel the marrow settle. Level %d." % hero.st.level, 2.5)
	var lok := hero.st.item("lok")
	if lok > 0.0:
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + lok)
	if ResourceLoader.exists("res://items/loot.gd"):
		load("res://items/loot.gd").on_kill(zone, m, hero)
	hero.stats_changed.emit()

func _on_hero_died() -> void:
	var gold := hero.st.inv.gold
	hero.st.inv.gold = 0
	hero.st.kept = mini(3, hero.st.kept + 1)
	remnant = {"zone": zone.id, "x": hero.tp.x, "y": hero.tp.y, "gold": gold}
	Bus.say.emit("The lantern carries you back.", 3.0)
	await get_tree().create_timer(2.5).timeout
	var back_zone: String = last_lantern.get("zone", "moor")
	var at_self := back_zone == zone.id and not last_lantern.is_empty()
	if at_self:
		hero.revive(Vector2(last_lantern["x"], last_lantern["y"] + 1.2))
	else:
		await enter(back_zone, "__lantern" if not last_lantern.is_empty() else "")
		hero.revive(hero.tp)

# ------------------------------------------------------------------ --demo: fight the nearest creatures, for captures
func _demo() -> void:
	for i in 300:
		await get_tree().create_timer(0.3).timeout
		if hero == null or hero.dead:
			continue
		var m := Combat.nearest_monster(zone, hero.tp, 40.0)
		if m:
			hero.target = m
		if args.has("trace") and i % 5 == 0:
			print("T ", i, " hero ", hero.tp, " act ", hero.act, " walk ", hero.walking, " path ", hero.path.size(), " tgt ", (m.kind + " " + str(m.tp)) if m else "none", " hp ", hero.st.hp, " mons ", get_tree().get_nodes_in_group("monsters").size(), " thp ", (m.hp if m else -1.0), " missiles ", zone.sorted.get_children().filter(func(c): return c is Missile).size())
