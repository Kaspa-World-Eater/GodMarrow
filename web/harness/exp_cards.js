// export the Reading's tarot faces (ink on old paper, one emblem each) and the card back
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto('file:///tmp/gd/x73_ev.html'); await p.waitForTimeout(2500);
  const out = await p.evaluate(() => {
    const R = window.__reading, keys = new Set(['eye']);
    for (const r in R.MAP) for (const id in R.MAP[r]) keys.add(R.MAP[r][id]);
    for (const k of Object.keys(R.EMB)) keys.add(k);
    const res = {};
    for (const k of keys) { try { res[k] = R.cardFace(54, 84, k, null).toDataURL('image/png'); } catch (e) { } }
    res.__back = R.cardBack(54, 84).toDataURL('image/png');
    return { res, map: R.MAP };
  });
  fs.mkdirSync('/tmp/gd/Godmarrow/art/reading/cards', { recursive: true });
  for (const k in out.res) fs.writeFileSync(`/tmp/gd/Godmarrow/art/reading/cards/${k.replace('__', '_')}.png`, Buffer.from(out.res[k].split(',')[1], 'base64'));
  fs.writeFileSync('/tmp/gd/reading_map.json', JSON.stringify(out.map));
  console.log(Object.keys(out.res).length, Object.keys(out.res).join(' '));
  await b.close();
})();
