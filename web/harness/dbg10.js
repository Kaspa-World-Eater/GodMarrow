const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#newBtn'); await p.waitForTimeout(3000);
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 3.5; P.y = m.y; });
  for (let i = 0; i < 8; i++) {
    const r = await p.evaluate(() => { const { G, P, castSkill } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; const before = { mana: P.mana, sh: P.shards, sp: G.bspears.length }; P.cast = 0; castSkill('spear', { x: m.x, y: m.y }); return { d: Math.hypot(m.x - P.x, m.y - P.y).toFixed(1), mhp: Math.round(m.hp), st: m.state, before, after: { mana: P.mana, sh: P.shards, sp: G.bspears.length }, msg: G.msg, spear: P.skills.spear }; });
    console.log(JSON.stringify(r)); await p.waitForTimeout(500);
  }
  console.log(errs); await b.close();
})();
