-- GSB Attendance database schema for Supabase (PostgreSQL)
-- Run this in Supabase SQL Editor before creating the first admin profile.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'GSB Admin',
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_gsb_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null,
  end_time time not null,
  grace_minutes integer not null default 10 check (grace_minutes between 0 and 180),
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  department text,
  phone text,
  shift_id uuid references public.shifts(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  shift_id uuid references public.shifts(id) on delete set null,
  work_date date not null,
  punch_in time,
  punch_out time,
  status text not null default 'present' check (status in ('present','late','absent','half_day')),
  source text not null default 'manual' check (source in ('manual','device','import')),
  device_punch_id text,
  created_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.device_sync_logs (
  id uuid primary key default gen_random_uuid(),
  device_name text not null default 'BIO-PARK',
  sync_started_at timestamptz not null default now(),
  sync_finished_at timestamptz,
  records_imported integer not null default 0,
  status text not null default 'pending',
  message text
);

alter table public.profiles enable row level security;
alter table public.shifts enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.device_sync_logs enable row level security;

drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

drop policy if exists "admin manages shifts" on public.shifts;
create policy "admin manages shifts" on public.shifts for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

drop policy if exists "admin manages employees" on public.employees;
create policy "admin manages employees" on public.employees for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

drop policy if exists "admin manages attendance" on public.attendance;
create policy "admin manages attendance" on public.attendance for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

drop policy if exists "admin manages leave" on public.leave_requests;
create policy "admin manages leave" on public.leave_requests for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

drop policy if exists "admin manages sync logs" on public.device_sync_logs;
create policy "admin manages sync logs" on public.device_sync_logs for all to authenticated
using (public.is_gsb_admin()) with check (public.is_gsb_admin());

insert into public.shifts(name,start_time,end_time,grace_minutes)
values
 ('Morning','06:00','14:00',10),
 ('General','09:00','18:00',10),
 ('Evening','14:00','22:00',10),
 ('Night','22:00','06:00',10)
on conflict (name) do nothing;
