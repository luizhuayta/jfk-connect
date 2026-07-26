# IJFK — Estado de mejoras y trabajo pendiente

> **Última actualización:** 25/07/2026 — **Sprint 7 completo (3.6).** Los 3 botones "Nuevo..." ahora crean registros reales (alumno, sección, matrícula con código único), los menús "Acc." ejecutan acciones (detalle, estado, desvincular, pagos) y el dashboard docente muestra la próxima clase real. Typecheck OK. Verificado en runtime.

---

## 1. Resumen del proyecto

- **Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + PostgreSQL (Supabase self-hosted en Docker) + Mailpit (SMTP de desarrollo).
- **Autenticación:** Custom con JWT en cookie httpOnly (`lib/session.ts`). El servidor firma un JWT HS256 y lo setea en cookie `ijfk_session`. Las API routes leen la cookie y la verifican.
- **Base de datos:** Esquema en `supabase/migrations/` (users, students, courses, grades, attendance, enrollments, announcements, pending_registrations, password_reset_codes).
- **Datos demo:** `data/mock.ts` contiene ~1000 líneas de datos mock. Todas las páginas que lo usan muestran un `DemoDataBanner` avisando al usuario.

---

## 2. ✅ Cambios YA implementados

### Páginas conectadas a la BD (3.1 — COMPLETO)
20. **Migración 003** (`supabase/migrations/00000000000003_schedules_materials.sql`): tablas `schedule_entries` y `materials`; columnas extra en `enrollments` (`docs JSONB`, `tutor`, `classroom`).
21. **Seed de datos demo** (`scripts/seed-demo.mjs`, idempotente, UUIDs deterministas): 20 usuarios (2 admin, 10 docentes, 8 padres) con password scrypt `Demo2026!`; 59 estudiantes; 13 cursos; 118 notas; 451 asistencias; 59 matrículas; 11 avisos; 175 entradas de horario; 13 materiales. Script `npm run seed`.
22. **`lib/guards.ts`**: `studentBelongsToParent`, `courseBelongsToTeacher` (autorización a nivel de recurso).
23. **API routes father** (5): `/api/father/{students,grades,attendance,enrollment,schedule}` — rol `padre`, solo datos de sus propios hijos.
24. **API route announcements** (compartido): `GET` filtra audiencia por rol; `POST` (admin); `PATCH/DELETE` `[id]` (admin).
25. **API routes teacher** (6): `/api/teacher/courses`, `/api/courses/{[id]}/{students,grades}(GET/PUT),attendance(GET/POST),materials(GET/POST/DELETE [materialId])}`, `/api/teacher/schedule`. `GET` accesibles también para admin (read-only).
26. **API routes admin** (6): `/api/admin/{stats,students,sections,courses,enrollments,schedule}` — rol `admin`.
27. **Páginas migradas** (21 + dashboard): todas las páginas `father/*` (7), `teacher/*` (7) y `admin/*` (8) ahora hacen `fetch` a las API routes y muestran datos reales. Removido `DemoDataBanner` e imports de `@/data/mock` de todas las páginas.
28. **Charts del dashboard** (`AttendanceChart`, `GradeDistributionChart`): ahora reciben datos por props desde `/api/admin/stats`.
29. **Editor de notas del docente** (`teacher/grades`): guarda real con `PUT`.
30. **Registro de asistencia del docente** (`teacher/attendance`): guarda real con `POST`.
31. **CRUD de avisos del admin** (`admin/announcements`): crear/editar/eliminar con `POST/PATCH/DELETE`.
32. **Gestión de materiales del docente** (`teacher/materials`): subir/eliminar con `POST/DELETE`.
33. **Typecheck**: `npm run typecheck` pasó sin errores.
34. **Verificación runtime**: login (padre, docente, admin) + GET/POST/PUT de todas las APIs probados contra la BD en Docker.

---

## 3. ❌ Trabajo PENDIENTE (lo que falta)

### 3.1 ✅ ~~Conectar páginas a la BD~~ — COMPLETO
~~Problema:~~ 21 páginas seguían mostrando datos de `data/mock.ts` (con banner avisando). Solo `admin/users` estaba conectado a la BD real.

**Hecho:** Migración + seed + 17 API routes + 21 páginas migradas (ver sección 2). El `DemoDataBanner` y los imports de `@/data/mock` se eliminaron de todas las páginas. `data/mock.ts` sigue en el repo por si se quiere referenciar, pero ya **ninguna página lo importa**.

### 3.2 ✅ Middleware de auth por rol — COMPLETO
~~Añadir `middleware.ts` en la raíz que:~~
- ✅ Protege rutas `/admin/*`, `/father/*`, `/teacher/*` (redirige a `/login?redirect=...` si no hay cookie o el JWT es inválido/expirado).
- ✅ Valida el rol con el mismísimo JWT firmado: un padre que entra a `/admin` se redirige a `/father`, un docente a `/admin` → `/teacher`, etc.

Implementación:
- `lib/session-secret.ts`: secreto JWT compartido en un módulo puro (sin `node:crypto`) para poder importarlo desde el middleware (Edge Runtime) y desde `lib/session.ts` (Node).
- `middleware.ts` (Edge): verifica el JWT HS256 con la **Web Crypto API** (`crypto.subtle`), decodifica `role`/`sub`, hace cumplir el matching de rol ↔ ruta. El `config.matcher` restringe el middleware solo a `/admin`, `/father`, `/teacher` (no corre en APIs ni páginas públicas).
- `lib/session.ts`: refactorizado para reusar `lib/session-secret.ts`. API pública sin cambios (`SESSION_COOKIE`, `SESSION_MAX_AGE`, `signSession`, `verifySession`).

> Nota: el middleware es la primera línea de defensa UX; la autorización real de cada recurso sigue haciéndose en las API routes vía `lib/auth.ts` (consulta la BD). Un token manipulado no pasa la verificación HMAC del middleware y, aunque pasara, las API routes lo rechazarían.

### 3.3 ✅ Seed de usuarios con hash seguro — COMPLETO
~~Los usuarios seed del migration SQL no tienen `password_hash` con scrypt. Crear un script que los hashee con `lib/password.ts`.~~

**Hecho:** `scripts/hash-seed-passwords.ts` (TypeScript) importa **directamente** `lib/password.ts` y `lib/db.ts` (los mismos módulos que usan las API routes en runtime) vía `tsx`. Asigna hash scrypt a:
- Usuarios con `password_hash IS NULL` (los admins seed de la migración 0 quedaron sin hash).
- Usuarios con hash legacy SHA-256 (los marca `must_change_password = true` para forzar cambio en el próximo login).

Características:
- Idempotente: los usuarios que ya tienen `scrypt$...` se omiten.
- Filtrable con `ONLY_EMAILS=admin@ijfk.edu.pe,...` para limitar el alcance.
- Password por defecto configurable con `SEED_PASSWORD` (default `Demo2026!`).
- Se ejecuta con `npm run hash-passwords`.

**Estado verificado en runtime:** 0/22 usuarios sin scrypt tras ejecutarlo; 2 usuarios prueba con hash legacy re-hasheados y marcados para cambio de contraseña.

### 3.4 ✅ Rate limiting — COMPLETO
~~Añadir en `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password` para prevenir brute-force.~~

**Hecho:** `lib/rate-limit.ts` (limitador en memoria, ventana fija) integrado en los 3 endpoints de auth.

Límites configurados:
| Endpoint | Por IP | Por email destino |
|---|---|---|
| `/api/auth/login` | 10 / 15 min (cada request) | 5 / 15 min (solo **fallidos**) |
| `/api/auth/register` | 5 / 15 min | — |
| `/api/auth/forgot-password` | 5 / 15 min | 3 / 1 hora (anti email-bombing) |

Detalles de implementación:
- **Almacenamiento en memoria** (`Map` a nivel de módulo). Suficiente para la app monoinstancia (contenedor Docker). Sin queries extra a la BD ni dependencias de Redis.
- **IP del cliente**: lee `X-Forwarded-For` → `X-Real-IP` → `request.ip` (Node Runtime).
- **En login**, el contador por email se consume **solo en intentos fallidos**; un intento correcto tras varios fallidos puede entrar (y resetea ambos contadores).
- Respuestas `429` con headers estándar: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Mensajes en español ("Demasiados intentos. Intenta de nuevo en X min.").

> Nota de despliegue: en producción con varias réplicas o detrás de un proxy, usa `X-Forwarded-For` (debe setearlo el proxy) o sustituye el backend en memoria por Redis / Upstash para compartir contadores entre instancias.

**Verificación runtime:** brute-force de login (5 fallidos → 6º = 429, Retry-After 900s); intento correcto tras 5 fallidos → 200; register (6º = 429); forgot-password (4º = 429 por email con Retry-After 3600s).

### 3.5 🟢 Mejoras adicionales (no urgentes)

#### ✅ Hechas (mitad de 3.5 en esta sesión)
- **RLS real en Postgres** — migración `004_rls_policies.sql`: políticas por
  tabla (users/students/courses/grades/attendance/enrollments/announcements/
  schedule_entries/materials) usando `auth.uid()` y `auth.role`. En el Postgres
  local (sin Supabase Auth) queda como no-op; en Supabase Cloud aplica y
  refuerza: cada rol solo ve lo suyo aunque la app se conectara sin superuser.
- **Validación con Zod** — `lib/schemas.ts` (Zod v4) con todos los schemas
  de los endpoints POST/PATCH/PUT; `lib/validate.ts` (`parseBody`) que valida
  y devuelve 400 legible. Integrado en: login, register, forgot-password,
  announcements POST/PATCH, admin users POST, teacher grades PUT,
  teacher attendance POST, teacher materials POST.
- **CSRF protection** — cookie de sesión con `SameSite=Strict`
  (en `lib/session.ts`) + helper `lib/csrf.ts` (`assertSameOrigin`) integrado
  en login/register/forgot-password como defensa en profundidad (header
  `Origin`/`Referer` vs `NEXT_PUBLIC_APP_URL`). Disponible para añadir a
  cualquier otra route mutativa en una línea.
- **Logging estructurado** — `lib/logger.ts` (Pino) con redacción de
  secretos/PII, formato legible en dev (`pino-pretty`) y JSON en prod,
  nivel configurable por `LOG_LEVEL`. Migrados login/register/forgot-password/
  auth/me a `logger.error/.info`. Helper disponible para el resto de routes.

#### ⏳ Pendientes (para más adelante)
- **Tests**: `lib/password.ts`, `lib/session.ts`, `lib/auth.ts`, API routes de auth.
- **Eliminar `data/mock.ts`** cuando todas las páginas usen la BD.
- **Revisar `lib/supabase.ts`**: `isSupabaseConfigured` tiene lógica confusa.
- **Variables de entorno**: usar `.env` real en producción, no defaults del docker-compose.
- **JWT_SECRET**: configurar uno real en producción (el default es de desarrollo).
- Migrar el resto de `console.error` dispersos en API routes a `logger.error`.
- Añadir `assertSameOrigin` al resto de rutas mutativas (admin users PATCH/DELETE,
  reset-password, verify, change-password, teacher grades PUT, attendance POST,
  materials POST/DELETE, announcements POST/PATCH/DELETE).

### 3.6 ✅ Sprint 7 — Funcionalidad faltante (botones + TODOs) — COMPLETO
~~3 botones "Nuevo..." decorativos, menús "Acc." sin acción y 2 placeholders en el dashboard docente.~~

**Hecho** (sin tocar lógica de negocio existente, middlewares, esquema de BD ni seeds):
- **Modal "Nuevo alumno"** (`admin/students`): DNI, nombre, grado, sección y turno → nuevo `POST /api/admin/students` (201; DNI duplicado → 409). El alumno aparece en la lista paginada.
- **Modal "Nueva sección"** (`admin/courses`): grado, letra disponible, aula y turno → nuevo `POST /api/admin/sections` que crea los 12 cursos de la sección (mismo set de materias del seed, sin docente, `ON CONFLICT DO NOTHING`; duplicada → 409). El `GET /api/admin/sections` ahora deriva las claves de sección de `students ∪ courses` para que una sección recién creada (aún sin alumnos) aparezca en la lista con 0 alumnos; los cálculos de las secciones existentes no cambian.
- **Modal "Nueva matrícula"** (`admin/enrollment`): buscador de alumno activo (debounce) → nuevo `POST /api/admin/enrollments` que genera la matrícula con **código único** `<año>-<grado_num><sección>-<correlativo>` en transacción (`FOR UPDATE` + correlativo = máx(enrollments, students.enrollment_code)+1), la crea en estado `pendiente` y asigna el mismo código a `students.enrollment_code` si no tenía (reclamo del apoderado). Duplicada → 409. El modal muestra el código generado con botón copiar.
- **Menú "Acc." en `admin/students`**: ver detalle (modal), cambiar estado (activo/retirado/trasladado, submenú) y desvincular apoderado → nuevo `PATCH /api/admin/students/[id]` (`{ status }` / `{ unlinkParent: true }`, limpia `parent_id` + `parent_claimed_at`).
- **Menú "Acc." en `admin/enrollment`**: editar pagos (modal con toggles APAFA/actividades, docs 0-7 y estado) → nuevo `PATCH /api/admin/enrollments/[id]` (si se marca un pago, setea `last_payment_date = CURRENT_DATE`); ver detalle (modal).
- **Dashboard docente**: "Clases de hoy" conectado a `GET /api/teacher/schedule` — muestra la **próxima clase real** (primera cuyo fin no pasó; "En curso" si aplica) y la lista del día (pasadas atenuadas); "Pendientes de hoy: asistencia" simplificado a link directo a `/teacher/attendance` (sin endpoint nuevo).
- Menús con `components/ui/dropdown-menu.tsx` (Base UI), modales con el patrón overlay ya usado en `ClaimChildModal`.
- Schemas Zod nuevos en `lib/schemas.ts`: `createStudentSchema`, `updateStudentSchema`, `createSectionSchema`, `createEnrollmentSchema`, `updateEnrollmentSchema`.

**Verificación:** typecheck 0 errores; runtime contra la BD en Docker (dev server :3001): alta de alumno → visible en lista → DNI duplicado 409; PATCH estado/desvincular; alta de matrícula `2026-2A-2091` → visible → duplicada 409 → código en `students.enrollment_code`; PATCH pagos (apafa + docs + `last_payment_date`); secciones GET 65 OK + duplicada 409 + alta probada en transacción con ROLLBACK (INSERT 12 cursos + aparece en el GET con UNION); login docente + `/api/teacher/schedule` con slots reales; SSR 200 de las 3 páginas admin y `/teacher`. Datos de prueba eliminados tras la verificación (conteos restaurados: 2090 alumnos, 2090 matrículas, 780 cursos).

---

## 4. 📋 Checklist para continuar

```
- [x] Hash seguro de contraseñas (scrypt)
- [x] Auth server-side (requireUser/requireRole)
- [x] Eliminar backdoor "admin" en login/change-password
- [x] Eliminar devCode en registro
- [x] Proteger endpoints admin con rol
- [x] Navbar carga usuario real
- [x] DemoDataBanner en todas las páginas con mock
- [x] Imports de DemoDataBanner corregidos
- [x] Sesión con cookies httpOnly + JWT
- [x] Endpoint de logout
- [x] Frontend sin sessionStorage
- [x] Typecheck OK
- [x] Conectar páginas a la BD reemplazando mock.ts (3.1) — 21 páginas + 17 API routes + seed
- [x] Middleware de auth por rol (3.2) — `middleware.ts` Edge + JWT Web Crypto
- [x] Seed de usuarios con hash seguro (3.3) — `scripts/hash-seed-passwords.ts` + `npm run hash-passwords`
- [x] Rate limiting (3.4) — `lib/rate-limit.ts` en login/register/forgot-password (IP + email)
- [x] ~mitad 3.5~: RLS real (migración 004), Zod (schemas+validate), CSRF (SameSite=Strict + assertSameOrigin), logging (Pino)
- [x] Sprint 7 (3.6) — botones "Nuevo..." con acción real (alumno/sección/matrícula), menús "Acc." operativos, próxima clase real en dashboard docente
- [ ] Tests (3.5) — para más adelante
```

---

## 5. 📁 Archivos nuevos/modificados

### Nuevos
- `lib/password.ts` — hash seguro con scrypt
- `lib/auth.ts` — helpers de autenticación server-side (lee cookie JWT)
- `lib/session.ts` — JWT HS256 sign/verify + opciones de cookie
- `lib/guards.ts` — autorización a nivel de recurso (student-parent, course-teacher)
- `lib/session-secret.ts` — secreto JWT compartido (Edge-safe) para middleware + session.ts
- `middleware.ts` — auth por rol en rutas protegidas (verifica JWT HS256 con Web Crypto API)
- `lib/rate-limit.ts` — limitador en memoria (ventana fija, IP + email) para login/register/forgot-password
- `lib/logger.ts` — logger estructurado (Pino) con redacción de secretos y formato dev/prod
- `lib/schemas.ts` — esquemas Zod v4 de los bodies de API routes
- `lib/validate.ts` — `parseBody(request, schema)` para validar y devolver 400 legible
- `lib/csrf.ts` — `assertSameOrigin` (defensa CSRF en profundidad; cookie ya usa SameSite=Strict)
- `supabase/migrations/00000000000004_rls_policies.sql` — políticas RLS por rol (activa en Supabase Cloud)
- Dependencias: `pino`, `zod`, `pino-pretty` (dev)
- `components/common/DemoDataBanner.tsx` — banner de datos demo (ya no usado por las páginas)
- `app/api/auth/logout/route.ts` — endpoint de logout
- `supabase/migrations/00000000000003_schedules_materials.sql` — tablas schedule_entries, materials + columnas en enrollments
- `scripts/seed-demo.mjs` — seed de datos demo (idempotente, `npm run seed`)
- `scripts/hash-seed-passwords.ts` — hashea usuarios sin scrypt con `lib/password.ts` (idempotente, `npm run hash-passwords`)
- **17 API routes**: `/api/announcements` (+ `[id]`), `/api/father/*` (5), `/api/teacher/courses` (+ sub-rutas), `/api/teacher/schedule`, `/api/admin/{stats,students,sections,courses,enrollments,schedule}`
- `MEJORAS_PENDIENTES.md` — este documento
- **Sprint 7 (3.6)**: `app/api/admin/students/[id]/route.ts` (PATCH estado/desvincular), `app/api/admin/enrollments/[id]/route.ts` (PATCH pagos/docs/estado)

### Modificados (seguridad)
- `app/api/auth/login/route.ts` — setea cookie JWT
- `app/api/auth/register/route.ts` — hash seguro, sin devCode
- `app/api/auth/change-password/route.ts` — hash seguro, sin backdoor
- `app/api/auth/forgot-password/route.ts` — código criptográficamente seguro
- `app/api/auth/me/route.ts` — lee cookie JWT
- `app/api/admin/users/route.ts` — protegido con rol admin
- `app/api/admin/users/[id]/route.ts` — protegido, no auto-eliminación
- `app/api/test-email/route.ts` — protegido con auth

### Modificados (frontend sesión)
- `components/auth/LoginPage.tsx` — sin sessionStorage, usa cookie
- `components/FatherSidebar.tsx` — usa /api/auth/me, logout con API
- `components/TeacherSidebar.tsx` — igual
- `components/layout/Navbar.tsx` — igual

### Modificados (datos reales — 21 páginas + dashboard, todas OK)
- admin: page, students, courses, grades, attendance, enrollment, schedule, announcements
- father: page, grades, attendance, schedule, enrollment, students, announcements
- teacher: page, courses, grades, attendance, schedule, materials, announcements
- `components/dashboard/admin/{AttendanceChart,GradeDistributionChart}.tsx` — aceptan data por props
- `package.json` — script `seed`

### Modificados (Sprint 7, 3.6)
- `app/api/admin/students/route.ts` — añadido POST (alta de alumno)
- `app/api/admin/sections/route.ts` — añadido POST (alta de sección: crea sus 12 cursos) + GET deriva claves de `students ∪ courses`
- `app/api/admin/enrollments/route.ts` — añadido POST (matrícula con código único, transacción)
- `lib/schemas.ts` — 5 schemas nuevos (createStudent, updateStudent, createSection, createEnrollment, updateEnrollment)
- `app/admin/students/page.tsx` — modal "Nuevo alumno" + menú "Acc." (detalle / estado / desvincular)
- `app/admin/courses/page.tsx` — botón y modal "Nueva sección"
- `app/admin/enrollment/page.tsx` — modal "Nueva matrícula" (buscador de alumno + código generado) + menú "Acc." (editar pagos / detalle)
- `app/teacher/page.tsx` — "Clases de hoy" con datos de `/api/teacher/schedule` (próxima clase real); asistencia simplificada a link directo

---

## 6. Orden recomendado para continuar

1. **Conectar páginas a la BD** (sección 3.1) — empezar por `father/students` y `father/grades`.
2. **Middleware de auth** (sección 3.2).
3. **Seed con hash seguro** (sección 3.3).
4. **Rate limiting** (sección 3.4).
5. **Mejoras adicionales** (sección 3.5).