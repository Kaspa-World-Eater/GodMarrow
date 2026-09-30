extends Node2D
## Godmarrow (Godot): the game scene. Builds the zone from the export, the hero, the creatures, light and camera,
## and moves between zones through their gates and caves.

var zone: Zone
var hero: Hero
var cam: Camera2D
var ambient: CanvasModulate
var hud: CanvasLayer
var args := {}

func _ready() -> void:
	randomize()
	Assets.load_meta()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=")
		args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	Game.new_run()
	if args.has("cls"):
		Game.cls = args["cls"]
	ambient = CanvasModulate.new()
	add_child(ambient)
	cam = Camera2D.new()
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 8.0
	add_child(cam)
	enter(args.get("zone", "moor"), "")

func enter(zid: String, from: String) -> void:
	if zone:
		zone.queue_free()
		await get_tree().process_frame
	zone = Zone.new()
	add_child(zone)
	move_child(zone, 0)
	zone.load_zone(zid, Game.seed_for(zid))
	var at: Vector2
	if from != "" and zone.arrive.has(from):
		at = Vector2(zone.arrive[from]["x"], zone.arrive[from]["y"])
	else:
		at = Vector2(zone.markers["start"]["x"], zone.markers["start"]["y"])
	var old_stats: HeroStats = hero.st if hero else null
	if hero:
		hero.queue_free()
	hero = Hero.new()
	hero.st = old_stats
	zone.sorted.add_child(hero)
	hero.setup(zone, Game.cls, at)
	for m in zone.d.get("monsters", []):
		var mon := Monster.new()
		zone.sorted.add_child(mon)
		mon.setup(zone, m)
	cam.position = hero.position
	cam.reset_smoothing()

func _process(_dt: float) -> void:
	if hero == null or zone == null:
		return
	cam.position = hero.position + Vector2(0, -40)
	var amb := zone.ambient_at(Game.phase())
	ambient.color = amb.darkened(0.35)
	# gates and caves: step onto one to go through
	for c in zone.connections:
		if hero.tp.distance_to(Vector2(c["x"], c["y"])) < 0.9 and not hero.walking:
			pass
	_cut_walls()

## walls in front of the hero go thin so he is never lost behind them (the web cuts them to a stub)
func _cut_walls() -> void:
	for b: WallBlock in zone.wall_nodes:
		var t := Vector2(b.tile) + Vector2(0.5, 0.5)
		var dt := t - hero.tp
		var infront := (t.x + t.y) > (hero.tp.x + hero.tp.y) and dt.length() < 4.0
		b.set_cut(infront)
