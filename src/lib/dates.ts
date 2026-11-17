import { locale } from '../i18n';
export const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayKey = () => toKey(new Date());

export const addDays = (key: string, n: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return toKey(new Date(y, m - 1, d + n));
};

/** 0 = Monday ... 6 = Sunday */
export const weekdayIndex = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
};

/** Weekday names Monday..Sunday in the current language, capitalised (Danish names are lower-case by default). */
export const weekdays = () =>
  Array.from({ length: 7 }, (_, i) => {
    const s = new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: 'long' }); // 1 Jan 2024 was a Monday
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

export const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString(locale(), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const dayOfYear = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(y, 0, 0).getTime();
  return Math.floor((new Date(y, m - 1, d).getTime() - start) / 86_400_000);
};

/** Monday of the week containing `key`. */
export const weekStart = (key: string) => addDays(key, -weekdayIndex(key));

/** e.g. "16 November" / "16. november" */
export const shortDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: 'numeric', month: 'long' });
};
