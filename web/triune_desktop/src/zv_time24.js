
// =================================================================== v0.24: the hours of the Hide
// Out under the sky, the time of day changes who walks and how hard they hit. There are four hours:
// - day
// - dusk, when the Hide bleeds: a red hour, and everything hunts faster
// - night
// - dawn, the hour of long shadows, when bone stands straighter and mourners weep
// Dusk and dawn are short, and their effects are stronger than the day's or the night's. Some creatures only come
// out in certain hours: by day they lie hidden in the ash and the water, and they rise when their hour comes.
function hourOf() { const p = dayPhase(); return p < 0.55 ? 'day' : p < 0.66 ? 'dusk' : p < 0.9 ? 'night' : 'dawn'; }
// per creature (by MON key): when it walks at all (`when`), and how strong it is in each hour
const HOURS = {
  hollow: { night: 1.25, dusk: 1.35 },                 // the wound bleeds louder in the dark
  drowned: { night: 1.3, dusk: 1.3 },
  hound: { dusk: 1.5, night: 1.2, day: 0.9 },          // Tithe-Hands hunt at dusk
  archer: { dawn: 1.5, day: 1.05 },                    // Weepers mourn at dawn
  ossarcher: { dawn: 1.5 },
  caster: { when: ['dusk', 'night', 'dawn'], night: 1.3, dusk: 1.4 },    // the Gasp is the last breath: it walks in the dark
  bogwitch: { when: ['dusk', 'night', 'dawn'], night: 1.3, dusk: 1.4 },
  moth: { when: ['dusk', 'night'], dusk: 1.5, night: 1.2 },             // Wick-Saints come out for the lamps
  pyre: { day: 1.25, dusk: 1.1, night: 0.8, dawn: 1.4 },                // a faith that burns brightest in the sun
  bell: { dusk: 1.45, dawn: 1.45 },                    // the bells toll at the turning of the hours
  worm: { night: 1.25 }, leech: { night: 1.25, dusk: 1.2 },
  knight: { dawn: 1.35, day: 1.1 }, marrow: { dawn: 1.4, day: 1.1 },   // bone stands straighter in the long light
  bloat: { dusk: 1.2 },
};
// the hours themselves, for everything: dusk quickens every creature, dawn slows the flesh and strengthens bone
const HOUR_ALL = { day: { spd: 1 }, dusk: { spd: 1.12 }, night: { spd: 1.05 }, dawn: { spd: 0.95 } };
function hourMul(m) { if (!isOutdoor(G.zone) || !m || !m.b) return 1; const h = HOURS[m.type]; return (h && h[hourOf()]) || 1; }
{
  const _ts = terrainSpd;
  terrainSpd = function (o) { let k = _ts(o); if (o && o.b && !o.isSkel && isOutdoor(G.zone)) k *= HOUR_ALL[hourOf()].spd * (1 + (hourMul(o) - 1) * 0.5); return k; };
}
const HOUR_TXT = {
  day: ['DAY', 'The sun is on the Hide. The pyres burn hot.', '#e8d8a8'],
  dusk: ['DUSK', 'The Hide bleeds. Everything hunts faster; the Hands come out.', '#e06040'],
  night: ['NIGHT', 'Keep to the light. The breath walks.', '#8ea0d8'],
  dawn: ['DAWN', 'The long shadows. Bone stands straighter; the mourners weep.', '#e0b878'],
};
G.hour = null;
function updateHours(dt) {
  const z = G.zone; if (!z) return;
  const out = isOutdoor(z), h = out ? hourOf() : null;
  if (out && h !== G.hour && G.hour !== undefined) { if (G.hour) { const t = HOUR_TXT[h]; banner(t[0], t[2], 2.4); say(t[1], 3); sfx(h === 'dusk' ? 110 : h === 'dawn' ? 330 : 220, 1.2, 'sine', 0.04, h === 'dusk' ? -30 : 40); } }
  G.hour = h;
  for (const m of z.monsters) {
    if (m.dead) continue;
    const H = HOURS[m.type];
    // damage follows the hour
    if (m.dmg) { if (!m._dmg0) m._dmg0 = m.dmg.slice(); const k = hourMul(m); m.dmg = m._dmg0.map(v => v * k); m._hourK = k; }
    // some only walk in their hours; the rest of the time they lie hidden where they stood
    if (H && H.when) {
      const awake = !out || H.when.includes(h);
      if (!awake && !m._timeHidden && dist(m, P) > 9) { m._timeHidden = true; m.hidden = true; m.state = 'idle'; m.path = null; }
      else if (awake && m._timeHidden) { m._timeHidden = false; m.hidden = false; if (onScreen(m.x, m.y)) burst(m.x, m.y, h === 'dusk' ? '#c05030' : '#8ea0d8', 10, 1.6); }
    }
  }
}
{
  const _um = updateMon;
  updateMon = function (m, dt, dp) { if (m._timeHidden) return; return _um(m, dt, dp); };
}
// the look of the hours: at dusk embers rise and the air reddens at the edges; at dawn a gold dust hangs in long light
const HOURFX = { p: [] };
function drawHourFx() {
  const h = G.hour; if (!h || (h !== 'dusk' && h !== 'dawn')) { HOURFX.p.length = 0; return; }
  const p = dayPhase(), k = h === 'dusk' ? Math.sin((p - 0.55) / 0.11 * Math.PI) : Math.sin((p - 0.9) / 0.1 * Math.PI);
  const dusk = h === 'dusk';
  // a vignette of the hour's colour
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, dusk ? `rgba(190,60,20,${0.16 * k})` : `rgba(200,150,70,${0.18 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (HOURFX.p.length < 70 * k) HOURFX.p.push({ x: Math.random() * W, y: dusk ? H + 4 : Math.random() * H, v: 6 + Math.random() * 14, s: Math.random() * 6, t: 0 });
  const dt = G.dtLast || 0.016;
  for (const q of HOURFX.p) {
    q.t += dt;
    if (dusk) { q.y -= q.v * dt; q.x += Math.sin(q.t * 2 + q.s) * 0.3; ctx.fillStyle = `rgba(255,${120 + (q.s * 20 | 0)},60,${0.7 * k})`; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
    else { q.x += q.v * 0.25 * dt; q.y += Math.sin(q.t + q.s) * 0.05; ctx.fillStyle = `rgba(255,230,170,${(0.25 + 0.25 * Math.sin(q.t * 3 + q.s)) * k})`; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
  }
  HOURFX.p = HOURFX.p.filter(q => q.y > -4 && q.x < W + 4 && q.t < 14);
}
{
  const _da = drawAtmos;
  drawAtmos = function () { _da(); try { drawHourFx(); } catch (e) { } };
  const _ud = updateDay;
  updateDay = function (dt) { _ud(dt); try { updateHours(dt); } catch (e) { reportError(e); } };
}
