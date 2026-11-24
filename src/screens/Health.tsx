import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { callFunction, supabase } from '../lib/supabase';
import { addDays, prettyDate, todayKey } from '../lib/dates';
import { importAppleHealth } from '../lib/appleHealth';
import { Card, Progress, Scale, TextField } from '../ui';

/** Personal health & nutrition agent: log body metrics and meals, import Apple Health, ask Claude to analyse it all. */

type Metrics = {
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  steps: number | null;
  active_kcal: number | null;
  sleep_hours: number | null;
  energy: number | null;
  notes: string;
};
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Meal = { id: string; eaten_at: string; meal: MealType; description: string; photo_path: string | null; kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; ai: Estimate | null };
type Estimate = { items: { name: string; grams: number; kcal: number }[]; description: string; kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; confidence: 'low' | 'medium' | 'high'; notes: string };
type Settings = { kcal_target: number | null; protein_target_g: number | null; carbs_target_g: number | null; fat_target_g: number | null; goal_weight_kg: number | null; context: string };
type Report = { id?: string; kind: 'chat' | 'weekly'; question: string; answer: string; created_at: string };

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABEL: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
const emptyMetrics = (date: string): Metrics => ({ date, weight_kg: null, body_fat_pct: null, waist_cm: null, resting_hr: null, hrv_ms: null, steps: null, active_kcal: null, sleep_hours: null, energy: null, notes: '' });
const emptySettings: Settings = { kcal_target: null, protein_target_g: null, carbs_target_g: null, fat_target_g: null, goal_weight_kg: null, context: '' };
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
const fmt = (v: number | null | undefined, dp = 0) => (v == null ? '–' : Number(v).toLocaleString(undefined, { maximumFractionDigits: dp }));
const localDayBounds = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return { start: new Date(y, m - 1, d).toISOString(), end: new Date(y, m - 1, d + 1).toISOString() };
};
const guessMeal = (): MealType => {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h >= 17 && h < 22 ? 'dinner' : 'snack';
};
const errText = (e: unknown) => (e instanceof Error ? t(e.message) : t('Something went wrong — please try again.'));

export default function Health({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'today' | 'trends' | 'agent' | 'setup'>('today');
  const [settings, setSettings] = useState<Settings>(emptySettings);

  useEffect(() => {
    supabase.from('health_settings').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => data && setSettings({ ...emptySettings, ...data }));
  }, [userId]);

  return (
    <>
      <div className="segmented">
        {(['today', 'trends', 'agent', 'setup'] as const).map((id) => (
          <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
            {t({ today: 'Log', trends: 'Trends', agent: 'Ask the agent', setup: 'Setup' }[id])}
          </button>
        ))}
      </div>
      {tab === 'today' && <LogTab userId={userId} settings={settings} />}
      {tab === 'trends' && <TrendsTab userId={userId} settings={settings} />}
      {tab === 'agent' && <AgentTab userId={userId} />}
      {tab === 'setup' && <SetupTab userId={userId} settings={settings} onSaved={setSettings} />}
    </>
  );
}

// ───────────────────────────── Log: metrics + meals for one day ─────────────────────────────
function LogTab({ userId, settings }: { userId: string; settings: Settings }) {
  const [date, setDate] = useState(todayKey());
  const [m, setM] = useState<Metrics>(emptyMetrics(date));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    const { start, end } = localDayBounds(date);
    const [{ data: metrics }, { data: mealRows }] = await Promise.all([
      supabase.from('health_metrics').select('*').eq('user_id', userId).eq('date', date).maybeSingle(),
      supabase.from('health_meals').select('*').eq('user_id', userId).gte('eaten_at', start).lt('eaten_at', end).order('eaten_at'),
    ]);
    setM(metrics ? { ...emptyMetrics(date), ...metrics, notes: metrics.notes ?? '' } : emptyMetrics(date));
    setMeals((mealRows as Meal[]) ?? []);
  }, [date, userId]);
  useEffect(() => {
    load();
  }, [load]);

  const saveMetrics = async () => {
    const { error } = await supabase.from('health_metrics').upsert({ ...m, user_id: userId, date });
    setSaved(error ? errText(error) : t('Saved ✓'));
    setTimeout(() => setSaved(''), 2500);
  };

  const totals = meals.reduce((a, x) => ({ kcal: a.kcal + (x.kcal ?? 0), protein: a.protein + Number(x.protein_g ?? 0), carbs: a.carbs + Number(x.carbs_g ?? 0), fat: a.fat + Number(x.fat_g ?? 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const field = (key: keyof Metrics, label: string) => (
    <label className="field">
      <span className="field__label">{t(label)}</span>
      <input className="input" inputMode="decimal" value={m[key] == null ? '' : String(m[key])} onChange={(e) => setM({ ...m, [key]: num(e.target.value) })} />
    </label>
  );

  const removeMeal = async (meal: Meal) => {
    if (!confirm(t('Delete this meal?'))) return;
    await supabase.from('health_meals').delete().eq('id', meal.id);
    if (meal.photo_path) await supabase.storage.from('meal-photos').remove([meal.photo_path]);
    load();
  };

  return (
    <>
      <div className="hero__nav">
        <button className="btn btn--link" onClick={() => setDate(addDays(date, -1))}>‹ {t('Previous')}</button>
        <span>{date === todayKey() ? t('Today') : prettyDate(date)}</span>
        <button className="btn btn--link" disabled={date >= todayKey()} onClick={() => setDate(addDays(date, 1))}>{t('Next')} ›</button>
      </div>

      <Card title={t('Nutrition')} hint={t('{n} meals logged', { n: meals.length })}>
        <Macro label={t('Energy')} value={totals.kcal} target={settings.kcal_target} unit="kcal" />
        <Macro label={t('Protein')} value={totals.protein} target={settings.protein_target_g} unit="g" />
        <Macro label={t('Carbs')} value={totals.carbs} target={settings.carbs_target_g} unit="g" />
        <Macro label={t('Fat')} value={totals.fat} target={settings.fat_target_g} unit="g" />
        {meals.length > 0 && (
          <div className="list">
            {meals.map((x) => (
              <div key={x.id} className="list__item health-meal">
                <span>
                  <strong>{t(MEAL_LABEL[x.meal])} · {new Date(x.eaten_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  <small className="muted">{x.description || '—'}</small>
                  <small className="muted">{fmt(x.kcal)} kcal · P {fmt(x.protein_g)} · C {fmt(x.carbs_g)} · F {fmt(x.fat_g)}{x.ai ? ` · ${t('AI estimate')}` : ''}</small>
                </span>
                <button className="btn btn--link muted small" onClick={() => removeMeal(x)} aria-label={t('Delete')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <MealLogger userId={userId} date={date} onSaved={load} />

      <Card title={t('Body & recovery')} hint={t('Fill in what you have — Apple Health imports fill the rest.')}>
        <div className="health-grid">
          {field('weight_kg', 'Weight (kg)')}
          {field('waist_cm', 'Waist (cm)')}
          {field('body_fat_pct', 'Body fat %')}
          {field('sleep_hours', 'Sleep (hours)')}
          {field('resting_hr', 'Resting HR')}
          {field('hrv_ms', 'HRV (ms)')}
          {field('steps', 'Steps')}
          {field('active_kcal', 'Active kcal')}
        </div>
        <span className="field__label">{t('Energy')}</span>
        <Scale value={m.energy} onChange={(energy) => setM({ ...m, energy })} />
        <TextField multiline value={m.notes} onChange={(notes) => setM({ ...m, notes })} placeholder={t('Notes — soreness, stress, illness, alcohol…')} />
        <div className="row">
          <button className="btn" onClick={saveMetrics}>{t('Save')}</button>
          {saved && <span className="muted small">{saved}</span>}
        </div>
      </Card>
    </>
  );
}

function Macro({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  return (
    <div className="health-macro">
      <div className="row health-macro__head">
        <span>{label}</span>
        <span className="muted small">{fmt(value)}{target ? ` / ${fmt(target)}` : ''} {unit}</span>
      </div>
      {target ? <Progress value={Math.min(1, value / target)} /> : null}
    </div>
  );
}

/** Shrink a phone photo before upload (max 1568 px on the long side — plenty for food recognition). */
async function shrinkImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the photo.'))), 'image/jpeg', 0.85));
}

function MealLogger({ userId, date, onSaved }: { userId: string; date: string; onSaved: () => void }) {
  const [meal, setMeal] = useState<MealType>(guessMeal());
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; path?: string } | null>(null);
  const [est, setEst] = useState<Estimate | null>(null);
  const [vals, setVals] = useState({ kcal: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null); setText(''); setEst(null); setVals({ kcal: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '' }); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    try {
      const blob = await shrinkImage(f);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setEst(null);
    } catch (e) {
      setError(errText(e));
    }
  };

  const upload = async () => {
    if (!photo) return undefined;
    if (photo.path) return photo.path;
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage.from('meal-photos').upload(path, photo.blob, { contentType: 'image/jpeg' });
    if (upErr) throw upErr;
    setPhoto({ ...photo, path });
    return path;
  };

  const estimate = async () => {
    setBusy(t('Analysing your meal…')); setError('');
    try {
      const photoPath = await upload();
      const { estimate: e } = await callFunction<{ estimate: Estimate }>('health-agent', { action: 'meal', photoPath, text });
      setEst(e);
      setVals({ kcal: String(Math.round(e.kcal)), protein_g: String(Math.round(e.protein_g)), carbs_g: String(Math.round(e.carbs_g)), fat_g: String(Math.round(e.fat_g)), fiber_g: String(Math.round(e.fiber_g)) });
      if (!text) setText(e.description);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy('');
    }
  };

  const save = async () => {
    setBusy(t('Saving…')); setError('');
    try {
      const photo_path = (await upload()) ?? null;
      // meals logged for an earlier day get noon of that day; today's get the current time
      const [y, mo, d] = date.split('-').map(Number);
      const eaten_at = date === todayKey() ? new Date().toISOString() : new Date(y, mo - 1, d, 12).toISOString();
      const { error: insErr } = await supabase.from('health_meals').insert({
        user_id: userId, eaten_at, meal, description: text.trim(), photo_path, ai: est,
        kcal: num(vals.kcal), protein_g: num(vals.protein_g), carbs_g: num(vals.carbs_g), fat_g: num(vals.fat_g), fiber_g: num(vals.fiber_g),
      });
      if (insErr) throw insErr;
      reset();
      onSaved();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <Card title={t('Log a meal')} hint={t('Snap a photo or describe it — the agent estimates the macros. Check and adjust before saving.')}>
      <div className="chips">
        {MEALS.map((x) => <button key={x} className={`chip${meal === x ? ' is-on' : ''}`} onClick={() => setMeal(x)}>{t(MEAL_LABEL[x])}</button>)}
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {photo ? (
        <img src={photo.url} alt={t('Meal photo')} className="health-photo" />
      ) : (
        <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>📷 {t('Take or choose a photo')}</button>
      )}
      <TextField multiline value={text} onChange={setText} placeholder={t('e.g. 200 g chicken, rice, salad with olive oil')} />
      <button className="btn" disabled={!!busy || (!photo && !text.trim())} onClick={estimate}>{t('Estimate with AI')}</button>
      {est && (
        <div className="health-estimate">
          <small className="muted">{t('Confidence: {c}', { c: t(est.confidence) })} — {est.notes}</small>
          <ul className="small">{est.items.map((i, k) => <li key={k}>{i.name} · {fmt(i.grams)} g · {fmt(i.kcal)} kcal</li>)}</ul>
        </div>
      )}
      <div className="health-grid health-grid--5">
        {(['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'] as const).map((k) => (
          <label key={k} className="field">
            <span className="field__label">{{ kcal: 'kcal', protein_g: t('Protein g'), carbs_g: t('Carbs g'), fat_g: t('Fat g'), fiber_g: t('Fiber g') }[k]}</span>
            <input className="input" inputMode="decimal" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn" disabled={!!busy || (!text.trim() && !photo && !vals.kcal)} onClick={save}>{t('Save meal')}</button>
        {(photo || text || est) && <button className="btn btn--link" onClick={reset}>{t('Clear')}</button>}
        {busy && <span className="muted small">{busy}</span>}
      </div>
    </Card>
  );
}

// ───────────────────────────── Trends ─────────────────────────────
function TrendsTab({ userId, settings }: { userId: string; settings: Settings }) {
  const [range, setRange] = useState<30 | 90>(30);
  const [metrics, setMetrics] = useState<Metrics[] | null>(null);
  const [intake, setIntake] = useState<Record<string, { kcal: number; protein: number }>>({});

  useEffect(() => {
    const from = addDays(todayKey(), -(range - 1));
    Promise.all([
      supabase.from('health_metrics').select('*').eq('user_id', userId).gte('date', from).order('date'),
      supabase.from('health_meals').select('eaten_at, kcal, protein_g').eq('user_id', userId).gte('eaten_at', localDayBounds(from).start),
    ]).then(([{ data: ms }, { data: meals }]) => {
      setMetrics((ms as Metrics[]) ?? []);
      const byDay: Record<string, { kcal: number; protein: number }> = {};
      for (const x of meals ?? []) {
        const d = new Date(x.eaten_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const v = (byDay[key] ??= { kcal: 0, protein: 0 });
        v.kcal += x.kcal ?? 0;
        v.protein += Number(x.protein_g ?? 0);
      }
      setIntake(byDay);
    });
  }, [userId, range]);

  const days = useMemo(() => Array.from({ length: range }, (_, i) => addDays(todayKey(), i - range + 1)), [range]);
  if (!metrics) return <div className="spinner" />;
  const byDate = Object.fromEntries(metrics.map((x) => [x.date, x]));
  const series = (key: keyof Metrics) => days.map((d) => (byDate[d]?.[key] == null ? null : Number(byDate[d][key])));

  return (
    <>
      <div className="segmented">
        {([30, 90] as const).map((r) => <button key={r} className={range === r ? 'is-on' : ''} onClick={() => setRange(r)}>{t('{n} days', { n: r })}</button>)}
      </div>
      <Trend title={t('Weight')} unit="kg" values={series('weight_kg')} dp={1} target={settings.goal_weight_kg} />
      <Trend title={t('Calories eaten')} unit="kcal" values={days.map((d) => intake[d]?.kcal ?? null)} target={settings.kcal_target} />
      <Trend title={t('Protein')} unit="g" values={days.map((d) => intake[d]?.protein ?? null)} target={settings.protein_target_g} />
      <Trend title={t('Sleep')} unit={t('h')} values={series('sleep_hours')} dp={1} />
      <Trend title={t('Resting heart rate')} unit="bpm" values={series('resting_hr')} />
      <Trend title={t('HRV')} unit="ms" values={series('hrv_ms')} />
      <Trend title={t('Steps')} unit="" values={series('steps')} />
      <Trend title={t('Waist')} unit="cm" values={series('waist_cm')} dp={1} />
    </>
  );
}

/** One metric over time: line through the logged days, dashed target line, latest value + average. */
function Trend({ title, unit, values, dp = 0, target }: { title: string; unit: string; values: (number | null)[]; dp?: number; target?: number | null }) {
  const pts = values.map((v, i) => ({ i, v })).filter((p): p is { i: number; v: number } => p.v !== null);
  if (!pts.length) return null;
  const avg = pts.reduce((s, p) => s + p.v, 0) / pts.length;
  const ys = [...pts.map((p) => p.v), ...(target ? [target] : [])];
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12;
  lo -= pad; hi += pad;
  const W = 320, H = 90;
  const x = (i: number) => (values.length === 1 ? W / 2 : (i / (values.length - 1)) * W);
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <Card title={title} hint={t('{n} of {m} days logged · avg {avg} {unit}', { n: pts.length, m: values.length, avg: fmt(avg, dp), unit })}>
      <div className="health-trend__value"><strong>{fmt(last.v, dp)}</strong> <span className="muted small">{unit} · {t('latest')}</span></div>
      <svg className="health-trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title}: ${fmt(last.v, dp)} ${unit}`}>
        {target ? <line x1="0" x2={W} y1={y(target)} y2={y(target)} className="health-trend__target" /> : null}
        <path d={path} className="health-trend__line" vectorEffect="non-scaling-stroke" />
        {pts.length < 40 && pts.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="2.5" className="health-trend__dot" />)}
      </svg>
      {target ? <small className="muted">{t('Dashed line: your target ({v} {unit})', { v: fmt(target, dp), unit })}</small> : null}
    </Card>
  );
}

// ───────────────────────────── Agent ─────────────────────────────
const SUGGESTIONS = [
  'How is my sleep affecting my energy?',
  'Am I eating enough protein for my training?',
  'Why isn’t my weight moving?',
  'What should I change this week?',
];

function AgentTab({ userId }: { userId: string }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('health_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30).then(({ data }) => setReports((data as Report[]) ?? []));
  }, [userId]);

  const run = async (action: 'ask' | 'weekly', question = '') => {
    setBusy(true); setError('');
    try {
      const { report } = await callFunction<{ report: Report }>('health-agent', { action, question });
      setReports((r) => [report, ...(r ?? [])]);
      setQ('');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card title={t('Ask your health agent')} hint={t('It reads your metrics, meals, check-ins and goals, then answers with your own numbers.')}>
        <div className="chips">
          {SUGGESTIONS.map((s) => <button key={s} className="chip" disabled={busy} onClick={() => run('ask', t(s))}>{t(s)}</button>)}
        </div>
        <TextField multiline value={q} onChange={setQ} placeholder={t('Ask anything about your health data…')} />
        <div className="row">
          <button className="btn" disabled={busy || !q.trim()} onClick={() => run('ask', q)}>{t('Ask')}</button>
          <button className="btn btn--ghost" disabled={busy} onClick={() => run('weekly')}>{t('Weekly analysis')}</button>
        </div>
        {busy && <p className="muted small"><span className="spinner spinner--inline" /> {t('Analysing your data — this can take up to a minute…')}</p>}
        {error && <p className="error">{error}</p>}
      </Card>

      {reports === null ? <div className="spinner" /> : reports.map((r, i) => (
        <Card key={r.id ?? i} title={r.kind === 'weekly' ? t('Weekly analysis') : r.question} hint={new Date(r.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}>
          <Markdown text={r.answer} />
        </Card>
      ))}
    </>
  );
}

/** Tiny renderer for the agent's answers: paragraphs, headings, bullet lists and **bold**. Text only — no HTML is injected. */
function Markdown({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)/);
    if (bullet) { list.push(bullet[1]); continue; }
    flush();
    if (!line) continue;
    const h = line.match(/^#{1,6}\s+(.*)/);
    blocks.push(h ? <h3 key={blocks.length}>{inline(h[1])}</h3> : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="health-md">{blocks}</div>;
}

// ───────────────────────────── Setup: targets, context, Apple Health ─────────────────────────────
function SetupTab({ userId, settings, onSaved }: { userId: string; settings: Settings; onSaved: (s: Settings) => void }) {
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState('');

  const save = async () => {
    const { error } = await supabase.from('health_settings').upsert({ ...s, user_id: userId });
    setMsg(error ? errText(error) : t('Saved ✓'));
    if (!error) onSaved(s);
    setTimeout(() => setMsg(''), 2500);
  };

  const runImport = async (file: File | undefined) => {
    if (!file) return;
    setImportMsg(''); setProgress(0);
    try {
      const days = await importAppleHealth(file, 365, setProgress);
      if (!days.length) throw new Error('No health records found in this file — choose export.xml from the unzipped export.');
      let n = 0;
      for (let i = 0; i < days.length; i += 200) {
        const { data, error } = await supabase.rpc('health_import', { rows: days.slice(i, i + 200) });
        if (error) throw error;
        n += Number(data ?? 0);
      }
      setImportMsg(t('Imported {n} days from Apple Health ✓', { n }));
    } catch (e) {
      setImportMsg(errText(e));
    } finally {
      setProgress(null);
    }
  };

  const numField = (key: keyof Settings, label: string) => (
    <label className="field">
      <span className="field__label">{t(label)}</span>
      <input className="input" inputMode="decimal" value={s[key] == null ? '' : String(s[key])} onChange={(e) => setS({ ...s, [key]: num(e.target.value) })} />
    </label>
  );

  return (
    <>
      <Card title={t('Targets')} hint={t('Daily nutrition targets the agent compares you against.')}>
        <div className="health-grid">
          {numField('kcal_target', 'Calories (kcal)')}
          {numField('protein_target_g', 'Protein (g)')}
          {numField('carbs_target_g', 'Carbs (g)')}
          {numField('fat_target_g', 'Fat (g)')}
          {numField('goal_weight_kg', 'Goal weight (kg)')}
        </div>
        <TextField label={t('About you')} multiline value={s.context} onChange={(context) => setS({ ...s, context })} placeholder={t('Age, height, training (e.g. Ironman build, 10 h/week), diet preferences, injuries, what you want from the agent…')} />
        <div className="row">
          <button className="btn" onClick={save}>{t('Save')}</button>
          {msg && <span className="muted small">{msg}</span>}
        </div>
      </Card>

      <Card title={t('Import from Apple Health')} hint={t('Steps, active energy, sleep, resting heart rate, HRV, weight and body fat for the last 12 months. Your manual entries are kept.')}>
        <ol className="small health-steps">
          <li>{t('iPhone: Health app → your profile picture → Export All Health Data.')}</li>
          <li>{t('Save the file, open it in the Files app and tap it to unzip.')}</li>
          <li>{t('Choose export.xml from the apple_health_export folder below.')}</li>
        </ol>
        <label className="btn btn--ghost health-file">
          {t('Choose export.xml')}
          <input type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => runImport(e.target.files?.[0])} />
        </label>
        {progress !== null && <><Progress value={progress} /><small className="muted">{t('Reading… {p}%', { p: Math.round(progress * 100) })}</small></>}
        {importMsg && <p className="small">{importMsg}</p>}
        <small className="muted">{t('Garmin, Oura and Whoop: coming next. Until then, their apps can sync into Apple Health.')}</small>
      </Card>

      <p className="muted small">{t('Your health data is private to your account. Questions and meal photos are sent to Anthropic’s Claude API for analysis.')}</p>
    </>
  );
}
