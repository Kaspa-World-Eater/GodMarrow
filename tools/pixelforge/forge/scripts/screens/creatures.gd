extends "res://scripts/screens/characters.gd"
## Creatures: the same bench as Characters, on the same engine. The beast rig (four legs, a tail, wings) is not in
## the engine yet, so a creature is built as a humanoid shape model for now; when the rig lands this screen takes it.

func build() -> void:
	super.build()
	if has_model():
		return
	hint_text = "the beast rig is not in the engine yet: creatures stand on the humanoid skeleton"
	app.set_hint(hint_text)

func _build_empty() -> void:
	state_line("The creatures' bench shares the characters' engine. Drop a shape model (.shapes.json) here; until the beast rig lands, a creature stands on the humanoid skeleton (wings, tails and extra limbs as parts that hang and lag).")
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
