extends Node2D
## The living world (the fork; Derek 2026-10-05: "Animation is what makes the world feel alive. Little movement,
## organic."). Its own design:
##  - grass, reeds, ferns and plants sway in one shared wind, each on its own beat, and part for bodies walking
##    through (shaders/cm_sway.gdshader); trees lean slowly from the top; banners, cloth and chains flutter;
##  - what glows (shrines, sigils, lit things) breathes, a slow swell and settle;
##  - dust motes drift in the lantern's light;
##  - on warm nights, fireflies drift and blink at the edges of the dark (drawn over the dark, layer 6).
## Owned by the zone (world/cm_zone.gd attaches it), so it goes with the map.

const SWAY := {
	"grass": {"amp": 1.6, "speed": 1.6, "stiff": 1.4, "flutter": 0.0},
	"tree": {"amp": 1.2, "speed": 0.55, "stiff": 2.6, "flutter": 0.0},
	"cloth": {"amp": 1.4, "speed": 1.9, "stiff": 1.0, "flutter": 1.0},
}

var zone
var mats := {}
var glows: Array = []          # [node, phase]
var t := 0.0
var wind := 1.0
var wind_to := 1.0
var motes: Array = []          # [pos (world), vel, life, max]
var flies: Array = []          # [pos, vel, phase]
var fly_layer: CanvasLayer
var fly_canvas: Node2D
var mote_canvas: Node2D

## which bend a prop takes, by Cursemark's own shader names on it and its sprite's name
static func kind_of(o: Dictionary) -> String:
	var sh := str(o.get("shaders", "")) if o.get("shaders") != null else ""
	var spr := str(o.get("sprite", "")) if o.get("sprite") != null else ""
	if sh.contains("Grass") or spr.contains("grass") or spr.contains("reed") or spr.contains("fern") or spr.contains("plant") or spr.contains("bush") or spr.contains("flower") or spr.contains("shrub"):
		return "grass"
	if spr.contains("tree") and not spr.contains("stump") and not spr.contains("dead_tree_fallen"):
		return "tree"
	if spr.contains("banner") or spr.contains("flag") or spr.contains("cloth") or spr.contains("chain") or spr.contains("rope") or spr.contains("hanging"):
		return "cloth"
	return ""

func setup(z) -> void:
	zone = z
	mote_canvas = Node2D.new()
	mote_canvas.z_index = 30
	add_child(mote_canvas)
	mote_canvas.draw.connect(_draw_motes)
	fly_layer = CanvasLayer.new()
	fly_layer.layer = 6
	fly_layer.follow_viewport_enabled = true
	add_child(fly_layer)
	fly_canvas = Node2D.new()
	fly_layer.add_child(fly_canvas)
	fly_canvas.draw.connect(_draw_flies)

## one material per kind of bend and sprite height (a few dozen in a map), shared by every prop alike
func _mat(k: String, h: int) -> ShaderMaterial:
	var key := "%s:%d" % [k, h]
	if not mats.has(key):
		var m := ShaderMaterial.new()
		m.shader = load("res://shaders/cm_sway.gdshader")
		for p in SWAY[k]:
			m.set_shader_parameter(p, SWAY[k][p])
		m.set_shader_parameter("height_px", float(h))
		m.set_meta("kind", k)
		mats[key] = m
	return mats[key]

## give a drawn prop its life
func adopt(node: Node2D, o: Dictionary) -> void:
	var k := kind_of(o)
	if k != "" and node.get("spr") != null:
		var s: Sprite2D = node.spr
		s.material = _mat(k, int(s.region_rect.size.y if s.region_enabled else 24.0))
	if str(o.get("shaders", "")).contains("Glow") or node.get("gspr") != null and node.gspr != null:
		glows.append([node, randf() * TAU])

func _process(dt: float) -> void:
	t += dt
	# one wind for the whole land: it rises and falls slowly
	if randf() < dt * 0.15:
		wind_to = randf_range(0.5, 1.6)
	wind = move_toward(wind, wind_to, dt * 0.2)
	var pushers := PackedVector3Array()
	var h = zone.hero_ref
	if h and is_instance_valid(h):
		pushers.append(Vector3(h.position.x, h.position.y, 70.0))
	for m in get_tree().get_nodes_in_group("monsters"):
		if pushers.size() >= 8:
			break
		if not m.dead and h and m.position.distance_to(h.position) < 1400.0:
			pushers.append(Vector3(m.position.x, m.position.y, 60.0))
	for k in mats:
		var mat: ShaderMaterial = mats[k]
		mat.set_shader_parameter("wind", wind)
		mat.set_shader_parameter("n_push", pushers.size() if mat.get_meta("kind") == "grass" else 0)
		var pa := pushers.duplicate()
		pa.resize(8)
		mat.set_shader_parameter("pushers", pa)
	# glows breathe
	for g in glows:
		var n = g[0]
		if is_instance_valid(n) and n.gspr != null:
			n.gspr.self_modulate.a = 0.75 + 0.25 * sin(t * 1.3 + g[1])
	_tick_motes(dt, h)
	_tick_flies(dt, h)
	mote_canvas.queue_redraw()
	fly_canvas.queue_redraw()

# ------------------------------------------------------------------ dust in the lantern's light
func _tick_motes(dt: float, h) -> void:
	if h == null or not is_instance_valid(h) or h.dead:
		motes.clear()
		return
	var R: float = h.light_radius() * Iso.YD * 0.8
	if motes.size() < 26 and randf() < dt * 14.0:
		var a := randf() * TAU
		var p: Vector2 = h.position + Vector2(cos(a), sin(a) * 0.8) * randf() * R + Vector2(0, -randf() * 120.0)
		var life := randf_range(3.0, 7.0)
		motes.append([p, Vector2(randf_range(-6, 6), randf_range(-10, -3)), life, life])
	for i in range(motes.size() - 1, -1, -1):
		var m: Array = motes[i]
		m[2] -= dt
		m[1] += Vector2(sin(t * 0.7 + i) * 4.0 * wind, cos(t * 0.5 + i * 1.3) * 2.0) * dt
		m[0] += m[1] * dt
		if m[2] <= 0.0 or m[0].distance_to(h.position) > R * 1.1:
			motes.remove_at(i)

func _draw_motes() -> void:
	for m in motes:
		var life: float = m[2] / m[3]
		var a := sin(life * PI) * 0.55
		var p: Vector2 = (m[0] / 4.0).floor() * 4.0
		mote_canvas.draw_rect(Rect2(p, Vector2(4, 4)), Color(1.0, 0.9, 0.7, a))

# ------------------------------------------------------------------ fireflies at the edge of the dark
func _tick_flies(dt: float, h) -> void:
	var warm: bool = str(zone.d.get("land", "")) in ["forest", "lowlands", "swamp", "coast"]
	var night := 1.0 - smoothstep(0.35, 0.8, Game.day_k())
	if h == null or not is_instance_valid(h) or not warm or night < 0.3 or zone.d.get("town", false) and false:
		flies.clear()
		return
	var R: float = h.light_radius() * Iso.YD
	var want := int(10 * night)
	if flies.size() < want and randf() < dt * 3.0:
		var a := randf() * TAU
		var p: Vector2 = h.position + Vector2(cos(a), sin(a)) * randf_range(R * 1.1, R * 2.6)
		flies.append([p, Vector2.ZERO, randf() * TAU])
	for i in range(flies.size() - 1, -1, -1):
		var f: Array = flies[i]
		f[1] = f[1].lerp(Vector2(sin(t * 0.6 + f[2] * 3.0), cos(t * 0.45 + f[2] * 2.0)) * 26.0, dt * 0.8)
		f[0] += f[1] * dt
		if f[0].distance_to(h.position) > R * 3.2:
			flies.remove_at(i)

func _draw_flies() -> void:
	var night := 1.0 - smoothstep(0.35, 0.8, Game.day_k())
	for f in flies:
		# a slow blink: lit for a while, then gone, each on its own beat
		var b := sin(t * 0.9 + f[2] * 5.0)
		if b < 0.2:
			continue
		var a := (b - 0.2) / 0.8 * 0.8 * night
		var p: Vector2 = (f[0] / 4.0).floor() * 4.0
		fly_canvas.draw_rect(Rect2(p, Vector2(4, 4)), Color(0.85, 1.0, 0.55, a))
		fly_canvas.draw_rect(Rect2(p - Vector2(4, 0), Vector2(12, 4)), Color(0.85, 1.0, 0.55, a * 0.15))
		fly_canvas.draw_rect(Rect2(p - Vector2(0, 4), Vector2(4, 12)), Color(0.85, 1.0, 0.55, a * 0.15))
