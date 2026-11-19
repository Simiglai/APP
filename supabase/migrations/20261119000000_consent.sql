-- Record each client's consent (terms + privacy + explicit consent to health data, GDPR art. 9) at sign-up.
alter table public.profiles
  add column consent_version text,
  add column consented_at timestamptz;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  insert into public.profiles (id, name, language, currency, consent_version, consented_at)
  values (
    new.id,
    coalesce(meta ->> 'name', ''),
    case when meta ->> 'language' = 'da' then 'da' else 'en' end,
    case when meta ->> 'currency' in ('USD', 'DKK') then meta ->> 'currency'
         when meta ->> 'language' = 'da' then 'DKK' else 'USD' end,
    nullif(meta ->> 'consent_version', ''),
    case when meta ? 'consent_version' then now() end
  );
  return new;
end;
$$;
