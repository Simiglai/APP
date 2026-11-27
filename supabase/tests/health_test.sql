-- Health agent tables: owners only, merge import keeps manual values. Run after the migrations.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@x'), ('22222222-2222-2222-2222-222222222222', 'b@x');
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into health_metrics (user_id, date, weight_kg, notes) values (auth.uid(), '2026-11-20', 82.4, 'manual');
select health_import('[{"date":"2026-11-20","steps":9000,"sleep_hours":7.2,"source":"apple_health"},{"date":"2026-11-21","weight_kg":82.1,"source":"apple_health"}]'::jsonb) as imported;
do $$ begin
  assert (select weight_kg from health_metrics where date = '2026-11-20') = 82.4, 'import wiped manual weight';
  assert (select steps from health_metrics where date = '2026-11-20') = 9000, 'steps not merged';
  assert (select source from health_metrics where date = '2026-11-20') = 'manual+apple_health', 'source not merged';
  assert (select count(*) from health_metrics) = 2, 'expected 2 days';
end $$;
insert into health_meals (user_id, description, kcal) values (auth.uid(), 'eggs', 300);
insert into storage.objects (bucket_id, name) values ('meal-photos', '11111111-1111-1111-1111-111111111111/a.jpg');
-- another user sees nothing and cannot write into the first user's photo folder
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from health_metrics) = 0, 'metrics leaked';
  assert (select count(*) from health_meals) = 0, 'meals leaked';
  assert (select count(*) from storage.objects) = 0, 'photos leaked';
  begin
    insert into health_meals (user_id, description) values ('11111111-1111-1111-1111-111111111111', 'x');
    raise exception 'wrote a meal for someone else';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('meal-photos', '11111111-1111-1111-1111-111111111111/b.jpg');
    raise exception 'uploaded into someone else''s folder';
  exception when insufficient_privilege then null; end;
  begin
    insert into health_reports (user_id, answer) values (auth.uid(), 'x');
    raise exception 'clients must not write reports directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'health tests passed' as result;
-- saved meals are private too
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into health_saved_meals (user_id, name, kcal) values (auth.uid(), 'Smoothie', 850);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin assert (select count(*) from health_saved_meals) = 0, 'saved meals leaked'; end $$;
reset role;
select 'saved meals tests passed' as result;
-- supplements are private too
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into health_supplements (user_id, slot, name) values (auth.uid(), 'morning', 'D3');
insert into health_supplement_log (user_id, date, supplement_id) select auth.uid(), '2026-11-28', id from health_supplements;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  assert (select count(*) from health_supplements) = 0, 'supplements leaked';
  assert (select count(*) from health_supplement_log) = 0, 'supplement log leaked';
end $$;
reset role;
select 'supplement tests passed' as result;
