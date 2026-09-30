const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const r = await p.evaluate(() => { const S = window.__spm, ARC = S.ARC, D = window.WEB_DEF || null; const out = {};
   const WD = typeof WEB_DEF !== 'undefined' ? WEB_DEF : S.WEB_DEF;
   for (const cls in WD) { const d = WD[cls]; const ids = []; for (const c of d.clusters) ids.push(...c.minors, ...c.majors); ids.push(...(d.hybrids || [])); ids.push('h_step', 'h_quiet', 'v_unwritten', 'v_crown', 'v_silence', 'v_unmade');
     out[cls] = ids.map(id => ARC[id] ? [id, ARC[id].cls || '-', ARC[id].kind || '', ARC[id].name, (ARC[id].desc || ARC[id].txt || '').slice(0, 140)] : [id, 'MISSING']); }
   return out; });
 require('fs').writeFileSync('/tmp/arc_dump.json', JSON.stringify(r, null, 1)); console.log(Object.keys(r).map(k => k + ':' + r[k].length).join(' '));
 await b.close(); })();
