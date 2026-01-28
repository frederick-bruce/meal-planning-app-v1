# MealMind

Plan dinners fast. Stress less.

MealMind is a simple meal planning app that helps you organize weekly dinners, generate meal plans, and create shopping lists.

## Features

- **Meals Library** - Add, edit, and delete meals with name, tags, cook time, and ingredients
- **Weekly Planner** - Generate meal plans based on your preferences, reroll individual days, and swap meals between days
- **Shopping List** - Auto-generated ingredient list from your weekly plan with persistent checkboxes
- **Settings** - Configure dinners per week, max cook time, excluded ingredients, and allow/disallow repeats

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components
- localStorage for data persistence (MVP)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
/app
  /(app)           # Main app routes with sidebar layout
    /meals         # Meals library page
    /planner       # Weekly planner page
    /shopping      # Shopping list page
    /settings      # User settings page
/components        # Reusable UI components
/lib
  /store.ts        # localStorage persistence and plan generation
  /types.ts        # TypeScript type definitions
```
