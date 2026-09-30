const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 for (const cls of ['ossumancer', 'animancer', 'hemomancer', 'miasmancer', 'monk']) for (const mode of ['test', 'new']) {
   await ev(([c, m]) => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame(m === 'test' ? 'test' : 'new'); }, [cls, mode]); await wait(900);
   const r = await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; return { run: S.G.running, div: !!S.G.divine, x: S.P.x, y: S.P.y }; });
   if (!r.run) { console.log(cls, mode, 'not running', JSON.stringify(r)); continue; }
   await p.mouse.move(1300, 600); await p.mouse.down(); await wait(900); await p.mouse.up(); await wait(200);
   const r2 = await ev(() => { const S = window.__spm; return { x: S.P.x, y: S.P.y, path: !!S.P.path, st: S.P.stam, cast: S.P.cast, swing: S.P.swing }; });
   console.log(cls, mode, 'moved', Math.hypot(r2.x - r.x, r2.y - r.y).toFixed(2), JSON.stringify(r2));
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
