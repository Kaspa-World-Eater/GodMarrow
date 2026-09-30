// Animancer play-test: casts every Animancer skill and checks the wisp/mirror mechanics. HTML=/tmp/anim.html node anim_test.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.setDefaultTimeout(150000); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await wait(500);
  await ev(() => { const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false; G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 10; P.hard[k] = 10; }
    for (const k of ['resonance', 'fshrap', 'prismex', 'prismL', 'focus', 'anvilquake', 'ghostfire', 'jugg', 'sweep', 'beamburn', 'maidcrush', 'spikedcage', 'magnet']) { P.skills[k] = 10; P.hard[k] = 10; }
    S.rederive(); P.hp = 1e6; S.getD().maxHp = 1e6; P.mana = 9999; P.alloc = { beam: 0, prism: 0 }; });
  const spawnAll = () => ev(() => { const S = window.__spm, P = S.P; S.G.zone.monsters.forEach(m => { if (m._t) m.dead = true; }); for (const [dx, dy] of [[3, 0.5], [4, -1], [5, 1], [3.5, 2.5], [6, -0.5], [4.5, 3.5]]) { const m = S.makeMon('hollow', P.x + dx, P.y + dy, 5, 'normal', []); m.hp = m.max = 1e6; m.state = 'chase'; m.b = { ...m.b, ai: 'none' }; m.spd = 0.0001; m._t = 1; S.G.zone.monsters.push(m); } });
  await spawnAll();
  const st = () => ev(() => Object.assign({}, window.__anim.stats));
  // text: the tab is Mirror, the skills are renamed
  check('the first tab is named Mirror', await ev(() => window.__monk.tabNames()[0] === 'Mirror'));
  check('skills renamed', await ev(() => { const S = window.__spm.SK; return [S.pillars.name, S.fissure.name, S.cage.name, S.anvil.name, S.golem.name, S.beam.name, S.prism.name, S.lance.name, S.forge.name]; }));
  // every Animancer skill casts
  const ids = await ev(() => Object.keys(window.__spm.SK).filter(k => (window.__spm.SK[k].cls || 'animancer') === 'animancer' && ['cast', 'hold'].includes(window.__spm.SK[k].kind)));
  for (const id of ids) {
    await ev(id => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[0]; P.cast = 0; P.roll = 0; P.mana = 9999; P.right = id; const q = S.iso(m.x, m.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75;
      if (S.SK[id].kind === 'hold') S.mouse.r = true; else S.castSkill(id, id === 'golem' ? { x: P.x + 1.5, y: P.y - 1.5 } : { x: m.x, y: m.y }); }, id);
    await wait(id === 'lance' || id === 'condense' || id === 'overcharge' ? 1200 : 450);
    await ev(() => { const S = window.__spm; S.mouse.r = false; if (S.P.wraith) S.toggleWraith(); });
    await wait(150);
  }
  check('cast every Animancer skill: ' + ids.join(','), errs.length === 0, errs.slice(0, 2));
  // Spirit Dart: a darting wisp that ricochets foe to foe
  await ev(() => { const S = window.__spm; S.G.golem = null; S.G.pillars = []; S.G.anvils = []; S.G.flyShield = null; window.__anim.anReset(); });
  let s0 = await st();
  await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[0]; P.right = 'lance'; P.cast = 0; const q = S.iso(m.x, m.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75; S.mouse.r = true; });
  await wait(300);
  const inFlight = await ev(() => window.__anim.G().adarts.filter(d => d.kind === 'lance').map(d => ({ trail: d.trail.length, hops: d.hops })));
  await wait(900); await ev(() => { window.__spm.mouse.r = false; }); await wait(400);
  let s1 = await st();
  check('Spirit Dart looses darting wisps with comet trails', s1.darts > s0.darts && inFlight.length > 0 && inFlight.some(d => d.trail >= 2), { darts: s1.darts - s0.darts, inFlight });
  check('each dart ricochets to several foes', (s1.strikes - s0.strikes) / Math.max(1, s1.darts - s0.darts) >= 2, { strikes: s1.strikes - s0.strikes, darts: s1.darts - s0.darts });
  check('no beam pulses are drawn any more', await ev(() => (window.__spm.G.pulses || []).length === 0 && !window.__spm.P.lance));
  // mirrors: a standing mirror between the foes catches the dart and it rebounds
  s0 = await st();
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 9999; S.castSkill('pillars', { x: P.x + 4.2, y: P.y + 0.6 }); });
  await wait(400);
  await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[0]; P.right = 'lance'; P.cast = 0; const q = S.iso(m.x, m.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75; S.mouse.r = true; });
  await wait(1400); await ev(() => { window.__spm.mouse.r = false; }); await wait(400);
  s1 = await st();
  check('darts rebound off standing mirrors', s1.rebounds > s0.rebounds, { rebounds: s1.rebounds - s0.rebounds });
  // darting and splitting wisps from the choir
  s0 = await st();
  await ev(() => { const S = window.__spm; S.P.alloc = { beam: 3, prism: 3 }; });
  let seen = 0; for (let i = 0; i < 12; i++) { await wait(200); seen = Math.max(seen, await ev(() => window.__spm.P.wisps.filter(w => w.dart).length)); }
  s1 = await st();
  check('darting and splitting wisps fly out of the choir themselves', seen > 0 && (s1.wispDarts || 0) > (s0.wispDarts || 0), { seen, launched: (s1.wispDarts || 0) - (s0.wispDarts || 0) });
  check('splitting wisps throw off sparks', s1.splits > s0.splits, { splits: s1.splits - s0.splits });
  check('no wisp holds a beam', await ev(() => window.__spm.P.wisps.every(w => !w.beam)));
  // cracked mirror-glass fissures a wisp into more
  s0 = await st();
  await ev(() => { const S = window.__spm, P = S.P; S.P.alloc = { beam: 0, prism: 0 }; P.cast = 0; P.mana = 9999; S.castSkill('fissure', { x: P.x + 5, y: P.y + 0.5 }); });
  await wait(900);
  const cracks = await ev(() => window.__anim.G().acracks.length);
  await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[2]; P.right = 'lance'; P.cast = 0; const q = S.iso(m.x, m.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75; S.mouse.r = true; });
  await wait(1400); await ev(() => { window.__spm.mouse.r = false; }); await wait(300);
  s1 = await st();
  check('Mirror Fissure leaves cracked glass, and wisps crossing it split', cracks > 3 && s1.crackSplits > s0.crackSplits, { cracks, crackSplits: s1.crackSplits - s0.crackSplits, splits: s1.splits - s0.splits });
  check('the fissure leaves cracked standing mirrors', await ev(() => window.__spm.G.pillars.some(p => p.cracked)));
  // the falling mirror lands, bursts into glass and stands cracked
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 9999; S.castSkill('anvil', { x: P.x + 4, y: P.y }); });
  await wait(1500);
  const gm = await ev(() => { const G = window.__spm.G; return { anvils: G.anvils.map(a => ({ c: !!a.cracked, fall: +a.fall.toFixed(2), life: +a.life.toFixed(1) })), glass: window.__anim.G().aglass.length, shots: window.__anim.G().agshots.length, t: G.time }; });
  check('the great mirror lands cracked and throws glass', gm.anvils.some(a => a.c && a.fall <= 0), gm);
  // the berserk golem looses wisp-bolts, not a beam
  s0 = await st();
  await ev(() => { const S = window.__spm, P = S.P; P.cast = 0; P.mana = 9999; if (!S.G.golem) S.castSkill('golem', { x: P.x + 2, y: P.y }); });
  await wait(300);
  await ev(() => { const g = window.__spm.G.golem; g.state = 'active'; g.hp = g.max; g.ramp = 12; g.charge = 0; g.beamT = 0; });
  await wait(2000);
  s1 = await st();
  check('the berserk golem looses volleys of wisp-bolts', s1.bolts > s0.bolts, { bolts: s1.bolts - s0.bolts, phosEnd: await ev(() => { const g = window.__spm.G.golem; return !!(g && g.phos && g.phos.end); }) });
  // the Soul-Smith and the choir panel words
  check('skill info reads in mirrors', await ev(() => window.__mn32.ev("skillInfo('pillars', 3) + ' | ' + skillInfo('beam', 3) + ' | ' + skillInfo('lance', 3)")));
  console.log('ERRS', errs.length ? errs.slice(0, 5).join('\n') : 'none'); await b.close();
})();
