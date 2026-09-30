const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const r = await p.evaluate(() => { const S = window.__spm; const out = []; for (const k in S.SK) { const s = S.SK[k]; const t = (s.desc || '') + ' ' + (s.perks || []).map(q => q.desc).join(' '); if (/cooldown|cool-down|recharge|ready again| wait/i.test(t)) out.push(k + ' [' + s.cls + ']: ' + t.slice(0, 220)); } return out; });
 console.log(r.join('\n')); await b.close(); })();
