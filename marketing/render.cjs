const { chromium } = require('playwright');
const path = require('path');
const root = '/home/user/APP';
const fs = require('fs');
const data = (f, mime) => `data:${mime};base64,` + fs.readFileSync(path.join(root, f)).toString('base64');
const font700 = data('node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2', 'font/woff2');
const font500 = data('node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2', 'font/woff2');
const logo = data('public/brand/logo-white.png', 'image/png');
const mark = data('public/brand/mark-white.png', 'image/png');
const page = (w, h, body, extra = '') => `<!doctype html><html><head><style>
@font-face { font-family: M; font-weight: 700; src: url(${font700}); }
@font-face { font-family: M; font-weight: 500; src: url(${font500}); }
* { box-sizing: border-box; margin: 0; }
body { width: ${w}px; height: ${h}px; background: #12264a; color: #fff; font-family: M, sans-serif; overflow: hidden; position: relative; }
.wm { position: absolute; right: -8%; bottom: -6%; width: 62%; opacity: .08; }
.badge { display: inline-block; background: #fff; color: #12264a; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; border-radius: 10px; }
h1 { font-weight: 700; line-height: 1.05; letter-spacing: -.01em; }
.offer { border: 2px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); border-radius: 22px; font-weight: 700; }
.url { font-weight: 500; opacity: .85; }
${extra}</style></head><body><img class="wm" src="${mark}">${body}</body></html>`;
const jobs = [
  ['og.png', 1200, 630, `<div style="position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;gap:26px">
     <img src="${logo}" style="width:150px"><span class="badge" style="align-self:flex-start;font-size:22px;padding:8px 16px">Åbner snart</span>
     <h1 style="font-size:64px;max-width:900px">Bliv den person, der inspirerer dig — hver dag.</h1>
     <div class="offer" style="align-self:flex-start;font-size:28px;padding:14px 22px">🎁 Skriv dig op · 1 uge gratis</div></div>`],
  ['instagram-post.png', 1080, 1080, `<div style="position:absolute;inset:0;padding:90px;display:flex;flex-direction:column;gap:40px">
     <img src="${logo}" style="width:190px"><span class="badge" style="align-self:flex-start;font-size:28px;padding:10px 20px">Åbner snart</span>
     <h1 style="font-size:92px">Bliv den person, der inspirerer dig — hver dag.</h1>
     <div style="font-size:34px;line-height:1.4;opacity:.92">Planlæg din dag · bliv udfordret · træn med mig · en coach, der følger op</div>
     <div class="offer" style="align-self:flex-start;font-size:38px;padding:20px 30px;margin-top:auto">🎁 Ventelisten giver 1 uge gratis</div>
     <div class="url" style="font-size:30px">app.patricksimiglai.com/venteliste</div></div>`],
  ['instagram-story.png', 1080, 1920, `<div style="position:absolute;inset:0;padding:180px 90px 220px;display:flex;flex-direction:column;gap:56px">
     <img src="${logo}" style="width:240px"><span class="badge" style="align-self:flex-start;font-size:32px;padding:12px 24px">Åbner snart</span>
     <h1 style="font-size:116px">Bliv den person, der inspirerer dig — hver dag.</h1>
     <div style="font-size:42px;line-height:1.5;opacity:.92">✓ Planlæg din dag på 5 minutter<br>✓ Spørgsmål, der udfordrer dig<br>✓ Træn med mig på video<br>✓ En coach, der følger op</div>
     <div class="offer" style="font-size:46px;padding:28px 36px;margin-top:auto;text-align:center">🎁 Skriv dig på ventelisten<br>og få 1 uge gratis</div>
     <div class="url" style="font-size:36px;text-align:center">Link i bio · app.patricksimiglai.com/venteliste</div></div>`],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h, body] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(page(w, h, body), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: process.argv[2] + '/' + name });
    console.log('rendered', name);
  }
  await b.close();
})();
