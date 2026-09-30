const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('#testBtn'); await p.waitForTimeout(500);
  const canvas = await p.$('canvas'); const box = await canvas.boundingBox();
  const S = box.width / 480;
  const px = (x, y) => [box.x + x * S, box.y + y * S];
  const st = () => p.evaluate(() => { const { G, P, countKinds } = window.__spm; const g = G.golem; return { err: G.error, lvl: P.level, pts: P.skillPts, kinds: countKinds(), beams: P.wisps.filter(w => w.beam).length, golem: g && g.state, ghp: g && Math.round(g.hp), gmax: g && g.max, shield: g && g.shield, planted: !!G.shieldDrop, oc: g && g.oc, strain: g && Math.round(g.strain), great: G.great && { s: G.great.size, st: G.great.state }, kills: G.zone.monsters.filter(m => m.dead).length, left: P.left, right: P.right, gw: P.gweapon, mana: Math.round(P.mana), hp: Math.round(P.hp) }; });
  console.log('start', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot4_tree0.png' });
  // click-learn Wisps tree nodes through the UI: wisps (col 1 row 0), beam (col 2 row 1)
  const node = (c, r) => px(30 + c * 58, 46 + r * 37);
  for (let i = 0; i < 5; i++) { await p.mouse.click(...node(1, 0)); }
  for (let i = 0; i < 4; i++) { await p.mouse.click(...node(2, 1)); }
  await p.mouse.click(...node(0, 1)); await p.mouse.click(...node(0, 1));
  console.log('after UI learning', JSON.stringify(await p.evaluate(() => { const K = window.__spm.P.skills; return { wisps: K.wisps, beam: K.beam, restless: K.restless }; })));
  await p.mouse.move(...node(2, 1)); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot4_tree1.png' });
  // Iron tab
  await p.mouse.click(...px(204, 44 + 46 + 20)); await p.waitForTimeout(100);
  await p.mouse.click(...node(1, 0)); await p.mouse.click(...node(1, 0)); await p.mouse.click(...node(1, 0));
  await p.mouse.click(...node(2, 1)); await p.mouse.click(...node(2, 1)); // flail
  await p.mouse.move(...node(2, 1)); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot4_tree2.png' });
  await p.evaluate(() => { const { learn, P } = window.__spm; for (const id of ['bulwark', 'thorns', 'overcharge', 'overflow', 'anvil', 'sword', 'axe', 'prism', 'sweep', 'burst', 'condense', 'radiance', 'nova', 'swarm', 'wraith']) for (let i = 0; i < 3; i++) learn(id); P.attrs.vit = 300; P.attrs.ene = 200; });
  await p.mouse.click(...px(204, 44 + 92 + 20)); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot4_tree3.png' });
  console.log('learned', JSON.stringify(await st()));
  await p.keyboard.press('Escape');
  // choir: set 3 beam 2 prism
  await p.evaluate(() => { const { P } = window.__spm; P.alloc = { beam: 3, prism: 2 }; });
  await p.keyboard.press('v'); await p.waitForTimeout(1200);
  console.log('choir', JSON.stringify(await st()));
  // go to a pack
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters[0]; P.x = m.x - 3; P.y = m.y; });
  await p.waitForTimeout(300);
  await p.keyboard.press('v');
  // summon golem at cursor
  await p.mouse.move(...px(270, 120));
  await p.keyboard.press('r'); await p.mouse.down({ button: 'right' }); await p.waitForTimeout(80); await p.mouse.up({ button: 'right' });
  await p.waitForTimeout(2500);
  console.log('golem fighting (flail)', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot4_fight.png' });
  // switch to axe and sword via tree right-click semantics
  await p.evaluate(() => { window.__spm.P.gweapon = 'axe'; });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shot4_axe.png' });
  await p.evaluate(() => { window.__spm.P.gweapon = 'sword'; });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'shot4_sword.png' });
  console.log('weapons', JSON.stringify(await st()));
  // infuse: hurt golem, then hold right-click on it
  await p.evaluate(() => { const { G, P } = window.__spm; const g = G.golem; g.x = P.x + 1.2; g.y = P.y - 0.3; g.hp = g.max * 0.3; g.atk = null; P.hp = 9999; P.mana = 9999; G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 8) m.stun = 30; }); });
  await p.waitForTimeout(100);
  const gpos = await p.evaluate(() => { const { G, iso } = window.__spm; const q = iso(G.golem.x, G.golem.y); return [q.sx, q.sy - 10]; });
  await p.mouse.move(...px(gpos[0], gpos[1])); await p.waitForTimeout(100);
  const before = await st();
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shot4_infuse.png' });
  await p.waitForTimeout(1500); await p.mouse.up({ button: 'right' });
  console.log('infuse', JSON.stringify(before), '->', JSON.stringify(await st()));
  // condense
  await p.evaluate(() => { const { P } = window.__spm; P.alloc = { beam: 0, prism: 0 }; });
  await p.waitForTimeout(1500);
  await p.keyboard.press('w'); await p.mouse.move(...px(300, 110));
  await p.mouse.down({ button: 'right' }); await p.waitForTimeout(1500);
  console.log('condensing', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot4_condense.png' });
  await p.mouse.up({ button: 'right' }); await p.evaluate(() => { window.__spm.G.zone.monsters.forEach(m => m.stun = 0); });
  await p.waitForTimeout(800); await p.screenshot({ path: 'shot4_great.png' });
  await p.waitForTimeout(8000);
  console.log('after great wisp', JSON.stringify(await st()));
  // charge -> planted shield
  await p.evaluate(() => { const { G, P } = window.__spm; const g = G.golem; g.cc = 0; g.atk = null; const ms = G.zone.monsters.filter(m => !m.dead); ms.sort((a,b)=>Math.hypot(a.x-g.x,a.y-g.y)-Math.hypot(b.x-g.x,b.y-g.y)); const m = ms[0]; m.x = g.x + 3.5; m.y = g.y; m.stun = 0; m.state = 'chase'; for (const o of ms.slice(1)) if (Math.hypot(o.x-g.x,o.y-g.y) < 2.5) { o.x += 6; } });
  await p.waitForTimeout(900);
  console.log('charge', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot4_shield.png' });
  // overflow
  await p.evaluate(() => { const { G, P } = window.__spm; const g = G.golem; if (g && g.state !== 'dormant') { g.strain = g.max; } });
  await p.evaluate(() => { const { G } = window.__spm; const m = G.zone.monsters.find(m => !m.dead); });
  // HUD skill picker
  await p.mouse.click(...px(46 + 9, 240 + 8 + 9)); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot4_pick.png' });
  await p.mouse.click(...px(44 + 3 + 20 + 9, 240 - 24 + 11)); await p.waitForTimeout(100);
  console.log('left now', JSON.stringify(await st()));
  // respec
  await p.keyboard.press('s'); await p.waitForTimeout(100);
  await p.evaluate(() => { const { P } = window.__spm; });
  await p.mouse.click(...px(155, 224)); await p.waitForTimeout(100);
  console.log('after respec', JSON.stringify(await st()));
  await p.keyboard.press('Escape');
  // boss + death
  await p.evaluate(() => { const { usePortal } = window.__spm; usePortal({ to: 'crypt' }); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const { G, P } = window.__spm; const r = G.zone.bossRoom; P.x = r.cx; P.y = r.cy + 2; });
  await p.waitForTimeout(3000);
  await p.evaluate(() => { const { P } = window.__spm; P.attrs.vit = 15; P.hp = 1; P.mana = 0; });
  await p.waitForTimeout(4200);
  console.log('after death', JSON.stringify(await st()));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
