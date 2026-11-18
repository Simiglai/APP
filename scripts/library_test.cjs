const { chromium, devices } = require('playwright');
const { execSync } = require('child_process');
const out = process.argv[2];
const REF = 'olpjikegieacdcqzenvn';
const sql = (q) => JSON.parse(execSync(`curl -sS -X POST https://api.supabase.com/v1/projects/${REF}/database/query -H 'Content-Type: application/json' --data-binary @-`, { input: JSON.stringify({ query: q }) }).toString());
const stamp = Date.now(), PW = 'Test-password-123';
const email = `ps-lib-${stamp}@psdaily-test.dk`, coachEmail = `ps-lib-coach-${stamp}@psdaily-test.dk`;
const TITLE = `E2E Styrke ${stamp}`, TITLE2 = `E2E Mobilitet ${stamp}`;
const step = (m) => console.log('•', m);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const mk = async () => { const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'da-DK', ignoreHTTPSErrors: true }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('dialog', (d) => d.accept()); return p; };
  const signup = async (p, name, mail) => {
    await p.goto('http://localhost:5173');
    await p.fill('input[autocomplete="given-name"]', name); await p.fill('input[type=email]', mail); await p.fill('input[type=password]', PW);
    await p.click('text=Opret konto'); await p.waitForSelector('text=Hvad skal vi kalde dig?', { timeout: 20000 });
  };
  let k, c;
  try {
    // coach adds workouts
    k = await mk(); await signup(k, 'Coach', coachEmail);
    sql(`update profiles set role='coach' from auth.users u where u.id=profiles.id and u.email='${coachEmail}'`);
    await k.reload(); await k.waitForSelector('text=Coach-dashboard', { timeout: 20000 });
    await k.click('.segmented >> text=Workouts');
    await k.click('text=+ Ny workout');
    await k.fill('input[placeholder="f.eks. 20 min styrke for hele kroppen"]', TITLE);
    await k.fill('input[type=number]', '25');
    await k.click('.chip:has-text("Begynder")');
    await k.fill('input[placeholder="https://youtu.be/…"]', 'https://youtu.be/abcDEF12345');
    await k.waitForSelector('.video iframe', { timeout: 5000 });
    step('coach: video preview shown for YouTube link → ' + await k.getAttribute('.video iframe', 'src'));
    await k.fill('textarea', 'Opvarmning 5 min\nGoblet squat 3x10\nArmstrækninger 3x8');
    await k.click('text=Gem workout');
    await k.waitForSelector(`.list__item:has-text("${TITLE}")`, { timeout: 10000 });
    await k.click('text=+ Ny workout');
    await k.fill('input[placeholder="f.eks. 20 min styrke for hele kroppen"]', TITLE2);
    await k.click('.chip:has-text("Mobilitet")');
    await k.click('text=Gem workout');
    await k.waitForSelector(`.list__item:has-text("${TITLE2}")`, { timeout: 10000 });
    const w1 = sql(`select id from workouts where title='${TITLE}'`)[0].id;
    await k.selectOption('.schedule-row >> nth=0 >> select', w1);
    await k.waitForTimeout(1500);
    step('coach: scheduled today → ' + JSON.stringify(sql(`select date, workout_id = '${w1}' as ok from workout_schedule where workout_id='${w1}'`)));
    await k.screenshot({ path: `${out}/1-coach-workouts.png`, fullPage: true });

    // client with Accountable
    c = await mk(); await signup(c, 'Bo', email);
    const uid = sql(`select id from auth.users where email='${email}'`)[0].id;
    sql(`update profiles set onboarded=true, plan='accountable', plan_status='active' where id='${uid}'`);
    await c.reload(); await c.waitForSelector('text=Dagens workout', { timeout: 20000 });
    step('client Today shows WOD: ' + (await c.textContent('.wod')).replace(/\s+/g, ' ').slice(0, 120));
    await c.locator('.wod').scrollIntoViewIfNeeded();
    await c.screenshot({ path: `${out}/2-today-wod.png` });
    await c.click('.wod >> text=Afspil video'); await c.waitForSelector('.wod .video iframe', { timeout: 5000 });
    await c.click('.wod >> text=Gennemført ✓'); await c.waitForSelector('.wod >> text=✓ Gennemført', { timeout: 5000 });
    await c.waitForTimeout(2000);
    step('server day.training: ' + JSON.stringify(sql(`select data->'training' as tr from days where user_id='${uid}'`)[0]?.tr));
    await c.click('.tabbar >> text=Træning'); await c.waitForSelector('.wgrid', { timeout: 10000 });
    step('library tiles: ' + await c.locator('.wgrid .wtile').count() + ' · personal program card shown: ' + (await c.locator('text=Dit personlige program').count()));
    await c.screenshot({ path: `${out}/3-train-library.png`, fullPage: true });
    await c.click('.chip:has-text("Mobilitet")');
    step('filter Mobilitet → tiles: ' + await c.locator('.wgrid .wtile').count());
    await c.click('.chip:has-text("Alle")');
    await c.click(`.wgrid >> text=${TITLE}`); await c.waitForSelector('text=‹ Alle workouts');
    step('detail (full screen): ' + (await c.textContent('main')).replace(/\s+/g, ' ').slice(0, 160));
    await c.screenshot({ path: `${out}/4-detail.png`, fullPage: true });
    // Perform client sees TP card
    sql(`update profiles set plan='perform' where id='${uid}'`);
    await c.reload(); await c.click('.tabbar >> text=Træning');
    await c.waitForSelector('text=Dit personlige program', { timeout: 15000 }).then(() => step('as Perform → personal program card shown ✓')).catch(() => step('as Perform → personal program card MISSING'));
    console.log('coach errors:', k.errs, 'client errors:', c.errs);
  } catch (e) { console.log('FAILED:', e.message.split('\n')[0]); if (c) await c.screenshot({ path: `${out}/fail-c.png` }); if (k) await k.screenshot({ path: `${out}/fail-k.png` }); }
  finally {
    sql(`delete from workouts where title in ('${TITLE}','${TITLE2}')`);
    sql(`delete from auth.users where email in ('${email}','${coachEmail}')`); step('cleanup done'); await b.close();
  }
})();
