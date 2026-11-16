export type Check = { text: string; done: boolean };

export type Profile = {
  name: string;
  identity: string; // "Who am I?" — I am ...
  becoming: string; // "What can I become?" — vision of future self
  purpose: string; // Life purpose / mission
  values: string[];
  partnerName: string;
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
  training: Check & { notes: string };
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

export type PartnerMessage = { id: string; from: 'me' | 'partner'; text: string; at: string };

export type AppState = {
  profile: Profile;
  days: Record<string, DayEntry>;
  goals: Goal[];
  training: TrainingWeek;
  messages: PartnerMessage[];
};
