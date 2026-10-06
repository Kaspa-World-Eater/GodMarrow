extends Node
## Autoload "Settings": options (the web build's Options menu), saved to user://settings.cfg.
var damage_numbers := false
var hit_flash := false
var screen_shake := true
var auto_attack := false
var hold_heavy := true
var charge_melee := true      # melee techniques charge through tiers when held; off: holding strikes, the string climbs the tiers
var music_vol := 0.7
var sfx_vol := 0.8
var fewer_fx := false              # a slower machine (zz_zz_perf74.js): no embers, smoke, mist puffs or canopy shafts; fewer shadows
var title_scene := "bowl"          # the title's stage: bowl (the web's chapel) | stranger | fire (ui/title_stage/)
const TITLE_SCENES := ["stranger", "bowl", "fire"]
const TITLE_NAMES := {"stranger": "the Stranger's box", "bowl": "the Seer's bowl", "fire": "the pilgrims' fire"}

func _ready() -> void:
	var c := ConfigFile.new()
	if c.load("user://settings.cfg") == OK:
		for k in ["damage_numbers", "hit_flash", "screen_shake", "auto_attack", "hold_heavy", "charge_melee", "music_vol", "sfx_vol", "title_scene", "fewer_fx"]:
			set(k, c.get_value("opt", k, get(k)))
		# Derek 2026-10-05: the Seer's bowl ("the face and the blood pool") is the title; once, every saved choice
		# returns to it (it can be changed again in Options)
		if int(c.get_value("opt", "title_v", 0)) < 2:
			title_scene = "bowl"
			save()
	if not title_scene in TITLE_SCENES:
		title_scene = "bowl"

func save() -> void:
	var c := ConfigFile.new()
	for k in ["damage_numbers", "hit_flash", "screen_shake", "auto_attack", "hold_heavy", "charge_melee", "music_vol", "sfx_vol", "title_scene", "fewer_fx"]:
		c.set_value("opt", k, get(k))
	c.set_value("opt", "title_v", 2)
	c.save("user://settings.cfg")
