<!-- Orders · updated 2026-09-30 · 1623 words · source page #penitent -->
# The Red Penitent (the Hemomancer)

*Class doc. Code id `hemomancer`. Updated 2026-09-29 (v78): the look section now records the current PixelLab sprite and the redo brief. Wiki hub: `wiki/00-start-here.md`.*

*Patched 2026-10-09 to the bible (`mythology/`): the Maiden has two faces, the Maiden and the Mother; no town; §2 is the
telling of the nameless chapter whose wound hatched (`mythology/05-the-last-breath.md`), never one man's story.*

> "Blood given is not blood taken. My brothers had that right since the first cup. They only forgot to tell her what it
> was for."

## 1. The god and the processions

- **The god.** He serves **Nol-Shogthuth**, the god's **Flesh**, which keeps growing without a mind.

- The penitents call her **the Bleeding Maiden**. Never "Weeping": the user renamed her.

- Her other names: Mother of the Wheel, Our Lady of the Open Side, the Red Mother, She Who Turns, and the Glutton (her enemies' name).

- Her two faces: the Maiden (the opening that gives; his face) and the Mother (the growing).

- **The faith.** The **penitent processions**: hooded penitents walking by day, and crypt rites by night where the saints come down.

- The feel is a Holy Week procession blended with Vodou.

- The faith is devout and grieving, and the darkness is his own. No real saint, lwa or sacrament appears.

- **Other names for him:** **El Penitente Rojo** (the Red Penitent), **Frè Plè** (Brother Wound), and "the Tall Red Hat" of the nursery rhyme.

## 2. Where he comes from (the chapter whose wound hatched)

- **The chapter.** A chapter of the processions lived down both lips of a great wound in the Hide, as long as a
  morning's walk, that never closed. Its gutters ran red. Once a year its hoods poured the measured cup into the wound
  and said the Words over it. Their belief: *blood given is not blood taken*. Nobody now knows the chapter's name.

- **The bloodletter.** Every procession has one, who opens the penitents' welts. The rule above all: the one who opens
  others never opens himself.

- **The year the wound would not take the blood.** It crusted over from end to end, warm underfoot. The hoods broke the
  crust with picks to pour the cup, and it closed over the blood again before the cup was empty. In the night after the
  fast-day the crust split along its whole length, and the wound **hatched**.

- **What came out** walked in the hoods' robes, which had hung on their pegs in the crypt: the shapes of children with
  nothing behind their eyes, in the order of the procession. At the front walked something tall, sewn together out of
  more than one thing, carrying the Maiden from the niche on its back, and the Maiden had a face now. The Rule in the
  crypt gained new clauses in a hand that leans the other way; the last of them says *She hears.* The procession went
  out, and has never come home.

- **What the penitents read in it.** The Maiden is a mother with no head: she makes whatever she is told to make. The
  chapter said the Words over every cup by rote and never once told her what the blood was for, and she made of it what
  a thing with no mind makes. So a Red Penitent breaks the bloodletter's rule: he opens himself, draws her door in his
  own blood, calls her down into himself, and tells her what to make. She takes his blood, his hands and his voice, and
  leaves him his mind. The penitents say the sewn thing at the front of that procession was the first **Flesh Golem**,
  and every Red Penitent's golem is sewn the same way. When his procession runs thin, he scourges himself, and small
  hooded things crawl out of the welts.

## 3. How he plays

- **Resource orb: Vitae**, the living blood (dark red). **Every skill costs life, and Vitae pays that cost.** The fuller his Vitae, the bigger the share it covers and the faster he heals. No cost can take him below 1 life.

- **Blood falls.** Blood spells are flung, sprayed or poured. They arc, splash and pool, and never fly straight. Bleeding enemies leave pools; standing in blood heals him and refills Vitae. (No glow on his blood: `NOGLOW`.)

- **The procession:** the little hoods, blood thralls and the Sewn Martyr are made from corpses, tumours and his own body. **Penitent Womb** bleeds little hoods out of him when no flesh is near. **The Flesh panel (V)** holds the mutations, the grafts and the golem's orders.

- **Mutations:** two slots, and Flesh Mastery opens a third. **Scar-Plates** (code id `chitin`) are every welt the scourge raised, hardened into ridged scar.

## 4. The trees (redone 2026-09-30 with the user; the data's source is `tools/skill_trees.py`)

**Shown as THE RED PENITENT** (code id stays `hemomancer`; "El Penitente Rojo" in the lore). The user: no brood, no science or animal words, mutations are **penances**, no "Friday" (the world has no Friday: the Fall came on a **fast-day**), no Second/Sacred Heart, "Her Door" and "Suckling Clots" were bad names, and **every skill does one thing no other does**. Play: a blood-mage bruiser who hurts himself for power, with a light summoner option.

**Mortification** (tab 0, the penances he wears): The Open Side (his blows drink life) · Cilice (a spiked iron band: armour) · Taken Into the Side (the active engulf) · Crown of Thorns (thorns lash out and hold) · Communion (eat a little hood for a stacking blessing) · Stigmata (heal in blood) · The Cross He Carries (a burden that buds little hoods) · Sackcloth and Ashes (shed skin: cleanse, mend, a decoy) · **The Vigil** (new: below half life every penance works half again as hard) · Mortification Mastery (level 30: the third penance)

**Blood** (tab 1, blood magic and blood made to walk): Boiling Blood (bleeds harder; the dead leave pools) · Sin Purge (hold: a stream) · Hemorrhage (bursts a share of current life) · Penitent Womb (the little hoods) · Grasping Veins (veins to several) · Split Scab (a corpse bursts) · Bleeding Saint (a saint rides the blood: ranged, and a speed blessing) · Tide of the Maiden (a wave that grows on the bleeding) · The Sewn Martyr (the giant) · **The Almoners** (little hooded alms-collectors crawl to wounds with their bowls and bring the blood back to him) · Hemomancy Mastery (level 30)

**Penances** (tab 2, melee and self-buffs; named Iron Maiden for a day, the user preferred Penances; every blow in close costs footing): Scourge (an arc; each lash opens a welt that pays Vitae) · **The Discipline** (a five-lash flurry on one; fervour stacks) · Red Fervour (speed and knitting) · **Nails** (a heavy blow that pins the struck; pinned take more) · **The Wheel** (a sweep all round that drags in and bleeds) · The Red Tithe (pay life: harder blows that give some back) · **Iron Maiden** (close the iron: take far less, blows turned back, walk slow, cannot strike) · **Via Crucis** (fourteen stations: kills walk the road, each station heavier blows and knitting; a new place begins it again) · **The Dread Procession** (walking as the procession walked by night: enemies flee in terror; the terrified take half again; no hood imagery) · Penance Mastery (level 30)

Cut: Blessed Growth, Procession, Vestments, Last Rites, Wayside Shrine, Confraternity, Mother of the Wheel (the name lives on in The Wheel's lore), Sacred Heart. Body-board cards that named cut skills still need an audit when he is ported.

## 5. His body board

**The Red Nave: the blood of the Hemomancer.** Cards over the heart; roads along the arteries and veins, in pairs, to the head, the wrists and the feet. Notables: the Red Tithe, Open Veins, the Wrist Offered, the Fork of the River and others.

## 6. The processions' enemies

- **The Pale Order** (the Ossuarch's order): the oldest feud, over who owns the dead (the flesh or the frame).

- **The Hollow Mystic's circles** (the Veiled Crone's Mirror): they keep souls in glass; the processions keep their dead
  in their own wall. Each calls the other's dead stolen.

- **The Shrine Keepers:** they come to the dying to still the last breath, the fullest of all, and keep it. The
  processions call them thieves, and the keepers do not argue.

- **The Silence's few:** it unmakes flesh and leaves the Mother nothing to take back.

- **The chapters that keep captives:** they feed the Maiden captives' blood. They and the other processions disown him,
  for he tells the Mother what to make.

## 7. Look

**Standing decisions (the user's):** a Black man of African descent, drawn with dignity; **skin reads dark brown** (no red light washing it out); **penitent, not tribal**; **not too brutal in the wrong way: no head cage**; hands free (the scourge is a separate weapon layer, later); the tall capirote-like helm is only an optional helmet item.

**History of the sprite**
- r6 (v0.52–v0.60): ported from the user's Midjourney videos of the white-robed penitent. Very long dreadlocks, lantern in hand, red-lit skin. The user found it tribal, the hair too long, the skin reading wrong.
- r8 (v61–v78): PixelLab state "Penitent" (`2c84fefa-ae41-4ca6-8ba8-f8507eff72a9`), bandages, a few spikes, a chain; no lantern (it floats in code). **The user (2026-09-29): "looks awful… like a mummy. Not brutal or anything. We will totally redo it later."**

**Redo brief (for after the PixelLab reset on Oct 28, or from a user reference)**
- **A flagellant, not a wrapped monk:** a bare, scarred back and shoulders with lash welts (Scar-Plates' first stage); an iron band or a crown of thorns worked into the brow instead of a cage; chains wound round the forearms; a heavy blood-dark sash or kilt; **bandages only where there are wounds**.
- **Every piece of gear is an act of penance** (the Blasphemous method, without its imagery: no capirote copy). Research one real penitential tradition properly: flagellant confraternities, Good Friday self-mortification, Goya/Ribera chiaroscuro.
- **Materials:** forged iron, rope, church cloth. No wraps (mummy), no beads or feathers (tribal).
- **Silhouette:** the heaviest body in the game, a wide inverted triangle, readable from its top shape at isometric scale.
- **Colour:** muted base with one bold mass of fresh wet crimson (blood on cloth and wounds); warm rim light carrying the dark brown skin.
- **Animation set:** walk, idle, attack, attack2, cast (the bloodletting: bound arm raised, head thrown back), hit, death, dodge; packed with palclean and clip (see `wiki/07-art-pipelines.md`).

## 8. Open

- **The Flesh herald** (its name is open) offers to take the scourge. Is that a real choice?

- **Does the flesh want a head?** An Act V ending where it grows one, with him as its thought.
