import { useState } from 'react';
import { daySummary, useStore } from '../lib/store';
import { addDays, prettyDate, todayKey, weekdayIndex } from '../lib/dates';
import { DISCIPLINE_IDEAS, SOCIAL_INTENTS, dailyPrompt, dailyQuestions, dailyQuote } from '../lib/motivation';
import type { DayEntry, Meals } from '../lib/types';
import { BrandLogo, Card, CheckRow, Scale, TextField } from '../ui';

const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const ENERGY = ['🪫', '😴', '⚡', '⚡⚡', '🔥'];
const MEAL_LABELS: [keyof Meals, string][] = [
  ['breakfast', 'Breakfast'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['snacks', 'Snacks'],
];

export default function Today({ onShare, onWeekly }: { onShare: () => void; onWeekly: () => void }) {
  const { state, getDay, updateDay, streak, sendMessage } = useStore();
  const [date, setDate] = useState(todayKey());
  const d = getDay(date);
  const set = (patch: Partial<DayEntry>) => updateDay(date, patch);
  const isToday = date === todayKey();
  const quote = dailyQuote(date);
  const plan = state.training[weekdayIndex(date)];
  const name = state.profile.name;

  const questions = dailyQuestions(date);
  // Everything the client committed to today that can be ticked off
  const commitments = [
    ...d.top3.filter((t) => t.text),
    ...d.identityActions.filter((t) => t.text),
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
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <div className="stack">
      <header className="hero">
        <div className="brandbar">
          <BrandLogo />
        </div>
        <div className="hero__nav">
          <button className="iconbtn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>‹</button>
          <span>{isToday ? 'Today' : prettyDate(date)}</span>
          <button className="iconbtn" aria-label="Next day" disabled={isToday} onClick={() => setDate(addDays(date, 1))}>›</button>
        </div>
        {isToday && <h1>{greeting}{name ? `, ${name}` : ''}.</h1>}
        <p className="hero__date">{prettyDate(date)}</p>
        <div className="hero__stats">
          <div><strong>{streak}</strong><span>day streak 🔥</span></div>
          <div><strong>{doneCount}/{totalCount}</strong><span>done today</span></div>
          <div><strong>{d.water}</strong><span>glasses 💧</span></div>
        </div>
      </header>

      <Card accent>
        <blockquote className="quote">
          “{quote.text}”
          <cite>— {quote.by}</cite>
        </blockquote>
        {state.profile.identity && (
          <p className="identity-reminder"><span>Remember who you are:</span> {state.profile.identity}</p>
        )}
        <p className="prompt">💭 {dailyPrompt(date)}</p>
      </Card>

      {isSunday && isToday && (
        <Card title="It’s Sunday — weekly review" icon="📅" hint="10 minutes to look back, learn, and set next week’s focus.">
          <button className="btn" onClick={onWeekly}>Start weekly review</button>
        </Card>
      )}

      <Card title="Check in" icon="🌅" hint="How are you showing up today?">
        <div className="field">
          <span className="field__label">Mood</span>
          <Scale value={d.mood} onChange={(mood) => set({ mood })} labels={MOODS} />
        </div>
        <div className="field">
          <span className="field__label">Energy</span>
          <Scale value={d.energy} onChange={(energy) => set({ energy })} labels={ENERGY} />
        </div>
        <label className="field">
          <span className="field__label">Hours slept</span>
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

      <Card title="Today’s challenge questions" icon="❓" hint="Answer honestly. Your coach will ask.">
        {questions.map((q) => (
          <label key={q.text} className="field question">
            <span className={`tag tag--${q.kind.toLowerCase()}`}>{q.kind}</span>
            <span className="question__text">{q.text}</span>
            <textarea
              className="input"
              rows={2}
              value={d.answers[q.text] ?? ''}
              placeholder="My honest answer…"
              onChange={(e) => set({ answers: { ...d.answers, [q.text]: e.target.value } })}
            />
          </label>
        ))}
      </Card>

      <Card title="Be the person who inspires you" icon="🪞" hint={state.profile.becoming ? `You are becoming: ${state.profile.becoming}` : 'Act like the person you are becoming.'}>
        <TextField
          multiline
          label="What would that person do today?"
          value={d.futureSelf}
          onChange={(futureSelf) => set({ futureSelf })}
          placeholder="Wake up on the first alarm, train before work, give full attention at dinner."
        />
        <div className="field">
          <span className="field__label">3 actions that prove who I am</span>
          {d.identityActions.map((t, i) => (
            <CheckRow
              key={i}
              done={t.done}
              text={t.text}
              placeholder={['I am disciplined, so I…', 'I am healthy, so I…', 'I am a leader, so I…'][i]}
              onToggle={() => setList('identityActions', i, { done: !t.done })}
              onText={(text) => setList('identityActions', i, { text })}
            />
          ))}
        </div>
      </Card>

      <Card title="Purpose for today" icon="🎯" hint="Why does today matter?">
        <TextField multiline value={d.purpose} onChange={(purpose) => set({ purpose })} placeholder="Today I show up as a leader for my family and my team." />
      </Card>

      <Card title="Top 3 goals for today" icon="🏆" hint="If only these get done, it was a great day.">
        {d.top3.map((t, i) => (
          <CheckRow
            key={i}
            done={t.done}
            text={t.text}
            placeholder={`Goal ${i + 1}`}
            onToggle={() => setList('top3', i, { done: !t.done })}
            onText={(text) => setList('top3', i, { text })}
          />
        ))}
      </Card>

      <Card title="5 things that make me happy" icon="😊" hint="Gratitude rewires your focus.">
        <ol className="numbered">
          {d.happy.map((h, i) => (
            <li key={i}>
              <input
                className="input input--bare"
                value={h}
                placeholder={['My family', 'Morning coffee', 'My health', 'Sunshine', 'Progress'][i]}
                onChange={(e) => set({ happy: d.happy.map((x, j) => (j === i ? e.target.value : x)) })}
              />
            </li>
          ))}
        </ol>
      </Card>

      <Card title="1 discipline challenge" icon="🔥" hint="One thing today that will test your discipline.">
        <CheckRow
          done={d.discipline.done}
          text={d.discipline.text}
          placeholder="e.g. No phone for the first hour"
          onToggle={() => set({ discipline: { ...d.discipline, done: !d.discipline.done } })}
          onText={(text) => set({ discipline: { ...d.discipline, text } })}
        />
        {!d.discipline.text && (
          <div className="chips chips--small">
            {DISCIPLINE_IDEAS.slice(0, 5).map((idea) => (
              <button key={idea} className="chip" onClick={() => set({ discipline: { text: idea, done: false } })}>{idea}</button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Fuel plan" icon="🥗" hint="Decide what you eat before hunger decides for you.">
        {MEAL_LABELS.map(([k, label]) => (
          <TextField key={k} label={label} value={d.meals[k]} onChange={(v) => set({ meals: { ...d.meals, [k]: v } })} placeholder={{ breakfast: 'Eggs, oats, berries', lunch: 'Chicken, rice, greens', dinner: 'Salmon, potatoes, veggies', snacks: 'Greek yogurt, nuts' }[k]} />
        ))}
        <div className="field">
          <span className="field__label">Water (goal 8 glasses)</span>
          <div className="water">
            {Array.from({ length: 8 }, (_, i) => (
              <button key={i} className={`water__glass${i < d.water ? ' is-on' : ''}`} aria-label={`${i + 1} glasses`} onClick={() => set({ water: d.water === i + 1 ? i : i + 1 })}>💧</button>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Training" icon="💪" hint={`Plan for ${prettyDate(date).split(',')[0]}: ${plan.title}`}>
        <p className="muted small">{plan.details}</p>
        <CheckRow
          done={d.training.done}
          text={d.training.text || plan.title}
          onToggle={() => set({ training: { ...d.training, text: d.training.text || plan.title, done: !d.training.done } })}
          onText={(text) => set({ training: { ...d.training, text } })}
        />
        <TextField value={d.training.notes} onChange={(notes) => set({ training: { ...d.training, notes } })} placeholder="Notes: weights, distance, how it felt…" />
      </Card>

      <Card title="Socials" icon="🤝" hint="Real connection in, mindless scrolling out.">
        <div className="field">
          <span className="field__label">Who will I connect with today?</span>
          <CheckRow
            done={d.connect.done}
            text={d.connect.text}
            placeholder="Call mum, coffee with a friend, thank a colleague…"
            onToggle={() => set({ connect: { ...d.connect, done: !d.connect.done } })}
            onText={(text) => set({ connect: { ...d.connect, text } })}
          />
        </div>
        <label className="field">
          <span className="field__label">Social media limit (minutes)</span>
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
          <span className="field__label">My social media rule today</span>
          <TextField value={d.socialIntent} onChange={(socialIntent) => set({ socialIntent })} placeholder="Create & share, don’t scroll" />
          {!d.socialIntent && (
            <div className="chips chips--small">
              {SOCIAL_INTENTS.map((x) => (
                <button key={x} className="chip" onClick={() => set({ socialIntent: x })}>{x}</button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {!d.morningDoneAt ? (
        <button className="btn btn--big" onClick={completeMorning}>Lock in my day ✓</button>
      ) : (
        <p className="done-banner">✓ Day planned{isToday ? ' — now go execute.' : '.'}</p>
      )}

      <Card title="Evening review" icon="🌙" hint="Close the loop. Be honest, not harsh.">
        <TextField multiline label="Wins today" value={d.wins} onChange={(wins) => set({ wins })} placeholder="What went well? What am I proud of?" />
        <TextField multiline label="Lesson learned" value={d.lesson} onChange={(lesson) => set({ lesson })} placeholder="What would I do differently?" />
        <label className="field">
          <span className="field__label">Actual social media time (minutes){d.socialLimit != null ? ` — limit ${d.socialLimit}` : ''}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            value={d.socialActual ?? ''}
            placeholder="Check your screen-time settings"
            onChange={(e) => set({ socialActual: e.target.value === '' ? null : Number(e.target.value) })}
          />
          {d.socialLimit != null && d.socialActual != null && (
            <span className={`small ${d.socialActual <= d.socialLimit ? 'ok-text' : 'danger'}`}>
              {d.socialActual <= d.socialLimit ? '✓ Within your limit' : `${d.socialActual - d.socialLimit} min over — what triggered it?`}
            </span>
          )}
        </label>
        <div className="field">
          <span className="field__label">Rate your day</span>
          <Scale value={d.rating} onChange={(rating) => set({ rating })} max={10} />
        </div>
        {!d.eveningDoneAt ? (
          <button className="btn" disabled={d.rating == null} onClick={() => set({ eveningDoneAt: new Date().toISOString() })}>Complete my day</button>
        ) : (
          <p className="done-banner">🌙 Day closed. Rest well.</p>
        )}
      </Card>

      <button className="btn btn--ghost" onClick={shareToPartner}>
        Send check-in to {state.profile.partnerName || 'my partner'} →
      </button>
    </div>
  );
}
