const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#testBtn'); await p.waitForTimeout(400);
  const canvas = await p.$('canvas'); const box = await canvas.boundingBox(); const S = box.width / 480;
  const px = (x, y) => [box.x + x * S, box.y + y * S];
  const st = () => p.evaluate(() => { const { G, P, reservedWisps, effCap } = window.__spm; const g = G.golem; return { err: G.error, wisps: P.wisps.length, held: reservedWisps(), g: g && { st: g.state, x: +g.x.toFixed(1), y: +g.y.toFixed(1), ord: !!g.order, ch: +g.charge.toFixed(1), ramp: +g.ramp.toFixed(1) }, leashes: G.leashes.map(l => l.kind), totems: G.totems.map(t => t.wisps.length), marked: G.zone.monsters.filter(m => !m.dead && m.marked > 0).length, taunt: G.zone.monsters.filter(m => !m.dead && m.taunt > 0).length, whips: G.whips.length, lance: !!P.lance, kills: G.zone.monsters.filter(m => m.dead).length }; });
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) P.skills[id] = 15; P.attrs.vit = 300; P.attrs.ene = 250; P.attrs.spi = 100; });
  console.log('perks', await p.evaluate(() => { const K = window.__spm.P.skills; return JSON.stringify({ golem: K.golem, jugg: K.jugg, ironm: K.ironm, burst: K.burst, leech: K.leech, rebuke: K.rebuke, siphon: K.siphon, sword: K.sword, pts: window.__spm.P.skillPts }); }));
  for (let t = 0; t < 3; t++) { await p.mouse.click(...px(204, 44 + t * 46 + 20)); await p.waitForTimeout(80); await p.mouse.move(...px(30 + 58, 42)); await p.waitForTimeout(60); await p.screenshot({ path: `shot7_tree${t}.png` }); }
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const { P, G } = window.__spm; P.hp = 9999; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters[0]; P.x = m.x - 3.5; P.y = m.y; });
  await p.waitForTimeout(300);
  const cast = (id, dx, dy) => p.evaluate(([id, dx, dy]) => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  await cast('golem', 1, 1); await p.waitForTimeout(300);
  const g0 = (await st()).g;
  await cast('golem', -2, -2); await p.waitForTimeout(100);
  console.log('command', JSON.stringify(g0), '->', JSON.stringify((await st()).g));
  await p.waitForTimeout(1500); console.log('after walk', JSON.stringify((await st()).g));
  await cast('mark', 3, 0); await cast('totem', 1, -1); await p.waitForTimeout(200);
  const mon = await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x - P.x, m.y - P.y]; });
  await cast('leash', mon[0], mon[1]); await cast('leash', -1.5, 1.5);
  await p.waitForTimeout(1200);
  console.log('spells', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot7_spells.png' });
  // walk around so the ground leash whips
  await p.mouse.move(...px(300, 180)); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up();
  await p.screenshot({ path: 'shot7_leash.png' });
  // lance
  await p.evaluate(() => { window.__spm.P.right = 'lance'; window.__spm.P.mana = 999; });
  await p.mouse.move(...px(300, 120)); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(800);
  await p.screenshot({ path: 'shot7_lance.png' }); await p.mouse.up({ button: 'right' });
  // rebuke whip
  await p.evaluate(() => { const { P } = window.__spm; P.rebukeAcc = 999; P.mana = 500; });
  await p.evaluate(() => { const { P, G } = window.__spm; P.mana = 500; });
  await p.evaluate(() => { const hp = window.__spm; });
  // trigger via damage absorb
  await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.find(m => !m.dead); m.x = P.x + 1.2; m.y = P.y; });
  await p.evaluate(() => { window.__spm.P.iframe = 0; });
  await p.waitForTimeout(1500);
  console.log('whips seen', await p.evaluate(() => window.__spm.P.rebukeAcc));
  console.log('after fight', JSON.stringify(await st()));
  // panels
  await p.keyboard.press('g'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot7_orders.png' }); await p.keyboard.press('g');
  await p.keyboard.press('v'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot7_choir.png' });
  await p.evaluate(() => { window.__spm.P.wbeh.hold = true; }); await p.keyboard.press('v');
  await p.waitForTimeout(1500);
  console.log('hold fire dives', await p.evaluate(() => window.__spm.P.wisps.filter(w => w.state !== 'drift' || w.beam).length));
  await p.evaluate(() => { const { G, addCharge } = window.__spm; if (G.golem.state !== 'dormant') addCharge(G.golem, 99); });
  await p.waitForTimeout(800); await p.screenshot({ path: 'shot7_golem.png' });
  console.log('rampage', JSON.stringify(await st()));
  await p.evaluate(() => { const { usePortal } = window.__spm; usePortal({ to: 'crypt' }); });
  await p.evaluate(() => { const { G, P } = window.__spm; const r = G.zone.bossRoom; P.x = r.cx; P.y = r.cy + 2; P.hp = 9999; });
  await p.waitForTimeout(2000);
  await p.evaluate(() => { const { P } = window.__spm; P.attrs.vit = 15; P.hp = 1; P.mana = 0; });
  await p.waitForTimeout(4300);
  console.log('after death', JSON.stringify(await st()));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
