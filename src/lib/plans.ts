export type Tier = 'accountable' | 'perform' | 'elite';

export type Feature = 'checkin' | 'coach' | 'weekly' | 'goals' | 'training' | 'trainingpeaks' | 'worksheets' | 'events';

export type Plan = {
  id: Tier;
  name: string;
  price: number; // per month
  tagline: string;
  features: Feature[];
  bullets: string[];
};

export const PLANS: Plan[] = [
  {
    id: 'accountable',
    name: 'Accountable',
    price: 50,
    tagline: 'Show up every day — with someone watching.',
    features: ['checkin', 'coach', 'weekly', 'goals'],
    bullets: [
      'Daily check-in & planner (purpose, top 3, food, socials)',
      'Daily challenge questions',
      'Identity & “who I’m becoming” work',
      'Accountability chat with your coach',
      'Weekly review & goals',
    ],
  },
  {
    id: 'perform',
    name: 'Perform',
    price: 300,
    tagline: 'The app + personal training programs.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'training', 'trainingpeaks'],
    bullets: ['Everything in Accountable', 'Personal training programs', 'TrainingPeaks connection', 'Training tracking & progress'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 500,
    tagline: 'Body, mind and community — the full system.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'training', 'trainingpeaks', 'worksheets', 'events'],
    bullets: ['Everything in Perform', 'Mental worksheets & mindset work', 'Access to events'],
  },
];

export const planById = (id: Tier) => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const hasFeature = (tier: Tier, f: Feature) => planById(tier).features.includes(f);
/** Cheapest plan that unlocks a feature. */
export const planFor = (f: Feature) => PLANS.find((p) => p.features.includes(f)) ?? PLANS[PLANS.length - 1];
