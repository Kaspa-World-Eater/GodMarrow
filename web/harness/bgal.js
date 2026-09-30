// back-view gallery: rows = gear sets, cols = poses. usage: HTML=... node bgal.js <class> <Z> <out.png> [view]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(300);
  const [cls, Z, out, view] = [process.argv[2], +(process.argv[3] || 4), process.argv[4], process.argv[5] || 'back'];
  const d = await p.evaluate(([cls, Z, view]) => {
    const S = window.__spm;
    const gears = [
      {},
      { body: { base: 'robe' }, weapon: { base: 'dagger' } },
      { body: { base: 'robe' }, head: { base: 'hood' }, weapon: { base: 'staff' } },
      { body: { base: 'mail' }, weapon: { base: 'wand' } },
      { body: { base: 'mail', q: 'rare' }, head: { base: 'mask' }, weapon: { base: 'claw' } },
      { body: { base: 'mail' }, head: { base: 'hood' }, weapon: { base: 'dagger' } },
    ];
    const poses = [['idle', 0], ['walk', 0], ['walk', 2], ['walk', 4], ['walk', 6], ['cast', 1], ['cast', 2], ['atk', 0], ['atk', 1], ['atk', 2], ['atk', 3]];
    const fw = 46 * Z, fh = 52 * Z, cv = document.createElement('canvas'); cv.width = poses.length * (fw + 4) + 4; cv.height = gears.length * (fh + 4) + 4;
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
    gears.forEach((eq, r) => { S.P.eq = eq; poses.forEach(([po, ph], c) => { const fr = S.heroFrame(cls, po, ph, view); const X = 4 + c * (fw + 4), Y = 4 + r * (fh + 4); x.fillStyle = '#23282a'; x.fillRect(X, Y, fw, fh); x.drawImage(fr.c._hr || fr.c, X, Y, fw, fh); }); });
    return cv.toDataURL();
  }, [cls, Z, view]);
  require('fs').writeFileSync(out, Buffer.from(d.split(',')[1], 'base64')); console.log(errs); await b.close();
})();
