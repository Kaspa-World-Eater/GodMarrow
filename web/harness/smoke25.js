// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'ossumancer';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click(`.cls[data-cls=${CLS}]`); await p.click('#testBtn'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  await p.evaluate(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; S.rederive(); window.__T = {}; });
  // helper: give exactly these cards
  const cards = (list) => p.evaluate((list) => { const S = window.__spm, { P, G } = S; P.arc = S.newArc(); for (const [k, o] of list) P.arc.taken[k] = o; S.rederive(); S.rearm && S.rearm(); }, list);
  // helper: a fresh pack of enemies right in front of you
  const arena = (n = 4, hp = 500) => p.evaluate(([n, hp]) => { const { P, G } = window.__spm; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, n); mons.forEach((m, i) => { m.x = P.x + 2 + (i % 2) * 0.7; m.y = P.y + (i - n / 2) * 0.7; m.hp = m.max = hp; m.state = 'chase'; m.bleed = null; m.burn = null; m.stun = 0; m.root = 0; m.possessed = 0; }); for (const m of G.zone.monsters) if (!mons.includes(m) && Math.hypot(m.x - P.x, m.y - P.y) < 14) { m.x += 40; } P.hp = 1e6; P.mana = 9999; return mons.length; }, [n, hp]);
  const ev = (f, arg) => p.evaluate(f, arg);
  const res = [];
  const check = (name, ok, info) => { res.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
  const cast = (id, dx = 2.3, dy = 0) => ev(([id, dx, dy]) => { const S = window.__spm, { P } = S; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const wait = ms => p.waitForTimeout(ms);
  const hpSum = () => ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 6).reduce((a, m) => a + m.hp, 0));

  await cards([]); await ev(() => { window.__spm.P.shards = 99; }); await wait(3500);
  await ev(() => { const S = window.__spm; for (let i = 0; i < 4; i++) S.fuseOne(); });
  const c0 = await ev(() => { const c = window.__spm.G.colossus; return c ? [c.n, Math.round(c.max), window.__spm.BS.colDmg(c.n)] : null; });
  check('Colossus fused', c0 && c0[0] >= 3, c0);
  await arena(1, 5000); await ev(() => { const S = window.__spm, c = S.G.colossus, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 5); c.x = m.x - 5; c.y = m.y; c.leapCd = 0; c.order = null; S.G.cmd = { ref: m, t: 8 }; window.__T.m = m; });
  let lp = false; for (let i = 0; i < 10 && !lp; i++) { await wait(100); lp = await ev(() => !!(window.__spm.G.colossus && window.__spm.G.colossus.leap)); }
  check('Colossus leaps', lp);
  await wait(900); check('Colossus lands near its prey', await ev(() => { const c = window.__spm.G.colossus, m = window.__T.m; return Math.hypot(c.x - m.x, c.y - m.y) < 2; }));
  check('No rib weapon', await ev(() => !window.__spm.CWEAPONS || !window.__spm.CWEAPONS.includes('ribs')));
  // bone host reach
  const r0 = await ev(() => { const S = window.__spm; S.P.host = { n: 6, pool: 300 }; S.rederive(); return S.BS.hostReach(); });
  check('Bone Host extends reach', r0 > 0.8, r0);
  const hit = await ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead); m.x = P.x + 1.9; m.y = P.y; const h = m.hp; P.cast = 0; S.swing(m); return h - m.hp; });
  check('Host swing lands at 1.9 yd', hit > 0, hit);
  await ev(() => { window.__spm.P.host = null; window.__spm.rederive(); });
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
