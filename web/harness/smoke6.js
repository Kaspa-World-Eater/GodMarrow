const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#testBtn'); await p.waitForTimeout(400);
  const canvas = await p.$('canvas'); const box = await canvas.boundingBox(); const S = box.width / 480;
  const px = (x, y) => [box.x + x * S, box.y + y * S];
  const st = () => p.evaluate(() => { const { G, P, reservedWisps, effCap, countKinds } = window.__spm; const g = G.golem; return { err: G.error, wisps: P.wisps.length, cap: window.__spm.P && effCap(), held: reservedWisps(), kinds: countKinds(), mana: Math.round(P.mana), g: g && { st: g.state, hp: Math.round(g.hp), ch: +g.charge.toFixed(1), inf: g.infused, ramp: +g.ramp.toFixed(1), shield: g.shield }, fly: !!G.flyShield, pillars: G.pillars.length, echoes: G.echoes.length, tether: !!G.tether, orbs: G.orbs.length, shards: G.shards.length, storms: G.storms.length, lance: !!P.lance, great: G.great && G.great.size, kills: G.zone.monsters.filter(m => m.dead).length }; });
  // learn a spread of everything
  await p.evaluate(() => { const { learn, SK, P } = window.__spm; for (let r = 0; r < 4; r++) for (const id in SK) learn(id); P.attrs.vit = 300; P.attrs.ene = 250; });
  for (let t = 0; t < 3; t++) { await p.mouse.click(...px(204, 44 + t * 46 + 20)); await p.waitForTimeout(80); await p.mouse.move(...px(30 + 58, 42 + 31)); await p.waitForTimeout(60); await p.screenshot({ path: `shot6_tree${t}.png` }); }
  // bind a hotkey by hovering
  await p.mouse.move(...px(30 + 58 * 2, 42 + 31 * 3)); await p.keyboard.press('x'); await p.waitForTimeout(50);
  console.log('keys', JSON.stringify(await p.evaluate(() => window.__spm.P.keys)));
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const { P, G } = window.__spm; P.hp = 9999; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters[0]; P.x = m.x - 3.5; P.y = m.y; });
  await p.waitForTimeout(300);
  const cast = (id, dx = 0.1, dy = 0.4) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; castSkill(id, { x: P.x + 3 + dx, y: P.y + dy }); }, [id, dx, dy]);
  await cast('golem', -2, 1); await p.waitForTimeout(300);
  await cast('pillars'); await p.waitForTimeout(400);
  await cast('cage', 1, -1); await p.waitForTimeout(400);
  await cast('fissure', 2, 0); await p.waitForTimeout(700);
  await cast('orb'); await p.waitForTimeout(600);
  await cast('storm', 0, 1); await p.waitForTimeout(700);
  console.log('casts', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot6_casts.png' });
  await p.waitForTimeout(2500);
  // echo on a fresh corpse
  const echoed = await p.evaluate(() => { const { G, P, castSkill } = window.__spm; const c = G.zone.monsters.find(m => m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 10); if (!c) return 'no corpse'; P.cast = 0; P.mana = 999; castSkill('echo', { x: c.x, y: c.y }); P.cast = 0; castSkill('tether'); return G.echoes.length; });
  console.log('echo', echoed, JSON.stringify(await st()));
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shot6_echo.png' });
  // lance: hold right with lance selected
  await p.evaluate(() => { const { P } = window.__spm; P.right = 'lance'; P.mana = 999; });
  await p.mouse.move(...px(300, 130)); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(900);
  console.log('lance', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot6_lance.png' }); await p.mouse.up({ button: 'right' });
  // charge the golem: infuse a few wisps, check they stay held
  await p.evaluate(() => { const { G, P } = window.__spm; const g = G.golem; g.x = P.x + 1.2; g.y = P.y - 0.3; g.atk = null; G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 9) m.stun = 3; }); });
  await p.waitForTimeout(100);
  const gpos = await p.evaluate(() => { const { G, iso } = window.__spm; const q = iso(G.golem.x, G.golem.y); return [q.sx, q.sy - 10]; });
  await p.mouse.move(...px(gpos[0], gpos[1])); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(500); await p.mouse.up({ button: 'right' });
  const a1 = await st(); await p.waitForTimeout(4000); const a2 = await st();
  console.log('partial charge', JSON.stringify(a1.g), 'held', a1.held, '-> after 4s', JSON.stringify(a2.g), 'held', a2.held);
  await p.evaluate(() => { const { G, addCharge } = window.__spm; addCharge(G.golem, 99); G.zone.monsters.forEach(m => m.stun = 0); });
  await p.waitForTimeout(1200);
  console.log('rampage', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot6_rampage.png' });
  await p.evaluate(() => { window.__spm.G.golem.ramp = 0.05; });
  await p.waitForTimeout(500);
  console.log('after burst', JSON.stringify(await st()));
  // shield toss: put a monster at range
  await p.waitForTimeout(3500);
  await p.evaluate(() => { const { G } = window.__spm; const g = G.golem; const m = G.zone.monsters.find(m => !m.dead); m.x = g.x + 4.5; m.y = g.y; m.state = 'chase'; g.tossCd = 0; g.cc = 5; });
  await p.waitForTimeout(250);
  console.log('toss', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot6_toss.png' });
  // panels
  await p.keyboard.press('g'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot6_orders.png' }); await p.keyboard.press('g');
  await p.keyboard.press('v'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot6_choir.png' }); await p.keyboard.press('v');
  // wraith + phantom
  await p.evaluate(() => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; castSkill('wraith'); });
  await p.mouse.move(...px(150, 200)); await p.mouse.down(); await p.waitForTimeout(900); await p.mouse.up();
  console.log('wraith', await p.evaluate(() => JSON.stringify({ wraith: window.__spm.P.wraith, phantoms: window.__spm.G.phantoms.length })));
  // boss room in catacombs + death
  await p.evaluate(() => { const { usePortal, G } = window.__spm; usePortal({ to: 'fen' }); });
  await p.evaluate(() => { const { usePortal } = window.__spm; usePortal({ to: 'cata1' }); usePortal({ to: 'cata2' }); });
  await p.evaluate(() => { const { G, P } = window.__spm; const r = G.zone.bossRoom; P.x = r.cx; P.y = r.cy + 2; P.hp = 9999; });
  await p.waitForTimeout(2500);
  console.log('boss', JSON.stringify(await st()));
  await p.evaluate(() => { const { P } = window.__spm; P.attrs.vit = 15; P.hp = 1; P.mana = 0; });
  await p.waitForTimeout(4300);
  console.log('after death', JSON.stringify(await st()));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
