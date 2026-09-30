// =================================================================== the Reading, remade from the user's own art
// The whole character-creation Reading now plays in front of the user's Midjourney animation of the Mysterious
// Stranger (refs/mysterious_stranger/stranger_1.gif: 121 frames, 25 fps), shown at 4 screen pixels to an art pixel,
// the same grain as the world. Every choice in the Reading is a tarot card laid out before him: the god, its face,
// the drawn card and its turning, the fear, the door you seek, the answer and the sacrifice. Each card carries an
// emblem that matches its name, painted as pixel art (gilt engraving on a night-dark field, hard outline, lit from
// the upper left). The old sculpted rooms (sky, shrine, fear room, door hall, basin, bone throw) are gone.
(function () {
  if (typeof drawDivine !== 'function' || typeof STRANGER_WEBP_B64 === 'undefined') return;

  // ------------------------------------------------------------------ the Stranger's frames
  const ST = { frames: [], img: null, n: 121, fps: 25, ready: false };
  (async function decodeStranger() {
    try {
      const bin = atob(STRANGER_WEBP_B64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (typeof ImageDecoder !== 'undefined') {
        const dec = new ImageDecoder({ data: bytes, type: 'image/webp' });
        await dec.tracks.ready;
        const n = dec.tracks.selectedTrack.frameCount;
        for (let i = 0; i < n; i++) {
          const r = await dec.decode({ frameIndex: i });
          ST.frames.push(await createImageBitmap(r.image)); r.image.close();
          if (i === 0) ST.ready = true;
        }
        ST.n = ST.frames.length; dec.close(); return;
      }
    } catch (e) { ST.frames = []; }
    // fallback: an animated <img> kept alive in the page (the browser animates it; canvas draws its current frame)
    const im = new Image();
    im.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:270px;opacity:0.01;pointer-events:none';
    im.onload = () => { ST.ready = true; };
    im.src = 'data:image/webp;base64,' + STRANGER_WEBP_B64;
    try { document.body.appendChild(im); } catch (e) { }
    ST.img = im;
  })();
  // The Stranger mostly sits still: a slow idle drifts back and forth through the rest pose (hand at the chin,
  // hood and fire breathing a little), and only now and then, at random, does he lower the hand to the table or
  // reach out across it. The gesture never runs on a fixed beat, so the animation does not read as a loop.
  const REST = []; for (let i = 99; i <= 120; i++) REST.push(i); for (let i = 0; i <= 3; i++) REST.push(i);
  const SI = { t: -1, ri: 0, dir: 1, hold: 0, next: 6 + Math.random() * 8, g: null, acc: 0 };
  function idleStep(dt) {
    if (SI.hold > 0) { SI.hold -= dt; return; }
    SI.acc += dt * (5 + Math.random() * 4);            // idle runs at ~5-9 frames a second (the gif's own is 25)
    while (SI.acc >= 1) {
      SI.acc -= 1; SI.ri += SI.dir;
      if (SI.ri <= 0 || SI.ri >= REST.length - 1) { SI.ri = Math.max(0, Math.min(REST.length - 1, SI.ri)); SI.dir = -SI.dir; }
      if (Math.random() < 0.04) { SI.dir = -SI.dir; SI.hold = 0.3 + Math.random() * 1.2; break; }   // a pause, then drift back
    }
  }
  function strangerFrame() {
    if (ST.frames.length) {
      const now = performance.now() / 1000, dt = SI.t < 0 ? 0 : Math.min(0.1, now - SI.t); SI.t = now;
      const n = ST.frames.length;
      if (SI.g) {
        const g = SI.g; g.p += dt * g.fps * g.dir;
        if (g.dir > 0 && g.p >= g.to) { if (g.back) { g.dir = -1; g.p = g.to; g.hold = 0.4 + Math.random() * 1.4; } else { SI.g = null; SI.ri = 0; SI.dir = 1; } }
        if (g.hold > 0 && g.dir < 0) { g.hold -= dt; g.p = g.to; }
        if (SI.g && g.dir < 0 && g.p <= 3) { SI.g = null; SI.ri = REST.length - 1; SI.dir = -1; }
        if (SI.g) return ST.frames[Math.max(0, Math.min(n - 1, Math.round(g.p)))];
      } else {
        SI.next -= dt;
        const cur = REST[SI.ri];
        if (SI.next <= 0 && cur === 3) {                 // only leave the rest pose from its edge, so nothing jumps
          const r = Math.random();
          SI.g = r < 0.45 ? { p: 3, to: 98, fps: 18 + Math.random() * 6, dir: 1, back: false }          // the full reach
               : { p: 3, to: 22 + Math.floor(Math.random() * 30), fps: 12 + Math.random() * 6, dir: 1, back: true };   // a hand lowered, raised again
          SI.next = 9 + Math.random() * 16;
        } else {
          if (SI.next <= 0) { SI.dir = 1; SI.hold = 0; }  // due: drift toward the edge frame
          idleStep(dt);
        }
      }
      return ST.frames[REST[SI.ri] % n];
    }
    return ST.img && ST.ready ? ST.img : null;
  }
  // the art is 320x270; drawn at 1 art px to 1 logical px it fills the screen's height at 4x, centred
  const AX = 80, AY = 0, AW = 320, AH = 270;
  function drawBackdrop() {
    ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, H);
    const f = strangerFrame();
    if (f) ctx.drawImage(f, AX, AY, AW, AH);
    // the art's hard edges sink into the dark on both sides
    for (const [x0, dir] of [[AX, 1], [AX + AW, -1]]) {
      const g = ctx.createLinearGradient(x0, 0, x0 + dir * 22, 0);
      g.addColorStop(0, 'rgba(3,2,4,1)'); g.addColorStop(1, 'rgba(3,2,4,0)');
      ctx.fillStyle = g; ctx.fillRect(dir > 0 ? x0 : x0 - 22, 0, 22, H);
    }
    // his fire burns at the right edge of the picture: let its light carry into the dark beyond it
    const fl = 0.8 + 0.12 * Math.sin(G.time * 11) + 0.08 * Math.sin(G.time * 23.7);
    ctx.globalCompositeOperation = 'lighter';
    glow(AX + AW - 6, 226, 70, '255,140,60', 0.16 * fl);
    glow(AX + AW - 10, 236, 26, '255,190,110', 0.14 * fl);
    // embers drifting up from it
    for (let i = 0; i < 14; i++) {
      const sp = 0.18 + (i % 5) * 0.05, t = G.time * sp + i * 0.37, k = (t % 1), y = 238 - k * 190, x = AX + AW - 18 + Math.sin(t * 6 + i) * (6 + k * 18) + (i % 3) * 5;
      ctx.fillStyle = `rgba(255,${130 + (i % 3) * 40},60,${0.5 * (1 - k)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ pixel painting kit for the emblems
  const PAL = {
    k: '#0c0806', v0: '#110b16', v1: '#1a1222', v2: '#2a1c34',
    g0: '#4a3012', g1: '#7a5222', g2: '#b0823a', g3: '#dcb062', g4: '#f6dc9a',
    b0: '#6e6250', b1: '#a8997a', b2: '#d8cba6', b3: '#f2ead0',
    r0: '#4a0a0e', r1: '#8a1a1a', r2: '#c83a2a', r3: '#ec7050',
    p0: '#34506a', p1: '#7aa4c0', p2: '#bcdcf0', p3: '#f0faff',
    f0: '#a83a14', f1: '#e8801c', f2: '#fcc85a', f3: '#fff4d0'
  };
  const INK = '#1a130d', INK2 = '#3b2d20';
  // old paper: mottled, foxed, browning toward the edges
  function paperAt(X, Y, w, h) {
    const e = Math.min(X, Y, w - 1 - X, h - 1 - Y);
    const n = hsh(X >> 1, Y >> 1) * 0.45 + hsh(X >> 2, (Y >> 2) + 99) * 0.35 + hsh(X >> 3, (Y >> 3) + 7) * 0.2, fox = hsh((X >> 1) + 7, (Y >> 1) + 31) < 0.014;
    if (fox) return '#7e6848';
    if (e < 2) return '#6e5c42';
    if (e < 5) return n < 0.5 ? '#8c7858' : '#95815f';
    return n < 0.32 ? '#9f8d6b' : n < 0.7 ? '#aa9875' : '#b4a37f';
  }
  const LIGHT = { g0: 'g1', g1: 'g2', g2: 'g3', g3: 'g4', b0: 'b1', b1: 'b2', b2: 'b3', r0: 'r1', r1: 'r2', r2: 'r3', p0: 'p1', p1: 'p2', p2: 'p3', f0: 'f1', f1: 'f2', f2: 'f3', v1: 'v2' };
  const DARK = { g4: 'g3', g3: 'g2', g2: 'g1', g1: 'g0', b3: 'b2', b2: 'b1', b1: 'b0', r3: 'r2', r2: 'r1', r1: 'r0', p3: 'p2', p2: 'p1', p1: 'p0', f3: 'f2', f2: 'f1', f1: 'f0', v2: 'v1' };
  const EW = 28, EH = 32;
  // paint(fn) runs an emblem's shape calls into a key grid, then outlines it and lights it from the upper left
  function paintEmblem(fn) {
    const grid = new Array(EW * EH).fill(null);
    const tmp = mkCanvas(EW, EH), tx = tmp.getContext('2d');
    const raster = (key, draw) => {
      tx.clearRect(0, 0, EW, EH); tx.fillStyle = '#fff'; tx.strokeStyle = '#fff'; tx.lineCap = 'round'; tx.lineJoin = 'round';
      draw(tx);
      const d = tx.getImageData(0, 0, EW, EH).data;
      for (let i = 0; i < EW * EH; i++) if (d[i * 4 + 3] >= 128) grid[i] = key;
    };
    const E = {
      e(k, cx, cy, rx, ry) { raster(k, x => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, 6.2832); x.fill(); }); },
      r(k, X, Y, w, h) { raster(k, x => x.fillRect(X, Y, w, h)); },
      p(k, pts) { raster(k, x => { x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); x.fill(); }); },
      l(k, w, pts) { raster(k, x => { x.lineWidth = w; x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); }); },
      a(k, w, cx, cy, r, a0, a1) { raster(k, x => { x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); }); },
      d(k, X, Y) { if (X >= 0 && Y >= 0 && X < EW && Y < EH) grid[Y * EW + X] = k; }
    };
    fn(E);
    // light and shade: a lit edge where the form meets the air above or to the left, a shaded edge below-right
    const at = (x, y) => (x < 0 || y < 0 || x >= EW || y >= EH) ? null : grid[y * EW + x];
    const out = grid.slice();
    for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
      const k = at(x, y); if (!k || k === 'k') continue;
      if (!at(x, y - 1) || !at(x - 1, y)) { if (LIGHT[k]) out[y * EW + x] = LIGHT[k]; }
      else if (!at(x, y + 1) || !at(x + 1, y)) { if (DARK[k]) out[y * EW + x] = DARK[k]; }
    }
    // a hard dark outline around everything
    const fin = out.slice();
    for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
      if (out[y * EW + x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) fin[y * EW + x] = 'k';
    }
    // v0.52 the user: "the tarot cards not having color and having that old esoteric inked look". Every key
    // becomes ink or paper: dark tones solid ink, middle tones engraved hatching, light tones bare paper.
    const c = mkCanvas(EW, EH), cx = c.getContext('2d'), sil = new Uint8Array(EW * EH);
    cx.fillStyle = INK;
    for (let i = 0; i < EW * EH; i++) {
      const k = fin[i]; if (!k) continue; sil[i] = 1;
      const X = i % EW, Y = Math.floor(i / EW);
      if (inkAt(k, X, Y)) cx.fillRect(X, Y, 1, 1);
    }
    c._sil = sil;
    return c;
  }
  // the tone of a key (0 dark .. 1 light) and whether that tone puts ink at a pixel
  const RAMPN = { g: 4, b: 3, r: 3, p: 3, f: 3, v: 2 };
  function toneOf(k) { if (k === 'k') return 0; const n = RAMPN[k[0]], d = +k.slice(1); if (k[0] === 'v') return 0.12 + d * 0.1; return n ? d / n : 0.5; }
  function inkAt(k, X, Y) {
    const t = toneOf(k);
    if (t < 0.2) return true;                                              // solid ink
    if (t < 0.45) return ((X - Y) & 3) === 0 || ((X + Y) & 3) === 0;       // cross-hatching
    if (t < 0.72) return ((X - Y) & 3) === 0;                               // single hatching
    if (t < 0.9) return ((X - Y) & 7) === 0 && (Y & 1) === 0;               // a stipple of the hatch
    return false;                                                           // bare paper
  }
  const TAU = Math.PI * 2, rng = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
  // ------------------------------------------------------------------ the emblems (28 x 32), one per meaning
  const EMB = {
    skull(E) { E.e('b2', 14, 12, 9, 9); E.r('b2', 9, 16, 10, 9); E.e('k', 10.5, 12.5, 2.6, 3); E.e('k', 17.5, 12.5, 2.6, 3); E.p('k', [[14, 15.5], [12.3, 19.5], [15.7, 19.5]]); E.r('k', 9, 21, 10, 1); for (const x of [11, 13, 15, 17]) E.r('k', x, 21, 1, 4); E.e('b1', 7, 9, 1, 1.5); },
    wheel(E) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; E.l('g3', 1.5, [[14 + Math.cos(a) * 3, 16 + Math.sin(a) * 3], [14 + Math.cos(a) * 9, 16 + Math.sin(a) * 9]]); } E.a('r2', 3, 14, 16, 10, 0, TAU); E.e('g3', 14, 16, 3, 3); E.e('r1', 14, 16, 1.2, 1.2); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; E.e('g4', 14 + Math.cos(a) * 10, 16 + Math.sin(a) * 10, 0.9, 0.9); } },
    lantern(E) { E.a('g3', 1.5, 14, 5, 2.6, Math.PI, 0); E.p('g2', [[9, 7], [19, 7], [22, 11], [6, 11]]); E.r('p1', 8, 11, 12, 12); E.e('p3', 14, 17, 2.4, 4); E.e('b3', 14, 18.5, 1.1, 2); E.r('g2', 7, 11, 14, 1.6); E.r('g2', 7, 22, 14, 1.6); E.r('g2', 7, 11, 1.6, 12); E.r('g2', 19.4, 11, 1.6, 12); E.p('g2', [[7, 23.5], [21, 23.5], [18, 27.5], [10, 27.5]]); },
    breath(E) { const pts = []; for (let i = 0; i <= 44; i++) { const t = i / 44 * Math.PI * 3.3, r = 0.8 + i * 0.21; pts.push([14 + Math.cos(t) * r, 14 + Math.sin(t) * r * 0.92]); } E.l('p2', 2.2, pts); E.e('p1', 7, 26, 2.6, 1.8); E.e('p1', 20, 27, 2.2, 1.5); E.e('p1', 13.5, 28.5, 1.6, 1.2); },
    blacksun(E) { for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; E.l('g3', 1.6, [[14 + Math.cos(a) * 8.5, 16 + Math.sin(a) * 8.5], [14 + Math.cos(a) * 12.5, 16 + Math.sin(a) * 12.5]]); } E.e('g2', 14, 16, 8.4, 8.4); E.e('v0', 14, 16, 6.8, 6.8); E.a('v2', 1, 14, 16, 5, 3.7, 5.3); },
    moon(E) { E.e('b2', 13, 16, 10, 10); E.e('v0', 17.5, 13, 8.2, 8.2); E.e('g4', 23, 23, 1, 1); E.e('g3', 21, 7, 0.8, 0.8); E.e('g3', 25, 15, 0.7, 0.7); },
    moth(E) { E.p('g2', [[13, 13], [3, 5], [2, 12], [7, 17], [13, 16]]); E.p('g2', [[15, 13], [25, 5], [26, 12], [21, 17], [15, 16]]); E.p('g1', [[13, 16], [6, 19], [8, 25], [13, 20]]); E.p('g1', [[15, 16], [22, 19], [20, 25], [15, 20]]); E.e('r2', 7, 10, 1.6, 1.6); E.e('r2', 21, 10, 1.6, 1.6); E.e('b1', 14, 16, 1.6, 7); E.l('b2', 1, [[13, 9], [11, 4], [9, 3]]); E.l('b2', 1, [[15, 9], [17, 4], [19, 3]]); },
    crow(E) { E.p('g1', [[19, 15], [26, 21], [24, 23], [17, 20]]); E.e('g2', 14, 17, 7, 5); E.e('g2', 8, 11, 4, 3.6); E.p('g3', [[4.5, 10.5], [0.8, 12.5], [4.5, 13.5]]); E.p('g1', [[10, 16], [19, 13.5], [22, 17], [13, 20]]); E.e('r2', 7.5, 10.5, 0.9, 0.9); E.l('g1', 1, [[12, 21], [11, 27]]); E.l('g1', 1, [[16, 21], [17, 27]]); E.l('g1', 1, [[9, 27], [13, 27]]); E.l('g1', 1, [[15, 27], [19, 27]]); },
    lamb(E) { E.a('g4', 1, 21, 7.5, 3.2, 0, TAU); for (const [x, y, r] of [[9, 17, 4], [13, 15, 4.5], [17, 17, 4], [11, 20, 4], [16, 20, 4]]) E.e('b2', x, y, r, r * 0.9); E.e('b1', 21, 13, 3, 3.4); E.e('k', 22, 12.5, 0.7, 0.7); for (const x of [9, 12, 15, 18]) E.l('b0', 1.6, [[x, 23], [x, 28]]); },
    weep(E) { E.p('g1', [[4, 29], [5, 11], [9, 4], [19, 4], [23, 11], [24, 29], [19, 29], [18.5, 15], [9.5, 15], [9, 29]]); E.e('b2', 14, 15, 5, 7); E.l('k', 1, [[11, 14], [13, 14.5]]); E.l('k', 1, [[15, 14.5], [17, 14]]); E.l('r2', 1, [[11.5, 15.5], [11.5, 20]]); E.l('r2', 1, [[16.5, 15.5], [16.5, 21]]); E.l('k', 1, [[13, 19.5], [15, 19.5]]); E.p('g2', [[9, 5], [19, 5], [16, 3], [12, 3]]); },
    saint(E) { E.a('g3', 1.4, 14, 12, 9, 0, TAU); E.e('b2', 14, 13, 5.2, 6.6); E.l('k', 1, [[11, 12], [13, 12.6]]); E.l('k', 1, [[15, 12.6], [17, 12]]); E.l('r2', 1, [[11.5, 13.6], [11.5, 18]]); E.l('r2', 1, [[16.5, 13.6], [16.5, 18.5]]); E.l('k', 1, [[13, 17.5], [15, 17.5]]); E.p('b1', [[9, 21], [19, 21], [23, 30], [5, 30]]); E.l('g2', 1, [[14, 22], [14, 29]]); E.l('g2', 1, [[11, 25], [17, 25]]); },
    eye(E) { for (const [a, b] of [[[14, 8], [14, 3]], [[8, 10], [5.5, 5.5]], [[20, 10], [22.5, 5.5]], [[4, 12.5], [1, 10]], [[24, 12.5], [27, 10]]]) E.l('g3', 1.2, [a, b]); E.p('b2', [[2, 16], [8, 11], [14, 9.5], [20, 11], [26, 16], [20, 21], [14, 22.5], [8, 21]]); E.e('p1', 14, 16, 4.3, 4.3); E.e('k', 14, 16, 1.8, 1.8); E.d('p3', 12, 14); E.d('p3', 13, 14); },
    hanged(E) { E.l('g2', 2, [[3, 3], [25, 3]]); E.l('g1', 2, [[4, 3], [4, 11]]); E.l('b1', 1, [[14, 4], [14, 8]]); E.l('b2', 2.2, [[14, 7], [14, 13]]); E.l('b2', 2, [[14, 11], [18.5, 13.5], [14.5, 16]]); E.r('b2', 12, 12.5, 4, 8); E.l('b2', 1.6, [[12, 14], [9, 18], [12, 21]]); E.l('b2', 1.6, [[16, 14], [19, 18], [16, 21]]); E.e('b2', 14, 23.5, 2.8, 3); E.a('g4', 1, 14, 24.5, 4.8, 0, TAU); },
    rat(E) { E.e('g2', 13, 19, 8, 5); E.p('g2', [[5.5, 17], [1, 21], [6, 22.5]]); E.e('g3', 8.5, 15, 2.1, 2.1); E.e('r2', 4.6, 19.4, 0.8, 0.8); E.l('g1', 1.2, [[21, 20], [25, 17], [26, 12], [23, 9]]); E.l('g1', 1.2, [[9, 23], [8, 27]]); E.l('g1', 1.2, [[16, 23], [17, 27]]); },
    ratking(E) { EMB.rat(E); E.p('g4', [[5, 12], [5, 7.5], [7, 9.5], [8.8, 6], [10.6, 9.5], [12.6, 7.5], [12.6, 12]]); E.e('r2', 8.8, 10.5, 0.8, 0.8); },
    candle(E) { E.r('b2', 11, 13, 6, 13); E.l('b1', 1, [[11, 15], [11, 20]]); E.e('b2', 16.4, 15, 1, 2.4); E.l('k', 1, [[14, 13], [14, 10]]); E.e('f1', 14, 7, 2.7, 4.3); E.e('f2', 14, 8, 1.7, 2.9); E.e('f3', 14, 8.8, 0.8, 1.5); E.p('g2', [[7, 26], [21, 26], [19, 29.5], [9, 29.5]]); },
    flame(E) { E.p('f0', [[14, 2], [20, 11], [22.5, 18], [20, 25], [14, 29], [8, 25], [5.5, 18], [8, 11], [11, 15]]); E.p('f1', [[14, 8], [18, 15], [19.5, 21], [14, 26.5], [8.5, 21], [10, 15], [12, 18]]); E.p('f2', [[14, 14], [16.5, 19.5], [14, 25], [11.5, 19.5]]); E.e('f3', 14, 21.5, 1.2, 2.3); },
    kiln(E) { E.r('b0', 16, 1, 4, 6); E.p('b1', [[4, 29], [4, 14], [8, 7], [14, 5], [20, 7], [24, 14], [24, 29]]); E.p('k', [[9, 29], [9, 19], [11, 15.5], [14, 14.5], [17, 15.5], [19, 19], [19, 29]]); E.p('f1', [[10, 29], [12, 22], [14, 19], [16, 22], [18, 29]]); E.p('f3', [[12.6, 29], [14, 24], [15.4, 29]]); for (const [a, b] of [[[4, 18], [8, 18]], [[20, 18], [24, 18]], [[4, 23], [8.5, 23]], [[19.5, 23], [24, 23]], [[8, 11], [11, 11]], [[17, 11], [20, 11]]]) E.l('b0', 1, [a, b]); },
    staff(E) { E.l('g2', 2, [[9, 29], [18, 5]]); E.a('g3', 1.6, 20, 7, 3, Math.PI * 1.15, Math.PI * 2.6); E.l('b1', 1, [[16.6, 11], [20, 15]]); E.e('r1', 20, 17.5, 2, 2.6); E.e('g3', 20, 14.8, 0.9, 0.7); for (const x of [3, 12, 21]) E.l('b0', 1, [[x, 30], [x + 4, 30]]); },
    key(E) { E.a('g3', 2.2, 14, 8, 4.6, 0, TAU); E.e('r1', 14, 8, 1.4, 1.4); E.r('g3', 12.8, 12.4, 2.6, 16); E.r('g3', 15, 22, 4.4, 2.2); E.r('g3', 15, 26, 3.2, 2.2); },
    cup(E) { E.p('g3', [[6, 6], [22, 6], [20.5, 13], [16.5, 17.5], [11.5, 17.5], [7.5, 13]]); E.e('r1', 14, 6.5, 7.6, 1.8); E.r('g2', 12.8, 17, 2.4, 6); E.e('g3', 14, 20, 2.3, 1); E.p('g2', [[8.5, 28], [19.5, 28], [16, 23], [12, 23]]); E.e('r2', 10.5, 10.5, 0.9, 0.9); E.e('p1', 17.5, 10.5, 0.9, 0.9); },
    bell(E) { E.a('g2', 1.6, 14, 4.4, 2.6, Math.PI, 0); E.p('g3', [[11, 6], [17, 6], [19, 9], [20, 16], [23.5, 22], [4.5, 22], [8, 16], [9, 9]]); E.r('g2', 4, 22, 20, 2.2); E.e('b1', 14, 26.5, 2.3, 2.3); E.l('g4', 1, [[11, 9], [10, 17]]); E.l('r2', 1, [[8, 19], [20, 19]]); },
    coin(E) { E.e('g3', 14, 16, 10.5, 10.5); E.a('g1', 1, 14, 16, 8.3, 0, TAU); E.p('b3', [[10.5, 11.5], [17.5, 11.5], [17.5, 16], [16.3, 21], [15, 17], [13, 17], [11.7, 21], [10.5, 16]]); },
    spool(E) { E.r('g2', 5, 4, 18, 3); E.r('g2', 5, 24, 18, 3); E.r('b1', 8, 7, 12, 17); for (let y = 8; y < 24; y += 2) E.l('p1', 1, [[8, y], [20, y + 1]]); E.l('r2', 1, [[20, 19], [24, 23], [23, 29]]); E.l('b3', 1, [[19, 29.5], [26, 28]]); },
    hand(E) { E.p('b2', [[8, 29], [8, 17], [10, 14], [18, 14], [20, 17], [20, 29]]); for (const [x, top] of [[9.4, 6.5], [12.6, 4.5], [15.8, 5], [19, 7.5]]) E.l('b2', 2.4, [[x, 16], [x, top]]); E.l('b2', 2.4, [[8.5, 20], [4.5, 13.5]]); E.e('b3', 14, 22, 2.6, 1.7); E.e('p0', 14, 22, 1.1, 1.1); E.l('b1', 1, [[9.5, 27], [18.5, 27]]); },
    heart(E) { E.e('r1', 10.5, 13.5, 5.2, 5.2); E.e('r1', 17.5, 14.5, 5.2, 5.6); E.p('r1', [[5.8, 15.5], [22.6, 16.5], [14, 28]]); E.l('g2', 2, [[11, 9], [10, 2.5]]); E.l('g2', 2, [[15.5, 9], [17, 2.5]]); E.l('p1', 1.6, [[19, 10], [24, 6]]); E.l('r3', 1, [[8.5, 12], [8, 17]]); E.l('r0', 1, [[14, 13], [15, 22]]); },
    dagger(E) { E.p('b3', [[14, 2], [16.4, 6], [16.4, 18.5], [11.6, 18.5], [11.6, 6]]); E.l('b1', 1, [[14, 4], [14, 17.5]]); E.r('g3', 6.5, 18.5, 15, 2.6); E.r('g1', 12.6, 21, 2.8, 5.4); E.e('g3', 14, 27.6, 2.1, 2.1); E.p('r2', [[12, 11], [16.4, 9], [16.4, 13]]); },
    hammer(E) { E.r('g2', 4, 4, 20, 8); E.r('g1', 4, 10, 20, 2); E.r('b1', 12.5, 12, 3, 17); E.l('g1', 1, [[12.5, 21], [15.5, 21]]); E.l('g1', 1, [[12.5, 24], [15.5, 24]]); },
    waves(E) { for (const y of [8, 15.5, 23]) { const pts = []; for (let x = 2.5; x <= 25.5; x += 0.5) pts.push([x, y + Math.sin(x * 0.62 + y) * 2.2]); E.l('p1', 2.2, pts); } E.e('p3', 7, 5, 0.8, 0.8); E.e('p3', 20, 12.5, 0.8, 0.8); },
    mirror(E) { E.e('g2', 14, 13, 8.2, 10.2); E.e('p0', 14, 13, 6.2, 8.2); E.e('b1', 12, 11.5, 1, 1); E.e('b1', 16, 11.5, 1, 1); E.l('b0', 1, [[12, 16.5], [16, 16.5]]); E.l('p2', 1, [[9.5, 8.5], [11.5, 6.5]]); E.r('g2', 12.8, 23, 2.4, 4.5); E.p('g3', [[9.5, 27.5], [18.5, 27.5], [16.5, 30], [11.5, 30]]); },
    mouth(E) { E.p('r2', [[2.5, 16], [8, 10], [14, 11], [20, 10], [25.5, 16], [20, 23], [14, 24.5], [8, 23]]); E.p('k', [[6, 16], [10, 13], [14, 14], [18, 13], [22, 16], [18, 20], [14, 21], [10, 20]]); for (const x of [9, 12, 15, 18]) E.r('b3', x, 13.6, 2, 2.2); for (const x of [10.5, 13.5, 16.5]) E.r('b3', x, 18.2, 2, 2); },
    crown(E) { E.p('g3', [[4, 25], [4, 10], [9, 16], [14, 7], [19, 16], [24, 10], [24, 25]]); E.r('g2', 4, 21, 20, 3.5); for (const x of [8, 14, 20]) E.e('r2', x, 22.8, 1.3, 1.3); for (const [x, y] of [[4, 9], [14, 6], [24, 9]]) E.e('g4', x, y, 1.3, 1.3); },
    door(E) { E.p('g2', [[5, 30], [5, 12], [8, 6], [14, 3], [20, 6], [23, 12], [23, 30]]); E.p('k', [[8, 30], [8, 13], [10, 9], [14, 7], [18, 9], [20, 13], [20, 30]]); E.l('f2', 1, [[14, 9], [14, 30]]); E.e('g3', 16.5, 20, 0.9, 0.9); E.l('b0', 1, [[2, 30], [26, 30]]); },
    drop(E) { E.p('r1', [[14, 2.5], [18, 12], [21.5, 18.5], [20, 24.5], [14, 28.5], [8, 24.5], [6.5, 18.5], [10, 12]]); E.l('r3', 1.4, [[10.8, 15.5], [9.8, 21]]); E.e('r0', 16, 23, 2.4, 1.4); },
    bones(E) { const bone = (a, b) => { E.l('b2', 3, [a, b]); E.e('b2', a[0] - 1, a[1], 1.8, 1.8); E.e('b2', a[0], a[1] - 1, 1.8, 1.8); E.e('b2', b[0] + 1, b[1], 1.8, 1.8); E.e('b2', b[0], b[1] + 1, 1.8, 1.8); }; bone([6, 6], [22, 26]); bone([22, 6], [6, 26]); },
    sun(E) { for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; E.p('g3', [[14 + Math.cos(a - 0.2) * 8, 16 + Math.sin(a - 0.2) * 8], [14 + Math.cos(a) * 13, 16 + Math.sin(a) * 13], [14 + Math.cos(a + 0.2) * 8, 16 + Math.sin(a + 0.2) * 8]]); } E.e('g3', 14, 16, 8, 8); E.a('k', 1, 14, 16.5, 4.2, 0.35, 2.8); E.l('k', 1, [[9.5, 13.5], [11.5, 12.5], [12.5, 13.5]]); E.l('k', 1, [[15.5, 13.5], [16.5, 12.5], [18.5, 13.5]]); },
    mountain(E) { E.p('b0', [[1.5, 28], [10, 12], [14, 17], [19, 7], [26.5, 28]]); E.p('b3', [[16.3, 12], [19, 7], [21.7, 12], [20.2, 13.2], [19, 11.5], [17.8, 13.2]]); E.p('b2', [[7.8, 16], [10, 12], [12.2, 16]]); E.l('b1', 1, [[19, 9], [15.5, 21]]); E.l('b1', 1, [[10, 13], [8, 20]]); },
    bowl(E) { E.p('g2', [[2.5, 14], [25.5, 14], [22.5, 21.5], [17, 25], [11, 25], [5.5, 21.5]]); E.e('k', 14, 14.5, 10.8, 2.4); E.r('g1', 10.5, 25, 7, 2.5); E.l('g4', 1, [[6, 17], [9, 21.5]]); },
    dog(E) { E.p('g2', [[4.5, 3.5], [10, 11], [18, 11], [23.5, 3.5], [22.5, 15], [19.5, 22], [14, 27.5], [8.5, 22], [5.5, 15]]); E.e('r2', 10.5, 15, 1.3, 1); E.e('r2', 17.5, 15, 1.3, 1); E.p('k', [[12, 21], [16, 21], [14, 24]]); E.l('b3', 1, [[12, 24], [12, 26.5]]); E.l('b3', 1, [[16, 24], [16, 26.5]]); E.l('g1', 1, [[14, 11.5], [14, 19]]); },
    feather(E) { E.p('b2', [[20, 2.5], [23.5, 7], [18.5, 17], [10, 25.5], [7.5, 23], [12.5, 13]]); E.l('b0', 1, [[21.5, 4.5], [6.5, 27.5]]); for (let i = 0; i < 5; i++) E.l('b1', 1, [[18.4 - i * 2.2, 8 + i * 3], [14 - i * 2.2, 8 + i * 3]]); E.l('r1', 1.4, [[6.8, 27.2], [4.5, 30]]); },
    stone(E) { E.p('b0', [[3.5, 25], [5.5, 14], [11, 8.5], [18, 8.5], [23.5, 14], [24.5, 25], [14, 28]]); E.p('b1', [[7.5, 14], [12, 10.8], [17, 11], [13.5, 14.5]]); E.l('k', 1, [[13, 15], [15, 20], [13, 24]]); E.l('k', 1, [[15, 20], [19, 22]]); },
    shadow(E) { E.p('v1', [[10, 29], [18, 29], [27, 31], [15, 31.5]]); E.e('v2', 14, 6.2, 3, 3.4); E.p('v2', [[9, 10.5], [19, 10.5], [21, 20], [18, 20], [17, 28.5], [11, 28.5], [10, 20], [7, 20]]); E.l('b0', 1, [[18.5, 11], [20.2, 19]]); E.a('b1', 1, 14, 6.2, 3, -1.2, 0.6); },
    grave(E) { E.p('b1', [[7, 27], [7, 10], [9, 6], [14, 4], [19, 6], [21, 10], [21, 27]]); E.l('b0', 1.3, [[14, 9], [14, 21]]); E.l('b0', 1.3, [[10.5, 13], [17.5, 13]]); E.r('g1', 3, 27, 22, 2.5); for (const x of [5, 9, 19, 23]) E.l('g2', 1, [[x, 27], [x - 1, 24.5]]); }
  };
  // which emblem each choice carries, by the rite it belongs to
  const MAP = {
    card: { digger: 'hand', moth: 'moth', lamb: 'lamb', crow: 'crow', saint: 'saint', scholar: 'eye', twin: 'hanged', ratking: 'ratking', wick: 'candle', pilgrim: 'staff', mourner: 'weep', key: 'key', cup: 'cup', bell: 'bell', tooth: 'coin', kiln: 'kiln', loom: 'spool' },
    star: { tower: 'skull', wheel: 'heart', lantern: 'lantern', hollow: 'breath', silence: 'blacksun' },
    face: { keeper: 'grave', marrow: 'bones', wall: 'skull', mother: 'weep', vein: 'drop', butcher: 'dagger', smith: 'hammer', bearer: 'lantern', speaker: 'mouth', breath: 'breath', unseen: 'door', knell: 'bell', laugh: 'sun', bowl: 'bowl', unmoved: 'mountain' },
    fear: { dark: 'blacksun', fire: 'flame', water: 'waves', crowd: 'shadow', forgot: 'grave', dogs: 'dog', mirror: 'mirror', hunger: 'rat', bells: 'bell', hands: 'hand', silence: 'moon' },
    seek: { vengeance: 'dagger', knowledge: 'eye', wealth: 'coin', absolution: 'feather', oblivion: 'door', power: 'crown', home: 'staff', corpse: 'skull', faith: 'sun', kin: 'heart', end: 'blacksun' },
    road: { pilgrim: 'staff', river: 'waves', ash: 'flame', bone: 'bones', blood: 'drop', dark: 'moon', bell: 'bell', nowhere: 'door' },
    sac: { name: 'feather', shadow: 'shadow', eye: 'eye', warmth: 'flame', mother: 'weep', sleep: 'moon', voice: 'mouth', luck: 'coin', hunger: 'rat', taste: 'cup', song: 'bell', fear: 'mountain' },
    ans: { stone: 'stone', nothing: 'bowl', hand: 'hand', myname: 'feather', babble: 'mouth', yours: 'eye', mother: 'heart', stranger: 'staff', self: 'grave', bury: 'grave', eat: 'mouth', wake: 'sun', kind: 'lantern', use: 'hammer', hungry: 'rat' }
  };
  const EMC = {};
  function emblem(key) { return EMC[key] || (EMC[key] = paintEmblem(EMB[key] || EMB.eye)); }
  const emblemOf = (rite, id) => (MAP[rite] && MAP[rite][id]) || 'eye';

  // ------------------------------------------------------------------ the cards: gilt frame, night field, emblem, name ribbon
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hsh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const CARDC = {};
  const GOD = { tower: '#e6d6ba', wheel: '#d04050', lantern: '#9cc4e6', hollow: '#c496d2', silence: '#e0c46e' };
  // an engraved major-arcana number for each emblem, so the spread reads like an old deck
  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
  const numeral = emb => { let hh = 0; for (const ch of String(emb)) hh = (hh * 31 + ch.charCodeAt(0)) | 0; return ROMAN[((hh % 22) + 22) % 22]; };
  // v0.52: ink on old paper. Double ruled border, engraved rays behind the emblem, a ruled name box.
  function cardFace(w, h, emb, accent) {
    const key = 'ink' + w + 'x' + h + ':' + emb; if (CARDC[key]) return CARDC[key];
    const c = mkCanvas(w, h), x = c.getContext('2d'), px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) px(X, Y, paperAt(X, Y, w, h));
    const frame = (i, col) => { x.fillStyle = col; x.fillRect(i, i, w - 2 * i, 1); x.fillRect(i, h - 1 - i, w - 2 * i, 1); x.fillRect(i, i, 1, h - 2 * i); x.fillRect(w - 1 - i, i, 1, h - 2 * i); };
    frame(0, INK); frame(2, INK); frame(4, INK2);
    // the corners: a small inked rosette of four dots and a cross
    for (const [X, Y] of [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]]) { px(X, Y, INK); }
    for (const [X, Y] of [[6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7]]) { px(X, Y, INK); px(X - 1, Y, INK2); px(X + 1, Y, INK2); px(X, Y - 1, INK2); px(X, Y + 1, INK2); }
    const small = h < 64, ex = Math.round((w - EW) / 2), ey = small ? Math.round((h - EH) / 2) : 14, cx = ex + EW / 2, cy = ey + EH / 2;
    // engraved rays: fine ink lines from behind the emblem, broken every few pixels like a worn plate
    const R0 = 9, R1 = small ? Math.min(w, h) * 0.5 - 6 : Math.min(w / 2 - 7, 26);
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2, long = k % 2 === 0;
      for (let r = R0; r < (long ? R1 : R1 * 0.72); r += 1) {
        const X = Math.round(cx + Math.cos(a) * r), Y = Math.round(cy + Math.sin(a) * r * 1.05);
        if (X < 6 || Y < (small ? 6 : 14) || X > w - 7 || Y > h - 7) continue;
        if (hsh(X * 3, Y * 5) < 0.18) continue;
        px(X, Y, long ? INK2 : '#5a4834');
      }
    }
    // the emblem: clear its silhouette to paper, then lay down its ink
    const em = emblem(emb), sil = em._sil;
    if (sil) for (let i = 0; i < EW * EH; i++) if (sil[i]) { const X = ex + (i % EW), Y = ey + Math.floor(i / EW); px(X, Y, paperAt(X, Y, w, h)); }
    x.drawImage(em, ex, ey);
    if (small) return (CARDC[key] = c);
    // the name box: two ruled lines and a pair of ink ticks
    const ry = h - 19;
    x.fillStyle = INK; x.fillRect(6, ry - 1, w - 12, 1); x.fillRect(6, ry + 12, w - 12, 1);
    x.fillStyle = INK2; x.fillRect(8, ry + 1, w - 16, 1);
    for (const X of [6, w - 7]) { x.fillStyle = INK; x.fillRect(X, ry, 1, 12); }
    return (CARDC[key] = c);
  }
  function cardBack(w, h) {
    const key = 'inkback' + w + 'x' + h; if (CARDC[key]) return CARDC[key];
    const c = mkCanvas(w, h), x = c.getContext('2d'), px = (X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) px(X, Y, paperAt(X, Y, w, h));
    const frame = (i, col) => { x.fillStyle = col; x.fillRect(i, i, w - 2 * i, 1); x.fillRect(i, h - 1 - i, w - 2 * i, 1); x.fillRect(i, i, 1, h - 2 * i); x.fillRect(w - 1 - i, i, 1, h - 2 * i); };
    frame(0, INK); frame(2, INK); frame(3, INK2);
    // a woodcut lattice: crossing diagonals with a dot in every diamond
    for (let Y = 5; Y < h - 5; Y++) for (let X = 5; X < w - 5; X++) {
      const u = (X + Y) % 8, v = (X - Y + 800) % 8;
      if (u === 0 || v === 0) px(X, Y, INK2); else if (u === 4 && v === 4) px(X, Y, INK);
    }
    // the eye in the triangle, inked, on a cleared field
    const e = paintEmblem(E => { E.p('b1', [[14, 3], [26, 26], [2, 26]]); E.p('b3', [[14, 8], [21.5, 23], [6.5, 23]]); E.p('b2', [[8.5, 18], [11, 15.5], [14, 15], [17, 15.5], [19.5, 18], [17, 20.5], [14, 21], [11, 20.5]]); E.e('k', 14, 18, 1.8, 1.8); for (const X of [9, 14, 19]) E.e('b0', X, 29.5, 1, 1.4); });
    const ex = Math.round(w / 2 - EW / 2), ey = Math.round(h / 2 - 2 - EH / 2);
    for (let Y = ey - 2; Y < ey + EH + 2; Y++) for (let X = ex - 2; X < ex + EW + 2; X++) if (Math.hypot(X - w / 2, (Y - h / 2 + 2) * 0.9) < 17) px(X, Y, paperAt(X, Y, w, h));
    x.drawImage(e, ex, ey);
    return (CARDC[key] = c);
  }
  function TTC_(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }

  // draw one card: flip k (0 = back, 1 = face), lifted when considered, dimmed when passed over
  function tarot(x, y, w, h, o) {
    const k = o.flip == null ? 1 : o.flip, sw = Math.max(2, Math.round(w * Math.abs(Math.cos(Math.min(1, k) * Math.PI)))), face = k > 0.5, cx = x + w / 2;
    const lift = o.hi ? 4 : 0; y -= lift;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(Math.round(cx - sw / 2) + 2, y + 3 + lift, sw, h);
    if (o.hi) { ctx.globalCompositeOperation = 'lighter'; glow(cx, y + h / 2, 44, '255,160,70', 0.14 + 0.05 * Math.sin(G.time * 5)); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = o.dim ? 0.35 : 1;
    ctx.save();
    if (o.rot) { ctx.translate(cx, y + h / 2); ctx.rotate(o.rot); ctx.translate(-cx, -(y + h / 2)); }
    ctx.drawImage(face ? cardFace(w, h, o.emb, o.accent) : cardBack(w, h), Math.round(cx - sw / 2), Math.round(y), sw, h);
    if (face && sw >= w * 0.85 && o.name) {
      // the name, lettered on the ribbon
      const nm = o.name.replace(/^The /, ''), f7 = '7px "IM Fell English SC", Georgia, serif', f6 = '6px "IM Fell English SC", Georgia, serif', ry = y + h - 19;
      ctx.font = f7; const w7 = ctx.measureText(nm).width; ctx.font = f6; const w6 = ctx.measureText(nm).width;
      faText(numeral(o.emb), cx, y + 11, '#1a130d', f6, 'center', 0);
      if (w7 <= w - 12) faText(nm, cx, ry + 8.6, '#1a130d', f7, 'center', 0);
      else if (w6 <= w - 12) faText(nm, cx, ry + 8.2, '#1a130d', f6, 'center', 0);
      else faWrap(nm, w - 12, f6).slice(0, 2).forEach((l, i) => faText(l, cx, ry + 5.6 + i * 5.2, '#1a130d', f6, 'center', 0));
    }
    ctx.restore();
    if (o.hi && face) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,0.06)'; ctx.fillRect(Math.round(cx - sw / 2), y, sw, h); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ the spreads
  // a legible band of words ending at y `bot`: a card's name and what it gives, or the Stranger's question
  function infoBand(lines, bot) {
    if (!lines.length) return;
    bot = bot || 158;
    const rows = []; lines.forEach(ln => { if (ln.wrap) faWrap(ln.t, AW - 24, FA_SAY).forEach(t => rows.push({ t, say: 1, col: ln.col })); else rows.push(ln); });
    const lh = r => r.say ? 10 : r.big ? 10 : 9, hgt = rows.reduce((a, r) => a + lh(r), 0), top = bot - hgt - 4;
    const g = ctx.createLinearGradient(0, top - 8, 0, bot + 2);
    g.addColorStop(0, 'rgba(3,2,4,0)'); g.addColorStop(0.35, 'rgba(3,2,4,0.66)'); g.addColorStop(1, 'rgba(3,2,4,0.66)');
    ctx.fillStyle = g; ctx.fillRect(AX, top - 8, AW, bot + 2 - (top - 8));
    let yy = top;
    rows.forEach(r => {
      yy += lh(r);
      if (r.fx) fateTxt(r.fx, W / 2, yy - 2, AW - 20, r.dim);
      else faText(r.t, W / 2, yy - 1, r.col || '#f0dcae', r.say ? FA_SAY : r.big ? FA_HEAD : FA_SMALL, 'center', 0.9);
    });
  }
  // lay n cards in a row; returns the index under the mouse
  function spread(items, o) {
    const n = items.length, w = o.w || CW_(n), h = o.h || CH_(n), gap = o.gap || (n > 3 ? 8 : 16);
    const x0 = Math.round(W / 2 - (n * w + (n - 1) * gap) / 2), y = o.y != null ? o.y : lowY(h); let hov = -1;
    items.forEach((it, i) => {
      const x = x0 + i * (w + gap), live = o.live && it.live !== false, on = live && inRect(mouse, x, y - 4, w, h + 4);
      if (on) hov = i;
      if (live) divButton(x, y - 4, w, h + 4, () => o.pick(i));
      tarot(x, y, w, h, { emb: it.emb, name: it.name, accent: it.accent, hi: on || it.chosen, dim: it.dim, flip: it.flip });
      if (it.sub) faText(it.sub, x + w / 2, y + h + 8, it.chosen || on ? '#f0dcae' : '#a89478', FA_SMALL, 'center', 0.9);
    });
    return hov;
  }
  const V_ = () => G.divine;
  // v0.53 the user: "I don't like how the bottom text box disappears during a choice". The Stranger's box stays; the
  // cards stand just above it (smaller while you choose, so his face and hands stay clear), the card's name over them.
  const CW_ = n => n > 3 ? 50 : 54, CH_ = n => n > 3 ? 78 : 84, BOX_TOP = 206;
  const lowY = h => BOX_TOP - h;
  const LOW_Y = BOX_TOP - 78;
  const HIGH_Y = 110;    // once taken: the rite's cards rise over his lap while he speaks of them
  const full = () => { const V = V_(); return V.shown >= (V.lines[V.li] || '').length && V.li >= V.lines.length - 1; };
  // every rite's cards, as { emb, name, accent, info[] }
  function riteItems(rite) {
    const V = V_();
    if (rite === 'star') return FATE.stars.map(s => ({ id: s.id, emb: emblemOf('star', s.id), name: s.clsName, accent: GOD[s.id], info: [{ t: `${s.name}, ${s.sub}`, big: 1 }, { t: `${s.clsName}. ${s.blurb || ''}`, col: '#c9bca0' }, { fx: s.txt }] }));
    if (rite === 'face') return (FATE.faces[V.picks.star] || []).map(f => ({ id: f.id, emb: emblemOf('face', f.id), name: f.name, accent: GOD[V.picks.star], info: [{ t: f.name, big: 1 }, { fx: f.txt }] }));
    if (rite === 'fear') return V.fears.map(f => ({ id: f.id, emb: emblemOf('fear', f.id), name: f.name, info: [{ t: f.name, big: 1 }, { fx: f.txt }] }));
    if (rite === 'seek') return V.seeks.map(f => ({ id: f.id, emb: emblemOf('seek', f.id), name: f.name, accent: f.col, info: [{ t: f.name, big: 1 }, { fx: f.txt }] }));
    if (rite === 'road') return (V.roads || []).map(f => ({ id: f.id, emb: emblemOf('road', f.id), name: f.name, info: [{ t: f.name, big: 1 }, { fx: f.txt }] }));
    if (rite === 'sac') return V.sacs.map(f => ({ id: f.id, emb: emblemOf('sac', f.id), name: f.give, info: [{ t: f.give, big: 1 }, { fx: f.txt }] }));
    if (rite === 'ask') return FATE.questions[V.qi].a.map(a => ({ id: a.id, emb: emblemOf('ans', a.id), name: a.ans, info: [{ t: `"${a.ans}"`, big: 1 }, { fx: a.txt }] }));
    if (rite === 'cards') return V.cards.map(c => ({ id: c.id, emb: emblemOf('card', c.id), name: c.name, info: [{ t: c.name, big: 1 }, { fx: c.txt }] }));
    return [];
  }
  // the rite's chosen card index (-1 while none)
  function chosenIdx(rite) {
    const V = V_(), P0 = V.picks || {};
    if (rite === 'star') return P0.star ? FATE.stars.findIndex(s => s.id === P0.star) : -1;
    if (rite === 'sac') return P0.sac ? V.sacs.findIndex(s => s.id === P0.sac) : -1;
    return V.choice != null ? V.choice : -1;
  }
  // his question, carried up out of the dialog box while you choose
  const question = () => { const V = V_(); return V.lines[V.lines.length - 1] || ''; };
  function drawRite(rite, done) {
    const V = V_(), items = riteItems(rite); if (!items.length) return false;
    const ch = done ? chosenIdx(rite) : -1, awaiting = !done && full();
    let flips = null;
    if (rite === 'cards') flips = items.map((_, i) => V.flipT == null ? 0 : (V.choice === i ? Math.min(1, V.flipT / 0.5) : Math.min(1, Math.max(0, (V.flipT - 1.6 - i * 0.2) / 0.5))));
    const view = items.map((it, i) => Object.assign({}, it, { chosen: ch === i, dim: ch >= 0 && ch !== i, flip: flips ? flips[i] : null }));
    const y = done || !awaiting ? HIGH_Y : lowY(CH_(items.length));
    const hov = spread(view, { y: done || !awaiting ? HIGH_Y : undefined, live: awaiting && (rite !== 'cards' || V.choice == null), pick: i => divinePick(i) });
    const show = hov >= 0 ? hov : ch;
    if (awaiting) {
      if (show >= 0 && (!flips || flips[show] > 0.9)) infoBand(view[show].info, y - 6);
    } else if (show >= 0 && (!flips || flips[show] > 0.9)) infoBand(view[show].info, y - 6);
    return awaiting;
  }
  // the drawn card, held two ways: as it fell, and turned over
  function drawTurning(done) {
    const V = V_(), c = V.cards[V.choice0]; if (!c) return false;
    const w = 54, h = 84, awaiting = !done && full(), y = awaiting ? lowY(h) : HIGH_Y, emb = emblemOf('card', c.id);
    const pos = [[W / 2 - w - 18, false], [W / 2 + 18, true]]; let hov = -1;
    pos.forEach(([x, rev], i) => {
      const chosen = done && (!!V.picks.cardRev === rev), on = awaiting && inRect(mouse, x, y - 4, w, h + 4);
      if (on) hov = i;
      if (awaiting) divButton(x, y - 4, w, h + 4, () => divinePick(rev ? 1 : 0));
      tarot(x, y, w, h, { emb, name: c.name, hi: on || chosen, dim: done && !chosen, rot: rev ? Math.PI : 0 });
    });
    const show = hov >= 0 ? hov : done ? (V.picks.cardRev ? 1 : 0) : -1;
    if (show >= 0) infoBand([{ t: show ? `${c.name}, turned` : `${c.name}, as it fell`, big: 1 }, { fx: show ? c.rev.txt : c.txt }], y - 6);
    return awaiting;
  }
  // ------------------------------------------------------------------ your reading, gathering in the margins
  // the cards you have taken move out of his light into the dark on either side of the picture: four on the
  // left (the god, its face, the drawn card, the fear), four on the right (the door, the road, the answer, the sacrifice)
  const MW = 36, MH = 48;
  const SLOTS = { star: [22, 8], face: [22, 60], cards: [22, 112], fear: [22, 164], seek: [422, 8], road: [422, 60], ask: [422, 112], sac: [422, 164] };
  const RITE_OF_SCENE = s => s.replace(/Done$/, '').replace(/^cardRev$/, 'cards');
  function taken() {
    const V = V_(), P0 = V.picks || {}, f1 = (L, id) => (L || []).find(q => q.id === id), out = [];
    const cur = RITE_OF_SCENE(V.scene), curDone = /Done$/.test(V.scene) || V.scene === 'cardRev';
    const add = (rite, o) => { if (!o) return; if (rite === cur && (curDone || rite === 'cards' && V.scene === 'cardRev')) return; out.push(Object.assign({ rite }, o)); };
    const s = f1(FATE.stars, P0.star); if (s) add('star', { emb: emblemOf('star', s.id), accent: GOD[s.id], info: [{ t: `${s.name}: ${s.clsName}`, big: 1 }, { fx: s.txt }] });
    const fa = f1(FATE.faces[P0.star], P0.face); if (fa) add('face', { emb: emblemOf('face', fa.id), accent: GOD[P0.star], info: [{ t: fa.name, big: 1 }, { fx: fa.txt }] });
    const c = f1(FATE.cards, P0.card); if (c && V.scene !== 'cardsDone' && V.scene !== 'cardRev') add('cards', { emb: emblemOf('card', c.id), rot: !!P0.cardRev, info: [{ t: c.name + (P0.cardRev ? ', turned' : ''), big: 1 }, { fx: P0.cardRev ? c.rev.txt : c.txt }] });
    const fe = f1(FATE.fears, P0.fear); if (fe) add('fear', { emb: emblemOf('fear', fe.id), info: [{ t: 'Afraid of ' + fe.name.toLowerCase(), big: 1 }, { fx: fe.txt }] });
    const sk = f1(FATE.seeks, P0.seek); if (sk) add('seek', { emb: emblemOf('seek', sk.id), accent: sk.col, info: [{ t: 'Seeking ' + sk.name.toLowerCase(), big: 1 }, { fx: sk.txt }] });
    const rd = f1(FATE.roads, P0.road); if (rd) add('road', { emb: emblemOf('road', rd.id), info: [{ t: 'Came by ' + rd.name.replace(/^The /, 'the '), big: 1 }, { fx: rd.txt }] });
    let an = null; if (FATE.questions && V.qi != null) an = f1(FATE.questions[V.qi].a, P0.ask);
    if (an) add('ask', { emb: emblemOf('ans', an.id), info: [{ t: `"${an.ans}"`, big: 1 }, { fx: an.txt }] });
    const sa = f1(FATE.sacrifices, P0.sac); if (sa) add('sac', { emb: emblemOf('sac', sa.id), info: [{ t: 'Given up: ' + sa.give.toLowerCase(), big: 1 }, { fx: sa.txt }] });
    return out;
  }
  function drawMargins(infoBot) {
    const V = V_(), T = taken(); let hovInfo = null;
    V._arrive = V._arrive || {};
    for (const it of T) {
      const [x, y] = SLOTS[it.rite];
      const t0 = V._arrive[it.rite] == null ? (V._arrive[it.rite] = G.time) : V._arrive[it.rite], k = Math.min(1, (G.time - t0) / 0.45), e = 1 - (1 - k) * (1 - k);
      const on = inRect(mouse, x, y, MW, MH);
      ctx.globalAlpha = e; tarot(x, y + (1 - e) * 12, MW, MH, { emb: it.emb, accent: it.accent, hi: on || V.scene === 'end', rot: it.rot ? Math.PI : 0 }); ctx.globalAlpha = 1;
      if (on) hovInfo = it.info;
    }
    if (hovInfo) infoBand(hovInfo, infoBot);
  }

  // ------------------------------------------------------------------ the Reading, drawn
  drawDivine = function () {
    const V = G.divine; V.btn = [];
    drawBackdrop();
    const sc = V.scene, base = sc.replace(/Done$/, ''), done = /Done$/.test(sc);
    let choosing = false;
    if (base === 'cardRev') choosing = drawTurning(done);
    else if (['star', 'face', 'fear', 'seek', 'road', 'sac', 'ask', 'cards'].includes(base)) choosing = drawRite(base, done);
    drawMargins(choosing ? LOW_Y - 8 : 206);
    // between rites the dark closes in a moment
    if (V.fade > 0) { ctx.fillStyle = `rgba(3,2,4,${Math.min(1, V.fade) * 0.7})`; ctx.fillRect(0, 0, W, H); }
    if (!ST.ready) faText('…', W / 2, H / 2, '#6a6068', FA_HEAD, 'center', 0.8);
    // his box stays at the bottom through every choice
    divDialog();
    faSkip();
  };
  // "Skip the reading" sits just left of the right-hand column of taken cards, never over them
  faSkip = function () {
    const r = 414, w = 80, h = 14, x = r - w, y = 4, hov = inRect(mouse, x, y, w, h);
    G.divine.btn.push({ x, y, w, h, fn: () => skipDivination() });
    faText('Skip the reading', r, 14, hov ? '#e8d8b0' : '#6a6068', FA_SMALL, 'right', 0.8);
  };
  // the old rooms are never shown now: stop painting them in the background
  if (typeof faRegister === 'function') {
    faRegister = function () { FA.reg = []; try { faFrame(W - 28, 54, 'panel'); faFrame(86, 14, 'gold'); } finally { FA_PREBAKE = FA.reg; FA.reg = null; } };
  }
  try { if (typeof window !== 'undefined') window.__reading = { ST, SI, REST, strangerFrame, emblem, EMB, MAP, cardFace, cardBack, paintEmblem }; } catch (e) { }
})();
