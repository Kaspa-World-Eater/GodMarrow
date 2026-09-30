// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'hemomancer';
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

  await cards([]); await wait(3500);
  await ev(() => { const S = window.__spm, P = S.P, G = S.G; for (const m of G.zone.monsters) if (Math.hypot(m.x - P.x, m.y - P.y) < 14) { m.x += 40; }
    P.muts = ['maw', 'tentacles', 'bilehump']; P.gmuts = ['chitin', 'tentacles']; P.grafts = ['legs']; S.rederive(); P.hp = 1e6;
    G.fgolem = null; P.cast = 0; S.castSkill('fgolem', { x: P.x + 2.2, y: P.y - 0.6 });
    for (let i = 0; i < 5; i++) { const e = S.hatchLing(P.x - 1.2 + i * 0.5, P.y + 1.3, true); e.hatch = 0; e.face = i % 2 ? 1 : -1; if (i === 4) e.size = 2; }
    G.leeches.push({ isLeech: true, x: P.x - 1.5, y: P.y - 0.5, r: 0.14, hp: 10, max: 10, state: 'wait', px: P.x - 1.5, py: P.y - 0.5, store: 12, t: 0, latchT: 0, waitT: 99, ph: 0, face: 1, off: 0, hurt: 0 });
    G.sacs.push({ x: P.x + 0.4, y: P.y + 2.2, t: 40, max: 45, n: 2 });
  });
  await wait(300);
  await ev(() => { const S = window.__spm, P = S.P, G = S.G; G.fgolem.mawOpen = 1; G.fgolem.x = P.x + 2.2; G.fgolem.y = P.y - 0.8; G.brood.forEach((e, i) => { e.x = P.x - 2 + i * 0.9; e.y = P.y + 2 - i * 0.2; }); G.leeches.forEach(l => { l.x = P.x - 1.6; l.y = P.y - 1; }); G.paused = true; });
  await wait(100);
  await p.screenshot({ path: 'vis_a.png', clip: { x: 330, y: 150, width: 300, height: 220 } });
  // a pack to fight
  await ev(() => { window.__spm.G.paused = false; });
  await ev(() => { const S = window.__spm, P = S.P, G = S.G; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, 3); mons.forEach((m, i) => { m.x = P.x + 2.5; m.y = P.y - 1 + i; m.hp = m.max = 5000; m.state = 'chase'; }); });
  await wait(1200);
  await p.screenshot({ path: 'vis_b.png', clip: { x: 330, y: 150, width: 300, height: 220 } });
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castSkill('vwhip', { x: P.x + 3, y: P.y }); S.P.right = 'blance'; S.mouse.r = true; S.mouse.x = 300; S.mouse.y = 120; });
  await wait(300);
  await p.screenshot({ path: 'vis_c.png', clip: { x: 330, y: 150, width: 300, height: 220 } });
  await ev(() => { window.__spm.mouse.r = false; });
  console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
