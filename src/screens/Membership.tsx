import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from '../lib/store';
import { PLANS, type Tier } from '../lib/plans';
import { BOOKING_URL, COACH_NAME, formatPrice, type Currency } from '../config';
import { callFunction, supabase } from '../lib/supabase';

/**
 * Plans + Stripe checkout. With `gate`, it is the first screen for clients without an active plan.
 */
export default function Membership({ onBack, gate }: { onBack?: () => void; gate?: boolean }) {
  const { state, updateProfile, activeTier, refresh, sendMessage, email } = useStore();
  const { approvedTiers, requestedTier, name } = state.profile;
  const currency = state.profile.currency;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const returned = new URLSearchParams(location.search).get('checkout');

  useEffect(() => {
    // back from Stripe: fetch the new plan (the webhook may need a few seconds)
    if (returned === 'success' || returned === 'changed') {
      const t = [1500, 4000, 8000].map((ms) => window.setTimeout(refresh, ms));
      return () => t.forEach(window.clearTimeout);
    }
  }, [returned, refresh]);

  /** Calendly link prefilled with the client's name and email, so the coach knows who booked. */
  const bookingLink = `${BOOKING_URL}?${new URLSearchParams({ name, email })}`;
  const needsCall = (tier: Tier) => tier !== 'accountable' && !approvedTiers.includes(tier);
  const requestCall = (tier: Tier) => {
    updateProfile({ requestedTier: tier, requestedAt: new Date().toISOString() });
    if (requestedTier !== tier) sendMessage(`📞 I'm booking a call to apply for ${PLANS.find((p) => p.id === tier)?.name}.`);
  };

  const go = async (fn: 'create-checkout' | 'customer-portal', body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setError('');
    try {
      const { url } = await callFunction<{ url: string }>(fn, { ...body, returnUrl: location.origin + location.pathname });
      location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — please try again.');
      setBusy(null);
    }
  };

  // new subscription, or a switch of the existing one (handled by the same function)
  const choose = (tier: Tier) => go('create-checkout', { tier, currency: currency.toLowerCase() }, tier);

  return (
    <div className="stack">
      <header className="page-head">
        {onBack && (
          <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>‹ Back</button>
        )}
        <h1>{gate ? `Welcome${state.profile.name ? `, ${state.profile.name}` : ''}` : 'Membership'}</h1>
        <p className="muted">
          {gate ? 'Choose your plan to start. You can change or cancel any time.' : 'Choose the level of support that matches your ambition.'}
        </p>
        <div className="segmented" role="radiogroup" aria-label="Currency">
          {(['DKK', 'USD'] as Currency[]).map((c) => (
            <button key={c} role="radio" aria-checked={currency === c} className={currency === c ? 'is-on' : ''} onClick={() => updateProfile({ currency: c })}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {(returned === 'success' || returned === 'changed') && (
        <Card>
          <p>{returned === 'success' ? 'Payment received — your plan is being activated.' : 'Your plan is being changed.'}</p>
          <button className="btn btn--ghost" onClick={refresh}>Refresh</button>
        </Card>
      )}
      {error && <p className="error">{error}</p>}

      {PLANS.map((p) => {
        const on = p.id === activeTier;
        return (
          <section key={p.id} className={`card plan${on ? ' plan--current' : ''}`}>
            <div className="plan__head">
              <h2>{p.name}</h2>
              {on && <span className="tag tag--challenge">Your plan</span>}
            </div>
            <p className="plan__price">
              {formatPrice(p.price[currency], currency)}
              <span>/{currency === 'DKK' ? 'md.' : 'month'}</span>
            </p>
            <p className="muted">{p.tagline}</p>
            <ul className="plan__list">
              {p.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {!on && needsCall(p.id) && (
              <>
                <p className="call-note">
                  {requestedTier === p.id
                    ? `📞 Call requested. ${COACH_NAME} will unlock ${p.name} for you after your call.`
                    : `${p.name} starts with a free 30-minute call with ${COACH_NAME}, to make sure it’s the right fit.`}
                </p>
                <a className="btn" href={bookingLink} target="_blank" rel="noopener" onClick={() => requestCall(p.id)}>
                  {requestedTier === p.id ? 'Book another time' : 'Book a call to apply'}
                </a>
              </>
            )}
            {!on && !needsCall(p.id) && (
              <button className="btn" disabled={!!busy} onClick={() => choose(p.id)}>
                {busy === p.id ? (activeTier ? 'Switching…' : 'Opening secure checkout…') : activeTier ? `Switch to ${p.name}` : `Choose ${p.name}`}
                {p.id !== 'accountable' && !activeTier && ' ✓ approved'}
              </button>
            )}
          </section>
        );
      })}

      {activeTier && state.profile.role === 'client' && (
        <button className="btn btn--ghost" disabled={!!busy} onClick={() => go('customer-portal', {}, 'portal')}>
          {busy === 'portal' ? 'Opening…' : 'Card, receipts & cancel'}
        </button>
      )}

      <section className="card card--accent plan">
        <h2 className="locked__title">Private Personal Advisory</h2>
        <p>One-to-one advisory with {COACH_NAME}. Tailored to you — business, performance and life. By application only.</p>
        <p className="small">Start with a free 30-minute clarification call.</p>
        <a className="btn btn--invert" href={bookingLink} target="_blank" rel="noopener">Book a free call</a>
      </section>

      <p className="muted small center">Secure payments by Stripe. Monthly subscription, cancel any time.</p>
      {gate && (
        <button className="btn btn--link" onClick={() => supabase.auth.signOut()}>Log out</button>
      )}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="card">{children}</section>;
}
