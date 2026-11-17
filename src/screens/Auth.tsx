import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { COACH_NAME } from '../config';
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
        ? await supabase.auth.signUp({ email, password, options: { data: { name: name.trim() } } })
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
      <h1>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h1>
      <p className="muted">
        {mode === 'signup'
          ? `Daily planning, challenge questions and accountability with ${COACH_NAME}.`
          : mode === 'reset'
            ? 'Enter your email and we’ll send you a link to choose a new password.'
            : 'Log in to continue your streak.'}
      </p>
      <form className="stack" onSubmit={submit}>
        {mode === 'signup' && (
          <label className="field">
            <span className="field__label">First name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
          </label>
        )}
        <label className="field">
          <span className="field__label">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {mode !== 'reset' && (
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
          {mode === 'signup' && <span className="muted small">At least 8 characters.</span>}
        </label>
        )}
        {sent && <p className="done-banner">✓ Check your email for the reset link.</p>}
        {error && <p className="error">{error}</p>}
        <button className="btn btn--big" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Log in'}
        </button>
      </form>
      <button className="btn btn--link" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setSent(false); }}>
        {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
      {mode === 'signin' && (
        <button className="btn btn--link" onClick={() => { setMode('reset'); setError(''); }}>Forgot your password?</button>
      )}
    </div>
  );
}

const friendly = (msg: string) => {
  if (/invalid login/i.test(msg)) return 'Wrong email or password.';
  if (/already registered/i.test(msg)) return 'That email already has an account — log in instead.';
  if (/password/i.test(msg) && /characters/i.test(msg)) return 'Password must be at least 8 characters.';
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
      <h1>Choose a new password</h1>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field__label">New password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
          <span className="muted small">At least 8 characters.</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn--big" disabled={busy}>{busy ? '…' : 'Save new password'}</button>
      </form>
    </div>
  );
}
