extends Node
## Diablo 2's rule: only what is near the pilgrim lives. A creature more than WAKE yards from them is frozen where it
## stands (its brain, its steps, its animation) and wakes as they come near, as D2 keeps only the rooms round the player
## active. A zone holds hundreds of creatures (the moor near 600); running every one of them every frame cost most of
## the frame on a laptop. Bosses and the dying are never frozen.

const WAKE := 30.0          # yards: about two screens out from the pilgrim
const EVERY := 0.25         # seconds between looks

var g                       # core/main.gd
var t := 0.0

func _init(main) -> void:
	g = main
	name = "Sleepers"

func _process(dt: float) -> void:
	t -= dt
	if t > 0.0:
		return
	t = EVERY
	var h = g.hero
	if h == null or not is_instance_valid(h):
		return
	var r2 := WAKE * WAKE
	for m in get_tree().get_nodes_in_group("monsters"):
		var near: bool = m.boss or m.dead or (m.tp as Vector2).distance_squared_to(h.tp) < r2
		var want := Node.PROCESS_MODE_INHERIT if near else Node.PROCESS_MODE_DISABLED
		if m.process_mode != want:
			m.process_mode = want
