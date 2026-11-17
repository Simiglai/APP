import { t } from '../i18n';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { BrandLogo, TextField } from '../ui';

const VALUE_OPTIONS = ['Discipline', 'Health', 'Family', 'Growth', 'Courage', 'Integrity', 'Freedom', 'Faith', 'Service', 'Excellence', 'Joy', 'Wealth', 'Love', 'Adventure'];

export default function Onboarding() {
  const { state, updateProfile } = useStore();
  const p = state.profile;
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t("Welcome. Let’s build the best version of you."),
      body: (
        <>
          <p className="muted">{t("This takes 2 minutes. Your answers shape your daily check-ins.")}</p>
          <TextField label={t("What should we call you?")} value={p.name} onChange={(name) => updateProfile({ name })} placeholder={t("Your first name")} />
        </>
      ),
      ok: p.name.trim().length > 0,
    },
    {
      title: t("What’s your identity?"),
      body: (
        <>
          <p className="muted">{t("Lasting change starts with who you believe you are. Write it in the present tense.")}</p>
          <TextField multiline label={t("I am…")} value={p.identity} onChange={(identity) => updateProfile({ identity })} placeholder={t("I am an athlete who never misses a training session. I am a calm, present father.")} />
        </>
      ),
      ok: p.identity.trim().length > 0,
    },
    {
      title: t("What can you become?"),
      body: (
        <>
          <p className="muted">{t("Picture yourself 3 years from now, fully living your potential.")}</p>
          <TextField multiline label={t("I am becoming…")} value={p.becoming} onChange={(becoming) => updateProfile({ becoming })} placeholder={t("Strong, lean and energetic. Running my own business. Known for keeping my word.")} />
          <TextField multiline label={t("My purpose / mission")} value={p.purpose} onChange={(purpose) => updateProfile({ purpose })} placeholder={t("To inspire people around me to take ownership of their health and life.")} />
        </>
      ),
      ok: p.becoming.trim().length > 0,
    },
    {
      title: t("Your core values"),
      body: (
        <>
          <p className="muted">{t("Pick up to 3. These are your compass on hard days.")}</p>
          <div className="chips">
            {VALUE_OPTIONS.map((v) => {
              const on = p.values.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  className={`chip${on ? ' is-on' : ''}`}
                  onClick={() => updateProfile({ values: on ? p.values.filter((x) => x !== v) : p.values.length < 3 ? [...p.values, v] : p.values })}
                >
                  {t(v)}
                </button>
              );
            })}
          </div>
        </>
      ),
      ok: p.values.length > 0,
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="onboard">
      <BrandLogo variant={step === 0 ? 'logo' : 'mark'} className="onboard__logo" />
      <div className="onboard__dots">
        {steps.map((_, i) => (
          <span key={i} className={i <= step ? 'is-on' : ''} />
        ))}
      </div>
      <h1>{s.title}</h1>
      <div className="stack">{s.body}</div>
      <div className="onboard__actions">
        {step > 0 && (
          <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>
            {t("Back")}
          </button>
        )}
        <button className="btn" disabled={!s.ok} onClick={() => (last ? updateProfile({ onboarded: true }) : setStep(step + 1))}>
          {last ? t("Start my first day") : t("Continue")}
        </button>
      </div>
    </div>
  );
}
