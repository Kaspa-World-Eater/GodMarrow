# 04 · Systems and combat

*Rewritten 2026-10-08 from a survey of the Godot code: how the game plays now, with the key numbers, and what Derek
has ruled that is not built yet. His rulings are law in `01-rules-and-decisions.md`; each calling's design is on its
`05-class-*` page; the code is `13-godot.md`. The numbers live in the code and the `data/` tables. When this page and
the code disagree, the code is what plays, and the disagreement is a debt to note here.*

## 1. The callings

Four callings are playable; the Red Penitent has its data but no skill code yet.

| Calling | Resource (at level 1) | Trees | What makes it itself | State |
|---|---|---|---|---|
| **The Ossuarch** (`ossumancer`) | **Marrow**, 60, refills about 2.2 a second; bone spells spend it, melee spends poise | Ossuary · Carapace · Count | **The Mantle of shards:** pulled from the ground; each turns aside a little of a blow (up to 45%); bone spells weaken as it empties. **The count:** notches cut by the Bone Blade, closing at nine | Ossuary and Carapace built; Count tree 2 of 12 (the Bone Blade and Tally) |
| **The Hollow Mystic** (`animancer`) | **Essence**, 60, about 2.7 a second | Mirror · Soul · Thread | **The choir of wisps is fuel:** every cast burns a wisp (two for dear spells) but is never refused. A full choir strengthens and widens spells, a thin one weakens them. Veil turns blows onto Essence | built |
| **The Shrine Keeper** (`miasmancer`) | **Miasma**, 62, slow refill; faster standing in her own cloud; Inhale draws it back from clouds and the sick | Miasma · Distortion · Death | **Omens:** up to three, gathered by her strikes and spent by Reap and Execute. Her haze confuses; her cloud sickens and hides her | built |
| **The Empty Hand** (`monk`) | **The hourglass:** Radiance pours amber sand into one bulb, Absence black into the other. The fuller a bulb, the weaker its tree (a full bulb casts at a tenth); never refused; sand runs back when he stops casting | Radiance · Absence · Destroyer | **Day and night:** Radiance is stronger by day, Absence by night, and he can force noon or night for a while. Destroyer skills cost poise. His dead leave glass, dust or nothing | built |
| **The Red Penitent** (`hemomancer`) | **Vitae** (skills cost life) | Mortification · Blood · Penance | waiting on art and skill code | data only |

**Rules every calling shares:**
- **No cooldowns.**
- Three trees, with rows opening at levels 1, 6, 12, 18, 24 and 30.
- **Skill levels:**
  - at most 20 points bought in a skill;
  - items and one card can add levels;
  - each level past the first counts 60%, and the cost rises 5% a level.
- Synergies add a share of the feeding skill's points.
- Everyone starts with 40 gold, one skill point, one Hollow Token (which unmakes skills, attributes and Arcana), and
  draughts in a four-slot belt.

## 2. Attributes and the hero's numbers

There are three attributes: Vitality, Essence and Constitution. Each level gives 5 attribute points, 1 skill point, 1
Minor point for the body board, and full life and resource.

| Number | Driven by | At level 1 |
|---|---|---|
| Life | 28 + 3 a Vitality + 3 a level, and items | about 76 |
| Poise | 28 + 1.4 a Constitution, a little Vitality, a quarter of armour | about 52, refilling 9 a second |
| Armour | half Constitution plus gear; physical damage × 100 / (100 + armour) | |
| Skill damage | Essence, items, the board | |
| Melee damage | Constitution, the board | |
| Walk speed | about 3.1 yards a second; faster-walk soft-capped at 25%, hard at 40% | |
| Resistances | capped at 75% | |

**Experience:** the next level costs 60 × L^1.9 + 40 × L, steeper past 30 and 85, up to level 99. Creatures more than
five levels below the pilgrim give less.

## 3. Poise

Poise is the body refusing to fall: the stagger meter.

**The pilgrim's poise.**
- **What spends it:**
  - the string's overhead blow (4);
  - the held heavy (12 to 24);
  - the roll (34);
  - poise-cost skills;
  - the Bone Blade's tiers.
- Walking drains a little, never more than the refill.
- Every spend and every hit pauses the refill for a second.
- **A creature's blow** does poise damage of about 1.8 times its damage, more for heavy blows (any blow over 12% of
  life is heavy).
- **Poise break:**
  - a 0.9-second stagger;
  - half the poise refills in a third of a second;
  - 2.5 seconds of grace;
  - **no rolling until poise is full** ("Too shaken to roll").
- **The roll:** needs 16 poise and costs 34. It covers about three yards in a third of a second, with 0.3 seconds
  untouchable.

**A creature's poise.**
- **Its pool** is its life × its kind's poise factor × 3; bosses and uniques have more.
- **Blows** do poise damage of 1.2 times their damage, 2.5 times for heavy blows.
- **When it breaks,** the creature reels: under half a second, shorter for uniques and bosses. Then it has a slowed
  after-reel, then grace, so there is no stun-lock (Path of Exile 2's rule).
- **A reeling creature** takes 25% more. The first melee blow on it is a **finisher**: double damage and more, once a
  reel, returning resource and poise to the pilgrim.

## 4. Melee

**The string** (every calling):
- a quick cut (×1.0), a return cut (×1.1), then an overhead finisher (×1.6) that lunges, costs 4 poise, counts as
  heavy and staggers;
- a third of each blow splashes on what stands close;
- the string resets after 0.8 seconds idle;
- the Mystic's wand shoots a bolt instead.

**The held heavy** (a setting, on by default):
- hold past a fifth of a second to wind up, full at three quarters of a second, creeping at a third speed;
- release to lunge and strike for ×1.25 to ×2.0 damage and ×2 to ×3.5 poise damage, costing 12 to 24 poise.

**Charged techniques**, in the manner of Secret of Mana (Derek, 2026-10-05). **Built for one skill, the Ossuarch's
Bone Blade** (`Test Bone Blade.bat`):
- **Press:** tier 1, a lunging thrust (×1.0, 5 poise, 1 notch).
- **Hold 0.22 seconds:** tier 2, a wide cleave (×1.45, 12 poise, 2 notches).
- **Hold 0.55 seconds:** tier 3, a split down the ground (×2.1, 21 poise, 3 notches; it stuns ordinary creatures for
  half a second).
- A tier only advances with enough poise. A full charge releases itself.
- **The ninth notch closes the count:** with Tally, that blow lands double.
- **With the setting "Charge melee techniques" off,** holding strikes, and the strokes climb the tiers.

**Auto-attack** is off by default.

**Knockback:** blows push, heavy blows and finishers more, and kills twice as far. Bosses and champions resist it.

## 5. The lantern, the light and the dark

**The lantern** floats at head height and follows (`entities/lantern_unit.gd`): it trails on the walk and loops at
the pilgrim's side when still. Its shape is the calling's own:
- a gold lantern for the Mystic, iron for the Penitent;
- a caged skull pouring bone-white vapour for the Ossuarch;
- a paper lantern for the Keeper;
- a black-flame paper lantern for the Empty Hand, hidden by day.

**The light radius** is about 4.3 yards by day, 5.3 at night and 4.65 underground, widened by Bright and Blazing
items.
- At night and underground, ranged creatures close in rather than shoot from beyond the light.
- Gasps and Wick-Saints answer to it.

**Wicks on items** (the strongest carried one decides, and tints the light):
- **Ghostlight:** creatures in the light may flee.
- **Hearth:** life a second.
- **Pale Flame:** slows creatures in the light.
- **Green Taper:** resource a second.
- **Violet:** resource on a kill in the light.

**The lantern's mood:**
- it breathes and gutters;
- it dims and pulses as life falls;
- it flares when something wakes close;
- it draws in during a boss fight.

**The dim wick** (L) is a choice: less light, more damage taken, creatures notice you later, and more magic find and
gold.

**The dark:** the night outdoors is 0.52 at its deepest (2026-10-08) and 0.32 by day; underground is 0.84.

**Day and night:** a twelve-minute day. Creatures walk a little faster at dusk and night. Some kinds hit harder at
certain hours, outdoors only, never more than 15% harder (2026-10-08). Gasps and Wick-Saints come out only at dusk
and night.

**Shadows and eyes:**
- the pilgrim's silhouette is cast by the lantern, the nearest flames and the sun;
- creatures cast wedges;
- in the dark, creatures facing you beyond the light show their eyes, brighter when hunting.

**Souls:** every death gives up a soul that flies into the lantern, which flares. For now it is only a light; souls
set into the lantern are ruled (below) and not built.

## 6. Death and the way back

**When the pilgrim falls:**
- the gold carried stays where they fell, as a remnant;
- the lantern keeps a little more (up to three times). Each kept life costs a little light, magic find and gold
  until the remnant is taken back;
- creatures lose the scent;
- the death screen names the killer.

**Waking:** three seconds later, at the last lantern-stone touched, whole. If that stone is in the same zone, the
zone stays as it was; otherwise it is entered fresh. Nothing else is lost.

**The remnant:** walking back to it returns the gold, clears the kept count and mends a quarter of life.

**Lantern-stones** are passed and remembered. Touching one:
- restores everything;
- refills the calling;
- sets the waking place and saves;
- offers free travel to every remembered stone;
- lets Majors be turned free.

**Waystones** (13 in Act I) learn your step and carry you between the act's kindled stones.

## 7. Creatures

**Ranks:**
- normal;
- champion (×2.5 life, ×1.4 damage);
- unique (named, ×4 life, ×1.7 damage);
- minion;
- boss.

**Deeds** (Diablo II's kind of mark): each champion or unique pack has one, uniques from level 8 two, bosses none.
The nine deeds:
- Ash-Trailing, Grave-Called, Thirsting;
- Nail-Fisted (crushing poise), Thorned, Candle-Eater (shrinks the lantern);
- Warded, Bursting, Unquiet (surfaces beside you).

**Fewer strong ones** (2026-10-08):
- only one champion pack in three stays a champion pack;
- a zone keeps one named unique: a vow's target if there is one, else the first;
- no creature is more than two levels above the pilgrim;
- creatures hit at 0.6 of their old strength.

**How they think:**
- creatures wake by sight at 7.5 yards (less for a new pilgrim, less with the dim wick), and wake their packs;
- they take turns to attack in a rhythm (chase, wind-up, strike, recover, gap) and give up past 26 yards;
- **fourteen behaviours:**
  - the Husks surge when three gather;
  - Tithe-Hands flank and flee when hurt;
  - Weepers keep their distance;
  - Gasps drift through walls;
  - Bloats burst;
  - Wardens block from the front;
  - Pyre-Saints burn;
  - Bellwethers charge;
  - Vein-Borers burrow;
  - Wick-Saints swoop;
  - Duelists parry;
  - the Stalker Crone stalks;
  - and the bosses and Heralds have their own.
- **Bosses** wait at home and never heal.

**Far creatures sleep** beyond 30 yards (Diablo II's rule). Every zone entry rebuilds the creatures, except felled
bosses and fulfilled vows.

**Altars and Heralds:** coming close to a god's altar wakes its Herald, once per god.

## 8. Things to find and carry

**Items:**
- 19 bases, some for one calling only (claws for the Keeper, wraps and staves for the Empty Hand);
- ten slots: head, neck, weapon, body, off hand, hands, two rings, waist, feet;
- a bag of 10 × 4 and a belt of four draught slots;
- requirements are level and calling only.

**Rarities:** normal, magic, rare and unique (six named uniques). There are no sets, sockets, runes or charms.

**Drops are scarce:**
- an ordinary creature drops something one time in five;
- champions often, uniques nearly always, bosses always;
- half of all magic and rare rolls fall back to normal, and rares often roll down.

**Gold** is picked up by walking over it.

**The Reliquary Chest:** a shared stash of 48, for every pilgrim on the machine.

**Trading:**
- the vendor buys anything and sells draughts;
- the smith sells a few made pieces, restocked as the pilgrim grows.

**Shrines:** Echoes (skill damage), Stone (armour), Wisp (the Mystic's choir), Refilling, and Hidden (an Arcana
point once a zone).

**Draughts** heal life and resource over time.

## 9. The Reading and the body board

**The Reading** is character creation: a tarot reading by the Mysterious Stranger.
- **Nine steps:** god, face, card (upright or reversed), fear, seeking, road, question, price, reading.
- Each choice nudges the pilgrim by at most 1% (Derek's cap), and the result is their fate for the whole walk.

**The body board** (A) is one graph per calling:
- **Minor points:** one a level from 2.
- **Major Arcana:** from the first kill of each boss (+2), hidden shrines (+1 each) and one vow.
- Majors lie upright or reversed and are turned free at a lantern-stone. The Void opens after ten Majors.
- A knot can be lifted for gold.
- The Mystic's, Keeper's and Empty Hand's cards all work; the Ossuarch's and Penitent's do not yet.

## 10. Vows

Six Act I vows are in the game, kept in the journal (J):
- the Carrion Warden;
- the Sighing Lantern;
- the Widow's Daughter;
- the Reader's Ink;
- the Tallow-Mother;
- the Ossuary Matron.

They are given by Warden-Crone Esk at the camp. **Open for Derek:** the lore is now world-building only ("we're not
writing story or quests"). Do the vows stay as gameplay?

## 11. Ruled by Derek, not built yet

- **Charged melee for every calling:**
  - three tiers, a fourth from some uniques;
  - skills charged, plain or held;
  - stances (weaker auras, upkept in poise);
  - rites borne by minions;
  - one kept curse.

  Only the Bone Blade is built.
- **The lantern bearer:** each calling's small companion carries the lantern (the Ossuarch's is the Candle-Hand).
- **Companions with real roles** (Lantern-Bearer, Porter, Reader, Warden, Mender): one at a time, hired at camp. None
  exist; only the callings' summons do.
- **Souls in the lantern** in place of gems, a materials tab for small things that stack, and one big main stash.
- **Death:** something dropped where you fell, walked back for, like Diablo II and Dark Souls. Only gold is dropped
  now, and its place is unmarked.
- **Difficulties:**
  - Normal, Nightmare and Hell, each a little darker;
  - the old numbers sit in `data/world.json`, and nothing reads them.
- **Eyes that tell creatures apart** in the dark, and eyeless jump scares. Eyes show now, but are the same for every
  kind.

## 12. Gaps found in the code (2026-10-08)

- **The Herald's Major Arcanum is announced and never given.**
- **The Silent One's dimming probably does nothing:** it dims a light the dark layer no longer reads.
- **Most of the Ossuarch's Count tree is unbuilt:**
  - points can go into its nine missing skills;
  - the T key is bound to Open Count, which does nothing;
  - Tally's cleave and Great Cleave are not wired.
- **The remnant is invisible.** A second death overwrites it, and Continue forgets it.
- **Board content not wired:**
  - the Ossuarch's and Penitent's cards;
  - the shard, sick, evade and bleed knots.
- **Mystic-only effects on general items:** the wisp-regrowth affix and the Wisp shrine help no other calling.
- ~~A banned word in creature names~~ (fixed 2026-10-08): the zone exports' unique names built on "Rot" and "Hush"
  now read "Gall-" and "Still-" when a creature is set up (`entities/monster.gd` `clean_name`).
- **Fixed 2026-10-08:** the Tallow-Mother vow could not be finished in half the Bog-Witch's Shack seeds, because the
  one-unique rule demoted Hesk. The vow's target now keeps the zone's unique.
