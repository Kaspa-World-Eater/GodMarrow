const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#newBtn'); await p.waitForTimeout(500);
  await p.evaluate(() => { const { P } = window.__spm; P.skills.spear = 1; P.shards = 9; });
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  await cast('raise', 1, 0); await p.waitForTimeout(400); await cast('raise', 0, 1);
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { hp: Math.round(P.hp), mana: Math.round(P.mana), shards: +P.shards.toFixed(1), skels: G.skels.map(e => Math.round(e.hp)), fallen: G.fallen, kills: G.zone.monsters.filter(m => m.dead).length, alive: G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 8).length, dead: P.dead }; });
  // go to the nearest pack and fight with spear + melee
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 4; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.6; e.y = P.y + 0.4; } });
  for (let i = 0; i < 24; i++) {
    const n = await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x - P.x, m.y - P.y]; });
    await cast('spear', n[0], n[1]); await p.waitForTimeout(500);
    if (i % 6 === 5) console.log(i, JSON.stringify(await st()));
  }
  console.log('ERR', errs);
  await b.close();
})();
