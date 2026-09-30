#!/usr/bin/env python3
"""Unpack the web build's embedded art into res://assets (run from the web build's triune_desktop folder).
Writes one file per image and assets.json, which mirrors the web build's catalogues with image paths in place of
data URLs. Usage: python3 extract_assets.py <triune_desktop> <godot_project>/assets"""
import re, json, base64, os, sys
SRC, R = sys.argv[1], sys.argv[2]
def objs(path):
    s = open(path).read(); out = []
    for m in re.finditer(r'=\s*(\{")', s):
        try: o, _ = json.JSONDecoder().raw_decode(s[m.start(1):]); out.append(o)
        except Exception: pass
    return out
def save(uri, path):
    head, b = uri.split(',', 1); ext = 'webp' if 'webp' in head else 'png'
    os.makedirs(os.path.dirname(path), exist_ok=True); p = path + '.' + ext
    open(p, 'wb').write(base64.b64decode(b)); return os.path.relpath(p, R)
def walk(o, base):
    if isinstance(o, str) and o.startswith('data:image'): return save(o, base)
    if isinstance(o, list): return [walk(v, f'{base}_{i}') for i, v in enumerate(o)]
    if isinstance(o, dict): return {k: walk(v, f'{base}/{k}' if k not in ('png', 'src') else base) for k, v in o.items()}
    return o
meta = {}
srcs = {'ground': 'src/zz_ground55.js', 'world': 'src/zz_world55.js', 'trees': 'data/w61.js', 'decor': 'data/decor66.js',
        'lanterns': 'data/lanterns.js', 'kneeler': 'src/zz_mon_kneeler.js', 'wtex': 'data/wtex.js'}
for name, f in srcs.items():
    os_ = objs(os.path.join(SRC, f))
    meta[name] = [walk(o, f'{R}/{name}/set{i}') for i, o in enumerate(os_)] if name == 'ground' else walk(os_[0], f'{R}/{name}')
for cls in ('animancer', 'hemomancer'):
    s = open(os.path.join(SRC, f'data/hhd_{cls}.js')).read(); o, _ = json.JSONDecoder().raw_decode(s[s.index('{'):])
    o['sheets'] = [save(u, f'{R}/heroes/{cls}/sheet{i}') for i, u in enumerate(o['sheets'])]; meta['hero_' + cls] = o
json.dump(meta, open(os.path.join(R, 'assets.json'), 'w'))
print('ok', {k: len(v) for k, v in meta.items()})
