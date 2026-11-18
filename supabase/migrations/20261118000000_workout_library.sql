-- "Train with Patrick": a video library (strength, mobility, recovery) for every paying client,
-- plus an optional scheduled "workout of the day".
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  category text not null check (category in ('strength', 'mobility', 'recovery')),
  duration_min smallint check (duration_min between 1 and 300),
  level text check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  description text not null default '',
  video_url text check (video_url is null or video_url ~ '^https://'),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workouts_touch before update on public.workouts for each row execute function public.touch_updated_at();

-- The coach can pin a workout to a date; days without one rotate through the library in the app.
create table public.workout_schedule (
  date date primary key,
  workout_id uuid not null references public.workouts (id) on delete cascade
);

alter table public.workouts enable row level security;
alter table public.workout_schedule enable row level security;

-- Every client with an active plan (any tier) may watch; drafts are visible to the coach only.
create policy "clients read published workouts" on public.workouts for select
  using (published and public.has_feature('library'));
create policy "coach manages workouts" on public.workouts for all
  using (public.is_coach()) with check (public.is_coach());

create policy "clients read schedule" on public.workout_schedule for select
  using (public.has_feature('library'));
create policy "coach manages schedule" on public.workout_schedule for all
  using (public.is_coach()) with check (public.is_coach());
