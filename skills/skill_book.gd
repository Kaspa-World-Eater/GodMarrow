class_name SkillBook
extends RefCounted
## A hero's skills: points bought (hard), effective levels (+items), the left and right slots, hotkeys, and the class's
## casting code. Each order extends this in skills/<cls>.gd and implements cast() for its skill ids (data/skills.json).
## Rules (checklist 0 and 9): no cooldowns; three trees; rows open at 1/6/12/18/24/30; max 20 hard points;
## every level past the first counts 60% (SKILL_GROWTH); costs rise 5% a level.

var hero: Hero
var cls := ""
var hard := {}             # skill id -> points bought
var left := "attack"
var right := "attack"
var keys := {}             # "q".."f" -> skill id
var data := {}             # id -> row from skills.json
var busy := false

static func for_class(h: Hero, c: String) -> SkillBook:
	var path := "res://skills/%s.gd" % c
	var b: SkillBook = load(path).new() if ResourceLoader.exists(path) else SkillBook.new()
	b.hero = h
	b.cls = c
	b._load()
	return b

func _load() -> void:
	for s in Data.table("skills").get("skills", []):
		if s.get("class", "") == cls:
			data[s["id"]] = s
	var cd: Dictionary = Data.table("classes").get("classes", {}).get(cls, {})
	keys = cd.get("default_keys", {}).duplicate()
	var kit: Dictionary = cd.get("starting_kit", {})
	left = kit.get("left_skill", "attack")
	right = kit.get("right_skill", "attack")

func name_of(id: String) -> String:
	if id == "attack":
		return "Attack"
	return data.get(id, {}).get("name", id)

## the effective level: hard points plus item bonuses (all skills, the tree's skills)
func lvl(id: String) -> int:
	var h: int = hard.get(id, 0)
	if h <= 0:
		return 0
	var s: Dictionary = data.get(id, {})
	var bonus := int(hero.st.item("skall")) + int(hero.st.item("skt%d" % int(s.get("tab", 0))))
	return h + bonus

## the SKILL_GROWTH curve: level 1 counts fully, every level after it 60%
func growth(id: String) -> float:
	var L := lvl(id)
	return 0.0 if L <= 0 else 1.0 + (L - 1) * 0.6

func can_learn(id: String) -> bool:
	var s: Dictionary = data.get(id, {})
	if s.is_empty() or hero.st.skill_points <= 0:
		return false
	if hard.get(id, 0) >= int(s.get("max_hard_level", 20)):
		return false
	if hero.st.level < int(s.get("required_level", 1)):
		return false
	for p in s.get("prerequisites", []):
		if hard.get(p, 0) <= 0:
			return false
	return true

func learn(id: String) -> bool:
	if not can_learn(id):
		return false
	hard[id] = int(hard.get(id, 0)) + 1
	hero.st.skill_points -= 1
	hero.stats_changed.emit()
	return true

## the cost at the current level, in the class's resource (5% more per level past the first)
func cost(id: String) -> float:
	var s: Dictionary = data.get(id, {})
	var c: Dictionary = s.get("cost", {})
	var base := float(c.get("base", 0.0))
	var L := maxi(1, lvl(id))
	return base * (1.0 + 0.05 * (L - 1))

func poise_cost(id: String) -> float:
	return float(data.get(id, {}).get("cost", {}).get("poise", 0.0))

func is_passive(id: String) -> bool:
	return data.get(id, {}).get("kind", "cast") == "passive"

## a sampled tooltip number at the current level: part i, number j of skillInfo (skills.json levels)
func num(id: String, part: int, j: int = 0, fallback: float = 0.0) -> float:
	var L := clampi(lvl(id), 1, 20)
	var lv: Dictionary = data.get(id, {}).get("levels", {}).get(str(L), {})
	var vals: Array = lv.get("values", [])
	if part < vals.size() and j < (vals[part] as Array).size():
		return float(vals[part][j])
	return fallback

## try to use a skill at a tile (and a creature if one was clicked). Class files override _cast().
func use(id: String, at: Vector2, target: Monster) -> bool:
	if id == "attack" or id == "":
		return false
	if lvl(id) <= 0 or is_passive(id):
		return false
	var c := cost(id)
	if hero.st.res < c and cls != "hemomancer":
		Bus.say.emit("Not enough %s." % hero.st.res_name(), 1.0)
		return false
	var pc := poise_cost(id)
	if pc > 0.0 and hero.st.poise < pc * 0.5:
		return false
	if not _cast(id, at, target):
		return false
	hero.st.res -= c
	if pc > 0.0:
		hero.spend_poise(pc)
	hero.stats_changed.emit()
	return true

## override: do the skill. Return false if it could not be used here.
func _cast(id: String, at: Vector2, target: Monster) -> bool:
	return false

## override: per-frame upkeep (auras, minions, wisps, toggles)
func tick(dt: float) -> void:
	pass

## override: extra damage absorption (wards, shields); returns the damage left
func absorb(d: float, elem: String) -> float:
	return d

## override: the hero struck with a weapon (hooks for on-hit skills)
func on_weapon_hit(m: Monster, d: float) -> void:
	pass
