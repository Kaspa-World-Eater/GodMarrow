const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'hemomancer'); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; G.msgT = 0; G.bannerT = 0; G.zone.qSafeC = null;
   const m = S.makeMon('knight', P.x + 1.2, P.y, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none' }; m.spd = 0; G.zone.monsters.push(m); window.__m = m; });
 const out = [];
 for (let i = 0; i < 4; i++) {
   const r = await p.evaluate(() => { const S = window.__spm, P = S.P, m = window.__m; const h0 = m.hp; P.cast = 0; S.swingNow(m); return { n: window.__chain.CH.n, dmg: Math.round(h0 - m.hp), cast: +P.cast.toFixed(2), d: +Math.hypot(m.x - P.x, m.y - P.y).toFixed(2) }; });
   out.push(r); await p.waitForTimeout(i === 1 ? 120 : 650);
   if (i === 2) await p.screenshot({ path: '/tmp/chain3.png' });
 }
 await p.waitForTimeout(1200);
 out.push(await p.evaluate(() => { const S = window.__spm, P = S.P, m = window.__m; P.cast = 0; S.swingNow(m); return { afterPause: window.__chain.CH.n }; }));
 console.log(JSON.stringify(out));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
