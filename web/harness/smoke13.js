const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=hemomancer]'); await p.click('#newBtn'); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { hp: Math.round(P.hp), mana: Math.round(P.mana), brood: G.brood.map(e => Math.round(e.hp) + (e.size > 1 ? '*' + e.size.toFixed(1) : '')), sacs: G.sacs.length, pools: G.pools.length, golem: G.fgolem && { hp: Math.round(G.fgolem.hp), meals: G.fgolem.meals }, kills: G.zone.monsters.filter(m => m.dead).length, bleeding: G.zone.monsters.filter(m => !m.dead && m.bleed).length, blighted: G.zone.monsters.filter(m => !m.dead && m.blight).length, muts: P.muts, dev: P.devour, right: P.right, err: G.error }; });
  console.log('new', JSON.stringify(await st()));
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const near = () => p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x - P.x, m.y - P.y]; });
  await cast('eggsac', 1, 1); await p.waitForTimeout(3000);
  console.log('sac hatched', JSON.stringify(await st()));
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 4; P.y = m.y; for (const e of G.brood) { e.x = P.x + 0.5; e.y = P.y; } });
  for (let i = 0; i < 16; i++) { const n = await near(); await cast('blance', n[0], n[1]); await p.waitForTimeout(450); }
  console.log('lv1 fight', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot13_lv1.png' });
  // blood price: drain spirit and cast
  await p.evaluate(() => { window.__spm.P.mana = 0; }); const n0 = await near(); await cast('blance', n0[0], n0[1]);
  console.log('blood price', JSON.stringify(await st()));
  // test character, full kit
  await p.keyboard.press('Escape'); await p.click('#mQuit'); await p.waitForTimeout(200);
  await p.click('.cls[data-cls=hemomancer]'); await p.click('#testBtn'); await p.waitForTimeout(400);
  await p.screenshot({ path: 'shot13_tree0.png' });
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'hemomancer') { P.hard[id] = 15; P.skills[id] = 15; } P.attrs.vit = 100; P.attrs.spi = 100; P.attrs.con = 80; P.muts = ['tentacles', 'bilehump', 'gills']; P.grafts = ['clingers', 'volatile']; P.hp = 9999; });
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters.find(m => !m.dead); P.x = m.x - 4; P.y = m.y; });
  await cast('fgolem', 1, 0); await cast('eggsac', 1, 1); await p.waitForTimeout(200); await cast('eggsac', 0, 1);
  let n = await near(); await cast('hemor', n[0], n[1]); await p.waitForTimeout(300);
  n = await near(); await cast('blight', n[0], n[1]); await p.waitForTimeout(300);
  n = await near(); await cast('vwhip', n[0], n[1]); await p.waitForTimeout(300);
  await cast('spool', 0, 0); await p.waitForTimeout(2500);
  console.log('kit', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot13_kit.png' });
  n = await near(); await cast('swarmcall', n[0], n[1]); await p.waitForTimeout(2500);
  n = await near(); await cast('cburst', n[0], n[1]); await p.waitForTimeout(300);
  await cast('devour', 0, 0); await p.waitForTimeout(300);
  console.log('burst+devour', JSON.stringify(await st()));
  await p.waitForTimeout(4000);
  console.log('later', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot13_later.png' });
  await p.keyboard.press('v'); await p.waitForTimeout(200); await p.screenshot({ path: 'shot13_flesh0.png' });
  const box = await (await p.$('canvas')).boundingBox(); const S = box.width / 480;
  await p.mouse.click(box.x + (124 + 5 + 75 + 36) * S, box.y + (18 + 28) * S); await p.waitForTimeout(150); await p.screenshot({ path: 'shot13_flesh1.png' });
  await p.mouse.click(box.x + (124 + 5 + 150 + 36) * S, box.y + (18 + 28) * S); await p.waitForTimeout(150); await p.screenshot({ path: 'shot13_flesh2.png' });
  await p.keyboard.press('v');
  // music state
  console.log('music', JSON.stringify(await p.evaluate(() => { const M = window.__spm.MUS; return { on: M.on, node: !!M.node, mood: M.mood, bar: M.bar }; })));
  await p.keyboard.press('Escape'); await p.click('#mSave'); await p.waitForTimeout(200);
  console.log('saved', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('spiritmancer.test')); return JSON.stringify({ cls: d.cls, muts: d.muts, grafts: d.grafts }); }));
  console.log('ERRORS', errs.slice(0, 8));
  await b.close();
})();
