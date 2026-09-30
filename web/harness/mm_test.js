// mask close-ups: the monk's head, front/side/back, at each of the 5 sky buckets (0 = noon .. 4 = midnight), 8x
// usage: HTML=/tmp/x.html node mm_test.js out.png [pose] [ph]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const H = process.env.HTML; await p.goto('file://' + H); await p.waitForTimeout(300);
  const out = process.argv[2] || '/tmp/mm_mask.png', pose = process.argv[3] || 'idle', ph = +(process.argv[4] || 0);
  const data = await p.evaluate(([pose, ph, ZZ]) => {
    const Z = ZZ, views = ['front', 'side', 'back', 'down'], CW = 32, CH = 28, cv = document.createElement('canvas');
    cv.width = views.length * (CW * Z + 8) + 8; cv.height = 5 * (CH * Z + 8) + 8; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#16191b'; x.fillRect(0, 0, cv.width, cv.height);
    for (let n = 0; n < 5; n++) views.forEach((v, vi) => {
      const g = window.__spm.heroGear(); g.night = n; g.wt = 1; g.glow = 'r'; g.obs = false; g.eye = false; if (g.wpn && !['wraps', 'iwraps', 'spade', 'shakujo'].includes(g.wpn)) g.wpn = null;
      const fr = window.__mkFrame(pose, ph, v, g), X = 8 + vi * (CW * Z + 8), Y = 8 + n * (CH * Z + 8);
      x.fillStyle = '#23282a'; x.fillRect(X, Y, CW * Z, CH * Z);
      x.drawImage(fr.c, 44 - CW / 2, 14, CW, CH, X, Y, CW * Z, CH * Z);
      x.fillStyle = '#c0b8c8'; x.font = '14px monospace'; x.fillText(v + ' n' + n, X + 4, Y + 16);
    });
    return cv.toDataURL();
  }, [pose, ph, +(process.env.Z || 8)]);
  require('fs').writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  console.log(errs); await b.close();
})();
