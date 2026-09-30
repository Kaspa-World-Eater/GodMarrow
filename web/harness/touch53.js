const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); }); await wait(800);
 await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; });
 // touch helpers in logical coords
 await ev(() => {
   const cv = document.querySelector('canvas'); window.__cv = cv;
   window.__T = (type, list) => { const r = cv.getBoundingClientRect(); const ts = list.map(([id, x, y]) => new Touch({ identifier: id, target: cv, clientX: r.left + x * r.width / 480, clientY: r.top + y * r.height / 270 }));
     cv.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : ts, changedTouches: ts, targetTouches: ts, bubbles: true, cancelable: true })); };
 });
 await ev(() => __T('touchstart', [[1, 452, 40]])); await ev(() => __T('touchend', [[1, 452, 40]])); await wait(300);
 await p.screenshot({ path: '/tmp/t_side.png' });
 console.log('loot', await ev(() => window.__spm.G && [__spm.TOUCH.on, __spm.TOUCH.loot]));
 // long press on the skill bubble -> picker
 await ev(() => __T('touchstart', [[2, 452, 146]])); await wait(800); await ev(() => __T('touchend', [[2, 452, 146]])); await wait(200);
 console.log('pick', await ev(() => window.__spm.G.pick));
 await ev(() => { window.__spm.G.pick = null; });
 // inventory long press on a potion -> shift details
 await ev(() => { window.__spm.G.panels.inv = true; }); await wait(200);
 const g = await ev(() => { const S = window.__spm; return [S.GRID ? S.GRID.x : null]; });
 await ev(() => __T('touchstart', [[3, 350, 126]])); await wait(600);
 console.log('detail', await ev(() => [__spm.TOUCH.detail, __spm.keys.has('shift')]));
 await ev(() => __T('touchend', [[3, 350, 126]])); await wait(200); await p.screenshot({ path: '/tmp/t_detail.png' });
 await ev(() => { window.__spm.G.panels.inv = false; window.__spm.G.panels.arcana = true; window.__spm.G.arcTab = 'body'; }); await wait(400);
 const v0 = await ev(() => ({ ...window.__body.view }));
 await ev(() => __T('touchstart', [[4, 260, 130], [5, 300, 130]]));
 for (let i = 1; i <= 5; i++) { await ev(i => __T('touchmove', [[4, 260 - i * 10, 130], [5, 300 + i * 10, 130]]), i); await wait(30); }
 await ev(() => __T('touchend', [[4, 210, 130], [5, 350, 130]]));
 const v1 = await ev(() => ({ ...window.__body.view }));
 await ev(() => __T('touchstart', [[6, 280, 150]])); for (let i = 1; i <= 5; i++) { await ev(i => __T('touchmove', [[6, 280 + i * 8, 150 + i * 4]]), i); await wait(30); } await ev(() => __T('touchend', [[6, 320, 170]]));
 const v2 = await ev(() => ({ ...window.__body.view }));
 console.log('zoom', v0.z.toFixed(2), '->', v1.z.toFixed(2), 'pan', v1.cx.toFixed(1), '->', v2.cx.toFixed(1));
 await p.screenshot({ path: '/tmp/t_board.png' });
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
