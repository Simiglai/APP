import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { daySummary, emptyDay, useStore } from '../lib/store';
import { addDays, prettyDate, todayKey } from '../lib/dates';
import { PLANS, planById, type Tier } from '../lib/plans';
import { WORKSHEETS } from '../content/worksheets';
import type { DayEntry, WeekReview } from '../lib/types';
import { BrandLogo, Card, TextField } from '../ui';

type ClientRow = {
  id: string;
  name: string;
  plan: Tier;
  plan_status: string;
  created_at: string;
  last_checkin: string | null;
  checkins_7d: number;
  mood_7d: number | null;
  energy_7d: number | null;
  rating_7d: number | null;
  unread: number;
};

const daysSince = (date: string | null) => (date ? Math.round((Date.parse(todayKey()) - Date.parse(date)) / 86_400_000) : null);

/** Why a client needs attention right now (empty = all good). */
const flags = (c: ClientRow) => {
  const f: string[] = [];
  const since = daysSince(c.last_checkin);
  if (since === null) f.push('Never checked in');
  else if (since >= 2) f.push(`No check-in for ${since} days`);
  if (c.mood_7d !== null && c.mood_7d <= 2.5) f.push('Low mood');
  if (c.energy_7d !== null && c.energy_7d <= 2.5) f.push('Low energy');
  if (c.plan_status === 'past_due') f.push('Payment failed');
  return f;
};

export default function Coach() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [open, setOpen] = useState<ClientRow | null>(null);
  const [tab, setTab] = useState<'clients' | 'events'>('clients');

  const load = useCallback(async () => {
    const { data } = await supabase.from('coach_client_overview').select('*');
    setClients((data as ClientRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    // refresh the list when any client writes a message or checks in
    const ch = supabase
      .channel('coach-overview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  if (open) return <main className="app"><ClientDetail client={open} onBack={() => { setOpen(null); load(); }} /></main>;

  const sorted = [...(clients ?? [])].sort((a, b) => b.unread - a.unread || flags(b).length - flags(a).length || a.name.localeCompare(b.name));
  const active = sorted.filter((c) => c.plan_status === 'active' || c.plan_status === 'trialing');
  const needAttention = sorted.filter((c) => flags(c).length || c.unread);

  return (
    <main className="app">
      <div className="stack">
        <header className="hero">
          <div className="brandbar">
            <BrandLogo />
            <button className="btn btn--link" onClick={() => supabase.auth.signOut()}>Log out</button>
          </div>
          <h1>Coach dashboard</h1>
          <div className="hero__stats">
            <div><strong>{active.length}</strong><span>active clients</span></div>
            <div><strong>{needAttention.length}</strong><span>need attention</span></div>
            <div><strong>{sorted.reduce((n, c) => n + c.unread, 0)}</strong><span>unread</span></div>
          </div>
          <div className="segmented">
            <button className={tab === 'clients' ? 'is-on' : ''} onClick={() => setTab('clients')}>Clients</button>
            <button className={tab === 'events' ? 'is-on' : ''} onClick={() => setTab('events')}>Events</button>
          </div>
        </header>

        {tab === 'events' ? (
          <EventsManager />
        ) : clients === null ? (
          <div className="spinner" />
        ) : sorted.length === 0 ? (
          <p className="empty">No clients yet. When clients sign up in the app they appear here.</p>
        ) : (
          <Card>
            <div className="list">
              {sorted.map((c) => {
                const f = flags(c);
                return (
                  <button key={c.id} className="list__item client-row" onClick={() => setOpen(c)}>
                    <span>
                      <strong>
                        {c.name || 'Unnamed'} {c.unread > 0 && <span className="badge">{c.unread}</span>}
                      </strong>
                      <small className="muted">
                        {planById(c.plan).name} · {c.plan_status === 'active' || c.plan_status === 'trialing' ? `${c.checkins_7d}/7 check-ins` : 'not subscribed'}
                        {c.mood_7d !== null && ` · mood ${c.mood_7d}`}
                        {c.rating_7d !== null && ` · day ${c.rating_7d}/10`}
                      </small>
                      {f.length > 0 && <small className="flag">⚠ {f.join(' · ')}</small>}
                    </span>
                    <span aria-hidden>›</span>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function ClientDetail({ client, onBack }: { client: ClientRow; onBack: () => void }) {
  const { userId } = useStore();
  const [profile, setProfile] = useState<{ identity: string; becoming: string; purpose: string; values: string[]; plan: Tier; plan_status: string } | null>(null);
  const [days, setDays] = useState<DayEntry[]>([]);
  const [weeks, setWeeks] = useState<WeekReview[]>([]);
  const [sheets, setSheets] = useState<{ worksheet_id: string; data: Record<string, string | number>; shared_at: string }[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => {
    const since = addDays(todayKey(), -27);
    Promise.all([
      supabase.from('profiles').select('identity, becoming, purpose, values, plan, plan_status').eq('id', client.id).single(),
      supabase.from('days').select('date, data').eq('user_id', client.id).gte('date', since).order('date', { ascending: false }),
      supabase.from('weekly_reviews').select('week_start, data').eq('user_id', client.id).order('week_start', { ascending: false }).limit(6),
      supabase.from('worksheets').select('worksheet_id, data, shared_at').eq('user_id', client.id).not('shared_at', 'is', null),
    ]).then(([p, d, w, s]) => {
      setProfile(p.data);
      setDays((d.data ?? []).map((r) => ({ ...emptyDay(r.date), ...(r.data as DayEntry), date: r.date })));
      setWeeks((w.data ?? []).map((r) => ({ ...(r.data as WeekReview), weekStart: r.week_start })));
      setSheets(s.data ?? []);
    });
  }, [client.id]);

  const setPlan = async (plan: Tier, status: string) => {
    const { error } = await supabase.rpc('coach_set_plan', { client: client.id, new_plan: plan, new_status: status });
    if (error) return alert(error.message);
    setProfile((p) => (p ? { ...p, plan, plan_status: status } : p));
  };

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayKey(), -i));
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>‹ All clients</button>
        <h1>{client.name || 'Unnamed client'}</h1>
        <p className="muted">
          {planById(profile?.plan ?? client.plan).name} · {profile?.plan_status ?? client.plan_status} · client since {client.created_at.slice(0, 10)}
        </p>
      </header>

      <Card title="Identity">
        {profile ? (
          <>
            <p><strong>I am:</strong> {profile.identity || '—'}</p>
            <p><strong>Becoming:</strong> {profile.becoming || '—'}</p>
            <p><strong>Purpose:</strong> {profile.purpose || '—'}</p>
            <div className="chips">{profile.values.map((v) => <span key={v} className="chip is-on">{v}</span>)}</div>
          </>
        ) : (
          <div className="spinner" />
        )}
      </Card>

      <Card title="Last 14 days" hint="Tap a day to see the full check-in.">
        <div className="daygrid">
          {last14.map((date) => {
            const d = byDate[date];
            const cls = d?.morningDoneAt ? (d.eveningDoneAt ? 'full' : 'half') : 'none';
            return (
              <button key={date} className={`daygrid__cell is-${cls}${openDay === date ? ' is-open' : ''}`} onClick={() => setOpenDay(openDay === date ? null : date)} title={date}>
                <small>{Number(date.slice(-2))}</small>
                <span>{d?.mood ? ['😞', '😕', '😐', '🙂', '😄'][d.mood - 1] : '·'}</span>
              </button>
            );
          })}
        </div>
        <p className="muted small">● planned + reviewed · ◐ planned only · ○ nothing</p>
        {openDay && (
          <div className="day-detail">
            <h2>{prettyDate(openDay)}</h2>
            {byDate[openDay] ? <pre>{daySummary(client.name, byDate[openDay])}</pre> : <p className="muted">No check-in this day.</p>}
            {byDate[openDay]?.wins && <p><strong>Wins:</strong> {byDate[openDay].wins}</p>}
            {byDate[openDay]?.lesson && <p><strong>Lesson:</strong> {byDate[openDay].lesson}</p>}
          </div>
        )}
      </Card>

      {weeks.length > 0 && (
        <Card title="Weekly reviews">
          {weeks.map((w) => (
            <div key={w.weekStart} className="review">
              <strong>Week of {w.weekStart} · {w.score ?? '–'}/10</strong>
              {w.biggestWin && <p>🏆 {w.biggestWin}</p>}
              {w.fellShort && <p>⚠️ {w.fellShort}</p>}
              {w.nextFocus && <p>🎯 {w.nextFocus}</p>}
            </div>
          ))}
        </Card>
      )}

      {sheets.length > 0 && (
        <Card title="Shared worksheets">
          {sheets.map((s) => {
            const def = WORKSHEETS.find((w) => w.id === s.worksheet_id);
            return (
              <details key={s.worksheet_id} className="review">
                <summary><strong>{def?.title ?? s.worksheet_id}</strong> <small className="muted">· {s.shared_at.slice(0, 10)}</small></summary>
                {def?.fields
                  .filter((f) => f.type !== 'heading' && s.data[f.key] !== undefined && String(s.data[f.key]).trim())
                  .map((f) => (
                    <p key={f.key}><strong>{f.label}</strong><br />{String(s.data[f.key])}</p>
                  ))}
              </details>
            );
          })}
        </Card>
      )}

      <Thread clientId={client.id} coachId={userId} name={client.name} />

      <Card title="Plan" hint="Changed automatically by Stripe payments. Use this to give a plan for free (e.g. Private Advisory clients).">
        <div className="chips">
          {PLANS.map((p) => (
            <button key={p.id} className={`chip${profile?.plan === p.id && profile.plan_status === 'active' ? ' is-on' : ''}`} onClick={() => setPlan(p.id, 'active')}>
              {p.name}
            </button>
          ))}
          <button className="chip" onClick={() => confirm('Remove access?') && setPlan(profile?.plan ?? 'accountable', 'canceled')}>No access</button>
        </div>
      </Card>
    </div>
  );
}

type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

function Thread({ clientId, coachId, name }: { clientId: string; coachId: string; name: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('messages')
      .select('id, sender_id, body, created_at, read_at')
      .eq('client_id', clientId)
      .order('created_at')
      .limit(300)
      .then(({ data }) => setMsgs(data ?? []));
    // mark the client's messages as read
    supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('client_id', clientId).eq('sender_id', clientId).is('read_at', null).then(() => {});
    const ch = supabase
      .channel(`coach-thread-${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${clientId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
        if (m.sender_id === clientId) supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId]);

  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { data, error } = await supabase.from('messages').insert({ client_id: clientId, sender_id: coachId, body }).select('id, sender_id, body, created_at, read_at').single();
    if (error) {
      setText(body);
      return alert('Not sent: ' + error.message);
    }
    setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
  };

  return (
    <Card title={`Chat with ${name || 'client'}`}>
      {msgs.length === 0 && <p className="empty">No messages yet.</p>}
      <div className="thread">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble bubble--${m.sender_id === coachId ? 'me' : 'partner'}`}>
            <pre>{m.body}</pre>
            <time>
              {new Date(m.created_at).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              {m.sender_id === coachId && m.read_at ? ' · seen' : ''}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="chips chips--small">
        {['Proud of you 💪', 'Where is today’s check-in?', 'What got in the way?', 'Let’s talk — book a call'].map((n) => (
          <button key={n} className="chip" onClick={() => setText(n)}>{n}</button>
        ))}
      </div>
      <div className="composer">
        <TextField value={text} onChange={setText} placeholder="Reply…" />
        <button className="btn" disabled={!text.trim()} onClick={send}>Send</button>
      </div>
    </Card>
  );
}

type EventRow = { id: string; title: string; starts_on: string; start_time: string | null; location: string; description: string; signup_url: string | null };

function EventsManager() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, number>>({});
  const blank = { title: '', starts_on: '', start_time: '', location: '', description: '', signup_url: '' };
  const [draft, setDraft] = useState(blank);

  const load = useCallback(async () => {
    const [e, r] = await Promise.all([supabase.from('events').select('*').order('starts_on'), supabase.from('event_rsvps').select('event_id')]);
    setEvents(e.data ?? []);
    const counts: Record<string, number> = {};
    for (const x of r.data ?? []) counts[x.event_id] = (counts[x.event_id] ?? 0) + 1;
    setRsvps(counts);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    const { error } = await supabase.from('events').insert({ ...draft, start_time: draft.start_time || null, signup_url: draft.signup_url || null });
    if (error) return alert(error.message);
    setDraft(blank);
    load();
  };

  return (
    <>
      <Card title="New event" hint="Visible to Elite members in their Mind tab.">
        <TextField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Training camp" />
        <div className="row">
          <label className="field" style={{ flex: 1 }}>
            <span className="field__label">Date</span>
            <input className="input" type="date" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="field__label">Time</span>
            <input className="input" type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
          </label>
        </div>
        <TextField label="Location" value={draft.location} onChange={(location) => setDraft({ ...draft, location })} placeholder="Copenhagen" />
        <TextField multiline label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <TextField label="Sign-up / info link (optional)" value={draft.signup_url} onChange={(signup_url) => setDraft({ ...draft, signup_url })} placeholder="https://…" />
        <button className="btn" disabled={!draft.title || !draft.starts_on} onClick={save}>Publish event</button>
      </Card>
      <Card title="Events">
        {events.length === 0 && <p className="empty">No events yet.</p>}
        {events.map((e) => (
          <div key={e.id} className="event">
            <div className="event__date">
              <strong>{Number(e.starts_on.slice(-2))}</strong>
              <small>{new Date(e.starts_on).toLocaleDateString(undefined, { month: 'short' })}</small>
            </div>
            <div className="event__body">
              <strong>{e.title}</strong>
              <small className="muted">{[e.start_time, e.location].filter(Boolean).join(' · ')} · {rsvps[e.id] ?? 0} going</small>
              <button className="btn btn--link danger" style={{ alignSelf: 'flex-start' }} onClick={async () => { if (confirm(`Delete “${e.title}”?`)) { await supabase.from('events').delete().eq('id', e.id); load(); } }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
