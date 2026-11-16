import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppState, DayEntry, Goal, PartnerMessage, Profile, TrainingWeek, WeekReview, WorksheetEntry } from './types';
import { addDays, todayKey } from './dates';

/**
 * Local-first store. Everything is persisted to localStorage for now.
 * The shape (profile / days / goals / training / messages) maps 1:1 to
 * backend tables, so swapping this for a synced backend later is contained here.
 */
const STORAGE_KEY = 'rise-daily:v1';

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

const defaultTraining: TrainingWeek = [
  { title: 'Upper body strength', details: 'Push-ups 4x12, rows 4x10, overhead press 3x10, plank 3x45s', rest: false },
  { title: 'Zone 2 cardio', details: '40 min easy run / bike, conversational pace', rest: false },
  { title: 'Lower body strength', details: 'Squats 4x10, lunges 3x12, RDL 3x10, calf raises 3x15', rest: false },
  { title: 'Mobility + core', details: '20 min mobility flow, dead bugs, side planks', rest: false },
  { title: 'Full body + intervals', details: 'Circuit x4: burpees, KB swings, pull-ups, 400m run', rest: false },
  { title: 'Long walk / sport', details: '60+ min outdoors — hike, play, move for fun', rest: false },
  { title: 'Rest & recover', details: 'Stretch, sleep, plan the week ahead', rest: true },
];

const initialState: AppState = {
  profile: { name: '', identity: '', becoming: '', purpose: '', values: [], partnerName: '', plan: 'accountable', onboarded: false },
  days: {},
  goals: [],
  training: defaultTraining,
  messages: [],
  weeks: {},
  worksheets: {},
  rsvps: [],
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

const load = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    return { ...initialState, ...saved, profile: { ...initialState.profile, ...saved.profile } };
  } catch {
    return initialState;
  }
};

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

type Store = {
  state: AppState;
  getDay: (date: string) => DayEntry;
  updateDay: (date: string, patch: Partial<DayEntry>) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  saveGoal: (goal: Omit<Goal, 'id' | 'createdAt'> & { id?: string }) => void;
  deleteGoal: (id: string) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  setTraining: (week: TrainingWeek) => void;
  sendMessage: (text: string, from?: PartnerMessage['from']) => void;
  saveWorksheet: (id: string, patch: Partial<WorksheetEntry>) => void;
  toggleRsvp: (eventId: string) => void;
  getWeek: (weekStart: string) => WeekReview;
  updateWeek: (weekStart: string, patch: Partial<WeekReview>) => void;
  streak: number;
  reset: () => void;
};

const StoreContext = createContext<Store | null>(null);

/** A day counts towards the streak when the morning check-in was completed. */
const computeStreak = (days: AppState['days']) => {
  let key = todayKey();
  if (!days[key]?.morningDoneAt) key = addDays(key, -1); // today not done yet — don't break streak
  let n = 0;
  while (days[key]?.morningDoneAt) {
    n++;
    key = addDays(key, -1);
  }
  return n;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable — keep working in memory */
    }
  }, [state]);

  const getDay = useCallback((date: string) => ({ ...emptyDay(date), ...state.days[date] }), [state.days]);

  const updateDay = useCallback((date: string, patch: Partial<DayEntry>) => {
    setState((s) => ({ ...s, days: { ...s.days, [date]: { ...emptyDay(date), ...s.days[date], ...patch } } }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const saveGoal: Store['saveGoal'] = useCallback((goal) => {
    setState((s) => {
      if (goal.id) return { ...s, goals: s.goals.map((g) => (g.id === goal.id ? { ...g, ...goal, id: g.id } : g)) };
      return { ...s, goals: [...s.goals, { ...goal, id: uid(), createdAt: new Date().toISOString() }] };
    });
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) }));
  }, []);

  const setTraining = useCallback((training: TrainingWeek) => setState((s) => ({ ...s, training })), []);

  const sendMessage = useCallback((text: string, from: PartnerMessage['from'] = 'me') => {
    setState((s) => ({ ...s, messages: [...s.messages, { id: uid(), from, text, at: new Date().toISOString() }] }));
  }, []);

  const getWeek = useCallback((weekStart: string) => ({ ...emptyWeek(weekStart), ...state.weeks[weekStart] }), [state.weeks]);

  const updateWeek = useCallback((weekStart: string, patch: Partial<WeekReview>) => {
    setState((s) => ({ ...s, weeks: { ...s.weeks, [weekStart]: { ...emptyWeek(weekStart), ...s.weeks[weekStart], ...patch } } }));
  }, []);

  const saveWorksheet = useCallback((id: string, patch: Partial<WorksheetEntry>) => {
    setState((s) => {
      const prev = s.worksheets[id] ?? { values: {}, updatedAt: '', sharedAt: null };
      return { ...s, worksheets: { ...s.worksheets, [id]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } };
    });
  }, []);

  const toggleRsvp = useCallback((eventId: string) => {
    setState((s) => ({ ...s, rsvps: s.rsvps.includes(eventId) ? s.rsvps.filter((x) => x !== eventId) : [...s.rsvps, eventId] }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const streak = useMemo(() => computeStreak(state.days), [state.days]);

  const value = useMemo(
    () => ({ state, getDay, updateDay, updateProfile, saveGoal, deleteGoal, updateGoal, setTraining, sendMessage, saveWorksheet, toggleRsvp, getWeek, updateWeek, streak, reset }),
    [state, getDay, updateDay, updateProfile, saveGoal, deleteGoal, updateGoal, setTraining, sendMessage, saveWorksheet, toggleRsvp, getWeek, updateWeek, streak, reset],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};

/** Plain-text summary of a day, used to share a check-in with the accountability partner. */
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
