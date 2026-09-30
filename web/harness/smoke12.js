const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#testBtn'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'ossumancer') P.skills[id] = 15; P.attrs.vit = 100; P.attrs.spi = 100; P.hp = 99999; P.squads[0].n = 2; P.squads[1].n = 2; P.squads[2].n = 2; P.squads[2].load = 'bow'; P.squads[1].load = 'flail'; });
  await p.waitForTimeout(9000);
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { skels: G.skels.map(e => e.sq + ':' + e.load + ':' + Math.round(e.hp)), squads: P.squads.map(s => s.load + ' x' + s.n + ' ' + s.beh.x + ',' + s.beh.y), kills: G.zone.monsters.filter(m => m.dead).length, err: G.error }; });
  console.log('army', JSON.stringify(await st()));
  // change loadout and size live
  await p.evaluate(() => { const { P, rearm } = window.__spm; P.squads[0].load = 'halberd'; P.squads[1].n = 1; P.squads[0].beh.y = 4; P.squads[2].beh.hold = true; rearm(); });
  await p.waitForTimeout(1500);
  console.log('changed', JSON.stringify(await st()));
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.find(m => !m.dead && m.rank !== 'normal') || G.zone.monsters.find(m => !m.dead); P.x = m.x - 4; P.y = m.y; for (const e of G.skels) { e.x = P.x + 0.5; e.y = P.y + 0.3; } });
  await p.waitForTimeout(3000);
  console.log('fight', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot12_fight.png' });
  await p.keyboard.press('v'); await p.waitForTimeout(200);
  const box = await (await p.$('canvas')).boundingBox(); const S = box.width / 480;
  await p.screenshot({ path: 'shot12_orders0.png' });
  // click tab II, then flail->greatsword loadout, plus button
  await p.mouse.click(box.x + (124 + 5 + 56 + 27) * S, box.y + (18 + 28) * S); await p.waitForTimeout(100);
  await p.mouse.click(box.x + (124 + 112 + 23 + 10) * S, box.y + (18 + 84) * S); await p.waitForTimeout(100);
  await p.mouse.move(box.x + (124 + 112 + 92 + 10) * S, box.y + (18 + 84) * S); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot12_orders1.png' });
  await p.mouse.click(box.x + (124 + 5 + 3 * 56 + 27) * S, box.y + (18 + 28) * S); await p.waitForTimeout(100);
  await p.screenshot({ path: 'shot12_orders3.png' });
  console.log('ui', JSON.stringify(await st()));
  // save & reload
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.click('#mSave'); await p.waitForTimeout(200);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('spiritmancer.test')).squads);
  console.log('saved', JSON.stringify(saved));
  console.log('ERRORS', errs.slice(0, 8));
  await b.close();
})();
