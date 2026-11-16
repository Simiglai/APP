import { dayOfYear } from './dates';

const QUOTES: { text: string; by: string }[] = [
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
  { text: 'Discipline is choosing between what you want now and what you want most.', by: 'Abraham Lincoln (attr.)' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', by: 'Confucius' },
  { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', by: 'James Clear' },
  { text: 'Every action you take is a vote for the type of person you wish to become.', by: 'James Clear' },
  { text: 'It is not the mountain we conquer, but ourselves.', by: 'Edmund Hillary' },
  { text: 'The best way out is always through.', by: 'Robert Frost' },
  { text: 'Hard choices, easy life. Easy choices, hard life.', by: 'Jerzy Gregorek' },
  { text: 'Well done is better than well said.', by: 'Benjamin Franklin' },
  { text: 'What you do every day matters more than what you do once in a while.', by: 'Gretchen Rubin' },
  { text: 'He who has a why to live can bear almost any how.', by: 'Friedrich Nietzsche' },
  { text: 'Act as if what you do makes a difference. It does.', by: 'William James' },
  { text: 'The secret of getting ahead is getting started.', by: 'Mark Twain (attr.)' },
  { text: 'Waste no more time arguing what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', by: 'Marcus Aurelius' },
  { text: 'Courage is grace under pressure.', by: 'Ernest Hemingway' },
  { text: 'Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.', by: 'John C. Maxwell' },
  { text: 'Motivation gets you going, but discipline keeps you growing.', by: 'John C. Maxwell' },
  { text: 'The only person you are destined to become is the person you decide to be.', by: 'Ralph Waldo Emerson (attr.)' },
  { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', by: 'Dale Carnegie' },
  { text: 'A year from now you may wish you had started today.', by: 'Karen Lamb' },
];

const PROMPTS = [
  'What would the best version of you do first today?',
  'Where will you choose discomfort today on purpose?',
  'Who can you lift up today?',
  'What is the one thing that would make today a win?',
  'What habit is your future self thanking you for?',
  'What are you avoiding — and what would happen if you faced it today?',
  'How will you show up for your body today?',
];

export const dailyQuote = (key: string) => QUOTES[dayOfYear(key) % QUOTES.length];
export const dailyPrompt = (key: string) => PROMPTS[dayOfYear(key) % PROMPTS.length];

export const DISCIPLINE_IDEAS = [
  'Cold shower for 2 minutes',
  'No phone for the first hour awake',
  'No sugar today',
  'Go to bed by 22:00',
  'Do the task I have been putting off — first',
  '30 minutes of deep work with no notifications',
  'No social media today',
  'Walk 10,000 steps',
  'Say no to one thing that does not serve me',
  'No alcohol today',
];
