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
  await wait(600);
  await ev(() => { const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); });
  await wait(700);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; });

  const zones = [
    'sighing_ridge','ash_shore','burnt_heath','fern_gully','pilgrim_road','drowned_village','sunken_bog',
    'fallen_monastery','wolf_den_chapel','plague_hospice','well_shaft','smugglers_hold',
    'bogwitch_shack','tree_hollow','hunter_cache',
    'fallen_watchtower','broken_bridge'
  ];
  const outDir = '/tmp/act1_shots';
  fs.mkdirSync(outDir, { recursive: true });
  const results = {};

  for (const z of zones) {
    const info = await ev((zid) => {
      const S = window.__spm;
      try { S.enterZone(zid, null, 0); } catch (e) { return { ok: false, err: 'enterZone: ' + e.message }; }
      const zn = S.G.zone;
      if (!zn) return { ok: false, err: 'no zone after enter' };
      // pause monsters so shot is calm
      for (const m of zn.monsters) m.state = 'idle';
      const packCount = new Set(zn.monsters.filter(m => m.pack).map(m => m.pack)).size;
      const portalCount = zn.objects.filter(o => o.type === 'portal').length;
      const lanternCount = zn.objects.filter(o => o.type === 'lantern').length;
      return {
        ok: true, zone: zn.id, w: zn.w, h: zn.h, theme: zn.theme,
        packs: packCount, portals: portalCount, lanterns: lanternCount,
        mon: zn.monsters.length
      };
    }, z).catch(e => ({ ok: false, err: e.message }));
    results[z] = info;
    await wait(600);
    const shot = outDir + '/' + z + '.png';
    await p.screenshot({ path: shot, fullPage: false });
    results[z].shot = shot;
  }

  console.log('RESULTS:', JSON.stringify(results, null, 2));
  console.log('ERRS:', JSON.stringify(errs));
  await b.close();
  process.exit(errs.length ? 2 : 0);
})();
