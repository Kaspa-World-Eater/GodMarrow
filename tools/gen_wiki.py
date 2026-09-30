"""Build the Godmarrow wiki as one self-contained HTML page from the project docs saved in /home/claude/wiki_src.
Outputs: wiki.html (artifact body, no doctype) and 'Godmarrow Wiki.html' (standalone copy for the Desktop)."""
import re, html, json, markdown

SRC = '/home/claude/wiki_src/'
OUT = '/home/claude/wiki_build/'

# (group, id, file, short title, updated)
DOCS = [
    ('Start', 'start', 'wiki__00-start-here.md', 'Start here', '2026-09-30'),
    ('Start', 'rules', 'wiki__01-rules-and-decisions.md', 'Rules and decisions', '2026-09-30'),
    ('World', 'world', 'wiki__02-world-and-lore.md', 'World and lore', '2026-09-29'),
    ('World', 'lore-notes', 'wiki__12-lore-notes.md', 'Lore notes', '2026-09-29'),
    ('Systems', 'systems', 'wiki__04-systems-and-combat.md', 'Systems and combat', '2026-09-29'),
    ('Systems', 'checklist', 'wiki__14-mechanics-checklist.md', 'Mechanics checklist', '2026-09-30'),
    ('Systems', 'arcana', 'wiki__15-arcana-v103.md', 'Arcana v103', '2026-09-30'),
    ('Orders', 'ossuarch', 'claude__godmarrow-class-ossuarch.md', 'The Ossuarch', '2026-09-30'),
    ('Orders', 'penitent', 'claude__godmarrow-class-hemomancer.md', 'The Red Penitent', '2026-09-30'),
    ('Orders', 'mystic', 'claude__godmarrow-class-hollow-mystic.md', 'The Hollow Mystic', '2026-09-29'),
    ('Orders', 'keeper', 'claude__godmarrow-class-shrine-keeper.md', 'The Shrine Keeper', '2026-09-29'),
    ('Orders', 'empty-hand', 'claude__godmarrow-class-kusho.md', 'The Empty Hand', '2026-09-29'),
    ('Art', 'art', 'wiki__06-art-direction.md', 'Art direction', '2026-09-29'),
    ('Art', 'pipelines', 'wiki__07-art-pipelines.md', 'Art pipelines', '2026-09-29'),
    ('Build', 'tech', 'wiki__08-tech-and-build.md', 'Tech and build', '2026-09-29'),
    ('Build', 'godot', 'wiki__13-godot.md', 'The Godot port', '2026-09-30'),
    ('Planning', 'backlog', 'wiki__09-backlog-and-open-questions.md', 'Backlog and questions', '2026-09-29'),
    ('Planning', 'study', 'wiki__10-study-great-games.md', 'Study of great games', '2026-09-29'),
    ('Codex', 'stranger', 'wiki__11a-codex-stranger.md', "The Stranger's pages", '2026-09-30'),
    ('Codex', 'voices', 'wiki__11-codex-voices.md', 'Codex voices', '2026-09-29'),
    ('Codex', 'interviews', 'wiki__12b-codex-interviews.md', 'Codex interviews', '2026-09-29'),
]
# doc paths as other pages cite them -> page id
PATHS = {}
for g, i, f, t, u in DOCS:
    PATHS[f.replace('__', '/')] = i
    PATHS[f.replace('__', '/').split('/')[-1]] = i
PATHS['claude/godmarrow-class-kusho.md'] = 'empty-hand'

def render(i, md_text):
    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'sane_lists', 'toc'],
                           extension_configs={'toc': {'slugify': lambda v, sep: i + '--' + re.sub(r'[^a-z0-9]+', '-', v.lower()).strip('-')[:60]}})
    out = md.convert(md_text)
    # cited doc paths become links to their page
    def link(m):
        p = html.unescape(m.group(1))
        key = p if p in PATHS else p.split('/')[-1] if p.split('/')[-1] in PATHS else None
        if key:
            return '<a class="xref" href="#%s"><code>%s</code></a>' % (PATHS[key], m.group(1))
        return m.group(0)
    out = re.sub(r'<code>((?:wiki|claude)/[^<]+?\.md)</code>', link, out)
    out = re.sub(r'(?<!["=])(https://claude\.ai/artifact/[A-Za-z0-9]+)', r'<a href="\1" target="_blank" rel="noopener">\1</a>', out)
    out = re.sub(r'<table>', '<div class="tw"><table>', out).replace('</table>', '</table></div>')
    return out

nav = []
tpls = []
words = 0
for g, i, f, t, u in DOCS:
    text = open(SRC + f, encoding='utf-8').read()
    words += len(text.split())
    body = render(i, text)
    tpls.append('<template id="t-%s" data-title="%s" data-group="%s" data-updated="%s" data-words="%d">%s</template>'
                % (i, html.escape(t), g, u, len(text.split()), body))
groups = []
for g, i, f, t, u in DOCS:
    if g not in groups:
        groups.append(g)
navhtml = ''
for g in groups:
    navhtml += '<div class="ng"><div class="nl">%s</div>' % g
    for gg, i, f, t, u in DOCS:
        if gg == g:
            navhtml += '<a class="ni" href="#%s" data-id="%s">%s</a>' % (i, i, html.escape(t))
    navhtml += '</div>'

page = open(OUT + 'shell.html', encoding='utf-8').read()
page = page.replace('{{NAV}}', navhtml).replace('{{TEMPLATES}}', '\n'.join(tpls)).replace('{{DOCS}}', str(len(DOCS))).replace('{{WORDS}}', '{:,}'.format(words))
open(OUT + 'wiki.html', 'w', encoding='utf-8').write(page)
standalone = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' + page.replace('<title>', '<title>', 1) + '\n</html>'
open(OUT + 'Godmarrow Wiki.html', 'w', encoding='utf-8').write(standalone)
print('docs', len(DOCS), 'words', words, 'bytes', len(page.encode()))
