import { useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, todayKey, weekdayIndex, weekdays } from '../lib/dates';
import { hasFeature } from '../lib/plans';
import { COACH_NAME } from '../config';
import { t } from '../i18n';
import { Card, Locked } from '../ui';
import Library, { WorkoutDetail } from './Library';

export const TRAININGPEAKS_URL = 'https://app.trainingpeaks.com';

/**
 * Training tab.
 * - Every plan: the "Train with Patrick" video library + workout of the day.
 * - Perform / Elite: their personal program lives in TrainingPeaks (planned by the coach there).
 */
export default function Train({ onUpgrade }: { onUpgrade: () => void }) {
  const { getDay, activeTier, state } = useStore();
  const personal = hasFeature(activeTier, 'training');
  const [open, setOpen] = useState<string | null>(null);
  const opened = state.library.find((w) => w.id === open);

  // Completed sessions in the last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), i - 6);
    return { key, done: getDay(key).training.done, label: weekdays()[weekdayIndex(key)][0] };
  });

  // a workout opened from the library gets the whole screen
  if (opened) return <WorkoutDetail workout={opened} onBack={() => setOpen(null)} />;

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{t('Training')}</h1>
        <p className="muted">{t('Move every day. Tick it off in your check-in.')}</p>
      </header>

      {personal && (
        <Card title={t('Your personal program')} hint={t('Planned for you by {coach} in TrainingPeaks.', { coach: COACH_NAME })}>
          <p className="muted small">{t('Open TrainingPeaks to see today’s session, then tick it off here.')}</p>
          <a className="btn" href={TRAININGPEAKS_URL} target="_blank" rel="noopener">{t('Open TrainingPeaks')}</a>
        </Card>
      )}

      <Card title={t('Last 7 days')}>
        <div className="week-dots">
          {last7.map((d) => (
            <div key={d.key} className={`week-dot${d.done ? ' is-on' : ''}`}>
              <span>{d.done ? '✓' : ''}</span>
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        <p className="muted small">{t(last7.filter((d) => d.done).length === 1 ? '{n} session completed this week' : '{n} sessions completed this week', { n: last7.filter((d) => d.done).length })}</p>
      </Card>

      <Library onOpen={setOpen} />

      {!personal && (
        <Locked feature="training" title={t('Personal training program')} onUpgrade={onUpgrade}>
          <p>{t('A program built for your goals by {coach} in TrainingPeaks — starts with a free call.', { coach: COACH_NAME })}</p>
        </Locked>
      )}
    </div>
  );
}
