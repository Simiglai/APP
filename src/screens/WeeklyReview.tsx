import { useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, prettyDate, todayKey, weekStart } from '../lib/dates';
import { Card, Scale, TextField } from '../ui';

export default function WeeklyReview({ onBack }: { onBack: () => void }) {
  const { getDay, getWeek, updateWeek, sendMessage, state } = useStore();
  const [start, setStart] = useState(weekStart(todayKey()));
  const w = getWeek(start);
  const set = (patch: Parameters<typeof updateWeek>[1]) => updateWeek(start, patch);

  const days = Array.from({ length: 7 }, (_, i) => getDay(addDays(start, i)));
  const checkins = days.filter((d) => d.morningDoneAt).length;
  const training = days.filter((d) => d.training.done).length;
  const discipline = days.filter((d) => d.discipline.done).length;
  const connections = days.filter((d) => d.connect.done).length;
  const rated = days.filter((d) => d.rating != null);
  const avg = rated.length ? (rated.reduce((a, d) => a + (d.rating ?? 0), 0) / rated.length).toFixed(1) : '–';
  const isCurrent = start === weekStart(todayKey());

  const finish = () => {
    set({ doneAt: new Date().toISOString() });
    sendMessage(
      [
        `📅 Weekly review — week of ${start}`,
        `Score: ${w.score ?? '–'}/10 · check-ins ${checkins}/7 · training ${training} · discipline wins ${discipline}`,
        w.biggestWin && `🏆 Biggest win: ${w.biggestWin}`,
        w.fellShort && `⚠️ Fell short: ${w.fellShort}`,
        w.becameMore && `🪞 Acted like who I’m becoming: ${w.becameMore}`,
        w.doDifferently && `🔁 Do differently: ${w.doDifferently}`,
        w.nextFocus && `🎯 Next week’s focus: ${w.nextFocus}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>‹ Back</button>
        <div className="hero__nav">
          <button className="iconbtn" aria-label="Previous week" onClick={() => setStart(addDays(start, -7))}>‹</button>
          <span>Week of {prettyDate(start).split(',').slice(1).join(',').trim()}</span>
          <button className="iconbtn" aria-label="Next week" disabled={isCurrent} onClick={() => setStart(addDays(start, 7))}>›</button>
        </div>
        <h1>Weekly review</h1>
        <p className="muted">Look back honestly. Decide who you’ll be next week.</p>
      </header>

      <div className="stats-grid">
        <div><strong>{checkins}/7</strong><span>Check-ins</span></div>
        <div><strong>{training}</strong><span>Training sessions</span></div>
        <div><strong>{discipline}</strong><span>Discipline wins</span></div>
        <div><strong>{avg}</strong><span>Avg day rating · {connections} connections</span></div>
      </div>

      <Card title="Score your week">
        <Scale value={w.score} onChange={(score) => set({ score })} max={10} />
      </Card>
      <Card title="Reflect">
        <TextField multiline label="Biggest win this week" value={w.biggestWin} onChange={(biggestWin) => set({ biggestWin })} placeholder="What am I most proud of?" />
        <TextField multiline label="Where did I fall short?" value={w.fellShort} onChange={(fellShort) => set({ fellShort })} placeholder="No excuses — just facts." />
        <TextField
          multiline
          label="When did I act like the person I’m becoming?"
          value={w.becameMore}
          onChange={(becameMore) => set({ becameMore })}
          placeholder={state.profile.becoming || 'The moments I made my future self proud…'}
        />
        <TextField multiline label="What will I do differently?" value={w.doDifferently} onChange={(doDifferently) => set({ doDifferently })} placeholder="One concrete change." />
      </Card>
      <Card title="Next week’s focus">
        <TextField multiline value={w.nextFocus} onChange={(nextFocus) => set({ nextFocus })} placeholder="The one thing that will make next week a success." />
      </Card>

      {w.doneAt ? (
        <p className="done-banner">✓ Review complete and sent to {state.profile.partnerName || 'your coach'}.</p>
      ) : (
        <button className="btn btn--big" disabled={w.score == null} onClick={finish}>Complete & send to coach</button>
      )}
    </div>
  );
}
