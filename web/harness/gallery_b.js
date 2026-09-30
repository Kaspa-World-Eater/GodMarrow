const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/before.html'); await p.waitForTimeout(300);
  const names = await p.evaluate(() => {
    const SPR = window.__spm.SPR; const keys = Object.keys(SPR).filter(k => SPR[k] && SPR[k].c);
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 900; cv.id = 'gal'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#2a2630;image-rendering:pixelated';
    document.body.appendChild(cv); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#34303a'; x.fillRect(0, 0, 1200, 900);
    let px = 10, py = 10, rowH = 0; x.font = '10px monospace'; x.fillStyle = '#ddd';
    for (const k of keys) { const s = SPR[k], S = 4; if (px + s.w * S > 1190) { px = 10; py += rowH + 20; rowH = 0; } x.drawImage(s.c, px, py, s.w * S, s.h * S); x.fillStyle = '#ddd'; x.fillText(k, px, py + s.h * S + 12); px += Math.max(s.w * S, 50) + 14; rowH = Math.max(rowH, s.h * S); }
    return keys;
  });
  await p.screenshot({ path: process.argv[2] || 'gallery.png' }); console.log(names.join(' '), errs); await b.close();
})();
