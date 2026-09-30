const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto('file:///tmp/env32.html'); await p.waitForTimeout(300);
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); }); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const Z = window.__zt, z = window.__spm.G.zone; const t0 = performance.now(); for (let i = 0; i < 10; i++) Z.ztPaintChunk(z, 3 + i, 5); const t1 = performance.now(); for (let i = 0; i < 20; i++) Z.ztWallBlock(z, 10 + i, 0, 5, false); const t2 = performance.now(); for (let k = 0; k < 12; k++) Z.ztTreeFrame(k, 7); const t3 = performance.now(); return { chunk: (t1 - t0) / 10, wall: (t2 - t1) / 20, tree: (t3 - t2) / 12 }; });
  console.log(r);
  // frame time of the render loop alone
  const ft = await p.evaluate(() => new Promise(res => { const ts = []; let last = performance.now(); const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (ts.length < 120) requestAnimationFrame(f); else res(ts.slice(10).sort((a, b) => a - b)[55]); }; requestAnimationFrame(f); }));
  console.log('median frame ms', ft); await b.close();
})();
