extends "res://skills/ossumancer/tree_ossuary.gd"
## The Ossuarch, part 3 of 5: the Carapace tree, bone spells and plate. The Mantle (the shards he pulls out of the
## ground, which hang about him as armour, army and fuel; hold it to plant his feet and pull four times as fast) and
## Bone Lance (a lance of packed bone grown dead straight, piercing everything in its line).

# ------------------------------------------------------------------ the Mantle
func tick_mantle(dt: float) -> void:
	pull_hold = maxf(0.0, pull_hold - dt)
	if pull_hold > 0.0:
		hero.walking = false
		if randf() < dt * 8.0:
			var a := randf() * TAU
			dust(hero.tp + Vector2(cos(a), sin(a)) * randf_range(0.6, 2.2), 1)
	var free := free_cap()
	shards = minf(shards, free)
	var in_flight := 0.0
	for b in motes:
		in_flight += float(b.get("val", 1.0))
	if shards + in_flight < free and not hero.dead:
		shard_t += dt * pull_rate()
		while shard_t >= 1.0:
			shard_t -= 1.0
			_tear_shard()
	else:
		shard_t = minf(shard_t, 0.9)
	_fly_shards(dt)

## a shard tears up out of the ground: behind a creature when one is near (so it cuts it on the way in)
func _tear_shard() -> void:
	var R := pull_r()
	var p: Vector2
	var near_foes: Array = foes(hero.tp, R - 0.3).filter(func(m): return m.awake)
	if not near_foes.is_empty() and randf() < 0.65:
		var m = near_foes.pick_random()
		var d: float = maxf(0.01, m.tp.distance_to(hero.tp))
		var dir: Vector2 = (m.tp - hero.tp) / d
		p = hero.tp + dir * minf(R, d + randf_range(0.6, 1.8)) + dir.orthogonal() * randf_range(-0.4, 0.4)
	else:
		var a := randf() * TAU
		p = hero.tp + Vector2(cos(a), sin(a)) * randf_range(R * 0.45, R)
	if zone.is_solid(p):
		p = hero.tp + (p - hero.tp) * 0.5
	motes.append({"tp": p, "z": 0.0, "rise": 0.22, "out": 0.0, "v": Vector2.ZERO, "spd": 4.0, "t": 0.0, "dmg": mote_dmg(), "hit": {}, "val": 1.0})
	dust(p, 2)

func _fly_shards(dt: float) -> void:
	for b in motes:
		b["t"] += dt
		if b["rise"] > 0.0:
			b["rise"] -= dt
			b["z"] = 7.0 * (1.0 - maxf(0.0, b["rise"]) / 0.22)
			continue
		if b["out"] > 0.0:
			b["out"] -= dt
			b["tp"] += b["v"] * dt
			b["z"] = 6.0
		else:
			var to: Vector2 = hero.tp - b["tp"]
			var d := to.length()
			b["spd"] = minf(15.0, b["spd"] + 22.0 * dt)
			b["tp"] += to / maxf(d, 0.001) * minf(d, b["spd"] * dt)
			b["z"] = 6.0 + sin(b["t"] * 10.0) * 1.2
			if d < 0.35 or hero.dead:
				b["done"] = true
				if not hero.dead:
					shards = minf(free_cap(), shards + b["val"])
					if K("reforge") > 0:
						hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.015 * b["val"])
				continue
		if b["dmg"] > 0.0:
			for m in mons():
				if b["hit"].has(m) or m.tp.distance_to(b["tp"]) > m.radius + 0.15:
					continue
				b["hit"][m] = true
				hurt(m, b["dmg"], "aura", {"poise": 0.0})
		if b["t"] > 4.0:
			b["done"] = true
	motes = motes.filter(func(b): return not b.get("done", false))

## the Mantle turns part of every blow, and now and then a shard is knocked loose
func absorb(d: float, _elem: String) -> float:
	d *= 1.0 - turned()
	if shards >= 1.0 and d > 1.0 and randf() < 0.25:
		shards -= 1.0
		dust(hero.tp, 2)
	return d

# ------------------------------------------------------------------ Bone Lance
func cast_lance(a: Vector2) -> bool:
	var dir := (a - hero.tp).normalized() if a.distance_to(hero.tp) > 0.05 else Vector2(1, 1).normalized()
	spears.append({"tp": hero.tp + dir * 0.3, "v": dir * 13.0, "t": 0.75, "dmg": spear_dmg(), "hit": {}, "splint": K("splinter") > 0, "main": true, "small": false})
	Sfx.play("cast_mirror", 0.6, 0.7)
	return true

func tick_spears(dt: float) -> void:
	for s in spears:
		s["t"] -= dt
		for k in 3:
			if s["t"] <= 0.0:
				break
			var nxt: Vector2 = s["tp"] + s["v"] * dt / 3.0
			if zone.blocks_sight(nxt):
				s["t"] = 0.0
				dust(s["tp"], 6)
				break
			s["tp"] = nxt
			for m in mons():
				if s["hit"].has(m) or m.tp.distance_to(s["tp"]) > m.radius + 0.2:
					continue
				s["hit"][m] = true
				hurt(m, s["dmg"], "spear", {"from": s["tp"] - s["v"].normalized()})
				dust(m.tp, 3)
				if s["main"] and K("impale") > 0 and m.rank != "boss":
					m.stun = maxf(m.stun, 0.6)
				if s["splint"]:
					s["splint"] = false
					var ang: float = s["v"].angle()
					for o in [1.1, -1.1]:
						spears.append({"tp": m.tp, "v": Vector2(cos(ang + o), sin(ang + o)) * 10.0, "t": 0.35, "dmg": s["dmg"] * 0.5, "hit": {m: true}, "splint": false, "main": false, "small": true})
	spears = spears.filter(func(s): return s["t"] > 0.0)
