extends "res://skills/skill_book.gd"
## The Empty Hand (class id "monk"): the last ascetic of the Gilded Peak. Three trees: Radiance (stronger by day),
## Absence (stronger by night) and Destroyer (stone and blunt force, untouched by the sky). He can turn the sky
## himself: a forced noon or a forced night (Game.sky_force).
## Ported from the web build's final behaviour: zw_monk.js (the skills, KS numbers, the hooks), zz_monk_sand.js (the
## hourglass: two sands in one glass, casting pours, the sand runs back; Weight is gone), zz_mech_balance.js and
## zz_zz_empty92.js (names and texts: data/skills.json is the truth for those), zz_mech_trees.js (the tree).
##
## The hourglass: Radiance pours amber sand down into the lower bulb, Absence pours black sand up into the upper one.
## A bulb is half the resource pool (st.res_max() / 2). The fuller a bulb, the weaker that tree:
## strength = 1 - 0.9 f^2.5 (full: a tenth). A cast pours 5% of the bulb for a skill of the common cost (12.8), more
## for dear ones, at most 25%; turning the sky pours three times over. The sand runs back 10% of a bulb a second
## while he casts and 35% once he stops; every hit runs both back 1.5%, every kill 12%. Destroyer costs poise.
## He is never refused: a full bulb still casts, at a tenth of the force. st.res is kept as the room left in the glass.
## No cooldowns anywhere (the user's rule): the old waits became dearer pours.
##
## The Arcana (data/board.json cards kr_*, ka_*, kd_*, kh_*) are read here with aU / aR / aM where each skill acts.
##
## Test args: --learn=all[:L] or --learn=id,id[:L], --autocast[=id,id] (casts learned skills at the nearest creature
## in turn), --monktrace (prints the glass and each skill's damage every 5 s).

const FxNode = preload("res://skills/monk/fx.gd")
const BuddhaView = preload("res://skills/monk/buddha.gd")

const TUNE := 0.75        # v0.35: every skill's damage cut by a quarter
const POUR := 0.05
const NORM := 12.8
const CAP := 0.25
## the pose each skill strikes (art/sprites/monk.json)
const POSE := {"khands": "flurry", "kfist": "skyfist", "kdawn": "sky", "keclipse": "sky", "ksun": "sky", "kmount": "leap",
	"kclap": "clap", "kpalm": "hungry", "kbelow": "hungry", "kpinch": "pinch", "kgrip": "pinch", "kfinger": "light3",
	"kspade": "light2", "kstep": "heavy", "kpagoda": "heavy", "kthousand": "heavy", "kweep": "heavy", "kbell": "clap"}
## the melee skills walk you in, then strike (reach in yards)
const MELEE := {"khands": 1.4, "kspade": 1.9, "kgrip": 1.4, "kfinger": 1.6}
const HOLD := ["keye", "klotus"]
const RAISED := ["hollow", "drowned", "archer", "ossarcher", "marrow", "knight", "hbone", "hhollow", "calc_knight", "marrow_ghoul", "chalk_wraith"]
## elements (zz_mech_resists.js): Radiance burns as radiance, Absence is void, stone and fists are physical
const ELEM := {"khands": "phys", "kspade": "phys", "kfinger": "phys", "kmirror": "phys", "kbar": "phys", "rubble": "phys"}

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

# the glass
var kR := 0.0
var kA := 0.0
var pour_tab := -1
var pour_t := -9.0
var cast_t := -9.0
var last_res := -1.0
var hit_t := -9.0
var src := ""                # the skill whose blow is landing (kills read it)

# his states
var amber := false
var amber_t := 0.0
var walk := false
var walk_t := 0.3
var obsid := 0.0
var mirror_t := 0.0
var nothing_t := 0.0
var sun_t := 0.0
var sun_tick := 0.0
var bowl := 0
var laugh_t := 3.0
var halo := 0
var halo_t := 0.0
var bar_hold := false
var float_z := 0.0
var bell := {}
var eye := {}
var lotus := {}
var leap := {}
var flurry := {}
var palm := {}
var thousand := {}
var quake := {}
var pending := {}            # a melee skill walking in: {id, m, at, t}
var hold_id := ""            # a held skill waiting for its first frame
var auto_hold := ""          # --autocast: a held skill held for 1.6 s
var buddha = null            # the Weeping One (skills/monk/buddha.gd)
var buddha_mem := {}

# what lies about: drawn by skills/monk/fx.gd
var cones: Array = []
var fists: Array = []
var ofuda: Array = []
var tears: Array = []
var geysers: Array = []
var beams: Array = []
var claps: Array = []
var shades: Array = []
var hands: Array = []
var roots: Array = []
var waves: Array = []
var spikes: Array = []
var stepq: Array = []
var pagodas: Array = []
var slams: Array = []
var remains: Array = []
var marks: Array = []
var rings: Array = []
var motes: Array = []
var words: Array = []
var sky_flash := {}
var seals: Array = []        # The Burning Sutra: burning seals where talismans burst {tp, t, dps, tick}
var shell_t := 0.0           # The Thousand-Armed reversed: the arms close round him
var still_t := 0.0           # how long he has stood still (The Unmoving Door)
var last_tp := Vector2.INF
var sky_bonus := 0.0         # The Black-Flame Lantern: seconds kills have added to the held sky
var clap2 := {}              # The Unstruck Bell: the answering ring

# per creature: faults, stone, silence, shadow
var faults := {}

func _load() -> void:
	super._load()
	for id in data:
		for p in data[id].get("perks", []):
			_virt[p["id"]] = [id, p]
	if not Bus.monster_killed.is_connected(_on_kill):
		Bus.monster_killed.connect(_on_kill)
	_args()

func _args() -> void:
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=")
		var k: String = kv[0]
		var v: String = kv[1] if kv.size() > 1 else ""
		match k:
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
			"monktrace":
				trace = true
			"sand":   # tests: --sand=0.6,0.3 fills the bulbs (they run back as usual)
				var fv := v.split(",")
				set_meta("sand_test", [float(fv[0]), float(fv[1]) if fv.size() > 1 else 0.0])

# ================================================================== levels, perks, the sky, the glass
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
		"spi":
			return hero.st.e_ess()
		"vit":
			return hero.st.e_vit()
		"con":
			return hero.st.e_con()
	return 0.0

func L1(id: String) -> float:
	return 1.0 + (maxi(1, K(id)) - 1) * 0.6

func syn(id: String) -> float:
	var b := 0.0
	for y in data.get(id, {}).get("synergies", []):
		b += float(y.get("table_pc", 0)) * int(hard.get(y.get("from", ""), 0))
	return 1.0 + b / 200.0

func tab(id: String) -> int:
	return int(data.get(id, {}).get("tab", 2))

## the sky: 1 at noon, 0 at night, -1 underground (neutral) unless he has turned it
func sky_k() -> float:
	if Game.sky_force != "":
		return 1.0 if Game.sky_force == "noon" else 0.0
	if zone and zone.d.get("outdoor", false):
		return Game.day_k()
	return -1.0

func sky(t: int) -> float:
	var k := sky_k()
	if k < 0.0 or t == 2:
		return 1.0
	return 0.75 + 0.6 * k if t == 0 else 0.75 + 0.6 * (1.0 - k)

func area() -> float:
	var k := sky_k()
	return 1.0 if k < 0.0 else 0.88 + 0.24 * k        # Radiance: bigger by day

func dur() -> float:
	var k := sky_k()
	return 1.0 if k < 0.0 else 0.85 + 0.35 * (1.0 - k)  # Absence: longer by night

func bulb() -> float:
	return maxf(1.0, hero.st.res_max() / 2.0)

func frac(t: int) -> float:
	return clampf((kA if t == 1 else kR) / bulb(), 0.0, 1.0)

func sand(t: int) -> float:
	if t != 0 and t != 1:
		return 1.0
	return 1.0 - 0.9 * pow(frac(t), 2.5)

func power(id: String) -> float:
	var t := tab(id)
	return hero.st.skill_mult() * sky(t) * sand(t) * syn(id)

## a skill's damage: base and per level, the sky, the glass, synergies, the quarter cut
func D(id: String, b: float, per: float) -> float:
	return (b + per * (L1(id) - 1.0)) * power(id) * TUNE

func _fist_weapon() -> bool:
	var w: Item = hero.st.inv.weapon() if hero.st.inv else null
	return w == null or w.base in ["wraps", "iwraps"]

## bare or wrapped fists grow with him
func fist_add() -> Vector2:
	if hero == null or not _fist_weapon():
		return Vector2.ZERO
	var L: int = hero.st.level
	return Vector2(1.0 + L * 0.5, 2.0 + L * 0.8)

func fist() -> float:
	var w: Item = hero.st.inv.weapon() if hero.st.inv else null
	var fa := fist_add()
	var avg := ((w.dmg.x + w.dmg.y) if w else 4.0) / 2.0 + (fa.x + fa.y) / 2.0
	return avg * hero.st.melee_mult() * (1.45 + 0.03 * L1("kobsid") if obsid > 0.0 else 1.0)

func dr() -> float:
	return minf(0.45, 0.15 + 0.015 * L1("kbar")) if K("kbar") > 0 else 0.0

func sync_res() -> void:
	hero.st.res = maxf(0.0, 2.0 * bulb() - kR - kA)
	last_res = hero.st.res

func pour(t: int, amt: float) -> void:
	var h := bulb()
	var a := minf(CAP, POUR * amt / NORM) * h
	if t == 1:
		kA = minf(h, kA + a)
	else:
		kR = minf(h, kR + a)
	pour_tab = t
	pour_t = time
	sync_res()

func run_back(k: float, t: int = 2) -> void:
	var a := k * bulb()
	if t == 0:
		kA = maxf(0.0, kA - a)
	elif t == 1:
		kR = maxf(0.0, kR - a)
	else:
		kR = maxf(0.0, kR - a)
		kA = maxf(0.0, kA - a)
	sync_res()

## what a skill costs: Radiance and Absence pour sand, Destroyer spends poise
func pay(id: String, mult: float = 1.0) -> void:
	var need := cost(id) * mult
	var t := tab(id)
	if t == 2:
		hero.spend_poise(maxf(1.0, roundf(need * (1.2 if id == "kthousand" else 0.6))))
	else:
		pour(t, need * (3.0 if id in ["kdawn", "keclipse"] else 1.0))
	cast_t = time

## the tooltip line (data/skills.json level texts are the web's; this is the live one)
func info(id: String) -> String:
	var r := func(v): return str(int(round(v)))
	var skt := (" · sky x%.2f" % sky(tab(id))) if tab(id) < 2 else ""
	match id:
		"kdawn", "keclipse": return "%d s · turning the sky pours three times the sand" % int(sky_len(id))
		"kamber": return "%s/s within %.1f yd · eats 1%% life a second%s" % [r.call(D("kamber", 6.5, 3)), amber_r(), skt]
		"khands": return "100 palms · %s in all%s" % [r.call(fist() * (0.09 + 0.01 * L1("khands")) * sky(0) * syn("khands") * 100.0), skt]
		"klaugh": return "%s within %.1f yd every %.1f s%s" % [r.call(D("klaugh", 5.6, 2.8)), laugh_r(), laugh_every(), skt]
		"kstar": return "%s in a %.1f yd cone · x1.5 on the raised dead%s" % [r.call(D("kstar", 12, 5.5)), 4.6 * area(), skt]
		"kfist": return "%s to the one beneath · ring %s%s" % [r.call(D("kfist", 42, 18)), r.call(D("kfist", 42, 18) * 0.35), skt]
		"ksutra": return "%d talismans · %s each · one regrows every 1.4 s%s" % [halo_max(), r.call(D("ksutra", 9, 4)), skt]
		"ktears": return "%d tears · geysers %s · lie 15 s%s" % [tears_n(), r.call(D("ktears", 16, 7)), skt]
		"keye": return "%s/s along 7.5 yd, through walls%s" % [r.call(D("keye", 24, 9)), skt]
		"kbell": return "%.1f s · waves %s · blows on the bell lose 70%%%s" % [5.0 + 0.15 * L1("kbell"), r.call(D("kbell", 10, 4.5)), skt]
		"klotus": return "%s/s at full size · grows to %.1f yd%s" % [r.call(D("klotus", 14, 6)), 3.6 * area(), skt]
		"ksun": return "%d s · beams %s at %d enemies%s" % [sun_len(), r.call(D("ksun", 20, 7)), sun_n(), skt]
		"kpalm": return "Drags within %d yd · %s/s%s" % [palm_r(), r.call(D("kpalm", 5, 2.4) * 5.0), skt]
		"kclap": return "%s · stuns %.1f s within %.1f yd%s" % [r.call(D("kclap", 6, 2.6)), clap_stun(), clap_r(), skt]
		"kbowl": return "%d%% of frontal missiles swallowed · full at 6 · holds %d" % [int(bowl_chance() * 100.0), bowl]
		"kspade": return "%s in an arc · shadowless: rooted %.1f s, %s/s%s" % [r.call(spade_dmg()), 2.5 * dur(), r.call(D("kspade", 7, 3)), skt]
		"kpinch": return "Lesser raised dead collapse · the living: silenced 3 s, %s damage%s" % [r.call(D("kpinch", 14, 6)), skt]
		"kbelow": return "Holds %.1f s · crushes %s/s%s" % [3.0 * dur(), r.call(D("kbelow", 12, 5)), skt]
		"kspit": return "Roots %.1f yd · %s/s for %.1f s · a fifth comes back as life%s" % [spit_r(), r.call(D("kspit", 7, 3.2)), 3.0 * dur(), skt]
		"kwalk": return "Waves %s every 1.2 s within 2.8 yd%s" % [r.call(D("kwalk", 7, 3.2)), skt]
		"kmirror": return "%.1f s · blows come back x%d%s" % [3.0 + 0.1 * L1("kmirror"), 3 if K("kmirror2") > 0 else 2, skt]
		"knothing": return "8 s unseen · each mark collapses for %s%s" % [r.call(D("knothing", 34, 13)), skt]
		"kbar": return "%d%% less from blows · holds doorways" % int(dr() * 100.0)
		"kgrip": return "Stone 4 s · the shattering blow +%s" % r.call(D("kgrip", 26, 11))
		"kfinger": return "%s through any armour · x2.5 on stone" % r.call(fist() * (1.7 + 0.16 * L1("kfinger")) * syn("kfinger"))
		"kobsid": return "%d s · fists x%.2f · %d faults shatter" % [int(10.0 + 0.5 * L1("kobsid")), 1.45 + 0.03 * L1("kobsid"), fault_n()]
		"kmount": return "Leap 5 yd · %s in %.1f yd" % [r.call(D("kmount", 20, 8) * 1.25), 2.3]
		"kstep": return "%s per spear · 6.5 yd · x2 on flagstones" % r.call(D("kstep", 15, 6.5))
		"kpagoda": return "%s when it falls" % r.call(D("kpagoda", 34, 13))
		"kweep":
			var b := buddha_stats()
			return "Life %d · slams %s · draws enemies within 5 yd" % [int(b["max"]), r.call(b["dmg"])]
		"kthousand": return "%d waves · %s each in a 5.5 yd cone · halves armour" % [18 if K("kthous2") > 0 else 12, r.call(D("kthousand", 9, 3.5))]
	return ""

func sky_len(id: String) -> float:
	var outdoor: bool = zone != null and zone.d.get("outdoor", false)
	return (20.0 + (8.0 if K("kdawn2" if id == "kdawn" else "kecl2") > 0 else 0.0)) * (1.0 if outdoor else 0.5)
func amber_r() -> float: return (2.1 + (1.0 if K("kamberw") > 0 else 0.0)) * area()
func laugh_r() -> float: return 3.2 * area() * (1.25 if K("klaughw") > 0 else 1.0) * (1.2 if aM("kr_belly") else 1.0)
func laugh_every() -> float: return maxf(2.0, 3.8 - 0.05 * L1("klaugh"))
func halo_max() -> int: return 3 + K("ksutra") / 4 + (2 if K("ksmore") > 0 else 0)
func tears_n() -> int: return 5 + K("ktears") / 5 + (3 if K("ktmore") > 0 else 0) + (2 if aM("kr_tears") else 0)
func sun_len() -> int: return 10 + (4 if K("ksunlong") > 0 else 0)
func sun_n() -> int: return 3 + int(L1("ksun") / 6.0) + (1 if K("ksunlong") > 0 else 0)
func palm_r() -> int: return 10 if K("kpalmw") > 0 else 7
func clap_r() -> float: return 3.4 + (1.5 if K("kclapw") > 0 else 0.0)
func clap_stun() -> float: return 0.7 * dur() * (2.0 if K("kclapw") > 0 else 1.0)
func bowl_chance() -> float: return minf(0.85, 0.3 + 0.025 * L1("kbowl"))
func spade_dmg() -> float: return fist() * (1.1 + 0.08 * L1("kspade")) * sky(1) * syn("kspade")
func spit_r() -> float: return 2.2 * (1.5 if K("kspitw") > 0 else 1.0)
func fault_n() -> int: return 4 if K("kobsid2") > 0 else 5
func buddha_stats() -> Dictionary:
	var l := L1("kweep")
	return {"max": roundf((90.0 + 40.0 * l + hero.st.level * 6) * (1.5 if K("kweep3") > 0 else 1.0)), "dmg": (10.0 + 6.0 * l) * hero.st.skill_mult()}

# ================================================================== creatures
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

func raised(m) -> bool:
	if m.kind in RAISED:
		return true
	var n: String = str(m.name_shown).to_lower()
	for w in ["husk", "ossuary", "weeper", "bone", "marrow"]:
		if n.contains(w):
			return true
	return false

func stun(m, t: float) -> void:
	if m == null or m.dead:
		return
	m.stun = maxf(m.stun, t * 0.3 if m.boss else t)

func root(m, t: float) -> void:
	if m == null or m.dead:
		return
	m.root = maxf(m.root, minf(0.6, t) if m.boss else t)

func shove(m, from: Vector2, d: float) -> void:
	if m == null or m.dead or m.boss:
		return
	var v: Vector2 = (m.tp - from).normalized() * d
	for i in 4:
		m.tp = zone.move(m.tp, v / 4.0, m.radius * 0.6)

func burn(m, dps: float, secs: float) -> void:
	if m and not m.dead:
		m.add_dot(dps, secs, "radiance")

func wake(m) -> void:
	m.awake = true
	if m.brain and m.brain.state == "sleep":
		m.brain.wake(m)

func now() -> float:
	return Time.get_ticks_msec() / 1000.0

func is_stone(m) -> bool:
	return float(m.get_meta("k_stone", -1.0)) > now()

## a blow from his side. Weeping stone shatters under the next blow that is not the grip's own.
func hurt(m, dmg: float, id: String, o: Dictionary = {}) -> float:
	if m == null or not is_instance_valid(m) or m.dead or m.buried or dmg <= 0.0:
		return 0.0
	var d := dmg
	var elem: String = ELEM.get(id, "radiance" if tab(id) == 0 else ("void" if tab(id) == 1 else "phys"))
	if o.has("elem"):
		elem = o["elem"]
	if m.kind == "pyre" and tab(id) == 0:
		d *= 0.5   # the Pyre-Saint is a burning martyr too
	if aM("kh_unraised") and raised(m):
		d *= 1.2
	var was := src
	src = id
	if is_stone(m) and id != "kgrip":
		m.set_meta("k_stone", -1.0)
		m.stun = minf(m.stun, 0.05)
		m.root = 0.0
		src = "rubble"
		d += D("kgrip", 26, 11)
		dust(m.tp, Color(0.55, 0.53, 0.49), 16)
		say_at(m.tp, "shattered")
		Sfx.play("break", 0.9, 0.8)
		Game.shake(3.0)
	var opts := {}
	if o.has("poise"):
		opts["poise"] = o["poise"]
	if o.get("heavy", false):
		opts["heavy"] = true
	if o.get("melee", false):
		opts["melee"] = true
	var dealt: float = Combat.hit_monster(m, d, elem, o.get("from", hero.tp), opts)
	src = was
	if trace:
		dmg_log[id] = float(dmg_log.get(id, 0.0)) + dealt
	if dealt > 0.0:
		if not m.dead and time - hit_t > 0.08:
			hit_t = time
			run_back(0.015)
	return dealt

## Mantra-Of-Obsidian: a punch leaves a fault; at five it shatters
func fault(m) -> void:
	if m == null or m.dead or obsid <= 0.0:
		return
	var k: int = m.get_instance_id()
	faults[k] = int(faults.get(k, 0)) + 1
	say_at(m.tp, "fault %d" % faults[k])
	if faults[k] >= fault_n():
		faults[k] = 0
		dust(m.tp, Color(0.11, 0.09, 0.15), 18)
		ring(m.tp, 1.4, 0.35, Color(0.54, 0.53, 0.63))
		Sfx.play("break", 0.8, 0.7)
		hurt(m, fist() * 3.0 + D("kobsid", 20, 8), "rubble")
		Game.shake(3.0)

# ================================================================== little things to draw
func ring(p: Vector2, R: float, secs: float, col: Color, r0: float = 0.2) -> void:
	rings.append({"tp": p, "R": R, "R0": r0, "t": secs, "max": secs, "col": col})

func dust(p: Vector2, col: Color, n: int, spd: float = 2.0) -> void:
	for i in mini(n, 24):
		var a := randf() * TAU
		var v := spd * randf_range(0.3, 1.1)
		motes.append({"tp": p, "z": randf_range(2.0, 14.0), "v": Vector2(cos(a), sin(a)) * v, "vz": randf_range(8.0, 30.0), "t": randf_range(0.4, 0.9), "col": col})
	if motes.size() > 500:
		motes = motes.slice(motes.size() - 500)

func say_at(p: Vector2, t: String, col: Color = Color(0.86, 0.83, 0.76)) -> void:
	words.append({"tp": p, "s": t, "t": 1.0, "col": col})
	if words.size() > 24:
		words.pop_front()

func say(t: String, secs: float = 1.0) -> void:
	Bus.say.emit(t, secs)

func banner(t: String, col: Color) -> void:
	var ui = hero.get_tree().root.find_child("GodmarrowWorldUI", true, false)
	if ui and ui.has_method("banner"):
		ui.banner(t, col, 2.0)

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

func ground_key(t: Vector2) -> String:
	var x := int(floor(t.x))
	var y := int(floor(t.y))
	if zone.ground_cls == null or x < 0 or y < 0 or x >= zone.w or y >= zone.h:
		return ""
	return str(zone.ground_keys.get(str(zone.ground_cls[y * zone.w + x]), "main"))

## lit: by an open day, in his lantern, or near a flame
func lit(m) -> bool:
	if m.kind == "pyre":
		return true
	if zone.d.get("outdoor", false) and Game.day_k() > 0.5:
		return true
	if m.tp.distance_to(hero.tp) < hero.light_radius() * 0.8:
		return true
	for L in zone.d.get("lights", []):
		if L is Dictionary and Vector2(float(L.get("x", -99)), float(L.get("y", -99))).distance_to(m.tp) < 3.0:
			return true
	return false

# ================================================================== casting
func held(id: String) -> bool:
	if hold_id == id or auto_hold == id:
		return true
	if hero == null or hero.dead:
		return false
	if hero.skills.right == id and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		return true
	if hero.skills.left == id and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		return true
	return false

func rooted() -> bool:
	return not lotus.is_empty() or not eye.is_empty() or not leap.is_empty() or not flurry.is_empty() or not palm.is_empty() or not thousand.is_empty()

func move_k() -> float:
	var k := 1.0
	if obsid > 0.0:
		k *= 0.85
	if walk:
		k *= 1.1
	if rooted():
		k = 0.0
	return k

func melee_k() -> float:
	return 1.45 + 0.03 * L1("kobsid") if obsid > 0.0 else 1.0

func use(id: String, at: Vector2, target: Monster) -> bool:
	if id == "attack" or id == "" or hero == null or zone == null:
		return false
	if lvl(id) <= 0 or is_passive(id):
		return false
	# toggles can be used mid-cast
	if id == "kamber":
		return _toggle_amber()
	if id == "kwalk":
		return _toggle_walk()
	if nothing_t > 0.0 and id != "kbowl":
		return false
	if not leap.is_empty() or (not lotus.is_empty() and id != "klotus") or not flurry.is_empty():
		return false
	if hero.act != "" and hero.act != "swing" and hero.act != "cast":
		return false
	if target != null and is_instance_valid(target):
		at = target.tp
	at = _los_point(at)
	if id in HOLD:
		if (id == "keye" and not eye.is_empty()) or (id == "klotus" and not lotus.is_empty()):
			return false
		pay(id, 0.4)
		if id == "keye":
			eye = {"ang": (at - hero.tp).angle(), "t": 0.0, "tick": 0.0}
			Sfx.play("cast_mirror", 0.6, 1.6)
		else:
			lotus = {"t": 0.0, "tick": 0.0, "R": 1.1}
			Sfx.play("cast_soul", 0.6, 0.8)
		hold_id = id
		_after(id, at)
		cast_anim = "cast"
		cast_len = 0.3
		return true
	if id == "kbowl":
		if bowl <= 0:
			say("The bowl is empty.", 1.0)
			return false
		_drink_bowl()
		cast_anim = "cast"
		return true
	if id == "kweep" and buddha != null:
		_command_buddha(at)
		cast_anim = "cast"
		cast_len = 0.3
		return true
	# melee skills walk you in, then strike
	if MELEE.has(id) and not (id == "kfinger" and aR("kd_finger")):
		var m := _melee_target(at, target, float(MELEE[id]))
		if m == null:
			var far := near(at, 3.6)
			if far == null:
				say("No enemy in reach.", 0.8)
				return false
			pending = {"id": id, "m": far, "t": 3.0}
			hero.target = null
			hero.walk_to(far.tp)
			return false
		target = m
		at = m.tp
	var ok := _cast(id, at, target)
	if ok:
		pay(id, 0.5 if id in ["kdawn", "keclipse"] and not zone.d.get("outdoor", false) else 1.0)
		_after(id, at)
		hero.stats_changed.emit()
	return ok

func _after(id: String, at: Vector2) -> void:
	cast_anim = POSE.get(id, "cast")
	var t := tab(id)
	Sfx.play(["cast_soul", "cast_thread", "heavy"][t], 0.7, [1.25, 0.7, 0.8][t])
	if t == 0 and not id in ["kdawn", "kfist", "kbell"]:
		for i in 6:
			motes.append({"tp": hero.tp + Vector2(randf_range(-0.4, 0.4), randf_range(-0.4, 0.4)), "z": randf_range(20, 40), "v": Vector2.ZERO, "vz": randf_range(10, 30), "t": 0.6, "col": Color(1.0, 0.94, 0.63)})
	if hero:
		hero._face(at - hero.tp)

func _melee_target(at: Vector2, target, reach: float) -> Monster:
	var m: Monster = target if target != null and is_instance_valid(target) and not target.dead else near(at, 3.6)
	if m == null or m.tp.distance_to(hero.tp) > reach + m.radius + 0.3:
		return null
	return m

func _cast(id: String, a: Vector2, target) -> bool:
	match id:
		"kdawn": return _turn_sky("noon")
		"keclipse": return _turn_sky("night")
		"khands": return _cast_hundred(target)
		"kstar": return _cast_star(a)
		"kfist": return _cast_fist(a)
		"ksutra": return _cast_sutra(a)
		"ktears": return _cast_tears()
		"kbell": return _cast_bell()
		"ksun": return _cast_sun()
		"kpalm": return _cast_palm()
		"kclap": return _cast_clap()
		"kspade": return _cast_spade(a)
		"kpinch": return _cast_pinch(a)
		"kbelow": return _cast_below(a)
		"kspit": return _cast_spit(a)
		"kmirror": return _cast_mirror()
		"knothing": return _cast_nothing()
		"kgrip": return _cast_grip(target)
		"kfinger": return _cast_finger(target)
		"kobsid": return _cast_obsid()
		"kmount": return _cast_mount(a)
		"kstep": return _cast_step(a)
		"kpagoda": return _cast_pagoda(a)
		"kweep": return _summon_buddha(a)
		"kthousand": return _cast_thousand(a)
	return false

# ------------------------------------------------------------------ the sky
func _turn_sky(kind: String) -> bool:
	var id := "kdawn" if kind == "noon" else "keclipse"
	var t := sky_len(id)
	Game.sky_force = kind
	Game.sky_t = t
	sky_bonus = 0.0
	sky_flash = {"kind": kind, "t": 0.9}
	if kind == "noon":
		banner(data[id]["name"].to_upper(), Color8(255, 240, 176))
		say("A blinding noon. Radiance peaks.", 2.0)
		Sfx.play("bell_far", 0.8, 1.6)
		for m in mons():
			if m.tp.distance_to(hero.tp) > 13.0:
				continue
			if m.ai in ["ghost", "flyer"] or m.kind in ["moth", "chalk_wraith", "a5_wraith"]:
				stun(m, 1.6)
				m.slow = maxf(m.slow, 0.5)
				say_at(m.tp, "dazzled", Color8(255, 240, 176))
				if K("kdawn3") > 0:
					burn(m, D("kdawn", 6, 2.5), 4.0)
	else:
		banner(data[id]["name"].to_upper(), Color8(138, 122, 168))
		say("The sun goes out. Every light but yours gutters.", 2.0)
		Sfx.play("bell_far", 0.8, 0.6)
	ring(hero.tp, 4.0, 0.7, Color8(255, 244, 176) if kind == "noon" else Color8(184, 160, 240))
	return true

func _end_sky() -> void:
	var was := Game.sky_force
	Game.sky_force = ""
	Sfx.play("bell_far", 0.7, 1.2)
	say("The false noon cracks and falls away." if was == "noon" else "The sun comes back through the crack.", 2.0)

# ------------------------------------------------------------------ Radiance
func _toggle_amber() -> bool:
	if amber:
		amber = false
		dust(hero.tp, Color(1.0, 0.85, 0.56), 8)
		return false
	pay("kamber")
	amber = true
	amber_t = 0.0
	ring(hero.tp, amber_r(), 0.5, Color8(255, 208, 64))
	dust(hero.tp, Color(1.0, 0.91, 0.63), 18, 2.4)
	_after("kamber", aim_point())
	return false

func _cast_hundred(m) -> bool:
	if m == null:
		return false
	flurry = {"m": m, "t": 0.0, "n": 0, "tick": 0.0, "dmg": fist() * (0.09 + 0.01 * L1("khands")) * sky(0) * syn("khands")}
	cast_len = 1.5
	return true

func _update_flurry(dt: float) -> void:
	if flurry.is_empty():
		return
	var F := flurry
	F["t"] += dt
	F["tick"] -= dt
	var m = F["m"]
	if m == null or not is_instance_valid(m) or m.dead or m.tp.distance_to(hero.tp) > 2.6 + m.radius:
		flurry = {}
		return
	hero._face(m.tp - hero.tp)
	stun(m, 0.15)
	while F["tick"] <= 0.0 and F["n"] < 100:
		F["tick"] += 1.5 / 100.0
		F["n"] += 1
		hurt(m, F["dmg"], "khands", {"melee": true, "poise": F["dmg"] * 0.5})
		if F["n"] % 3 == 0 and not m.dead:
			burn(m, F["dmg"] * 2.0, 2.0)
			slams.append({"tp": m.tp + Vector2(randf_range(-0.6, 0.6), randf_range(-0.5, 0.5)), "z": randf_range(2, 34), "t": 0.24, "max": 0.24, "kind": "palm", "s": 1.5 if randf() < 0.2 else 1.0})
		if F["n"] % 20 == 0:
			fault(m)
		if F["n"] % 6 == 0:
			Sfx.play("hit", 0.3, randf_range(1.2, 1.6))
		if m.dead:
			break
	if F["n"] >= 100 or m.dead:
		if not m.dead:
			var big := K("khshove") > 0
			shove(m, hero.tp, 3.0 if big else 1.5)
			stun(m, 1.5 if big else 0.5)
			hurt(m, F["dmg"] * 8.0, "khands", {"melee": true, "heavy": true})
			slams.append({"tp": m.tp, "z": 4, "t": 0.5, "max": 0.5, "kind": "palm", "s": 3.0})
		if aM("kr_ash"):
			seals.append({"tp": m.tp, "t": 4.0, "max": 4.0, "R": 1.3, "dps": F["dmg"] * 6.0, "tick": 0.0})
			ring(m.tp, 2.0, 0.45, Color8(255, 244, 176))
			Sfx.play("heavy", 1.0, 0.8)
			Game.shake(4.0)
		flurry = {}

func _cast_star(a: Vector2) -> bool:
	var ang := (a - hero.tp).angle()
	var sdmg := D("kstar", 12, 5.5) * (0.7 if aR("kr_star") else 1.0)
	cones.append({"tp": hero.tp, "a0": ang - 0.7, "a1": ang + 0.7, "t": 0.0, "dur": 0.6, "R": 4.6 * area(), "hit": {}, "dmg": sdmg})
	if aU("kr_star"):
		# the breath sweeps back the way it came
		cones.append({"tp": hero.tp, "a0": ang + 0.7, "a1": ang - 0.7, "t": -0.6, "dur": 0.6, "R": 4.6 * area(), "hit": {}, "dmg": sdmg * 0.6})
	say_at(hero.tp + Vector2(0, -0.2), "ha")
	return true

func _update_cones(dt: float) -> void:
	for c in cones:
		c["t"] += dt
		if c["t"] < 0.0:
			continue
		var k: float = minf(1.0, c["t"] / c["dur"])
		var sweep: float = lerpf(c["a0"], c["a1"], k)
		c["sweep"] = sweep
		for m in mons():
			if c["hit"].has(m.get_instance_id()):
				continue
			var dv: Vector2 = m.tp - c["tp"]
			var d := dv.length()
			if d > c["R"] + m.radius or d < 0.1:
				continue
			var da := wrapf(dv.angle() - c["a0"], -PI, PI)
			var span: float = c["a1"] - c["a0"]
			if span >= 0.0:
				if da < -0.15 or da > span + 0.15 or c["a0"] + da > sweep + 0.1:
					continue
			else:
				if da > 0.15 or da < span - 0.15 or c["a0"] + da < sweep - 0.1:
					continue
			c["hit"][m.get_instance_id()] = true
			var und := raised(m)
			hurt(m, c["dmg"] * (1.5 if und else 1.0), "kstar")
			burn(m, c["dmg"] * 0.25, 3.0)
			if und and K("kstarun") > 0:
				burn(m, c["dmg"] * 0.4, 5.0)
			if aR("kr_star") and not m.dead:
				# drawn in, not out: dragged 2 yd toward you and blinded a moment
				if not m.boss:
					var tv: Vector2 = hero.tp - m.tp
					m.tp = zone.move(m.tp, tv.normalized() * minf(2.0, maxf(0.0, tv.length() - 0.9)), m.radius * 0.6)
				stun(m, 0.5)
	cones = cones.filter(func(c): return c["t"] < c["dur"] + 0.35)

func _cast_fist(a: Vector2) -> bool:
	if aR("kr_noon"):
		# reversed: the fist is your own, on the enemy in reach, at once and 60% harder
		var mm := near(hero.tp, 2.2)
		if mm == null:
			say("No enemy in reach.", 0.8)
			return false
		fists.append({"tp": mm.tp, "m": mm, "t": 0.6, "dur": 0.6, "dmg": D("kfist", 42, 18) * 1.6, "done": false, "own": true})
		return true
	var p := clamp_cast(a, 9.0)
	var m := near(p, 1.6)
	fists.append({"tp": m.tp if m else p, "m": m, "t": 0.0, "dur": 0.6, "dmg": D("kfist", 42, 18), "done": false})
	return true

func _update_fists(dt: float) -> void:
	var new_fists: Array = []
	for f in fists:
		f["t"] += dt
		var m = f["m"]
		if m != null and is_instance_valid(m) and not m.dead and f["t"] < f["dur"]:
			f["tp"] = m.tp
		if f["t"] >= f["dur"] and not f["done"]:
			f["done"] = true
			Game.shake(7.0)
			Sfx.play("heavy", 1.0, 0.6)
			var main = m if m != null and is_instance_valid(m) and not m.dead and m.tp.distance_to(f["tp"]) < 1.2 else near(f["tp"], 1.2)
			if main:
				hurt(main, f["dmg"], "kfist", {"heavy": true})
				stun(main, 0.6)
			var RR := 2.5 + (1.0 if K("kfring") > 0 else 0.0)
			for o in foes(f["tp"], RR):
				if o == main:
					continue
				hurt(o, f["dmg"] * 0.35, "kfist")
				if K("kfring") > 0:
					burn(o, f["dmg"] * 0.15, 4.0)
			if aU("kr_noon") and not f.get("lesser", false):
				# two lesser fists follow on the nearest enemies round the first
				var others := foes(f["tp"], 4.0).filter(func(q): return q != main)
				others.sort_custom(func(p1, p2): return p1.tp.distance_to(f["tp"]) < p2.tp.distance_to(f["tp"]))
				for q in others.slice(0, 2):
					new_fists.append({"tp": q.tp, "m": q, "t": 0.15, "dur": 0.6, "dmg": f["dmg"] * 0.5, "done": false, "lesser": true})
			ring(f["tp"], RR, 0.5, Color8(255, 216, 112))
			ring(f["tp"], RR * 0.6, 0.4, Color8(255, 240, 176))
			dust(f["tp"], Color(1.0, 0.91, 0.63), 24, 4.0)
	fists = fists.filter(func(f): return f["t"] < f["dur"] + 0.5)
	fists.append_array(new_fists)

func _cast_sutra(a: Vector2) -> bool:
	var n := halo
	if n <= 0:
		say("The halo is burnt out. It regrows.", 1.0)
		return false
	var fs := foes(a, 5.0)
	fs.sort_custom(func(p, q): return p.tp.distance_to(a) < q.tp.distance_to(a))
	for i in n:
		var ang := -PI / 2.0 + (i - (n - 1) / 2.0) * 0.5
		ofuda.append({"tp": hero.tp - Vector2(0.2, 0.2), "z": 30.0, "v": Vector2(cos(ang + PI / 4.0), sin(ang + PI / 4.0)) * 3.0,
			"target": fs[i % fs.size()] if not fs.is_empty() else null, "aim": a, "t": 3.0, "delay": i * 0.07, "spin": randf() * 6.0, "dmg": D("ksutra", 9, 4)})
	halo = 0
	halo_t = 0.0
	return true

func _update_ofuda(dt: float) -> void:
	for o in ofuda:
		if o["delay"] > 0.0:
			o["delay"] -= dt
			o["tp"] = hero.tp - Vector2(0.2, 0.2)
			continue
		o["t"] -= dt
		o["spin"] += dt * 9.0
		var tg = o["target"]
		if tg == null or not is_instance_valid(tg) or tg.dead:
			tg = near(o["aim"], 6.0)
			if tg == null:
				tg = near(o["tp"], 6.0)
			o["target"] = tg
		var to: Vector2 = (tg.tp if tg else o["aim"]) - o["tp"]
		var d := maxf(0.001, to.length())
		o["v"] += (to / d * 11.0 - o["v"]) * minf(1.0, dt * 5.0)
		o["tp"] += o["v"] * dt
		o["z"] += (10.0 - o["z"]) * minf(1.0, dt * 4.0)
		var hit := near(o["tp"], 0.5)
		if hit != null and hit.tp.distance_to(o["tp"]) > hit.radius + 0.3:
			hit = null
		if hit != null or o["t"] <= 0.0 or (tg == null and d < 0.3):
			o["t"] = 0.0
			for m in foes(o["tp"], 1.2):
				hurt(m, o["dmg"], "ksutra")
				burn(m, o["dmg"] * 0.2, 2.0)
			if aU("kr_sutra"):
				seals.append({"tp": o["tp"], "t": 3.0, "max": 3.0, "R": 0.9, "dps": o["dmg"] * 0.5, "tick": 0.0})
			ring(o["tp"], 1.2, 0.25, Color8(255, 176, 96))
			dust(o["tp"], Color(1.0, 0.85, 0.44), 10)
			Sfx.play("hit", 0.4, 1.5)
	ofuda = ofuda.filter(func(o): return o["t"] > 0.0)

func _cast_tears() -> bool:
	var n := tears_n()
	for i in n:
		var a := i / float(n) * TAU + randf_range(-0.3, 0.3)
		var p := hero.tp + Vector2(cos(a), sin(a)) * randf_range(1.2, 3.2)
		if zone.is_solid(p):
			continue
		tears.append({"tp": p, "from": hero.tp, "fall": 0.35 + i * 0.05, "arm": 0.6 + i * 0.05, "t": 15.0, "dmg": D("ktears", 16, 7)})
	say_at(hero.tp + Vector2(0, -0.3), "boo hoo", Color8(191, 232, 255))
	while tears.size() > 30:
		tears.pop_front()
	return true

func _update_tears(dt: float) -> void:
	for t in tears:
		t["t"] -= dt
		if t["fall"] > 0.0:
			t["fall"] -= dt
		if t["arm"] > 0.0:
			t["arm"] -= dt
			continue
		for m in mons():
			if not m.flying and m.tp.distance_to(t["tp"]) < m.radius + 0.45:
				t["t"] = 0.0
				geysers.append({"tp": t["tp"], "t": 0.7})
				for q in foes(t["tp"], 1.3):
					hurt(q, t["dmg"], "ktears")
					burn(q, t["dmg"] * 0.2, 3.0)
				dust(t["tp"], Color(1.0, 0.97, 0.82), 16, 3.0)
				Sfx.play("cast_soul", 0.6, 1.6)
				break
	tears = tears.filter(func(t): return t["t"] > 0.0)
	for g in geysers:
		g["t"] -= dt
	geysers = geysers.filter(func(g): return g["t"] > 0.0)

func _cast_bell() -> bool:
	var T := 5.0 + 0.15 * L1("kbell")
	bell = {"t": T, "max": T, "cd": 0.0, "ring": 0.0, "drop": 0.25}
	say_at(hero.tp + Vector2(0, -0.4), "OM", Color8(240, 216, 144))
	Sfx.play("bell_far", 1.0, 1.3)
	return true

func _bell_ring() -> void:
	if bell.is_empty() or bell["cd"] > 0.0:
		return
	bell["cd"] = 0.35
	bell["ring"] = 0.4
	var dmg := D("kbell", 10, 4.5)
	for m in foes(hero.tp, 3.0):
		hurt(m, dmg, "kbell")
		stun(m, 1.5 if K("kbloud") > 0 else 0.5)
	ring(hero.tp, 3.0, 0.4, Color8(240, 216, 144))
	Sfx.play("bell_far", 0.8, 1.8)

func _update_eye(dt: float) -> void:
	if eye.is_empty():
		return
	if (not held("keye") and eye["t"] > 0.35) or hero.dead or hero.act == "roll":
		eye = {}
		if hold_id == "keye":
			hold_id = ""
		return
	if hold_id == "keye" and eye["t"] > 0.35:
		hold_id = ""
	pour(0, cost("keye") * dt)
	cast_t = time
	eye["t"] += dt
	hero.walking = false
	var want := (aim_point() - hero.tp).angle()
	var da := wrapf(want - eye["ang"], -PI, PI)
	eye["ang"] += clampf(da, -3.0 * dt, 3.0 * dt)
	hero._face(Vector2(cos(eye["ang"]), sin(eye["ang"])))
	eye["tick"] -= dt
	if eye["tick"] > 0.0:
		return
	eye["tick"] = 0.15
	var L := 7.5
	var dv := Vector2(cos(eye["ang"]), sin(eye["ang"]))
	var dmg := D("keye", 24, 9) * 0.15
	for m in mons():
		var o: Vector2 = m.tp - hero.tp
		var al := o.dot(dv)
		if al < 0.0 or al > L + m.radius or absf(o.x * dv.y - o.y * dv.x) > 0.35 + m.radius:
			continue
		hurt(m, dmg * (1.0 + m.armor / 100.0) * 100.0 / (100.0 + minf(m.armor, 60.0)), "keye")
		if K("keyecut") > 0 and float(m.get_meta("k_cut", -1.0)) < now():
			m.set_meta("k_cut", now() + 4.0)
			var cut: float = m.armor * 0.33
			m.armor -= cut
			var mm = m
			hero.get_tree().create_timer(4.0).timeout.connect(func(): if is_instance_valid(mm): mm.armor += cut)

func _update_lotus(dt: float) -> void:
	if lotus.is_empty():
		return
	if (not held("klotus") and lotus["t"] > 0.35) or hero.dead:
		lotus = {}
		if hold_id == "klotus":
			hold_id = ""
		return
	if hold_id == "klotus" and lotus["t"] > 0.35:
		hold_id = ""
	pour(0, cost("klotus") * dt)
	cast_t = time
	lotus["t"] += dt
	hero.walking = false
	var R := minf(3.6, 1.1 + lotus["t"] * 0.65) * area()
	lotus["R"] = R
	if K("klpull") > 0:
		for m in foes(hero.tp, R + 1.5):
			if m.boss:
				continue
			var d: float = m.tp.distance_to(hero.tp)
			if d > 0.9:
				m.tp = zone.move(m.tp, (hero.tp - m.tp) / d * 1.6 * dt, m.radius * 0.6)
	lotus["tick"] -= dt
	if lotus["tick"] > 0.0:
		return
	lotus["tick"] = 0.25
	var dmg := D("klotus", 14, 6) * 0.25 * (0.55 + 0.45 * minf(1.0, lotus["t"] / 4.0))
	for m in foes(hero.tp, R):
		hurt(m, dmg, "klotus")

func _cast_sun() -> bool:
	sun_t = sun_len()
	sun_tick = 0.0
	banner(data["ksun"]["name"].to_upper(), Color8(255, 216, 112))
	say_at(hero.tp + Vector2(0, -0.4), "HA HA HA", Color8(255, 240, 208))
	return true

func _update_sun(dt: float) -> void:
	if sun_t <= 0.0:
		return
	sun_t -= dt
	sun_tick -= dt
	if sun_tick <= 0.0:
		sun_tick = 0.35
		var dmg := D("ksun", 20, 7) * 0.35
		var fs := foes(hero.tp, 7.5)
		fs.sort_custom(func(a, b): return a.tp.distance_to(hero.tp) < b.tp.distance_to(hero.tp))
		for m in fs.slice(0, sun_n()):
			hurt(m, dmg, "ksun")
			beams.append({"tp": m.tp, "t": 0.22, "col": Color8(255, 216, 112)})
	if sun_t <= 0.0:
		sun_t = 0.0
		dust(hero.tp, Color(1.0, 0.85, 0.44), 20, 2.5)

func _laugh() -> void:
	var R := laugh_r()
	var dmg := D("klaugh", 5.6, 2.8)
	for m in foes(hero.tp, R):
		hurt(m, dmg, "klaugh")
		if m.brain and m.brain.state == "parry":
			m.brain.state = "chase"
	ring(hero.tp, R, 0.5, Color8(255, 240, 160))
	ring(hero.tp, R * 0.6, 0.35, Color8(255, 255, 255))
	say_at(hero.tp + Vector2(0, -0.3), "HA!", Color8(255, 244, 192))
	Sfx.play("cast_soul", 0.5, 0.6)

# ------------------------------------------------------------------ Absence
func _cast_palm() -> bool:
	if aR("ka_palm"):
		# reversed: the palm casts out: everything in reach thrown to the edge, stunned 1 s, torn as it goes
		var R := float(palm_r())
		for m in foes(hero.tp, R):
			hurt(m, D("kpalm", 5, 2.4) * 5.0, "kpalm")
			if not m.boss:
				var d: float = m.tp.distance_to(hero.tp)
				shove(m, hero.tp, maxf(0.0, R - d))
			stun(m, 1.0)
		ring(hero.tp, R, 0.6, Color8(138, 106, 200), R * 0.2)
		return true
	palm = {"t": 1.0, "tick": 0.0, "R": float(palm_r())}
	cast_len = 1.0
	ring(hero.tp, palm["R"], 0.9, Color8(138, 106, 200))
	return true

func _update_palm(dt: float) -> void:
	if palm.is_empty():
		return
	palm["t"] -= dt
	palm["tick"] -= dt
	var tick: bool = palm["tick"] <= 0.0
	if tick:
		palm["tick"] = 0.2
	for m in foes(hero.tp, palm["R"]):
		var d: float = m.tp.distance_to(hero.tp)
		if not m.boss and d > 0.9 + m.radius:
			var s := minf(d - 0.8, 6.0 * dt)
			m.tp = zone.move(m.tp, (hero.tp - m.tp) / d * s, m.radius * 0.6)
		if tick:
			hurt(m, D("kpalm", 5, 2.4), "kpalm")
		wake(m)
		# The Hungry Ghost: what reaches your feet weak enough is swallowed whole
		if aU("ka_palm") and not m.dead and not m.boss and m.rank != "unique" and m.tp.distance_to(hero.tp) < 1.3 and m.hp < m.hp_max * 0.15:
			say_at(m.tp, "swallowed", Color8(138, 122, 168))
			src = "dust"
			Combat.hit_monster(m, m.hp + 1.0, "void", hero.tp, {"poise": 0.0})
			src = ""
	if palm["t"] <= 0.0:
		palm = {}

func _cast_clap() -> bool:
	var R := clap_r()
	if aR("ka_clap"):
		# reversed: no sound. Nothing is stunned, but every enemy missile near is unmade and the ring cannot strike
		for mi in hero.get_tree().get_nodes_in_group("missiles"):
			if mi.side != "hero" and mi.tp.distance_to(hero.tp) < 6.0:
				mi.queue_free()
		for m in foes(hero.tp, R):
			m.set_meta("k_silent", now() + 4.0)
		claps.append({"tp": hero.tp, "t": 0.0, "dur": 0.45, "R": R})
		return true
	if aU("ka_clap"):
		clap2 = {"t": 0.4, "R": R * 1.4}
	var st := clap_stun()
	var dmg := D("kclap", 6, 2.6)
	var broke := 0
	for m in foes(hero.tp, R):
		if m.brain and m.brain.state in ["wind", "charge", "chargeWind"]:
			broke += 1
			m.brain.state = "chase"
			say_at(m.tp, "hushed", Color8(184, 168, 216))
		stun(m, st)
		hurt(m, dmg, "kclap")
	claps.append({"tp": hero.tp, "t": 0.0, "dur": 0.45, "R": R})
	Game.shake(4.0)
	Sfx.play("heavy", 0.9, 1.4)
	if broke > 0:
		say("%d blow%s never landed." % [broke, "s" if broke > 1 else ""], 1.0)
	return true

func _cast_spade(a: Vector2) -> bool:
	var ang := (a - hero.tp).angle()
	if aR("ka_spade"):
		# reversed: the cut flies as a black crescent, 7 yd through everything
		var dv := Vector2(cos(ang), sin(ang))
		for m in mons():
			var o: Vector2 = m.tp - hero.tp
			var al := o.dot(dv)
			if al < 0.0 or al > 7.0 + m.radius or absf(o.x * dv.y - o.y * dv.x) > 0.6 + m.radius:
				continue
			hurt(m, spade_dmg() * 0.8, "kspade")
			_tear_shadow(m, ang)
		shades.append({"tp": hero.tp, "v": dv * 12.0, "t": 0.6, "w": 0.9})
		Sfx.play("swing", 0.9, 0.7)
		return true
	var R := 2.1
	var dmg := spade_dmg()
	for m in foes(hero.tp, R):
		if absf(wrapf((m.tp - hero.tp).angle() - ang, -PI, PI)) > 1.65:
			continue
		hurt(m, dmg, "kspade", {"melee": true})
		fault(m)
		_tear_shadow(m, ang)
	slams.append({"tp": hero.tp, "z": 10, "t": 0.25, "max": 0.25, "kind": "arc", "a": ang, "R": R})
	Sfx.play("swing", 0.9, 0.9)
	return true

## tear a creature's shadow loose (lit ones only, or all with Grave-Light); The Gravedigger sends it on to pin another
func _tear_shadow(m, ang: float, crawl: bool = true) -> void:
	var l := lit(m)
	if not (l or K("kspadew") > 0):
		return
	var k := 1.0 if l else 0.5
	root(m, 2.5 * dur() * k)
	m.set_meta("k_shadow", now() + 4.0 * dur() * k)
	m.set_meta("k_shadow_dps", D("kspade", 7, 3))
	shades.append({"tp": m.tp, "v": Vector2(cos(ang), sin(ang)) * 2.0 + Vector2(randf_range(-0.5, 0.5), randf_range(-0.5, 0.5)), "t": 1.1, "w": m.radius})
	say_at(m.tp, "shadowless", Color8(138, 122, 168))
	if crawl and aU("ka_spade"):
		var o := near(m.tp, 3.0, func(q): return q != m and float(q.get_meta("k_shadow", -1.0)) < now())
		if o:
			root(o, 2.5 * dur() * k)
			o.set_meta("k_shadow", now() + 4.0 * dur() * k)
			o.set_meta("k_shadow_dps", D("kspade", 7, 3))
			shades.append({"tp": m.tp, "v": (o.tp - m.tp) / 1.1, "t": 1.1, "w": o.radius})

func _cast_pinch(a: Vector2) -> bool:
	var m := near(a, 2.2)
	if m == null:
		m = near(hero.tp, 8.0, func(q): return zone.sight_clear(hero.tp, q.tp) and q.tp.distance_to(a) < 4.0)
	if m == null:
		say("Nothing near the cursor to pinch.", 1.0)
		return false
	hero._face(m.tp - hero.tp)
	beams.append({"tp": m.tp, "t": 0.3, "col": Color8(240, 216, 144), "thread": true})
	var weak := raised(m) and (m.rank in ["normal", "minion"] or (m.rank == "champion" and K("kpinchx") > 0))
	if weak:
		say_at(m.tp, "strings cut", Color8(240, 216, 144))
		src = "dust"
		Combat.hit_monster(m, m.hp + 1.0, "void", hero.tp, {"poise": 0.0})
		src = ""
		Sfx.play("glass", 0.5, 1.6)
		return true
	hurt(m, D("kpinch", 14, 6) * (2.0 if raised(m) else 1.0), "kpinch")
	if not m.dead:
		m.set_meta("k_silent", now() + 3.0)
		m.set_meta("k_weak", now() + 6.0)
		if m.brain and m.brain.state in ["wind", "charge"]:
			m.brain.state = "chase"
		say_at(m.tp, "silenced", Color8(184, 168, 216))
	return true

func _cast_below(a: Vector2) -> bool:
	var pick := func(ex: Array):
		var best = null
		var bh := -1.0
		for m in foes(a, 3.0):
			if m in ex:
				continue
			var h: float = m.hp_max * (3.0 if m.boss else (2.0 if m.rank == "unique" else (1.5 if m.rank == "champion" else 1.0)))
			if h > bh:
				bh = h
				best = m
		return best
	var t1 = pick.call([])
	if t1 == null:
		say("No enemy near the cursor.", 1.0)
		return false
	var tg := [t1]
	if K("kbelow2") > 0:
		var t2 = pick.call([t1])
		if t2 != null:
			tg.append(t2)
	for m in tg:
		var hold := 0.6 if m.boss else 3.0 * dur() + (1.0 if aM("ka_grip") else 0.0)
		hands.append({"m": m, "tp": m.tp, "t": 0.0, "dur": hold, "tick": 0.0, "dps": D("kbelow", 12, 5)})
		stun(m, hold)
		root(m, hold)
	Game.shake(3.0)
	Sfx.play("heavy", 0.8, 0.6)
	return true

func _update_hands(dt: float) -> void:
	for h in hands:
		h["t"] += dt
		var m = h["m"]
		if m != null and is_instance_valid(m) and not m.dead:
			m.tp = h["tp"]
			h["tick"] -= dt
			if h["tick"] <= 0.0 and h["t"] < h["dur"]:
				h["tick"] = 0.4
				hurt(m, h["dps"] * 0.4, "kbelow")
	hands = hands.filter(func(h): return h["t"] < h["dur"] + 0.4)

func _cast_spit(a: Vector2) -> bool:
	var p := clamp_cast(a, 8.0)
	var R := spit_r()
	var t := 3.0 * dur() + (1.0 if aM("ka_roots") else 0.0)
	roots.append({"tp": p, "R": R, "t": t, "max": t, "tick": 0.0, "dps": D("kspit", 7, 3.2), "seed": randf() * 99.0})
	for m in foes(p, R):
		root(m, 2.5 * dur())
	beams.append({"tp": p, "t": 0.25, "col": Color8(58, 42, 42), "spit": true})
	Sfx.play("cast_thread", 0.6, 0.6)
	return true

func _update_roots(dt: float) -> void:
	for r in roots:
		r["t"] -= dt
		r["tick"] -= dt
		if r["tick"] > 0.0:
			continue
		r["tick"] = 0.5
		for m in foes(r["tp"], r["R"]):
			var d: float = r["dps"] * 0.5
			var dealt := hurt(m, d, "kspit")
			root(m, 0.6)
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + dealt * 0.2)
	roots = roots.filter(func(r): return r["t"] > 0.0)

func _toggle_walk() -> bool:
	if walk:
		walk = false
		dust(hero.tp, Color(0.16, 0.13, 0.2), 8)
		return false
	pay("kwalk")
	walk = true
	walk_t = 0.3
	ring(hero.tp, 2.8, 0.6, Color8(122, 90, 176))
	_after("kwalk", aim_point())
	return false

func _cast_mirror() -> bool:
	mirror_t = 3.0 + 0.1 * L1("kmirror") + (1.0 if aM("ka_face") else 0.0)
	dust(hero.tp, Color(0.07, 0.05, 0.09), 16)
	cast_len = 0.25
	return true

func _cast_nothing() -> bool:
	nothing_t = 8.0
	marks.clear()
	hero.walking = true
	for m in mons():
		_lose(m)
	banner(data["knothing"]["name"].to_upper(), Color8(154, 148, 168))
	Sfx.play("bell_far", 0.6, 0.4)
	cast_len = 0.3
	return true

func _lose(m) -> void:
	if m.brain and m.brain.state != "sleep":
		m.brain._release_token(m)
		m.brain.state = "sleep"
		m.brain.wake_delay = -1.0

func _end_nothing() -> void:
	nothing_t = 0.0
	var n := 0
	var dmg := D("knothing", 34, 13)
	for m in marks:
		if not is_instance_valid(m) or m.dead:
			continue
		n += 1
		slams.append({"tp": m.tp, "z": 0, "t": 0.5, "max": 0.5, "kind": "implode"})
		hurt(m, dmg, "knothing")
		if K("knoth2") > 0:
			hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.02)
	marks.clear()
	banner("RETURNED", Color8(232, 226, 208))
	if n > 0:
		Game.shake(5.0)
		Sfx.play("heavy", 0.9, 0.5)

func _drink_bowl() -> void:
	var f := bowl
	if f <= 0:
		return
	bowl = 0
	hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.015 * f)
	kR *= 0.75
	kA *= 0.75
	if aM("ka_bowl"):
		run_back(0.03 * f)
	sync_res()
	say_at(hero.tp + Vector2(0, -0.3), "drinks nothing (%d)" % f, Color8(201, 166, 107))
	Sfx.play("drink", 0.6)

# ------------------------------------------------------------------ Destroyer
func _cast_grip(m) -> bool:
	if m == null:
		return false
	var stone := func(q, t: float):
		var tt := 1.0 if q.boss else t
		q.set_meta("k_stone", now() + tt)
		stun(q, tt)
		root(q, tt)
		dust(q.tp, Color(0.54, 0.53, 0.49), 12, 1.6)
		say_at(q.tp, "weeping stone", Color8(176, 172, 160))
	stone.call(m, 5.0 if aM("kd_stone") else 4.0)
	hurt(m, fist() * 0.5, "kgrip", {"melee": true})
	if K("kgrip2") > 0:
		var o := near(m.tp, 2.0, func(q): return q != m)
		if o:
			stone.call(o, 3.0)
	Sfx.play("break", 0.6, 1.2)
	return true

func _cast_finger(m) -> bool:
	if aR("kd_finger"):
		# reversed: the finger points and does not touch: the first enemy in a 7 yd line, through armour, at 80%
		var dv := (aim_point() - hero.tp).normalized()
		var best = null
		var bd := 99.0
		for q in mons():
			var o: Vector2 = q.tp - hero.tp
			var al := o.dot(dv)
			if al > 0.0 and al < 7.0 + q.radius and absf(o.x * dv.y - o.y * dv.x) < 0.5 + q.radius and al < bd:
				bd = al
				best = q
		if best == null:
			say("Nothing in the line.", 0.8)
			return false
		m = best
	if m == null:
		return false
	var ranged := aR("kd_finger")
	var st := is_stone(m)
	var dmg := fist() * (1.7 + 0.16 * L1("kfinger")) * syn("kfinger") * (2.5 if st else 1.0)
	var poke := func(q):
		hurt(q, dmg * (100.0 + q.armor) / 100.0 * (0.8 if ranged else 1.0), "kfinger", {"melee": not ranged, "heavy": true})   # no armour, no guard
		fault(q)
		if aU("kd_finger") and not q.dead and not is_stone(q):
			q.set_meta("k_stone", now() + (1.0 if q.boss else 2.0))
			stun(q, 2.0)
			root(q, 2.0)
			say_at(q.tp, "the answer hardens", Color8(176, 172, 160))
	poke.call(m)
	if st:
		say_at(m.tp, "truth", Color.WHITE)
	var ang: float = (m.tp - hero.tp).angle()
	slams.append({"tp": m.tp, "z": 14, "t": 0.5, "max": 0.5, "kind": "hole", "a": ang})
	if K("kfinger2") > 0:
		var o := near(m.tp + Vector2(cos(ang), sin(ang)) * 1.3, 1.2, func(q): return q != m)
		if o:
			poke.call(o)
			slams.append({"tp": o.tp, "z": 14, "t": 0.5, "max": 0.5, "kind": "hole", "a": ang})
	Sfx.play("hit", 1.0, 1.5)
	return true

func _cast_obsid() -> bool:
	obsid = 10.0 + 0.5 * L1("kobsid") + (4.0 if aM("kd_obsid") else 0.0)
	dust(hero.tp, Color(0.11, 0.09, 0.15), 20, 2.2)
	ring(hero.tp, 2.4, 0.6, Color8(154, 146, 192))
	say_at(hero.tp + Vector2(0, -0.4), "ON KOKUYO", Color8(138, 134, 160))
	return true

func _cast_mount(a: Vector2) -> bool:
	if aR("kd_mount"):
		# reversed: no leap. He drops where he stands; the stone rolls twice as far and stuns
		leap = {"from": hero.tp, "to": hero.tp, "t": 0.0, "dur": 0.3, "far": true}
		cast_len = 0.5
		return true
	var p := clamp_cast(a, 5.0)
	if zone.is_solid(p):
		p = hero.tp.lerp(p, 0.5)
	leap = {"from": hero.tp, "to": p, "t": 0.0, "dur": 0.55}
	hero.invuln = maxf(hero.invuln, 0.5)
	cast_len = 0.7
	say_at(hero.tp + Vector2(0, -0.3), "ha")
	return true

func _update_leap(dt: float) -> void:
	if leap.is_empty():
		return
	leap["t"] += dt
	var k: float = minf(1.0, leap["t"] / leap["dur"])
	var p: Vector2 = leap["from"].lerp(leap["to"], k)
	if not zone.is_solid(p):
		hero.tp = p
	float_z = sin(k * PI) * 30.0
	hero.walking = false
	if k >= 1.0:
		var leap_was := leap
		leap = {}
		float_z = 0.0
		var R := 2.3
		var dmg := D("kmount", 20, 8) * 1.25 * (0.6 if leap_was.get("second", false) else 1.0)
		for m in foes(hero.tp, R):
			hurt(m, dmg, "kmount", {"heavy": true})
			stun(m, 0.8)
			fault(m)
		slams.append({"tp": hero.tp, "z": 0, "t": 0.6, "max": 0.6, "kind": "crater", "R": R})
		var far: bool = leap_was.get("far", false)
		quake = {"tp": hero.tp, "r": R * 0.6, "max": R + (6.0 if far else 3.0), "hit": {}, "dmg": dmg * 0.4, "stun": far}
		if aU("kd_mount") and not leap_was.get("second", false) and not far:
			# the mountain lands twice: a bounce 2 yd onward
			var dv: Vector2 = (leap_was["to"] - leap_was["from"]).normalized()
			if dv.length() < 0.1:
				dv = Vector2(1, 0)
			var p2: Vector2 = hero.tp + dv * 2.0
			if not zone.is_solid(p2):
				leap = {"from": hero.tp, "to": p2, "t": 0.0, "dur": 0.35, "second": true}
		Game.shake(8.0)
		dust(hero.tp, Color(0.54, 0.48, 0.35), 24, 4.0)
		ring(hero.tp, R + 1.0, 0.6, Color8(216, 200, 160))
		Sfx.play("heavy", 1.0, 0.5)

func _update_quake(dt: float) -> void:
	if quake.is_empty():
		return
	quake["r"] += 7.0 * dt
	for m in mons():
		if quake["hit"].has(m.get_instance_id()):
			continue
		if absf(m.tp.distance_to(quake["tp"]) - quake["r"]) < 0.5 + m.radius:
			quake["hit"][m.get_instance_id()] = true
			hurt(m, quake["dmg"], "kmount")
			if K("kmount2") > 0 or quake.get("stun", false):
				stun(m, 1.0)
	for i in 3:
		var a := randf() * TAU
		spikes.append({"tp": quake["tp"] + Vector2(cos(a), sin(a)) * quake["r"], "t": 0.45, "max": 0.45, "h": randf_range(5, 9)})
	if quake["r"] >= quake["max"]:
		quake = {}

func _cast_step(a: Vector2) -> bool:
	var base := (a - hero.tp).angle()
	var angs := [base, base - 0.35, base + 0.35] if K("kstep2") > 0 else [base]
	for ang: float in angs:
		stepq.append({"tp": hero.tp, "d": Vector2(cos(ang), sin(ang)), "i": 0, "n": 15 if aM("kd_bedrock") else 11, "tick": 0.0, "dmg": D("kstep", 15, 6.5) * (1.0 if ang == base else 0.7), "hit": {}})
	Game.shake(4.0)
	return true

func _update_step(dt: float) -> void:
	for q in stepq:
		q["tick"] -= dt
		if q["tick"] > 0.0:
			continue
		q["tick"] = 0.045
		q["i"] += 1
		var p: Vector2 = q["tp"] + q["d"] * (0.4 + q["i"] * 0.6)
		var g := ground_key(p)
		if g in ["water", "shallow"] or zone.is_solid(p):
			q["i"] = q["n"]
			dust(p, Color(0.54, 0.69, 0.75), 6, 1.2)
			continue
		var road := g in ["road", "flags"]
		spikes.append({"tp": p, "t": 0.6, "max": 0.6, "h": 14.0 if road else 11.0})
		for m in foes(p, 0.75):
			if q["hit"].has(m.get_instance_id()):
				continue
			q["hit"][m.get_instance_id()] = true
			hurt(m, q["dmg"] * (2.0 if road else 1.0), "kstep")
			stun(m, 0.4)
		if q["i"] % 3 == 0:
			Sfx.play("break", 0.35, 1.3)
	stepq = stepq.filter(func(q): return q["i"] < q["n"])

func _cast_pagoda(a: Vector2) -> bool:
	var m := near(a, 2.2)
	if m == null:
		m = near(hero.tp, 7.0, func(q): return q.tp.distance_to(a) < 3.5)
	if m == null:
		say("No enemy near the cursor.", 1.0)
		return false
	pagodas.append({"m": m, "tp": m.tp, "t": 0.0, "dur": 1.5 if aM("kd_snap") else 2.2, "dmg": D("kpagoda", 34, 13), "r": m.radius, "done": false})
	stun(m, 2.3)
	root(m, 2.3)
	Game.shake(3.0)
	Sfx.play("break", 0.7, 0.8)
	return true

func _update_pagodas(dt: float) -> void:
	for p in pagodas:
		p["t"] += dt
		var m = p["m"]
		if m != null and is_instance_valid(m) and not m.dead and p["t"] < p["dur"]:
			m.tp = p["tp"]
		if p["t"] >= p["dur"] and not p["done"]:
			p["done"] = true
			Sfx.play("heavy", 1.0, 0.6)
			if m != null and is_instance_valid(m) and not m.dead:
				hurt(m, p["dmg"], "rubble", {"heavy": true})
			if K("kpagoda2") > 0:
				for q in foes(p["tp"], 2.0):
					if q != m:
						hurt(q, p["dmg"] * 0.4, "rubble")
			dust(p["tp"], Color(0.54, 0.53, 0.49), 24, 3.0)
			Game.shake(5.0)
	pagodas = pagodas.filter(func(p): return p["t"] < p["dur"] + 0.6)

func _cast_thousand(a: Vector2) -> bool:
	if aR("kd_arms"):
		# reversed: the arms close round him as a shell for 6 s
		shell_t = 6.0
		ring(hero.tp, 1.6, 0.6, Color8(176, 172, 160))
		return true
	thousand = {"t": 0.0, "ang": (a - hero.tp).angle(), "tick": 0.0, "n": 0, "max": 18 if K("kthous2") > 0 else 12, "dmg": D("kthousand", 9, 3.5), "pulv": {}}
	cast_len = 1.5
	return true

func _update_thousand(dt: float) -> void:
	if thousand.is_empty():
		return
	var T := thousand
	T["t"] += dt
	T["tick"] -= dt
	hero.walking = false
	if T["t"] > 0.35 and T["tick"] <= 0.0 and T["n"] < T["max"]:
		T["tick"] = 1.1 / T["max"]
		T["n"] += 1
		for m in foes(hero.tp, 5.5):
			if not aU("kd_arms") and absf(wrapf((m.tp - hero.tp).angle() - T["ang"], -PI, PI)) > 0.85:
				continue
			hurt(m, T["dmg"], "kthousand")
			if not T["pulv"].has(m.get_instance_id()):
				T["pulv"][m.get_instance_id()] = true
				m.armor = roundf(m.armor * 0.5)
		for i in 4:
			var aa: float = T["ang"] + (randf() * TAU if aU("kd_arms") else randf_range(-0.8, 0.8))
			slams.append({"tp": hero.tp + Vector2(cos(aa), sin(aa)) * randf_range(1.2, 5.5), "z": randf_range(4, 24), "t": 0.3, "max": 0.3, "kind": "palm", "s": randf_range(1.0, 1.8), "stone": randf() < 0.5})
		if T["n"] % 2 == 1:
			Sfx.play("hit", 0.5, randf_range(0.7, 0.9))
		Game.shake(2.0)
	if T["t"] > 1.8:
		thousand = {}

# ------------------------------------------------------------------ the Weeping One
func _summon_buddha(a: Vector2) -> bool:
	var p := clamp_cast(a, 5.0)
	if zone.is_solid(p):
		p = hero.tp + Vector2(0.8, 0)
	var stt := buddha_stats()
	var hp: float = stt["max"]
	if not buddha_mem.is_empty():
		hp = minf(stt["max"], buddha_mem["frac"] * stt["max"] + (time - buddha_mem["at"]) * 0.01 * stt["max"])
	buddha = BuddhaView.new()
	buddha.book = self
	buddha.tp = p
	buddha.hp = maxf(stt["max"] * 0.25, hp)
	buddha.max_hp = stt["max"]
	zone.sorted.add_child(buddha)
	buddha_mem = {}
	Game.shake(5.0)
	dust(p, Color(0.54, 0.53, 0.49), 24, 3.0)
	say("The Weeping One rises.", 1.5)
	return true

func _command_buddha(a: Vector2) -> void:
	if buddha == null:
		return
	if buddha.tp.distance_to(a) < 1.4:
		buddha_mem = {"frac": buddha.hp / buddha.max_hp, "at": time}
		dust(buddha.tp, Color(0.54, 0.53, 0.49), 20, 2.4)
		buddha.queue_free()
		buddha = null
		say("The Weeping One sinks back into the earth. It keeps its wounds.", 1.6)
		return
	buddha.order = {"tp": a, "t": 4.0}
	buddha.atk = {}
	say_at(buddha.tp + Vector2(0, -0.6), "go", Color8(176, 172, 160))

func buddha_fell() -> void:
	if buddha == null:
		return
	dust(buddha.tp, Color(0.54, 0.53, 0.49), 30, 3.5)
	buddha_mem = {"frac": 0.5, "at": time}
	buddha.queue_free()
	buddha = null
	say("The Weeping One crumbles.", 1.6)
	Game.shake(5.0)

# ================================================================== hooks the shared game calls
func before_hit(d: float, elem: String, from: Vector2, opts: Dictionary) -> float:
	if nothing_t > 0.0:
		return 0.0
	if sun_t > 0.0 and elem == "phys":
		say_at(hero.tp + Vector2(0, -0.5), "untouched", Color8(255, 216, 112))
		return 0.0
	var src_m: Monster = null
	if from != Vector2.INF:
		src_m = near(from, 0.6)
	var melee := elem == "phys" and src_m != null and src_m.tp.distance_to(hero.tp) < 2.6
	if melee and mirror_t > 0.0:
		var k := 3.0 if K("kmirror2") > 0 else 2.0
		slams.append({"tp": src_m.tp, "z": 0, "t": 0.35, "max": 0.35, "kind": "mirror"})
		hurt(src_m, d * k, "kmirror")
		say_at(hero.tp + Vector2(0, -0.4), "swallowed", Color8(138, 122, 168))
		return 0.0
	if melee and not bell.is_empty():
		d *= 0.3
		_bell_ring()
	if melee and K("kbarthorn") > 0:
		hurt(src_m, d * 0.2, "kbar")
	if melee and aR("kr_sutra") and halo > 0:
		# the halo is worn: a blow burns a talisman away, and it bursts on the one who struck for double
		halo -= 1
		hurt(src_m, D("ksutra", 9, 4) * 2.0, "ksutra")
		dust(src_m.tp, Color(1.0, 0.85, 0.44), 10)
	if shell_t > 0.0:
		d *= 0.6
		if melee:
			hurt(src_m, fist() * 1.2, "kthousand")
			slams.append({"tp": src_m.tp, "z": 14, "t": 0.3, "max": 0.3, "kind": "palm", "s": 1.4, "stone": true})
	if aM("kd_door") and still_t > 1.0:
		d *= 0.9
	if elem == "phys":
		d *= 1.0 - dr()
	if not lotus.is_empty() or obsid > 0.0:
		d *= 0.85
	return d

func catch_missile(mi) -> bool:
	if hero == null or hero.dead:
		return false
	var d: float = mi.tp.distance_to(hero.tp)
	if not bell.is_empty() and d > 0.9:
		dust(mi.tp, Color(0.94, 0.85, 0.56), 5, 1.2)
		_bell_ring()
		return true
	if K("kbowl") > 0:
		var v: Vector2 = mi.vel.normalized() if "vel" in mi else Vector2.ZERO
		var fv := _facing()
		var front := -(v.dot(fv)) > 0.2
		if (front or K("kbowlw") > 0) and randf() < bowl_chance():
			bowl = mini(6, bowl + 1)
			say_at(hero.tp + Vector2(0, -0.3), "into the bowl", Color8(201, 166, 107))
			Sfx.play("coins", 0.3, 1.4)
			if bowl >= 6:
				_drink_bowl()
			return true
	return false

func _facing() -> Vector2:
	var sx: float = hero.face
	var sy := -1.0 if hero.view in ["back", "up"] else 1.0
	var v := Vector2((sx + sy) / 2.0, (sy - sx) / 2.0)
	return v.normalized() if v.length() > 0.01 else Vector2(1, 1).normalized()

func light_mod(r: float) -> float:
	var k := sky_k()
	if k < 0.0:
		return r
	return r + 3.5 * k if k > 0.5 else r * 0.8

func unseen(m) -> bool:
	if nothing_t > 0.0:
		return true
	if Game.sky_force == "night" and not m.boss and m.tp.distance_to(hero.tp) > (4.0 if K("kecl3") > 0 else 6.0):
		return true
	return false

func on_weapon_hit(m: Monster, d: float) -> void:
	if m == null or m.dead:
		return
	fault(m)
	if is_stone(m):
		hurt(m, 1.0, "rubble")
	if hero.st.inv and hero.st.inv.weapon() and hero.st.inv.weapon().base == "shakujo":
		Sfx.play("glass", 0.2, 2.0)
	slams.append({"tp": m.tp, "z": 10, "t": 0.16, "max": 0.16, "kind": "palm", "s": 0.8})

func on_lantern() -> void:
	kR = 0.0
	kA = 0.0
	sync_res()

func on_death() -> void:
	_reset()

func _reset() -> void:
	amber = false
	walk = false
	obsid = 0.0
	shell_t = 0.0
	mirror_t = 0.0
	nothing_t = 0.0
	sun_t = 0.0
	bowl = 0
	bell = {}
	eye = {}
	lotus = {}
	leap = {}
	flurry = {}
	palm = {}
	thousand = {}
	quake = {}
	pending = {}
	hold_id = ""
	float_z = 0.0
	Game.sky_force = ""
	if buddha != null and is_instance_valid(buddha):
		buddha.queue_free()
	buddha = null
	buddha_mem = {}
	kR = 0.0
	kA = 0.0

## his kills leave no corpse: glass, dust, rubble or red mist (Ur-Nihl's servants leave nothing to raise)
func _on_kill(m) -> void:
	if hero == null or hero.st == null or hero.cls != "monk" or not is_instance_valid(m):
		return
	run_back(0.12)
	if trace:
		print("KILL ", m.kind, " src=", src, " hpmax=", m.hp_max)
	if src == "kamber" and K("kash") > 0:
		hero.st.hp = minf(hero.st.life_max(), hero.st.hp + hero.st.life_max() * 0.03)
	faults.erase(m.get_instance_id())
	if aM("kh_lantern") and Game.sky_force != "" and sky_bonus < 10.0:
		Game.sky_t += 1.0
		sky_bonus += 1.0
	if aM("kh_unraised") and raised(m):
		for o in foes(m.tp, 1.6):
			stun(o, 0.5)
		dust(m.tp, Color(0.85, 0.82, 0.74), 14)
	if m.boss:
		return
	var kind := "glass"
	if src in ["dust", "kpinch"]:
		kind = "dust"
	elif src == "kthousand":
		kind = "mist"
	elif src in ["rubble", "kpagoda", "kgrip"] or is_stone(m):
		kind = "rubble"
	var life: float = {"glass": 14.0, "rubble": 10.0, "dust": 2.2, "mist": 2.2}[kind]
	remains.append({"tp": m.tp, "r": m.radius, "t": life, "max": life, "kind": kind, "seed": randf() * 99.0})
	while remains.size() > 40:
		remains.pop_front()
	var col: Color = {"glass": Color(0.05, 0.04, 0.07), "rubble": Color(0.54, 0.53, 0.49), "dust": Color(0.69, 0.67, 0.63), "mist": Color(0.45, 0.1, 0.13)}[kind]
	dust(m.tp, col, 18, 2.4)
	m.visible = false
	m.corpse_t = 0.0
	m.modulate.a = 0.0

# ================================================================== the frame
func tick(dt: float) -> void:
	if hero == null or hero.zone == null:
		return
	time += dt
	if zone != hero.zone:
		_enter_zone()
	var st = hero.st
	if has_meta("sand_test"):
		var sv: Array = get_meta("sand_test")
		kR = sv[0] * bulb()
		kA = sv[1] * bulb()
		cast_t = time
		pour_tab = 0 if fmod(time, 2.0) < 1.0 else 1
		pour_t = time
	# potions and finishing blows fill st.res from outside: that is sand running back
	if last_res >= 0.0 and st.res > last_res + 0.01:
		var gain: float = st.res - last_res
		var take := minf(gain, kR + kA)
		var fr := kR / maxf(0.001, kR + kA)
		kR = maxf(0.0, kR - take * fr)
		kA = maxf(0.0, kA - take * (1.0 - fr))
	# the sand always runs back: slowly while he casts, fast once he stops
	var casting: bool = hero.act == "cast" or not eye.is_empty() or not lotus.is_empty() or walk or time - cast_t < 0.4
	if not hero.dead:
		var rate := bulb() * (0.10 if casting else 0.35)
		kR = maxf(0.0, kR - rate * dt)
		kA = maxf(0.0, kA - rate * dt)
	kR = clampf(kR, 0.0, bulb())
	kA = clampf(kA, 0.0, bulb())
	sync_res()
	# the sky he holds
	if Game.sky_force != "":
		Game.sky_t -= dt
		if Game.sky_t <= 0.0:
			_end_sky()
	if not sky_flash.is_empty():
		sky_flash["t"] -= dt
		if sky_flash["t"] <= 0.0:
			sky_flash = {}
	# a melee skill walking in
	if not pending.is_empty():
		pending["t"] -= dt
		var pm = pending["m"]
		if pm == null or not is_instance_valid(pm) or pm.dead or pending["t"] <= 0.0 or hero.dead:
			pending = {}
		elif pm.tp.distance_to(hero.tp) <= float(MELEE[pending["id"]]) + pm.radius + 0.2 and hero.act == "":
			var pid: String = pending["id"]
			pending = {}
			hero.walking = false
			cast_anim = "cast"
			cast_len = -1.0
			if use(pid, pm.tp, pm):
				hero._start_act(cast_anim, cast_len if cast_len > 0.0 else 0.55 / st.cast_speed())
		elif not hero.walking:
			hero.walk_to(pm.tp)
	# the halo of paper sutras regrows
	if K("ksutra") > 0:
		var mx := halo_max()
		if halo < mx:
			halo_t += dt
			if halo_t >= (1.4 / 1.3 if aM("kr_brush") else 1.4):
				halo_t = 0.0
				halo += 1
		else:
			halo_t = 0.0
		halo = mini(halo, mx)
	# Amber-That-Eats-Itself
	if amber:
		st.hp = maxf(1.0, st.hp - st.life_max() * 0.01 * dt * (2.0 / 3.0 if aM("kr_wax") else 1.0))
		amber_t -= dt
		if amber_t <= 0.0:
			amber_t = 0.5
			for m in foes(hero.tp, amber_r()):
				hurt(m, D("kamber", 6.5, 3) * 0.5, "kamber")
		if randf() < 0.5:
			var a := randf() * TAU
			var r := randf() * amber_r()
			motes.append({"tp": hero.tp + Vector2(cos(a), sin(a)) * r, "z": randf_range(0, 6), "v": Vector2.ZERO, "vz": randf_range(14, 30), "t": 0.5, "col": Color(1.0, 0.85, 0.44) if randf() < 0.5 else Color(1.0, 0.94, 0.75)})
	# Walks-Without-Feet
	if walk:
		pour(1, 1.5 * dt * (2.0 / 3.0 if aM("ka_pitch") else 1.0))
		walk_t -= dt
		if walk_t <= 0.0:
			walk_t = 1.2
			waves.append({"tp": hero.tp, "t": 0.0, "dur": 0.6, "R": 2.8})
			var d := D("kwalk", 7, 3.2)
			for m in foes(hero.tp, 2.8):
				hurt(m, d, "kwalk")
				if K("kwalkw") > 0:
					m.slow = maxf(m.slow, 0.5)
	# Laughter-Without-Warmth
	if K("klaugh") > 0:
		laugh_t -= dt
		if laugh_t <= 0.0:
			if not foes(hero.tp, laugh_r() + 1.0).is_empty():
				laugh_t = laugh_every()
				_laugh()
			else:
				laugh_t = 0.5
	if obsid > 0.0:
		obsid -= dt
		if obsid <= 0.0:
			obsid = 0.0
			say_at(hero.tp + Vector2(0, -0.4), "the stone softens", Color8(138, 134, 160))
	if mirror_t > 0.0:
		mirror_t -= dt
	if shell_t > 0.0:
		shell_t -= dt
	if last_tp != Vector2.INF and hero.tp.distance_to(last_tp) < 0.002:
		still_t += dt
	else:
		still_t = 0.0
	last_tp = hero.tp
	if not clap2.is_empty():
		clap2["t"] -= dt
		if clap2["t"] <= 0.0:
			for m in foes(hero.tp, clap2["R"]):
				stun(m, clap_stun() * 0.6)
				hurt(m, D("kclap", 6, 2.6) * 0.6, "kclap")
			claps.append({"tp": hero.tp, "t": 0.0, "dur": 0.45, "R": clap2["R"]})
			Sfx.play("heavy", 0.6, 1.6)
			clap2 = {}
	for sl in seals:
		sl["t"] -= dt
		sl["tick"] -= dt
		if sl["tick"] <= 0.0:
			sl["tick"] = 0.5
			for m in foes(sl["tp"], sl["R"]):
				hurt(m, sl["dps"] * 0.5, "ksutra")
	seals = seals.filter(func(q): return q["t"] > 0.0)
	if nothing_t > 0.0:
		nothing_t -= dt
		hero.invuln = maxf(hero.invuln, 0.1)
		for m in foes(hero.tp, 1.6):
			if not m in marks:
				marks.append(m)
				say_at(m.tp, "marked", Color8(154, 148, 168))
		for m in mons():
			if m.tp.distance_to(hero.tp) < 20.0 and (buddha == null or m.tp.distance_to(buddha.tp) > 9.0):
				_lose(m)
		if nothing_t <= 0.0:
			_end_nothing()
	elif Game.sky_force == "night":
		for m in mons():
			if unseen(m) and m.brain and m.brain.state in ["chase", "gap"]:
				_lose(m)
	if not bell.is_empty():
		bell["t"] -= dt
		bell["cd"] = maxf(0.0, bell["cd"] - dt)
		bell["ring"] = maxf(0.0, bell["ring"] - dt)
		bell["drop"] = maxf(0.0, bell["drop"] - dt)
		if bell["t"] <= 0.0:
			bell = {}
	# shadowless creatures bleed spirit
	for m in mons():
		if float(m.get_meta("k_shadow", -1.0)) > now():
			var tk := float(m.get_meta("k_shadow_tick", 0.0)) - dt
			if tk <= 0.0:
				tk = 0.5
				hurt(m, float(m.get_meta("k_shadow_dps", 0.0)) * 0.5, "kspade")
			m.set_meta("k_shadow_tick", tk)
	# the chokepoint: standing in a door or a narrow pass, nothing small presses past
	bar_hold = false
	if K("kbar") > 0:
		var x := floorf(hero.tp.x)
		var y := floorf(hero.tp.y)
		var s := func(i: int, j: int): return zone.is_solid(Vector2(x + i + 0.5, y + j + 0.5))
		bar_hold = (s.call(-1, 0) and s.call(1, 0) and not s.call(0, -1) and not s.call(0, 1)) or (s.call(0, -1) and s.call(0, 1) and not s.call(-1, 0) and not s.call(1, 0))
		if bar_hold:
			for m in foes(hero.tp, 1.2):
				if m.radius >= 0.5 or m.boss or m.flying:
					continue
				var d: float = m.tp.distance_to(hero.tp)
				var need: float = m.radius + hero.radius + 0.35
				if d < need and d > 0.001:
					m.tp = zone.move(m.tp, (m.tp - hero.tp) / d * (need - d), m.radius * 0.6)
	# the float: lotus, sun, walking on nothing
	if leap.is_empty():
		var want := 0.0
		if sun_t > 0.0:
			want = 16.0 + sin(time * 2.0) * 2.0
		elif not lotus.is_empty():
			want = 7.0 + sin(time * 2.4) * 1.2
		elif walk:
			want = 2.0 + sin(time * 3.0) * 0.6
		float_z += (want - float_z) * minf(1.0, dt * 6.0)
		if absf(float_z) < 0.05:
			float_z = 0.0
	if hero.spr:
		hero.spr.position.y = -float_z
		hero.spr.modulate = Color(0.55, 0.5, 0.62, 0.35) if nothing_t > 0.0 else (Color(0.62, 0.6, 0.72) if obsid > 0.0 else Color.WHITE)
	_update_flurry(dt)
	_update_cones(dt)
	_update_fists(dt)
	_update_ofuda(dt)
	_update_tears(dt)
	_update_eye(dt)
	_update_lotus(dt)
	_update_sun(dt)
	_update_palm(dt)
	_update_hands(dt)
	_update_roots(dt)
	_update_leap(dt)
	_update_quake(dt)
	_update_step(dt)
	_update_pagodas(dt)
	_update_thousand(dt)
	if rooted() and hero.act == "":
		hero.walking = false
	for arr in [claps, waves]:
		for q in arr:
			q["t"] += dt
	claps = claps.filter(func(q): return q["t"] < q["dur"])
	waves = waves.filter(func(q): return q["t"] < q["dur"])
	for arr in [beams, spikes, slams, remains, rings, words]:
		for q in arr:
			q["t"] -= dt
	for q in shades:
		q["t"] -= dt
		q["tp"] += q["v"] * dt
	for q in motes:
		q["t"] -= dt
		q["tp"] += q["v"] * dt
		q["z"] = maxf(0.0, q["z"] + q["vz"] * dt)
		q["vz"] -= 60.0 * dt
	beams = beams.filter(func(q): return q["t"] > 0.0)
	spikes = spikes.filter(func(q): return q["t"] > 0.0)
	slams = slams.filter(func(q): return q["t"] > 0.0)
	remains = remains.filter(func(q): return q["t"] > 0.0)
	rings = rings.filter(func(q): return q["t"] > 0.0)
	words = words.filter(func(q): return q["t"] > 0.0)
	shades = shades.filter(func(q): return q["t"] > 0.0)
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
			print("MONK hp %d t=%.0f sand R %.1f A %.1f / %.1f res %.0f/%.0f poise %.0f sky %s(%.1f) dmg {%s}" % [int(st.hp), time, kR, kA, bulb(), st.res, st.res_max(), st.poise, Game.sky_force, sky_k(), ", ".join(parts)])

func _enter_zone() -> void:
	zone = hero.zone
	for arr in [cones, fists, ofuda, tears, geysers, beams, claps, shades, hands, roots, waves, spikes, stepq, pagodas, slams, remains, marks, rings, motes, words, seals]:
		arr.clear()
	flurry = {}
	palm = {}
	thousand = {}
	quake = {}
	leap = {}
	lotus = {}
	eye = {}
	pending = {}
	float_z = 0.0
	faults.clear()
	fx_air = null
	fx_floor = null
	if buddha != null:
		var keep = {"hp": buddha.hp, "max": buddha.max_hp}
		if is_instance_valid(buddha):
			buddha.queue_free()
		buddha = BuddhaView.new()
		buddha.book = self
		buddha.tp = hero.tp + Vector2(1.0, 0.0)
		if zone.is_solid(buddha.tp):
			buddha.tp = hero.tp
		buddha.hp = keep["hp"]
		buddha.max_hp = keep["max"]
		buddha.rise = 0.0
		zone.sorted.add_child(buddha)

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

## --autocast: use the learned skills in turn at the nearest creature (tests)
func _autocast(dt: float) -> void:
	auto_t -= dt
	if auto_t > 0.0 or hero.dead:
		return
	auto_t = 1.2
	var ids: Array = auto_ids if not auto_ids.is_empty() else hard.keys()
	ids = ids.filter(func(i): return lvl(i) > 0 and not is_passive(i))
	if ids.is_empty():
		return
	var m := near(hero.tp, 9.0)
	if trace and m == null:
		print("AUTO none: ids ", ids.size(), " mons ", mons().size(), " all ", hero.get_tree().get_nodes_in_group("monsters").size())
	if m == null:
		return
	auto_i = (auto_i + 1) % ids.size()
	var id: String = ids[auto_i]
	demo_at = m.tp
	if id in HOLD:
		auto_hold = id
	cast_anim = "cast"
	cast_len = -1.0
	var okc := hero.act == "" and use(id, m.tp, m)
	if trace:
		print("AUTO ", id, " ok=", okc, " act=", hero.act, " d=", m.tp.distance_to(hero.tp))
	if okc:
		hero._start_act(cast_anim, cast_len if cast_len > 0.0 else 0.55 / hero.st.cast_speed())
	if id in HOLD:
		hero.get_tree().create_timer(1.6).timeout.connect(func(): if auto_hold == id: auto_hold = "")
	demo_at = null
