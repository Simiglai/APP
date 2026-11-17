const { chromium, devices } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const out = process.argv[2];
const REF = 'olpjikegieacdcqzenvn', BASE = `https://${REF}.supabase.co`;
const PK = fs.readFileSync('/home/user/APP/src/config.ts', 'utf8').match(/sb_publishable_[A-Za-z0-9_-]+/)[0];
const run = (args, input) => { const o = execSync(`curl -sS --max-time 60 ${args}`, { input }).toString(); try { return JSON.parse(o); } catch { return o; } };
const sql = (q) => run(`-X POST https://api.supabase.com/v1/projects/${REF}/database/query -H 'Content-Type: application/json' --data-binary @-`, JSON.stringify({ query: q }));
const stripe = (path, params = {}, method = '') => run(`${method ? '-X ' + method : ''} https://api.stripe.com/v1/${path} ${Object.entries(params).map(([k, v]) => `-d '${k}=${v}'`).join(' ')}`);
const fn = (name, token, body) => run(`-X POST ${BASE}/functions/v1/${name} -H 'Authorization: Bearer ${token}' -H 'apikey: ${PK}' -H 'Content-Type: application/json' --data-binary @-`, JSON.stringify(body));
const login = (email) => run(`-X POST '${BASE}/auth/v1/token?grant_type=password' -H 'apikey: ${PK}' -H 'Content-Type: application/json' --data-binary @-`, JSON.stringify({ email, password: PW })).access_token;
const step = (m) => console.log('•', m);
const stamp = Date.now(), PW = 'Test-password-123';
const clientEmail = `ps-e2e-appr-${stamp}@psdaily-test.dk`, coachEmail = `ps-e2e-coach-${stamp}@psdaily-test.dk`;
let customer;

(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const mk = async () => {
    const ctx = await b.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors: true });
    const p = await ctx.newPage(); p.errs = [];
    ctx.on('page', (pg) => pg !== p && pg.close().catch(() => {})); // ignore the Calendly tab
    p.on('pageerror', (e) => p.errs.push(e.message)); p.on('dialog', (d) => d.accept());
    return p;
  };
  let c, k;
  try {
    c = await mk();
    await c.goto('http://localhost:5173');
    await c.fill('input[autocomplete="given-name"]', 'Bo'); await c.fill('input[type=email]', clientEmail); await c.fill('input[type=password]', PW);
    await c.click('text=Create account');
    await c.waitForSelector('text=What should we call you?', { timeout: 20000 });
    await c.click('text=Continue'); await c.fill('textarea', 'I am disciplined.'); await c.click('text=Continue');
    await c.locator('textarea').nth(0).fill('A leader.'); await c.click('text=Continue'); await c.click('text=Health'); await c.click('text=Start my first day');
    await c.waitForSelector('text=Book a call to apply', { timeout: 20000 });
    step('gate: Accountable = "' + (await c.textContent('.plan >> nth=0 >> .btn')) + '", Perform = "' + (await c.textContent('.plan >> nth=1 >> .btn')) + '"');
    const href = await c.getAttribute('.plan >> nth=1 >> a.btn', 'href');
    step('booking link prefilled: ' + href.replace(/email=[^&]+/, 'email=…'));
    await c.click('.plan >> nth=1 >> a.btn');
    await c.waitForSelector('text=Call requested', { timeout: 10000 });
    await c.screenshot({ path: `${out}/1-requested.png`, fullPage: true });
    await c.waitForTimeout(2000);
    const uid = sql(`select id from auth.users where email='${clientEmail}'`)[0].id;
    step('server: ' + JSON.stringify(sql(`select requested_tier, approved_tiers from profiles where id='${uid}'`)[0]) + ' message: ' + JSON.stringify(sql(`select body from messages where client_id='${uid}'`)[0]?.body));

    const tok = login(clientEmail);
    step('pay for Perform before approval → ' + JSON.stringify(fn('create-checkout', tok, { tier: 'perform', currency: 'dkk' }).error));

    // coach approves
    k = await mk();
    await k.goto('http://localhost:5173');
    await k.fill('input[autocomplete="given-name"]', 'Coach'); await k.fill('input[type=email]', coachEmail); await k.fill('input[type=password]', PW);
    await k.click('text=Create account');
    await k.waitForSelector('text=What should we call you?', { timeout: 20000 });
    sql(`update profiles set role='coach' from auth.users u where u.id=profiles.id and u.email='${coachEmail}'`);
    await k.reload();
    await k.waitForSelector('text=Call requested for Perform', { timeout: 20000 });
    await k.screenshot({ path: `${out}/2-coach-list.png` });
    step('coach list: ' + (await k.textContent('.client-row')).replace(/\s+/g, ' '));
    await k.click('.client-row');
    await k.waitForSelector('text=Requested a call for Perform', { timeout: 20000 });
    await k.click('.chip:has-text("Perform") >> nth=0');
    await k.waitForSelector('.chip.is-on:has-text("✓ Perform")', { timeout: 10000 });
    await k.screenshot({ path: `${out}/3-coach-approve.png`, fullPage: true });
    step('coach approved → ' + JSON.stringify(sql(`select approved_tiers from profiles where id='${uid}'`)[0]));

    // client sees approval
    await c.reload();
    await c.waitForSelector('text=Choose Perform', { timeout: 20000 });
    step('client now sees: "' + (await c.textContent('.plan >> nth=1 >> .btn')) + '", Elite still: "' + (await c.textContent('.plan >> nth=2 >> .btn')) + '"');
    await c.screenshot({ path: `${out}/4-client-approved.png`, fullPage: true });
    const msgs = sql(`select body from messages where client_id='${uid}' order by created_at`).map((m) => m.body.slice(0, 50));
    step('chat: ' + JSON.stringify(msgs));

    // existing Accountable subscriber upgrades in place
    const co = fn('create-checkout', tok, { tier: 'accountable', currency: 'dkk' });
    step('Accountable checkout (no call needed): ' + (co.url ? 'ok' : JSON.stringify(co)));
    customer = sql(`select stripe_customer_id from profiles where id='${uid}'`)[0].stripe_customer_id;
    const pm = stripe('payment_methods/pm_card_visa/attach', { customer }).id;
    stripe(`customers/${customer}`, { 'invoice_settings[default_payment_method]': pm });
    const price = stripe('prices?lookup_keys[]=ps_accountable_monthly').data[0].id;
    stripe('subscriptions', { customer, 'items[0][price]': price, currency: 'dkk', 'metadata[user_id]': uid, 'metadata[tier]': 'accountable' });
    for (let i = 0; i < 20 && sql(`select plan_status from profiles where id='${uid}'`)[0].plan_status !== 'active'; i++) await c.waitForTimeout(1500);
    step('paid Accountable → ' + JSON.stringify(sql(`select plan, plan_status from profiles where id='${uid}'`)[0]));
    step('try Elite (not approved) → ' + JSON.stringify(fn('create-checkout', tok, { tier: 'elite', currency: 'dkk' }).error));
    const up = fn('create-checkout', tok, { tier: 'perform', currency: 'dkk', returnUrl: 'https://ps-daily.netlify.app/' });
    step('upgrade to Perform → ' + JSON.stringify(up));
    for (let i = 0; i < 20 && sql(`select plan from profiles where id='${uid}'`)[0].plan !== 'perform'; i++) await c.waitForTimeout(1500);
    step('after upgrade → ' + JSON.stringify(sql(`select plan, plan_status from profiles where id='${uid}'`)[0]));
    console.log('client errors:', c.errs, 'coach errors:', k.errs);
  } catch (e) {
    console.log('FAILED:', e.message.split('\n')[0]);
    if (c) await c.screenshot({ path: `${out}/fail.png` }).catch(() => {});
  } finally {
    if (customer) stripe(`customers/${customer}`, {}, 'DELETE');
    sql(`delete from auth.users where email in ('${clientEmail}', '${coachEmail}')`);
    step('test accounts + Stripe test customer deleted');
    await b.close();
  }
})();
