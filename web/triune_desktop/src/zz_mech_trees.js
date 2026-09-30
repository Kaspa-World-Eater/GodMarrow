
// =================================================================== skill tree layouts (board: trees)
// Only r, c, tab and pre of SK entries are touched here, plus req when it simply follows the row
// (req is derived from r at load, so a row move must carry it). Numbers, costs and text are untouched.
// Rationale per class: triune_desktop/TREES.md.
// Tabs are left as they are: several tabs carry mechanics (Marrow cost cut, Logos word power,
// Kusho sky/pose colours, the '+1 to <tab> skills' affixes and fate pages), so a tab move would change play.
(() => {
  const LAYOUT = {
    // ---- Weaver of Mirrors (animancer). The mirror skills (pillars, fissure, cage, anvil) are left alone.
    challenge: { pre: 'golem' },                 // the golem's taunt builds on the golem, not on Overcharge
    leash: { c: 1, pre: 'condense' },            // great wisp -> Soul Leash: the anima-construct line Anima Mastery boosts
    choir: { pre: 'cull' },                      // wisp mastery follows the revenant line, not the leash
    wraith: { pre: 'ward' },                     // Essence ward -> Wraith Form (was an orphan at tier 6)
    mark: { pre: 'swarm' },                      // 'more damage from everything you command' follows the soul swarm (was an orphan)
    orb: { pre: 'lance' },                       // spirit dart -> Aether Orb (was an orphan)
    chain: { c: 2, pre: 'word' },                // Word of Unmaking -> Chain of Logos: the speech line, not Soul Storm
    // ---- Ossuarch (ossumancer)
    offering: { r: 1, c: 1, pre: 'raise' },      // tearing apart a skeleton needs skeletons: out of tier 1, after Raise
    tithe: { c: 2, pre: 'raise' },
    unearth: { c: 2, pre: 'tithe' },             // kills give bone -> the dead claw back up: the harvest line
    horn: { c: 0, pre: 'banner' },               // banner and horn: the two war-cries for the army
    bward: { c: 0, pre: 'horn' },
    legion: { pre: 'reasm' },                    // the army capstone sits at the end of the army spine, so it never masters nothing
    ribcage: { pre: 'spear' },                   // was an orphan
    ossify: { pre: 'spear' },                    // was an orphan
    wall: { c: 1, pre: 'ribcage' },              // rib cage -> bone arms: bone that grips and holds
    spikes: { pre: 'ossify' },                   // bones turned brittle -> spikes burst out of them
    sstorm: { pre: 'siphon' },                   // siphon fills the aura, the storm fires it
    host: { pre: 'raise' },                      // Bone Host fuses skeletons: it needs Raise Skeleton (Ossuary page)
    // ---- Hemomancer
    fgolem: { c: 0, pre: 'thrall' },             // ooze -> flesh golem: the corpse-construct line
    graft: { c: 1, pre: 'hatch' },               // grafts change the whole brood: they build on Hatch Brood
    nest: { c: 0, pre: 'fgolem' },
    hive: { pre: 'graft' },                      // whole-brood passives in one spine
    broodm: { pre: 'hive' },                     // the brood capstone needs a brood
    bfrenzy: { c: 1, pre: 'hatch' },             // makes minions rabid: needs minions (Brood page); was under Hemorrhage
    pact: { c: 1 },                              // stays after Blood Frenzy, straight under it
    cburst: { c: 0, pre: 'hemor' },              // the burst line: veins burst -> corpses burst
    spool: { c: 2, pre: 'vwhip' },               // veins that squeeze blood -> leeches that drink it
    bwave: { c: 0 },
    devour: { c: 0, pre: 'hatch' },              // eats your spawnlings and tumors: needs a brood (Brood page); was under Chitin
    gills: { c: 2, pre: 'chitin' },              // the survival line: chitin, gills, molt, second heart
    molt: { pre: 'gills' },
    heart: { c: 2, pre: 'molt' },
    // ---- Shrine Keeper (miasmancer)
    mstorm: { c: 1, pre: 'exhale' },             // whips your own cloud: the cloud spine, not Contagion
    // ---- Kusho (monk)
    kmirror: { c: 0, pre: 'kbowl' },             // the bowl catches missiles, the mirror swallows blows
    kwalk: { c: 2, pre: 'kspit' },               // the starved dead's roots -> the withering walk
    kgrip: { c: 2 }, kfinger: { c: 1 },
    kpagoda: { pre: 'kgrip' },                   // calcify -> encase in stone
    kmount: { pre: 'kbar' },                     // the heavy body leaps; was under Grip-Of-Old-Stone
  };
  const applied = [];
  for (const id in LAYOUT) {
    const s = SK[id]; if (!s) continue;   // defensive: a skill another agent renamed or removed
    const L = LAYOUT[id];
    if (L.r != null && L.r !== s.r) { if (s.req === ROWREQ[s.r]) s.req = ROWREQ[L.r]; s.r = L.r; }
    if (L.c != null) s.c = L.c;
    if (L.tab != null) s.tab = L.tab;
    if ('pre' in L) { if (L.pre && !SK[L.pre]) continue; s.pre = L.pre || undefined; }
    applied.push(id);
  }
  if (window.__spm) window.__spm.treesLayout = { LAYOUT, applied };

  // A prerequisite on another page has no arrow on this one. Mark it: a short stub in the other page's
  // colour drops onto the top of the icon (lit once the prerequisite is learned); the tooltip already says
  // 'Requires <skill>', and this adds which page it is on.
  const tabColOf = t => (typeof tabCol === 'function' ? tabCol(t) : '#a39d8c');
  function crossTabMarks() {
    if (!G.panels || !G.panels.skills || typeof TREE === 'undefined') return;
    const names = tabNames();
    for (const id of SK_ORDER) {
      const s = SK[id]; if (s.cls !== P.cls || s.tab !== G.tab || !s.pre || !SK[s.pre] || SK[s.pre].tab === s.tab) continue;
      const pr = SK[s.pre], lit = P.skills[s.pre] > 0, col = tabColOf(pr.tab), cx = TREE.col(s.c), cy = TREE.row(s.r);
      const x = Math.round(cx), y0 = cy - 20, y1 = cy - 13;
      ctx.fillStyle = '#050407'; ctx.fillRect(x - 2, y0 - 1, 4, y1 - y0 + 2);
      ctx.fillStyle = lit ? col : '#2a2426'; ctx.fillRect(x - 1, y0, 2, y1 - y0);
      ctx.fillStyle = '#050407'; ctx.fillRect(x - 4, y1 - 1, 9, 3);
      ctx.fillStyle = lit ? col : '#3a3036'; ctx.fillRect(x - 3, y1, 7, 1); ctx.fillRect(x - 2, y1 + 1, 5, 1);
      ctx.fillStyle = lit ? col : rgbaSafe(col, 0.55); ctx.fillRect(x - 3, y0 - 1, 7, 2);   // the page's colour cap
      if (inRect(mouse, x - 12, cy - 12, 24, 24) && Array.isArray(tooltip)) {
        const i = tooltip.findIndex(l => l && typeof l[0] === 'string' && l[0].startsWith('Requires ' + pr.name));
        if (i >= 0) tooltip[i] = [`Requires ${pr.name} (${names[pr.tab]} page)`, tooltip[i][1]];
      }
    }
  }
  const rgbaSafe = (c, a) => (typeof rgba === 'function' ? rgba(c, a) : c);
  // drawSkills is replaced by later UI files, so wrap it once everything has loaded
  setTimeout(() => {
    const _ds = drawSkills;
    drawSkills = function () { const r = _ds.apply(this, arguments); try { crossTabMarks(); } catch (e) { } return r; };
  }, 0);
})();
