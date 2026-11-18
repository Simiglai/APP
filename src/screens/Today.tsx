import { t } from '../i18n';
import { useState } from 'react';
import { daySummary, useStore } from '../lib/store';
import { addDays, prettyDate, todayKey, weekdayIndex } from '../lib/dates';
import { dailyPrompt, dailyQuestions, dailyQuote, disciplineIdeas, socialIntents } from '../lib/motivation';
import type { DayEntry, Meals } from '../lib/types';
import { BrandLogo, Card, CheckRow, Scale, TextField } from '../ui';
import { hasFeature } from '../lib/plans';
import { TodayWorkout } from './Library';
import { TRAININGPEAKS_URL } from './Train';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const ENERGY = ['🪫', '😴', '⚡', '⚡⚡', '🔥'];
const MEAL_LABELS: [keyof Meals, string][] = [
  ['breakfast', t("Breakfast")],
  ['lunch', t("Lunch")],
  ['dinner', t("Dinner")],
  ['snacks', t("Snacks")],
];

export default function Today({ onShare, onWeekly, onTrain }: { onShare: () => void; onWeekly: () => void; onTrain: () => void }) {
  const { state, getDay, updateDay, streak, sendMessage, activeTier } = useStore();
  const [date, setDate] = useState(todayKey());
  const d = getDay(date);
  const set = (patch: Partial<DayEntry>) => updateDay(date, patch);
  const isToday = date === todayKey();
  const quote = dailyQuote(date);
  const hasPrograms = hasFeature(activeTier, 'training');
  // Perform/Elite follow their TrainingPeaks program; everyone can use the workout of the day
  const plan = { title: '', details: '', rest: false };
  const name = state.profile.name;

  const questions = dailyQuestions(date);
  // Everything the client committed to today that can be ticked off
  const commitments = [
    ...d.top3.filter((x) => x.text),
    ...d.identityActions.filter((x) => x.text),
    ...(d.discipline.text ? [d.discipline] : []),
    ...(d.connect.text ? [d.connect] : []),
    d.training,
  ];
  const doneCount = commitments.filter((c) => c.done).length;
  const totalCount = commitments.length;
  const isSunday = weekdayIndex(date) === 6;
  const setList = (field: 'top3' | 'identityActions', i: number, patch: Partial<DayEntry['top3'][number]>) =>
    set({ [field]: d[field].map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const completeMorning = () => {
    set({ morningDoneAt: new Date().toISOString(), training: d.training.text ? d.training : { ...d.training, text: plan.title } });
  };

  const shareToPartner = () => {
    sendMessage(daySummary(name, d));
    onShare();
  };

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? t("Good morning") : h < 18 ? t("Good afternoon") : t("Good evening");
  })();

  return (
    <div className="stack">
      <header className="hero">
        <div className="brandbar">
          <BrandLogo />
        </div>
        <div className="hero__nav">
          <button className="iconbtn" aria-label={t("Previous day")} onClick={() => setDate(addDays(date, -1))}>‹</button>
          <span>{isToday ? t('Today') : prettyDate(date)}</span>
          <button className="iconbtn" aria-label={t("Next day")} disabled={isToday} onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>
        {isToday && <h1>{t(greeting)}{name ? `, ${name}` : ''}.</h1>}
        <p className="hero__date">{prettyDate(date)}</p>
        <div className="hero__stats">
          <div><strong>{streak}</strong><span>{t("day streak 🔥")}</span></div>
          <div><strong>{doneCount}/{totalCount}</strong><span>{t("done today")}</span></div>
          <div><strong>{d.water}</strong><span>{t("glasses 💧")}</span></div>
        </div>
      </header>

      <Card accent>
        <blockquote className="quote">
          “{quote.text}”
          <cite>— {quote.by}</cite>
        </blockquote>
        {state.profile.identity && (
          <p className="identity-reminder"><span>{t("Remember who you are:")}</span> {state.profile.identity}</p>
        )}
        <p className="prompt">💭 {dailyPrompt(date)}</p>
      </Card>

      {isSunday && isToday && (
        <Card title={t("It’s Sunday — weekly review")} icon="📅" hint={t("10 minutes to look back, learn, and set next week’s focus.")}>
          <button className="btn" onClick={onWeekly}>{t("Start weekly review")}</button>
        </Card>
      )}

      <Card title={t("Check in")} icon="🌅" hint={t("How are you showing up today?")}>
        <div className="field">
          <span className="field__label">{t("Mood")}</span>
          <Scale value={d.mood} onChange={(mood) => set({ mood })} labels={MOODS} />
        </div>
        <div className="field">
          <span className="field__label">{t("Energy")}</span>
          <Scale value={d.energy} onChange={(energy) => set({ energy })} labels={ENERGY} />
        </div>
        <label className="field">
          <span className="field__label">{t("Hours slept")}</span>
          <input
            className="input"
            type="number"
            min={0}
            max={14}
            step={0.5}
            inputMode="decimal"
            value={d.sleepHours ?? ''}
            placeholder="7.5"
            onChange={(e) => set({ sleepHours: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
      </Card>

      <Card title={t("Today’s challenge questions")} icon="❓" hint={t("Answer honestly. Your coach will ask.")}>
        {questions.map((q) => (
          <label key={q.text} className="field question">
            <span className={`tag tag--${q.kind.toLowerCase()}`}>{t(q.kind)}</span>
            <span className="question__text">{q.text}</span>
            <textarea
              className="input"
              rows={2}
              value={d.answers[q.text] ?? ''}
              placeholder={t("My honest answer…")}
              onChange={(e) => set({ answers: { ...d.answers, [q.text]: e.target.value } })}
            />
          </label>
        ))}
      </Card>

      <Card title={t("Be the person who inspires you")} icon="🪞" hint={state.profile.becoming ? t('You are becoming: {becoming}', { becoming: state.profile.becoming }) : t('Act like the person you are becoming.')}>
        <TextField
          multiline
          label={t("What would that person do today?")}
          value={d.futureSelf}
          onChange={(futureSelf) => set({ futureSelf })}
          placeholder={t("Wake up on the first alarm, train before work, give full attention at dinner.")}
        />
        <div className="field">
          <span className="field__label">{t("3 actions that prove who I am")}</span>
          {d.identityActions.map((item, i) => (
            <CheckRow
              key={i}
              done={item.done}
              text={item.text}
              placeholder={[t("I am disciplined, so I…"), t("I am healthy, so I…"), t("I am a leader, so I…")][i]}
              onToggle={() => setList('identityActions', i, { done: !item.done })}
              onText={(text) => setList('identityActions', i, { text })}
            />
          ))}
        </div>
      </Card>

      <Card title={t("Purpose for today")} icon="🎯" hint={t("Why does today matter?")}>
        <TextField multiline value={d.purpose} onChange={(purpose) => set({ purpose })} placeholder={t("Today I show up as a leader for my family and my team.")} />
      </Card>

      <Card title={t("Top 3 goals for today")} icon="🏆" hint={t("If only these get done, it was a great day.")}>
        {d.top3.map((item, i) => (
          <CheckRow
            key={i}
            done={item.done}
            text={item.text}
            placeholder={t('Goal {n}', { n: i + 1 })}
            onToggle={() => setList('top3', i, { done: !item.done })}
            onText={(text) => setList('top3', i, { text })}
          />
        ))}
      </Card>

      <Card title={t("5 things that make me happy")} icon="😊" hint={t("Gratitude rewires your focus.")}>
        <ol className="numbered">
          {d.happy.map((h, i) => (
            <li key={i}>
              <input
                className="input input--bare"
                value={h}
                placeholder={[t("My family"), t("Morning coffee"), t("My health"), t("Sunshine"), t("Progress")][i]}
                onChange={(e) => set({ happy: d.happy.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </li>
          ))}
        </ol>
      </Card>

      <Card title={t("1 discipline challenge")} icon="🔥" hint={t("One thing today that will test your discipline.")}>
        <CheckRow
          done={d.discipline.done}
          text={d.discipline.text}
          placeholder={t("e.g. No phone for the first hour")}
          onToggle={() => set({ discipline: { ...d.discipline, done: !d.discipline.done } })}
          onText={(text) => set({ discipline: { ...d.discipline, text } })}
        />
        {!d.discipline.text && (
          <div className="chips chips--small">
            {disciplineIdeas().slice(0, 5).map((idea) => (
              <button key={idea} className="chip" onClick={() => set({ discipline: { text: idea, done: false } })}>{idea}</button>
            ))}
          </div>
        )}
      </Card>

      <Card title={t("Fuel plan")} icon="🥗" hint={t("Decide what you eat before hunger decides for you.")}>
        {MEAL_LABELS.map(([k, label]) => (
          <TextField key={k} label={t(label)} value={d.meals[k]} onChange={(v) => set({ meals: { ...d.meals, [k]: v } })} placeholder={t({ breakfast: t("Eggs, oats, berries"), lunch: t("Chicken, rice, greens"), dinner: t("Salmon, potatoes, veggies"), snacks: t("Greek yogurt, nuts") }[k])} />
        ))}
        <div className="field">
          <span className="field__label">{t("Water (goal 8 glasses)")}</span>
          <div className="water">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} className={`water__glass${i < d.water ? ' is-on' : ''}`} aria-label={t('{n} glasses', { n: i + 1 })} onClick={() => set({ water: d.water === i + 1 ? i : i + 1 })}>💧</button>
            ))}
          </div>
        </div>
      </Card>

      <Card title={t("Training")} icon="💪" hint={t('What will you do for your body today?')}>
        {hasPrograms && (
          <a className="btn btn--ghost" href={TRAININGPEAKS_URL} target="_blank" rel="noopener">{t('See today’s session in TrainingPeaks ↗')}</a>
        )}
        {isToday && <TodayWorkout onOpenLibrary={onTrain} />}
        <CheckRow
          done={d.training.done}
          text={d.training.text || plan.title}
          placeholder={t("e.g. 45 min run, gym upper body, yoga…")}
          onToggle={() => set({ training: { ...d.training, text: d.training.text || plan.title, done: !d.training.done } })}
          onText={(text) => set({ training: { ...d.training, text } })}
        />
        <TextField value={d.training.notes} onChange={(notes) => set({ training: { ...d.training, notes } })} placeholder={t("Notes: weights, distance, how it felt…")} />
      </Card>

      <Card title={t("Socials")} icon="🤝" hint={t("Real connection in, mindless scrolling out.")}>
        <div className="field">
          <span className="field__label">{t("Who will I connect with today?")}</span>
          <CheckRow
            done={d.connect.done}
            text={d.connect.text}
            placeholder={t("Call mum, coffee with a friend, thank a colleague…")}
            onToggle={() => set({ connect: { ...d.connect, done: !d.connect.done } })}
            onText={(text) => set({ connect: { ...d.connect, text } })}
          />
        </div>
        <label className="field">
          <span className="field__label">{t("Social media limit (minutes)")}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            value={d.socialLimit ?? ''}
            placeholder="30"
            onChange={(e) => set({ socialLimit: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
        <div className="field">
          <span className="field__label">{t("My social media rule today")}</span>
          <TextField value={d.socialIntent} onChange={(socialIntent) => set({ socialIntent })} placeholder={t("Create & share, don’t scroll")} />
          {!d.socialIntent && (
            <div className="chips chips--small">
              {socialIntents().map((x) => (
                <button key={x} className="chip" onClick={() => set({ socialIntent: x })}>{x}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!d.morningDoneAt ? (
        <button className="btn btn--big" onClick={completeMorning}>{t("Lock in my day ✓")}</button>
      ) : (
        <p className="done-banner">{isToday ? t('✓ Day planned — now go execute.') : t('✓ Day planned.')}</p>
      )}

      <Card title={t("Evening review")} icon="🌙" hint={t("Close the loop. Be honest, not harsh.")}>
        <TextField multiline label={t("Wins today")} value={d.wins} onChange={(wins) => set({ wins })} placeholder={t("What went well? What am I proud of?")} />
        <TextField multiline label={t("Lesson learned")} value={d.lesson} onChange={(lesson) => set({ lesson })} placeholder={t("What would I do differently?")} />
        <label className="field">
          <span className="field__label">{t('Actual social media time (minutes)')}{d.socialLimit != null ? ` — ${t('limit')} ${d.socialLimit}` : ''}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            value={d.socialActual ?? ''}
            placeholder={t("Check your screen-time settings")}
            onChange={(e) => set({ socialActual: e.target.value === '' ? null : Number(e.target.value) })}
          />
          {d.socialLimit != null && d.socialActual != null && (
            <span className={`small ${d.socialActual <= d.socialLimit ? 'ok-text' : 'danger'}`}>
              {d.socialActual <= d.socialLimit ? t('✓ Within your limit') : t('{n} min over — what triggered it?', { n: d.socialActual - d.socialLimit })}
            </span>
          )}
        </label>
        <div className="field">
          <span className="field__label">{t("Rate your day")}</span>
          <Scale value={d.rating} onChange={(rating) => set({ rating })} max={10} />
        </div>
        {!d.eveningDoneAt ? (
          <button className="btn" disabled={d.rating == null} onClick={() => set({ eveningDoneAt: new Date().toISOString() })}>{t("Complete my day")}</button>
        ) : (
          <p className="done-banner">{t("🌙 Day closed. Rest well.")}</p>
        )}
      </Card>

      <button className="btn btn--ghost" onClick={shareToPartner}>
        {t('Send check-in to {coach} →', { coach: state.profile.partnerName })}
      </button>
    </div>
  );
}
