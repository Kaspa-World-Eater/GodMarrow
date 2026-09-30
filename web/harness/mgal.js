const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300); if (process.argv[4]) await p.evaluate(a => { window.__S0 = a; window.__P0 = [['idle', 0], ['walk', 1], ['wind', 0], ['atk', 0]]; }, process.argv[4]);
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  await p.evaluate((only) => {
    const S = window.__spm; const types = only || Object.keys(S.MPAINT);
    const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 1000; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
    document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#3a3440'; x.fillRect(0, 0, 1400, 1000);
    let py = 10; const poses = [...(window.__P0 || [['idle', 0], ['idle', 1], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['wind', 0], ['atk', 0]])];
    for (const t of types) { let px = 10, mh = 0; const S0 = +(window.__S0 || (t === 'boss' ? 3 : 4));
      for (const [po, ph] of poses) { const fr = S.monFrame(t, 'g', S.MPAL[t], po, ph); x.drawImage(fr.c, px, py, fr.w * S0, fr.h * S0); px += fr.w * S0 + 6; mh = Math.max(mh, fr.h * S0); }
      py += mh + 8; }
  }, only);
  await p.screenshot({ path: process.argv[2] || 'mgal.png' }); console.log(errs); await b.close();
})();
