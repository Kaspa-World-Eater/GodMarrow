extends Node2D
## Godmarrow, Godot vertical slice, step 1: the pilgrims' camp on the Ashen Moor, the Pilgrim Road, a ruined chapel,
## and the Kneelers that kneel in the heather. Everything is laid out here in code so it can be read and changed.

const AREA := Rect2(-2600, -1800, 5200, 3600)
const ROAD_Y := 150.0
const CAMP := Vector2(-160, -60)

var world: Node2D
var hero: CharacterBody2D
var cam: Camera2D
var fog: ColorRect
var hud: Hud
var rng := RandomNumberGenerator.new()
var music: AudioStreamPlayer
var movement := 0

func _ready() -> void:
	rng.seed = 1917
	Assets.load_meta()
	var cm := CanvasModulate.new()
	cm.color = Color(0.34, 0.33, 0.38)
	add_child(cm)
	var ground := Sprite2D.new()
	ground.set_script(load("res://scripts/ground.gd"))
	add_child(ground)
	ground.build("moor", AREA, ROAD_Y, CAMP)
	world = Node2D.new()
	world.y_sort_enabled = true
	add_child(world)
	_camp()
	_chapel(Vector2(980, -560))
	_scatter()
	_waymarks()
	hero = CharacterBody2D.new()
	hero.set_script(load("res://scripts/hero.gd"))
	hero.position = CAMP + Vector2(40, 60)
	hero.add_to_group("hero")
	world.add_child(hero)
	hero.setup("animancer")
	hero.died.connect(_on_died)
	cam = Camera2D.new()
	cam.zoom = Vector2(2.0, 2.0)
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 6.0
	hero.add_child(cam)
	cam.make_current()
	_ash()
	_packs()
	_fog()
	hud = Hud.new()
	add_child(hud)
	hud.setup(hero, "The Ashen Moor", "The god's cheek. The ash is warm.")
	_music()
	if "--demo" in OS.get_cmdline_user_args():
		_demo()

func _road_y(x: float) -> float:
	return ROAD_Y + sin(x * 0.0021) * 160.0 + sin(x * 0.0057 + 1.3) * 50.0

func _free(p: Vector2, r: float) -> bool:
	if absf(p.y - _road_y(p.x)) < 95.0:
		return false
	if p.distance_to(CAMP) < 330.0:
		return false
	for c in world.get_children():
		if c.has_meta("r") and c.position.distance_to(p) < r + float(c.get_meta("r")):
			return false
	return true

## place a painted piece: cat "world" / "trees" / "decor"; r > 0 makes it solid
func piece(cat: String, id: String, p: Vector2, r: float = 0.0, flip: bool = false) -> Sprite2D:
	var e := Assets.piece(cat, id)
	if e.is_empty():
		push_warning("no piece " + cat + "/" + id)
		return null
	var s := Sprite2D.new()
	s.texture = Assets.tex(e["png"])
	s.centered = false
	s.scale = Vector2(0.5, 0.5)
	var ox: float = e.get("ox", s.texture.get_width() * 0.5)
	var oy: float = e.get("oy", s.texture.get_height() - 4)
	s.offset = Vector2(-ox, -oy)
	s.flip_h = flip
	if flip:
		s.offset.x = -(s.texture.get_width() - ox)
	s.position = p
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	s.set_meta("r", r if r > 0.0 else 6.0)
	world.add_child(s)
	if r > 0.0:
		var b := StaticBody2D.new()
		var c := CollisionShape2D.new()
		var sh := CircleShape2D.new()
		sh.radius = r
		c.shape = sh
		b.add_child(c)
		s.add_child(b)
		b.scale = Vector2(2, 2)
	return s

func _camp() -> void:
	# the pilgrims' camp: a tent, a banked fire, a lantern on its post, a cage no one talks about
	piece("decor", "tent", CAMP + Vector2(-110, -70), 26)
	var fire := piece("decor", "campfire", CAMP, 10)
	Lights.flicker(world, CAMP + Vector2(0, -10), Color(1.0, 0.72, 0.42), 1.5, 1.9)
	_embers(CAMP + Vector2(0, -6))
	piece("world", "lantern", CAMP + Vector2(130, -40), 6)
	Lights.flicker(world, CAMP + Vector2(130, -86), Color(1.0, 0.86, 0.62), 1.0, 1.1)
	piece("decor", "cage", CAMP + Vector2(-190, 40), 16)
	piece("world", "cairn1", CAMP + Vector2(90, 110), 10)
	piece("decor", "statue_saint", CAMP + Vector2(260, 120), 12)

func _chapel(c: Vector2) -> void:
	# a ruined chapel off the road: pillars, an arch, coffins pulled out and left
	var ids := [["pillar0", -120, -40], ["pillar1", 120, -40], ["pillar2", -120, 60], ["pillar0", 120, 60], ["arch0", 0, -90], ["rubble0", -60, 90], ["rubble1", 70, 110], ["coffin0", -30, 10], ["coffin2", 40, 30], ["skulls1", 10, 70], ["brazier1", -80, -10], ["grave0", 190, 20], ["grave2", 200, 90]]
	for d in ids:
		var solid: float = 12.0 if String(d[0]).begins_with("pillar") or String(d[0]).begins_with("arch") else 0.0
		piece("world", d[0], c + Vector2(d[1], d[2]), solid)
	Lights.flicker(world, c + Vector2(-80, -40), Color(1.0, 0.7, 0.4), 1.2, 1.5)

func _scatter() -> void:
	var trees := ["sp_ashoak_mature0", "sp_ashoak_mature0", "sp_ashoak_dying0", "sp_ashoak_snag0", "sp_ashoak_snag1", "sp_ashoak_snag2", "sp_ashoak_dead0", "sp_ashoak_young0", "sp_ashoak_ancient0", "sp_ashoak_fallen0"]
	var small := ["rk0", "rk1", "rk2", "rk3", "rkf0", "rkf1", "shrub0", "shrub1", "shrub2", "stump0", "stump1", "grave0", "grave1", "cairn0", "p_bones0", "p_bones1", "p_bones2"]
	var placed := 0
	var tries := 0
	while placed < 150 and tries < 4000:
		tries += 1
		var p := Vector2(rng.randf_range(AREA.position.x + 60, AREA.end.x - 60), rng.randf_range(AREA.position.y + 60, AREA.end.y - 60))
		# trees stand in loose groves
		var grove := sin(p.x * 0.0031) * cos(p.y * 0.0042) + sin(p.x * 0.0011 + p.y * 0.0017)
		if grove < 0.2 and rng.randf() < 0.75:
			continue
		if not _free(p, 30.0):
			continue
		piece("trees", trees[rng.randi() % trees.size()], p, 11.0, rng.randf() < 0.5)
		placed += 1
	placed = 0
	tries = 0
	while placed < 260 and tries < 5000:
		tries += 1
		var p := Vector2(rng.randf_range(AREA.position.x + 40, AREA.end.x - 40), rng.randf_range(AREA.position.y + 40, AREA.end.y - 40))
		if not _free(p, 10.0):
			continue
		var id: String = small[rng.randi() % small.size()]
		var src := "trees" if Assets.piece("trees", id).size() > 0 else "world"
		piece(src, id, p, 9.0 if id.begins_with("rk") else 0.0, rng.randf() < 0.5)
		placed += 1

func _waymarks() -> void:
	# lanterns along the Pilgrim Road, every so often, each with a soul in it
	var x := -2400.0
	while x < 2400.0:
		var p := Vector2(x, _road_y(x) - 110.0)
		if p.distance_to(CAMP) > 300.0:
			piece("world", "lantern", p, 6)
			Lights.flicker(world, p + Vector2(0, -46), Color(1.0, 0.86, 0.62), 0.9, 1.0)
		x += 620.0

func _packs() -> void:
	var spots := [Vector2(700, -80), Vector2(1100, -560), Vector2(-900, -700), Vector2(-1300, 500), Vector2(400, 700), Vector2(1700, 300), Vector2(-400, -1100), Vector2(1600, -1000)]
	for s in spots:
		for i in rng.randi_range(3, 5):
			var m := CharacterBody2D.new()
			m.set_script(load("res://scripts/monster.gd"))
			m.position = s + Vector2(rng.randf_range(-70, 70), rng.randf_range(-40, 40))
			world.add_child(m)
			m.setup(hero)

func _embers(p: Vector2) -> void:
	var e := CPUParticles2D.new()
	e.position = p
	e.amount = 14
	e.lifetime = 2.2
	e.direction = Vector2.UP
	e.spread = 25.0
	e.gravity = Vector2(4, -16)
	e.initial_velocity_min = 8.0
	e.initial_velocity_max = 22.0
	e.scale_amount_min = 0.8
	e.scale_amount_max = 1.4
	e.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	e.emission_rect_extents = Vector2(10, 3)
	var g := Gradient.new()
	g.set_color(0, Color(1.0, 0.6, 0.3, 0.9))
	g.set_color(1, Color(0.3, 0.2, 0.15, 0.0))
	e.color_ramp = g
	e.z_index = 30
	world.add_child(e)

func _ash() -> void:
	# ash that never quite settles
	var a := CPUParticles2D.new()
	a.amount = 90
	a.lifetime = 9.0
	a.preprocess = 9.0
	a.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	a.emission_rect_extents = Vector2(900, 520)
	a.direction = Vector2(1, 0.3)
	a.spread = 40.0
	a.gravity = Vector2(3, 5)
	a.initial_velocity_min = 4.0
	a.initial_velocity_max = 14.0
	a.scale_amount_min = 0.6
	a.scale_amount_max = 1.3
	a.color = Color(0.7, 0.68, 0.64, 0.35)
	a.local_coords = false
	a.z_index = 70
	cam.add_child(a)

func _fog() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	fog = ColorRect.new()
	fog.set_anchors_preset(Control.PRESET_FULL_RECT)
	fog.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = load("res://shaders/fog.gdshader")
	fog.material = m
	layer.add_child(fog)

func _process(_dt: float) -> void:
	if fog and cam:
		(fog.material as ShaderMaterial).set_shader_parameter("cam", cam.get_screen_center_position() * cam.zoom.x)

func _on_died() -> void:
	await get_tree().create_timer(1.2).timeout
	while not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		await get_tree().process_frame
	# the lantern carries you back to the camp
	hero.position = CAMP + Vector2(40, 60)
	hero.hp = hero.hp_max
	hero.dead = false
	hero.target = null
	hero.walking = false
	hero._set_pose("idle")
	hud.dead_l.visible = false
	hero.stats_changed.emit()

func _music() -> void:
	# the moor's two movements, rendered from the web build's score: the cello piece, then the second movement
	music = AudioStreamPlayer.new()
	music.volume_db = -6.0
	add_child(music)
	music.finished.connect(_next_movement)
	_next_movement()

func _next_movement() -> void:
	var files := ["res://audio/moor_a.ogg", "res://audio/moor_b.ogg"]
	var f: String = files[movement % files.size()]
	movement += 1
	if ResourceLoader.exists(f):
		music.stream = load(f)
		music.play()

## --demo (after "--" on the command line): the hero walks to the nearest pack and fights, for test captures
func _demo() -> void:
	await get_tree().create_timer(1.0).timeout
	hero.goal = Vector2(560, -60)
	hero.walking = true
	while hero.global_position.distance_to(hero.goal) > 10.0 and hero.walking:
		await get_tree().process_frame
	for i in 40:
		var best: Node2D = null
		var bd := 1e9
		for m in get_tree().get_nodes_in_group("monsters"):
			var d: float = m.global_position.distance_to(hero.global_position)
			if d < bd:
				bd = d
				best = m
		if best == null:
			break
		if i % 3 == 2:
			hero._cast(best.global_position + Vector2(0, -14))
		else:
			hero.target = best
		await get_tree().create_timer(0.6).timeout
