const src = require('fs').readFileSync('v2/k_arcana.js', 'utf8');
const a = src.indexOf('const ARC = {'), b = src.indexOf('\n};', src.indexOf('  v_unmade: {'));
const ARC = eval('(' + src.slice(a + 12, b + 2) + ')');
const w = src.indexOf('const WEB_DEF = {'), w2 = src.indexOf('\n};', src.indexOf("hybrids: ['z_veiled'"));
const WEB_DEF = eval('(' + src.slice(w + 16, w2 + 2) + ')');
const pages = { ossumancer: ['Ossuary', 'Marrow', 'Carapace'], hemomancer: ['Brood', 'Blood', 'Flesh'], animancer: ['Iron', 'Anima', 'Logos'], miasmancer: ['Miasma', 'Distortion', 'Death'] };
const out = {};
for (const cls in WEB_DEF) {
  const d = WEB_DEF[cls]; let t = '| Card | Corner | Upright | Reversed |\n| --- | --- | --- | --- |\n';
  for (const c of d.clusters) for (const m of c.majors) { const k = ARC[m]; t += '| ' + k.name + ' | ' + pages[cls][c.page] + ' | ' + k.up + ' | ' + k.rev + ' |\n'; }
  let mi = '**Minor cards** (1 Arcana each):\n\n'; for (const c of d.clusters) mi += '- **' + pages[cls][c.page] + ':** ' + c.minors.map(m => ARC[m].name + ' (' + ARC[m].up.replace(/\.$/, '') + ')').join('; ') + '.\n';
  const hy = '**Hybrid edges:** ' + d.hybrids.map(h => ARC[h].name + ' (' + ARC[h].gods + '): ' + ARC[h].up).join(' ');
  out[cls] = { t, mi, hy };
}
let v = '| Card | Upright | Reversed |\n| --- | --- | --- |\n'; for (const k of ['v_unwritten', 'v_crown', 'v_silence', 'v_unmade']) v += '| ' + ARC[k].name + ' | ' + ARC[k].up + ' | ' + ARC[k].rev + ' |\n';
out.v = v + '\nOn the path down, two Void pips: ' + ['h_step', 'h_quiet'].map(k => ARC[k].name + ' (' + ARC[k].up.replace(/\.$/, '') + ')').join(' and ') + '.';
require('fs').writeFileSync('../doc_tables.json', JSON.stringify(out));
console.log(out.hemomancer.mi);
