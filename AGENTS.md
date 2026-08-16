<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses **Next.js 16.2.4** with breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Heed deprecation notices.

Key v16 quirks:
- **Turbopack is the default** for `dev` and `build` — there is no `--turbopack` flag.
- `params`, `cookies`, and `headers` are **Promises** (Async Request APIs). Await them.
- Build output is `standalone` (`next.config.ts`).
<!-- END:nextjs-agent-rules -->

# AGENTS.md — IJFK

## Essential commands

```bash
npm run dev          # localhost:3000 (Turbopack)
npm run build        # production build; must pass
npm run typecheck    # tsc --noEmit; must pass
npm run lint         # ESLint (pre-existing errors in admin/teacher pages)
```

No test runner is configured.

## Docker stack (app + Postgres)

```bash
npm run docker:up       # app + db
npm run docker:tools    # also pgAdmin on :5050
npm run docker:reset    # down -v + up (WIPES DB)
npm run seed:full       # populate demo data inside running container
```

Wait 10–15s after `docker:up` for Postgres init/migrations. Verify with `docker compose exec db pg_isready -U supabase_admin`.

## Architecture

Sistema de gestión académica del Colegio John F. Kennedy (Chincha). Three role dashboards: **`/admin`**, **`/teacher`**, **`/father`**.

- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`components/ui/*`), Recharts, Lucide, zod.
- **Language:** all code, UI labels, comments, and API responses are in **Spanish**.
- **Pages are client-side:** dashboard pages are `"use client"` and fetch from `/api/*` routes. Do not add Server Component data fetching.
- **API pattern:** `parseBody` → zod schema → rate limiting → `requireUser`/`requireRole` → resource guard → `query`/`queryOne`/`withTransaction`.

## Database — read this

- **Server-side DB access is direct PostgreSQL via `pg`** (`lib/db.ts`), **not** Supabase REST/PostgREST.
- `@supabase/supabase-js` exists but is not the main data path.
- Migrations live in `supabase/migrations/*.sql` and run automatically when a **fresh** `db` container starts (`docker-entrypoint-initdb.d`).
- Add new migrations; do not edit old ones. They are idempotent (`IF NOT EXISTS`) but only run on new volumes.

## Auth rules

1. **Session:** httpOnly cookie `ijfk_session` with JWT HS256 (`lib/session.ts`).
2. **Middleware (`middleware.ts`):** protects `/admin/*`, `/father/*`, `/teacher/*` by role using Edge Web Crypto.
3. **Canonical DB roles:** `admin | docente | padre`.
4. **Do not trust `lib/constants.ts` role names** (`father/teacher/admin`) — they are stale mock vestiges.
5. API routes re-verify the user against the DB via `lib/auth.ts` (`requireUser`, `requireRole`).

## Environment / mail

Copy `.env.example` → `.env`. For Gmail SMTP:
- `MAIL_USER` = Gmail address
- `MAIL_PASSWORD` = **16-character app password** from https://myaccount.google.com/apppasswords (not your regular password)

Sentry is installed but inactive if `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are empty.

## MCP note

`opencode.json` configures a Supabase MCP. The app does **not** use Supabase REST for its database, so do not use that MCP to operate on app tables — it is only for docs or an external Supabase project.
