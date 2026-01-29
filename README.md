# MealMind

**Plan dinners fast. Stress less.**

MealMind is a meal planning app that helps busy people organize weekly dinners, generate meal plans based on preferences, and create shopping lists — without the nightly “what’s for dinner?” brain tax.

- **Live Demo:** (add link)
- **GitHub Repo:** https://github.com/frederick-bruce/meal-planning-app-v1

## Features

### Core Features (MVP)
- **Meals Library** — Build a personal collection of meals with tags, cook time, and ingredients
- **Weekly Planner** — Auto-generate weekly plans, reroll individual days, and swap meals easily
- **Shopping List** — Auto-generated ingredient list aggregated from the weekly plan
- **Settings** — Configure dinners per week, max cook time, excluded ingredients, and repeat rules
- **Authentication** — Email/password auth via Supabase
- **Cloud Sync + Security** — Supabase Postgres with Row Level Security (RLS)
- **Households** — Share meals and plans with family members
- **Meal Requests** — Household members can request meals for a given week

## Tech Stack
- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Language:** TypeScript

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1) Clone & Install
```bash
git clone https://github.com/frederick-bruce/meal-planning-app-v1.git
cd meal-planning-app-v1
npm install
2) Environment Variables
Create a .env.local file:

cp .env.example .env.local
Required variables:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

3) Database Setup
Run these SQL scripts in the Supabase SQL Editor:

scripts/001_create_tables.sql

scripts/002_create_households.sql

4) Run the App
npm run dev
Open http://localhost:3000 to get started.

Project Structure
/app
  /(app)/              # Auth-protected routes
    /meals
    /planner
    /shopping
    /settings
  /auth/               # Public auth routes

/components/
  /ui/                 # shadcn/ui primitives
  meal-card.tsx
  meal-form.tsx
  day-card.tsx

/lib/
  /supabase/
  db.ts
  types.ts

/scripts/
  001_create_tables.sql
  002_create_households.sql
Deploying (Vercel)
Deploy the repo to Vercel

Add env vars:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

Add your Vercel URL to Supabase Auth redirect URLs

Roadmap
Meal favorites / ratings

Leftovers tracking

Recipe import from URL

Meal history

Shareable shopping list

PWA support

Drag-and-drop planner

License
MIT