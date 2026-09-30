# Triune desktop fork (forked 2026-09-27)
Forked from v0.40 (spiritmancer/v2_backup_v040_premonk) plus the round-3 Hemomancer test override (src/zz_hero_hemomancer_r3.js).
- Desktop only (Windows + Steam Deck). Not a browser game: the 16 MB page limit and single-file rules no longer apply.
- Art standard: every hero, monster, tile and prop is REDRAWN (never enlarged) to the Hemomancer Midjourney-traced standard.
- Hero size: Diablo 2 Resurrected / Path of Exile scale on a 1080p screen, matched to the user's monk references (~130-140 art px tall), 1 art px = 1 screen px.
- The world is redrawn to match the hero's scale and detail.
Build: bash build.sh (writes triune.html). Test: run spiritmancer/smoke32.js with HTML=<path>.
