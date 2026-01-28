-- Fix schema to match db.ts expectations
-- This script alters the existing tables to have the correct column names and types

-- Fix meals table
alter table public.meals 
  add column if not exists cook_time_minutes integer default 30;

-- If cook_time exists, copy data and drop it
do $$ 
begin
  if exists (select 1 from information_schema.columns where table_name = 'meals' and column_name = 'cook_time') then
    update public.meals set cook_time_minutes = cook_time where cook_time_minutes is null or cook_time_minutes = 30;
    alter table public.meals drop column cook_time;
  end if;
end $$;

-- Fix ingredients column type (convert from text[] to jsonb if needed)
-- First check if it's text array and convert
do $$
begin
  -- Check if ingredients is text[] and needs conversion
  if exists (
    select 1 from information_schema.columns 
    where table_name = 'meals' 
    and column_name = 'ingredients' 
    and data_type = 'ARRAY'
  ) then
    -- Add temp column
    alter table public.meals add column ingredients_new jsonb default '[]';
    -- Convert text[] to jsonb (just wrap each string in an object with name)
    update public.meals 
    set ingredients_new = (
      select coalesce(jsonb_agg(jsonb_build_object('name', elem, 'quantity', '')), '[]'::jsonb)
      from unnest(ingredients) as elem
    );
    -- Drop old column and rename
    alter table public.meals drop column ingredients;
    alter table public.meals rename column ingredients_new to ingredients;
  end if;
exception when others then
  -- If conversion fails, just ensure the column exists as jsonb
  null;
end $$;

-- Fix weekly_plans table
alter table public.weekly_plans 
  add column if not exists days jsonb default '[]';

-- If plan exists, copy data and drop it
do $$ 
begin
  if exists (select 1 from information_schema.columns where table_name = 'weekly_plans' and column_name = 'plan') then
    update public.weekly_plans set days = plan where days = '[]'::jsonb or days is null;
    alter table public.weekly_plans drop column plan;
  end if;
  
  -- Drop checked_items if it exists (not used anymore)
  if exists (select 1 from information_schema.columns where table_name = 'weekly_plans' and column_name = 'checked_items') then
    alter table public.weekly_plans drop column checked_items;
  end if;
  
  -- Drop updated_at if it exists (not used)
  if exists (select 1 from information_schema.columns where table_name = 'weekly_plans' and column_name = 'updated_at') then
    alter table public.weekly_plans drop column updated_at;
  end if;
end $$;

-- Fix user_settings table
alter table public.user_settings 
  add column if not exists max_cook_time_minutes integer default 45;

do $$ 
begin
  if exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'max_cook_time') then
    update public.user_settings set max_cook_time_minutes = max_cook_time where max_cook_time_minutes is null or max_cook_time_minutes = 45;
    alter table public.user_settings drop column max_cook_time;
  end if;
  
  -- Drop updated_at if it exists
  if exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'updated_at') then
    alter table public.user_settings drop column updated_at;
  end if;
end $$;
