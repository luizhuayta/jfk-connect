/**
 * IJFK - Seed a escala real (~2,000 alumnos + 130 docentes)
 * =============================================================================
 * Uso:
 *   node scripts/seed-full.mjs            → idempotente (ON CONFLICT DO NOTHING)
 *   node scripts/seed-full.mjs --clean    → borra datos demo explícitos primero
 *
 * Genera:
 *   - 130 docentes (10 asignaturas × 11 + 2 × 10) con subject + shift_preference
 *   - ~2,000 alumnos (65 secciones × 25-39) con enrollment_code único
 *   - ~780 cursos (65 secciones × 12 asignaturas) con teacher_id asignado
 *   - ~48,000 notas (B1 completo + B2 en curso)
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
const SUBJECTS = [
  "Matemáticas", "Comunicación", "Ciencia y Tecnología", "Cívica",
  "Religión", "Arte", "Educación Física", "EPT",
  "Tutoría", "Inglés", "HGE", "DPCC",
];
const SUBJECT_ABBR = {
  "Matemáticas": "mat", "Comunicación": "com", "Ciencia y Tecnología": "cta",
  "Cívica": "civ", "Religión": "rel", "Arte": "art",
  "Educación Física": "edf", "EPT": "ept", "Tutoría": "tut",
  "Inglés": "ing", "HGE": "hge", "DPCC": "dpcc",
};
// 10 materias con 11 docentes, 2 materas con 10 = 130
const SUBJECT_COUNTS = SUBJECTS.map(s => (s === "HGE" || s === "DPCC") ? 10 : 11);

const GRADES = [
  { label: "1ro", num: 1 }, { label: "2do", num: 2 },
  { label: "3ro", num: 3 }, { label: "4to", num: 4 },
  { label: "5to", num: 5 },
];
const SECTIONS = ["A","B","C","D","E","F","G","H","I","J","K","L","M"];

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = ["7:45 - 8:30","8:30 - 9:15","9:15 - 10:00","10:20 - 11:05","11:05 - 11:50","11:50 - 12:35","12:35 - 13:20"];

// Distribución de slots por asignatura (suma = 35 = 5 días × 7 períodos)
const SLOTS_PER_SUBJECT = {
  "Matemáticas": 5, "Comunicación": 5, "Ciencia y Tecnología": 4,
  "Inglés": 3, "HGE": 3, "Tutoría": 3,
  "Cívica": 2, "Religión": 2, "Arte": 2,
  "Educación Física": 2, "EPT": 2, "DPCC": 2,
};

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

// Emails demo a borrar en --clean (lista EXPLÍCITA, no NOT IN)
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

function genScore(studentIdx, courseIdx, noteNum) {
  const r = detRandom(studentIdx + 1, courseIdx + 1, noteNum);
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

  const passwordHash = hashPassword(DEMO_PASSWORD);

  try {
    await client.query("BEGIN");

    // ── Limpieza (solo --clean) ──────────────────────────────────────────
    if (CLEAN) {
      console.log("[seed-full] Borrando datos demo...");
      await client.query("DELETE FROM grades");
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
      // Asegurar que los 2 admins tengan password scrypt
      await client.query(
        "UPDATE users SET password_hash = $1 WHERE role = 'admin' AND password_hash IS NULL",
        [passwordHash],
      );
      console.log("[seed-full] Limpieza completada.");
    }

    // ── 1. Docentes (130) ────────────────────────────────────────────────
    console.log("[seed-full] Generando 130 docentes...");
    const teacherRows = [];
    let teacherN = 201;
    const teachersBySubject = {}; // subject → [teacherId, ...]

    for (let si = 0; si < SUBJECTS.length; si++) {
      const subject = SUBJECTS[si];
      const count = SUBJECT_COUNTS[si];
      const abbr = SUBJECT_ABBR[subject];
      teachersBySubject[subject] = [];

      for (let i = 0; i < count; i++) {
        const tid = id(teacherN);
        const teacherIdx = teacherN - 201;
        const fn = FIRST_NAMES[teacherIdx % FIRST_NAMES.length];
        const ln = LAST_NAMES[(teacherIdx * 5) % LAST_NAMES.length];
        const fullName = `Prof. ${fn} ${ln}`;
        const email = `d${abbr}${String(i + 1).padStart(2, "0")}@ijfk.edu.pe`;
        const shiftR = detRandom(teacherN, 99) % 10;
        const shiftPref = shiftR < 6 ? "Ambos" : shiftR < 8 ? "Mañana" : "Tarde";

        teacherRows.push([tid, email, fullName, "docente", null, true, passwordHash, subject, shiftPref]);
        teachersBySubject[subject].push({ id: tid, name: fullName, email });
        teacherN++;
      }
    }

    await insertMany(client, "users",
      ["id","email","full_name","role","phone","is_active","password_hash","subject","shift_preference"],
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

    // ── 3. Cursos (~780) ─────────────────────────────────────────────────
    console.log("[seed-full] Generando cursos...");
    const courseRows = [];
    let courseN = 50001;
    const coursesBySection = {}; // "grade|section" → [{id, subject, teacherId, teacherName}]

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const shift = shiftForSection(section);
        const key = `${grade.label}|${section}`;
        const room = `Aula ${sectionRoom(grade.num, secI)}`;
        coursesBySection[key] = [];

        for (let subjI = 0; subjI < SUBJECTS.length; subjI++) {
          const subject = SUBJECTS[subjI];
          const cid = id(courseN);
          // Asignar docente: rotar entre los docentes de esta asignatura
          const teachers = teachersBySubject[subject];
          const teacher = teachers[secI % teachers.length];
          const hours = SLOTS_PER_SUBJECT[subject];

          courseRows.push([
            cid, subject, grade.label, section, 2026, shift, room,
            teacher.id, 1, hours, 0,
          ]);
          coursesBySection[key].push({
            id: cid, subject, teacherId: teacher.id, teacherName: teacher.name, hours,
          });
          courseN++;
        }
      }
    }

    await insertMany(client, "courses",
      ["id","name","grade","section","year","shift","classroom","teacher_id","bimester","hours_per_week","students_total"],
      courseRows, 500);
    console.log(`[seed-full]   ${courseRows.length} cursos insertados`);

    // ── 4. Notas (~48,000) ───────────────────────────────────────────────
    console.log("[seed-full] Generando notas (B1 + B2)...");
    const gradeRows = [];
    let gradeN = 100001;
    const OBSERVATIONS = [
      "Excelente desempeño", "Buen trabajo", "Sigue mejorando", "Necesita refuerzo",
      "Participación activa", "Puede mejorar", "Sobresaliente", "En proceso",
      "Buen esfuerzo", "Regular", "Destacado", "Requiere apoyo",
    ];

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const students = sectionStudents[key];
        const courses = coursesBySection[key];

        for (const course of courses) {
          for (const student of students) {
            if (student.idx % 50 === 49) continue; // retirado, sin notas

            // B1: completo (n1, n2, n3)
            const n1b1 = genScore(student.idx, gradeN, 1);
            const n2b1 = genScore(student.idx, gradeN, 2);
            const n3b1 = genScore(student.idx, gradeN, 3);
            const obsB1 = OBSERVATIONS[detRandom(student.idx, gradeN) % OBSERVATIONS.length];
            gradeRows.push([
              id(gradeN++), student.id, course.id, 1, n1b1, n2b1, n3b1, obsB1, course.teacherId,
            ]);

            // B2: en curso (n1, n2, n3=NULL)
            const n1b2 = genScore(student.idx, gradeN + 1, 1);
            const n2b2 = genScore(student.idx, gradeN + 1, 2);
            gradeRows.push([
              id(gradeN++), student.id, course.id, 2, n1b2, n2b2, null, "Pendiente examen", course.teacherId,
            ]);
          }
        }
      }
    }

    await insertMany(client, "grades",
      ["id","student_id","course_id","bimester","n1","n2","n3","observation","registered_by"],
      gradeRows, 500);
    console.log(`[seed-full]   ${gradeRows.length} notas insertadas`);

    // ── 5. Asistencia (~130,000) ─────────────────────────────────────────
    console.log("[seed-full] Generando asistencia (marzo-mayo)...");
    const attRows = [];
    let attN = 200001;
    const attDates = [
      ...schoolDays(2026, 3),
      ...schoolDays(2026, 4),
      ...schoolDays(2026, 5),
    ];
    let attInserted = 0;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const key = `${grade.label}|${SECTIONS[secI]}`;
        const students = sectionStudents[key];
        // Tomar el primer docente de la sección para registered_by
        const tutor = coursesBySection[key]?.[0]?.teacherId;

        for (let di = 0; di < attDates.length; di++) {
          for (const student of students) {
            if (student.idx % 50 === 49) continue; // retirado
            const status = genAttendanceStatus(student.idx, di);
            attRows.push([id(attN++), student.id, attDates[di], status, tutor]);
            attInserted++;
          }
        }
      }
    }

    await insertMany(client, "attendance",
      ["id","student_id","date","status","registered_by"],
      attRows, 2000);
    console.log(`[seed-full]   ${attRows.length} registros de asistencia insertados`);

    // ── 6. Matrículas (~2,000) ───────────────────────────────────────────
    console.log("[seed-full] Generando matrículas...");
    const enrRows = [];
    let enrN = 300001;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const students = sectionStudents[key];
        const classroom = `Aula ${sectionRoom(grade.num, secI)}`;
        // Tutor = el docente de "Tutoría" en esta sección
        const tutorCourse = coursesBySection[key]?.find((c) => c.subject === "Tutoría");
        const tutorName = tutorCourse?.teacherName ?? "Por asignar";

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

    // ── 7. Horarios (~2,275) ─────────────────────────────────────────────
    console.log("[seed-full] Generando horarios...");
    const schRows = [];
    let schN = 400001;

    for (const grade of GRADES) {
      for (let secI = 0; secI < SECTIONS.length; secI++) {
        const section = SECTIONS[secI];
        const key = `${grade.label}|${section}`;
        const courses = coursesBySection[key];
        const room = `Aula ${sectionRoom(grade.num, secI)}`;

        // Construir malla: asignar slots según SLOTS_PER_SUBJECT
        const slots = [];
        for (const course of courses) {
          const count = SLOTS_PER_SUBJECT[course.subject] || 1;
          for (let s = 0; s < count; s++) slots.push(course);
        }
        // Mezclar deterministamente
        for (let i = slots.length - 1; i > 0; i--) {
          const j = detRandom(grade.num, secI, i) % (i + 1);
          [slots[i], slots[j]] = [slots[j], slots[i]];
        }

        // Llenar 35 slots (5 días × 7 períodos), los extras se descartan
        let slotIdx = 0;
        for (const day of DAYS) {
          for (let pi = 0; pi < 7; pi++) {
            if (slotIdx >= slots.length) break;
            const course = slots[slotIdx++];
            schRows.push([
              id(schN++), grade.label, section, day, pi + 1,
              PERIODS[pi], course.subject, course.teacherName, room,
            ]);
          }
        }
      }
    }

    await insertMany(client, "schedule_entries",
      ["id","grade","section","day","period","time","subject","teacher","room"],
      schRows, 500);
    console.log(`[seed-full]   ${schRows.length} entradas de horario insertadas`);

    // ── 8. Avisos (11) ───────────────────────────────────────────────────
    await insertMany(client, "announcements",
      ["id","category","title","body","sender","audience","is_read","published_at"],
      ANNOUNCEMENTS.map((a) => [id(a.n), a.category, a.title, a.body, a.sender, a.audience, a.read, a.date]), 100);
    console.log(`[seed-full]   ${ANNOUNCEMENTS.length} avisos insertados`);

    // ── 9. Actualizar contadores derivados ───────────────────────────────
    console.log("[seed-full] Actualizando contadores...");
    await client.query(`
      UPDATE students s SET
        avg_grade = COALESCE((SELECT ROUND(AVG(g.average)::numeric, 2) FROM grades g WHERE g.student_id = s.id), 0),
        attendance_rate = COALESCE((
          SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
          FROM attendance a WHERE a.student_id = s.id
        ), 100)
    `);
    await client.query(`
      UPDATE courses c SET students_total = sub.total,
        avg_grade = COALESCE(sub.avg_g, 0),
        attendance_rate = COALESCE(sub.att_r, 100)
      FROM (
        SELECT s.grade, s.section,
          COUNT(*) FILTER (WHERE s.status='activo')::int AS total,
          ROUND(AVG(g.average)::numeric, 2) AS avg_g,
          ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(a.*), 0)) AS att_r
        FROM students s
        LEFT JOIN grades g ON g.student_id = s.id
        LEFT JOIN attendance a ON a.student_id = s.id
        WHERE s.status = 'activo'
        GROUP BY s.grade, s.section
      ) sub
      WHERE c.grade = sub.grade AND c.section = sub.section
    `);

    await client.query("COMMIT");

    // ── Resumen ──────────────────────────────────────────────────────────
    console.log("");
    console.log("[seed-full] ✔ Seed completado:");
    console.log(`  Docentes:    ${teacherRows.length}`);
    console.log(`  Alumnos:     ${studentRows.length}`);
    console.log(`  Cursos:      ${courseRows.length}`);
    console.log(`  Notas:       ${gradeRows.length}`);
    console.log(`  Asistencia:  ${attRows.length}`);
    console.log(`  Matrículas:  ${enrRows.length}`);
    console.log(`  Horarios:    ${schRows.length}`);
    console.log(`  Avisos:      ${ANNOUNCEMENTS.length}`);
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