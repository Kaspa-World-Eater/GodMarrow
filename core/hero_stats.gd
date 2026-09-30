class_name HeroStats
extends RefCounted
## The hero's numbers, as the web build derives them (checklist section 3; data/classes.json holds sampled tables).

var cls := "animancer"
var level := 1
var xp := 0
var vit := 15
var ess := 25
var con := 15
var attr_points := 0
var skill_points := 1
var gold := 40
var hp := 0.0
var res := 0.0
var poise := 0.0
var poise_delay := 0.0
var item_life := 0.0
var item_res := 0.0
var item_armor := 0.0
var item_frw := 0.0     # faster run/walk %
var item_fcr := 0.0     # faster cast %
var item_sd := 0.0      # +% skill damage
var dim_wick := false

func setup(c: String) -> void:
	cls = c
	hp = life_max()
	res = res_max()
	poise = poise_max()

func life_max() -> float:
	return 28.0 + 3.0 * vit + 3.0 * level + item_life

func res_max() -> float:
	match cls:
		"hemomancer":
			return 20.0 + 2.0 * ess + 2.0 * level + item_res
		"miasmancer":
			return 30.0 + 1.2 * ess + 1.5 * level + item_res
		_:
			return 8.0 + 2.0 * ess + 1.5 * level + item_res

func res_regen() -> float:
	match cls:
		"animancer":
			return 0.6 + 0.03 * ess
		"ossumancer":
			return 1.2 + 0.04 * ess
		"hemomancer":
			return 0.5 + 0.012 * ess
		"miasmancer":
			return (1.5 + 0.03 * ess) * 0.5
		"monk":
			return 0.0
	return 1.0

func res_name() -> String:
	return {"animancer": "Essence", "ossumancer": "Marrow", "hemomancer": "Vitae", "miasmancer": "Miasma", "monk": "Sand"}.get(cls, "Essence")

func armor() -> float:
	return con / 2.0 + item_armor

func poise_max() -> float:
	return 28.0 + 1.4 * con + 0.08 * vit + 0.25 * item_armor

func poise_regen() -> float:
	return 4.0 + 0.35 * con

func skill_mult() -> float:
	return 1.0 + 0.012 * ess + item_sd / 100.0

func melee_mult() -> float:
	return 1.0 + 0.015 * con

func cast_speed() -> float:
	return 0.72 * (1.0 + item_fcr / 100.0)

func move_speed() -> float:
	var f := item_frw
	if f > 25.0:
		f = 25.0 + (f - 25.0) * 0.6
	f = minf(f, 40.0)
	return 4.15 * (1.0 + f / 100.0) * 0.75

func xp_to_next(L: int = -1) -> int:
	var l := float(level if L < 0 else L)
	var v := 60.0 * pow(l, 1.9) + 40.0 * l
	if l > 30.0:
		v *= 1.0 + pow((l - 30.0) / 25.0, 2.0)
	if l > 85.0:
		v *= 1.0 + 0.35 * (l - 85.0)
	return int(floor(v))

func add_xp(n: int) -> bool:
	xp += n
	var up := false
	while xp >= xp_to_next() and level < 99:
		xp -= xp_to_next()
		level += 1
		attr_points += 5
		skill_points += 1
		hp = life_max()
		res = res_max()
		up = true
	return up

func tick(dt: float) -> void:
	res = minf(res_max(), res + res_regen() * dt)
	if poise_delay > 0.0:
		poise_delay -= dt
	else:
		poise = minf(poise_max(), poise + poise_regen() * dt)

static func lamp_color(c: String) -> Color:
	match c:
		"animancer":
			return Color8(150, 196, 255)
		"ossumancer":
			return Color8(236, 228, 210)
		"hemomancer":
			return Color8(255, 238, 214)
		"miasmancer":
			return Color8(200, 150, 255)
		"monk":
			return Color8(170, 160, 150)
	return Color8(255, 210, 160)
