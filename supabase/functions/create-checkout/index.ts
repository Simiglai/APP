// Creates a Stripe Checkout session for a monthly PS Daily plan.
// POST { tier: 'accountable'|'perform'|'elite', currency: 'dkk'|'usd', returnUrl } → { url }
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function stripe(path: string, params?: Record<string, string>, method = params ? 'POST' : 'GET') {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) throw new Error('Payments are not configured yet (STRIPE_SECRET_KEY missing).');
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  const init: RequestInit = { method, headers: { Authorization: `Bearer ${key}` } };
  if (params && method === 'POST') {
    init.body = new URLSearchParams(params);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (params) for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe error ${res.status}`);
  return data;
}

const TIERS = ['accountable', 'perform', 'elite'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Please log in again.' }, 401);

    const { tier, currency, returnUrl, locale } = await req.json();
    if (!TIERS.includes(tier)) return json({ error: 'Unknown plan.' }, 400);
    const cur = currency === 'usd' ? 'usd' : 'dkk';
    const back = typeof returnUrl === 'string' && /^https?:\/\//.test(returnUrl) ? returnUrl : Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin
      .from('profiles')
      .select('name, plan, plan_status, stripe_customer_id, stripe_subscription_id, approved_tiers')
      .eq('id', user.id)
      .single();

    // Perform and Elite are by application: only after a call and the coach's approval.
    if (tier !== 'accountable' && !(profile?.approved_tiers ?? []).includes(tier)) {
      return json({ error: 'Book a call first — you can join this plan once your coach has approved you.' }, 403);
    }

    const prices = await stripe('prices', { 'lookup_keys[]': `ps_${tier}_monthly`, active: 'true' }, 'GET');
    const price = prices.data?.[0];
    if (!price) return json({ error: 'This plan is not available right now.' }, 500);

    // Already subscribed → switch the existing subscription (prorated) instead of starting a second one.
    if (profile?.plan_status === 'active' || profile?.plan_status === 'trialing') {
      if (profile.plan === tier) return json({ error: 'You are already on this plan.' }, 409);
      if (!profile.stripe_subscription_id) return json({ error: 'Your plan is managed by your coach — send them a message to change it.' }, 409);
      const sub = await stripe(`subscriptions/${profile.stripe_subscription_id}`, undefined, 'GET');
      await stripe(`subscriptions/${sub.id}`, {
        'items[0][id]': sub.items.data[0].id,
        'items[0][price]': price.id,
        proration_behavior: 'create_prorations',
        'metadata[tier]': tier,
      });
      return json({ url: `${back}?checkout=changed` }); // the webhook updates the plan
    }

    // one Stripe customer per user
    let customer = profile?.stripe_customer_id as string | null;
    if (!customer) {
      const c = await stripe('customers', { email: user.email ?? '', name: profile?.name ?? '', 'metadata[user_id]': user.id });
      customer = c.id as string;
      await admin.from('profiles').update({ stripe_customer_id: customer }).eq('id', user.id);
    }

    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      'line_items[0][price]': price.id,
      'line_items[0][quantity]': '1',
      currency: cur,
      allow_promotion_codes: 'true',
      locale: locale === 'da' ? 'da' : 'auto',
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][tier]': tier,
      success_url: `${back}?checkout=success`,
      cancel_url: `${back}?checkout=cancel`,
    });
    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
