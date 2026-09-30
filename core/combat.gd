class_name Combat
extends RefCounted
## The damage pipeline, collapsed from the web build's wrapper chains (checklist sections 4-6).
## Elements: phys, magic, miasma, blood, void, radiance, fire, cold, poison.

const STAGGER := 1.2   # v79-v80: stagger is 20% stronger both ways

## the hero (or an ally) strikes a creature. Returns the life actually taken.
static func hit_monster(m: Monster, dmg: float, elem: String = "phys", from: Vector2 = Vector2.INF, opts: Dictionary = {}) -> float:
	if m == null or m.dead or m.buried:
		return 0.0
	var d := dmg
	if elem == "phys":
		d *= 100.0 / (100.0 + m.armor)
	d *= m.damage_taken_mult(elem, from, opts)
	var res: float = m.resists.get(elem, 0.0)
	d *= 1.0 - clampf(res, -100.0, 75.0) / 100.0
	if m.reeling > 0.0:
		d *= 1.25
	elif m.after_reel > 0.0:
		d *= 1.12
	# the finishing blow: a melee blow on a reeling creature lands x2.2 (once per reel)
	if opts.get("melee", false) and m.reeling > 0.0 and m.finisher_lock <= 0.0:
		d *= 2.2
		m.finisher_lock = 1.5
		opts["finisher"] = true
	d = maxf(d, 0.0)
	m.hp -= d
	var pd: float = opts.get("poise", d) * STAGGER
	m.add_poise_damage(pd, bool(opts.get("heavy", false)))
	m.on_hit(d, elem, from, opts)
	if m.hp <= 0.0:
		m.die(from)
	return d

## a creature strikes the hero. Returns the life lost.
static func hit_hero(h: Hero, dmg: float, elem: String = "phys", from: Vector2 = Vector2.INF, opts: Dictionary = {}) -> float:
	if h == null or h.dead or h.invuln > 0.0:
		return 0.0
	var st := h.st
	var d := dmg
	if st.dim_wick:
		d *= 1.15
	if elem == "phys":
		d *= 100.0 / (100.0 + st.armor())
	else:
		var r: float = st.resist(elem)
		d *= 1.0 - clampf(r, -100.0, 75.0) / 100.0
		d = minf(d, dmg * 2.0)
	d = h.absorb(d, elem)
	st.hp -= d
	var heavy := d > st.life_max() * 0.12 or bool(opts.get("heavy", false))
	var pd := maxf(4.0, d * 1.8 * (1.5 if heavy else 1.0)) * STAGGER
	if opts.has("poise"):
		pd = float(opts["poise"])
	h.poise_hit(pd, from, heavy)
	Bus.hero_hit.emit(d)
	if st.hp <= 0.0:
		st.hp = 0.0
		h.die()
	h.stats_changed.emit()
	return d

## everything in a circle
static func monsters_in(zone: Zone, c: Vector2, r: float) -> Array:
	var out: Array = []
	for m in zone.get_tree().get_nodes_in_group("monsters"):
		if not m.dead and not m.buried and m.tp.distance_to(c) <= r + m.radius:
			out.append(m)
	return out

static func nearest_monster(zone: Zone, c: Vector2, r: float, need_sight: bool = false) -> Monster:
	var best: Monster = null
	var bd := r
	for m in zone.get_tree().get_nodes_in_group("monsters"):
		if m.dead or m.buried:
			continue
		var d: float = m.tp.distance_to(c)
		if d < bd and (not need_sight or zone.sight_clear(c, m.tp)):
			bd = d
			best = m
	return best
