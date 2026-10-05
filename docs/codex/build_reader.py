"""Build one reading page from docs/codex/voices/*.md. Usage: python build_reader.py OUT.html (run from docs/codex)."""
import html, pathlib, re, sys
import markdown

SECTIONS = [
    ("The Faiths and Their Quarrels", "What the faithful keep, and what they hide from each other",
     ["01", "02", "40", "43", "27", "25", "03", "04", "41", "05", "06", "07", "08", "09", "10", "42", "28", "11", "12"]),
    ("The Old Powers", "Fragments of the ages when the gods walked, and what is left of them",
     ["13", "26", "44", "14", "15", "16", "17", "18", "19", "22", "46"]),
    ("The Road and the Dead", "The toil of keeping what is left, and the dead who will not stay down",
     ["20", "21", "33", "36", "32", "34", "35", "37", "38"]),
    ("The Silence and the Visitors", "The spaces between, and the ones who owe nothing",
     ["24", "29", "39", "30", "31"]),
    ("Far from the Hide", "Places that have never heard of the corpse",
     ["23", "45"]),
]

src = pathlib.Path("voices")
docs = {}
for p in sorted(src.glob("*.md")):
    t = p.read_text(encoding="utf-8").replace("\r\n", "\n")
    m = re.match(r"#[ \t]+([^\n]+)\n+\*([^\n]+?)\*[ \t]*\n", t)
    title, note = (m.group(1).strip(), m.group(2).strip()) if m else (p.stem, "")
    body = t[m.end():] if m else t
    docs[p.name[:2]] = (p.stem, title, note, markdown.markdown(body, extensions=["tables", "sane_lists"]))

placed = {n for _, _, ns in SECTIONS for n in ns}
extra = [n for n in docs if n not in placed]
sections = [(a, b, [n for n in ns if n in docs]) for a, b, ns in SECTIONS]
if extra:
    sections.append(("Newly Gathered", "Pages not yet sorted into the book", extra))

count = sum(len(ns) for _, _, ns in sections)
words = sum(len(re.findall(r"[A-Za-z']+", re.sub("<[^>]+>", " ", docs[n][3]))) for _, _, ns in sections for n in ns)

toc, arts = [], []
for si, (sname, ssub, ns) in enumerate(sections, 1):
    if not ns:
        continue
    items = "".join(f'<li><a href="#{docs[n][0]}">{html.escape(docs[n][1])}</a></li>' for n in ns)
    toc.append(f'<section class="toc-part"><h3>{html.escape(sname)}</h3><ol>{items}</ol></section>')
    arts.append(f'<header class="part" id="part-{si}"><p class="part-no">Part {["", "I", "II", "III", "IV", "V", "VI", "VII"][si]}</p>'
                f'<h2>{html.escape(sname)}</h2><p class="part-sub">{html.escape(ssub)}</p></header>')
    for n in ns:
        slug, title, note, body = docs[n]
        arts.append(f'<article id="{slug}"><h1>{html.escape(title)}</h1>'
                    f'<p class="note">{html.escape(note)}</p><div class="text">{body}</div>'
                    f'<p class="back"><a href="#contents">Contents</a></p></article>')

page = f"""<title>The Codex of the Last Breath</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&family=Spectral:ital,wght@0,400;0,500;1,400&display=swap">
<style>
/* Layout: a single bound book read top to bottom; a contents leaf, then parts, then pages, each page a leaf with its finder's note. */
:root {{
  --ground: #eae4d6; --leaf: #f4efe3; --ink: #231d18; --faint: #6b6156; --rule: #cbbfa9; --blood: #7a1f1a;
  --display: "IM Fell English SC", "IM Fell English", Georgia, serif;
  --title: "IM Fell English", Georgia, serif;
  --body: "Spectral", Georgia, "Times New Roman", serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --ground: #121010; --leaf: #1a1716; --ink: #ddd3c2; --faint: #978b7c; --rule: #3a332e; --blood: #c0544a; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --ground: #121010; --leaf: #1a1716; --ink: #ddd3c2; --faint: #978b7c; --rule: #3a332e; --blood: #c0544a; color-scheme: dark }}
* {{ box-sizing: border-box }}
html {{ scroll-behavior: smooth }}
@media (prefers-reduced-motion: reduce) {{ html {{ scroll-behavior: auto }} }}
body {{ background: var(--ground); color: var(--ink); font: 1.08rem/1.7 var(--body); padding-inline: 16px; padding-block: 0 4rem }}
a {{ color: inherit; text-decoration-color: var(--blood); text-underline-offset: .2em }}
a:focus-visible {{ outline: 2px solid var(--blood); outline-offset: 3px }}
.book {{ max-width: 44rem; margin: 0 auto; display: grid; gap: 2.5rem }}
.cover {{ padding-block: 3.5rem 1rem; text-align: center; display: grid; gap: .6rem }}
.cover h1 {{ font: 400 clamp(2.2rem, 7vw, 3.6rem)/1.05 var(--display); margin: 0; text-wrap: balance; letter-spacing: .01em }}
.cover p {{ margin: 0; color: var(--faint); font-style: italic }}
.cover .tally {{ font-style: normal; font-variant-numeric: tabular-nums; font-size: .9rem; letter-spacing: .08em; text-transform: uppercase }}
.mark {{ color: var(--blood); font-size: 1.3rem }}
#contents {{ background: var(--leaf); border: 1px solid var(--rule); padding: 1.5rem clamp(1rem, 4vw, 2.2rem); display: grid; gap: 1.2rem }}
#contents h2 {{ font: 400 1.5rem var(--display); margin: 0 }}
.toc-part h3 {{ font: 400 1.05rem var(--display); color: var(--blood); margin: 0 0 .3rem; letter-spacing: .04em }}
.toc-part ol {{ margin: 0; padding-left: 1.4rem; display: grid; gap: .15rem; font-family: var(--title) }}
.part {{ text-align: center; padding-block: 2.5rem .5rem; border-top: 1px solid var(--rule) }}
.part-no {{ margin: 0; color: var(--blood); letter-spacing: .3em; text-transform: uppercase; font-size: .8rem }}
.part h2 {{ font: 400 clamp(1.7rem, 5vw, 2.4rem)/1.15 var(--display); margin: .3rem 0; text-wrap: balance }}
.part-sub {{ margin: 0; color: var(--faint); font-style: italic }}
article {{ background: var(--leaf); border: 1px solid var(--rule); padding: clamp(1.2rem, 5vw, 2.8rem); min-width: 0 }}
article h1 {{ font: 400 clamp(1.5rem, 4.5vw, 2rem)/1.2 var(--title); margin: 0 0 .8rem; text-wrap: balance }}
.note {{ font-style: italic; color: var(--faint); margin: 0 0 1.6rem; padding-bottom: 1.2rem; border-bottom: 1px solid var(--rule) }}
.text {{ max-width: 65ch; overflow-wrap: break-word }}
.text p {{ margin: 0 0 1em }}
.text h2, .text h3, .text h4 {{ font: 400 1.2rem var(--title); color: var(--blood); margin: 1.6em 0 .5em }}
.text blockquote {{ margin: 1em 0; padding-left: 1rem; border-left: 2px solid var(--rule); color: var(--faint); font-style: italic }}
.text ul, .text ol {{ padding-left: 1.4rem }}
.text table {{ border-collapse: collapse; font-size: .95rem; display: block; overflow-x: auto; max-width: 100% }}
.text td, .text th {{ border-bottom: 1px solid var(--rule); padding: .3rem .6rem; vertical-align: top; text-align: left; font-variant-numeric: tabular-nums }}
.text hr {{ border: 0; text-align: center; margin: 1.6em 0 }}
.text hr::after {{ content: "\\2767"; color: var(--blood) }}
.back {{ margin: 1.6rem 0 0; font-size: .85rem; letter-spacing: .1em; text-transform: uppercase }}
.back a {{ color: var(--faint) }}
</style>
<main class="book">
  <header class="cover">
    <p class="mark">&#10087;</p>
    <h1>The Codex of the Last Breath</h1>
    <p>Pages gathered from the faithful, the dead, the ruins and the roads, set down as they were found.</p>
    <p class="tally">{count} pages &middot; about {words:,} words</p>
  </header>
  <nav id="contents" aria-label="Contents"><h2>Contents</h2>{''.join(toc)}</nav>
  {''.join(arts)}
</main>
"""
pathlib.Path(sys.argv[1]).write_text(page, encoding="utf-8")
print(count, "pages", words, "words")
