const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#newBtn'); await p.waitForTimeout(400);
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { err: G.error, zone: G.zone.id, hp: Math.round(P.hp), mana: Math.round(P.mana), melee: P.melee.length, lantern: P.lantern.length, beams: P.lantern.filter(w => w.beam).length, dives: P.melee.filter(w => w.state !== 'drift').length, golem: G.golem && G.golem.state, ghp: G.golem && Math.round(G.golem.hp), anvils: G.anvils.length, kills: G.zone.monsters.filter(m => m.dead).length, gold: P.gold, xp: P.xp, lvl: P.level }; });
  const canvas = await p.$('canvas'); const box = await canvas.boundingBox();
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  await p.evaluate(() => { const { P, G } = window.__spm; P.level = 15; P.attrs.vit = 400; P.attrs.ene = 200; Object.assign(P.skills, { wisps: 8, restless: 4, burst: 3, leech: 3, beam: 8, sweep: 3, refract: 5, swarm: 3, channel: 2, golem: 3, anvil: 2, wraith: 1 }); const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters[0]; P.x = m.x - 3; P.y = m.y; setTimeout(() => { P.hp = 9999; P.mana = 9999; }, 50); });
  await p.waitForTimeout(3000);
  console.log('wisps up', JSON.stringify(await st()));
  let [x, y] = at(0.55, 0.45); await p.mouse.move(x, y);
  await p.keyboard.press('r'); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(100); await p.mouse.up({ button: 'right' });
  await p.waitForTimeout(700);
  await p.keyboard.press('t'); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(100); await p.mouse.up({ button: 'right' });
  await p.waitForTimeout(1500);
  console.log('golem+anvil', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot3.png' });
  for (let i = 0; i < 30; i++) {
    [x, y] = at(0.5 + (Math.random() - .5) * .3, 0.45 + (Math.random() - .5) * .3); await p.mouse.move(x, y);
    if (i % 4 === 0) { await p.keyboard.press('q'); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(60); await p.mouse.up({ button: 'right' }); }
    else { await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); }
    if (i === 10) await p.keyboard.press('Space');
    if (i === 15) { await p.keyboard.press('s'); }
    if (i === 16) { await p.keyboard.press('Escape'); }
    await p.waitForTimeout(80);
  }
  console.log('fought', JSON.stringify(await st()));
  // force golem dormant and channel
  await p.evaluate(() => { const { G, P } = window.__spm; if (G.golem) { G.golem.hp = 1; G.golem.state = 'dormant'; G.golem.rt = 10; G.golem.x = P.x + 1; G.golem.y = P.y; } });
  await p.keyboard.press('w'); [x, y] = at(0.5, 0.5); await p.mouse.move(x, y); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(1500); await p.mouse.up({ button: 'right' });
  console.log('channel golem', JSON.stringify(await st()), await p.evaluate(() => window.__spm.G.golem && window.__spm.G.golem.rt.toFixed(2)));
  await p.evaluate(() => { const { usePortal } = window.__spm; usePortal({ to: 'crypt' }); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const { G, P } = window.__spm; const r = G.zone.bossRoom; P.x = r.cx; P.y = r.cy + 2; });
  await p.waitForTimeout(4000);
  const bossInfo = await p.evaluate(() => { const { G } = window.__spm; const b = G.zone.boss; return { fight: G.bossFight, hp: Math.round(b.hp), state: b.state }; });
  console.log('boss', JSON.stringify(bossInfo), JSON.stringify(await st()));
  await p.evaluate(() => { const { P } = window.__spm; P.attrs.vit = 15; P.hp = 1; P.mana = 0; });
  await p.waitForTimeout(4200);
  console.log('after death', JSON.stringify(await st()));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
