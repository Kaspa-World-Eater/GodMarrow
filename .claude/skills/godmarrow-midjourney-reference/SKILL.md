---
name: godmarrow-midjourney-reference
description: Use when Derek asks for Midjourney paintings, concepts or reference for a Godmarrow character, creature, object or place, or when a piece needs a reference sheet - how to prompt in Derek's own manner, the settings that must never be changed, how the pictures are fetched through his Chrome, where they are kept, and that they are reference only, never game art.
---

# Midjourney: reference paintings, in Derek's manner

**Status:** Midjourney is **reference only**. Characters are now live 3D bodies built by hand in Blender
(`godmarrow-live-3d-character`); scenes are real forms on the 3D road. A Midjourney sheet informs a design page; it
is never cut up, traced or shipped as game art. AI-made characters and 3D (Hunyuan, TRELLIS, Modly) were tried and
rejected. Earlier (2026-10-01 to 10-05) the camp's folk (Maren, Esk, Brannoc, the Stranger) were drawn by hand from
their Midjourney sheets; that is the use: a reference to draw from.

## Never change Derek's settings

His account (V8.2) is his style:
- the Create panel's saved values: Stylization 750, Weirdness 550, Variety (chaos) 75;
- Personalize on, with "V8 Your profile #1" = `--profile anngqkz`;
- Relax speed; a moodboard exists but is not used.

Never change any of them, never turn Personalize off, never send low stylize or chaos overrides.

## Prompt the way he does

His Midjourney images came from short, plain, natural sentences plus his profile and high stylize and weirdness.

- 3 to 6 plain sentences, one idea each; end with "dark fantasy pixel art in the style of Dark Souls, black
  background".
- Flags: `--ar 3:4 --stylize 350..750 --weird 130..550 --chaos 45 --profile anngqkz` (stylize and weird inside his
  ranges).
- Never a long comma-list prompt. A long prompt with stylize 250 and chaos 8 came out generic, and Midjourney
  compressed it into its own sentences.

His best prompt, verbatim (the Ossuarch):

> a medieval knight, facing towards us, his whole body visable. his hands are empty and at his side. his armor is a
> dark iron plate, studded with tally marky. He wears bone trinkets as charms to ward of evil spirits. his helm comes
> to a tall point and has a ghostly pale green tuft. his armor has pale bones fastened into place. the style will be
> reminiscient of dark soul but rendered in a pixel art style. --chaos 45 --ar 3:4 --stylize 350 --weird 130 --profile anngqkz

Another: "dark fantasy pixel art. a custodian of the emperor but wearing armor of bone, pointed crested helm with a
pale green flume... full body, black backgrond. no weapons. --chaos 55 --ar 3:4 --stylize 600 --weird 550 --profile anngqkz".

Keep the game's word laws in the prompt's subject too (no animals, the Pale's bone, no red light): the picture is a
reference for something that must obey them.

## Getting the pictures

- **Through Derek's Chrome** (load the `anthropic-skills:chrome-browser` skill first): midjourney.com, signed in by
  Derek himself. Never type a password or sign in for him. Paint one prompt, one grid, then the upscales.
- **Or PixelForge's bridge** (Derek's tool; other sessions own its code, use it without editing it):
  `tools/pixelforge/.venv/Scripts/pixelforge.exe midjourney prompt --kind K --describe "..."` shows the prompt;
  `... midjourney fetch --prompt "..." -o DIR -p PROJECT [--pick best|all] [--dry-run] --json` paints it through
  Claude in Chrome and downloads the picks (`tools/pixelforge/docs/GUIDE_AI.md`, the verb table and "The Midjourney
  step on the owner's PC needs").
- **Downloads:** Midjourney's CDN refuses direct fetches (403). Files land in Derek's Downloads under Midjourney's
  names; collect them from there. Downloads on the PC need Derek's permission (08 section 7): list what and why.

## Where they go

- A prompt batch: `docs/midjourney/<what>_<date>.md` (the prompts, the picks, what each is for).
- A character's or creature's sheet: `docs/concepts/<name>/` (e.g. `docs/concepts/ossuarch/`, `npc_stranger/`).
  `*.glb` under `docs/concepts/` is gitignored.
- Derek's own Midjourney art: `OneDrive\Desktop\Godmarrow Art\` (his folder; read, never reorganise or delete).

Then the piece goes the normal road: the rules gate, a design page from the lore with the reference beside it, the
graded passes (`godmarrow-art-passes`).
