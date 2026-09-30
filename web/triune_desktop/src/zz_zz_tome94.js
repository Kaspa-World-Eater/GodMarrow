// zz_zz_tome94.js — the user (2026-09-29): "create a readable lore book on the title screen, make it match the title
// v96 (2026-09-29): "a primary part of the codex to be the writings of these agents ... each chapter a collection of works". Chapters now hold a preface, the gathered works, and Relics and Rites; bronze corner guards, stacked page edges, a ribbon, illuminated initials, a torn corner.
// screen theme but look old and archaic and esoteric like an ancient tome."
// "The Codex" on the title menu opens a book bound in old pitted bronze: vellum pages foxed and darkened at the edges,
// iron-gall ink, bronze rubrics, a drop capital at the head of every chapter. The left leaf is the index (the chapters in
// Roman numerals, a sigil of the Hush's eye), the right leaf is the chapter. Arrow keys turn the chapters, Escape closes.
// The text itself comes from zz_zz_tome94_text.js, generated from the Codex of the Hide page (one source for both).
(function () {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const NOISE = (freq, a) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.16  0 0 0 0 0.10  0 0 0 0 0.05  0 0 0 ${a} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
  const PITS = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='turbulence' baseFrequency='0.9' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.02  0 0 0 0 0.015  0 0 0 0 0.01  -2.4 0 0 0 1.05'/><feComponentTransfer><feFuncA type='discrete' tableValues='0 0 0 0.85'/></feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#p)'/></svg>`)}")`;
  const VERD = `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='v'><feTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='3' seed='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.16  0 0 0 0 0.29  0 0 0 0 0.22  0 1.6 0 0 -0.95'/></filter><rect width='100%' height='100%' filter='url(#v)'/></svg>`)}")`;
  const SIGIL = `<svg viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="46" stroke-dasharray="2 5"/><path d="M60 14 L100 83 L20 83 Z"/><path d="M34 60 Q60 38 86 60 Q60 82 34 60 Z"/><circle cx="60" cy="60" r="7"/></g><circle cx="60" cy="60" r="2.6" fill="currentColor"/><g fill="currentColor">${Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<rect x="${(60 + Math.cos(a) * 49 - 1).toFixed(1)}" y="${(60 + Math.sin(a) * 49 - 1).toFixed(1)}" width="2" height="2"/>`; }).join('')}</g></svg>`;

  const css = `
#tome { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 2.5vh 2vw;
  background: radial-gradient(ellipse at 50% 45%, rgba(20,12,8,.72), rgba(3,2,4,.96) 70%); font-family: "IM Fell English", Georgia, serif; }
#tome[hidden] { display: none !important; }
#tome button::before, #tome button::after, #tome li::before { content: none !important; display: none !important; }
#tome li { list-style: none; }
#tome .r .in:focus { outline: none; }
#tome .r .in:focus-visible { outline: 1px dotted rgba(58,34,16,.5); outline-offset: -8px; }
#tome .pg.r::before { content: ""; position: absolute; top: 26px; bottom: 26px; left: 34px; width: 3px; border-left: 1px solid rgba(106,66,32,.35); border-right: 1px solid rgba(106,66,32,.2); pointer-events: none; }
#tome .pg::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at 88% 8%, rgba(70,42,16,.28) 0 6%, transparent 14%), radial-gradient(circle at 6% 94%, rgba(70,42,16,.3) 0 5%, transparent 13%), radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(50,30,12,.35) 100%); }
#tome .bk { position: relative; width: min(1180px, 96vw); height: min(780px, 92vh); display: grid; grid-template-columns: 0.82fr 1fr; gap: 0;
  padding: 26px 30px; border-radius: 6px;
  background: ${PITS}, ${VERD}, linear-gradient(160deg, #6a4520 0%, #3d2512 38%, #2a190c 62%, #4a2e15 100%);
  box-shadow: inset 0 0 0 2px #1b1008, inset 0 0 0 5px #704622, inset 0 0 0 7px #1b1008, inset 0 0 40px rgba(0,0,0,.7), 0 30px 80px rgba(0,0,0,.85); }
#tome .bk::before, #tome .bk::after { content: ""; position: absolute; width: 58px; height: 58px; background: radial-gradient(circle at 38% 36%, #c08644 0 12%, #704622 28%, #2a190c 62%, transparent 64%), ${PITS}; border-radius: 50%; }
#tome .bk::before { left: -14px; top: -14px; } #tome .bk::after { right: -14px; bottom: -14px; }
#tome .boss { position: absolute; width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle at 38% 36%, #c08644 0 12%, #704622 28%, #2a190c 62%, transparent 64%); }
#tome .boss.tr { right: -14px; top: -14px; } #tome .boss.bl { left: -14px; bottom: -14px; }
#tome .clasp { position: absolute; right: -22px; width: 34px; height: 64px; border-radius: 4px; background: ${PITS}, linear-gradient(90deg, #2a190c, #945e2e 40%, #553418 70%, #1b1008);
  box-shadow: inset 0 0 0 1px #0f0905, 0 4px 10px rgba(0,0,0,.6); }
#tome .clasp::after { content: ""; position: absolute; left: 10px; top: 24px; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #ecc47e, #704622 55%, #1b1008); }
#tome .clasp.a { top: 22%; } #tome .clasp.b { bottom: 22%; }
#tome .pg { position: relative; min-width: 0; min-height: 0; overflow: hidden; color: #2b1d13;
  background: ${NOISE(0.8, 0.55)}, radial-gradient(circle at 18% 22%, rgba(110,70,30,.18) 0 3%, transparent 5%), radial-gradient(circle at 76% 71%, rgba(110,70,30,.16) 0 2.5%, transparent 4.5%), radial-gradient(circle at 62% 12%, rgba(90,60,25,.12) 0 2%, transparent 4%),
    radial-gradient(ellipse at 50% 45%, #c2ab7f 0%, #ad9468 52%, #85693f 86%, #54412a 100%); }
#tome .pg.l { border-radius: 3px 0 0 3px; box-shadow: inset -34px 0 40px -18px rgba(40,24,10,.75), inset 0 0 18px rgba(40,24,10,.35); }
#tome .pg.r { border-radius: 0 3px 3px 0; box-shadow: inset 34px 0 40px -18px rgba(40,24,10,.75), inset 0 0 18px rgba(40,24,10,.35); }
#tome .l .in { height: 100%; display: flex; flex-direction: column; padding: 34px 38px 26px 40px; gap: 14px; }
#tome .l h1 { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: clamp(26px, 3vw, 38px); letter-spacing: .08em; margin: 0; text-align: center; color: #3a2210; line-height: 1.05; }
#tome .l .lede { text-align: center; font-style: italic; font-size: 16px; color: #5a3d22; margin: 0; }
#tome .sig { width: 110px; height: 110px; margin: 2px auto 0; color: #5a3a1c; opacity: .85; }
#tome .cap { font-family: "IM Fell English SC", Georgia, serif; letter-spacing: .3em; font-size: 13px; color: #6a4220; text-align: center; margin-top: 4px; }
#tome ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; overflow: auto; }
#tome ol button { all: unset; cursor: pointer; display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: baseline; gap: 6px; width: 100%; box-sizing: border-box; padding: 5px 8px; border-radius: 2px; color: #2b1d13; }
#tome ol button .n { font-family: "IM Fell English SC", Georgia, serif; color: #6a4220; font-size: 16px; text-align: right; }
#tome ol button .t { font-size: 19px; line-height: 1.2; }
#tome ol button .t small { display: block; font-size: 14px; font-style: italic; color: #6b5234; }
#tome ol button:hover .t, #tome ol button:focus-visible .t { text-decoration: underline; text-decoration-color: rgba(106,66,32,.6); text-underline-offset: 3px; }
#tome ol button[aria-current="true"] { background: rgba(106,66,32,.14); box-shadow: inset 2px 0 0 #6a4220; }
#tome .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; color: #5a3d22; font-style: italic; }
#tome .shut { all: unset; cursor: pointer; font-family: "IM Fell English SC", Georgia, serif; letter-spacing: .12em; font-size: 15px; color: #3a2210; padding: 6px 12px; border: 1px solid rgba(58,34,16,.55); border-radius: 2px; font-style: normal; }
#tome .shut:hover, #tome .shut:focus-visible { background: rgba(106,66,32,.15); }
#tome .r .in { height: 100%; overflow-y: auto; padding: 38px 46px 30px 52px; scrollbar-width: thin; scrollbar-color: #6a4220 transparent; }
#tome .r .in.turn { animation: tomeTurn .5s ease; }
@keyframes tomeTurn { from { opacity: 0; transform: translateX(10px); filter: blur(1px); } to { opacity: 1; transform: none; filter: none; } }
@media (prefers-reduced-motion: reduce) { #tome .r .in.turn { animation: none; } }
#tome .r .folio { position: sticky; bottom: -30px; display: block; text-align: center; font-family: "IM Fell English SC", Georgia, serif; color: #6a4220; letter-spacing: .2em; padding: 18px 0 0; }
#tome .txt { font-size: 19px; line-height: 1.62; max-width: 62ch; }
#tome .txt .epi { font-style: italic; font-size: 20px; color: #4a3019; margin: 0 0 14px; text-align: center; }
#tome .txt .epi::before { content: "\\201C"; } #tome .txt .epi::after { content: "\\201D"; }
#tome .txt h2 { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: clamp(28px, 3vw, 40px); letter-spacing: .05em; color: #3a2210; margin: 0; text-align: center; line-height: 1.1; }
#tome .txt .sub { text-align: center; font-family: "IM Fell English SC", Georgia, serif; letter-spacing: .24em; font-size: 13px; color: #6a4220; margin: 6px 0 4px; }
#tome .txt .sub::after { content: "\\2766"; display: block; font-size: 18px; letter-spacing: 0; margin-top: 8px; color: #6a4220; }
#tome .txt h3 { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: 22px; letter-spacing: .08em; color: #4a2c14; margin: 28px 0 8px; }
#tome .txt h3::before { content: "\\25C8  "; color: #6a4220; font-size: 14px; vertical-align: 2px; }
#tome .txt p { margin: 0 0 12px; text-align: justify; hyphens: auto; }
#tome .txt .sub + p::first-letter, #tome .txt .sub + p + p::first-letter { }
#tome .txt .dc::first-letter { float: left; font-family: "IM Fell English SC", Georgia, serif; font-size: 3.4em; line-height: .82; padding: 6px 8px 0 0; color: #6a4220; text-shadow: 1px 1px 0 rgba(255,240,200,.25); }
#tome .txt .plates { display: grid; gap: 14px; margin-top: 8px; }
#tome .txt .plate { border: 1px solid rgba(58,34,16,.55); outline: 1px solid rgba(58,34,16,.35); outline-offset: 3px; padding: 12px 16px 10px; background: rgba(120,85,40,.08); }
#tome .txt .plate h4 { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; letter-spacing: .1em; color: #6a4220; margin: 0 0 6px; font-size: 17px; }
#tome .txt .plate p { font-style: italic; margin: 0 0 6px; text-align: left; }
#tome .txt .carve { font-family: "IM Fell English SC", Georgia, serif; letter-spacing: .2em; text-align: center; margin: 24px 0; padding: 14px 8px; border-top: 1px double rgba(58,34,16,.6); border-bottom: 1px double rgba(58,34,16,.6); color: #3a2210; line-height: 1.8; }
#tome .txt .carve .under { display: block; font-family: "IM Fell English", Georgia, serif; letter-spacing: 0; font-style: italic; font-size: 15px; color: #5a3d22; margin-top: 6px; }
#tome .txt .powers div { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; padding: 7px 0; border-bottom: 1px solid rgba(58,34,16,.25); }
#tome .txt .powers b { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; color: #6a4220; letter-spacing: .08em; }
#tome .txt .lands { display: grid; gap: 10px; } #tome .txt .lands p { margin: 0; }
#tome .txt .lands b, #tome .txt.feuds b { font-weight: 400; font-family: "IM Fell English SC", Georgia, serif; color: #4a2c14; }
#tome .txt .words { display: grid; gap: 4px; font-style: italic; border-left: 1px solid rgba(106,66,32,.6); padding-left: 14px; margin-top: 8px; color: #3a2210; }
#tome .names { font-style: italic; }
@media (max-width: 760px) {
  #tome { padding: 8px; }
  #tome .bk { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); height: 96vh; padding: 14px; }
  #tome .clasp, #tome .boss, #tome .bk::before, #tome .bk::after { display: none; }
  #tome .pg.l { border-radius: 3px 3px 0 0; box-shadow: inset 0 -20px 26px -14px rgba(40,24,10,.7); }
  #tome .pg.r { border-radius: 0 0 3px 3px; box-shadow: inset 0 20px 26px -14px rgba(40,24,10,.7); }
  #tome .l .in { padding: 14px 16px 10px; gap: 8px; }
  #tome .sig, #tome .l .lede, #tome .cap, #tome .foot span { display: none; }
  #tome .pg.r::before { display: none; }
  #tome ol { grid-auto-flow: column; grid-auto-columns: max-content; overflow-x: auto; }
  #tome ol button { grid-template-columns: auto auto; } #tome ol button .t small { display: none; }
  #tome .r .in { padding: 18px 18px 20px; }
  #tome .txt { font-size: 17px; }
}`;

  // ---- v96: the book is now chapters of collected works. Pages: preface · works · relics, per chapter.
  const ART = `
#tome .bk { overflow: visible; }
#tome .bk::before, #tome .bk::after, #tome .boss { display: none; }
#tome .guard { position: absolute; width: 74px; height: 74px; z-index: 3; pointer-events: none;
  background: ${PITS}, linear-gradient(135deg, #b07a3c 0%, #6e4520 34%, #3a2310 70%, #1b1008 100%);
  clip-path: polygon(0 0, 100% 0, 100% 26%, 26% 26%, 26% 100%, 0 100%);
  filter: drop-shadow(0 3px 4px rgba(0,0,0,.7)); }
#tome .guard i { position: absolute; width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 38% 34%, #f0cf8c, #8a5a2a 55%, #1b1008 90%); }
#tome .guard i:nth-child(1) { left: 6px; top: 6px; } #tome .guard i:nth-child(2) { left: 50px; top: 6px; } #tome .guard i:nth-child(3) { left: 6px; top: 50px; }
#tome .guard.tl { left: -10px; top: -10px; } #tome .guard.tr { right: -10px; top: -10px; transform: scaleX(-1); }
#tome .guard.bl { left: -10px; bottom: -10px; transform: scaleY(-1); } #tome .guard.br { right: -10px; bottom: -10px; transform: scale(-1,-1); }
#tome .stack { position: absolute; z-index: 0; pointer-events: none; }
#tome .stack.b { left: 34px; right: 34px; bottom: 16px; height: 12px; background: repeating-linear-gradient(0deg, #8d7550 0 1px, #b39c73 1px 2px, #6d5636 2px 3px); border-radius: 0 0 4px 4px; box-shadow: 0 2px 3px rgba(0,0,0,.6); }
#tome .stack.l { left: 20px; top: 34px; bottom: 34px; width: 12px; background: repeating-linear-gradient(90deg, #8d7550 0 1px, #b39c73 1px 2px, #6d5636 2px 3px); border-radius: 4px 0 0 4px; }
#tome .stack.r { right: 20px; top: 34px; bottom: 34px; width: 12px; background: repeating-linear-gradient(90deg, #6d5636 0 1px, #b39c73 1px 2px, #8d7550 2px 3px); border-radius: 0 4px 4px 0; }
#tome .pg { z-index: 1; }
#tome .gutter { position: absolute; z-index: 2; top: 26px; bottom: 26px; width: 26px; pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(30,18,8,.55) 42%, rgba(12,7,3,.8) 50%, rgba(30,18,8,.55) 58%, transparent); }
#tome .gutter::after { content: ""; position: absolute; left: 12px; top: 6%; bottom: 6%; border-left: 2px dotted rgba(60,40,20,.55); }
#tome .ribbon { position: absolute; z-index: 4; top: 14px; width: 18px; height: calc(100% + 30px); pointer-events: none;
  background: linear-gradient(90deg, #1a120d, #3a2a1e 30%, #4a3526 50%, #2c1f16 70%, #120c08), repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.15) 3px 4px);
  background-blend-mode: multiply; clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 94%, 0 100%); filter: drop-shadow(2px 3px 3px rgba(0,0,0,.6)); }
#tome .pg.r { clip-path: polygon(0 0, 100% 0, 100% 91%, 98.6% 93.5%, 99.2% 95%, 97.4% 97.2%, 96% 100%, 0 100%); }
#tome .pg.r .stain { position: absolute; right: 9%; bottom: 7%; width: 120px; height: 120px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, transparent 60%, rgba(90,55,20,.18) 63%, rgba(90,55,20,.3) 66%, transparent 69%); transform: rotate(-12deg) scaleY(.94); }
#tome .pg.l .smudge { position: absolute; left: 8%; bottom: 10%; width: 90px; height: 60px; pointer-events: none; border-radius: 50%;
  background: radial-gradient(ellipse, rgba(40,26,12,.16), transparent 70%); transform: rotate(24deg); }
#tome .sig { width: 70px; height: 70px; }
#tome .l .in { gap: 10px; }
#tome ol ol { display: grid; gap: 0; margin: 2px 0 6px 40px; padding-left: 10px; border-left: 1px solid rgba(106,66,32,.35); overflow: visible; }
#tome ol ol button { grid-template-columns: minmax(0,1fr); padding: 3px 8px; }
#tome ol ol button .t { font-size: 15px; font-style: italic; color: #3d2915; }
#tome ol ol button.rel .t, #tome ol ol button.pre .t { font-style: normal; font-family: "IM Fell English SC", Georgia, serif; letter-spacing: .08em; font-size: 14px; color: #6a4220; }
#tome .txt h2.wt { font-size: clamp(24px, 2.4vw, 32px); }
#tome .txt .by { font-style: italic; font-size: 15px; line-height: 1.45; color: #5a3d22; text-align: center; margin: 10px auto 4px; max-width: 52ch; }
#tome .head { display: block; width: 220px; height: 22px; margin: 0 auto 10px; color: #6a4220; }
#tome .tail { display: block; text-align: center; color: #6a4220; font-size: 22px; margin: 22px 0 6px; }
#tome .txt .orn { text-align: center; color: #6a4220; margin: 16px 0; }
#tome .txt .verse { text-align: left; padding-left: 1.2em; }
#tome .txt blockquote { margin: 10px 0 14px 1.2em; padding-left: 12px; border-left: 1px solid rgba(106,66,32,.5); font-style: italic; }
#tome .txt .work p { text-indent: 1.2em; } #tome .txt .work p.verse, #tome .txt .work p.orn, #tome .txt .work p.fi { text-indent: 0; }
#tome .ill { float: left; width: 3.3em; height: 3.3em; margin: 4px 12px 2px 0; position: relative; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 50%, #3a2412 0 45%, #24160a 100%); box-shadow: inset 0 0 0 2px #1b1008, inset 0 0 0 4px #9a6a34, inset 0 0 0 5px #1b1008, 1px 2px 3px rgba(40,24,10,.5); }
#tome .ill svg { position: absolute; inset: 5px; width: calc(100% - 10px); height: calc(100% - 10px); color: #7a5228; opacity: .8; }
#tome .ill b { position: relative; font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: 2.35em; line-height: 1; color: #d9ab62;
  text-shadow: 0 1px 0 #1b1008, 0 0 1px #1b1008; }
#tome .nav { display: flex; justify-content: space-between; align-items: center; margin-top: 26px; padding-top: 10px; border-top: 1px solid rgba(58,34,16,.35); font-family: "IM Fell English SC", Georgia, serif; color: #6a4220; }
#tome .nav button { all: unset; cursor: pointer; font-family: "IM Fell English SC", Georgia, serif; font-size: 15px; letter-spacing: .06em; color: #3a2210; padding: 4px 8px; max-width: 40%; }
#tome .nav button:hover, #tome .nav button:focus-visible { background: rgba(106,66,32,.15); }
#tome .nav span { font-size: 13px; letter-spacing: .2em; }
@media (max-width: 760px) {
  #tome .guard, #tome .stack, #tome .ribbon, #tome .gutter { display: none; }
  #tome .pg.r { clip-path: none; }
  #tome ol ol { display: none; }
  /* v97: the close button sat under the right page on phones; it now rides the top corner of the index leaf */
  #tome .foot { position: absolute; top: 8px; right: 8px; margin: 0; z-index: 5; }
  #tome .shut { font-size: 13px; padding: 5px 9px; background: rgba(194,171,127,.92); }
  #tome .l h1 { font-size: 22px; padding: 0 118px 0 2px; text-align: left; }
  #tome .shut { letter-spacing: .04em; }
}`;
  const HEAD = `<svg class="head" viewBox="0 0 220 22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M4 11 H84"/><path d="M136 11 H216"/><path d="M84 11 q8 -9 16 0 q8 9 16 0 q8 -9 16 0"/><circle cx="110" cy="11" r="3.2"/><path d="M4 8 v6 M216 8 v6"/></g><g fill="currentColor"><circle cx="110" cy="11" r="1.2"/><rect x="40" y="10" width="2" height="2"/><rect x="178" y="10" width="2" height="2"/></g></svg>`;
  const KNOT = `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width=".8"><rect x="1" y="1" width="38" height="38"/><path d="M1 10 Q10 10 10 1 M39 10 Q30 10 30 1 M1 30 Q10 30 10 39 M39 30 Q30 30 30 39"/><path d="M4 20 Q10 14 16 20 T28 20 T40 20" opacity=".6"/><circle cx="4" cy="4" r="1.4"/><circle cx="36" cy="4" r="1.4"/><circle cx="4" cy="36" r="1.4"/><circle cx="36" cy="36" r="1.4"/></g></svg>`;

  let root = null, cur = 0, keyH = null, PAGES = [];
  const book = () => (window.__TOME_TEXT || []);
  // the Stranger's letter to the reader stands before chapter I and takes no number
  const num = i => { const B = book(); if (B[0] && B[0].id === 'prologue') return i === 0 ? '\u2720' : ROMAN[i - 1] || i; return ROMAN[i] || i + 1; };
  function paginate() {
    PAGES = [];
    book().forEach((c, ci) => {
      PAGES.push({ ci, k: 'pre' });
      (c.works || []).forEach((w, wi) => PAGES.push({ ci, k: 'work', wi }));
      if (c.relics) PAGES.push({ ci, k: 'rel' });
    });
  }
  function build() {
    const st = document.createElement('style'); st.textContent = css + ART; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'tome'; root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'The Ossuary of Words');
    root.innerHTML = `<div class="bk"><span class="stack l"></span><span class="stack r"></span><span class="stack b"></span>
      <span class="guard tl"><i></i><i></i><i></i></span><span class="guard tr"><i></i><i></i><i></i></span><span class="guard bl"><i></i><i></i><i></i></span><span class="guard br"><i></i><i></i><i></i></span>
      <span class="clasp a"></span><span class="clasp b"></span>
      <div class="pg l"><span class="smudge"></span><div class="in"><h1>The Ossuary<br>of Words</h1><p class="lede">set down by many hands, in the dark of the god</p>
      <div class="sig">${SIGIL}</div><div class="cap">Capitula</div><ol id="tomeIdx"></ol>
      <div class="foot"><span>Esc closes · ← → turn</span><button class="shut" id="tomeShut">Close the book</button></div></div></div>
      <div class="pg r"><span class="stain"></span><div class="in" id="tomeLeaf" tabindex="0"></div></div>
      <span class="gutter"></span><span class="ribbon"></span></div>`;
    document.body.appendChild(root);
    root.querySelector('#tomeShut').addEventListener('click', close);
    root.addEventListener('click', e => { if (e.target === root) close(); });
    root.querySelector('#tomeLeaf').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) show(+b.dataset.go); });
    paginate();
    requestAnimationFrame(place);
    addEventListener('resize', place);
  }
  function place() {
    if (!root) return;
    const bk = root.querySelector('.bk'), l = root.querySelector('.pg.l');
    if (!bk || !l) return;
    const x = l.offsetLeft + l.offsetWidth;
    root.querySelector('.gutter').style.left = (x - 13) + 'px';
    root.querySelector('.ribbon').style.left = (x - 3) + 'px';
  }
  function renderIndex() {
    const ol = root.querySelector('#tomeIdx'), p = PAGES[cur]; ol.innerHTML = '';
    book().forEach((c, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.innerHTML = `<span class="n">${num(i)}</span><span class="t">${c.name}<small>${c.sub}</small></span>`;
      b.setAttribute('aria-current', String(p && p.ci === i));
      b.addEventListener('click', () => show(PAGES.findIndex(q => q.ci === i)));
      li.appendChild(b);
      if (p && p.ci === i) {
        const sub = document.createElement('ol');
        PAGES.forEach((q, pi) => {
          if (q.ci !== i) return;
          const sli = document.createElement('li'), sb = document.createElement('button');
          const t = q.k === 'pre' ? (c.id === 'prologue' ? 'The letter' : 'Preface') : q.k === 'rel' ? 'Relics and Rites' : c.works[q.wi].title;
          sb.className = q.k; sb.innerHTML = `<span class="t">${t}</span>`;
          sb.setAttribute('aria-current', String(pi === cur));
          sb.addEventListener('click', () => show(pi)); sli.appendChild(sb); sub.appendChild(sli);
        });
        li.appendChild(sub);
      }
      ol.appendChild(li);
    });
    const on = ol.querySelector('ol button[aria-current="true"]'); if (on) try { on.scrollIntoView({ block: 'nearest' }); } catch (e) { }
  }
  function illum(el) {
    if (!el) return;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      const m = n.nodeValue.match(/^(\s*["“'‘(]*)([A-Za-z])/);
      if (!m) { if (n.nodeValue.trim()) return; continue; }
      const i = m[1].length, rest = n.nodeValue.slice(i + 1);
      const sp = document.createElement('span'); sp.className = 'ill'; sp.innerHTML = KNOT + `<b>${m[2]}</b>`;
      n.nodeValue = m[1];
      n.parentNode.insertBefore(sp, n.nextSibling);
      sp.parentNode.insertBefore(document.createTextNode(rest), sp.nextSibling);
      el.classList.add('fi'); return;
    }
  }
  function show(i) {
    if (!PAGES.length) paginate(); if (!PAGES.length) return;
    cur = (i + PAGES.length) % PAGES.length;
    const p = PAGES[cur], c = book()[p.ci], leaf = root.querySelector('#tomeLeaf');
    let body = '', fol = num(p.ci);
    if (p.k === 'pre') {
      body = `${c.epi ? `<p class="epi">${c.epi}</p>` : ''}<h2>${c.name}</h2><p class="sub">${c.sub}</p><div class="pre">${c.preface}</div>`;
      if (c.works && c.works.length) body += `<h3>The Works Gathered Here</h3><div class="lands">${c.works.map((w, wi) => `<p><button class="shut" style="border:none;padding:2px 0;text-align:left;font-family:inherit;letter-spacing:0;font-size:18px" data-go="${cur + 1 + wi}">${w.title}</button></p>`).join('')}${c.relics ? `<p><button class="shut" style="border:none;padding:2px 0" data-go="${cur + c.works.length + 1}">Relics and Rites</button></p>` : ''}</div>`;
    } else if (p.k === 'rel') {
      body = `${HEAD}<h2>Relics and Rites</h2><p class="sub">${c.name}</p><p class="by">${c.relics_intro || ''}</p>${c.relics}`;
      fol += ' · ' + 'R';
    } else {
      const w = c.works[p.wi];
      body = `${HEAD}<h2 class="wt">${w.title}</h2><p class="by">${w.by}</p><div class="work">${w.html}</div><span class="tail">&#10087;</span>`;
      fol += ' · ' + (p.wi + 1);
    }
    const prev = PAGES[(cur - 1 + PAGES.length) % PAGES.length], next = PAGES[(cur + 1) % PAGES.length];
    const lab = q => { const cc = book()[q.ci]; return q.k === 'pre' ? cc.name : q.k === 'rel' ? 'Relics and Rites' : cc.works[q.wi].title; };
    leaf.innerHTML = `<div class="txt ${p.k === 'pre' && c.id === 'feuds' ? 'feuds' : ''}">${body}</div>
      <div class="nav"><button data-go="${cur - 1}">‹ ${lab(prev)}</button><span>— ${fol} —</span><button data-go="${cur + 1}">${lab(next)} ›</button></div>`;
    if (p.k === 'pre') { const pre = leaf.querySelector('.pre'); illum(pre && pre.querySelector('p')); }
    else if (p.k === 'work') illum(leaf.querySelector('.work p:not(.orn)'));
    leaf.scrollTop = 0; leaf.classList.remove('turn'); void leaf.offsetWidth; leaf.classList.add('turn');
    renderIndex();
    try { localStorage.setItem('godmarrow.tome2', String(cur)); } catch (e) { }
    try { if (typeof sfx === 'function') { sfx(140, 0.12, 'triangle', 0.015, -40); sfx(90, 0.18, 'sine', 0.012, 20); } } catch (e) { }
  }
  function open() {
    if (!root) build();
    root.hidden = false; place();
    let i = 0; try { i = parseInt(localStorage.getItem('godmarrow.tome2') || '0', 10) || 0; } catch (e) { }
    show(i);
    keyH = e => {
      if (root.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(cur + 1);
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'PageDown') { const ci = PAGES[cur].ci; show(PAGES.findIndex(q => q.ci === (ci + 1) % book().length)); }
      else if (e.key === 'PageUp') { const ci = PAGES[cur].ci; show(PAGES.findIndex(q => q.ci === (ci - 1 + book().length) % book().length)); }
      else return;
      e.preventDefault(); e.stopImmediatePropagation();
    };
    addEventListener('keydown', keyH, true);
    setTimeout(() => { try { root.querySelector('#tomeLeaf').focus({ preventScroll: true }); place(); } catch (e) { } }, 30);
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true; if (keyH) removeEventListener('keydown', keyH, true); keyH = null;
    try { if (typeof sfx === 'function') sfx(70, 0.25, 'sine', 0.02, -20); } catch (e) { }
  }
  addEventListener('keydown', e => { if (root && !root.hidden && e.key !== 'Escape' && !/^(Arrow|Page)/.test(e.key)) e.stopImmediatePropagation(); }, true);
  try { window.__tome = { open, close, show, get open_() { return root && !root.hidden; }, get pages() { return PAGES; } }; } catch (e) { }
})();
