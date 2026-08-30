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
npm run migrate:apply    # Aplica migraciones nuevas SIN perder los datos sembrados (ver §Base de datos)
npm run migrate:status   # Lista migraciones aplicadas/pendientes
```

Credenciales demo — contraseña `Demo2026!` para todas: `admin@ijfk.edu.pe` (admin) y docentes con el patrón `d<codigo-area><NN>@ijfk.edu.pe` (p. ej. `ddpcc01@ijfk.edu.pe`, `dmat01@ijfk.edu.pe` — ver `curricular_areas.code` para los prefijos, o `SELECT email FROM users WHERE role='docente' LIMIT 5`). **No hay padres sembrados** — se registran solos vía `/register` y luego vinculan un hijo con el `enrollment_code` de un alumno (`SELECT enrollment_code FROM students LIMIT 1`).

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
- Migraciones SQL en `supabase/migrations/*.sql` se aplican **automáticamente al primer arranque del contenedor** vía `docker-entrypoint-initdb.d` (solo en un volumen nuevo). Para aplicar una migración nueva sobre una BD **ya sembrada** (sin perder los datos de `npm run seed:full`), usa `npm run migrate:apply` (`npm run migrate:status` para ver qué falta) — lleva su propio ledger (`schema_migrations`) con auto-baseline. Cambios de esquema → nueva migración SQL numerada, no editar las existentes (aunque son idempotentes con `IF NOT EXISTS`).
- Tablas principales: `users`, `students`, `courses`, `attendance`, `enrollments`, `announcements`. Las notas son por **competencia** (libreta SIAGIE): `curricular_areas` → `competencies` → `competency_grades` (nivel de logro AD/A/B/C 0-20, generado por la función SQL `nivel_logro()` y espejado en TS en `lib/grades/scale.ts`). La tabla `grades` (modelo plano viejo, letra A/B/C/D) fue renombrada a `grades_legacy` y ya no la usa la app.
- `lib/db.ts` expone `query`, `queryOne` y `withTransaction` (pool global singleton, evita duplicar conexiones en dev).

### Patrones de las API routes
Las route handlers siguen este patrón consistente (ver `app/api/auth/login/route.ts` como referencia): `parseBody` + schema zod → rate limiting → `requireUser`/`requireRole` → guard de recurso → `query`/`queryOne`/`withTransaction` → `NextResponse.json({ ok: ..., error? })`. Errores genéricos para no filtrar información; `logger` (pino) para errores inesperados.

### Diseño visual
Paleta institucional consistente en las 23 páginas: azul `#1E2A5E` (primary), dorado `#F4C15C` (acentos), con estados verde/ámbar/rojo/azul-claro por semántica (asistencia, aprobaciones, faltas, justificaciones). Patrones: día destacado con ring + barra dorada + `● HOY`, `border-l-4` por estado, chips de letter grade, expansión animada (`max-h-96/0 transition-all`).

### Módulo de IA
Cuatro funciones sobre una capa de proveedor agnóstica (`lib/ai/`, adaptador OpenAI-compatible por `fetch` — OpenRouter/DeepSeek/xAI/Groq/Google, sin SDK): (1) **conclusiones descriptivas** generadas para la libreta (`POST /api/ai/conclusions`, se integran en `useCompetencyGrid`/`ConclusionsRow` como sugerencias que el docente revisa y guarda con el flujo normal); (2) **importador de notas** por Excel/CSV/foto (`app/api/imports/grades/**`, `lib/imports/*` — la IA de visión solo hace OCR, el matching de alumnos y la validación son deterministas); (3) **asistente conversacional** por rol (`POST /api/assistant/messages`, herramientas en `lib/ai/tools/*` — las del padre reciben un índice sobre sus hijos, nunca un `studentId`, resuelto en el servidor antes de invocar al modelo); (4) **asignación inteligente de cursos** (`lib/courses/assignment.ts`, motor determinista; la IA solo redacta la justificación en `POST /api/admin/courses/assign/explain`).

`AI_ENABLED=0` (default) apaga toda la IA sin romper nada más — ver `.env.example`. Todo el gasto se audita en `ai_usage_log` (migración 010), visible en `/admin/ai`. `lib/ai/redact.ts` aplica la política de anonimización (nunca DNI/email/apellidos completos hacia el proveedor) — dato sensible por tratarse de menores de edad.

## Errores comunes al arrancar
- **La app no conecta a BD:** esperar 10-15s a que Postgres inicialice migraciones; verificar `docker compose exec db pg_isready -U supabase_admin`.
- **Emails no se envían:** verifica que `MAIL_USER` y `MAIL_PASSWORD` estén configurados en `.env`. Para Gmail, `MAIL_PASSWORD` debe ser una **app password** (no la contraseña normal), creada en https://myaccount.google.com/apppasswords. Con la contraseña normal de Gmail, Google rechaza el login con 535.
- El proyecto corre `NODE_ENV=production` por defecto en Docker; para levantar solo la app fuera de Docker usa `npm run dev` con tu propio Postgres y `DATABASE_URL`.
