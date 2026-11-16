import { useState } from 'react';
import { daySummary, useStore } from '../lib/store';
import { todayKey } from '../lib/dates';
import { Card, TextField } from '../ui';

const NUDGES = ['Did you hit your discipline challenge today? 🔥', 'Proud of you. Keep going 💪', 'What’s your #1 goal today?', 'Training done? Send proof 📸', 'Tough day? Talk to me.'];

export default function Partner() {
  const { state, sendMessage, updateProfile, getDay } = useStore();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const partner = state.profile.partnerName;
  const today = getDay(todayKey());

  const send = (msg: string) => {
    if (!msg.trim()) return;
    sendMessage(msg.trim());
    setText('');
  };

  const shareOut = async (msg: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: msg });
        setStatus('Shared ✓');
      } else {
        await navigator.clipboard.writeText(msg);
        setStatus('Copied — paste it into WhatsApp/iMessage ✓');
      }
    } catch {
      setStatus('');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  if (!partner) {
    return (
      <div className="stack">
        <header className="page-head">
          <h1>Accountability</h1>
          <p className="muted">People who share their goals with an accountability partner are far more likely to follow through.</p>
        </header>
        <Card title="Add your partner" icon="🤝">
          <PartnerForm onSave={(partnerName) => updateProfile({ partnerName })} />
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{partner}</h1>
        <p className="muted">Your daily accountability partner.</p>
      </header>

      <Card title="Today’s status" icon="📍">
        <ul className="status-list">
          <li className={today.morningDoneAt ? 'ok' : ''}>{today.morningDoneAt ? '✓' : '○'} Morning check-in</li>
          <li className={today.discipline.done ? 'ok' : ''}>{today.discipline.done ? '✓' : '○'} Discipline challenge{today.discipline.text ? `: ${today.discipline.text}` : ''}</li>
          <li className={today.training.done ? 'ok' : ''}>{today.training.done ? '✓' : '○'} Training</li>
          <li className={today.eveningDoneAt ? 'ok' : ''}>{today.eveningDoneAt ? '✓' : '○'} Evening review</li>
        </ul>
        <div className="row">
          <button className="btn" onClick={() => send(daySummary(state.profile.name, today))}>Post today’s check-in</button>
          <button className="btn btn--ghost" onClick={() => shareOut(daySummary(state.profile.name, today))}>Share outside app</button>
        </div>
        {status && <p className="muted small">{status}</p>}
      </Card>

      <Card title="Messages" icon="💬">
        {state.messages.length === 0 && <p className="empty">No messages yet. Send your first check-in.</p>}
        <div className="thread">
          {state.messages.slice(-30).map((m) => (
            <div key={m.id} className={`bubble bubble--${m.from}`}>
              <pre>{m.text}</pre>
              <time>{new Date(m.at).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
        </div>
        <div className="chips chips--small">
          {NUDGES.map((n) => (
            <button key={n} className="chip" onClick={() => setText(n)}>{n}</button>
          ))}
        </div>
        <div className="composer">
          <TextField value={text} onChange={setText} placeholder={`Message ${partner}…`} />
          <button className="btn" disabled={!text.trim()} onClick={() => send(text)}>Send</button>
        </div>
        <p className="muted small">Messages are saved on this device for now. Live two-way chat with your partner arrives with accounts &amp; sync.</p>
      </Card>

      <button className="btn btn--link" onClick={() => updateProfile({ partnerName: '' })}>Change partner</button>
    </div>
  );
}

function PartnerForm({ onSave }: { onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <>
      <TextField label="Partner’s name" value={name} onChange={setName} placeholder="e.g. Coach Alex" />
      <button className="btn" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save partner</button>
    </>
  );
}
