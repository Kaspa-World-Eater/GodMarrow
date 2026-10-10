extends Node
## The opening cave's pool, alive (Derek, 2026-10-10: its drips' ripples "are frozen"; "should have ripples in the blood
## when we step in it"; "depth to the pool so we sink when we go in or out"). Made by world/baked_ground.gd when the
## zone carries a "pool" (tools/landkit3d/cave_export.py):
## - rings on the surface, drawn by the ground's shader (shaders/baked_ground.gdshader, `pool`): where the blood out of the
##   faces' mouths strikes it, a ring every half second or so from each rope; and wherever a body moves in it (the hero's
##   footfalls and, crawling, its hands: entities/hero.gd footfall);
## - the wading depth under a body (`depth_at`), which sinks the live body to its true waterline (entities/body3d.gd).

static var me = null

var mat: ShaderMaterial
var data: Dictionary
var spouts: Array = []
var rings: Array = []          # [world px x, y, age, strength]
var clocks: Array = []

func _init(m: ShaderMaterial, zd: Dictionary) -> void:
	mat = m
	data = zd.get("pool", {})
	for s in zd.get("spouts", []):
		spouts.append(Vector2(float(s["x"]), float(s["y"])))
		clocks.append(randf() * 0.6)

func _enter_tree() -> void:
	me = self

func _exit_tree() -> void:
	if me == self:
		me = null

## a ring at a tile (strength 1 a step, less a hand or a drip)
func ring(tile: Vector2, strength: float = 1.0) -> void:
	var p := Iso.to_screen(tile)
	rings.append([p.x, p.y, 0.0, strength])
	while rings.size() > 12:
		rings.pop_front()

## how deep the blood is over the floor at a tile (metres): deepest at the heart, nothing past the shore, falling off
## smoothly between, so a body wading out climbs out of it step by step
func depth_at(tile: Vector2) -> float:
	if data.is_empty():
		return 0.0
	var d := tile.distance_to(Vector2(float(data["cx"]), float(data["cy"])))
	var deep := (float(data["surface"]) - float(data["floor_deep"])) * 0.9144 * 0.85
	return deep * (1.0 - smoothstep(0.0, float(data["r_shore"]), d))

func _process(dt: float) -> void:
	# the ropes of blood out of the faces' mouths, each striking the surface on its own uneven clock
	for i in spouts.size():
		clocks[i] -= dt
		if clocks[i] <= 0.0:
			clocks[i] = randf_range(0.45, 0.8)
			ring(spouts[i] + Vector2(randf_range(-0.12, 0.12), randf_range(-0.12, 0.12)), randf_range(0.45, 0.7))
	for r in rings:
		r[2] += dt
	rings = rings.filter(func(r): return r[2] < 1.8)
	var arr: Array = []
	for i in 12:
		arr.append(Vector4(rings[i][0], rings[i][1], rings[i][2], rings[i][3]) if i < rings.size() else Vector4(0, 0, 0, 0))
	mat.set_shader_parameter("rings", arr)
