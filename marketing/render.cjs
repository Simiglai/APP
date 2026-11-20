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
  ['carousel-1.png', 1080, 1350, `<div style="position:absolute;inset:0;padding:96px 90px 90px;display:flex;flex-direction:column;gap:34px"><img src="${logo}" style="width:210px"><span class="badge" style="align-self:flex-start;font-size:28px;padding:10px 20px">Åbner snart</span><h1 style="font-size:112px">3 måder at blive bedre på — hver dag.</h1><div style="font-size:40px;line-height:1.45;opacity:.92">Accountable · Perform · Elite<br>Find det niveau, der passer til dig.</div><div style="margin-top:auto;font-size:40px;font-weight:700">Swipe →</div></div>`],
  ['carousel-2.png', 1080, 1350, `<div style="position:absolute;inset:0;padding:96px 90px 90px;display:flex;flex-direction:column;gap:34px"><div style="display:flex;justify-content:space-between;align-items:center"><img src="${logo}" style="width:130px"><span style="font-size:30px;opacity:.6;font-weight:500">2/5</span></div><span class="badge" style="align-self:flex-start;font-size:26px;padding:10px 18px">Start her</span><h1 style="font-size:120px">Accountable</h1><div style="font-size:64px;font-weight:700">349 kr.<span style="font-size:32px;font-weight:500;opacity:.75"> /md.</span></div><div style="font-size:36px;line-height:1.45;display:flex;flex-direction:column;gap:14px"><div>✓ Dagligt check-in: formål, top 3, mad, træning og relationer</div><div>✓ 2 udfordrende spørgsmål hver dag</div><div>✓ Arbejde med din identitet — hvem er du ved at blive?</div><div>✓ Dagens workout med mig på video</div><div>✓ Mig som din accountability-coach i chatten</div><div>✓ Ugentlig evaluering hver søndag</div></div><div class="offer" style="margin-top:auto;font-size:32px;padding:20px 28px">🎁 1. uge gratis via ventelisten</div></div>`],
  ['carousel-3.png', 1080, 1350, `<div style="position:absolute;inset:0;padding:96px 90px 90px;display:flex;flex-direction:column;gap:34px"><div style="display:flex;justify-content:space-between;align-items:center"><img src="${logo}" style="width:130px"><span style="font-size:30px;opacity:.6;font-weight:500">3/5</span></div><span class="badge" style="align-self:flex-start;font-size:26px;padding:10px 18px">Starter med en samtale</span><h1 style="font-size:120px">Perform</h1><div style="font-size:64px;font-weight:700">1.999 kr.<span style="font-size:32px;font-weight:500;opacity:.75"> /md.</span></div><div style="font-size:36px;line-height:1.45;display:flex;flex-direction:column;gap:14px"><div>✓ Alt i Accountable</div><div>✓ Personligt træningsprogram i TrainingPeaks, bygget til dig</div><div>✓ Opfølgning på din træning og dine fremskridt</div><div>✓ En gratis samtale først — så vi sikrer, at det passer</div></div><div class="offer" style="margin-top:auto;font-size:32px;padding:20px 28px">📞 Book en gratis samtale</div></div>`],
  ['carousel-4.png', 1080, 1350, `<div style="position:absolute;inset:0;padding:96px 90px 90px;display:flex;flex-direction:column;gap:34px"><div style="display:flex;justify-content:space-between;align-items:center"><img src="${logo}" style="width:130px"><span style="font-size:30px;opacity:.6;font-weight:500">4/5</span></div><span class="badge" style="align-self:flex-start;font-size:26px;padding:10px 18px">Starter med en samtale</span><h1 style="font-size:120px">Elite</h1><div style="font-size:64px;font-weight:700">3.499 kr.<span style="font-size:32px;font-weight:500;opacity:.75"> /md.</span></div><div style="font-size:36px;line-height:1.45;display:flex;flex-direction:column;gap:14px"><div>✓ Alt i Perform</div><div>✓ Mentale øvelser og mindset-arbejde</div><div>✓ Adgang til events og fællesskab</div><div>✓ Det fulde system: krop, sind og fællesskab</div></div><div class="offer" style="margin-top:auto;font-size:32px;padding:20px 28px">📞 Book en gratis samtale</div></div>`],
  ['carousel-5.png', 1080, 1350, `<div style="position:absolute;inset:0;padding:96px 90px 90px;display:flex;flex-direction:column;gap:34px"><div style="display:flex;justify-content:space-between;align-items:center"><img src="${logo}" style="width:130px"><span style="font-size:30px;opacity:.6;font-weight:500">5/5</span></div><h1 style="font-size:110px;margin-top:40px">Skriv dig på ventelisten.</h1><div class="offer" style="font-size:46px;padding:28px 34px">🎁 Få din første uge gratis, når appen åbner</div><div style="font-size:36px;line-height:1.5;opacity:.92">Privat personlig rådgivning?<br>Book en gratis afklaringssamtale.</div><div class="url" style="margin-top:auto;font-size:38px">Link i bio<br>app.patricksimiglai.com/venteliste</div></div>`],
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
