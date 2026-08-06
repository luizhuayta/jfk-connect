# IJFK Intranet Institucional

Sistema de gestion academica para el **Colegio Industrial John F. Kennedy - Chincha**.

Intranet institucional con diseno y mockups completos de los dashboards principales:
Login, Panel del Padre de Familia, Panel del Profesor y Panel del Administrador.

> **Estado actual:** El proyecto esta dockerizado y listo para trabajar con
> Supabase (PostgreSQL self-hosted) y envio de email via **SMTP (Gmail)**.

---

## Stack Tecnologico

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI Library | React 19.2 |
| Lenguaje | TypeScript 5+ |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui |
| Base de datos | PostgreSQL 15 (imagen oficial `supabase/postgres`) |
| Cliente BD | @supabase/supabase-js |
| Graficos | Recharts |
| Iconos | Lucide React |
| Email | nodemailer + SMTP (Gmail app password) |
| Contenedores | Docker + Docker Compose |

---

## Inicio Rapido con Docker (recomendado)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+ (incluye Docker Compose)
- 4 GB de RAM disponibles para los contenedores

### Levantar todo el stack

```bash
# 1. Clonar / copiar el proyecto
cd jfk-connect-main

# 2. Copiar las variables de entorno
copy .env.example .env

# 3. Levantar los servicios (App + Postgres)
docker compose up -d

# 4. Ver los logs en tiempo real
docker compose logs -f app
```

Despues de unos segundos, tendras disponible:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **App IJFK** | http://localhost:3000 | - |
| **Postgres** | localhost:54322 | `postgres` / `ijfk_dev_password` / db: `ijfk` |
| **Healthcheck** | http://localhost:3000/api/health | - |

Para detener todo: `docker compose down`
Para resetear todo (BORRA LA BD): `docker compose down -v && docker compose up -d`

### Herramientas extra (perfil `tools`)

```bash
# Levanta pgAdmin para gestionar la BD visualmente
docker compose --profile tools up -d -p ijfk-tools pgadmin
```

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **pgAdmin** | http://localhost:5050 | `admin@ijfk.local` / `admin` |

Para conectar pgAdmin al Postgres:
- Host: `db` (nombre del servicio, no `localhost`)
- Puerto: `5432`
- Usuario: `postgres`
- Password: `ijfk_dev_password`

---

## Estructura del Proyecto

```
jfk-connect-main/
  app/                          # Next.js App Router
    (auth)/login/               # Login institucional
    father/                     # Dashboard del padre de familia
    teacher/                    # Dashboard del profesor
    admin/                      # Panel administrativo
    role-selector/              # Selector de perfil
    api/                        # Endpoints del servidor
      health/route.ts           # Healthcheck (BD + Mail)
      test-email/route.ts       # Probar envio de emails
    page.tsx                    # Redireccion a /login
    layout.tsx                  # Layout raiz
  components/                   # Componentes React (shadcn/ui)
    auth/  common/  dashboard/  layout/  ui/
  data/mock.ts                  # Datos de prueba (UI)
  lib/                          # Logica reutilizable
    supabase.ts                 # Cliente de Supabase (server + browser)
    mail.ts                     # Cliente de email (SMTP / Gmail)
    utils.ts                    # Helpers (cn, etc.)
    constants.ts                # Constantes de la app
  supabase/
    migrations/                 # SQL de migraciones (auto-aplicado al init)
  types/                        # TypeScript types
  public/                       # Assets estaticos

  Dockerfile                    # Build multi-stage para Next.js
  docker-compose.yml            # Stack completo
  .dockerignore
  .env.example                  # Plantilla de variables de entorno
  next.config.ts                # Configuracion de Next.js 16
  package.json                  # Scripts de dev + docker
```

---

## Flujo de Rutas

| Ruta | Descripcion |
|------|-------------|
| `/` | Redireccion a `/login` |
| `/login` | Login institucional (mockup) |
| `/role-selector` | Seleccion de perfil: Padre / Profesor / Administrador |
| `/father` | Dashboard del padre de familia |
| `/teacher` | Dashboard del profesor |
| `/admin` | Panel administrativo |
| `/api/health` | Estado de BD + Mail |
| `/api/test-email` | Probar envio de emails (POST) |

---

## Scripts Disponibles

### Desarrollo (sin Docker)

```bash
npm install
npm run dev            # Servidor de desarrollo (http://localhost:3000)
npm run build          # Build de produccion
npm run start          # Servidor de produccion
npm run lint           # Linter
npm run typecheck      # Verificacion de tipos
```

### Docker

```bash
npm run docker:up          # Levantar el stack
npm run docker:down        # Detener el stack
npm run docker:rebuild     # Reconstruir imagen y levantar
npm run docker:logs        # Ver logs en tiempo real
npm run docker:restart     # Reiniciar servicios
npm run docker:tools       # Levantar tambien pgAdmin
npm run docker:clean       # Detener y eliminar volumenes
npm run docker:reset       # Limpiar + levantar desde cero

npm run docker:shell:app   # Shell dentro del contenedor de la app
npm run docker:shell:db    # psql directo en la BD
npm run docker:psql "SELECT 1"  # Ejecutar SQL rapido
```

---

## Integracion con Supabase

El proyecto esta pre-configurado para trabajar con Supabase de dos formas:

### 1. **Supabase local en Docker** (por defecto - recomendado para dev)
Usa la imagen oficial `supabase/postgres:15.8.1.085` con todas las extensiones
de Supabase preinstaladas (uuid-ossp, pgcrypto, citext, etc.).

Las migraciones SQL se aplican automaticamente al crear el contenedor.

### 2. **Supabase Cloud** (produccion)
1. Crea un proyecto en https://supabase.com
2. Copia la URL y las API keys
3. Edita tu `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key
```

### Uso en el codigo

```typescript
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";

// Cliente publico (seguro para el navegador)
const supabase = getSupabase();
const { data, error } = await supabase.from("students").select("*");

// Cliente admin (SOLO server-side, bypassa RLS)
const admin = getSupabaseAdmin();
const { data, error } = await admin.from("users").select("*");
```

### Esquema de la base de datos

Las tablas principales son:

- `users` - Usuarios del sistema (admin, docente, padre)
- `students` - Estudiantes matriculados
- `courses` - Cursos / secciones
- `grades` - Calificaciones por bimestre (con promedio automatico)
- `attendance` - Registro de asistencia diaria
- `enrollments` - Matriculas anuales y pagos
- `announcements` - Avisos y comunicados

Para verlas: conecta con pgAdmin o usa `docker compose exec db psql -U postgres -d ijfk -c "\dt"`

---

## Integracion de Email (SMTP / Gmail)

El envio de emails usa **nodemailer + SMTP**, configurado por defecto para
Gmail. No necesitas dominio propio ni autorizacion de IP: tu Gmail envia a
**cualquier correo**.

> **Lo que la app envia:** codigos de verificacion (registro y recuperacion de
> contraseña). No usa correo corporativo ni plantillas de marketing.

### Configuracion (Gmail)

1. Activa la **verificacion en 2 pasos** de tu Gmail:
   https://myaccount.google.com/security → "Verificacion en 2 pasos"
2. Crea una **contraseña de aplicacion** (16 caracteres):
   https://myaccount.google.com/apppasswords (nombre: "IJFK")
3. Edita tu `.env`:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=tu-cuenta@gmail.com
MAIL_PASSWORD=la-clave-de-16-caracteres
MAIL_FROM=tu-cuenta@gmail.com
MAIL_FROM_NAME=IJFK Sistema Institucional
```

> ⚠️ `MAIL_PASSWORD` debe ser la **app password**, no tu contraseña normal de
> Gmail (Google rechaza la normal con error 535). Si en el futuro usas otro
> proveedor SMTP, solo cambia las variables.

### Uso en el codigo

```typescript
import { sendEmail, emailTemplates } from "@/lib/mail";

// Email simple
await sendEmail({
  to: "padre@ejemplo.com",
  subject: "Bienvenido",
  html: "<h1>Hola</h1>",
});

// Email con plantilla predefinida
const tpl = emailTemplates.welcome("Carlos Perez", "Padre de Familia");
await sendEmail({
  to: "carlos@email.com",
  subject: tpl.subject,
  html: tpl.html,
});
```

### Probar el envio

```bash
# Desde la linea de comandos (con la app levantada)
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@ijfk.local","subject":"Hola","body":"Prueba"}'

# O desde PowerShell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/test-email `
  -ContentType "application/json" `
  -Body '{"to":"test@ijfk.local","subject":"Hola","body":"Prueba"}'
```

Revisa la bandeja del destinatario (los emails de Gmail a veces caen en spam).

---

## Roles y Funcionalidades

### 1. Login
- Pantalla dividida 50/50
- Lado izquierdo: logo institucional
- Lado derecho: formulario de inicio de sesion

### 2. Padre de Familia
- Sidebar: Inicio, Mis Hijos, Notas, Horario, Asistencia, Matricula, Avisos
- Notas por bimestre con tabla y promedio
- Accesos rapidos: Horario, Matricula, Asistencia, Avisos

### 3. Profesor
- Sidebar: Dashboard, Mis Cursos, Registrar Notas, Asistencia, Mi Horario, Materiales, Avisos
- Estadisticas rapidas: cursos, alumnos, promedio, asistencia
- Registrar notas editable por bimestre

### 4. Administrador
- Sidebar completo: Dashboard, Usuarios, Alumnos, Cursos, Notas, Asistencia, Matriculas, Horarios, Avisos, Reportes
- Graficos: asistencia del mes, distribucion de calificaciones
- Acciones rapidas: matricula, registro, reportes, envios de avisos

---

## Paleta de Colores Institucional

| Token | Valor | Uso |
|-------|-------|-----|
| Primary Blue | `#1E2A5E` | Color principal |
| Secondary Blue | `#2C3A7A` | Gradientes |
| Accent Gold | `#F4C15C` | Botones, acentos |
| Background | `#F8FAFC` | Fondo general |
| Text | `#0F172A` | Texto principal |
| Success | `#22C55E` | Badges positivos |

---

## Troubleshooting

### El contenedor de Postgres no arranca
```bash
docker compose logs db
# Si el volumen esta corrupto:
docker compose down -v
docker compose up -d
```

### La app no puede conectar a la BD
Espera 10-15 segundos a que Postgres termine de inicializar (incluye las
migraciones SQL). Puedes comprobar:
```bash
docker compose exec db pg_isready -U postgres
```

### Los emails no llegan
- Comprueba que `MAIL_USER` y `MAIL_PASSWORD` esten en `.env`
- Para Gmail, `MAIL_PASSWORD` debe ser una **app password** (16 caracteres), no
  la contraseña normal. Si usas la normal, Gmail devuelve error 535.
- Revisa spam: los emails de Gmail a veces caen ahi

### Quiero usar mi propia BD de Supabase Cloud
Sobrescribe en `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Reconstruir la imagen de Docker desde cero
```bash
docker compose down
docker image rm ijfk-app
docker compose build --no-cache
docker compose up -d
```

---

## Estado del proyecto (Sprints 7–11)

> **Fecha de cierre:** 06/08/2026 — Sistema listo para uso.

### Sprints completados

| Sprint | Tipo | Resultado |
|--------|------|-----------|
| **7** | Funcionalidad | 3 botones "Nuevo..." (alumno/sección/matrícula) con POST real + 2 menús "Acc." + dashboard docente con próxima clase real |
| **8** | Visual docente | 4 páginas rediseñadas (attendance, materials, schedule, announcements) |
| **9** | Visual padre | 7 páginas rediseñadas (dashboard, students, grades, attendance, schedule, enrollment, announcements) |
| **10** | Visual admin | 5 páginas rediseñadas (dashboard, attendance, grades, schedule, announcements) |
| **11** | Pulido | Paleta unificada + `letter_grade` en 3 vistas + badges sidebar + docs |

### Sistema de diseño

**Paleta de colores (consistente en las 23 páginas):**
- Azul institucional: `#1E2A5E` (texto, headers, acciones primarias)
- Dorado: `#F4C15C` (acentos, día destacado, badges activos)
- Verde: `emerald-500/50/400` (asistencia, aprobaciones, estados óptimos)
- Ámbar: `amber-500/400` (advertencias, tardanzas, estados regulares)
- Rojo: `red-500/400` (errores, faltas, estados críticos)
- Azul claro: `blue-500/400` (información, justificaciones)

**Patrones visuales aplicados:**
- **Día destacado:** ring + barra vertical `#F4C15C` + etiqueta `● HOY`
- **Color por estado:** `border-l-4` en cards y filas de tabla
- **Letter grade:** chips de color A/B/C/D al lado del promedio numérico
- **Expansión animada:** `max-h-96/0 opacity-100/0 transition-all duration-300` con chevron `rotate-180`
- **Badges del sidebar:** rojo para avisos sin leer, ámbar para notas pendientes

### Despliegue manual (paso a paso)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd jfk-connect-main

# 2. Crear el archivo .env desde el ejemplo
cp .env.example .env

# 3. Levantar el stack completo (App + Postgres)
docker compose up -d --build

# 4. Esperar ~30 segundos a que Postgres inicialice las migraciones
docker compose logs -f db
# (esperar a ver "database system is ready to accept connections")

# 5. Poblar la BD con datos demo (idempotente)
docker compose exec app npm run seed

# 6. Hashear las contraseñas de los usuarios seed (si no se hizo en el seed)
docker compose exec app npm run hash-passwords

# 7. Abrir la app
# http://localhost:3000
```

### Despliegue en producción (Linux + Docker)

```bash
# 1. Instalar Docker + Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. Configurar dominio y SSL con Caddy o Nginx (reverse proxy -> :3000)

# 3. Levantar el stack
docker compose -f docker-compose.yml up -d --build

# 4. Configurar backups automáticos del volumen `postgres-data`
# Cron sugerido: pg_dump diario a las 3am
0 3 * * * docker compose exec -T db pg_dump -U postgres postgres | gzip > /backups/ijfk-$(date +\%Y\%m\%d).sql.gz
```

### Credenciales demo

Tras ejecutar `npm run seed`:
- **Admin:** `admin@ijfk.edu.pe` / `Demo2026!`
- **Docente:** `docente1@ijfk.edu.pe` / `Demo2026!`
- **Padre:** `padre1@ijfk.edu.pe` / `Demo2026!`

> Nota: Todos los usuarios seed tienen `must_change_password = true` por seguridad.

### Verificación post-despliegue

```bash
# Typecheck (debe dar 0 errores)
docker compose exec app npm run typecheck

# Logs de la app
docker compose logs -f app

# Probar login en los 3 roles desde el navegador
# - http://localhost:3000/login
# - http://localhost:3000/father (después de login como padre)
# - http://localhost:3000/teacher (después de login como docente)
# - http://localhost:3000/admin (después de login como admin)
```

### Pruebas funcionales sugeridas

1. **Login con los 3 roles** → redirige correctamente al dashboard correspondiente
2. **Reclamo de hijo** (rol padre) → ingresar `enrollment_code` generado por admin
3. **Panel admin → crear alumno/sección/matrícula** → ver aparecer en la lista paginada
4. **Paginación** → navegar entre páginas en admin/students y admin/enrollments
5. **Marcar asistencia** (rol docente) → ver reflejo en vista del padre al cambiar de día
6. **Registrar notas** (rol docente) → ver promedio actualizado en padre y admin

---

## Licencia

Sistema Institucional IJFK - Colegio Industrial John F. Kennedy Chincha.
