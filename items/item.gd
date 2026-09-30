class_name Item
extends RefCounted
## One item: a base (data/items.json bases), a rarity, rolled affixes. The stat keys match the web build's
## (life, mana/essence "spi", armor, sd (+% skill damage), frw, fcr, res, mf, gf, lok, fire, cold, miasma, magic,
## wisps, wregen, vit, con, tree skills, all skills, lantern wicks lrad lblue lamber lwhite lgreen lviolet).

var base := ""
var name := ""
var q := "normal"          # normal | magic | rare | unique | potion
var slot := ""             # weapon, offhand, head, body, hands, feet, waist, neck, ring
var grid := Vector2i(1, 1)
var ilvl := 1
var req := 1
var dmg := Vector2.ZERO    # weapons
var armor := 0.0
var stats := {}            # stat key -> value (summed affixes)
var lines: Array = []      # affix text lines, as shown
var lore := ""
var potion := ""           # hp | mp for draughts
var icon := ""

static func from_kit(e: Dictionary, slot_name: String) -> Item:
	var it := Item.new()
	it.base = e.get("base", "")
	it.name = e.get("name", it.base)
	it.q = e.get("q", "normal")
	it.slot = slot_name
	if e.get("dmg") != null:
		var d: Array = e["dmg"]
		it.dmg = Vector2(d[0], d[1])
	if e.get("armor") != null:
		it.armor = float(e["armor"])
	var b: Dictionary = Data.table("items").get("bases", {}).get(it.base, {})
	if b.has("grid"):
		it.grid = Vector2i(b["grid"][0], b["grid"][1])
	it.icon = b.get("icon", "")
	return it

func stat(k: String) -> float:
	return float(stats.get(k, 0.0))

func color() -> Color:
	match q:
		"magic":
			return Color("#8b95ff")
		"rare":
			return Color("#f1e05a")
		"unique":
			return Color("#c9a45a")
	return Color(0.86, 0.84, 0.78)

func sell_value() -> int:
	if potion != "":
		return 8
	return {"normal": 5, "magic": 25, "rare": 70, "unique": 160}.get(q, 5) + 4 * ilvl

func is_weapon() -> bool:
	return slot == "weapon"

func is_ranged() -> bool:
	return base == "wand"
