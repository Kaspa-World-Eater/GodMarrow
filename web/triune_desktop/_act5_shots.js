// Act 5 in-game screenshots at 1920x1080: each zone, standing at an interesting spot.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const OUT = process.env.OUT || '/tmp/act5_shots'; fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.env.HTML); await p.waitForTimeout(600);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(c => { const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'ossumancer');
  await p.waitForTimeout(700);
  const where = JSON.parse(process.env.WHERE || '{}');
  const zones = (process.env.ZONES || 'a5_town,a5_highway,a5_siphon,a5_skerries,a5_valves,a5_shaft,a5_crucible,a5_cerebrum,a5_lair,a5_scar,a5_monolith').split(',');
  for (const zid of zones) {
    const info = await ev(([zid, w]) => {
      const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false;
      S.enterZone(zid, null, 0);
      const z = S.G.zone, P = S.P; P.hp = 1e6;
      let at = (w[zid] && typeof w[zid][0] === 'number') ? { x: w[zid][0], y: w[zid][1] } : (z.lanterns[1] || z.lanterns[0] || z.start);
      if (w[zid] === 'boss' && z.bossSpot) at = { x: z.bossSpot.x, y: z.bossSpot.y + 6 };
      if (Array.isArray(w[zid]) && w[zid][0] === 'near') { const [, tt, fx, fy] = w[zid], tx = z.w * fx, ty = z.h * fy; let bd = 1e9; for (let y = 3; y < z.h - 3; y++) for (let x = 3; x < z.w - 3; x++) if (z.t[y * z.w + x] === tt) { const d = Math.hypot(x - tx, y - ty); if (d < bd) { bd = d; at = { x: x + 0.5, y: y + 0.5 }; } } }
      P.x = at.x; P.y = at.y + 1.2; P.path = null;
      for (const m of z.monsters) { if (Math.hypot(m.x - P.x, m.y - P.y) < 9) { m.state = 'idle'; } }
      if (typeof S.G.shake === 'number') S.G.shake = 0;
      return { zone: z.id, name: z.name, at: [Math.round(P.x), Math.round(P.y)] };
    }, [zid, where]);
    await p.waitForTimeout(+(process.env.WAIT || 6000));
    await ev(() => { const S = window.__spm; S.G.bannerT = 0; S.G.msgT = 0; for (const m of S.G.zone.monsters) if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 6) m.state = 'idle'; });
    await p.waitForTimeout(150);
    await p.screenshot({ path: OUT + '/' + zid + '.png' });
    if (process.env.MAPS) { await ev(() => { const S = window.__spm; S.G.zone.explored.fill(1); S.G.panels.map = true; }); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/' + zid + '_map.png' }); await ev(() => { window.__spm.G.panels.map = false; }); }
    console.log(JSON.stringify(info));
  }
  console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 6).join('\n') : 'none');
  await b.close();
})();
