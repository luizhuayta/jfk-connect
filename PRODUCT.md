# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuario primario: el padre o madre en casa, fuera del horario escolar, que necesita saber cómo le fue a su hijo hoy — asistencia, notas por competencia y comunicados oficiales — sin esperar la libreta impresa ni un grupo de WhatsApp.

Otros públicos confirmados:

- Docente: registra asistencia, notas por competencia (libreta SIAGIE), materiales y comunicados de su aula.
- Dirección / secretaría (`admin`): matrícula, usuarios, cursos, reportes y operación del colegio.
- Familia que aún no matricula: landing pública de admisión (visita, documentos, entrevista, matrícula). No es el usuario que organiza el producto.

Roles canónicos en la base de datos: `admin | docente | padre`. Los padres se registran solos; docentes y admin los crea el colegio.

## Product Purpose

Sistema institucional de gestión académica del Colegio Industrial John F. Kennedy (Chincha Alta, Ica, Perú). Es el portal oficial del colegio: lo que el docente registra en el día es lo que la familia ve esa misma noche.

Éxito para el padre: entrar con su correo, ver a su hijo (o hijos), y leer asistencia del día, nivel de logro por competencia y comunicados de dirección o tutoría, sin depender de un chat informal.

Nombre corto del producto: **IJFK** / **Sistema Institucional IJFK**. Intranet de autenticación: «Intranet Institucional».

## Positioning

Libreta SIAGIE de verdad (competencias, no un promedio de letras) unida a un portal de familia que sustituye los grupos de WhatsApp para lo oficial. Un SIS genérico o un chat de apoderados no puede afirmar las dos cosas a la vez. La IA, cuando está encendida, solo redacta o lee; no decide notas ni vínculos, y nunca ve la identidad completa de un menor.

## Operating Context

- Educación Básica Regular (EBR) peruana. Año lectivo en cuatro bimestres; la captura de notas abre o cierra por bimestre (hoy 1 y 2 abiertos, 3 y 4 bloqueados hasta que llegue el calendario).
- Libreta oficial SIAGIE: áreas curriculares → competencias → `competency_grades`. Nivel de logro AD / A / B / C a partir de 0–20 (`nivel_logro()` en SQL; espejo en `lib/grades/scale.ts`). SIAGIE no promedia competencias para inventar una nota de área; la letra se imprime por competencia.
- Asistencia del día con estados A / F / T / J (asistió, falta, tardanza, justificado).
- El padre no elige un alumno por ID: reclama al hijo con el **código de matrícula** que le entrega el colegio (`enrollment_code`), hasta cinco hijos. El docente no ve hijos ajenos; el admin opera el padrón.
- La familia usa el portal de noche, en casa, con correo. El docente registra en el colegio o al cerrar la jornada. Dirección opera matrícula y usuarios en secretaría.
- Comunicados de dirección y tutoría viven en el portal, no en WhatsApp.
- Toda la UI, la API, los comentarios y las respuestas de error están en **español**.

## Capabilities and Constraints

Confirmado:

- Portal autenticado en tres paneles: `/father`, `/teacher`, `/admin`. Cookie de sesión httpOnly; el padre se registra; docente y admin los crea el colegio.
- Landing pública (`/`) de admisión y marca institucional, más acceso al portal (`/login`).
- Padres: dashboard, libreta, asistencia, horario, materiales, comunicados, matrícula/vínculo de hijos.
- Docentes: cursos, captura de notas por competencia y conclusiones descriptivas, asistencia, horario, materiales, comunicados, importador de notas.
- Admin: estudiantes, usuarios, matrícula, cursos (incluida asignación), notas, asistencia, comunicados, horario, reportes, importaciones, auditoría de uso de IA (`/admin/ai`).
- Módulo de IA opcional (conclusiones de libreta, OCR del importador, asistente por rol, justificación de asignación de cursos). `AI_ENABLED=0` apaga la IA sin romper el resto.
- Acceso server-side a datos: PostgreSQL directo (`lib/db.ts`), no REST de Supabase.

Abierto / no citar como hecho:

- Teléfono `(056) 000 000`, dirección `Av. Los Libertadores 000` y la campaña «Matrícula 2027» de la landing son placeholders. No usarlos como datos reales del colegio.
- La landing aún menciona notas con letra A–D; el producto real es SIAGIE AD/A/B/C. Tratar A–D como copy desactualizado, no como escala vigente.
- No hay estándar de accesibilidad fijado (WCAG u otro).
- No hay testimonios, cifras de matrícula, ni prueba social reales que se puedan fabricar.

## Brand Commitments

- Colegio Industrial John F. Kennedy, Chincha Alta, Ica, Perú. Sigla **IJFK**.
- Escudo y foto institucional previstos en `public/Image/logo.jpg` y `public/Image/fondo_login.webp` (referenciados por el shell de autenticación). No sustituir por marcas genéricas ni por assets de Next/Vercel.
- Voz: español institucional, segunda persona de respeto con las familias («su hijo»), concreto sobre el día escolar. Sin inglés en UI ni en respuestas de API.
- Identidad visual existente (paleta institucional, landing, paneles) es incumbente; este archivo no la define. Un rediseño exige decisión explícita aparte.

## Evidence on Hand

- Copy y flujos reales de la app: landing (`app/page.tsx`), autenticación (`components/auth/AuthShell.tsx`), paneles padre/docente/admin, libreta SIAGIE (`lib/grades/`, `lib/report/`).
- Datos demo sembrables (credenciales de desarrollo, CSV en `datos/`). No son alumnos ni familias reales; no presentarlos como prueba.
- No hay logo ni foto institucional versionados en el árbol público genérico (`public/*.svg` de Next); los paths de escudo/fondo son los de AuthShell.
- Ausente: testimonios, recortes de prensa, cifras oficiales, teléfono y dirección reales. No inventarlos.

## Product Principles

1. Lo que el docente registra hoy es lo que el padre ve hoy; el portal no es un boletín que se publica al cierre del bimestre.
2. La libreta es SIAGIE: competencias y nivel de logro, no un promedio de letras ni un SIS genérico.
3. Lo oficial del colegio vive aquí; WhatsApp no es canal de comunicados de dirección ni de tutoría.
4. Los menores no se exponen: DNI, email, apellidos completos y códigos de matrícula no salen hacia proveedores de IA.
5. El padre es el centro de la experiencia; docente y admin existen para que esa vista nocturna sea verdadera y completa.
