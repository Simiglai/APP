import { dayOfYear } from './dates';
import { byLang } from '../i18n';

const QUOTES_EN: { text: string; by: string }[] = [
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

const PROMPTS_EN = [
  'What would the best version of you do first today?',
  'Where will you choose discomfort today on purpose?',
  'Who can you lift up today?',
  'What is the one thing that would make today a win?',
  'What habit is your future self thanking you for?',
  'What are you avoiding — and what would happen if you faced it today?',
  'How will you show up for your body today?',
];

const QUOTES_DA: { text: string; by: string }[] = [
  { text: 'Vi er det, vi gentagne gange gør. Ekspertise er derfor ikke en handling, men en vane.', by: 'Will Durant' },
  { text: 'Disciplin er at vælge mellem det, du vil have nu, og det, du vil have mest.', by: 'Abraham Lincoln (tilskrevet)' },
  { text: 'Den, der flytter et bjerg, begynder med at bære små sten væk.', by: 'Konfucius' },
  { text: 'Du stiger ikke til niveauet af dine mål. Du falder til niveauet af dine systemer.', by: 'James Clear' },
  { text: 'Hver handling, du tager, er en stemme på den person, du ønsker at blive.', by: 'James Clear' },
  { text: 'Det er ikke bjerget, vi besejrer, men os selv.', by: 'Edmund Hillary' },
  { text: 'Den bedste vej ud er altid igennem.', by: 'Robert Frost' },
  { text: 'Svære valg, let liv. Lette valg, svært liv.', by: 'Jerzy Gregorek' },
  { text: 'Godt gjort er bedre end godt sagt.', by: 'Benjamin Franklin' },
  { text: 'Det, du gør hver dag, betyder mere end det, du gør en gang imellem.', by: 'Gretchen Rubin' },
  { text: 'Den, der har et hvorfor at leve for, kan klare næsten ethvert hvordan.', by: 'Friedrich Nietzsche' },
  { text: 'Handl, som om det, du gør, gør en forskel. Det gør det.', by: 'William James' },
  { text: 'Hemmeligheden bag at komme foran er at komme i gang.', by: 'Mark Twain (tilskrevet)' },
  { text: 'Spild ikke mere tid på at diskutere, hvad et godt menneske skal være. Vær det.', by: 'Marcus Aurelius' },
  { text: 'Du har magt over dit sind — ikke over ydre begivenheder. Indse det, og du vil finde styrke.', by: 'Marcus Aurelius' },
  { text: 'Mod er ynde under pres.', by: 'Ernest Hemingway' },
  { text: 'Små discipliner gentaget med konsekvens hver dag fører til store resultater, der opnås langsomt over tid.', by: 'John C. Maxwell' },
  { text: 'Motivation får dig i gang, men disciplin får dig til at vokse.', by: 'John C. Maxwell' },
  { text: 'Den eneste person, du er bestemt til at blive, er den person, du beslutter dig for at være.', by: 'Ralph Waldo Emerson (tilskrevet)' },
  { text: 'Gør de svære opgaver først. De lette ordner sig selv.', by: 'Dale Carnegie' },
  { text: 'Om et år ville du måske ønske, at du var startet i dag.', by: 'Karen Lamb' },
];

const PROMPTS_DA = [
  'Hvad ville den bedste version af dig gøre først i dag?',
  'Hvor vælger du bevidst ubehag i dag?',
  'Hvem kan du løfte i dag?',
  'Hvad er den ene ting, der vil gøre i dag til en sejr?',
  'Hvilken vane takker dit fremtidige jeg dig for?',
  'Hvad undgår du — og hvad ville der ske, hvis du tog fat på det i dag?',
  'Hvordan viser du dig frem for din krop i dag?',
];

export const dailyQuote = (key: string) => {
  const list = byLang({ en: QUOTES_EN, da: QUOTES_DA });
  return list[dayOfYear(key) % list.length];
};
export const dailyPrompt = (key: string) => {
  const list = byLang({ en: PROMPTS_EN, da: PROMPTS_DA });
  return list[dayOfYear(key) % list.length];
};

const DISCIPLINE_IDEAS_EN = [
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

/**
 * Coach challenge questions. Each day the client gets one "mirror" question
 * (honest self-reflection) and one "challenge" question (push past comfort).
 * Rotates daily; the two lists have co-prime lengths so pairs rarely repeat.
 */
const MIRROR_QUESTIONS_EN = [
  'What excuse did you use most this week — and is it actually true?',
  'Where are you playing small right now?',
  'If someone followed you around for a day, what would they say you prioritize?',
  'What are you tolerating that you should not be?',
  'Which habit is quietly stealing your future?',
  'When did you last keep a promise to yourself that nobody else would have noticed?',
  'What would you do differently if you knew nobody would judge you?',
  'What story about yourself are you ready to stop telling?',
  'Who in your life makes you better — and are you spending enough time with them?',
  'What do you keep saying “someday” to?',
  'Where are you choosing comfort over growth?',
  'What would the 80-year-old version of you tell you about today?',
  'Which of your values did you honor yesterday — and which did you ignore?',
];

const CHALLENGE_QUESTIONS_EN = [
  'What is the one uncomfortable conversation you need to have — and when will you have it?',
  'What is the hardest thing on your list today? Do it first. When will you start?',
  'What will you say no to today to protect your goals?',
  'How can you go 10% harder in your training today than last time?',
  'Who can you help or encourage today without expecting anything back?',
  'What is one thing you can do today that scares you a little?',
  'What would make today a 10/10 — and what is stopping you?',
  'Where will you add one rep, one minute or one page more than you planned?',
  'What would you attempt today if you knew you could not fail?',
  'What can you finish today that you started and left?',
  'Which temptation will test you today — and what is your plan when it shows up?',
];

const MIRROR_QUESTIONS_DA = [
  'Hvilken undskyldning brugte du mest i denne uge — og er den faktisk sand?',
  'Hvor spiller du for småt lige nu?',
  'Hvis nogen fulgte dig en hel dag, hvad ville de så sige, at du prioriterer?',
  'Hvad finder du dig i, som du ikke burde finde dig i?',
  'Hvilken vane stjæler stille og roligt din fremtid?',
  'Hvornår holdt du sidst et løfte til dig selv, som ingen andre ville have opdaget?',
  'Hvad ville du gøre anderledes, hvis du vidste, at ingen ville dømme dig?',
  'Hvilken historie om dig selv er du klar til at holde op med at fortælle?',
  'Hvem i dit liv gør dig bedre — og bruger du nok tid sammen med dem?',
  'Hvad bliver ved med at stå på din “en dag”-liste?',
  'Hvor vælger du komfort frem for udvikling?',
  'Hvad ville 80-årige dig fortælle dig om i dag?',
  'Hvilke af dine værdier levede du efter i går — og hvilke ignorerede du?',
];

const CHALLENGE_QUESTIONS_DA = [
  'Hvilken ubehagelig samtale skal du tage — og hvornår tager du den?',
  'Hvad er det sværeste på din liste i dag? Gør det først. Hvornår starter du?',
  'Hvad siger du nej til i dag for at beskytte dine mål?',
  'Hvordan kan du give 10 % mere i din træning i dag end sidst?',
  'Hvem kan du hjælpe eller opmuntre i dag uden at forvente noget igen?',
  'Hvad er én ting, du kan gøre i dag, som skræmmer dig en lille smule?',
  'Hvad ville gøre i dag til en 10/10 — og hvad holder dig tilbage?',
  'Hvor lægger du én gentagelse, ét minut eller én side mere på, end du havde planlagt?',
  'Hvad ville du forsøge i dag, hvis du vidste, at du ikke kunne fejle?',
  'Hvad kan du gøre færdigt i dag, som du startede på og lod ligge?',
  'Hvilken fristelse vil teste dig i dag — og hvad er din plan, når den dukker op?',
];

export const dailyQuestions = (key: string) => {
  const n = dayOfYear(key);
  const mirror = byLang({ en: MIRROR_QUESTIONS_EN, da: MIRROR_QUESTIONS_DA });
  const challenge = byLang({ en: CHALLENGE_QUESTIONS_EN, da: CHALLENGE_QUESTIONS_DA });
  return [
    { kind: 'Mirror', text: mirror[n % mirror.length] },
    { kind: 'Challenge', text: challenge[n % challenge.length] },
  ];
};

const SOCIAL_INTENTS_EN = ['Create & share, don’t scroll', 'Only after my top 3 is done', 'No social media today', 'Post my training', 'Reply to people, then close the app'];
const SOCIAL_INTENTS_DA = ['Skab og del — scroll ikke', 'Først når mine top 3 er klaret', 'Ingen sociale medier i dag', 'Del min træning', 'Svar folk, og luk så appen'];
export const socialIntents = () => byLang({ en: SOCIAL_INTENTS_EN, da: SOCIAL_INTENTS_DA });

const DISCIPLINE_IDEAS_DA = [
  'Kold bruser i 2 minutter',
  'Ingen telefon den første time efter jeg vågner',
  'Intet sukker i dag',
  'I seng kl. 22:00',
  'Gør den opgave, jeg har udskudt — først',
  '30 minutters fokuseret arbejde uden notifikationer',
  'Ingen sociale medier i dag',
  'Gå 10.000 skridt',
  'Sig nej til én ting, der ikke tjener mig',
  'Ingen alkohol i dag',
];
export const disciplineIdeas = () => byLang({ en: DISCIPLINE_IDEAS_EN, da: DISCIPLINE_IDEAS_DA });
