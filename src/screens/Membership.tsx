import { useStore } from '../lib/store';
import { PLANS } from '../lib/plans';
import { BOOKING_URL, COACH_NAME, formatPrice, type Currency } from '../config';

export default function Membership({ onBack }: { onBack: () => void }) {
  const { state, updateProfile, sendMessage } = useStore();
  const current = state.profile.plan;
  const currency = state.profile.currency;

  const requestCall = () => {
    if (BOOKING_URL) {
      window.open(BOOKING_URL, '_blank', 'noopener');
    } else {
      sendMessage(`📞 I would like to book a call about Private Personal Advisory.`);
      alert(`Request sent to ${COACH_NAME}. You will get a reply in your coach chat.`);
    }
  };

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>‹ Back</button>
        <h1>Membership</h1>
        <p className="muted">Choose the level of support that matches your ambition.</p>
        <div className="segmented" role="radiogroup" aria-label="Currency">
          {(['DKK', 'USD'] as Currency[]).map((c) => (
            <button key={c} role="radio" aria-checked={currency === c} className={currency === c ? 'is-on' : ''} onClick={() => updateProfile({ currency: c })}>
              {c}
            </button>
          ))}
        </div>
      </header>

      {PLANS.map((p) => {
        const on = p.id === current;
        return (
          <section key={p.id} className={`card plan${on ? ' plan--current' : ''}`}>
            <div className="plan__head">
              <h2>{p.name}</h2>
              {on && <span className="tag tag--challenge">Your plan</span>}
            </div>
            <p className="plan__price">
              {formatPrice(p.price[currency], currency)}<span>/{currency === 'DKK' ? 'md.' : 'month'}</span>
            </p>
            <p className="muted">{p.tagline}</p>
            <ul className="plan__list">
              {p.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {!on && (
              <button className="btn" onClick={() => updateProfile({ plan: p.id })}>
                Choose {p.name}
              </button>
            )}
          </section>
        );
      })}

      <section className="card card--accent plan">
        <h2 className="locked__title">Private Personal Advisory</h2>
        <p>One-to-one advisory with {COACH_NAME}. Tailored to you — business, performance and life. By application only.</p>
        <p className="small">Start with a free 30-minute clarification call.</p>
        <button className="btn btn--invert" onClick={requestCall}>Book a free call</button>
      </section>

      <p className="muted small center">Preview mode: choosing a plan switches it instantly. Card payments (Stripe) are connected in the next step.</p>
    </div>
  );
}
