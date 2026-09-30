// Diagnose facing: walk the hero in 8 screen directions, crop frames, log face/_fb/pose; same for creatures.
// usage: node diag_face.js <outprefix> [classes]
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'face_before', CLS = (process.argv[3] || 'animancer,hemomancer,ossumancer,miasmancer').split(',');
// screen directions -> world step (iso: screen-right = +x-y, screen-down = +x+y)
const DIRS = [['R', 1, -1], ['DR', 1, 0], ['D', 1, 1], ['DL', 0, 1], ['L', -1, 1], ['UL', -1, 0], ['U', -1, -1], ['UR', 0, -1]];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  { const fs = require('fs'); let h = fs.readFileSync(process.env.SRC || 'spiritmancer.html', 'utf8'); const i = h.lastIndexOf('window.__spm = {');
    h = h.slice(0, i) + "window.__dbg = { ctx, get drawHero() { return drawHero; }, set drawHero(v) { drawHero = v; }, get heroPose() { return heroPose; }, set heroPose(v) { heroPose = v; }, get drawMon16() { return drawMon16; }, set drawMon16(v) { drawMon16 = v; } };\n" + h.slice(i); fs.writeFileSync('diag_tmp.html', h); }
  await p.goto('file://' + process.cwd() + '/diag_tmp.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  const log = [];
  for (const cls of CLS) {
    await ev(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, cls); await wait(600);
    await ev(() => {
      const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6;
      S.G.zone.monsters.forEach(m => { m.x += 80; m.y += 80; m.state = 'idle'; });
      if (!window.__hooked) {
        window.__hooked = true; const D = window.__dbg, ctx = D.ctx; const _dh = D.drawHero; const _hp = D.heroPose; D.heroPose = function () { const r = _hp(); S.P._lastPose = r; return r; };
        D.drawHero = function (...a) { const r = _dh.apply(this, a); const t = ctx.getTransform(); window.__hr = { x: t.a * r.x + t.e, y: t.d * r.y + t.f, w: r.w * t.a, h: r.h * t.d, k: t.a, face: a[3] }; return r; };
      }
      // find an open spot: most free tiles around
      const z = S.G.zone; let best = null, bs = -1;
      for (let y = 6; y < z.h - 6; y += 2) for (let x = 6; x < z.w - 6; x += 2) { let n = 0; for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (!z.solidAt(x + i + 0.5, y + j + 0.5)) n++; if (n > bs) { bs = n; best = { x: x + 0.5, y: y + 0.5 }; } if (bs >= 121) break; }
      window.__home = best;
    });
    console.log('start', cls, await ev(() => JSON.stringify(window.__home)));
    const sheet = await ev(async ([DIRS, cls]) => {
      const S = window.__spm, P = S.P, N = 8, CW = 64, CH = 72, SC = 3;
      const out = document.createElement('canvas'); out.width = (N + 1) * CW * SC; out.height = DIRS.length * CH * SC; const ox = out.getContext('2d'); ox.imageSmoothingEnabled = false; ox.fillStyle = '#222'; ox.fillRect(0, 0, out.width, out.height);
      const rows = []; const cl = document.createElement('canvas'); cl.width = out.width; cl.height = out.height; const cc = cl.getContext('2d'); cc.imageSmoothingEnabled = false; cc.fillStyle = '#333'; cc.fillRect(0, 0, cl.width, cl.height);
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      for (const [ri, [name, dx, dy]] of DIRS.entries()) {
        const H = window.__home; P.x = H.x; P.y = H.y; P.path = null; P.target = null; P.face = 1; P._fb = false; P._sx = null; P._view = null; P._oct = null; P.cast = 0; P.swing = 0;
        for (let k = 0; k < 6; k++) await raf();
        P.path = [{ x: H.x + dx * 6, y: H.y + dy * 6 }];
        for (let k = 0; k < 10; k++) await raf();
        const x0 = P.x, y0 = P.y, info = [], clean = [];
        for (let f = 0; f < N; f++) {
          for (let k = 0; k < 4; k++) await raf();
          const r = window.__hr, cx = r.x + r.w / 2, cy = r.y + r.h, k = r.k;
          ox.drawImage(document.getElementById('game'), cx - CW * k / 2 / SC * 2, cy - (CH - 8) * k / SC * 2, CW * k / SC * 2, CH * k / SC * 2, (f + 1) * CW * SC, ri * CH * SC, CW * SC, CH * SC);
          info.push(`${P.face > 0 ? '+' : '-'}${P._view || (P._fb ? 'back' : 'front')}`); const lp = P._lastPose || ['idle', 0]; clean.push([lp[0], lp[1], P._view || (P._fb ? 'back' : 'front'), P.face]);
        }
        ox.fillStyle = '#fff'; ox.font = '28px monospace'; ox.fillText(name, 20, ri * CH * SC + 100);
        ox.font = '18px monospace'; ox.fillText(info[0], 20, ri * CH * SC + 140);
        rows.push(`${cls} ${name}: moved (${(P.x - x0).toFixed(2)},${(P.y - y0).toFixed(2)}) face/fb ${info.join(' ')}`);
        for (const [f, [po, ph, vw, fc]] of clean.entries()) { const fr = S.heroFrame(cls, po, ph, vw); const cx = (f + 1) * CW * SC, cy = ri * CH * SC; cc.fillStyle = (f % 2) ? '#5a5a62' : '#62626a'; cc.fillRect(cx, cy, CW * SC, CH * SC); cc.drawImage(fc < 0 ? fr.f : fr.c, cx + (CW * SC - fr.w * 3) / 2, cy + 6, fr.w * 3, fr.h * 3); cc.fillStyle = '#fff'; cc.font = '14px monospace'; cc.fillText(po + ph + ' ' + vw + (fc < 0 ? ' L' : ' R'), cx + 4, cy + CH * SC - 6); }
        cc.fillStyle = '#fff'; cc.font = '28px monospace'; cc.fillText(name, 20, ri * CH * SC + 100);
        P.path = null;
      }
      return { url: out.toDataURL(), url2: cl.toDataURL(), rows };
    }, [DIRS, cls]);
    require('fs').writeFileSync(`${OUT}_${cls}.png`, Buffer.from(sheet.url.split(',')[1], 'base64'));
    require('fs').writeFileSync(`${OUT}_${cls}_clean.png`, Buffer.from(sheet.url2.split(',')[1], 'base64'));
    log.push(...sheet.rows);
  }
  // hero pose phases over a walk: does ph cover the whole cycle the rig expects?
  log.push('walk ph samples: ' + JSON.stringify(await ev(async () => { const S = window.__spm, P = S.P, H = window.__home; P.x = H.x; P.y = H.y; P.path = [{ x: H.x + 5, y: H.y }]; const s = []; for (let i = 0; i < 40; i++) { await new Promise(r => requestAnimationFrame(r)); s.push(P._lastPose ? P._lastPose.join(':') : ''); } return s; })));
  console.log(log.join('\n')); console.log('errors', errs.slice(0, 5));
  await b.close();
})();
