// v0.17 mobile: emulate a phone and play by touch
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctxm = await b.newContext({ ...devices['Pixel 7 landscape'] || { viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2.6 } });
  const p = await ctxm.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  check('touch mode detected on a phone', await ev(() => window.__spm.G.touch), null);
  await p.evaluate(() => { window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); }); await wait(500);
  await ev(() => { const S = window.__spm; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 14) { m.x += 40; m.y += 40; m.state = 'idle'; } }); });
  const box = await p.$('canvas#game'), bb = await box.boundingBox(), at = (x, y) => [bb.x + x * bb.width / 480, bb.y + y * bb.height / 270];
  const touch = async (type, x, y) => { const [cx, cy] = at(x, y); await p.evaluate(([type, cx, cy]) => { const cv = document.getElementById('game'); const t = new Touch({ identifier: 1, target: cv, clientX: cx, clientY: cy }); cv.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); }, [type, cx, cy]); };
  // tap = move there
  const p0 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y }));
  await touch('touchstart', 300, 170); await wait(60); await touch('touchend', 300, 170); await wait(1200);
  const p1 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y }));
  check('a tap walks the hero there', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 0.8, [p0, p1]);
  // drag = follow the finger
  await touch('touchstart', 240, 140); for (let i = 0; i < 10; i++) { await touch('touchmove', 240 - i * 12, 140 + i * 3); await wait(60); } await wait(400);
  const p2 = await ev(() => ({ x: window.__spm.P.x, y: window.__spm.P.y, hold: window.__spm.mouse.holdMove }));
  await touch('touchend', 120, 170);
  check('dragging a finger does not steer the hero', !p2.hold, p2);
  // hold still = right click (the right skill casts)
  await ev(() => { const S = window.__spm; S.P.hard.blance = 5; S.rederive(); S.P.right = 'blance'; S.P.mana = 999; S.P.hp = 9999; for (const k in S.G.panels) S.G.panels[k] = false; S.G.map = false; });
  const m0 = await ev(() => window.__spm.P.mana);
  await touch('touchstart', 300, 120); await wait(700);
  const held = await ev(() => window.__spm.mouse.r); await touch('touchend', 300, 120); await wait(200);
  const m1 = await ev(() => window.__spm.P.mana);
  check('touch and hold is a held right click that casts', held && m1 < m0, [held, m0, m1]);
  // auto-attack: an enemy walks up while you stand still
  await ev(() => { const S = window.__spm, { P, G } = S; const m = G.zone.monsters.find(q => q.rank !== 'boss' && q.b && q.b.ai === 'melee') || G.zone.monsters[0]; m.dead = false; m.hatched = false; m.hp = m.max = 500; m.x = P.x + 1.3; m.y = P.y + 0.3; m.state = 'chase'; P.path = null; P.target = null; P.left = 'attack'; });
  await wait(1500);
  console.log(await ev(() => { const S = window.__spm, P = S.P; return { auto: S.TOUCH.auto, on: S.TOUCH.on, path: !!P.path, target: P.target && P.target.kind, cast: P.cast, roll: P.roll, panel: S.anyPanelOpen(), mr: S.mouse.r, ml: S.mouse.l, fingers: S.TOUCH.fingers.size, mons: S.G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 5).map(m => [m.type, m.hp]) }; }));
  check('auto-attack strikes a nearby enemy', await ev(() => { const S = window.__spm; return S.G.zone.monsters.some(m => !m.dead && m.hp < 500 && Math.hypot(m.x - S.P.x, m.y - S.P.y) < 4); }));
  // the roll button
  await ev(() => { const S = window.__spm; S.TOUCH.auto = false; S.P.target = null; }); await wait(800);
  const st = await ev(() => window.__spm.P.stam);
  await touch('touchstart', 452, 240 - 36); await touch('touchend', 452, 240 - 36); await wait(100);
  check('the ROLL button rolls', await ev(() => window.__spm.P.roll > 0 || window.__spm.P.stam < 50), st);
  await p.screenshot({ path: 'shot30_mobile.png' });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
