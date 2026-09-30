// v0.20: wand missiles, gentler opening, the test button through the Seer, full screen button, a controller
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.addInitScript(() => {
    const btn = () => ({ pressed: false, value: 0 });
    window.__pad = { index: 0, connected: true, id: 'fake', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn), timestamp: 0 };
    navigator.getGamepads = () => [window.__pad];
  });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  check('no class picker on the title screen', await ev(() => !document.querySelector('.cls')));
  check('a Full screen button on the title screen', await ev(() => !!document.getElementById('fsBtn')));
  // the test button goes through the Seer's god choice
  await p.click('#testBtn'); await wait(400);
  check('Test character opens the god choice', await ev(() => window.__spm.G.divine && window.__spm.G.divine.scene === 'star'));
  const box = await p.$('canvas#game'), bb = await box.boundingBox(), cl = (x, y) => p.mouse.click(bb.x + x * bb.width / 480, bb.y + y * bb.height / 270);
  await wait(300); await cl(294, 96); await wait(400); await cl(240, 240); await wait(200); await cl(240, 240); await wait(200); await cl(240, 240); await wait(200); await cl(240, 240); await wait(600);
  const st = await ev(() => ({ run: window.__spm.G.running, cls: window.__spm.P.cls, lvl: window.__spm.P.level }));
  check('choosing Vey makes a level 30 Animancer', st.run && st.cls === 'animancer' && st.lvl === 30, st);
  // wand missiles from range
  const r = await ev(() => {
    const S = window.__spm, { P, G } = S; for (const k in G.panels) G.panels[k] = false;
    P.eq.weapon = S.rollItem ? P.eq.weapon : P.eq.weapon; P.eq.weapon = { base: 'wand', name: 'Bone Wand', q: 'normal', stats: {}, dmg: [2, 5], w: 1, h: 2 }; S.rederive();
    G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 12) { m.x += 50; m.y += 50; m.state = 'idle'; } });
    const m = G.zone.monsters.find(q => !q.dead && q.rank !== 'boss'); m.x = P.x + 4; m.y = P.y; m.hp = m.max = 9999; m.state = 'idle'; m.spd = 0.01; m.b = { ...m.b, spd: 0.01 };
    P.left = 'attack'; P.target = { kind: 'mon', ref: m }; P.cast = 0; return { hp: m.hp };
  });
  await wait(900);
  const r2 = await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.find(q => q.hp < 9999 && !q.dead); return { hit: !!m, d: m ? Math.hypot(m.x - P.x, m.y - P.y) : null }; });
  check('a wand shoots magic missiles from range', r2.hit && r2.d > 2.5, r2);
  // the opening is gentler: level 1 hollows have about 45% of the old life
  const hp = await ev(() => { const S = window.__spm; const m = S.G.zone.monsters.find(m => m.mlvl <= 5 && m.rank === 'normal' && m.max < 9000); return m ? { max: m.max, want: m.b.hp * (1 + 0.35 * (m.mlvl - 1)) * 1.6 * 0.455 } : null; });
  check('opening monsters have 45.5% of the old life', hp && Math.abs(hp.max - hp.want) < 0.5, hp);
  // controller: left stick moves
  await ev(() => { const S = window.__spm; S.P.target = null; S.P.path = null; });
  const p0 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y }));
  await ev(() => { window.__pad.axes[0] = 1; }); await wait(700); await ev(() => { window.__pad.axes[0] = 0; }); await wait(150);
  const p1 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y }));
  check('the left stick walks the hero', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 1, [p0, p1]);
  // controller: A attacks what is near
  await ev(() => { const S = window.__spm, P = S.P, m = S.G.zone.monsters.find(q => q.hp < 9999 && !q.dead) || S.G.zone.monsters.find(q => !q.dead); m.x = P.x + 3; m.y = P.y; m.hp = m.max = 9999; window.__tm = m; });
  await ev(() => { window.__pad.buttons[0].pressed = true; }); await wait(900); await ev(() => { window.__pad.buttons[0].pressed = false; }); await wait(200);
  check('A attacks the nearest enemy', await ev(() => window.__tm.hp < 9999));
  // controller: Start opens the menu, B closes it
  await ev(() => { window.__pad.buttons[9].pressed = true; }); await wait(100); await ev(() => { window.__pad.buttons[9].pressed = false; }); await wait(100);
  const mo = await ev(() => !document.getElementById('menu').hidden);
  await ev(() => { window.__pad.buttons[1].pressed = true; }); await wait(100); await ev(() => { window.__pad.buttons[1].pressed = false; }); await wait(100);
  const mc = await ev(() => document.getElementById('menu').hidden);
  check('Start pauses, B resumes', mo && mc, [mo, mc]);
  // controller: D-pad down opens the inventory, and the stick then moves a cursor
  await ev(() => { window.__pad.buttons[13].pressed = true; }); await wait(100); await ev(() => { window.__pad.buttons[13].pressed = false; }); await wait(100);
  const m0 = await ev(() => ({ inv: window.__spm.G.panels.inv, x: window.__spm.mouse.x }));
  await ev(() => { window.__pad.axes[0] = -1; }); await wait(300); await ev(() => { window.__pad.axes[0] = 0; }); await wait(100);
  const m1 = await ev(() => window.__spm.mouse.x);
  check('D-pad down opens the inventory and the stick moves a cursor', m0.inv && m1 < m0.x - 10, [m0, m1]);
  await p.screenshot({ path: 'shot31.png' });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
