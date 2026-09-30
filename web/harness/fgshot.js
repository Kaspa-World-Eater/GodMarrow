// flesh golem in play: HTML=/tmp/flesh.html node fgshot.js /tmp/fgshot   -> _puke.png, _eat.png, _walk.png (+ _z crops)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + (process.env.HTML || '/tmp/flesh.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), out = process.argv[2] || '/tmp/fgshot', log = [];
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); }); await wait(500);
  await ev(() => {
    const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false;
    G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 16) { m.x += 60; m.y += 60; m.state = 'idle'; } });
    P.skills.fgolem = P.hard.fgolem = 8; S.rederive(); P.hp = 1e6; P.mana = 999; P.cast = 0;
    S.castSkill('fgolem', { x: P.x + 1.5, y: P.y }); const g = G.fgolem; g.stock = S.HS.golemStockMax(); g.max = g.hp = 1e5;
  });
  await wait(900);
  const shot = async (name) => {
    const r = await ev(() => { const S = window.__spm, g = S.G.fgolem, q = S.iso(g.x, g.y); const c = document.querySelector('canvas'), R = c.getBoundingClientRect(); return { x: q.sx, y: q.sy, cw: c.width, ch: c.height, R: { x: R.x, y: R.y, w: R.width, h: R.height } }; });
    await p.screenshot({ path: `${out}_${name}.png` });
    await p.screenshot({ path: `${out}_${name}_c.png`, clip: { x: Math.max(0, Math.min(960 - 260, r.x * 1.5 - 130)), y: Math.max(0, Math.min(540 - 160, r.y * 1.5 - 110)), width: 260, height: 160 } });
    log.push(name + ' ' + JSON.stringify(r));
  };
  // enemies close by: it should puke
  await ev(() => { const S = window.__spm, P = S.P; for (const [t, dx, dy] of [['hollow', 5, -4], ['hound', 6, -3], ['hollow', 5.5, -5]]) { const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); m.state = 'chase'; m.hp = m.max = 400; m.spd = 0.01; S.G.zone.monsters.push(m); } });
  let got = false;
  for (let i = 0; i < 120 && !got; i++) { await wait(50); const t = await ev(() => { const g = window.__spm.G.fgolem; return g.puke ? g.puke.t : -1; }); if (t > 0.5) { await shot('puke'); got = true; } }
  log.push('puke seen ' + got);
  await wait(120); await shot('pukeafter');
  log.push(JSON.stringify(await ev(() => { const S = window.__spm, G = S.G; return { stock: G.fgolem.stock, lings: G.brood.filter(e => e.puke).length, fly: G.brood.filter(e => e.fly).length }; })));
  await wait(900); await shot('swarm');
  // kill them all, empty its gut: it should go and eat
  await ev(() => { const S = window.__spm, G = S.G; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 12) S.killMon(m); G.fgolem.stock = 0; G.fgolem.hp = G.fgolem.max * 0.5; for (const e of G.brood.slice()) e.life = 0.01; });
  got = false;
  for (let i = 0; i < 160 && !got; i++) { await wait(50); const t = await ev(() => { const g = window.__spm.G.fgolem; return g.eat ? g.eatT : -1; }); if (t > 0.3) { await shot('eat'); got = true; } }
  log.push('eat seen ' + got);
  await wait(4000);
  log.push(JSON.stringify(await ev(() => { const g = window.__spm.G.fgolem; return { stock: g.stock, hp: Math.round(g.hp), max: Math.round(g.max), eat: !!g.eat }; })));
  // walking back to the player
  await ev(() => { const S = window.__spm, P = S.P; P.x += 3; P.y -= 3; });
  await wait(500); await shot('walk');
  console.log(log.join('\n')); console.log('errors', errs.slice(0, 5)); await b.close();
})();
