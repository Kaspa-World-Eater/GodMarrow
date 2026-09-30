  // the title: a funeral dirge. A slow march under a tolling bell; the lament bass falls D, C, B-flat, A and the strings
  // mourn over it; the choir comes in on the third time round. Written for the Godot title (2026-09-30).
  CUE.dirge = {
    gain: 1.05, bpm: 46, steps: 4, root: 38, sc: SC.aeol, drone: [26, 0.035, 170], wind: 0.004, windF: 180, seed: 97,
    step(t, s, bar, c) {
      const beat = 60 / c.bpm, sec = Math.floor(bar / 8) % 4;           // 0 bell alone, 1 the march, 2 the tune, 3 the choir
      const lam = [0, -2, -4, -5][Math.floor(bar / 2) % 4];                // D C Bb A, two bars each
      if (s === 0 && bar % 2 === 0) setDrone(t, c.root - 12 + lam);
      // the bell: every other bar, on the one, and its low answer
      if (s === 0 && bar % 2 === 0) { bell(t, c.root + 24, 0.035, 0.25); bell(t + beat * 0.02, c.root + 12, 0.02, -0.25); }
      if (sec === 0) return;
      // the march: a muffled drum on one, a lighter stroke and its grace on three (long, short-short, long)
      if (s === 0) drum(t, 0.3, { f: 46, len: 1.1, snap: 0.08 });
      if (s === 2) { drum(t, 0.16, { f: 52, len: 0.6, snap: 0.06 }); drum(t + beat * 0.66, 0.11, { f: 55, len: 0.5, snap: 0.05 }); }
      // the lament bass, bowed low
      if (s === 0 && bar % 2 === 0) { strings(t, c.root - 12 + lam, beat * 7.6, 0.03, -0.2, 380); strings(t, c.root + lam, beat * 7.6, 0.018, 0.2, 520); }
      if (sec < 2) return;
      // the tune: eight bars, falling and coming home
      const TUNE = [[[4, 2], [2, 2]], [[3, 3], [2, 1]], [[1, 2], [2, 1], [1, 1]], [[0, 4]], [[4, 2], [5, 2]], [[4, 3], [3, 1]], [[2, 2], [1, 2]], [[0, 4]]];
      if (s === 0) {
        let o = 0;
        for (const [d, l] of TUNE[bar % 8]) { strings(t + o * beat, c.root + 12 + deg(c.sc, d), l * beat * 1.05, 0.028, 0.1, 1100); o += l; }
        if (sec === 3) {
          let o2 = 0;
          for (const [d, l] of TUNE[bar % 8]) { choir(t + o2 * beat, c.root + deg(c.sc, d), l * beat * 1.1, 0.03, -0.15, 'u'); o2 += l; }
        }
      }
      if (sec === 3 && s === 1 && Math.random() < 0.3) breath(t, 3, 0.02, Math.random() - 0.5);
    }
  };
