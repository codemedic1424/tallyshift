
-- Run this in Supabase SQL Editor

-- Tables
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  venue_id uuid references public.venues(id) on delete set null,
  role_id uuid references public.roles(id) on delete set null,
  hours numeric check (hours >= 0) default 0,
  sales numeric check (sales >= 0) default 0,
  cash_tips numeric check (cash_tips >= 0) default 0,
  card_tips numeric check (card_tips >= 0) default 0,
  tip_out_total numeric check (tip_out_total >= 0) default 0,
  notes text,
  created_at timestamp with time zone default now()
);

-- RLS
alter table public.venues enable row level security;
alter table public.roles enable row level security;
alter table public.shifts enable row level security;

create policy "owner_venues" on public.venues
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_roles" on public.roles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_shifts" on public.shifts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
