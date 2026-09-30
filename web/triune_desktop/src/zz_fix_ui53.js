// zz_fix_ui53.js (v0.53) — small interface fixes the user asked for (2026-09-28).
//  - "the quotation marks look weird ... like they're both going the same direction": straight quotes drawn in the
//    book fonts (IM Fell) become proper opening and closing marks. The pixel font keeps its own.
//  - "in every mode the menu close button gets overlaid by other stuff, like the day night clock": the corner clock
//    (and anything else drawn after the panels) stays out of the way while a panel is open.
(function () {
  // ---- smart quotes
  function smart(s) {
    if (typeof s !== 'string' || (s.indexOf('"') < 0 && s.indexOf("'") < 0)) return s;
    let out = '', dq = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i], prev = i ? s[i - 1] : ' ';
      if (c === '"') { const open = !dq && (/[\s(\[—–-]/.test(prev) || i === 0); out += open ? '“' : '”'; dq = open ? true : false; }
      else if (c === "'") { const open = /[\s(\[—–"“]/.test(prev) || i === 0; out += open ? '‘' : '’'; }
      else out += c;
    }
    return out;
  }
  try {
    const proto = CanvasRenderingContext2D.prototype, _ft = proto.fillText, _mt = proto.measureText;
    const book = f => /Fell|Georgia|serif/.test(f) && !/Silkscreen/.test(f);
    proto.fillText = function (s, x, y, mw) { if (book(this.font)) s = smart(s); return mw === undefined ? _ft.call(this, s, x, y) : _ft.call(this, s, x, y, mw); };
    proto.measureText = function (s) { if (book(this.font)) s = smart(s); return _mt.call(this, s); };
  } catch (e) { }
  try { window.__smartQuotes = smart; } catch (e) { }

  // ---- nothing sits over an open panel's close button
  // (zz_polish.js, the last file, replaces drawSkyDial outright, so wrap it once everything has loaded)
  setTimeout(() => {
    if (typeof drawSkyDial !== 'function') return;
    const _sd = drawSkyDial;
    drawSkyDial = function () { if (typeof anyPanelOpen === 'function' && anyPanelOpen()) return; return _sd.apply(this, arguments); };
  }, 0);
})();
