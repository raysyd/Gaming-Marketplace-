-- Sidegrade — password sign-in lockout.
-- Paste into Supabase -> SQL Editor -> Run. Safe to run more than once.
--
-- Supabase's own Auth Rate Limits (Dashboard -> Authentication -> Rate
-- Limits) throttle sign-in attempts by request IP. That's not scriptable
-- from SQL and is a dashboard setting, not a migration — configure it there
-- alongside this file, don't try to replace it with this.
--
-- What this adds instead: defense in depth *per account*, so someone
-- spraying password guesses at one seller's email from many different IPs
-- (which the IP-based limiter above won't catch) still gets locked out.
-- Locks an email out for 15 minutes after 5 failed password attempts.
--
-- This table is intentionally invisible to normal clients — RLS blocks all
-- direct access, and the three functions below (SECURITY DEFINER) are the
-- only way in. anon/authenticated get EXECUTE on the functions only.

create table if not exists auth_signin_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_signin_attempts_email_idx
  on auth_signin_attempts (email, created_at desc);

alter table auth_signin_attempts enable row level security;
drop policy if exists "no direct access" on auth_signin_attempts;
create policy "no direct access" on auth_signin_attempts
  for all using (false) with check (false);

-- Call before attempting supabase.auth.signInWithPassword().
create or replace function signin_attempts_blocked(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select count(*) >= 5
  from auth_signin_attempts
  where email = lower(trim(p_email))
    and created_at > now() - interval '15 minutes';
$$;

-- Call after signInWithPassword() returns an "invalid credentials" error.
create or replace function record_failed_signin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into auth_signin_attempts (email) values (lower(trim(p_email)));
  -- Opportunistic cleanup, same pattern as lib/rate-limit.ts, so the table
  -- doesn't grow without bound between deploys.
  delete from auth_signin_attempts where created_at < now() - interval '1 day';
end;
$$;

-- Call after a successful sign-in to clear that email's slate.
create or replace function clear_signin_attempts(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth_signin_attempts where email = lower(trim(p_email));
end;
$$;

revoke all on table auth_signin_attempts from anon, authenticated;
grant execute on function signin_attempts_blocked(text) to anon, authenticated;
grant execute on function record_failed_signin(text) to anon, authenticated;
grant execute on function clear_signin_attempts(text) to anon, authenticated;
