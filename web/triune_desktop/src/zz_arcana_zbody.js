// zz_arcana_zbody.js (v0.53) — THE INVERTED TRIUNE: each order's own body.
// User (2026-09-28): "i like the arcana direction. i was thinking every class would have their own body and
// pathways, instead of one big body in sections". Earlier: "combined ... over a human outline with the path matching
// the veins, the chi, the bones" · "very poe, but make sure it is tarot themed and body" · "no color ... that old
// esoteric inked look".
//
// One panel per order: an engraved anatomical plate on old paper, a man standing in the circle with his arms held
// out, and on him the one system his order walks:
//   Ossuarch       — the skeleton. Cards over the sacrum, the holy bone; roads along spine, ribs, skull, limb bones.
//   Hemomancer     — the blood. Cards over the heart; artery and vein in pairs to the head, the wrists, the feet.
//   Hollow Mystic  — the nerves, and the threads of fate. Cards in the head; the cord, the nerves, threads above.
//   Shrine Keeper  — breath. Cards over the lungs; the windpipe, breath out of the mouth, two winds round the body.
//   Kusho          — the channels. Cards over the lower dantian; the midlines, the meridians, the spring in the sole.
// The Long Web's graph (zz_arcana_web.js: tie/untie, roads, anchors, sums, save) now holds the current order's
// body: the node table is swapped when the class changes. Knots saved on the old shared web are refunded on load.
(function () {
  if (typeof PW === 'undefined' || !PW.N) return;
  const N = PW.N, REG = PW.REG, REGK = {}; REG.forEach(R => { REGK[R.key] = R; });
  const F = 1.6;                                // figure units -> board units
  const V = PW.V || {}, FXT = PW.FXT || {};
  const mx = (pts) => pts.map(p => [-p[0], p[1]]);   // mirror a path to the other side
  const both = (pts, o) => [Object.assign({ pts }, o || {}), Object.assign({ pts: mx(pts) }, o || {})];
  const circ = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };

  // ------------------------------------------------------------------ the five bodies (figure units; y down)
  // paths: polylines; a node every `sp` units along each; ends that fall within 0.4 of an existing node join it.
  // pool: the small gifts along that path, in turn. notables snap to the nearest node. keys: card keystones.
  const BODY = {
    ossumancer: {
      key: 'oss', title: 'The Standing Frame', sub: 'the bones of the Ossuarch', system: 'bone',
      box: { x0: -2.0, x1: 2.0, y0: -0.2, y1: 3.5 }, root: [0, -1.6],
      paths: [
        { pts: [[0, -1.6], [0, -4.2], [0, -5.6], [0, -7.0], [0, -9.3], [0, -10.8]], pool: ['armor', 'poise', 'prec', 'armor', 'con'], name: 'The Spine' },
        { pts: circ(0, -13.3, 2.25, 2.7, 90, 450, 12), pool: ['dmg', 'shard', 'res', 'dmg'], name: 'The Skull', closed: true },
        ...[-4.2, -5.6, -7.0].flatMap((y, i) => both([[0, y], [1.5, y - 0.35], [2.45, y + 0.45]], { pool: i === 1 ? ['life', 'armor'] : ['armor', 'life'], name: 'The Ribs' })),
        ...both([[0, -9.3], [1.7, -9.55], [3.35, -9.75]], { pool: ['poise', 'armor'], name: 'The Collarbone' }),
        ...both([[3.35, -9.75], [5.8, -9.62], [8.2, -9.52]], { pool: ['melee', 'shard', 'dmg'], name: 'The Humerus' }),
        ...both([[8.2, -9.52], [8.35, -9.82], [10.3, -9.85], [12.3, -9.85], [12.6, -9.62]], { pool: ['melee', 'dmg', 'shard'], name: 'The Radius' }),
        ...both([[8.2, -9.52], [8.35, -9.28], [10.3, -9.32], [12.3, -9.4], [12.6, -9.62]], { pool: ['armor', 'poise', 'melee'], name: 'The Ulna' }),
        ...both([[12.6, -9.62], [13.7, -9.62], [14.7, -9.62]], { pool: ['shard', 'melee'], name: 'The Hand' }),
        ...both([[0, -1.6], [1.55, -1.05], [2.7, 0.25], [2.8, 2.0]], { pool: ['poise', 'life'], name: 'The Pelvis' }),
        ...both([[2.8, 2.0], [2.95, 4.3], [3.1, 6.5], [3.25, 8.6]], { pool: ['poise', 'frw', 'armor', 'life'], name: 'The Femur' }),
        ...both([[3.25, 8.6], [3.3, 9.3], [3.55, 11.5], [3.9, 14.6], [4.25, 15.1]], { pool: ['poise', 'life', 'armor'], name: 'The Tibia' }),
        ...both([[3.25, 8.6], [3.8, 9.3], [4.05, 11.5], [4.35, 14.5], [4.25, 15.1]], { pool: ['frw', 'poise', 'prec'], name: 'The Fibula' }),
        ...both([[4.25, 15.1], [5.4, 16.15]], { pool: ['frw'], name: 'The Foot' })
      ],
      notables: [
        { at: [0, -15.95], name: 'The Crown of the Standing', fx: { dmg: 3, shard: 2 }, lore: 'The skull is the last bone to lie down. His never will.' },
        { at: [0, -7.0], name: 'The Kept Wall', fx: { armor: 10, poise: 8 }, lore: 'The ribs were a vault before they were a crypt.' },
        { at: [8.2, -9.52], name: 'The Elbow That Does Not Bend', fx: { melee: 4, poise: 4 }, lore: 'A joint is a place where bone agrees to give. His agree to nothing.' },
        { at: [-8.2, -9.52], name: 'Marrow Patience', fx: { prec: 6, life: 3 }, lore: 'The duelists in the dark still go through their forms. They are in no hurry.' },
        { at: [3.25, 8.6], name: 'The Kneeling Refused', fx: { poise: 8, armor: 4 }, lore: 'Old Upright never knelt. Neither will you.' },
        { at: [-3.25, 8.6], name: 'Heavy Tread', fx: { poise: 6, frw: 1 }, lore: 'The dust keeps his footprints longer than it should.' },
        { at: [1.55, -1.05], name: 'The Holy Bone', fx: { life: 3, armor: 4 }, lore: 'Os sacrum. The oldest priests buried it last, because it was the last to be given back.' }
      ],
      keys: [{ at: [16.3, -9.62], page: 0 }, { at: [0, -17.6], page: 1 }, { at: [-16.3, -9.62], page: 2 }, { at: [5.9, 17.5], hyb: 0 }, { at: [-5.9, 17.5], hyb: 1 }]
    },
    hemomancer: {
      key: 'hem', title: 'The Red Nave', sub: 'the blood of the Hemomancer', system: 'blood',
      box: { x0: -1.8, x1: 2.8, y0: -8.0, y1: -3.4 }, root: [0, -8.75],
      paths: [
        ...both([[0, -8.75], [0.75, -10.2], [1.1, -11.6], [1.55, -13.0], [1.35, -14.6], [0.4, -15.7]], { pool: ['life', 'regen', 'ess'], name: 'The Carotid' }),
        ...both([[0, -8.75], [2.1, -9.25], [3.5, -9.55]], { pool: ['life', 'lok'], name: 'The Subclavian' }),
        ...both([[3.5, -9.55], [5.9, -9.5], [8.2, -9.45]], { pool: ['bleed', 'life', 'dmg'], name: 'The Brachial' }),
        ...both([[8.2, -9.45], [8.4, -9.75], [10.3, -9.8], [12.3, -9.82], [13.1, -9.6]], { pool: ['bleed', 'lok', 'dmg'], name: 'The Radial Artery' }),
        ...both([[8.2, -9.45], [8.4, -9.25], [10.3, -9.28], [12.3, -9.36], [13.1, -9.6]], { pool: ['life', 'regen', 'lok'], name: 'The Ulnar Vein' }),
        ...both([[13.1, -9.6], [14.6, -9.62]], { pool: ['bleed'], name: 'The Palm Arch' }),
        { pts: [[0, -8.75], [-1.1, -8.55], [-2.35, -7.2], [-2.3, -5.0], [-2.1, -3.0], [-0.7, -1.4], [0, 0.6]], pool: ['life', 'vit', 'ess', 'life', 'res'], name: 'The Aorta' },
        ...both([[0, 0.6], [1.4, 1.7], [2.35, 3.3], [2.85, 6.0], [3.2, 8.5]], { pool: ['life', 'bleed', 'lok'], name: 'The Femoral' }),
        ...both([[3.2, 8.5], [3.3, 9.3], [3.55, 11.6], [3.95, 14.6], [4.4, 15.2]], { pool: ['bleed', 'life'], name: 'The Tibial Artery' }),
        ...both([[3.2, 8.5], [3.8, 9.3], [4.05, 11.6], [4.4, 14.5], [4.4, 15.2]], { pool: ['regen', 'res'], name: 'The Saphenous Vein' }),
        ...both([[4.4, 15.2], [5.45, 16.15]], { pool: ['bleed'], name: 'The Foot' })
      ],
      notables: [
        { at: [2.1, -9.25], name: 'The Red Tithe', fx: { lok: 3, life: 3 }, lore: 'The Maiden takes her tenth. She leaves you the rest, warm.' },
        { at: [12.3, -9.82], name: 'Open Veins', fx: { bleed: 8, dmg: 2 }, lore: 'A wound that never scabbed is a well that never dries.' },
        { at: [-12.3, -9.82], name: 'The Wrist Offered', fx: { lok: 3, bleed: 5 }, lore: 'The brotherhoods cut here first. It is the easiest place to ask.' },
        { at: [1.55, -13.0], name: 'Blood to the Temple', fx: { ess: 5, regen: 4 }, lore: 'Every thought is carried on something red.' },
        { at: [0, 0.6], name: 'The Fork of the River', fx: { life: 5, vit: 1 }, lore: 'Where the great vessel parts, the fen-folk say, a child is always listening.' },
        { at: [3.2, 8.5], name: 'The Kneeling Pulse', fx: { life: 4, res: 3 }, lore: 'Kneel, and you can hear it behind the knee.' },
        { at: [-3.2, 8.5], name: 'Thin Blood', fx: { bleed: 6, regen: 3 }, lore: 'It runs faster. It runs out faster.' }
      ],
      keys: [{ at: [16.2, -9.62], page: 0 }, { at: [0, -17.3], page: 1 }, { at: [-16.2, -9.62], page: 2 }, { at: [6.0, 17.5], hyb: 0 }, { at: [-6.0, 17.5], hyb: 1 }]
    },
    animancer: {
      key: 'ani', title: 'The Hall of Mirrors', sub: 'the nerves and threads of the Hollow Mystic', system: 'nerve',
      box: { x0: -2.3, x1: 2.3, y0: -16.4, y1: -11.2 }, root: [0, -10.5],
      paths: [
        { pts: [[0, -10.5], [0, -9.3]], pool: ['ess'], name: 'The Cord' },
        { pts: [[0, -9.3], [0, -8.2], [0, -7.2]], pool: ['regen', 'spi'], name: 'The Cord' },
        { pts: [[0, -7.2], [0, -6.1], [0, -5.0]], pool: ['ess', 'fcr'], name: 'The Cord' },
        { pts: [[0, -5.0], [0, -2.8], [0, -0.6], [0, 1.4]], pool: ['ess', 'regen', 'spi', 'fcr'], name: 'The Cord' },
        ...both([[0, -10.5], [1.5, -11.0], [2.65, -12.6], [2.65, -15.0], [1.5, -16.35], [0, -16.6]], { pool: ['ess', 'dmg', 'mf', 'res'], name: 'The Optic Road' }),
        ...both([[0, -9.3], [1.8, -9.65], [3.45, -9.72]], { pool: ['fcr', 'ess'], name: 'The Plexus' }),
        ...both([[3.45, -9.72], [5.9, -9.58], [8.2, -9.5]], { pool: ['fcr', 'dmg', 'wisp'], name: 'The Median Nerve' }),
        ...both([[8.2, -9.5], [8.4, -9.78], [10.3, -9.8], [12.3, -9.8], [13.0, -9.6]], { pool: ['dmg', 'fcr', 'wisp'], name: 'The Radial Nerve' }),
        ...both([[8.2, -9.5], [8.4, -9.28], [10.3, -9.3], [12.3, -9.38], [13.0, -9.6]], { pool: ['ess', 'regen', 'mf'], name: 'The Ulnar Nerve' }),
        ...both([[13.0, -9.6], [14.6, -9.62]], { pool: ['wisp'], name: 'The Fingertips' }),
        ...[-5.0, -7.2].flatMap(y => both([[0, y], [1.4, y + 0.2], [2.4, y + 0.9]], { pool: ['res', 'ess'], name: 'The Intercostals' })),
        ...both([[0, 1.4], [1.3, 2.3], [2.6, 3.8], [2.95, 6.2], [3.2, 8.6]], { pool: ['ess', 'mf', 'dmg'], name: 'The Sciatic' }),
        ...both([[3.2, 8.6], [3.3, 9.4], [3.55, 11.6], [3.95, 14.6], [4.35, 15.2]], { pool: ['regen', 'res'], name: 'The Tibial Nerve' }),
        ...both([[3.2, 8.6], [3.85, 9.4], [4.1, 11.6], [4.45, 14.5], [4.35, 15.2]], { pool: ['fcr', 'mf'], name: 'The Peroneal' }),
        ...both([[4.35, 15.2], [5.45, 16.15]], { pool: ['frw'], name: 'The Foot' }),
        // the threads of fate, drawn up out of the crown onto the loom
        { pts: [[0, -16.6], [0, -18.2], [0, -19.8], [0, -21.4]], pool: ['dmg', 'wisp', 'spi'], name: 'The Warp' },
        ...both([[0, -16.6], [1.3, -18.0], [2.4, -19.4], [3.3, -20.8]], { pool: ['fcr', 'ess', 'dmg'], name: 'The Threads' }),
        ...both([[0, -16.6], [2.1, -17.0], [3.9, -17.9], [5.2, -19.2]], { pool: ['mf', 'regen'], name: 'The Loose Ends' }),
        ...both([[0, -19.8], [1.6, -20.4], [3.3, -20.8]], { pool: ['wisp'], name: 'The Weft' })
      ],
      notables: [
        { at: [0, -21.4], name: 'The Loom Behind the Eyes', fx: { dmg: 3, fcr: 3 }, lore: 'The Weaver does not see. It is seen through.' },
        { at: [3.3, -20.8], name: 'The Lantern\'s Patience', fx: { ess: 5, regen: 5 }, lore: 'A little longer. A little longer. Every wick says this.' },
        { at: [-3.3, -20.8], name: 'The Unraveller', fx: { dmg: 4, mf: 3 }, lore: 'Every thread is cut in the end. Some of them are cut by you.' },
        { at: [12.3, -9.8], name: 'Quicksilver Tongue', fx: { fcr: 4, dmg: 2 }, lore: 'The prayer is shorter if you leave out the parts that beg.' },
        { at: [-12.3, -9.8], name: 'The Wisps Return', fx: { wisp: 6, ess: 2 }, lore: 'They always come back to the hand that let them go.' },
        { at: [0, -2.8], name: 'The Thread in the Spine', fx: { ess: 4, res: 3 }, lore: 'Pull it, and the whole body answers.' },
        { at: [3.2, 8.6], name: 'The Long Nerve', fx: { regen: 5, frw: 1 }, lore: 'Pain takes the longest road in the body. So does news.' }
      ],
      keys: [{ at: [16.2, -9.62], page: 0 }, { at: [0, -23.0], page: 1 }, { at: [-16.2, -9.62], page: 2 }, { at: [5.9, 17.5], hyb: 0 }, { at: [-5.9, 17.5], hyb: 1 }]
    },
    miasmancer: {
      key: 'shr', title: 'The Well-Shrine', sub: 'the breath of the Shrine Keeper', system: 'breath',
      box: { x0: -2.65, x1: 2.65, y0: -8.3, y1: -3.6 }, root: [0, -9.0],
      paths: [
        { pts: [[0, -9.0], [0, -10.4], [0, -11.65]], pool: ['res', 'regen'], name: 'The Windpipe' },
        // the breath out of the mouth: a wreath round the head
        { pts: [[0, -11.65], [1.6, -11.9], [2.9, -13.0], [3.2, -14.7], [2.4, -16.3], [0.9, -17.1], [-0.9, -17.1], [-2.4, -16.3], [-3.2, -14.7], [-2.9, -13.0], [-1.6, -11.9], [0, -11.65]], pool: ['sick', 'evade', 'res', 'dmg'], name: 'The Breath Out', closed: true },
        ...both([[0, -9.0], [1.9, -9.45], [3.45, -9.62]], { pool: ['evade', 'sick'], name: 'The Held Breath' }),
        ...both([[3.45, -9.62], [5.9, -9.78], [8.2, -9.78], [10.3, -9.82], [12.3, -9.84], [13.3, -9.62]], { pool: ['sick', 'dmg', 'evade', 'frw'], name: 'The Breath to the Fan' }),
        ...both([[3.45, -9.62], [5.9, -9.3], [8.2, -9.25], [10.3, -9.3], [12.3, -9.38], [13.3, -9.62]], { pool: ['res', 'regen', 'mf'], name: 'The Breath Drawn In' }),
        ...both([[13.3, -9.62], [14.7, -9.62], [15.8, -9.95]], { pool: ['evade', 'sick'], name: 'The Open Fan' }),
        // two winds that wind round the body and cross at the navel and the knees
        { pts: [[-2.9, -8.8], [-3.0, -6.0], [-2.3, -3.0], [0, -1.0], [2.5, 1.2], [3.45, 4.6], [3.05, 7.5], [3.2, 8.7], [3.95, 11.5], [4.45, 14.4], [5.5, 16.2]], pool: ['frw', 'evade', 'sick', 'life'], name: 'The Left-Hand Wind' },
        { pts: [[2.9, -8.8], [3.0, -6.0], [2.3, -3.0], [0, -1.0], [-2.5, 1.2], [-3.45, 4.6], [-3.05, 7.5], [-3.2, 8.7], [-3.95, 11.5], [-4.45, 14.4], [-5.5, 16.2]], pool: ['res', 'frw', 'regen', 'life'], name: 'The Right-Hand Wind' },
        ...both([[0, -9.0], [1.6, -8.95], [2.9, -8.8]], { pool: ['life'], name: 'The Lungs\' Rim' }),
        ...both([[2.5, 1.2], [1.6, 3.7], [2.4, 6.2], [3.2, 8.7]], { pool: ['evade', 'mf'], name: 'The Undertow' })
      ],
      notables: [
        { at: [0, -17.1], name: 'The Last Breath', fx: { sick: 6, dmg: 2 }, lore: 'The god died breathing out, and never finished. She finishes it for him, a little at a time.' },
        { at: [0, -1.0], name: 'The Held Breath', fx: { evade: 1.5, sick: 6 }, lore: 'She did not breathe out. She is still looking for someone who will.' },
        { at: [15.8, -9.95], name: 'The Fan Unfolded', fx: { sick: 5, evade: 1 }, lore: 'The breath goes where the fan tells it to.' },
        { at: [-15.8, -9.95], name: 'Salt on the Threshold', fx: { res: 4, evade: 1 }, lore: 'The guardian stone at the torii faces the wrong way. She turns it back each time she passes.' },
        { at: [3.2, 8.7], name: 'Grandmother Wind', fx: { frw: 2, evade: 1 }, lore: 'She carries the small gods home on her back.' },
        { at: [-3.2, 8.7], name: 'The Undertow', fx: { res: 3, regen: 4 }, lore: 'What is breathed in must go somewhere. It goes down.' },
        { at: [0, -11.65], name: 'The Mouth of the Well', fx: { regen: 5, sick: 3 }, lore: 'The Well-Shrine was dug where a drowned child first breathed out.' }
      ],
      keys: [{ at: [17.4, -9.95], page: 0 }, { at: [0, -18.8], page: 1 }, { at: [-17.4, -9.95], page: 2 }, { at: [6.1, 17.5], hyb: 0 }, { at: [-6.1, 17.5], hyb: 1 }]
    },
    monk: {
      key: 'kus', title: 'The Black-Flame Road', sub: 'the channels of the Empty Hand', system: 'meridian',
      box: { x0: -2.1, x1: 2.1, y0: -3.3, y1: 2.5 }, root: [0, -3.9],
      paths: [
        { pts: [[0, -3.9], [0, -5.4], [0, -6.9], [0, -8.3], [0, -9.6], [0, -10.8]], pool: ['melee', 'poise', 'life', 'con'], name: 'The Conception Vessel' },
        { pts: circ(0, -13.4, 2.2, 2.6, 90, 450, 12), pool: ['sun', 'moon', 'melee', 'res'], name: 'The Governing Vessel', closed: true },
        ...both([[0, -8.3], [1.7, -8.75], [3.4, -9.3]], { pool: ['melee', 'poise'], name: 'The Lung Channel' }),
        ...both([[3.4, -9.3], [5.9, -9.25], [8.2, -9.22], [10.3, -9.28], [12.3, -9.36], [13.5, -9.5]], { pool: ['melee', 'moon', 'poise', 'life'], name: 'The Inner Arm (yin)' }),
        ...both([[3.4, -9.3], [3.6, -9.85], [5.9, -9.9], [8.2, -9.82], [10.3, -9.86], [12.3, -9.88], [13.5, -9.5]], { pool: ['melee', 'sun', 'frw', 'melee'], name: 'The Outer Arm (yang)' }),
        ...both([[13.5, -9.5], [14.7, -9.62]], { pool: ['melee'], name: 'The Palm' }),
        ...both([[0, -3.9], [1.9, -3.3], [2.6, -0.9], [2.95, 1.6]], { pool: ['poise', 'con'], name: 'The Girdle Vessel' }),
        ...both([[2.95, 1.6], [3.3, 4.3], [3.5, 6.6], [3.8, 8.8], [4.1, 11.4], [4.5, 14.5], [5.7, 16.3]], { pool: ['frw', 'sun', 'melee', 'poise'], name: 'The Outer Leg (yang)' }),
        ...both([[2.95, 1.6], [1.8, 3.6], [2.2, 6.2], [2.9, 8.9], [3.55, 11.8], [4.05, 14.9], [4.75, 16.3]], { pool: ['moon', 'life', 'frw', 'armor'], name: 'The Inner Leg (yin)' })
      ],
      notables: [
        { at: [0, -15.95], name: 'The Hundred Meetings', fx: { sun: 3, moon: 3 }, lore: 'The glass remembers his laugh by day. By night it remembers what he laughed at.' },
        { at: [0, -8.3], name: 'The Sea of Breath', fx: { poise: 8, life: 3 }, lore: 'The middle dantian. Fill it, and nothing knocks you over.' },
        { at: [13.5, -9.5], name: 'Lantern in the Fist', fx: { melee: 4, sun: 2 }, lore: 'His black-flame lantern reads brighter the deeper he walks.' },
        { at: [-13.5, -9.5], name: 'The Empty Laugh', fx: { melee: 4, frw: 1 }, lore: 'Ha. Once. It is enough.' },
        { at: [4.75, 16.3], name: 'The Bubbling Spring', fx: { frw: 2, poise: 6 }, lore: 'The first point of the kidney channel is in the sole. He walks barefoot so it can drink.' },
        { at: [-4.75, 16.3], name: 'The Barefoot Gate', fx: { moon: 3, life: 3 }, lore: 'Stone is honest to a bare foot.' },
        { at: [3.8, 8.8], name: 'Three Leagues More', fx: { frw: 1.5, con: 1 }, lore: 'The point below the knee that gives a tired walker three leagues more.' }
      ],
      keys: [{ at: [16.3, -9.62], page: 0 }, { at: [0, -17.4], page: 1 }, { at: [-16.3, -9.62], page: 2 }, { at: [6.2, 17.6], hyb: 0 }, { at: [-6.2, 17.6], hyb: 1 }]
    }
  };

  // ------------------------------------------------------------------ names for the small knots
  const NAMES = {
    life: ['Warm Under the Ash', 'The Second Heartbeat', 'Blood Kept Close', 'A Slow Pulse', 'The Wick Still Lit', 'Red Thread', 'Kept Warmth', 'Still Breathing'],
    ess: ['The Held Candle', 'Deep Well', 'A Full Censer', 'Still Water', 'The Lamp Unspent', 'Unspoken Word'],
    regen: ['The Wick Drinks', 'Slow Refilling', 'Rain in the Font', 'The Tide Returns', 'Seep'],
    armor: ['Rib Plate', 'The Lintel', 'Fitted Stone', 'Old Ivory', 'Kept-Bone Weave', 'The Counting Wall'],
    poise: ['Kneeler\'s Vow', 'Rooted Heel', 'Heavy Tread', 'Unbending Knee', 'Standing Stone', 'The Grieving Stone'],
    prec: ['Rise Again', 'Settled Dust', 'Kneel and Rise'],
    shard: ['A Shard Kept', 'Splinter Hoard', 'Loose Teeth', 'The Miscount'],
    dmg: ['The Sharpened Word', 'Bitter Hymn', 'Iron Psalm', 'A Hard Sermon', 'The Knell', 'Ink That Burns', 'The Last Verse'],
    melee: ['The Slow Hand', 'Knuckle and Bone', 'The Closed Fist', 'Weight of the Palm', 'A Heavy Blow', 'Iron Heel', 'The Wrapped Hand'],
    fcr: ['Quick Tongue', 'The Hurried Rite', 'Fast Fingers', 'The Half-Said Prayer', 'The Skipped Verse'],
    wisp: ['The Wisps Return', 'Wisp-Roost', 'Lantern Motes', 'Kindled Again'],
    res: ['Salt Line', 'The Warded Door', 'Paper Doll', 'Charm of Linen', 'Sealed Lips', 'The Closed Eye'],
    mf: ['The Gleaner\'s Eye', 'Graverobber\'s Luck', 'Coin on the Stone', 'Gleaner'],
    frw: ['Light Foot', 'The Pilgrim Road', 'Long Stride', 'Down the Lane', 'Unlingering'],
    lok: ['Taking Back', 'Last Warmth', 'The Drink After', 'What Spills', 'Communion'],
    bleed: ['The Weeping Rib', 'Slow Drip', 'The Wound Stays Open', 'Red Hands', 'The Drinking Kiss', 'The Unscabbed'],
    sick: ['Sour Wind', 'Fen Breath', 'Carrion Air', 'Iron and Incense', 'Lymph and Reed'],
    evade: ['Blur of Linen', 'Not Quite There', 'Step Aside', 'Shadow Lag', 'Half-Seen'],
    sun: ['Noon Bell', 'Glass That Remembers', 'White Hour'], moon: ['Black Glass', 'Lantern Out', 'Night Hands'],
    vit: ['The Stubborn Body', 'The Yoked Heart'], spi: ['The Inner Lamp', 'The Unbowed Mind'], con: ['Marrow Stock', 'The Iron Frame']
  };

  // ------------------------------------------------------------------ v103: the Outer Circle and the rungs, per order
  // arcs, in order: right hand -> right foot, foot -> foot, left foot -> left hand, left hand -> crown, crown -> right hand
  const RING = {
    animancer: { rung: ['fcr', 'dmg', 'ess'], arcs: [
      { pool: ['poise', 'ess', 'dmg'], name: 'The Thread Let Down', fx: { dmg: 3, poise: 6 }, lore: 'A thread runs from the hand that holds the anvil to the foot that walks away from it.' },
      { pool: ['ess', 'regen', 'frw'], name: 'Between Two Footfalls', fx: { regen: 5, frw: 1 }, lore: 'The dead walk in step. He walks between their steps, where no one is counting.' },
      { pool: ['dmg', 'fcr', 'ess'], name: 'The Hungry Thread', fx: { fcr: 3, ess: 3 }, lore: 'It pulls toward the blade. It always pulls toward the blade.' },
      { pool: ['fcr', 'wisp', 'dmg'], name: 'The Rebuke Sung Upward', fx: { dmg: 3, wisp: 5 }, lore: 'He answered the choir with a blade. The choir sang it back to him, sharper.' },
      { pool: ['wisp', 'ess', 'poise'], name: 'The Bell Over the Anvil', fx: { wisp: 5, poise: 5 }, lore: 'Strike the one, and the other answers. Nobody taught them this.' }] },
    ossumancer: { rung: ['shard', 'armor', 'poise'], arcs: [
      { pool: ['armor', 'poise', 'shard'], name: 'The Long Bone', fx: { armor: 8, poise: 4 }, lore: 'From the hand to the heel is one bone, if you count the way the Chapter counts.' },
      { pool: ['poise', 'con', 'armor'], name: 'The Pilgrim\'s Count', fx: { poise: 6, prec: 4 }, lore: 'Two hundred and six. He counts them walking, one to each step.' },
      { pool: ['shard', 'dmg', 'armor'], name: 'The Kin Road', fx: { shard: 2, armor: 6 }, lore: 'What the blood leaves on the bone, the bone keeps.' },
      { pool: ['dmg', 'shard', 'res'], name: 'The Chanted Arc', fx: { dmg: 3, shard: 2 }, lore: 'The grave-chant goes round the skull and comes back as a spear.' },
      { pool: ['armor', 'shard', 'dmg'], name: 'The Crown Weighed', fx: { armor: 6, dmg: 2 }, lore: 'A crown is only a ring of bone that learned to be heavy.' }] },
    hemomancer: { rung: ['bleed', 'life', 'lok'], arcs: [
      { pool: ['life', 'lok', 'bleed'], name: 'The Long Vein', fx: { life: 3, lok: 3 }, lore: 'It runs from the clutching hand to the sole, and it is warm the whole way.' },
      { pool: ['life', 'vit', 'regen'], name: 'The Tithe Walked', fx: { life: 3, regen: 5 }, lore: 'She walks the tithe to the altar on her own feet. She arrives lighter.' },
      { pool: ['bleed', 'dmg', 'life'], name: 'The Marrow-Kin Vein', fx: { bleed: 5, life: 2 }, lore: 'Blood set in bone. Bone set in blood. Neither will say which came first.' },
      { pool: ['dmg', 'bleed', 'ess'], name: 'The Red Arc', fx: { dmg: 3, bleed: 4 }, lore: 'The heart throws the blood upward. Some of it never comes down.' },
      { pool: ['lok', 'life', 'bleed'], name: 'The Crown of Veins', fx: { lok: 3, bleed: 4 }, lore: 'The Maiden wears her veins outside. She says it is cooler.' }] },
    miasmancer: { rung: ['sick', 'evade', 'res'], arcs: [
      { pool: ['sick', 'evade', 'res'], name: 'The Breath Let Go', fx: { sick: 5, evade: 1 }, lore: 'What the fan sends out, the feet walk through after.' },
      { pool: ['evade', 'frw', 'res'], name: 'The Two Winds Meet', fx: { evade: 1.5, frw: 1 }, lore: 'One wind for the widow, one for the veil. They meet at the ankle and argue.' },
      { pool: ['res', 'sick', 'mf'], name: 'The Widow\'s Sigh', fx: { res: 3, sick: 4 }, lore: 'She breathes out for him still. It has not reached him yet.' },
      { pool: ['sick', 'dmg', 'evade'], name: 'The Omen Carried Up', fx: { sick: 5, dmg: 2 }, lore: 'The omens rise with the smoke. The Reaper reads them from underneath.' },
      { pool: ['res', 'evade', 'regen'], name: 'The Mirror Breathed On', fx: { res: 3, regen: 4 }, lore: 'Breathe on the glass and the Hanged Man writes a name in it.' }] },
    monk: { rung: ['melee', 'sun', 'moon'], arcs: [
      { pool: ['melee', 'frw', 'poise'], name: 'The Palm to the Sole', fx: { melee: 3, frw: 1 }, lore: 'The strike begins in the heel. He only lets it out through the palm.' },
      { pool: ['frw', 'life', 'poise'], name: 'The Walking Meditation', fx: { frw: 1.5, poise: 5 }, lore: 'Left foot: the laugh. Right foot: what he laughed at.' },
      { pool: ['moon', 'melee', 'life'], name: 'The Black Channel', fx: { moon: 3, melee: 2 }, lore: 'The yin channel runs up the leg, through the empty hand, and out.' },
      { pool: ['sun', 'melee', 'poise'], name: 'The Noon Arc', fx: { sun: 3, melee: 2 }, lore: 'At noon the glass remembers everything at once.' },
      { pool: ['moon', 'sun', 'melee'], name: 'The Hundred Roads', fx: { sun: 2, moon: 2, melee: 1 }, lore: 'All the channels meet at the crown and argue about which way is down.' }] }
  };

  // ------------------------------------------------------------------ building a body's graph
  const GRAPHS = {};
  function build(cls) {
    const B = BODY[cls]; if (!B) return null;
    const out = {}, list = [], k = B.key, nameIx = {};
    const nm = s => { const L = NAMES[s] || ['A Minor Arcanum']; const i = nameIx[s] = (nameIx[s] || 0) + 1; return L[(i - 1) % L.length]; };
    const add = (id, kind, x, y, o) => { const n = Object.assign({ id, kind, x: x * F, y: y * F, fx: {}, links: new Set(), reg: k }, o || {}); out[id] = n; list.push(n); return n; };
    const link = (a, b) => { if (a && b && a !== b) { a.links.add(b.id); b.links.add(a.id); } };
    const near = (x, y, r) => { let best = null, bd = r * F; for (const n of list) { if (n.kind === 'key') continue; const d = Math.hypot(n.x - x * F, n.y - y * F); if (d < bd) { bd = d; best = n; } } return best; };
    let seq = 0;
    add(`w_${k}_root`, 'root', B.root[0], B.root[1], { name: B.title + ': the gate', area: B.title });
    for (const p of B.paths) {
      const pts = p.pts, sp = p.sp || 1.25, pool = p.pool || ['life'];
      // walk the polyline, dropping a node every `sp`
      const L = []; let acc = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); acc += d; }
      const n = Math.max(1, Math.round(acc / sp)), spots = [];
      for (let j = 0; j <= n; j++) { let d = acc * j / n, i = 0; while (i < L.length - 1 && d > L[i]) { d -= L[i]; i++; } const t = L[i] ? d / L[i] : 0; spots.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]); }
      if (p.closed) spots.pop();
      let prev = null, first = null, pi = 0;
      spots.forEach((s, j) => {
        const end = j === 0 || j === spots.length - 1;
        let node = end ? near(s[0], s[1], 0.42) : null;
        if (!node) { const st = pool[pi++ % pool.length]; node = add(`w_${k}_${seq++}`, 'peg', s[0], s[1], { stat: st, fx: { [st]: V[st] || 1 }, name: nm(st), area: p.name || B.title }); }
        if (prev) link(prev, node); prev = node; if (!first) first = node;
      });
      if (p.closed && first && prev) link(prev, first);
    }
    for (const nt of B.notables) { const n = near(nt.at[0], nt.at[1], 1.2); if (!n || n.kind === 'root' && nt.at[0] !== B.root[0]) continue; if (n.kind === 'root') { n.fx = nt.fx; n.name = nt.name; n.lore = nt.lore; continue; } n.kind = 'notable'; n.name = nt.name; n.fx = nt.fx; n.lore = nt.lore; delete n.stat; }
    // ---- the cards live on the same body, on the same roads (v0.53: "combine the arcana and web into a single system").
    // Each page's cluster flowers out past its keystone point (a hand, the crown, a foot, a fan...): two minors on a
    // trunk, then a branch per major with the rest of the minors, the major at the tip. Hybrids stand by the feet; the
    // Void's cards sit at the order's seat, behind the gate.
    const def = typeof WEB_DEF !== 'undefined' ? WEB_DEF[cls] : null;
    const knotNear = (x, y) => { let best = null, bd = 1e9; for (const m of list) { if (m.kind === 'card') continue; const d = Math.hypot(m.x - x * F, m.y - y * F); if (d < bd) { bd = d; best = m; } } return best; };
    const card = (id, x, y) => { if (!ARC[id] || out[id]) return out[id] || null; return add(id, 'card', x, y, { card: id, name: ARC[id].name, area: B.title }); };
    if (def) {
      def.clusters.forEach(c => {
        const kk = B.keys.find(q => q.page === c.page); if (!kk) return;
        const at = knotNear(kk.at[0], kk.at[1]); if (!at) return;
        const ax = at.x / F, ay = at.y / F; let dx = kk.at[0] - ax, dy = kk.at[1] - ay; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const nx = -dy, ny = dx, pos = (r, off) => [ax + dx * r + nx * off * Math.min(1, Math.max(0, (r - 2.2) / 2.0)), ay + dy * r + ny * off * Math.min(1, Math.max(0, (r - 2.2) / 2.0))];
        const t0 = card(c.minors[0], ...pos(1.2, 0)), t1 = card(c.minors[1], ...pos(2.3, 0)); link(at, t0); link(t0, t1);
        const m = c.majors.length, rest = c.minors.slice(2), br = c.majors.map(() => []); rest.forEach((mi, i) => br[i % m].push(mi));
        c.majors.forEach((mj, bi) => {
          const off = m > 1 ? (bi / (m - 1) - 0.5) * 1.35 * (m - 1) : 0; let prev = t1, r = 2.3;
          for (const mi of br[bi]) { r += 1.15; const q = card(mi, ...pos(r, off)); link(prev, q); prev = q; }
          r += 1.35; const q = card(mj, ...pos(r, off)); link(prev, q);
        });
      });
      (def.hybrids || []).forEach((h, i) => { const kk = B.keys.find(q => q.hyb === i); if (!kk) return; const n = card(h, kk.at[0], kk.at[1]); link(n, knotNear(kk.at[0], kk.at[1] - 1.2)); });
      // the Void, at the seat: two hollow steps from the gate, then its four cards fanned over the order's organ
      const rt = out[`w_${k}_root`], bx = B.box, cx = (bx.x0 + bx.x1) / 2, cy = (bx.y0 + bx.y1) / 2;
      let vx = cx - B.root[0], vy = cy - B.root[1]; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      const hs = card('h_step', B.root[0] + vx * 1.2, B.root[1] + vy * 1.2), hq = card('h_quiet', B.root[0] + vx * 2.4, B.root[1] + vy * 2.4);
      if (hs && hq) { link(rt, hs); link(hs, hq);
        ['v_unwritten', 'v_crown', 'v_silence', 'v_unmade'].forEach((v, i) => { const a = Math.atan2(vy, vx) + (i / 3 - 0.5) * 1.9; const n = card(v, B.root[0] + vx * 2.4 + Math.cos(a) * 1.5, B.root[1] + vy * 2.4 + Math.sin(a) * 1.5); if (n) link(hq, n); }); }
      // ---- v103 (user: "arcana building needs more pathways between majors"): the Majors were dead ends at the tips
      // of their pages. Two new kinds of road make them crossroads:
      //  * the rungs: each page's Majors are joined side by side, one small knot between neighbours, so a held Major
      //    opens its sisters without walking back down the branch;
      //  * the Outer Circle: a road just outside the plate's ring joins the pages and the hybrids all the way round
      //    (crown, hand, foot, foot, hand), from the Major nearest each neighbour. Each arc has a great knot at its
      //    middle. A held Major is a place a road may begin, so the circle lets a build walk from page to page.
      const cen = [0, -1.2], RC = RING[cls] || RING.animancer;
      const stations = [];
      def.clusters.forEach(c => {
        const ms = c.majors.map(id => out[id]).filter(Boolean); if (!ms.length) return;
        for (let i = 0; i + 1 < ms.length; i++) {
          const a = ms[i], b = ms[i + 1], mx = (a.x + b.x) / 2 / F, my = (a.y + b.y) / 2 / F;
          let ox = mx - cen[0], oy = my - cen[1]; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
          const st = RC.rung[i % RC.rung.length], rung = add(`w_${k}_rung${c.page}_${i}`, 'peg', mx + ox * 0.55, my + oy * 0.55, { stat: st, fx: { [st]: V[st] || 1 }, name: nm(st), area: 'The Rungs' });
          link(a, rung); link(rung, b);
        }
        const cx = ms.reduce((t, n) => t + n.x, 0) / ms.length / F, cy = ms.reduce((t, n) => t + n.y, 0) / ms.length / F;
        stations.push({ nodes: ms, ang: Math.atan2(cy - cen[1], cx - cen[0]) });
      });
      (def.hybrids || []).forEach(h => { const n = out[h]; if (n) stations.push({ nodes: [n], ang: Math.atan2(n.y / F - cen[1], n.x / F - cen[0]) }); });
      stations.sort((a, b) => a.ang - b.ang);   // from the left hand round (arcs are rotated by 3 so arcs[0] is right hand -> right foot)
      const pol2 = n => ({ a: Math.atan2(n.y / F - cen[1], n.x / F - cen[0]), r: Math.hypot(n.x / F - cen[0], n.y / F - cen[1]) });
      stations.forEach((S1, si) => {
        const S2 = stations[(si + 1) % stations.length]; if (S1 === S2) return;
        // the facing Majors: the one in each station nearest the other station, going round
        let a1 = S1.ang, a2 = S2.ang; if (a2 <= a1) a2 += Math.PI * 2;
        const pick = (S, want) => S.nodes.reduce((b, n) => { let d = Math.abs(((pol2(n).a - want) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return !b || d < b.d ? { n, d } : b; }, null).n;
        const e1 = pick(S1, a2), e2 = pick(S2, a1), p1 = pol2(e1), p2 = pol2(e2);
        let b1 = p1.a, b2 = p2.a; if (b2 <= b1) b2 += Math.PI * 2;
        const R0 = Math.max(p1.r, p2.r, 19.5) + 0.8, span = (b2 - b1) * R0, n = Math.max(3, Math.round(span / 2.8));
        const A = RC.arcs[(si + 3) % RC.arcs.length], pool = A.pool; let prev = e1, mid = Math.floor(n / 2);
        for (let j = 1; j < n; j++) {
          const t = j / n, ang = b1 + (b2 - b1) * t, rr = (p1.r + (p2.r - p1.r) * t) * (1 - Math.sin(t * Math.PI)) + R0 * Math.sin(t * Math.PI);
          const x = cen[0] + Math.cos(ang) * rr, y = cen[1] + Math.sin(ang) * rr;
          let node;
          if (j === mid) node = add(`w_${k}_circ${si}_n`, 'notable', x, y, { name: A.name, fx: A.fx, lore: A.lore, area: 'The Outer Circle' });
          else { const st = pool[(j - 1) % pool.length]; node = add(`w_${k}_circ${si}_${j}`, 'peg', x, y, { stat: st, fx: { [st]: V[st] || 1 }, name: nm(st), area: 'The Outer Circle' }); }
          link(prev, node); prev = node;
        }
        link(prev, e2);
      });
    }
    return out;
  }
  let builtFor = null;
  function ensureGraph() {
    const cls = typeof P !== 'undefined' && P ? P.cls : null; if (!cls || builtFor === cls) return;
    const g = GRAPHS[cls] || (GRAPHS[cls] = build(cls)); if (!g) return;
    for (const id in N) delete N[id];
    for (const id in g) N[id] = g[id];
    builtFor = cls;
    refundThreads();
    try { if (P.arc && P.arc.web) PW.prune(); } catch (e) { }
  }
  const BOD = () => BODY[P.cls] || BODY.animancer;
  // cards are reached along the body's roads: from the gate, a tied knot, or a card you hold
  if (typeof arcReachable === 'function') {
    const _ar = arcReachable;
    arcReachable = function (id) {
      try { ensureGraph(); } catch (e) { }
      const n = N[id]; if (!n || n.kind !== 'card') return _ar(id);
      const T = PW.st().taken, A = PW.anchors();
      for (const l of n.links) if (A.has(l) || T[l]) return true;
      return false;
    };
  }
  // the card web's threads are gone (the body's knots do their work): give their Arcana back
  function refundThreads() { try { if (!P.arc || !P.arc.taken) return; for (const k in P.arc.taken) if (ARC[k] && ARC[k].kind === 'thread') { delete P.arc.taken[k]; P.arc.pts = (P.arc.pts | 0) + 1; } } catch (e) { } }
  // the old shared web's roads between limbs are gone; nothing here needs a via-path
  const VIA = {};

  // ------------------------------------------------------------------ the class's cards, at its own seat
  const CW = {};
  function cardPos() {
    const W_ = typeof web === 'function' ? web() : null; if (!W_) return null;
    if (CW[P.cls]) return CW[P.cls];
    const bx = BOD().box, BOX = { x0: bx.x0 * F, x1: bx.x1 * F, y0: bx.y0 * F, y1: bx.y1 * F };
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const id in W_) { const n = W_[id]; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
    const k = Math.min((BOX.x1 - BOX.x0) / Math.max(1, x1 - x0), (BOX.y1 - BOX.y0) / Math.max(1, y1 - y0));
    const ox = (BOX.x0 + BOX.x1) / 2 - (x0 + x1) / 2 * k, oy = (BOX.y0 + BOX.y1) / 2 - (y0 + y1) / 2 * k;
    const out = { k }; for (const id in W_) out[id] = { x: ox + W_[id].x * k, y: oy + W_[id].y * k };
    return (CW[P.cls] = out);
  }

  // ------------------------------------------------------------------ ink, paper, and the engraved plate
  const INK = '#1a130d', INK2 = '#3f3022', SYS = '#5a4430', FAINT = '#7a654a', GOLD = '#b8862a', GOLDH = '#e0b458', RUB = '#9a2616';
  const TINT = { oss: '#5c4a2c', hem: '#8a1c22', shr: '#553a74', kus: '#7a5a12', ani: '#28506e', hub: INK2 };
  const hsh = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let PAPER = null;
  function paperTile() {
    if (PAPER) return PAPER;
    const S = 96, c = mkCanvas(S, S), x = c.getContext('2d');
    for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) {
      const w = (a, b) => hsh(((a % S) + S) % S, ((b % S) + S) % S);
      const n = w(X >> 1, Y >> 1) * 0.45 + w((X >> 2) + 50, (Y >> 2) + 99) * 0.35 + w((X >> 3) + 7, (Y >> 3) + 3) * 0.2;
      x.fillStyle = hsh(X * 7 + 3, Y * 13 + 1) < 0.006 ? '#8a7452' : n < 0.3 ? '#a69472' : n < 0.7 ? '#b09e7b' : '#baa985';
      x.fillRect(X, Y, 1, 1);
    }
    return (PAPER = c);
  }
  // the body outline, figure units (right half; mirrored)
  const HALF = [[0.95, -10.95], [1.05, -10.15], [2.2, -9.95], [3.45, -9.95], [5.0, -10.3], [8.3, -10.05], [12.25, -10.0], [12.8, -10.55], [13.2, -10.5], [13.1, -10.1], [14.35, -10.2], [15.0, -9.85], [14.4, -9.4], [12.95, -9.2], [12.25, -9.35], [8.3, -9.02], [5.0, -8.78], [3.25, -8.35], [3.1, -7.0], [2.62, -4.2], [2.35, -1.8], [2.85, 0.5], [3.1, 1.8], [3.2, 3.5], [3.4, 6.4], [3.8, 8.8], [4.1, 11.5], [4.45, 14.55], [5.95, 16.05], [5.95, 16.6], [3.9, 16.62], [3.95, 15.1], [3.5, 12.0], [2.9, 8.9], [1.25, 5.4], [0, 3.85]];
  const OUTLINE = HALF.concat(HALF.slice().reverse().map(p => [-p[0], p[1]]));
  const PLATES = {}, EXT = { x0: -21 * F, x1: 21 * F, y0: -26.5 * F, y1: 20.5 * F };
  function plate(R) {
    const cls = P.cls, key = cls + ':' + R; if (PLATES[key]) return PLATES[key];
    const B = BOD();
    const Wp = Math.ceil((EXT.x1 - EXT.x0) * R), Hp = Math.ceil((EXT.y1 - EXT.y0) * R);
    const X = x => (x * F - EXT.x0) * R, Y = y => (y * F - EXT.y0) * R, U = F * R;   // figure units -> plate px
    const mk = () => { const c = mkCanvas(Wp, Hp), g = c.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.fillStyle = '#fff'; return [c, g]; };
    // 1) the silhouette
    const [mc, mg] = mk(); mg.beginPath(); OUTLINE.forEach((p, i) => i ? mg.lineTo(X(p[0]), Y(p[1])) : mg.moveTo(X(p[0]), Y(p[1]))); mg.closePath(); mg.fill();
    mg.beginPath(); mg.ellipse(X(0), Y(-13.3), 2.0 * U, 2.55 * U, 0, 0, 6.2832); mg.fill();
    const md = mg.getImageData(0, 0, Wp, Hp).data, M = new Uint8Array(Wp * Hp); for (let i = 0; i < M.length; i++) M[i] = md[i * 4 + 3] >= 128 ? 1 : 0;
    const m = (x, y) => x >= 0 && y >= 0 && x < Wp && y < Hp && M[y * Wp + x] === 1;
    // 2) three line layers: strong detail (lg), the order's system (sg), faint (fg)
    const [lc, lg] = mk(), [sc, sg] = mk(), [fc, fg] = mk();
    const lw = Math.max(1, R / 5), lw2 = Math.max(1, R / 7);
    const line = (g, pts, w) => { g.lineWidth = w || lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); };
    const arc = (g, cx, cy, r, a0, a1, w) => { g.lineWidth = w || lw; g.beginPath(); g.arc(X(cx), Y(cy), r * U, a0, a1); g.stroke(); };
    const ell = (g, cx, cy, rx, ry, w, fill) => { g.lineWidth = w || lw; g.beginPath(); g.ellipse(X(cx), Y(cy), rx * U, ry * U, 0, 0, 6.2832); fill ? g.fill() : g.stroke(); };
    const poly = (g, pts, fill, w) => { g.lineWidth = w || lw; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); fill ? g.fill() : g.stroke(); };
    const rnd = (i, j) => hsh(i * 17 + 3, j * 31 + 7);
    // the face and body details common to every plate
    if (B.system !== 'nerve') { line(lg, [[-1.15, -13.35], [-0.85, -13.2], [-0.45, -13.35]]); line(lg, [[0.45, -13.35], [0.85, -13.2], [1.15, -13.35]]); line(lg, [[0, -13.0], [-0.15, -12.2], [0.15, -12.1]]); line(lg, [[-0.45, -11.6], [0, -11.52], [0.45, -11.6]]); }
    for (const s of [1, -1]) {
      for (const fy of [-9.95, -9.72, -9.5]) line(lg, [[13.3 * s, fy], [14.55 * s, fy + 0.05]], lw2);
      for (const tx of [4.4, 4.9, 5.4]) line(lg, [[tx * s, 16.05], [(tx + 0.1) * s, 16.55]], lw2);
      if (B.system !== 'bone') { arc(lg, 3.3 * s, 8.75, 0.45, 0.2, 2.9); line(lg, [[2.65 * s, 0.95], [1.4 * s, 2.35], [0.55 * s, 3.3]]); }
    }
    // the order's own system, drawn the way its order sees the body
    const paths = B.paths;
    if (B.system === 'bone') {
      // bones as long capsules with knobbed ends; the skull and the pelvis drawn whole
      for (const p of paths) {
        if (p.name === 'The Skull') continue;
        const pts = p.pts, wd = p.name === 'The Femur' ? 0.3 : p.name === 'The Spine' ? 0.26 : p.name === 'The Ribs' ? 0.12 : p.name === 'The Humerus' ? 0.22 : 0.15;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * wd, ny = dx / l * wd;
          line(sg, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]]); line(sg, [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]]);
        }
        const e = pts[pts.length - 1], s0 = pts[0]; ell(sg, e[0], e[1], wd * 1.5, wd * 1.5); if (p.name !== 'The Ribs') ell(sg, s0[0], s0[1], wd * 1.4, wd * 1.4);
      }
      for (let y = -10.4; y < -1.4; y += 0.55) line(sg, [[-0.32, y], [0.32, y]], lw2);   // the vertebrae
      // the skull: cranium, sockets, the nose, the teeth
      ell(sg, 0, -13.6, 1.95, 2.2); ell(sg, -0.8, -13.2, 0.5, 0.45); ell(sg, 0.8, -13.2, 0.5, 0.45);
      poly(sg, [[0, -12.7], [-0.25, -12.15], [0.25, -12.15]]); line(sg, [[-0.9, -11.55], [0.9, -11.55]]); for (let i = -3; i <= 3; i++) line(sg, [[i * 0.25, -11.75], [i * 0.25, -11.35]], lw2);
      // the pelvis under the cards
      poly(sg, [[-2.7, -0.3], [-1.5, -1.0], [0, -0.4], [1.5, -1.0], [2.7, -0.3], [2.6, 1.6], [1.4, 3.0], [0, 2.4], [-1.4, 3.0], [-2.6, 1.6]]); ell(sg, -1.3, 1.7, 0.55, 0.6); ell(sg, 1.3, 1.7, 0.55, 0.6);
      for (const s of [1, -1]) ell(sg, 3.25 * s, 8.75, 0.42, 0.38);   // kneecaps
    } else if (B.system === 'blood') {
      // vessels as tapering double lines with small branches; the heart drawn under the cards
      for (const p of paths) {
        const pts = p.pts, vein = /Vein|Saphenous/.test(p.name), wd = p.name === 'The Aorta' ? 0.22 : vein ? 0.08 : 0.12;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * wd, ny = dx / l * wd;
          line(sg, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]]); line(sg, [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]]);
          const nb = Math.floor(l / 0.9);
          for (let j = 1; j <= nb; j++) { const t = j / (nb + 1), px = a[0] + dx * t, py = a[1] + dy * t, sd = rnd(i * 13 + j, pts.length + (p.name || '').length) < 0.5 ? 1 : -1, bl = 0.35 + rnd(j, i) * 0.4; line(fg, [[px, py], [px + dx / l * bl * 0.6 + sd * -dy / l * bl, py + dy / l * bl * 0.6 + sd * dx / l * bl]], lw2); }
        }
      }
      // the heart
      const hx = 0.5, hy = -5.7;
      poly(sg, [[hx - 1.9, hy - 1.2], [hx - 1.2, hy - 2.2], [hx - 0.2, hy - 2.0], [hx + 0.5, hy - 2.5], [hx + 1.6, hy - 2.1], [hx + 2.1, hy - 0.9], [hx + 1.7, hy + 0.9], [hx + 0.6, hy + 2.1], [hx - 0.4, hy + 1.2], [hx - 1.6, hy + 0.2]]);
      line(sg, [[hx - 0.2, hy - 2.0], [hx + 0.2, hy - 0.2], [hx + 0.6, hy + 2.1]]); line(sg, [[hx - 0.3, hy - 2.1], [hx - 0.6, hy - 3.1]], lw); line(sg, [[hx + 0.4, hy - 2.4], [hx + 0.1, hy - 3.2]], lw);
    } else if (B.system === 'nerve') {
      // nerves as single lines with twigs; the brain under the cards; the threads above as fine warp lines
      for (const p of paths) {
        const pts = p.pts, thread = /Warp|Threads|Loose|Weft/.test(p.name);
        line(thread ? fg : sg, pts, thread ? lw2 : lw);
        if (thread) continue;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nb = Math.floor(l / 0.7);
          for (let j = 1; j <= nb; j++) { const t = j / (nb + 1), px = a[0] + dx * t, py = a[1] + dy * t, sd = (j % 2) ? 1 : -1, bl = 0.3 + rnd(j, i) * 0.3; const qx = px + dx / l * bl * 0.7 + sd * -dy / l * bl, qy = py + dy / l * bl * 0.7 + sd * dx / l * bl; line(fg, [[px, py], [qx, qy]], lw2); line(fg, [[qx, qy], [qx + dx / l * 0.15 + sd * 0.1, qy + dy / l * 0.15 - 0.08]], lw2); }
        }
      }
      // the brain inside the skull, with its folds, and the two eyes looking inward
      ell(sg, 0, -13.9, 1.7, 1.75);
      for (let i = 0; i < 7; i++) { const y = -15.2 + i * 0.4, w = Math.sqrt(Math.max(0, 1 - Math.pow((y + 13.9) / 1.75, 2))) * 1.55; const pts = []; for (let xx = -w; xx <= w; xx += 0.2) pts.push([xx, y + Math.sin(xx * 5 + i) * 0.1]); if (pts.length > 1) line(fg, pts, lw2); }
      line(sg, [[0, -15.6], [0, -12.2]], lw2);
      ell(lg, -0.8, -12.6, 0.28, 0.16); ell(lg, 0.8, -12.6, 0.28, 0.16);
      // the loom's frame above the head
      line(fg, [[-4.4, -21.9], [4.4, -21.9]]); line(fg, [[-4.4, -16.9], [-4.4, -21.9]]); line(fg, [[4.4, -16.9], [4.4, -21.9]]);
    } else if (B.system === 'breath') {
      // breath as a chain of curls along each path; the lungs and their branching tree under the cards
      for (const p of paths) {
        const pts = p.pts; let acc = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
          for (let d = 0; d < l; d += 0.7) { const t = d / l, px = a[0] + dx * t, py = a[1] + dy * t, ang = Math.atan2(dy, dx); acc++; g_curl(sg, px, py, ang, acc); }
        }
      }
      // two lungs
      for (const s of [1, -1]) {
        poly(sg, [[0.45 * s, -8.2], [1.7 * s, -8.4], [2.55 * s, -7.1], [2.7 * s, -5.0], [2.4 * s, -3.6], [1.2 * s, -3.7], [0.5 * s, -4.6]]);
        line(fg, [[0.15 * s, -8.3], [1.0 * s, -6.8], [1.6 * s, -5.4], [1.9 * s, -4.4]], lw2); line(fg, [[1.0 * s, -6.8], [2.0 * s, -6.6]], lw2); line(fg, [[1.6 * s, -5.4], [1.2 * s, -4.4]], lw2);
      }
      line(sg, [[0, -10.9], [0, -8.4]]); line(sg, [[0, -8.4], [0.45, -8.2]]); line(sg, [[0, -8.4], [-0.45, -8.2]]);
      // the fan in the open hand
      for (let i = 0; i < 7; i++) { const a = (-150 + i * 20) * Math.PI / 180; line(sg, [[-14.8, -9.6], [-14.8 + Math.cos(a) * 1.9, -9.6 + Math.sin(a) * 1.9]], lw2); }
      arc(sg, -14.8, -9.6, 1.9, -150 * Math.PI / 180, -30 * Math.PI / 180);
    } else {
      // channels as dotted lines with a ring at every point; the dantian as a small flame in a circle
      for (const p of paths) {
        const pts = p.pts;
        for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; for (let d = 0; d < l; d += 0.3) ell(sg, a[0] + dx * d / l, a[1] + dy * d / l, 0.05, 0.05, lw, true); }
        for (const q of pts) ell(fg, q[0], q[1], 0.22, 0.22);
      }
      ell(sg, 0, -0.4, 1.35, 1.35); ell(fg, 0, -0.4, 1.7, 1.7);
      poly(sg, [[0, -1.5], [0.55, -0.6], [0.35, 0.3], [0, 0.55], [-0.35, 0.3], [-0.55, -0.6]]);
      ell(sg, 0, -8.3, 0.7, 0.7); ell(sg, 0, -14.6, 0.45, 0.45);   // the middle and upper dantian
      for (const s of [1, -1]) { ell(sg, 4.75 * s, 16.3, 0.3, 0.2); ell(sg, 13.5 * s, -9.5, 0.25, 0.25); }
    }
    function g_curl(g, px, py, ang, i) { const r = 0.2, s = i % 2 ? 1 : -1; g.lineWidth = lw2; g.beginPath(); g.arc(X(px), Y(py), r * U, ang + s * 0.3, ang + s * 0.3 + (s > 0 ? 4.4 : -4.4), s < 0); g.stroke(); }
    // the circle of the old plates, faint, and its degree marks
    const C = [0, -1.2];
    arc(fg, C[0], C[1], 16.9, 0, 6.2832); arc(fg, C[0], C[1], 17.35, 0, 6.2832);
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r0 = i % 6 === 0 ? 17.35 : 17.1; line(fg, [[C[0] + Math.cos(a) * 16.9, C[1] + Math.sin(a) * 16.9], [C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0]]); }
    // 3) compose: outline ink, the lines, lower-right hatching inside the body; transparent elsewhere (paper under)
    const out = mkCanvas(Wp, Hp), og = out.getContext('2d'), img = og.createImageData(Wp, Hp), D = img.data;
    const ld = lg.getImageData(0, 0, Wp, Hp).data, sd = sg.getImageData(0, 0, Wp, Hp).data, fd = fg.getImageData(0, 0, Wp, Hp).data;
    const HX = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const cINK = HX(INK), cINK2 = HX(INK2), cSYS = HX(SYS), cF = HX(FAINT);
    const put = (i, c, a) => { D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = a == null ? 255 : a; };
    const HT = Math.max(2, Math.round(R * 0.5)), ow = R >= 10 ? 2 : 1;
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      const i = y * Wp + x, inn = M[i];
      if (inn) {
        let edge = false; for (let k = 1; k <= ow && !edge; k++) if (!m(x - k, y) || !m(x + k, y) || !m(x, y - k) || !m(x, y + k)) edge = true;
        if (edge) { put(i, cINK); continue; }
        if (ld[i * 4 + 3] >= 110) { put(i, cINK2); continue; }
        if (sd[i * 4 + 3] >= 110) { put(i, cSYS); continue; }
        if (fd[i * 4 + 3] >= 110) { put(i, cF, 230); continue; }
        let d = 99; for (let k = 1; k <= HT; k++) if (!m(x + k, y + k) || !m(x + k, y)) { d = k; break; }
        if (d <= HT) { const dense = d <= HT / 2; if (((x - y) & (dense ? 1 : 3)) === 0 && (dense || ((x + y) & 1) === 0)) put(i, cINK2, dense ? 190 : 140); }
      } else if (sd[i * 4 + 3] >= 110) put(i, cSYS, 235);
      else if (fd[i * 4 + 3] >= 110) put(i, cF, 215);
    }
    og.putImageData(img, 0, 0);
    return (PLATES[key] = out);
  }
  const LEVELS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
  function plateFor(z) { let best = LEVELS[0]; for (const L of LEVELS) if (Math.abs(Math.log(L / z)) < Math.abs(Math.log(best / z))) best = L; return best; }

  // ------------------------------------------------------------------ pixel drawing helpers (crisp, no smoothing)
  function disc(x, y, r, col) { ctx.fillStyle = col; const R = Math.max(0.5, r), X = Math.round(x), Y = Math.round(y), n = Math.ceil(R); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.35); if (w <= 0 && dy) continue; ctx.fillRect(X - w, Y + dy, w * 2 + 1, 1); } }
  function ring(x, y, r, col) { ctx.fillStyle = col; const X = Math.round(x), Y = Math.round(y), R = Math.max(1, Math.round(r)); let px = R, py = 0, e = 1 - R; while (px >= py) { for (const [a, b] of [[px, py], [py, px], [-py, px], [-px, py], [-px, -py], [-py, -px], [py, -px], [px, -py]]) ctx.fillRect(X + a, Y + b, 1, 1); py++; if (e < 0) e += 2 * py + 1; else { px--; e += 2 * (py - px) + 1; } } }
  function seg(x0, y0, x1, y1, col, w, dash) {
    ctx.fillStyle = col; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    const o = w >= 2 ? (dx > -dy ? [0, 1] : [1, 0]) : null;
    for (let g = 0; g < 4000; g++) { if (!dash || (n++ % dash[0]) < dash[1]) { ctx.fillRect(x0, y0, 1, 1); if (o) ctx.fillRect(x0 + o[0], y0 + o[1], 1, 1); } if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }

  // ------------------------------------------------------------------ the view
  const view = { z: 3.2, cx: 0, cy: -1 * F, init: '' };
  let vp = { x: 0, y: 0, w: 1, h: 1 }, hover = null, hoverCard = null, showSums = false, drag = null;
  const toS = (x, y) => ({ x: vp.x + vp.w / 2 + (x - view.cx) * view.z, y: vp.y + vp.h / 2 + (y - view.cy) * view.z });
  const toW = (sx, sy) => ({ x: view.cx + (sx - vp.x - vp.w / 2) / view.z, y: view.cy + (sy - vp.y - vp.h / 2) / view.z });
  const ZMIN = 2.6, ZMAX = 34;
  function clampView() { view.cx = Math.max(EXT.x0 + 4, Math.min(EXT.x1 - 4, view.cx)); view.cy = Math.max(EXT.y0 + 4, Math.min(EXT.y1 - 4, view.cy)); }
  function home(whole) {
    const R = REG.find(r => r.cls === P.cls);
    if (whole || !R) {
      // fit every node of this body, with a little paper round it
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const id in N) { const n = N[id]; x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y); }
      if (x0 > x1) { x0 = -20 * F; x1 = 20 * F; y0 = -24 * F; y1 = 20 * F; }
      y1 = Math.max(y1, 19.8 * F);   // the title under the feet
      view.z = Math.max(ZMIN, Math.min(ZMAX, Math.min(vp.w / (x1 - x0 + 4 * F), vp.h / (y1 - y0 + 3 * F)))); view.cx = (x0 + x1) / 2; view.cy = (y0 + y1) / 2;
    }
    else { const bx = BOD().box; view.z = 13; view.cx = (bx.x0 + bx.x1) / 2 * F; view.cy = (bx.y0 + bx.y1) / 2 * F; }
    clampView(); view.init = P.cls;
  }
  function zoomAt(sx, sy, k) { const w = toW(sx, sy); view.z = Math.max(ZMIN, Math.min(ZMAX, view.z * k)); view.cx = w.x - (sx - vp.x - vp.w / 2) / view.z; view.cy = w.y - (sy - vp.y - vp.h / 2) / view.z; clampView(); }
  const isOpen = () => G.panels && G.panels.arcana && G.arcTab === 'body' && G.running !== false;

  // ------------------------------------------------------------------ drawing the board
  const isPeg = n => n && (n.kind === 'peg' || n.kind === 'notable' || n.kind === 'root');
  function nodeR(n, z) { const s = Math.max(0.45, Math.min(2.2, z / 7)); return n.kind === 'card' ? (ARC[n.card] && (ARC[n.card].kind === 'major' || ARC[n.card].kind === 'void') ? 5 * s : 3.4 * s) : n.kind === 'notable' ? 4.2 * s : n.kind === 'root' ? 3.8 * s : n.kind === 'key' ? 4 * s : 2.3 * s; }
  function cardHit(mx, my) {
    const C = cardPos(); if (!C) return null; const W_ = web(); let best = null, bd = 1e9;
    const cw = cardSize().w;
    for (const id in W_) { if (id === 'heart') continue; const q = toS(C[id].x, C[id].y), d = Math.hypot(q.x - mx, q.y - my); if (d < Math.max(4, cw * 0.75) && d < bd) { bd = d; best = id; } }
    return best;
  }
  function nodeHit(mx, my) {
    let best = null, bd = 1e9;
    for (const id in N) { const n = N[id], q = toS(n.x, n.y), d = Math.hypot(q.x - mx, q.y - my), rr = Math.max(4, nodeR(n, view.z) + 2); if (d < rr && d < bd) { bd = d; best = id; } }
    return best;
  }
  // a card is drawn a little smaller than the gap between cards, so the chest never turns into a pile
  const cardSize = () => { const gap = 1.15 * F * view.z; const w = Math.max(3, Math.min(13, Math.round(gap * 0.5))) | 1; return { w, h: Math.round(w * 1.45) }; };
  function inkCard(x, y, w, h, o) {
    const X = Math.round(x - w / 2), Y = Math.round(y - h / 2);
    ctx.fillStyle = o.void ? '#2a2019' : '#c9b893'; ctx.fillRect(X, Y, w, h);
    ctx.fillStyle = o.held ? GOLD : INK; ctx.fillRect(X, Y, w, 1); ctx.fillRect(X, Y + h - 1, w, 1); ctx.fillRect(X, Y, 1, h); ctx.fillRect(X + w - 1, Y, 1, h);
    if (o.held) { ctx.fillStyle = INK; ctx.fillRect(X - 1, Y - 1, w + 2, 1); ctx.fillRect(X - 1, Y + h, w + 2, 1); ctx.fillRect(X - 1, Y, 1, h); ctx.fillRect(X + w, Y, 1, h); }
    if (w >= 7) { ctx.fillStyle = o.void ? '#8a6ab0' : INK2; ctx.fillRect(X + 2, Y + 2, w - 4, 1); ctx.fillRect(X + 2, Y + h - 3, w - 4, 1); }
    // the mark: a triangle, point up (upright) or down (reversed)
    const up = o.orient !== 'r', cx = X + Math.floor(w / 2), cy = Y + Math.floor(h / 2), n = Math.max(1, Math.floor(w / 4));
    ctx.fillStyle = o.void ? '#b48ad9' : o.held ? '#6a1a12' : INK;
    for (let i = 0; i <= n; i++) ctx.fillRect(cx - i, up ? cy - n + i * 2 - 1 : cy + n - i * 2, i * 2 + 1, 1);
    if (o.orient === 'r') { ctx.fillStyle = RUB; ctx.fillRect(X + w - 3, Y + 1, 2, 2); }
    if (o.both) { ctx.fillStyle = '#7a4ab0'; ctx.fillRect(X + 1, Y + 1, 2, 2); ctx.fillRect(X + w - 3, Y + h - 3, 2, 2); }
  }
  function drawBoard() {
    const p = AP;
    ensureGraph();
    // frame and header, in the game's own dark UI
    ctx.fillStyle = '#0a090e'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
    ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('The Inverted Triune', p.x + 8, p.y + 17);
    const ap = P.arc ? P.arc.pts : 0, kn = PW.avail();
    let hx = p.x + 190; const hd = (s2, col) => { txt(s2, hx, p.y + 15, col, 'left', false); hx += tw(s2) + 10; };
    hd(`Major ${ap}`, ap > 0 ? '#d9a441' : '#6f6a79'); hd(`Minor ${kn}`, kn > 0 ? '#d9a441' : '#6f6a79'); hd(`${PW.spent()} Minor laid · ${typeof arcSpent === 'function' ? arcSpent() : 0} Major`, '#8f8a7c');
    txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.arcana = false; });
    const RW = 150;
    vp = { x: p.x + 4, y: p.y + 22, w: p.w - 12 - RW, h: p.h - 36 };
    if (view.init !== P.cls) home(false);
    uiButton(vp.x, vp.y, vp.w, vp.h, () => { }, () => { });
    ctx.save(); ctx.beginPath(); ctx.rect(vp.x, vp.y, vp.w, vp.h); ctx.clip();
    // the paper, fixed to the board so it pans with it
    const o0 = toS(0, 0), tile = paperTile(), ts = 96;
    const ox = ((Math.round(o0.x) - vp.x) % ts + ts) % ts - ts, oy = ((Math.round(o0.y) - vp.y) % ts + ts) % ts - ts;
    for (let Y = vp.y + oy; Y < vp.y + vp.h; Y += ts) for (let X = vp.x + ox; X < vp.x + vp.w; X += ts) ctx.drawImage(tile, X, Y);
    // the plate
    const R = plateFor(view.z), pl = plate(R), k = view.z / R, q0 = toS(EXT.x0, EXT.y0);
    ctx.drawImage(pl, Math.round(q0.x), Math.round(q0.y), Math.round(pl.width * k), Math.round(pl.height * k));
    const z = view.z, t = G.time || 0, A = PW.anchors(), T = PW.st().taken;
    // the order's plate title, engraved under the feet
    { const Bd = BOD(), s2 = toS(0, 19.3 * F), col = TINT[Bd.key] || INK2; txt(Bd.title.toUpperCase(), s2.x, s2.y, col, 'center', false); if (z >= 4.5) txt(Bd.sub, s2.x, s2.y + 9, '#6a5a44', 'center', false); }
    // hover
    hover = null; hoverCard = null;
    if (inRect(mouse, vp.x, vp.y, vp.w, vp.h) && !(drag && drag.moved)) { hover = nodeHit(mouse.x, mouse.y); if (hover && N[hover].kind === 'card') { hoverCard = N[hover].card; } }
    const road = hover && isPeg(N[hover]) && !T[hover] && !A.has(hover) ? PW.roadTo(hover) : null, onRoad = new Set(road || []);
    // the web's roads
    const drawn = new Set();
    for (const id in N) for (const l of N[id].links) {
      const key = id < l ? id + '|' + l : l + '|' + id; if (drawn.has(key)) continue; drawn.add(key);
      const a1 = N[id], b1 = N[l];
      const pts = [[a1.x, a1.y]]; const via = VIA[key]; if (via) { const vv = via.slice(); const d0 = Math.hypot(vv[0][0] - a1.x, vv[0][1] - a1.y), d1 = Math.hypot(vv[vv.length - 1][0] - a1.x, vv[vv.length - 1][1] - a1.y); if (d1 < d0) vv.reverse(); pts.push(...vv); } pts.push([b1.x, b1.y]);
      const ha = T[id] || A.has(id), hb = T[l] || A.has(l), ra = onRoad.has(id) || id === hover, rb = onRoad.has(l) || l === hover;
      const keyLink = a1.kind === 'key' || b1.kind === 'key';
      let col, w = 1, dash = null;
      if (ha && hb) { col = GOLD; w = 2; }
      else if ((ra && (rb || hb)) || (rb && ha)) { col = Math.sin(t * 6) > -0.3 ? RUB : '#c0503a'; w = 2; }
      else if (ha || hb) { col = '#8a6a2a'; }
      else { col = keyLink ? '#8c775a' : FAINT; dash = keyLink ? [3, 2] : null; }
      for (let i = 0; i < pts.length - 1; i++) { const s0 = toS(pts[i][0], pts[i][1]), s1 = toS(pts[i + 1][0], pts[i + 1][1]); if (Math.max(s0.x, s1.x) < vp.x - 4 || Math.min(s0.x, s1.x) > vp.x + vp.w + 4 || Math.max(s0.y, s1.y) < vp.y - 4 || Math.min(s0.y, s1.y) > vp.y + vp.h + 4) continue; seg(s0.x, s0.y, s1.x, s1.y, col, w, dash); }
    }
    // the knots
    for (const id in N) {
      const n = N[id], q = toS(n.x, n.y), r = nodeR(n, z);
      if (q.x < vp.x - 14 || q.x > vp.x + vp.w + 14 || q.y < vp.y - 14 || q.y > vp.y + vp.h + 14) continue;
      const held = !!T[id] || A.has(id), can = !held && isPeg(n) && reachableW(id), path = onRoad.has(id), tint = TINT[n.reg] || INK2;
      if (n.kind === 'card') {
        const c = ARC[n.card] || {}, tk = arcOf(n.card), reach = !tk && arcReachable(n.card), cs = cardSize();
        if (reach) ring(q.x, q.y, (c.kind === 'major' || c.kind === 'void' ? cs.h * 0.62 : cs.w * 0.7) + 2, Math.sin(t * 4) > 0 ? RUB : '#c0503a');
        if (c.kind === 'major' || c.kind === 'void') inkCard(q.x, q.y, cs.w, cs.h, { held: !!tk, void: c.kind === 'void', orient: tk, both: P.arc.both === n.card });
        else if (c.kind === 'hybrid') { const sz = Math.max(3, cs.w * 0.6); ctx.fillStyle = INK; for (let i = -sz; i <= sz; i++) { const w = Math.round(sz - Math.abs(i)); ctx.fillRect(Math.round(q.x - w), Math.round(q.y + i), w * 2 + 1, 1); } ctx.fillStyle = tk ? GOLD : '#c9b893'; for (let i = -sz + 1.5; i <= sz - 1.5; i++) { const w = Math.round(sz - 1.5 - Math.abs(i)); ctx.fillRect(Math.round(q.x - w), Math.round(q.y + i), w * 2 + 1, 1); } }
        else { const rr = Math.max(2, cs.w * 0.42); disc(q.x, q.y, rr + 1, INK); disc(q.x, q.y, rr, tk ? (c.kind === 'hollow' ? '#8a6ab0' : GOLD) : c.kind === 'hollow' ? '#6a5a7a' : '#c9b893'); if (rr >= 2.5) { ctx.fillStyle = tk ? '#5a1a10' : INK; for (let i = 0; i <= 1; i++) ctx.fillRect(Math.round(q.x) - i, Math.round(q.y) - 1 + i * 2 - 1, i * 2 + 1, 1); } }
        if (G.arcSel === n.card) ring(q.x, q.y, cs.h * 0.62 + 2, INK);
      } else if (n.kind === 'key') {
        const Rg = REGK[n.reg], own = Rg && Rg.cls === P.cls, on = PW.keyLit(n), cs = cardSize();
        inkCard(q.x, q.y, cs.w, cs.h, { held: on, void: false, orient: 'u' });
        if (!own) { ctx.fillStyle = 'rgba(166,148,114,0.55)'; ctx.fillRect(Math.round(q.x - cs.w / 2), Math.round(q.y - cs.h / 2), cs.w, cs.h); }
      } else if (n.kind === 'root') {
        disc(q.x, q.y, r + 1, INK); disc(q.x, q.y, r, held ? tint : '#c2b18c'); ring(q.x, q.y, r - 1.5, held ? GOLDH : tint);
        for (let j = 0; j < 4; j++) { const a2 = j * Math.PI / 2 + Math.PI / 4; ctx.fillStyle = INK; ctx.fillRect(Math.round(q.x + Math.cos(a2) * (r + 3)), Math.round(q.y + Math.sin(a2) * (r + 3)), 1, 1); }
      } else if (n.kind === 'notable') {
        if (can || path) ring(q.x, q.y, r + 3, Math.sin(t * 4) > 0 ? RUB : '#c0503a');
        disc(q.x, q.y, r + 1, INK); disc(q.x, q.y, r, held ? GOLD : '#c9b893'); ring(q.x, q.y, Math.max(1, r - 2), held ? GOLDH : INK2);
        const k0 = Object.keys(n.fx || {})[0]; disc(q.x, q.y, Math.max(1, r * 0.3), held ? '#5a1a10' : (STATC[k0] || INK2));
        if (z >= 13) txt(n.name, q.x, q.y + r + 9, held ? '#6a4a10' : INK2, 'center', false);
      } else {
        if (can) ring(q.x, q.y, r + 2, Math.sin(t * 4) > 0 ? RUB : '#c0503a');
        disc(q.x, q.y, r + 1, INK); disc(q.x, q.y, r, held ? GOLD : path ? '#e0c890' : '#c9b893');
        if (r >= 2) { ctx.fillStyle = held ? '#5a1a10' : (STATC[n.stat] || INK2); const d2 = r >= 3.5 ? 2 : 1; ctx.fillRect(Math.round(q.x) - (d2 >> 1), Math.round(q.y) - (d2 >> 1), d2, d2); }
      }
      if (id === hover) ring(q.x, q.y, r + 3, INK);
    }
    // sums
    if (showSums) {
      const S = PW.sums(), lines = []; for (const k2 in FXT) if (S[k2]) lines.push([shortFx(k2, S[k2]), STATC[k2] || INK2]);
      if (lines.length) {
        const w = Math.min(170, Math.max(tw('The web gives'), ...lines.map(l => tw(l[0]))) + 14), h = lines.length * 9 + 14, x0 = vp.x + 2, y0 = vp.y + vp.h - h - 2;
        ctx.fillStyle = 'rgba(10,9,14,0.86)'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = '#2e2a36'; ctx.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
        txt('The web gives', x0 + 4, y0 + 9, '#8f8a7c', 'left', false);
        lines.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.fillRect(x0 + 4, y0 + 15 + i * 9, 2, 2); txt(l[0], x0 + 9, y0 + 18 + i * 9, '#c8c2b0', 'left', false); });
      }
    }
    // the plate's edge: a double ink rule
    ctx.fillStyle = INK; ctx.fillRect(vp.x, vp.y, vp.w, 1); ctx.fillRect(vp.x, vp.y + vp.h - 1, vp.w, 1); ctx.fillRect(vp.x, vp.y, 1, vp.h); ctx.fillRect(vp.x + vp.w - 1, vp.y, 1, vp.h);
    ctx.fillStyle = INK2; ctx.fillRect(vp.x + 2, vp.y + 2, vp.w - 4, 1); ctx.fillRect(vp.x + 2, vp.y + vp.h - 3, vp.w - 4, 1); ctx.fillRect(vp.x + 2, vp.y + 2, 1, vp.h - 4); ctx.fillRect(vp.x + vp.w - 3, vp.y + 2, 1, vp.h - 4);
    ctx.restore();
    // the reader column
    drawReader(p.x + p.w - RW - 4, p.y + 22, RW, p.h - 36);
    // footer
    const fy = p.y + p.h - 5;
    txt(G.touch ? `drag · pinch · tap twice: lay or lift (${PW.untieCost()}g)` : `click: lay · right-click: lift (${PW.untieCost()}g)`, p.x + 6, fy, '#5a5563', 'left', false);
    let bx = vp.x + vp.w;
    for (const [lab, fn] of [['Whole', () => home(true)], ['Mine', () => home(false)], [showSums ? 'Hide sums' : 'Sums', () => { showSums = !showSums; }]]) { const w = tw(lab) + 8; bx -= w; smallBtn(lab, bx, p.y + p.h - 14, fn); bx -= 3; }
    if (hover && !hoverCard) tooltip = tipFor(hover, road);
  }
  function reachableW(id) { const n = N[id], T = PW.st().taken, A = PW.anchors(); if (!isPeg(n) || T[id] || A.has(id)) return false; for (const l of n.links) if (A.has(l) || T[l]) return true; return false; }
  const STATC = { life: '#8a1c22', lok: '#a0303a', bleed: '#6a0e14', ess: '#28506e', regen: '#3a6a8a', fcr: '#4a7a9a', wisp: '#2a4a60', dmg: '#553a74', melee: '#8a4a18', armor: '#5c4a2c', poise: '#4a3a24', prec: '#6a5a3a', shard: '#7a6a4a', res: '#3a5a3a', mf: '#8a7010', frw: '#4a6a3a', evade: '#3a3a5a', sick: '#553a74', sun: '#8a6a12', moon: '#2a2a4a', vit: '#8a1c22', spi: '#28506e', con: '#4a3a24' };
  const FXS = { life: '% life', ess: () => '% ' + rn(), regen: () => '% ' + rn() + ' regained', armor: ' armor', poise: ' poise', prec: '% poise recovery', shard: ' shard held', dmg: '% skill damage', melee: '% melee', fcr: '% casting speed', wisp: '% wisp regrowth', res: '% magic resist', mf: '% magic find', frw: '% walk', lok: ' life on kill', bleed: '% bleeding', sick: '% sickness', evade: '% miss chance', sun: '% by day', moon: '% in the dark', vit: ' Vitality', spi: ' Essence', con: ' Constitution' };
  const rn = () => P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence';
  const nf = v => (Math.round(v * 10) / 10).toString();
  const shortFx = (k, v) => '+' + nf(v) + (typeof FXS[k] === 'function' ? FXS[k]() : (FXS[k] || ' ' + k));
  function drawCards(t) {
    const W_ = typeof web === 'function' ? web() : null, C = cardPos(); if (!W_ || !C) return;
    const cs = cardSize();
    // the card roads: dotted ink, gold where both ends are held
    const drawn = new Set();
    for (const id in W_) for (const l of W_[id].links) {
      const key = id < l ? id + '|' + l : l + '|' + id; if (drawn.has(key)) continue; drawn.add(key);
      const a = toS(C[id].x, C[id].y), b = toS(C[l].x, C[l].y), ta = id === 'heart' || arcOf(id), tb = l === 'heart' || arcOf(l);
      seg(a.x, a.y, b.x, b.y, ta && tb ? GOLD : ta || tb ? '#8a6a2a' : '#6a5640', ta && tb ? 2 : 1, ta && tb ? null : [3, 2]);
    }
    for (const id in W_) {
      const q = toS(C[id].x, C[id].y), c = ARC[id], tk = id === 'heart' ? 0 : arcOf(id), can = id !== 'heart' && !tk && !arcWhyNot(id);
      if (id === 'heart') {
        // the heart at the heart: a small inked heart, bleeding
        const r = Math.max(2.5, cs.w * 0.45); disc(q.x - r * 0.45, q.y - r * 0.2, r * 0.6, INK); disc(q.x + r * 0.45, q.y - r * 0.2, r * 0.6, INK);
        ctx.fillStyle = INK; for (let i = 0; i <= Math.round(r); i++) ctx.fillRect(Math.round(q.x - r + i), Math.round(q.y + i * 0.9 - r * 0.1), Math.max(1, Math.round((r - i) * 2)), 1);
        disc(q.x - r * 0.45, q.y - r * 0.25, Math.max(0.5, r * 0.4), '#8a1c22'); disc(q.x + r * 0.45, q.y - r * 0.25, Math.max(0.5, r * 0.4), '#8a1c22');
        continue;
      }
      if (!c) continue;
      if (can) ring(q.x, q.y, cs.h * 0.62 + 1, Math.sin(t * 4) > 0 ? RUB : '#c0503a');
      if (c.kind === 'major' || c.kind === 'void') inkCard(q.x, q.y, cs.w, cs.h, { held: !!tk, void: c.kind === 'void', orient: tk, both: P.arc.both === id });
      else if (c.kind === 'hybrid') { const s = Math.max(3, cs.w * 0.55); ctx.fillStyle = INK; for (let i = -s; i <= s; i++) { const w = Math.round(s - Math.abs(i)); ctx.fillRect(Math.round(q.x - w), Math.round(q.y + i), w * 2 + 1, 1); } if (tk) { ctx.fillStyle = GOLD; for (let i = -s + 1.5; i <= s - 1.5; i++) { const w = Math.round(s - 1.5 - Math.abs(i)); ctx.fillRect(Math.round(q.x - w), Math.round(q.y + i), w * 2 + 1, 1); } } }
      else { const r = Math.max(2, cs.w * 0.36); disc(q.x, q.y, r + 1, INK); disc(q.x, q.y, r, tk ? (c.kind === 'hollow' ? '#8a6ab0' : GOLD) : c.kind === 'hollow' ? '#6a5a7a' : '#c9b893'); }
      if (G.arcSel === id) ring(q.x, q.y, cs.h * 0.62 + 2, INK);
      if (hoverCard === id) ring(q.x, q.y, cs.h * 0.62 + 3, '#fff4d8');
    }
  }
  function wrap(t, w) { return typeof wrapPx === 'function' ? wrapPx(t, w) : [t]; }
  function drawReader(rx, ry, rw, rh) {
    ctx.fillStyle = '#121016'; ctx.fillRect(rx, ry, rw, rh); ctx.strokeStyle = '#2e2a36'; ctx.strokeRect(rx + .5, ry + .5, rw - 1, rh - 1);
    const x = rx + 5, w = rw - 10; let y = ry + 12;
    const sel = hoverCard || G.arcSel;
    const para = (body, col) => { for (const l of wrap(body, w)) { txt(l, x, y, col, 'left', false); y += 9; } y += 4; };
    if (!sel || !ARC[sel]) {
      para('One board: your body. The Minor and Major Arcana lie on the same roads, out from the gate at your order\'s seat.', '#a39d8c');
      para('Each level gives one Minor Arcanum to lay. A Major Arcanum is won from bosses, guardians and hidden shrines. Either can be laid once a road reaches it.', '#a39d8c');
      para('A Major Arcanum you hold is a place a road may carry on from. The Void\'s Major Arcana wait at the seat.', '#8f8a7c');
      txt(`Resets left: ${P.respecs}`, x, ry + rh - 8, '#8f8a7c', 'left', false);
      return;
    }
    const c = ARC[sel], tk = arcOf(sel);
    txt(c.name, x, y, c.kind === 'void' || c.kind === 'hollow' ? '#b48ad9' : c.kind === 'major' ? '#e8d6a0' : '#e8e2d0', 'left', false); y += 10;
    try { txt(arcKindLabel(sel), x, y, '#6f6a79', 'left', false); } catch (e) { } y += 12;
    if (hasOrient(sel)) { para('Upright: ' + c.up, tk === 'u' || (aU(sel) && tk) ? '#e8e2d0' : '#a39d8c'); para('Reversed: ' + c.rev, tk === 'r' || (aR(sel) && tk) ? '#e8e2d0' : '#a39d8c'); }
    else para(c.up, tk ? '#e8e2d0' : '#a39d8c');
    if (P.arc.both === sel) { txt('Unmade: counts both ways', x, y, '#b48ad9', 'left', false); y += 11; }
    if (sel !== G.arcSel) { txt('Click the Major Arcanum to choose it', x, ry + rh - 8, '#6f6a79', 'left', false); return; }
    const why = arcWhyNot(sel), by = ry + rh - 30;
    if (!tk) {
      if (why) { for (const l of wrap(why, w)) { txt(l, x, by + 4, '#c8553d', 'left', false); } }
      else if (hasOrient(sel)) { const w1 = smallBtn('Take upright', x, by, () => takeCard(sel, 'u')); smallBtn('Reversed', x + w1 + 4, by, () => takeCard(sel, 'r')); }
      else smallBtn('Take (1 Arcana)', x, by, () => takeCard(sel));
    } else if (hasOrient(sel)) {
      const shr = atShrine();
      smallBtn(tk === 'u' ? 'Flip to reversed' : 'Flip to upright', x, by, () => flipCard(sel), shr);
      if (aU('v_unmade') && c.kind === 'major' && typeof setBoth === 'function') smallBtn(P.arc.both === sel ? 'Unmake: off' : 'Unmake: both', x, by + 14, () => setBoth(sel), shr);
      if (!shr) txt('Flip at a lantern', x, by + 26, '#6f6a79', 'left', false);
    } else txt('Taken', x, by + 4, '#d9a441', 'left', false);
  }
  function tipFor(id, road) {
    const n = N[id]; if (!n) return null; const out = [];
    if (n.kind === 'key') {
      const Rg = REGK[n.reg], own = Rg && Rg.cls === P.cls;
      out.push([n.hyb != null ? 'A hybrid keystone' : 'A keystone Major Arcanum', '#e8d6a0']); out.push([(Rg ? Rg.name : '') + (own ? '' : ' · not your order'), '#6f6a79']);
      out.push([own ? (PW.keyLit(n) ? 'Lit: a road may begin here. Click to see its Major Arcana.' : 'Hold one of its Major Arcana to light it. Click to see them.') : 'Only its own order can light it.', '#a39d8c']);
      return out;
    }
    out.push([n.name || 'A Minor Arcanum', n.kind === 'notable' ? '#e8d6a0' : '#e8e2d0']);
    out.push([n.kind === 'root' ? (REGK[n.reg] && REGK[n.reg].cls === P.cls ? 'Where your road begins' : 'A gate') : (n.kind === 'notable' ? 'A great Minor Arcanum · ' : 'A Minor Arcanum · ') + (n.area || ''), '#6f6a79']);
    const fx = Object.keys(n.fx || {}); if (fx.length) for (const k of fx) out.push([FXT[k] ? FXT[k](n.fx[k]) : k, '#8f9cff']); else out.push(['A gate. It gives nothing but the way through.', '#a39d8c']);
    if (n.lore) out.push([n.lore, '#7f7a6c']);
    const A = PW.anchors(), T = PW.st().taken;
    if (A.has(id)) out.push(['Your road begins here', '#d9a441']);
    else if (T[id]) out.push([PW.canUntie(id) ? `Laid · ${G.touch ? 'tap again' : 'right-click'} to lift (${PW.untieCost()} gold)` : 'Laid · other Minor Arcana hang from it', '#d9a441']);
    else if (road && road.length) { const a = PW.avail(); out.push([road.length === 1 ? `${G.touch ? 'Tap again' : 'Click'} to lay (1 Minor Arcanum · ${a} left)` : `${G.touch ? 'Tap again' : 'Click'} to lay the road: ${road.length} Minor Arcana (${a} left)`, road.length <= a ? '#e8e2d0' : '#c8553d']); }
    else out.push(['No road reaches it', '#c8553d']);
    return out;
  }

  // ------------------------------------------------------------------ mouse
  const lpos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const inVp = m => m.x >= vp.x && m.x < vp.x + vp.w && m.y >= vp.y && m.y < vp.y + vp.h;
  try {
    cv.addEventListener('mousedown', e => { if (!isOpen() || G.paused) return; const m = lpos(e); if (!inVp(m)) return; drag = { x0: m.x, y0: m.y, cx0: view.cx, cy0: view.cy, moved: false, b: e.button }; });
    addEventListener('mousemove', e => { if (!drag) return; if (!isOpen()) { drag = null; return; } const m = lpos(e), dx = m.x - drag.x0, dy = m.y - drag.y0; if (!drag.moved && Math.hypot(dx, dy) > 2.5) drag.moved = true; if (drag.moved) { view.cx = drag.cx0 - dx / view.z; view.cy = drag.cy0 - dy / view.z; clampView(); } });
    addEventListener('mouseup', e => {
      const d = drag; drag = null; if (!d || d.moved || !isOpen()) return;
      const m = lpos(e); mouse.x = m.x; mouse.y = m.y;
      boardAct(m, d.b);
    });
    function boardAct(m, btn) {
      const d = { b: btn };
      const best = nodeHit(m.x, m.y); if (!best) { if (d.b === 0) G.arcSel = null; return; }
      if (N[best].kind === 'card') { if (d.b === 0) G.arcSel = N[best].card; return; }
      if (d.b === 2) PW.untie(best);
      else if (d.b === 0) {
        if (N[best].kind === 'key') { const def = typeof WEB_DEF !== 'undefined' && WEB_DEF[P.cls], n = N[best], Rg = REGK[n.reg]; if (def && Rg && Rg.cls === P.cls) { const list = n.page != null ? (def.clusters[n.page] || {}).majors || [] : n.hyb != null ? [def.hybrids[n.hyb]] : []; const held = list.find(k => arcOf(k)); G.arcSel = held || list[0] || null; } return; }
        PW.tie(best);
      }
    }
    // v0.53 touch: one finger drags the plate, two fingers pinch to zoom. A tap shows a knot or card (as the mouse
    // hovering would); tapping the same one again takes it, or unties it if it is already tied.
    const TG = { f: new Map(), pan: null, pinch: null, moved: false, armed: null, armedT: 0 };
    const tp = t => lpos(t), pts = () => [...TG.f.values()];
    const startPan = () => { const m = pts()[0]; TG.pan = { x0: m.x, y0: m.y, cx0: view.cx, cy0: view.cy }; };
    const startPinch = () => { const [a, b] = pts(), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; TG.pinch = { d0: Math.max(8, Math.hypot(a.x - b.x, a.y - b.y)), z0: view.z, w0: toW(mx, my) }; TG.moved = true; };
    addEventListener('touchstart', e => {
      if (!isOpen() || G.paused) return;
      const ts = [...e.changedTouches]; if (!TG.f.size && !ts.some(t => inVp(tp(t)))) return;
      e.preventDefault(); e.stopPropagation();
      if (!TG.f.size) TG.moved = false;
      for (const t of ts) TG.f.set(t.identifier, tp(t));
      if (TG.f.size === 1) { startPan(); const m = pts()[0]; mouse.x = m.x; mouse.y = m.y; } else startPinch();
    }, { capture: true, passive: false });
    addEventListener('touchmove', e => {
      if (!TG.f.size) return; e.preventDefault(); e.stopPropagation();
      for (const t of e.changedTouches) if (TG.f.has(t.identifier)) TG.f.set(t.identifier, tp(t));
      if (!isOpen()) { TG.f.clear(); return; }
      if (TG.f.size >= 2 && TG.pinch) {
        const [a, b] = pts(), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        view.z = Math.max(ZMIN, Math.min(ZMAX, TG.pinch.z0 * d / TG.pinch.d0));
        view.cx = TG.pinch.w0.x - (mx - vp.x - vp.w / 2) / view.z; view.cy = TG.pinch.w0.y - (my - vp.y - vp.h / 2) / view.z; clampView();
      } else if (TG.pan) {
        const m = pts()[0], dx = m.x - TG.pan.x0, dy = m.y - TG.pan.y0;
        if (!TG.moved && Math.hypot(dx, dy) > 4) TG.moved = true;
        if (TG.moved) { view.cx = TG.pan.cx0 - dx / view.z; view.cy = TG.pan.cy0 - dy / view.z; clampView(); mouse.x = -99; mouse.y = -99; }
      }
    }, { capture: true, passive: false });
    const tEnd = e => {
      if (!TG.f.size) return; e.preventDefault(); e.stopPropagation();
      let last = null; for (const t of e.changedTouches) if (TG.f.has(t.identifier)) { last = tp(t); TG.f.delete(t.identifier); }
      if (TG.f.size >= 2) { startPinch(); return; }
      if (TG.f.size === 1) { TG.pinch = null; startPan(); return; }
      TG.pinch = null; TG.pan = null;
      if (TG.moved || !last || !isOpen() || e.type === 'touchcancel') return;
      mouse.x = last.x; mouse.y = last.y;
      const best = nodeHit(last.x, last.y), now = performance.now();
      if (!best) { G.arcSel = null; TG.armed = null; return; }
      if (TG.armed !== best || now - TG.armedT > 5000) { TG.armed = best; TG.armedT = now; if (N[best].kind === 'card') G.arcSel = N[best].card; try { sfx(700, 0.03, 'sine', 0.012); } catch (er) { } return; }
      TG.armed = null;
      if (PW.st().taken[best] && N[best].kind !== 'card' && N[best].kind !== 'key') boardAct(last, 2); else boardAct(last, 0);
    };
    addEventListener('touchend', tEnd, { capture: true, passive: false });
    addEventListener('touchcancel', tEnd, { capture: true, passive: false });
    cv.addEventListener('wheel', e => { if (!isOpen()) return; const m = lpos(e); if (!inVp(m)) return; e.preventDefault(); zoomAt(m.x, m.y, e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    addEventListener('keydown', e => {
      if (!isOpen()) return; const k = e.key;
      if (k === '+' || k === '=') zoomAt(vp.x + vp.w / 2, vp.y + vp.h / 2, 1.25);
      else if (k === '-' || k === '_') zoomAt(vp.x + vp.w / 2, vp.y + vp.h / 2, 0.8);
      else if (k === '0') home(false);
    });
  } catch (e) { }

  // ------------------------------------------------------------------ take over the panel (after the Long Web installs)
  function takeOver() {
    if (!PW.installed) { setTimeout(takeOver, 0); return; }
    const _da = drawArcana;
    drawArcana = function () {
      G.arcTab = 'body';
      try { drawBoard(); } catch (e) { reportError && reportError(e); try { G.arcTab = 'web'; _da.apply(this, arguments); } catch (e2) { } }
    };
    if (typeof derive === 'function') { const _dv = derive; derive = function () { try { ensureGraph(); } catch (e) { } return _dv.apply(this, arguments); }; }
    if (typeof applySave === 'function') { const _as = applySave; applySave = function () { const r = _as.apply(this, arguments); refundThreads(); try { builtFor = null; ensureGraph(); PW.prune(); } catch (e) { } return r; }; }
  }
  setTimeout(takeOver, 0);
  try { window.__body = { N, BODY, ensureGraph, view, home, zoomAt, plate, cardPos, drawBoard, get vp() { return vp; } }; } catch (e) { }
})();
