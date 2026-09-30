const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { const t = m.text(); if (m.type() === 'error') errs.push('console.error: ' + t); });
  await p.goto('file://' + process.env.HTML);
  const wait = ms => p.waitForTimeout(ms);
  const ev = (f, a) => p.evaluate(f, a);
  await wait(500);
  await ev(() => { const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); });
  await wait(600);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });

  const zoneOf = { moth_saint: 'hollow_wood', veinworm_elder: 'root_deep', stalker_crone: 'hollow_wood', trunk_thing: 'root_deep', chorister: 'crypt', bloatling: 'moor' };
  const outDir = '/tmp/monster_shots';
  fs.mkdirSync(outDir, { recursive: true });
  const results = {};

  const keys = ['moth_saint', 'veinworm_elder', 'stalker_crone', 'trunk_thing', 'chorister', 'bloatling'];
  for (const k of keys) {
    const zone = zoneOf[k];
    const spawned = await ev(({ k, zone }) => {
      const S = window.__spm; const P = S.P;
      try { S.enterZone(zone, null, 0); } catch (e) { return { ok: false, err: 'enterZone: ' + e.message }; }
      // clear existing monsters near player so screenshots are clean
      const z = S.G.zone; if (!z) return { ok: false, err: 'no zone after enterZone' };
      for (const m of z.monsters) m.state = 'idle';
      // makeMon(type,x,y,mlvl,rank,mods) and push into zone
      const mlvls = { moth_saint: 8, veinworm_elder: 14, stalker_crone: 7, trunk_thing: 16, chorister: 10, bloatling: 5 };
      const mv = mlvls[k] || 6;
      const spot = { x: P.x + 2.5, y: P.y + 0.5 };
      // ensure not solid
      let px = spot.x, py = spot.y;
      for (let i = 0; i < 20 && z.solidAt(px, py); i++) { px = P.x + (Math.random() - 0.5) * 5; py = P.y + (Math.random() - 0.5) * 5; }
      const m = S.makeMon(k, px, py, mv, 'normal', []);
      m.state = 'chase';
      z.monsters.push(m);
      // sanity: count how many of this kind are alive
      let alive = 0; for (const mm of z.monsters) if (!mm.dead && mm.type === k) alive++;
      const inMon = !!S.MON[k];
      const aiKind = S.MON[k] && S.MON[k].ai;
      const hasAI = !!S.AI22[aiKind];
      return { ok: true, inMon, aiKind, hasAI, alive, zone: z.id, mx: m.x, my: m.y, mtype: m.type, hp: m.hp, dmg: m.dmg, xp: m.xp };
    }, { k, zone });
    results[k] = spawned;
    await wait(700);
    const shotPath = outDir + '/' + k + '.png';
    await p.screenshot({ path: shotPath, fullPage: false });
    results[k].shot = shotPath;
  }

  // Also verify packs contain new keys
  const packInfo = await ev(() => {
    const S = window.__spm;
    const flat = arr => arr.map(row => { const out = []; for (let i = 0; i < row.length; i += 3) out.push(row[i]); return out.join(','); }).join(' | ');
    const has = (arr, k) => arr.some(row => { for (let i = 0; i < row.length; i += 3) if (row[i] === k) return true; return false; });
    // These are const-scoped; expose via a helper if not window.
    return {
      PACKS_LOW: typeof PACKS_LOW !== 'undefined' ? { hasBloatling: has(PACKS_LOW, 'bloatling') } : null,
      PACKS_MID: typeof PACKS_MID !== 'undefined' ? { hasMoth: has(PACKS_MID, 'moth_saint'), hasStalker: has(PACKS_MID, 'stalker_crone') } : null,
      PACKS_HIGH: typeof PACKS_HIGH !== 'undefined' ? { hasVE: has(PACKS_HIGH, 'veinworm_elder'), hasTT: has(PACKS_HIGH, 'trunk_thing') } : null,
      PACKS_FEN: typeof PACKS_FEN !== 'undefined' ? { hasBloatling: has(PACKS_FEN, 'bloatling') } : null,
      PACKS_CRYPT: typeof PACKS_CRYPT !== 'undefined' ? { hasChorister: has(PACKS_CRYPT, 'chorister') } : null,
      newMonsters: window.__monstersNew && window.__monstersNew.keys,
      stalkerAI: !!(window.__monstersNew && window.__monstersNew.stalkerAI)
    };
  }).catch(e => ({ err: e.message }));

  console.log('RESULTS:', JSON.stringify(results, null, 2));
  console.log('PACKS:', JSON.stringify(packInfo, null, 2));
  console.log('ERRS:', JSON.stringify(errs));
  await b.close();
  process.exit(errs.length ? 2 : 0);
})();
