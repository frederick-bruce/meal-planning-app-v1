-- Households feature schema
-- Tables: households, household_members, meal_requests

-- Households table (one household per owner, members can join via invite code)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Household',
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Household members table (links users to households)
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique(household_id, user_id)
);

-- Meal requests table (household members can request meals for specific weeks)
create table if not exists public.meal_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  week_start date not null,
  note text,
  created_at timestamptz default now(),
  unique(household_id, user_id, meal_id, week_start)
);

-- Enable RLS
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.meal_requests enable row level security;

-- Households policies
-- Users can view households they are a member of
create policy "Users can view their households" on public.households
  for select using (
    id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Only owner can update household
create policy "Owners can update their households" on public.households
  for update using (owner_id = auth.uid());

-- Users can create households
create policy "Users can create households" on public.households
  for insert with check (owner_id = auth.uid());

-- Only owner can delete household
create policy "Owners can delete their households" on public.households
  for delete using (owner_id = auth.uid());

-- Household members policies
-- Members can view other members in their household
create policy "Members can view household members" on public.household_members
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Users can join a household (insert themselves)
create policy "Users can join households" on public.household_members
  for insert with check (user_id = auth.uid());

-- Members can update their own membership (display name)
create policy "Members can update their own membership" on public.household_members
  for update using (user_id = auth.uid());

-- Members can leave (delete their own membership), owners can remove members
create policy "Members can leave or owners can remove" on public.household_members
  for delete using (
    user_id = auth.uid() or 
    household_id in (select id from public.households where owner_id = auth.uid())
  );

-- Meal requests policies
-- Members can view requests in their household
create policy "Members can view household requests" on public.meal_requests
  for select using (
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Members can create requests for meals they have access to
create policy "Members can create requests" on public.meal_requests
  for insert with check (
    user_id = auth.uid() and
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

-- Users can update their own requests
create policy "Users can update their own requests" on public.meal_requests
  for update using (user_id = auth.uid());

-- Users can delete their own requests
create policy "Users can delete their own requests" on public.meal_requests
  for delete using (user_id = auth.uid());

-- Update meals table to optionally belong to a household (shared meals)
alter table public.meals add column if not exists household_id uuid references public.households(id) on delete set null;

-- Drop existing policies on meals to recreate with household support
drop policy if exists "Users can view their own meals" on public.meals;
drop policy if exists "Users can insert their own meals" on public.meals;
drop policy if exists "Users can update their own meals" on public.meals;
drop policy if exists "Users can delete their own meals" on public.meals;

-- New meals policies with household support
-- Users can view their own meals OR meals shared with their household
create policy "Users can view own or household meals" on public.meals
  for select using (
    user_id = auth.uid() or 
    household_id in (select household_id from public.household_members where user_id = auth.uid())
  );

create policy "Users can insert their own meals" on public.meals
  for insert with check (user_id = auth.uid());

create policy "Users can update their own meals" on public.meals
  for update using (user_id = auth.uid());

create policy "Users can delete their own meals" on public.meals
  for delete using (user_id = auth.uid());

-- Index for faster lookups
create index if not exists idx_household_members_user_id on public.household_members(user_id);
create index if not exists idx_household_members_household_id on public.household_members(household_id);
create index if not exists idx_meal_requests_household_week on public.meal_requests(household_id, week_start);
create index if not exists idx_meals_household_id on public.meals(household_id);
