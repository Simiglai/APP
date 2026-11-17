import { byLang, t } from '../i18n';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, todayKey, weekdayIndex, weekdays } from '../lib/dates';
import type { TrainingWeek } from '../lib/types';
import { Card, Locked, TextField } from '../ui';
import { hasFeature } from '../lib/plans';

const TEMPLATES_EN: Record<string, TrainingWeek> = {
  'Beginner — 3 days': [
    { title: 'Full body A', details: 'Goblet squat 3x10, push-ups 3x8, DB row 3x10, plank 3x30s', rest: false },
    { title: 'Walk 30 min', details: 'Easy pace, outdoors if possible', rest: false },
    { title: 'Full body B', details: 'Lunges 3x10, incline press 3x10, glute bridge 3x12, dead bug 3x10', rest: false },
    { title: 'Walk 30 min', details: 'Easy pace + 10 min stretching', rest: false },
    { title: 'Full body A', details: 'Add 1 rep or a little weight vs Monday', rest: false },
    { title: 'Active fun', details: 'Bike, swim, sport, play with the kids', rest: false },
    { title: 'Rest', details: 'Recover and plan next week', rest: true },
  ],
  'Fat loss — 5 days': [
    { title: 'Strength upper + 15 min HIIT', details: 'Bench/push-ups, rows, press, curls · 10x 30s on/30s off', rest: false },
    { title: 'Zone 2 cardio 45 min', details: 'Keep heart rate conversational', rest: false },
    { title: 'Strength lower + core', details: 'Squat, RDL, split squats, hanging knee raises', rest: false },
    { title: 'Rest / 8k steps', details: 'Mobility 15 min', rest: true },
    { title: 'Metcon 30 min', details: 'EMOM: KB swings, burpees, row/bike calories', rest: false },
    { title: 'Long walk / hike 60–90 min', details: 'Fasted or after light breakfast', rest: false },
    { title: 'Rest', details: 'Meal prep for the week', rest: true },
  ],
  'Running — 10k build': [
    { title: 'Easy run 5k', details: 'Conversational pace', rest: false },
    { title: 'Strength 30 min', details: 'Squats, lunges, calf raises, core', rest: false },
    { title: 'Intervals', details: '6x 400m fast / 200m walk', rest: false },
    { title: 'Rest', details: 'Mobility + foam roll', rest: true },
    { title: 'Tempo run 4k', details: 'Comfortably hard', rest: false },
    { title: 'Long run 8–10k', details: 'Slow and steady, build 10% per week', rest: false },
    { title: 'Rest', details: 'Walk + stretch', rest: true },
  ],
};

const TEMPLATES_DA: Record<string, TrainingWeek> = {
  'Begynder — 3 dage': [
    { title: 'Fuld krop A', details: 'Goblet squat 3x10, armstrækninger 3x8, roning med håndvægt 3x10, planke 3x30 sek', rest: false },
    { title: 'Gåtur 30 min', details: 'Roligt tempo, gerne udendørs', rest: false },
    { title: 'Fuld krop B', details: 'Udfald 3x10, skråbænkspres 3x10, hoftehævning 3x12, dead bug 3x10', rest: false },
    { title: 'Gåtur 30 min', details: 'Roligt tempo + 10 min udstrækning', rest: false },
    { title: 'Fuld krop A', details: 'Læg 1 gentagelse eller lidt mere vægt på i forhold til mandag', rest: false },
    { title: 'Aktiv leg', details: 'Cykling, svømning, sport, leg med børnene', rest: false },
    { title: 'Hvile', details: 'Restitution og planlægning af næste uge', rest: true },
  ],
  'Vægttab — 5 dage': [
    { title: 'Styrke overkrop + 15 min HIIT', details: 'Bænkpres/armstrækninger, roning, pres, curls · 10x 30 sek arbejde/30 sek pause', rest: false },
    { title: 'Zone 2-kondition 45 min', details: 'Hold et tempo, hvor du kan tale', rest: false },
    { title: 'Styrke underkrop + core', details: 'Squat, rumænsk dødløft, split squats, hængende knæløft', rest: false },
    { title: 'Hvile / 8.000 skridt', details: 'Mobilitet 15 min', rest: true },
    { title: 'Metcon 30 min', details: 'EMOM: kettlebell swings, burpees, kalorier på roer/cykel', rest: false },
    { title: 'Lang gåtur / vandring 60–90 min', details: 'Fastende eller efter en let morgenmad', rest: false },
    { title: 'Hvile', details: 'Madlavning til ugen', rest: true },
  ],
  'Løb — op til 10 km': [
    { title: 'Roligt løb 5 km', details: 'Snakketempo', rest: false },
    { title: 'Styrke 30 min', details: 'Squats, udfald, tåhævninger, core', rest: false },
    { title: 'Intervaller', details: '6x 400 m hurtigt / 200 m gang', rest: false },
    { title: 'Hvile', details: 'Mobilitet + foam roller', rest: true },
    { title: 'Tempoløb 4 km', details: 'Behageligt hårdt', rest: false },
    { title: 'Langtur 8–10 km', details: 'Langsomt og roligt, øg med 10 % om ugen', rest: false },
    { title: 'Hvile', details: 'Gåtur + udstrækning', rest: true },
  ],
};

export default function Train({ onUpgrade }: { onUpgrade: () => void }) {
  const { state, setTraining, getDay, activeTier } = useStore();
  const [editing, setEditing] = useState<number | null>(null);
  const todayIdx = weekdayIndex(todayKey());

  const edit = (i: number, patch: Partial<TrainingWeek[number]>) => setTraining(state.training.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  // Completed sessions in the last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), i - 6);
    return { key, done: getDay(key).training.done, label: weekdays()[weekdayIndex(key)][0] };
  });

  if (!hasFeature(activeTier, 'training')) {
    return (
      <div className="stack">
        <header className="page-head">
          <h1>{t("Training")}</h1>
          <p className="muted">{t("You still log your training every day in your check-in.")}</p>
        </header>
        <Locked feature="training" title={t("Personal training programs")} onUpgrade={onUpgrade}>
          <p>{t("A weekly program built for your goal, synced with TrainingPeaks, with progress tracking.")}</p>
        </Locked>
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{t("Training plan")}</h1>
        <p className="muted">{t("Your week at a glance. Today’s session shows up in your daily check-in.")}</p>
      </header>

      <Card title="TrainingPeaks" hint={t("Your workouts from TrainingPeaks will sync here automatically.")}>
        <p className="muted small">{t("Automatic sync is being set up. Until then, open your workouts in TrainingPeaks and tick them off here.")}</p>
        <div className="row">
          <button className="btn" disabled>{t("Connect TrainingPeaks · soon")}</button>
          <a className="btn btn--ghost" href="https://app.trainingpeaks.com" target="_blank" rel="noopener">{t("Open TrainingPeaks")}</a>
        </div>
      </Card>

      <Card title={t("Last 7 days")} icon="📈">
        <div className="week-dots">
          {last7.map((d) => (
            <div key={d.key} className={`week-dot${d.done ? ' is-on' : ''}`}>
              <span>{d.done ? '✓' : ''}</span>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        <p className="muted small">{t('{n} sessions completed this week', { n: last7.filter((d) => d.done).length })}</p>
      </Card>

      {state.training.map((w, i) => (
        <Card key={i} title={weekdays()[i]} icon={w.rest ? '🧘' : i === todayIdx ? '👉' : '🏋️'} hint={i === todayIdx ? t('Today') : undefined}>
          {editing === i ? (
            <>
              <TextField label={t("Session")} value={w.title} onChange={(title) => edit(i, { title })} />
              <TextField multiline label={t("Details")} value={w.details} onChange={(details) => edit(i, { details })} />
              <label className="toggle">
                <input type="checkbox" checked={w.rest} onChange={(e) => edit(i, { rest: e.target.checked })} /> {t('Rest day')}
              </label>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>{t("Done")}</button>
            </>
          ) : (
            <button className="plain" onClick={() => setEditing(i)}>
              <strong>{w.title}</strong>
              <p className="muted small">{w.details}</p>
              <span className="edit-link">{t("Edit")}</span>
            </button>
          )}
        </Card>
      ))}

      <Card title={t("Load a template")} icon="📋" hint={t("Replaces your current week.")}>
        <div className="chips">
          {Object.entries(byLang({ en: TEMPLATES_EN, da: TEMPLATES_DA })).map(([name, week]) => (
            <button key={name} className="chip" onClick={() => confirm(t('Replace your week with “{name}”?', { name })) && setTraining(week)}>{name}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}
