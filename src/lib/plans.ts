export type Tier = 'accountable' | 'perform' | 'elite' | 'private';

export type Feature = 'checkin' | 'coach' | 'weekly' | 'goals' | 'library' | 'training' | 'trainingpeaks' | 'worksheets' | 'events' | 'privateline' | 'privatedays' | 'personalplan';

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
    features: ['checkin', 'coach', 'weekly', 'goals', 'library'],
    bullets: [
      'Workout of the day + video library with Patrick: strength, mobility & recovery',
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
    price: { USD: 300, DKK: 1999 },
    billing: 'month',
    tagline: 'The app + personal training programs.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'training', 'trainingpeaks'],
    bullets: ['Everything in Accountable', 'Personal training program in TrainingPeaks, built for you', 'Training tracking & progress'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: { USD: 500, DKK: 3499 },
    billing: 'month',
    tagline: 'Body, mind and community — the full system.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'training', 'trainingpeaks', 'worksheets', 'events'],
    bullets: ['Everything in Perform', 'Mental worksheets & mindset work', 'Access to events'],
  },
  {
    id: 'private',
    name: 'Private',
    price: { USD: null, DKK: 50000 },
    billing: '12months',
    monthlyEquivalent: 4200,
    tagline: '12 months one-to-one with Patrick.',
    features: ['checkin', 'coach', 'weekly', 'goals', 'library', 'training', 'trainingpeaks', 'worksheets', 'events', 'privateline', 'privatedays', 'personalplan'],
    bullets: [
      'Everything in Elite',
      'Direct access to Patrick on his private phone number',
      'Private days with Patrick — dinners, events, and join his races if you want',
      'A personal plan we build together',
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

/** Rows of the plan comparison table: which features each plan includes. */
export const COMPARISON: { label: string; feature: Feature }[] = [
  { label: 'Daily check-in & planner', feature: 'checkin' },
  { label: 'Daily challenge questions', feature: 'checkin' },
  { label: 'Workout of the day + video library', feature: 'library' },
  { label: 'Accountability chat with Patrick', feature: 'coach' },
  { label: 'Weekly review & goals', feature: 'weekly' },
  { label: 'Personal training program (TrainingPeaks)', feature: 'training' },
  { label: 'Mental worksheets & mindset work', feature: 'worksheets' },
  { label: 'Events & community', feature: 'events' },
  { label: 'Patrick’s private phone number', feature: 'privateline' },
  { label: 'Private days: dinners, events, races', feature: 'privatedays' },
  { label: 'Personal plan built together', feature: 'personalplan' },
];
