const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); });
  await p.waitForTimeout(600);
  for (const zn of ['moor', 'fen']) {
    await p.evaluate(z => window.__spm.enterZone(z), zn); await p.waitForTimeout(500);
    console.log(zn, await p.evaluate(() => { const z = window.__spm.G.zone, c = {}; for (const o of z.objects) c[o.type] = (c[o.type] || 0) + 1; const t = {}; for (const v of z.t) t[v] = (t[v] || 0) + 1; return JSON.stringify({ w: z.w, h: z.h, objs: c, props: (z.props || []).length, deco: (z.deco || []).length, mons: z.monsters.length, tiles: t, keys: Object.keys(z).join(',') }); }));
  }
  await b.close();
})();
