-- Riviraa Desk: secure user directory for app admins
-- Run once in Supabase SQL Editor after reviewing. This does NOT expose passwords.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_riviraa_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_riviraa_admin() from public;
grant execute on function public.is_riviraa_admin() to authenticated;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_riviraa_admin());

grant select on public.profiles to authenticated;

create or replace function public.handle_new_riviraa_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_riviraa on auth.users;
create trigger on_auth_user_created_riviraa
after insert on auth.users
for each row execute procedure public.handle_new_riviraa_user();

-- Backfill profiles for accounts that already exist.
insert into public.profiles (id, email, role)
select u.id, lower(u.email), 'user'
from auth.users u
on conflict (id) do update set email = excluded.email;

-- IMPORTANT: After running this script, promote YOUR OWN account to admin.
-- Replace the email below with the exact email you use to sign into Riviraa Desk.
-- Run this statement separately after checking it:
-- update public.profiles set role = 'admin' where email = lower('YOUR_EMAIL_HERE');
