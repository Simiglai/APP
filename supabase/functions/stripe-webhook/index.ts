// Stripe → Supabase: keeps profiles.plan / plan_status in sync with the client's subscription.
// Deployed without JWT verification (Stripe calls it). Authenticity: we never trust the request body —
// we re-fetch the event and the subscription from Stripe with our secret key, so forged calls do nothing.
import { createClient } from 'npm:@supabase/supabase-js@2';

const STATUS: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  unpaid: 'canceled',
  canceled: 'canceled',
  incomplete_expired: 'canceled',
  incomplete: 'none',
  paused: 'canceled',
};
const TIERS = ['accountable', 'perform', 'elite'];

async function stripeGet(path: string) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}` } });
  if (!res.ok) return null;
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  const body = await req.json().catch(() => null);
  const eventId = body?.id;
  if (typeof eventId !== 'string' || !eventId.startsWith('evt_')) return new Response('bad request', { status: 400 });

  const event = await stripeGet(`events/${eventId}`);
  if (!event) return new Response('unknown event', { status: 400 });

  const obj = event.data?.object ?? {};
  const subscriptionId: string | undefined =
    obj.object === 'subscription' ? obj.id : obj.object === 'checkout.session' ? obj.subscription : obj.object === 'invoice' ? obj.subscription : undefined;
  if (!subscriptionId) return new Response('ignored');

  // Always use the subscription's current state — robust against out-of-order or repeated events.
  const sub = await stripeGet(`subscriptions/${subscriptionId}?expand[]=items.data.price`);
  if (!sub) return new Response('unknown subscription', { status: 400 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let userId: string | undefined = sub.metadata?.user_id;
  if (!userId) {
    const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', sub.customer).maybeSingle();
    userId = data?.id;
  }
  if (!userId) return new Response('no matching user');

  const lookup: string = sub.items?.data?.[0]?.price?.lookup_key ?? '';
  const tier = TIERS.find((t) => lookup === `ps_${t}_monthly`) ?? sub.metadata?.tier;
  const update: Record<string, string> = {
    plan_status: STATUS[sub.status] ?? 'none',
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
  };
  if (tier && TIERS.includes(tier)) update.plan = tier;

  // Only the newest subscription controls access: ignore events for an older, replaced subscription.
  const { data: current } = await admin.from('profiles').select('stripe_subscription_id, plan_status').eq('id', userId).single();
  if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id && ['active', 'trialing'].includes(current.plan_status) && update.plan_status !== 'active') {
    return new Response('older subscription ignored');
  }

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
