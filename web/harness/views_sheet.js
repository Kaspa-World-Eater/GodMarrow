// every hero: rows = views (front, side, down, back, up) x walk 0-7, plus idle/cast/atk; scaled 3x
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/' + (process.env.SRC || 'spiritmancer.html'));
  const out = process.argv[2] || 'views', CLS = (process.argv[3] || 'animancer,hemomancer,ossumancer,miasmancer').split(',');
  for (const cls of CLS) {
    await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls); await p.waitForTimeout(400);
    const url = await p.evaluate(cls => {
      const S = window.__spm, V = ['front', 'side', 'down', 'back', 'up'], cols = [];
      for (let i = 0; i < 8; i++) cols.push(['walk', i]); cols.push(['idle', 0], ['cast', 2], ['atk', 2]);
      const K = 3, W = 46 * K, H = 52 * K, c = document.createElement('canvas'); c.width = 90 + cols.length * W; c.height = V.length * H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.fillStyle = '#333'; x.fillRect(0, 0, c.width, c.height);
      V.forEach((v, r) => { x.fillStyle = '#fff'; x.font = '20px monospace'; x.fillText(v, 8, r * H + 80); cols.forEach(([po, ph], ci) => { const fr = S.heroFrame(cls, po, ph, v); x.fillStyle = (ci + r) % 2 ? '#5c5c64' : '#66666e'; x.fillRect(90 + ci * W, r * H, W, H); x.drawImage(fr.c, 90 + ci * W, r * H, W, H); }); });
      return c.toDataURL();
    }, cls);
    require('fs').writeFileSync(`${out}_${cls}.png`, Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('errors', errs.slice(0, 5)); await b.close();
})();
