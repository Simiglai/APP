import { useState } from 'react';
import { useStore } from '../lib/store';
import { WEEKDAYS, addDays, todayKey, weekdayIndex } from '../lib/dates';
import type { TrainingWeek } from '../lib/types';
import { Card, TextField } from '../ui';

const TEMPLATES: Record<string, TrainingWeek> = {
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

export default function Train() {
  const { state, setTraining, getDay } = useStore();
  const [editing, setEditing] = useState<number | null>(null);
  const todayIdx = weekdayIndex(todayKey());

  const edit = (i: number, patch: Partial<TrainingWeek[number]>) => setTraining(state.training.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  // Completed sessions in the last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), i - 6);
    return { key, done: getDay(key).training.done, label: WEEKDAYS[weekdayIndex(key)][0] };
  });

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Training plan</h1>
        <p className="muted">Your week at a glance. Today’s session shows up in your daily check-in.</p>
      </header>

      <Card title="Last 7 days" icon="📈">
        <div className="week-dots">
          {last7.map((d) => (
            <div key={d.key} className={`week-dot${d.done ? ' is-on' : ''}`}>
              <span>{d.done ? '✓' : ''}</span>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        <p className="muted small">{last7.filter((d) => d.done).length} sessions completed this week</p>
      </Card>

      {state.training.map((w, i) => (
        <Card key={i} title={WEEKDAYS[i]} icon={w.rest ? '🧘' : i === todayIdx ? '👉' : '🏋️'} hint={i === todayIdx ? 'Today' : undefined}>
          {editing === i ? (
            <>
              <TextField label="Session" value={w.title} onChange={(title) => edit(i, { title })} />
              <TextField multiline label="Details" value={w.details} onChange={(details) => edit(i, { details })} />
              <label className="toggle">
                <input type="checkbox" checked={w.rest} onChange={(e) => edit(i, { rest: e.target.checked })} /> Rest day
              </label>
              <button className="btn btn--ghost" onClick={() => setEditing(null)}>Done</button>
            </>
          ) : (
            <button className="plain" onClick={() => setEditing(i)}>
              <strong>{w.title}</strong>
              <p className="muted small">{w.details}</p>
              <span className="edit-link">Edit</span>
            </button>
          )}
        </Card>
      ))}

      <Card title="Load a template" icon="📋" hint="Replaces your current week.">
        <div className="chips">
          {Object.entries(TEMPLATES).map(([name, week]) => (
            <button key={name} className="chip" onClick={() => confirm(`Replace your week with “${name}”?`) && setTraining(week)}>{name}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}
