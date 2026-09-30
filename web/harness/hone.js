const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 420 } });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(300);
  await p.evaluate(() => { const S = window.__spm, cv = document.createElement('canvas'); cv.width = 900; cv.height = 420; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99'; document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#3a3440'; x.fillRect(0, 0, 900, 420);
    [['idle', 0], ['cast', 1], ['atk', 1]].forEach(([po, ph], i) => { const fr = S.heroFrame('hemomancer', po, ph); x.drawImage(fr.c, i * 300 - 40, -40, fr.w * 11, fr.h * 11); }); });
  await p.screenshot({ path: 'hone.png' }); await b.close();
})();
