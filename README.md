# Momentum

Momentum is a V1 SaaS-style web app for builders: track what you ship, how you distribute it, and what is starting to work. This repository is a **Next.js 15 (App Router)** dashboard backed by **Supabase** (Postgres auth, RLS, Storage) with a **read-only mock mode** for local UI demos.

## Stack

- Next.js 15, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (Base UI primitives)
- Supabase (auth, Postgres, Storage)
- React Hook Form, Zod
- Recharts

## Folder structure

```text
app/
  (auth)/              # Login, signup (marketing-style shell)
  (dashboard)/         # Authenticated area
    onboarding/        # First-run name capture
    (shell)/           # Sidebar + header layout
      dashboard/       # Builder overview
      projects/        # List + detail ([projectId])
      distribution/    # Cross-project distribution log + filters
      reports/         # Placeholder analytics surface
      settings/        # Profile + environment hints
      outreach/        # Placeholder (linked from sidebar)
      swipe-file/      # Placeholder
      costs/           # Placeholder
  actions/             # Server actions (mutations)
  auth/callback/       # Supabase OAuth / PKCE callback
components/
  auth/, dashboard/, distribution/, onboarding/, projects/, ui/
lib/
  auth/                # Session helpers
  data/                # Reads (Supabase or mock)
  supabase/            # Browser + server clients, middleware helper
  validations/         # Zod schemas
types/
  momentum.ts          # Shared domain types
supabase/
  migrations/          # SQL for Postgres + Storage policies
  seed.sql             # Optional commented seed
```

## Main routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/dashboard` (mock) or `/login` / `/dashboard` (Supabase) |
| `/login`, `/signup` | Email + password auth |
| `/onboarding` | Display name + `onboarding_completed` |
| `/dashboard` | KPIs, charts, recent activity |
| `/projects` | Project cards, create modal |
| `/projects/[projectId]` | Tabs: Overview, Timeline, Distribution |
| `/distribution` | Table + filters + log modal (project picker when multiple) |
| `/reports` | Placeholder + chart reuse |
| `/settings` | Profile + env flags |
| `/outreach`, `/swipe-file`, `/costs` | Placeholder pages for future modules |

## Database schema (Supabase / Postgres)

Enums:

- `project_status`: `idea`, `building`, `launched`, `paused`
- `timeline_entry_type`: `snapshot`, `note`, `link`
- `distribution_platform`: `reddit`, `tiktok`, `twitter`, `product_hunt`, `instagram`, `youtube`, `other`

Tables:

- **`profiles`** — `id` (FK `auth.users`), `display_name`, `avatar_url`, `onboarding_completed`, timestamps  
- **`projects`** — `user_id`, `name`, `description`, `status`, `color`, `icon`, timestamps  
- **`timeline_entries`** — `project_id`, `user_id`, `type`, `title`, `description`, `image_url` (storage path or URL), `external_url`, `entry_date`, timestamps  
- **`distribution_entries`** — `project_id`, `user_id`, `platform`, optional `title`, `url`, `notes`, `date_posted`, `metrics` (JSONB, nullable for future KPIs), timestamps  

Row Level Security is enabled so users only read and write rows tied to their projects. Storage bucket **`timeline-images`** stores snapshot files under `{user_id}/...` with policies scoped to the owner.

A trigger on **`auth.users`** inserts a **`profiles`** row on signup.

Apply the migration:

1. Open the Supabase SQL editor (or use the Supabase CLI).
2. Run `supabase/migrations/20260406200000_initial.sql`.

If your Postgres build errors on trigger syntax, replace `execute function` with `execute procedure` for the `updated_at` and auth triggers (some hosted versions still expect the older keyword).

## Local setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL` — project URL  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key  
   - `NEXT_PUBLIC_USE_MOCK_DATA` — set to `true` to browse with bundled sample data (writes are blocked server-side in mock mode)

3. **Supabase auth**

   For local development, disable email confirmation or confirm addresses from the Supabase dashboard so you can sign in immediately after signup.

4. **Run**

   ```bash
   npm run dev
   ```

5. **Optional seed**

   After you have a real `user` id, use `supabase/seed.sql` as a template to insert sample projects.

## Mock demo mode

Set `NEXT_PUBLIC_USE_MOCK_DATA=true` to load in-memory sample projects (Morning habits, Shared pantry, Synth samples) without a Supabase project. Server actions return an error for creates/updates so the UI stays read-only and honest.

## Branding

Use **`public/momentum-logo.svg`** for the mark (referenced from `components/momentum-logo.tsx` via Next.js `Image`). Replace that file with your official logo. Adjust wordmark and tagline copy in `momentum-logo.tsx` to match your brand.

## Scripts

- `npm run dev` — dev server (Turbopack)  
- `npm run build` — production build  
- `npm run start` — start production server  
- `npm run lint` — ESLint  

## Product notes (V1)

- Distribution rows include nullable **`metrics`** JSON for future analytics without a breaking migration.
- Search in the header is a **placeholder** for a unified command palette later.
- Reports reuses dashboard charts; deeper analytics are explicitly deferred.
