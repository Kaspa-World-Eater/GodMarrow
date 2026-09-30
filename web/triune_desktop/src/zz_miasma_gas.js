// zz_miasma_gas.js
// User: "some miasma skills look green not purple, and they should be like gasses,
// waves of air moving, little puffs of gas"
// Two things: (1) redirect any greenish colors in miasma particle emissions to
// purple, and (2) make emitted particles drift as gas — slower, longer life,
// wave-like horizontal sway on the way up.
(function () {
  const GREENISH = new Set(['#9aff6a', '#b8c040', '#7a841c', '#5e6a3a', '#6a7a3a', '#8a9a4a']);
  const PURPLE_A = '#8a4ab8', PURPLE_B = '#b070e0';

  // wrap Array.prototype.push on parts? Too invasive. Instead: on each frame,
  // walk `parts` and if a particle's color is one of the greens AND was spawned
  // in a miasma context (miasmancer active OR near a poison cloud), swap it.
  // We hook into updateMias since it fires only for miasmancer.
  if (typeof updateMias === 'function') {
    const _u = updateMias;
    updateMias = function (dt) {
      _u.call(this, dt);
      if (typeof parts === 'undefined' || !parts.length) return;
      // recent slice: fresh spawns tend to be at the tail
      const start = Math.max(0, parts.length - 60);
      for (let i = start; i < parts.length; i++) {
        const p = parts[i];
        if (!p || !p.col) continue;
        if (GREENISH.has(p.col)) p.col = Math.random() < 0.5 ? PURPLE_A : PURPLE_B;
        // apply gaseous drift to purple miasma-hued particles only (leave other classes' particles alone)
        if (p._gas) continue;
        if (p.col === PURPLE_A || p.col === PURPLE_B || p.col === '#a488c8' || p.col === '#6a4a8a' || p.col === '#d0a0f0' || p.col === '#e0b8ff') {
          // extend life slightly, slow the rise, add sway
          if (p.t < 0.9) p.t = Math.min(1.6, p.t + 0.35);
          if (p.vz != null) p.vz = Math.max(0.4, p.vz * 0.7);
          // slight lateral drift, chosen once per particle (seed by index)
          p._sway = (i % 7) * 0.3 - 0.9;
          p._gas = true;
        }
      }
    };
  }

  // wave-motion pass: for gas particles, add a horizontal sway that oscillates
  // as they rise. We tag them in the pass above; here we nudge their vx each frame.
  const oldRAF = typeof window !== 'undefined' && window.requestAnimationFrame;
  if (typeof parts !== 'undefined') {
    const swayTick = () => {
      if (typeof parts === 'undefined' || !parts.length) { if (oldRAF) requestAnimationFrame(swayTick); return; }
      const time = (typeof G !== 'undefined' && G.time) ? G.time : (performance.now() / 1000);
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]; if (!p || !p._gas) continue;
        // small oscillation on vx, does not accumulate
        const s = Math.sin(time * 2.2 + i * 0.7) * 0.35 + (p._sway || 0) * 0.05;
        if (p.vx != null) p.vx = p.vx * 0.92 + s * 0.08;
      }
      if (oldRAF) requestAnimationFrame(swayTick);
    };
    if (oldRAF) requestAnimationFrame(swayTick);
  }
})();
