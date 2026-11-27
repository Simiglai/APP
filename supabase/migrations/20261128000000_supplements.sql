-- "My supplements": the user's daily plan (grouped by time slot) and a log of what was taken each day.
create table public.health_supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot text not null check (slot in ('morning', 'prerun', 'lunch', 'afternoon', 'evening')),
  name text not null check (length(name) between 1 and 100),
  dose text not null default '' check (length(dose) <= 100),
  note text not null default '' check (length(note) <= 500),
  sort smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index health_supplements_user on public.health_supplements (user_id, slot, sort);

create table public.health_supplement_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  supplement_id uuid not null references public.health_supplements (id) on delete cascade,
  taken_at timestamptz not null default now(),
  primary key (user_id, date, supplement_id)
);

alter table public.health_supplements enable row level security;
alter table public.health_supplement_log enable row level security;
create policy "own supplements" on public.health_supplements for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own supplement log" on public.health_supplement_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());
