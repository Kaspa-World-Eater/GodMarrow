extends Node
## Autoload "Game": the run's state that outlives a zone (hero, time of day, which zones are generated).

var cls := "animancer"
var seed := 0
var day_len := 600.0
var clock := 0.12 * 600.0
var zone_seeds := {}       # zone id -> exported seed chosen for this run (maps are random per new game)
var visited := {}

func new_run() -> void:
	seed = randi()
	zone_seeds.clear()
	clock = 0.12 * day_len

func seed_for(zid: String) -> int:
	if not zone_seeds.has(zid):
		var seeds: Array = Data.zone_seeds(zid)
		zone_seeds[zid] = int(seeds[(hash(str(seed) + zid) & 0x7fffffff) % seeds.size()])
	return zone_seeds[zid]

func phase() -> float:
	return fmod(clock / day_len, 1.0)

func _process(dt: float) -> void:
	clock += dt
