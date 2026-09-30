const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await wait(800);
 const r = await ev(() => { const S = window.__spm, P = S.P, KS = S.KS || window.KS; return 1; });
 const st = await ev(() => { const S = window.__spm, P = S.P; for (const k in S.G.panels) S.G.panels[k] = false; return { mana: P.mana, yang: P.kyang, yin: P.kyin, w: P.weight }; });
 console.log('start', JSON.stringify(st));
 // drain: cast a radiance skill a few times and an absence one
 const cast = await ev(() => { const S = window.__spm, P = S.P, SK = S.SK; const ids = Object.keys(SK).filter(k => SK[k].cls === 'monk' && SK[k].kind === 'cast' && SK[k].mana);
   const r0 = ids.find(k => SK[k].tab === 0 && P.skills[k] > 0) || ids.find(k => SK[k].tab === 0), a0 = ids.find(k => SK[k].tab === 1 && P.skills[k] > 0) || ids.find(k => SK[k].tab === 1);
   const out = { r0, a0, pre: [P.kyang, P.kyin] }; out.okR = S.spendMana(r0); out.okA = S.spendMana(a0); out.okA2 = S.spendMana(a0); out.post = [P.kyang, P.kyin]; return out; });
 console.log('spend', JSON.stringify(cast));
 await wait(250); await p.screenshot({ path: '/tmp/yy1.png' });
 const t2 = await ev(() => { const P = window.__spm.P; return [P.kyang, P.kyin, P.mana]; }); console.log('after 0.25s', t2);
 await wait(4000); const t3 = await ev(() => { const P = window.__spm.P; return [P.kyang, P.kyin, P.mana]; }); console.log('after 4s idle', t3);
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
