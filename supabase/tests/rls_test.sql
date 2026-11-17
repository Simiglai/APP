-- Row-level-security tests. Run after local_stub.sql + the migration:
--   psql -v ON_ERROR_STOP=1 -f local_stub.sql -f ../migrations/*.sql -f rls_test.sql
\set ON_ERROR_STOP 1
-- three users: coach, an Accountable client (anna), an Elite client (erik)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000c', 'coach@test', '{"name":"Coach"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'anna@test',  '{"name":"Anna"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'erik@test',  '{"name":"Erik"}');
update public.profiles set role = 'coach' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set plan = 'accountable', plan_status = 'active' where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set plan = 'elite', plan_status = 'active' where id = '00000000-0000-0000-0000-0000000000e1';
insert into public.events (title, starts_on, location) values ('Training camp', current_date + 30, 'Copenhagen');

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok   %', label;
end $$;
create function pg_temp.fails(sql text, label text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok   % (blocked: %)', label, sqlerrm; return; end;
  raise exception 'FAIL: % — was allowed', label;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- ── Anna (Accountable client)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check((select count(*) from public.profiles) = 1, 'anna sees only her own profile');
update public.profiles set identity = 'I am disciplined' where id = auth.uid();
select pg_temp.check((select identity from public.profiles where id = auth.uid()) = 'I am disciplined', 'anna edits her identity');
select pg_temp.fails($$update public.profiles set plan = 'elite' where id = auth.uid()$$, 'anna cannot upgrade herself');
select pg_temp.fails($$update public.profiles set role = 'coach' where id = auth.uid()$$, 'anna cannot make herself coach');
insert into public.days (user_id, date, data) values (auth.uid(), current_date, '{"mood":4,"energy":3,"rating":8,"morningDoneAt":"2026-11-16T06:30:00Z"}');
select pg_temp.check((select mood from public.days where user_id = auth.uid()) = 4, 'day summary columns synced from data');
select pg_temp.fails($$insert into public.days (user_id, date, data) values ('00000000-0000-0000-0000-0000000000e1', current_date, '{}')$$, 'anna cannot write erik''s day');
insert into public.messages (client_id, sender_id, body) values (auth.uid(), auth.uid(), 'Check-in done');
select pg_temp.fails($$insert into public.messages (client_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000e1', auth.uid(), 'hi')$$, 'anna cannot post in erik''s thread');
select pg_temp.fails($$insert into public.worksheets (user_id, worksheet_id, data) values (auth.uid(), 'fear-setting', '{}')$$, 'anna (accountable) cannot use worksheets');
select pg_temp.check((select count(*) from public.events) = 0, 'anna (accountable) cannot see events');
select pg_temp.check((select count(*) from public.training_programs) = 0, 'anna (accountable) has no training program access');

-- ── Erik (Elite client)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
select pg_temp.check((select count(*) from public.days) = 0, 'erik cannot see anna''s days');
select pg_temp.check((select count(*) from public.messages) = 0, 'erik cannot see anna''s messages');
insert into public.worksheets (user_id, worksheet_id, data) values (auth.uid(), 'fear-setting', '{"what":"quit my job"}');
insert into public.worksheets (user_id, worksheet_id, data, shared_at) values (auth.uid(), 'future-self', '{}', now());
select pg_temp.check((select count(*) from public.events) = 1, 'erik (elite) sees events');
insert into public.event_rsvps (event_id, user_id) select id, auth.uid() from public.events;
select pg_temp.fails($$insert into public.events (title, starts_on) values ('fake', current_date)$$, 'erik cannot create events');

-- ── Coach
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.check((select count(*) from public.profiles) = 3, 'coach sees all profiles');
select pg_temp.check((select count(*) from public.days) = 1, 'coach sees client days');
select pg_temp.check((select count(*) from public.worksheets) = 1, 'coach sees only SHARED worksheets');
insert into public.messages (client_id, sender_id, body) values ('00000000-0000-0000-0000-0000000000a1', auth.uid(), 'Proud of you!');
update public.messages set read_at = now() where sender_id = '00000000-0000-0000-0000-0000000000a1';
insert into public.training_programs (user_id, week, updated_by) values ('00000000-0000-0000-0000-0000000000e1', '[{"title":"Run"}]', auth.uid());
select public.coach_set_plan('00000000-0000-0000-0000-0000000000a1', 'perform');
select pg_temp.check((select checkins_7d from public.coach_client_overview where name = 'Anna') = 1, 'dashboard view: anna 1 check-in');
select pg_temp.check((select count(*) from public.coach_client_overview) = 2, 'dashboard view lists 2 clients');

-- ── Anna after coach upgraded her to Perform
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.check((select count(*) from public.messages) = 2, 'anna sees coach reply in her thread');
insert into public.training_programs (user_id, week) values (auth.uid(), '[]');
select pg_temp.check((select count(*) from public.training_programs) = 1, 'anna (perform) can now use training programs');
select pg_temp.fails($$select public.coach_set_plan(auth.uid(), 'elite')$$, 'anna cannot call coach_set_plan');

-- ── Call-first approval for Perform/Elite
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
update public.profiles set requested_tier = 'elite', requested_at = now() where id = auth.uid();
select pg_temp.check((select requested_tier from public.profiles where id = auth.uid()) = 'elite', 'anna can request a call for elite');
select pg_temp.fails($$update public.profiles set approved_tiers = '{elite}' where id = auth.uid()$$, 'anna cannot approve herself');
select pg_temp.fails($$select public.coach_set_approval(auth.uid(), '{elite}')$$, 'anna cannot call coach_set_approval');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.check((select requested_tier from public.coach_client_overview where name = 'Anna') = 'elite', 'coach sees anna''s request');
select public.coach_set_approval('00000000-0000-0000-0000-0000000000a1', '{perform,elite}');
select pg_temp.check((select approved_tiers from public.coach_client_overview where name = 'Anna') = '{perform,elite}', 'coach approved anna');
select pg_temp.fails($$select public.coach_set_approval('00000000-0000-0000-0000-0000000000a1', '{gold}')$$, 'unknown tier rejected');

-- ── Not signed in
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.check((select count(*) from public.profiles) = 0, 'anonymous sees no profiles');
select pg_temp.check((select count(*) from public.days) = 0, 'anonymous sees no days');
reset role;
\echo ALL RLS TESTS PASSED
