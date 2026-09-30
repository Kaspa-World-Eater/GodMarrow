extends Node2D
## Godmarrow (Godot): the game scene. Builds the zone from the export, the hero, the creatures, light and camera,
## moves between zones through their gates and caves, and handles death and the lantern's return.

var zone: Zone
var hero: Hero
var cam: Camera2D
var ambient: CanvasModulate
var hud: Node
var dark: DarkLayer
var args := {}
var last_lantern := {}        # {zone, x, y}
var remnant := {}             # {zone, x, y, gold}
var travelling := false
var pending_load := {}        # a save waiting to be poured into the first hero (Continue)
const SaveIO := preload("res://core/save.gd")

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
	# Continue: the saved pilgrim, in a freshly rolled world, at the camp (--new starts over)
	if not args.has("new") and not args.has("demo") and SaveIO.exists():
		pending_load = SaveIO.read()
		if not pending_load.is_empty():
			Game.cls = pending_load.get("cls", Game.cls)
	ambient = CanvasModulate.new()
	add_child(ambient)
	dark = DarkLayer.new()
	add_child(dark)
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
	if args.has("panel"):   # captures: --panel=vendor|smith|stash|journal
		await get_tree().create_timer(1.0).timeout
		Bus.panel_requested.emit(args["panel"], "Maren the Gravekeeper" if args["panel"] == "vendor" else "Brannoc of the Nail")

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
	if not pending_load.is_empty():
		SaveIO.apply(self, pending_load)
		pending_load = {}
		if args.has("hour"):
			Game.clock = float(args["hour"]) * Game.day_len
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
	dark.bind(zone, hero)
	if hud and hud.has_method("bind"):
		hud.bind(hero, zone)
	if ResourceLoader.exists("res://world/objects.gd"):   # (world objects): town, objects, waystones, errands
		load("res://world/objects.gd").attach(self, zone, hero)
	Bus.zone_entered.emit(zid)
	save_game()
	await get_tree().create_timer(0.5).timeout
	travelling = false

## the save (core/save.gd): on entering a zone, touching a lantern, from the pause menu, and on quitting
func save_game() -> void:
	if hero != null and not hero.dead and not args.has("demo"):
		SaveIO.write(self)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_APPLICATION_PAUSED:
		save_game()

func _process(_dt: float) -> void:
	if hero == null or zone == null or travelling:
		return
	cam.position = hero.position + Vector2(0, -40)
	cam.offset = Vector2(randf_range(-1, 1), randf_range(-1, 1)) * Game.shake_amt if Game.shake_amt > 0.05 else Vector2.ZERO
	ambient.color = Color.WHITE   # the dark layer does the night now (web model)
	# gates and caves: walk onto one to go through
	for c in zone.connections:
		var p := Vector2(c["x"], c["y"])
		if hero.tp.distance_to(p) < 0.8 and not hero.dead:
			enter(c["to"], zone.id)
			return
	# lantern-stones: kindled by passing and set as the return point by touch (world/objects/manager.gd)
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

const DEATH_LINES := [
	"The body keeps walking a moment longer, then remembers.",
	"Your breath goes out and joins the Last Breath. It does not come back alone.",
	"Somewhere a lantern leans toward the place you fell.",
	"The ground takes you in, gently, the way it took the god.",
	"You were a shape. Now you are a story the ash will tell badly.",
	"The mourners in the ash come to look. They have always come to look.",
	"Bone, flesh, breath: each lets go of you in turn.",
	"The dark is warm here. That is the worst of it.",
	"Your name goes on the long list. Not in ink. Not yet.",
	"Somewhere below, something hungry marks the place, and waits."]
const RETURN_LINES := [
	"The lantern gives you back. It keeps a little, as it always does.",
	"You wake to wick-light, the taste of ash, and your own name.",
	"The flame leans toward you. It remembered.",
	"Breath returns, borrowed. The Last Breath lends, and counts.",
	"Again. The wick says a little longer. The wick always says a little longer.",
	"You stand where you last knelt. The ground is still warm from you.",
	"The ash parts to let you rise. It has seen this before.",
	"Back, and lighter by something. You will not know what until you need it.",
	"The lantern burned for you while you were gone. It is tired.",
	"Up, pilgrim. The road is still down, and still yours."]
var _last_death := -1
var _last_ret := -1

func _world_ui() -> Node:
	return get_tree().root.find_child("GodmarrowWorldUI", true, false)

func _pick(arr: Array, last: int) -> int:
	var i := randi() % arr.size()
	return (i + 1) % arr.size() if i == last else i

func _on_hero_died() -> void:
	var gold := hero.st.inv.gold
	hero.st.inv.gold = 0
	hero.st.kept = mini(3, hero.st.kept + 1)
	remnant = {"zone": zone.id, "x": hero.tp.x, "y": hero.tp.y, "gold": gold}
	if hero.skills:
		hero.skills.on_death()   # wisps, the golem and every summoned thing are cleared
	# whatever was chasing loses the scent
	for m in get_tree().get_nodes_in_group("monsters"):
		if m.brain and not m.boss and m.brain.state != "sleep":
			m.brain.set_state("sleep")
			m.awake = false
	_last_death = _pick(DEATH_LINES, _last_death)
	var W := _world_ui()
	if W:
		W.banner("ANIMA SEVERED", Color8(142, 38, 48), 3.2)
		W.whisper("", DEATH_LINES[_last_death], 3.0)
	else:
		Bus.say.emit(DEATH_LINES[_last_death], 3.0)
	await get_tree().create_timer(3.0).timeout
	var back_zone: String = last_lantern.get("zone", "moor")
	var at_self := back_zone == zone.id and not last_lantern.is_empty()
	if at_self:
		hero.revive(Vector2(last_lantern["x"], last_lantern["y"] + 1.2))
	else:
		await enter(back_zone, "__lantern" if not last_lantern.is_empty() else "")
		hero.revive(hero.tp)
	if hero.skills:
		hero.skills.on_lantern()
	_last_ret = _pick(RETURN_LINES, _last_ret)
	var W2 := _world_ui()
	if W2:
		W2.whisper("", RETURN_LINES[_last_ret], 5.0)

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
