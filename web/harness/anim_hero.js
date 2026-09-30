// showcase frames of the Animancer's wisps and mirrors, cropped tight: HTML=/tmp/anim.html ZONE=fen node anim_hero.js <prefix> [scene]
// scenes: ricochet | fissure | great | berserk | all
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.setDefaultTimeout(150000); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  const H = process.env.HTML || 'spiritmancer.html';
  await p.goto('file://' + (H[0] === '/' ? H : process.cwd() + '/' + H));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), pre = process.argv[2] || 'hero', scene = process.argv[3] || 'all';
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await wait(500);
  if (process.env.ZONE) { await ev(z => window.__spm.enterZone(z), process.env.ZONE); await wait(700); }
  await ev((RJ) => {
    const S = window.__spm, P = S.P, G = S.G, z = G.zone; for (const k in G.panels) G.panels[k] = false;
    G.zone.monsters.forEach(m => { m.dead = true; });
    for (const k of Object.keys(S.SK)) if ((S.SK[k].cls || 'animancer') === 'animancer') { P.skills[k] = 12; P.hard[k] = 12; }
    for (const k of ['resonance', 'prismex', 'prismL', 'focus', 'anvilquake', 'ghostfire', 'jugg']) { P.skills[k] = 12; P.hard[k] = 12; } P.skills.challenge = 0; P.hard.challenge = 0;
    S.rederive(); P.hp = 1e6; S.getD().maxHp = 1e6; P.mana = 9999; P.alloc = { beam: 0, prism: 0 };
    G.clock = 600 * 0.3;
    let best = null, bs = -1e9;
    for (let y = 12; y < z.h - 8; y += 1) for (let x = 5; x < z.w - 12; x += 1) {
      let ok = true; for (let j = -10; j <= 4 && ok; j++) for (let i = -3; i <= 10 && ok; i++) { const t = z.get(x + i, y + j); if (z.solidAt(x + i + 0.5, y + j + 0.5) || ![0, 1, 6, 11, 14].includes(t)) ok = false; }
      if (!ok) continue; const objs = (z.objects || []).filter(o => o.x > x - 3 && o.x < x + 10 && o.y > y - 9 && o.y < y + 4).length; const sc = -objs * 10 - Math.hypot(x - P.x, y - P.y) * 0.01;
      if (sc > bs) { bs = sc; best = { x: x + 0.5, y: y + 0.5 }; }
    }
    if (best) { P.x = best.x; P.y = best.y; }
    for (const w of P.wisps) { w.x = P.x; w.y = P.y; }
  }, 6);
  await wait(2600);   // the camera settles, the zone banner fades
  const spawn = (type, dx, dy) => ev(([t, dx, dy]) => { const S = window.__spm, P = S.P; const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); m.hp = m.max = 1e5; m.state = 'chase'; m.b = { ...m.b, ai: 'none' }; m.spd = 0.0001; m._t = 1; S.G.zone.monsters.push(m); }, [type, dx, dy]);
  const cast = (id, dx, dy) => ev(([id, dx, dy]) => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const clipAt = (dx, dy, w, h) => ev(([dx, dy, w, h]) => window.__mn32.ev(`(() => { snapCam(); const q = iso(P.x + ${dx}, P.y + ${dy}), c = document.querySelector('canvas'), r = c.getBoundingClientRect(), k = r.width / W; return { x: Math.round(r.left + q.sx * ZK * k - ${w} / 2), y: Math.round(r.top + q.sy * ZK * k - ${h} / 2), width: ${w}, height: ${h} }; })()`), [dx, dy, w, h]);
  const clear = () => ev(() => { const S = window.__spm, G = S.G; G.zone.monsters.forEach(m => { if (m._t) m.dead = true; }); G.pillars = []; G.anvils = []; G.golem = null; window.__anim.anReset(); S.P.alloc = { beam: 0, prism: 0 }; S.mouse.r = false; });
  const aimAt = i => ev(i => window.__mn32.ev(`(() => { const m = G.zone.monsters.filter(m => !m.dead && m._t)[${i}], q = iso(m.x, m.y); mouse.x = q.sx * ZK; mouse.y = q.sy * ZK; })()`), i);
  let n = 0;
  const shots = async (name, k, gap, clip) => { for (let i = 0; i < k; i++) { await p.screenshot({ path: `${pre}_${name}${i}.png`, clip }); await wait(gap); } };
  if (scene === 'all' || scene === 'ricochet') {
    for (const [t, dx, dy] of [['hollow', 5.5, -3.5], ['hollow', 4.5, -5.5], ['hound', 6.5, -1.8], ['hollow', 7, -5]]) await spawn(t, dx, dy);
    await cast('golem', 2.2, -5.2); await wait(300);
    await cast('pillars', 2.8, -1.6); await wait(500);
    const clip = await clipAt(3.2, -3, 320, 190);
    await ev(() => { const S = window.__spm; S.P.alloc = { beam: 4, prism: 3 }; });
    await wait(500);
    await shots('choir', 6, 110, clip);
    await ev(() => { const S = window.__spm; S.P.alloc = { beam: 0, prism: 0 }; S.P.right = 'lance'; S.mouse.r = true; }); await aimAt(0);
    await shots('dart', 8, 70, clip);
    await clear();
  }
  if (scene === 'all' || scene === 'fissure') {
    for (const [t, dx, dy] of [['hollow', 6, -3], ['hollow', 5, -5.5], ['hollow', 7, -1]]) await spawn(t, dx, dy);
    const clip = await clipAt(3, -2.5, 320, 190);
    await cast('fissure', 6, -3); await wait(160); await shots('crack', 3, 120, clip);
    await wait(300);
    await ev(() => { const S = window.__spm; S.P.right = 'lance'; S.mouse.r = true; }); await aimAt(0);
    await shots('split', 8, 70, clip);
    await clear();
  }
  if (scene === 'all' || scene === 'great') {
    for (const [t, dx, dy] of [['hollow', 4.6, -2.4], ['hollow', 5.4, -3.8], ['hollow', 3.8, -3.6]]) await spawn(t, dx, dy);
    const clip = await clipAt(3.5, -3.2, 320, 220);
    const an = await cast('anvil', 4.6, -3); console.log('anvils', await ev(() => window.__spm.G.anvils.length)); await wait(120); await shots('great', 8, 90, clip);
    await wait(500); await shots('greatstand', 1, 10, clip);
    await clear();
  }
  if (scene === 'all' || scene === 'berserk') {
    for (const [t, dx, dy] of [['hollow', 5, -2.5], ['hollow', 5.5, -4.5], ['hound', 6.5, -1], ['hollow', 4, -5.5]]) await spawn(t, dx, dy);
    await cast('golem', 2.2, -1.8); await wait(300);
    await cast('pillars', 4.2, -0.8); await wait(300);
    const clip = await clipAt(3.2, -2.5, 320, 190);
    await ev(() => { const S = window.__spm, g = S.G.golem; if (g) { g.state = 'active'; g.ramp = 12; g.charge = 0; g.beamT = 0; } });
    await wait(150); await shots('berserk', 8, 80, clip);
  }
  console.log('ERRS', errs.length ? errs.slice(0, 5).join('\n') : 'none'); await b.close();
})();
