# 09 · The plan, the backlog and the open questions

*Rewritten 2026-10-08. The order of the art work is `docs/MASTER_RULES.md` section 8; the state of the game is
`docs/HANDOFF.md`. This page holds the plan beyond the current piece, what is parked, and what Derek still has to
decide. The old plans (the Act I plan of 2026-10-05, the rework-and-seeds plan of 2026-10-07) are in
`docs/archive/`.*

## The plan

**Derek's order (2026-10-05, still standing):** finish and polish Act I before anything new. Then (2026-10-08): finish
the bog first (done), then decide how the game begins (decided: the first area), then build it.

1. **The first area, the Red Shore**, on the 3D road (`mythology/areas/the-red-shore.md`). The order is MASTER_RULES
   section 8:
   - the study chapters (the Olympic coast; Northwest Coast forms);
   - the temple to an A;
   - the Red Water and the black sand;
   - the drift logs and sea stacks;
   - the giant trees and the fringe;
   - the hide hut kit, the palisade, the fire pit of the dead, the merchant's corner;
   - the land laid out from a seed from the water inland, baked and placed in the game.
2. **Act I played through.** A full run of the main path with the Ossuarch: every zone, every errand, the bosses.
   Write down what breaks, drags, confuses or kills unfairly; fix the worst first; Derek plays the same run on his
   laptop.
3. **Act I's lands made our own,** one at a time by the bog's method:
   - a generator from the land's ecology and lore;
   - proved walkable on many seeds;
   - the art made as unique pieces on the right road;
   - baked into the game;
   - graded on the land's review page.

   Each starts from its area lore (`docs/wiki/mythology/areas/`). Order to be agreed, but likely:
   - the Hollow Wood (its set already exists);
   - the Drowned Fen and the Drowned Village (they border the bog);
   - the barrows and crypts;
   - the ridge, the shore and the heath;
   - the deep places.
4. **The new music:** Middle-Eastern in the manner of Diablo II, dark, a touch of Muay Thai's sarama.
5. **The rest of MASTER_RULES section 8:**
   - the Ossuarch's metal and armour;
   - the effects repainted in the painted standard;
   - the effects still to build;
   - melee styles;
   - the wisp-fire's live cold flame.

## Ready to build when its turn comes (Derek's rulings, not yet in the game)

- **Charged melee** in the manner of Secret of Mana:
  - three tiers, with a fourth from some uniques;
  - optional, by a setting;
  - three kinds of skill: charged, plain and held;
  - stances (like weaker auras, upkept in poise);
  - rites borne by minions;
  - one kept curse at a time;
  - the Ossuarch's Bone Blade first, end to end: **built** (three tiers, poise per tier, notches closing at nine;
    `Test Bone Blade.bat`). The rest is to come.
- **The lantern bearer:** each calling's small companion carries the light (the Ossuarch's Candle-Hand). Hired
  companions carry a second lantern.
- **Companions with real roles:** Lantern-Bearer, Porter, Reader, Warden, Mender. One at a time, hired at camp; they
  level, wear gear, can fall, take orders and have voices.
- **Souls in the lantern** in place of gems; a materials tab where small materials stack; one big main stash.
- **Death like Diablo II and Dark Souls:** something is dropped where you fall, and you walk back for it.
- **Difficulties** like Diablo II (Normal, Nightmare, Hell), each a little darker.
- **No teleport skills.**
- **Eyes identify monsters** in the dark; the eyeless are the jump scares.

## Parked

- **The Hollow King** (a cow-king mini-boss): cartoony, back burner.
- **Armour tiers and weapons in hand:** after the Ossuarch's metal.
- **The Codex filling in by discovery** for release (every chapter is open while we build).
- **Acts II to V:** not started in the new art; they use the nearest Act I palettes.
- **The Red Penitent:** data only, waiting on art.
- **A new repository teaching every art technique** (for training other AIs): only once Derek says the art is done.

## Debts

- **Gaps in the game's code** (survey of 2026-10-08, listed in `04-systems-and-combat.md` section 12):
  - the Herald's Arcanum is announced and never given;
  - the Silent One's hush does nothing;
  - most of the Ossuarch's Count tree is unbuilt, though points can be spent on it;
  - the death remnant is invisible and unsaved;
  - the Ossuarch's and Penitent's board cards do nothing;
  - ~~unique names built on "Rot" and "Hush"~~ (fixed: they read Gall- and Still- at load).
- ~~The Tallow-Mother vow failed in half the shack's seeds~~ (fixed 2026-10-08: a vow's target keeps the zone's one
  unique; checked with `--ranks`).
- `NORMAL_BLUR` is still above 0 in the height engine's default and two old scenes.
- Retired fixed tiles still ship through `build_set.py` (`tiles_wood`, `church_flags`).
- `bone.SINEW` is brown; dried sinew is translucent amber (chapter 3).
- The `cm_*` Cursemark loaders can be deleted.
- `tools/smoke.sh` defaults to the old Linux Godot path.
- The Hollow Wood's seeded zone is not in the zone list; its floor is bare.
- The old procedural zones draw about 3,400 draw calls a frame.

## Open questions for Derek

- **What "playable" means for the next milestone:** a fun start-to-boss run of Act I, all five acts, or a demo for
  others.
- **The Red Shore** (more in its area page):
  - the names of the area, the village and the merchant, and whether the sea's common name is the Red Water;
  - how many zones the start is (the sand, the fringe and bluffs, the old growth and the village?);
  - how it joins the rest of Act I, and which way the sea lies on the map;
  - which town services the village has with only the merchant;
  - whether the camp's people (Esk, Ysolde, Brannoc, Maren) return later in the act;
  - what becomes of the Ashen Moor, now that the start is the shore;
  - whether the Ash Shore's grey sea is the same blood under ash (proposed in the lore).
- **The vows:** the game has six Act I vows (quests) from the old design, and the lore is now world-building only. Do
  they stay as gameplay?
- **Words still to clear from the game** (found by the Codex cleanup, 2026-10-08):
  - skill names and texts in `data/skills.json`: "Murder of Crows", "Soul Leech", "Wailing Rot", "like a raven moving
    between carcasses", "Crow's Heel";
  - the scrapped Laden Board material, still in the Codex sermon of chapter VI and the interviews;
  - about 80 interview lines about food and daily life (`12b`), left because they mean nothing without it;
  - in the voice lines: "Nine orders", "crusader order", "the Crusade", "mantra", "spider-silk";
  - the old Codex (`data/codex.json`) still names little towns throughout (Derek, 2026-10-08: no little towns).
- **Names that break the laws in the game's data:**
  - the Flesh herald still shows as "the Wet Nurse" (retired; "the Weeping Gash" clashes with "never Weeping");
  - Act III's "Eel-Monger" and "Leech-Wife", "Brood-Sow" and "Brood" names;
  - Act II's "Chalk-Wyrm";
  - Act I's Bellwether (a bellwether is a sheep), a name from the start;
  - Act IV's Tibetan names.
- **The ages' names:** the Lore Bible offers three sets, and none is chosen. Soul still has no herald.
- **Frictions:** which of the old Act I plan's frictions he wants, if any:
  - unread items;
  - no free road home;
  - nothing stacking in the pack;
  - wear and repair;
  - gold picked up by hand;
  - the automap showing only what the light touched;
  - tallow for the lantern.
- **Older design questions** still open:
  - the Empty Hand's two sky skills share a wait (a cost instead?);
  - Soul has no Herald;
  - should Major Arcana cost Minor points too;
  - the Marrow Pontiff's and the Penitent's choices as real choices;
  - an Act V ending where the flesh grows a head.
