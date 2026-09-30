const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const d = await p.evaluate(() => { const S = window.__spm, SK = S.SK, out = {};
   for (const cls of ['animancer', 'ossumancer', 'hemomancer', 'miasmancer', 'monk']) {
     S.G.pickCls = cls; S.startGame('test');
     const tabs = (typeof tabNames === 'function') ? tabNames() : null;
     const ids = Object.keys(SK).filter(k => { const s = SK[k]; return s.cls === cls || (!s.cls && cls === 'animancer'); });
     out[cls] = { tabs: (window.__spm.TAB_SETS || {})[cls] || tabs, skills: ids.map(k => { const s = SK[k]; return [k, s.name, s.tab, s.kind, s.r, (s.desc || '').slice(0, 170)]; }) };
   }
   return out; });
 require('fs').writeFileSync('/tmp/skdump.json', JSON.stringify(d, null, 1)); await b.close(); })();
