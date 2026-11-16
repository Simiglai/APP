import { useState } from 'react';
import { useStore } from '../lib/store';
import { hasFeature } from '../lib/plans';
import { WORKSHEETS, type Worksheet } from '../content/worksheets';
import { COACH_NAME } from '../config';
import { Card, Locked, Scale, TextField } from '../ui';

export default function Mind({ onUpgrade }: { onUpgrade: () => void }) {
  const { state, activeTier } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const tier = activeTier;
  const sheet = WORKSHEETS.find((w) => w.id === open);

  if (sheet && hasFeature(tier, 'worksheets')) return <WorksheetView sheet={sheet} onBack={() => setOpen(null)} />;

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Mind</h1>
        <p className="muted">Train the mind like you train the body.</p>
      </header>

      {hasFeature(tier, 'worksheets') ? (
        <Card title="Mental worksheets" hint="Do one per week. Share it with your coach when you’re done.">
          <div className="list">
            {WORKSHEETS.map((w) => {
              const entry = state.worksheets[w.id];
              const filled = entry ? Object.values(entry.values).filter((v) => String(v).trim()).length : 0;
              return (
                <button key={w.id} className="list__item" onClick={() => setOpen(w.id)}>
                  <span>
                    <strong>{w.title}</strong>
                    <small className="muted">
                      {w.minutes} min{entry?.sharedAt ? ' · shared ✓' : filled ? ' · in progress' : ''}
                    </small>
                  </span>
                  <span aria-hidden>›</span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Locked feature="worksheets" title="Mental worksheets" onUpgrade={onUpgrade}>
          <p>Fear setting, breaking limiting beliefs, a letter from your future self, wheel of life, a pressure plan and more.</p>
        </Locked>
      )}

      {hasFeature(tier, 'events') ? <Events /> : (
        <Locked feature="events" title="Events" onUpgrade={onUpgrade}>
          <p>Training camps, workshops and meet-ups with {COACH_NAME} and the community.</p>
        </Locked>
      )}
    </div>
  );
}

function Events() {
  const { state, toggleRsvp } = useStore();
  const upcoming = state.events.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Card title="Events" hint="Train together. Grow together.">
      {upcoming.length === 0 && <p className="empty">No upcoming events yet — new events will appear here.</p>}
      {upcoming.map((e) => {
        const going = state.rsvps.includes(e.id);
        return (
          <div key={e.id} className="event">
            <div className="event__date">
              <strong>{new Date(e.date).getDate()}</strong>
              <small>{new Date(e.date).toLocaleDateString(undefined, { month: 'short' })}</small>
            </div>
            <div className="event__body">
              <strong>{e.title}</strong>
              <small className="muted">{[e.time, e.location].filter(Boolean).join(' · ')}</small>
              <p className="small">{e.description}</p>
              <div className="row">
                <button className={`chip${going ? ' is-on' : ''}`} onClick={() => toggleRsvp(e.id)}>{going ? '✓ I’m going' : 'I’m going'}</button>
                {e.signupUrl && <a className="btn btn--link" href={e.signupUrl} target="_blank" rel="noopener">Details ›</a>}
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function WorksheetView({ sheet, onBack }: { sheet: Worksheet; onBack: () => void }) {
  const { state, saveWorksheet, sendMessage } = useStore();
  const entry = state.worksheets[sheet.id];
  const values = entry?.values ?? {};
  const set = (key: string, v: string | number) => saveWorksheet(sheet.id, { values: { ...values, [key]: v } });

  const share = () => {
    const lines = [`🧠 Worksheet: ${sheet.title}`];
    for (const f of sheet.fields) {
      if (f.type === 'heading') continue;
      const v = values[f.key];
      if (v !== undefined && String(v).trim()) lines.push(`• ${f.label}\n   → ${v}${f.type === 'scale' ? `/${f.max}` : ''}`);
    }
    sendMessage(lines.join('\n'));
    saveWorksheet(sheet.id, { sharedAt: new Date().toISOString() });
  };

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>‹ All worksheets</button>
        <h1>{sheet.title}</h1>
        <p className="muted">{sheet.intro}</p>
      </header>
      <Card>
        {sheet.fields.map((f) =>
          f.type === 'heading' ? (
            <div key={f.key} className="sheet-heading">
              <h2>{f.label}</h2>
              {f.hint && <p className="muted small">{f.hint}</p>}
            </div>
          ) : f.type === 'scale' ? (
            <div key={f.key} className="field">
              <span className="field__label">{f.label}</span>
              <Scale value={typeof values[f.key] === 'number' ? (values[f.key] as number) : null} onChange={(v) => set(f.key, v)} max={f.max} />
            </div>
          ) : (
            <TextField key={f.key} multiline={f.type === 'long'} label={f.label} value={String(values[f.key] ?? '')} onChange={(v) => set(f.key, v)} placeholder={f.placeholder} />
          ),
        )}
      </Card>
      {entry?.sharedAt ? (
        <p className="done-banner">✓ Shared with your coach. You can keep editing and share again.</p>
      ) : null}
      <button className="btn btn--big" onClick={share}>Share with my coach</button>
    </div>
  );
}
