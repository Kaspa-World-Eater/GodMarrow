const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'hemomancer'); await wait(800);
 await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; __spm.touch54.setAuto(true); __spm.TOUCH.on = true; });
 const info = await ev(() => { const S = window.__spm, P = S.P, G = S.G; const ms = G.zone.monsters.filter(m => !m.dead); const m = S.makeMon('kneeler', P.x + 2.4, P.y + 0.4, 5, 'normal', []); G.zone.monsters.push(m); window.__ms = [m]; for (const [dx, dy] of [[-3, 1], [1, 3.5], [4, -2]]) { const o = S.makeMon('kneeler', P.x + dx, P.y + dy, 5, 'normal', []); G.zone.monsters.push(o); window.__ms.push(o); }
   const d0 = m ? Math.hypot(m.x - P.x, m.y - P.y) : null; if (m) { m.hp0 = m.hp; window.__m = m; }
   return { n: ms.length, d0, zone: G.zone.id, paused: G.paused, running: G.running, path: !!P.path, cast: P.cast, roll: P.roll, left: P.left, mstate: m && m.state, hidden: m && m.hidden, town: G.zone.town }; });
 console.log(JSON.stringify(info));
 for (let i = 0; i < 30; i++) { await wait(200); console.log(JSON.stringify(await ev(() => { const P = window.__spm.P, m = window.__m, T = window.__spm.TOUCH; return [window.__ms.filter(q => !q.dead).length, P.target ? P.target.kind + (P.target.auto ? '*' : '') : '-', +P.cast.toFixed(2), !!P.path, Math.round(m.hp), +Math.hypot(m.x - P.x, m.y - P.y).toFixed(2), T.autoT.toFixed(2), __spm.mouse.l, __spm.mouse.r, __spm.anyPanelOpen(), P.approach ? 1 : 0]; }))); }
 console.log(JSON.stringify(await ev(() => { const P = window.__spm.P, m = window.__m; return { tgt: P.target && P.target.kind, hurt: m ? Math.round(m.hp0 - m.hp) : null, mx: m && [m.x - P.x, m.y - P.y], st: m && m.state, path: !!P.path, appr: !!P.approach }; })));
 console.log(JSON.stringify(await ev(() => { const m = window.__m, P = window.__spm.P; return { hidden: m.hidden, erased: m.erased, fly: m.fly, z: m.z, dead: m.dead, r: m.r, kin: Object.keys(m).filter(k => /hid|erase|sleep|dorm|ghost|inv|ally|friend|tame|charm/i.test(k)).map(k => k + '=' + JSON.stringify(m[k])) }; })));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
