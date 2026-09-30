// zz_movespd_curve.js
// User: "reduce movement speed growth"
// D2-style: cap effective faster-run bonus and gently trim base speed so the
// power curve on frw + wraith + arcana feels earned, not runaway.
(function () {
  if (typeof derive !== 'function') return;
  const _d = derive;
  derive = function () {
    const d = _d.apply(this, arguments);
    // recompute moveSpd with capped frw and softer base
    // base was 4.5 -> 4.15; frw hard-capped at 40% (was uncapped), and applied at diminishing returns above 25%
    const frwSum = (function () { try { return (itemStatSum().frw) || 0; } catch (e) { return 0; } })();
    const frwEff = frwSum <= 25 ? frwSum : 25 + (Math.min(frwSum, 80) - 25) * 0.6;   // taper above 25%
    const frwCap = Math.min(40, frwEff);
    d.moveSpd = 4.15 * (1 + frwCap / 100);
    return d;
  };
  // wraith form was 1.5x -> tone down; still fastest but less runaway
  if (typeof WS !== 'undefined' && WS.wraithSpd) {
    const _w = WS.wraithSpd;
    WS.wraithSpd = () => Math.min(1.35, 1.2 + 0.008 * (P.skills && P.skills.wraith || 0) + (P.skills && P.skills.wraithhaste > 0 ? 0.1 : 0));
  }
})();
