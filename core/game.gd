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

## the hour: day to 0.55, dusk to 0.66, night to 0.9, dawn to 1.0 (a 600 s day)
func hour_name() -> String:
	var p := phase()
	if p < 0.55:
		return "day"
	if p < 0.66:
		return "dusk"
	if p < 0.9:
		return "night"
	return "dawn"

func hour_speed() -> float:
	return {"dusk": 1.12, "night": 1.05, "dawn": 0.95}.get(hour_name(), 1.0)

func day_k() -> float:
	var p := phase()
	if p < 0.55:
		return 1.0
	if p < 0.66:
		return 1.0 - (p - 0.55) / 0.11
	if p < 0.9:
		return 0.0
	return (p - 0.9) / 0.1

## hit-stop: freeze the frame for a few hundredths of a second on heavy blows (checklist section 1)
var _stop := 0.0
func hitstop(secs: float) -> void:
	_stop = maxf(_stop, secs)
	Engine.time_scale = 0.05

func _process(dt: float) -> void:
	if _stop > 0.0:
		_stop -= dt / maxf(0.05, Engine.time_scale)
		if _stop <= 0.0:
			Engine.time_scale = 1.0
	clock += dt
