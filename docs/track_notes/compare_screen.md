# The compare screen (character quest, after Pixels)

One screen, two panes: your painting on the left (the sheet, with the view the sprite came from highlighted), the
converted sprite on the right at game size (1x) and 3x, playing idle or walk, with a direction dial. Under it, the
Forge's checks in plain words and a "what to change in the prompt" note built from them, for example: "the figure's
dark and light tones are too close: ask for stronger value contrast", "fine tatter turned to noise: ask for cleaner,
larger shapes", "the eyes vanished: ask for brighter accents on the eyes". Buttons: Copy the pixel-styled prompt
(prompt kind `sheet_px`, filled with this character's description and the style preset's figure size and palette),
Try another painting (drops back to the painting step keeping the character), Keep. Backed by `compare.py`,
`checks.check_character`, `prompts.build_prompt("sheet_px", ...)` and the preset. Same for objects and effects.
