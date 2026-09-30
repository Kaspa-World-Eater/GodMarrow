// walks the whole Reading and screenshots every rite
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.env.HTML);
  await p.waitForTimeout(1500);
  const OUT = process.env.OUT || '/tmp/rd'; require('fs').mkdirSync(OUT, { recursive: true });
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await p.click('#newBtn'); await wait(2500);
  const rect = await ev(() => { const r = document.getElementById('game').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  const L2S = (x, y) => [rect.x + x * rect.w / 480, rect.y + y * rect.h / 270];
  const st = () => ev(() => { const V = window.__spm.G.divine; return V ? { sc: V.scene, li: V.li, n: V.lines.length, ready: window.__reading && window.__reading.ST.ready, nf: window.__reading && window.__reading.ST.frames.length } : null; });
  const fin = () => ev(() => { const V = window.__spm.G.divine; if (!V) return; V.li = V.lines.length - 1; V.shown = 9999; V.fade = 0; });
  const adv = async () => { await ev(() => { const V = window.__spm.G.divine; V.li = V.lines.length - 1; V.shown = 9999; }); await p.mouse.click(...L2S(240, 240)); await wait(160); };
  const shot = async n => { await ev(() => { const V = window.__spm.G.divine; if (V) V.fade = 0; }); await wait(250); await p.screenshot({ path: `${OUT}/${n}.png` }); };
  const cardXY = (n, i) => { const w = n > 3 ? 50 : 54, h = n > 3 ? 78 : 84, gap = n > 3 ? 8 : 16, x0 = Math.round(240 - (n * w + (n - 1) * gap) / 2); return L2S(x0 + i * (w + gap) + w / 2, 206 - h + h / 2); };
  let s = await st(); console.log('start', JSON.stringify(s));
  await shot('00_intro');
  const seen = new Set(); let guard = 0;
  while ((s = await st()) && guard++ < 60) {
    const sc = s.sc;
    if (['star', 'face', 'cards', 'fear', 'seek', 'road', 'ask', 'sac'].includes(sc)) {
      await fin(); await wait(150);
      const n = await ev(sc => { const V = window.__spm.G.divine, F = window.__spm.FATE; return sc === 'star' ? F.stars.length : sc === 'face' ? F.faces[V.picks.star].length : sc === 'fear' ? V.fears.length : sc === 'seek' ? V.seeks.length : sc === 'road' ? V.roads.length : sc === 'sac' ? V.sacs.length : sc === 'ask' ? F.questions[V.qi].a.length : V.cards.length; }, sc);
      const pickI = sc === 'star' ? 4 : 1;
      await p.mouse.move(...cardXY(n, pickI)); await wait(300);
      if (!seen.has(sc)) { await shot(`${String(guard).padStart(2, '0')}_${sc}`); seen.add(sc); }
      await p.mouse.click(...cardXY(n, pickI)); await wait(sc === 'cards' ? 2600 : 400);
      const s2 = await st(); if (s2 && !seen.has(s2.sc)) { await shot(`${String(guard).padStart(2, '0')}_${s2.sc}`); seen.add(s2.sc); }
      continue;
    }
    if (sc === 'cardRev') { await fin(); await wait(150); const [x, y] = L2S(240 + 18 + 27, 206 - 42); await p.mouse.move(x, y); await wait(300); await shot(`${String(guard).padStart(2, '0')}_cardRev`); await p.mouse.click(x, y); await wait(400); continue; }
    if (sc === 'end') { await fin(); await ev(() => { window.__spm.G.divine.t = 5; }); await wait(300); await shot('99_end'); break; }
    await adv();
  }
  console.log('final', JSON.stringify(await st()));
  console.log('ERRS', errs.length ? errs.slice(0, 5).join(' || ') : 'none');
  await b.close();
})();
