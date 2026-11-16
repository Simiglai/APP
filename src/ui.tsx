import type { ReactNode } from 'react';
import { CURRENCY } from './config';
import { planFor, type Feature } from './lib/plans';

// `icon` is accepted for readability at call sites but not rendered — the brand look is clean typography.
export function Card({ title, hint, children, accent }: { title?: string; icon?: string; hint?: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className={`card${accent ? ' card--accent' : ''}`}>
      {title && (
        <header className="card__head">
          <h2>{title}</h2>
          {hint && <p className="card__hint">{hint}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function TextField({ value, onChange, placeholder, multiline, label }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; label?: string }) {
  const input = multiline ? (
    <textarea className="input" rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
  );
  if (!label) return input;
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {input}
    </label>
  );
}

export function Scale({ value, onChange, max = 5, labels }: { value: number | null; onChange: (v: number) => void; max?: number; labels?: string[] }) {
  return (
    <div className="scale" role="radiogroup">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          className={`scale__btn${value === n ? ' is-on' : ''}`}
          onClick={() => onChange(n)}
        >
          {labels?.[n - 1] ?? n}
        </button>
      ))}
    </div>
  );
}

export function CheckRow({ done, text, onToggle, onText, placeholder }: { done: boolean; text: string; onToggle: () => void; onText: (v: string) => void; placeholder?: string }) {
  return (
    <div className={`checkrow${done ? ' is-done' : ''}`}>
      <button type="button" className="checkbox" aria-pressed={done} aria-label={done ? 'Mark not done' : 'Mark done'} onClick={onToggle}>
        {done ? '✓' : ''}
      </button>
      <input className="input input--bare" value={text} placeholder={placeholder} onChange={(e) => onText(e.target.value)} />
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" aria-valuenow={Math.round(value * 100)} role="progressbar">
      <div className="progress__bar" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/** Official Patrick Simiglai logo (from the design manual) — navy on light, white on dark. Never redrawn. */
export function BrandLogo({ variant = 'mark', className }: { variant?: 'mark' | 'logo'; className?: string }) {
  return (
    <picture>
      <source srcSet={`/brand/${variant}-white.png`} media="(prefers-color-scheme: dark)" />
      <img className={className} src={`/brand/${variant}-navy.png`} alt="Patrick Simiglai" />
    </picture>
  );
}

/** Shown in place of a feature the client's plan does not include. */
export function Locked({ feature, title, children, onUpgrade }: { feature: Feature; title: string; children?: ReactNode; onUpgrade: () => void }) {
  const plan = planFor(feature);
  return (
    <section className="card card--accent locked">
      <span className="tag tag--plan">{plan.name} · {CURRENCY}{plan.price}/mo</span>
      <h2 className="locked__title">{title}</h2>
      {children && <div className="locked__body">{children}</div>}
      <button className="btn btn--invert" onClick={onUpgrade}>Unlock with {plan.name}</button>
    </section>
  );
}
