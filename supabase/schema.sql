-- SkyITEmpire website content + admin panel
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Then change the email at the bottom to your admin login email and run that line.

-- 1) Content table (one row, id = 'main', holding the whole site as JSON)
create table if not exists public.site_content (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- 2) Who is allowed to edit
create table if not exists public.site_admins (
  email text primary key
);

alter table public.site_content enable row level security;
alter table public.site_admins enable row level security;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Everyone (the public website) can read the content
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
  on public.site_content for select
  using (true);

-- Only admins can create / change it
drop policy if exists "Admins can insert site content" on public.site_content;
create policy "Admins can insert site content"
  on public.site_content for insert to authenticated
  with check (public.is_site_admin());

drop policy if exists "Admins can update site content" on public.site_content;
create policy "Admins can update site content"
  on public.site_content for update to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

-- Admins can see the admin list (used by the dashboard to check access)
drop policy if exists "Admins can read admin list" on public.site_admins;
create policy "Admins can read admin list"
  on public.site_admins for select to authenticated
  using (public.is_site_admin());

-- 3) Image storage bucket (public read, admin write)
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view site media" on storage.objects;
create policy "Public can view site media"
  on storage.objects for select
  using (bucket_id = 'site-media');

drop policy if exists "Admins can upload site media" on storage.objects;
create policy "Admins can upload site media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_site_admin());

drop policy if exists "Admins can update site media" on storage.objects;
create policy "Admins can update site media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and public.is_site_admin());

drop policy if exists "Admins can delete site media" on storage.objects;
create policy "Admins can delete site media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and public.is_site_admin());

-- 4) Make yourself an admin (use the same email you sign in with)
insert into public.site_admins (email) values ('you@example.com')
on conflict (email) do nothing;
