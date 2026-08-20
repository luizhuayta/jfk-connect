/**
 * IJFK - Seed a escala real (~2,000 alumnos + 130 docentes)
 * =============================================================================
 * Uso:
 *   node scripts/seed-full.mjs            → idempotente (ON CONFLICT DO NOTHING)
 *   node scripts/seed-full.mjs --clean    → borra datos demo explícitos primero
 *
 * Genera (catálogo leído en vivo de curricular_areas/competencies — migración
 * 00000000000008_competencias.sql, requiere haber corrido `docker:reset` al
 * menos una vez sobre un volumen que la incluya):
 *   - 130 docentes (11 áreas curriculares, repartidos proporcional a horas) + subject/area_id + shift_preference
 *   - ~2,000 alumnos (65 secciones × 25-39) con enrollment_code único
 *   - 715 cursos (65 secciones × 11 áreas) con teacher_id asignado
 *   - 65 tutores de sección (el docente de DPCC de cada sección)
 *   - ~127,000 notas por competencia (competency_grades: 29 de área + 2
 *     transversales × 2 bimestres por alumno activo)
 *   - ~130,000 asistencias (marzo-mayo 2026)
 *   - ~2,000 matrículas con docs/tutor/classroom
 *   - ~2,275 entradas de horario (65 secciones × 35 slots)
 *   - 11 avisos (7 generales + 4 docentes)
 *
 * Credenciales: todos los docentes entran con "Demo2026!"
 * No crea padres — los padres se registran solos vía el flujo de registro.
 */

import pg from "pg";
import crypto from "node:crypto";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://supabase_admin:ijfk_dev_password@localhost:54322/ijfk";

const DEMO_PASSWORD = "Demo2026!";
const CLEAN = process.argv.includes("--clean");

// ─── scrypt (mismo formato que lib/password.ts) ──────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// ─── UUIDs deterministas ─────────────────────────────────────────────────────
const id = (n) => `00000000-0000-4000-a000-${n.toString(16).padStart(12, "0")}`;

// ─── Helper de inserción masiva ──────────────────────────────────────────────
async function insertMany(client, table, cols, rows, chunkSize = 1000) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    const values = [];
    const tuples = slice.map((row, r) => {
      const ph = cols.map((_, c) => `$${r * cols.length + c + 1}`);
      values.push(...row);
      return `(${ph.join(", ")})`;
    });
    await client.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES ${tuples.join(", ")} ON CONFLICT (id) DO NOTHING`,
      values,
    );
  }
}

// ─── Constantes ──────────────────────────────────────────────────────────────
// El catálogo de áreas/competencias YA NO vive aquí — se lee en vivo de
// curricular_areas/competencies (migración 008), fuente de verdad única
// compartida con la app. Solo queda el reparto de docentes por área
// (decisión de producto, no dato del catálogo): proporcional a horas
// semanales, sumando exactamente los 130 docentes de siempre.
const TEACHER_COUNTS_BY_CODE = {
  MAT: 22, COM: 22, CYT: 16,
  CCSS: 11, DPCC: 11, ING: 11,
  EDF: 8, ART: 8,
  REL: 7, EPT: 7, CSL: 7,
};

const GRADES = [
  { label: "1ro", num: 1 }, { label: "2do", num: 2 },
  { label: "3ro", num: 3 }, { label: "4to", num: 4 },
  { label: "5to", num: 5 },
];
const SECTIONS = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
// Turno Mañana y turno Tarde son bloques horarios reales distintos (no el
// mismo 7:45-13:20 reetiquetado) — antes las secciones "Tarde" (G-M)
// guardaban el mismo texto de hora que las de "Mañana", así que el horario
// de un docente con secciones de ambos turnos se veía ilógico (una clase
// "Tarde" apareciendo a las 8:30 am). El turno Tarde arranca 10 min después
// de que termina el turno Mañana, con la misma estructura (7 bloques de 45
// min + un recreo de 20 min tras el 3er bloque).
const PERIODS_MAÑANA = ["7:45 - 8:30","8:30 - 9:15","9:15 - 10:00","10:20 - 11:05","11:05 - 11:50","11:50 - 12:35","12:35 - 13:20"];
const PERIODS_TARDE  = ["13:30 - 14:15","14:15 - 15:00","15:00 - 15:45","16:05 - 16:50","16:50 - 17:35","17:35 - 18:20","18:20 - 19:05"];
const RECESS_TIME = { Mañana: "10:00 – 10:20", Tarde: "15:45 – 16:05" };
function periodsForShift(shift) {
  return shift === "Tarde" ? PERIODS_TARDE : PERIODS_MAÑANA;
}

const DOC_LABELS = [
  "DNI del alumno", "Partida de nacimiento", "Libreta de notas anterior",
  "Ficha de matrícula firmada", "Foto 3×4 (2 unidades)",
  "Carnet de vacunación", "Certificado médico",
];

// Nombres peruanos para generar alumnos
const FIRST_NAMES = [
  "Ana","Luis","María","Carlos","Sofía","Juan","Valeria","Diego","Camila","Andrés",
  "Lucía","Pedro","Isabella","Sebastián","Daniela","Fernando","Gabriela","Ricardo",
  "Alejandra","Miguel","Patricia","Javier","Carolina","Manuel","Rosa","Eduardo",
  "Mónica","Raúl","Cristina","Jorge","Laura","Tomás","Andrea","Felipe","Paola",
  "Bruno","Fernanda","Víctor","Claudia","Óscar",
];
const LAST_NAMES = [
  "Quispe","Mamani","Huamán","Cáceres","Flores","Ramos","Torres","Mendoza",
  "Castillo","Espinoza","Herrera","Paredes","Salas","Gutiérrez","Vargas",
  "Lazo","Ccoyo","Cárdenas","Villanueva","Condori","Ticona","Huallpa",
  "Ccopa","Ccahuana","Pilco","Ccari","Apaza","Yupanqui","Maquera","Pino",
  "Chino","Olivera","Miranda","Gamarra","Benites","Colque","Neyra","Arroyo",
  "Soto","Zamora",
];

// Frases de conclusión descriptiva por competencia (1 de cada 4 notas la
// lleva — el resto queda solo con el nivel, como en la libreta real).
const CONCLUSIONS = [
  "Demuestra un manejo sólido de la competencia.",
  "Evidencia avances constantes en su desempeño.",
  "Necesita reforzar aspectos clave de esta competencia.",
  "Participa activamente y muestra iniciativa.",
  "Requiere acompañamiento más cercano.",
  "Logra los aprendizajes esperados con autonomía.",
  "Se encuentra en proceso de consolidar la competencia.",
  "Destaca por su compromiso y dedicación.",
  "Debe fortalecer la práctica constante.",
  "Alcanza un desempeño satisfactorio.",
  "Presenta dificultades que requieren refuerzo.",
  "Sobresale con un desempeño destacado.",
];

// Emails demo a borrar en --clean (lista EXPLÍCITA, no NOT IN) — de un seed
// demo anterior más pequeño, distinto al de este script.
const DEMO_EMAILS = [
  "mgonzalez@ijfk.edu.pe","ccaceres@ijfk.edu.pe","lquispe@ijfk.edu.pe",
  "jtorres@ijfk.edu.pe","sflores@ijfk.edu.pe","psalas@ijfk.edu.pe",
  "aparedes@ijfk.edu.pe","mmendoza@ijfk.edu.pe","bramos@ijfk.edu.pe",
  "dcastro@ijfk.edu.pe","cperez@gmail.com","rvega@gmail.com",
  "jespinoza@hotmail.com","mlara@gmail.com","ihuanca@gmail.com",
  "aquispe@outlook.com","galvarado@gmail.com","sflores2@gmail.com",
  "maria@ijfk.edu.pe","killj4981@gmail.com","juan@ijfk.edu.pe",
];

// ─── Avisos (reutilizados del seed demo) ─────────────────────────────────────
const ANNOUNCEMENTS = [
  { n: 40001, category: "urgente", title: "Simulacro de sismo – Jueves 14 de mayo", body: "Se realizará un simulacro de evacuación ante sismo el día jueves 14 de mayo a las 10:00 a.m. Se solicita a los padres de familia informar a sus hijos sobre la importancia de este ejercicio.", sender: "Dirección", date: "2026-05-08", read: false, audience: "todos" },
  { n: 40002, category: "importante", title: "Reunión de padres de familia – 5to grado", body: "Se convoca a los apoderados de 5to grado a la reunión el lunes 18 de mayo a las 17:00 hrs. en el auditorio principal.", sender: "Coordinación Académica", date: "2026-05-07", read: false, audience: "5to" },
  { n: 40003, category: "importante", title: "Exámenes de recuperación – Bimestre 2", body: "Los alumnos con cursos desaprobados en el Bimestre 2 deberán presentarse a los exámenes los días 20 y 21 de mayo.", sender: "Secretaría Académica", date: "2026-05-06", read: true, audience: "todos" },
  { n: 40004, category: "general", title: "Campeonato interno de fulbito", body: "Inscripciones abiertas. Equipos de 7 integrantes. Registrarse con el Prof. Huamán hasta el 15 de mayo.", sender: "Comité Deportivo", date: "2026-05-05", read: true, audience: "todos" },
  { n: 40005, category: "informativo", title: "Actualización de datos de contacto", body: "Verificar y actualizar datos en Secretaría de lunes a viernes de 8:00 a 13:00 hrs.", sender: "Secretaría General", date: "2026-05-02", read: true, audience: "padres" },
  { n: 40006, category: "general", title: "Día del Logro – Exposición de proyectos", body: "El 28 de mayo los alumnos presentarán sus proyectos. Invitamos a los padres a participar como público.", sender: "Dirección", date: "2026-04-28", read: true, audience: "todos" },
  { n: 40007, category: "importante", title: "Entrega de libretas – Bimestre 1", body: "Sábado 26 de abril de 8:00 a 11:00 hrs. Presencia obligatoria del apoderado.", sender: "Dirección", date: "2026-04-20", read: true, audience: "todos" },
  { n: 40008, category: "urgente", title: "Entrega de actas – Bimestre 2", body: "Plazo: viernes 15 de mayo a las 13:00 hrs. en Secretaría Académica con firma y sello.", sender: "Dirección", date: "2026-05-09", read: false, audience: "docentes" },
  { n: 40009, category: "importante", title: "Reunión de docentes – Planificación B3", body: "Lunes 18 de mayo a las 14:30 hrs. en la sala de profesores. Traer unidad didáctica del B3.", sender: "Coordinación Pedagógica", date: "2026-05-08", read: false, audience: "docentes" },
  { n: 40010, category: "informativo", title: "Capacitación: portal institucional", body: "Miércoles 14 de mayo de 15:00 a 17:00 hrs. en el laboratorio de cómputo. Voluntaria pero recomendada.", sender: "Unidad de Tecnología", date: "2026-05-06", read: true, audience: "docentes" },
  { n: 40011, category: "general", title: "Cronograma de visitas al aula – Supervisión B2", body: "Visitas del 13 al 17 de mayo. Cronograma publicado en la sala de profesores.", sender: "Coordinación Académica", date: "2026-05-05", read: true, audience: "docentes" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function shiftForSection(sectionLetter) {
  return sectionLetter <= "F" ? "Mañana" : "Tarde";
}

function schoolDays(year, month) {
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function detRandom(seed, ...mods) {
  let r = seed;
  for (const m of mods) r = (r * 31 + m * 17) % 100000;
  return r;
}

function genScore(studentIdx, competencyId, bimester) {
  const r = detRandom(studentIdx + 1, competencyId, bimester);
  // Distribución centrada en 13-14, rango 5-20
  const base = 13 + ((r % 100) - 50) / 10;
  return Math.max(0, Math.min(20, Math.round(base * 2) / 2));
}

function genAttendanceStatus(studentIdx, dayIdx) {
  const r = (studentIdx * 37 + dayIdx * 13) % 100;
  if (r < 4) return "F";
  if (r < 7) return "T";
  if (r < 9) return "J";
  return "A";
}

function genName(studentIdx) {
  const fn = FIRST_NAMES[studentIdx % FIRST_NAMES.length];
  const ln1 = LAST_NAMES[(studentIdx * 3) % LAST_NAMES.length];
  const ln2 = LAST_NAMES[(studentIdx * 7 + 3) % LAST_NAMES.length];
  return `${fn} ${ln1} ${ln2}`;
}

function genInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function buildDocs(submitted) {
  return JSON.stringify(DOC_LABELS.map((label, i) => ({ label, submitted: i < submitted })));
}

function sectionRoom(gradeNum, sectionIdx) {
  return `${gradeNum}0${String(sectionIdx + 1).padStart(2, "0")}`;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`[seed-full] Conectado. Modo: ${CLEAN ? "--clean" : "idempotente"}`);

  // ── Preflight: el catálogo (migración 008) debe existir ANTES de tocar
  // nada — las migraciones solo corren en un volumen nuevo, así que si
  // alguien reusa un volumen viejo esto fallaría a mitad de transacción con
  // un error de FK poco claro. Se aborta con un mensaje accionable.
  const areasR = await client.query(
    "SELECT id, code, name, is_transversal, hours_per_week FROM curricular_areas WHERE active ORDER BY display_order",
  );
  if (areasR.rows.length === 0) {
    console.error(
      "[seed-full] ✘ El catálogo (curricular_areas) está vacío. Falta la migración 008.\n" +
      "  Ejecuta `npm run docker:reset` (las migraciones solo corren en un volumen nuevo) y vuelve a intentar.",
    );
    await client.end();
    process.exitCode = 1;
    return;
  }
  const compR = await client.query(
    "SELECT id, area_id, code, name FROM competencies WHERE active ORDER BY area_id, display_order",
  );

  const areas = areasR.rows;
  const realAreas = areas.filter((a) => !a.is_transversal);
  const transversalCompetencies = compR.rows.filter(
    (c) => areas.find((a) => a.id === c.area_id)?.is_transversal,
  );
  const competenciesByArea = new Map();
  for (const c of compR.rows) {
    const list = competenciesByArea.get(c.area_id) ?? [];
    list.push(c);
    competenciesByArea.set(c.area_id, list);
  }

  const passwordHash = hashPassword(DEMO_PASSWORD);

  try {
    await client.query("BEGIN");

    // ── Limpieza (solo --clean) ──────────────────────────────────────────
    if (CLEAN) {
      console.log("[seed-full] Borrando datos demo...");
      await client.query("DELETE FROM competency_grades");
      await client.query("DELETE FROM section_tutors");
      // `grades` puede ya no existir (migración 009 la renombra a
      // grades_legacy) — este seed nunca la escribe, así que basta con no
      // tocarla si sigue ahí sobre un volumen que aún no tiene la 009.
      await client.query(`
        DO $do$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'grades' AND relkind = 'r') THEN
            EXECUTE 'DELETE FROM grades';
          END IF;
        END $do$;
      `);
      await client.query("DELETE FROM attendance");
      await client.query("DELETE FROM enrollments");
      await client.query("DELETE FROM schedule_entries");
      await client.query("DELETE FROM materials");
      await client.query("DELETE FROM announcements");
      await client.query("DELETE FROM courses");
      await client.query("DELETE FROM students");
      // Borrar SOLO usuarios demo conocidos (NO borrar padres reales)
      for (const email of DEMO_EMAILS) {
        await client.query("DELETE FROM users WHERE email = $1", [email]);
      }
      // Docentes generados por este script (cualquier catálogo, viejo o
      // nuevo): siguen el patrón d<código-área><NN>@ijfk.edu.pe.
      await client.query(
        "DELETE FROM users WHERE role = 'docente' AND email ~ '^d[a-z]+[0-9]{2}@ijfk\\.edu\\.pe$'",
      );
      // Asegurar que los 2 admins tengan password scrypt
      await client.query(
        "UPDATE users SET password_hash = $1 WHERE role = 'admin' AND password_hash IS NULL",
        [passwordHash],
      );
      console.log("[seed-full] Limpieza completada.");
    }

    // ── 1. Docentes (130, repartidos por área) ───────────────────────────
    console.log("[seed-full] Generando 130 docentes...");
    const teacherRows = [];
    let teacherN = 201;
    const teachersByArea = {}; // area.id → [{id, name, email, shiftPref}, ...]

    for (const area of realAreas) {
      const count = TEACHER_COUNTS_BY_CODE[area.code] ?? 0;
      const abbr = area.code.toLowerCase();
      teachersByArea[area.id] = [];

      for (let i = 0; i < count; i++) {
        const tid = id(teacherN);
        const teacherIdx = teacherN - 201;
        const fn = FIRST_NAMES[teacherIdx % FIRST_NAMES.length];
        const ln = LAST_NAMES[(teacherIdx * 5) % LAST_NAMES.length];
        const fullName = `Prof. ${fn} ${ln}`;
        const email = `d${abbr}${String(i + 1).padStart(2, "0")}@ijfk.edu.pe`;
        const shiftR = detRandom(teacherN, 99) % 10;
        const shiftPref = shiftR < 6 ? "Ambos" : shiftR < 8 ? "Mañana" : "Tarde";

        teacherRows.push([tid, email, fullName, "docente", null, true, passwordHash, area.name, area.id, shiftPref]);
        teachersByArea[area.id].push({ id: tid, name: fullName, email, shiftPref });
        teacherN++;
      }
    }

    await insertMany(client, "users",
      ["id","email","full_name","role","phone","is_active","password_hash","subject","area_id","shift_preference"],
      teacherRows, 200);
    console.log(`[seed-full]   ${teacherRows.length} docentes insertados`);

    // ── 2. Alumnos (~2,000) ──────────────────────────────────────────────
    console.log("[seed-full] Generando alumnos...");
    const studentRows = [];
    const sectionStudents = {}; // "grade|section" → [{id, idx}]
    let studentN = 10001;
    let studentIdx = 0;
    let enrollmentSeq = 1;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const shift = shiftForSection(section);
        const key = `${grade.label}|${section}`;
        sectionStudents[key] = [];

        // 25-39 alumnos por sección (determinista)
        const numStudents = 25 + (detRandom(grade.num, secI) % 15);

        for (let i = 0; i < numStudents; i++) {
          const sid = id(studentN);
          const name = genName(studentIdx);
          const initials = genInitials(name);
          const dni = `7451${String(10000 + studentIdx).slice(-5)}`;
          const enrollmentCode = `2026-${grade.num}${section}-${String(enrollmentSeq).padStart(4, "0")}`;
          const status = studentIdx % 50 === 49 ? "retirado" : "activo";
          const enrolledDay = 10 + (detRandom(studentN) % 7);

          studentRows.push([
            sid, dni, name, initials, grade.label, grade.num, section, shift,
            null, // parent_id = NULL (disponible para reclamo)
            enrollmentCode,
            `2026-02-${String(enrolledDay).padStart(2, "0")}`,
            status,
          ]);
          sectionStudents[key].push({ id: sid, idx: studentIdx });
          studentN++; studentIdx++; enrollmentSeq++;
        }
      }
    }

    await insertMany(client, "students",
      ["id","dni","full_name","initials","grade","grade_num","section","shift","parent_id","enrollment_code","enrolled_at","status"],
      studentRows, 500);
    console.log(`[seed-full]   ${studentRows.length} alumnos insertados`);

    // ── 3. Cursos (715 = 65 secciones × 11 áreas) ─────────────────────────
    console.log("[seed-full] Generando cursos...");
    const courseRows = [];
    let courseN = 50001;
    const coursesBySection = {}; // "grade|section" → [{id, name, areaId, teacherId, teacherName, hours}]
    // Rotación de docente POR ÁREA Y TURNO, continua a través de las
    // secciones de ese turno (en vez de reiniciarse en cada grado, y
    // respetando `shift_preference`). Antes rotaba sin mirar el turno: un
    // docente "Mañana" o "Tarde" podía terminar dictando en el turno
    // contrario. Cada sección solo elige entre los docentes de esa área
    // cuyo shift_preference es "Ambos" o coincide con el turno de la
    // sección. Reparto parejo (round-robin continuo dentro del pool
    // elegible) mantiene la carga máxima holgada frente a los 35 slots.
    const teacherRotation = {}; // "areaId|turno" → próximo índice a repartir

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const shift = shiftForSection(section);
        const key = `${grade.label}|${section}`;
        const room = `Aula ${sectionRoom(grade.num, secI)}`;
        coursesBySection[key] = [];

        for (const area of realAreas) {
          const cid = id(courseN);
          const allTeachers = teachersByArea[area.id];
          const eligible = allTeachers.filter((t) => t.shiftPref === "Ambos" || t.shiftPref === shift);
          const pool = eligible.length > 0 ? eligible : allTeachers; // resguardo, no debería activarse
          const rotKey = `${area.id}|${shift}`;
          const rotIdx = teacherRotation[rotKey] ?? 0;
          const teacher = pool[rotIdx % pool.length];
          teacherRotation[rotKey] = rotIdx + 1;
          const hours = area.hours_per_week;

          courseRows.push([
            cid, area.name, grade.label, section, 2026, shift, room,
            teacher.id, 1, hours, 0, area.id,
          ]);
          coursesBySection[key].push({
            id: cid, name: area.name, areaId: area.id, teacherId: teacher.id, teacherName: teacher.name, hours,
          });
          courseN++;
        }
      }
    }

    await insertMany(client, "courses",
      ["id","name","grade","section","year","shift","classroom","teacher_id","bimester","hours_per_week","students_total","area_id"],
      courseRows, 500);
    console.log(`[seed-full]   ${courseRows.length} cursos insertados`);

    // ── 4. Tutores de sección (65 — el docente de DPCC de cada sección) ──
    // Quién califica las competencias transversales (sin curso propio) y de
    // dónde sale enrollments.tutor ahora que "Tutoría" ya no es un curso.
    console.log("[seed-full] Asignando tutores de sección...");
    const DPCC_AREA_ID = areas.find((a) => a.code === "DPCC")?.id;
    const sectionTutorRows = [];
    const sectionTutor = {}; // "grade|section" → {id, name}
    let tutorN = 700001;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const dpccCourse = coursesBySection[key]?.find((c) => c.areaId === DPCC_AREA_ID);
        if (!dpccCourse) continue;
        sectionTutor[key] = { id: dpccCourse.teacherId, name: dpccCourse.teacherName };
        sectionTutorRows.push([id(tutorN++), grade.label, section, 2026, dpccCourse.teacherId]);
      }
    }

    await insertMany(client, "section_tutors", ["id","grade","section","year","teacher_id"], sectionTutorRows, 500);
    console.log(`[seed-full]   ${sectionTutorRows.length} tutores de sección asignados`);

    // ── 5. Notas por competencia (~127,000) ───────────────────────────────
    // Flush por grado (no por sección, no acumulado hasta el final): con
    // ~2,000 alumnos activos × 31 competencias × 2 bimestres (B1 completo +
    // B2 en curso) el total ronda 127k filas — acumular todo en memoria
    // antes de insertar es innecesario cuando se puede volcar cada grado
    // (≈25k filas) y soltar el array.
    console.log("[seed-full] Generando notas por competencia (B1 + B2)...");
    let cgN = 100001;
    let cgTotal = 0;

    for (const grade of GRADES) {
      const gradeRows = [];

      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const students = sectionStudents[key];
        const courses = coursesBySection[key];
        const tutor = sectionTutor[key];

        for (const student of students) {
          if (student.idx % 50 === 49) continue; // retirado, sin notas

          // Competencias de área (una por curso de la sección).
          for (const course of courses) {
            const comps = competenciesByArea.get(course.areaId) ?? [];
            for (const comp of comps) {
              for (const bimester of [1, 2]) {
                const score = genScore(student.idx, comp.id, bimester);
                const withConclusion = detRandom(student.idx, comp.id, bimester) % 4 === 0;
                const conclusion = withConclusion
                  ? CONCLUSIONS[detRandom(student.idx, comp.id) % CONCLUSIONS.length]
                  : null;
                gradeRows.push([id(cgN++), student.id, comp.id, course.id, bimester, 2026, score, conclusion, course.teacherId]);
              }
            }
          }

          // Competencias transversales: sin curso propio, las califica el
          // tutor de la sección (o quedan sin registered_by si aún no hay
          // tutor asignado, lo cual no debería pasar tras el paso 4).
          for (const comp of transversalCompetencies) {
            for (const bimester of [1, 2]) {
              const score = genScore(student.idx, comp.id, bimester);
              const withConclusion = detRandom(student.idx, comp.id, bimester) % 4 === 0;
              const conclusion = withConclusion
                ? CONCLUSIONS[detRandom(student.idx, comp.id) % CONCLUSIONS.length]
                : null;
              gradeRows.push([id(cgN++), student.id, comp.id, null, bimester, 2026, score, conclusion, tutor?.id ?? null]);
            }
          }
        }
      }

      await insertMany(client, "competency_grades",
        ["id","student_id","competency_id","course_id","bimester","year","score","conclusion","registered_by"],
        gradeRows, 1500);
      cgTotal += gradeRows.length;
      console.log(`[seed-full]   ${grade.label}: ${gradeRows.length} notas de competencia`);
    }
    console.log(`[seed-full]   ${cgTotal} notas de competencia insertadas en total`);

    // ── 6. Asistencia (~130,000) ─────────────────────────────────────────
    console.log("[seed-full] Generando asistencia (marzo-mayo)...");
    const attRows = [];
    let attN = 200001;
    const attDates = [
      ...schoolDays(2026, 3),
      ...schoolDays(2026, 4),
      ...schoolDays(2026, 5),
    ];

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const key = `${grade.label}|${SECTIONS[secI]}`;
        const students = sectionStudents[key];
        // El tutor de la sección registra la asistencia.
        const registeredBy = sectionTutor[key]?.id ?? coursesBySection[key]?.[0]?.teacherId;

        for (let di = 0; di < attDates.length; di++) {
          for (const student of students) {
            if (student.idx % 50 === 49) continue; // retirado
            const status = genAttendanceStatus(student.idx, di);
            attRows.push([id(attN++), student.id, attDates[di], status, registeredBy]);
          }
        }
      }
    }

    await insertMany(client, "attendance",
      ["id","student_id","date","status","registered_by"],
      attRows, 2000);
    console.log(`[seed-full]   ${attRows.length} registros de asistencia insertados`);

    // ── 7. Matrículas (~2,000) ───────────────────────────────────────────
    console.log("[seed-full] Generando matrículas...");
    const enrRows = [];
    let enrN = 300001;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const students = sectionStudents[key];
        const classroom = `Aula ${sectionRoom(grade.num, secI)}`;
        const tutorName = sectionTutor[key]?.name ?? "Por asignar";

        for (const student of students) {
          const enr = detRandom(student.idx, 777) % 100;
          const status = enr < 90 ? "regular" : enr < 98 ? "condicional" : "pendiente";
          const docsSubmitted = status === "regular" ? 7 : status === "condicional" ? 5 : 3;
          const apafa = enr < 80;
          const actividades = enr < 70;
          const lastPay = `2026-03-${String(1 + (detRandom(student.idx) % 10)).padStart(2, "0")}`;
          const enrDate = `2026-02-${String(10 + (detRandom(student.idx, 2) % 7)).padStart(2, "0")}`;

          enrRows.push([
            id(enrN++), student.id,
            `2026-${grade.num}${section}-${String(student.idx).padStart(4, "0")}`,
            2026, status, 7, docsSubmitted, apafa, 50, actividades, 30,
            lastPay, enrDate, buildDocs(docsSubmitted), tutorName, classroom,
          ]);
        }
      }
    }

    await insertMany(client, "enrollments",
      ["id","student_id","code","year","status","docs_total","docs_submitted","apafa_paid","apafa_amount","actividades_paid","actividades_amount","last_payment_date","created_at","docs","tutor","classroom"],
      enrRows, 500);
    console.log(`[seed-full]   ${enrRows.length} matrículas insertadas`);

    // ── 8. Horarios (~2,275) ─────────────────────────────────────────────
    // Se arma sección por sección, pero respetando un solo requisito extra:
    // un docente no puede quedar en dos secciones distintas al mismo
    // (día, período) — un profesor no puede estar en dos aulas a la vez.
    // `teacherBusy` acumula, en todo el barrido de las 65 secciones, qué
    // slots ya tiene ocupados cada docente; al llenar cada sección se busca,
        // para cada slot, el primer curso pendiente cuyo docente siga libre ahí.
    console.log("[seed-full] Generando horarios...");
    let schN = 400001;
    const ALL_SLOTS = []; // estructural: el texto de hora depende del turno de cada sección
    for (const day of DAYS) {
      for (let pi = 0; pi < 7; pi++) ALL_SLOTS.push({ day, period: pi + 1 });
    }
    // teacherId → Set("día-turno-período") ya ocupados. El turno entra en la
    // llave porque un docente "Ambos" puede legítimamente dictar Mañana-
    // período-3 y Tarde-período-3 el mismo día: son horas de reloj distintas
    // y no chocan de verdad.
    const teacherBusy = {};
    let scheduleConflicts = 0;
    const scheduleRows = []; // objetos mutables {grade, section, day, period, time, course, room}

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const shift = shiftForSection(section);
        const periods = periodsForShift(shift);
        const key = `${grade.label}|${section}`;
        const courses = coursesBySection[key];
        const room = `Aula ${sectionRoom(grade.num, secI)}`;

        // Cola de cursos pendientes por colocar (uno por hora semanal, según
        // area.hours_per_week), mezclada deterministamente.
        const pending = [];
        for (const course of courses) {
          const count = course.hours || 1;
          for (let s = 0; s < count; s++) pending.push(course);
        }
        for (let i = pending.length - 1; i > 0; i--) {
          const j = detRandom(grade.num, secI, i) % (i + 1);
          [pending[i], pending[j]] = [pending[j], pending[i]];
        }

        // Orden de slots también mezclado, para variar qué día/período cae
        // primero en cada sección. El texto de hora sale del turno de ESTA
        // sección (periods), no de un bloque fijo compartido.
        const slotOrder = ALL_SLOTS.map((s) => ({ ...s, time: periods[s.period - 1] }));
        for (let i = slotOrder.length - 1; i > 0; i--) {
          const j = detRandom(grade.num, secI, i, 7) % (i + 1);
          [slotOrder[i], slotOrder[j]] = [slotOrder[j], slotOrder[i]];
        }

        const placed = []; // filas ya colocadas en ESTA sección (mismos objetos que scheduleRows)

        for (const slot of slotOrder) {
          if (pending.length === 0) break;
          const slotKey = `${slot.day}-${shift}-${slot.period}`;

          // De los pendientes libres en este slot, elegir el del docente con
          // MENOS slots libres restantes en toda la semana ("más restringido
          // primero"): si se toma cualquiera libre sin priorizar, el docente
          // más ocupado puede quedarse sin hueco más adelante y forzar un
          // cruce. Priorizándolo ahora, casi siempre se evita.
          let idx = -1;
          let bestRemaining = Infinity;
          for (let i = 0; i < pending.length; i++) {
            const c = pending[i];
            if (teacherBusy[c.teacherId]?.has(slotKey)) continue;
            const remaining = ALL_SLOTS.length - (teacherBusy[c.teacherId]?.size ?? 0);
            if (remaining < bestRemaining) {
              bestRemaining = remaining;
              idx = i;
            }
          }

          let course = null;
          if (idx !== -1) {
            course = pending.splice(idx, 1)[0];
          } else {
            // Nadie pendiente está libre en este slot. Antes de forzar un
            // cruce, intentar reparar por intercambio: buscar una fila YA
            // colocada en esta misma sección cuyo docente esté libre aquí, y
            // que a su vez deje su slot original libre para algún pendiente.
            // Si existe, se intercambian de lugar — ningún curso cambia de
            // sección, solo permutan qué día/período ocupan dentro de ella.
            outer: for (let pi = 0; pi < pending.length; pi++) {
              const candidate = pending[pi];
              for (const placedRow of placed) {
                const oldDay = placedRow.day;
                const oldPeriod = placedRow.period;
                const oldTime = placedRow.time;
                const oldKey = `${oldDay}-${shift}-${oldPeriod}`;
                const placedTeacherFreeHere = !teacherBusy[placedRow.course.teacherId]?.has(slotKey);
                const candidateFreeAtOldSlot = !teacherBusy[candidate.teacherId]?.has(oldKey);
                if (placedTeacherFreeHere && candidateFreeAtOldSlot) {
                  // Liberar el slot viejo de placedRow y ocuparlo con `candidate`.
                  teacherBusy[placedRow.course.teacherId].delete(oldKey);
                  teacherBusy[placedRow.course.teacherId].add(slotKey);
                  teacherBusy[candidate.teacherId] ??= new Set();
                  teacherBusy[candidate.teacherId].add(oldKey);

                  // placedRow se muda a `slot`; `candidate` ocupa el slot que dejó libre.
                  placedRow.day = slot.day;
                  placedRow.period = slot.period;
                  placedRow.time = slot.time;

                  const newRow = { grade: grade.label, section, day: oldDay, period: oldPeriod, time: oldTime, course: candidate, room };
                  scheduleRows.push(newRow);
                  placed.push(newRow);
                  pending.splice(pi, 1);

                  course = "SWAPPED"; // ya se insertaron las dos filas arriba
                  break outer;
                }
              }
            }

            if (course === null) {
              // Tampoco se pudo reparar (holgura realmente agotada) — se
              // coloca igual el primero de la cola para no dejar el slot
              // vacío, y se cuenta como conflicto para poder detectarlo.
              course = pending.splice(0, 1)[0];
              scheduleConflicts++;
            }
          }

          if (course === "SWAPPED") continue;

          teacherBusy[course.teacherId] ??= new Set();
          teacherBusy[course.teacherId].add(slotKey);

          const row = { grade: grade.label, section, day: slot.day, period: slot.period, time: slot.time, course, room };
          scheduleRows.push(row);
          placed.push(row);
        }
      }
    }

    const schRows = scheduleRows.map((r) => [
      id(schN++), r.grade, r.section, r.day, r.period, r.time, r.course.name, r.course.teacherName, r.room, r.course.teacherId,
    ]);

    if (scheduleConflicts > 0) {
      console.warn(`[seed-full]   ⚠ ${scheduleConflicts} slot(s) no pudieron evitar cruce de docente (holgura agotada)`);
    }

    await insertMany(client, "schedule_entries",
      ["id","grade","section","day","period","time","subject","teacher","room","teacher_id"],
      schRows, 500);
    console.log(`[seed-full]   ${schRows.length} entradas de horario insertadas`);

    // ── 9. Avisos (11) ───────────────────────────────────────────────────
    await insertMany(client, "announcements",
      ["id","category","title","body","sender","audience","is_read","published_at"],
      ANNOUNCEMENTS.map((a) => [id(a.n), a.category, a.title, a.body, a.sender, a.audience, a.read, a.date]), 100);
    console.log(`[seed-full]   ${ANNOUNCEMENTS.length} avisos insertados`);

    // ── 10. Actualizar contadores derivados ──────────────────────────────
    // Cachés denormalizadas en students/courses — la app ya no las lee en
    // la mayoría de rutas (calcula en vivo desde v_area_grades), pero se
    // mantienen actualizadas por si algún camino aún las usa como fallback.
    console.log("[seed-full] Actualizando contadores...");
    await client.query(`
      UPDATE students s SET
        avg_grade = COALESCE((
          SELECT ROUND(AVG(v.score)::numeric, 2) FROM v_area_grades v
          WHERE v.student_id = s.id AND v.graded = v.expected AND v.year = 2026
        ), 0),
        attendance_rate = COALESCE((
          SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
          FROM attendance a WHERE a.student_id = s.id
        ), 100)
    `);
    await client.query(`
      UPDATE courses c SET students_total = sub.total,
        attendance_rate = COALESCE(sub.att_r, 100)
      FROM (
        SELECT s.grade, s.section,
          COUNT(*) FILTER (WHERE s.status='activo')::int AS total,
          ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(a.*), 0)) AS att_r
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id
        WHERE s.status = 'activo'
        GROUP BY s.grade, s.section
      ) sub
      WHERE c.grade = sub.grade AND c.section = sub.section
    `);
    await client.query(`
      UPDATE courses c SET avg_grade = sub.avg_g
      FROM (
        SELECT course_id, ROUND(AVG(score) FILTER (WHERE graded = expected)::numeric, 2) AS avg_g
        FROM v_area_grades WHERE course_id IS NOT NULL AND year = 2026
        GROUP BY course_id
      ) sub
      WHERE c.id = sub.course_id
    `);

    await client.query("COMMIT");

    // ── Resumen ──────────────────────────────────────────────────────────
    console.log("");
    console.log("[seed-full] ✔ Seed completado:");
    console.log(`  Docentes:         ${teacherRows.length}`);
    console.log(`  Alumnos:          ${studentRows.length}`);
    console.log(`  Cursos:           ${courseRows.length}`);
    console.log(`  Tutores sección:  ${sectionTutorRows.length}`);
    console.log(`  Notas competencia:${cgTotal}`);
    console.log(`  Asistencia:       ${attRows.length}`);
    console.log(`  Matrículas:       ${enrRows.length}`);
    console.log(`  Horarios:         ${schRows.length}`);
    console.log(`  Avisos:           ${ANNOUNCEMENTS.length}`);
    console.log("");
    console.log(`[seed-full] Credenciales: todos los docentes con "Demo2026!"`);
    console.log(`[seed-full] Email ejemplo: dmat01@ijfk.edu.pe`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[seed-full] ✘ Error, rollback:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
