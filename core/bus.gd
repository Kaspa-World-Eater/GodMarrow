extends Node
## Autoload "Bus": game-wide events, so systems stay decoupled.
signal monster_killed(m)
signal hero_hit(amount)
signal hero_died
signal level_up(level)
signal say(text, secs)
signal loot_dropped(item)
signal gold_changed(total)
signal zone_entered(zone_id)
signal boss_woke(m)
signal boss_felled(m)
