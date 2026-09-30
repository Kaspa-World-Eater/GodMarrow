// v0.17: golem charge as a skill, right-click corpse summoning, no strobing
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const start = async cls => { await ev(() => { window.__spm.G.running = false; document.getElementById('intro').hidden = false; }); await p.evaluate(c => { window.__spm.G.pickCls = c; window.__spm.startGame('test'); }, cls); await wait(400); await p.keyboard.press('Escape'); };
  // --- a low-level animancer can fully charge the golem with the wisps it has
  await start('animancer');
  const ch = await ev(async () => {
    const S = window.__spm, { P, G } = S; G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k in P.hard) P.hard[k] = 0; P.hard.golem = 1; P.hard.overcharge = 1; P.hard.wisps = 0; S.rederive(); P.wisps = []; 
    while (P.wisps.length < S.effCap()) S.spawnWisp();
    P.cast = 0; S.castSkill('golem', { x: P.x + 1.5, y: P.y }); const need = S.WS.chargeMax(), have = P.wisps.length;
    P.right = 'overcharge'; S.castSkill('overcharge');
    return { need, have, infuse: P.infuse };
  });
  await p.mouse.move(480, 270); await p.mouse.down({ button: 'right' }); await wait(2500); await p.mouse.up({ button: 'right' });
  const after = await ev(() => { const g = window.__spm.G.golem; return { ramp: g.ramp, charge: g.charge }; });
  check('Overcharge at level 1 needs no more wisps than you hold', ch.need <= ch.have, ch);
  check('holding Overcharge sends the golem berserk', after.ramp > 0, after);
  // partial charge bleeds back
  const bleed = await ev(async () => { const S = window.__spm, g = S.G.golem; g.ramp = 0; g.charge = 2; g.infused = 2; g.idleT = 0; return true; });
  await wait(14500);
  const bl = await ev(() => { const g = window.__spm.G.golem; return { charge: g.charge, infused: g.infused }; });
  check('a partial charge bleeds its wisps back', bl.infused < 2, bl);
  // --- right-click near a corpse raises it (ossumancer) or hatches it (hemomancer)
  for (const [cls, key] of [['ossumancer', 'skels'], ['hemomancer', 'brood']]) {
    await start(cls);
    const r = await ev(async (key) => {
      const S = window.__spm, { P, G } = S;
      P.hard.raise = 3; P.hard.hatch = 3; S.rederive(); G.skels && (G.skels.length = 0); if (G.brood) G.brood.length = 0;
      const m = G.zone.monsters.find(q => !q.dead && q.rank !== 'boss'); m.x = P.x + 2; m.y = P.y; S.killMon(m); m.deadAt = G.time;
      P.right = 'attack' in S.SK ? P.right : P.right; if (P.cls === 'ossumancer') P.right = 'bonespear' in S.SK ? 'bonespear' : P.right;
      const q = S.iso(m.x, m.y); return { sx: q.sx, sy: q.sy, before: (G[key] || []).length };
    }, key);
    const box = await p.$('canvas#game'), bb = await box.boundingBox();
    await p.mouse.move(bb.x + r.sx * bb.width / 480, bb.y + r.sy * bb.height / 270); await wait(150);
    console.log(await ev(() => { const S = window.__spm, c = S.corpseUnderCursor(); return { c: !!c, right: S.P.right, kind: S.corpseSummonKind(), mouse: window.__spm.mouse, dead: window.__spm.G.zone.monsters.filter(m => m.dead).map(m => [m.hatched, m.eaten, m.burst, m.deadAt]).slice(0, 3) }; }));
    await p.mouse.down({ button: 'right' }); await wait(80); await p.mouse.up({ button: 'right' }); await wait(600);
    const n = await ev(key => (window.__spm.G[key] || []).length, key);
    check(`${cls}: right-clicking a corpse summons`, n > r.before, [r.before, n]);
  }
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
