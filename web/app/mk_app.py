# Turn a game build into the desktop app's index.html: the Google Fonts links become the bundled fonts.css.
import re, sys, shutil, os
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
s = re.sub(r'<link rel="preconnect" href="https://fonts\.[^"]+"( crossorigin)?>\s*', '', s)
s = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]+">', '<link rel="stylesheet" href="fonts.css">', s)
s = re.sub(r"'https://fonts\.googleapis\.com/css2[^']*'", "'fonts.css'", s)
os.makedirs(dst, exist_ok=True)
open(os.path.join(dst, 'index.html'), 'w', encoding='utf-8').write(s)
here = os.path.dirname(os.path.abspath(__file__))
for f in ('main.js', 'package.json', 'fonts.css'): shutil.copy(os.path.join(here, f), dst)
shutil.copytree(os.path.join(here, 'fonts'), os.path.join(dst, 'fonts'), dirs_exist_ok=True)
print('app ->', dst, 'googleapis left:', s.count('fonts.googleapis'))
