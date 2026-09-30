extends "res://skills/skill_book.gd"
## The Shrine Keeper (class id "miasmancer"): Shiori of the House of Eight Million, who breathes the world's distortion
## in and gives it back. Three trees: Miasma (her breath: the cloud about her, the fan, the exhalation, contagion, the
## tide, the vortex), Distortion (traps, the decoy, haze, mirage, the lure, the Mirror-Sister) and Death (claw and heel:
## strikes that build Omens and finishers that spend them).
## Ported from the web build's final behaviour: m_mias.js (the numbers MS, the skills, the cloud, traps, the sister,
## the hooks), o_skills14.js (Rending Arc, Impaling Thrust, Black-Rag Flurry), zz_miasma_breath.js (the cloud grows
## with rank; Inhale a passive trickle; Miasmic Exhalation; the sister has life), zz_tune_batch_d.js (half the base
## regain), k_arcana.js poisonMon (a sickness keeps its strongest dose; some stack).
## Her resource is Miasma (st.res): it seeps back slowly, faster standing in her own miasma, and her breathing draws it
## in. Death skills cost poise ("stamina"). Omens (up to 3) quicken her and strengthen her strikes; they fade after 14 s.
## Sickness is kept on each creature as meta "k_psn" {dps, t, n}; it ticks as "miasma" (x PSN_K, the G1 balance).
## The Arcana (z_*, zm_*, zd_*, zx_* in data/board.json) are read here with aU / aR / aM where each skill acts.
##
## Test args: --learn=all[:L], --autocast[=id,id], --miastrace.

const FxNode = preload("res://skills/miasmancer/fx.gd")
const Ally = preload("res://skills/miasmancer/ally.gd")

## the pose each skill strikes (art/sprites/miasmancer.json: atk, cast, rake, thrust, spin, lunge)
const POSE := {"rarc": "rake", "flurry": "rake", "gstrike": "atk", "thrust": "thrust", "execute": "thrust", "talon": "spin",
	"reap": "spin", "dstep": "lunge", "blur": "lunge", "shuriken": "atk"}
const MELEE := {"gstrike": 1.1, "talon": 1.2, "execute": 1.2, "flurry": 1.3}
const PSN_K := 0.8           # G1 balance (2026-09-30): sickness ticks a fifth softer
const TUNE := 0.8            # G1 balance: all her damage (a whole kit at level 20 dealt twice the Mystic's)
const TRAPS := ["ntrap", "mwake", "bmine"]
const SISTER_SKILLS := ["pnova", "contagion", "rotwall", "shuriken", "haze", "mirage", "lure", "gstrike", "talon", "flurry", "rarc", "thrust", "reap", "execute", "ntrap", "bmine", "mwake"]
const SISTER_MELEE := ["gstrike", "talon", "flurry", "rarc", "thrust", "reap", "execute"]
const VIOLET := Color8(176, 112, 224)
const VIOLET_D := Color8(138, 74, 184)
const PALE := Color8(232, 226, 208)
const WARP := Color8(168, 192, 224)

var zone: Zone
var time := 0.0
var _virt := {}
var fx_air: Node2D
var fx_floor: Node2D
var trace := false
var trace_t := 5.0
var dmg_log := {}
var auto_on := false
var auto_ids: Array = []
var auto_t := 0.0
var auto_i := 0
var demo_at = null
var src := ""

var omens := 0
var omen_t := 0.0
var venom_t := 0.0
var venom_n := 0
var blur_ev := 0.0
var breath_cd := 0.0
var unseen_t := 0.0
var haze_mantle := 0.0
var aura_t := 0.0
var fed_aura := 0
var worn_traps: Array = []
var mstorm_t := 0.0
var mstorm_tick := 0.0
var in_miasma := false
var gcount := 0
var trail_d := 0.0
var inhale_t := 0.0
var last_tp := Vector2.INF
var sister_cast := false
var reap_kept := 0
var pending := {}
var queue: Array = []        # delayed blows: {t, f: Callable}

var clouds: Array = []       # {tp, R, t, max, dps, kind (poison | haze), tick, seed}
var novas: Array = []
var tides: Array = []
var traps: Array = []
var throws: Array = []
var decoys: Array = []       # Ally nodes
var mirages: Array = []
var lures: Array = []
var dash := {}
var scythes: Array = []
var shuris: Array = []
var clawfx: Array = []
var knives: Array = []
var zaps: Array = []
var motes: Array = []
var words: Array = []
var rings: Array = []
var sister = null            # Ally node, kind "sister"

func _load() -> void:
	super._load()
	for id in data:
		for p in data[id].get("perks", []):
			_virt[p["id"]] = [id, p]
	if not Bus.monster_killed.is_connected(_on_kill):
		Bus.monster_killed.connect(_on_kill)
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=")
		var v: String = kv[1] if kv.size() > 1 else ""
		match kv[0]:
			"learn":
				var L := 10
				var spec := v
				if ":" in v:
					spec = v.split(":")[0]
					L = int(v.split(":")[1])
				var ids: Array = data.keys() if spec == "all" or spec == "" else Array(spec.split(","))
				for id in ids:
					if data.has(id):
						hard[id] = clampi(L, 1, 20)
			"autocast":
				auto_on = true
				if v != "":
					auto_ids = Array(v.split(","))
			"miastrace":
				trace = true

# ================================================================== levels and numbers (m_mias.js MS)
func K(id: String) -> int:
	if _virt.has(id):
		var vv: Array = _virt[id]
		var p: Dictionary = vv[1]
		var L := lvl(vv[0])
		if L < int(p.get("skill_level", 99)):
			return 0
		var rs = p.get("requires_stat")
		if rs is Dictionary and _stat(rs.get("stat", "")) < float(rs.get("value", 0)):
			return 0
		return L
	if not data.has(id):
		return 0
	return lvl(id)

func _stat(s: String) -> float:
	match s:
		"spi": return hero.st.e_ess()
		"vit": return hero.st.e_vit()
		"con": return hero.st.e_con()
	return 0.0

func L1(id: String) -> float:
	return 1.0 + (maxi(1, K(id)) - 1) * 0.6

func syn(id: String) -> float:
	var b := 0.0
	for y in data.get(id, {}).get("synergies", []):
		b += float(y.get("table_pc", 0)) * int(hard.get(y.get("from", ""), 0))
	return 1.0 + b / 200.0

func sister_k() -> float: return 0.35 + 0.015 * L1("sister")
func power() -> float: return TUNE * hero.st.skill_mult() * (1.0 + 0.1 * K("toxic")) * (sister_k() if sister_cast else 1.0)
func frac() -> float: return clampf(hero.st.res / maxf(1.0, hero.st.res_max()), 0.0, 1.0)
## the cloud about her: small at first, it grows with rank; a full breath billows (zz_miasma_breath.js)
func aura_r() -> float:
	var l := K("mcloud")
	return (0.35 + 0.15 * maxf(0, l - 1) + 0.9 * frac() * (0.4 + 0.05 * l)) * (1.2 if aM("zm_thick") else 1.0)
func aura_dps() -> float: return (2.0 + 1.2 * (L1("mcloud") - 1.0)) * power() * (0.35 + 0.65 * frac())
func evade() -> float:
	return minf(0.6, (0.06 + 0.012 * L1("mcloud")) * frac() * (1.0 if K("mcloud") > 0 else 0.0) + (0.1 if K("shroud") > 0 else 0.0) + 0.01 * K("unseen") + (0.3 if blur_ev > 0.0 else 0.0))
func cloud_life() -> float: return (1.0 + 0.05 * K("toxic")) * (1.5 if aM("zm_seep") else 1.0)
func ctrl() -> float: return (1.0 + 0.04 * K("unseen")) * (1.25 if K("unseenlong") > 0 else 1.0)
func fang_dmg() -> float: return (5.0 + 2.5 * (L1("vblade") - 1.0)) * power()
func nova_dmg() -> float: return (8.0 + 4.0 * (L1("pnova") - 1.0)) * power() * syn("pnova")
func nova_psn() -> float: return (4.0 + 2.2 * (L1("pnova") - 1.0)) * power()
func tide_dmg() -> float: return (10.0 + 5.0 * (L1("rotwall") - 1.0)) * power() * syn("rotwall")
func cont_psn() -> float: return (3.0 + 1.5 * (L1("contagion") - 1.0)) * power() * syn("contagion")
func exhale_k() -> float: return (0.9 + 0.05 * L1("exhale")) * power() * syn("exhale")
func blade_psn() -> float: return (_wavg() * 0.5 + 2.0 + 1.2 * (L1("vblade") - 1.0)) * power() * syn("vblade")
func shuri_dmg() -> float: return (6.0 + 3.0 * (L1("shuriken") - 1.0)) * power() * syn("shuriken")
func storm_dmg() -> float: return (5.0 + 2.4 * (L1("mstorm") - 1.0)) * power() * syn("mstorm")
func storm_r() -> float: return 3.2 + (1.0 if K("stormwide") > 0 else 0.0)
func storm_life() -> float: return 8.0 + 0.3 * L1("mstorm")
func trap_k() -> float: return (1.0 + 0.08 * K("unseen")) * power()
func needle_dmg() -> float: return (4.0 + 2.0 * (L1("ntrap") - 1.0)) * trap_k() * syn("ntrap") * 0.5   # G1 balance: four needle traps were half her damage
func wake_dmg() -> float: return (5.0 + 2.5 * (L1("mwake") - 1.0)) * trap_k() * (1.25 if aM("zd_snare") else 1.0) * syn("mwake")
func wake_life() -> float: return 12.0 * (2.0 if K("wakelong") > 0 else 1.0) * (1.5 if aM("zd_snare") else 1.0)
func mine_dmg() -> float: return (18.0 + 8.0 * (L1("bmine") - 1.0)) * trap_k() * syn("bmine")
func sentry_dmg() -> float: return (20.0 + 9.0 * (L1("ntrap") - 1.0)) * trap_k()
func trap_max() -> int:
	var u := K("unseen")
	return 2 + (1 if u >= 1 else 0) + (1 if u >= 5 else 0) + (1 if u >= 10 else 0) + (2 if aU("z_trapq") else 0) + (1 if K("trapmax2") > 0 else 0)
func arm_t() -> float: return 0.0 if (aU("z_trapq") or K("trapquick") > 0) else 0.8 / (1.0 + 0.05 * K("unseen"))
func claw_on() -> bool:
	var w: Item = hero.st.inv.weapon() if hero.st.inv else null
	return w != null and bool(Item.base_row(w.base).get("claw", false))
func _wavg() -> float:
	var w: Item = hero.st.inv.weapon() if hero.st.inv else null
	return ((w.dmg.x + w.dmg.y) / 2.0) if w else 2.0
func weapon() -> float:
	return _wavg() * hero.st.melee_mult() * (1.0 + 0.06 * K("deathm")) * (1.25 if claw_on() else 1.0) * (1.0 + 0.06 * omens) * (sister_k() if sister_cast else 1.0)
func crit_ch(fin: bool = false) -> float:
	return (minf(0.4, 0.03 + 0.015 * K("dhead")) if K("dhead") > 0 else 0.0) + (0.1 if fin and aM("zx_crit") else 0.0)
func omen_max() -> int: return 2 if aR("z_death") else 3 + (1 if K("omen4") > 0 else 0)
func omen_life() -> float: return 24.0 if aM("zx_omen") else 14.0
func warp_chance() -> float: return (0.04 + 0.004 * L1("warp")) * (2.0 if K("warpmore") > 0 else 1.0) if K("warp") > 0 else 0.0
func sister_cd() -> float: return maxf(1.2, 3.2 - 0.05 * L1("sister")) / (2.0 if K("sisterfast") > 0 else 1.0)
func breath_cd_len() -> float: return (40.0 if aM("zx_breath") else 60.0) - (15.0 if K("breathcd") > 0 else 0.0)

## her cast speed: Omens quicken her, and claws are her own weapon
func cast_k() -> float:
	return (1.0 + 0.05 * omens) * (1.15 if claw_on() else 1.0) * (1.1 if K("deathspd") > 0 else 1.0)

func info(id: String) -> String:
	var r := func(v): return str(int(round(v)))
	var pc := func(v): return str(int(round(v * 100.0))) + "%"
	match id:
		"mcloud": return "Cloud %.1f yd · sickens %s/s · %s of blows miss (full cloud: more)" % [aura_r(), r.call(aura_dps()), pc.call(evade())]
		"vblade": return "40 s · claws sicken %s/s for 4 s and slow" % r.call(blade_psn())
		"pnova": return "%s damage · sickens %s/s for 4 s · 5 yd" % [r.call(nova_dmg()), r.call(nova_psn())]
		"contagion": return "Leaps every 1.5 s · %s/s miasma · 10 s" % r.call(cont_psn())
		"rotwall": return "%s damage · miasma %s/s · %.1f yd wide" % [r.call(tide_dmg()), r.call(tide_dmg() * 0.4), 3.6 if K("wwide") > 0 else 2.4]
		"inhale": return "Breathes in every %.1f s from clouds and the sickened within %.1f yd" % [maxf(0.9, 2.4 - 0.08 * K("inhale")), 5.0 + 0.1 * K("inhale")]
		"exhale": return "%s damage now (x%.2f per Miasma) · 3.5 yd" % [r.call(exhale_k() * maxf(5.0, hero.st.res)), exhale_k()]
		"shuriken": return "%s per cut · spirals out to ~4.5 yd · trails miasma" % r.call(shuri_dmg())
		"mstorm": return "%s/s in %.1f yd · slows · %d s" % [r.call(storm_dmg()), storm_r(), int(storm_life())]
		"toxic": return "+%d%% miasma · clouds +%d%% longer" % [10 * K("toxic"), 5 * K("toxic")]
		"blur": return "Step up to 6 yd · decoy %d s" % (5 if aM("zd_blur") else 3)
		"ntrap": return "%d needles · %s each · miasma" % [18 if K("needlemore") > 0 else 12, r.call(needle_dmg())]
		"mwake": return "Smokes %d s · waves %s and sicken" % [int(wake_life()), r.call(wake_dmg())]
		"haze": return "%d s · 2.2 yd · confuses" % (6 if K("hazelong") > 0 else 4)
		"mirage": return "%d s · 2.6 yd · half speed · missiles veer" % (9 if K("miragelong") > 0 else 6)
		"bmine": return "Bursts for %s · cloud %.1f yd" % [r.call(mine_dmg()), 3.3 if K("minebig") > 0 else 2.2]
		"lure": return "%d s · pulls within %d yd" % [5 if K("lurelong") > 0 else 3, 8 if K("lurewide") > 0 else 5]
		"warp": return "%s per tick per enemy in your miasma" % pc.call(warp_chance())
		"sister": return "Acts every %.1f s · %s of your strength" % [sister_cd(), pc.call(sister_k())]
		"unseen": return "+%d%% control time · +%d%% evasion · %d traps, +%d%% trap damage" % [4 * K("unseen"), K("unseen"), trap_max(), 8 * K("unseen")]
		"rarc": return "%s to each in a half-circle · +10%% per extra enemy" % r.call(weapon() * (0.95 + 0.09 * L1("rarc")) * syn("rarc"))
		"thrust": return "%s to each in a %d yd line" % [r.call(weapon() * (1.25 + 0.11 * L1("thrust")) * syn("thrust")), 4 if K("thrustlong") > 0 else 3]
		"gstrike": return "%s damage · +1 Omen · each Omen +6%% damage, +5%% speed" % r.call(weapon() * (1.4 + 0.12 * L1("gstrike")) * syn("gstrike"))
		"talon": return "%d kicks · %s each · +1 Omen" % [_kicks(), r.call(weapon() * (0.55 + 0.06 * L1("talon")) * syn("talon"))]
		"dstep": return "%s to each · %d yd" % [r.call(weapon() * (0.9 + 0.08 * L1("dstep")) * syn("dstep")), 8 if K("steplong") > 0 else 5]
		"flurry": return "%d strikes · %s each · hops between enemies in reach" % [6 if K("flurrymore") > 0 else 4, r.call(weapon() * (0.5 + 0.05 * L1("flurry")) * syn("flurry"))]
		"reap": return "%s · +70%% and +0.3 yd per Omen" % r.call(weapon() * (1.2 + 0.1 * L1("reap")) * syn("reap"))
		"execute": return "%s · +90%% per Omen · kills below %s +8%% per Omen" % [r.call(weapon() * (1.6 + 0.12 * L1("execute")) * syn("execute")), pc.call(0.15 if K("execthr") > 0 else 0.1)]
		"dhead": return "%s critical chance" % pc.call(crit_ch())
		"deathm": return "+%d%% melee · %d Omens%s" % [6 * K("deathm"), omen_max(), " · claws: +25% strikes, +15% speed" if claw_on() else " · wield claws for more"]
	return ""

func _kicks() -> int: return 3 + (1 if K("talonkick") > 0 else 0) + (1 if aM("zx_kiss") else 0)

# ================================================================== creatures and helpers
func mons() -> Array:
	var out: Array = []
	if hero == null:
		return out
	for m in hero.get_tree().get_nodes_in_group("monsters"):
		if not m.dead and not m.buried:
			out.append(m)
	return out

func foes(c: Vector2, R: float) -> Array:
	var out: Array = []
	for m in mons():
		if m.tp.distance_to(c) < R + m.radius:
			out.append(m)
	return out

func near(p: Vector2, R: float, filt: Callable = Callable()) -> Monster:
	var best: Monster = null
	var bd := R
	for m in mons():
		if filt.is_valid() and not filt.call(m):
			continue
		var d: float = m.tp.distance_to(p)
		if d < bd:
			bd = d
			best = m
	return best

func now() -> float:
	return Time.get_ticks_msec() / 1000.0

func wake(m) -> void:
	m.awake = true
	if m.brain and m.brain.state == "sleep":
		m.brain.wake(m)

func stun(m, t: float) -> void:
	if m and not m.dead:
		m.stun = maxf(m.stun, t * 0.3 if m.boss else t)

func root(m, t: float) -> void:
	if m and not m.dead:
		m.root = maxf(m.root, minf(0.4, t) if m.boss else t)

func shove(m, from: Vector2, d: float) -> void:
	if m == null or m.dead or m.boss:
		return
	var v: Vector2 = (m.tp - from).normalized() * d
	m.tp = zone.move(m.tp, v, m.radius * 0.6)

func confuse(m, t: float) -> void:
	if m.dead or m.boss:
		return
	m.confused = maxf(m.confused, t * ctrl())
	wake(m)

func fear(m, t: float) -> void:
	if m.dead or m.boss:
		return
	m.feared = maxf(m.feared, t)

## sicken: a creature keeps its strongest dose; stacking skills add doses up to their stack
func psn(m, dps: float, t: float, stacks: int = 1, linger: bool = true) -> void:
	if m == null or m.dead or dps <= 0.0:
		return
	var q: Dictionary = m.get_meta("k_psn", {})
	if q.is_empty():
		q = {"dps": dps, "t": t, "n": 1, "tick": 0.3}
	elif stacks > 1 and int(q["n"]) < stacks:
		q["dps"] = float(q["dps"]) + dps
		q["n"] = int(q["n"]) + 1
		q["t"] = maxf(q["t"], t)
	else:
		q["dps"] = maxf(q["dps"], dps)
		q["t"] = maxf(q["t"], t)
	m.set_meta("k_psn", q)
	wake(m)
	if linger and randf() < 0.06 and float(m.get_meta("k_linger", -1.0)) < time:
		m.set_meta("k_linger", time + 1.5)
		add_cloud(m.tp, 0.9, 3.0, dps * 0.6)

func sick(m) -> bool:
	return not (m.get_meta("k_psn", {}) as Dictionary).is_empty()

func add_cloud(p: Vector2, R: float, t: float, dps: float, kind: String = "poison") -> Dictionary:
	if zone == null or zone.is_solid(p):
		return {}
	var c := {"tp": p, "R": R, "t": t * cloud_life(), "max": t * cloud_life(), "dps": dps, "kind": kind, "tick": 0.0, "seed": randf() * 99.0}
	clouds.append(c)
	while clouds.size() > 70:
		clouds.pop_front()
	return c

func hurt(m, dmg: float, id: String, o: Dictionary = {}) -> float:
	if m == null or not is_instance_valid(m) or m.dead or m.buried or dmg <= 0.0:
		return 0.0
	var d := dmg
	if m.confused > 0.0 and K("madness") > 0:
		d *= 1.2
	if m.feared > 0.0 and K("knelldmg") > 0:
		d *= 1.2
	if float(m.get_meta("k_grave", -1.0)) > time:
		d *= 1.15
	if float(m.get_meta("k_frail", -1.0)) > time:
		d *= 1.15
	var elem: String = o.get("elem", "phys" if int(data.get(id, {}).get("tab", 0)) == 2 or id in ["knife", "claw"] else "miasma")
	var was := src
	src = id
	var opts := {}
	if o.get("melee", false):
		opts["melee"] = true
	if o.has("poise"):
		opts["poise"] = o["poise"]
	var dealt: float = Combat.hit_monster(m, d, elem, o.get("from", hero.tp), opts)
	src = was
	if trace:
		dmg_log[id] = float(dmg_log.get(id, 0.0)) + dealt
	return dealt

func crit(dmg: float, fin: bool = false) -> float:
	if sister_cast:
		return dmg
	if randf() < crit_ch(fin):
		say_at(hero.tp + Vector2(0, -0.3), "critical", Color.WHITE)
		if K("critomen") > 0:
			add_omen()
		return dmg * (3.0 if K("critdmg") > 0 else 2.0)
	return dmg

func add_omen() -> void:
	if sister_cast:
		return
	if omens < omen_max():
		omens += 1
		say_at(hero.tp + Vector2(0, -0.3), "omen %d" % omens, PALE)
		Sfx.play("glass", 0.3, 0.8 + omens * 0.15)
	omen_t = omen_life()

func spend_omens() -> int:
	var n := omens
	omens = 0
	return n

func claw(m) -> void:
	clawfx.append({"tp": m.tp, "a": (m.tp - hero.tp).angle() + randf_range(-0.4, 0.4), "t": 0.2})

func knife(from: Vector2, ang: float, dmg: float, pierce: int = 1, friendly_psn: bool = true) -> void:
	knives.append({"tp": from, "v": Vector2(cos(ang), sin(ang)) * 12.0, "t": 0.55, "dmg": dmg, "hit": {}, "pierce": pierce})

func ring(p: Vector2, R: float, secs: float, col: Color, r0: float = 0.2) -> void:
	rings.append({"tp": p, "R": R, "R0": r0, "t": secs, "max": secs, "col": col})

func puff(p: Vector2, col: Color, n: int, spd: float = 1.6) -> void:
	for i in mini(n, 24):
		var a := randf() * TAU
		motes.append({"tp": p + Vector2(cos(a), sin(a)) * randf() * 0.3, "z": randf_range(2.0, 12.0), "v": Vector2(cos(a), sin(a)) * spd * randf_range(0.2, 1.0), "vz": randf_range(2.0, 8.0), "t": randf_range(0.6, 1.3), "col": col})
	if motes.size() > 600:
		motes = motes.slice(motes.size() - 600)

func say_at(p: Vector2, t: String, col: Color = PALE) -> void:
	if sister_cast:
		return
	words.append({"tp": p, "s": t, "t": 1.0, "col": col})
	if words.size() > 24:
		words.pop_front()

func say(t: String, secs: float = 1.0) -> void:
	if not sister_cast:
		Bus.say.emit(t, secs)

func aim_point() -> Vector2:
	if demo_at != null:
		return demo_at
	return hero.mouse_tile()

func clamp_cast(a: Vector2, maxd: float) -> Vector2:
	var d := a - hero.tp
	return hero.tp + d.normalized() * maxd if d.length() > maxd else a

func _los_point(a: Vector2) -> Vector2:
	var d := a.distance_to(hero.tp)
	if d < 0.3:
		return a
	var n := int(ceil(d / 0.2))
	var last := hero.tp
	for i in range(1, n + 1):
		var p := hero.tp.lerp(a, float(i) / n)
		if zone.blocks_sight(p):
			return last
		last = p
	return a

func later(t: float, f: Callable) -> void:
	queue.append({"t": t, "f": f})

## the melee skills reach for the enemy nearest the cursor
func melee_target(a: Vector2, reach: float) -> Monster:
	reach += 0.15 if claw_on() else 0.0
	var best: Monster = null
	var bd := 1e9
	for m in mons():
		var dp: float = m.tp.distance_to(hero.tp)
		if dp > 3.6 + m.radius:
			continue
		var d: float = m.tp.distance_to(a) + dp * 0.3
		if d < bd and zone.sight_clear(hero.tp, m.tp):
			bd = d
			best = m
	if best == null or best.tp.distance_to(hero.tp) > reach + best.radius + 0.3:
		return null
	hero._face(best.tp - hero.tp)
	return best

# ================================================================== casting
func use(id: String, at: Vector2, target: Monster) -> bool:
	if id == "attack" or id == "" or hero == null or zone == null:
		return false
	if lvl(id) <= 0 or is_passive(id):
		return false
	if hero.act != "" and hero.act != "swing" and hero.act != "cast":
		return false
	if not dash.is_empty():
		return false
	if target != null and is_instance_valid(target):
		at = target.tp
	at = _los_point(at)
	var c := cost(id)
	if hero.st.res < c:
		say("Not enough Miasma.", 1.0)
		return false
	var pc := poise_cost(id)
	if id == "execute" and K("execcheap") > 0:
		pc = 0.0
	if pc > 0.0 and hero.st.poise < pc * 0.5:
		say("Too weary.", 0.8)
		return false
	if MELEE.has(id):
		var m := melee_target(at, float(MELEE[id]))
		if m == null:
			var far := near(at, 3.6)
			if far != null and far.tp.distance_to(hero.tp) < 7.0:
				pending = {"id": id, "m": far, "t": 3.0}
				hero.target = null
				hero.walk_to(far.tp)
				return false
			if id == "execute":
				say("Nothing in reach to execute.", 0.8)
				return false
	cast_anim = POSE.get(id, "cast")
	var ok := _cast(id, at, target)
	if not ok:
		return false
	hero.st.res -= c
	if trace:
		dmg_log["_spent"] = float(dmg_log.get("_spent", 0.0)) + c
	if pc > 0.0:
		hero.spend_poise(pc)
	var tb := int(data.get(id, {}).get("tab", 0))
	Sfx.play(["cast_soul", "cast_mirror", "swing"][tb], 0.7, [0.7, 1.2, 1.1][tb])
	if cast_len < 0.0:
		cast_len = 0.45 / (hero.st.cast_speed() * cast_k())
	hero._face(at - hero.tp)
	hero.stats_changed.emit()
	return true

func _cast(id: String, a: Vector2, target) -> bool:
	match id:
		"vblade":
			venom_t = 40.0
			puff(hero.tp, VIOLET, 12)
			say("Miasma coats your claws.", 1.0)
			cast_len = 0.3
			return true
		"shuriken": return _shuriken(a)
		"pnova": return _nova(a)
		"contagion":
			var m := near(a, 2.5)
			if m == null:
				say("No enemy near the cursor.", 1.0)
				return false
			m.set_meta("k_cont", 10.0)
			psn(m, cont_psn(), 5.0)
			say_at(m.tp, "contagion", VIOLET)
			return true
		"rotwall": return _tide(a)
		"exhale": return _exhale()
		"mstorm":
			mstorm_t = storm_life()
			mstorm_tick = 0.0
			return true
		"blur": return _blur(a)
		"ntrap", "mwake", "bmine": return _throw_trap(id, a)
		"haze":
			if aR("z_hanged"):
				haze_mantle = 6.0 * ctrl()
				say("The haze wraps you.", 1.0)
			else:
				add_cloud(clamp_cast(a, 9.0), 2.2, 6.0 if K("hazelong") > 0 else 4.0, 0.0, "haze")
			return true
		"mirage":
			var p := clamp_cast(a, 9.0)
			var t := 9.0 if K("miragelong") > 0 else 6.0
			mirages.append({"tp": p, "R": 2.6, "t": t, "max": t})
			return true
		"lure":
			lures.append({"tp": clamp_cast(a, 9.0), "t": 5.0 if K("lurelong") > 0 else 3.0, "R": 8.0 if K("lurewide") > 0 else 5.0})
			return true
		"gstrike": return _grave_strike(a)
		"talon": return _talon(a)
		"flurry": return _flurry(a)
		"rarc": return _rarc(a)
		"thrust": return _thrust(a)
		"dstep": return _death_step(a)
		"reap":
			if aR("z_reaper"):
				return _throw_scythe(a)
			return _reap()
		"execute": return _execute(a)
	return false

# ------------------------------------------------------------------ Miasma
func _shuriken(a: Vector2) -> bool:
	var base := (a - hero.tp).angle()
	var dmg := shuri_dmg()
	for dir in ([1, -1] if K("shuritwo") > 0 else [1]):
		shuris.append({"c": hero.tp, "a0": base - dir * 0.6, "dir": float(dir), "t": 0.0, "life": 2.4, "dmg": dmg, "hitT": {}, "tp": hero.tp, "spin": 0.0, "trail": 0.2})
	Sfx.play("swing", 0.6, 1.8)
	return true

func _nova(a: Vector2) -> bool:
	var c := clamp_cast(a, 8.0) if aR("z_bloom") else hero.tp
	novas.append({"tp": c, "r": 0.3, "max": 5.0, "hit": {}, "dmg": nova_dmg(), "psn": nova_psn()})
	if K("twinnova") > 0:
		var d := nova_dmg()
		var ps := nova_psn()
		later(0.5, func(): novas.append({"tp": c, "r": 0.3, "max": 5.0, "hit": {}, "dmg": d, "psn": ps}))
	return true

func _tide(a: Vector2) -> bool:
	var dv := (a - hero.tp).normalized()
	if dv.length() < 0.1:
		dv = Vector2(1, 0)
	var w := 3.6 if K("wwide") > 0 else 2.4
	if aR("z_tide"):
		tides.append({"spin": true, "c": hero.tp, "follow": not sister_cast, "ang": dv.angle(), "t": 2.0, "w": 1.7, "hitT": {}, "dmg": tide_dmg() * 0.6})
		return true
	var angs := [-0.45, 0.0, 0.45] if aU("z_tide") else [0.0]
	for o: float in angs:
		var e := dv.rotated(o)
		tides.append({"tp": hero.tp + e * 0.4, "d": e, "w": w * 0.7 if o != 0.0 else w, "t": 1.1, "hit": {}, "dmg": tide_dmg() * (0.7 if o != 0.0 else 1.0), "trailT": 0.0, "trail": K("wtrail") > 0})
	return true

func _exhale() -> bool:
	var spent := maxf(5.0, hero.st.res)
	var dmg := exhale_k() * spent
	var R := 3.5
	hero.st.res = spent * ((0.25 if aM("zm_breath") else 0.0) + (0.33 if K("exhalekeep") > 0 else 0.0))
	for m in foes(hero.tp, R):
		hurt(m, dmg, "exhale")
		psn(m, dmg * 0.2, 4.0)
		if K("gasp") > 0:
			confuse(m, 2.0)
		shove(m, hero.tp, 0.8)
	ring(hero.tp, R, 0.45, VIOLET)
	puff(hero.tp, VIOLET, 24, 3.5)
	Game.shake(3.0)
	say_at(hero.tp + Vector2(0, -0.3), "exhale %d" % int(spent), VIOLET)
	return true

# ------------------------------------------------------------------ Distortion
func _blur(a: Vector2) -> bool:
	var p := clamp_cast(a, 6.0)
	var o := hero.tp
	if zone.is_solid(p):
		p = o.lerp(p, 0.5)
		if zone.is_solid(p):
			return false
	if aR("z_mirror"):
		var m := near(a, 3.0)
		if m:
			var d: float = m.tp.distance_to(hero.tp)
			hero.tp = hero.tp.lerp(m.tp, maxf(0.0, (d - m.radius - 0.4) / maxf(d, 0.01)))
			hurt(m, crit(weapon() * 1.5), "blur", {"melee": true, "elem": "phys"})
			add_omen()
		else:
			hero.tp = p
	else:
		hero.tp = p
	var life := 5.0 if aM("zd_blur") else 3.0
	_decoy(o, life, hero.face)
	if aU("z_mirror"):
		_decoy(o + Vector2(0.8, 0.4), life, -hero.face)
	for m in mons():
		if m.tp.distance_to(hero.tp) < 12.0 and m.brain and m.brain.state != "sleep":
			m.set_meta("mys_taunt_by", decoys.back() if not decoys.is_empty() else null)
			m.set_meta("mys_taunt_until", now() + 1.5)
	if K("smear") > 0:
		blur_ev = 2.0
	if K("unseenstep") > 0:
		unseen_t = maxf(unseen_t, 1.0)
	hero.invuln = maxf(hero.invuln, 0.15)
	hero.walking = false
	puff(o, WARP, 12, 2.0)
	puff(hero.tp, WARP, 10, 1.8)
	cast_len = 0.2
	return true

func _decoy(p: Vector2, life: float, face: int) -> void:
	var d = Ally.new()
	d.book = self
	d.kind = "decoy"
	d.tp = p
	d.life = life
	d.hp = hero.st.life_max() * 0.3
	d.max_hp = d.hp
	d.face = face
	zone.sorted.add_child(d)
	decoys.append(d)

func decoy_gone(d) -> void:
	decoys.erase(d)
	puff(d.tp, WARP, 12, 2.0)
	if K("rotdouble") > 0:
		add_cloud(d.tp, 1.6, 4.0, aura_dps() * 1.5)

func _throw_trap(kind: String, a: Vector2) -> bool:
	if aR("z_trapq") and not sister_cast:
		if worn_traps.size() >= trap_max():
			worn_traps.pop_front()
		worn_traps.append(kind)
		say_at(hero.tp + Vector2(0, -0.3), "trap worn", Color8(201, 166, 107))
		return true
	var p := clamp_cast(a, 8.0)
	throws.append({"kind": kind, "from": hero.tp, "to": p, "t": 0.0, "dur": 0.3, "k": sister_k() if sister_cast else 1.0})
	return true

func _place_trap(kind: String, p: Vector2, armed: bool, k: float) -> void:
	var mine := traps.filter(func(t): return not t.get("done", false))
	while mine.size() >= trap_max():
		var o: Dictionary = mine.pop_front()
		o["done"] = true
		puff(o["tp"], Color8(111, 106, 121), 6)
	var life := wake_life() if kind == "mwake" else 40.0
	traps.append({"kind": kind, "tp": p, "arm": 0.0 if armed else arm_t(), "charges": (18 if K("needlemore") > 0 else 12) if kind == "ntrap" else 1,
		"cd": 0.0, "t": life, "max": life, "k": k, "leakT": 0.0, "waveT": 0.4, "burstT": 1.0})

func _trap_trigger(t: Dictionary) -> void:
	if t["kind"] != "bmine":
		return
	t["done"] = true
	var R := 2.4 if K("minebig") > 0 else 1.6
	var boom := func(k: float):
		for o in foes(t["tp"], R):
			hurt(o, mine_dmg() * k * t["k"], "bmine")
			psn(o, mine_dmg() * 0.15 * k * t["k"], 4.0)
			if K("minefear") > 0:
				fear(o, 1.5)
		add_cloud(t["tp"], R * 1.35, 6.0, mine_dmg() * 0.15 * t["k"])
		puff(t["tp"], VIOLET, 24, 3.0)
		Game.shake(2.5)
		Sfx.play("heavy", 0.6, 0.6)
	boom.call(1.0)
	if aM("zd_mine"):
		later(0.7, func(): boom.call(0.6))

# ------------------------------------------------------------------ Death
func _grave_strike(a: Vector2) -> bool:
	var m := melee_target(a, 1.1)
	if m == null:
		cast_anim = "atk"
		return true
	var dmg := weapon() * (1.4 + 0.12 * L1("gstrike")) * syn("gstrike")
	gcount = (gcount + 1) % 3
	var hit := func():
		if not m.dead:
			hurt(m, crit(dmg), "gstrike", {"melee": true})
			claw(m)
	hit.call()
	if K("gravecombo") > 0 and gcount == 0:
		later(0.13, hit)
	_grave_root(m)
	_sister_hex(m)
	if K("soulrend") > 0 and omens > 0:
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.02 * omens)
	add_omen()
	return true

func _grave_root(m) -> void:
	if aU("z_grave") and m and not m.dead:
		root(m, 1.0)

func _sister_hex(m) -> void:
	if sister_cast and K("sisterhex") > 0 and m and not m.dead:
		confuse(m, 1.0)

func _talon(a: Vector2) -> bool:
	var m := melee_target(a, 1.2)
	if m == null:
		return true
	var n := _kicks()
	var dmg := weapon() * (0.55 + 0.06 * L1("talon")) * syn("talon")
	var sis := sister_cast
	for i in n:
		var last := i == n - 1
		later(i * 0.09, func():
			if m.dead:
				return
			hurt(m, dmg if sis else crit(dmg), "talon", {"melee": true})
			psn(m, aura_dps() * 0.5, 2.0)
			puff(m.tp, PALE, 4, 1.4)
			Sfx.play("hit", 0.5, 1.0 + i * 0.1)
			if last:
				shove(m, hero.tp, 1.1)
				if K("talonstun") > 0:
					stun(m, 1.0)
				Game.shake(2.0))
	_grave_root(m)
	_sister_hex(m)
	add_omen()
	cast_len = 0.5
	return true

func _flurry(a: Vector2) -> bool:
	var n := 6 if K("flurrymore") > 0 else 4
	var R := 1.3 + (0.15 if claw_on() else 0.0)
	var dmg := weapon() * (0.5 + 0.05 * L1("flurry")) * syn("flurry")
	var sis := sister_cast
	var every := 3 if K("flurryomen") > 0 else 4
	if foes(hero.tp, R).is_empty():
		return true
	var used: Array = []
	for i in n:
		later(i * 0.07, func():
			var nr := foes(hero.tp, R)
			if nr.is_empty():
				return
			var m = null
			for q in nr:
				if not q in used:
					m = q
					break
			if m == null:
				used.clear()
				m = nr[0]
			used.append(m)
			hurt(m, dmg if sis else crit(dmg), "flurry", {"melee": true})
			claw(m)
			if venom_t > 0.0:
				psn(m, blade_psn(), 4.0)
			if (i + 1) % every == 0:
				add_omen()
			Sfx.play("swing", 0.4, 1.6))
	cast_len = 0.45
	return true

func _rarc(a: Vector2) -> bool:
	var dv := (a - hero.tp).normalized()
	if dv.length() < 0.1:
		dv = Vector2(1, 0)
	var R := 1.8 + (0.15 if claw_on() else 0.0) + (0.6 if K("arcwide") > 0 else 0.0)
	var sis := sister_cast
	var sweep := func(k: float):
		var hits: Array = []
		for m in foes(hero.tp, R):
			var o: Vector2 = m.tp - hero.tp
			if o.length() > 0.01 and o.normalized().dot(dv) < cos(1.45):
				continue
			hits.append(m)
		var dmg := weapon() * (0.95 + 0.09 * L1("rarc")) * syn("rarc") * (1.0 + 0.1 * maxf(0, hits.size() - 1)) * k
		for m in hits:
			hurt(m, dmg if sis else crit(dmg), "rarc", {"melee": true})
			claw(m)
			on_weapon_hit(m, 0.0)
			shove(m, hero.tp, 0.25)
		if hits.size() >= 3:
			add_omen()
		clawfx.append({"tp": hero.tp, "a": dv.angle(), "t": 0.18, "arc": R})
	sweep.call(1.0)
	if K("arcdouble") > 0:
		later(0.15, func(): sweep.call(0.6))
	Game.shake(1.0)
	return true

func _thrust(a: Vector2) -> bool:
	var dv := (a - hero.tp).normalized()
	if dv.length() < 0.1:
		dv = Vector2(1, 0)
	var L := 3.0 + (1.0 if K("thrustlong") > 0 else 0.0) + (0.15 if claw_on() else 0.0)
	var dmg := weapon() * (1.25 + 0.11 * L1("thrust")) * syn("thrust")
	var hits: Array = []
	for m in mons():
		var o: Vector2 = m.tp - hero.tp
		var along := o.dot(dv)
		if along < -0.1 or along > L + m.radius or absf(o.x * dv.y - o.y * dv.x) > 0.4 + m.radius or not zone.sight_clear(hero.tp, m.tp):
			continue
		hits.append([along, m])
	hits.sort_custom(func(p, q): return p[0] < q[0])
	for i in hits.size():
		var m = hits[i][1]
		hurt(m, dmg if sister_cast else crit(dmg), "thrust", {"melee": true})
		claw(m)
		on_weapon_hit(m, 0.0)
		if i == 0 and K("thrustpin") > 0:
			root(m, 1.0)
	if not hits.is_empty():
		add_omen()
	clawfx.append({"tp": hero.tp, "a": dv.angle(), "t": 0.22, "line": L})
	return true

func _death_step(a: Vector2) -> bool:
	var d := maxf(0.01, a.distance_to(hero.tp))
	var L := minf(d, 8.0 if K("steplong") > 0 else 5.0)
	dash = {"d": (a - hero.tp) / d, "left": L, "hit": {}, "omen": false, "trail": 0.0}
	cast_len = L / 14.0 + 0.12
	hero.invuln = maxf(hero.invuln, L / 14.0 + 0.1)
	return true

func _update_dash(dt: float) -> void:
	if dash.is_empty():
		return
	var st := minf(dash["left"], 14.0 * dt)
	var o := hero.tp
	hero.tp = zone.move(hero.tp, dash["d"] * st, hero.radius)
	dash["left"] -= st
	if hero.tp.distance_to(o) < st * 0.3:
		dash["left"] = 0.0
	hero.walking = false
	puff(hero.tp, Color8(106, 90, 122), 1, 0.8)
	if aM("zx_step"):
		dash["trail"] -= st
		if dash["trail"] <= 0.0:
			dash["trail"] = 1.0
			add_cloud(hero.tp, 0.8, 3.0, aura_dps())
	for m in foes(hero.tp, hero.radius + 0.5):
		if dash["hit"].has(m.get_instance_id()):
			continue
		dash["hit"][m.get_instance_id()] = true
		hurt(m, crit(weapon() * (0.9 + 0.08 * L1("dstep")) * syn("dstep")), "dstep", {"melee": true})
		claw(m)
		if not dash["omen"] or K("stepomen") > 0:
			dash["omen"] = true
			add_omen()
	if dash["left"] <= 0.0:
		dash = {}

func _finisher_kill(m, n: int) -> void:
	if not m.dead:
		return
	if K("knell") > 0:
		for o in foes(hero.tp, 4.0):
			fear(o, 2.0 + (1.0 if aM("zx_knell") else 0.0))
		ring(hero.tp, 4.0, 0.6, PALE)
		Sfx.play("bell_far", 0.7, 0.8)
	if aM("z_widow"):
		for o in foes(m.tp, 2.5):
			root(o, 1.5)
		ring(m.tp, 2.5, 0.4, VIOLET_D, 2.5)
		add_cloud(m.tp, 1.8, 3.0, aura_dps())
	if aU("z_reaper"):
		reap_kept = n

func _reap() -> bool:
	var n := spend_omens()
	var R := (1.6 + 0.3 * n) * (1.3 if K("reapwide") > 0 else 1.0) + (0.15 if claw_on() else 0.0)
	var dmg := weapon() * (1.2 + 0.1 * L1("reap")) * syn("reap") * (1.0 + 0.7 * n) * (2.0 if aR("z_death") else 1.0)
	reap_kept = 0
	var hits: Array = []
	for m in foes(hero.tp, R):
		hurt(m, crit(dmg, true), "reap", {"melee": true})
		hits.append(m)
		_grave_root(m)
		if n >= 3:
			shove(m, hero.tp, 1.1)
	for m in hits:
		_finisher_kill(m, n)
	if K("reapmend") > 0 and n > 0:
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.03 * n)
	if reap_kept > 0:
		omens = mini(omen_max(), reap_kept)
		omen_t = omen_life()
	ring(hero.tp, R, 0.3, PALE)
	clawfx.append({"tp": hero.tp, "a": 0.0, "t": 0.3, "arc": R, "full": true})
	if n > 0:
		say_at(hero.tp + Vector2(0, -0.3), "reap x%d" % n)
	Game.shake(1.0 + n)
	cast_len = 0.5
	return true

func _throw_scythe(a: Vector2) -> bool:
	var n := spend_omens()
	var d := maxf(0.01, a.distance_to(hero.tp))
	scythes.append({"tp": hero.tp, "d": (a - hero.tp) / d, "out": minf(6.0, d + 1.0), "dist": 0.0, "back": false, "hit": {},
		"dmg": weapon() * (1.2 + 0.1 * L1("reap")) * (1.0 + 0.7 * n) * (2.0 if aR("z_death") else 1.0), "n": n, "spin": 0.0})
	return true

func _execute(a: Vector2) -> bool:
	var m := melee_target(a, 1.2)
	if m == null:
		return false
	var n := spend_omens()
	var thr := (0.15 if K("execthr") > 0 else 0.1) + 0.08 * n
	var dmg := weapon() * (1.6 + 0.12 * L1("execute")) * syn("execute") * (1.0 + 0.9 * n) * (2.0 if aR("z_death") else 1.0)
	if m.hp / maxf(1.0, m.hp_max) < thr:
		if m.boss:
			dmg *= 3.0
		else:
			dmg = m.hp + 9999.0
			say_at(m.tp, "EXECUTED", Color.WHITE)
	hurt(m, crit(dmg, true), "execute", {"melee": true, "poise": dmg})
	claw(m)
	puff(m.tp, PALE, 14, 2.4)
	Game.shake(2.0 + n)
	reap_kept = 0
	_finisher_kill(m, n)
	if reap_kept > 0:
		omens = mini(omen_max(), reap_kept)
		omen_t = omen_life()
	return true

# ================================================================== hooks the shared game calls
func before_hit(d: float, elem: String, from: Vector2, opts: Dictionary) -> float:
	if unseen_t > 0.0:
		return 0.0
	if randf() < evade():
		say_at(hero.tp + Vector2(0, -0.3), "miss", WARP)
		puff(hero.tp, WARP, 3, 1.0)
		return 0.0
	# a worn trap springs at her feet (The Trapper-Queen reversed)
	if not worn_traps.is_empty():
		var k: String = worn_traps.pop_front()
		_place_trap(k, hero.tp, true, 1.0)
		if k == "bmine":
			_trap_trigger(traps.back())
	# Last Breath: once a minute a killing blow leaves her standing
	var st = hero.st
	var after: float = d * (100.0 / (100.0 + st.armor()) if elem == "phys" else 1.0)
	if K("lbreath") > 0 and breath_cd <= 0.0 and st.hp - after <= 0.0:
		breath_cd = breath_cd_len()
		st.hp = st.life_max() * 0.3 if K("breathheal") > 0 else 1.0
		hero.invuln = 2.0
		unseen_t = 2.0
		for m in mons():
			_lose(m)
		var ui = hero.get_tree().root.find_child("GodmarrowWorldUI", true, false)
		if ui:
			ui.banner("LAST BREATH", PALE, 1.4)
		puff(hero.tp, PALE, 20, 2.0)
		return 0.0
	return d

func _lose(m) -> void:
	if m.brain and m.brain.state != "sleep":
		m.brain._release_token(m)
		m.brain.state = "sleep"
		m.brain.wake_delay = -1.0

func unseen(m) -> bool:
	return unseen_t > 0.0

func catch_missile(mi) -> bool:
	return false

func on_weapon_hit(m: Monster, d: float) -> void:
	if m == null:
		return
	if d > 0.0 and K("dhead") > 0 and randf() < crit_ch():
		hurt(m, _wavg() * hero.st.melee_mult() * (2.0 if K("critdmg") > 0 else 1.0), "claw", {"melee": true})
		say_at(hero.tp + Vector2(0, -0.3), "critical", Color.WHITE)
		if K("critomen") > 0:
			add_omen()
	claw(m)
	if venom_t > 0.0 and not m.dead:
		var stk := 5 if aU("z_venom") else (3 if K("vdeep") > 0 else 1)
		psn(m, blade_psn(), 4.0, stk)
		var q: Dictionary = m.get_meta("k_psn", {})
		m.slow = maxf(m.slow, 0.25 + 0.08 * int(q.get("n", 1)) if aU("z_venom") else 0.3)
		venom_n += 1
		if K("vflick") > 0 and venom_n % 3 == 0:
			var o = near(m.tp, 5.0, func(x): return x != m)
			if o == null:
				o = m
			knife(hero.tp, (o.tp - hero.tp).angle(), fang_dmg() * 0.8, 1)
		if K("vclaw") > 0:
			var o2 := near(m.tp, 1.4, func(x): return x != m and x.tp.distance_to(hero.tp) < 2.2)
			if o2:
				hurt(o2, _wavg() * hero.st.melee_mult() * 0.6, "claw", {"melee": true})
				psn(o2, blade_psn(), 4.0)
				claw(o2)
		if aR("z_venom") and d > 0.0:
			# The Coil reversed: the claws throw as they cut
			var b := (m.tp - hero.tp).angle()
			for o3: float in [-0.18, 0.0, 0.18]:
				knife(hero.tp, b + o3, _wavg() * hero.st.melee_mult() * 0.6, 1)

func melee_k() -> float:
	return (1.0 + 0.06 * K("deathm")) * (1.0 + 0.06 * omens)

func hud_gauge() -> Dictionary:
	return {"text": "OMENS %d/%d" % [omens, omen_max()], "pips": omens, "max": omen_max(), "col": PALE}

func on_lantern() -> void:
	hero.st.res = hero.st.res_max()

func on_death() -> void:
	_reset()

func _reset() -> void:
	for d in decoys:
		if is_instance_valid(d):
			d.queue_free()
	decoys.clear()
	if sister != null and is_instance_valid(sister):
		sister.queue_free()
	sister = null
	omens = 0
	venom_t = 0.0
	blur_ev = 0.0
	unseen_t = 0.0
	haze_mantle = 0.0
	worn_traps.clear()
	mstorm_t = 0.0
	dash = {}
	pending = {}
	queue.clear()

func _on_kill(m) -> void:
	if hero == null or hero.st == null or hero.cls != "miasmancer" or not is_instance_valid(m):
		return
	if float(m.get_meta("k_cont", 0.0)) > 0.0:
		add_cloud(m.tp, 2.2, 6.0, cont_psn() * 1.2)
	if aU("z_death"):
		add_omen()
	if sick(m) and (K("cbloom") > 0 or (aM("zm_carrion") and randf() < 0.15)):
		add_cloud(m.tp, 1.8, 5.0, aura_dps())

# ================================================================== the frame
func tick(dt: float) -> void:
	if hero == null or hero.zone == null:
		return
	time += dt
	if zone != hero.zone:
		_enter_zone()
	var st = hero.st
	var fr := frac()
	# delayed blows
	for q in queue:
		q["t"] -= dt
	var due := queue.filter(func(q): return q["t"] <= 0.0)
	queue = queue.filter(func(q): return q["t"] > 0.0)
	for q in due:
		if not hero.dead:
			q["f"].call()
	# a melee skill walking in
	if not pending.is_empty():
		pending["t"] -= dt
		var pm = pending["m"]
		if pm == null or not is_instance_valid(pm) or pm.dead or pending["t"] <= 0.0 or hero.dead:
			pending = {}
		elif pm.tp.distance_to(hero.tp) <= float(MELEE[pending["id"]]) + pm.radius + 0.25 and hero.act == "":
			var pid: String = pending["id"]
			pending = {}
			hero.walking = false
			cast_anim = "cast"
			cast_len = -1.0
			if use(pid, pm.tp, pm):
				hero._start_act(cast_anim, cast_len)
		elif not hero.walking:
			hero.walk_to(pm.tp)
	# the cloud about her: it sickens what stands in it (The Grave reversed: slows and weakens; The Plague-Bearer
	# reversed: drinks)
	aura_t -= dt
	var R := aura_r()
	if aura_t <= 0.0 and not hero.dead and K("mcloud") > 0:
		aura_t = 0.5
		var fed := 0
		for m in foes(hero.tp, R):
			fed += 1
			if aR("z_grave"):
				m.slow = maxf(m.slow, 0.4)
				m.set_meta("k_grave", time + 0.7)
			elif aR("z_plague"):
				st.hp = minf(st.life_max(), st.hp + st.life_max() * 0.005)
			else:
				psn(m, aura_dps(), 2.0, 1, false)
			if aM("z_veiled") and randf() < 0.15:
				confuse(m, 1.0)
			_warp(m, hero.tp)
		fed_aura = fed
	if fed_aura > 0 and K("thickair") > 0:
		st.res = minf(st.res_max(), st.res + st.res_regen() * dt)
	# the sickened: their sickness ticks, and they leak little clouds behind them
	for m in mons():
		var q: Dictionary = m.get_meta("k_psn", {})
		if q.is_empty():
			continue
		q["t"] -= dt
		q["tick"] -= dt
		if q["tick"] <= 0.0:
			q["tick"] = 0.5
			hurt(m, float(q["dps"]) * 0.5 * PSN_K, "psn", {"elem": "miasma", "poise": 0.0})
		var drip := float(m.get_meta("k_drip", 0.0)) - dt
		if drip <= 0.0:
			drip = 1.0 if K("toxdrip") > 0 else 2.0
			var c := add_cloud(m.tp + Vector2(randf_range(-0.2, 0.2), randf_range(-0.2, 0.2)), 0.55, 2.5, 0.0)
			if not c.is_empty():
				c["drip"] = true
		m.set_meta("k_drip", drip)
		if q["t"] <= 0.0 or m.dead:
			m.remove_meta("k_psn")
	# standing in her own miasma thickens hers
	in_miasma = false
	for c in clouds:
		if c["kind"] == "poison" and (c["tp"] as Vector2).distance_to(hero.tp) < c["R"] + 0.3:
			in_miasma = true
			break
	if in_miasma and not hero.dead:
		st.res = minf(st.res_max(), st.res + st.res_regen() * 1.5 * (2.0 if K("toxfeed") > 0 else 1.0) * dt)
	_inhale(dt)
	# The Plague-Bearer: a trail of miasma where she walks
	if aU("z_plague") and not hero.dead and last_tp != Vector2.INF:
		trail_d += hero.tp.distance_to(last_tp)
		if trail_d > 1.2:
			trail_d = 0.0
			add_cloud(hero.tp, 0.8, 3.0, aura_dps() * 0.6)
	last_tp = hero.tp
	if K("mcloud") > 0 and randf() < 0.3 + fr * 0.5 + 0.05 * mini(6, K("mcloud") / 2):
		var a := randf() * TAU
		var rr := randf() * R * 0.8
		motes.append({"tp": hero.tp + Vector2(cos(a), sin(a)) * rr, "z": randf_range(2, 10), "v": Vector2(randf_range(-0.3, 0.3), randf_range(-0.3, 0.3)), "vz": 1.6, "t": randf_range(0.9, 1.4), "col": Color8(143, 138, 124) if aR("z_grave") else (VIOLET_D if randf() < 0.5 else VIOLET)})
	# timers
	venom_t = maxf(0.0, venom_t - dt)
	blur_ev = maxf(0.0, blur_ev - dt)
	breath_cd = maxf(0.0, breath_cd - dt)
	unseen_t = maxf(0.0, unseen_t - dt)
	if omens > 0 and not aR("z_death"):
		omen_t -= dt
		if omen_t <= 0.0:
			omens = 0
			say_at(hero.tp + Vector2(0, -0.3), "omens fade", Color8(111, 106, 121))
	if haze_mantle > 0.0:
		haze_mantle -= dt
		for m in foes(hero.tp, 1.9):
			confuse(m, 2.0)
	_update_dash(dt)
	_update_traps(dt)
	_update_scythes(dt)
	_update_shuris(dt)
	_update_storm(dt)
	_update_sister(dt)
	_update_novas(dt)
	_update_tides(dt)
	_update_clouds(dt)
	_update_knives(dt)
	_update_fields(dt)
	# contagion leaps
	for m in mons():
		var ct := float(m.get_meta("k_cont", 0.0))
		if ct <= 0.0:
			continue
		ct -= dt
		m.set_meta("k_cont", ct)
		var cl := float(m.get_meta("k_cont_t", 0.0)) - dt
		if cl <= 0.0:
			cl = 1.5
			var n := (3 if K("epidemic") > 0 else 2) + (1 if aM("zm_contag") else 0)
			var LR := 5.0 if K("contspread") > 0 else 3.2
			var nb := foes(m.tp, LR).filter(func(o): return o != m)
			nb.sort_custom(func(p, q): return p.tp.distance_to(m.tp) < q.tp.distance_to(m.tp))
			for o in nb.slice(0, n):
				psn(o, cont_psn(), 4.0)
				zaps.append({"a": m.tp, "b": o.tp, "t": 0.2})
		m.set_meta("k_cont_t", cl)
	for arr in [clawfx, zaps, words, rings]:
		for q in arr:
			q["t"] -= dt
	for q in motes:
		q["t"] -= dt
		q["tp"] += q["v"] * dt
		q["z"] += q["vz"] * dt
	clawfx = clawfx.filter(func(q): return q["t"] > 0.0)
	zaps = zaps.filter(func(q): return q["t"] > 0.0)
	words = words.filter(func(q): return q["t"] > 0.0)
	rings = rings.filter(func(q): return q["t"] > 0.0)
	motes = motes.filter(func(q): return q["t"] > 0.0)
	_views()
	if auto_on:
		_autocast(dt)
	if trace:
		trace_t -= dt
		if trace_t <= 0.0:
			trace_t = 5.0
			var parts := []
			for k in dmg_log:
				parts.append("%s=%d" % [k, int(dmg_log[k])])
			print("MIAS hp %d t=%.0f res %.0f/%.0f omens %d clouds %d traps %d sister %s dmg {%s}" % [int(st.hp), time, st.res, st.res_max(), omens, clouds.size(), traps.size(), "yes" if sister != null else "-", ", ".join(parts)])

## Inhale, a passive: every few beats she sips the miasma about her (zz_miasma_breath.js)
func _inhale(dt: float) -> void:
	var L := K("inhale")
	if L <= 0 or hero.dead:
		return
	inhale_t -= dt
	if inhale_t > 0.0:
		return
	inhale_t = maxf(0.9, 2.4 - 0.08 * L)
	var gain := 0.0
	var R := (5.0 + 0.1 * L) * (2.0 if aM("zm_breath") else 1.0)
	for c in clouds:
		if c["kind"] == "poison" and (c["tp"] as Vector2).distance_to(hero.tp) <= R:
			gain += 0.5 + c["t"] * 0.15
	for m in foes(hero.tp, R):
		var q: Dictionary = m.get_meta("k_psn", {})
		if q.is_empty():
			continue
		gain += minf(1.5, float(q["dps"]) * 0.05)
		if K("deepdraw") > 0 and not m.boss:
			m.tp = zone.move(m.tp, (hero.tp - m.tp).normalized() * 0.08, m.radius * 0.6)
		for i in 2:
			motes.append({"tp": m.tp, "z": 4.0, "v": (hero.tp - m.tp) * 2.0, "vz": 4.0, "t": 0.45, "col": VIOLET})
	gain = gain * (1.5 if K("sickbreath") > 0 else 1.0) + 0.6 + 0.08 * L
	# G1 balance: one breath draws at most a tenth of her pool (a field of clouds used to refill her four times
	# faster than the Mystic's Essence comes back)
	gain = minf(gain, hero.st.res_max() * (0.1 if not aM("zm_breath") else 0.13))
	hero.st.res = minf(hero.st.res_max(), hero.st.res + gain)

## Warped Miasma: distortion in every cloud
func _warp(m, c: Vector2) -> void:
	if m.dead or m.boss or randf() >= warp_chance():
		return
	var opts := ["confuse", "slow", "twist"]
	if K("warpfear") > 0:
		opts.append("fear")
	var k: String = opts[randi() % opts.size()]
	match k:
		"confuse": confuse(m, 1.2)
		"slow": m.slow = maxf(m.slow, 0.8)
		"fear": fear(m, 1.2)
		_:
			var d: float = maxf(0.01, c.distance_to(m.tp))
			m.tp = zone.move(m.tp, (c - m.tp) / d * minf(d, 0.9), m.radius * 0.6)
	say_at(m.tp, {"twist": "twisted", "slow": "warped", "fear": "terror"}.get(k, "lost"), WARP)

func _update_clouds(dt: float) -> void:
	for c in clouds:
		c["t"] -= dt
		c["tick"] -= dt
		if c["tick"] > 0.0:
			continue
		c["tick"] = 0.5
		for m in foes(c["tp"], c["R"]):
			if c["kind"] == "haze":
				if aU("z_hanged") and float(m.get_meta("k_hung", -1.0)) < 0.0:
					m.set_meta("k_hung", time)
					stun(m, 1.5)
					m.z_lift = 0.0
				elif not aU("z_hanged") or time - float(m.get_meta("k_hung", time)) > 1.5:
					confuse(m, 1.6)
			elif c["dps"] > 0.0:
				psn(m, c["dps"], 2.0, 1, false)
				if aM("z_veiled") and randf() < 0.1:
					confuse(m, 1.0)
				_warp(m, c["tp"])
	clouds = clouds.filter(func(c): return c["t"] > 0.0)

func _update_novas(dt: float) -> void:
	for n in novas:
		n["r"] += 8.0 * dt
		for m in mons():
			if n["hit"].has(m.get_instance_id()):
				continue
			if absf(m.tp.distance_to(n["tp"]) - n["r"]) < 0.5 + m.radius:
				n["hit"][m.get_instance_id()] = true
				hurt(m, n["dmg"], "pnova")
				psn(m, n["psn"], 4.0)
				shove(m, n["tp"], 0.9)
		if n["r"] >= n["max"]:
			n["done"] = true
			if K("novacloud") > 0 or aU("z_bloom"):
				for i in 8:
					var a := i / 8.0 * TAU
					add_cloud(n["tp"] + Vector2(cos(a), sin(a)) * 4.2, 1.0, 8.0 if aU("z_bloom") else 5.0, n["psn"] * 0.5)
	novas = novas.filter(func(n): return not n.get("done", false))

func _update_tides(dt: float) -> void:
	for w in tides:
		w["t"] -= dt
		if w.get("spin", false):
			if w["follow"]:
				w["c"] = hero.tp
			w["ang"] += dt * 7.0
			w["tp"] = w["c"] + Vector2(cos(w["ang"]), sin(w["ang"])) * w["w"]
			for m in mons():
				var d: float = m.tp.distance_to(w["c"])
				if d > w["w"] + 0.6 + m.radius or d < w["w"] - 0.7:
					continue
				var last := float(w["hitT"].get(m.get_instance_id(), -9.0))
				if time - last < 0.4:
					continue
				w["hitT"][m.get_instance_id()] = time
				hurt(m, w["dmg"], "rotwall")
				psn(m, w["dmg"] * 0.3, 3.0)
			continue
		var stp: float = (6.0 if w.get("wake", false) else 7.0) * dt
		w["tp"] += w["d"] * stp
		if zone.is_solid(w["tp"]):
			w["t"] = 0.0
			continue
		for m in mons():
			if w["hit"].has(m.get_instance_id()):
				continue
			var o: Vector2 = m.tp - w["tp"]
			var along: float = o.dot(w["d"])
			var side: float = absf(o.x * w["d"].y - o.y * w["d"].x)
			if absf(along) > 0.5 + m.radius or side > w["w"] / 2.0 + m.radius:
				continue
			w["hit"][m.get_instance_id()] = m
			hurt(m, w["dmg"], "mwake" if w.get("wake", false) else "rotwall")
			psn(m, w["dmg"] * 0.4, 4.0)
		# a wave carries what it hits along before it
		for id in w["hit"]:
			var m = w["hit"][id]
			if m is Object and is_instance_valid(m) and not m.dead and not m.boss:
				var o: Vector2 = m.tp - w["tp"]
				var along: float = o.dot(w["d"])
				if along > -0.9 and along < 0.9 + m.radius and absf(o.x * w["d"].y - o.y * w["d"].x) < w["w"] / 2.0 + m.radius:
					m.tp = zone.move(m.tp, w["d"] * stp * (0.6 if w.get("wake", false) else 0.9), m.radius * 0.6)
		if w.get("trail", false):
			w["trailT"] -= stp
			if w["trailT"] <= 0.0:
				w["trailT"] = 1.2
				add_cloud(w["tp"], 1.0, 4.0, w["dmg"] * 0.15)
	tides = tides.filter(func(w): return w["t"] > 0.0)

func _update_shuris(dt: float) -> void:
	for s in shuris:
		s["t"] += dt
		s["spin"] += dt * 30.0
		var ang: float = s["a0"] + s["dir"] * 6.5 * s["t"]
		var r: float = 0.5 + 1.7 * s["t"]
		var o: Vector2 = s["tp"]
		s["tp"] = s["c"] + Vector2(cos(ang), sin(ang)) * r
		if zone.is_solid(s["tp"]):
			continue
		s["trail"] -= (s["tp"] as Vector2).distance_to(o)
		if s["trail"] <= 0.0:
			s["trail"] = 0.55
			add_cloud(s["tp"], 0.55, 2.2, s["dmg"] * 0.15)
		for m in foes(s["tp"], 0.45):
			var last := float(s["hitT"].get(m.get_instance_id(), -9.0))
			if time - last < 0.45:
				continue
			s["hitT"][m.get_instance_id()] = time
			hurt(m, s["dmg"], "shuriken")
			psn(m, s["dmg"] * 0.3, 3.0)
			if K("shurisplit") > 0:
				var o2 := near(m.tp, 5.0, func(q): return q != m)
				if o2:
					knife(m.tp, (o2.tp - m.tp).angle(), s["dmg"] * 0.5, 1)
	shuris = shuris.filter(func(s): return s["t"] < s["life"])

func _update_storm(dt: float) -> void:
	if mstorm_t <= 0.0:
		return
	mstorm_t -= dt
	mstorm_tick -= dt
	var R := storm_r()
	for i in 2:
		var a := randf() * TAU
		var rr := R * (0.3 + randf() * 0.7)
		motes.append({"tp": hero.tp + Vector2(cos(a), sin(a)) * rr, "z": randf_range(2, 16), "v": Vector2(-sin(a), cos(a)) * 4.0, "vz": 3.0, "t": 0.5, "col": VIOLET_D if randf() < 0.5 else VIOLET})
	if mstorm_tick > 0.0:
		return
	mstorm_tick = 0.35
	for m in foes(hero.tp, R):
		hurt(m, storm_dmg() * 0.35, "mstorm")
		psn(m, storm_dmg() * 0.25, 2.0)
		m.slow = maxf(m.slow, 0.35)
		if not m.boss:
			var dv: Vector2 = m.tp - hero.tp
			var d := dv.length()
			if d > 0.1:
				m.tp = zone.move(m.tp, Vector2(-dv.y, dv.x) / d * 0.3, m.radius * 0.6)
				if K("stormpull") > 0 and d > 1.0:
					m.tp = zone.move(m.tp, -dv / d * 0.3, m.radius * 0.6)

func _update_knives(dt: float) -> void:
	for k in knives:
		k["t"] -= dt
		k["tp"] += k["v"] * dt
		if zone.is_solid(k["tp"]):
			k["t"] = 0.0
			continue
		for m in foes(k["tp"], 0.2):
			if k["hit"].has(m.get_instance_id()):
				continue
			k["hit"][m.get_instance_id()] = true
			hurt(m, k["dmg"], "knife")
			psn(m, k["dmg"] * 0.5, 3.0)
			k["pierce"] -= 1
			if k["pierce"] <= 0:
				k["t"] = 0.0
				break
	knives = knives.filter(func(k): return k["t"] > 0.0)

func _update_scythes(dt: float) -> void:
	for s in scythes:
		s["spin"] += dt * 20.0
		if not s["back"]:
			var stp := 11.0 * dt
			s["tp"] += s["d"] * stp
			s["dist"] += stp
			if s["dist"] >= s["out"] or zone.is_solid(s["tp"]):
				s["back"] = true
				s["hit"].clear()
		else:
			var d: float = (s["tp"] as Vector2).distance_to(hero.tp)
			if d < 0.5:
				s["done"] = true
				continue
			s["tp"] += (hero.tp - s["tp"]) / d * minf(d, 13.0 * dt)
		for m in foes(s["tp"], 0.7):
			if s["hit"].has(m.get_instance_id()):
				continue
			s["hit"][m.get_instance_id()] = true
			hurt(m, crit(s["dmg"], true), "reap")
			_finisher_kill(m, s["n"])
	scythes = scythes.filter(func(s): return not s.get("done", false))

func _update_traps(dt: float) -> void:
	for th in throws:
		th["t"] += dt
		if th["t"] >= th["dur"] and not th.get("done", false):
			th["done"] = true
			_place_trap(th["kind"], th["to"], false, th["k"])
	throws = throws.filter(func(t): return not t.get("done", false))
	for t in traps:
		if t.get("done", false):
			continue
		t["t"] -= dt
		if t["t"] <= 0.0:
			t["done"] = true
			puff(t["tp"], Color8(111, 106, 121), 8)
			continue
		if t["arm"] > 0.0:
			t["arm"] -= dt
			continue
		match t["kind"]:
			"ntrap":
				t["cd"] -= dt
				if t["cd"] <= 0.0:
					var m := near(t["tp"], 5.5, func(q): return zone.sight_clear(t["tp"], q.tp))
					if m == null:
						t["cd"] = 0.2
					else:
						t["cd"] = 0.7
						var a: float = (m.tp - t["tp"]).angle()
						for k in (2 if aM("zd_needle") else 1):
							knife(t["tp"], a + (0.12 if k > 0 else 0.0), needle_dmg() * t["k"], (2 if aM("zm_fang") else 1) + (1 if K("needlepierce") > 0 else 0))
						t["charges"] -= 1
						if t["charges"] <= 0:
							t["done"] = true
						Sfx.play("glass", 0.15, 2.4)
				if K("sentryburst") > 0:
					t["burstT"] -= dt
					if t["burstT"] <= 0.0:
						t["burstT"] = 2.0
						for c in hero.get_tree().get_nodes_in_group("corpses"):
							if c.visible and not c.has_meta("k_burst") and c.tp.distance_to(t["tp"]) < 5.0:
								c.set_meta("k_burst", true)
								for o in foes(c.tp, 1.8):
									hurt(o, sentry_dmg() * 0.6 * t["k"], "ntrap")
									psn(o, sentry_dmg() * 0.12 * t["k"], 4.0)
								add_cloud(c.tp, 2.2, 6.0, sentry_dmg() * 0.12 * t["k"])
								puff(c.tp, VIOLET_D, 20, 3.0)
								c.modulate.a = 0.0
								break
			"mwake":
				t["leakT"] -= dt
				if t["leakT"] <= 0.0:
					t["leakT"] = 0.7
					var a2 := randf() * TAU
					add_cloud(t["tp"] + Vector2(cos(a2), sin(a2)) * randf() * 1.2, 0.8, 3.0, wake_dmg() * 0.12 * t["k"])
				t["waveT"] -= dt
				if t["waveT"] <= 0.0:
					var m2 := near(t["tp"], 5.5, func(q): return zone.sight_clear(t["tp"], q.tp))
					if m2 == null:
						t["waveT"] = 0.3
					else:
						t["waveT"] = 1.2
						var dv: Vector2 = (m2.tp - t["tp"]).normalized()
						tides.append({"tp": t["tp"] + dv * 0.3, "d": dv, "w": 2.4 if K("wakewide") > 0 else 1.6, "t": 1.0 if K("wakewide") > 0 else 0.75, "hit": {}, "dmg": wake_dmg() * t["k"], "trailT": 0.0, "trail": true, "wake": true})
			_:
				var m3 := near(t["tp"], 1.8)
				if m3 and m3.tp.distance_to(t["tp"]) < 1.4 + m3.radius:
					_trap_trigger(t)
	traps = traps.filter(func(t): return not t.get("done", false))

## Mirage and Siren Lure: fields that slow and bend missiles, charms that drag
func _update_fields(dt: float) -> void:
	for f in mirages:
		f["t"] -= dt
		for m in foes(f["tp"], f["R"]):
			m.slow = maxf(m.slow, 0.5)
			if aM("zd_mirage"):
				m.set_meta("k_frail", time + 0.3)
		for mi in hero.get_tree().get_nodes_in_group("missiles"):
			if mi.side != "hero" and not mi.has_meta("k_veered") and mi.tp.distance_to(f["tp"]) < f["R"]:
				mi.set_meta("k_veered", true)
				if K("miragewarp") > 0:
					mi.vel = -mi.vel
					mi.side = "hero"
				else:
					mi.vel = mi.vel.rotated((1.0 if randf() < 0.5 else -1.0) * randf_range(0.7, 1.4))
	mirages = mirages.filter(func(f): return f["t"] > 0.0)
	for l in lures:
		l["t"] -= dt
		for m in foes(l["tp"], l["R"]):
			if m.boss:
				continue
			var d: float = m.tp.distance_to(l["tp"])
			if d > 0.4:
				m.tp = zone.move(m.tp, (l["tp"] - m.tp) / d * minf(d, 2.5 * dt), m.radius * 0.6)
				if aM("zd_lure"):
					confuse(m, 1.0)
	lures = lures.filter(func(l): return l["t"] > 0.0)

# ------------------------------------------------------------------ the Mirror-Sister
func _update_sister(dt: float) -> void:
	if K("sister") <= 0 or hero.dead:
		if sister != null and is_instance_valid(sister):
			sister.queue_free()
		sister = null
		return
	if sister == null or not is_instance_valid(sister):
		sister = Ally.new()
		sister.book = self
		sister.kind = "sister"
		sister.tp = hero.tp + Vector2(-1.2, 0.4)
		sister.max_hp = hero.st.life_max() * (0.35 + 0.02 * (K("sister") - 1))
		sister.hp = sister.max_hp
		sister.cd = 1.5
		zone.sorted.add_child(sister)
		puff(sister.tp, WARP, 18, 2.0)

## she casts one of your skills, from where she stands, at her strength
func sister_cast_now(id: String, at: Vector2, foe) -> void:
	var keep_tp := hero.tp
	var keep_face := hero.face
	var keep_view := hero.view
	var keep_om := omens
	var keep_anim := cast_anim
	var keep_len := cast_len
	hero.tp = sister.tp
	sister_cast = true
	omens = 0
	_cast(id, at, foe)
	sister_cast = false
	sister.tp = hero.tp
	hero.tp = keep_tp
	hero.face = keep_face
	hero.view = keep_view
	omens = keep_om
	cast_anim = keep_anim
	cast_len = keep_len
	if K("sisterhex") > 0 and foe != null and is_instance_valid(foe) and not foe.dead:
		confuse(foe, 1.0)
	puff(sister.tp, WARP, 6, 1.2)

func _enter_zone() -> void:
	zone = hero.zone
	for arr in [clouds, novas, tides, traps, throws, mirages, lures, scythes, shuris, clawfx, knives, zaps, motes, words, rings]:
		arr.clear()
	for d in decoys:
		if is_instance_valid(d):
			d.queue_free()
	decoys.clear()
	if sister != null and is_instance_valid(sister):
		sister.queue_free()
	sister = null
	dash = {}
	pending = {}
	queue.clear()
	fx_air = null
	fx_floor = null

func _views() -> void:
	if zone == null:
		return
	if fx_floor == null or not is_instance_valid(fx_floor):
		fx_floor = FxNode.new()
		fx_floor.book = self
		fx_floor.floor_mode = true
		zone.floor_layer.add_child(fx_floor)
	if fx_air == null or not is_instance_valid(fx_air):
		fx_air = FxNode.new()
		fx_air.book = self
		fx_air.z_index = 40
		zone.add_child(fx_air)

func _autocast(dt: float) -> void:
	auto_t -= dt
	if auto_t > 0.0 or hero.dead:
		return
	auto_t = 1.0
	var ids: Array = auto_ids if not auto_ids.is_empty() else hard.keys()
	ids = ids.filter(func(i): return lvl(i) > 0 and not is_passive(i))
	if ids.is_empty():
		return
	var m := near(hero.tp, 9.0)
	if m == null:
		return
	auto_i = (auto_i + 1) % ids.size()
	var id: String = ids[auto_i]
	demo_at = m.tp
	cast_anim = "cast"
	cast_len = -1.0
	var ok := hero.act == "" and use(id, m.tp, m)
	if ok:
		hero._start_act(cast_anim, cast_len)
	demo_at = null
