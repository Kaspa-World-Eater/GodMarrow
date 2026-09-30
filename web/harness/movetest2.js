const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); }); await wait(900);
 for (const sk of ['batk', 'blade', 'crush', 'bscythe', 'lash', 'leap', 'gcharge', 'spear', 'raise', 'aura', 'host', 'attack']) {
   const r = await ev(sk => { const S = window.__spm, P = S.P; for (const k in S.G.panels) S.G.panels[k] = false; P.x = 18; P.y = 18; P.path = null; P.target = null; if (S.SK[sk]) { P.skills[sk] = Math.max(1, P.skills[sk] || 0); } P.left = sk; return { x: P.x, y: P.y, has: !!S.SK[sk] }; }, sk);
   if (!r.has) { console.log(sk, 'no skill'); continue; }
   await p.mouse.move(1300, 600); await p.mouse.down(); await wait(700); await p.mouse.up(); await wait(150);
   const r2 = await ev(() => { const S = window.__spm, P = S.P; return { x: P.x, y: P.y, cast: +P.cast.toFixed(2), swing: +(P.swing||0).toFixed(2) }; });
   console.log(sk.padEnd(8), 'moved', Math.hypot(r2.x - r.x, r2.y - r.y).toFixed(2), JSON.stringify(r2));
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
