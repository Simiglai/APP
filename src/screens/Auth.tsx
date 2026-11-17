import { getLang, t } from '../i18n';
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { COACH_NAME, defaultCurrency } from '../config';
import { BrandLogo } from '../ui';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signup');
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { name: name.trim(), language: getLang(), currency: defaultCurrency() } } })
        : mode === 'reset'
          ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
          : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else if (mode === 'reset') setSent(true);
  };

  return (
    <div className="onboard auth">
      <BrandLogo variant="logo" className="onboard__logo" />
      <h1>{mode === 'signup' ? t('Create your account') : mode === 'reset' ? t('Reset your password') : t('Welcome back')}</h1>
      <p className="muted">
        {mode === 'signup'
          ? t('Daily planning, challenge questions and accountability with {coach}.', { coach: COACH_NAME })
          : mode === 'reset'
            ? t('Enter your email and we’ll send you a link to choose a new password.')
            : t('Log in to continue your streak.')}
      </p>
      <form className="stack" onSubmit={submit}>
        {mode === 'signup' && (
          <label className="field">
            <span className="field__label">{t("First name")}</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
          </label>
        )}
        <label className="field">
          <span className="field__label">{t("Email")}</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {mode !== 'reset' && (
        <label className="field">
          <span className="field__label">{t("Password")}</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
          {mode === 'signup' && <span className="muted small">{t("At least 8 characters.")}</span>}
        </label>
        )}
        {sent && <p className="done-banner">{t("✓ Check your email for the reset link.")}</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn btn--big" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? t('Create account') : mode === 'reset' ? t('Send reset link') : t('Log in')}
        </button>
      </form>
      <button className="btn btn--link" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setSent(false); }}>
        {mode === 'signup' ? t('Already have an account? Log in') : t('New here? Create an account')}
      </button>
      {mode === 'signin' && (
        <button className="btn btn--link" onClick={() => { setMode('reset'); setError(''); }}>{t("Forgot your password?")}</button>
      )}
    </div>
  );
}

const friendly = (msg: string) => {
  if (/invalid login/i.test(msg)) return t("Wrong email or password.");
  if (/already registered/i.test(msg)) return t("That email already has an account — log in instead.");
  if (/password/i.test(msg) && /characters/i.test(msg)) return t("Password must be at least 8 characters.");
  return msg;
};

/** Shown after opening the reset link from the email. */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendly(error.message));
    else onDone();
  };
  return (
    <div className="onboard auth">
      <BrandLogo variant="logo" className="onboard__logo" />
      <h1>{t("Choose a new password")}</h1>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field__label">{t("New password")}</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
          <span className="muted small">{t("At least 8 characters.")}</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn--big" disabled={busy}>{busy ? '…' : t('Save new password')}</button>
      </form>
    </div>
  );
}
