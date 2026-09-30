extends "res://skills/ossumancer/base.gd"
## The Ossuarch, part 2 of 5: the Ossuary tree, his dead. Raise Skeleton: the dead claw up out of his Mantle on their
## own whenever there is room (each holds 5 of its shards while it stands; one rises every 1.2 s, and a fallen one
## leaves six before the next). They rise armed in turn with shield, greatsword and halberd (the three squads' first
## loadouts; army orders come later). The skeletons themselves are skills/ossumancer/skeleton.gd.

## the dead: rise while there is room, and keep up with him
func tick_dead(dt: float) -> void:
	skels = skels.filter(func(e): return is_instance_valid(e) and not e.gone)
	rise_t -= dt
	if K("raise") <= 0 or hero.dead:
		return
	if skels.size() < skel_max() and rise_t <= 0.0 and SKEL_COST * (skels.size() + 1) <= mantle_cap() and shards >= SKEL_COST:
		rise_t = 1.2
		var a := randf() * TAU
		var p := clamp_cast(hero.tp + Vector2(cos(a), sin(a)) * 1.3, 2.0)
		if zone.is_solid(p):
			p = hero.tp
		raise_at(p)

func raise_at(p: Vector2) -> void:
	shards -= SKEL_COST
	var e = Skeleton.new()
	e.book = self
	e.tp = p
	e.load_id = _next_load()
	e.setup_numbers()
	zone.sorted.add_child(e)
	skels.append(e)
	dust(p, 10)
	Sfx.play("break", 0.35, 1.3)

func _next_load() -> String:
	var have := {}
	for e in skels:
		have[e.load_id] = int(have.get(e.load_id, 0)) + 1
	for i in LOAD_ORDER.size():
		var l: String = LOAD_ORDER[i]
		var want := LOAD_ORDER.slice(0, i + 1).count(l)
		if int(have.get(l, 0)) < want:
			return l
	return "shield"

## a skeleton fell: the next waits a while (its shards are gone with it)
func skel_fell(e) -> void:
	skels.erase(e)
	rise_t = maxf(rise_t, 6.0)
	dust(e.tp, 12)
	Sfx.play("break", 0.45, 1.5)
	if K("bburst") > 0:
		for i in 6:
			var a := i / 6.0 * TAU + randf() * 0.5
			motes.append({"tp": e.tp, "z": 4.0, "rise": 0.0, "out": 0.3, "v": Vector2(cos(a), sin(a)) * 8.0, "spd": 4.0, "t": 0.0,
				"dmg": (5.0 + 2.5 * (L1("raise") - 1.0)) * hero.st.skill_mult(), "hit": {}, "val": 0.25})

func clear_dead() -> void:
	for e in skels:
		if is_instance_valid(e):
			e.queue_free()
	skels.clear()
