const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#newBtn'); await p.waitForTimeout(400);
  const st = () => p.evaluate(() => { const { G, P, BS } = window.__spm; const res = BS.skelCost() * (G.skels.length + (G.colossus ? G.colossus.n : 0) + (P.host ? P.host.n : 0)); return { shards: +P.shards.toFixed(1), cap: window.__spm.D ? 0 : undefined, res, motes: G.bmotes.length, skels: G.skels.map(e => e.load[0] + Math.round(e.hp)), col: G.colossus && G.colossus.n, host: P.host && P.host.n, hp: Math.round(P.hp), kills: G.zone.monsters.filter(m => m.dead).length, right: P.right, err: G.error }; });
  console.log('start', JSON.stringify(await st()));
  await p.waitForTimeout(4000);
  console.log('4s', JSON.stringify(await st()));
  // fight at level 1: stand near a pack and spam spear
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 3.5; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.6; e.y = P.y + 0.3; } });
  await p.waitForTimeout(800); await p.screenshot({ path: 'shot10_pull.png' });
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  for (let i = 0; i < 20; i++) {
    const n = await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x - P.x, m.y - P.y]; });
    await cast('spear', n[0], n[1]); await p.waitForTimeout(500);
    if (i % 5 === 4) console.log('fight', i, JSON.stringify(await st()));
  }
  await p.screenshot({ path: 'shot10_fight.png' });
  // test character with perks
  await p.keyboard.press('Escape'); await p.click('#mQuit'); await p.waitForTimeout(200);
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#testBtn'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'ossumancer') P.skills[id] = 15; P.attrs.vit = 100; P.attrs.spi = 100; P.attrs.con = 80; });
  await p.waitForTimeout(9000);
  console.log('test army', JSON.stringify(await st()));
  await p.evaluate(() => { const { P, G } = window.__spm; P.hp = 99999; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters.find(m => !m.dead); P.x = m.x - 3.5; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.5; e.y = P.y + 0.3; e.hp = 1; } });
  await p.waitForTimeout(2500);
  console.log('bursts', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot10_burst.png' });
  await p.waitForTimeout(6000);
  // colossus fuse
  await p.evaluate(() => { window.__spm.P.right = 'colossus'; });
  const box = await (await p.$('canvas')).boundingBox();
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(2500); await p.mouse.up({ button: 'right' });
  await p.waitForTimeout(4000);
  console.log('colossus', JSON.stringify(await st()));
  await cast('host', 0, 0); await p.waitForTimeout(3000);
  console.log('host', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot10_host.png' });
  await p.keyboard.press('v'); await p.waitForTimeout(200); await p.screenshot({ path: 'shot10_orders.png' });
  console.log('ERRORS', errs.slice(0, 8));
  await b.close();
})();
