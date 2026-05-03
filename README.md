# IJFK Intranet Institucional

Sistema de gestion academica para el **Colegio Industrial John F. Kennedy - Chincha**.

Proyecto de intranet institucional que incluye el diseno y maquetado completo (mockups) de los dashboards principales: Login, Panel del Padre de Familia, Panel del Profesor y Panel del Administrador. Todos los datos visualizados son de prueba con fines de demostracion del flujo de usuario y la interfaz.

---

## Stack Tecnologico

| Categoria | Tecnologia |
|-----------|-----------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Componentes UI | shadcn/ui |
| Graficos | Recharts |
| Iconos | Lucide React |

---

## Estructura de Carpetas

```
app/
  (auth)/login/page.tsx        # Pagina de inicio de sesion
  father/                      # Dashboard del padre de familia
  teacher/                     # Dashboard del profesor
  admin/                       # Panel administrativo
  role-selector/page.tsx       # Selector de perfil de usuario
  layout.tsx                   # Layout raiz
  globals.css                  # Tokens de color institucional
  page.tsx                     # Redireccion a login

components/
  ui/                          # Componentes shadcn/ui
  layout/                      # Navbar, Sidebars por rol
  dashboard/father/            # Componentes del dashboard padre
  dashboard/teacher/           # Componentes del dashboard profesor
  dashboard/admin/             # Componentes del dashboard admin
  auth/LoginPage.tsx           # Pagina de login
  common/                      # Componentes reutilizables

data/
  mock.ts                      # Datos de prueba (estudiantes, cursos, notas, etc.)

public/Image/
  logo.jpg                     # Logo institucional
  fondo_login.webp             # Fondo del login
```

---

## Flujo de Rutas

| Ruta | Descripcion |
|------|-------------|
| `/` | Redireccion a `/login` |
| `/login` | Login institucional split-screen (logo + imagen de fondo) |
| `/role-selector` | Seleccion de perfil: Padre / Profesor / Administrador |
| `/father` | Dashboard del padre de familia |
| `/teacher` | Dashboard del profesor |
| `/admin` | Panel administrativo |

---

## Roles y Funcionalidades (Mockups / Diseno UI)

### 1. Login
- Pantalla dividida 50/50
- Lado izquierdo: logo institucional, nombre del colegio, ubicacion y titulo de intranet sobre fondo difuminado
- Lado derecho: formulario de inicio de sesion sobre imagen de fondo con overlay oscuro

### 2. Padre de Familia
- Navbar fijo con buscador, notificaciones y avatar
- Sidebar: Inicio, Mis Hijos, Notas, Horario, Asistencia, Matricula, Avisos
- Mis Hijos: tarjetas con avatar, nombre, grado/seccion y boton de detalle
- Notas Recientes: tabs por bimestre, tabla de cursos con notas, nivel y observaciones
- Promedio del bimestre con indicador visual
- Accesos rapidos: Horario, Matricula, Asistencia, Avisos

### 3. Profesor
- Navbar fijo adaptado a rol docente
- Sidebar: Dashboard, Mis Cursos, Registrar Notas, Asistencia, Mi Horario, Materiales, Avisos
- Estadisticas rapidas: Mis Cursos, Total Alumnos, Promedio General, Asistencia Promedio
- Mis Cursos Actuales: tarjetas con seccion, cantidad de estudiantes y boton Gestionar
- Registrar Notas Rapido: selector de curso/seccion, tabla editable (Nota 1, 2, 3, Promedio, Observacion)
- Proximas Clases + Actividad Reciente

### 4. Administrador
- Navbar fijo con busqueda global y perfil de administrador
- Sidebar: Dashboard, Usuarios, Alumnos, Cursos y Secciones, Notas, Asistencia, Matriculas y Pagos, Horarios, Avisos, Reportes
- Estadisticas globales: Total Alumnos, Profesores, Padres Registrados, Tasa de Asistencia
- Graficos: Asistencia del Mes (barras) y Distribucion de Calificaciones (donut)
- Tabs: Ultimas Notas Cargadas, Avisos Pendientes, Proximos Eventos
- Acciones Rapidas: Nueva Matricula, Registrar Usuario, Generar Reporte, Enviar Aviso

---

## Paleta de Colores Institucional

| Token | Valor | Uso |
|-------|-------|-----|
| Primary Blue | `#1E2A5E` | Color principal, encabezados, sidebar activo |
| Secondary Blue | `#2C3A7A` | Gradientes, elementos secundarios |
| Accent Gold | `#F4C15C` | Botones de accion, acentos, promedios |
| Background | `#F8FAFC` | Fondo general de la aplicacion |
| Text | `#0F172A` | Texto principal |
| Success | `#22C55E` | Badges positivos, indicadores de nivel AD |

---

## Ejecucion Local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Nota Importante

Este proyecto corresponde a la **fase de diseno y mockups UI** del sistema institucional. Todas las vistas utilizan datos mock (simulados) para representar el flujo completo de usuario. La integracion con backend, autenticacion real y persistencia de datos corresponde a una etapa posterior de desarrollo.

---

## Licencia

Sistema Institucional IJFK - Colegio Industrial John F. Kennedy Chincha.
