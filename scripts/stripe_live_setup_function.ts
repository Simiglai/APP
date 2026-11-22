// NOT DEPLOYED. Reference copy of the one-off Supabase function used on 2026-11-19 to create the live
// Stripe plans, webhook and portal with the key stored in Supabase. To reuse: copy to
// supabase/functions/stripe-setup/, set a SETUP_TOKEN secret, deploy, call once, then delete both.
// ONE-OFF: creates the PS Daily plans, webhook and billing-portal configuration in the Stripe
// account whose key is stored in STRIPE_SECRET_KEY (used for going live without handling the key).
// Protected by a one-time SETUP_TOKEN secret. Deployed temporarily and deleted right after use.
// Idempotent: re-running reuses what already exists.
const PLANS = [
  { tier: 'accountable', name: 'Patrick Simiglai — Accountable', dkk: 34900, usd: 5000,
    desc: 'Workout of the day + video library (strength, mobility, recovery), daily check-in & planner, challenge questions, identity work, coach chat, weekly review & goals.' },
  { tier: 'perform', name: 'Patrick Simiglai — Perform', dkk: 199900, usd: 30000,
    desc: 'Everything in Accountable + personal training program in TrainingPeaks, built for you. Starts with a call.' },
  { tier: 'elite', name: 'Patrick Simiglai — Elite', dkk: 349900, usd: 50000,
    desc: 'Everything in Perform + mental worksheets and events. Starts with a call.' },
  { tier: 'private', name: 'Patrick Simiglai — Private', dkk: 5000000, usd: null, interval: 'year', lookup: 'ps_private_12m',
    desc: '12 months one-to-one with Patrick: everything in Elite + his private phone number, private days (dinners, events, races) and a personal plan. Paid upfront, no automatic renewal. Starts with a call.' },
] as { tier: string; name: string; dkk: number; usd: number | null; desc: string; interval?: string; lookup?: string }[];
const EVENTS = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed'];

async function stripe(path: string, params?: [string, string][], method = params ? 'POST' : 'GET') {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params ? new URLSearchParams(params) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data?.error?.message ?? res.status}`);
  return data;
}

Deno.serve(async (req) => {
  const token = Deno.env.get('SETUP_TOKEN');
  if (!token || req.headers.get('x-setup-token') !== token) return new Response('forbidden', { status: 403 });
  const log: Record<string, unknown> = {};
  try {
    const account = await stripe('account');
    const balance = await stripe('balance');
    log.account = { country: account.country, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, livemode: balance.livemode };

    const productIds: string[] = [];
    const priceIds: string[] = [];
    for (const p of PLANS) {
      const lookup = p.lookup ?? `ps_${p.tier}_monthly`;
      const existing = await stripe(`prices?lookup_keys[]=${lookup}&active=true`);
      if (existing.data?.[0]) {
        productIds.push(existing.data[0].product);
        priceIds.push(existing.data[0].id);
        log[p.tier] = 'already existed';
        continue;
      }
      const prod = await stripe('products', [
        ['name', p.name], ['description', p.desc], ['statement_descriptor', 'PATRICK SIMIGLAI'], ['metadata[tier]', p.tier], ['metadata[app]', 'ps-daily'],
      ]);
      const price = await stripe('prices', [
        ['product', prod.id], ['currency', 'dkk'], ['unit_amount', String(p.dkk)],
        ...(p.usd !== null ? [['currency_options[usd][unit_amount]', String(p.usd)] as [string, string]] : []),
        ['recurring[interval]', p.interval ?? 'month'], ['lookup_key', lookup], ['metadata[tier]', p.tier],
      ]);
      productIds.push(prod.id);
      priceIds.push(price.id);
      log[p.tier] = { dkk: p.dkk / 100, usd: p.usd === null ? null : p.usd / 100, created: true };
    }

    const hookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`;
    const hooks = await stripe('webhook_endpoints?limit=100');
    if (hooks.data.some((h: { url: string }) => h.url === hookUrl)) log.webhook = 'already existed';
    else {
      await stripe('webhook_endpoints', [['url', hookUrl], ['description', 'Patrick Simiglai app — plan sync'], ['metadata[app]', 'ps-daily'], ...EVENTS.map((e) => ['enabled_events[]', e] as [string, string])]);
      log.webhook = 'created';
    }

    const portals = await stripe('billing_portal/configurations?active=true&limit=100');
    if (portals.data.some((c: { metadata?: { app?: string } }) => c.metadata?.app === 'ps-daily')) log.portal = 'already existed';
    else {
      await stripe('billing_portal/configurations', [
        ['business_profile[headline]', 'Patrick Simiglai'], ['metadata[app]', 'ps-daily'],
        ['features[subscription_update][enabled]', 'false'],
        ['features[subscription_cancel][enabled]', 'true'], ['features[subscription_cancel][mode]', 'at_period_end'],
        ['features[payment_method_update][enabled]', 'true'], ['features[invoice_history][enabled]', 'true'],
      ]);
      log.portal = 'created';
    }
    return new Response(JSON.stringify({ ok: true, ...log }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), ...log }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
