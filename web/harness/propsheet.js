const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(600);
 const url = await p.evaluate(() => {
   const Z = window.__zt, items = [];
   for (const k of Z.PROPS) for (let v = 0; v < 3; v++) { try { items.push([k + v, Z.prop(k, v)]); } catch (e) { } }
   for (const k of Z.OBJS) { try { items.push(['o:' + k, Z.obj(k, 0)]); } catch (e) { } }
   for (let t = 0; t < Z.TREE_N; t++) { try { items.push(['t' + t, Z.tree(t, 3)]); } catch (e) { } }
   const Zm = 2, cols = 10, cw = 150, ch = 190, rows = Math.ceil(items.length / cols);
   const cv = document.createElement('canvas'); cv.width = cols * cw * Zm; cv.height = rows * ch * Zm; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#34303a'; x.fillRect(0, 0, cv.width, cv.height);
   items.forEach(([n, fr], i) => { const c = fr.c || fr; const X = (i % cols) * cw * Zm, Y = Math.floor(i / cols) * ch * Zm; const k = Math.min(1, (cw - 4) / c.width, (ch - 16) / c.height) * Zm;
     x.drawImage(c, X + 2, Y + 14, c.width * k, c.height * k); x.fillStyle = '#e8e2d0'; x.font = '18px sans-serif'; x.fillText(n, X + 4, Y + 18); });
   return cv.toDataURL(); });
 require('fs').writeFileSync('/tmp/propsheet.png', Buffer.from(url.split(',')[1], 'base64'));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
