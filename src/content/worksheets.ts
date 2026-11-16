/**
 * Mental worksheets (Elite). Each worksheet is a list of fields the client fills in.
 * Add or edit worksheets here — the app renders them automatically.
 */
export type WorksheetField =
  | { key: string; type: 'text' | 'long'; label: string; placeholder?: string }
  | { key: string; type: 'scale'; label: string; max: number }
  | { key: string; type: 'heading'; label: string; hint?: string };

export type Worksheet = { id: string; title: string; minutes: number; intro: string; fields: WorksheetField[] };

export const WORKSHEETS: Worksheet[] = [
  {
    id: 'fear-setting',
    title: 'Fear setting',
    minutes: 20,
    intro: 'Define the fear instead of your goals. What we fear doing most is usually what we most need to do.',
    fields: [
      { key: 'what', type: 'long', label: 'What am I afraid to do or change?', placeholder: 'Start my own business, have the hard conversation, sign up for the race…' },
      { key: 'h1', type: 'heading', label: 'The worst case', hint: 'Be specific. Fear thrives on vagueness.' },
      { key: 'define', type: 'long', label: 'Define — the worst things that could happen' },
      { key: 'prevent', type: 'long', label: 'Prevent — what could I do to prevent each of them?' },
      { key: 'repair', type: 'long', label: 'Repair — if it happened, how would I fix it or who could I ask for help?' },
      { key: 'h2', type: 'heading', label: 'The upside' },
      { key: 'benefits', type: 'long', label: 'What might I gain from an attempt or partial success?' },
      { key: 'h3', type: 'heading', label: 'The cost of doing nothing' },
      { key: 'cost6', type: 'long', label: 'If I avoid this — what does my life look like in 6 months?' },
      { key: 'cost1', type: 'long', label: '…in 1 year?' },
      { key: 'cost3', type: 'long', label: '…in 3 years?' },
      { key: 'first', type: 'text', label: 'The first step I will take within 48 hours' },
    ],
  },
  {
    id: 'limiting-beliefs',
    title: 'Break a limiting belief',
    minutes: 15,
    intro: 'Your beliefs set the ceiling of what you attempt. Find one and rewrite it.',
    fields: [
      { key: 'belief', type: 'long', label: 'A belief that holds me back', placeholder: 'I’m not the kind of person who…' },
      { key: 'origin', type: 'long', label: 'Where did this belief come from?' },
      { key: 'cost', type: 'long', label: 'What has this belief cost me so far?' },
      { key: 'evidence', type: 'long', label: 'Evidence that it is NOT true' },
      { key: 'newBelief', type: 'long', label: 'My new, empowering belief', placeholder: 'I am someone who…' },
      { key: 'proof', type: 'text', label: 'One action this week that proves the new belief' },
    ],
  },
  {
    id: 'future-self',
    title: 'Letter from your future self',
    minutes: 20,
    intro: 'Write a letter from you, 3 years from now, after you became the person you are working to be.',
    fields: [
      { key: 'life', type: 'long', label: 'Describe your life 3 years from now — health, work, relationships, how you feel' },
      { key: 'decisions', type: 'long', label: 'Which decisions made the biggest difference?' },
      { key: 'quit', type: 'long', label: 'What did you have to stop doing?' },
      { key: 'advice', type: 'long', label: 'What advice do you give your present self today?' },
    ],
  },
  {
    id: 'wheel-of-life',
    title: 'Wheel of life',
    minutes: 10,
    intro: 'Rate each area of your life from 1 to 10. Balance is not perfection — it is awareness.',
    fields: [
      { key: 'health', type: 'scale', label: 'Health & fitness', max: 10 },
      { key: 'mind', type: 'scale', label: 'Mindset & mental health', max: 10 },
      { key: 'career', type: 'scale', label: 'Career & business', max: 10 },
      { key: 'finance', type: 'scale', label: 'Finances', max: 10 },
      { key: 'relationships', type: 'scale', label: 'Partner / love', max: 10 },
      { key: 'family', type: 'scale', label: 'Family & friends', max: 10 },
      { key: 'fun', type: 'scale', label: 'Fun & adventure', max: 10 },
      { key: 'purpose', type: 'scale', label: 'Purpose & contribution', max: 10 },
      { key: 'focus', type: 'long', label: 'Which ONE area, if improved, would lift all the others? What will I do?' },
    ],
  },
  {
    id: 'pressure-plan',
    title: 'Pressure plan',
    minutes: 15,
    intro: 'Champions don’t rise to the occasion — they fall back on their preparation. Plan your response before the pressure hits.',
    fields: [
      { key: 'situations', type: 'long', label: 'Situations where I tend to lose control or give up' },
      { key: 'signals', type: 'long', label: 'Early warning signals (thoughts, body, behaviour)' },
      { key: 'reset', type: 'long', label: 'My reset routine (breath, cue word, action)', placeholder: '3 deep breaths, say “Next”, focus on the next small action' },
      { key: 'cue', type: 'text', label: 'My cue word' },
      { key: 'after', type: 'long', label: 'How I want to talk to myself after a setback' },
    ],
  },
  {
    id: 'non-negotiables',
    title: 'Values & non-negotiables',
    minutes: 10,
    intro: 'Decide once, so you don’t have to decide every day.',
    fields: [
      { key: 'values', type: 'long', label: 'My top 5 values, in order' },
      { key: 'daily', type: 'long', label: 'My daily non-negotiables', placeholder: 'Train, 8 hours in bed, 30 min with my kids, no phone at dinner' },
      { key: 'never', type: 'long', label: 'Things I no longer do' },
      { key: 'boundary', type: 'text', label: 'One boundary I will hold this month' },
    ],
  },
];
