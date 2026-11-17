-- Remember the client's language and set their currency at sign-up (Danish clients pay in DKK).
alter table public.profiles add column language text not null default 'en' check (language in ('en', 'da'));
grant update (language) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  insert into public.profiles (id, name, language, currency)
  values (
    new.id,
    coalesce(meta ->> 'name', ''),
    case when meta ->> 'language' = 'da' then 'da' else 'en' end,
    case when meta ->> 'currency' in ('USD', 'DKK') then meta ->> 'currency'
         when meta ->> 'language' = 'da' then 'DKK' else 'USD' end
  );
  return new;
end;
$$;
