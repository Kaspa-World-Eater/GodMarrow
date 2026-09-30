const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 for (const cls of (process.env.CLS || 'hemomancer').split(',')) {
 await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls); await wait(800);
 await ev(() => { const S = window.__spm, G = S.G; for (const k in G.panels) G.panels[k] = false; G.msgT = 0; G.bannerT = 0; });
 await wait(300); await p.screenshot({ path: `/tmp/ig_${cls}.png` });
 if (process.env.WALK) { await ev(() => { const S = window.__spm; S.P.path = null; }); await p.mouse.move(1200, 700); await p.mouse.down(); await wait(500); await p.screenshot({ path: `/tmp/ig_${cls}_walk.png` }); await p.mouse.up(); }
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
