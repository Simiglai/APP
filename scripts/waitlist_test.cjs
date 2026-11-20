const { chromium, devices } = require('playwright');
const { execSync } = require('child_process');
const out = process.argv[2];
const REF = 'olpjikegieacdcqzenvn';
const sql = (q) => JSON.parse(execSync(`curl -sS -X POST https://api.supabase.com/v1/projects/${REF}/database/query -H 'Content-Type: application/json' --data-binary @-`, { input: JSON.stringify({ query: q }) }).toString());
const email = `ps-wl-${Date.now()}@psdaily-test.dk`;
const step = (m) => console.log('•', m);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
  const p = await (await b.newContext({ ...devices['iPhone 13'], locale: 'da-DK' })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  try {
    await p.goto('https://app.patricksimiglai.com/venteliste?ref=instagram');
    await p.waitForSelector('text=Skriv mig op');
    await p.screenshot({ path: `${out}/1-page.png`, fullPage: true });
    step('button disabled before consent: ' + await p.isDisabled('text=Skriv mig op'));
    await p.fill('input[autocomplete="given-name"]', 'Test'); await p.fill('input[type=email]', email);
    await p.check('.consent input'); await p.click('text=Skriv mig op');
    await p.waitForSelector('text=Du er på listen', { timeout: 15000 });
    await p.screenshot({ path: `${out}/2-done.png` });
    step('db: ' + JSON.stringify(sql(`select name, source, language, marketing_consent from waitlist where email='${email}'`)));
    await p.goto('https://app.patricksimiglai.com/venteliste');
    await p.fill('input[autocomplete="given-name"]', 'Test'); await p.fill('input[type=email]', email.toUpperCase());
    await p.check('.consent input'); await p.click('text=Skriv mig op');
    await p.waitForSelector('text=allerede på listen', { timeout: 15000 });
    step('same email again → "already on the list" ✓');
    console.log('errors:', errs);
  } catch (e) { console.log('FAILED:', e.message.split('\n')[0]); await p.screenshot({ path: `${out}/fail.png` }); }
  finally { sql(`delete from waitlist where lower(email)=lower('${email}')`); step('cleanup done'); await b.close(); }
})();
