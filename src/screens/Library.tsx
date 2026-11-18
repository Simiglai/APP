import { useState } from 'react';
import { useStore } from '../lib/store';
import { todayKey } from '../lib/dates';
import { CATEGORY_ICON, CATEGORY_LABEL, LEVEL_LABEL, videoSource, workoutOfDay } from '../lib/library';
import type { LibraryWorkout, WorkoutCategory } from '../lib/types';
import { t } from '../i18n';
import { COACH_NAME } from '../config';
import { Card } from '../ui';

const meta = (w: LibraryWorkout) =>
  [`${CATEGORY_ICON[w.category]} ${t(CATEGORY_LABEL[w.category])}`, w.durationMin ? `${w.durationMin} min` : null, w.level ? t(LEVEL_LABEL[w.level]) : null]
    .filter(Boolean)
    .join(' · ');

/** Video (YouTube / Vimeo / MP4) shown inside the app. */
export function VideoPlayer({ url, title }: { url: string | null; title: string }) {
  const src = videoSource(url);
  if (!src) return url ? <a className="btn btn--ghost" href={url} target="_blank" rel="noopener">{t('Open video ↗')}</a> : null;
  return (
    <div className="video">
      {src.kind === 'iframe' ? (
        <iframe src={src.src} title={title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen loading="lazy" />
      ) : (
        <video src={src.src} controls playsInline preload="metadata" />
      )}
    </div>
  );
}

/** Mark today's training as done with this workout. */
function useCompleteToday() {
  const { getDay, updateDay } = useStore();
  const today = getDay(todayKey());
  return {
    isDone: (w: LibraryWorkout) => today.training.done && today.training.workoutId === w.id,
    complete: (w: LibraryWorkout) =>
      updateDay(todayKey(), { training: { ...today.training, text: w.title, done: true, workoutId: w.id } }),
  };
}

export function WorkoutDetail({ workout, onBack }: { workout: LibraryWorkout; onBack: () => void }) {
  const { isDone, complete } = useCompleteToday();
  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>{t('‹ All workouts')}</button>
        <h1>{workout.title}</h1>
        <p className="muted">{meta(workout)}</p>
      </header>
      <VideoPlayer url={workout.videoUrl} title={workout.title} />
      {workout.description && (
        <Card>
          <p className="prewrap">{workout.description}</p>
        </Card>
      )}
      {isDone(workout) ? (
        <p className="done-banner">{t('✓ Done — logged as today’s training.')}</p>
      ) : (
        <button className="btn btn--big" onClick={() => complete(workout)}>{t('Done ✓ — log as today’s training')}</button>
      )}
    </div>
  );
}

function WorkoutTile({ w, onOpen, badge }: { w: LibraryWorkout; onOpen: () => void; badge?: string }) {
  const thumb = videoSource(w.videoUrl)?.thumb;
  return (
    <button className="wtile" onClick={onOpen}>
      <span className={`wtile__thumb wtile__thumb--${w.category}`} style={thumb ? { backgroundImage: `url(${thumb})` } : undefined}>
        {!thumb && <span aria-hidden>{CATEGORY_ICON[w.category]}</span>}
        {w.videoUrl && <span className="wtile__play" aria-hidden>▶</span>}
        {badge && <span className="wtile__badge">{badge}</span>}
      </span>
      <span className="wtile__body">
        <strong>{w.title}</strong>
        <small className="muted">{meta(w)}</small>
      </span>
    </button>
  );
}

/** The client's "Train with Patrick" library with today's workout on top. */
export default function Library({ onOpen }: { onOpen: (id: string) => void }) {
  const { state } = useStore();
  const [filter, setFilter] = useState<WorkoutCategory | 'all'>('all');
  const wod = workoutOfDay(todayKey(), state.library, state.schedule);
  const list = state.library.filter((w) => filter === 'all' || w.category === filter);
  return (
    <>
      <Card title={t('Train with {coach}', { coach: COACH_NAME })} hint={t('Strength, mobility and recovery — follow along on video.')}>
        {state.library.length === 0 ? (
          <p className="empty">{t('New workouts are on their way — check back soon.')}</p>
        ) : (
          <>
            {wod && <WorkoutTile w={wod} onOpen={() => onOpen(wod.id)} badge={t('Workout of the day')} />}
            <div className="chips">
              {(['all', 'strength', 'mobility', 'recovery'] as const).map((c) => (
                <button key={c} className={`chip${filter === c ? ' is-on' : ''}`} onClick={() => setFilter(c)}>
                  {c === 'all' ? t('All') : `${CATEGORY_ICON[c]} ${t(CATEGORY_LABEL[c])}`}
                </button>
              ))}
            </div>
            <div className="wgrid">
              {list.map((w) => (
                <WorkoutTile key={w.id} w={w} onOpen={() => onOpen(w.id)} />
              ))}
            </div>
            {list.length === 0 && <p className="empty">{t('No workouts in this category yet.')}</p>}
          </>
        )}
      </Card>
    </>
  );
}

/** Compact "workout of the day" for the daily check-in. */
export function TodayWorkout({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const { state } = useStore();
  const [playing, setPlaying] = useState(false);
  const { isDone, complete } = useCompleteToday();
  const wod = workoutOfDay(todayKey(), state.library, state.schedule);
  if (!wod) return null;
  return (
    <div className="wod">
      <span className="tag tag--challenge">{t('Workout of the day')}</span>
      <strong>{wod.title}</strong>
      <small className="muted">{meta(wod)}</small>
      {playing ? <VideoPlayer url={wod.videoUrl} title={wod.title} /> : wod.videoUrl && <button className="btn btn--ghost" onClick={() => setPlaying(true)}>▶ {t('Play video')}</button>}
      <div className="row">
        {isDone(wod) ? <span className="ok-text">{t('✓ Done')}</span> : <button className="btn" onClick={() => complete(wod)}>{t('Done ✓')}</button>}
        <button className="btn btn--link" onClick={onOpenLibrary}>{t('More workouts ›')}</button>
      </div>
    </div>
  );
}
