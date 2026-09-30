const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'ossumancer'); await p.waitForTimeout(900);
 await p.evaluate(z => { window.__spm.enterZone(z); }, process.env.ZONE || 'hollow_wood'); await p.waitForTimeout(700);
 const clean = () => p.evaluate(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { m.hidden = true; }); S.G.msgT = 0; S.G.bannerT = 0; S.G.lowFx = false; });
 await clean(); await p.evaluate(([dk, near]) => { window.__spm.G.clock = window.__zt.DAY().len * dk; const S = window.__spm; const z = S.G.zone; S.P.x = (z.w || 60) / 2; S.P.y = (z.h || 60) / 2;
   if (near) { let best = null, bd = 1e9; const W = z.w || 60, H = z.h || 60; for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { if (z.get(x, y) !== 2) continue; let n = 0; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (z.get(x + i, y + j) === 2) n++; if (n < 4 || n > 18) continue; const d = Math.hypot(x - W / 2, y - H / 2); if (d < bd && !z.solidAt(x + 2.5, y + 2.5)) { bd = d; best = [x + 2.5, y + 2.5]; } } if (best) { S.P.x = best[0]; S.P.y = best[1]; } } }, [+(process.env.DAYK || 0.35), !!process.env.NEAR]);
 await p.waitForTimeout(1500);
 const W = +(process.env.W || 360), H = +(process.env.H || 300), clip = { x: 960 - W / 2, y: 480 - H / 2, width: W, height: H };
 let n = 0; const seq = (process.env.SEQ || 'idle:14,d:22,idle:14,s:22,w:22').split(',');
 const dirs = { d: [260, 60], s: [-60, 200], w: [60, -200], a: [-260, -60] };
 const shot = async () => { await clean(); await p.waitForTimeout(+(process.env.DT || 80)); await p.screenshot({ path: `/tmp/ossport/g_${String(n++).padStart(3, '0')}.png`, clip }); };
 for (const s of seq) {
   const [k, c] = s.split(':');
   if (k === 'atk' || k === 'rmb') {
     await p.mouse.move(1150, 500);
     if (k === 'atk') { await p.keyboard.down('Shift'); await p.mouse.down(); } else await p.mouse.down({ button: 'right' });
     for (let i = 0; i < +c; i++) await shot();
     if (k === 'atk') { await p.mouse.up(); await p.keyboard.up('Shift'); } else await p.mouse.up({ button: 'right' });
     continue;
   }
   if (k !== 'idle') { await p.mouse.move(960 + dirs[k][0], 540 + dirs[k][1]); await p.mouse.down(); }
   for (let i = 0; i < +c; i++) await shot();
   if (k !== 'idle') await p.mouse.up();
 }
 console.log(await p.evaluate(() => JSON.stringify(window.__dark64) + ' ' + window.__spm.dayK() + ' ' + window.__spm.G.lowFx2 + ' ' + window.__spm.G.error)); console.log('N', n, 'ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
