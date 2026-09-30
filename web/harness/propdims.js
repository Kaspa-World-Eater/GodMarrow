const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(600);
 console.log(await p.evaluate(() => { const Z = window.__zt, o = [];
  for (const k of Z.OBJS) { const f = Z.obj(k, 0); o.push(`o:${k} ${f.w}x${f.h} foot ${f.ox},${f.oy}`); }
  for (const k of ['grave', 'rubble', 'bell', 'arch', 'pillar', 'coffin', 'cairn', 'stump', 'brazier']) { const f = Z.prop(k, 0); o.push(`${k} ${f.w}x${f.h} foot ${f.ox},${f.oy}`); }
  for (let t = 0; t < Z.TREE_N; t++) { const f = Z.tree(t, 3); o.push(`t${t} ${f.w}x${f.h} foot ${f.ox},${f.oy}`); }
  return o.join('\n'); }));
 await b.close(); })();
