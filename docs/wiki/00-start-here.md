# Godmarrow wiki: start here

*Rewritten 2026-10-08. The wiki is the design and lore of the game; the working documents (the hand-off, the art rules,
the painting manual) sit beside it in `docs/`, and `docs/README.md` maps them all. If a page disagrees with Derek,
Derek wins; if two pages disagree, the newer dated decision in `01-rules-and-decisions.md` wins.*

**Godmarrow** is a grimdark isometric pixel-art action RPG:
- **Diablo II's structure:** acts, a camp, waystones, scarce loot, open fights;
- **Path of Exile's depth:** the body board of Major and Minor Arcana;
- **Dark Souls' feel:** poise, stagger, readable tells, oblique lore.

The world is the corpse of a dead god. You walk it with only a soul-bound lantern, carried by a small bearer, to push
the dark back. The game begins at the edge of the world, on black sand by a sea of blood.

## Pages

| # | Page | Read it when |
|---|---|---|
| 01 | `01-rules-and-decisions.md` | **Before any change.** Derek's standing rules (law) and the dated decision log |
| 02 | `02-world-and-lore.md` | Writing anything in-world: the cosmology, acts, zones, towns, bestiary, voice rules |
| — | `mythology/` | **The makers' bible:** the deep lore (everything is told; mantles; the cycle; the cards), the ages, every people's creation myth and end of the world, who is who; and **`mythology/areas/`**, every Act I zone, read before building one |
| — | `in-game-texts/` | Texts for the player to find, in the world's own voices |
| 04 | `04-systems-and-combat.md` | Gameplay: callings and resources, skills, poise, melee, the lantern, monsters, bosses, loot (newer rulings are in 01) |
| 05 | `05-class-*.md` | One calling in depth: the Ossuarch, the Red Penitent, the Hollow Mystic, the Shrine Keeper, the Empty Hand |
| 06 | `06-art-direction.md` | What the game looks like and why |
| 07 | `07-art-pipelines.md` | How the art is made: the 3D road, the height engine, land and set bakes, characters, effects; what was rejected |
| 08 | `08-tech-and-build.md` | Running, testing, committing and delivering the game; the PC and its tools |
| 09 | `09-backlog-and-open-questions.md` | The plan beyond the current piece, what's parked, what Derek still decides |
| 10 | `10-study-great-games.md` | The study of Path of Exile, Diablo II, Blasphemous and gritty pixel games |
| 11 | `11-codex-voices.md`, `11a-codex-stranger.md` | The Codex: in-world works by many writers, and the Stranger's own pages |
| 12 | `12-lore-notes.md`, `12b-codex-interviews.md` | Ideas from the writer interviews (canon only once adopted) |
| 13 | `13-godot.md` | The game's code: units, layers, folders, the autoloads, a zone, bodies, test hooks |
| 14 | `14-mechanics-checklist.md` | Every mechanic with numbers, from the old browser build (a reference for intent, not a port list) |
| 15 | `15-arcana-v103.md` | The body board's roads and the Mystic's cards |
| 16 | `16-errant-ways.md` | The Errant Ways: three archetypes per calling (a proposal) |

## The callings

| Calling (code id) | The god they draw on | Resource | In the game |
|---|---|---|---|
| The Ossuarch (`ossumancer`) | Bone, Old Upright | Marrow and shards; melee costs poise | walks; Derek's first; the test captures use him |
| The Hollow Mystic (`animancer`) | Soul, the Veiled Crone | Essence and the choir of wisps | walks |
| The Shrine Keeper (`miasmancer`) | Breath, the Myriad | Miasma; Omens | walks |
| The Empty Hand (`monk`) | the Silence: That Which Cannot Be Held | the hourglass (two sands) | walks |
| The Red Penitent (`hemomancer`) | Flesh, the Bleeding Maiden | Vitae (skills cost life) | data only; waiting on art |

## Glossary

| Term | Meaning |
|---|---|
| the Reliquary | the dead god's corpse, which is the world |
| the Hide | Act I; the god's skin and surface |
| godmarrow | what still lives in the corpse's bones; every calling draws on it. Also the Hide's greeting, a play on "good morrow" |
| the Tithed | the people, descended from the congregation inside the god when it died |
| the Myriad | the god's last breath and the small spirits riding it |
| miasma | breath gone wrong. **Never "rot"** |
| the Wickbound | the soul bound in every lantern; the lantern follows you, carries you back when you fall, and keeps a little each time |
| the Reading | character creation: a tarot reading by the Mysterious Stranger |
| Minor and Major Arcana | small passive pegs and tarot cards on the body board |
| poise | the stagger meter, from Constitution; melee and rolls spend it |
| the Long Back | the Sunken Bog's causeway: the spine of a long-dead serpent god, called by many wrong names |
| the Red Water | the sea of blood at the edge of the world, where Act I begins on black sand; nobody there knows it is a sea |
| the shore folk | the people of the first village, in the giant trees above the black sand; their culture is a Thai and Northwest Coast fusion |

## How to use this wiki (for Claude)

- Read `01` at the start of any session that changes the game.
- When Derek decides something, add a dated line to the log in `01` and fix the page it touches.
- Keep one source of truth per fact: link rather than copy.
- The bible (`mythology/`) is for us: myths told as myths, the gods unknowable. In-game writing (`in-game-texts/`, the
  zones' "Found in the world") is in the world's own voices. Neither names little towns, and neither says "the Hush".
