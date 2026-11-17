-- Perform and Elite are by application: the client books a call, the coach approves, then the client can pay.
alter table public.profiles
  add column approved_tiers text[] not null default '{}'
    check (approved_tiers <@ array['perform', 'elite']::text[]),
  add column requested_tier text check (requested_tier in ('perform', 'elite')),
  add column requested_at timestamptz;

-- Clients may record which plan they asked for (never approve themselves).
grant update (requested_tier, requested_at) on public.profiles to authenticated;

-- The coach approves (or withdraws approval) after the call.
create function public.coach_set_approval(client uuid, tiers text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_coach() then raise exception 'only the coach can approve plans'; end if;
  update public.profiles set approved_tiers = tiers where id = client;
end;
$$;
revoke execute on function public.coach_set_approval(uuid, text[]) from public, anon;

-- Dashboard: show pending requests (new columns are appended, as CREATE OR REPLACE VIEW requires).
create or replace view public.coach_client_overview with (security_invoker = true) as
select
  p.id, p.name, p.plan, p.plan_status, p.created_at,
  (select max(d.date) from public.days d where d.user_id = p.id and d.morning_done_at is not null) as last_checkin,
  (select count(*) from public.days d where d.user_id = p.id and d.morning_done_at is not null and d.date > current_date - 7) as checkins_7d,
  (select round(avg(d.mood), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as mood_7d,
  (select round(avg(d.energy), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as energy_7d,
  (select round(avg(d.rating), 1) from public.days d where d.user_id = p.id and d.date > current_date - 7) as rating_7d,
  (select count(*) from public.messages m where m.client_id = p.id and m.sender_id = p.id and m.read_at is null) as unread,
  p.requested_tier, p.requested_at, p.approved_tiers
from public.profiles p
where p.role = 'client';
