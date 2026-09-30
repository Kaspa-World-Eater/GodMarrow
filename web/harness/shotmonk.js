// monk skill screenshots: node shotmonk.js <skill>[,<skill>...] <out.png> [waitMs] [night]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.DSF || 1) });
  const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + (process.env.HTML || process.cwd() + '/spiritmancer.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(() => { const S = window.__spm; localStorage.removeItem('spiritmancer.test'); S.G.pickCls = 'monk'; S.startGame('test'); for (const k in S.G.panels) S.G.panels[k] = false; });
  await wait(2600);
  if (process.env.ZONE) { await ev(z => window.__spm.enterZone(z), process.env.ZONE); await wait(2600); }
  await ev(night => {
    const S = window.__spm, P = S.P, M = window.__monk; if (night) S.G.clock = 600 * 0.75; else S.G.clock = 600 * 0.3;
    for (const id in M.SK) if (M.SK[id].cls === 'monk' && id !== 'klaugh') P.hard[id] = 10; P.attrs.spi = 120; S.rederive(); P.hp = 1e5; S.getD().maxHp = 1e5;
    // clear a space to the south-east, then line up a few enemies
    for (const m of S.G.zone.monsters) m.hidden = true;
    S.G.zone.monsters = S.G.zone.monsters.filter(m => Math.hypot(m.x - P.x, m.y - P.y) > 16);
    const list = (window.__MOBS || 'hollow,archer,hollow,knight,caster').split(',');
    list.forEach((t, i) => { const m = S.makeMon(t, P.x + 2 + (i % 3) * 1.1, P.y + 0.5 + Math.floor(i / 3) * 1.3 - 1, 5, 'normal', []); m.hp = m.max = 2000; m.state = 'idle'; m.b = Object.assign({}, m.b, { ai: 'none' }); S.G.zone.monsters.push(m); });
  }, !!process.argv[5]);
  if (process.env.WEIGHT) await ev(w => { window.__spm.P.weight = w; }, +process.env.WEIGHT);
  const ids = process.argv[2].split(',');
  for (const id of ids) {
    await ev(id => { const S = window.__spm, P = S.P, M = window.__monk, G = S.G; P.mana = 9999; P.cast = 0; P.kskyCd = 0; P.kcd = {}; P.khalo = 7; const m = G.zone.monsters.filter(q => !q.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; const hold = M.SK[id].kind === 'hold'; if (hold) { P.right = id; S.mouse.r = true; } S.castSkill(id, m ? { x: m.x + 0.3, y: m.y } : { x: P.x + 2, y: P.y }); }, id);
    await wait(+(process.env.GAP || 300));
  }
  await wait(+(process.argv[4] || 600));
  await ev(() => { const G = window.__spm.G; G.bannerT = 0; G.msgT = 0; });
  await p.screenshot({ path: process.argv[3] });
  console.log(errs.slice(0, 5)); await b.close();
})();
