// render the web score's Act I cues through its test hook into WAV files
const { chromium } = require('playwright');
const fs = require('fs');
const CUES = (process.env.CUES || 'a1_town:156,a1_wild:156,a1_deep:156,boss1:96,title:124').split(',').map(s => s.split(':'));
const RATE = 44100;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('file:///tmp/gd/x73_dirge.html'); await p.waitForTimeout(1500);
  for (const [key, secS] of CUES) {
    const sec = +secS;
    const ok = await p.evaluate(async ([key, sec, RATE]) => {
      const W = window.__music96; if (!W || !W.CUE[key]) return 'nocue';
      try { MUS.vol = 0.7; } catch (e) { }
      const ctx = new OfflineAudioContext(2, Math.floor(RATE * sec), RATE);
      W.testRender(ctx, key, sec);
      const buf = await ctx.startRendering();
      window.__mbuf = [buf.getChannelData(0), buf.getChannelData(1)];
      return buf.length;
    }, [key, sec, RATE]);
    if (typeof ok !== 'number') { console.log(key, ok); continue; }
    const n = ok, CH = 1 << 20, out = Buffer.alloc(n * 4);
    for (let o = 0; o < n; o += CH) {
      const b64 = await p.evaluate(([o, CH]) => {
        const [L, R] = window.__mbuf, m = Math.min(CH, L.length - o), a = new Int16Array(m * 2);
        for (let i = 0; i < m; i++) { a[i * 2] = Math.max(-1, Math.min(1, L[o + i])) * 32767; a[i * 2 + 1] = Math.max(-1, Math.min(1, R[o + i])) * 32767; }
        let s = ''; const u = new Uint8Array(a.buffer); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s);
      }, [o, CH]);
      Buffer.from(b64, 'base64').copy(out, o * 4);
    }
    const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + out.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(out.length, 40);
    fs.writeFileSync('/tmp/gd/mus/' + key + '.wav', Buffer.concat([h, out]));
    console.log('wrote', key, n);
  }
  await b.close();
})();
