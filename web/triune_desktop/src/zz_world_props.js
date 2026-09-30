
// =================================================================== v0.51: living-forest props (M1)
// Four HD props, hand-listed pixel by pixel with fillRect on offscreen canvases:
//   luminous_shroom_teal, luminous_shroom_amber, trunk_relic, ruin_pillar.
// Reference (only a guide): refs/forest/f1 (conifer stand, cool ground palette),
// f3 (mossy log, red-cap family, drifting motes), f5 (luminous amber caps, warm rim, teal-blue night).
// No procedural gradients, no faShade/faLum/faPixelize/faPutG, no data-URI blits.
// Every cap-row, every rib, every stone course is written out by hand.
{
  const _HEX = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const _RGB = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  // ------------------------------------------------------------------- named palettes (dark -> light)
  const SH_TEAL   = ['#0a1e22','#0f3138','#164a52','#1d6a72','#2ea8a2','#7ee6d2'].map(_HEX);
  const SH_AMBER  = ['#1e0f04','#3a1c08','#5e3210','#8a4a18','#d67a24','#ffcf6c'].map(_HEX);
  const TR_BARK   = ['#0a0605','#17100b','#241812','#33251a','#4a3524','#6a4f36'].map(_HEX);
  const TR_MOSS   = ['#0e1808','#1a2812','#2a4020','#446632','#78a058'].map(_HEX);
  const RN_STONE  = ['#080709','#141216','#23202a','#36323e','#4c4756','#68627a','#8c8aa2'].map(_HEX);
  const RN_LICHEN = ['#183a24','#2c5e34','#5a8a44','#a8c078'].map(_HEX);
  const _BONE     = ['#100e0a','#7a7460','#c4bda2','#f0e7c8'].map(_HEX);
  const _WAX      = ['#2a1c10','#8a6a3c','#e8dcb0','#ffe094'].map(_HEX);
  // small night-ramp shift: darken cool colours, lift the glowing ones. Used by callers wanting a "night" tint canvas.
  const _tint = (col, dr, dg, db, k) => [
    Math.max(0, Math.min(255, col[0] * k + dr)),
    Math.max(0, Math.min(255, col[1] * k + dg)),
    Math.max(0, Math.min(255, col[2] * k + db))];
  // ------------------------------------------------------------------- helpers
  // pxRow: paint one horizontal run at (x,y) width w, colour col (an [r,g,b] triple), on ctx x
  const pxRow = (x, X, Y, W, col) => { x.fillStyle = _RGB(col); x.fillRect(X, Y, W, 1); };
  const px    = (x, X, Y, col) => { x.fillStyle = _RGB(col); x.fillRect(X, Y, 1, 1); };
  // ellipseFill: hand-listed cap dome, row by row. cy,cx: centre; rx,ry: half-axes; ramp: palette array;
  // top: brightest ramp index at top, side: darker index at rim; every row is one fillRect strip built from a
  // 4-colour horizontal pattern chosen per pixel by a tiny mask.
  const capRow = (x, cx, cy, ry, ramp, spots) => {
    // draw one cap as horizontal strips r = 0..ry from top; caller passes ry so it's declared per cap.
    for (let r = 0; r <= ry; r++) {
      const t = r / ry;
      // this row's half-width (a squashed circle), rounded to whole pixels
      const hw = Math.round(Math.sqrt(Math.max(0, 1 - (t - 0.15) * (t - 0.15) / 0.75)) * ry * 1.9 * (1 - t * 0.25));
      if (hw < 1) continue;
      const y = cy - ry + r;
      // base band, then a bright cap-crest along the top three rows, then rim-shadow on last row
      const base = r < 2 ? ramp[4] : r < ry - 1 ? ramp[3] : ramp[2];
      pxRow(x, cx - hw, y, hw * 2 + 1, base);
      // hand-listed cap gleam: a two-pixel highlight offset to the light side (upper-left)
      if (r === 1) { pxRow(x, cx - hw + 2, y, Math.max(1, hw - 1), ramp[5]); }
      if (r === 2) { px(x, cx - hw + 3, y, ramp[5]); px(x, cx - hw + 4, y, ramp[5]); }
      // rim shadow row: a darker underline so caps read as domes not discs
      if (r === ry) { pxRow(x, cx - hw, y, hw * 2 + 1, ramp[1]); px(x, cx + hw, y, ramp[0]); px(x, cx - hw, y, ramp[0]); }
      // spot pattern: sparse hand-placed dots on the cap top (each dot written out)
      for (const [dx, dy, ci] of spots) if (dy === r) { const X = cx + dx; if (X > cx - hw && X < cx + hw) px(x, X, y, ramp[ci]); }
    }
  };
  // stem: two-tone vertical column with a shaded left edge and a lit right edge; base flare drawn last
  const drawStem = (x, cx, top, bot, w, ramp) => {
    for (let y = top; y <= bot; y++) {
      const flare = y > bot - 3 ? Math.min(2, bot - y === 0 ? 2 : 1) : 0;
      const hw = (w >> 1) + flare;
      pxRow(x, cx - hw, y, hw * 2 + 1, ramp[2]);          // core
      px(x, cx - hw, y, ramp[0]);                          // dark left arris
      px(x, cx + hw, y, ramp[1]);                          // right umbra
      px(x, cx - hw + 1, y, ramp[3]);                      // lit spine
      if ((y - top) % 4 === 2) px(x, cx + hw - 1, y, ramp[0]); // scar / band
    }
    // ring under the cap (a raised skirt), one pixel row
    pxRow(x, cx - (w >> 1) - 1, top - 1, w + 3, ramp[1]);
    px(x, cx - (w >> 1) - 1, top - 1, ramp[0]); px(x, cx + (w >> 1) + 1, top - 1, ramp[0]);
    px(x, cx - (w >> 1), top - 1, ramp[3]);
  };
  // gill glow under a cap: a bright teal/amber strip painted along the underside, one row of dashes.
  // Rendered in the sprite so the cap reads as an emitter even before the night-glow additive stamp lands.
  const drawGills = (x, cx, y, hw, ramp) => {
    for (let i = -hw + 1; i <= hw - 1; i++) {
      const gx = cx + i;
      // hand-listed gill pattern: bright pixel every 2 across, darker filler between
      const bright = ((i + hw) & 1) === 0;
      px(x, gx, y,     bright ? ramp[5] : ramp[3]);
      // a second row: only under the middle 60% of the cap, softer
      if (Math.abs(i) < hw * 0.65) px(x, gx, y + 1, bright ? ramp[4] : ramp[2]);
    }
    // corners tuck in
    px(x, cx - hw,     y, ramp[1]);
    px(x, cx + hw,     y, ramp[1]);
  };
  // additive radial-gradient-style stamp: a stack of concentric hollow rings drawn with fillRect,
  // alpha decays with the square of the radius. Used at night by the caller with globalCompositeOperation='lighter'.
  const bakeGlow = (radius, rgb) => {
    const S = radius * 2 + 1, c = mkCanvas(S, S), x = c.getContext('2d');
    // draw largest first (dimmest), then smaller brighter — a soft falloff, still all fillRects.
    for (let r = radius; r >= 1; r--) {
      const k = 1 - r / radius, a = Math.round(k * k * 90);
      x.fillStyle = 'rgba(' + rgb + ',' + (a / 255).toFixed(3) + ')';
      // hand-listed disc: for each row inside r, one fillRect strip
      for (let dy = -r; dy <= r; dy++) {
        const hw = Math.floor(Math.sqrt(r * r - dy * dy));
        if (hw < 1) continue;
        x.fillRect(radius - hw, radius + dy, hw * 2 + 1, 1);
      }
    }
    // a hot core pixel
    x.fillStyle = 'rgba(' + rgb + ',0.85)';
    x.fillRect(radius - 1, radius - 1, 3, 3);
    return c;
  };
  // -------------------------------------------------------------------
  // MUSHROOM CLUSTER: 4 caps in a family, tallest on the left, squattest on the right.
  // f3 shows caps rising off a mossy floor in a tight family; f5 shows the same layout at a larger scale
  // and adds a glowing rim of embers along the cap edge. Both are used here: the cap-family layout comes from f3,
  // the emissive rim from f5. Every cap is written out separately, cap-by-cap, rib-by-rib.
  const bakeShroom = (ramp) => {
    const W2 = 44, H2 = 52, c = mkCanvas(W2, H2), x = c.getContext('2d');
    // ground contact scuff (a wedge of moss / duff) — hand-listed row by row
    for (let r = 0; r < 3; r++) {
      const y = H2 - 1 - r;
      pxRow(x, 4 + r, y, W2 - 8 - r * 2, TR_MOSS[1]);
      // scattered brighter pixels — each written out
      px(x, 8, y, TR_MOSS[2]); px(x, 14, y, TR_MOSS[3]); px(x, 22, y, TR_MOSS[2]);
      px(x, 28, y, TR_MOSS[3]); px(x, 34, y, TR_MOSS[2]);
      if (r === 0) { px(x, 10, y, TR_MOSS[4]); px(x, 26, y, TR_MOSS[4]); px(x, 33, y, TR_MOSS[4]); }
    }
    // Cap 1: the tall one on the left. Stem + cap + gill row.
    drawStem(x, 12, 22, H2 - 4, 3, ramp);
    // spot pattern for this cap: [dx, row, ramp-index]
    capRow(x, 12, 21, 6, ramp, [[-3, 3, 5], [1, 4, 5], [4, 5, 5], [-1, 6, 5]]);
    drawGills(x, 12, 22, 7, ramp);
    // Cap 2: mid-height, tucked behind cap 1 slightly.
    drawStem(x, 22, 26, H2 - 4, 3, ramp);
    capRow(x, 22, 25, 5, ramp, [[-2, 2, 5], [2, 3, 5], [-3, 4, 5], [3, 5, 5]]);
    drawGills(x, 22, 26, 6, ramp);
    // Cap 3: shortest, right of centre, a squat button.
    drawStem(x, 31, 34, H2 - 4, 3, ramp);
    capRow(x, 31, 33, 4, ramp, [[-1, 2, 5], [1, 3, 5], [2, 4, 5]]);
    drawGills(x, 31, 34, 5, ramp);
    // Cap 4: the tiny scout, foreground-right — one row of cap, one row of stem, hand-listed pixel by pixel
    px(x, 38, H2 - 6, ramp[2]); px(x, 38, H2 - 5, ramp[2]); px(x, 38, H2 - 4, ramp[2]);   // stem
    px(x, 37, H2 - 5, ramp[1]); px(x, 39, H2 - 5, ramp[1]);                                // stem side
    pxRow(x, 36, H2 - 8, 5, ramp[3]); pxRow(x, 36, H2 - 7, 5, ramp[4]);                    // dome
    px(x, 37, H2 - 8, ramp[5]); px(x, 38, H2 - 8, ramp[5]);                                 // gleam
    px(x, 36, H2 - 6, ramp[5]); px(x, 40, H2 - 6, ramp[5]);                                 // gill dots
    // a couple of drifting spore-motes above the family (hand-listed dots)
    px(x, 15, 6,  ramp[4]); px(x, 26, 4,  ramp[5]); px(x, 34, 10, ramp[4]);
    px(x, 19, 12, ramp[5]); px(x, 30, 14, ramp[4]);
    // baked-in soft emissive rim on caps 1 & 2 (a two-pixel arc, additive by luminance choice, not by compositing)
    for (const [cx, cy, hw] of [[12, 15, 7], [22, 20, 6]]) {
      px(x, cx - hw + 1, cy, ramp[5]); px(x, cx + hw - 1, cy, ramp[5]);
      px(x, cx - hw + 2, cy - 1, ramp[5]);
    }
    c._autoHR = 'spr';
    return { c, w: W2, h: H2, ox: W2 >> 1, oy: H2 - 2 };
  };
  const bakeShroomTeal  = () => bakeShroom(SH_TEAL);
  const bakeShroomAmber = () => bakeShroom(SH_AMBER);
  // -------------------------------------------------------------------
  // TRUNK RELIC: a bark-covered stump with a small skull and half a ribcage grown into it, moss round the base.
  // Reference f3 gives the log posture and moss halo; the "relic" detail is our world-bible's subtle horror.
  const bakeTrunkRelic = () => {
    const W2 = 46, H2 = 54, c = mkCanvas(W2, H2), x = c.getContext('2d');
    const cx = W2 >> 1, top = 10, bot = H2 - 4;
    // trunk: a bark cylinder, each vertical stripe written by hand for its own knot texture
    for (let i = -14; i <= 14; i++) {
      const X = cx + i, t = Math.abs(i) / 14;
      // main body colour picked from ramp by radial position, so the trunk reads round
      const idx = t < 0.15 ? 4 : t < 0.45 ? 3 : t < 0.75 ? 2 : 1;
      for (let y = top; y <= bot; y++) {
        // hand-listed vertical bark grain: every 5th row a darker seam, every 7th a lit lip
        let c1 = TR_BARK[idx];
        if (((y + i * 3) % 5) === 0) c1 = TR_BARK[Math.max(0, idx - 1)];
        else if (((y + i) % 7) === 3 && idx >= 2) c1 = TR_BARK[Math.min(5, idx + 1)];
        px(x, X, y, c1);
      }
      // stump edge (top rim): brighter cambium band
      px(x, X, top, TR_BARK[Math.min(5, idx + 1)]);
      px(x, X, top + 1, TR_BARK[Math.min(5, idx + 1)]);
    }
    // stump top (an ellipse cap, cut wood, concentric rings — one ring per row, hand-listed)
    for (let r = 0; r < 5; r++) {
      const y = top - r, hw = Math.round(14 - r * 2.8);
      pxRow(x, cx - hw, y, hw * 2 + 1, TR_BARK[3]);
      // three growth rings, brightest in the middle
      if (r === 1) { px(x, cx - 4, y, TR_BARK[4]); px(x, cx + 4, y, TR_BARK[4]); }
      if (r === 2) { px(x, cx - 2, y, TR_BARK[5]); px(x, cx + 2, y, TR_BARK[5]); }
      if (r === 3) px(x, cx, y, TR_BARK[5]);
      // dark ring seam
      px(x, cx - hw, y, TR_BARK[1]); px(x, cx + hw, y, TR_BARK[1]);
    }
    // knot hole on the trunk face — a small oval hollow
    for (let dy = 0; dy < 3; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + dy < 3) px(x, cx + 6 + dx, top + 14 + dy, TR_BARK[0]);
    }
    px(x, cx + 5, top + 14, TR_BARK[1]);
    // skull half-grown into the trunk (upper-left of the face), cranium above, jaw fused into bark
    const sx = cx - 5, sy = top + 16;
    // cranium: 5x4 dome, hand-listed
    pxRow(x, sx - 2, sy,     5, _BONE[2]);
    pxRow(x, sx - 3, sy + 1, 7, _BONE[2]);
    pxRow(x, sx - 3, sy + 2, 7, _BONE[2]);
    // shading on cranium
    px(x, sx - 3, sy + 1, _BONE[1]); px(x, sx + 3, sy + 1, _BONE[1]);
    px(x, sx - 3, sy + 2, _BONE[1]); px(x, sx + 3, sy + 2, _BONE[1]);
    px(x, sx - 1, sy,     _BONE[3]); px(x, sx,     sy,     _BONE[3]);   // top gleam
    // eye sockets: two dark pits
    px(x, sx - 2, sy + 2, _BONE[0]); px(x, sx + 1, sy + 2, _BONE[0]);
    // nasal cavity
    px(x, sx,     sy + 3, _BONE[0]);
    // teeth row, jaw partly sunk in bark: three teeth, then bark
    pxRow(x, sx - 2, sy + 3, 5, _BONE[1]);
    px(x, sx - 1, sy + 4, _BONE[2]); px(x, sx + 1, sy + 4, _BONE[2]);
    // ribs curving down-right into the trunk (three ribs, hand-listed one arch at a time)
    for (let i = 0; i < 3; i++) {
      const rx = cx + 2 + i * 3, ry = top + 22 + i * 4;
      // each rib: a small arch of 5 pixels
      px(x, rx,     ry,     _BONE[2]);
      px(x, rx + 1, ry - 1, _BONE[2]);
      px(x, rx + 2, ry - 1, _BONE[2]);
      px(x, rx + 3, ry,     _BONE[2]);
      px(x, rx + 4, ry + 1, _BONE[2]);
      // shading beneath
      px(x, rx + 1, ry,     _BONE[1]);
      px(x, rx + 2, ry,     _BONE[1]);
    }
    // moss halo: a ring of green pixels round the base, brighter on top-left, darker on right
    for (let i = -16; i <= 16; i++) {
      const X = cx + i, absr = Math.abs(i);
      // top of moss ring
      const yTop = bot - 2 + ((absr * 2) % 3 === 0 ? 0 : 1);
      const tone = i < 0 ? TR_MOSS[3] : TR_MOSS[2];
      if (absr < 15) px(x, X, yTop, tone);
      if (absr < 12 && (i & 1)) px(x, X, yTop - 1, TR_MOSS[4]);
      // ground row
      px(x, X, bot, TR_MOSS[1]);
    }
    // small tuft on the stump's crown, hand-listed
    px(x, cx - 8, top - 4, TR_MOSS[3]); px(x, cx - 7, top - 5, TR_MOSS[4]);
    px(x, cx + 6, top - 3, TR_MOSS[3]); px(x, cx + 7, top - 4, TR_MOSS[2]);
    // a lonely luminous cap growing out of the stump's rim — one cap, teal, tying the props together
    px(x, cx + 10, top - 2, SH_TEAL[2]);
    px(x, cx + 9,  top - 3, SH_TEAL[3]); px(x, cx + 10, top - 3, SH_TEAL[4]); px(x, cx + 11, top - 3, SH_TEAL[3]);
    px(x, cx + 10, top - 4, SH_TEAL[5]);
    c._autoHR = 'spr';
    return { c, w: W2, h: H2, ox: W2 >> 1, oy: H2 - 2 };
  };
  // -------------------------------------------------------------------
  // RUIN PILLAR: a broken stone pillar, base wider than shaft, ragged break at the top,
  // lichen crawling up the leeward side, a small candle-niche cut into the front.
  // f4 (the ruin-well) is the reference for the stone tone and the vine drapery; the niche and candle
  // are ours. Every course of stone is a hand-listed strip.
  const bakeRuinPillar = () => {
    const W2 = 30, H2 = 66, c = mkCanvas(W2, H2), x = c.getContext('2d');
    const cx = W2 >> 1;
    // BASE (wide plinth, 3 courses)
    const baseTop = H2 - 12;
    for (let y = baseTop; y < H2 - 2; y++) {
      const hw = 12 - Math.floor((y - baseTop) / 4);
      pxRow(x, cx - hw, y, hw * 2 + 1, RN_STONE[3]);
      // bevel lit top edge on each course
      if ((y - baseTop) % 4 === 0) pxRow(x, cx - hw, y, hw * 2 + 1, RN_STONE[5]);
      // dark mortar between courses
      if ((y - baseTop) % 4 === 3) pxRow(x, cx - hw, y, hw * 2 + 1, RN_STONE[1]);
      // right-side umbra
      px(x, cx + hw,     y, RN_STONE[2]);
      px(x, cx + hw - 1, y, RN_STONE[3]);
      // left arris highlight
      px(x, cx - hw,     y, RN_STONE[5]);
    }
    // ground shadow
    pxRow(x, cx - 12, H2 - 2, 25, RN_STONE[0]);
    pxRow(x, cx - 14, H2 - 1, 29, RN_STONE[0]);
    // SHAFT (five drums, each 8px tall, rag-cut across the top)
    const shaftBot = baseTop - 1, shaftTop = 14;
    for (let y = shaftTop; y <= shaftBot; y++) {
      const hw = 6;
      // core body
      pxRow(x, cx - hw, y, hw * 2 + 1, RN_STONE[4]);
      // lit left edge
      px(x, cx - hw,     y, RN_STONE[6]);
      px(x, cx - hw + 1, y, RN_STONE[5]);
      // right umbra
      px(x, cx + hw,     y, RN_STONE[2]);
      px(x, cx + hw - 1, y, RN_STONE[3]);
      // drum seams every 8 rows: a dark mortar and a lit lip above
      if (((y - shaftTop) % 8) === 0 && y !== shaftTop) {
        pxRow(x, cx - hw, y, hw * 2 + 1, RN_STONE[1]);
        pxRow(x, cx - hw, y - 1, hw * 2 + 1, RN_STONE[6]);
        px(x, cx - hw, y - 1, RN_STONE[3]);
        px(x, cx + hw, y - 1, RN_STONE[2]);
      }
      // fine weathering: a chip every 11 rows on the right side
      if (((y * 3 + 7) % 11) === 0) px(x, cx + hw - 1, y, RN_STONE[1]);
      if (((y * 5 + 3) % 13) === 0) px(x, cx - hw + 2, y, RN_STONE[2]);
    }
    // BROKEN TOP: a ragged cap of exposed stone, hand-listed pixel by pixel
    // silhouette of the fracture, then interior of exposed core
    const brk = [
      [-6,-1],[-6,-2],[-5,-3],[-4,-3],[-3,-4],[-2,-4],[-1,-3],
      [0,-4],[1,-5],[2,-4],[3,-3],[4,-4],[5,-3],[6,-2]
    ];
    // fill the fracture triangle with darker stone
    for (const [dx, dy] of brk) {
      const X = cx + dx, Y = shaftTop + dy;
      pxRow(x, X, Y, 1, RN_STONE[2]);
      // exposed inner stone below the crown
      for (let yy = Y + 1; yy < shaftTop; yy++) px(x, X, yy, RN_STONE[3]);
      // a bright crown lip at the very edge
      px(x, X, Y, RN_STONE[5]);
    }
    // rubble chips fallen at the pillar's foot — three small chunks
    px(x, cx - 14, H2 - 4, RN_STONE[4]); px(x, cx - 13, H2 - 4, RN_STONE[5]); px(x, cx - 13, H2 - 3, RN_STONE[3]);
    px(x, cx + 12, H2 - 5, RN_STONE[4]); px(x, cx + 13, H2 - 4, RN_STONE[3]);
    px(x, cx + 11, H2 - 3, RN_STONE[2]);
    // CANDLE NICHE: a small rectangular hollow cut into the front (upper shaft), with a stubby candle inside
    const nx = cx - 2, ny = shaftTop + 12;
    // niche outline (dark interior)
    for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 5; dx++) px(x, nx + dx, ny + dy, RN_STONE[0]);
    // niche arris (lit sill and jamb)
    pxRow(x, nx, ny + 5, 5, RN_STONE[2]);
    pxRow(x, nx, ny, 5, RN_STONE[1]);
    px(x, nx, ny + 1, RN_STONE[3]); px(x, nx, ny + 2, RN_STONE[3]);
    // candle stub inside niche (3 pixels tall)
    px(x, nx + 2, ny + 2, _WAX[2]);
    px(x, nx + 2, ny + 3, _WAX[1]);
    px(x, nx + 2, ny + 4, _WAX[1]);
    px(x, nx + 1, ny + 4, _WAX[0]); px(x, nx + 3, ny + 4, _WAX[0]);
    // flame — a single hot pixel, a hint of amber above
    px(x, nx + 2, ny + 1, SH_AMBER[5]);
    px(x, nx + 2, ny,     SH_AMBER[4]);
    // LICHEN CRAWL: leeward-side patches (right side of shaft), a few small colonies
    const lichenPatches = [
      [cx + 3, shaftTop + 4, 2], [cx + 4, shaftTop + 9, 3],
      [cx - 5, shaftTop + 22, 3], [cx + 4, shaftTop + 28, 2],
      [cx - 6, shaftTop + 34, 2], [cx + 5, shaftTop + 40, 2],
      [cx - 4, baseTop - 2, 3]
    ];
    for (const [lx, ly, s] of lichenPatches) {
      // each colony: a hand-listed cluster of 5-7 pixels in a rosette
      px(x, lx, ly, RN_LICHEN[1]);
      px(x, lx + 1, ly, RN_LICHEN[2]);
      px(x, lx, ly + 1, RN_LICHEN[2]);
      px(x, lx - 1, ly + 1, RN_LICHEN[1]);
      if (s > 2) {
        px(x, lx + 1, ly + 1, RN_LICHEN[3]);
        px(x, lx + 2, ly, RN_LICHEN[1]);
        px(x, lx, ly - 1, RN_LICHEN[0]);
      }
    }
    // a moss trail dripping from the crown down the left face (hand-listed drip)
    for (let i = 0; i < 8; i++) {
      px(x, cx - 5, shaftTop + 2 + i * 2, TR_MOSS[2]);
      if (i % 2) px(x, cx - 4, shaftTop + 3 + i * 2, TR_MOSS[3]);
    }
    c._autoHR = 'spr';
    return { c, w: W2, h: H2, ox: W2 >> 1, oy: H2 - 2 };
  };
  // -------------------------------------------------------------------
  // REGISTRY: expose bake results in a shared cache and hook ztPropFrame so the world generator
  // (running in parallel in Cartographer Mora's agent) can spawn these kinds by name.
  const WORLD_PROP_BAKERS = {
    luminous_shroom_teal:  bakeShroomTeal,
    luminous_shroom_amber: bakeShroomAmber,
    trunk_relic:           bakeTrunkRelic,
    ruin_pillar:           bakeRuinPillar,
  };
  const WORLD_PROP_CACHE = {};
  const worldPropFrame = (kind, v) => {
    const key = kind + '|' + (v | 0);
    if (WORLD_PROP_CACHE[key]) return WORLD_PROP_CACHE[key];
    const fr = WORLD_PROP_BAKERS[kind](v | 0);
    WORLD_PROP_CACHE[key] = fr; return fr;
  };
  // wrap ztPropFrame so unknown-to-it kinds fall through to our bakers
  if (typeof ztPropFrame === 'function') {
    const _ztPropFrame = ztPropFrame;
    ztPropFrame = function (kind, v) {
      if (WORLD_PROP_BAKERS[kind]) return worldPropFrame(kind, v);
      return _ztPropFrame(kind, v);
    };
  }
  // Night glow: a soft radial-gradient-style stamp, one per luminous kind. The stamp is a canvas of
  // concentric hollow-disc fillRects with squared-falloff alpha, drawn additively at draw-time.
  const GLOW_TEAL  = bakeGlow(28, '110,240,220');
  const GLOW_AMBER = bakeGlow(28, '255,170,90');
  const GLOW_CANDLE = bakeGlow(10, '255,190,110');
  // hook drawProp: after the base sprite is drawn, our luminous kinds add an additive glow whose intensity
  // rises with the world's darkness (dayK). The candle in the ruin pillar always glows softly.
  if (typeof drawProp === 'function') {
    const _drawProp = drawProp;
    drawProp = function (o) {
      _drawProp(o);
      if (!WORLD_PROP_BAKERS[o.kind]) return;
      const p = iso(o.x, o.y), sx = Math.round(p.sx), sy = Math.round(p.sy);
      // night amount: 1 at deep night, 0 at midday. Fall back to 0.5 if the day/night hook is missing.
      let dk = 0.5;
      try { const z = G.zone; if (z && (typeof isOutdoor !== 'function' || isOutdoor(z))) dk = (typeof dayK === 'function') ? (1 - dayK()) : 0.5; }
      catch (e) { dk = 0.5; }
      ctx.globalCompositeOperation = 'lighter';
      if (o.kind === 'luminous_shroom_teal') {
        const t = G.time, pulse = 0.65 + 0.35 * Math.sin(t * 1.7 + o.x * 3.1);
        ctx.globalAlpha = (0.18 + 0.55 * dk) * pulse;
        ctx.drawImage(GLOW_TEAL, sx - 28, sy - 26);
      } else if (o.kind === 'luminous_shroom_amber') {
        const t = G.time, pulse = 0.7 + 0.3 * Math.sin(t * 1.3 + o.x * 2.1 + 1.2);
        ctx.globalAlpha = (0.2 + 0.6 * dk) * pulse;
        ctx.drawImage(GLOW_AMBER, sx - 28, sy - 26);
      } else if (o.kind === 'ruin_pillar') {
        // small warm candle glow at the niche
        const t = G.time, fl = 0.6 + 0.4 * Math.sin(t * 9 + o.x);
        ctx.globalAlpha = (0.35 + 0.25 * dk) * fl;
        ctx.drawImage(GLOW_CANDLE, sx - 10, sy - 38);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
  }
  // Expose for other agents (world-gen, judges, screenshot harness)
  try {
    window.__ZZ_WORLD_PROPS = {
      palettes: { SH_TEAL, SH_AMBER, TR_BARK, TR_MOSS, RN_STONE, RN_LICHEN },
      bakers:   WORLD_PROP_BAKERS,
      frame:    worldPropFrame,
      glow:     { teal: GLOW_TEAL, amber: GLOW_AMBER, candle: GLOW_CANDLE },
    };
  } catch (e) { }
}
