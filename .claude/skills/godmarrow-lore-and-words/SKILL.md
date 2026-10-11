---
name: godmarrow-lore-and-words
description: Use when writing or editing any Godmarrow lore or player-facing words - the makers' bible (docs/wiki/mythology/), area pages, in-game texts (docs/wiki/in-game-texts/), NPC and Stranger lines, item, skill and place names, the Codex, UI text - and when acting on Derek's notes from the Myths and Lands page. Holds the word laws, the naming laws, the voice rules and a banned-word check.
---

# Lore and words

Read first: `docs/wiki/mythology/README.md` (how the bible is written, its word laws), `00-the-deep-lore.md` (the
truth beneath everything, never stated in the game), `backstage.md` (everything decided, with sources, what is
retired), and `docs/wiki/01-rules-and-decisions.md`, "Words and lore" and the decision log (the newest ruling wins).

## Two different things

| | The bible (`docs/wiki/mythology/`) | In-game texts (`docs/wiki/in-game-texts/`, the game's strings) |
|---|---|---|
| For | us, the makers | the player, who finds them |
| Voice | a good book of world mythology: myths told as myths, readable, in order, little jargon | the world's own voices only (priests, families, scrolls, tombs), who believe they live in the world, can be wrong and disagree |
| Truth | rival tellings stand side by side, never reconciled; a short *Behind the myth* note may say a truth Derek ruled, for us | hinted, never explained (Dark Souls); never an all-knowing narrator, no tutorial voice |

Both: **world-building only** (Derek: "we're not writing story or quests or anything. We're just building the
world"). No quest hooks, boss hooks or story beats. Depth of time without numbers.

## The laws

**The world:**
- The powers are unknowable, Lovecraftian. Every face a faith gives them (the Bearing Mother, the Veiled Crone, the
  Bleeding Maiden, the kami) is a mask; never pretend a mask is the thing. "God" is used sparingly.
- Everything is narrative: the gods are dreams believed real (the deep lore; never said in the game).
- A desolate wasteland, almost nobody left: a lone house, a camp, a hermit. No little towns or villages, no markets,
  no busy roads; the old age's cities are ruins. Regions (the Ossa) are fine. "Not Baldur's Gate": the player makes
  the connections.
- Unknown on purpose: whose corpse the world is, how the old one really died, where the people came from (nobody
  knows), what the Silence wants.
- Never "the dead stand up". Never say the Bone is growing.

**Names** (Derek hates "the Answerers, the Lifted, the Climbers"):
- never "the [verb]-ers" or "the [past participle]";
- from wordplay (hide and the Hide, the Red and read, angles and angels, beyond the Pale, the Maiden and the iron
  maiden, whole, holy and hole, still, steal and steel, keep), Lovecraftian proper names (Ythraal, Qhaloth, Thrae,
  Oss-Karrhath), or each people's own name for a thing;
- play on words wherever it can live: it is a theme of the game.

**Words:**
- The Silence is never "the Hush" ("it's so corny"): That Which Cannot Be Named, the Unmaking, or nothing at all.
- "the Pale", never "white". Every "morning" is a "mourning" (Derek, 2026-10-09).
- No hard numbers of time, no dates. Time is told by what happened: the first mourning, before the Peak fell.
- Banned: cooldown, dps, proc, aggro, loot, buff, nerf, stun, lightning (as a word), mana (except in code), chain
  lightning, rot, cell, virus, DNA, organism, biology. The world speaks in flesh, bone, breath, blood, marrow.
- Real-world words: copper not pennies, lands not country, leagues not miles, the fast-day (no Friday).
- No animals or animal words (wisp-fire and foxfire, never fireflies), except insects, the moor's crows and the
  bog's serpent god.
- Fixed names: the Bleeding Maiden (never "Weeping"); the Pale Order (the Ossuarch's); the Shrine Keeper's Accords;
  sigils (the runeword-style words); "Minor Arcana", never nodes or knots; "The Empty Hand"; the classes are
  callings, never written as characters; no "house" or "brotherhood" for faiths; one cult only, the Second Mouth;
  never "the five" as a title; no food, tables or kitchen framing.
- Retired: "Polished Heart", "Wet Nurse" (the game still shows it for the Flesh herald: an open question for Derek),
  the Laden Board.
- One more banned word (Derek, 2026-10-11): the three-letter g-a-p. Say path, way through, opening, break, space
  between.
- Readable: plain stories and discussion; no Q and A, no "What is said / What is known" blocks, no aphorism stacks.

## The check before you commit words

```bash
bash .claude/skills/godmarrow-lore-and-words/word_check.sh FILE [FILE ...]
```

It prints every line with a banned word, a retired name, "the Hush", "white", "morning", the g-a-p word, an animal,
or a number of years. Each hit needs judgment (a code identifier like `mana` is fine; "white" may be a colour in an art note); in
player-facing text and the bible, fix them.

## Derek's notes on the lore (the Myths and Lands page)

Derek reads the bible section by section at https://claude.ai/artifact/FJszffP2zc6C48vyDHH9ja and leaves notes in its
`notes` collection. Read them (the `ArtifactData` tool; load it with ToolSearch if it is deferred):

```json
{"action": "query", "url": "https://claude.ai/artifact/FJszffP2zc6C48vyDHH9ja", "collection": "notes", "query": {"order_by": {"field": "at", "direction": "desc"}, "limit": 15}}
```

Act on every note; record a ruling in the decision log with his words (`godmarrow-docs-and-rulings`); update the
bible; then read the page with the `Artifact` tool and republish it to the same URL with the new text.

## Where the words live in the game

- `data/codex.json` (the in-game Codex; it still tells retired lore and is due a rewrite voice by voice, Derek's call);
- `art/ui/voice.json` (voice lines), `world/quests.gd` (greetings and land sayings);
- the Reading: `tools/reading/words.py` (`godmarrow-reading`);
- item, skill and monster names in `data/*.json`.
