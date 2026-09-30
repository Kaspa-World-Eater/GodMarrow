// showcase: every frame of a creature, big, plus walk / attack / idle GIFs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  { const H = process.env.HTML || 'spiritmancer.html'; await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H)); } await p.waitForTimeout(300);
  const type = process.argv[2] || 'hollow', Z = +(process.argv[3] || 3), out = process.argv[4] || 'show_' + type, hero = process.argv[5] === 'hero';
  const data = await p.evaluate(([type, Z, hero, eq, VIEW]) => {
    const S = window.__spm; if (eq) S.P.eq = JSON.parse(eq);
    const seq = { idle: [0, 1, 2, 3], walk: [0, 1, 2, 3, 4, 5, 6, 7], wind: [0, 1, 2], atk: [0, 1, 2] };
    if (hero) { seq.idle = [0, 1, 2, 3]; seq.walk = [0, 1, 2, 3, 4, 5, 6, 7]; seq.wind = [0, 1, 2, 3]; seq.atk = [0, 1, 2, 3]; }
    const get = (po, ph) => hero ? S.heroFrame(type, po === 'wind' ? 'cast' : po, ph, VIEW) : S.monFrame(type, 'show', Object.assign({}, S.MPAL[type] || {}), po, ph, VIEW);
    const all = []; for (const po in seq) for (const ph of seq[po]) all.push([po, ph, get(po, ph)]);
    const DEN = (all[0][2].c._hr ? all[0][2].c._hr.width / all[0][2].w : 1), fw = all[0][2].w * DEN * Z, fh = all[0][2].h * DEN * Z, cols = 6;
    const cv = document.createElement('canvas'); cv.width = cols * (fw + 6) + 6; cv.height = Math.ceil(all.length / cols) * (fh + 6) + 6; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
    all.forEach(([po, ph, fr], i) => { const X = 6 + (i % cols) * (fw + 6), Y = 6 + Math.floor(i / cols) * (fh + 6); x.fillStyle = '#23282a'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c._hr || fr.c, X, Y, fw, fh); x.fillStyle = '#6f6a79'; x.font = '12px monospace'; x.fillText(po + ' ' + ph, X + 4, Y + 14); });
    const one = fr => { const c = document.createElement('canvas'); c.width = fw; c.height = fh; const q = c.getContext('2d'); q.imageSmoothingEnabled = false; q.fillStyle = '#23282a'; q.fillRect(0, 0, fw, fh); q.drawImage(fr.c._hr || fr.c, 0, 0, fw, fh); return c.toDataURL(); };
    const pick = (po) => all.filter(a => a[0] === po).map(a => one(a[2]));
    return { sheet: cv.toDataURL(), walk: pick('walk'), idle: pick('idle'), atk: [...pick('idle').slice(0, 1), ...pick('wind'), ...pick('atk')] };
  }, [type, Z, hero, process.argv[6] || '', process.env.VIEW || 'front']);
  const fs = require('fs'); const w = (n, d) => fs.writeFileSync(n, Buffer.from(d.split(',')[1], 'base64'));
  w(out + '.png', data.sheet);
  for (const k of ['walk', 'idle', 'atk']) data[k].forEach((d, i) => w(`/tmp/${require('path').basename(out)}_${k}${i}.png`, d));
  fs.writeFileSync('/tmp/' + require('path').basename(out) + '_n.json', JSON.stringify({ walk: data.walk.length, idle: data.idle.length, atk: data.atk.length }));
  console.log(errs); await b.close();
})();
