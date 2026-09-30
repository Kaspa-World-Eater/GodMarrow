const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); }); await p.waitForTimeout(800);
 const r = await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; G.zone.qSafeC = null; for (const k in G.panels) G.panels[k] = false;
   const fr = window.__kneeler.frame(0); const c = fr.c._hr; const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
   // the most common opaque colour in frame 0
   const cnt = {}; for (let i = 0; i < x.length; i += 4) if (x[i + 3]) { const k = x[i] + ',' + x[i + 1] + ',' + x[i + 2]; cnt[k] = (cnt[k] || 0) + 1; }
   const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
   return { w: c.width, h: c.height, lo: [fr.c.width, fr.c.height], top }; });
 console.log(JSON.stringify(r));
 await b.close(); })();
