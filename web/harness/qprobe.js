const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join('|'))); p.on('console', m=>{ if(m.type()==='error') errs.push('c:'+m.text()); });
await p.goto('file://' + process.env.HTML); await p.waitForTimeout(800);
console.log(await p.evaluate(() => ({ spm: !!window.__spm, q: !!(window.__spm && window.__spm.q), err: window.__spm && window.__spm.G.error })));
console.log(errs.join('\n')); await b.close(); })();
