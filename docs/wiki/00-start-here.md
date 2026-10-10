# Godmarrow wiki: start here

*Rewritten 2026-10-08, brought up to date 2026-10-09. The wiki is the design and lore of the game; the working documents (the hand-off, the art rules,
the painting manual) sit beside it in `docs/`, and `docs/README.md` maps them all. If a page disagrees with Derek,
Derek wins; if two pages disagree, the newer dated decision in `01-rules-and-decisions.md` wins.*

**Godmarrow** is a grimdark isometric pixel-art action RPG:
- **Diablo II's structure:** acts, a camp, waystones, scarce loot, open fights;
- **Path of Exile's depth:** the body board of Major and Minor Arcana;
- **Dark Souls' feel:** poise, stagger, readable tells, oblique lore.

The world is the hide of a dead god: a desolate wasteland with almost nobody left. You walk it with only a soul-bound
lantern to push the dark back. The game begins in a cave under black cliffs, where the pilgrim rises out of a pool of
blood, and walks out onto black sand by a sea of blood.

## Pages

| # | Page | Read it when |
|---|---|---|
| 01 | `01-rules-and-decisions.md` | **Before any change.** Derek's standing rules (law) and the dated decision log |
| 02 | `02-world-and-lore.md` | The world as design: acts, zones, creatures, voice rules (older than the bible: where they disagree, `mythology/` wins) |
| — | `mythology/` | **The makers' bible:** the deep lore (everything is told; mantles; the cycle; the cards), the ages, every people's creation myth and end of the world, who is who; and **`mythology/areas/`**, every Act I zone, read before building one |
| — | `in-game-texts/` | Texts for the player to find, in the world's own voices |
| 04 | `04-systems-and-combat.md` | Gameplay: callings and resources, skills, poise, melee, the lantern, monsters, bosses, loot (newer rulings are in 01) |
| 05 | `05-class-*.md` | One calling in depth: the Ossuarch, the Red Penitent, the Hollow Mystic, the Shrine Keeper, the Empty Hand |
| 06 | `06-art-direction.md` | What the game looks like and why |
| 07 | `07-art-pipelines.md` | How the art is made: the 3D road, the height engine, land and set bakes, characters, effects; what was rejected |
| 08 | `08-tech-and-build.md` | Running, testing, committing and delivering the game; the PC and its tools |
| 09 | `09-backlog-and-open-questions.md` | The plan beyond the current piece, what's parked, what Derek still decides |
| 10 | `10-study-great-games.md` | The study of Path of Exile, Diablo II, Blasphemous and gritty pixel games |
| 13 | `13-godot.md` | The game's code: units, layers, folders, the autoloads, a zone, bodies, test hooks |
| 14 | `14-mechanics-checklist.md` | Every mechanic with numbers, from the old browser build (a reference for intent, not a port list) |
| 15 | `15-arcana-v103.md` | The body board's roads and the Mystic's cards |
| — | `../archive/wiki_before_the_bible/` | **Retired 2026-10-09:** the old Codex pages (11, 11a), the interview notes (12, 12b) and the Errant Ways proposal (16), written before the bible; records to mine, not canon |

## The callings

| Calling (code id) | The god they draw on | Resource | In the game |
|---|---|---|---|
| The Ossuarch (`ossumancer`) | Bone, Old Upright | Marrow and shards; melee costs poise | walks; Derek's first; the test captures use him; to be rebuilt |
| The Hollow Mystic (`animancer`) | Soul, the Veiled Crone | Essence and the choir of wisps | walks |
| The Shrine Keeper (`miasmancer`) | Breath, the Myriad's kami | Miasma; Accords (trees: Miasma, Discordia, Concordia) | walks |
| The Empty Hand (`monk`) | the Silence: That Which Cannot Be Held | the hourglass (two sands) | walks |
| The Red Penitent (`hemomancer`) | Flesh, the Bleeding Maiden | Vitae (skills cost life) | data only; waiting on art |

## Glossary

| Term | Meaning |
|---|---|
| the Reliquary | the dead god's corpse, which is the world ("the old one beneath") |
| the Hide | Act I; the god's skin and surface |
| godmarrow | what still lives in the corpse's bones; every calling draws on it. Also the Hide's greeting, a play on "good morrow" |
| the Tithed | whoever is left: the people who woke on the ash on the first mourning, nobody knows from where, owing a tenth of everything |
| the Myriad | the faith of the breath: the dead one's last breath is the one wind, full of kami (spirits of thoughts and beliefs); its keepers still (steal) breath and hold it |
| miasma | breath gone wrong. **Never "rot"** |
| the Wickbound | the soul bound in every lantern; the lantern follows you, carries you back when you fall, and keeps a little each time |
| the Reading | character creation: a tarot reading by the Mysterious Stranger |
| Minor and Major Arcana | small passive pegs and tarot cards on the body board |
| poise | the stagger meter, from Constitution; melee and rolls spend it |
| the first mourning | the morning after the god's death, when the people woke on the ash; there are no dated years |
| the Red | the sea of blood, on a dying heartbeat |
| the Pale | the northern country of bone ridges, the Pale Order's (never "white") |
| the Ythraal | the powers of the old age, grown from whatever was held hardest |
| the Angles | the many-angled host that cut the halls of the Held Space |
| kami | the spirits of thoughts and words that ride the breath (kotodama, those born of words) |
| the Long Back | the Sunken Bog's causeway: the spine of a long-dead serpent god, called by many wrong names |
| the Red Water | the sea of blood at the edge of the world, where Act I begins on black sand; nobody there knows it is a sea |
| the shore folk | the people of the first village, in the giant trees above the black sand; their culture is a Thai and Northwest Coast fusion |

## How to use this wiki (for Claude)

- Read `01` at the start of any session that changes the game.
- When Derek decides something, add a dated line to the log in `01` and fix the page it touches.
- Keep one source of truth per fact: link rather than copy.
- The bible (`mythology/`) is for us: myths told as myths, the gods unknowable. In-game writing (`in-game-texts/`, the
  zones' "Found in the world") is in the world's own voices. Neither names little towns, and neither says "the Hush".
