-- Health & nutrition agent (personal: the coach's own account; can later be opened to Perform/Elite).
-- All health rows are private to their owner — the coach does NOT read clients' health data here.

-- ───────────────────────────── daily body metrics ─────────────────────────────
-- One row per user per day. Filled by hand in the app or by an Apple Health import (merged, never wiped).
create table public.health_metrics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 1) check (weight_kg between 20 and 400),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  waist_cm numeric(5, 1) check (waist_cm between 30 and 250),
  resting_hr smallint check (resting_hr between 25 and 200),
  hrv_ms numeric(5, 1) check (hrv_ms between 1 and 400),
  steps integer check (steps between 0 and 200000),
  active_kcal integer check (active_kcal between 0 and 20000),
  sleep_hours numeric(4, 2) check (sleep_hours between 0 and 24),
  energy smallint check (energy between 1 and 5),
  notes text not null default '',
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
create trigger health_metrics_touch before update on public.health_metrics for each row execute function public.touch_updated_at();

-- ───────────────────────────── meals ─────────────────────────────
create table public.health_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  eaten_at timestamptz not null default now(),
  meal text not null default 'snack' check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null default '' check (length(description) <= 2000),
  photo_path text,
  kcal integer check (kcal between 0 and 10000),
  protein_g numeric(5, 1) check (protein_g between 0 and 1000),
  carbs_g numeric(5, 1) check (carbs_g between 0 and 1000),
  fat_g numeric(5, 1) check (fat_g between 0 and 1000),
  fiber_g numeric(5, 1) check (fiber_g between 0 and 500),
  ai jsonb, -- the agent's estimate (items, confidence, notes) when the macros came from a photo/description
  created_at timestamptz not null default now()
);
create index health_meals_user_time on public.health_meals (user_id, eaten_at desc);

-- ───────────────────────────── targets & context ─────────────────────────────
create table public.health_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  kcal_target integer check (kcal_target between 800 and 10000),
  protein_target_g integer check (protein_target_g between 0 and 600),
  carbs_target_g integer check (carbs_target_g between 0 and 1500),
  fat_target_g integer check (fat_target_g between 0 and 600),
  goal_weight_kg numeric(5, 1) check (goal_weight_kg between 20 and 400),
  context text not null default '' check (length(context) <= 4000), -- "training for an Ironman, 41 years, …"
  updated_at timestamptz not null default now()
);
create trigger health_settings_touch before update on public.health_settings for each row execute function public.touch_updated_at();

-- ───────────────────────────── agent conversation ─────────────────────────────
create table public.health_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'chat' check (kind in ('chat', 'weekly')),
  question text not null default '',
  answer text not null default '',
  created_at timestamptz not null default now()
);
create index health_reports_user_time on public.health_reports (user_id, created_at desc);

alter table public.health_metrics enable row level security;
alter table public.health_meals enable row level security;
alter table public.health_settings enable row level security;
alter table public.health_reports enable row level security;
create policy "own metrics" on public.health_metrics for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own meals" on public.health_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own health settings" on public.health_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- reports are written by the edge function (service role); the owner reads and may delete them
create policy "read own reports" on public.health_reports for select using (user_id = auth.uid());
create policy "delete own reports" on public.health_reports for delete using (user_id = auth.uid());

-- Merge imported wearable days into health_metrics: imported values fill in / update,
-- but a missing value in the import never wipes what's already there.
create function public.health_import(rows jsonb) returns integer
language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.health_metrics as m (user_id, date, weight_kg, body_fat_pct, resting_hr, hrv_ms, steps, active_kcal, sleep_hours, source)
  select auth.uid(), (r ->> 'date')::date,
         (r ->> 'weight_kg')::numeric, (r ->> 'body_fat_pct')::numeric, (r ->> 'resting_hr')::numeric::smallint,
         (r ->> 'hrv_ms')::numeric, (r ->> 'steps')::numeric::integer, (r ->> 'active_kcal')::numeric::integer,
         (r ->> 'sleep_hours')::numeric, coalesce(r ->> 'source', 'import')
  from jsonb_array_elements(rows) r
  on conflict (user_id, date) do update set
    weight_kg = coalesce(excluded.weight_kg, m.weight_kg),
    body_fat_pct = coalesce(excluded.body_fat_pct, m.body_fat_pct),
    resting_hr = coalesce(excluded.resting_hr, m.resting_hr),
    hrv_ms = coalesce(excluded.hrv_ms, m.hrv_ms),
    steps = coalesce(excluded.steps, m.steps),
    active_kcal = coalesce(excluded.active_kcal, m.active_kcal),
    sleep_hours = coalesce(excluded.sleep_hours, m.sleep_hours),
    source = case when m.source = excluded.source then m.source else m.source || '+' || excluded.source end;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.health_import(jsonb) to authenticated;

-- ───────────────────────────── meal photos ─────────────────────────────
-- Private bucket; each user may only touch files under "<their user id>/…".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "own meal photos read" on storage.objects for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own meal photos write" on storage.objects for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own meal photos delete" on storage.objects for delete
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
