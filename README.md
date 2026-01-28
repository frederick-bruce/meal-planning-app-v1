# MealMind

**Plan dinners fast. Stress less.**

MealMind is a meal planning app that helps busy people organize weekly dinners, automatically generate meal plans based on preferences, and create shopping lists - all without the mental load of deciding "what's for dinner?" every night.

## Features

### Core Features (MVP)

- **Meals Library** - Build your personal collection of go-to meals with name, tags (e.g., "quick", "vegetarian", "comfort food"), cook time, and ingredients list
- **Weekly Planner** - Auto-generate weekly meal plans based on your preferences, reroll individual days you don't like, and swap meals between days with drag-free simplicity
- **Shopping List** - Auto-generated ingredient list aggregated from your weekly plan with checkboxes to track what you've picked up
- **Settings** - Configure how many dinners per week, maximum cook time, ingredients to exclude (allergies/dislikes), and whether to allow meal repeats within a week
- **Authentication** - Secure email/password auth with Supabase
- **Cloud Sync** - All data synced to Supabase with Row Level Security (RLS) so your meals are available on any device
- **Households** - Create or join a household to share meals with family members
- **Meal Requests** - Household members can request meals they want for the week, which the planner can approve or dismiss

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works fine)

### Setup

1. Clone the repository
2. Connect your Supabase project via the v0 integrations panel (or set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables)
3. Run the database migration:
   - Execute `/scripts/001_create_tables.sql` in your Supabase SQL editor
4. Install dependencies and start the dev server:

\`\`\`bash
npm install
npm run dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) and create an account to get started

## Project Structure

\`\`\`
/app
  /(app)/              # Protected routes (requires auth)
    /meals             # Meals library - CRUD for your meal collection
    /planner           # Weekly planner - generate & manage weekly plans
    /shopping          # Shopping list - auto-generated from plan
    /settings          # User preferences for plan generation
  /auth/               # Public auth routes
    /login             # Sign in page
    /sign-up           # Registration page
    /sign-up-success   # Email confirmation prompt
    /error             # Auth error handling
/components/           # Reusable UI components
  /ui/                 # shadcn/ui primitives
  meal-card.tsx        # Meal display card
  meal-form.tsx        # Add/edit meal form
  day-card.tsx         # Planner day card with actions
/lib/
  /supabase/           # Supabase client setup (client, server, middleware)
  db.ts                # Database operations (meals, plans, settings)
  types.ts             # TypeScript type definitions
/scripts/
  001_create_tables.sql    # Core database schema (meals, plans, settings)
  002_create_households.sql # Households and meal requests schema
\`\`\`

## Database Schema

| Table | Description |
|-------|-------------|
| `meals` | User's meal library (name, tags, cook_time_minutes, ingredients as JSONB) |
| `weekly_plans` | Weekly plans with week_start date and days array mapping dates to meal IDs |
| `user_settings` | User preferences (dinners_per_week, max_cook_time, excluded_ingredients, allow_repeats) |
| `households` | Shared household groups with invite codes |
| `household_members` | Members of households with display names and roles (owner/member) |
| `meal_requests` | Meal requests from household members for specific weeks |

All tables use Row Level Security (RLS) - users can only access their own data, and household members can access shared household data.

## Roadmap / Future Features

Potential features to enhance MealMind (keeping it simple and focused):

- [ ] **Meal favorites/ratings** - Mark meals you loved to weight them higher in plan generation
- [ ] **Leftovers tracking** - Mark a meal as "makes leftovers" to auto-schedule a leftover day after
- [ ] **Quick add from URL** - Paste a recipe URL to auto-extract name and ingredients
- [ ] **Meal history** - See when you last made each meal to avoid too-recent repeats
- [ ] **Share shopping list** - Generate a shareable link or text export for your shopping list
- [ ] **Dark mode toggle** - Already themed, just needs a toggle in settings
- [ ] **PWA support** - Install as app on mobile for offline access to shopping list
- [ ] **Drag-and-drop planner** - Drag meals between days instead of swap buttons
- [ ] **Meal suggestions** - "You haven't made X in 3 weeks" prompts
- [ ] **Seasonal tags** - Auto-suggest seasonal meals based on time of year

## License

MIT
