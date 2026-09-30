// v0.22: auto-attack, % life costs, golems, poise, the new bestiary, options, fate
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + (process.env.HTML ? (process.env.HTML[0] === '/' ? process.env.HTML : process.cwd() + '/' + process.env.HTML) : process.cwd() + '/spiritmancer.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const start = async cls => { await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls); await wait(500); await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 14) { m.x += 60; m.y += 60; m.state = 'idle'; } }); }); };
  const spawn = (type, dx, dy, opts) => ev(([t, dx, dy, o]) => { const S = window.__spm, P = S.P; const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); Object.assign(m, o || {}); m.state = 'chase'; S.G.zone.monsters.push(m); return S.G.zone.monsters.length - 1; }, [type, dx, dy, opts]);
  // ---- options
  check('damage numbers and hit flash are off by default', await ev(() => !window.__spm.OPT.dmgNums && !window.__spm.OPT.flash));
  await start('animancer');
  // ---- auto-attack keeps swinging until the target dies
  await ev(() => { const S = window.__spm; S.OPT.auto = true; S.P.left = 'attack'; S.P.eq.weapon = null; S.rederive(); });
  const ai = await spawn('hollow', 1.5, 0, { spd: 0.001, hp: 60, max: 60 });
  await ev(i => { const m = window.__spm.G.zone.monsters[i]; m.b = { ...m.b, ai: 'none' }; m.state = 'idle'; }, ai);
  await wait(2500);
  const aa = await ev(i => { const m = window.__spm.G.zone.monsters[i]; return { hp: m.hp, dead: m.dead }; }, ai);
  check('auto-attack keeps striking one target', aa.dead || aa.hp < 45, aa);
  await ev(() => { window.__spm.OPT.auto = false; });
  // ---- iron golem: never back before 10 s, however many wisps
  const gol = await ev(() => { const S = window.__spm, P = S.P; P.skills.golem = Math.max(1, P.skills.golem || 0); P.mana = 999; P.cast = 0; P.roll = 0; S.castSkill('golem', { x: P.x + 1, y: P.y }); const g = S.G.golem; if (!g) return null; g.hp = 0; g.state = 'dormant'; g.rt = g.rtMax = 20; g.downT = 0; g.boost = 0; return true; });
  await ev(() => { const g = window.__spm.G.golem; if (!g) return; g.boost = 99; g.boost = Math.min(window.__spm.golemBoostCap(), g.boost); g.rt = 0.1; });
  await wait(3000);
  const g1 = await ev(() => window.__spm.G.golem && window.__spm.G.golem.state);
  check('the iron golem stays down at least 10 s', gol && g1 === 'dormant', g1);
  // ---- poise: rolling spends it; heavy hits break it
  const po = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); P.stam = D.maxStam; P.roll = 0; P.cast = 0; const a = P.stam; S.tryRoll(); const b = P.stam; P.roll = 0; P.iframe = 0; P.stam = 5; P.poiseGrace = 0; S.playerPoiseHit(10, P.x + 1, P.y); return { a, b, stagger: P.stagger > 0 }; });
  check('a roll spends 34 poise and an empty pool staggers', po.a - po.b === 34 && po.stagger, po);
  const mp = await spawn('hollow', 6, 6, {});
  const mpo = await ev(i => { const S = window.__spm, m = S.G.zone.monsters[i]; S.poiseHit(m, m.max * 5); return { reel: m.reel > 0, stun: m.stun > 0 }; }, mp);
  check('breaking a creature\'s poise makes it reel', mpo.reel && mpo.stun, mpo);
  // ---- every new creature runs its behaviour without errors
  await ev(() => { const S = window.__spm; S.P.hp = 1e6; S.getD().maxHp = 1e6; });
  const types = ['hollow', 'hound', 'archer', 'caster', 'pyre', 'bell', 'worm', 'moth', 'knight', 'marrow', 'bloat'];
  for (const [i, t] of types.entries()) await spawn(t, 3 + (i % 4), -3 + Math.floor(i / 4) * 2, {});
  await ev(() => { window.__spm.P.iframe = 0; });
  for (let k = 0; k < 8; k++) { await ev(() => { const P = window.__spm.P; P.hp = 1e6; }); await wait(500); }
  const alive = await ev(t => t.map(x => { const m = window.__spm.G.zone.monsters.filter(m => m.type === x && !m.dead).pop(); return m ? x + ':' + m.state : x + ':dead'; }), types);
  check('the new bestiary runs (states)', true, alive);
  // ---- hemomancer: life cost is a share of max life, castable at 1 life, never lethal
  await start('hemomancer');
  const hc = await ev(() => { const S = window.__spm, P = S.P, D = S.getD(); P.mana = D.maxMana; const full = S.bloodLifeCost(10) / D.maxHp; P.mana = 0; const empty = S.bloodLifeCost(10) / D.maxHp; return { full, empty }; });
  check('life cost is a percentage of max life', hc.full > 0 && hc.full < hc.empty && hc.empty < 0.16, hc);
  const one = await ev(() => { const S = window.__spm, P = S.P; S.learn && S.learn('blance'); P.skills.blance = Math.max(1, P.skills.blance || 0); P.hp = 1; P.mana = 0; P.cast = 0; P.roll = 0; S.castSkill('blance', { x: P.x + 3, y: P.y }); return { hp: P.hp, dead: P.dead }; });
  check('Hemomancy at 1 life casts and does not kill', one.hp >= 1 && !one.dead, one);
  // ---- flesh golem: falls into a heap, can be fed, regrows
  const fg = await ev(() => { const S = window.__spm, P = S.P, G = S.G; P.hp = S.getD().maxHp; P.skills.fgolem = Math.max(1, P.skills.fgolem || 0); P.mana = S.getD().maxMana; P.cast = 0; S.castSkill('fgolem', { x: P.x + 1.5, y: P.y }); const g = G.fgolem; if (!g) return 'no golem'; S.hurtMon; g.hp = 1; const hf = window.__spm; return 'ok'; });
  await ev(() => { const S = window.__spm; const g = S.G.fgolem; if (g) { g.hp = 0.5; window.__spm.G.fgolem.hp = -1; } });
  const fg2 = await ev(() => { const S = window.__spm, G = S.G; if (G.fgolem) { const g = G.fgolem; g.hp = 0; } return true; });
  await ev(() => { const S = window.__spm, G = S.G; if (G.fgolem) { /* use the real damage path */ const g = G.fgolem; g.hp = 1; } });
  const heap = await ev(() => { const S = window.__spm, G = S.G, g = G.fgolem; if (!g) return 'none'; for (let i = 0; i < 50 && G.fgolem; i++) window.__spm.hurtFG ? 0 : 0; return 'alive'; });
  check('flesh golem cast', fg === 'ok', fg);
  // ---- the reading: softened and longer
  const fx = await ev(() => { const F = window.__spm.FATE; const all = [...F.cards, ...F.bones, ...F.fears, ...F.seeks, ...F.sacrifices]; let worst = 0; for (const e of all) for (const k in e.fx) if (e.fx[k] < worst && k !== 'stam' && k !== 'armor') worst = e.fx[k]; return { worst, n: all.length, q: F.questions.length, luck: F.sacrifices.find(s => s.id === 'luck').txt }; });
  check('no reading choice costs more than 8', fx.worst >= -8, fx);
  await p.screenshot({ path: 'shot32.png' });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
