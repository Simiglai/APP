-- Pre-launch waitlist / mailing list. Anyone may join (insert only); only the coach can read it.
-- Joining requires explicit consent to marketing emails (GDPR); people can unsubscribe at any time.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  name text not null default '' check (length(name) <= 100),
  language text not null default 'da' check (language in ('da', 'en')),
  source text check (length(source) <= 60), -- e.g. instagram, bio, story (from ?ref=)
  marketing_consent boolean not null check (marketing_consent),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index waitlist_email on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
-- Visitors (signed in or not) can add themselves, nothing else. No select → the list can't be read publicly.
create policy "anyone can join" on public.waitlist for insert to anon, authenticated with check (true);
create policy "coach reads waitlist" on public.waitlist for select using (public.is_coach());
create policy "coach manages waitlist" on public.waitlist for update using (public.is_coach());
create policy "coach deletes from waitlist" on public.waitlist for delete using (public.is_coach());
grant insert on public.waitlist to anon;

-- Is this email on the waitlist? (used by checkout for the launch offer; callable by the service role only)
create function public.on_waitlist(addr text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.waitlist where lower(email) = lower(addr)); -- the offer stays even if they later unsubscribe from emails
$$;
revoke execute on function public.on_waitlist(text) from public, anon, authenticated;
grant execute on function public.on_waitlist(text) to service_role;
