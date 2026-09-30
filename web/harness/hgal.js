const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const S = window.__spm, cv = document.createElement('canvas'); cv.width = 1400; cv.height = 1000; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
    document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#3a3440'; x.fillRect(0, 0, 1400, 1000);
    const cls = ['animancer', 'ossumancer', 'hemomancer', 'miasmancer'], poses = [['idle', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['cast', 1], ['atk', 0], ['atk', 1]];
    let py = 0; for (const c of cls) { let px = 0; for (const [po, ph] of poses) { const fr = S.heroFrame(c, po, ph); x.drawImage(fr.c, px, py - 40, fr.w * 5, fr.h * 5); px += fr.w * 5 - 10; } py += 38 * 5 - 20; }
  });
  await p.screenshot({ path: 'hgal.png' }); console.log(errs); await b.close();
})();
