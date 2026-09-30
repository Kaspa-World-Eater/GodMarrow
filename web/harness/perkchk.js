const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const r = await p.evaluate(() => { const SK = window.__spm.SK; const out = {}; for (const id in SK) { const s = SK[id]; if (!s.name || s.virt) continue; const c = s.cls || 'animancer'; const pk = s.perks || []; const last = pk[pk.length - 1]; let bad = !pk.length ? 'none' : !last.stat ? 'nostat' : ''; if (bad) (out[c] = out[c] || []).push(id + ':' + bad); } return out; });
  console.log(JSON.stringify(r, null, 1)); await b.close(); })();
