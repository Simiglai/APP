export type Tier = 'accountable' | 'perform' | 'elite' | 'private';

export type Feature =
  | 'checkin' | 'coach' | 'weekly' | 'goals' | 'library' | 'events' | 'training' | 'trainingpeaks' | 'worksheets'
  | 'eventsincluded' | 'samedaycall' | 'race' | 'privatedays' | 'unlimited' | 'network' | 'innercircle' | 'usrace';

import { formatPrice, type Currency } from '../config';
import { t } from '../i18n';

export type Plan = {
  id: Tier;
  name: string;
  /** Price per billing period. USD null = only sold in DKK. */
  price: { DKK: number; USD: number | null };
  /** 'month' = monthly subscription; '12months' = paid upfront for 12 months, no automatic renewal. */
  billing: 'month' | '12months';
  /** For 12-month plans: what it works out to per month (shown as ≈). */
  monthlyEquivalent?: number;
  tagline: string;
  features: Feature[];
  bullets: string[];
};

export const PLANS: Plan[] = [
  {
    id: 'accountable',
    name: 'Accountable',
    price: { USD: 50, DKK: 349 },
    billing: 'month',
    tagline: 'Show up every day — with someone watching.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'events'],
    bullets: [
      'Daily accountability: check-in & planner',
      'Challenging questions every day',
      'Weekly workouts with Patrick on video',
      'Q&A chat with Patrick',
      'Buy-in to events',
    ],
  },
  {
    id: 'perform',
    name: 'Perform',
    price: { USD: 300, DKK: 1999 },
    billing: 'month',
    tagline: 'Your personal training program — and close follow-up.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'events', 'training', 'trainingpeaks'],
    bullets: [
      'Everything in Accountable',
      'Personal training program in TrainingPeaks',
      'Follow-up several times a week',
      '30 min 1:1 with Patrick every month',
      'Buy-in to events',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: { USD: 500, DKK: 3499 },
    billing: 'month',
    tagline: 'Body, mind and community — the full system.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'events', 'training', 'trainingpeaks', 'worksheets', 'eventsincluded', 'samedaycall', 'race'],
    bullets: [
      'Everything in Perform',
      '1 hour 1:1 with Patrick every month (or 2 × 30 min)',
      'Mental exercises & mindset work',
      'Events included',
      'Same-day call with Patrick when needed',
      'Option to join a race',
    ],
  },
  {
    id: 'private',
    name: 'Private',
    price: { USD: null, DKK: 50000 },
    billing: '12months',
    monthlyEquivalent: 4200,
    tagline: '12 months one-to-one with Patrick.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'events', 'training', 'trainingpeaks', 'worksheets', 'eventsincluded', 'samedaycall', 'race', 'privatedays', 'unlimited', 'network', 'innercircle', 'usrace'],
    bullets: [
      'Everything in Elite',
      'Private days in Patrick’s gym and home',
      'Call Patrick whenever you need — unlimited access',
      'Invites to charity dinners and networks',
      'Patrick’s private inner circle group',
      'Join Patrick on a race in the US + training camp',
    ],
  },
];

/** Stripe price lookup key for a plan (same in test and live mode). */
export const stripeLookupKey = (id: Tier) => (id === 'private' ? 'ps_private_12m' : `ps_${id}_monthly`);

/** The currency a plan is actually sold in for a client who prefers `currency`. */
export const planCurrency = (p: Plan, currency: Currency): Currency => (currency === 'USD' && p.price.USD !== null ? 'USD' : 'DKK');

/** e.g. "349 kr./md." or "50.000 kr. / 12 mdr." */
export const priceLabel = (p: Plan, currency: Currency) => {
  const cur = planCurrency(p, currency);
  return `${formatPrice(p.price[cur] as number, cur)}/${p.billing === '12months' ? t('12 months') : t('mo')}`;
};

export const planById = (id: Tier) => PLANS.find((p) => p.id === id) ?? PLANS[0];
export const hasFeature = (tier: Tier | null, f: Feature) => (tier ? planById(tier).features.includes(f) : false);
/** Cheapest plan that unlocks a feature. */
export const planFor = (f: Feature) => PLANS.find((p) => p.features.includes(f)) ?? PLANS[PLANS.length - 1];

/** Rows of the side-by-side plan comparison. A value is ✓ (true), — (false) or a short text. */
export type Cell = boolean | string;
export const COMPARISON: { label: string; cells: Record<Tier, Cell> }[] = [
  { label: 'Daily accountability (check-in)', cells: { accountable: true, perform: true, elite: true, private: true } },
  { label: 'Challenging questions', cells: { accountable: true, perform: true, elite: true, private: true } },
  { label: 'Weekly workouts on video', cells: { accountable: true, perform: true, elite: true, private: true } },
  { label: 'Q&A chat with Patrick', cells: { accountable: true, perform: true, elite: true, private: true } },
  { label: 'Events', cells: { accountable: 'Buy-in', perform: 'Buy-in', elite: 'Incl.', private: 'Incl.' } },
  { label: 'Training program in TrainingPeaks', cells: { accountable: false, perform: true, elite: true, private: true } },
  { label: 'Follow-up several times a week', cells: { accountable: false, perform: true, elite: true, private: true } },
  { label: '1:1 with Patrick', cells: { accountable: false, perform: '30 min /mo', elite: '1 h /mo', private: 'Always' } },
  { label: 'Mental exercises', cells: { accountable: false, perform: false, elite: true, private: true } },
  { label: 'Same-day call when needed', cells: { accountable: false, perform: false, elite: true, private: true } },
  { label: 'Join a race', cells: { accountable: false, perform: false, elite: 'Option', private: 'US + camp' } },
  { label: 'Private days in gym & home', cells: { accountable: false, perform: false, elite: false, private: true } },
  { label: 'Charity dinners & network', cells: { accountable: false, perform: false, elite: false, private: true } },
  { label: 'Private inner circle group', cells: { accountable: false, perform: false, elite: false, private: true } },
  { label: 'Starts with a free call', cells: { accountable: false, perform: true, elite: true, private: true } },
];
