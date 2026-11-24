/**
 * Apple Health import: reads the `export.xml` from iPhone → Health → profile → Export All Health Data
 * (unzip export.zip in the Files app first) and turns it into one row per day.
 *
 * The file can be hundreds of MB, so it is streamed and scanned record by record — never loaded whole.
 * iPhone and Apple Watch both record steps/energy/sleep; summing them would double count, so cumulative
 * values are summed per source and the day takes the largest source.
 */
export type ImportedDay = {
  date: string;
  weight_kg?: number;
  body_fat_pct?: number;
  resting_hr?: number;
  hrv_ms?: number;
  steps?: number;
  active_kcal?: number;
  sleep_hours?: number;
  source: 'apple_health';
};

const TYPES: Record<string, keyof Acc> = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'active_kcal',
  HKQuantityTypeIdentifierRestingHeartRate: 'resting_hr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv_ms',
  HKQuantityTypeIdentifierBodyMass: 'weight_kg',
  HKQuantityTypeIdentifierBodyFatPercentage: 'body_fat_pct',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep_hours',
};

type PerSource = Record<string, number>;
type Acc = {
  steps: PerSource;
  active_kcal: PerSource;
  sleep_hours: PerSource;
  resting_hr: number[];
  hrv_ms: number[];
  weight_kg: number[];
  body_fat_pct: number[];
};
const emptyAcc = (): Acc => ({ steps: {}, active_kcal: {}, sleep_hours: {}, resting_hr: [], hrv_ms: [], weight_kg: [], body_fat_pct: [] });

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const ASLEEP = /HKCategoryValueSleepAnalysisAsleep/; // Asleep, AsleepCore, AsleepDeep, AsleepREM, AsleepUnspecified
/** Apple dates look like "2026-11-20 07:12:00 +0100". */
const parseDate = (s: string) => Date.parse(s.replace(' ', 'T').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2'));

export async function importAppleHealth(file: File, sinceDays = 180, onProgress?: (fraction: number) => void): Promise<ImportedDay[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);
  const days = new Map<string, Acc>();
  const acc = (d: string) => {
    let a = days.get(d);
    if (!a) days.set(d, (a = emptyAcc()));
    return a;
  };

  const handle = (tag: string) => {
    const type = attr(tag, 'type');
    const key = type ? TYPES[type] : undefined;
    if (!key) return;
    const start = attr(tag, 'startDate');
    const end = attr(tag, 'endDate');
    if (!start || !end) return;
    // sleep belongs to the morning you wake up; everything else to the day it started
    const date = (key === 'sleep_hours' ? end : start).slice(0, 10);
    if (date < since) return;
    const source = attr(tag, 'sourceName') ?? '?';
    const a = acc(date);
    if (key === 'sleep_hours') {
      if (!ASLEEP.test(attr(tag, 'value') ?? '')) return;
      const h = (parseDate(end) - parseDate(start)) / 3_600_000;
      if (h > 0 && h < 24) a.sleep_hours[source] = (a.sleep_hours[source] ?? 0) + h;
      return;
    }
    let v = Number(attr(tag, 'value'));
    if (!Number.isFinite(v)) return;
    const unit = attr(tag, 'unit');
    if (key === 'steps' || key === 'active_kcal') {
      if (key === 'active_kcal' && unit === 'kJ') v /= 4.184;
      a[key][source] = (a[key][source] ?? 0) + v;
    } else {
      if (key === 'weight_kg' && unit === 'lb') v *= 0.45359237;
      if (key === 'body_fat_pct' && unit === '%' && v <= 1) v *= 100; // stored as a fraction
      a[key].push(v);
    }
  };

  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  let read = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    buf += value;
    let i = 0;
    for (;;) {
      const s = buf.indexOf('<Record ', i);
      if (s < 0) { i = Math.max(i, buf.length - 8); break; }
      const e = buf.indexOf('>', s);
      if (e < 0) { i = s; break; }
      handle(buf.slice(s, e));
      i = e + 1;
    }
    buf = buf.slice(i);
    onProgress?.(Math.min(1, read / file.size));
  }

  const maxOf = (p: PerSource) => (Object.keys(p).length ? Math.max(...Object.values(p)) : undefined);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined);
  const last = (xs: number[]) => (xs.length ? xs[xs.length - 1] : undefined);
  const round = (v: number | undefined, dp = 0) => (v === undefined ? undefined : Math.round(v * 10 ** dp) / 10 ** dp);

  return [...days.entries()]
    .map(([date, a]): ImportedDay => ({
      date,
      steps: round(maxOf(a.steps)),
      active_kcal: round(maxOf(a.active_kcal)),
      sleep_hours: round(Math.min(maxOf(a.sleep_hours) ?? NaN, 16) || undefined, 2),
      resting_hr: round(avg(a.resting_hr)),
      hrv_ms: round(avg(a.hrv_ms), 1),
      weight_kg: round(last(a.weight_kg), 1),
      body_fat_pct: round(last(a.body_fat_pct), 1),
      source: 'apple_health',
    }))
    .sort((x, y) => x.date.localeCompare(y.date));
}
