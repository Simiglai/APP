import { locale, t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { daySummary, useStore } from '../lib/store';
import { todayKey } from '../lib/dates';
import { Card, TextField } from '../ui';

const QUICK = () => ['Check-in done ✅', 'Training done 💪', 'Struggling today — need a push', 'Question for you:'].map((q) => t(q));

/** The client's view of the coach: today's status + live chat. */
export default function Partner() {
  const { state, sendMessage, getDay } = useStore();
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const coach = state.profile.partnerName;
  const today = getDay(todayKey());
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [state.messages.length]);

  const send = (msg: string) => {
    if (!msg.trim()) return;
    sendMessage(msg.trim());
    setText('');
  };

  const shareOut = async (msg: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: msg });
        setStatus(t("Shared ✓"));
      } else {
        await navigator.clipboard.writeText(msg);
        setStatus(t("Copied ✓"));
      }
    } catch {
      setStatus('');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="stack">
      <header className="page-head">
        <h1>{coach}</h1>
        <p className="muted">{t("Your coach. Check in every day — I’m watching your progress.")}</p>
      </header>

      <Card title={t("Today’s status")}>
        <ul className="status-list">
          <li className={today.morningDoneAt ? 'ok' : ''}>{today.morningDoneAt ? '✓' : '○'} {t('Morning check-in')}</li>
          <li className={today.discipline.done ? 'ok' : ''}>{today.discipline.done ? '✓' : '○'} {t('Discipline challenge')}{today.discipline.text ? `: ${today.discipline.text}` : ''}</li>
          <li className={today.training.done ? 'ok' : ''}>{today.training.done ? '✓' : '○'} {t('Training')}</li>
          <li className={today.eveningDoneAt ? 'ok' : ''}>{today.eveningDoneAt ? '✓' : '○'} {t('Evening review')}</li>
        </ul>
        <div className="row">
          <button className="btn" onClick={() => send(daySummary(state.profile.name, today))}>{t("Send today’s check-in")}</button>
          <button className="btn btn--ghost" onClick={() => shareOut(daySummary(state.profile.name, today))}>{t("Share outside app")}</button>
        </div>
        {status && <p className="muted small">{status}</p>}
      </Card>

      <Card title={t("Messages")}>
        {state.messages.length === 0 && <p className="empty">{t("No messages yet. Send your first check-in.")}</p>}
        <div className="thread">
          {state.messages.slice(-100).map((m) => (
            <div key={m.id} className={`bubble bubble--${m.from}${m.pending ? ' is-pending' : ''}`}>
              <pre>{m.text}</pre>
              <time>
                {new Date(m.at).toLocaleString(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                {m.from === 'me' && (m.pending ? ` · ${t('sending…')}` : m.readAt ? ` · ${t('seen')}` : '')}
              </time>
            </div>
          ))}
          <div ref={end} />
        </div>
        <div className="chips chips--small">
          {QUICK().map((n) => (
            <button key={n} className="chip" onClick={() => setText(n)}>{n}</button>
          ))}
        </div>
        <div className="composer">
          <TextField value={text} onChange={setText} placeholder={t('Message {coach}…', { coach })} />
          <button className="btn" disabled={!text.trim()} onClick={() => send(text)}>{t("Send")}</button>
        </div>
      </Card>
    </div>
  );
}
