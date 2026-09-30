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
var dim_wick := false
var inv: Inventory
var hollow_tokens := 1
var arcana_points := 0
var kept := 0            # what the lantern keeps (deaths, max 3)
var extra := {}          # stat bonuses from shrines, auras, arcana: key -> value

func item(k: String) -> float:
	return (inv.total(k) if inv else 0.0) + float(extra.get(k, 0.0))

func e_vit() -> float:
	return vit + item("vit")

func e_ess() -> float:
	return ess + item("spi") + item("ene")

func e_con() -> float:
	return con + item("con") + item("dex")

func resist(elem: String) -> float:
	var r := item("res_" + elem)
	if elem != "phys":
		r += item("res") * (1.0 if elem == "magic" else 0.5)
	return r

func setup(c: String) -> void:
	cls = c
	inv = Inventory.new()
	var kit: Dictionary = Data.table("classes").get("classes", {}).get(c, {}).get("starting_kit", {})
	inv.setup_kit(kit)
	skill_points = int(kit.get("skill_points", 1))
	hollow_tokens = int(kit.get("hollow_tokens", 1))
	hp = life_max()
	res = res_max()
	poise = poise_max()

func life_max() -> float:
	return 28.0 + 3.0 * e_vit() + 3.0 * level + item("life")

func res_max() -> float:
	match cls:
		"hemomancer":
			return 20.0 + 2.0 * e_ess() + 2.0 * level + item("mana")
		"miasmancer":
			return 30.0 + 1.2 * e_ess() + 1.5 * level + item("mana")
		_:
			return 8.0 + 2.0 * e_ess() + 1.5 * level + item("mana")

func res_regen() -> float:
	match cls:
		"animancer":
			return 0.6 + 0.03 * e_ess()
		"ossumancer":
			return 1.2 + 0.04 * e_ess()
		"hemomancer":
			return 0.5 + 0.012 * e_ess()
		"miasmancer":
			return (1.5 + 0.03 * e_ess()) * 0.5
		"monk":
			return 0.0
	return 1.0

func res_name() -> String:
	return {"animancer": "Essence", "ossumancer": "Marrow", "hemomancer": "Vitae", "miasmancer": "Miasma", "monk": "Sand"}.get(cls, "Essence")

func armor() -> float:
	return e_con() / 2.0 + (inv.armor() if inv else 0.0) + item("armor")

func poise_max() -> float:
	return 28.0 + 1.4 * e_con() + 0.08 * e_vit() + 0.25 * (inv.armor() if inv else 0.0)

func poise_regen() -> float:
	return 4.0 + 0.35 * e_con()

func skill_mult() -> float:
	return (1.0 + 0.012 * e_ess() + item("dmg") / 100.0) * (1.5 if item("echo") > 0.0 else 1.0)

func melee_mult() -> float:
	return 1.0 + 0.015 * e_con()

func cast_speed() -> float:
	return 0.72 * (1.0 + item("fcr") / 100.0)

func move_speed() -> float:
	var f := item("frw")
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

var heal_pool := 0.0
var restore_pool := 0.0

func attack_speed() -> float:
	return 1.0 + (e_con() - 15.0) * 0.0015 + 0.0225

func tick(dt: float) -> void:
	res = minf(res_max(), res + res_regen() * dt)
	if heal_pool > 0.0:
		var a := minf(heal_pool, life_max() * 0.3 * dt)
		heal_pool -= a
		hp = minf(life_max(), hp + a)
	if restore_pool > 0.0:
		var b := minf(restore_pool, res_max() * 0.4 * dt)
		restore_pool -= b
		res = minf(res_max(), res + b)
	var lamber := item("lamber")
	if lamber > 0.0:
		hp = minf(life_max(), hp + lamber * dt)
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
