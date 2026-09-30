const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 const z = process.env.ZONE || 'hollow_wood';
 const r = await p.evaluate(z => { const S = window.__spm; S.enterZone(z); for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; S.G.bannerT = 0; S.G.zone.monsters.forEach(m => { m.hidden = true; });
   const Z = S.G.zone; let best = null;
   for (let y = (Z.h >> 1) - 20; y < Z.h - 10 && !best; y++) for (let x = (Z.w >> 1) - 20; x < Z.w - 10; x++) { if (Z.get(x, y) !== 2) continue; const k = window.__zt.treeKind(Z, x, y); if (k > 5) continue;
     // walkable tile just behind (north-west of) it
     const bx = x - 1, by = y - 1; if (Z.get(bx, by) === 2 || Z.get(bx - 1, by) === 2) continue; best = { x, y, bx, by }; break; }
   const P = window.__zt.P(); if (best) { P.x = best.bx + 0.5; P.y = best.by + 0.5 - (+(window.__dy || 0)); }
   return best; }, z);
 await p.waitForTimeout(3500); await p.screenshot({ path: `/tmp/ogf_${z}.png` }); console.log(JSON.stringify(r));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
