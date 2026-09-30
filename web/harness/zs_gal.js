// zs gallery: rows of gear configs x selected frames, for one class. usage: HTML=.. node zs_gal.js cls Z out
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const [cls, Z, out] = [process.argv[2], +process.argv[3], process.argv[4]];
  const cfgs = [
    {},
    { weapon: { base: 'dagger' } },
    { body: { base: 'robe' }, weapon: { base: 'staff' } },
    { body: { base: 'robe' }, head: { base: 'hood' }, weapon: { base: 'wand' } },
    { body: { base: 'mail' }, head: { base: 'mask' }, weapon: { base: 'claw' } },
    { body: { base: 'mail', q: 'rare' }, head: { base: 'hood' }, weapon: { base: 'talons' } },
    { body: { base: 'mail' }, weapon: { base: 'staff' } },
    { body: { base: 'robe', q: 'unique' }, head: { base: 'mask' }, weapon: { base: 'dagger' } },
  ];
  const d = await p.evaluate(([cls, Z, cfgs]) => {
    const S = window.__spm, fr = [['idle', 0], ['walk', 1], ['walk', 3], ['walk', 5], ['walk', 7], ['cast', 1], ['cast', 2], ['atk', 1], ['atk', 2]];
    const fw = 46 * Z, fh = 52 * Z, cv = document.createElement('canvas'); cv.width = fr.length * (fw + 4) + 4 + 46 * 2 * 2; cv.height = cfgs.length * (fh + 4) + 4;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
    cfgs.forEach((c, r) => {
      S.P.eq = c; fr.forEach(([po, ph], i) => { const f = S.heroFrame(cls, po, ph); x.fillStyle = '#23282a'; x.fillRect(4 + i * (fw + 4), 4 + r * (fh + 4), fw, fh); x.drawImage(f.c, 4 + i * (fw + 4), 4 + r * (fh + 4), fw, fh); });
      const f = S.heroFrame(cls, 'idle', 0), X = 4 + fr.length * (fw + 4); x.fillStyle = '#3a3a30'; x.fillRect(X, 4 + r * (fh + 4), 46 * 2 + 46, fh);
      x.drawImage(f.c, X, 4 + r * (fh + 4)); x.drawImage(f.c, X + 46, 4 + r * (fh + 4), 92, 104);
    });
    return cv.toDataURL();
  }, [cls, Z, cfgs]);
  require('fs').writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(errs); await b.close();
})();
