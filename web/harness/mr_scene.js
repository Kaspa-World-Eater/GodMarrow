// Mirror skills scenes: cast each mirror skill at a pack and screenshot at 1920x1080
const { chromium } = require('playwright');
(async () => {
  const OUT = process.env.OUT || '/tmp/mr';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const start = async () => {
    await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); });
    await wait(700);
    await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 18) { m.x += 80; m.y += 80; m.state = 'idle'; } }); });
    await wait(3800);
    await ev(() => { const S = window.__spm, P = S.P; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 18) { m.x += 80; m.y += 80; m.state = 'idle'; } });
      const L = { pillars: 10, fissure: 10, cage: 10, anvil: 10, wisps: 6, lance: 1 }; Object.assign(P.hard, L); Object.assign(P.skills, L); if (S.rederive) S.rederive(); S.fillWispsNow && S.fillWispsNow(); P.hp = 1e6; P.mana = 1e4; });
  };
  const pack = (list) => ev(L => { const S = window.__spm, P = S.P; const out = []; for (const [t, dx, dy] of L) { const m = S.makeMon(t, P.x + dx, P.y + dy, 8, 'normal', []); m.state = 'chase'; S.G.zone.monsters.push(m); out.push(S.G.zone.monsters.length - 1); } return out; }, list);
  const keep = () => ev(() => { const S = window.__spm, P = S.P; P.hp = 1e6; P.mana = 1e4; P.cast = 0; P.roll = 0; });
  const hold = async (ms) => { for (let t = 0; t < ms; t += 250) { await keep(); await wait(250); } };
  const stats = () => ev(() => { const S = window.__spm; return Object.assign({}, S.MR.stats, { refl: S.mrRefls().length, pend: S.MR.pend.length }); });
  const walkable = async () => ev(() => { const S = window.__spm, P = S.P, z = S.G.zone; let n = 0; for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) if (!z.solidAt(P.x + dx, P.y + dy)) n++; return n; });

  // ---- 1. Standing Mirror: a pack walks past it and is reflected
  await start();
  check('open ground around the hero', (await walkable()) > 90, await walkable());
  await ev(() => { const S = window.__spm, P = S.P; S.castPillarsNow({ x: P.x + 2.2, y: P.y - 1.2 }); P.cast = 0; S.castPillarsNow({ x: P.x + 2.2, y: P.y + 1.4 }); });
  console.log('pillars', await ev(() => JSON.stringify(window.__spm.G.pillars.map(q => [q.wm, q.life]))));
  await hold(500);
  await pack([['hollow', 5, 0], ['hollow', 5.5, 1], ['knight', 6, -1], ['hound', 6.5, 0.5], ['marrow', 6, 2]]);
  await hold(1300);
  await p.screenshot({ path: OUT + '_1a_catch.png' });
  await hold(1500);
  const s1 = await stats(); console.log('pillars2', await ev(() => JSON.stringify(window.__spm.G.pillars.map(q => [q.wm, q.life]))));
  await p.screenshot({ path: OUT + '_1b_fight.png' });
  check('standing mirrors catch and release reflections', s1.caught >= 2 && s1.stepped >= 2, s1);
  const tg = await ev(() => { const S = window.__spm; return S.mrRefls().map(e => ({ t: e.type, huntsOrig: S.G.zone.monsters.includes(e.orig) && !e.orig.dead ? (e.tgt === e.orig || e.state !== 'windup') : 'dead', hp: Math.round(e.hp) + '/' + e.max })); });
  check('reflections list', true, tg);
  const info = await ev(() => { const S = window.__spm; return ['pillars', 'fissure', 'cage', 'anvil'].map(id => S.skillInfoNow(id, 10)); });
  check('skill tooltips', info.every(s => s && s.length > 10), info);
  // ---- 2. Shatter the mirror: glass ring + shards home on what it caught + reflections burst
  const beforeHp = await ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead).reduce((a, m) => a + m.hp, 0));
  await ev(() => { const S = window.__spm, P = S.P; const m = S.G.pillars.find(q => q.wm); P.cast = 0; S.castFissureNow({ x: m.x, y: m.y }); });
  await wait(120);
  await p.screenshot({ path: OUT + '_2a_shatter.png' });
  await wait(250);
  await p.screenshot({ path: OUT + '_2b_shatter.png' });
  const s2 = await stats();
  const afterHp = await ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead).reduce((a, m) => a + m.hp, 0));
  check('shatter breaks a mirror and hurts the pack', s2.shattered >= 1 && afterHp < beforeHp, { s2, beforeHp: Math.round(beforeHp), afterHp: Math.round(afterHp) });
  // hand mirror
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castFissureNow({ x: P.x - 4, y: P.y + 3 }); });
  await wait(180); await p.screenshot({ path: OUT + '_2c_hand.png' });

  // ---- 3. Hall of Mirrors on a fresh pack
  await start();
  await pack([['hollow', 3.5, -0.5], ['knight', 4.2, 0.4], ['hound', 3.6, 0.8], ['marrow', 4.4, -0.8]]);
  await ev(() => { const S = window.__spm; S.G.zone.monsters.forEach(m => { if (!m.dead && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 6) { m.stun = 0.5; } }); });
  console.log('hall pre', await ev(() => { const S = window.__spm, P = S.P, c = { x: P.x + 4, y: P.y }; return JSON.stringify(S.G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - c.x, m.y - c.y) < 3).map(m => [m.type, +Math.hypot(m.x - c.x, m.y - c.y).toFixed(2), m.rank, m.hidden, !!m.isEcho, Array.isArray(m.dmg)])); }));
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castCageNow({ x: P.x + 4, y: P.y }); });
  console.log('hall post', await ev(() => { const S = window.__spm; return JSON.stringify({ pend: S.MR.pend.map(q => q.m.type), cages: (S.G.cages || []).length, halls: S.G.pillars.filter(p => p.hall).length }); }));
  await hold(1200);
  await p.screenshot({ path: OUT + '_3a_hall.png' });
  await hold(1200);
  await p.screenshot({ path: OUT + '_3b_hall.png' });
  const s3 = await stats();
  check('hall reflects the caged', s3.hall >= 2, s3);
  await ev(() => { const S = window.__spm, P = S.P; const m = S.G.pillars.find(q => q.hall); P.cast = 0; if (m) S.castFissureNow({ x: m.x, y: m.y }); });
  await wait(140); await p.screenshot({ path: OUT + '_3c_hallfall.png' });

  // ---- 4. Mirror Shard: every wisp split
  await start();
  await hold(800);
  await pack([['hollow', 4, -1], ['hollow', 4.5, 1], ['knight', 5, 0], ['hound', 5.5, 1.5]]);
  const w0 = await ev(() => window.__spm.P.wisps.length);
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castAnvilNow({ x: P.x + 3, y: P.y }); });
  const w1 = await ev(() => ({ all: window.__spm.P.wisps.length, refl: window.__spm.P.wisps.filter(w => w.mrRefl).length }));
  await wait(200); await p.screenshot({ path: OUT + '_4a_shard.png' });
  await hold(1200); await p.screenshot({ path: OUT + '_4b_shard.png' });
  check('mirror shard splits the choir', w1.refl >= w0 && w1.refl > 0, { w0, w1 });
  const tEnd = await ev(() => window.__spm.G.time + window.__spm.WS.shardLife() - 1.2); for (let k = 0; k < 120 && await ev(t => window.__spm.G.time < t, tEnd); k++) await hold(250);
  const w2 = await ev(() => ({ all: window.__spm.P.wisps.length, refl: window.__spm.P.wisps.filter(w => w.mrRefl).length }));
  check('reflected wisps shatter when their time ends', w2.refl === 0, w2);

  // ---- 5. a long fight: nothing leaks, nothing throws
  await start();
  for (let i = 0; i < 3; i++) await ev(k => { const S = window.__spm, P = S.P; P.cast = 0; S.castPillarsNow({ x: P.x + 2 + k, y: P.y - 2 + k * 2 }); }, i);
  await pack([['hollow', 6, 0], ['hollow', 6, 1], ['knight', 7, -1], ['hound', 7, 0.5], ['archer', 7, 2], ['caster', 8, -2], ['marrow', 6, 2], ['bloat', 7, 3]]);
  for (let k = 0; k < 20; k++) { await keep(); if (k % 5 === 4) await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; S.castAnvilNow({ x: P.x + 3, y: P.y }); }); await wait(500); }
  await p.screenshot({ path: OUT + '_5_long.png' });
  const s5 = await stats();
  check('long fight', s5.refl <= 10, s5);
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
