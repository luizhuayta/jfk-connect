# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

**Importante:** Este repo usa una versión modificada de Next.js 16.2.4 con breaking changes. Antes de escribir código, lee la guía relevante en `node_modules/next/dist/docs/` (documentación vendored). Turbopack es el bundler por defecto (ya no existe `--turbopack`), y params/cookies/headers son Promises (Async Request APIs).

## Comandos comunes

```bash
npm run dev              # Servidor de desarrollo (http://localhost:3000)
npm run build            # Build de producción (output: standalone)
npm run start            # Servidor de producción
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit (la verificación canónica; debe dar 0 errores)
```

No hay test runner configurado en el proyecto.

### Docker (stack completo: app + Postgres)

```bash
npm run docker:up        # Levantar todo (recomendado)
npm run docker:logs      # Logs en tiempo real
npm run docker:psql "SELECT 1"   # SQL rápido contra la BD (db/ijfk)
npm run docker:reset     # down -v + up (BORRA la BD)
npm run docker:clean     # down -v --remove-orphans
npm run docker:tools     # + pgAdmin (http://localhost:5050)
```

Seed de datos demo (idempotente) y hasheo de contraseñas:

```bash
npm run seed:full        # Puebla la BD (docker compose exec app npm run seed)
npm run seed:clean       # Limpia y vuelve a sembrar
npm run hash-passwords   # Hashea contraseñas de usuarios seed si faltó
```

Credenciales demo: `admin@ijfk.edu.pe` / `docente1@ijfk.edu.pe` / `padre1@ijfk.edu.pe` — contraseña `Demo2026!`.

## Arquitectura

Sistema de gestión académica del Colegio John F. Kennedy (Chincha) con 3 paneles: **admin**, **teacher** (docente) y **father** (padre de familia). Todo el código, comentarios y respuestas de la API están en español.

### Stack
- **Next.js 16 App Router** + Turbopack, React 19, TypeScript, Tailwind v4, shadcn/ui (`components/ui/*`), Recharts (gráficos), Lucide (iconos), zod (validación).
- **Base de datos:** imagen `supabase/postgres:15` en Docker, accedida **directamente con `pg` (node-postgres)** vía `lib/db.ts` — NO se usa Supabase REST/PostgREST para la app (la imagen local no lo incluye). `@supabase/supabase-js` existe (`lib/supabase.ts`) pero el acceso server-side real es `lib/db.ts`.
- **Email:** `lib/mail.ts` usa **nodemailer + SMTP** (por defecto Gmail con app password). Config vía `.env`: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD` (app password de Gmail), `MAIL_FROM`, `MAIL_FROM_NAME`. No necesita dominio propio ni IP autorizada. `sendEmail`/`emailTemplates`/`verifyMailConnection`. La app solo envía códigos de verificación (registro y recuperación de contraseña).
- **Sentry:** `@sentry/nextjs` configurado en `next.config.ts` (inactivo si `SENTRY_DSN` está vacío).
- **MCPs:** `.mcp.json` configura el MCP de **Supabase** (HTTP, requiere OAuth). OJO: la app NO usa Supabase REST/PostgREST para su BD (usa `pg` directo vía `lib/db.ts`), así que no uses ese MCP para operar sobre las tablas de la app — está solo para consultar docs o el proyecto Supabase externo si existe.

### Estructura de rutas
- `app/(auth)/*` — login, register, forgot/reset password, verify, change-password.
- `app/admin/*`, `app/teacher/*`, `app/father/*` — dashboards. **Todas las páginas son `"use client"`** que fetchean datos desde las API routes (`/api/...`) con `fetch`, no Server Components con data fetching.
- `app/api/*` — Route Handlers agrupados por rol: `auth/*`, `admin/*`, `teacher/courses/[courseId]/*`, `father/*`, más `announcements`, `health`, `test-email`.
- `middleware.ts` — primera línea de autenticación por rol (ver abajo).

### Autenticación y autorización (importante para tocar auth)
1. **Sesión:** cookie httpOnly `ijfk_session` con JWT HS256 (`lib/session.ts` firma con Node crypto; `lib/session-secret.ts` es un módulo puro importable desde Edge). `SameSite=Strict` + `assertSameOrigin` en `lib/csrf.ts`.
2. **Middleware (`middleware.ts`):** verifica el JWT con Web Crypto (Edge Runtime) y protege `/admin`, `/father`, `/teacher` por rol. Es UX/defensa inicial; redirige a `/login?redirect=...`.
3. **API routes:** `lib/auth.ts` (`requireUser`, `requireRole`) lee la cookie, consulta la BD para confirmar el usuario es real y activo. Roles DB: `'admin' | 'docente' | 'padre'` (enum en español). `lib/guards.ts` añade autorización a nivel de recurso (el padre es dueño del estudiante, el docente del curso).
4. **Contraseñas:** `lib/password.ts` usa scrypt; hay migración transparente de hashes legacy (SHA-256) al primer login. El login tiene rate-limiting por IP y por email (`lib/rate-limit.ts`).

> Nota: `lib/constants.ts` define roles en inglés (`father/teacher/admin`) — es un vestigio del mock inicial. Los roles canónicos en la BD y el middleware son `admin | docente | padre`.

### Base de datos
- Migraciones SQL en `supabase/migrations/*.sql` se aplican **automáticamente al primer arranque del contenedor** vía `docker-entrypoint-initdb.d`. No hay herramienta de migraciones; solo se ejecutan en un volumen nuevo. Cambios de esquema → nueva migración SQL numerada, no editar las existentes (aunque son idempotentes con `IF NOT EXISTS`).
- Tablas principales: `users`, `students`, `courses`, `grades`, `attendance`, `enrollments`, `announcements`. La letra de calificación (A/B/C/D) la calcula un trigger de BD y se replica en TS en `lib/letter-grade.ts` (mismo criterio: A=18-20, B=15-17, C=10-14, D=0-9).
- `lib/db.ts` expone `query`, `queryOne` y `withTransaction` (pool global singleton, evita duplicar conexiones en dev).

### Patrones de las API routes
Las route handlers siguen este patrón consistente (ver `app/api/auth/login/route.ts` como referencia): `parseBody` + schema zod → rate limiting → `requireUser`/`requireRole` → guard de recurso → `query`/`queryOne`/`withTransaction` → `NextResponse.json({ ok: ..., error? })`. Errores genéricos para no filtrar información; `logger` (pino) para errores inesperados.

### Diseño visual
Paleta institucional consistente en las 23 páginas: azul `#1E2A5E` (primary), dorado `#F4C15C` (acentos), con estados verde/ámbar/rojo/azul-claro por semántica (asistencia, aprobaciones, faltas, justificaciones). Patrones: día destacado con ring + barra dorada + `● HOY`, `border-l-4` por estado, chips de letter grade, expansión animada (`max-h-96/0 transition-all`).

## Errores comunes al arrancar
- **La app no conecta a BD:** esperar 10-15s a que Postgres inicialice migraciones; verificar `docker compose exec db pg_isready -U supabase_admin`.
- **Emails no se envían:** verifica que `MAIL_USER` y `MAIL_PASSWORD` estén configurados en `.env`. Para Gmail, `MAIL_PASSWORD` debe ser una **app password** (no la contraseña normal), creada en https://myaccount.google.com/apppasswords. Con la contraseña normal de Gmail, Google rechaza el login con 535.
- El proyecto corre `NODE_ENV=production` por defecto en Docker; para levantar solo la app fuera de Docker usa `npm run dev` con tu propio Postgres y `DATABASE_URL`.
