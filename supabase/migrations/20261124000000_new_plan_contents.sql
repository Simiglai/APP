-- Events are visible to every paying plan (buy-in for Accountable/Perform, included for Elite/Private).
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
              else true
            end)
      )
  );
$$;
