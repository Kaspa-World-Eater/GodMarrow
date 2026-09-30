# usage: bash build_x.sh OUT.html   -- builds the fork: base files + every src/zz_*.js (sorted; zz_polish.js last), then syntax-checks
cd "$(dirname "$0")"; OUT=$1
LIST=$(sed -n 's/.*cat \(.*\) > triune.html.*/\1/p' build.sh)
cat $LIST > "$OUT" && python3 -c "
import glob; s=open('$OUT').read(); import os; ex=set(open('src/_exclude.txt').read().split()) if os.path.exists('src/_exclude.txt') else set(); fs=sorted(f for f in glob.glob('src/zz_*.js') if not f.endswith('zz_polish.js') and os.path.basename(f) not in ex)+['src/zz_polish.js']; z=''.join(open(f).read()+chr(10) for f in fs); i=s.rfind('})();'); s=s[:i]+z+chr(10)+s[i:]; open('$OUT','w').write(s)" && python3 -c "
s=open('$OUT').read(); i=s.rfind('<script>'); j=s.rfind('</script>'); open('/tmp/chk_$$.js','w').write(s[i+8:j])" && node --check /tmp/chk_$$.js && echo SYNTAX OK
# data files (big art tables) ship beside the page as their own scripts, loaded before the game script
python3 -c "
import glob, os, shutil; out='$OUT'; s=open(out).read(); ds=sorted(glob.glob('data/*.js'))
tags=''.join('<script src=\"'+os.path.basename(d)+'\"></script>' for d in ds); i=s.rfind('<script>'); s=s[:i]+tags+s[i:]; open(out,'w').write(s)
[shutil.copy(d, os.path.join(os.path.dirname(os.path.abspath(out)), os.path.basename(d))) for d in ds]; print('data', [os.path.basename(d) for d in ds])"
