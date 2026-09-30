// animancer mirror/wisp screenshots: HTML=/tmp/anim.html node anim_shot.js <prefix> [scene]
// scenes: all (default). Writes <prefix>_*.png, prints errors.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: +(process.env.DSF || 1) });
  p.setDefaultTimeout(150000); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), pre = process.argv[2] || 'anim';
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await wait(500);
  await ev(() => {
    const S = window.__spm, P = S.P, G = S.G; for (const k in G.panels) G.panels[k] = false;
    G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 12; P.hard[k] = 12; }
    for (const k of ['resonance', 'magnet', 'fshrap', 'fdeep', 'sweep', 'beamburn', 'prismex', 'prismchain', 'prismL', 'focus', 'anvilquake', 'maidcrush', 'spikedcage', 'ghostfire']) { P.skills[k] = 12; P.hard[k] = 12; }
    S.rederive(); P.hp = 1e6; S.getD().maxHp = 1e6; P.mana = 9999; P.alloc = { beam: 3, prism: 3 };
    G.clock = 600 * 0.3;
  });
  const spawn = (type, dx, dy) => ev(([t, dx, dy]) => { const S = window.__spm, P = S.P; const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); m.hp = m.max = 1e5; m.state = 'chase'; m.b = { ...m.b, ai: 'none' }; m.spd = 0.0001; S.G.zone.monsters.push(m); }, [type, dx, dy]);
  const cast = (id, dx, dy) => ev(([id, dx, dy]) => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const shot = async (n) => { await p.screenshot({ path: pre + '_' + n + '.png' }); };
  for (const [t, dx, dy] of [['hollow', 3.5, -1], ['hound', 4.5, 1], ['knight', 2, 3], ['archer', 5, -2.5], ['caster', 3, 4.5], ['hollow', 6, 1.5]]) await spawn(t, dx, dy);
  await cast('golem', 2, 0.5); await wait(300);
  await cast('pillars', 3, -3); await wait(400);
  await shot('mirrors');
  await wait(900); await shot('wisps1'); await wait(160); await shot('wisps2'); await wait(160); await shot('wisps3');
  // the lance: a darting wisp
  await ev(() => { const S = window.__spm; S.P.right = 'lance'; S.mouse.r = true; });
  const q = await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[0]; const r = S.iso(m.x, m.y); return r; });
  await wait(250); await shot('lance1'); await wait(120); await shot('lance2'); await wait(120); await shot('lance3');
  await ev(() => { window.__spm.mouse.r = false; });
  await cast('fissure', 4, 2); await wait(200); await shot('fissure1'); await wait(400); await shot('fissure2');
  await cast('cage', 4.5, 1); await wait(350); await shot('cage');
  await cast('anvil', 3.5, -1); await wait(250); await shot('anvil1'); await wait(350); await shot('anvil2'); await wait(600); await shot('anvil3');
  // berserk golem
  await ev(() => { const S = window.__spm, g = S.G.golem; if (g) { g.ramp = 10; g.charge = 0; g.beamT = 0; } });
  await wait(700); await shot('berserk1'); await wait(250); await shot('berserk2');
  for (const id of ['totem', 'swarm', 'storm', 'orb', 'word', 'chain', 'mark', 'cull', 'leash', 'wraith', 'wraith']) { await cast(id, 3, 0.5); await wait(150); }
  await wait(1500); await shot('all');
  console.log('ERRS', errs.length ? errs.slice(0, 5).join('\n') : 'none'); await b.close();
})();
