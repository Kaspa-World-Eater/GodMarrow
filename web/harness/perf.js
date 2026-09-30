const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto('file://' + process.cwd() + '/' + (process.argv[2] || 'spiritmancer.html'));
  await p.evaluate(() => { window.__spm.G.pickCls = 'ossumancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => new Promise(res => { let n = 0, worst = 0, lt = performance.now(); const t0 = lt; const f = () => { const t = performance.now(); worst = Math.max(worst, t - lt); lt = t; n++; if (t - t0 < 4000) requestAnimationFrame(f); else res({ fps: n / 4, worst }); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify(r)); await b.close();
})();
