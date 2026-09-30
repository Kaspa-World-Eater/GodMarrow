#!/usr/bin/env python3
"""The skill trees redone to the lore (2026-09-30, the user's plan): the source of truth for every change made to the
web-exported data/skills.json, data/classes.json and data/board.json. Run from the project root; safe to run again.

The user's rules for this pass:
- old names stay unless a skill is dull or breaks a rule (animal words, science words, "brood");
- the play styles stay: the Ossuarch keeps his dead, his bone spells and his melee; the Hemomancer his minions, his
  blood and his close-in fighting;
- every Mastery is a level-30 skill (row 6), for every order;
- the Ossuarch: Ossuary (the dead) · Bone (spells and plate; the aura is named Carapace) · the Count (melee and curses,
  his numerology: blows cut notches, nine closes a count); Grave Spirit becomes the Pale Lord;
- the Hemomancer: Procession (the hooded penitents, the Sewn Martyr) · Blood · Penance (the scourge, scar and stigmata);
  no Assimilate, nothing of a brood, no animal words.
"""
import json, re, copy

SK = 'data/skills.json'
D = json.load(open(SK))
S = D['skills']
by = {s['id']: s for s in S}

ROW_LVL = {1: 1, 2: 6, 3: 12, 4: 18, 5: 24, 6: 30}

def lv(fmt, f):
    """20 levels of tooltip text: fmt.format(*f(L))"""
    return {str(L): {"text": fmt.format(*f(L)), "values": []} for L in range(1, 21)}

def new_skill(cls, id, name, tab, tree, row, col, kind, desc, lore, levels, cost=None, prereq=(), perks=()):
    base = {"resource": None, "base": 0, "per_level_pct": 0, "arcana_mult": 1, "shards": 0, "poise": 0, "jp": None, "mutation_slot": None}
    if cost:
        base.update(cost)
    kt = {"cast": "Cast: one use per press", "passive": "Passive: always at work", "hold": "Hold: channels for as long as the button is held"}[kind]
    return {"id": id, "class": cls, "name": name, "tab": tab, "tree": tree, "row": row, "col": col,
            "required_level": ROW_LVL[row], "prerequisites": list(prereq), "prerequisite_names": [],
            "max_hard_level": 20, "kind": kind, "cast_type": "target" if kind == "cast" else kind, "kind_text": kt,
            "cost": base, "description": desc, "lore": lore, "perks": list(perks), "synergies": [], "levels": levels,
            "new_2026_09_30": True}

def place(id, tab, tree, row, col, prereq=None):
    s = by[id]
    s['tab'], s['tree'], s['row'], s['col'] = tab, tree, row, col
    s['required_level'] = ROW_LVL[row]
    if prereq is not None:
        s['prerequisites'] = list(prereq)

def rename(id, name, desc=None, lore=None):
    s = by[id]
    s['name'] = name
    if desc is not None:
        s['description'] = desc
    if lore is not None:
        s['lore'] = lore

def remove(ids, into=None):
    """take skills out; synergies that pointed at them point at `into` (or are dropped)"""
    global S
    for id in ids:
        for s in S:
            syn = []
            for g in s.get('synergies', []):
                if g['from'] == id:
                    if into and into.get(id) and into[id] != s['id'] and not any(x['from'] == into[id] for x in s['synergies']):
                        g = dict(g, **{'from': into[id], 'from_name': by[into[id]]['name']})
                    else:
                        continue
                syn.append(g)
            s['synergies'] = syn
            s['prerequisites'] = [p for p in s.get('prerequisites', []) if p != id]
    S = [s for s in S if s['id'] not in ids]
    for id in ids:
        by.pop(id, None)

def add(s):
    if s['id'] in by:
        return
    S.append(s)
    by[s['id']] = s

# ============================================================== the Ossuarch
O = 'ossumancer'
if 'tally' not in by:
    # the aura is the Carapace; Shield of Bones folds into Bone Armor, Bone Arms into Charnel Cage
    rename('aura', 'Carapace')
    by['barmor']['description'] = by['barmor']['description'].rstrip() + " Plates also grow between you and your standing dead: while any stand within 4 yd, a share of every blow meant for you is taken by the nearest of them instead."
    by['ribcage']['description'] = by['ribcage']['description'].rstrip() + " Arms of bone grow up out of the earth with the ribs and grip whatever stands inside."
    rename('spirit', 'Pale Lord',
           "Raise a Pale Lord at the target: a warden of old bone standing on a white waymark. It does not move and cannot be struck. Every bone spell you cast is cast again from it, dead straight, at the same point. One Pale Lord stands at a time; raising another lays the first down.",
           "Ossuarchs walk the Pale, always outward. Where one has gathered bones he leaves a white stone. Some of the stones on the Ninth Stair's chart were set by no one living.")
    by['spirit']['levels'] = lv("Echoes your bone spells at {0}% of their force", lambda L: (40 + 3 * L,))
    remove(['banner', 'bward', 'wall', 'carapm'], into={'bward': 'barmor', 'wall': 'ribcage'})
    # Ossuary: the dead
    place('raise', 0, 'Ossuary', 1, 2)
    place('offering', 0, 'Ossuary', 2, 1, ['raise'])
    place('tithe', 0, 'Ossuary', 2, 3, ['raise'])
    place('unearth', 0, 'Ossuary', 3, 1, ['offering'])
    place('colossus', 0, 'Ossuary', 3, 2, ['raise'])
    place('horn', 0, 'Ossuary', 3, 3, ['tithe'])
    place('host', 0, 'Ossuary', 4, 2, ['colossus'])
    place('reasm', 0, 'Ossuary', 5, 1, ['unearth'])
    place('legion', 0, 'Ossuary', 6, 2, [])
    # Bone: spells and plate
    place('spear', 1, 'Bone', 1, 1, [])
    place('barmor', 1, 'Bone', 1, 2, [])
    place('aura', 1, 'Bone', 1, 3, [])
    place('siphon', 1, 'Bone', 2, 1, ['spear'])
    place('ribcage', 1, 'Bone', 2, 2, ['barmor'])
    place('ossify', 1, 'Bone', 2, 3, ['aura'])
    place('spikes', 1, 'Bone', 3, 2, ['ribcage'])
    place('sstorm', 1, 'Bone', 4, 1, ['siphon'])
    place('bonerain', 1, 'Bone', 4, 3, ['spikes'])
    place('spirit', 1, 'Bone', 5, 2, ['sstorm'])
    place('marrowm', 1, 'Bone', 6, 2, [])
    # the Count: melee and its curses
    T = 'Count'
    place('blade', 2, T, 1, 1, [])
    place('gcharge', 2, T, 2, 1, ['blade'])
    place('crush', 2, T, 2, 2, ['blade'])
    place('bscythe', 2, T, 3, 2, ['crush'])
    place('leap', 2, T, 4, 1, ['gcharge'])
    place('lash', 2, T, 4, 2, ['bscythe'])
    by['crush']['description'] = by['crush']['description'].rstrip() + " It reads the count: it lands 11% harder for every notch in the one it strikes, and wipes the count clean."
    add(new_skill(O, 'tally', 'Tally', 2, T, 1, 3, 'passive',
        "[Passive] Every blow you strike in close cuts a notch into the one you strike. The ninth notch closes its count: that blow lands at double force, and the count begins again. Your curses read the notches.",
        "Nothing goes up nameless, and nothing goes up uncounted. A Tallier carries every open count in his head until it closes.",
        lv("The ninth notch lands x{0:.2f}", lambda L: (2.0 + 0.05 * (L - 1),))))
    add(new_skill(O, 'opencount', 'Open Count', 2, T, 2, 3, 'cast',
        "Curse: open a count on up to nine enemies around the target. Every hit they take, from you or your dead, cuts a notch. When a count closes, that enemy shatters for a ninth of its life (far less for bosses). The count stays open until it closes or the enemy dies.",
        "A count whose root is not nine is an open count. The Order does not like to leave one open.",
        lv("Opens counts within {0:.1f} yd · closing shatters for {1:.1f}% of life", lambda L: (3.0 + 0.1 * L, 11.1 + 0.3 * (L - 1))),
        cost={'resource': 'Marrow', 'base': 12.8, 'per_level_pct': 5}, prereq=['tally']))
    add(new_skill(O, 'fewer', 'The Fewer', 2, T, 3, 3, 'cast',
        "Curse: the fewer is the holier. Enemies around the target take more from your blows the fewer of their kind stand within 4 yd of them: the most when one stands alone, less for each beside it.",
        "A child is born with more bones than a man dies with. Every frame seeks the fewer.",
        lv("Alone: +{0}% from your blows · -{1}% for each one beside it", lambda L: (20 + 2 * L, 4)),
        cost={'resource': 'Marrow', 'base': 16, 'per_level_pct': 5}, prereq=['opencount']))
    add(new_skill(O, 'weighing', 'The Weighing', 2, T, 4, 3, 'cast',
        "Curse: weigh the enemies around the target. Every notch in their count makes them slower and their blows lighter, up to nine notches.",
        "Dust is weighed before it goes up. The weights are kept on the Ninth Stair, and every Ossuarch reads them once.",
        lv("Each notch: -{0:.1f}% speed and -{0:.1f}% damage dealt (up to 9)", lambda L: (2.0 + 0.2 * L,)),
        cost={'resource': 'Marrow', 'base': 19.2, 'per_level_pct': 5}, prereq=['fewer']))
    add(new_skill(O, 'countm', 'Count Mastery', 2, T, 6, 2, 'passive',
        "[Passive] Root of Nine. Every count you close gives back a ninth of your footing, and on every ninth kill one of your standing dead is crowned: taller, harder, and it strikes half again as hard.",
        "Nine keeps itself. Any count taken nine times comes back to nine.",
        lv("Closing a count: +{0:.1f}% poise · crowned dead strike x1.5", lambda L: (11.1 + 0.5 * (L - 1),))))
    # synergies for the new ones (within the tree)
    by['opencount']['synergies'] = [{"from": "tally", "from_name": "Tally", "table_pc": 8, "per_hard_point_pct": 4}]
    by['fewer']['synergies'] = [{"from": "opencount", "from_name": "Open Count", "table_pc": 6, "per_hard_point_pct": 3}]
    by['weighing']['synergies'] = [{"from": "crush", "from_name": "Marrow Crush", "table_pc": 6, "per_hard_point_pct": 3}]

# ---- the combo (2026-09-30, the user: "a combo of what I said and you said"; Carapace names the Bone tree)
if 'ninthstair' not in by:
    rename('aura', 'Mantle')   # the tree is the Carapace now; the grit that hangs round him is his mantle
    by['tally']['description'] = ("[Passive] Every blow you strike in close cuts a notch into the one you strike. The ninth notch closes "
        "its count: that blow lands at double force, and the count begins again. Blows come in threes: every third blow in a string "
        "cleaves one more enemy beside it. Your curses read the notches.")
    add(new_skill(O, 'ninthstair', 'The Ninth Stair', 2, 'Count', 5, 2, 'cast',
        "Curse: take one enemy down the stair. For each of your next nine blows on it, it goes down a step and takes 9% more from you than "
        "the step before. On the ninth step, if its life is low enough, it does not come back up: it is finished. Only Ossuarchs go down the Ninth Stair.",
        "WE WERE HERE WHEN SHE FELL. WE WILL BE HERE WHEN SHE RESTS. The older letters under it have never been copied the same way twice.",
        lv("+{0}% a step, nine steps · the ninth finishes it below {1}% life (bosses: never)", lambda L: (9, 12 + L // 2)),
        cost={'resource': 'Marrow', 'base': 22.4, 'per_level_pct': 5}, prereq=['weighing']))
    by['ninthstair']['synergies'] = [{"from": "tally", "from_name": "Tally", "table_pc": 6, "per_hard_point_pct": 3}]
    by['countm']['prerequisites'] = ['ninthstair']
for s in S:   # the Ossuarch's second tree is named the Carapace (the user)
    if s['class'] == O and s['tab'] == 1:
        s['tree'] = 'Carapace'

# ============================================================== the Hemomancer
H = 'hemomancer'
WORDS = [  # nothing of a brood, no animal words: the minions are the little hoods, penitents that crawl out of the welts
    (r'swarmlings?|spawnlings?', 'little hood'), (r'tumor spawn', 'tumor hood'), (r'swarm of', 'crowd of'),
    (r'brood-beast', 'martyr'), (r'brood stock', 'hood stock'), (r'broods?', 'procession'),
    (r'hatches', 'gives up'), (r'hatch', 'give up'), (r'swelling nest', 'swelling shrine'), (r'nest', 'shrine'),
    (r'infestation', 'Visitation'), (r'fat leeches', 'Full Clots'), (r'leech mother', 'Clot Mother'),
    (r'leeches', 'clots'), (r'leech', 'clot'), (r'barbed suckers', 'Barbed Thorns'), (r'suckers', 'thorns'),
    (r'coiling grip', 'Tightening Crown'), (r'torn-off tentacles constrict', 'torn-off thorns hold'),
    (r'tentacles', 'thorns'), (r'tentacle', 'thorn'), (r'gills', 'wounds'),
    (r'mutations', 'penances'), (r'mutation', 'penance'), (r'a whole clutch', 'a whole crowd'), (r'golem', 'Martyr'), (r'bite harder', 'strike harder'), (r'harder-biting', 'harder-striking'), (r'bites', 'blows'), (r'bite', 'strike'),
    (r'rabid', 'fevered'), (r'spider legs', 'Long Stride'), (r'chitin', 'scar'), (r'glowing', 'swollen'),
    (r'flesh golem', 'Sewn Martyr'), (r'rabid charge', 'Procession'), (r'hivemind', 'Confraternity'),
    (r'assimilate', 'Last Rites'), (r'flesh spawn', 'Lesser Martyr'), (r'crawling skin', 'Crawling Skin'),
]
def _case(src, rep):
    if src[:1].isupper() and rep[:1].islower():
        return rep[:1].upper() + rep[1:]
    return rep
def clean(t):
    if not isinstance(t, str):
        return t
    for a, b in WORDS:
        t = re.sub(r'\b' + a + r'\b', lambda m, b=b: _case(m.group(0), b) + ('s' if b == 'little hood' and m.group(0).lower().endswith('s') else ''), t, flags=re.I)
    return t

def clean_hemo():
    for s in S:
        if s['class'] != H:
            continue
        for k in ('description', 'lore'):
            s[k] = clean(s.get(k) or '')
        for p in s.get('perks', []):
            p['name'] = clean(p['name'])
            p['text'] = clean(p['text'])
        for v in s.get('levels', {}).values():
            v['text'] = clean(v['text'])
        for k in ('info_template', 'tooltip_full_L1'):
            if isinstance(s.get(k), list):
                s[k] = [clean(x) for x in s[k]]
        for p in s.get('perks', []):
            p['name'] = rename_all(p['name'])
            p['text'] = rename_all(p['text'])
        s['description'] = rename_all(s['description'])
        for v in s.get('levels', {}).values():
            v['text'] = rename_all(v['text'])
        s['tree'] = {'Brood': 'Procession', 'Flesh': 'Penance'}.get(s['tree'], s['tree'])

if 'scourge' not in by:
    rename('rush', 'Procession',
           "Call the little hoods near you into procession: they fall in behind a bier and march in a line through the enemy at the cursor, trampling what stands in the way. Each that reaches the end of the march bursts in a spray of blood. The only way to spend your little hoods as a blow.")
    rename('fgolem', 'The Sewn Martyr',
           "Sew a martyr out of corpses and scar: a hulking penitent stitched from the fallen, carrying the Maiden's fallen image on its back, its belly sewn shut over what it has gathered. When enemies come near it tears the stitches open and spills a gout of blood full of little hoods that fall on them. It seeks out corpses and eats them to mend.",
           "The first Martyr was the town of Villa Llaga, sewn into one: every penitent the wound had eaten, pressed together to walk in procession at last.")
    rename('assim', 'Last Rites',
           "[Passive] When one of your penitents falls, the others take up its blood: those near it are mended and strike harder for a while, the more for every rite already said over them, up to twice over.",
           "Blood given is not blood taken. They give it to each other now.")
    rename('nest', 'Wayside Shrine',
           "Raise a wayside shrine of flesh on the ground: candle-stubs, a scrap of the Maiden's image, and something breathing under the cloth. For 15 s it gives up a little hood every few seconds and mends the penitents around it.")
    rename('hive', 'Confraternity',
           "[Passive] Your penitents are one brotherhood: each one strikes harder and takes less for every other penitent within 4 yd of it.")
    rename('broodm', 'Mother of the Wheel',
           "[Passive] She Who Turns turns through you. Little hoods, blood thralls and the Sewn Martyr stand harder and strike harder, and the procession you carry in your welts grows with you.")
    rename('tentacles', 'Crown of Thorns',
           "[Passive] Mutation: a crown of thorns grows through your brow and down your shoulders. Anything that strikes you in close is torn by it, and it lashes out once at an enemy in reach, holding it where it stands, then grows back. More points grow more thorns, up to eight, and regrow them faster.")
    rename('gills', 'Stigmata',
           "[Passive] Mutation: your palms and your side open and do not close. Standing in blood heals you three times as fast and refills Vitae far more.")
    add(new_skill(H, 'scourge', 'Scourge', 2, 'Penance', 1, 2, 'cast',
        "Lash with the scourge: a sweeping blow of iron-tipped cords that tears everything in front of you and leaves it bleeding. Every lash also opens a welt on your own back, and the welt pays you Vitae. Costs footing, like every blow struck in close.",
        "The one who opens others never opens himself. That was the rule, for twenty years. He keeps the other rule now.",
        lv("x{0:.2f} weapon damage in a 1.8 yd arc · bleeds {1}% · a welt: -1% life, +{2}% Vitae", lambda L: (1.2 + 0.08 * (L - 1), 20 + 2 * L, 3 + 0.2 * L)),
        cost={'poise': 5}))
    # the Procession
    place('eggsac', 0, 'Procession', 1, 1)
    place('hatch', 0, 'Procession', 1, 2)
    place('thrall', 0, 'Procession', 2, 1, ['eggsac'])
    place('rush', 0, 'Procession', 2, 3, ['hatch'])
    place('fgolem', 0, 'Procession', 3, 1, ['thrall'])
    place('graft', 0, 'Procession', 3, 2, ['hatch'])
    place('assim', 0, 'Procession', 3, 3, ['rush'])
    place('nest', 0, 'Procession', 4, 1, ['fgolem'])
    place('hive', 0, 'Procession', 5, 2, ['graft'])
    place('broodm', 0, 'Procession', 6, 2, ['hive'])
    # Penance
    place('maw', 2, 'Penance', 1, 1)
    place('chitin', 2, 'Penance', 1, 3)
    place('swallow', 2, 'Penance', 2, 1, ['maw'])
    place('tentacles', 2, 'Penance', 2, 2, ['scourge'])
    place('devour', 2, 'Penance', 3, 1, ['hatch'])
    place('gills', 2, 'Penance', 3, 3, ['chitin'])
    place('bilehump', 2, 'Penance', 4, 2, ['tentacles'])
    place('molt', 2, 'Penance', 4, 3, ['gills'])
    place('heart', 2, 'Penance', 5, 3, ['molt'])
    place('fmastery', 2, 'Penance', 6, 2, [])

# ---- the Hemomancer's penances (2026-09-30, the user: "mutations" was too science; "penances is cool"; the skills
#      named and told closer to the lore: the Precious Wound, Villa Llaga, the Friday of the Fall, the Open Side)
NAMES = [  # case-sensitive, whole words: old name -> new, in every text that names them (skills, perks, board cards)
    ('Second Graft', 'Second Vestment'), ('Belly Maw', 'The Open Side'), ('Swallow Whole', 'Taken Into the Side'),
    ('Scar-Plates', 'Welt-Mail'), ('Devour', 'Communion'), ('Tumor Hump', 'The Burden'), ('Molt', 'The Flaying'),
    ('Second Heart', 'Sacred Heart'), ('Flesh Mastery', 'Penance Mastery'), ('Blood Thrall', 'Bleeding Saint'),
    ('Graft', 'Vestments'), ('Boiling Blood', 'Her Door'), ('Burst Vessel', 'Split Scab'),
    ('Covenant of Blood', 'The Red Tithe'), ('Flesh panel', 'Penance panel'),
]
def rename_all(t):
    if not isinstance(t, str):
        return t
    for a, b in NAMES:
        t = re.sub(r'(?<![\w-])' + re.escape(a) + r'(?![\w-])', b, t)
    return t
HEMO_NEW = {
    'thrall': ('Bleeding Saint',
        "Call a saint down into the corpse or pool of blood nearest the cursor. It rises as a trembling figure of blood wearing a halo of clots, keeps its distance and flings shards of clotted blood. It drinks corpses and spilled blood, and each time it drinks it gives a blessing: you and your penitents near it strike faster for a while.",
        "In the crypt rites the saints came down and rode whoever would carry them. Now they ride the blood."),
    'graft': ('Vestments',
        "[Passive] Dress the whole procession in the robes of the dead: Fevered Blood, Leapers, Clingers, Volatile or Long Stride, chosen in the Penance panel (V). Levels strengthen every vestment.",
        "After the Fall the little ones dragged the dead penitents' robes over themselves and tried to walk in procession, going nowhere."),
    'bboil': ('Her Door',
        "Draw the Maiden's door in blood on the ground at the cursor. For 8 s everything standing on it bleeds half again as hard and as long, and each one that dies on it is taken through: it bursts, scalding those beside it.",
        "He drew her door on the scab in his own blood and called her down. He draws it smaller now. She still comes."),
    'cburst': ('Split Scab',
        "The corpse or tumor nearest the cursor splits like the black scab over Villa Llaga: it bursts in meat and blood that leaves what it hits bleeding.",
        "For a year the wound lay closed under a black crust. On the Friday of the Fall it split."),
    'pact': ('The Red Tithe',
        "Pay the tithe: open your veins for your procession and lose 12% of your current life. Every penitent is mended 40% and strikes 30% harder for 8 s.",
        "The Brotherhood of the Precious Wound paid the wound a measured tithe of blood each year. Blood given is not blood taken."),
    'maw': ('The Open Side',
        "[Passive] Penance: the wound in your side opens and does not close, and it has teeth. Your blows strike harder, open bleeding wounds and drink life, and now and then the Side takes an enemy in whole. While something is inside you, you mend; if it still lives when you are done with it, you cast it out.",
        "Our Lady of the Open Side. He wears her wound now."),
    'swallow': ('Taken Into the Side',
        "Needs The Open Side worn. It opens wide and takes the enemy nearest the cursor within reach (not bosses), and holds it until it is spent.",
        None),
    'chitin': ('Welt-Mail',
        "Penance: every welt the scourge ever raised on you hardens into a ridge of scar, split and seamed like old mail. Blows glance off it, and what does strike you loses much of its weight before it ever reaches meat.",
        "The one who opens others never opens himself. He was twenty years clean of it. He is not clean now."),
    'devour': ('Communion',
        "Take the little hood or tumor nearest you in communion: it restores life and Vitae and gives a stacking blessing to all your damage. The bigger the offering, the bigger the blessing.",
        "Take, and eat. The brotherhood said it over bread. He says it over what he made."),
    'bilehump': ('The Burden',
        "[Passive] Penance: a swollen burden grows on your back, heavy as a cross. It buds little hoods of its own that drift off after enemies and burst in a spray of blood.",
        "Every penitent carries something up the hill. His grows."),
    'molt': ('The Flaying',
        "Tear your skin off in one wet heave: mend a share of your life and shake off anything slowing you. The empty skin stands where you were, arms held out, and draws the enemy for 3 s.",
        "The saints in the crypt paintings carry their skins over one arm like a cloak. He never understood them, until now."),
    'heart': ('Sacred Heart',
        "[Passive] Penance: a second heart beats outside your chest, bound in thorns. You mend steadily, and once in each place, when you fall near death, it pounds you back up.",
        "On the Friday the brothers carry her heart through the town on a litter, pierced seven times. His carries itself."),
    'fmastery': ('Penance Mastery',
        "[Passive] The Bleeding Maiden asks more of you. A third penance slot opens beneath your skin, and every penance you wear grows into you more truly.",
        None),
    'tentacles': (None, None, "Our Lady was crowned in her own thorns. So is he."),
    'gills': (None, None, "The palms, the feet, the side. The brotherhood painted them on its saints in red lead. His do not need paint."),
    'scourge': (None, None, None),
}
for id, (nm, desc, lore) in HEMO_NEW.items():
    if id not in by:
        continue
    if nm:
        by[id]['name'] = nm
    if desc:
        by[id]['description'] = desc
    if lore:
        by[id]['lore'] = lore
by['fmastery']['tree'] = 'Penance'
for pk in by['heart'].get('perks', []):   # no waits (the user's rule): twice in each place, not "ready again"
    if pk['id'] == 'strongbeat' or pk['name'] == 'Strong Beat':
        pk['text'] = "[Passive] It can pound you back up twice in each place."
clean_hemo()

# ============================================================== every order: Masteries at level 30
for s in S:
    if 'Mastery' in s['name'] and s['row'] != 6:
        taken = {(x['tab'], x['col']) for x in S if x['class'] == s['class'] and x['row'] == 6 and x is not s}
        s['row'] = 6
        s['required_level'] = 30
        for c in (s['col'], 1, 3, 2):
            if (s['tab'], c) not in taken:
                s['col'] = c
                break

# prerequisite names follow the (new) names
for s in S:
    s['prerequisite_names'] = [by[p]['name'] for p in s.get('prerequisites', []) if p in by]
    for g in s.get('synergies', []):
        if g['from'] in by:
            g['from_name'] = by[g['from']]['name']

D['skills'] = S
json.dump(D, open(SK, 'w'), ensure_ascii=False)

# ============================================================== the orders' tabs and keys
C = json.load(open('data/classes.json'))
C['classes'][O]['tabs'] = ['Ossuary', 'Carapace', 'Count']
C['classes'][O]['default_keys'] = {'q': 'spear', 'w': 'ribcage', 'e': 'spikes', 'r': 'colossus', 't': 'opencount', 'y': 'host', 'u': 'sstorm', 'f': 'barmor'}
C['classes'][H]['tabs'] = ['Procession', 'Blood', 'Penance']
json.dump(C, open('data/classes.json', 'w'), ensure_ascii=False)

# ============================================================== the body board's cards speak the new names
B = open('data/board.json').read()
for a, b in [("Bone Arms grab: the first enemy each arm catches", "Charnel Cage grips: the first enemy its arms catch"),
             ("Bone Arms knock enemies", "Charnel Cage's arms knock enemies"),
             ("Coiling Tentacles", "Tightening Thorns"), ("Tentacles hold what they catch", "The thorns hold what they catch"),
             ("Deep Gills", "Deep Wounds"), ("Shard Aura", "Mantle"), ("Grave Spirit", "Pale Lord")]:
    B = B.replace(a, b)
bd = json.loads(B)
def walk(o, hemo=False):
    if isinstance(o, dict):
        h = hemo or o.get('cls') == H or o.get('reg') == 'hem'
        for k, v in o.items():
            if isinstance(v, str) and h and k not in ('cls', 'kind', 'card', 'reg', 'id', 'area', 'page', 'hyb'):
                o[k] = rename_all(clean(v))
            else:
                walk(v, h)
    elif isinstance(o, list):
        for v in o:
            walk(v, hemo)
walk(bd)
json.dump(bd, open('data/board.json', 'w'), ensure_ascii=False)

# ============================================================== report
for cls in (O, H, 'animancer', 'miasmancer', 'monk'):
    print('==', cls, C['classes'][cls]['tabs'])
    grid = {}
    for s in sorted([x for x in S if x['class'] == cls], key=lambda x: (x['tab'], x['row'], x['col'])):
        k = (s['tab'], s['row'], s['col'])
        if k in grid:
            print('  !! CLASH', k, grid[k], s['id'])
        grid[k] = s['id']
        if cls in (O, H) or 'Mastery' in s['name']:
            print('  %d r%d c%d L%-2d %-10s %s' % (s['tab'], s['row'], s['col'], s['required_level'], s['id'], s['name']))
