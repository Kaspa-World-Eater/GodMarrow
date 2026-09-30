const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console:', m.text().slice(0, 300)); }); const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); }); await wait(600);
  const w = await ev(() => { const S = window.__spm, z = S.G.zone; let sh = 0, fl = 0, ru = 0; for (const t of z.t) { if (t === S.T.SHALLOW) sh++; if (t === S.T.FLAGS) fl++; if (t === 15) ru++; } return { ruins: (z.ruins || []).length, sh, fl, ru, altars: z.objects.filter(o => o.type === 'altar').length }; });
  check('the moor has ruins, shallows and flagstones', w.ruins >= 3 && w.sh > 20 && w.fl > 20, w);
  // force an altar next to the hero, wake it, kill its herald
  const h = await ev(() => { const S = window.__spm, P = S.P, z = S.G.zone; for (const k in S.G.panels) S.G.panels[k] = false; const o = { type: 'altar', god: 'bone', x: P.x + 1.5, y: P.y, used: false }; z.objects.push(o); const maj0 = P.arc.maj; S.altarInteract(o); const m = z.monsters.find(q => q.herald); return { maj0, name: m && m.name, hp: m && m.max }; });
  check('an altar wakes its Herald', h.name === 'The Marrow Pontiff', h);
  await wait(1500);
  const k = await ev(() => { const S = window.__spm, m = S.G.zone.monsters.find(q => q.herald); S.killMon(m); return { maj: S.P.arc.maj, used: S.G.zone.objects.find(o => o.type === 'altar').used, done: S.P.done.includes('herald:bone') }; });
  check('killing a Herald grants a Major token and spends the altar', k.maj === h.maj0 + 1 && k.used && k.done, k);
  // the web grew by half, majors need tokens
  const wb = await ev(() => { const S = window.__spm, W = S.web(); const ids = Object.keys(W).filter(k => k !== 'heart'); const th = ids.filter(k => S.ARC[k].kind === 'thread').length; const maj = ids.find(k => S.ARC[k].kind === 'major'); S.P.arc.maj = 0; const why = S.arcWhyNot(maj); return { n: ids.length, th, why }; });
  check('the web has 50% more nodes (threads) and Majors need a Herald', wb.th >= 17 && /Herald/.test(wb.why || ''), wb);
  const cap = await ev(() => { const S = window.__spm, P = S.P; P.arc.got = 15; const a = P.arc.pts; S.gainArcana(3, 'test'); const b = P.arc.pts; S.gainArcana(1, 'test'); return { gained: b - a, after: P.arc.pts - b }; });
  check('Minor Arcana are capped per act', cap.gained === 1 && cap.after === 0, cap);
  // night: the hero's light matters
  await ev(() => { const S = window.__spm; S.G.clock = 600 * 0.75; }); await wait(900);
  const nl = await ev(() => { const S = window.__spm, P = S.P; return { k: S.dayK(), near: S.lightLevel(P.x + 1, P.y), far: S.lightLevel(P.x + 14, P.y + 14) }; });
  check('night is dark away from your light', nl.k === 0 && nl.near > 0.7 && nl.far < 0.3, nl);
  await p.screenshot({ path: 'shot33_night.png' });
  await ev(() => { window.__spm.G.clock = 600 * 0.3; }); await wait(700); await p.screenshot({ path: 'shot33_day.png' });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
