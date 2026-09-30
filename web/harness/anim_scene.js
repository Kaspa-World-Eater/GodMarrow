// clean animancer scenes for screenshots: HTML=/tmp/anim.html node anim_scene.js <prefix>
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(150000); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), pre = process.argv[2] || 'scene';
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await wait(500);
  if (process.env.ZONE) { await ev(z => window.__spm.enterZone(z), process.env.ZONE); await wait(700); }
  const at = await ev((RJ) => {
    const S = window.__spm, P = S.P, G = S.G, z = G.zone; for (const k in G.panels) G.panels[k] = false;
    G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 12; P.hard[k] = 12; }
    for (const k of ['resonance', 'fshrap', 'prismex', 'prismL', 'focus', 'anvilquake', 'ghostfire', 'jugg']) { P.skills[k] = 12; P.hard[k] = 12; }
    S.rederive(); P.hp = 1e6; S.getD().maxHp = 1e6; P.mana = 9999; P.alloc = { beam: 4, prism: 3 };
    G.clock = 600 * 0.3;
    // an open patch of ground, away from props
    let best = null, bs = -1;
    for (let y = 8; y < z.h - 8; y += 2) for (let x = 8; x < z.w - 8; x += 2) {
      let ok = true; for (let j = -RJ; j <= RJ && ok; j++) for (let i = -RJ - 2; i <= RJ + 2 && ok; i++) if (z.solidAt(x + i + 0.5, y + j + 0.5)) ok = false;
      if (!ok) continue; const objs = (z.objects || []).filter(o => Math.abs(o.x - x) < 9 && Math.abs(o.y - y) < 9).length; const sc = -objs - Math.hypot(x - P.x, y - P.y) * 0.01;
      if (sc > bs) { bs = sc; best = { x: x + 0.5, y: y + 0.5 }; }
    }
    if (best) { P.x = best.x; P.y = best.y; }
    for (const w of P.wisps) { w.x = P.x; w.y = P.y; }
    return best;
  }, +(process.env.RJ || 6));
  const spawn = (type, dx, dy) => ev(([t, dx, dy]) => { const S = window.__spm, P = S.P; const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); m.hp = m.max = 1e5; m.state = 'chase'; m.b = { ...m.b, ai: 'none' }; m.spd = 0.0001; S.G.zone.monsters.push(m); }, [type, dx, dy]);
  const cast = (id, dx, dy) => ev(([id, dx, dy]) => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const clip = { x: 280, y: 110, width: 400, height: 250 };
  const shot = async (n) => { await p.screenshot({ path: pre + '_' + n + '.png', clip }); };
  for (const [t, dx, dy] of [['hollow', 5, -4], ['hollow', 6.5, -2.5], ['hollow', 4, -6], ['hound', 7.5, -5], ['hollow', 3, 3.5]]) await spawn(t, dx, dy);
  // mirrors first: standing mirrors between you and the foes, the golem off to the side
  await wait(900);
  await wait(2500); await cast('pillars', 3, -1.2); await wait(200);
  await cast('golem', 1.5, 2); await wait(400);
  await shot('mirrors');
  for (let i = 0; i < 6; i++) { await wait(140); await shot('wisps' + i); }
  // the dart
  await ev(() => { const S = window.__spm; S.P.alloc = { beam: 0, prism: 0 }; S.P.right = 'lance'; });
  await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.filter(m => !m.dead)[0], q = S.iso(m.x, m.y); S.mouse.x = q.sx * 0.75; S.mouse.y = q.sy * 0.75; S.mouse.r = true; });
  for (let i = 0; i < 5; i++) { await wait(90); await shot('dart' + i); }
  await ev(() => { window.__spm.mouse.r = false; }); await wait(600);
  // the fissure of cracked mirror, then darts across it
  await cast('fissure', 5, -4); await wait(180); await shot('fissure0'); await wait(250); await shot('fissure1');
  await ev(() => { const S = window.__spm; S.P.alloc = { beam: 5, prism: 0 }; }); await wait(900); await shot('fissure2'); await wait(150); await shot('fissure3');
  await cast('anvil', 5.5, -3.2); await wait(280); await shot('great0'); await wait(260); await shot('great1'); await wait(500); await shot('great2');
  await cast('cage', 5, -4); await wait(350); await shot('hall');
  await ev(() => { const S = window.__spm, g = S.G.golem; if (g) { g.ramp = 12; g.charge = 0; g.beamT = 0; } });
  await wait(450); await shot('berserk0'); await wait(250); await shot('berserk1');
  console.log('at', JSON.stringify(at), 'ERRS', errs.length ? errs.slice(0, 5).join('\n') : 'none'); await b.close();
})();
