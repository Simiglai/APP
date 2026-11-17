// Opens the Stripe billing portal: switch plan, update card, cancel, receipts.
// POST { returnUrl } → { url }
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (!key) return json({ error: 'Payments are not configured yet (STRIPE_SECRET_KEY missing).' }, 500);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Please log in again.' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).single();
    if (!profile?.stripe_customer_id) return json({ error: 'No subscription found for this account.' }, 404);

    const { returnUrl, locale } = await req.json().catch(() => ({}));
    const back = typeof returnUrl === 'string' && /^https?:\/\//.test(returnUrl) ? returnUrl : Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: profile.stripe_customer_id, return_url: `${back}?checkout=portal`, locale: locale === 'da' ? 'da' : 'auto' }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.error?.message ?? 'Could not open billing portal.' }, 500);
    return json({ url: data.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
