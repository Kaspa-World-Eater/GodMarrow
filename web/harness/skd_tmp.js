const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file:///tmp/skdump.html'); await p.waitForTimeout(800);
  const out = await p.evaluate(() => { const S = window.__spm.SK; const r = {}; for (const id in S) { const s = S[id]; const c = s.cls || 'animancer'; (r[c] = r[c] || []).push({ id, n: s.name, t: s.tab, r: s.r, c: s.c, k: s.kind, m: s.mana, sh: s.shards, st: s.stam, pre: s.pre, d: (s.desc || '').slice(0, 170), pk: (s.perks || []).map(q => q.name).join('/') }); } return r; });
  require('fs').writeFileSync('/tmp/skd.json', JSON.stringify(out)); await b.close();
})();
