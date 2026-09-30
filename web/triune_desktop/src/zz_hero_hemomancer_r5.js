// =================================================================== r5 Hemomancer sprite — HAND-DRAWN, iter 2 (bigger)
// Every frame is built rect-by-rect on a fresh 100x180 canvas. No overlays, no baked atlas, no procedural silhouette.
// Reference: /refs/hemo_mj2/ (front-facing PNGs). Palette source: zp_title.js (TT_STONE, TT_WAX, TT_IRON, TT_BLD).
// Character: tall wiry-muscular Black African man ~40. Deep dark brown skin. Long matted dread CURTAIN framing face
// and falling past shoulders to mid-chest, iron rings + red thorns every ~10 px. Bare chest w/ vertical blood streaks.
// Twisted rope belt. Bone-cream torn skirt from waist to bare feet, top-lit fading to shadow at hem. Wrist wraps.
// Iter 2 fixes: grew sprite 140->180; dread mass as filled blob with cut seams (not gapped columns); face features
// distinct; pectorals arced with per-row width; robe folds vary tonally along length; wraps layered with thorn stubs.
{
  if (typeof heroFrame === 'function') {

    // ---------- palette (drawn from zp_title.js ramps) ------------------------------------------------
    // Skin — deep dark brown, NO peach/tan/pink
    const SK_XS = '#0a0605', SK_SH = '#1a0f0a', SK_DK = '#3c2418', SK_MD = '#5c3a24', SK_HI = '#8a5a3c';
    // Robe — from TT_STONE + TT_WAX ramps (weathered off-white / bone), varied top→bottom
    const RB_XS = '#140f0b', RB_SH = '#231d1d', RB_DK = '#3c3027', RB_MD = '#6e5c42', RB_HI = '#948060', RB_HH = '#bca47a', RB_XH = '#dcc79a';
    // Dreadlocks — matted near-black, warm undertone
    const DR_XS = '#030204', DR_SH = '#070506', DR_DK = '#151010', DR_MD = '#26190f', DR_HI = '#3c2a1a';
    // Iron rings (TT_IRON)
    const IR_SH = '#0b0b0d', IR_DK = '#222226', IR_MD = '#34333a', IR_HI = '#4e4b52';
    // Blood accents (TT_BLD)
    const BL_XS = '#120205', BL_DK = '#2e060c', BL_MD = '#5e1016', BL_HI = '#84181c', BL_HH = '#b83026', BL_XH = '#e8704e';

    const HW = 100, HH = 180, AX = 50, AY = 178;
    const S = 3; // canvas px per world px on desktop (matches r3/r4 constant)

    // -------- helper: fresh canvas per frame -----------------------------------------------------------
    function newFrame() {
      const c = mkCanvas(HW, HH), x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      return { c, x };
    }

    // -------- bakeIdleFront(f): every frame drawn on its own, hand-listed fillRect calls --------------
    function bakeIdleFront(f) {
      const { c, x } = newFrame();
      const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };

      // Frame-varying micro-motion: chest lifts 2-3 px on breath, head bobs 1 px, dread tips drift 1 px
      const bY  = [0, -1, -2, -2, -1, 0][f];    // upper-body (chest/shoulders/head/dreads) y offset
      const hY  = [0,  0, -1, -1,  0, 0][f];    // extra head bob
      const dSway = [-1, -1, 0, 1, 1, 0][f];    // dread tip x drift outward

      // ============================================================================================
      // FEET — planted, drawn first so robe hem overlaps ankles later. Bare, wide toes visible.
      // ============================================================================================
      // LEFT foot (viewer's left)
      P(35, 172, 12, 6, SK_XS);              // outer silhouette
      P(36, 171, 10, 5, SK_SH);
      P(37, 171, 8, 3, SK_DK);
      P(38, 172, 6, 2, SK_MD);               // top highlight
      P(39, 172, 3, 1, SK_HI);
      // toe separations (dark lines)
      P(37, 176, 1, 2, DR_SH); P(39, 176, 1, 2, DR_SH); P(41, 176, 1, 2, DR_SH); P(43, 176, 1, 2, DR_SH); P(45, 176, 1, 2, DR_SH);
      // ankle stub
      P(38, 164, 6, 8, SK_SH);
      P(39, 164, 4, 7, SK_DK);
      P(39, 164, 2, 5, SK_MD);
      P(39, 165, 1, 3, SK_HI);

      // RIGHT foot
      P(53, 172, 12, 6, SK_XS);
      P(54, 171, 10, 5, SK_SH);
      P(55, 171, 8, 3, SK_DK);
      P(57, 172, 6, 2, SK_MD);
      P(58, 172, 3, 1, SK_HI);
      P(55, 176, 1, 2, DR_SH); P(57, 176, 1, 2, DR_SH); P(59, 176, 1, 2, DR_SH); P(61, 176, 1, 2, DR_SH); P(63, 176, 1, 2, DR_SH);
      P(56, 164, 6, 8, SK_SH);
      P(57, 164, 4, 7, SK_DK);
      P(59, 164, 2, 5, SK_MD);
      P(60, 165, 1, 3, SK_HI);

      // ============================================================================================
      // ROBE SKIRT — waist (y=100) to just above feet (y=170), flared, tattered hem
      // Fold shading VARIES top→bottom: top-lit (RB_HH/RB_XH), mid (RB_HI/RB_MD), bottom-shadow (RB_DK/RB_SH)
      // ============================================================================================
      // silhouette rows [y, xL, xR]  (flare from 32→70 wide as it drops)
      const skirtRows = [];
      for (let i = 0; i < 70; i++) {
        const y = 100 + i;
        const flare = Math.floor(i * 0.28);            // 0 at waist → 19 at hem
        skirtRows.push([y, 34 - flare, 66 + flare]);
      }
      // base silhouette (deep shadow outline)
      for (const r of skirtRows) P(r[1], r[0], r[2] - r[1] + 1, 1, RB_XS);
      // inner dark fill
      for (const r of skirtRows) if (r[2] - r[1] > 3) P(r[1] + 1, r[0], r[2] - r[1] - 1, 1, RB_SH);

      // vertical fold columns — each column's tone shifts along the length so the drape reads 3D:
      // top rows brighter, mid-length medium, bottom shadowed. Not one flat tone per column.
      // Column definition: [xOffsetFromWaistCenter, brightBias]
      // brightBias: -1 shadow column, 0 mid, +1 highlight column, +2 top-lit spine
      const foldCols = [
        [-18, -1], [-14, -1], [-10, 0], [-7, 0], [-4, +1], [-2, +2], [0, +2], [2, +2], [4, +1], [7, 0], [10, 0], [14, -1], [18, -1]
      ];
      const skirtCX = 50;
      for (const [dx, bias] of foldCols) {
        for (const r of skirtRows) {
          const cx = skirtCX + dx;
          if (cx < r[1] + 1 || cx > r[2] - 1) continue;
          // t goes 0 at top → 1 at hem
          const t = (r[0] - 100) / 70;
          // choose ramp step based on bias and t
          // ramp: XS, SH, DK, MD, HI, HH, XH  (7 tones)
          let step;
          if (bias === +2)      step = t < 0.25 ? 6 : t < 0.55 ? 5 : t < 0.80 ? 4 : 3;
          else if (bias === +1) step = t < 0.25 ? 5 : t < 0.55 ? 4 : t < 0.80 ? 3 : 2;
          else if (bias === 0)  step = t < 0.30 ? 4 : t < 0.65 ? 3 : 2;
          else                  step = t < 0.30 ? 3 : t < 0.65 ? 2 : 1;
          const ramp = [RB_XS, RB_SH, RB_DK, RB_MD, RB_HI, RB_HH, RB_XH];
          P(cx, r[0], 1, 1, ramp[step]);
        }
      }
      // extra sash-lit spine down the front (bright center column above the belt drop)
      for (let y = 108; y <= 150; y++) { P(49, y, 1, 1, RB_HI); P(50, y, 1, 1, RB_HH); P(51, y, 1, 1, RB_HI); }
      // fade the spine to shadow toward hem
      for (let y = 150; y <= 168; y++) { P(50, y, 1, 1, RB_MD); }

      // tattered hem — vertical drips of varying length hanging below the last silhouette row
      const hemY = 170;
      for (let dx = 0; dx < 42; dx += 2) {
        const cx = 29 + dx;
        const len = 1 + ((dx * 7 + 3) % 5);       // 1..5 px drip
        P(cx, hemY, 1, len, RB_SH);
        if (len >= 3) P(cx, hemY + len - 1, 1, 1, RB_XS);
      }
      // a few darker crease shadows to read as deep folds
      P(33, 118, 1, 40, RB_XS);
      P(39, 128, 1, 34, RB_XS);
      P(45, 132, 1, 30, RB_SH);
      P(55, 132, 1, 30, RB_SH);
      P(61, 128, 1, 34, RB_XS);
      P(67, 118, 1, 40, RB_XS);
      // vertical blood streaks running down front of robe (fresh drip)
      P(48, 104, 1, 22, BL_DK); P(48, 104, 1, 12, BL_MD); P(48, 104, 1, 6, BL_HI);
      P(41, 110, 1, 30, BL_DK); P(41, 110, 1, 14, BL_MD); P(41, 110, 1, 6, BL_HI);
      P(53, 112, 1, 28, BL_DK); P(53, 112, 1, 12, BL_MD); P(53, 112, 1, 5, BL_HI);
      // dried old blood splatter at hem
      P(44, 158, 3, 2, BL_DK); P(45, 158, 1, 1, BL_MD);
      P(56, 162, 2, 2, BL_DK); P(56, 162, 1, 1, BL_MD);

      // ============================================================================================
      // WAIST ROPE BELT — thick wrapped rope, twisted bands, central knot, hanging cord & bead
      // ============================================================================================
      const beltY = 96 + bY;
      // upper wrap band
      P(33, beltY,     34, 3, RB_XS);
      P(34, beltY + 1, 32, 1, RB_SH);
      P(34, beltY + 1, 32, 1, RB_DK);
      // twist highlights on upper band
      for (let i = 34; i < 66; i += 3) P(i, beltY, 1, 1, RB_MD);
      for (let i = 35; i < 66; i += 3) P(i, beltY + 2, 1, 1, RB_MD);
      // lower wrap band
      P(31, beltY + 4, 38, 4, RB_XS);
      P(32, beltY + 5, 36, 2, RB_SH);
      P(32, beltY + 6, 36, 1, RB_DK);
      for (let i = 32; i < 68; i += 3) P(i, beltY + 5, 1, 1, RB_HI);
      for (let i = 34; i < 68; i += 3) P(i, beltY + 7, 1, 1, RB_MD);
      // central knot
      P(44, beltY - 2, 12, 12, RB_XS);
      P(45, beltY - 1, 10, 10, RB_SH);
      P(46, beltY,     8,  8, RB_DK);
      P(46, beltY + 1, 8,  2, RB_MD);
      P(47, beltY + 3, 6,  3, RB_HI);
      P(48, beltY + 3, 4,  2, RB_HH);
      P(46, beltY + 6, 8,  1, RB_DK);
      // hanging cord tail
      P(49, beltY + 10, 2, 18, RB_XS);
      P(49, beltY + 10, 1, 18, RB_DK);
      P(50, beltY + 10, 1, 16, RB_MD);
      // blood bead at tail
      P(48, beltY + 26, 4, 3, BL_XS);
      P(49, beltY + 26, 2, 3, BL_HI);
      P(50, beltY + 27, 1, 1, BL_XH);

      // ============================================================================================
      // TORSO — bare chest, muscular but wiry, deep-brown skin, top-shaded by dread curtain
      // Silhouette rows: shoulders (54) → waist (95)
      // ============================================================================================
      const torsoRows = [
        // y, xL, xR
        [54, 33, 67], [55, 32, 68], [56, 31, 69], [57, 31, 69], [58, 30, 70],
        [59, 30, 70], [60, 30, 70], [61, 30, 70], [62, 30, 70], [63, 30, 70],
        [64, 30, 70], [65, 30, 70], [66, 31, 69], [67, 31, 69], [68, 31, 69],
        [69, 31, 69], [70, 31, 69], [71, 32, 68], [72, 32, 68], [73, 32, 68],
        [74, 32, 68], [75, 33, 67], [76, 33, 67], [77, 33, 67], [78, 34, 66],
        [79, 34, 66], [80, 34, 66], [81, 34, 66], [82, 35, 65], [83, 35, 65],
        [84, 35, 65], [85, 35, 65], [86, 35, 65], [87, 35, 65], [88, 35, 65],
        [89, 35, 65], [90, 35, 65], [91, 35, 65], [92, 35, 65], [93, 35, 65],
        [94, 35, 65], [95, 35, 65]
      ];
      // deepest shadow silhouette
      for (const r of torsoRows) P(r[1], r[0] + bY, r[2] - r[1] + 1, 1, SK_XS);
      // main dark fill inset 1 px
      for (const r of torsoRows) if (r[2] - r[1] > 2) P(r[1] + 1, r[0] + bY, r[2] - r[1] - 1, 1, SK_SH);
      // mid tone fill inset 2 px
      for (const r of torsoRows) if (r[2] - r[1] > 4) P(r[1] + 2, r[0] + bY, r[2] - r[1] - 3, 1, SK_DK);

      // pectorals — ARCED shapes with per-row width (rounded not straight column)
      // left pec (viewer left): rows 58-70. width varies per row: 4,5,6,6,7,7,7,6,6,5,4,3,2
      const pecL = [ [58,4], [59,5], [60,6], [61,7], [62,7], [63,7], [64,7], [65,7], [66,6], [67,5], [68,4], [69,3], [70,2] ];
      for (const [py, w] of pecL) P(36, py + bY, w, 1, SK_MD);
      // highlight upper curve of left pec
      P(37, 59 + bY, 4, 1, SK_HI); P(37, 60 + bY, 5, 1, SK_HI); P(38, 61 + bY, 4, 1, SK_HI);
      // right pec (mirror)
      const pecR = [ [58,4], [59,5], [60,6], [61,7], [62,7], [63,7], [64,7], [65,7], [66,6], [67,5], [68,4], [69,3], [70,2] ];
      for (const [py, w] of pecR) P(64 - w + 1, py + bY, w, 1, SK_MD);
      P(59, 59 + bY, 4, 1, SK_HI); P(58, 60 + bY, 5, 1, SK_HI); P(58, 61 + bY, 4, 1, SK_HI);
      // sternum split (deep vertical channel)
      for (let yy = 58 + bY; yy <= 74 + bY; yy++) { P(49, yy, 1, 1, SK_XS); P(50, yy, 1, 1, SK_XS); P(51, yy, 1, 1, SK_XS); }
      // abdominal ridge — center highlight column w/ side shadows
      for (let yy = 72 + bY; yy <= 92 + bY; yy++) {
        P(49, yy, 1, 1, SK_SH); P(50, yy, 1, 1, SK_MD); P(51, yy, 1, 1, SK_SH);
      }
      // ab segmentation lines
      for (const yy of [76, 80, 84, 88]) P(46, yy + bY, 9, 1, SK_XS);
      // rib shadow bands under pecs
      P(38, 72 + bY, 6, 1, SK_XS);
      P(56, 72 + bY, 6, 1, SK_XS);
      // side ribcage shadows
      for (let yy = 66 + bY; yy <= 82 + bY; yy++) {
        P(31, yy, 2, 1, SK_XS);
        P(67, yy, 2, 1, SK_XS);
      }
      // shoulder highlights (top of deltoids)
      P(33, 54 + bY, 5, 1, SK_MD); P(34, 55 + bY, 4, 1, SK_HI);
      P(62, 54 + bY, 5, 1, SK_MD); P(62, 55 + bY, 4, 1, SK_HI);
      // deep shoulder shadow under the neck/dread curtain
      P(38, 54 + bY, 24, 3, SK_XS);

      // NECK
      P(46, 50 + bY, 8, 5, SK_XS);
      P(47, 50 + bY, 6, 5, SK_SH);
      P(48, 51 + bY, 4, 4, SK_DK);
      P(48, 52 + bY, 4, 1, SK_MD);

      // BLOOD STREAKS running down chest — signature hemomancer bleed from throat & wound
      // main central streak (throat → belly)
      P(50, 52 + bY, 1, 40, BL_DK);
      P(50, 52 + bY, 1, 18, BL_MD);
      P(50, 52 + bY, 1, 6,  BL_HI);
      // secondary streaks
      P(43, 60 + bY, 1, 32, BL_DK); P(43, 60 + bY, 1, 14, BL_MD); P(43, 60 + bY, 1, 5, BL_HI);
      P(57, 62 + bY, 1, 30, BL_DK); P(57, 62 + bY, 1, 12, BL_MD); P(57, 62 + bY, 1, 5, BL_HI);
      P(46, 70 + bY, 1, 18, BL_DK); P(46, 70 + bY, 1,  8, BL_MD);
      P(54, 68 + bY, 1, 22, BL_DK); P(54, 68 + bY, 1, 10, BL_MD);
      // fresh wound splash near sternum
      P(48, 76 + bY, 5, 2, BL_XS);
      P(49, 76 + bY, 3, 1, BL_HH);
      P(50, 77 + bY, 1, 1, BL_XH);

      // ============================================================================================
      // ARMS — hanging at sides, wiry with delt/bicep/forearm shape
      // ============================================================================================
      // LEFT arm rows (shoulder → wrist)
      const leftArm = [
        [54, 27, 33], [55, 26, 33], [56, 25, 33], [57, 25, 33], [58, 24, 32],
        [59, 24, 32], [60, 24, 32], [61, 24, 31], [62, 24, 31], [63, 24, 31],
        [64, 24, 31], [65, 25, 31], [66, 25, 31], [67, 25, 31], [68, 25, 31],
        [69, 26, 32], [70, 26, 32], [71, 26, 32], [72, 26, 32], [73, 27, 33],
        [74, 27, 33], [75, 27, 33], [76, 27, 33], [77, 27, 33], [78, 28, 33],
        [79, 28, 33], [80, 28, 33], [81, 28, 33], [82, 29, 33], [83, 29, 33],
        [84, 29, 33], [85, 29, 33], [86, 29, 33], [87, 29, 33], [88, 29, 33]
      ];
      for (const r of leftArm) P(r[1], r[0] + bY, r[2] - r[1] + 1, 1, SK_XS);
      for (const r of leftArm) if (r[2] - r[1] > 1) P(r[1] + 1, r[0] + bY, r[2] - r[1] - 1, 1, SK_SH);
      for (const r of leftArm) if (r[2] - r[1] > 3) P(r[1] + 2, r[0] + bY, r[2] - r[1] - 3, 1, SK_DK);
      // deltoid + bicep highlights
      for (let yy = 55 + bY; yy <= 63 + bY; yy++) P(26, yy, 2, 1, SK_MD);
      P(26, 58 + bY, 1, 4, SK_HI);
      // forearm highlights
      for (let yy = 72 + bY; yy <= 86 + bY; yy++) P(28, yy, 1, 1, SK_MD);
      P(28, 76 + bY, 1, 5, SK_HI);

      // RIGHT arm — hand-arithmetic mirror
      const rightArm = leftArm.map(r => [r[0], HW - 1 - r[2], HW - 1 - r[1]]);
      for (const r of rightArm) P(r[1], r[0] + bY, r[2] - r[1] + 1, 1, SK_XS);
      for (const r of rightArm) if (r[2] - r[1] > 1) P(r[1] + 1, r[0] + bY, r[2] - r[1] - 1, 1, SK_SH);
      for (const r of rightArm) if (r[2] - r[1] > 3) P(r[1] + 2, r[0] + bY, r[2] - r[1] - 3, 1, SK_DK);
      for (let yy = 55 + bY; yy <= 63 + bY; yy++) P(72, yy, 2, 1, SK_MD);
      P(73, 58 + bY, 1, 4, SK_HI);
      for (let yy = 72 + bY; yy <= 86 + bY; yy++) P(71, yy, 1, 1, SK_MD);
      P(71, 76 + bY, 1, 5, SK_HI);

      // ============================================================================================
      // WRIST WRAPS — bulky layered bandages with individual wrap seams and thorn stubs, dried blood
      // ============================================================================================
      function wrap(cx, side) {
        // side = -1 for left, +1 for right
        const x0 = cx - 5, y0 = 88 + bY;
        // main bulky wrap silhouette
        P(x0,     y0,     10, 20, RB_XS);
        P(x0 + 1, y0 + 1,  8, 18, RB_SH);
        P(x0 + 1, y0 + 2,  8,  1, RB_DK);
        // individual wrap seam lines (crossings across the forearm)
        for (const [dy, tone] of [[3, RB_MD], [6, RB_MD], [9, RB_HI], [12, RB_MD], [15, RB_MD], [18, RB_DK]]) {
          P(x0 + 1, y0 + dy, 8, 1, tone);
        }
        // top-lit highlight along upper edge
        P(x0 + 2, y0 + 4, 6, 1, RB_HI);
        P(x0 + 2, y0 + 7, 5, 1, RB_HI);
        P(x0 + 2, y0 + 10, 4, 1, RB_HH);
        // thorn stubs poking OUT (side of the wrap)
        const tx = side < 0 ? x0 - 1 : x0 + 10;
        const tx2 = side < 0 ? x0 - 2 : x0 + 11;
        for (const dy of [3, 7, 10, 13, 17]) {
          P(tx, y0 + dy, 1, 1, DR_MD);
          P(tx2, y0 + dy, 1, 1, DR_SH);
          // thorn tip has a tiny blood dot
          P(tx2, y0 + dy, 1, 1, BL_DK);
        }
        // some barbs on the inner side too
        const ix = side < 0 ? x0 + 10 : x0 - 1;
        for (const dy of [5, 12, 16]) {
          P(ix, y0 + dy, 1, 1, DR_MD);
        }
        // dried blood staining
        P(x0 + 2, y0 + 14, 5, 4, BL_XS);
        P(x0 + 3, y0 + 15, 3, 2, BL_DK);
        P(x0 + 4, y0 + 15, 1, 1, BL_MD);
        // hand below wrap (loose fist, fingers curled)
        const hY = y0 + 20;
        P(x0 + 1, hY,     8, 6, SK_XS);
        P(x0 + 2, hY,     6, 5, SK_SH);
        P(x0 + 2, hY + 1, 6, 3, SK_DK);
        P(x0 + 3, hY + 1, 4, 2, SK_MD);
        P(x0 + 4, hY + 1, 2, 1, SK_HI);
        // knuckle line
        P(x0 + 2, hY + 3, 6, 1, SK_XS);
        // finger separations
        P(x0 + 3, hY + 4, 1, 2, SK_XS);
        P(x0 + 5, hY + 4, 1, 2, SK_XS);
        P(x0 + 7, hY + 4, 1, 2, SK_XS);
      }
      wrap(29, -1);
      wrap(70, +1);

      // ============================================================================================
      // HEAD — bigger silhouette (28 rows), distinct brow / broad nose / strong jaw / cheekbones
      // Head slightly bowed (top rows narrow, cheek plane wide, jaw angles inward without pointing)
      // ============================================================================================
      const headYbase = bY + hY;
      const headRows = [
        // y, xL, xR — 30 rows top→bottom
        [22, 42, 58],
        [23, 41, 59], [24, 40, 60], [25, 40, 60],
        [26, 39, 61], [27, 39, 61], [28, 39, 61], [29, 39, 61],
        [30, 39, 61], [31, 39, 61], [32, 39, 61], [33, 39, 61],
        [34, 39, 61], [35, 39, 61], [36, 39, 61],
        [37, 40, 60], [38, 40, 60], [39, 40, 60],
        [40, 41, 59], [41, 41, 59], [42, 42, 58],
        [43, 42, 58], [44, 43, 57], [45, 43, 57],
        [46, 44, 56], [47, 44, 56], [48, 45, 55], [49, 46, 54],
        [50, 46, 54]
      ];
      // outer shadow silhouette
      for (const r of headRows) P(r[1], r[0] + headYbase, r[2] - r[1] + 1, 1, SK_XS);
      // main dark fill
      for (const r of headRows) if (r[2] - r[1] > 1) P(r[1] + 1, r[0] + headYbase, r[2] - r[1] - 1, 1, SK_SH);
      // mid fill (broader planes)
      for (const r of headRows) if (r[2] - r[1] > 3) P(r[1] + 2, r[0] + headYbase, r[2] - r[1] - 3, 1, SK_DK);

      // BROW BAND — heavy, 2 rows dark, spanning eyes
      P(39, 30 + headYbase, 22, 1, SK_XS);
      P(39, 31 + headYbase, 22, 1, SK_XS);
      // brow ridges (small highlight tops of brows)
      P(41, 30 + headYbase, 4, 1, SK_DK);
      P(55, 30 + headYbase, 4, 1, SK_DK);

      // EYE SOCKETS — sunken shadow, warm ember 1-px glow
      P(41, 32 + headYbase, 5, 3, SK_XS);
      P(54, 32 + headYbase, 5, 3, SK_XS);
      // eye ember
      P(43, 33 + headYbase, 1, 1, BL_HH);
      P(56, 33 + headYbase, 1, 1, BL_HH);
      // faint eye whites suggestion (single warm pixel)
      P(44, 33 + headYbase, 1, 1, BL_XH);
      P(55, 33 + headYbase, 1, 1, BL_XH);
      // blood tears
      P(43, 35 + headYbase, 1, 6, BL_DK); P(43, 35 + headYbase, 1, 3, BL_MD);
      P(56, 35 + headYbase, 1, 6, BL_DK); P(56, 35 + headYbase, 1, 3, BL_MD);

      // NOSE — broad, 4-px bridge with tip highlight, nostril flare
      // bridge
      P(48, 32 + headYbase, 4, 8, SK_XS);
      P(49, 33 + headYbase, 2, 6, SK_SH);
      P(49, 34 + headYbase, 2, 3, SK_DK);
      // tip highlight
      P(49, 38 + headYbase, 2, 1, SK_MD);
      P(50, 39 + headYbase, 1, 1, SK_HI);
      // nostril darks + wide base
      P(47, 40 + headYbase, 6, 1, SK_XS);
      P(47, 40 + headYbase, 1, 1, SK_XS); P(52, 40 + headYbase, 1, 1, SK_XS);

      // CHEEKBONES — highlight running down side of nose to cheek plane
      P(40, 34 + headYbase, 1, 5, SK_MD);
      P(41, 35 + headYbase, 1, 3, SK_HI);
      P(59, 34 + headYbase, 1, 5, SK_MD);
      P(58, 35 + headYbase, 1, 3, SK_HI);
      // hollow shadow under cheekbones
      P(41, 39 + headYbase, 3, 3, SK_XS);
      P(56, 39 + headYbase, 3, 3, SK_XS);

      // JAW — strong, angles inward but doesn't taper to a point. Chin highlight.
      P(42, 44 + headYbase, 16, 1, SK_XS);   // jaw underline
      P(43, 45 + headYbase, 14, 1, SK_DK);   // jaw shadow row
      P(45, 47 + headYbase, 10, 1, SK_XS);   // chin underline
      P(46, 46 + headYbase, 8, 1, SK_MD);    // chin plane highlight
      P(48, 47 + headYbase, 4, 1, SK_HI);

      // MOUTH — pursed dark line under nose
      P(45, 42 + headYbase, 10, 1, SK_XS);
      P(46, 43 + headYbase, 8, 1, DR_SH);
      // stubble beard along jaw
      for (let xx = 40; xx <= 60; xx += 2) P(xx, 45 + headYbase, 1, 1, DR_MD);
      for (let xx = 43; xx <= 57; xx += 2) P(xx, 46 + headYbase, 1, 1, DR_MD);

      // EAR hint peeking through dreads at side
      P(38, 36 + headYbase, 1, 3, SK_MD);
      P(62, 36 + headYbase, 1, 3, SK_MD);

      // ============================================================================================
      // DREADLOCKS — the character-defining feature, drawn as FILLED BLOB curtain, then cut w/ seams.
      // Curtain silhouette: wider than head, drapes past shoulders to mid-chest.
      // ============================================================================================
      // BACK-CLUSTER dreads visible past shoulders (behind arms)
      // Left back cluster
      P(28, 55 + bY, 6, 40, DR_XS);
      P(29, 55 + bY, 4, 40, DR_SH);
      P(30, 57 + bY, 2, 36, DR_DK);
      // Right back cluster
      P(66, 55 + bY, 6, 40, DR_XS);
      P(67, 55 + bY, 4, 40, DR_SH);
      P(68, 57 + bY, 2, 36, DR_DK);

      // CROWN — matted mass on top of head (thick blob, not stripes)
      // 3-row wide blob from x=36..64
      P(37, 18 + headYbase, 26, 3, DR_XS);
      P(38, 17 + headYbase, 24, 2, DR_SH);
      P(39, 16 + headYbase, 22, 1, DR_DK);
      // little dread stub tufts poking off crown
      for (const [tx, ty, tl] of [[37,15,2],[41,14,3],[45,13,4],[50,13,4],[55,14,3],[59,15,2],[62,16,2]]) {
        P(tx, ty + headYbase, 1, tl, DR_DK);
        P(tx, ty + headYbase, 1, 1, DR_MD);
      }
      // crown top-lit highlight (matted braid crest)
      P(43, 17 + headYbase, 14, 1, DR_HI);
      P(46, 16 + headYbase, 8,  1, DR_MD);
      // red blood-crown thorns weaving through top of crown
      for (const tx of [39, 43, 47, 50, 53, 57, 61]) {
        P(tx, 15 + headYbase, 1, 1, BL_HH);
        P(tx, 16 + headYbase, 1, 1, BL_MD);
      }

      // FRONT CURTAIN — filled blob framing face, wider than head, cut by darker vertical SEAMS.
      // Curtain: y=25..70, x=32..68 (36 wide, wider than 22-wide head). Solid fill first.
      // Left half of curtain
      const curtainRows = [];
      // Left curtain silhouette [y, xL, xR] — hangs beside/across face down over shoulders
      for (let dy = 0; dy < 48; dy++) {
        const y = 22 + dy;
        // outer flare grows slightly as it descends
        const outerL = dy < 8 ? 36 - Math.floor(dy * 0.5) : 32;
        const outerR = dy < 8 ? 63 + Math.floor(dy * 0.5) : 68;
        // inner edge (face opening) tapers closed near cheeks then opens over chin
        let innerL, innerR;
        if (dy < 4)       { innerL = 42; innerR = 58; }          // brow open
        else if (dy < 12) { innerL = 40; innerR = 60; }          // eye open (dread wisps here)
        else if (dy < 18) { innerL = 40; innerR = 60; }          // cheek open
        else if (dy < 24) { innerL = 39; innerR = 61; }          // jaw open
        else              { innerL = -1; innerR = -1; }          // closes below chin
        curtainRows.push([y, outerL, outerR, innerL, innerR]);
      }
      // draw the left and right curtain halves as filled blobs
      for (const [yy, oL, oR, iL, iR] of curtainRows) {
        if (iL >= 0) {
          // left half
          if (iL > oL) {
            P(oL, yy + headYbase,  iL - oL,     1, DR_XS);        // outer shadow edge
            P(oL + 1, yy + headYbase, iL - oL - 1, 1, DR_SH);     // main blob fill
          }
          // right half
          if (oR > iR) {
            P(iR + 1, yy + headYbase, oR - iR,     1, DR_XS);
            P(iR + 1, yy + headYbase, oR - iR - 1, 1, DR_SH);
          }
        } else {
          // solid across (below chin)
          P(oL, yy + headYbase, oR - oL + 1, 1, DR_XS);
          P(oL + 1, yy + headYbase, oR - oL - 1, 1, DR_SH);
        }
      }
      // Vertical SEAM cuts — darker vertical lines carved into the blob to read as strand separations
      // Left side seams
      for (const sx of [32, 34, 36, 38]) {
        for (let dy = 4; dy < 48; dy++) {
          const row = curtainRows[dy];
          if (!row) continue;
          const [yy, oL, oR, iL, iR] = row;
          if (sx >= oL && (iL < 0 || sx < iL)) P(sx, yy + headYbase, 1, 1, DR_XS);
        }
      }
      // Right side seams
      for (const sx of [61, 63, 65, 67]) {
        for (let dy = 4; dy < 48; dy++) {
          const row = curtainRows[dy];
          if (!row) continue;
          const [yy, oL, oR, iL, iR] = row;
          if (sx <= oR && (iR < 0 || sx > iR)) P(sx, yy + headYbase, 1, 1, DR_XS);
        }
      }
      // Slight tone breakup — a few brighter DR_MD strand fills between seams
      for (const [sx, y0, y1] of [[33, 26, 62], [37, 26, 60], [62, 26, 60], [66, 26, 62]]) {
        for (let yy = y0; yy <= y1; yy++) P(sx, yy + headYbase, 1, 1, DR_DK);
      }
      // Small dread wisps that DO cross over eyes (a couple of thin strands)
      for (const [sx, y0, y1] of [[43, 26, 35], [46, 25, 32], [54, 25, 32], [56, 26, 34]]) {
        for (let yy = y0; yy <= y1; yy++) { P(sx, yy + headYbase, 1, 1, DR_XS); }
      }

      // Frayed dread TIPS below the chin/curtain end — 12 tapered strands with tip drift
      const tipY = 22 + 48;         // start below the solid curtain
      const tipStrands = [
        // [x, tipLen, drift-side (-1 left, +1 right)]
        [32, 20, -1], [34, 22, -1], [36, 20, -1], [38, 22, -1], [40, 18, -1], [42, 15, -1],
        [57, 15, +1], [59, 18, +1], [61, 22, +1], [63, 20, +1], [65, 22, +1], [67, 20, +1]
      ];
      for (const [sx, tl, dir] of tipStrands) {
        for (let dy = 0; dy < tl; dy++) {
          const drift = dy > tl - 8 ? Math.round((dy - (tl - 8)) / 8 * dSway * dir) : 0;
          const yy = tipY + dy + headYbase;
          P(sx + drift, yy, 2, 1, DR_XS);
          P(sx + drift + 1, yy, 1, 1, DR_SH);
        }
        // frayed tip pixel
        P(sx + Math.round(dSway * dir), tipY + tl + headYbase, 1, 1, DR_MD);
      }

      // IRON RINGS on curtain + tips — hand-listed positions (not procedural)
      const rings = [
        // curtain body
        [33, 30], [33, 42], [33, 54], [33, 64],
        [35, 34], [35, 46], [35, 58],
        [37, 32], [37, 44], [37, 56], [37, 68],
        [39, 40], [39, 52],
        [61, 40], [61, 52],
        [63, 32], [63, 44], [63, 56], [63, 68],
        [65, 34], [65, 46], [65, 58],
        [67, 30], [67, 42], [67, 54], [67, 64],
        // tips (below curtain)
        [34, 78], [36, 82], [38, 76],
        [62, 76], [64, 82], [66, 78]
      ];
      for (const [rx, ry] of rings) {
        // ring: 4x2 with mid highlight
        P(rx - 1, ry + headYbase, 4, 2, IR_SH);
        P(rx,     ry + headYbase, 3, 1, IR_MD);
        P(rx + 1, ry + headYbase, 1, 1, IR_HI);
        P(rx,     ry + headYbase + 1, 1, 1, IR_DK);
      }
      // RED THORNS — small barbs poking outward from rings and along seams
      const thorns = [
        [31, 34], [30, 46], [31, 58], [30, 70],
        [69, 34], [70, 46], [69, 58], [70, 70],
        [32, 40], [68, 40], [31, 52], [69, 52],
        [33, 76], [67, 76], [35, 84], [65, 84]
      ];
      for (const [tx, ty] of thorns) {
        P(tx, ty + headYbase, 1, 1, BL_HH);
        P(tx, ty + headYbase, 1, 1, BL_MD);
        // little red drip below thorn
        P(tx, ty + headYbase + 1, 1, 1, BL_DK);
      }

      // ============================================================================================
      // GROUND CONTACT — small blood pool under feet
      // ============================================================================================
      P(30, 178, 40, 1, DR_XS);
      P(36, 177, 28, 1, BL_XS);
      P(40, 177, 20, 1, BL_DK);
      P(46, 177, 8,  1, BL_MD);
      P(49, 177, 2,  1, BL_HI);

      return c;
    }

    // -------- bakeWalkFront(f): 8-frame walk cycle, hand-drawn per frame -------------------------
    // Walk mechanics: F0 contactL, F1 recoilL, F2 passL, F3 highL, F4 contactR, F5 recoilR, F6 passR, F7 highR.
    // Weight shift: body bobs +/- 2 px vertical, shifts +/- 1 px horizontal. Arms counter-swing.
    // Dread curtain swings +/- 3 px in x, tips +/- 4 px. Robe hem sways opposite the shoulders.
    function bakeWalkFront(f) {
      const { c, x } = newFrame();
      const P = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };

      // Per-frame timing tables
      const bodyBobY = [0, 1, 2, 1, 0, 1, 2, 1][f];     // body drops on contact, rises on pass
      const bodyShiftX = [-1, -1, 0, 1, 1, 1, 0, -1][f]; // hip sways
      const shoulderTiltR = [-1, 0, 0, 1, 1, 0, 0, -1][f]; // right shoulder rises when left leg forward
      const dreadSway = [-2, -1, 0, 2, 3, 2, 0, -2][f];  // whole curtain sways with body
      const dreadTip  = [-3, -2, 0, 3, 4, 3, 0, -3][f];  // dread tips lag/lead
      // Leg swing state — leg position: front (planted+forward), mid (passing), back (planted+back)
      // frames:  0    1    2    3    4    5    6    7
      // L leg:   F    F    M    B    B    B    M    F
      // R leg:   B    B    M    F    F    F    M    B
      const legPhaseL = ['F','F','M','B','B','B','M','F'][f];
      const legPhaseR = ['B','B','M','F','F','F','M','B'][f];

      // Foot positions per phase — [footX, footY, ankleY, kneeBend]
      const footPos = (phase, sideIsLeft) => {
        // Front-facing walk: front foot lands slightly forward AND shows sole/toes; back foot is behind and higher
        if (phase === 'F') return { fx: sideIsLeft ? 35 : 53, fy: 172, ay: 164, li: 0 };  // planted front
        if (phase === 'B') return { fx: sideIsLeft ? 37 : 55, fy: 170, ay: 162, li: -2 }; // planted back (foot slightly retracted, higher)
        // Passing phase: foot mid-swing, off ground
        return { fx: sideIsLeft ? 40 : 55, fy: 166, ay: 158, li: -4 };
      };
      const L = footPos(legPhaseL, true), R = footPos(legPhaseR, false);

      // ============================================================================================
      // FEET / LEGS
      // ============================================================================================
      function foot(fx, fy, ay, li, mirror) {
        // mirror = false: draws as-is; foot silhouette centered around fx.
        // sole shape (front-face)
        P(fx, fy, 12, 6, SK_XS);
        P(fx + 1, fy - 1, 10, 5, SK_SH);
        P(fx + 2, fy - 1, 8, 3, SK_DK);
        P(fx + 3, fy, 6, 2, SK_MD);
        P(fx + 4, fy, 3, 1, SK_HI);
        // toe separations
        P(fx + 2, fy + 4, 1, 2, DR_SH); P(fx + 4, fy + 4, 1, 2, DR_SH);
        P(fx + 6, fy + 4, 1, 2, DR_SH); P(fx + 8, fy + 4, 1, 2, DR_SH); P(fx + 10, fy + 4, 1, 2, DR_SH);
        // ankle / lower shin (visible under robe hem lift when foot forward)
        P(fx + 3, ay,     6, 8, SK_SH);
        P(fx + 4, ay,     4, 7, SK_DK);
        P(fx + 4, ay,     2, 5, SK_MD);
        P(fx + 4, ay + 1, 1, 3, SK_HI);
      }
      foot(L.fx, L.fy + L.li, L.ay + L.li, L.li);
      foot(R.fx, R.fy + R.li, R.ay + R.li, R.li);

      // ============================================================================================
      // ROBE SKIRT — sways opposite the shoulders. Hem lifts slightly on lifted foot side.
      // ============================================================================================
      const skirtSwayX = -bodyShiftX;   // opposite to hip shift
      const skirtRows = [];
      for (let i = 0; i < 70; i++) {
        const y = 100 + bodyBobY + i;
        const flare = Math.floor(i * 0.28);
        // hem lifts on lifted-foot side (li < 0 means foot lifted)
        const leftLift = L.li < -2 ? Math.floor((i / 70) * 2) : 0;
        const rightLift = R.li < -2 ? Math.floor((i / 70) * 2) : 0;
        skirtRows.push([y, 34 - flare + skirtSwayX + leftLift, 66 + flare + skirtSwayX - rightLift]);
      }
      for (const r of skirtRows) P(r[1], r[0], r[2] - r[1] + 1, 1, RB_XS);
      for (const r of skirtRows) if (r[2] - r[1] > 3) P(r[1] + 1, r[0], r[2] - r[1] - 1, 1, RB_SH);

      const foldCols = [
        [-18, -1], [-14, -1], [-10, 0], [-7, 0], [-4, +1], [-2, +2], [0, +2], [2, +2], [4, +1], [7, 0], [10, 0], [14, -1], [18, -1]
      ];
      const skirtCX = 50 + skirtSwayX;
      for (const [dx, bias] of foldCols) {
        for (const r of skirtRows) {
          const cx = skirtCX + dx;
          if (cx < r[1] + 1 || cx > r[2] - 1) continue;
          const t = (r[0] - 100 - bodyBobY) / 70;
          let step;
          if (bias === +2)      step = t < 0.25 ? 6 : t < 0.55 ? 5 : t < 0.80 ? 4 : 3;
          else if (bias === +1) step = t < 0.25 ? 5 : t < 0.55 ? 4 : t < 0.80 ? 3 : 2;
          else if (bias === 0)  step = t < 0.30 ? 4 : t < 0.65 ? 3 : 2;
          else                  step = t < 0.30 ? 3 : t < 0.65 ? 2 : 1;
          const ramp = [RB_XS, RB_SH, RB_DK, RB_MD, RB_HI, RB_HH, RB_XH];
          P(cx, r[0], 1, 1, ramp[step]);
        }
      }
      // sash-lit spine
      for (let y = 108 + bodyBobY; y <= 150 + bodyBobY; y++) {
        P(49 + skirtSwayX, y, 1, 1, RB_HI);
        P(50 + skirtSwayX, y, 1, 1, RB_HH);
        P(51 + skirtSwayX, y, 1, 1, RB_HI);
      }
      // blood streaks
      P(48 + skirtSwayX, 104 + bodyBobY, 1, 22, BL_DK);
      P(41 + skirtSwayX, 110 + bodyBobY, 1, 30, BL_DK);
      P(53 + skirtSwayX, 112 + bodyBobY, 1, 28, BL_DK);

      // ============================================================================================
      // BELT — moves with body
      // ============================================================================================
      const beltY = 96 + bodyBobY;
      const beltX = bodyShiftX;
      P(33 + beltX, beltY,     34, 3, RB_XS);
      P(34 + beltX, beltY + 1, 32, 1, RB_DK);
      for (let i = 34; i < 66; i += 3) P(i + beltX, beltY, 1, 1, RB_MD);
      P(31 + beltX, beltY + 4, 38, 4, RB_XS);
      P(32 + beltX, beltY + 5, 36, 2, RB_SH);
      for (let i = 32; i < 68; i += 3) P(i + beltX, beltY + 5, 1, 1, RB_HI);
      // central knot
      P(44 + beltX, beltY - 2, 12, 12, RB_XS);
      P(45 + beltX, beltY - 1, 10, 10, RB_SH);
      P(46 + beltX, beltY,      8,  8, RB_DK);
      P(47 + beltX, beltY + 3,  6,  3, RB_HI);
      P(48 + beltX, beltY + 3,  4,  2, RB_HH);
      // hanging cord (swings slightly with body)
      const cordX = 49 + beltX + Math.round(bodyShiftX * 0.5);
      P(cordX, beltY + 10, 2, 18, RB_XS);
      P(cordX, beltY + 10, 1, 18, RB_DK);
      P(cordX + 1, beltY + 10, 1, 16, RB_MD);

      // ============================================================================================
      // TORSO — bobs with body, shoulder-tilt affects delt height
      // ============================================================================================
      const torsoY = bodyBobY;
      const torsoX = bodyShiftX;
      const torsoRows = [
        [54, 33, 67], [55, 32, 68], [56, 31, 69], [57, 31, 69], [58, 30, 70],
        [59, 30, 70], [60, 30, 70], [61, 30, 70], [62, 30, 70], [63, 30, 70],
        [64, 30, 70], [65, 30, 70], [66, 31, 69], [67, 31, 69], [68, 31, 69],
        [69, 31, 69], [70, 31, 69], [71, 32, 68], [72, 32, 68], [73, 32, 68],
        [74, 32, 68], [75, 33, 67], [76, 33, 67], [77, 33, 67], [78, 34, 66],
        [79, 34, 66], [80, 34, 66], [81, 34, 66], [82, 35, 65], [83, 35, 65],
        [84, 35, 65], [85, 35, 65], [86, 35, 65], [87, 35, 65], [88, 35, 65],
        [89, 35, 65], [90, 35, 65], [91, 35, 65], [92, 35, 65], [93, 35, 65],
        [94, 35, 65], [95, 35, 65]
      ];
      for (const r of torsoRows) P(r[1] + torsoX, r[0] + torsoY, r[2] - r[1] + 1, 1, SK_XS);
      for (const r of torsoRows) if (r[2] - r[1] > 2) P(r[1] + 1 + torsoX, r[0] + torsoY, r[2] - r[1] - 1, 1, SK_SH);
      for (const r of torsoRows) if (r[2] - r[1] > 4) P(r[1] + 2 + torsoX, r[0] + torsoY, r[2] - r[1] - 3, 1, SK_DK);

      // pectorals (per-row width)
      const pec = [ [58,4], [59,5], [60,6], [61,7], [62,7], [63,7], [64,7], [65,7], [66,6], [67,5], [68,4], [69,3], [70,2] ];
      for (const [py, w] of pec) { P(36 + torsoX, py + torsoY, w, 1, SK_MD); P(64 - w + 1 + torsoX, py + torsoY, w, 1, SK_MD); }
      // sternum
      for (let yy = 58; yy <= 74; yy++) { P(49 + torsoX, yy + torsoY, 3, 1, SK_XS); }
      // ab ridge
      for (let yy = 72; yy <= 92; yy++) { P(49 + torsoX, yy + torsoY, 1, 1, SK_SH); P(50 + torsoX, yy + torsoY, 1, 1, SK_MD); P(51 + torsoX, yy + torsoY, 1, 1, SK_SH); }
      for (const yy of [76, 80, 84, 88]) P(46 + torsoX, yy + torsoY, 9, 1, SK_XS);
      // shoulder deltoids w/ tilt
      P(33 + torsoX, 54 + torsoY - shoulderTiltR, 5, 1, SK_MD);
      P(62 + torsoX, 54 + torsoY + shoulderTiltR, 5, 1, SK_MD);
      // deep shoulder shadow
      P(38 + torsoX, 54 + torsoY, 24, 3, SK_XS);

      // NECK
      P(46 + torsoX, 50 + torsoY, 8, 5, SK_XS);
      P(48 + torsoX, 51 + torsoY, 4, 4, SK_DK);

      // blood streaks on chest
      P(50 + torsoX, 52 + torsoY, 1, 40, BL_DK);
      P(50 + torsoX, 52 + torsoY, 1, 18, BL_MD);
      P(43 + torsoX, 60 + torsoY, 1, 32, BL_DK);
      P(57 + torsoX, 62 + torsoY, 1, 30, BL_DK);

      // ============================================================================================
      // ARMS — counter-swing to legs. Left arm forward when right leg forward and vice versa.
      // ============================================================================================
      // Arm swing: forward = shifted +2 x from center of body, back = -2 x.
      // We couple arm phase to opposite leg
      const armSwing = (legPhase) => legPhase === 'F' ? -2 : legPhase === 'B' ? +2 : 0;
      const laX = armSwing(legPhaseR) + torsoX;  // left arm counters right leg
      const raX = -armSwing(legPhaseL) + torsoX; // right arm counters left leg
      const armY = torsoY + (bodyBobY > 1 ? 0 : 0);
      // simplified arms — kept the same silhouette but shifted horizontally
      const drawArm = (x0, y0, side) => {
        // shoulder → wrist
        for (let dy = 0; dy < 35; dy++) {
          const yy = 54 + dy + y0;
          const xL = side === 'L' ? 27 + x0 + Math.floor(dy * 0.05) : (HW - 1 - (33 + x0 + Math.floor(dy * 0.05)));
          const xR = side === 'L' ? 33 + x0 + Math.floor(dy * 0.05) : (HW - 1 - (27 + x0 + Math.floor(dy * 0.05)));
          const xLo = Math.min(xL, xR), xHi = Math.max(xL, xR);
          P(xLo, yy, xHi - xLo + 1, 1, SK_XS);
          if (xHi - xLo > 1) P(xLo + 1, yy, xHi - xLo - 1, 1, SK_SH);
          if (xHi - xLo > 3) P(xLo + 2, yy, xHi - xLo - 3, 1, SK_DK);
        }
        // bicep highlight
        if (side === 'L') { for (let yy = 55; yy <= 63; yy++) P(26 + x0, yy + y0, 2, 1, SK_MD); }
        else              { for (let yy = 55; yy <= 63; yy++) P(72 + x0, yy + y0, 2, 1, SK_MD); }
      };
      drawArm(laX, armY, 'L');
      drawArm(raX, armY, 'R');

      // Wrist wraps travel with the arm
      const wrap = (cx, side, x0extra) => {
        const wx = cx + x0extra;
        P(wx - 5, 88 + torsoY, 10, 20, RB_XS);
        P(wx - 4, 89 + torsoY, 8, 18, RB_SH);
        for (const dy of [3, 6, 9, 12, 15, 18]) P(wx - 4, 89 + torsoY + dy, 8, 1, RB_MD);
        P(wx - 3, 92 + torsoY, 6, 1, RB_HI);
        P(wx - 3, 99 + torsoY, 4, 1, RB_HH);
        // thorn stubs
        for (const dy of [3, 7, 10, 13, 17]) {
          const tx = side < 0 ? wx - 6 : wx + 5;
          P(tx, 89 + torsoY + dy, 1, 1, BL_HH);
        }
        // dried blood
        P(wx - 3, 103 + torsoY, 5, 3, BL_XS);
        // hand
        P(wx - 4, 108 + torsoY, 8, 6, SK_XS);
        P(wx - 3, 108 + torsoY, 6, 5, SK_SH);
        P(wx - 2, 109 + torsoY, 4, 3, SK_DK);
      };
      wrap(29, -1, laX);
      wrap(70, +1, raX);

      // ============================================================================================
      // HEAD — bobs with body, tilts slightly opposite the body sway
      // ============================================================================================
      const headYb = torsoY + [0,0,-1,-1,0,0,-1,-1][f];
      const headXb = torsoX + Math.round(-bodyShiftX * 0.5);
      const headRows = [
        [22, 42, 58], [23, 41, 59], [24, 40, 60], [25, 40, 60],
        [26, 39, 61], [27, 39, 61], [28, 39, 61], [29, 39, 61],
        [30, 39, 61], [31, 39, 61], [32, 39, 61], [33, 39, 61],
        [34, 39, 61], [35, 39, 61], [36, 39, 61],
        [37, 40, 60], [38, 40, 60], [39, 40, 60],
        [40, 41, 59], [41, 41, 59], [42, 42, 58],
        [43, 42, 58], [44, 43, 57], [45, 43, 57],
        [46, 44, 56], [47, 44, 56], [48, 45, 55], [49, 46, 54],
        [50, 46, 54]
      ];
      for (const r of headRows) P(r[1] + headXb, r[0] + headYb, r[2] - r[1] + 1, 1, SK_XS);
      for (const r of headRows) if (r[2] - r[1] > 1) P(r[1] + 1 + headXb, r[0] + headYb, r[2] - r[1] - 1, 1, SK_SH);
      for (const r of headRows) if (r[2] - r[1] > 3) P(r[1] + 2 + headXb, r[0] + headYb, r[2] - r[1] - 3, 1, SK_DK);
      // brow
      P(39 + headXb, 30 + headYb, 22, 2, SK_XS);
      // eyes with ember
      P(41 + headXb, 32 + headYb, 5, 3, SK_XS);
      P(54 + headXb, 32 + headYb, 5, 3, SK_XS);
      P(43 + headXb, 33 + headYb, 1, 1, BL_HH);
      P(56 + headXb, 33 + headYb, 1, 1, BL_HH);
      // blood tears
      P(43 + headXb, 35 + headYb, 1, 6, BL_DK);
      P(56 + headXb, 35 + headYb, 1, 6, BL_DK);
      // nose
      P(48 + headXb, 32 + headYb, 4, 8, SK_XS);
      P(49 + headXb, 33 + headYb, 2, 6, SK_SH);
      P(49 + headXb, 38 + headYb, 2, 1, SK_MD);
      P(50 + headXb, 39 + headYb, 1, 1, SK_HI);
      P(47 + headXb, 40 + headYb, 6, 1, SK_XS);
      // cheekbones
      P(40 + headXb, 34 + headYb, 1, 5, SK_MD);
      P(59 + headXb, 34 + headYb, 1, 5, SK_MD);
      // jaw + chin
      P(42 + headXb, 44 + headYb, 16, 1, SK_XS);
      P(45 + headXb, 47 + headYb, 10, 1, SK_XS);
      P(46 + headXb, 46 + headYb, 8, 1, SK_MD);
      P(48 + headXb, 47 + headYb, 4, 1, SK_HI);
      // mouth
      P(45 + headXb, 42 + headYb, 10, 1, SK_XS);
      P(46 + headXb, 43 + headYb, 8, 1, DR_SH);

      // ============================================================================================
      // DREAD CURTAIN — full-body swing. Curtain sways horizontally, tips sway more.
      // ============================================================================================
      // Back cluster dreads visible past shoulders
      P(28 + headXb + Math.round(dreadSway * 0.5), 55 + torsoY, 6, 40, DR_XS);
      P(29 + headXb + Math.round(dreadSway * 0.5), 55 + torsoY, 4, 40, DR_SH);
      P(66 + headXb + Math.round(dreadSway * 0.5), 55 + torsoY, 6, 40, DR_XS);
      P(67 + headXb + Math.round(dreadSway * 0.5), 55 + torsoY, 4, 40, DR_SH);

      // Crown mass
      P(37 + headXb, 18 + headYb, 26, 3, DR_XS);
      P(38 + headXb, 17 + headYb, 24, 2, DR_SH);
      P(39 + headXb, 16 + headYb, 22, 1, DR_DK);
      for (const [tx, ty, tl] of [[37,15,2],[41,14,3],[45,13,4],[50,13,4],[55,14,3],[59,15,2],[62,16,2]]) {
        P(tx + headXb, ty + headYb, 1, tl, DR_DK);
      }
      for (const tx of [39, 43, 47, 50, 53, 57, 61]) {
        P(tx + headXb, 15 + headYb, 1, 1, BL_HH);
      }

      // Front curtain — sways with dreadSway
      const cSway = Math.round(dreadSway * 0.6);
      for (let dy = 0; dy < 48; dy++) {
        const yy = 22 + dy + headYb;
        const outerL = dy < 8 ? 36 - Math.floor(dy * 0.5) : 32;
        const outerR = dy < 8 ? 63 + Math.floor(dy * 0.5) : 68;
        let innerL, innerR;
        if (dy < 4)       { innerL = 42; innerR = 58; }
        else if (dy < 12) { innerL = 40; innerR = 60; }
        else if (dy < 18) { innerL = 40; innerR = 60; }
        else if (dy < 24) { innerL = 39; innerR = 61; }
        else              { innerL = -1; innerR = -1; }
        if (innerL >= 0) {
          if (innerL > outerL) {
            P(outerL + cSway + headXb, yy, innerL - outerL, 1, DR_XS);
            P(outerL + 1 + cSway + headXb, yy, innerL - outerL - 1, 1, DR_SH);
          }
          if (outerR > innerR) {
            P(innerR + 1 + cSway + headXb, yy, outerR - innerR, 1, DR_XS);
            P(innerR + 1 + cSway + headXb, yy, outerR - innerR - 1, 1, DR_SH);
          }
        } else {
          P(outerL + cSway + headXb, yy, outerR - outerL + 1, 1, DR_XS);
          P(outerL + 1 + cSway + headXb, yy, outerR - outerL - 1, 1, DR_SH);
        }
      }
      // seams
      for (const sx of [32, 34, 36, 38, 61, 63, 65, 67]) {
        for (let dy = 4; dy < 48; dy++) {
          P(sx + cSway + headXb, 22 + dy + headYb, 1, 1, DR_XS);
        }
      }

      // Frayed tips — swing with dreadTip (larger swing than curtain)
      const tipY = 70 + headYb;
      const tipStrands = [
        [32, 20, -1], [34, 22, -1], [36, 20, -1], [38, 22, -1], [40, 18, -1], [42, 15, -1],
        [57, 15, +1], [59, 18, +1], [61, 22, +1], [63, 20, +1], [65, 22, +1], [67, 20, +1]
      ];
      for (const [sx, tl, dir] of tipStrands) {
        for (let dy = 0; dy < tl; dy++) {
          // tip sway ramps in over the length
          const swayAmount = Math.round((dy / tl) * dreadTip);
          const yy = tipY + dy;
          P(sx + swayAmount + headXb, yy, 2, 1, DR_XS);
          P(sx + 1 + swayAmount + headXb, yy, 1, 1, DR_SH);
        }
      }

      // Iron rings on curtain (shifted with sway)
      const rings = [
        [33, 30], [33, 42], [33, 54], [35, 34], [35, 46], [37, 32], [37, 44], [37, 56],
        [63, 32], [63, 44], [63, 56], [65, 34], [65, 46], [67, 30], [67, 42], [67, 54],
      ];
      for (const [rx, ry] of rings) {
        P(rx - 1 + cSway + headXb, ry + headYb, 4, 2, IR_SH);
        P(rx     + cSway + headXb, ry + headYb, 3, 1, IR_MD);
        P(rx + 1 + cSway + headXb, ry + headYb, 1, 1, IR_HI);
      }
      // Thorns
      for (const [tx, ty] of [[31,34],[30,46],[69,34],[70,46],[33,76],[67,76]]) {
        P(tx + cSway + headXb, ty + headYb, 1, 1, BL_HH);
      }

      // Ground shadow (smaller during walk, moves under planted feet)
      P(30, 178, 40, 1, DR_XS);
      P(38, 177, 24, 1, BL_XS);

      return c;
    }

    // ---------- cache 6 idle frames + 8 walk-front frames on load ----------------------------------
    const BAKED = [0, 1, 2, 3, 4, 5].map(bakeIdleFront);
    const WALK_BAKED = [0, 1, 2, 3, 4, 5, 6, 7].map(bakeWalkFront);

    // ---------- assemble world-space frame objects (matches heroFrame return shape) ----------------
    const SS = HW * S, SH = HH * S;
    const OX = AX, OY = AY;

    const lo = (src) => {
      const q = mkCanvas(HW, HH), qx = q.getContext('2d');
      qx.imageSmoothingEnabled = false;
      qx.drawImage(src, 0, 0, HW, HH);
      q._hr = src;
      return q;
    };
    const tintFn = (src, col) => {
      const s = src._hr || src;
      const q = mkCanvas(s.width, s.height), qx = q.getContext('2d');
      qx.drawImage(s, 0, 0);
      qx.globalCompositeOperation = 'source-in';
      qx.fillStyle = col;
      qx.fillRect(0, 0, s.width, s.height);
      return src._hr ? lo(q) : q;
    };

    function buildFrame(bake) {
      const hd = mkCanvas(SS, SH), hx = hd.getContext('2d');
      hx.imageSmoothingEnabled = false;
      hx.drawImage(bake, 0, 0, SS, SH);
      const hf = mkCanvas(SS, SH), fx = hf.getContext('2d');
      fx.imageSmoothingEnabled = false;
      fx.translate(SS, 0); fx.scale(-1, 1);
      fx.drawImage(hd, 0, 0);
      const cLo = lo(hd), fLo = lo(hf);
      return {
        c: cLo,
        f: fLo,
        fl: tintFn(cLo, '#fff'),
        flf: tintFn(fLo, '#fff'),
        w: HW, h: HH,
        ox: OX, oy: OY,
        bb: { x: OX - 34, y: OY - HH, w: 68, h: HH },
        tint: tintFn,
        hd: true
      };
    }

    const FRAMES = BAKED.map(buildFrame);
    const WALK_FRAMES = WALK_BAKED.map(buildFrame);

    // ---------- hook heroFrame / heroPose ----------------------------------------------------------
    const _prevHF = heroFrame;
    heroFrame = function (cls, pose, ph, view) {
      if (cls !== 'hemomancer') return _prevHF(cls, pose, ph, view);
      if (pose === 'walk') return WALK_FRAMES[((ph | 0) % 8 + 8) % 8];
      if (pose !== 'idle') {
        const fr = _prevHF(cls, pose, ph, view);
        if (fr) return fr;
        return FRAMES[((ph | 0) % 6 + 6) % 6];
      }
      return FRAMES[((ph | 0) % 6 + 6) % 6];
    };

    const _prevHP = heroPose;
    heroPose = function () {
      const r = _prevHP();
      if (typeof P !== 'undefined' && P && P.cls === 'hemomancer') {
        if (r[0] === 'walk') return ['walk', Math.floor(G.time * 8) % 8];
        return ['idle', Math.floor(G.time * 4) % 6];
      }
      return r;
    };

    window.__r5Hemo = { BAKED, WALK_BAKED, FRAMES, WALK_FRAMES, bakeIdleFront, bakeWalkFront, iter: 3 };
  }
}
