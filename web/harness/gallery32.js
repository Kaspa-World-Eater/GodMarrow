const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  const d = await p.evaluate(() => {
    const S = window.__spm, Z = 3;
    const mons = ['hollow', 'hand', 'weeper', 'gasp', 'bloat', 'worm', 'moth', 'pyre', 'bell', 'warden', 'duelist', 'hbone', 'hflesh', 'hbreath', 'hhollow', 'boss'];
    const heroes = [['hemomancer', { body: { base: 'robe' }, weapon: { base: 'dagger' } }], ['animancer', { body: { base: 'robe' }, weapon: { base: 'staff' } }], ['ossumancer', { body: { base: 'mail', q: 'rare' }, weapon: { base: 'wand' } }], ['miasmancer', { body: { base: 'robe' }, head: { base: 'mask' }, weapon: { base: 'claw' } }]];
    const frs = mons.map(t => S.monFrame(t, 'gal', Object.assign({}, S.MPAL[t] || {}), 'idle', 0));
    const hf = heroes.map(([c, eq]) => { S.P.eq = eq; return S.heroFrame(c, 'idle', 0); });
    const all = hf.concat(frs); let W = 0; const rows = [all.slice(0, 11), all.slice(11)];
    const rw = rows.map(r => r.reduce((a, f) => a + f.w + 6, 6)), rh = rows.map(r => Math.max(...r.map(f => f.h)) + 8);
    const cv = document.createElement('canvas'); cv.width = Math.max(...rw) * Z; cv.height = (rh[0] + rh[1]) * Z; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#231a14'; x.fillRect(0, 0, cv.width, cv.height);
    let y = 0; rows.forEach((r, ri) => { let X = 6; for (const f of r) { x.drawImage(f.c, X * Z, (y + rh[ri] - f.h - 4) * Z, f.w * Z, f.h * Z); X += f.w + 6; } y += rh[ri]; });
    return cv.toDataURL();
  });
  require('fs').writeFileSync('/mnt/user-data/outputs/bestiary32.png', Buffer.from(d.split(',')[1], 'base64')); console.log(errs); await b.close();
})();
