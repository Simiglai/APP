import { t } from '../i18n';
import { useState } from 'react';
import { useStore } from '../lib/store';
import type { Goal, GoalArea } from '../lib/types';
import { Card, CheckRow, Progress, TextField } from '../ui';

const AREAS: { area: GoalArea; icon: string }[] = [
  { area: 'Health', icon: '❤️' },
  { area: 'Career', icon: '💼' },
  { area: 'Relationships', icon: '🤝' },
  { area: 'Mind', icon: '🧠' },
  { area: 'Finance', icon: '💰' },
  { area: 'Purpose', icon: '🧭' },
];
const iconFor = (a: GoalArea) => AREAS.find((x) => x.area === a)?.icon ?? '🎯';

const blank = { title: '', area: 'Health' as GoalArea, why: '', targetDate: '', milestones: [{ text: '', done: false }] };

export default function Goals({ onBack }: { onBack: () => void }) {
  const { state, saveGoal, updateGoal, deleteGoal } = useStore();
  const [draft, setDraft] = useState<typeof blank | null>(null);

  const submit = () => {
    if (!draft || !draft.title.trim()) return;
    saveGoal({ ...draft, milestones: draft.milestones.filter((m) => m.text.trim()) });
    setDraft(null);
  };

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>{t("‹ Back")}</button>
        <h1>{t("Goals")}</h1>
        <p className="muted">{t("Big goals, broken into milestones. Your daily Top 3 should move these forward.")}</p>
      </header>

      {draft ? (
        <Card title={t("New goal")} icon="✨">
          <TextField label={t("Goal")} value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder={t("Run a half marathon")} />
          <div className="field">
            <span className="field__label">{t("Life area")}</span>
            <div className="chips">
              {AREAS.map(({ area, icon }) => (
                <button key={area} className={`chip${draft.area === area ? ' is-on' : ''}`} onClick={() => setDraft({ ...draft, area })}>
                  {icon} {t(area)}
                </button>
              ))}
            </div>
          </div>
          <TextField multiline label={t("Why does this matter to me?")} value={draft.why} onChange={(why) => setDraft({ ...draft, why })} placeholder={t("Because I want to prove to myself that I finish what I start.")} />
          <label className="field">
            <span className="field__label">{t("Target date")}</span>
            <input className="input" type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
          </label>
          <div className="field">
            <span className="field__label">{t("Milestones")}</span>
            {draft.milestones.map((m, i) => (
              <input
                key={i}
                className="input"
                value={m.text}
                placeholder={t('Milestone {n}', { n: i + 1 })}
                onChange={(e) => setDraft({ ...draft, milestones: draft.milestones.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
              />
            ))}
            <button className="btn btn--link" onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { text: '', done: false }] })}>{t("+ Add milestone")}</button>
          </div>
          <div className="row">
            <button className="btn btn--ghost" onClick={() => setDraft(null)}>{t("Cancel")}</button>
            <button className="btn" disabled={!draft.title.trim()} onClick={submit}>{t("Save goal")}</button>
          </div>
        </Card>
      ) : (
        <button className="btn" onClick={() => setDraft({ ...blank, milestones: [{ text: '', done: false }] })}>{t("+ New goal")}</button>
      )}

      {state.goals.length === 0 && !draft && <p className="empty">{t("No goals yet. Start with one that excites and scares you a little.")}</p>}

      {state.goals.map((g) => (
        <GoalCard key={g.id} goal={g} onUpdate={(p) => updateGoal(g.id, p)} onDelete={() => deleteGoal(g.id)} />
      ))}
    </div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: { goal: Goal; onUpdate: (p: Partial<Goal>) => void; onDelete: () => void }) {
  const done = goal.milestones.filter((m) => m.done).length;
  const pct = goal.milestones.length ? done / goal.milestones.length : 0;
  return (
    <Card title={goal.title} icon={iconFor(goal.area)} hint={`${t(goal.area)}${goal.targetDate ? ` · ${t('by')} ${goal.targetDate}` : ''}`}>
      {goal.why && <p className="why">“{goal.why}”</p>}
      <Progress value={pct} />
      <p className="muted small">{t('{done} of {total} milestones', { done, total: goal.milestones.length })}</p>
      {goal.milestones.map((m, i) => (
        <CheckRow
          key={i}
          done={m.done}
          text={m.text}
          onToggle={() => onUpdate({ milestones: goal.milestones.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
          onText={(text) => onUpdate({ milestones: goal.milestones.map((x, j) => (j === i ? { ...x, text } : x)) })}
        />
      ))}
      <div className="row">
        <button className="btn btn--link" onClick={() => onUpdate({ milestones: [...goal.milestones, { text: '', done: false }] })}>{t("+ Milestone")}</button>
        <button className="btn btn--link danger" onClick={() => confirm(t('Delete “{title}”?', { title: goal.title })) && onDelete()}>{t("Delete")}</button>
      </div>
    </Card>
  );
}
