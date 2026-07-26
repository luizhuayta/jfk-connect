# IJFK Intranet Institucional

Sistema de gestion academica para el **Colegio Industrial John F. Kennedy - Chincha**.

Intranet institucional con diseno y mockups completos de los dashboards principales:
Login, Panel del Padre de Familia, Panel del Profesor y Panel del Administrador.

> **Estado actual:** El proyecto esta dockerizado y listo para trabajar con
> Supabase (PostgreSQL self-hosted) y un servicio de email tipo Mailgun
> (Mailpit para dev, Mailgun para produccion).

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
| Email dev | Mailpit (alternativa moderna a Mailgun) |
| Email prod | Mailgun (compatible con SMTP) |
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

# 3. Levantar los servicios (App + Postgres + Mailpit)
docker compose up -d

# 4. Ver los logs en tiempo real
docker compose logs -f app
```

Despues de unos segundos, tendras disponible:

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **App IJFK** | http://localhost:3000 | - |
| **Mailpit UI** (emails) | http://localhost:8025 | sin auth |
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
    mail.ts                     # Cliente de email (Mailpit/Mailgun)
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

npm run mail:test          # Comprobar que Mailpit responde
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

## Integracion de Email (alternativa a Mailgun)

Se eligio **Mailpit** como reemplazo de Mailgun para desarrollo porque:
- Es 100% compatible con SMTP estandar (no requiere cambiar codigo)
- Tiene una UI web moderna para revisar los emails enviados
- Es muy ligero (imagen ~30 MB)
- API HTTP para integracion
- Evolucion moderna de MailHog (con mejor UI y mas features)

### En desarrollo (Mailpit - incluido en docker-compose)

Los emails enviados se capturan en Mailpit y se pueden revisar en:
**http://localhost:8025** (sin autenticacion)

### En produccion (Mailgun real)

Edita tu `.env` y cambia la configuracion SMTP:

```env
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=postmaster@tu-dominio.mailgun.org
MAIL_PASSWORD=tu-clave-mailgun-secreta
MAIL_FROM=no-reply@tudominio.edu.pe
MAIL_FROM_NAME=IJFK Sistema Institucional
```

Tambien puedes usar **cualquier otro proveedor SMTP** (SendGrid, Resend,
Amazon SES, Postmark, etc.) - solo cambia las variables.

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

# Luego revisa http://localhost:8025
```

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

### Los emails no aparecen en Mailpit
- Comprueba que MAIL_HOST=mailpit en `.env` (no `localhost`!)
- Verifica los logs: `docker compose logs app`
- Abre http://localhost:8025 directamente

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

## Licencia

Sistema Institucional IJFK - Colegio Industrial John F. Kennedy Chincha.
