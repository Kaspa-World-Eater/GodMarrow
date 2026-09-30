// place the hero on a free tile at the edge of the densest trees (so a forest fills the view); shot per ZONE and PHASE
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 for (const z of (process.env.ZONES || 'moor').split(',')) {
   await p.evaluate(z => window.__zt.ez(z), z); await p.waitForTimeout(500);
   const r = await p.evaluate(nth => { const S = window.__spm, Z = S.G.zone; for (const k in S.G.panels) S.G.panels[k] = false; Z.monsters.forEach(m => { m.hidden = true; });
     const c = []; for (let y = 12; y < Z.h - 12; y += 2) for (let x = 12; x < Z.w - 12; x += 2) { const t = Z.get(x, y); if (t === 2 || t === 3 || t === 4 || t === 5) continue; let n = 0, m = 0; for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) { const q = Z.get(x + i, y + j); if (q === 2) n++; if (q === 4 || q === 5) m++; } if (m < 10) c.push([n, x, y]); }
     c.sort((a, b) => b[0] - a[0]); const pick = c[Math.min(c.length - 1, nth * 17)]; const P = window.__zt.P(); P.x = pick[1] + 0.5; P.y = pick[2] + 0.5; return pick; }, +(process.env.NTH || 0));
   for (const ph of (process.env.PHASES || '0.3').split(',').map(Number)) {
     await p.evaluate(ph => { const S = window.__spm; S.G.clock = window.__zt.DAY().len * ph; S.G.msgT = 0; S.G.bannerT = 0; }, ph);
     await p.waitForTimeout(2200); await p.screenshot({ path: `/tmp/fs_${z}_${ph}${process.env.TAG || ''}.png` });
   }
   console.log(z, JSON.stringify(r));
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
