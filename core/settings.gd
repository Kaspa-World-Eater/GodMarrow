extends Node
## Autoload "Settings": options (the web build's Options menu), saved to user://settings.cfg.
var damage_numbers := false
var hit_flash := false
var screen_shake := true
var auto_attack := false
var hold_heavy := true
var music_vol := 0.7
var sfx_vol := 0.8

func _ready() -> void:
	var c := ConfigFile.new()
	if c.load("user://settings.cfg") == OK:
		for k in ["damage_numbers", "hit_flash", "screen_shake", "auto_attack", "hold_heavy", "music_vol", "sfx_vol"]:
			set(k, c.get_value("opt", k, get(k)))

func save() -> void:
	var c := ConfigFile.new()
	for k in ["damage_numbers", "hit_flash", "screen_shake", "auto_attack", "hold_heavy", "music_vol", "sfx_vol"]:
		c.set_value("opt", k, get(k))
	c.save("user://settings.cfg")
