/**
 * Mapping between the local app state and the Supabase tables.
 * The store marks changed items as "pending" keys; flush() writes them to the database.
 *
 * Pending key formats:
 *   profile · training · day:<YYYY-MM-DD> · goal:<uuid> · goaldel:<uuid> · week:<YYYY-MM-DD> · sheet:<worksheetId> · rsvp:<eventId>
 */
import { supabase } from './supabase';
import type { AppState, CoachEvent, LibraryWorkout, DayEntry, Goal, PartnerMessage, Profile, TrainingWeek, WeekReview, WorksheetEntry } from './types';

export type ServerProfile = {
  id: string;
  role: 'client' | 'coach';
  name: string;
  identity: string;
  becoming: string;
  purpose: string;
  values: string[];
  currency: Profile['currency'];
  onboarded: boolean;
  plan: Profile['plan'];
  plan_status: Profile['planStatus'];
  approved_tiers: Profile['approvedTiers'];
  requested_tier: Profile['requestedTier'];
  requested_at: string | null;
};

export const toMessage = (row: { id: string; sender_id: string; body: string; created_at: string; read_at: string | null }, me: string): PartnerMessage => ({
  id: row.id,
  from: row.sender_id === me ? 'me' : 'partner',
  text: row.body,
  at: row.created_at,
  readAt: row.read_at,
});

/** Everything the signed-in client has on the server. */
export async function pullAll(userId: string): Promise<{ profile: ServerProfile; data: Partial<AppState> }> {
  const [profile, days, goals, weeks, sheets, training, messages, events, rsvps, workouts, schedule] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('days').select('date, data').eq('user_id', userId).order('date', { ascending: false }).limit(400),
    supabase.from('goals').select('id, data, created_at').eq('user_id', userId),
    supabase.from('weekly_reviews').select('week_start, data').eq('user_id', userId),
    supabase.from('worksheets').select('worksheet_id, data, shared_at, updated_at').eq('user_id', userId),
    supabase.from('training_programs').select('week').eq('user_id', userId).maybeSingle(),
    supabase.from('messages').select('id, sender_id, body, created_at, read_at').eq('client_id', userId).order('created_at').limit(500),
    supabase.from('events').select('*').order('starts_on'),
    supabase.from('event_rsvps').select('event_id').eq('user_id', userId),
    supabase.from('workouts').select('*').eq('published', true).order('created_at', { ascending: false }),
    supabase.from('workout_schedule').select('date, workout_id'),
  ]);
  if (profile.error) throw profile.error;

  const data: Partial<AppState> = {
    days: Object.fromEntries((days.data ?? []).map((r) => [r.date, { ...(r.data as DayEntry), date: r.date }])),
    goals: (goals.data ?? []).map((r) => ({ ...(r.data as Goal), id: r.id, createdAt: r.created_at })),
    weeks: Object.fromEntries((weeks.data ?? []).map((r) => [r.week_start, { ...(r.data as WeekReview), weekStart: r.week_start }])),
    worksheets: Object.fromEntries(
      (sheets.data ?? []).map((r) => [r.worksheet_id, { values: (r.data as WorksheetEntry['values']) ?? {}, sharedAt: r.shared_at, updatedAt: r.updated_at }]),
    ),
    messages: (messages.data ?? []).map((m) => toMessage(m, userId)),
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.starts_on,
      time: e.start_time ?? undefined,
      location: e.location,
      description: e.description,
      signupUrl: e.signup_url ?? undefined,
    })) as CoachEvent[],
    rsvps: (rsvps.data ?? []).map((r) => r.event_id),
    library: (workouts.data ?? []).map(toWorkout),
    schedule: Object.fromEntries((schedule.data ?? []).map((r) => [r.date, r.workout_id])),
  };
  if (training.data?.week && (training.data.week as TrainingWeek).length === 7) data.training = training.data.week as TrainingWeek;
  return { profile: profile.data as ServerProfile, data };
}

/** Write one pending item. Returns true when it is safely stored (or permanently not allowed, e.g. plan doesn't include it). */
export async function pushKey(key: string, s: AppState, userId: string): Promise<boolean> {
  const [kind, id] = splitKey(key);
  let res: { error: { code?: string; message: string } | null };
  switch (kind) {
    case 'profile': {
      const p = s.profile;
      res = await supabase
        .from('profiles')
        .update({
          name: p.name,
          identity: p.identity,
          becoming: p.becoming,
          purpose: p.purpose,
          values: p.values,
          currency: p.currency,
          onboarded: p.onboarded,
          requested_tier: p.requestedTier,
          requested_at: p.requestedAt,
        })
        .eq('id', userId);
      break;
    }
    case 'day': {
      const d = s.days[id];
      if (!d) return true;
      res = await supabase.from('days').upsert({ user_id: userId, date: id, data: d });
      break;
    }
    case 'goal': {
      const g = s.goals.find((x) => x.id === id);
      if (!g) return true;
      const { id: _id, createdAt: _c, ...data } = g;
      res = await supabase.from('goals').upsert({ id, user_id: userId, data });
      break;
    }
    case 'goaldel':
      res = await supabase.from('goals').delete().eq('id', id);
      break;
    case 'week': {
      const w = s.weeks[id];
      if (!w) return true;
      res = await supabase.from('weekly_reviews').upsert({ user_id: userId, week_start: id, data: w });
      break;
    }
    case 'sheet': {
      const w = s.worksheets[id];
      if (!w) return true;
      res = await supabase.from('worksheets').upsert({ user_id: userId, worksheet_id: id, data: w.values, shared_at: w.sharedAt });
      break;
    }
    case 'training':
      res = await supabase.from('training_programs').upsert({ user_id: userId, week: s.training });
      break;
    case 'rsvp':
      res = s.rsvps.includes(id)
        ? await supabase.from('event_rsvps').upsert({ event_id: id, user_id: userId })
        : await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', userId);
      break;
    default:
      return true;
  }
  if (!res.error) return true;
  // 42501 = row-level security refused it (e.g. feature not in plan) — retrying won't help
  if (res.error.code === '42501') {
    console.warn(`sync: ${key} not allowed`, res.error.message);
    return true;
  }
  console.warn(`sync: ${key} failed, will retry`, res.error.message);
  return false;
}

type WorkoutRow = { id: string; title: string; category: LibraryWorkout['category']; duration_min: number | null; level: LibraryWorkout['level']; description: string; video_url: string | null; published: boolean };
export const toWorkout = (r: WorkoutRow): LibraryWorkout => ({
  id: r.id,
  title: r.title,
  category: r.category,
  durationMin: r.duration_min,
  level: r.level,
  description: r.description,
  videoUrl: r.video_url,
  published: r.published,
});

export async function insertMessage(clientId: string, senderId: string, body: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ client_id: clientId, sender_id: senderId, body })
    .select('id, sender_id, body, created_at, read_at')
    .single();
  if (error) throw error;
  return data;
}

const splitKey = (key: string): [string, string] => {
  const i = key.indexOf(':');
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)];
};
