const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); }); await wait(900);
 await ev(() => { const S = window.__spm, P = S.P, z = S.G.zone; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0;
   const mk = S.makeMon || window.makeMon; z.monsters = z.monsters.filter(m => Math.hypot(m.x - P.x, m.y - P.y) > 14);
   for (let i = 0; i < 3; i++) { const m = mk('kneeler', P.x + 3 + i * 1.3, P.y - 1 + i, 3); z.monsters.push(m); }
   P.iframe = 99; });
 await wait(1200); await p.screenshot({ path: '/tmp/kn1.png', clip: { x: 660, y: 260, width: 700, height: 460 } });
 await wait(1400); await p.screenshot({ path: '/tmp/kn2.png', clip: { x: 660, y: 260, width: 700, height: 460 } });
 console.log(await ev(() => window.__kneeler.ok), 'ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
