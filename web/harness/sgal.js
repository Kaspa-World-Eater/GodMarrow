const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  await p.evaluate(() => {
    const S = window.__spm, cv = document.createElement('canvas'); cv.width = 1400; cv.height = 1000; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
    document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#3a3440'; x.fillRect(0, 0, 1400, 1000);
    const loads = ['shield', 'greatsword', 'halberd', 'flail', 'bow', 'mage'], poses = [['idle', 0], ['walk', 0], ['walk', 2], ['wind', 0], ['atk', 0], ['atk', 1], ['atk', 2]];
    let py = 5; for (const l of loads) { let px = 5; for (const [po, ph] of poses) { const fr = S.skelFrame(l, po, ph); x.drawImage(fr.c, px, py, fr.w * 5, fr.h * 5); px += fr.w * 5 + 4; } py += 30 * 5 + 2; }
  });
  await p.screenshot({ path: 'sgal.png' }); console.log(errs); await b.close();
})();
