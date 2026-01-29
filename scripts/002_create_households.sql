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
  -- Matches lib/db.ts: requested_by references household_members(id)
  requested_by uuid not null references public.household_members(id) on delete cascade,
  meal_id uuid not null references public.meals(id) on delete cascade,
  week_start date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'planned', 'dismissed')),
  created_at timestamptz default now(),
  unique(household_id, requested_by, meal_id, week_start)
);

-- If the meal_requests table already existed (older schema), fix it up to match db.ts.
alter table public.meal_requests add column if not exists requested_by uuid;
alter table public.meal_requests add column if not exists status text;

do $$
begin
  -- Backfill requested_by from legacy user_id (if present)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'meal_requests'
      and column_name = 'user_id'
  ) then
    update public.meal_requests mr
    set requested_by = hm.id
    from public.household_members hm
    where mr.requested_by is null
      and hm.household_id = mr.household_id
      and hm.user_id = mr.user_id;
  end if;

  -- Ensure status has a sane default
  update public.meal_requests
  set status = 'pending'
  where status is null;

  -- Add FK to household_members if missing (needed for Supabase join `meal_requests_requested_by_fkey`)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meal_requests_requested_by_fkey'
  ) then
    alter table public.meal_requests
      add constraint meal_requests_requested_by_fkey
      foreign key (requested_by)
      references public.household_members(id)
      on delete cascade;
  end if;

  -- Add CHECK constraint for status if missing
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meal_requests_status_check'
  ) then
    alter table public.meal_requests
      add constraint meal_requests_status_check
      check (status in ('pending', 'planned', 'dismissed'));
  end if;
end $$;

-- Enable RLS
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.meal_requests enable row level security;

-- Helper: avoid RLS policy recursion by checking membership in a SECURITY DEFINER function.
-- (Directly selecting from public.household_members inside a policy on public.household_members
-- can trigger: "infinite recursion detected in policy".)
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

-- Join a household by invite code.
-- This is SECURITY DEFINER so a non-member can join without being able to SELECT the household row under RLS.
drop function if exists public.join_household_by_invite(invite_code text, display_name text);
create or replace function public.join_household_by_invite(invite_code text, display_name text)
returns public.households
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_household public.households%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select *
  into target_household
  from public.households
  where upper(public.households.invite_code) = upper(join_household_by_invite.invite_code)
  limit 1;

  if not found then
    return null;
  end if;

  insert into public.household_members (household_id, user_id, display_name, role)
  values (
    target_household.id,
    auth.uid(),
    coalesce(nullif(join_household_by_invite.display_name, ''), 'Member'),
    'member'
  )
  on conflict (household_id, user_id) do update
  set display_name = excluded.display_name;

  return target_household;
end;
$$;

revoke all on function public.join_household_by_invite(text, text) from public;
grant execute on function public.join_household_by_invite(text, text) to authenticated;

-- Policies are not created with IF NOT EXISTS in Postgres, so make this script re-runnable.
-- Households policies
drop policy if exists "Users can view their households" on public.households;
drop policy if exists "Owners can update their households" on public.households;
drop policy if exists "Users can create households" on public.households;
drop policy if exists "Owners can delete their households" on public.households;

-- Household members policies
drop policy if exists "Members can view household members" on public.household_members;
drop policy if exists "Users can join households" on public.household_members;
drop policy if exists "Members can update their own membership" on public.household_members;
drop policy if exists "Members can leave or owners can remove" on public.household_members;

-- Meal requests policies
drop policy if exists "Members can view household requests" on public.meal_requests;
drop policy if exists "Members can create requests" on public.meal_requests;
drop policy if exists "Users can update their own requests" on public.meal_requests;
drop policy if exists "Users can delete their own requests" on public.meal_requests;

-- Households policies
-- Users can view households they are a member of
create policy "Users can view their households" on public.households
  for select using (public.is_household_member(id) or owner_id = auth.uid());

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
  for select using (public.is_household_member(household_id));

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
  for select using (public.is_household_member(household_id));

-- Members can create requests for meals they have access to
create policy "Members can create requests" on public.meal_requests
  for insert with check (
    public.is_household_member(household_id) and
    requested_by in (
      select hm.id
      from public.household_members hm
      where hm.user_id = auth.uid()
        and hm.household_id = meal_requests.household_id
    )
  );

-- Users can update their own requests
create policy "Users can update their own requests" on public.meal_requests
  for update using (
    requested_by in (select hm.id from public.household_members hm where hm.user_id = auth.uid())
    or household_id in (select h.id from public.households h where h.owner_id = auth.uid())
  );

-- Users can delete their own requests
create policy "Users can delete their own requests" on public.meal_requests
  for delete using (
    requested_by in (select hm.id from public.household_members hm where hm.user_id = auth.uid())
    or household_id in (select h.id from public.households h where h.owner_id = auth.uid())
  );

-- Update meals table to optionally belong to a household (shared meals)
alter table public.meals add column if not exists household_id uuid references public.households(id) on delete set null;

-- Drop existing policies on meals to recreate with household support
drop policy if exists "Users can view their own meals" on public.meals;
drop policy if exists "Users can view own or household meals" on public.meals;
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
