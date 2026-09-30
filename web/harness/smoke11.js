const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#testBtn'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'ossumancer') P.skills[id] = 15; P.skills.wall = 5; P.attrs.vit = 100; P.attrs.spi = 100; P.attrs.con = 80; P.hp = 99999; });
  await p.waitForTimeout(8000);
  const st = () => p.evaluate(() => { const { G, P, BS } = window.__spm; return { shards: +P.shards.toFixed(1), skels: G.skels.length, host: P.host && { n: P.host.n, pool: Math.round(P.host.pool) }, arms: G.barms.length, spears: G.bspears.length, kills: G.zone.monsters.filter(m => m.dead).length, err: G.error }; });
  console.log('army', JSON.stringify(await st()));
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters.find(m => !m.dead); P.x = m.x - 4; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.5; e.y = P.y + 0.3; } });
  await p.waitForTimeout(300);
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; P.shards = Math.max(P.shards, 10); castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const near = () => p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x - P.x, m.y - P.y]; });
  let n = await near();
  await cast('wall', n[0], n[1]); await p.waitForTimeout(700);
  console.log('arms line', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot11_arms.png' });
  await p.evaluate(() => { window.__spm.P.skills.wall = 15; });
  n = await near(); await cast('wall', n[0], n[1]); await p.waitForTimeout(700);
  await p.screenshot({ path: 'shot11_field.png' });
  n = await near(); await p.evaluate(() => { window.__spm.P.shards = 20; }); await cast('sstorm', n[0], n[1]); await p.waitForTimeout(150);
  console.log('storm', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot11_storm.png' });
  await p.waitForTimeout(3000);
  // host: hold right with Bone Host
  await p.evaluate(() => { window.__spm.P.right = 'host'; });
  const box = await (await p.$('canvas')).boundingBox();
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(1800); await p.mouse.up({ button: 'right' });
  console.log('hosted', JSON.stringify(await st()));
  // take damage: carapace breaks, shards free up
  for (let i = 0; i < 6; i++) { await p.evaluate(() => { const { P } = window.__spm; P.iframe = 0; }); await p.evaluate(() => { /* hit */ }); }
  await p.evaluate(() => { const { P, BS } = window.__spm; for (let i = 0; i < 8; i++) { P.iframe = 0; window.__spm.hitPlayer ? 0 : 0; } });
  await p.evaluate(() => { const { P, BS } = window.__spm; P.host.pool -= BS.hostPer() * 1.6; });
  await p.evaluate(() => { const { P } = window.__spm; P.iframe = 0; }); 
  await p.waitForTimeout(100);
  // trigger a hurt through a monster shot hitting the player
  await p.evaluate(() => { const { G, P } = window.__spm; P.iframe = 0; });
  await p.waitForTimeout(2500);
  console.log('after damage', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot11_host.png' });
  // tap to shed
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(90); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(400);
  console.log('shed', JSON.stringify(await st()));
  console.log('ERRORS', errs.slice(0, 8));
  await b.close();
})();
