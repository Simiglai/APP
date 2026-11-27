import { useCallback, useEffect, useState } from 'react';
import { t } from '../i18n';
import { supabase } from '../lib/supabase';
import { addDays, prettyDate, todayKey } from '../lib/dates';
import { Card, Progress } from '../ui';

/** "My supplements": the daily plan grouped by time slot, ticked off per day. */

export type Slot = 'morning' | 'prerun' | 'lunch' | 'afternoon' | 'evening';
type Supplement = { id: string; slot: Slot; name: string; dose: string; note: string; sort: number; active: boolean };

export const SLOTS: { id: Slot; title: string; when: string; why: string }[] = [
  { id: 'morning', title: 'Morning', when: 'With breakfast (a meal with fat)', why: 'Fat-soluble — needs fat to be absorbed.' },
  { id: 'prerun', title: 'Pre-run', when: '30–60 min before activity', why: 'Collagen + vitamin C in the blood when the tendons are loaded.' },
  { id: 'lunch', title: 'Lunch', when: 'With food', why: 'Zinc on an empty stomach causes nausea. Never together with iron.' },
  { id: 'afternoon', title: 'Iron — alone', when: 'Between meals, ≥2 h after zinc, ≥4 h before magnesium', why: 'Iron is blocked by zinc, magnesium, calcium, coffee and tea. Best right after training or on easy days, every other day.' },
  { id: 'evening', title: 'Evening', when: 'Before bed', why: 'Calms the nervous system and supports sleep and overnight repair.' },
];

export default function Supplements({ userId }: { userId: string }) {
  const [date, setDate] = useState(todayKey());
  const [list, setList] = useState<Supplement[] | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [week, setWeek] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const from = addDays(date, -6);
    const [{ data: sups }, { data: log }] = await Promise.all([
      supabase.from('health_supplements').select('*').eq('user_id', userId).order('slot').order('sort').order('created_at'),
      supabase.from('health_supplement_log').select('date, supplement_id').eq('user_id', userId).gte('date', from).lte('date', date),
    ]);
    setList((sups as Supplement[]) ?? []);
    setTaken(new Set((log ?? []).filter((l) => l.date === date).map((l) => l.supplement_id)));
    setWeek((log ?? []).reduce<Record<string, number>>((a, l) => ({ ...a, [l.date]: (a[l.date] ?? 0) + 1 }), {}));
  }, [date, userId]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (s: Supplement) => {
    setError('');
    const on = taken.has(s.id);
    const next = new Set(taken);
    if (on) next.delete(s.id);
    else next.add(s.id);
    setTaken(next); // optimistic
    const { error: e } = on
      ? await supabase.from('health_supplement_log').delete().eq('user_id', userId).eq('date', date).eq('supplement_id', s.id)
      : await supabase.from('health_supplement_log').insert({ user_id: userId, date, supplement_id: s.id });
    if (e) {
      setError(t('Could not save — check your connection.'));
      load();
    } else setWeek((w) => ({ ...w, [date]: (w[date] ?? 0) + (on ? -1 : 1) }));
  };

  if (!list) return <div className="spinner" />;
  const active = list.filter((s) => s.active);
  const done = active.filter((s) => taken.has(s.id)).length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));

  return (
    <>
      <div className="hero__nav">
        <button className="btn btn--link" onClick={() => setDate(addDays(date, -1))}>‹ {t('Previous')}</button>
        <span>{date === todayKey() ? t('Today') : prettyDate(date)}</span>
        <button className="btn btn--link" disabled={date >= todayKey()} onClick={() => setDate(addDays(date, 1))}>{t('Next')} ›</button>
      </div>

      {active.length > 0 && (
        <Card title={t('{n} of {m} taken', { n: done, m: active.length })}>
          <Progress value={active.length ? done / active.length : 0} />
          <div className="supp-week" aria-label={t('Last 7 days')}>
            {days.map((d) => (
              <div key={d} title={d} className={`supp-week__day${(week[d] ?? 0) >= active.length ? ' is-full' : (week[d] ?? 0) > 0 ? ' is-part' : ''}`}>
                <small>{Number(d.slice(-2))}</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      {SLOTS.map((slot) => {
        const items = (editing ? list : active).filter((s) => s.slot === slot.id);
        if (!items.length && !editing) return null;
        return (
          <Card key={slot.id} title={t(slot.title)} hint={t(slot.when)}>
            {items.map((s) =>
              editing ? (
                <EditRow key={s.id} s={s} onChanged={load} />
              ) : (
                <button key={s.id} className={`supp-row${taken.has(s.id) ? ' is-done' : ''}`} onClick={() => toggle(s)}>
                  <span className="checkbox" aria-hidden>{taken.has(s.id) ? '✓' : ''}</span>
                  <span>
                    <strong>{s.name}</strong>
                    {(s.dose || s.note) && <small className="muted">{[s.dose, s.note].filter(Boolean).join(' · ')}</small>}
                  </span>
                </button>
              ),
            )}
            <small className="muted">{t(slot.why)}</small>
            {editing && <AddRow userId={userId} slot={slot.id} sort={items.length} onAdded={load} />}
          </Card>
        );
      })}

      {error && <p className="error">{error}</p>}
      {!list.length && !editing && <p className="empty">{t('No supplements yet — tap “Edit list” to add yours.')}</p>}
      <button className="btn btn--ghost" onClick={() => setEditing(!editing)}>{editing ? t('Done') : t('Edit list')}</button>

      <Card title={t('The 3 most important rules')}>
        <ol className="small health-steps">
          <li>{t('Iron always stands alone — apart from everything else.')}</li>
          <li>{t('Collagen + vitamin C 30–60 minutes before movement.')}</li>
          <li>{t('D3, omega-3, krill and Q10 need fat to work.')}</li>
        </ol>
      </Card>
    </>
  );
}

function EditRow({ s, onChanged }: { s: Supplement; onChanged: () => void }) {
  const [v, setV] = useState({ name: s.name, dose: s.dose, note: s.note, slot: s.slot });
  const dirty = v.name !== s.name || v.dose !== s.dose || v.note !== s.note || v.slot !== s.slot;
  const save = async () => {
    await supabase.from('health_supplements').update(v).eq('id', s.id);
    onChanged();
  };
  const remove = async () => {
    if (!confirm(t('Remove “{name}”?', { name: s.name }))) return;
    await supabase.from('health_supplements').delete().eq('id', s.id);
    onChanged();
  };
  const toggleActive = async () => {
    await supabase.from('health_supplements').update({ active: !s.active }).eq('id', s.id);
    onChanged();
  };
  return (
    <div className={`supp-edit${s.active ? '' : ' is-paused'}`}>
      <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label={t('Name')} />
      <div className="supp-edit__row">
        <input className="input" value={v.dose} placeholder={t('Dose')} onChange={(e) => setV({ ...v, dose: e.target.value })} />
        <select className="input" value={v.slot} onChange={(e) => setV({ ...v, slot: e.target.value as Slot })}>
          {SLOTS.map((x) => <option key={x.id} value={x.id}>{t(x.title)}</option>)}
        </select>
      </div>
      <input className="input" value={v.note} placeholder={t('Note (e.g. in the smoothie)')} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <div className="row">
        {dirty && <button className="btn" onClick={save}>{t('Save')}</button>}
        <button className="btn btn--link" onClick={toggleActive}>{s.active ? t('Pause') : t('Resume')}</button>
        <button className="btn btn--link danger" onClick={remove}>{t('Remove')}</button>
      </div>
    </div>
  );
}

function AddRow({ userId, slot, sort, onAdded }: { userId: string; slot: Slot; sort: number; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const add = async () => {
    if (!name.trim()) return;
    await supabase.from('health_supplements').insert({ user_id: userId, slot, name: name.trim(), dose: dose.trim(), sort });
    setName('');
    setDose('');
    onAdded();
  };
  return (
    <div className="supp-edit__row">
      <input className="input" value={name} placeholder={t('Add supplement…')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <input className="input" value={dose} placeholder={t('Dose')} onChange={(e) => setDose(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
      <button className="btn" disabled={!name.trim()} onClick={add}>+</button>
    </div>
  );
}
