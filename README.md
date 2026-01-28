# MealMind

Plan dinners fast. Stress less.

MealMind is a simple meal planning app that helps you organize weekly dinners, generate meal plans, and create shopping lists.

## Features

- **Meals Library** - Add, edit, and delete meals with name, tags, cook time, and ingredients
- **Weekly Planner** - Generate meal plans based on your preferences, reroll individual days, and swap meals between days
- **Shopping List** - Auto-generated ingredient list from your weekly plan with checkboxes
- **Settings** - Configure dinners per week, max cook time, excluded ingredients, and allow/disallow repeats
- **Authentication** - Email/password auth with Supabase
- **Cloud Storage** - All data synced to Supabase with Row Level Security

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Supabase (PostgreSQL + Auth)

## Getting Started

1. Connect your Supabase project via the v0 integrations panel
2. Run the database migration in `/scripts/001_create_tables.sql`
3. Start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
/app
  /(app)           # Protected app routes with sidebar layout
    /meals         # Meals library page
    /planner       # Weekly planner page
    /shopping      # Shopping list page
    /settings      # User settings page
  /auth            # Authentication pages (login, sign-up)
/components        # Reusable UI components
/lib
  /db.ts           # Supabase database operations
  /supabase/       # Supabase client configuration
  /types.ts        # TypeScript type definitions
/scripts           # Database migration scripts
```

## Database Schema

- `meals` - User's meal library with name, tags, cook time, and ingredients
- `weekly_plans` - Weekly meal plans with day-to-meal mappings
- `user_settings` - User preferences for plan generation

All tables use Row Level Security (RLS) to ensure users can only access their own data.
