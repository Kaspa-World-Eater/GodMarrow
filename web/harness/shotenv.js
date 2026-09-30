// env32 screenshots: HTML=/tmp/env32.html [NIGHT=1] [NEAR=tree|wall|palisade|cliff|pillar|ruin|water|shallow|mud|flags|road] [OBJ=chest|shrine|lantern|portal|vendor|altar|statue]
// node shotenv.js <cls> <zone|-> <out.png> [spawn]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.DSF || 1) });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  const cls = process.argv[2] || 'hemomancer', zone = process.argv[3] || null, out = process.argv[4] || 'shot.png';
  await ev(c => { localStorage.removeItem('spiritmancer.test'); window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, cls); await wait(500);
  if (zone && zone !== '-') { await ev(z => window.__spm.enterZone(z), zone); await wait(600); }
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6; for (const m of S.G.zone.monsters) m.hidden = true; });
  if (process.env.NIGHT) await ev(() => { window.__spm.G.clock = 600 * 0.75; });
  if (process.env.NEAR || process.env.OBJ) {
    const r = await ev(([near, obj, skip]) => {
      const S = window.__spm, z = S.G.zone, T = S.T, P = S.P;
      let best = null, bs = -1, k = 0;
      if (obj) { const os = z.objects.filter(o => o.type === obj); const o = os[skip % Math.max(1, os.length)]; if (o) best = { x: o.x + 1.5, y: o.y + 1.5 }; }
      else {
        const want = T[near.toUpperCase()]; const cands = []; const hash2 = c => Math.abs(Math.sin(c[1] * 12.9898 + c[2] * 78.233) * 43758.5453) % 1;
        for (let y = 4; y < z.h - 4; y++) for (let x = 4; x < z.w - 4; x++) {
          if (z.solidAt(x + 0.5, y + 0.5)) continue;
          let n = 0; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (z.get(x + i, y + j) === want) n++;
          if (n > 0 && n < (near === 'tree' ? 7 : 99)) cands.push([n, x, y]);
        }
        cands.sort((a, b) => b[0] - a[0] || hash2(a) - hash2(b)); const c = cands[Math.min(cands.length - 1, skip * 7)]; if (c) best = { x: c[1] + 0.5, y: c[2] + 0.5 };
      }
      if (best) { P.x = best.x; P.y = best.y; }
      return best;
    }, [process.env.NEAR || '', process.env.OBJ || '', +(process.env.SKIP || 0)]);
    console.log('moved to', r);
  }
  const spawn = process.argv[5];
  if (spawn) await ev(list => { const S = window.__spm, P = S.P; list.split(',').forEach((t, i) => { const m = S.makeMon(t, P.x + 2 + (i % 4) * 1.1, P.y - 2 + Math.floor(i / 4) * 1.4, 5, 'normal', []); m.state = 'idle'; m.hp = m.max = 9999; m.hidden = false; S.G.zone.monsters.push(m); }); }, spawn);
  await wait(+(process.env.WAIT || 4200));
  await p.screenshot({ path: out });
  const fps = await ev(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  console.log('fps', fps, errs.slice(0, 5)); await b.close();
})();
