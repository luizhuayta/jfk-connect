# PLAN FINAL — Proyecto IJFK (Sistema Informático Escolar)

**Estado:** Listo para ejecución por el agente.
**Alcance:** Cerrar todo lo pendiente — funcionalidad incompleta, rediseño visual y pulido final.
**Backend:** Ya operativo al 100%. Este plan NO modifica lógica de negocio, esquema de BD, ni datos existentes.

---

## 0. CONTEXTO — Qué ya funciona

**Backend (100% operativo)**
- 17 rutas de API (admin, father, teacher, auth, announcements), todas responden 200.
- Datos reales cargados: 2,090 alumnos, 130 docentes, 780 cursos, 49k notas, 133k registros de asistencia.
- Seguridad: JWT, middleware por rol, rate limiting, CSRF, logging, RLS.
- Paginación server-side en `admin/students` y `admin/enrollments`.
- Letter grade (A/B/C/D) implementado en BD (trigger) y en UI (helper).
- CRUD completo de avisos (crear/editar/eliminar) para admin.
- Flujo de reclamo de alumno por `enrollment_code` (límite de 5 hijos por apoderado).

**Frontend (funcional, pendiente de pulido)**
- Todas las páginas cargan datos reales (fetch → render).
- Ya rediseñadas: `teacher/page`, `teacher/courses`, `teacher/grades`.
- Pendientes de rediseño: 16 páginas.
- 3 botones "Nuevo..." son decorativos (no abren modal ni ejecutan acción) — **los tres pasan a implementarse con función real** (ver Sprint 7).
- 2 placeholders sin conectar en el dashboard docente (próxima clase, pendientes de hoy).

---

## 1. REGLAS QUE EL AGENTE DEBE RESPETAR EN TODO EL PROYECTO

No tocar bajo ningún sprint:
- Lógica de negocio de las rutas de API existentes.
- Middlewares: rate limiting, CSRF, logging.
- Esquema de base de datos (migraciones 001–005 ya aplicadas).
- `seed-full.mjs` (los datos ya están cargados).
- Cálculos existentes (promedios, asistencia, etc.).

Al final de cada sprint: correr typecheck y verificación en runtime antes de pasar al siguiente.

---

## 2. SPRINTS — Acciones separadas por bloque

### 🔧 SPRINT 7 — Funcionalidad faltante (botones + TODOs)
**Duración estimada:** 70 min
**Objetivo:** Que todo botón visible haga lo que dice, con acción real conectada al backend, y cerrar los 2 TODOs del dashboard docente.
**Depende de:** nada (primer sprint).

| # | Acción | Dónde |
|---|--------|-------|
| 7.1 | Modal "Nuevo alumno" (DNI, nombre, grado, sección, turno) + endpoint `POST` que lo crea en BD | `admin/students/page.tsx` + `app/api/admin/students/route.ts` (nuevo POST) |
| 7.2 | Modal "Nueva sección" (grado, sección, aula, turno) + endpoint `POST` que crea la relación grado/sección | `admin/courses/page.tsx` + `app/api/admin/sections/route.ts` (nuevo POST) |
| 7.3 | Modal "Nueva matrícula" (selecciona alumno existente, genera matrícula) + endpoint `POST` que la crea con código único | `admin/enrollment/page.tsx` + `app/api/admin/enrollments/route.ts` (nuevo POST) |
| 7.4 | Menú "Acc." (3 puntos) en admin/students: ver detalle / desvincular apoderado / cambiar estado | `admin/students/page.tsx` |
| 7.5 | Menú "Acc." en admin/enrollment: editar pagos + endpoint `PATCH` + ver detalle | `admin/enrollment/page.tsx` + `app/api/admin/enrollments/[id]/route.ts` (nuevo PATCH) |
| 7.6 | Conectar "Próxima clase" del dashboard docente con `/api/teacher/schedule` (dato real) | `app/teacher/page.tsx` |
| 7.7 | Simplificar "Pendientes de hoy: asistencia" a un link directo (sin nuevo endpoint) | `app/teacher/page.tsx` |
| 7.8 | Typecheck + prueba en runtime | — |

**Checklist de cierre del sprint:**
- [ ] El modal "Nuevo alumno" crea el registro y aparece en la lista paginada.
- [ ] El modal "Nueva sección" crea la sección y aparece en la lista de cursos.
- [ ] El modal "Nueva matrícula" genera una matrícula real con código único para un alumno existente.
- [ ] El menú "Acc." abre y ejecuta sus opciones en admin/students y admin/enrollment.
- [ ] El dashboard docente muestra la próxima clase real según el horario.
- [ ] Typecheck: 0 errores.

---

### 🎨 SPRINT 8 — Rediseño visual: Docente (páginas restantes)
**Duración estimada:** 70 min
**Objetivo:** Rediseñar las 4 páginas del rol docente que faltan, con el mismo lenguaje visual usado en dashboard/cursos/notas.
**Depende de:** Sprint 7.

| # | Acción | Dónde |
|---|--------|-------|
| 8.1 | Rediseñar attendance: selectores compactos, color condicional por estado, tabla más limpia | `teacher/attendance` |
| 8.2 | Rediseñar materials: tarjetas de archivo, filtros, modal de subida con estilo drag-drop | `teacher/materials` |
| 8.3 | Rediseñar schedule: grid compacto, leyenda, día actual destacado | `teacher/schedule` |
| 8.4 | Rediseñar announcements: cards con color por categoría, expansión animada | `teacher/announcements` |
| 8.5 | Typecheck + prueba en runtime | — |

**Checklist de cierre del sprint:**
- [ ] Las 4 páginas cargan datos reales y mantienen consistencia visual con el resto del sistema.
- [ ] Ninguna llamada a API ni cálculo se vio afectado.
- [ ] Typecheck: 0 errores.

---

### 🎨 SPRINT 9 — Rediseño visual: Padre (todas las páginas)
**Duración estimada:** 80 min
**Objetivo:** Rediseñar las 7 páginas del rol padre.
**Depende de:** Sprint 7 (independiente de Sprint 8).

| # | Acción | Dónde |
|---|--------|-------|
| 9.1 | Rediseñar dashboard: stats con color, sección de pendientes, accesos reordenados | `father/page` |
| 9.2 | Rediseñar students: cards de hijos con letter_grade en el promedio | `father/students` |
| 9.3 | Rediseñar grades: selectores compactos, promedio con letra, tabla limpia | `father/grades` |
| 9.4 | Rediseñar attendance: calendario compacto, stats con color condicional | `father/attendance` |
| 9.5 | Rediseñar schedule: grid compacto, día actual destacado | `father/schedule` |
| 9.6 | Rediseñar enrollment: progreso de documentos, estado con color, datos ordenados | `father/enrollment` |
| 9.7 | Rediseñar announcements: mismo estilo aplicado en teacher/announcements | `father/announcements` |
| 9.8 | Typecheck + prueba en runtime | — |

**Checklist de cierre del sprint:**
- [ ] Las 7 páginas cargan datos reales y son consistentes visualmente entre sí.
- [ ] El modal de reclamo de hijo sigue funcionando sin cambios de lógica.
- [ ] Letter grade visible en father/grades y father/students.
- [ ] Typecheck: 0 errores.

---

### 🎨 SPRINT 10 — Rediseño visual: Admin (páginas restantes)
**Duración estimada:** 70 min
**Objetivo:** Rediseñar las 5 páginas del rol admin que faltan.
**Depende de:** Sprint 7 (independiente de Sprint 9).

| # | Acción | Dónde |
|---|--------|-------|
| 10.1 | Rediseñar dashboard: stats con color, gráficos, accesos rápidos | `admin/page` |
| 10.2 | Rediseñar attendance: selectores compactos, tabla limpia, color condicional | `admin/attendance` |
| 10.3 | Rediseñar grades: selectores compactos, tabla con letter_grade, color condicional | `admin/grades` |
| 10.4 | Rediseñar schedule: secciones convertidas a grid, día destacado | `admin/schedule` |
| 10.5 | Aplicar paleta unificada de colores en announcements (el CRUD ya existe, no tocar lógica) | `admin/announcements` |
| 10.6 | Typecheck + prueba en runtime | — |

**Checklist de cierre del sprint:**
- [ ] Las 5 páginas cargan datos reales y son consistentes visualmente.
- [ ] La paginación en admin/students y admin/enrollments sigue funcionando.
- [ ] Typecheck: 0 errores.

---

### ✅ SPRINT 11 — Pulido final + documentación
**Duración estimada:** 40 min
**Objetivo:** Consistencia global, actualizar documentación, reconstrucción y prueba final.
**Depende de:** Sprints 7, 8, 9 y 10 (debe ir al final).

| # | Acción | Dónde |
|---|--------|-------|
| 11.1 | Revisar que todas las páginas usen la misma paleta de colores de íconos | — |
| 11.2 | Revisar que letter_grade aparezca en todas las vistas de notas (father/teacher/admin) | — |
| 11.3 | Revisar que los badges del sidebar (avisos + notas pendientes) funcionen correctamente | — |
| 11.4 | Actualizar estado final en `PLAN_REFINAMIENTO.md` | `PLAN_REFINAMIENTO.md` |
| 11.5 | Actualizar estado final del proyecto en `MEJORAS_PENDIENTES.md` | `MEJORAS_PENDIENTES.md` |
| 11.6 | Actualizar `README.md` con instrucciones de despliegue | `README.md` |
| 11.7 | Reconstruir contenedor: `docker compose up -d --build app` | — |
| 11.8 | Prueba completa final: login en los 3 roles, reclamo de hijo, panel admin (crear alumno/sección/matrícula), paginación, rediseños | — |
| 11.9 | Typecheck final | — |

**Checklist de cierre del sprint:**
- [ ] Todas las páginas son consistentes en estilo, sin estilos sueltos fuera de la paleta.
- [ ] Letter grade presente en las 3 vistas de notas (father, teacher, admin).
- [ ] Badges del sidebar funcionando.
- [ ] Documentación actualizada (3 archivos).
- [ ] Typecheck: 0 errores.
- [ ] Docker reconstruido y todo el sistema operativo.

---

## 3. MAPA DE DEPENDENCIAS

```
SPRINT 7 (funcionalidad)
   ├──> SPRINT 8 (rediseño docente)   ─┐
   ├──> SPRINT 9 (rediseño padre)      ├──> SPRINT 11 (pulido + docs)
   └──> SPRINT 10 (rediseño admin)    ─┘
```
Los Sprints 8, 9 y 10 son independientes entre sí y pueden ejecutarse en cualquier orden (o en paralelo), pero todos requieren que el Sprint 7 esté cerrado primero. El Sprint 11 va siempre al final.

---

## 4. ARCHIVOS INVOLUCRADOS POR SPRINT

**Sprint 7 — nuevos (4)**
- `app/api/admin/students/route.ts` (agregar método POST — crear alumno)
- `app/api/admin/sections/route.ts` (nuevo — POST crear sección)
- `app/api/admin/enrollments/route.ts` (nuevo — POST crear matrícula)
- `app/api/admin/enrollments/[id]/route.ts` (agregar método PATCH — editar pagos)

**Sprint 7 — modificados (5)**
- `app/admin/students/page.tsx` (modal crear alumno + menú Acc.)
- `app/admin/enrollment/page.tsx` (modal crear matrícula + menú Acc.)
- `app/admin/courses/page.tsx` (modal crear sección)
- `app/teacher/page.tsx` (próxima clase real + link de asistencia)
- `lib/schemas.ts` (nuevos schemas de validación para alumno/sección/matrícula)

**Sprint 8 — modificados (4)**
- `app/teacher/attendance/page.tsx`
- `app/teacher/materials/page.tsx`
- `app/teacher/schedule/page.tsx`
- `app/teacher/announcements/page.tsx`

**Sprint 9 — modificados (7)**
- `app/father/page.tsx`
- `app/father/students/page.tsx`
- `app/father/grades/page.tsx`
- `app/father/attendance/page.tsx`
- `app/father/schedule/page.tsx`
- `app/father/enrollment/page.tsx`
- `app/father/announcements/page.tsx`

**Sprint 10 — modificados (5)**
- `app/admin/page.tsx`
- `app/admin/attendance/page.tsx`
- `app/admin/grades/page.tsx`
- `app/admin/schedule/page.tsx`
- `app/admin/announcements/page.tsx`

**Sprint 11 — modificados (3)**
- `PLAN_REFINAMIENTO.md`
- `MEJORAS_PENDIENTES.md`
- `README.md`

---

## 5. LO QUE NUNCA SE DEBE TOCAR

- Rutas de API existentes (no cambiar lógica de negocio).
- Middlewares: rate limiting, CSRF, logging.
- Esquema de base de datos (migraciones 001–005).
- `seed-full.mjs`.
- Lógica de cálculo (promedios, asistencia, etc.).

---

## 6. TIEMPO ESTIMADO TOTAL

| Sprint | Estimado |
|--------|----------|
| 7 — Funcionalidad faltante | 70 min |
| 8 — Rediseño docente (resto) | 70 min |
| 9 — Rediseño padre | 80 min |
| 10 — Rediseño admin (resto) | 70 min |
| 11 — Pulido + documentación | 40 min |
| **Total** | **~5.5 horas** |

---

*Plan reorganizado para ejecución directa por el agente. Cada sprint es una unidad cerrable con su propio checklist de verificación.*
