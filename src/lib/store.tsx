import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, DayEntry, Goal, PartnerMessage, Profile, TrainingWeek, WeekReview, WorksheetEntry } from './types';
import { addDays, todayKey } from './dates';
import { COACH_NAME, defaultCurrency } from '../config';
import type { Tier } from './plans';
import { insertMessage, pullAll, pushKey, toMessage } from './sync';
import { supabase } from './supabase';

/**
 * Local-first store, synced to Supabase.
 * - Each user's data is cached in localStorage so the app opens instantly and works offline.
 * - Every change marks a "pending" key; pending keys are written to the database shortly after,
 *   and survive app restarts until they are stored.
 * - When fresh data arrives from the server it never overwrites pending (unsent) changes.
 */
const LEGACY_KEY = 'rise-daily:v1'; // data from before accounts existed
const cacheKey = (userId: string) => `ps-daily:${userId}`;
const PUSH_DELAY_MS = 800;

export const emptyDay = (date: string): DayEntry => ({
  date,
  sleepHours: null,
  energy: null,
  mood: null,
  purpose: '',
  top3: [0, 1, 2].map(() => ({ text: '', done: false })),
  happy: ['', '', '', '', ''],
  discipline: { text: '', done: false },
  meals: { breakfast: '', lunch: '', dinner: '', snacks: '' },
  water: 0,
  training: { text: '', done: false, notes: '' },
  futureSelf: '',
  identityActions: [0, 1, 2].map(() => ({ text: '', done: false })),
  connect: { text: '', done: false },
  socialLimit: null,
  socialActual: null,
  socialIntent: '',
  answers: {},
  wins: '',
  lesson: '',
  rating: null,
  morningDoneAt: null,
  eveningDoneAt: null,
});

export const defaultTraining: TrainingWeek = [
  { title: 'Upper body strength', details: 'Push-ups 4x12, rows 4x10, overhead press 3x10, plank 3x45s', rest: false },
  { title: 'Zone 2 cardio', details: '40 min easy run / bike, conversational pace', rest: false },
  { title: 'Lower body strength', details: 'Squats 4x10, lunges 3x12, RDL 3x10, calf raises 3x15', rest: false },
  { title: 'Mobility + core', details: '20 min mobility flow, dead bugs, side planks', rest: false },
  { title: 'Full body + intervals', details: 'Circuit x4: burpees, KB swings, pull-ups, 400m run', rest: false },
  { title: 'Long walk / sport', details: '60+ min outdoors — hike, play, move for fun', rest: false },
  { title: 'Rest & recover', details: 'Stretch, sleep, plan the week ahead', rest: true },
];

const initialState: AppState = {
  profile: {
    name: '',
    identity: '',
    becoming: '',
    purpose: '',
    values: [],
    partnerName: COACH_NAME,
    plan: 'accountable',
    planStatus: 'none',
    role: 'client',
    currency: defaultCurrency(),
    onboarded: false,
  },
  days: {},
  goals: [],
  training: defaultTraining,
  messages: [],
  weeks: {},
  worksheets: {},
  rsvps: [],
  events: [],
};

export const emptyWeek = (weekStart: string): WeekReview => ({
  weekStart,
  score: null,
  biggestWin: '',
  fellShort: '',
  doDifferently: '',
  nextFocus: '',
  becameMore: '',
  doneAt: null,
});

type Cache = { state: AppState; pending: string[] };

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const withDefaults = (saved: Partial<AppState>): AppState => ({
  ...initialState,
  ...saved,
  profile: { ...initialState.profile, ...saved.profile, partnerName: COACH_NAME },
  // goal ids must be UUIDs for the database
  goals: (saved.goals ?? []).map((g) => (isUuid(g.id) ? g : { ...g, id: crypto.randomUUID() })),
});

const readCache = (userId: string): Cache | null => {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (raw) {
      const c = JSON.parse(raw) as Cache;
      return { state: withDefaults(c.state), pending: c.pending ?? [] };
    }
    // First login on this device: adopt data entered before accounts existed, and upload it.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const state = withDefaults(JSON.parse(legacy));
      const pending = [
        'profile',
        ...Object.keys(state.days).map((d) => `day:${d}`),
        ...state.goals.map((g) => `goal:${g.id}`),
        ...Object.keys(state.weeks).map((w) => `week:${w}`),
        ...Object.keys(state.worksheets).map((w) => `sheet:${w}`),
      ];
      return { state: { ...state, messages: [], rsvps: [] }, pending };
    }
  } catch {
    /* corrupt cache — start fresh from the server */
  }
  return null;
};

const writeCache = (userId: string, c: Cache) => {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(c));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage full or unavailable — keep working in memory */
  }
};

export type SyncStatus = 'loading' | 'synced' | 'saving' | 'offline';

type Store = {
  state: AppState;
  userId: string;
  syncStatus: SyncStatus;
  /** The plan the client has actually paid for (null = no active subscription). The coach has everything. */
  activeTier: Tier | null;
  getDay: (date: string) => DayEntry;
  updateDay: (date: string, patch: Partial<DayEntry>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  saveGoal: (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteGoal: (id: string) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  setTraining: (week: TrainingWeek) => void;
  sendMessage: (text: string) => void;
  saveWorksheet: (id: string, patch: Partial<WorksheetEntry>) => void;
  toggleRsvp: (eventId: string) => void;
  getWeek: (weekStart: string) => WeekReview;
  updateWeek: (weekStart: string, patch: Partial<WeekReview>) => void;
  refresh: () => Promise<void>;
  streak: number;
};

const StoreContext = createContext<Store | null>(null);

/** A day counts towards the streak when the morning check-in was completed. */
export const computeStreak = (days: Record<string, Pick<DayEntry, 'morningDoneAt'>>) => {
  let key = todayKey();
  if (!days[key]?.morningDoneAt) key = addDays(key, -1); // today not done yet — don't break streak
  let n = 0;
  while (days[key]?.morningDoneAt) {
    n++;
    key = addDays(key, -1);
  }
  return n;
};

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const cached = useMemo(() => readCache(userId), [userId]);
  const [state, setState] = useState<AppState>(cached?.state ?? initialState);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [loaded, setLoaded] = useState(!!cached); // show cached data right away
  const pending = useRef(new Set<string>(cached?.pending ?? []));
  const stateRef = useRef(state);
  stateRef.current = state;
  const timer = useRef<number | undefined>(undefined);
  const flushing = useRef(false);

  const persist = useCallback(() => writeCache(userId, { state: stateRef.current, pending: [...pending.current] }), [userId]);
  useEffect(persist, [state, persist]);

  const flush = useCallback(async () => {
    if (flushing.current || pending.current.size === 0) return;
    flushing.current = true;
    setSyncStatus('saving');
    let failed = false;
    for (const key of [...pending.current]) {
      const ok = await pushKey(key, stateRef.current, userId).catch(() => false);
      if (ok) pending.current.delete(key);
      else failed = true;
    }
    flushing.current = false;
    persist();
    setSyncStatus(failed ? 'offline' : pending.current.size ? 'saving' : 'synced');
    if (pending.current.size) timer.current = window.setTimeout(flush, failed ? 10_000 : PUSH_DELAY_MS);
  }, [userId, persist]);

  const mark = useCallback(
    (...keys: string[]) => {
      keys.forEach((k) => pending.current.add(k));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, PUSH_DELAY_MS);
    },
    [flush],
  );

  /** Load from the server; server data wins except for keys with unsent local changes. */
  const refresh = useCallback(async () => {
    try {
      const { profile, data } = await pullAll(userId);
      setState((s) => {
        const keep = pending.current;
        const days = { ...data.days };
        for (const [d, v] of Object.entries(s.days)) if (keep.has(`day:${d}`) || !days[d]) days[d] = v;
        const weeks = { ...data.weeks };
        for (const [w, v] of Object.entries(s.weeks)) if (keep.has(`week:${w}`) || !weeks[w]) weeks[w] = v;
        const worksheets = { ...data.worksheets };
        for (const [w, v] of Object.entries(s.worksheets)) if (keep.has(`sheet:${w}`) || !worksheets[w]) worksheets[w] = v;
        const serverGoals = data.goals ?? [];
        const goals = [
          ...serverGoals.filter((g) => !keep.has(`goaldel:${g.id}`)).map((g) => (keep.has(`goal:${g.id}`) ? s.goals.find((x) => x.id === g.id) ?? g : g)),
          ...s.goals.filter((g) => keep.has(`goal:${g.id}`) && !serverGoals.some((x) => x.id === g.id)),
        ];
        // RSVPs: server set, except events whose RSVP was toggled locally and not yet sent
        const rsvps = new Set(data.rsvps ?? []);
        for (const key of keep) {
          if (!key.startsWith('rsvp:')) continue;
          const id = key.slice(5);
          if (s.rsvps.includes(id)) rsvps.add(id);
          else rsvps.delete(id);
        }
        const localProfile = keep.has('profile');
        return {
          ...s,
          ...data,
          days,
          weeks,
          worksheets,
          goals,
          training: keep.has('training') ? s.training : data.training ?? s.training,
          rsvps: [...rsvps],
          messages: [...(data.messages ?? []), ...s.messages.filter((m) => m.pending)],
          profile: {
            ...s.profile,
            ...(localProfile
              ? {}
              : {
                  name: profile.name,
                  identity: profile.identity,
                  becoming: profile.becoming,
                  purpose: profile.purpose,
                  values: profile.values ?? [],
                  currency: profile.currency,
                  onboarded: profile.onboarded,
                }),
            role: profile.role,
            plan: profile.plan,
            planStatus: profile.plan_status,
          },
        };
      });
      setSyncStatus(pending.current.size ? 'saving' : 'synced');
      if (pending.current.size) mark();
    } catch (e) {
      console.warn('sync: could not load from server', e);
      setSyncStatus('offline');
    } finally {
      setLoaded(true);
    }
  }, [userId, mark]);

  useEffect(() => {
    refresh();
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', flush);
    // live chat: new messages in my thread
    const channel = supabase
      .channel(`thread-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${userId}` }, (payload) => {
        const m = toMessage(payload.new as Parameters<typeof toMessage>[0], userId);
        setState((s) => (s.messages.some((x) => x.id === m.id) ? s : { ...s, messages: [...s.messages, m] }));
      })
      // "seen" receipts: the coach marking my messages as read
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `client_id=eq.${userId}` }, (payload) => {
        const row = payload.new as { id: string; read_at: string | null };
        setState((s) => ({ ...s, messages: s.messages.map((x) => (x.id === row.id ? { ...x, readAt: row.read_at } : x)) }));
      })
      .subscribe();
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', flush);
      supabase.removeChannel(channel);
      window.clearTimeout(timer.current);
    };
  }, [userId, refresh, flush]);

  const getDay = useCallback((date: string) => ({ ...emptyDay(date), ...state.days[date] }), [state.days]);

  const updateDay = useCallback(
    (date: string, patch: Partial<DayEntry>) => {
      setState((s) => ({ ...s, days: { ...s.days, [date]: { ...emptyDay(date), ...s.days[date], ...patch } } }));
      mark(`day:${date}`);
    },
    [mark],
  );

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
      mark('profile');
    },
    [mark],
  );

  const saveGoal: Store['saveGoal'] = useCallback(
    (goal) => {
      const id = goal.id ?? crypto.randomUUID();
      setState((s) =>
        goal.id
          ? { ...s, goals: s.goals.map((g) => (g.id === goal.id ? { ...g, ...goal, id } : g)) }
          : { ...s, goals: [...s.goals, { ...goal, id, createdAt: new Date().toISOString() }] },
      );
      mark(`goal:${id}`);
    },
    [mark],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Goal>) => {
      setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      mark(`goal:${id}`);
    },
    [mark],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
      pending.current.delete(`goal:${id}`);
      mark(`goaldel:${id}`);
    },
    [mark],
  );

  const setTraining = useCallback(
    (training: TrainingWeek) => {
      setState((s) => ({ ...s, training }));
      mark('training');
    },
    [mark],
  );

  const sendMessage = useCallback(
    (text: string) => {
      const temp: PartnerMessage = { id: `tmp-${crypto.randomUUID()}`, from: 'me', text, at: new Date().toISOString(), pending: true };
      setState((s) => ({ ...s, messages: [...s.messages, temp] }));
      insertMessage(userId, userId, text)
        .then((row) => {
          const m = toMessage(row, userId);
          setState((s) => ({
            ...s,
            // replace the optimistic copy (realtime may already have delivered the real one)
            messages: s.messages.some((x) => x.id === m.id) ? s.messages.filter((x) => x.id !== temp.id) : s.messages.map((x) => (x.id === temp.id ? m : x)),
          }));
        })
        .catch(() => setState((s) => ({ ...s, messages: s.messages.map((x) => (x.id === temp.id ? { ...x, text: `${x.text}\n\n⚠️ Not sent — check your connection` } : x)) })));
    },
    [userId],
  );

  const getWeek = useCallback((weekStart: string) => ({ ...emptyWeek(weekStart), ...state.weeks[weekStart] }), [state.weeks]);

  const updateWeek = useCallback(
    (weekStart: string, patch: Partial<WeekReview>) => {
      setState((s) => ({ ...s, weeks: { ...s.weeks, [weekStart]: { ...emptyWeek(weekStart), ...s.weeks[weekStart], ...patch } } }));
      mark(`week:${weekStart}`);
    },
    [mark],
  );

  const saveWorksheet = useCallback(
    (id: string, patch: Partial<WorksheetEntry>) => {
      setState((s) => {
        const prev = s.worksheets[id] ?? { values: {}, updatedAt: '', sharedAt: null };
        return { ...s, worksheets: { ...s.worksheets, [id]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } };
      });
      mark(`sheet:${id}`);
    },
    [mark],
  );

  const toggleRsvp = useCallback(
    (eventId: string) => {
      setState((s) => ({ ...s, rsvps: s.rsvps.includes(eventId) ? s.rsvps.filter((x) => x !== eventId) : [...s.rsvps, eventId] }));
      mark(`rsvp:${eventId}`);
    },
    [mark],
  );

  const streak = useMemo(() => computeStreak(state.days), [state.days]);
  const { role, plan, planStatus } = state.profile;
  const activeTier: Tier | null = role === 'coach' ? 'elite' : planStatus === 'active' || planStatus === 'trialing' ? plan : null;

  const value = useMemo(
    () => ({
      state,
      userId,
      syncStatus,
      activeTier,
      getDay,
      updateDay,
      updateProfile,
      saveGoal,
      deleteGoal,
      updateGoal,
      setTraining,
      sendMessage,
      saveWorksheet,
      toggleRsvp,
      getWeek,
      updateWeek,
      refresh,
      streak,
    }),
    [state, userId, syncStatus, activeTier, getDay, updateDay, updateProfile, saveGoal, deleteGoal, updateGoal, setTraining, sendMessage, saveWorksheet, toggleRsvp, getWeek, updateWeek, refresh, streak],
  );

  if (!loaded) return <div className="splash"><div className="spinner" aria-label="Loading" /></div>;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};

/** Plain-text summary of a day, used to share a check-in with the coach. */
export const daySummary = (name: string, d: DayEntry) => {
  const lines = [`✅ ${name || 'Me'} — daily check-in (${d.date})`];
  if (d.purpose) lines.push(`🎯 Purpose: ${d.purpose}`);
  const top = d.top3.filter((t) => t.text);
  if (top.length) lines.push('🏆 Top 3:', ...top.map((t) => `  ${t.done ? '☑' : '☐'} ${t.text}`));
  if (d.discipline.text) lines.push(`🔥 Discipline challenge: ${d.discipline.text}${d.discipline.done ? ' — DONE' : ''}`);
  if (d.training.text) lines.push(`💪 Training: ${d.training.text}${d.training.done ? ' — DONE' : ''}`);
  const acts = d.identityActions.filter((t) => t.text);
  if (acts.length) lines.push('🪞 Identity actions:', ...acts.map((t) => `  ${t.done ? '☑' : '☐'} ${t.text}`));
  if (d.connect.text) lines.push(`🤝 Connect: ${d.connect.text}${d.connect.done ? ' — DONE' : ''}`);
  if (d.socialLimit != null) lines.push(`📱 Social media: ${d.socialActual ?? '?'} / ${d.socialLimit} min`);
  const happy = d.happy.filter(Boolean);
  if (happy.length) lines.push(`😊 Happy about: ${happy.join(', ')}`);
  for (const [q, a] of Object.entries(d.answers)) if (a.trim()) lines.push(`❓ ${q}\n   → ${a.trim()}`);
  if (d.rating) lines.push(`⭐ Day rating: ${d.rating}/10`);
  return lines.join('\n');
};
