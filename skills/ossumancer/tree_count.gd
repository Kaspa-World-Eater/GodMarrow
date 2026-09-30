extends "res://skills/ossumancer/tree_carapace.gd"
## The Ossuarch, part 4 of 5: the Count tree, his melee strikes and the numerology curses. Every strike costs poise,
## never Marrow, and is a D2-style skill on either button (hold to keep striking).
## Bone Blade: for one stroke his weapon grows a long blade of bone: it hits harder, reaches 0.45 yd farther and
## cleaves into the enemies beside the one struck.

func strike_blade(a: Vector2, target) -> bool:
	var reach: float = hero._reach() + MELEE["blade"]
	var m = target if target != null and is_instance_valid(target) and not target.dead else melee_target(a, reach)
	if m == null or m.tp.distance_to(hero.tp) > reach + m.radius + 0.1:
		return false
	var dmg := weapon_avg() * hero.st.melee_mult() * blade_k()
	hurt(m, dmg, "blade", {"melee": true})
	# the cleave: the nearest others beside the one struck
	var others: Array = foes(m.tp, 1.3).filter(func(o): return o != m and o.tp.distance_to(hero.tp) < reach + o.radius + 0.4)
	others.sort_custom(func(x, y): return x.tp.distance_to(m.tp) < y.tp.distance_to(m.tp))
	for o in others.slice(0, cleave_n()):
		hurt(o, dmg * cleave_k(), "blade", {"melee": true})
	dust(m.tp, 4)
	Sfx.play("hit", 0.8, 0.8)
	cast_len = 0.5 / hero.st.cast_speed()
	return true
