// desktop fork: heavy swing checks (zz_mech_heavy.js)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const gw = async sec => { const t0 = await ev(() => window.__spm.G.time); for (let k = 0; k < 400; k++) { await wait(40); if ((await ev(() => window.__spm.G.time)) - t0 >= sec) return; } };
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const CLS = process.env.CLS || 'animancer';
  await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, CLS);
  await wait(600);
  check('heavy option on by default', await ev(() => window.__spm.OPT.heavy === true));
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { m.x += 80; m.y += 80; m.state = 'idle'; }); S.P.left = 'attack'; S.P.eq.weapon = null; S.rederive(); S.P.hp = 1e6; });
  const mi = await ev(() => { const S = window.__spm, P = S.P; const m = S.makeMon('hollow', P.x + 1.0, P.y - 1.0, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none', poiseK: 1000 }; m.spd = 0.0001; m.dmg = [0, 0]; m.state = 'idle'; S.G.zone.monsters.push(m); return S.G.zone.monsters.length - 1; });
  // find the monster on screen: move the real mouse until the game hovers it
  await p.mouse.move(1000, 500); await wait(50);
  const sc = await ev(() => { const cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(), mx = window.__spm.mouse.x; return { k: (1000 - r.left) / mx, left: r.left, top: r.top }; });
  const pt = await ev(([i, sc]) => { const S = window.__spm, m = S.G.zone.monsters[i], q = S.iso(m.x, m.y); return { x: sc.left + q.sx * 0.75 * sc.k, y: sc.top + q.sy * 0.75 * sc.k, k: sc.k }; }, [mi, sc]);
  const _unused = async () => ev(i => { const S = window.__spm, m = S.G.zone.monsters[i], q = S.iso(m.x, m.y), cv = document.querySelector('canvas'), r = cv.getBoundingClientRect(); return { x: r.left + q.sx * 0.75 * r.width / cv.width, y: r.top + q.sy * 0.75 * r.height / cv.height, k: r.height / cv.height }; }, mi);
  let hov = null;
  const findHov = async () => { await gw(0.6); const pt = await ev(([i, sc]) => { const S = window.__spm, m = S.G.zone.monsters[i], q = S.iso(m.x, m.y); return { x: sc.left + q.sx * 0.75 * sc.k, y: sc.top + q.sy * 0.75 * sc.k, k: sc.k }; }, [mi, sc]); for (const dy of [-10, -6, -14, -3, -18, 0]) { await p.mouse.move(pt.x, pt.y + dy * pt.k); await wait(80); if (await ev(i => { const S = window.__spm; return !!(S.G.hover && S.G.hover.ref === S.G.zone.monsters[i]); }, mi)) return { x: pt.x, y: pt.y + dy * pt.k }; } return pt; };
  for (const dy of [-10, -6, -14, -3, -18, 0]) { await p.mouse.move(pt.x, pt.y + dy * pt.k); await wait(80); if (await ev(i => { const S = window.__spm; return !!(S.G.hover && S.G.hover.ref === S.G.zone.monsters[i]); }, mi)) { hov = { x: pt.x, y: pt.y + dy * pt.k }; break; } }
  check('the test monster is under the cursor', !!hov);
  if (!hov) hov = pt;
  const snap = () => ev(i => { const S = window.__spm, m = S.G.zone.monsters[i]; return { hp: m.hp, poise: m.poise == null ? null : m.poise, st: S.HV.st, heavy: S.HV.stats.heavy, taps: S.HV.stats.taps, cancels: S.HV.stats.cancels, stam: S.P.stam, x: S.P.x, y: S.P.y }; }, mi);
  const ready = async () => { for (let k = 0; k < 40; k++) { if (await ev(() => window.__spm.P.cast <= 0 && window.__spm.P.roll <= 0)) return; await wait(50); } };
  const reset = () => ev(i => { const S = window.__spm, P = S.P, m = S.G.zone.monsters[i]; P.x = m.x - 1.0; P.y = m.y + 1.0; P.target = null; P.path = null; m.poise = null; P.stam = S.getD().maxStam; P.wisps.length = 0; }, mi);
  // ---- taps
  const taps = [];
  for (let k = 0; k < 4; k++) {
    await reset(); await ready(); const a = await snap();
    await p.mouse.move(hov.x, hov.y); await p.mouse.down(); await wait(60); await p.mouse.up(); await gw(0.4);
    const c = await snap(); taps.push({ d: a.hp - c.hp, pd: a.poise == null ? (await ev(i => { const S = window.__spm, m = S.G.zone.monsters[i]; return m.max * 1000; }, mi)) - c.poise : a.poise - c.poise, heavy: c.heavy - a.heavy, tp: c.taps - a.taps, hov: await ev(i => { const S = window.__spm; return !!(S.G.hover && S.G.hover.ref === S.G.zone.monsters[i]); }, mi) });
  }
  const tapD = taps.reduce((s, t) => s + t.d, 0) / taps.length, tapP = taps.reduce((s, t) => s + t.pd, 0) / taps.length;
  check('a tap is one normal hit', taps.every(t => t.d > 0 && t.heavy === 0 && t.tp === 1), taps);
  // ---- hold then release
  await reset(); await ready(); let a = await snap();
  await p.mouse.move(hov.x, hov.y); await p.mouse.down();
  let bigDrop = 0; { let lh = a.hp; const g0 = await ev(() => window.__spm.G.time); while ((await ev(() => window.__spm.G.time)) - g0 < 0.5) { await wait(30); const s2 = await snap(); bigDrop = Math.max(bigDrop, lh - s2.hp); lh = s2.hp; } }
  const mid = await snap();
  check('holding winds up (no blow yet)', mid.st === 'charge' && bigDrop < Math.min(...taps.map(t => t.d)) * 0.6, { bigDrop, st: mid.st });
  await gw(0.55);
  const full = await ev(() => window.__spm.HV.full);
  await p.screenshot({ path: '/tmp/heavy_charge.png' });
  await p.mouse.up(); await gw(0.5);
  let c = await snap();
  const hd = a.hp - c.hp, hp = (a.poise == null ? await ev(i => window.__spm.G.zone.monsters[i].max * 1000, mi) : a.poise) - c.poise;
  check('full charge reached', full);
  check('release = heavy hit, more damage', c.heavy - a.heavy === 1 && hd > tapD * 1.4, { heavyDmg: hd, tapAvg: tapD, ratio: hd / tapD });
  check('heavy does much more poise damage', hp > tapP * 4, { heavyPoise: hp, tapPoise: tapP, ratio: hp / tapP });
  check('heavy costs player poise', a.stam - c.stam > 10, { before: a.stam, after: c.stam });
  check('heavy lunges forward', Math.hypot(c.x - a.x, c.y - a.y) > 0.05, { moved: Math.hypot(c.x - a.x, c.y - a.y) });
  // ---- zero poise still swings heavy
  await reset(); await ready();
  await ev(() => { const P = window.__spm.P; P.stam = 0; P.stamDelay = 99; });
  a = await snap();
  await p.mouse.move(hov.x, hov.y); await p.mouse.down(); await gw(0.9);
  const lowInfo = await ev(() => { const S = window.__spm; return { full: S.HV.full, t: S.HV.t, held: S.HV.heldT, stam: S.P.stam, st: S.HV.st }; }); const lowFull = lowInfo.full;
  await gw(0.5); await p.mouse.up(); await gw(0.6);
  c = await snap();
  check('zero poise still allows a heavy swing (slower wind-up)', c.heavy - a.heavy === 1 && a.hp - c.hp > 0 && !lowFull, { dmg: a.hp - c.hp, lowInfo, stam: c.stam });
  await ev(() => { window.__spm.P.stamDelay = 0; });
  // ---- a roll cancels
  await reset(); await ready(); a = await snap();
  await p.mouse.move(hov.x, hov.y); await p.mouse.down(); await gw(0.45);
  const pre = await snap();
  await p.keyboard.press(' '); await gw(0.15); await p.mouse.up(); await gw(0.5);
  c = await snap();
  check('a roll cancels the charge', pre.st === 'charge' && c.cancels - a.cancels === 1 && c.heavy === a.heavy && c.taps === a.taps, { pre: pre.st, c });
  // ---- options toggle through the menu
  await ev(() => { window.__spm.P.x += 0; }); await p.keyboard.press('Escape'); await wait(300);
  await p.click('#mOpts'); await wait(200);
  const lab0 = await p.textContent('#oHeavy');
  await p.click('#oHeavy'); await wait(200);
  const lab1 = await p.textContent('#oHeavy');
  await p.screenshot({ path: '/tmp/heavy_options.png' });
  const saved = await ev(() => JSON.parse(localStorage.getItem('triune.opts') || '{}').heavy);
  check('options toggle works and is saved', lab0.endsWith(': on') && lab1.endsWith(': off') && saved === false, { lab0, lab1, saved });
  await p.click('#mResume'); await wait(300);
  // ---- toggle off: holding repeats normal attacks
  await reset(); await ready(); hov = await findHov(); a = await snap();
  await p.mouse.move(hov.x, hov.y); await p.mouse.down();
  let sawCharge = false, hits = 0, lh = a.hp; const g0 = await ev(() => window.__spm.G.time);
  while ((await ev(() => window.__spm.G.time)) - g0 < 1.6) { await wait(30); const s2 = await snap(); if (s2.st !== 'idle') sawCharge = true; if (lh - s2.hp > 4) hits++; lh = s2.hp; }
  await p.mouse.up(); await gw(0.3); c = await snap();
  check('toggle off: no charging, holding repeats normal blows', !sawCharge && c.heavy === a.heavy && hits >= 2, { hits, dmg: a.hp - c.hp, tapD });
  await ev(() => { window.__spm.OPT.heavy = true; });
  // ---- gamepad-style hold (A held) winds up too
  await reset(); await ready(); a = await snap();
  await ev(i => { const S = window.__spm; S.PAD.aHeld = true; S.P.target = { kind: 'mon', ref: S.G.zone.monsters[i] }; }, mi);
  await gw(0.7); const pc = await snap();
  await ev(() => { window.__spm.PAD.aHeld = false; }); await gw(0.5); c = await snap();
  check('pad A hold winds up and releases heavy', pc.st === 'charge' && c.heavy - a.heavy === 1, { pc: pc.st });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
