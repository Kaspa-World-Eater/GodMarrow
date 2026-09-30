const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'hemomancer'); await wait(800);
 await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; let n = 0; for (const k in S.SK) if (S.SK[k].cls === S.P.cls && S.SK[k].kind === 'cast' && n < 4) { S.P.skills[k] = 3; S.P.hard[k] = 3; n++; } });
 await ev(() => {
   const cv = document.querySelector('canvas');
   window.__T = (type, list) => { const r = cv.getBoundingClientRect(); const ts = list.map(([id, x, y]) => new Touch({ identifier: id, target: cv, clientX: r.left + x * r.width / 480, clientY: r.top + y * r.height / 270 }));
     cv.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : ts, changedTouches: ts, targetTouches: ts, bubbles: true, cancelable: true })); };
 });
 await ev(() => { __T('touchstart', [[1, 452, 70]]); }); await wait(60); await ev(() => __T('touchend', [[1, 452, 70]])); await wait(200);
 console.log('auto after tap', await ev(() => window.__spm.G && __spm.touch54.autoOn()), await ev(() => window.__spm.P.autoSkill));
 await ev(() => { const S = window.__spm; let n = 0; for (const k in S.SK) if (S.SK[k].cls === S.P.cls && S.SK[k].kind === 'cast' && n < 4) { S.P.skills[k] = 3; S.P.hard[k] = 3; n++; } });
 await ev(() => __T('touchstart', [[2, 452, 70]])); await wait(700); await ev(() => __T('touchend', [[2, 452, 70]])); await wait(200);
 console.log('pick', await ev(() => window.__spm.G.pick));
 await p.screenshot({ path: '/tmp/t_autopick.png' });
 // choose the second option (first skill after attack)
 const r = await ev(() => { const S = window.__spm; return null; });
 // tap the pick option at its rect: second cell
 const cell = await ev(() => { const T5 = __spm.touch54, rr = T5.pickRect(); return [rr.x + 3 + 20 + 9, rr.y + 2 + 9, T5.pickOptions()]; });
 console.log('opts', JSON.stringify(cell[2]), await ev(() => Object.keys(__spm.P.skills).filter(k => __spm.P.skills[k] > 0 && __spm.SK[k] && __spm.SK[k].kind === 'cast').join(',')));
 await ev(c => { __T('touchstart', [[3, c[0], c[1]]]); }, cell); await wait(60); await ev(c => __T('touchend', [[3, c[0], c[1]]]), cell); await wait(150);
 await ev(c => { __T('touchstart', [[3, c[0], c[1]]]); }, cell); await wait(60); await ev(c => __T('touchend', [[3, c[0], c[1]]]), cell); await wait(150);
 console.log('autoSkill', await ev(() => [window.__spm.P.autoSkill, window.__spm.G.pick]));
 // turn auto back on, drop a foe beside the hero and see it engage
 await ev(() => { __spm.touch54.setAuto(true); const S = window.__spm, P = S.P; const m = S.makeMon('kneeler', P.x + 2.4, P.y + 0.4, 5, 'normal', []); m.hp = m.max = 400; S.G.zone.monsters.push(m); if (m) { m.hp0 = m.hp; window.__m = m; } });
 await wait(2500);
 console.log('engage', await ev(() => { const P = window.__spm.P, m = window.__m; return { tgt: P.target && P.target.kind, hurt: m ? Math.round(m.hp0 - m.hp) : null, dead: m && m.dead }; }));
 await p.screenshot({ path: '/tmp/t_auto.png' });
 // details card
 await ev(() => { window.__spm.G.panels.inv = true; }); await wait(200);
 await ev(() => __T('touchstart', [[4, 350, 126]])); await wait(600); await ev(() => __T('touchend', [[4, 350, 126]])); await wait(200);
 await p.screenshot({ path: '/tmp/t_detail.png' });
 await ev(() => { window.__spm.G.panels.inv = false; }); await wait(150);
 await ev(() => __T('touchstart', [[5, 434, 250]])); await wait(600); await ev(() => __T('touchend', [[5, 434, 250]])); await wait(200);
 await p.screenshot({ path: '/tmp/t_detail2.png' });
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
