import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toWorkout } from '../lib/sync';
import { addDays, prettyDate, todayKey } from '../lib/dates';
import { CATEGORY_ICON, CATEGORY_LABEL, LEVEL_LABEL, videoSource } from '../lib/library';
import type { LibraryWorkout, WorkoutCategory } from '../lib/types';
import { t } from '../i18n';
import { Card, TextField } from '../ui';
import { VideoPlayer } from './Library';

type Draft = { id?: string; title: string; category: WorkoutCategory; durationMin: string; level: LibraryWorkout['level']; description: string; videoUrl: string };
const blank: Draft = { title: '', category: 'strength', durationMin: '', level: 'all', description: '', videoUrl: '' };

/** Coach: manage the "Train with Patrick" library and pick the workout of the day. */
export default function CoachWorkouts() {
  const [list, setList] = useState<LibraryWorkout[]>([]);
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [w, s] = await Promise.all([
      supabase.from('workouts').select('*').order('created_at', { ascending: false }),
      supabase.from('workout_schedule').select('date, workout_id').gte('date', todayKey()),
    ]);
    setList((w.data ?? []).map(toWorkout));
    setSchedule(Object.fromEntries((s.data ?? []).map((r) => [r.date, r.workout_id])));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setError('');
    const url = draft.videoUrl.trim();
    if (url && !/^https:\/\//.test(url)) return setError(t('The video link must start with https://'));
    const row = {
      title: draft.title.trim(),
      category: draft.category,
      duration_min: draft.durationMin ? Number(draft.durationMin) : null,
      level: draft.level,
      description: draft.description.trim(),
      video_url: url || null,
    };
    const res = draft.id ? await supabase.from('workouts').update(row).eq('id', draft.id) : await supabase.from('workouts').insert(row);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    load();
  };

  const togglePublished = async (w: LibraryWorkout) => {
    await supabase.from('workouts').update({ published: !w.published }).eq('id', w.id);
    load();
  };

  const remove = async (w: LibraryWorkout) => {
    if (!confirm(t('Delete “{title}”?', { title: w.title }))) return;
    await supabase.from('workouts').delete().eq('id', w.id);
    load();
  };

  const pick = async (date: string, workoutId: string) => {
    const res = workoutId
      ? await supabase.from('workout_schedule').upsert({ date, workout_id: workoutId })
      : await supabase.from('workout_schedule').delete().eq('date', date);
    if (res.error) return alert(res.error.message);
    load();
  };

  const next7 = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i));
  const published = list.filter((w) => w.published);

  return (
    <>
      {draft ? (
        <Card title={draft.id ? t('Edit workout') : t('New workout')}>
          <TextField label={t('Title')} value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder={t('e.g. 20 min full-body strength')} />
          <div className="field">
            <span className="field__label">{t('Category')}</span>
            <div className="chips">
              {(['strength', 'mobility', 'recovery'] as WorkoutCategory[]).map((c) => (
                <button key={c} className={`chip${draft.category === c ? ' is-on' : ''}`} onClick={() => setDraft({ ...draft, category: c })}>
                  {CATEGORY_ICON[c]} {t(CATEGORY_LABEL[c])}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              <span className="field__label">{t('Minutes')}</span>
              <input className="input" type="number" min={1} max={300} inputMode="numeric" value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} />
            </label>
          </div>
          <div className="field">
            <span className="field__label">{t('Level')}</span>
            <div className="chips chips--small">
              {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((l) => (
                <button key={l} className={`chip${draft.level === l ? ' is-on' : ''}`} onClick={() => setDraft({ ...draft, level: l })}>
                  {t(LEVEL_LABEL[l])}
                </button>
              ))}
            </div>
          </div>
          <TextField
            label={t('Video link (YouTube, Vimeo or MP4)')}
            value={draft.videoUrl}
            onChange={(videoUrl) => setDraft({ ...draft, videoUrl })}
            placeholder="https://youtu.be/…"
          />
          {draft.videoUrl && (videoSource(draft.videoUrl) ? <VideoPlayer url={draft.videoUrl} title={draft.title} /> : <p className="muted small">{t('Preview not available for this link — it will open in a new tab.')}</p>)}
          <TextField multiline label={t('Description / exercises')} value={draft.description} onChange={(description) => setDraft({ ...draft, description })} placeholder={t('Warm-up, exercises, sets and reps, tips…')} />
          {error && <p className="error">{error}</p>}
          <div className="row">
            <button className="btn btn--ghost" onClick={() => setDraft(null)}>{t('Cancel')}</button>
            <button className="btn" disabled={!draft.title.trim()} onClick={save}>{t('Save workout')}</button>
          </div>
        </Card>
      ) : (
        <button className="btn" onClick={() => setDraft({ ...blank })}>{t('+ New workout')}</button>
      )}

      <Card title={t('Workout of the day — next 7 days')} hint={t('Pick one, or leave “Automatic” to rotate through the library (strength, mobility, recovery).')}>
        {next7.map((date) => (
          <label key={date} className="field schedule-row">
            <span className="field__label">{prettyDate(date)}</span>
            <select className="input" value={schedule[date] ?? ''} onChange={(e) => pick(date, e.target.value)}>
              <option value="">{t('Automatic')}</option>
              {published.map((w) => (
                <option key={w.id} value={w.id}>{CATEGORY_ICON[w.category]} {w.title}</option>
              ))}
            </select>
          </label>
        ))}
      </Card>

      <Card title={t('Library')} hint={t(list.length === 1 ? '{n} workout' : '{n} workouts', { n: list.length })}>
        {list.length === 0 && <p className="empty">{t('No workouts yet. Film a session, upload it to YouTube as “Unlisted”, and paste the link here.')}</p>}
        <div className="list">
          {list.map((w) => (
            <div key={w.id} className="list__item">
              <span>
                <strong>{CATEGORY_ICON[w.category]} {w.title} {!w.published && <span className="tag tag--mirror">{t('Hidden')}</span>}</strong>
                <small className="muted">
                  {[t(CATEGORY_LABEL[w.category]), w.durationMin ? `${w.durationMin} min` : null, w.videoUrl ? '▶ video' : t('no video')].filter(Boolean).join(' · ')}
                </small>
              </span>
              <span className="row">
                <button className="btn btn--link" onClick={() => setDraft({ id: w.id, title: w.title, category: w.category, durationMin: w.durationMin?.toString() ?? '', level: w.level, description: w.description, videoUrl: w.videoUrl ?? '' })}>{t('Edit')}</button>
                <button className="btn btn--link" onClick={() => togglePublished(w)}>{w.published ? t('Hide') : t('Publish')}</button>
                <button className="btn btn--link danger" onClick={() => remove(w)}>{t('Delete')}</button>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
