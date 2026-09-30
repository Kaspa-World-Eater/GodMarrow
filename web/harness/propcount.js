const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(600);
 for (const z of (process.env.ZONES || 'moor,crypt').split(',')) { await p.evaluate(z => window.__spm.enterZone(z), z); await p.waitForTimeout(700);
  console.log(z, await p.evaluate(() => { const S = window.__spm, c = {}; (S.G.props16 || []).forEach(o => c[o.kind] = (c[o.kind] || 0) + 1); return JSON.stringify(c) + ' G.props16=' + !!S.G.props16 + ' keys:' + Object.keys(S.G).filter(k => /prop/i.test(k)).join(','); })); }
 await b.close(); })();
