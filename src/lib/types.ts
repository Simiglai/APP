import type { Tier } from './plans';
import type { Currency } from '../config';

export type Check = { text: string; done: boolean };

export type Profile = {
  name: string;
  identity: string; // "Who am I?" — I am ...
  becoming: string; // "What can I become?" — vision of future self
  purpose: string; // Life purpose / mission
  values: string[];
  partnerName: string;
  plan: Tier;
  planStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';
  role: 'client' | 'coach';
  approvedTiers: Tier[]; // Perform/Elite the coach has approved after a call
  requestedTier: Tier | null; // plan the client booked a call for
  requestedAt: string | null;
  currency: Currency;
  onboarded: boolean;
};

export type Meals = { breakfast: string; lunch: string; dinner: string; snacks: string };

export type DayEntry = {
  date: string; // YYYY-MM-DD
  sleepHours: number | null;
  energy: number | null; // 1-5
  mood: number | null; // 1-5
  purpose: string; // purpose for today
  top3: Check[];
  happy: string[]; // 5 things that make me happy
  discipline: Check; // 1 thing that will challenge my discipline
  meals: Meals;
  water: number; // glasses
  training: Check & { notes: string; workoutId?: string }; // workoutId: done with a library video
  // become the person who inspires me
  futureSelf: string; // what would the person I'm becoming do today?
  identityActions: Check[]; // 3 actions that prove who I am
  // socials
  connect: Check; // who I will connect with / reach out to
  socialLimit: number | null; // planned minutes on social media
  socialActual: number | null; // actual minutes (evening)
  socialIntent: string; // create / share / avoid …
  // coach challenge questions: question -> answer
  answers: Record<string, string>;
  // evening reflection
  wins: string;
  lesson: string;
  rating: number | null; // 1-10
  morningDoneAt: string | null;
  eveningDoneAt: string | null;
};

export type GoalArea = 'Health' | 'Career' | 'Relationships' | 'Mind' | 'Finance' | 'Purpose';

export type Goal = {
  id: string;
  title: string;
  area: GoalArea;
  why: string;
  targetDate: string;
  milestones: Check[];
  createdAt: string;
};

export type Workout = { title: string; details: string; rest: boolean };
export type TrainingWeek = Workout[]; // index 0 = Monday .. 6 = Sunday

export type PartnerMessage = { id: string; from: 'me' | 'partner'; text: string; at: string; readAt?: string | null; pending?: boolean };

export type WorkoutCategory = 'strength' | 'mobility' | 'recovery';
export type LibraryWorkout = {
  id: string;
  title: string;
  category: WorkoutCategory;
  durationMin: number | null;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all' | null;
  description: string;
  videoUrl: string | null;
  published: boolean;
};

export type CoachEvent = { id: string; title: string; date: string; time?: string; location: string; description: string; signupUrl?: string };

export type WeekReview = {
  weekStart: string; // Monday YYYY-MM-DD
  score: number | null; // 1-10
  biggestWin: string;
  fellShort: string;
  doDifferently: string;
  nextFocus: string;
  becameMore: string; // where did I act like the person I'm becoming?
  doneAt: string | null;
};

export type AppState = {
  profile: Profile;
  days: Record<string, DayEntry>;
  goals: Goal[];
  training: TrainingWeek;
  messages: PartnerMessage[];
  weeks: Record<string, WeekReview>;
  worksheets: Record<string, WorksheetEntry>;
  rsvps: string[]; // event ids
  events: CoachEvent[];
  library: LibraryWorkout[];
  schedule: Record<string, string>; // date → workout id (coach's pick for that day)
};

export type WorksheetEntry = { values: Record<string, string | number>; updatedAt: string; sharedAt: string | null };
