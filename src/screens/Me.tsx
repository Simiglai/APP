import { useStore } from '../lib/store';
import { addDays, todayKey } from '../lib/dates';
import { Card, TextField } from '../ui';
import { planById } from '../lib/plans';
import { CURRENCY } from '../config';

export default function Me({ onWeekly, onGoals, onMembership }: { onWeekly: () => void; onGoals: () => void; onMembership: () => void }) {
  const { state, updateProfile, getDay, streak, reset } = useStore();
  const p = state.profile;

  const last14 = Array.from({ length: 14 }, (_, i) => getDay(addDays(todayKey(), i - 13)));
  const checkins = Object.values(state.days).filter((d) => d.morningDoneAt).length;
  const disciplineWins = Object.values(state.days).filter((d) => d.discipline.done).length;
  const rated = Object.values(state.days).filter((d) => d.rating != null);
  const avgRating = rated.length ? (rated.reduce((a, d) => a + (d.rating ?? 0), 0) / rated.length).toFixed(1) : '–';

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{p.name || 'Me'}</h1>
        <p className="muted">Identity first. Results follow.</p>
      </header>

      <div className="stats-grid">
        <div><strong>{streak}</strong><span>Current streak</span></div>
        <div><strong>{checkins}</strong><span>Check-ins</span></div>
        <div><strong>{disciplineWins}</strong><span>Discipline wins</span></div>
        <div><strong>{avgRating}</strong><span>Avg day rating</span></div>
      </div>

      <button className="card plan-badge" onClick={onMembership}>
        <span>
          <small className="muted">Your membership</small>
          <strong>{planById(p.plan).name} · {CURRENCY}{planById(p.plan).price}/mo</strong>
        </span>
        <span className="edit-link">Manage ›</span>
      </button>

      <Card title="Goals" hint={`${state.goals.length} active goal${state.goals.length === 1 ? '' : 's'} — your daily Top 3 should move these forward.`}>
        <button className="btn" onClick={onGoals}>Open goals</button>
      </Card>

      <Card title="Weekly review" icon="📅" hint="Every Sunday: score the week and set next week’s focus.">
        <button className="btn" onClick={onWeekly}>Open weekly review</button>
      </Card>

      <Card title="Last 14 days" icon="📊" hint="Mood (top) and energy (bottom)">
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

      <Card title="My identity" icon="🪞" hint="Who am I?">
        <TextField multiline value={p.identity} onChange={(identity) => updateProfile({ identity })} placeholder="I am…" />
      </Card>
      <Card title="Who I am becoming" icon="🚀" hint="What can I become?">
        <TextField multiline value={p.becoming} onChange={(becoming) => updateProfile({ becoming })} placeholder="I am becoming…" />
      </Card>
      <Card title="My purpose" icon="🧭">
        <TextField multiline value={p.purpose} onChange={(purpose) => updateProfile({ purpose })} placeholder="My mission is…" />
      </Card>
      <Card title="Core values" icon="⚓">
        <div className="chips">{p.values.map((v) => <span key={v} className="chip is-on">{v}</span>)}</div>
      </Card>

      <button className="btn btn--link danger" onClick={() => confirm('Erase all data on this device?') && reset()}>Reset all data</button>
    </div>
  );
}
