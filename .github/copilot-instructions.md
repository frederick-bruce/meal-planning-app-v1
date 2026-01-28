# Copilot instructions (MealMind)

## Project shape
- Next.js App Router app in `app/` with an authenticated section under `app/(app)/` (Meals/Planner/Shopping/Settings) and public auth pages under `app/auth/`.
- Most pages are client components (`"use client"`) and call the data layer directly; state is kept in component state and reloaded after mutations (see `loadMeals()` in `app/(app)/meals/page.tsx`).

## Auth + Supabase
- Supabase is the only backend; auth is email/password via `@supabase/ssr` + `@supabase/supabase-js`.
- Browser client: use `createClient()` from `lib/supabase/client.ts` (singleton).
- Server client exists (`lib/supabase/server.ts`) but is not the main path for the current UI.
- Session refresh runs via Next middleware: `middleware.ts` → `lib/supabase/middleware.ts` (`updateSession`).
- Route protection today is client-side in `app/(app)/layout.tsx` by checking `supabase.auth.getUser()` and redirecting to `/auth/login`.

## Data access conventions
- Prefer `lib/db.ts` as the single “DB/service” module. It:
  - Calls `supabase.auth.getUser()` inside functions and returns safe defaults when not logged in.
  - Maps DB rows to app types in `lib/types.ts` (e.g., `cook_time_minutes` → `cookTimeMinutes`).
  - Contains plan generation + date helpers (`getWeekStart`, `formatDate`, `getWeekDays`) used across pages.
- `lib/store.ts` is a legacy localStorage-only implementation and is currently unused by the app; don’t introduce new code that depends on it.

## API routes
- `app/api/parse-recipe/route.ts` implements recipe import by fetching the URL and parsing JSON-LD/metadata. No external AI services.
- Client usage example is in `app/(app)/meals/page.tsx` (`fetch('/api/parse-recipe', { method: 'POST', body: { url } })`).

## Database schema notes (Supabase)
- SQL migrations live in `scripts/`:
  - `scripts/001_create_tables.sql` (meals, weekly_plans, user_settings + RLS)
  - `scripts/002_create_households.sql` (households, members, requests + RLS)
  - `scripts/003_fix_schema.sql` (aligns core tables with `lib/db.ts` expectations)
- When changing DB logic, cross-check `lib/db.ts` vs these scripts: some household/request fields used by code (e.g., `households.created_by`, `meal_requests.status`, `meal_requests.requested_by`) may not match `scripts/002_create_households.sql` verbatim.

## UI conventions
- UI is shadcn/ui (`components/ui/*`) + Tailwind v4 with CSS variables in `app/globals.css`. Use `cn()` from `lib/utils.ts` for class merging.
- Toasts use `hooks/use-toast.ts` and the toaster rendered in `app/(app)/layout.tsx`.

## Dev workflows
- Package manager: repo includes `pnpm-lock.yaml` (prefer `pnpm`).
- Common commands:
  - `pnpm install`
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm start`

## Required env vars
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (optional; used on login/sign-up redirect)
