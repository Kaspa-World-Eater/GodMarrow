extends "res://scripts/screens/characters.gd"
## Creatures: the same bench as Characters, on the same engine. The beast rig (four legs, a tail, wings) is not in
## the engine yet, so a creature is built as a humanoid shape model for now; when the rig lands this screen takes it.

func build() -> void:
	super.build()
	if has_model():
		return
	hint_text = "under construction: the beast rig is not in the engine yet"
	app.set_hint(hint_text)

func _build_empty() -> void:
	state_line("Under construction: the beast rig (four legs, a tail, wings) is not in the engine yet. This bench shares the characters' engine: a shape model (.shapes.json) dropped here stands on the humanoid skeleton, with wings, tails and extra limbs as parts that hang and lag.", "Gold", 3)
	add_spacer()
	add_choices([
		{"label": "Choose a model file", "cb": func(): app.choose_file(PackedStringArray(["*.json ; shape models"]), import_model, "Choose a shape model")},
		{"label": "Start from the necromancer", "cb": func(): import_model(app.backend.pf_root.path_join("assets/shapes/necromancer_3d.shapes.json"))},
		{"label": "Describe one", "cb": func(): app.go("home")},
	])

func keep() -> void:
	super.keep()

func _export_sheets(then: Callable = Callable()) -> void:
	super._export_sheets(then)
