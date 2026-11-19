// GDPR "right to erasure": the signed-in client deletes their own account.
// Cancels any Stripe subscription immediately, then deletes the auth user — every table cascades from it.
// Stripe keeps the customer's invoices (Danish bookkeeping rules require keeping them).
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Please log in again.' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await admin.from('profiles').select('role, stripe_subscription_id').eq('id', user.id).single();
    if (profile?.role === 'coach') return json({ error: 'The coach account cannot be deleted from the app.' }, 403);

    const key = Deno.env.get('STRIPE_SECRET_KEY');
    if (key && profile?.stripe_subscription_id) {
      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}` },
      });
      // 404 = already gone; anything else means we must not delete the account while billing continues
      if (!res.ok && res.status !== 404) return json({ error: 'Could not cancel your subscription — please try again or contact your coach.' }, 502);
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return json({ error: error.message }, 500);
    return json({ deleted: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
