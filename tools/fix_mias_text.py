# tidy the Shrine Keeper's exported texts (data/*.json): the web's "Sigil"/"Omen" split (the HUD says Omen), a botched
# replace ("msigilt" = moment), old skill names in the card texts, the dropped Vharn lore, and the class's tab names.
import json, re
def fix(s):
    if not isinstance(s, str):
        return s
    s = s.replace('msigilt', 'moment').replace('An Sigil', 'An Omen').replace('an Sigil', 'an Omen')
    s = re.sub(r'\bSigils\b', 'Omens', s); s = re.sub(r'\bSigil\b', 'Omen', s)
    for a, b in [('Miasma Nova', 'Miasmic Exhalation'), ('Venom Blade', 'Venom Claws'), ('Bloat Mine', 'Sighing Bladder'),
                 ('Carrion Talon', "Hanged Man's Heel"), ('Lingering Ring', 'the ring of clouds'), ('Vharn Claws', 'Lacquered Claws'),
                 ('Omens last 15 s instead of 8.', 'Omens last 24 s instead of 14.')]:
        s = s.replace(a, b)
    return s
def walk(o):
    if isinstance(o, dict):
        return {k: walk(v) for k, v in o.items()}
    if isinstance(o, list):
        return [walk(v) for v in o]
    return fix(o)
p = 'data/skills.json'; d = json.load(open(p))
d['skills'] = [walk(x) if x.get('class') == 'miasmancer' else x for x in d['skills']]
json.dump(d, open(p, 'w'))
p = 'data/board.json'; d = json.load(open(p))
for k, v in d['arcana'].items():
    if v.get('cls') == 'miasmancer' or k[:2] in ('z_', 'zm', 'zd', 'zx'):
        d['arcana'][k] = walk(v)
json.dump(d, open(p, 'w'))
p = 'data/classes.json'; d = json.load(open(p))
c = d['classes']['miasmancer']; c['tabs'] = ['Miasma', 'Distortion', 'Death']; c = walk(c); d['classes']['miasmancer'] = c
json.dump(d, open(p, 'w'))
print('ok')
