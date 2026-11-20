-- Fourth plan: "Private" — 12 months one-to-one with the coach (paid upfront, DKK only, by approval).
alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check check (plan in ('accountable', 'perform', 'elite', 'private'));
alter table public.profiles drop constraint profiles_approved_tiers_check;
alter table public.profiles add constraint profiles_approved_tiers_check check (approved_tiers <@ array['perform', 'elite', 'private']::text[]);
alter table public.profiles drop constraint profiles_requested_tier_check;
alter table public.profiles add constraint profiles_requested_tier_check check (requested_tier in ('perform', 'elite', 'private'));

-- Private includes everything Elite does.
create or replace function public.has_feature(feature text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'coach'
        or (p.plan_status in ('active', 'trialing') and case feature
              when 'training'   then p.plan in ('perform', 'elite', 'private')
              when 'worksheets' then p.plan in ('elite', 'private')
              when 'events'     then p.plan in ('elite', 'private')
              else true
            end)
      )
  );
$$;
