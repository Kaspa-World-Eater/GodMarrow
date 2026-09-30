const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#testBtn'); await p.waitForTimeout(600);
  const S = () => p.evaluate(() => { const { P, G, getD } = window.__spm; const D = getD(); return { lvl: P.level, pts: P.arc.pts, taken: P.arc.taken, hard: { spear: P.hard.spear, raise: P.hard.raise }, eff: { spear: P.skills.spear, raise: P.skills.raise }, maxHp: D.maxHp, skels: G.skels.length, loads: G.skels.map(e => e.load), err: G.error }; });
  console.log('start', JSON.stringify(await S()));
  // leveling numbers
  console.log('xp', await p.evaluate(() => { const { xpNext } = window.__spm; return [1, 10, 30, 50, 85, 98].map(l => l + ':' + xpNext(l)).join(' '); }));
  // learn skills to 20 hard, check item bonus
  await p.evaluate(() => { const { P, learn, SK } = window.__spm; for (const id of ['raise', 'aura', 'spear', 'ribcage', 'wall', 'spikes', 'sstorm', 'host', 'sweep', 'gcharge', 'colossus']) for (let i = 0; i < 12; i++) learn(id); P.hp = 99999; });
  await p.keyboard.press('Escape');
  await p.keyboard.press('a'); await p.waitForTimeout(200);
  await p.screenshot({ path: 'shot17_web0.png' });
  // take a path to The Tower, reversed; Pyre-Dead upright; Grave-Chanter upright
  const take = (id, o) => p.evaluate(([id, o]) => window.__spm.takeCard(id, o), [id, o]);
  const W = await p.evaluate(() => { const w = window.__spm.web(); const o = {}; for (const k in w) o[k] = [...w[k].links]; return o; });
  // BFS path from heart
  const path = (goal) => { const prev = { heart: null }, q = ['heart']; while (q.length) { const n = q.shift(); if (n === goal) break; for (const l of W[n]) if (!(l in prev)) { prev[l] = n; q.push(l); } } const out = []; let c = goal; while (c && c !== 'heart') { out.unshift(c); c = prev[c]; } return out; };
  for (const [goal, o] of [['o_tower', 'r'], ['o_chanter', 'u'], ['o_pyredead', 'u']]) for (const id of path(goal)) { const r = await take(id, id === goal ? o : 'u'); if (!r && !(await p.evaluate(i => window.__spm.arcOf(i), id))) console.log('could not take', id); }
  console.log('after take', JSON.stringify(await S()));
  await p.evaluate(() => { window.__spm.G.arcSel = 'o_tower'; });
  await p.waitForTimeout(150); await p.screenshot({ path: 'shot17_web1.png' });
  await p.keyboard.press('a');
  // set squad 3 to mages; wait for skeletons
  await p.evaluate(() => { const { P, rearm } = window.__spm; P.squads[2].load = 'mage'; P.shards = 999; rearm(); });
  await p.waitForTimeout(6000);
  console.log('skels', JSON.stringify(await S()));
  // fight: move next to monsters, cast marrow spells
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 3; P.y = m.y; for (const e of G.skels) { e.x = P.x + Math.random(); e.y = P.y + Math.random(); } });
  const cast = (id) => p.evaluate((id) => { const { castSkill, P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.cast = 0; P.mana = 999; castSkill(id, { x: m.x, y: m.y }); }, id);
  await cast('spikes'); await p.waitForTimeout(300); await cast('spear'); await p.waitForTimeout(150);
  await p.screenshot({ path: 'shot17_fight.png' });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: 'shot17_fight2.png' });
  console.log('fight', JSON.stringify(await S()), await p.evaluate(() => { const { G } = window.__spm; return JSON.stringify({ burning: G.zone.monsters.filter(m => !m.dead && m.burn).length, dead: G.zone.monsters.filter(m => m.dead).length, thr: G.thrusts.length, lastMarrow: window.__spm.P.lastMarrow }); }));
  // flip at lantern should fail away from lantern
  console.log('flip away', await p.evaluate(() => window.__spm.flipCard('o_tower')));
  // items: roll a bunch and show +skills / elemental lines
  console.log('items', await p.evaluate(() => { const { rollItem, itemLines } = window.__spm; const out = new Set(); for (let i = 0; i < 3000; i++) { const it = rollItem(14, 200); for (const l of itemLines(it)) if (/Skills|Fire|Cold|Lightning/.test(l[0])) out.add(l[0]); } return [...out].slice(0, 12).join(' | '); }));
  // full respec
  console.log('respec', await p.evaluate(() => { const { fullRespec, P } = window.__spm; fullRespec(); return JSON.stringify({ pts: P.arc.pts, taken: Object.keys(P.arc.taken).length, skillPts: P.skillPts, respecs: P.respecs }); }));
  console.log('errs', errs);
  await b.close();
})();
