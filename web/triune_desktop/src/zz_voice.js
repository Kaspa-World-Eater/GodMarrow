// zz_voice.js — The Voice of the World: every place in the Triune's corpse gets a voice.
//   * zone-entry lines: a quieter italic line beneath the zone banner, the first time you set foot in a zone (saved)
//   * ambient whispers: every 60-120 s while exploring; never in a boss fight, never with a panel open, never twice running
//   * names and inscriptions: generic lantern names are replaced; every lantern, waystone and landmark has an inscription
//     (lanterns and waystones when touched; landmarks the first time you pass close by)
//   * town barks: 4-8 lines per role (vendor, healer, smith, stash, quest-giver, the Stranger) for each of the five towns;
//     all NPC speech (theirs and ours) is shown as a wrapped italic line with the speaker's name, over any open panel
//   * death lines on the death screen, and return lines when a lantern gives you back
//   * item lore: one italic line on unique and rare item tooltips, keyed by base (and by name for the named uniques)
// Only wraps: ZONE_GEN entries, enterZone, interact, say, die, respawn, update, drawHud, drawTooltip, txt, itemLines,
// save, applySave, newCharacter. No base file is touched. window.__voice exposes the tables and test hooks.
{
  if (typeof ZONE_GEN === 'object' && typeof enterZone === 'function') {
    const vErr = e => { try { reportError(e); } catch (x) { } };

    // =========================================================== zones: entry line (e) and whispers (w)
    const ZV = {
      // ------------------------------------------------------- ACT I: the Hide
      moor: { e: "Ash to the ankle, still warm. The god's cheek, where it struck first.",
        w: ["Nothing sings over the Moor. Nothing ever has. The wind only practises.",
          "The pilgrims fell mid-hymn. Some are shapes under the ash. Some are standing up.",
          "Black glass underfoot. A Husk bled here, and the ash drank it and hardened.",
          "The ash is warm because the flesh beneath is still cooling. A thousand years, cooling.",
          "Chalk on the milestones. Villa Llaga's penitents renew it yearly. It lasts eleven months."] },
      crypt: { e: "Dur-nang, the inside grave. The walls are ribs, dry as old ivory.",
        w: ["The flagstones lift under your boots, slow and even. Something below is sleeping.",
          "Every niche held a mother's bones once. The Great Standing emptied them.",
          "The votive candles never gutter. The ribs keep the Last Breath off them.",
          "Tally-marks in hundreds and eights. Nobody living knows what was being counted.",
          "Somewhere in the dark a Marrow Duelist is still practising his forms, for no one."] },
      fen: { e: "The god's lymph, standing knee-deep. It beads on your skin and rolls away.",
        w: ["Every reed bends the same way, whatever the wind. Toward something.",
          "Fire burns green over the water. The air is thick with breath never exhaled.",
          "Iron and old incense: the drowned chapels, and what the dredgers left in them.",
          "A boat passes and leaves no wake. Or nothing passes, and the water parts anyway.",
          "The boatmen bow toward the Well-Shrine as they pass. You find you have bowed too."] },
      barrow: { e: "The Tithed's own dead, mounded over the skin like knots in a coverlet.",
        w: ["Every barrow-lid is dished inward, as if the ground breathed out once and never in.",
          "Cart ruts in the sunken lanes. The Ossuary Lords came here first, for bones.",
          "The dead here rise wrong. Pauldrons on backwards. Heads on, but turned.",
          "Walk Widow's Lane counter-sunwise and a stranger comes to your door. One often does.",
          "The Empty Ninth stands open. The villagers say it is waiting. They do not say for whom."] },
      cata1: { e: "The pilgrim ossuary. Every wall is a sermon laid in bone.",
        w: ["A wall of femurs, then a wall of jaws, then skull-caps stacked cup-down like tiles.",
          "Chalk, old paper, and something like a fresh haircut. The air of the kept dead.",
          "The Wardens salute each other in the corridors. They do not salute you.",
          "Touch one skull-cap on the Cup Wall and ten thousand ring, faintly, like glasses.",
          "The book on the lectern has one page turned. The hand is yours."] },
      cata2: { e: "Below the kept bone. Here the walls forget what patterns were for.",
        w: ["The monks stopped digging when they struck something warm. It is still warm.",
          "Count the skulls in the Miscount. Count again. One more. Some say the one is you.",
          "A pick set in the end wall, its shaft snapped. Nobody has pulled it free.",
          "The ceiling sagged into a face. You cannot say whose. You do not want to.",
          "Old Hundred-Fingers came down here once. He came back with a look he will not explain."] },
      sighing_ridge: { e: "The Moor lifts into a ridge, and the wind across it sounds like breath.",
        w: ["The Sighing Lantern hums through its cracked bell. The ash pools beneath it, listening.",
          "Three colonnade stumps, always warm. A foreman and two daughters, found holding hands.",
          "A line of lanterns along the crest. The Tithed keep them lit so no one walks blind.",
          "The wind lifts ash off the ridge in long grey scarves. Below, it settles on someone."] },
      ash_shore: { e: "Where the ash meets a grey sea that does not move like water.",
        w: ["The Broken Kneeler: a prayer-bench halved by something that fell the night the god died.",
          "The tide brings in nothing. The tide takes out footprints. Yours are already going.",
          "Black glass along the waterline, sharp as a lie. Husks bled here in rows.",
          "Some say the sea is the god's eye, filmed over, still looking up."] },
      burnt_heath: { e: "Heather burned to wire. The Pyre-Saints walked here, and walk still.",
        w: ["The ash-circle is where a Pyre-Saint knelt to burn. The centre is still warm.",
          "Cinders lift when you pass and follow a little way, like mourners who lost the coffin.",
          "Someone chalked a milestone, then cracked it. Here, not knowing the distance is a mercy.",
          "The heath burned for a year after the god died. Nobody lit it."] },
      fern_gully: { e: "The ground folds into a gully of ferns, wet and green and wrong.",
        w: ["The ferns uncurl as you pass, then curl again, slowly, like fingers remembering.",
          "Berries by the ford, red as a cut. The Berry-Warden watches who picks them.",
          "Water runs here, real water. It tastes of iron anyway.",
          "A ring of ferns grows in a perfect circle. Nothing stands in it for long."] },
      pilgrim_road: { e: "The old road down. Glass-paved in patches, a milestone every four hundred paces.",
        w: ["Sister Un's reliquary is gone. The milestone still waits for it.",
          "Pilgrims walked this road singing. Their song ends here, at no particular place.",
          "A kneeling post, rubbed smooth by foreheads. Kneel, and yours fits the hollow.",
          "Lantern-light off the black glass is the surest road on the Hide. Follow it down.",
          "Down. The road always goes down, even where it seems to climb."] },
      drowned_village: { e: "A village stood here, and still stands, a little under the water.",
        w: ["Doors ajar under the water. Someone left in a hurry and meant to come back.",
          "A loom sagging on its frame, the last shroud half-woven. The shuttle is still warm.",
          "The Reed That Points Home turns its head toward the village you were born in.",
          "Bells ring under the square at dusk. The belfry fell a thousand years ago."] },
      sunken_bog: { e: "The fen gives up pretending to be water. Bog, to the thigh.",
        w: ["The Kneeling Arch leans forty degrees and never falls. Boatmen sleep tied to it.",
          "The Iron Hook is still in the mud. The Shrine Keepers hang a paper doll on it each Ōharae.",
          "A monk drowned here in his sash. The sash is still knotted. The monk is not.",
          "The mud clutches and lets go, clutches and lets go. It is patient with you."] },
      fallen_monastery: { e: "Half a roof, half a sky. The brothers prayed until the ceiling answered.",
        w: ["The tallies on the Counting Wall stop mid-hundred. The counter was interrupted.",
          "The pews face an altar that faces away. The brothers turned it the night of the fall.",
          "Rain falls into the half-sky nave and pools in the font. Nobody drinks it.",
          "That is not chanting. That is the wind in the broken stalls, pretending."] },
      wolf_den_chapel: { e: "A chapel the hungry took. They left the pews and ate the rest.",
        w: ["The old kill-floor, dark with a century of meals. Bone-scraps in the altar rail.",
          "Something howled here at the moment the god died. The walls still hold the note.",
          "A pew split by a body thrown hard. The hungry were not the first to fight here.",
          "The hymn-board still lists the last hymns. The numbers match nothing now."] },
      plague_hospice: { e: "The sisters kept the sick here. Then the sickness kept the sisters.",
        w: ["A row of cots, blankets drawn up. The shapes beneath them are patient.",
          "In her alcove the last sister wrote names on the wall until the wall was full.",
          "Vinegar and tallow and old wounds. The hospice still smells of mercy attempted.",
          "Something coughs, three rooms away. Then, closer, something coughs back."] },
      well_shaft: { e: "Down the well, rung by rung, into the dark the village drank from.",
        w: ["The first rung is iron. The deeper rungs are bone, and warmer.",
          "Water drips upward here. You feel it on your chin.",
          "The village lowered buckets for a thousand years. They came up full of something.",
          "The shaft coils like a throat. Walk quietly. It may swallow."] },
      smugglers_hold: { e: "Salt, rope, false floors. Contraband bone, bound for the Ossuary Lords.",
        w: ["The ledger lists bones by weight and saint. Most of the saints are made up.",
          "Salt heaped to the rafters. It kept the goods from spoiling. Mostly.",
          "A smuggler's knife pins a note to the table. The ink has run away.",
          "They sold mothers to lords, a rib at a time. The hold remembers every price."] },
      bogwitch_shack: { e: "A crooked shack on a hump of bog. Chimney smoke, and no fire.",
        w: ["Charms hang from the eaves: knuckle-bones, teeth, a child's shoe. They turn without wind.",
          "The doorstone is worn by knees, not feet. People came here to beg.",
          "Her kettle still simmers. Do not ask what she was rendering.",
          "She traded cures for years off a life. Her ledger is written on skin."] },
      tree_hollow: { e: "Inside a trunk as wide as a chapel. The bark closed over something here.",
        w: ["The walls of the hollow are ribbed like a wrist, and they pulse, faintly.",
          "Spores drift toward your warmth. They mean nothing by it. They only want warm.",
          "A candle burns inside a knot. It has not run down in eight hundred years.",
          "Scratch the bark and a clear cold thing runs out. Almost water."] },
      hunter_cache: { e: "A hunter's cache in the heather. He meant to come back for it.",
        w: ["Snares still set, rusted shut around nothing. What he hunted, he did not catch.",
          "Dried meat on the rack, black as tar. Whose meat, the cache does not say.",
          "A bow unstrung and leaning, the way a man leaves one when he means to return.",
          "His boots are here. So are his tracks, leading away barefoot."] },
      fallen_watchtower: { e: "The tower that watched the Barrows fell. Its bell did not.",
        w: ["The Buried Bell rings under the turf when the wind is right. No one strikes it.",
          "The watchmen saw the god fall. The tower fell after, out of grief, the stones say.",
          "Arrow-slits look out on mounds. What they watched for came up from below.",
          "A watchman's horn in the rubble. Blow it, and the barrows go very quiet."] },
      broken_bridge: { e: "The bridge fell in the middle. Both halves still reach for each other.",
        w: ["The river camp's fire went out generations ago. The ash is still laid for morning.",
          "The water below runs clear and slow and thick. It is not a river. It is a vein.",
          "Those who waited here for the ferry are waiting still. Look at the bank.",
          "Names carved on the parapet. The last name is only half cut."] },
      hollow_wood: { e: "The god's veins stood up out of the Hide and became a forest.",
        w: ["Teal caps for the young, ghost-blue for the tall, amber where something lies dead.",
          "A ribcage grown through with bark, a pilgrim's badge still in one rib. Warm.",
          "The Blind Face was about to speak, and then the bark grew over its eyes.",
          "The fireflies are not fireflies. They are spores, and they drift toward your warmth.",
          "Every tenth trunk holds something the god was carrying when it fell."] },
      root_deep: { e: "Ne-no-kuni, the land under the Hide. It breathes in, and out.",
        w: ["Every four heartbeats the lantern-shadows shift. The corridor is breathing.",
          "Your echo comes back before you speak. Do not answer it.",
          "Drink from the Reversed Spring and it takes a memory. It does not say which.",
          "A second heartbeat under your own, slower. Stand still and they begin to match.",
          "The oni walk down this road with their sacks. Nothing walks up it."] },

      // ------------------------------------------------------- ACT II: the Bleached Barrens of Ossa
      a2_town: { e: "A fortress in a hollow leg-bone. The marrow was scraped out for chapels.",
        w: ["The Femur's Heart burns where the marrow was thickest. The knights kneel to it in shifts.",
          "Bone-dust sifts from the vault all day. The sweepers never finish. They are not meant to.",
          "Nine orders, one femur. They share the bone and nothing else.",
          "The rib-arches outside the gate were counted once. The count was entered as a sin."] },
      a2_dunes: { e: "White dunes of powdered bone, under a sun that does not blink.",
        w: ["The sand is holy bone, ground fine. Every step you take is on someone.",
          "A caravan lies where the dune took it: salt, oxen, drivers, one white shape.",
          "The Keel of Saint Ivel juts from the sand. He sailed the dunes, they say, and sank.",
          "Your edge dulls a little in the dust. Bone wears down iron, given time.",
          "A rib-arch on the horizon, like a wrecked hull. It is the Bearing Mother's."] },
      a2_avenue: { e: "Leagues of calcified bearers, each holding a stone lantern up for no one.",
        w: ["The bearers were pilgrims. They stood to hold the lanterns, and the dust set around them.",
          "One bearer kneels at the halfway mark. He was tired. The procession did not wait.",
          "Some lanterns are lit. Nobody has ever been seen lighting them.",
          "Every face turns toward the Chapter Stair. Yours will too, if you are not careful."] },
      a2_chapter: { e: "A crusader order's house, sunk under the sand with its oaths still sworn.",
        w: ["In the Hall of Oaths the vows are cut in bone. Some are scratched out, by fingernail.",
          "The brothers were buried at prayer. The sand came in and they did not stop.",
          "A reliquary with nine locks. Nine orders. Each kept one key and lost it.",
          "The chapter bell has no clapper. They took it out so the sand would not hear."] },
      a2_ribvalley: { e: "The god's ribs stand in rows, like wrecked hulls between the mesas.",
        w: ["The Great Hull is a rib so large the wind keeps its own weather under it.",
          "Pilgrims camped in the ribs' shade. The ribs are shade still. The pilgrims are chalk.",
          "Put your palm to a rib. It is cool, and very faintly, it gives.",
          "The Keel-Stone marks where the ribs meet the spine, far below the sand."] },
      a2_stormflat: { e: "A dead pan of chalk. When the wind rises, the whole plain rises.",
        w: ["In the chalk storms your lamp shrinks to a coin. Keep walking. Stopping is worse.",
          "The Last Shade: a pillar's shadow, the only one for a day's walk.",
          "Arrows drift in the white wind. The archers here aim where you will be.",
          "Something is buried under the White Pan, and the pan is cracking open to see."] },
      a2_tomb: { e: "The sand came into the tomb and filled it, hall by hall.",
        w: ["Chalk-wyrms swim in the drifts. The sand moves where no wind reaches.",
          "In the Choked Nave the painted saints have sand to their chins.",
          "Whoever lies here was buried twice. Once by the brothers, once by the Barrens.",
          "Your footprints fill behind you, a grain at a time. The tomb is tidying."] },
      a2_banners: { e: "Banners of holy wars no one won. The cloth rotted; the gold thread stands.",
        w: ["The Standard of Nine Wars went out to nine wars. It never came back from the tenth.",
          "The shield-wall held. The men behind it did not. The shields stand in a line, alone.",
          "A herald's post, the proclamation on it bleached blank by the sun.",
          "Metal thread outlasts cloth. Oaths outlast the men. Neither is a comfort."] },
      a2_oasis: { e: "Palm-stumps round a cracked basin, where the god's knee once held water.",
        w: ["The well-house bucket comes up full of dust. The rope is still wet.",
          "Salt crusts the Brine Shrine, where pilgrims wept in their thirst.",
          "The Femur's Knee is a door. It bends a little, when no one is watching.",
          "Palm roots go down to the bone and suck. Nothing comes up. They keep sucking."] },
      a2_marrow: { e: "Inside the great femur. The marrow is a lake, and the lake is warm.",
        w: ["The Marrow-Ghouls gnaw the petrified marrow. Their teeth are worn to the gums.",
          "The walls sweat tallow. The Citadel's candles came from here, once.",
          "A shore of marrow-butter, soft underfoot. Things sleep under the skin of it.",
          "Oss-Vharoth made her children from this. Some of it is still trying."] },
      a2_lair: { e: "The god's hip-socket, a bowl of bone. A Saint kneels where the joint was.",
        w: ["The Saint's prayer is a single word, and he has not finished saying it.",
          "The socket is empty. The leg it held is the Citadel, leagues behind you.",
          "Lances stand in the rim where his knights planted them, and knelt, and calcified.",
          "The Bearing Mother turned in her sleep here once. The bowl remembers the turning."] },
      qvault_2: { e: "The knuckle-seals break. The vault breathes out a thousand years of chalk.",
        w: ["Nine orders sealed this. Three seals were enough. The orders never trusted each other.",
          "The air in here has not been breathed since the Crusade. It tastes of oaths."] },

      // ------------------------------------------------------- ACT III: the Parasitic Fen of Shog-Mire
      a3_town: { e: "Stilt-huts on a mud-brick mound. The tallow kettles never stop steaming.",
        w: ["The stilt-folk tie a knot for every beat of the mud. The ropes are very long.",
          "Tallow in the kettles, rendered from what the delta gives up. Do not ask what.",
          "Children here are taught to hop, never walk. The mud listens to walking.",
          "At night the whole town holds its breath between heartbeats. So will you."] },
      a3_flats: { e: "Red-black mud to the horizon, pulsing slow as a sleeper's heart.",
        w: ["The mud clutches on the beat. Learn the beat. Step between.",
          "Blood channels cut the flats, warm as a bath and running the wrong way.",
          "A kettle-ring drowned here: the stilt-folk's first town. The mud took it on a strong beat.",
          "The Bleeding Maiden's heart is under you, very deep. It has not stopped. It never will."] },
      a3_mangroves: { e: "Black mangroves, weeping. Curdled amber runs down every trunk.",
        w: ["The mangroves weep on the downbeat. You begin to hear it as a hymn.",
          "Where the bark bleeds most, something beneath the roots is feeding.",
          "A stalker's path through the roots, worn smooth. It goes where you are going.",
          "The air is hot and wet and tastes of copper. Breathe it anyway."] },
      a3_fetish: { e: "Grass masks in the branches, feather charms, dripping egg sacs. Someone keeps these.",
        w: ["The masks all face inward, toward the ring. Whatever they watch has not left.",
          "Egg sacs hang like fruit. Do not shake the branches. They are ripe.",
          "The Sac-Mother's hollow is warm, and smells of milk and iron.",
          "The priests carve their masks from bird-bone. There are no birds. Think on that."] },
      a3_delta: { e: "The god's blood braids into a hundred channels, all running for the sea.",
        w: ["The kettle-priests boiled the delta for tallow until the delta boiled them.",
          "At the braided ford the blood is shin-deep and warm as a hand.",
          "Leeches the size of dogs sleep in the shallows, fat and content. Walk softly.",
          "Every channel runs to the sea, and on the beat the sea runs back up them."] },
      a3_amber: { e: "The mire has curdled. Grease the colour of old honey, holding things fast.",
        w: ["Flies in the grease, and moths, and a man, all held mid-motion.",
          "A tree wept here so long it drowned in its own grease.",
          "Your boots stick and come away with a sound like a kiss.",
          "The amber-witches skim the mire and sell its skin as candle-fat."] },
      a3_broodbanks: { e: "Egg-banks along a broad red river. Something here is always hatching.",
        w: ["The sac-weir holds the eggs back from the current. It has begun to fail.",
          "Larvae swim in the hatching shallows, all facing upstream, toward the Ziggurat.",
          "The brood-sows wallow in the warm. They do not mind you. Yet.",
          "A husk floats past, belly swollen. It is not dead. It is carrying leeches."] },
      a3_causeway: { e: "A drowned plaza of step-shrines, and the Ziggurat rising at its end.",
        w: ["One step-shrine drowns each year. The priests count the years by it.",
          "At the Ziggurat's crown, a basin of warm blood. Never full. Never empty.",
          "The mud-brick here was fired by body heat. The whole plaza is faintly warm.",
          "Pilgrims crawled the causeway on their knees. The flagstones are dished where they went."] },
      a3_sumps: { e: "Pits where the brood-priests bred their leeches. The leeches bred themselves after.",
        w: ["In the Suckling Pool a leech the size of a cart sleeps, still attached to something.",
          "The sumps drain toward the Maiden. Everything here drains toward her.",
          "Priests lay in these pits to be bled holy. Their outlines are still in the mud.",
          "A drip. A drip. A drip. Each one warm."] },
      a3_egggal: { e: "Racks of eggs in warm galleries, tended by no one, hatching anyway.",
        w: ["The warm racks hum. Put your ear close and you can hear them growing.",
          "Each egg holds a face against its shell. No two the same face.",
          "A keeper's stool by the racks, and a keeper's shape on it, gone to shell.",
          "The first brood was laid here. The galleries still keep its heat."] },
      a3_ziggurat: { e: "Warm mud-brick, stair upon stair. The Maiden's first children were born inside.",
        w: ["The brood-font never cools. Something in it turns over, now and then.",
          "The priests who built this were fed on what they built. They did not mind.",
          "Every brick was pressed by a palm. Put yours in one. It fits.",
          "Blood runs down the stair from the basin, warm, a thread at a time."] },
      a3_lair: { e: "The Ziggurat's crown. A basin of warm blood, and something bathing in it.",
        w: ["The Brood-Mother is the Maiden's oldest wound, still bleeding children.",
          "Fetish-trees ring the basin. Their masks all face her. None of them are brave.",
          "The blood in the basin is warm as a mouth. It ripples on the heartbeat."] },
      qvault_3: { e: "The pulse-seals give. Warm air, and the smell of something that waited.",
        w: ["The walls beat once when you entered. They have not beaten since.",
          "Whatever was sealed here was sealed by the stilt-folk. They sealed it singing."] },

      // ------------------------------------------------------- ACT IV: the Frigid Heights of An-Vhar
      a4_town: { e: "A hearth under the bells. Its warmth is borrowed, and carefully returned.",
        w: ["The monks breathe in fours. In, hold, out, hold. The fire breathes with them.",
          "A bell-frame with no bell. They still bow to where it hung.",
          "Prayer flags crack in the wind. Each carries a single breath up the mountain.",
          "Here the Last Breath is thin. Here they spend it slowly."] },
      a4_foothills: { e: "The ground lifts toward the Heights. Somewhere above, the wind is ringing.",
        w: ["Chime-bells in the rocks, tuned to one note. The wind strikes it and it never resolves.",
          "A cairn of mantras: every stone carved with a breath someone did not take.",
          "Prayer slips frozen in the ice underfoot. Some still legible. Some are names.",
          "The first chime marks where the Veiled Crone set down her foot, climbing."] },
      a4_glasspass: { e: "Black basalt under glass-ice. You can see the stone, and the dead, beneath.",
        w: ["Frozen in the glass, a pilgrim mid-stride, one hand out for balance. Still falling.",
          "At the saddle the wind decides which side of the mountain you belong to.",
          "Your breath hangs in front of you and does not leave. The pass keeps breaths.",
          "The ice rings when you step on it. Something below rings back."] },
      a4_flags: { e: "Terraces of humming silk. Every flag carries a mantra to the wind.",
        w: ["The silk hums a note too low to hear. You feel it in your teeth.",
          "Nine terraces. The ninth is where the monks went to stop breathing, on purpose.",
          "The flags are tied with hair. Every novice gave a lock, every lock a year.",
          "A mantra to tether a dying soul. The wind reads it aloud, again, again."] },
      a4_spires: { e: "Hollow brass towers burning pale flames. They give warmth and eat nothing.",
        w: ["Stand near a spire and the wind forgets you. It is the only shelter up here.",
          "One spire has gone out. The monks do not speak of it. They step around its shadow.",
          "The flames burn the Last Breath itself. When it is spent, so are they.",
          "Moths come up from the lowlands to die in the spires. They climb for weeks."] },
      a4_cloudshelf: { e: "A shelf of stone above the clouds. Below, a white sea with no floor.",
        w: ["The Bridge of Held Breath: cross it without breathing and it will bear you.",
          "The clouds below rise and fall like a sleeper's chest. They are not clouds.",
          "Something fell into the cloud-sea once. You can still hear it, falling.",
          "Up here the sky is the colour of a closed eye."] },
      a4_windscour: { e: "Ridges scoured to the bone. Nothing stands here that did not kneel.",
        w: ["Where the wind turns, it turns hard and takes what is loose. Hold on to your name.",
          "The wind carved the Cut Stone a grain a year, into a woman at prayer.",
          "Tether-pilgrims roped themselves to the ridges and let the wind take them, slowly.",
          "This wind is the Crone's last breath, still leaving. It will take a long time."] },
      a4_stair: { e: "A thousand steps cut into the cliff. The monks climbed them on their knees.",
        w: ["Every landing has a bell. Each climber rings each bell once, and never again.",
          "Bronze bells on the landing, green with age. Their tongues are wrapped in silk.",
          "From the last landing, everything you have walked looks very small.",
          "Soul-threads trail down the stair from the monastery gate, fine as spider-silk, humming."] },
      a4_breathcaves: { e: "Caves where the mountain breathes. The first breath is still in here.",
        w: ["An organ of ice in the cave's throat. The mountain plays it, very slowly.",
          "In the Held Exhale your lungs will not empty. Do not stay long.",
          "The monks came here to learn to hold one breath for a year.",
          "Frost on the wall in the shape of a mouth, open."] },
      a4_bellhollow: { e: "A hollow of hanging bells. None has rung in a thousand years.",
        w: ["The cracked chime rang once, the night the god died, and split from the grief of it.",
          "Brush a bell and it does not ring. It inhales.",
          "Chime-golems sleep among the bells. The harmony keeps them sleeping. Do not break it.",
          "The bells hang from chains of frozen breath."] },
      a4_monastery: { e: "Timber and bronze clinging to the cliff. The monks still walk, moved by threads.",
        w: ["In the Hall of Soul-Threads, every thread ends in a monk. Every monk is dead.",
          "The prayer-wheels turn themselves. The monks would be proud. The monks cannot be.",
          "In the Mantra Loft the words were chanted so long they soaked into the beams.",
          "The thread-bound monks bow before they strike. Bow back. It costs you nothing."] },
      a4_lair: { e: "The summit. A great bell, never rung, and an Abbot keeping it silent.",
        w: ["The Unrung Bell was cast to sound the god's last breath. They never let it.",
          "Ring it, and the Crone finishes breathing out. The Abbot has waited to be sure.",
          "The last lantern on the mountain. After this the way is only down, into her."] },
      qvault_4: { e: "The silent bells are answered. The vault opens like a held breath let go.",
        w: ["Frost on every surface, and in the frost, the print of a kneeling monk.",
          "No wind in here. It is the first still air on the mountain."] },

      // ------------------------------------------------------- ACT V: the Descent
      a5_town: { e: "A fire at the lip of the sinkhole. The last people keep it burning.",
        w: ["The vigil-fire is fed a little at a time. There is not much left to feed it.",
          "Wind rises out of the sinkhole, warm, smelling of the inside of a body.",
          "They keep vigil for everyone who went down. They read the names each night.",
          "Someone has laid a blanket over the sleepers by the fire. Softly. Twice."] },
      a5_highway: { e: "The god's spinal canal, vaulted and vast. Tallow lanterns mark the way down.",
        w: ["Carvings on the vertebrae: men with chisels, cutting the god while it was cooling.",
          "In the Tallow Nave marrow-candles burn in rows, each one a year of someone's work.",
          "The highway is warm and dry and smells of burnt dust. Of a sickroom.",
          "Side-passages open like mouths. Nerves ran through them, once."] },
      a5_siphon: { e: "Chains and iron buckets, scooping marrow-grease from the god's own bone.",
        w: ["The bucket-chain still turns. No one turns it. The marrow pulls it round.",
          "The sappers worked in shifts for a century. Their shifts have not ended.",
          "The sump at the bottom is full of grease and hands.",
          "A foreman's tally on the wall: buckets, men, days. The men column stops first."] },
      a5_skerries: { e: "A red sea boiling in a cavern the size of a sky.",
        w: ["The scab-skerries sink under your weight, slowly. Keep walking and they hold.",
          "Bone-wrecks drift on the sea, ships of petrified timber crewed by what drowned.",
          "The steam tastes of iron and old coins. Your teeth ache with it.",
          "The walls pulse, far off, like a drum beneath a hill."] },
      a5_valves: { e: "Doors of tendon and cartilage. They open on the heartbeat, and close.",
        w: ["Three cusps on the Tricuspid Heart. What passes them never comes back.",
          "Wait for the valve to open. Then go. It does not wait for you.",
          "The Pulmonic Gate once let breath into her blood. It remembers breath.",
          "Behind every valve the pressure builds. It has been building a long time."] },
      a5_shaft: { e: "A black abyss strung with blue nerves. Somewhere, the god is thinking.",
        w: ["Strike the Hanging Bell and it remembers something that is not yours.",
          "The nerve-bridges hum. The hum sounds almost like your name.",
          "A memory from before the Triune passes you on the bridge. It does not look at you.",
          "Fall here and you fall a long time, and are thought about all the way down."] },
      a5_crucible: { e: "The floor grinds and shudders. Acid basins, and ruins older than the god.",
        w: ["Crowns lie whole at the bottom of the acid pools. The heads are not.",
          "Bone plates grind the ruins between them, patient as teeth on a hard crust.",
          "These halls were built by something that was not men. The doors are the wrong height.",
          "The acid breathes a green light. It smells of stomach, and of old wet stone."] },
      a5_cerebrum: { e: "Inside the skull. Folded halls of ossified thought, and the thoughts still moving.",
        w: ["Crystals of thought grow from the walls. Touch one and you remember falling.",
          "Down is not always down here. The god's last confusion bent the floors.",
          "Light through the cracked crystal shows a murder, over and over, before time began.",
          "Rage, sorrow, confusion: the Thought-Forms are the god's last moods, walking."] },
      a5_lair: { e: "Black stone at angles that hurt. The Slayers built this. Before.",
        w: ["The Slayers killed the Triune before there was a when. This is where they kept the knife.",
          "The inscriptions bend when you read them. Do not read them twice.",
          "The Angled Door opens onto a direction you have no word for."] },
      a5_scar: { e: "The Void bled in here. Sunlight stops at the rim.",
        w: ["Your footprints in the ash fill themselves back in. As if you had not come.",
          "The fire in the fissure is cold and gives no light. It is not fire.",
          "Ur-Nihl does not hate you. The Void That Emanates cannot. It only takes the room.",
          "Rocks float here, upside down, very still. They forgot which way the ground was."] },
      a5_monolith: { e: "A black pillar over a bottomless crater. Even your heartbeat is muffled.",
        w: ["Speak, and the words leave your mouth and go nowhere.",
          "The monolith has no seams, no marks, no shadow. A hole shaped like a stone.",
          "Stand at its foot long enough and you forget what sound was for."] },
      qvault_5: { e: "A sealed place in the deep. Whatever sealed it meant it.",
        w: ["The Crown was swallowed before the god was born. The vault kept it undigested.",
          "Even here, the walls are warm. Even here."] }
    };
    // fallback whispers by act, for any zone the builders add later
    const ACT_W = {
      1: ["The ash settles where you stood, and keeps your shape a moment.", "Somewhere a lantern leans, listening for you.", "Down. Always down. The Hide slopes toward the wound."],
      2: ["Bone-dust in your teeth. It is someone. It was always someone.", "The sun does not blink. Neither do the dead out here.", "A hymn in a language the orders forgot drifts over the dunes."],
      3: ["The mud keeps time. You are keeping it too, now.", "Warm. Everything here is warm. Warmth is not kindness.", "Something hatches, far off, and begins to cry."],
      4: ["The air is thin. Every breath you take is one the Crone let go.", "A bell rings once, somewhere below. No one strikes it.", "Frost forms on your lashes in the shape of words."],
      5: ["Warm walls. A slow pulse. You are inside something that is dreaming.", "The Vigil's fire is far above now. It is still burning. Believe that.", "Only in. There is no more down. Only in."]
    };

    // =========================================================== lanterns: new names for generic ones, and inscriptions
    // { zone: { 'old name': ['new name', 'inscription'] } }
    const LAN_RENAME = {
      moor: { 'Crossroads': ['Ashwake Crossroads', 'Four roads, and all of them go down. The chalk on the post points to each in turn.'] },
      crypt: { 'Crypt Threshold': ['The Long Candle', 'Burning since before the fall. When you come near, it leans toward you, listening.'] },
      fen: { "Fen's Edge": ["The Boatman's Post", 'Boatmen tie up here to sleep. The rope is always wet, and never rots.'] },
      barrow: { 'Barrow Mouth': ['The Grieving Stone', "Worn to a taper by mourners' hands. The rain in its hollow never freezes."] },
      cata1: { 'Ossuary Stair': ["The Reader's Bay", 'A lectern, a book, one page turned. The hand is yours. Do not read on.'] },
      cata2: { 'Marrow Deep': ['The Warm Wall', 'Bones warm to the touch. Lean on them, and the warmth spreads into you.'] },
      sighing_ridge: { 'Ridge Threshold': ["The Wick-Saints' Post", 'Moths pool beneath the flame like water. They are praying, in their way.'] },
      ash_shore: { 'Shore Threshold': ['The Tideless Post', 'The sea never reaches it. The sea never reaches anything.'] },
      burnt_heath: { 'Heath Threshold': ['The Scorched Post', 'The iron is blistered. Something passed here burning, and did not stop.'] },
      fern_gully: { 'Gully Threshold': ['The Fern-Choked Post', 'Ferns climb the post toward the flame, and shrink back from it, every night.'] },
      pilgrim_road: { 'Road Threshold': ["The Pilgrims' First Light", "The pilgrims lit this one first, and spoke the road's first word here: down."] },
      drowned_village: { 'Village Threshold': ['The Lych-Gate', 'Coffins rested here on their way to the water. Then the water came to them.'] },
      sunken_bog: { 'Bog Threshold': ['The Staked Light', 'Driven into the bog on a pole of bone. The bog is slowly pulling it under.'] },
      fallen_monastery: { 'Monastery Threshold': ["The Porter's Lamp", 'The porter kept the door until the door kept him. His stool is still warm.'] },
      wolf_den_chapel: { 'Chapel Threshold': ['The Gnawed Door', "Teeth-marks on the lintel, at the height of a man's throat."] },
      plague_hospice: { 'Hospice Threshold': ['The Vinegar Lamp', 'They washed the step with vinegar every morning. The sickness came in anyway.'] },
      well_shaft: { 'Well-Head Threshold': ['The Well-Head', 'A thousand years of buckets. The rope is worn to a thread, and holds.'] },
      smugglers_hold: { 'Smugglers Threshold': ['The False Floor', "Knock twice, then once: the smugglers' knock. Something below knocks back."] },
      bogwitch_shack: { 'Shack Doorstone': ['The Begging Stone', 'Worn by knees, not feet. Those who came here came to beg.'] },
      tree_hollow: { 'Hollow Knot': ['The Niche Candle', 'A taper sealed in a knot. The wax has not run down in eight hundred years.'] },
      hunter_cache: { 'Cache Doorstone': ["The Hunter's Tally", 'A notch cut for every kill. The last notch is only half cut.'] },
      fallen_watchtower: { 'Tower Threshold': ['The Watch-Fire', "The watchmen's fire, rekindled by no one. It still faces the barrows."] },
      broken_bridge: { 'Bridge Threshold': ['The Toll-Light', 'The toll here was paid in teeth. The box is full.'] },
      hollow_wood: { 'Wood Threshold': ['The Ribcage Bough', "A white tree grown around a man's ribs. The pilgrim's badge in them is warm."],
        'Fungal Crossroads': ['The Blind Face', 'Its eyes barked shut, its mouth open, about to speak. And then not.'] },
      root_deep: { 'Root Threshold': ['The Oni-Road Milestone', 'Leave a coin on the stone. It will be gone, and something will be kinder to you.'] },
      a3_flats: { 'Edge of the Flats': ['The First Knot', 'The stilt-folk tie a knot here for everyone who walks out onto the flats.'] },
      a3_mangroves: { 'Mangrove Threshold': ['The Weeping Post', 'Amber runs down the post from the branches. It is warm, and sweet, and wrong.'] },
      a3_fetish: { 'Grove Threshold': ['The First Mask', 'A grass mask on the post, facing you. It faced away when you arrived.'] },
      a3_delta: { 'Delta Mouth': ["The Ferryman's Pole", 'The ferryman poled the delta for forty years. The pole outlasted him by a day.'] },
      a3_amber: { 'Mire Threshold': ['The Greased Post', 'The mire has crept up the post a hand-width. It will have the flame by spring.'] },
      a3_broodbanks: { 'Bank Threshold': ['The Hatch-Light', 'Moths lay their eggs on the glass. The eggs are warm.'] },
      a3_sumps: { 'Sump Mouth': ['The Bleeding Stone', 'Priests were bled here before they went down. The stone is still wet.'] },
      a3_egggal: { 'Gallery Mouth': ["The Keeper's Lamp", 'The egg-keepers trimmed this wick low, so the eggs would sleep.'] },
      a3_ziggurat: { 'Brick Threshold': ['The Pressed Palm', 'A palm-print in every brick. One of them is exactly your size.'] },
      a4_cloudshelf: { 'Shelf Threshold': ['The Cloud-Ferry', 'Pilgrims waited here for the clouds to firm. Some stepped out early.'] },
      a4_windscour: { 'Ridge Threshold': ['The Tether-Post', 'Rope-burns on the iron. The tether-pilgrims tied off here, before the wind.'] },
      a4_bellhollow: { 'Hollow Mouth': ['The Muffled Lamp', 'Its glass is wrapped in wool, so its light will not wake the bells.'] },
      a5_highway: { 'Highway Threshold': ['The First Vertebra', 'The descent begins at the first bone. Every bone after is lower.'] }
    };
    // inscriptions for lanterns the builders already named well
    const LAN_INSCR = {
      'Lantern Camp': "Maren's lantern. It was the first lit on the Moor after the fall, and never since put out.",
      'The Sighing Lantern': 'It hums through its cracked bell when the Last Breath is up. Not all of them still sing.',
      "The Widow's Stumps": "Three warm stumps. A father's hands and two daughters' hands, never let go.",
      'The Broken Kneeler': 'Halved by something falling, the night the god died. Nobody has moved the halves.',
      'Ashwake Milestone': "Chalked each year by Villa Llaga's penitents. This year's chalk is still fresh.",
      'Ashwake Waystone': 'Four hundred paces from the last. Four hundred to the next. Down, always.',
      'The Empty Reliquary Milestone': "Sister Un's box rested here on its way below. No dust settles where it stood.",
      'The Counting Wall': 'A hundred and eight to a group. Add one mark, if you like. Everyone does.',
      'The Reed That Points Home': 'It turns to face the village you were born in. It is turning now.',
      'The Kneeling Arch': 'It leans forty degrees and never falls further. The boatmen trust it with their sleep.',
      'The Iron Hook': 'A paper doll hangs from it, soaked. The Shrine Keeper will bring another at Ōharae.',
      'The Buried Bell': 'Under the turf, a bell. Under the bell, the tower that fell to keep it.',
      'Sunken Chapel': 'The chapel went under with its lamps lit. This is the one that came back up.',
      "The Femur's Heart": 'Lit where the marrow was thickest. The orders kneel to it in shifts, and never together.',
      'The Keel of Saint Ivel': 'Saint Ivel sailed the dunes in a ship of rib. This is the keel. He is under it.',
      'The Halfway Kneeler': 'He knelt to rest halfway down the Avenue. The procession did not wait.',
      'The Hall of Oaths': 'Nine oaths cut in bone. The flame is small, so the oaths cannot be read too closely.',
      'The Standard of Nine Wars': 'Carried into nine wars. The pole is sound. The cloth is dust. The gold thread holds.',
      'Kettlewick Hearth': 'The stilt-folk hang a knot above it for every child born. The rafters are full.',
      'Crown of the First Brood': 'A lamp on the crown of the Ziggurat. It burns red, and it is not the glass.',
      'Bellrest Hearth': 'The warmth is borrowed from the Last Breath. The monks return it at dawn, with thanks.',
      'Bridge of Held Breath': 'Cross without breathing, and the bridge will bear you. Breathe, and it remembers you weigh something.',
      'The Spire That Went Out': 'Cold brass. The monks do not light it. It went out for a reason.',
      'The Last Lantern': 'The last light on the mountain. Beyond it, the Unrung Bell, and silence.',
      'The Last Vigil': 'The fire is fed a splinter at a time. It will outlast the wood. It has decided to.',
      'The Hanging Bell of Reminiscence': 'Strike the bell, and the god remembers aloud. Not always something kind.',
      'The Swallowed Crowns': 'Crowns at the bottom of the pool, bright and whole. Every king went down with his.',
      'Footprints That Fill': 'Your prints fill in behind you. This lamp is the only proof you came.',
      "The Slayers' Threshold": 'Beyond it the angles go wrong. Look at the flame, not the walls.',
      'At the Foot of the Monolith': 'A flame that makes no sound. Nothing here makes a sound.'
    };
    // a pool per act for every other lantern (picked by the lantern's name, so each lantern keeps its own line)
    const LAN_POOL = {
      1: ['I burned for a mother who does not know I am still burning.', 'Forty nights. Fourteen. Four. It is all the same to a wick.',
        'If you go into the dark, take some of me. If you do not come back, I burn alone.', 'The ash remembers you. Do not ask what it remembers.',
        "Chalk on the post, renewed each year by hands from Villa Llaga."],
      2: ['Lit by rota, by oath, by order. The flame does not know which.', "A crusader's lamp. The wick is braided from banner-thread.",
        'Dust on the glass. Wipe it. It is someone.', 'Kept lit for the Last Crusade. The crusade is over. No one told the lamp.',
        'The flame burns white here, like the sand.'],
      3: ["Tallow from the kettles. The flame smells of someone's supper.", 'The stilt-folk tie a knot at every lamp they pass. Tie one.',
        'The flame gutters on the beat, and steadies between.', 'Moth-eggs on the glass, warm and patient.', 'Hung high on a pole, out of reach of the mud.'],
      4: ['The flame barely moves. There is so little breath up here to move it.', 'A mantra scratched on the brass: in, hold, out.',
        'Warmth for four paces. Beyond that, the wind.', 'Frost on the glass in the shape of a hand, reaching in.', 'Pale and fuel-less, like the spires. It borrows breath.'],
      5: ['Marrow-tallow, rendered from the god. She is lighting your way down into her.', 'The Vigil carried these lamps down, one each, one way.',
        'The flame leans downward here, toward the inside.', 'Someone scratched a name on the glass. Then another. Then stopped.', 'It is warm. Everything this far down is warm.']
    };
    // waystones (the Quest agent's waypoints): a name and an inscription per act
    const WAYSTONE = {
      1: ['Chalked Waystone', 'Kindled by pilgrims. Touch it, and every lit waystone on the Hide knows your step.'],
      2: ['Reliquary Waystone', 'A knight-relic set in bone. The orders swore to keep them lit. They mostly have.'],
      3: ['Knotted Waystone', 'The stilt-folk knot a cord round it for each traveller. Yours is already there.'],
      4: ['Mantra Waystone', 'Each stone in the cairn a breath. Add yours, and the Heights will carry you.'],
      5: ['Vigil Waystone', 'The last stones, set by the Vigil. Past them you are only walking in.']
    };

    // =========================================================== landmarks (z.decor, z.a2marks, z.props, z.a2props): name + inscription
    const MARKS = {
      // Act I
      lum_shroom: ['Luminous Caps', 'Teal for the young, ghost-blue for the tall. The amber ones fruit near the dead.'],
      trunk_relic: ['A Trunk-Relic', 'Something the god was carrying, grown into the bark: a bell, a skull, a candle.'],
      // Act II
      rib_arch: ['A Rib-Arch', "Oss-Vharoth's rib, standing out of the dust like a keel. It hums in a hot wind."],
      femur: ['The Shattered Femur', "The god's thigh-bone, hollowed for a fortress. The crack runs from knee to hip."],
      caravan: ['The Drowned Caravan', 'Oxen, salt and drivers, taken by one white dune. They are still in harness.'],
      rib_hull: ['A Rib-Hull', 'Ribs lying keel-up like a wrecked ship. Shade for a hundred pilgrims. None are left.'],
      lantern_bearer: ['A Lantern-Bearer', 'A calcified pilgrim holding a stone lantern high. His arm has not tired in six centuries.'],
      chalk_pillar: ['The Chalk Pillar', 'Scoured white by the storms. Names are cut at every height a man can reach.'],
      shield_wall: ['The Last Shield-Wall', 'Shields planted rim to rim. The line held. There was nothing behind it left to save.'],
      banner: ['A Fallen Standard', "The cloth is dust. The gold thread still spells an order's motto, bleached to nonsense."],
      femur_knee: ["The Femur's Knee", 'The joint where the great bone bends. There is a door in it, and it opens inward.'],
      well_house: ['The Well-House', 'A roof over a dry well. The rope still goes down. Something still holds the other end.'],
      socket: ['The Empty Socket', 'Where the thigh met the hip. A bowl of bone wide enough to kneel an army in.'],
      brazier: ["A Crusader's Brazier", 'Kept lit by rota. The rule says the fire must outlast the faith.'],
      gibbet: ['A Gibbet', 'Heretics, deserters, relic-thieves. The Barrens dried them into saints of their own.'],
      // Act III
      stilt_hut: ['A Stilt-Hut', 'Raised on legs above the mud, so the heartbeat cannot hear the sleepers.'],
      tallow_kettle: ['A Tallow Kettle', 'Rendering day and night. The stilt-folk say the steam carries the dead upward.'],
      stilt_gate: ['The Stilt-Gate', 'Beyond it the mud begins. A child reties the gate-knot every dawn.'],
      weeping_mangrove: ['A Weeping Mangrove', "Black bark bleeding curdled amber. Its roots drink from the Maiden's veins."],
      heartbeat_vent: ['A Heartbeat Vent', 'Warm air pushes out on the beat. Hold your hand over it, and count.'],
      amber_grease: ['Amber Grease', 'The curdled weeping of the trees. Flies hang in it like saints in glass.'],
      fetish_tree: ['A Fetish-Tree', 'Hung with grass masks and feather charms. Every mask is a promise someone broke.'],
      egg_sacs: ['Egg Sacs', 'Translucent, dripping, warm. Things turn inside them, slowly, toward the light.'],
      grass_masks: ['The Grass Masks', 'Woven by the priests, one for each face the fen has taken.'],
      step_shrine: ['A Step-Shrine', 'One step drowns each year. Pilgrims pray on the step that will drown next.'],
      ziggurat: ['The Ziggurat of the First Brood', 'Mud-brick fired by body heat, stepped up toward a basin of warm blood.'],
      blood_basin_crown: ["The Basin's Crown", 'At the summit, the basin. From here you can see its warmth rising, shimmering.'],
      egg_racks: ['The Egg-Racks', 'Rows of eggs on bone shelving. A generation to a shelf. None ever collected.'],
      brood_font: ['The Brood-Font', 'A font of warm blood. The priests baptised the larvae here, and named them.'],
      blood_basin: ['The Blood-Basin', "The Maiden's first wound, cupped in stone. It has never cooled."],
      // Act IV
      lantern_spire: ['A Lantern-Spire', 'Hollow brass burning pale. Warmth without fuel, borrowed from the Last Breath.'],
      bell_frame: ['The Empty Bell-Frame', 'The bell was carried to the summit. The monks still bow to where it hung.'],
      hearth_fire: ['The Bellrest Hearth', 'Fed with dung and prayer. It has not gone out since the god died.'],
      prayer_flags: ['Prayer Flags', 'Silk inked with mantras. The wind reads them aloud, one breath at a time.'],
      frozen_prayer_slip: ['A Frozen Prayer-Slip', 'A mantra caught in the ice, written to tether a dying soul. Whose, it does not say.'],
      chime_bell: ['A Chime-Bell', "Tuned to the god's unfinished note. The wind strikes it, and it never resolves."],
      basalt_glass: ['Basalt Glass', 'Black stone glazed in ice. Shapes are frozen beneath it, mid-step.'],
      glass_ice_sheet: ['The Glass-Ice', 'Clear as a held breath. Below it, a pilgrim, still reaching for balance.'],
      monastery_shrine: ['The Shrine of Humming Silk', "The flags here hum without wind. The monks called it the mountain's throat."],
      cloud_sea_edge: ["The Cloud-Sea's Edge", 'The stone ends. The clouds do not. Do not test which is which.'],
      wind_cut_basalt: ['Wind-Cut Basalt', 'Carved by a thousand winters into shapes that almost kneel.'],
      monastery_facade: ['The Monastery Face', 'Timber and bronze nailed to the cliff. The windows are lit. No one lit them.'],
      ice_organ: ['The Ice-Organ', "Pipes of frozen breath in the cave's throat. The mountain plays one chord a day."],
      hanging_bell: ['A Hanging Bell', 'Silent a thousand years. Brush it, and it inhales.'],
      thread_loom: ['The Soul-Thread Loom', 'Where the monks spun the threads that move them now. The shuttle is still moving.'],
      prayer_wheel: ['A Prayer-Wheel', 'It turns itself, a mantra a turn, for monks who can no longer turn it.'],
      unrung_bell: ['The Unrung Bell', "Cast to sound the god's last breath. If it rings, the breath ends."],
      // Act V
      a5_sinkhole: ['The Sinkhole', 'The way into the god. Warm air rises from it, smelling of the inside of a body.'],
      a5_vigil_fire: ['The Vigil-Fire', 'Kept for those who went down. Its light does not reach the bottom. It tries.'],
      a5_tallow: ['Marrow-Tallow Lanterns', "Candles rendered from the god's own marrow. They smell of burnt dust and sickrooms."],
      a5_tallow_shrine: ['The Tallow Shrine', 'Where the sappers offered their first candle to the bone they were cutting.'],
      a5_marrow_pit: ['A Marrow Pit', "Scooped to the depth of a tower. The god's marrow still seeps into it."],
      a5_bucket_chain: ['The Bucket-Chain', 'Iron buckets on a rusted chain. It still turns, and no one turns it.'],
      a5_bone_wreck: ['A Bone-Wreck', 'A ship of petrified timber, afloat on blood. Its crew are still at their posts.'],
      a5_blood_steam: ['Blood-Steam', 'Iron on the tongue, heat in the chest. The sea is boiling itself away, slowly.'],
      a5_valve_cusp: ['A Valve-Cusp', 'Tendon and cartilage the size of a sail. It opens on the beat.'],
      a5_heart_valve: ['The Heart-Valve', "The god's own valve, still working. What it pumps now, you would rather not know."],
      a5_hanging_bell: ['The Hanging Bell of Reminiscence', 'Strike it, and the god remembers something aloud.'],
      a5_nerve_mote: ['A Nerve-Mote', 'A spark of blue thought, drifting loose. It carries half a word.'],
      a5_acid_basin: ['An Acid Basin', 'Green, breathing light. Crowns and swords lie whole at the bottom.'],
      a5_bone_grind: ['The Bone-Grind', 'Plates of bone grinding ruins to powder, patient as teeth.'],
      a5_thought_crystal: ['A Thought-Crystal', 'Solidified thought. Touch it, and remember falling from very high.'],
      a5_optic_gate: ['The Optic Chiasm Gate', "An eye-shaped gate of crystal nerve. The god's last sight passed through it."],
      a5_gyrus_door: ['A Gyrus Door', 'A fold of the brain, opened like a door. It closes behind you if it wishes.'],
      a5_slayer_altar: ["The Slayers' Altar", 'Black stone at an angle that hurts. The knife was laid here before time.'],
      a5_obsidian: ['Void-Obsidian', 'Glass made where the Void touched stone. It reflects nothing, not even you.'],
      a5_void_rift: ['A Void-Rift', 'Ur-Nihl, leaking in. The cold does not stop when you step away.'],
      a5_silent_monolith: ['The Silent Monolith', 'No seams, no shadow, no sound. A hole shaped like a stone.']
    };
    try { window.__marks = MARKS; } catch (e) { }   // v0.55: the landmark library adds its names here


    // =========================================================== town barks: act -> role -> lines
    // Act I: weary Tithed plain-speech. Act II: crusader orders, clipped and liturgical. Act III: stilt-folk, superstitious
    // and sing-song. Act IV: monks, mantra-like and sparse. Act V: the last vigil, exhausted and tender.
    // The Stranger keeps his half-lines and ellipses in every town.
    const BARKS = {
      1: {
        vendor: ["Everything here was someone's. I only keep it until someone else needs it.",
          "Gold's no use to the dead. They sell cheap. I don't.",
          "Dig long enough on the Moor and you find a sword. Dig longer and you find its owner.",
          "I bury what I can't sell and sell what I can't bury. It evens out.",
          "Mind the ash on the goods. It isn't dust. It's the Moor."],
        healer: ["Hold still. The ash gets into wounds here, and it doesn't want to come out.",
          "I mended three pilgrims today. Two walked on. The third is you, again.",
          "Breathe out, slowly. The Breath is thin even here. Don't waste it on pain.",
          "I pray while I stitch. Not to the god. To the needle.",
          "There. You'll scar. Scars are how the body remembers it lived."],
        smith: ["Every nail on the Moor came from my forge or my father's. Most are in coffins.",
          "Iron's honest. It rusts where you can see it. Not like bone.",
          "Bring me what breaks. I'll tell you if it was ever worth mending.",
          "God-bone blunts a blade in a season. Mine hold a year. Best I've got.",
          "Hammer, fire, water. Same three prayers for forty years."],
        stash: ["The lid is carved with a sleeping woman. She shifts a little as it opens.",
          "Cedar and tallow inside. Whatever you leave, it keeps.",
          "The chest is older than the camp. The camp was built around it.",
          "Scratched inside the lid: 'kept, and kept, and kept.'"],
        giver: ["The dead leave errands the way the living leave debts. Someone pays them.",
          "I was a warden once. Now I send the young ones where I used to go.",
          "Come back with it done, or don't come back. Either way I'll light a candle.",
          "Hundred-Fingers blew his kangling at me once. I blew back. He hasn't tried since.",
          "The Moor is patient. I'm not. Go on."],
        stranger: ["The ash is warm... you noticed. Good. Most never do.",
          "Keep the lantern on your left. The dead... prefer the right.",
          "You'll go down. Everyone who listens to me goes down.",
          "A pilgrim asked me the way once. I told her. I am... still sorry.",
          "Rest while the fire is yours. Fires change hands, here."]
      },
      2: {
        vendor: ["Coin first. Blessing after. Citadel rule, not mine.",
          "Relics. Blades. Water by the cup. Water costs most.",
          "Everything is bone-dusted. Shake it twice. Then pay.",
          "The orders tithe me a tenth. I tithe you the same. It balances.",
          "Sold a lance to a knight. He went to the Socket. The lance came back alone."],
        healer: ["Kneel. Be mended. Rise. In the name of the Bearing Mother.",
          "Bone set. Blood stanched. Go, and sin no more than needed.",
          "Your wounds are an offering. I accept them on her behalf.",
          "By the Femur. By the Knee. By the Socket. Whole.",
          "Drink the chalk-water. It is bitter. So is mercy."],
        smith: ["Steel dulls in the dust. Sharpen daily. Pray hourly.",
          "Bone-ash in the quench. Hardens the edge. Softens nothing else.",
          "Nine orders. Nine seals. One anvil. Mine.",
          "Ask me for a blessing and I give you a whetstone. Same thing.",
          "The Calcified Knights wore my grandfather's plate. It held. They did not."],
        stash: ["Nine seals on the lid, one per order. None trusts the others' locks.",
          "A reliquary of the Last Crusade. What you store, it swears to keep.",
          "Bone-dust in the hinges. It opens with a sound like a vow.",
          "Scripture inside the lid, worn smooth by counting fingers."],
        giver: ["The relics must be recovered. The orders must be answered. Go.",
          "I keep the rolls of the fallen. Add no names. Strike some.",
          "In the name of Oss-Vharoth, the Bearing Mother: go down, bring back.",
          "I was ninth of nine. Now I am the only. Serve.",
          "The Saint in the Socket taught me. End him cleanly. He taught me that too."],
        stranger: ["Bone keeps its shape... long after the reason for it.",
          "The orders pray in a tongue they forgot. The god... is listening anyway.",
          "Don't drink the oasis water. There isn't any. That's the lesson.",
          "Nine banners. Nine wars. One... winner, and she was already dead.",
          "Walk in the rib-shadows. The sun here... counts you."]
      },
      3: {
        vendor: ["Eels, eels, fat off the flats! Don't ask what they ate, it's rude.",
          "Buy before the beat, sell after the beat, never on it. Old rule, good rule.",
          "Knot a cord round your purse. The mud likes coins. Loves 'em.",
          "Here's a charm, here's a blade, here's a jar of something warm. Pick two.",
          "My eels are honest eels. They only bite the once."],
        healer: ["Leech on the left, leech on the right, bad blood out by candlelight.",
          "Don't flinch, don't flinch. The little ones know, and bite deeper.",
          "Hush now, hush. The Maiden bleeds so we don't have to. Mostly.",
          "Your blood's gone thick with fighting. My darlings will thin it for you.",
          "One for the Maiden, one for the mud, one for you. There. Whole."],
        smith: ["Bone and grass and a bit of hair. A good charm's a small lie told true.",
          "I carve masks for the dead so the mud won't know them. Want one? Early?",
          "Never carve on the downbeat. The knife slips toward your heart.",
          "Blades rust in the fen. Charms don't. Guess which I sell more of.",
          "Tamb carved before the stilts. Tamb will carve after."],
        stash: ["The chest stands on four little stilts of its own. Even it won't touch the mud.",
          "Knotted with cords, one for each beat it has lived through. The knots are countless.",
          "What goes in comes out dry. That's the one miracle Kettlewick owns.",
          "A grass mask hangs from the lock, facing out. Guarding, or warning."],
        giver: ["The step drowns deeper every year, and I pray on it anyway. Go, go, the brood won't wait.",
          "Count the beats as you walk. Lose count, and the mud counts for you.",
          "Step, step, knot. Step, step, knot. Say it on the flats. It keeps you.",
          "The Brood-Mother dreams of you already. Don't let her wake before you're there.",
          "Bring back what the mud took, and I'll sing you dry."],
        stranger: ["Warm, isn't it... Warmth is how it tastes you.",
          "The stilt-folk sing so they cannot hear... the other singing.",
          "I stood on the flats until my heart kept its time. It took... a while to stop.",
          "Everything here is born. Nothing here... is finished being born.",
          "Mind the eggs. Some have been watching you... since the Moor."]
      },
      4: {
        vendor: ["Salt. For the meat. For the wound. For the ghost.",
          "Carry little. The mountain charges for every pound.",
          "Trade. Breathe. Trade.",
          "Salt keeps. Up here, almost nothing else does.",
          "What you buy, you carry. What you carry, you are."],
        healer: ["Lie on the stone. Breathe in four. Out four. Be whole.",
          "The stone is warm. The warmth is not yours. Give it back when you go.",
          "Pain is a breath held too long. Let it out.",
          "In. Hold. Out. Hold. Mended.",
          "The cold took the feeling from your fingers. I give it back. Keep it this time."],
        smith: ["Every blade is a bell not yet struck.",
          "Tune the steel. Temper the note. Strike once.",
          "Listen. The edge hums. That is how you know it is true.",
          "Bronze for bells. Iron for blades. Breath for both.",
          "The golems wake at a false note. My forge makes none."],
        stash: ["Wrapped in prayer flags. It hums faintly when opened.",
          "Cold inside. Nothing spoils. Nothing changes. It is very restful.",
          "Carved on the lid: one breath, held.",
          "Under the latch, a mantra: keep, and let go, and keep."],
        giver: ["Go up. Come down. Tell me what the wind said.",
          "The Abbot guards the silence. Silence is not always holy.",
          "Breathe slowly. The air is her last breath. There is not much.",
          "A mantra for you: step, breathe, step. Nothing else.",
          "The bell must not ring. The Abbot must not stand. Both. Go."],
        stranger: ["Up here I can almost hear her... breathing out. Almost finished.",
          "The monks tie threads to the dying. I have... a thread. I do not know who holds it.",
          "Cold keeps things. Keeps them... too well.",
          "Don't hold your breath on the bridge. Or do. It depends... what you want to keep.",
          "The mountain is her chest. You have climbed... onto a sigh."]
      },
      5: {
        vendor: ["I came down with a cart of candles. This is what's left. Take what you need, love.",
          "Don't haggle. Neither of us has the breath.",
          "Candles are cheap now. The dark is the only thing getting dearer.",
          "Pay what you can. Pay nothing, if you must. Just come back.",
          "I sold a candle to every soul who went down. I stopped counting when it hurt."],
        healer: ["Shh. I've no face to frighten you. Only hands. Let them work.",
          "You came back. They don't all come back. Sit. Sit a while.",
          "There, sweet. Whole again, as whole as anyone gets this far down.",
          "I gave my face to the first one who needed it. I don't miss it. I miss them.",
          "Rest your head. The fire's warm and I'm not going anywhere."],
        smith: ["Last forge. Last iron. I'll make it count, for you.",
          "I'm tired, pilgrim. Hand me the blade. My hands aren't tired.",
          "Everything I ever forged went down that hole. Now you. Bring something back.",
          "The fire's low. It's enough. It'll have to be.",
          "Keep the edge. Keep the grip. Keep yourself. In that order, if you must choose."],
        stash: ["Heaped with small things the others left: a ring, a letter, a child's tooth.",
          "Warm from the fire. Whatever you leave, someone will watch over it.",
          "Scratched inside the lid, in many hands: 'I'll be back for it.'",
          "It closes gently, as if someone inside were asleep."],
        giver: ["Slow, little one. Slow is a blessing, down here more than anywhere.",
          "Hurry and you'll meet the Slayer's Thought tired. Don't hurry.",
          "I have watched you from the top of the road to the bottom. Ha.",
          "The body is not cruel, messenger. Only very hungry, and very old.",
          "Walker of the down-road. There is only in, now. I'll keep your fire."],
        stranger: ["This far down... I can hear her dreaming. It is a small dream.",
          "Everyone I walked with is below us. I... wave to them, sometimes.",
          "The Vigil reads the names each night. I asked them... not to read mine yet.",
          "Only in. No more down. Only... in.",
          "When it's over... come up and tell me. I'd like to hear someone say it."]
      }
    };

    // =========================================================== death and return
    const DEATH = [
      'The body keeps walking a moment longer, then remembers.',
      'Your breath goes out and joins the Last Breath. It does not come back alone.',
      'Somewhere a lantern leans toward the place you fell.',
      'The ground takes you in, gently, the way it took the god.',
      'You were a shape. Now you are a story the ash will tell badly.',
      'The moths come to see. They have always come to see.',
      'Bone, flesh, breath: each lets go of you in turn.',
      'The dark is warm here. That is the worst of it.',
      'Your name goes on the long list. Not in ink. Not yet.',
      'Somewhere below, something hungry marks the place, and waits.'
    ];
    const RETURN = [
      'The lantern gives you back. It keeps a little, as it always does.',
      'You wake to wick-light, the taste of ash, and your own name.',
      'The flame leans toward you. It remembered.',
      'Breath returns, borrowed. The Last Breath lends, and counts.',
      'Again. The wick says a little longer. The wick always says a little longer.',
      'You stand where you last knelt. The ground is still warm from you.',
      'The moths part to let you rise. They have seen this before.',
      'Back, and lighter by something. You will not know what until you need it.',
      'The lantern burned for you while you were gone. It is tired.',
      'Up, pilgrim. The road is still down, and still yours.'
    ];

    // =========================================================== item lore: by base (30), plus the named uniques
    const LORE = {
      wand: ['Carved from a finger that once pointed at the god, and was right.', 'Bone remembers being a hand. It still wants to point.'],
      dagger: ['A tithe-knife. The blade is thin from all the giving.', 'The knife that cuts the cord cuts the vow, the midwives say.'],
      staff: ["A pilgrim's staff, black with grave-dirt at the heel.", 'It has walked further down than you. It knows the way.'],
      claw: ['Vharn claws, from a beast that fed on shrine-offerings.'],
      talons: ['A raven\'s grip, for those who take their tithe by hand.'],
      relic: ['The skull is warm. It is listening to you choose.', 'Pilgrims carried relics to be carried. It has not decided about you.'],
      hood: ['Mourning cloth dyed in ash. It is never quite dry.', 'Worn low, as the Tithed wear it, so the god cannot see who weeps.'],
      mask: ['The face beneath it was forgotten. The mask was not.', "Cut from a Warden's brow. It still sees what he saw."],
      robe: ['Ash-woven, warm as the Moor. It remembers the last procession.'],
      mail: ['Grave mail. Every ring was once a wedding band.', 'It has been buried twice. It came up both times.'],
      gloves: ["Wrappings from a Husk's hands. They are still closing, slowly.", 'Take them off at the lantern. They are shy of the light.'],
      boots: ['The soles are worn to the shape of the down-road.', 'Every step in them finishes a step someone else began.'],
      belt: ['Knotted a hundred and eight times, one for each thing you owe.'],
      amulet: ['A prayer in a locket, no longer addressed to anyone.', "Bell-yolk brass, cracked. It hums near the dead."],
      ring: ['A ring from a finger that is still looking for it.', 'Cold on the hand, warm on the heart. At night, the other way.'],
      wraps: ['Bound in sutras by a monk who would not strike first.'],
      iwraps: ['Each line of the sutra is a breath not wasted.'],
      spade: ['It has dug nine hundred graves, and one way out.'],
      shakujo: ['The rings chime to warn small things from underfoot. Nothing here is small.']
    };
    const LORE_U = {
      "Lanternkeeper's Hood": 'Worn by those who never let the Sighing Lantern go dark.',
      'The Hollow Choir': 'Three small voices, never quite finishing the note.',
      "Warden's Ribcage": 'It was a Warden\'s. It still salutes when you pass another.',
      'Whisperbone': 'It speaks when you are quiet. Stay quiet.',
      'Grave-Walkers': "They know the way down, and take it faster than you'd like.",
      'Knot of Sorrows': 'Every knot a grief. Untie none.',
      'Crown of the Forgotten Epoch': 'Swallowed before the god was born, and never digested.'
    };

    // =========================================================== state
    const V = {
      ch: { entry: null, whisper: null, bark: null },   // channels: { text, name?, t, max }
      wt: 50, lastW: {}, lastText: '', zoneId: null, pending: null, near: {}, markT: 0, markCool: 0,
      deathLine: null, lastDeath: -1, lastRet: -1, respawning: false, giverSeen: {}, barkIdx: {}, stats: { entry: 0, whisper: 0, bark: 0, inscr: 0, death: 0, ret: 0 }
    };
    const LORE_COL = '#a3977f';
    const F_ENTRY = 'italic 11px "IM Fell English", Georgia, serif';
    const F_WHISPER = 'italic 10px "IM Fell English", Georgia, serif';
    const F_NAME = '9px "IM Fell English SC", Georgia, serif';
    const F_LORE = 'italic 9px "IM Fell English", Georgia, serif';
    const rnd = (a, b) => a + Math.random() * (b - a);
    const vHash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    function actOfV(id) {
      if (!id) return 1;
      const m = /^a(\d)_/.exec(id); if (m) return Math.max(1, Math.min(5, +m[1]));
      const q = /^qvault_(\d)/.exec(id); if (q) return +q[1];
      if (/scar|nihl/i.test(id)) return 5;
      return 1;
    }
    const isTownV = id => id === 'moor' || /^a\d_town$/.test(id);
    function voiceState() { if (!P.voice || typeof P.voice !== 'object') P.voice = { seen: {} }; if (!P.voice.seen) P.voice.seen = {}; return P.voice; }
    function show(chan, text, opts) {
      if (!text) return;
      const o = opts || {};
      const words = String(text).split(/\s+/).length;
      const dur = o.t || Math.min(9, Math.max(4, 2.2 + words * 0.28));
      V.ch[chan] = { text: String(text), name: o.name || null, t: dur, max: dur, inscr: !!o.inscr };
    }

    // =========================================================== dressing: rename generic lanterns and waystones
    function vDress(z) {
      if (!z || !z.id) return;
      const ren = LAN_RENAME[z.id];
      if (ren) {
        for (const l of (z.lanterns || [])) if (l && ren[l.name]) { l.vOld = l.name; l.vInscr = ren[l.name][1]; l.name = ren[l.name][0]; }
        for (const o of (z.objects || [])) if (o && o.type === 'lantern' && ren[o.name]) { o.vOld = o.name; o.vInscr = ren[o.name][1]; o.name = ren[o.name][0]; }
      }
      const ws = WAYSTONE[actOfV(z.id)];
      for (const o of (z.objects || [])) if (o && o.type === 'qobj' && o.q === 'wp' && o.name === 'Waypoint' && ws) { o.name = ws[0]; o.vInscr = ws[1]; }
    }
    for (const id of Object.keys(ZONE_GEN)) {
      const g = ZONE_GEN[id]; if (typeof g !== 'function' || g.__voice) continue;
      const w = function () { const z = g.apply(this, arguments); try { vDress(z); } catch (e) { vErr(e); } return z; };
      w.__voice = true; ZONE_GEN[id] = w;
    }
    function lanternInscr(o) {
      if (o.vInscr) return o.vInscr;
      if (LAN_INSCR[o.name]) return LAN_INSCR[o.name];
      const pool = LAN_POOL[actOfV(G.zone && G.zone.id)] || LAN_POOL[1];
      return pool[vHash((G.zone && G.zone.id) + ':' + o.name) % pool.length];
    }

    // =========================================================== whispers and entry lines
    function whisperPool(id) { const d = ZV[id]; return (d && d.w && d.w.length) ? d.w : (ACT_W[actOfV(id)] || ACT_W[1]); }
    function entryLine(id) { const d = ZV[id]; return d && d.e; }
    function fireWhisper(force) {
      const z = G.zone; if (!z) return null;
      const pool = whisperPool(z.id); if (!pool.length) return null;
      let i = Math.floor(Math.random() * pool.length);
      if (pool.length > 1) { let n = 0; while ((i === V.lastW[z.id] || pool[i] === V.lastText) && n++ < 12) i = Math.floor(Math.random() * pool.length); }
      V.lastW[z.id] = i; V.lastText = pool[i];
      show('whisper', pool[i]); V.stats.whisper++;
      return pool[i];
    }
    function combatNear() {
      const z = G.zone; if (!z || !z.monsters) return false;
      for (const m of z.monsters) if (m && !m.dead && m.state && m.state !== 'idle' && Math.abs(m.x - P.x) < 8 && Math.abs(m.y - P.y) < 8) return true;
      return false;
    }
    function quietNow() { return !G.bossFight && !P.dead && !(typeof anyPanelOpen === 'function' && anyPanelOpen()) && !V.ch.entry && !V.ch.bark && !V.ch.whisper; }

    // landmarks: the first time you pass close to a kind of landmark in a zone, its name and inscription surface
    function markLists(z) { const out = []; for (const k of ['decor', 'a2marks', 'props', 'a2props']) { const a = z[k]; if (Array.isArray(a)) for (const e of a) if (e && MARKS[e.kind] && isFinite(e.x) && isFinite(e.y)) out.push(e); } return out; }
    function checkMarks() {
      const z = G.zone; if (!z) return;
      if (!z.__vMarks) z.__vMarks = markLists(z);
      let best = null, bd = 1e9;
      for (const e of z.__vMarks) {
        const key = z.id + ':' + e.kind; if (V.near[key]) continue;
        const ext = Math.min(10, (e.half || 0) || (e.len ? e.len / 2 : 0) || (e.rx || 0) || (e.span ? e.span / 2 : 0));
        const d = Math.hypot(e.x - P.x, e.y - P.y) - ext;
        if (d < 3.4 && d < bd) { bd = d; best = e; }
      }
      if (!best) return;
      V.near[z.id + ':' + best.kind] = 1;
      const m = MARKS[best.kind]; show('whisper', m[1], { name: m[0], inscr: true }); V.stats.inscr++;
      V.markCool = 22; V.wt = Math.max(V.wt, 25);
    }

    function tick(dt) {
      if (!G.running || G.paused || !G.zone) return;
      for (const k in V.ch) { const c = V.ch[k]; if (c) { c.t -= dt; if (c.t <= 0) V.ch[k] = null; } }
      if (V.pending) { V.pending.d -= dt; if (V.pending.d <= 0) { const p = V.pending; V.pending = null; if (p.zone === G.zone.id) { show(p.chan, p.text, { t: p.t }); V.stats[p.kind] = (V.stats[p.kind] || 0) + 1; } } }
      if (P.dead) return;
      V.markCool -= dt; V.markT -= dt;
      if (V.markT <= 0) { V.markT = 0.4; if (V.markCool <= 0 && quietNow() && !combatNear()) { try { checkMarks(); } catch (e) { vErr(e); } } }
      V.wt -= dt;
      if (V.wt <= 0) {
        if (quietNow() && !combatNear()) { fireWhisper(); V.wt = rnd(60, 120); }
        else V.wt = 8;
      }
    }

    // =========================================================== drawing
    function vWrap(s, maxW, font) {
      ctx.font = font; const words = s.split(' '), lines = []; let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur); return lines;
    }
    function alphaOf(c) { const inT = c.max - c.t; return Math.max(0, Math.min(1, inT / 0.9, c.t / 1.3)); }
    function drawLines(lines, cx, y, font, col, lh, a, plate) {
      ctx.save(); ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if (plate) {
        const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, h = lines.length * lh + 8;
        const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        g.addColorStop(0, 'rgba(6,5,8,0)'); g.addColorStop(0.15, `rgba(6,5,8,${0.7 * a})`); g.addColorStop(0.85, `rgba(6,5,8,${0.7 * a})`); g.addColorStop(1, 'rgba(6,5,8,0)');
        ctx.fillStyle = g; ctx.fillRect(Math.round(cx - w / 2), Math.round(y - lh + 1), Math.round(w), Math.round(h));
      }
      lines.forEach((l, i) => { ctx.globalAlpha = a; ctx.fillStyle = '#060508'; ctx.fillText(l, cx + 0.5, y + i * lh + 0.75); ctx.fillStyle = col; ctx.fillText(l, cx, y + i * lh); });
      ctx.restore();
    }
    // the world's voice: under the panels, in the upper third
    function drawWorldVoice() {
      if (!G.running || G.paused || !G.zone) return;
      const e = V.ch.entry;
      const pl = G.panels || {}, L = (typeof leftOpen === 'function' && leftOpen()) || pl.qlog || pl.qwp || pl.qstash || pl.qwares, R = pl.inv;
      if (pl.arcana || (L && R)) return;
      const cx = L ? (236 + W) / 2 : R ? RP.x / 2 : W / 2, mw = L || R ? 210 : 300;
      if (e) { const a = alphaOf(e); drawLines(vWrap(e.text, mw, F_ENTRY), cx, 66, F_ENTRY, '#e6dcc2', 12, a, true); }
      const w = V.ch.whisper;
      if (w && !G.bossFight) {
        const a = alphaOf(w), y = e ? 96 : 76;
        if (w.name) { drawLines([w.name], cx, y, F_NAME, '#c9a45a', 10, a * 0.9, false); drawLines(vWrap(w.text, mw - 20, F_WHISPER), cx, y + 11, F_WHISPER, '#b9af98', 11, a * 0.85, true); }
        else drawLines(vWrap(w.text, mw - 20, F_WHISPER), cx, y, F_WHISPER, '#b3a993', 11, a * 0.8, true);
      }
    }
    // spoken lines and the death screen: over the panels, just above the bar
    function drawSpoken() {
      if (!G.running || G.paused || !G.zone) return;
      if (P.dead && V.deathLine) {
        const a = Math.max(0, Math.min(1, ((P.deadT || 0) - 0.5) / 0.9));
        drawLines(vWrap(V.deathLine, 320, F_ENTRY), W / 2, H / 2 + 34, F_ENTRY, '#d6cbb0', 12, a, true);
      }
      const b = V.ch.bark; if (!b || P.dead) return;
      // v0.53: speak in the open half of the screen, never across a panel
      const pl = G.panels || {}, L = (typeof leftOpen === 'function' && leftOpen()) || pl.qlog || pl.qwp || pl.qstash || pl.qwares, R = pl.inv;
      if (pl.arcana || (L && R)) return;
      const cx = L ? (236 + W) / 2 : R ? RP.x / 2 : W / 2, mw = L || R ? 210 : 330;
      const a = alphaOf(b), lines = vWrap(b.text, mw, F_ENTRY), y0 = (typeof HUD_Y === 'number' ? HUD_Y : H - 30) - 20 - (lines.length - 1) * 12 - (G.msgT > 0 ? 14 : 0);
      if (b.name) drawLines([b.name], cx, y0 - 12, F_NAME, b.inscr ? '#c9a45a' : '#d9a441', 10, a, true);
      drawLines(lines, cx, y0, F_ENTRY, b.inscr ? '#cfc5ad' : '#e8e2d0', 12, a, true);
    }

    // =========================================================== barks
    function roleOf(o) {
      if (!o) return null;
      if (o.type === 'vendor') return 'vendor';
      if (o.type === 'qobj' && o.q === 'npc') return ({ quest: 'giver', elder: 'giver', questgiver: 'giver', chest: 'stash', blacksmith: 'smith', heal: 'healer' })[o.role] || o.role;
      return null;
    }
    function nextBark(n, role, o) {
      const L = BARKS[n] && BARKS[n][role]; if (!L || !L.length) return null;
      const key = n + ':' + role; let i = V.barkIdx[key];
      i = i == null ? Math.floor(Math.random() * L.length) : (i + 1 + Math.floor(Math.random() * Math.max(1, L.length - 2))) % L.length;
      V.barkIdx[key] = i; return L[i];
    }
    const shortName = s => String(s || '').replace(/,.*$/, '');
    // "Name: 'line'" style speech from any file becomes a wrapped, named line
    const SPEECH = /^([A-Z][^:'"]{1,48}):\s*['"‘“](.+?)['"’”]\s*$/;
    function routeSpeech(m, t) {
      const r = SPEECH.exec(String(m || '')); if (!r) return false;
      show('bark', r[2], { name: r[1], t: t ? Math.max(t, 3.5) : undefined }); return true;
    }

    // =========================================================== wrappers
    { const _say = say; say = function (m, t) { const r = _say.apply(this, arguments); try { if (G.running && typeof m === 'string' && routeSpeech(m, t)) G.msgT = 0; } catch (e) { vErr(e); } return r; }; }

    { const _ez = enterZone; enterZone = function (id, pos, li) {
        const prev = G.zone && G.zone.id;
        const r = _ez.apply(this, arguments);
        try {
          const z = G.zone; vDress(z);
          if (z && z.id !== prev) {
            V.zoneId = z.id; V.ch.whisper = null; V.ch.entry = null; V.pending = null; V.wt = rnd(40, 75); V.giverSeen = {};
            const vs = voiceState();
            if (V.respawning) { /* the return line is queued by respawn */ }
            else if (!vs.seen[z.id]) { vs.seen[z.id] = 1; const e = entryLine(z.id); if (e) V.pending = { chan: 'entry', text: e, d: 0.7, t: 5.5, zone: z.id, kind: 'entry' }; }
          }
        } catch (e) { vErr(e); }
        return r;
      }; }

    { const _ik = interact; interact = function (o) {
        const m0 = G.msg, t0 = G.msgT;
        const r = _ik.apply(this, arguments);
        try {
          if (!o || !G.zone) return r;
          const n = actOfV(G.zone.id), said = G.msg !== m0 || G.msgT > t0;
          if (o.type === 'lantern') { show('bark', lanternInscr(o), { name: o.name, inscr: true }); V.stats.inscr++; return r; }
          if (o.type === 'qobj' && o.q === 'wp') { if (o.vInscr) { show('bark', o.vInscr, { name: o.name, inscr: true }); V.stats.inscr++; } return r; }
          const role = roleOf(o); if (!role) return r;
          if (role === 'giver' && !V.giverSeen[o.name]) { V.giverSeen[o.name] = 1; return r; }   // their errand count first
          if (role === 'stranger' && said) { o.vAlt = !o.vAlt; if (o.vAlt) return r; }           // their lines and ours take turns
          const line = nextBark(n, role, o); if (!line) return r;
          if (said) G.msgT = 0;
          const name = role === 'stash' ? (o.name || 'The Reliquary Chest') : shortName(o.qname || o.name);
          show('bark', line, { name, inscr: role === 'stash' }); V.stats.bark++;
        } catch (e) { vErr(e); }
        return r;
      }; }

    { const _die = die; die = function () {
        const r = _die.apply(this, arguments);
        try { let i = Math.floor(Math.random() * DEATH.length); if (i === V.lastDeath) i = (i + 1) % DEATH.length; V.lastDeath = i; V.deathLine = DEATH[i]; V.ch.whisper = null; V.ch.bark = null; V.ch.entry = null; V.pending = null; V.stats.death++; } catch (e) { vErr(e); }
        return r;
      }; }
    { const _rs = respawn; respawn = function () {
        V.respawning = true; let r;
        try { r = _rs.apply(this, arguments); } finally { V.respawning = false; }
        try { let i = Math.floor(Math.random() * RETURN.length); if (i === V.lastRet) i = (i + 1) % RETURN.length; V.lastRet = i; V.deathLine = null; V.ch.entry = null; V.pending = { chan: 'entry', text: RETURN[i], d: 0.9, t: 5, zone: G.zone && G.zone.id, kind: 'ret' }; V.wt = Math.max(V.wt, 45); } catch (e) { vErr(e); }
        return r;
      }; }

    { const _up = update; update = function (dt) { const r = _up.apply(this, arguments); try { tick(dt); } catch (e) { vErr(e); } return r; }; }
    { const _dh = drawHud; drawHud = function () { const r = _dh.apply(this, arguments); try { drawWorldVoice(); } catch (e) { vErr(e); } return r; }; }
    { const _dt = drawTooltip; drawTooltip = function () { try { drawSpoken(); } catch (e) { vErr(e); } return _dt.apply(this, arguments); }; }

    // item lore: one italic line on uniques and rares
    function loreFor(it) {
      if (!it || it.potion || (it.q !== 'unique' && it.q !== 'rare')) return null;
      if (it.q === 'unique' && LORE_U[it.name]) return LORE_U[it.name];
      const L = LORE[it.base]; if (!L || !L.length) return null;
      return L[vHash((it.uid != null ? it.uid : '') + ':' + it.name) % L.length];
    }
    const LZ = '\u200b';   // lore lines carry a zero-width mark so tw() can measure them in their own font
    { const _il = itemLines; itemLines = function (it) {
        const L = _il.apply(this, arguments);
        try { const s = loreFor(it); if (s && Array.isArray(L)) { for (const l of vWrap(s, 150, F_LORE)) L.push([LZ + l, LORE_COL]); } } catch (e) { vErr(e); }
        return L;
      }; }
    { const _tw = tw; tw = function (s) { if (typeof s === 'string' && s[0] === LZ) { ctx.font = F_LORE; return ctx.measureText(s).width; } return _tw.apply(this, arguments); }; }
    { const _tx = txt; txt = function (s, x, y, col, align, shadow) {
        if (col !== LORE_COL || typeof s !== 'string') return _tx.apply(this, arguments);
        ctx.font = F_LORE; ctx.textAlign = align || 'left';
        ctx.fillStyle = '#0a090d'; ctx.fillText(s, x + 1, y + 1);
        ctx.fillStyle = col; ctx.fillText(s, x, y);
      }; }

    // save / load: which zones have spoken their entry line
    { const _nc = newCharacter; newCharacter = function () { const r = _nc.apply(this, arguments); P.voice = { seen: {} }; return r; }; }
    { const _as = applySave; applySave = function (d) { const r = _as.apply(this, arguments); try { P.voice = { seen: Object.assign({}, d && d.voice && d.voice.seen) }; } catch (e) { P.voice = { seen: {} }; } return r; }; }
    { const _sv = save; save = function () { const r = _sv.apply(this, arguments); try { if (G.saveKey && P.voice) { const s = localStorage.getItem(G.saveKey); if (s) { const d = JSON.parse(s); d.voice = P.voice; localStorage.setItem(G.saveKey, JSON.stringify(d)); } } } catch (e) { } return r; }; }

    // =========================================================== test and audit hooks
    const BANNED = /\b(mana|cooldowns?|dps|procs?|aggro|loot|buffs?|nerfs?|stun|stunned|stuns|lightning|weeping maiden)\b/i;
    function allLines() {
      const out = [];
      for (const id in ZV) { out.push({ cat: 'entry', id, s: ZV[id].e, max: 14 }); for (const s of ZV[id].w) out.push({ cat: 'whisper', id, s, max: 18 }); }
      for (const n in ACT_W) for (const s of ACT_W[n]) out.push({ cat: 'whisper', id: 'act' + n, s, max: 18 });
      for (const z in LAN_RENAME) for (const k in LAN_RENAME[z]) out.push({ cat: 'inscr', id: z, s: LAN_RENAME[z][k][1] });
      for (const k in LAN_INSCR) out.push({ cat: 'inscr', id: k, s: LAN_INSCR[k] });
      for (const n in LAN_POOL) for (const s of LAN_POOL[n]) out.push({ cat: 'inscr', id: 'lan' + n, s });
      for (const n in WAYSTONE) out.push({ cat: 'inscr', id: 'wp' + n, s: WAYSTONE[n][1] });
      for (const k in MARKS) out.push({ cat: 'inscr', id: k, s: MARKS[k][1] });
      for (const n in BARKS) for (const r in BARKS[n]) for (const s of BARKS[n][r]) out.push({ cat: 'bark', id: n + ':' + r, s });
      for (const s of DEATH) out.push({ cat: 'death', id: 'death', s });
      for (const s of RETURN) out.push({ cat: 'return', id: 'return', s });
      for (const b in LORE) for (const s of LORE[b]) out.push({ cat: 'lore', id: b, s });
      for (const u in LORE_U) out.push({ cat: 'lore', id: u, s: LORE_U[u] });
      return out;
    }
    function audit() {
      const bad = [];
      for (const l of allLines()) {
        const n = l.s.split(/\s+/).filter(Boolean).length;
        if (l.max && n > l.max) bad.push(`${l.cat} ${l.id} has ${n} words: ${l.s}`);
        if (BANNED.test(l.s)) bad.push(`${l.cat} ${l.id} uses a banned word: ${l.s}`);
      }
      const missing = Object.keys(ZONE_GEN).filter(id => !ZV[id]);
      return { bad, missing };
    }
    function counts() {
      const c = {}; for (const l of allLines()) c[l.cat] = (c[l.cat] || 0) + 1;
      c.zones = Object.keys(ZV).length; c.lanternRenames = Object.values(LAN_RENAME).reduce((a, o) => a + Object.keys(o).length, 0); c.landmarkKinds = Object.keys(MARKS).length;
      c.barkSets = Object.values(BARKS).reduce((a, o) => a + Object.keys(o).length, 0); return c;
    }
    try { window.__voice = { V, ZV, ACT_W, LAN_RENAME, LAN_INSCR, LAN_POOL, WAYSTONE, MARKS, BARKS, DEATH, RETURN, LORE, LORE_U, fireWhisper, show, audit, enterZone: (id, pos, li) => enterZone(id, pos, li), die: () => die(), respawn: () => respawn(), interact: o => interact(o), itemLines: it => itemLines(it), counts, allLines, loreFor, vDress, ZONE_GEN, ZONE_NAMES: typeof ZONE_NAMES === 'object' ? ZONE_NAMES : null }; } catch (e) { }
  }
}
