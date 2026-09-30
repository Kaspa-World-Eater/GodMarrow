const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); }); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; G.zone.qSafeC = null; const m = S.makeMon('knight', P.x + 1.2, P.y, 5, 'normal', []); m.hp = m.max = 1e6; m.b = { ...m.b, ai: 'none' }; m.spd = 0; G.zone.monsters.push(m); window.__m = m; P.skills.crush = P.hard.crush = 5; });
 const out = [];
 for (let i = 0; i < 4; i++) { out.push(await p.evaluate(() => { const S = window.__spm, P = S.P, m = window.__m; P.cast = 0; const h0 = m.hp; S.boneCast('crush', { x: m.x, y: m.y }); return [window.__boneChain.n, Math.round(h0 - m.hp), +P.cast.toFixed(2)]; })); await p.waitForTimeout(150); }
 console.log(JSON.stringify(out)); console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
