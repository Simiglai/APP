import { t } from '../i18n';
import { useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, shortDate, todayKey, weekStart } from '../lib/dates';
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
        `📅 ${t('Weekly review — week of {date}', { date: start })}`,
        t('Score: {score}/10 · check-ins {checkins}/7 · training {training} · discipline wins {discipline}', { score: w.score ?? '–', checkins, training, discipline }),
        w.biggestWin && `🏆 ${t('Biggest win')}: ${w.biggestWin}`,
        w.fellShort && `⚠️ ${t('Fell short')}: ${w.fellShort}`,
        w.becameMore && `🪞 ${t('Acted like who I’m becoming')}: ${w.becameMore}`,
        w.doDifferently && `🔁 ${t('Do differently')}: ${w.doDifferently}`,
        w.nextFocus && `🎯 ${t('Next week’s focus')}: ${w.nextFocus}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>{t("‹ Back")}</button>
        <div className="hero__nav">
          <button className="iconbtn" aria-label={t("Previous week")} onClick={() => setStart(addDays(start, -7))}>‹</button>
          <span>{t('Week of {date}', { date: shortDate(start) })}</span>
          <button className="iconbtn" aria-label={t("Next week")} disabled={isCurrent} onClick={() => setStart(addDays(start, 7))}>›</button>
        </div>
        <h1>{t("Weekly review")}</h1>
        <p className="muted">{t("Look back honestly. Decide who you’ll be next week.")}</p>
      </header>

      <div className="stats-grid">
        <div><strong>{checkins}/7</strong><span>{t("Check-ins")}</span></div>
        <div><strong>{training}</strong><span>{t("Training sessions")}</span></div>
        <div><strong>{discipline}</strong><span>{t("Discipline wins")}</span></div>
        <div><strong>{avg}</strong><span>{t('Avg day rating · {n} connections', { n: connections })}</span></div>
      </div>

      <Card title={t("Score your week")}>
        <Scale value={w.score} onChange={(score) => set({ score })} max={10} />
      </Card>
      <Card title={t("Reflect")}>
        <TextField multiline label={t("Biggest win this week")} value={w.biggestWin} onChange={(biggestWin) => set({ biggestWin })} placeholder={t("What am I most proud of?")} />
        <TextField multiline label={t("Where did I fall short?")} value={w.fellShort} onChange={(fellShort) => set({ fellShort })} placeholder={t("No excuses — just facts.")} />
        <TextField
          multiline
          label={t("When did I act like the person I’m becoming?")}
          value={w.becameMore}
          onChange={(becameMore) => set({ becameMore })}
          placeholder={state.profile.becoming || t('The moments I made my future self proud…')}
        />
        <TextField multiline label={t("What will I do differently?")} value={w.doDifferently} onChange={(doDifferently) => set({ doDifferently })} placeholder={t("One concrete change.")} />
      </Card>
      <Card title={t("Next week’s focus")}>
        <TextField multiline value={w.nextFocus} onChange={(nextFocus) => set({ nextFocus })} placeholder={t("The one thing that will make next week a success.")} />
      </Card>

      {w.doneAt ? (
        <p className="done-banner">{t('✓ Review complete and sent to {coach}.', { coach: state.profile.partnerName })}</p>
      ) : (
        <button className="btn btn--big" disabled={w.score == null} onClick={finish}>{t("Complete & send to coach")}</button>
      )}
    </div>
  );
}
