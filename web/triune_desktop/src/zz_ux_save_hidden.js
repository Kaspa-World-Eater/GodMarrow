// zz_ux_save_hidden.js (v0.54): save when the game is hidden (a phone app sent to the background, a tab switched away),
// so nothing is lost if the system closes it. The Android wrapper calls window.__androidPause() as it pauses.
(function () {
  const saveNow = () => { try { if (G.running && !P.dead && G.saveKey) save(); } catch (e) { } };
  window.__androidPause = saveNow;
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  addEventListener('pagehide', saveNow);
})();
