const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.DSF || 1) });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  const cls = process.argv[2] || 'hemomancer', zone = process.argv[3] || null, out = process.argv[4] || 'shot22.png';
  await ev(c => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, cls); await wait(500);
  if (zone && zone !== '-') { await ev(z => window.__spm.enterZone(z), zone); await wait(600); }
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6; });
  const spawn = process.argv[5];
  if (spawn) await ev(list => { const S = window.__spm, P = S.P; list.split(',').forEach((t, i) => { const m = S.makeMon(t, P.x + 2 + (i % 4) * 1.1, P.y - 2 + Math.floor(i / 4) * 1.4, 5, 'normal', []); m.state = 'idle'; m.hp = m.max = 9999; S.G.zone.monsters.push(m); }); }, spawn);
  await wait(1500);
  await p.screenshot({ path: out });
  const fps = await ev(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log('fps', fps, errs.slice(0, 5)); await b.close();
})();
