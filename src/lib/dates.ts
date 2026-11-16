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

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const prettyDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

export const dayOfYear = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const start = new Date(y, 0, 0).getTime();
  return Math.floor((new Date(y, m - 1, d).getTime() - start) / 86_400_000);
};
