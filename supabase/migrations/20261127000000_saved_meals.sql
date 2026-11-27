-- Saved meals ("favourites"): a meal you eat often, logged again with one tap.
create table public.health_saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  meal text not null default 'snack' check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null default '' check (length(description) <= 2000),
  kcal integer check (kcal between 0 and 10000),
  protein_g numeric(5, 1) check (protein_g between 0 and 1000),
  carbs_g numeric(5, 1) check (carbs_g between 0 and 1000),
  fat_g numeric(5, 1) check (fat_g between 0 and 1000),
  fiber_g numeric(5, 1) check (fiber_g between 0 and 500),
  items jsonb, -- ingredient breakdown, when known
  created_at timestamptz not null default now()
);
create index health_saved_meals_user on public.health_saved_meals (user_id, name);
alter table public.health_saved_meals enable row level security;
create policy "own saved meals" on public.health_saved_meals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
