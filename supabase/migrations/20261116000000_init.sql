-- PS Daily — initial schema
-- Roles: every signed-up user is a 'client'. The coach account gets role = 'coach' (set once, by hand, in the SQL editor).
-- Row level security: clients see only their own rows; the coach sees every client.
-- Plan-gated features (training programs, worksheets, events) are enforced here too, not only in the app.

-- ───────────────────────────── profiles ─────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'coach')),
  name text not null default '',
  identity text not null default '',
  becoming text not null default '',
  purpose text not null default '',
  "values" text[] not null default '{}',
  currency text not null default 'USD' check (currency in ('USD', 'DKK')),
  onboarded boolean not null default false,
  -- billing: written only by the Stripe webhook (service role) or the coach
  plan text not null default 'accountable' check (plan in ('accountable', 'perform', 'elite')),
  plan_status text not null default 'none' check (plan_status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Is the signed-in user the coach? security definer so it can read profiles without recursing into RLS.
create function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;

-- Does the signed-in user's active plan include a feature?
create function public.has_feature(feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'coach'
        or (p.plan_status in ('active', 'trialing') and case feature
              when 'training'   then p.plan in ('perform', 'elite')
              when 'worksheets' then p.plan = 'elite'
              when 'events'     then p.plan = 'elite'
              else true
            end)
      )
  );
$$;

-- Create a profile automatically when someone signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy "read own profile or coach reads all" on public.profiles for select
  using (id = auth.uid() or public.is_coach());
create policy "update own profile or coach updates any" on public.profiles for update
  using (id = auth.uid() or public.is_coach());

-- Clients may only change their own personal fields — never role, plan or billing columns.
revoke update on public.profiles from authenticated;
grant update (name, identity, becoming, purpose, "values", currency, onboarded) on public.profiles to authenticated;
-- The coach changes plans through this function (e.g. to comp a client).
create function public.coach_set_plan(client uuid, new_plan text, new_status text default 'active') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'only the coach can change plans'; end if;
  update public.profiles set plan = new_plan, plan_status = new_status where id = client;
end;
$$;

-- ───────────────────────────── daily check-ins ─────────────────────────────
-- One row per client per day. `data` holds the full day entry (purpose, top 3, happy, discipline, meals, answers, …)
create table public.days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  data jsonb not null default '{}',
  -- copied out of `data` by a trigger so the coach dashboard can query them quickly
  morning_done_at timestamptz,
  evening_done_at timestamptz,
  mood smallint,
  energy smallint,
  rating smallint,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
create function public.days_sync() returns trigger language plpgsql as $$
begin
  new.morning_done_at = nullif(new.data ->> 'morningDoneAt', '')::timestamptz;
  new.evening_done_at = nullif(new.data ->> 'eveningDoneAt', '')::timestamptz;
  new.mood = (new.data ->> 'mood')::smallint;
  new.energy = (new.data ->> 'energy')::smallint;
  new.rating = (new.data ->> 'rating')::smallint;
  new.updated_at = now();
  return new;
end;
$$;
create trigger days_sync before insert or update on public.days for each row execute function public.days_sync();
alter table public.days enable row level security;
create policy "own days" on public.days for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coach reads days" on public.days for select using (public.is_coach());

-- ───────────────────────────── goals & weekly reviews ─────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger goals_touch before update on public.goals for each row execute function public.touch_updated_at();
alter table public.goals enable row level security;
create policy "own goals" on public.goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coach reads goals" on public.goals for select using (public.is_coach());

create table public.weekly_reviews (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
create trigger weekly_touch before update on public.weekly_reviews for each row execute function public.touch_updated_at();
alter table public.weekly_reviews enable row level security;
create policy "own reviews" on public.weekly_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "coach reads reviews" on public.weekly_reviews for select using (public.is_coach());

-- ───────────────────────────── training programs (Perform+) ─────────────────────────────
-- The coach assigns a client's weekly program; the client can read it (and tweak it if their plan allows).
create table public.training_programs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  week jsonb not null default '[]',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
create trigger training_touch before update on public.training_programs for each row execute function public.touch_updated_at();
alter table public.training_programs enable row level security;
create policy "client reads own program" on public.training_programs for select
  using (user_id = auth.uid() and public.has_feature('training'));
create policy "client edits own program" on public.training_programs for all
  using (user_id = auth.uid() and public.has_feature('training'))
  with check (user_id = auth.uid() and public.has_feature('training'));
create policy "coach manages programs" on public.training_programs for all
  using (public.is_coach()) with check (public.is_coach());

-- ───────────────────────────── mental worksheets (Elite) ─────────────────────────────
create table public.worksheets (
  user_id uuid not null references public.profiles (id) on delete cascade,
  worksheet_id text not null,
  data jsonb not null default '{}',
  shared_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, worksheet_id)
);
create trigger worksheets_touch before update on public.worksheets for each row execute function public.touch_updated_at();
alter table public.worksheets enable row level security;
create policy "own worksheets (elite)" on public.worksheets for all
  using (user_id = auth.uid() and public.has_feature('worksheets'))
  with check (user_id = auth.uid() and public.has_feature('worksheets'));
create policy "coach reads shared worksheets" on public.worksheets for select
  using (public.is_coach() and shared_at is not null);

-- ───────────────────────────── coach chat ─────────────────────────────
-- One thread per client (client_id). Either party can post in it.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 8000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread on public.messages (client_id, created_at);
alter table public.messages enable row level security;
create policy "read own thread" on public.messages for select
  using (client_id = auth.uid() or public.is_coach());
create policy "post in own thread" on public.messages for insert
  with check (sender_id = auth.uid() and (client_id = auth.uid() or public.is_coach()));
-- Only the recipient marks a message read.
create policy "mark read" on public.messages for update
  using ((client_id = auth.uid() or public.is_coach()) and sender_id <> auth.uid());
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- ───────────────────────────── events (Elite) ─────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_on date not null,
  start_time text,
  location text not null default '',
  description text not null default '',
  signup_url text,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "elite reads events" on public.events for select using (public.has_feature('events'));
create policy "coach manages events" on public.events for all using (public.is_coach()) with check (public.is_coach());

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_rsvps enable row level security;
create policy "own rsvps" on public.event_rsvps for all
  using (user_id = auth.uid() and public.has_feature('events'))
  with check (user_id = auth.uid() and public.has_feature('events'));
create policy "coach reads rsvps" on public.event_rsvps for select using (public.is_coach());

-- ───────────────────────────── coach dashboard view ─────────────────────────────
-- One row per client: streak inputs, last check-in, 7-day averages, unread messages.
create view public.coach_client_overview with (security_invoker = true) as
select
  p.id, p.name, p.plan, p.plan_status, p.created_at,
  (select max(d.date) from public.days d where d.user_id = p.id and d.morning_done_at is not null) as last_checkin,
  (select count(*) from public.days d where d.user_id = p.id and d.morning_done_at is not null and d.date > current_date - 7) as checkins_7d,
  (select round(avg(d.mood), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as mood_7d,
  (select round(avg(d.energy), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as energy_7d,
  (select round(avg(d.rating), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as rating_7d,
  (select count(*) from public.messages m where m.client_id = p.id and m.sender_id = p.id and m.read_at is null) as unread
from public.profiles p
where p.role = 'client';

-- Live chat updates
alter publication supabase_realtime add table public.messages;
