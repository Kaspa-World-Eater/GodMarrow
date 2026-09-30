const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'hemomancer'); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; G.msgT = 0; G.bannerT = 0; G.zone.qSafeC = null;
   const m = S.makeMon('knight', P.x + 1.2, P.y, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none' }; m.spd = 0; G.zone.monsters.push(m); window.__m = m; });
 const out = await p.evaluate(() => { const S = window.__spm, P = S.P, m = window.__m, CH = window.__chain.CH; const sum = [0, 0, 0], cnt = [0, 0, 0];
   for (let k = 0; k < 60; k++) { P.cast = 0; CH.lastEnd = S.G.time; const h0 = m.hp; S.swingNow(m); const n = CH.n; sum[n] += h0 - m.hp; cnt[n]++; m.x = P.x + 1.2; m.y = P.y; }
   return sum.map((v, i) => Math.round(v / Math.max(1, cnt[i]))); });
 console.log(JSON.stringify(out));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
