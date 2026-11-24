import { locale, t } from '../i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { daySummary, emptyDay, useStore } from '../lib/store';
import { addDays, prettyDate, todayKey } from '../lib/dates';
import { PLANS, planById, type Tier } from '../lib/plans';
import { getWorksheets } from '../content/worksheets';
import type { DayEntry, WeekReview } from '../lib/types';
import { BrandLogo, Card, TextField } from '../ui';
import CoachWorkouts from './CoachWorkouts';
import CoachWaitlist from './CoachWaitlist';
import Health from './Health';

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
  requested_tier: Tier | null;
  requested_at: string | null;
  approved_tiers: Tier[];
};

/** Asked for a call about Perform/Elite and not approved for it yet. */
const pendingRequest = (c: ClientRow) => (c.requested_tier && !c.approved_tiers.includes(c.requested_tier) ? c.requested_tier : null);

const daysSince = (date: string | null) => (date ? Math.round((Date.parse(todayKey()) - Date.parse(date)) / 86_400_000) : null);

/** Why a client needs attention right now (empty = all good). */
const flags = (c: ClientRow) => {
  const f: string[] = [];
  const since = daysSince(c.last_checkin);
  if (since === null) f.push(t('Never checked in'));
  else if (since >= 2) f.push(t('No check-in for {n} days', { n: since }));
  if (c.mood_7d !== null && c.mood_7d <= 2.5) f.push(t('Low mood'));
  if (c.energy_7d !== null && c.energy_7d <= 2.5) f.push(t('Low energy'));
  if (c.plan_status === 'past_due') f.push(t('Payment failed'));
  return f;
};

export default function Coach() {
  const [clients, setClients] = useState<ClientRow[] | null>(null);
  const [open, setOpen] = useState<ClientRow | null>(null);
  const [tab, setTab] = useState<'clients' | 'workouts' | 'events' | 'waitlist' | 'health'>('clients');
  const { userId } = useStore();

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

  const sorted = [...(clients ?? [])].sort((a, b) => Number(!!pendingRequest(b)) - Number(!!pendingRequest(a)) || b.unread - a.unread || flags(b).length - flags(a).length || a.name.localeCompare(b.name));
  const active = sorted.filter((c) => c.plan_status === 'active' || c.plan_status === 'trialing');
  const needAttention = sorted.filter((c) => flags(c).length || c.unread || pendingRequest(c));

  return (
    <main className="app">
      <div className="stack">
        <header className="hero">
          <div className="brandbar">
            <BrandLogo />
            <button className="btn btn--link" onClick={() => supabase.auth.signOut()}>{t("Log out")}</button>
          </div>
          <h1>{t("Coach dashboard")}</h1>
          <div className="hero__stats">
            <div><strong>{active.length}</strong><span>{t("active clients")}</span></div>
            <div><strong>{needAttention.length}</strong><span>{t("need attention")}</span></div>
            <div><strong>{sorted.reduce((n, c) => n + c.unread, 0)}</strong><span>{t("unread")}</span></div>
          </div>
          <div className="segmented">
            <button className={tab === 'clients' ? 'is-on' : ''} onClick={() => setTab('clients')}>{t('Clients')}</button>
            <button className={tab === 'workouts' ? 'is-on' : ''} onClick={() => setTab('workouts')}>{t('Workouts')}</button>
            <button className={tab === 'events' ? 'is-on' : ''} onClick={() => setTab('events')}>{t('Events')}</button>
            <button className={tab === 'waitlist' ? 'is-on' : ''} onClick={() => setTab('waitlist')}>{t('Waitlist')}</button>
            <button className={tab === 'health' ? 'is-on' : ''} onClick={() => setTab('health')}>{t('My health')}</button>
          </div>
        </header>

        {tab === 'health' ? (
          <Health userId={userId} />
        ) : tab === 'waitlist' ? (
          <CoachWaitlist />
        ) : tab === 'workouts' ? (
          <CoachWorkouts />
        ) : tab === 'events' ? (
          <EventsManager />
        ) : clients === null ? (
          <div className="spinner" />
        ) : sorted.length === 0 ? (
          <p className="empty">{t("No clients yet. When clients sign up in the app they appear here.")}</p>
        ) : (
          <Card>
            <div className="list">
              {sorted.map((c) => {
                const f = flags(c);
                return (
                  <button key={c.id} className="list__item client-row" onClick={() => setOpen(c)}>
                    <span>
                      <strong>
                        {c.name || t('Unnamed')} {c.unread > 0 && <span className="badge">{c.unread}</span>}
                      </strong>
                      <small className="muted">
                        {planById(c.plan).name} · {c.plan_status === 'active' || c.plan_status === 'trialing' ? t('{n}/7 check-ins', { n: c.checkins_7d }) : t('not subscribed')}
                        {c.mood_7d !== null && ` · ${t('mood')} ${c.mood_7d}`}
                        {c.rating_7d !== null && ` · ${t('day')} ${c.rating_7d}/10`}
                      </small>
                      {pendingRequest(c) && <small className="request">{t('📞 Call requested for {plan} — approve after the call', { plan: planById(pendingRequest(c)!).name })}</small>}
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
  const [profile, setProfile] = useState<{ identity: string; becoming: string; purpose: string; values: string[]; plan: Tier; plan_status: string; approved_tiers: Tier[]; requested_tier: Tier | null } | null>(null);
  const [days, setDays] = useState<DayEntry[]>([]);
  const [weeks, setWeeks] = useState<WeekReview[]>([]);
  const [sheets, setSheets] = useState<{ worksheet_id: string; data: Record<string, string | number>; shared_at: string }[]>([]);
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => {
    const since = addDays(todayKey(), -27);
    Promise.all([
      supabase.from('profiles').select('identity, becoming, purpose, values, plan, plan_status, approved_tiers, requested_tier').eq('id', client.id).single(),
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

  const toggleApproval = async (tier: Tier) => {
    if (!profile) return;
    const approved = profile.approved_tiers.includes(tier);
    const next = approved ? profile.approved_tiers.filter((t) => t !== tier) : [...profile.approved_tiers, tier];
    const { error } = await supabase.rpc('coach_set_approval', { client: client.id, tiers: next });
    if (error) return alert(error.message);
    setProfile({ ...profile, approved_tiers: next });
    if (!approved) {
      await supabase.from('messages').insert({
        client_id: client.id,
        sender_id: userId,
        body: t('✅ Great talking to you! You’re approved for {plan}. Open Me → Membership in the app to get started.', { plan: planById(tier).name }),
      });
    }
  };

  const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayKey(), -i));
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));

  return (
    <div className="stack">
      <header className="page-head">
        <button className="btn btn--link" style={{ alignSelf: 'flex-start' }} onClick={onBack}>{t("‹ All clients")}</button>
        <h1>{client.name || t('Unnamed client')}</h1>
        <p className="muted">
          {planById(profile?.plan ?? client.plan).name} · {t(profile?.plan_status ?? client.plan_status)} · {t('client since')} {client.created_at.slice(0, 10)}
        </p>
      </header>

      <Card title={t("Identity")}>
        {profile ? (
          <>
            <p><strong>{t('I am:')}</strong> {profile.identity || '—'}</p>
            <p><strong>{t('Becoming:')}</strong> {profile.becoming || '—'}</p>
            <p><strong>{t('Purpose:')}</strong> {profile.purpose || '—'}</p>
            <div className="chips">{profile.values.map((v) => <span key={v} className="chip is-on">{t(v)}</span>)}</div>
          </>
        ) : (
          <div className="spinner" />
        )}
      </Card>

      <Card title={t("Last 14 days")} hint={t("Tap a day to see the full check-in.")}>
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
        <p className="muted small">{t("● planned + reviewed · ◐ planned only · ○ nothing")}</p>
        {openDay && (
          <div className="day-detail">
            <h2>{prettyDate(openDay)}</h2>
            {byDate[openDay] ? <pre>{daySummary(client.name, byDate[openDay])}</pre> : <p className="muted">{t("No check-in this day.")}</p>}
            {byDate[openDay]?.wins && <p><strong>{t('Wins:')}</strong> {byDate[openDay].wins}</p>}
            {byDate[openDay]?.lesson && <p><strong>{t('Lesson:')}</strong> {byDate[openDay].lesson}</p>}
          </div>
        )}
      </Card>

      {weeks.length > 0 && (
        <Card title={t("Weekly reviews")}>
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
        <Card title={t("Shared worksheets")}>
          {sheets.map((s) => {
            const def = getWorksheets().find((w) => w.id === s.worksheet_id);
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

      <Card title={t("Approve Perform / Elite / Private")} hint={t("After the call, approve the plan(s) this client may join. They get a message and can then pay in the app.")}>
        {profile?.requested_tier && !profile.approved_tiers.includes(profile.requested_tier) && (
          <p className="call-note">{t('📞 Requested a call for {plan}.', { plan: planById(profile.requested_tier).name })}</p>
        )}
        <div className="chips">
          {(['perform', 'elite', 'private'] as Tier[]).map((tier) => (
            <button key={tier} className={`chip${profile?.approved_tiers.includes(tier) ? ' is-on' : ''}`} onClick={() => toggleApproval(tier)}>
              {profile?.approved_tiers.includes(tier) ? '✓ ' : ''}{planById(tier).name}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t("Plan")} hint={t("Changed automatically by Stripe payments. Use this to give a plan for free (e.g. Private Advisory clients).")}>
        <div className="chips">
          {PLANS.map((p) => (
            <button key={p.id} className={`chip${profile?.plan === p.id && profile.plan_status === 'active' ? ' is-on' : ''}`} onClick={() => setPlan(p.id, 'active')}>
              {p.name}
            </button>
          ))}
          <button className="chip" onClick={() => confirm(t('Remove access?')) && setPlan(profile?.plan ?? 'accountable', 'canceled')}>{t("No access")}</button>
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

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    const { data, error } = await supabase.from('messages').insert({ client_id: clientId, sender_id: coachId, body }).select('id, sender_id, body, created_at, read_at').single();
    if (error) {
      setText(body);
      return alert(t('Not sent:') + ' ' + error.message);
    }
    setMsgs((list) => (list.some((x) => x.id === data.id) ? list : [...list, data]));
  };

  return (
    <Card title={t('Chat with {name}', { name: name || t('client') })}>
      {msgs.length === 0 && <p className="empty">{t("No messages yet.")}</p>}
      <div className="thread">
        {msgs.map((m) => (
          <div key={m.id} className={`bubble bubble--${m.sender_id === coachId ? 'me' : 'partner'}`}>
            <pre>{m.body}</pre>
            <time>
              {new Date(m.created_at).toLocaleString(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              {m.sender_id === coachId && m.read_at ? ` · ${t('seen')}` : ''}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="chips chips--small">
        {['Proud of you 💪', 'Where is today’s check-in?', 'What got in the way?', 'Let’s talk — book a call'].map((q) => t(q)).map((n) => (
          <button key={n} className="chip" onClick={() => setText(n)}>{n}</button>
        ))}
      </div>
      <div className="composer">
        <TextField value={text} onChange={setText} placeholder={t("Reply…")} />
        <button className="btn" disabled={!text.trim()} onClick={send}>{t("Send")}</button>
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
      <Card title={t("New event")} hint={t("Visible to Elite and Private members in their Mind tab.")}>
        <TextField label={t("Title")} value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder={t("Training camp")} />
        <div className="row">
          <label className="field" style={{ flex: 1 }}>
            <span className="field__label">{t("Date")}</span>
            <input className="input" type="date" value={draft.starts_on} onChange={(e) => setDraft({ ...draft, starts_on: e.target.value })} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="field__label">{t("Time")}</span>
            <input className="input" type="time" value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
          </label>
        </div>
        <TextField label={t("Location")} value={draft.location} onChange={(location) => setDraft({ ...draft, location })} placeholder={t("Copenhagen")} />
        <TextField multiline label={t("Description")} value={draft.description} onChange={(description) => setDraft({ ...draft, description })} />
        <TextField label={t("Sign-up / info link (optional)")} value={draft.signup_url} onChange={(signup_url) => setDraft({ ...draft, signup_url })} placeholder="https://…" />
        <button className="btn" disabled={!draft.title || !draft.starts_on} onClick={save}>{t("Publish event")}</button>
      </Card>
      <Card title={t("Events")}>
        {events.length === 0 && <p className="empty">{t("No events yet.")}</p>}
        {events.map((e) => (
          <div key={e.id} className="event">
            <div className="event__date">
              <strong>{Number(e.starts_on.slice(-2))}</strong>
              <small>{new Date(e.starts_on).toLocaleDateString(locale(), { month: 'short' })}</small>
            </div>
            <div className="event__body">
              <strong>{e.title}</strong>
              <small className="muted">{[e.start_time, e.location].filter(Boolean).join(' · ')} · {t('{n} going', { n: rsvps[e.id] ?? 0 })}</small>
              <button className="btn btn--link danger" style={{ alignSelf: 'flex-start' }} onClick={async () => { if (confirm(t('Delete “{title}”?', { title: e.title }))) { await supabase.from('events').delete().eq('id', e.id); load(); } }}>
                {t("Delete")}
              </button>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
