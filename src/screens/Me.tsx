import { t, useLang } from '../i18n';
import { useStore } from '../lib/store';
import { addDays, todayKey } from '../lib/dates';
import { Card, LegalLinks, TextField } from '../ui';
import { callFunction, supabase } from '../lib/supabase';
import { planById } from '../lib/plans';
import { formatPrice } from '../config';

export default function Me({ onWeekly, onGoals, onMembership }: { onWeekly: () => void; onGoals: () => void; onMembership: () => void }) {
  const { state, updateProfile, getDay, streak, activeTier, syncStatus, userId } = useStore();
  const p = state.profile;
  const { lang, setLang } = useLang();

  const deleteAccount = async () => {
    if (!confirm(t('Delete your account and all your data? This cannot be undone.'))) return;
    if (!confirm(t('Are you sure? Your subscription is cancelled immediately.'))) return;
    try {
      await callFunction('delete-account', {});
      try {
        localStorage.removeItem(`ps-daily:${userId}`);
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut();
      alert(t('Your account has been deleted.'));
    } catch (e) {
      alert(e instanceof Error ? t(e.message) : t('Something went wrong — please try again.'));
    }
  };

  const last14 = Array.from({ length: 14 }, (_, i) => getDay(addDays(todayKey(), i - 13)));
  const checkins = Object.values(state.days).filter((d) => d.morningDoneAt).length;
  const disciplineWins = Object.values(state.days).filter((d) => d.discipline.done).length;
  const rated = Object.values(state.days).filter((d) => d.rating != null);
  const avgRating = rated.length ? (rated.reduce((a, d) => a + (d.rating ?? 0), 0) / rated.length).toFixed(1) : '–';

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{p.name || t('Me')}</h1>
        <p className="muted">{t('Identity first. Results follow.')}</p>
      </header>

      <div className="stats-grid">
        <div><strong>{streak}</strong><span>{t("Current streak")}</span></div>
        <div><strong>{checkins}</strong><span>{t("Check-ins")}</span></div>
        <div><strong>{disciplineWins}</strong><span>{t("Discipline wins")}</span></div>
        <div><strong>{avgRating}</strong><span>{t("Avg day rating")}</span></div>
      </div>

      <button className="card plan-badge" onClick={onMembership}>
        <span>
          <small className="muted">{t("Your membership")}</small>
          <strong>{activeTier ? `${planById(activeTier).name} · ${formatPrice(planById(activeTier).price[p.currency], p.currency)}/${t('mo')}` : t('No active plan')}</strong>
        </span>
        <span className="edit-link">{t("Manage ›")}</span>
      </button>

      <Card title={t("Goals")} hint={t(state.goals.length === 1 ? '{n} active goal — your daily Top 3 should move it forward.' : '{n} active goals — your daily Top 3 should move these forward.', { n: state.goals.length })}>
        <button className="btn" onClick={onGoals}>{t("Open goals")}</button>
      </Card>

      <Card title={t("Weekly review")} icon="📅" hint={t("Every Sunday: score the week and set next week’s focus.")}>
        <button className="btn" onClick={onWeekly}>{t("Open weekly review")}</button>
      </Card>

      <Card title={t("Last 14 days")} icon="📊" hint={t("Mood (top) and energy (bottom)")}>
        <div className="bars">
          {last14.map((d) => (
            <div key={d.date} className="bars__col" title={d.date}>
              <div className="bars__bar bars__bar--mood" style={{ height: `${(d.mood ?? 0) * 8}px` }} />
              <div className="bars__bar bars__bar--energy" style={{ height: `${(d.energy ?? 0) * 8}px` }} />
              <small>{Number(d.date.slice(-2))}</small>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t("My identity")} icon="🪞" hint={t("Who am I?")}>
        <TextField multiline value={p.identity} onChange={(identity) => updateProfile({ identity })} placeholder={t("I am…")} />
      </Card>
      <Card title={t("Who I am becoming")} icon="🚀" hint={t("What can I become?")}>
        <TextField multiline value={p.becoming} onChange={(becoming) => updateProfile({ becoming })} placeholder={t("I am becoming…")} />
      </Card>
      <Card title={t("My purpose")} icon="🧭">
        <TextField multiline value={p.purpose} onChange={(purpose) => updateProfile({ purpose })} placeholder={t("My mission is…")} />
      </Card>
      <Card title={t("Core values")} icon="⚓">
        <div className="chips">{p.values.map((v) => <span key={v} className="chip is-on">{t(v)}</span>)}</div>
      </Card>

      <Card title={t("Language")}>
        <div className="segmented" role="radiogroup" aria-label="Language">
          {(['da', 'en'] as const).map((l) => (
            <button key={l} role="radio" aria-checked={lang === l} className={lang === l ? 'is-on' : ''} onClick={() => {
                supabase.from('profiles').update({ language: l }).eq('id', userId).then(() => {});
                setLang(l);
              }}>
              {l === 'da' ? 'Dansk' : 'English'}
            </button>
          ))}
        </div>
      </Card>

      <p className="muted small center">
        {t({ loading: 'Loading…', synced: '✓ All changes saved', saving: 'Saving…', offline: 'Offline — changes will sync when you’re back online' }[syncStatus])}
      </p>
      <button className="btn btn--link danger" onClick={() => confirm(t('Log out on this device?')) && supabase.auth.signOut()}>{t("Log out")}</button>
      <button className="btn btn--link muted small" onClick={deleteAccount}>{t('Delete my account')}</button>
      <LegalLinks />
    </div>
  );
}
