// Creatures: (1) a live fight — how often is a creature drawn facing against the way it is moving on screen?
// (2) scripted walks in 8 screen directions: crops of what is drawn. usage: SRC=x.html node diag_mon.js <out>
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'mon_after';
const DIRS = [['R', 1, -1], ['DR', 1, 0], ['D', 1, 1], ['DL', 0, 1], ['L', -1, 1], ['UL', -1, 0], ['U', -1, -1], ['UR', 0, -1]];
const TYPES = ['hollow', 'hound', 'archer', 'knight', 'caster'];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/' + (process.env.SRC || 'spiritmancer.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); }); await wait(600);
  await ev(() => {
    const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.P.hp = 1e6; S.getD().maxHp = 1e6;
    S.G.zone.monsters.forEach(m => { m.x += 80; m.y += 80; m.state = 'idle'; });
    const z = S.G.zone; let best = null, bs = -1;
    for (let y = 6; y < z.h - 6; y += 2) for (let x = 6; x < z.w - 6; x += 2) { let n = 0; for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (!z.solidAt(x + i + 0.5, y + j + 0.5)) n++; if (n > bs) { bs = n; best = { x: x + 0.5, y: y + 0.5 }; } }
    window.__home = best; S.P.x = best.x; S.P.y = best.y;
  });
  // (1) live: the creatures chase, flank and kite the hero, who strafes about
  const live = await ev(async TYPES => {
    const S = window.__spm, P = S.P, H = window.__home, raf = () => new Promise(r => requestAnimationFrame(r)), ms = [];
    TYPES.forEach((t, i) => { const m = S.makeMon(t, H.x + 2 + i * 0.7, H.y - 1.5 + i * 0.6, 5, 'normal', []); m.hp = m.max = 1e6; m.state = 'chase'; S.G.zone.monsters.push(m); ms.push(m); });
    const st = {}; TYPES.forEach(t => st[t] = { n: 0, bad: 0, states: {} });
    const last = ms.map(m => ({ x: m.x, y: m.y }));
    for (let f = 0; f < 420; f++) {
      if (f % 70 === 0) { const a = f / 70 * 2.1; P.path = [{ x: H.x + Math.cos(a) * 2.5, y: H.y + Math.sin(a) * 2.5 }]; }
      P.iframe = 1; await raf();
      ms.forEach((m, i) => {
        const sx = (m.x - last[i].x) - (m.y - last[i].y), sy = ((m.x - last[i].x) + (m.y - last[i].y)) / 2; last[i] = { x: m.x, y: m.y };
        if (Math.abs(sx) > 0.02 && Math.abs(sx) > Math.abs(sy) * 1.2 && !['windup', 'recover', 'parry'].includes(m.state)) { const face = m._rv ? m._rv.face : m.face; st[m.type].n++; if (Math.sign(sx) !== Math.sign(face || 1)) { st[m.type].bad++; st[m.type].states[m.state] = (st[m.type].states[m.state] || 0) + 1; } }
      });
    }
    ms.forEach(m => { m.dead = true; m.x += 200; }); P.path = null;
    return st;
  }, TYPES);
  // (2) scripted: each creature pushed along the 8 screen directions (stunned so its AI does not steer it)
  const url = await ev(async ([DIRS, TYPES]) => {
    const S = window.__spm, P = S.P, H = window.__home, raf = () => new Promise(r => requestAnimationFrame(r));
    P.x = H.x - 4; P.y = H.y + 4;
    const K = 3, CW = 70, CH = 80, c = document.createElement('canvas'); c.width = 60 + DIRS.length * CW * K; c.height = TYPES.length * CH * K; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#333'; x.fillRect(0, 0, c.width, c.height);
    for (const [ti, t] of TYPES.entries()) {
      x.fillStyle = '#fff'; x.font = '18px monospace'; x.fillText(t, 4, ti * CH * K + 20);
      for (const [di, [nm, dx, dy]] of DIRS.entries()) {
        const m = S.makeMon(t, H.x, H.y, 5, 'normal', []); m.hp = m.max = 1e6; m.state = 'chase'; m.stun = 999; S.G.zone.monsters.push(m);
        for (let f = 0; f < 14; f++) { m.x += dx * 0.03; m.y += dy * 0.03; m.stun = 999; await raf(); }
        const view = m._fb ? 'back' : 'front', face = m._rv ? m._rv.face : m.face;
        const fr = S.monFrame(m.b.spr, 'diag', {}, 'walk', 2, view);
        const cx = 60 + di * CW * K, cy = ti * CH * K; x.fillStyle = (di + ti) % 2 ? '#5c5c64' : '#66666e'; x.fillRect(cx, cy, CW * K, CH * K);
        const img = face < 0 ? fr.f : fr.c, ox = face < 0 ? fr.w - fr.ox : fr.ox;
        x.drawImage(img, cx + CW * K / 2 - ox * K, cy + (CH - 6) * K - fr.oy * K, fr.w * K, fr.h * K);
        x.fillStyle = '#fff'; x.font = '14px monospace'; x.fillText(`${nm} ${view} ${face < 0 ? 'L' : 'R'}`, cx + 4, cy + 16);
        m.dead = true; m.x += 300; S.G.zone.monsters.splice(S.G.zone.monsters.indexOf(m), 1);
      }
    }
    return c.toDataURL();
  }, [DIRS, TYPES]);
  require('fs').writeFileSync(OUT + '.png', Buffer.from(url.split(',')[1], 'base64'));
  console.log('live: frames moving sideways on screen, and how many drawn facing against it', JSON.stringify(live)); console.log('errors', errs.slice(0, 5));
  await b.close();
})();
