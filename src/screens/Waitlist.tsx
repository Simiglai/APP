/**
 * Public pre-launch page: /venteliste (share link: app.patricksimiglai.com/venteliste?ref=instagram).
 * People join the mailing list and get the launch offer: 1 week free.
 */
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { COACH_NAME, formatPrice } from '../config';
import { PLANS } from '../lib/plans';
import { getLang, t, useLang } from '../i18n';
import { LegalLinks } from '../ui';
import { PRIVACY_PATH } from './Legal';

export const WAITLIST_PATH = '/venteliste';

const FEATURES = [
  { icon: '🌅', title: 'Plan your day in 5 minutes', text: 'Purpose, top 3 goals, food, training and socials — every morning.' },
  { icon: '❓', title: 'Questions that challenge you', text: 'Two honest questions a day that make you think — and act.' },
  { icon: '🏋️', title: 'Train with Patrick', text: 'Workout of the day on video: strength, mobility and recovery.' },
  { icon: '🤝', title: 'A coach who follows up', text: 'Patrick sees your check-ins and keeps you accountable — every day.' },
];

export default function Waitlist() {
  const { lang, setLang } = useLang();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState(''); // honeypot: real people never fill this hidden field
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'already'>('idle');
  const [error, setError] = useState('');
  const source = new URLSearchParams(location.search).get('ref')?.slice(0, 60) || null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (trap) return setState('done');
    setState('busy');
    setError('');
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim(), name: name.trim(), language: getLang(), source, marketing_consent: consent });
    if (!error) return setState('done');
    if (error.code === '23505') return setState('already'); // already on the list
    setState('idle');
    setError(t('Something went wrong — please try again.'));
  };

  const from = formatPrice(PLANS[0].price.DKK, 'DKK');

  return (
    <main className="wl">
      <section className="wl__hero">
        <div className="wl__top">
          <img src="/brand/logo-white.png" alt={COACH_NAME} className="wl__logo" />
          <button className="wl__lang" onClick={() => setLang(lang === 'da' ? 'en' : 'da')}>{lang === 'da' ? 'English' : 'Dansk'}</button>
        </div>
        <span className="wl__badge">{t('Launching soon')}</span>
        <h1>{t('Become the person who inspires you — every day.')}</h1>
        <p>{t('The coaching app from {coach}: plan your day, get challenged, train on video and have a coach who keeps you accountable.', { coach: COACH_NAME })}</p>
        <div className="wl__offer">🎁 {t('Join the waitlist and get your first week free when we launch.')}</div>
      </section>

      <section className="wl__form card">
        {state === 'done' || state === 'already' ? (
          <div className="stack">
            <h2>{state === 'done' ? t('You’re on the list! 🎉') : t('You’re already on the list 👍')}</h2>
            <p>{t('We’ll email you when the app opens — with your free week. Use the same email when you sign up.')}</p>
            <p className="muted small">{t('Share it with a friend who needs a push:')}</p>
            <button
              className="btn btn--ghost"
              onClick={() => {
                const url = `${location.origin}${WAITLIST_PATH}?ref=friend`;
                if (navigator.share) navigator.share({ url, text: t('Join me on the waitlist for {coach}’s coaching app — first week free.', { coach: COACH_NAME }) }).catch(() => {});
                else navigator.clipboard?.writeText(url).then(() => alert(t('Link copied ✓')));
              }}
            >
              {t('Share the waitlist')}
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <h2>{t('Get early access + 1 week free')}</h2>
            <label className="field">
              <span className="field__label">{t('First name')}</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required maxLength={100} />
            </label>
            <label className="field">
              <span className="field__label">{t('Email')}</span>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <input className="wl__trap" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} aria-hidden="true" />
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
              <span>
                {t('Yes, email me when the app launches, plus news and offers from {coach}. You can unsubscribe at any time. See the', { coach: COACH_NAME })}{' '}
                <a href={PRIVACY_PATH} target="_blank" rel="noopener">{t('privacy policy')}</a>.
              </span>
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn--big" disabled={state === 'busy' || !consent}>{state === 'busy' ? '…' : t('Join the waitlist')}</button>
          </form>
        )}
      </section>

      <section className="wl__features">
        {FEATURES.map((f) => (
          <div key={f.title} className="wl__feature">
            <span aria-hidden>{f.icon}</span>
            <div>
              <strong>{t(f.title)}</strong>
              <p>{t(f.text)}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="wl__plans card">
        <h2>{t('Plans from {price}/month', { price: from })}</h2>
        <ul className="plan__list">
          <li><b>Accountable</b> — {t('daily check-in, workout of the day and your coach in your pocket.')}</li>
          <li><b>Perform</b> — {t('+ a personal training program in TrainingPeaks.')}</li>
          <li><b>Elite</b> — {t('+ mental worksheets and events.')}</li>
        </ul>
        <p className="muted small">{t('Cancel any time. Your first week is free when you join the waitlist.')}</p>
      </section>

      <LegalLinks />
    </main>
  );
}
