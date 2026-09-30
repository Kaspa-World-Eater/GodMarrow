const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#newBtn');
  await p.waitForTimeout(500);
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { err: G.error, zone: G.zone && G.zone.id, x: P.x.toFixed(1), y: P.y.toFixed(1), hp: Math.round(P.hp), lvl: P.level, xp: P.xp, wisps: P.wisps, mons: G.zone.monsters.filter(m=>!m.dead).length, items: G.zone.items.length, inv: P.inv.length }; });
  console.log('start', JSON.stringify(await st()));
  // click-walk around
  const canvas = await p.$('canvas'); const box = await canvas.boundingBox();
  const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
  for (const [fx, fy] of [[0.8, 0.6], [0.8, 0.7], [0.3, 0.6], [0.7, 0.4]]) { const [x, y] = at(fx, fy); await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); }
  console.log('walked', JSON.stringify(await st()));
  // teleport next to a pack and fight with random clicks and skills
  await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.find(m => !m.dead); P.x = m.x - 2.5; P.y = m.y; });
  for (let i = 0; i < 60; i++) {
    const [x, y] = at(0.5 + (Math.random() - .5) * .3, 0.45 + (Math.random() - .5) * .3);
    await p.mouse.move(x, y);
    if (i % 3 === 0) { await p.mouse.down({ button: 'right' }); await p.waitForTimeout(80); await p.mouse.up({ button: 'right' }); }
    else { await p.keyboard.down('Shift'); await p.mouse.down(); await p.waitForTimeout(80); await p.mouse.up(); await p.keyboard.up('Shift'); }
    if (i === 20) await p.keyboard.press('Space');
    if (i === 30) { await p.keyboard.press('i'); await p.keyboard.press('c'); }
    if (i === 35) { await p.keyboard.press('s'); await p.keyboard.press('Tab'); }
    if (i === 40) { await p.keyboard.press('Escape'); await p.keyboard.down('Alt'); }
    if (i === 45) await p.keyboard.up('Alt');
    await p.waitForTimeout(60);
  }
  console.log('fought', JSON.stringify(await st()));
  // grant levels and pick up everything
  await p.evaluate(() => { const { G, P } = window.__spm; P.xp += 5000; for (const g of G.zone.items.slice()) { P.x = g.x; P.y = g.y; } });
  await p.waitForTimeout(400);
  // go to crypt, then boss room
  await p.evaluate(() => { const { usePortal } = window.__spm; usePortal({ to: 'crypt' }); });
  await p.waitForTimeout(400);
  console.log('crypt', JSON.stringify(await st()));
  await p.evaluate(() => { const { G, P } = window.__spm; const r = G.zone.bossRoom; P.x = r.cx; P.y = r.cy + 2; P.hp = 9999; });
  for (let i = 0; i < 40; i++) { const [x, y] = at(0.5, 0.35); await p.mouse.move(x, y); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(100); await p.mouse.up({ button: 'right' }); await p.keyboard.down('Shift'); await p.mouse.down(); await p.waitForTimeout(100); await p.mouse.up(); await p.keyboard.up('Shift'); }
  const bossInfo = await p.evaluate(() => { const { G } = window.__spm; const b = G.zone.boss; return { fight: G.bossFight, hp: Math.round(b.hp), state: b.state, seal: G.seal.length }; });
  console.log('boss', JSON.stringify(bossInfo), JSON.stringify(await st()));
  // die and respawn
  await p.evaluate(() => { const { P } = window.__spm; P.hp = 1; P.mana = 0; });
  await p.waitForTimeout(4500);
  console.log('after death', JSON.stringify(await st()));
  await p.evaluate(() => { const { enterZone } = window.__spm; enterZone('moor'); });
  await p.waitForTimeout(300);
  await p.keyboard.press('i');
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shot2.png' });
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
