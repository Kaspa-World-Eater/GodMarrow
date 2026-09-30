// Act 5 checks: every zone on 3 seeds: generation, reachability, openness (five-wide core), no page errors.
const { chromium } = require('playwright');
const fs = require('fs'); const OUT = process.env.OUT || '/tmp/act5_maps'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await p.goto('file://' + process.env.HTML);
  await p.waitForTimeout(500);
  const ev = (f, a) => p.evaluate(f, a);
  await ev(() => { const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); });
  await p.waitForTimeout(600);
  const zones = await ev(() => window.__act5.zones);
  const seeds = (process.env.SEEDS || '1,7,12345').split(',').map(Number);
  let fail = 0;
  for (const zid of zones) for (const seed of seeds) {
    const r = await ev(([zid, seed]) => {
      const A = window.__act5, t0 = performance.now();
      let z; try { z = A.gen(zid, seed); } catch (e) { return { err: e.message + ' ' + (e.stack || '').split('\n')[1] }; }
      const ms = Math.round(performance.now() - t0);
      const w = A.widthReport(z), r = A.reach(z);
      const portals = z.objects.filter(o => o.type === 'portal').map(o => o.to);
      const types = {}; for (const m of z.monsters) types[m.type] = (types[m.type] || 0) + 1;
      const lv = z.monsters.map(m => m.mlvl);
      const T = window.__spm.T, C = document.createElement('canvas'), S = 4; C.width = z.w * S; C.height = z.h * S; const x = C.getContext('2d');
      const wet = z.theme === 'a5_crucible' ? ['#2e4a14', '#6a8a2a'] : z.theme === 'a5_sanguine' ? ['#5a0c10', '#9a3030'] : ['#10283a', '#3a6a7a'];
      const col = { [T.WALL]: '#161311', [T.FLOOR]: '#6e665a', [T.FLAGS]: '#948c80', [T.ROAD]: '#8a7656', [T.DIRT]: '#5a5248', [T.MUD]: '#4e3a32', [T.SHALLOW]: wet[1], [T.WATER]: wet[0], [T.CLIFF]: '#000000', [T.PILLAR]: '#e8e0c8', [T.ROCK]: '#a8a08c', 15: '#4a4260', [T.GRASS]: '#4a5a3a' };
      for (let j = 0; j < z.h; j++) for (let i = 0; i < z.w; i++) { x.fillStyle = col[z.t[j * z.w + i]] || '#ff00ff'; x.fillRect(i * S, j * S, S, S); }
      for (const m of z.monsters) { x.fillStyle = '#e03030'; x.fillRect(m.x * S - 2, m.y * S - 2, 4, 4); }
      for (const o of z.objects) { x.fillStyle = o.type === 'portal' ? '#ffe040' : o.type === 'lantern' ? '#ff9020' : o.type === 'chest' ? '#40a0ff' : o.type === 'shrine' ? '#40ffc0' : '#ffffff'; const q = o.type === 'portal' || o.type === 'lantern' ? 10 : 6; x.fillRect(o.x * S - q / 2, o.y * S - q / 2, q, q); }
      if (z.bossSpot) { x.strokeStyle = '#ff40ff'; x.lineWidth = 3; x.strokeRect(z.bossSpot.x * S - 10, z.bossSpot.y * S - 10, 20, 20); }
      for (const n of z.npcSpots || []) { x.fillStyle = '#40ff40'; x.fillRect(n.x * S - 5, n.y * S - 5, 10, 10); }
      const png = C.toDataURL('image/png');
      return { png, ms, size: z.w + 'x' + z.h, theme: z.theme, walk: w.walk, narrowPct: w.narrowPct, ridge: [w.ridgeMin, w.ridgeP10, w.ridgeMed], bottleneck: w.bottleneck, reached: r.reached === r.walkN, badObj: r.unreachableObjects, badMon: r.unreachableMonsters, boss: r.bossSpotOk, portals, lanterns: z.lanterns.length, mon: z.monsters.length, packs: z.a5packs, mlvl: lv.length ? [Math.min(...lv), Math.max(...lv)] : null, chests: z.objects.filter(o => o.type === 'chest').length, npc: z.npcSpots ? z.npcSpots.length : undefined, types };
    }, [zid, seed]);
    if (r.png) { fs.writeFileSync(OUT + '/' + zid + '_s' + seed + '.png', Buffer.from(r.png.split(',')[1], 'base64')); delete r.png; }
    const bad = r.err || !r.reached || r.badObj.length || r.badMon || r.narrowPct > (zid === 'a5_cerebrum' || zid === 'a5_lair' ? 2.5 : 1.5) || !(r.bottleneck >= 4.5) || r.boss === false;
    if (bad) fail++;
    console.log((bad ? 'FAIL ' : 'ok   ') + zid + ' s' + seed + ' ' + JSON.stringify(r));
  }
  // enter each zone for real and run a few seconds of play in it
  for (const zid of zones) {
    await ev(z => { const S = window.__spm; S.enterZone(z, null, 0); S.P.hp = 1e6; }, zid);
    await p.waitForTimeout(400);
  }
  // the natives: each runs its behaviour, and their marks land on the wanderer
  await ev(() => { const S = window.__spm; S.enterZone('a5_crucible', null, 0); S.G.zone.monsters.forEach(m => { m.x += 0; m.state = 'idle'; if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 16) m.dead = true; }); });
  const nat = await ev(() => window.__act5.natives); await ev(() => { const S = window.__spm; S.getD().maxHp = 1e6; S.P.hp = 1e6; });
  await ev(n => { const S = window.__spm, P = S.P; n.forEach((t, i) => { const a = i / n.length * 6.28, m = S.makeMon(t, P.x + Math.cos(a) * 3, P.y + Math.sin(a) * 3, 36, 'normal', []); if (S.G.zone.solidAt(m.x, m.y)) { m.x = P.x + 1; m.y = P.y; } m.state = 'chase'; S.G.zone.monsters.push(m); }); }, nat);
  const marks = new Set(); let minHp = 1e9;
  for (let k = 0; k < 16; k++) { const r = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); const f = P.a5fx || {}; const o = { bleed: f.bleedT > 0, daze: f.daze > 0, acid: f.acid > 0, cut: f.cut > 0, dead: P.dead }; D.maxHp = 1e6; P.hp = 1e6; return o; }); for (const k2 in r) if (r[k2]) marks.add(k2); await p.waitForTimeout(500); }
  const st = await ev(n => n.map(t => { const ms = window.__spm.G.zone.monsters.filter(m => m.type === t); const m0 = ms[ms.length - 1]; return t + ':' + (m0 ? (m0.dead ? 'dead' : m0.state) : 'none'); }), nat);
  console.log('NATIVES', JSON.stringify(st)); console.log('MARKS SEEN', [...marks].join(','));
  console.log('FAILS', fail);
  console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 10).join('\n') : 'none');
  await b.close();
})();
