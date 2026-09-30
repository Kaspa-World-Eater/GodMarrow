const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]');
  await p.click('#newBtn'); await p.waitForTimeout(800);
  const st = () => p.evaluate(() => { const { G, P, BS } = window.__spm; return { err: G.error, cls: P.cls, shards: +P.shards.toFixed(1), cap: window.__spm.P && G.zone && (G.skels ? G.skels.length : -1), skels: G.skels.map(e => e.kind + ':' + Math.round(e.hp)), col: G.colossus && { n: G.colossus.n, hp: Math.round(G.colossus.hp) }, host: P.host && P.host.n, fallen: G.fallen, right: P.right, hp: Math.round(P.hp), kills: G.zone.monsters.filter(m => m.dead).length }; });
  console.log('new', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot9_new.png' });
  // level-1 raise
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  await p.waitForTimeout(3000);
  await cast('raise', 1, 1); await p.waitForTimeout(500);
  console.log('raised', JSON.stringify(await st()));
  // test character
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.click('#mQuit'); await p.waitForTimeout(300);
  await p.click('.cls[data-cls=ossumancer]');
  await p.click('#testBtn'); await p.waitForTimeout(600);
  await p.screenshot({ path: 'shot9_tree0.png' });
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'ossumancer') P.skills[id] = 15; P.attrs.vit = 100; P.attrs.spi = 100; P.attrs.con = 80; });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
  await p.evaluate(() => { const { P } = window.__spm; P.shards = 40; });
  await p.waitForTimeout(300);
  console.log('test', JSON.stringify(await st()));
  // raise a full army
  for (let i = 0; i < 7; i++) { await cast('raise', 1 + (i % 3), (i % 2)); await p.evaluate(() => { window.__spm.P.shards = 30; }); }
  await p.waitForTimeout(800);
  console.log('army', JSON.stringify(await st()));
  // walk into monsters
  await p.evaluate(() => { const { P, G } = window.__spm; P.hp = 9999; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters.find(m => !m.dead); P.x = m.x - 3.5; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.5; e.y = P.y + 0.3; } });
  await p.waitForTimeout(2500);
  console.log('fight', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot9_army.png' });
  const near = () => p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return m ? [m.x - P.x, m.y - P.y] : [2, 0]; });
  let n = await near();
  await cast('spear', n[0], n[1]); await p.waitForTimeout(150);
  await cast('ribcage', n[0], n[1]); await p.waitForTimeout(150);
  await cast('spikes', n[0], n[1]); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot9_spells.png' });
  await cast('wall', 2, -2); await cast('sstorm', n[0], n[1]); await cast('sweep', 0, 0); await cast('command', n[0], n[1]);
  await p.waitForTimeout(600);
  await cast('gcharge', n[0], n[1]); await p.waitForTimeout(700);
  console.log('spells', JSON.stringify(await st()));
  // colossus: hold right on the skill
  await p.evaluate(() => { const { P, G, mouse } = window.__spm; P.right = 'colossus'; P.shards = 30; });
  const box = await (await p.$('canvas')).boundingBox();
  await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.45);
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(2600); await p.mouse.up({ button: 'right' });
  console.log('colossus', JSON.stringify(await st()));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'shot9_colossus.png' });
  for (const w of ['scythe', 'swords', 'flail', 'ribs']) { await p.evaluate(w => { window.__spm.P.cweapon = w; }, w); await p.waitForTimeout(1200); }
  console.log('loadouts', JSON.stringify(await st()));
  // re-raise and host
  for (let i = 0; i < 4; i++) { await cast('raise', 1, 1); await p.evaluate(() => { window.__spm.P.shards = 30; }); }
  await cast('host', 0, 0); await p.waitForTimeout(1500);
  console.log('host', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot9_host.png' });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { window.__spm.P.cast = 0; }); await cast('host', 0, 0); await p.waitForTimeout(500);
  console.log('released', JSON.stringify(await st()));
  await p.keyboard.press('v'); await p.waitForTimeout(200); await p.screenshot({ path: 'shot9_orders.png' }); await p.keyboard.press('v');
  await p.keyboard.press('s'); await p.waitForTimeout(200);
  for (let t = 0; t < 3; t++) { const S = box.width / 480; await p.mouse.click(box.x + 204 * S, box.y + (44 + t * 46 + 20) * S); await p.waitForTimeout(100); await p.mouse.move(box.x + 88 * S, box.y + 42 * S); await p.waitForTimeout(100); await p.screenshot({ path: `shot9_tree${t + 1}.png` }); }
  await p.keyboard.press('Escape'); await p.keyboard.press('c'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot9_char.png' }); await p.keyboard.press('Escape');
  // kill the player to test reset
  await p.evaluate(() => { const { P } = window.__spm; P.hp = 1; P.iframe = 0; }); await p.waitForTimeout(5000);
  console.log('after', JSON.stringify(await st()));
  console.log('ERRORS', errs.slice(0, 10));
  await b.close();
})();
