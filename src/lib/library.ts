import { dayOfYear, weekdayIndex } from './dates';
import type { LibraryWorkout, WorkoutCategory } from './types';

/** Default weekly rhythm when the coach hasn't picked a workout for the day (Mon..Sun). */
const RHYTHM: WorkoutCategory[] = ['strength', 'mobility', 'strength', 'recovery', 'strength', 'mobility', 'recovery'];

/** The coach's pick for the date, otherwise a rotation through the library following the weekly rhythm. */
export function workoutOfDay(date: string, library: LibraryWorkout[], schedule: Record<string, string>): LibraryWorkout | null {
  const picked = schedule[date] && library.find((w) => w.id === schedule[date]);
  if (picked) return picked;
  if (library.length === 0) return null;
  const sorted = [...library].sort((a, b) => a.id.localeCompare(b.id)); // stable order
  const inCategory = sorted.filter((w) => w.category === RHYTHM[weekdayIndex(date)]);
  const pool = inCategory.length ? inCategory : sorted;
  return pool[dayOfYear(date) % pool.length];
}

export const CATEGORY_ICON: Record<WorkoutCategory, string> = { strength: '🏋️', mobility: '🧘', recovery: '🌿' };
export const CATEGORY_LABEL: Record<WorkoutCategory, string> = { strength: 'Strength', mobility: 'Mobility', recovery: 'Recovery' };
export const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', all: 'All levels' } as const;

/** Turn a YouTube/Vimeo/MP4 link into something we can play inside the app. */
export function videoSource(url: string | null): { kind: 'iframe' | 'file'; src: string; thumb: string | null } | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let yt: string | null = null;
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    yt = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  }
  if (yt && /^[\w-]{6,}$/.test(yt)) {
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => p !== 'video');
    const id = parts[0];
    const hash = parts[1] ?? u.searchParams.get('h');
    if (id && /^\d+$/.test(id)) {
      return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}?playsinline=1${hash ? `&h=${hash}` : ''}`, thumb: null };
    }
  }
  if (/\.(mp4|mov|webm|m4v)$/i.test(u.pathname)) return { kind: 'file', src: url, thumb: null };
  return null;
}
