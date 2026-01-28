-- MealMind Database Schema
-- Tables: meals, weekly_plans, settings

-- Meals table
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  tags text[] default '{}',
  cook_time integer default 30,
  ingredients text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Weekly plans table
create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  plan jsonb not null default '{}',
  checked_items jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

-- User settings table
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  dinners_per_week integer default 5,
  max_cook_time integer default 60,
  excluded_ingredients text[] default '{}',
  allow_repeats boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.meals enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.user_settings enable row level security;

-- Meals policies
create policy "Users can view their own meals" on public.meals
  for select using (auth.uid() = user_id);
create policy "Users can insert their own meals" on public.meals
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own meals" on public.meals
  for update using (auth.uid() = user_id);
create policy "Users can delete their own meals" on public.meals
  for delete using (auth.uid() = user_id);

-- Weekly plans policies
create policy "Users can view their own plans" on public.weekly_plans
  for select using (auth.uid() = user_id);
create policy "Users can insert their own plans" on public.weekly_plans
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own plans" on public.weekly_plans
  for update using (auth.uid() = user_id);
create policy "Users can delete their own plans" on public.weekly_plans
  for delete using (auth.uid() = user_id);

-- User settings policies
create policy "Users can view their own settings" on public.user_settings
  for select using (auth.uid() = user_id);
create policy "Users can insert their own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings" on public.user_settings
  for update using (auth.uid() = user_id);
create policy "Users can delete their own settings" on public.user_settings
  for delete using (auth.uid() = user_id);

-- Function to auto-create settings for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to create settings on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
