// render monster frames straight from monFrame into one PNG: rows = types, columns = poses/phases
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const types = (process.env.TYPES || 'kneeler,moth').split(',');
 const url = await p.evaluate(types => {
   const S = window.__spm, cols = [['idle', 0], ['idle', 2], ['walk', 0], ['walk', 2], ['walk', 4], ['walk', 6], ['wind', 1], ['atk', 1], ['atk', 2]];
   const Z = 3, CW = 90, CH = 90, cv = document.createElement('canvas'); cv.width = CW * cols.length * Z; cv.height = CH * types.length * Z;
   const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#3a3438'; x.fillRect(0, 0, cv.width, cv.height);
   types.forEach((t, r) => { const m = { type: t, rank: 'normal', b: S.MON[t] }; const spr = S.MON[t].spr || t; const [pk, pal] = [t + '|x', S.MPAL[spr] || S.MPAL[t]];
     cols.forEach(([pose, ph], c) => { try { const fr = S.monFrame(spr, pk, pal, pose, ph, 'front'); const im = fr.f || fr.c; const hr = im._hr || im; const sc = hr.width / im.width;
       const w = im.width * Z, h = im.height * Z; x.drawImage(hr, c * CW * Z + (CW * Z - w) / 2, r * CH * Z + (CH * Z - h) - 8, w, h); } catch (e) { x.fillStyle = '#f00'; x.fillText(e.message.slice(0, 30), c * CW * Z + 4, r * CH * Z + 20); } }); });
   return cv.toDataURL(); }, types);
 require('fs').writeFileSync(process.env.OUT || '/tmp/monsheet.png', Buffer.from(url.split(',')[1], 'base64'));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
