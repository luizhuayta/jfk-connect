import { User, Student, Course, Note, Activity } from "@/types";

export type BimesterNote = {
  course: string;
  note: number;
  level: "AD" | "A" | "B" | "C";
  observation: string;
};

export const mockBimesterNotes: Record<string, Record<string, BimesterNote[]>> = {
  "1": {
    "Bimestre 1": [
      { course: "Matemáticas", note: 15.8, level: "A", observation: "Excelente desempeño" },
      { course: "Comunicación", note: 16.4, level: "A", observation: "Muy bueno" },
      { course: "Ciencia y Tecnología", note: 14.2, level: "A", observation: "Puede mejorar" },
      { course: "Inglés", note: 17.1, level: "AD", observation: "Sobresaliente" },
      { course: "Historia", note: 15.5, level: "A", observation: "Buen trabajo" },
    ],
    "Bimestre 2": [
      { course: "Matemáticas", note: 16.2, level: "A", observation: "Buen progreso" },
      { course: "Comunicación", note: 17.0, level: "AD", observation: "Excelente" },
      { course: "Ciencia y Tecnología", note: 15.5, level: "A", observation: "Mejorando" },
      { course: "Inglés", note: 16.8, level: "A", observation: "Muy bueno" },
      { course: "Historia", note: 14.9, level: "A", observation: "Regular" },
    ],
    "Bimestre 3": [
      { course: "Matemáticas", note: 17.5, level: "AD", observation: "Sobresaliente" },
      { course: "Comunicación", note: 16.8, level: "A", observation: "Buen trabajo" },
      { course: "Ciencia y Tecnología", note: 16.0, level: "A", observation: "Buen esfuerzo" },
      { course: "Inglés", note: 18.0, level: "AD", observation: "Excelente desempeño" },
      { course: "Historia", note: 15.2, level: "A", observation: "Aceptable" },
    ],
    "Bimestre 4": [
      { course: "Matemáticas", note: 18.0, level: "AD", observation: "Sobresaliente" },
      { course: "Comunicación", note: 17.5, level: "AD", observation: "Excelente" },
      { course: "Ciencia y Tecnología", note: 16.5, level: "A", observation: "Buen trabajo" },
      { course: "Inglés", note: 18.5, level: "AD", observation: "Destacado" },
      { course: "Historia", note: 16.0, level: "A", observation: "Buen cierre" },
    ],
  },
  "2": {
    "Bimestre 1": [
      { course: "Matemáticas", note: 13.5, level: "A", observation: "En proceso" },
      { course: "Comunicación", note: 15.0, level: "A", observation: "Satisfactorio" },
      { course: "Ciencia y Tecnología", note: 14.8, level: "A", observation: "Buen esfuerzo" },
      { course: "Inglés", note: 13.0, level: "A", observation: "Necesita refuerzo" },
      { course: "Historia", note: 16.2, level: "A", observation: "Muy bueno" },
    ],
    "Bimestre 2": [
      { course: "Matemáticas", note: 14.0, level: "A", observation: "Mejorando" },
      { course: "Comunicación", note: 15.5, level: "A", observation: "Buen avance" },
      { course: "Ciencia y Tecnología", note: 15.8, level: "A", observation: "Muy bien" },
      { course: "Inglés", note: 13.5, level: "A", observation: "Practicar más" },
      { course: "Historia", note: 16.0, level: "A", observation: "Excelente" },
    ],
    "Bimestre 3": [
      { course: "Matemáticas", note: 14.5, level: "A", observation: "Progresando" },
      { course: "Comunicación", note: 16.0, level: "A", observation: "Buen trabajo" },
      { course: "Ciencia y Tecnología", note: 15.2, level: "A", observation: "Satisfactorio" },
      { course: "Inglés", note: 14.0, level: "A", observation: "Mejorando" },
      { course: "Historia", note: 17.0, level: "AD", observation: "Sobresaliente" },
    ],
    "Bimestre 4": [
      { course: "Matemáticas", note: 15.0, level: "A", observation: "Buen cierre" },
      { course: "Comunicación", note: 16.5, level: "A", observation: "Excelente" },
      { course: "Ciencia y Tecnología", note: 15.5, level: "A", observation: "Muy bien" },
      { course: "Inglés", note: 14.5, level: "A", observation: "Avanzando" },
      { course: "Historia", note: 17.5, level: "AD", observation: "Destacado" },
    ],
  },
};

export const mockUserFather: User = {
  id: "1",
  name: "Carlos Pérez",
  email: "carlos@email.com",
  role: "father",
};

export const mockUserTeacher: User = {
  id: "2",
  name: "María González",
  email: "maria@email.com",
  role: "teacher",
};

export const mockUserAdmin: User = {
  id: "3",
  name: "Administrador",
  email: "admin@ijfk.edu",
  role: "admin",
};

export const mockStudents: Student[] = [
  { id: "1", name: "Ana Pérez", grade: "5to", section: "A", average: 17.5 },
  { id: "2", name: "Luis Pérez", grade: "3ro", section: "B", average: 15.2 },
];

export const mockCourses: Course[] = [
  { id: "1", name: "Matemáticas", students: 32, schedule: "Lun-Mie 08:00" },
  { id: "2", name: "Ciencias", students: 28, schedule: "Mar-Jue 10:00" },
  { id: "3", name: "Historia", students: 30, schedule: "Vie 09:00" },
];

export const mockNotes: Note[] = [
  { id: "1", studentName: "Ana Pérez", course: "Matemáticas", value: 18, date: "2026-04-28" },
  { id: "2", studentName: "Luis Pérez", course: "Ciencias", value: 14, date: "2026-04-25" },
  { id: "3", studentName: "Ana Pérez", course: "Historia", value: 16, date: "2026-04-22" },
];

export const mockActivities: Activity[] = [
  { id: "1", user: "María González", action: "Subió notas de Matemáticas", date: "2026-05-02 10:30" },
  { id: "2", user: "Carlos Pérez", action: "Revisó boletín de Ana", date: "2026-05-02 09:15" },
  { id: "3", user: "Administrador", action: "Creó nuevo usuario", date: "2026-05-01 16:00" },
  { id: "4", user: "María González", action: "Actualizó asistencia", date: "2026-05-01 12:00" },
];

// ─── Schedule ────────────────────────────────────────────────────────────────

export type SchedulePeriod = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

// Períodos del turno mañana
export const PERIODS = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05", // tras recreo
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
];

export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// mockSchedules[studentId][day] = array of periods (index = PERIODS)
export const mockSchedules: Record<string, Record<string, SchedulePeriod[]>> = {
  "1": { // Ana Pérez — 5to "A" turno mañana
    "Lunes": [
      { time: "7:45 - 8:30",   subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "8:30 - 9:15",   subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "9:15 - 10:00",  subject: "Ed. Física",   teacher: "Prof. Huamán",    room: "Patio" },
      { time: "10:20 - 11:05", subject: "Ed. Física",   teacher: "Prof. Huamán",    room: "Patio" },
      { time: "11:05 - 11:50", subject: "HGE",          teacher: "Prof. Quispe",    room: "A-201" },
      { time: "11:50 - 12:35", subject: "HGE",          teacher: "Prof. Quispe",    room: "A-201" },
      { time: "12:35 - 13:20", subject: "DPCC",         teacher: "Prof. Torres",    room: "A-201" },
    ],
    "Martes": [
      { time: "7:45 - 8:30",   subject: "Comunicación", teacher: "Prof. Flores",    room: "A-201" },
      { time: "8:30 - 9:15",   subject: "Comunicación", teacher: "Prof. Flores",    room: "A-201" },
      { time: "9:15 - 10:00",  subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "10:20 - 11:05", subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "11:05 - 11:50", subject: "Ciencias",     teacher: "Prof. Mendoza",   room: "Lab Ciencias" },
      { time: "11:50 - 12:35", subject: "Ciencias",     teacher: "Prof. Mendoza",   room: "Lab Ciencias" },
      { time: "12:35 - 13:20", subject: "EPT",          teacher: "Prof. Salas",     room: "Taller" },
    ],
    "Miércoles": [
      { time: "7:45 - 8:30",   subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "8:30 - 9:15",   subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "9:15 - 10:00",  subject: "DPCC",         teacher: "Prof. Torres",    room: "A-201" },
      { time: "10:20 - 11:05", subject: "Ciencias",     teacher: "Prof. Mendoza",   room: "Lab Ciencias" },
      { time: "11:05 - 11:50", subject: "HGE",          teacher: "Prof. Quispe",    room: "A-201" },
      { time: "11:50 - 12:35", subject: "Arte",         teacher: "Prof. Velarde",   room: "A-201" },
      { time: "12:35 - 13:20", subject: "Tutoría",      teacher: "Prof. Flores",    room: "A-201" },
    ],
    "Jueves": [
      { time: "7:45 - 8:30",   subject: "Ciencias",     teacher: "Prof. Mendoza",   room: "Lab Ciencias" },
      { time: "8:30 - 9:15",   subject: "Ciencias",     teacher: "Prof. Mendoza",   room: "Lab Ciencias" },
      { time: "9:15 - 10:00",  subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "10:20 - 11:05", subject: "Matemáticas",  teacher: "Prof. Cáceres",   room: "A-201" },
      { time: "11:05 - 11:50", subject: "EPT",          teacher: "Prof. Salas",     room: "Taller" },
      { time: "11:50 - 12:35", subject: "Comunicación", teacher: "Prof. Flores",    room: "A-201" },
      { time: "12:35 - 13:20", subject: "Religión",     teacher: "Prof. Zavala",    room: "A-201" },
    ],
    "Viernes": [
      { time: "7:45 - 8:30",   subject: "Comunicación", teacher: "Prof. Flores",    room: "A-201" },
      { time: "8:30 - 9:15",   subject: "Comunicación", teacher: "Prof. Flores",    room: "A-201" },
      { time: "9:15 - 10:00",  subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "10:20 - 11:05", subject: "Arte",         teacher: "Prof. Velarde",   room: "A-201" },
      { time: "11:05 - 11:50", subject: "Arte",         teacher: "Prof. Velarde",   room: "A-201" },
      { time: "11:50 - 12:35", subject: "HGE",          teacher: "Prof. Quispe",    room: "A-201" },
      { time: "12:35 - 13:20", subject: "Religión",     teacher: "Prof. Zavala",    room: "A-201" },
    ],
  },
  "2": { // Luis Pérez — 3ro "B" turno mañana
    "Lunes": [
      { time: "7:45 - 8:30",   subject: "Comunicación", teacher: "Prof. Ramos",     room: "B-103" },
      { time: "8:30 - 9:15",   subject: "Comunicación", teacher: "Prof. Ramos",     room: "B-103" },
      { time: "9:15 - 10:00",  subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "10:20 - 11:05", subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "11:05 - 11:50", subject: "Ciencias",     teacher: "Prof. Gutiérrez", room: "Lab Ciencias" },
      { time: "11:50 - 12:35", subject: "Tutoría",      teacher: "Prof. Ramos",     room: "B-103" },
      { time: "12:35 - 13:20", subject: "Religión",     teacher: "Prof. Zavala",    room: "B-103" },
    ],
    "Martes": [
      { time: "7:45 - 8:30",   subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "8:30 - 9:15",   subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "9:15 - 10:00",  subject: "HGE",          teacher: "Prof. Nieto",     room: "B-103" },
      { time: "10:20 - 11:05", subject: "HGE",          teacher: "Prof. Nieto",     room: "B-103" },
      { time: "11:05 - 11:50", subject: "EPT",          teacher: "Prof. Salas",     room: "Taller" },
      { time: "11:50 - 12:35", subject: "EPT",          teacher: "Prof. Salas",     room: "Taller" },
      { time: "12:35 - 13:20", subject: "Arte",         teacher: "Prof. Velarde",   room: "B-103" },
    ],
    "Miércoles": [
      { time: "7:45 - 8:30",   subject: "Ciencias",     teacher: "Prof. Gutiérrez", room: "Lab Ciencias" },
      { time: "8:30 - 9:15",   subject: "Ciencias",     teacher: "Prof. Gutiérrez", room: "Lab Ciencias" },
      { time: "9:15 - 10:00",  subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "10:20 - 11:05", subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "11:05 - 11:50", subject: "Comunicación", teacher: "Prof. Ramos",     room: "B-103" },
      { time: "11:50 - 12:35", subject: "DPCC",         teacher: "Prof. Torres",    room: "B-103" },
      { time: "12:35 - 13:20", subject: "DPCC",         teacher: "Prof. Torres",    room: "B-103" },
    ],
    "Jueves": [
      { time: "7:45 - 8:30",   subject: "Comunicación", teacher: "Prof. Ramos",     room: "B-103" },
      { time: "8:30 - 9:15",   subject: "Comunicación", teacher: "Prof. Ramos",     room: "B-103" },
      { time: "9:15 - 10:00",  subject: "Ed. Física",   teacher: "Prof. Huamán",    room: "Patio" },
      { time: "10:20 - 11:05", subject: "Ed. Física",   teacher: "Prof. Huamán",    room: "Patio" },
      { time: "11:05 - 11:50", subject: "Arte",         teacher: "Prof. Velarde",   room: "B-103" },
      { time: "11:50 - 12:35", subject: "HGE",          teacher: "Prof. Nieto",     room: "B-103" },
      { time: "12:35 - 13:20", subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
    ],
    "Viernes": [
      { time: "7:45 - 8:30",   subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "8:30 - 9:15",   subject: "Matemáticas",  teacher: "Prof. Vargas",    room: "B-103" },
      { time: "9:15 - 10:00",  subject: "DPCC",         teacher: "Prof. Torres",    room: "B-103" },
      { time: "10:20 - 11:05", subject: "Ciencias",     teacher: "Prof. Gutiérrez", room: "Lab Ciencias" },
      { time: "11:05 - 11:50", subject: "Ciencias",     teacher: "Prof. Gutiérrez", room: "Lab Ciencias" },
      { time: "11:50 - 12:35", subject: "Inglés",       teacher: "Prof. Paredes",   room: "Lab Idiomas" },
      { time: "12:35 - 13:20", subject: "Ed. Física",   teacher: "Prof. Huamán",    room: "Patio" },
    ],
  },
};

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = "A" | "F" | "T" | "J"; // Asistió · Falta · Tardanza · Justificado

export type AttendanceDay = {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
};

// Genera los días hábiles (lunes-viernes) de un mes dado
function schoolDays(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5)
      days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function buildAttendance(
  seed: number,
  year: number,
  month: number,
  cutDate?: string
): AttendanceDay[] {
  const days = schoolDays(year, month).filter((d) => !cutDate || d <= cutDate);
  // Deterministic pseudo-random based on seed + index
  return days.map((date, i) => {
    const r = ((seed * 37 + i * 13) % 100);
    let status: AttendanceStatus = "A";
    if (r < 4) status = "F";
    else if (r < 7) status = "T";
    else if (r < 9) status = "J";
    return { date, status };
  });
}

const TODAY = "2026-05-09"; // last school day before today (2026-05-10 is Sunday)

export const mockAttendance: Record<string, AttendanceDay[]> = {
  "1": [
    ...buildAttendance(7, 2026, 3, undefined),  // marzo completo
    ...buildAttendance(7, 2026, 4, undefined),  // abril completo
    ...buildAttendance(7, 2026, 5, TODAY),      // mayo hasta hoy
  ],
  "2": [
    ...buildAttendance(11, 2026, 3, undefined),
    ...buildAttendance(11, 2026, 4, undefined),
    ...buildAttendance(11, 2026, 5, TODAY),
  ],
};

// ─── Legacy chart data (kept for admin/teacher panels) ────────────────────────
export const mockAttendanceData = [
  { name: "Lun", present: 120, absent: 5 },
  { name: "Mar", present: 118, absent: 7 },
  { name: "Mie", present: 122, absent: 3 },
  { name: "Jue", present: 115, absent: 10 },
  { name: "Vie", present: 119, absent: 6 },
];

export const mockGradeDistribution = [
  { name: "A (18-20)", value: 45 },
  { name: "B (15-17)", value: 30 },
  { name: "C (12-14)", value: 15 },
  { name: "D (0-11)", value: 10 },
];

// ─── Enrollment ───────────────────────────────────────────────────────────────

export type EnrollmentDoc = {
  label: string;
  submitted: boolean;
};

export type Enrollment = {
  studentId: string;
  code: string;           // código de matrícula
  year: number;
  grade: string;
  section: string;
  shift: string;
  classroom: string;
  enrolledAt: string;     // ISO date
  status: "regular" | "condicional" | "pendiente";
  docs: EnrollmentDoc[];
  tutor: string;          // nombre del tutor/docente
};

export const mockEnrollments: Enrollment[] = [
  {
    studentId: "1",
    code: "2026-5A-0012",
    year: 2026,
    grade: "5to",
    section: "A",
    shift: "Mañana (7:45 – 13:20)",
    classroom: "Aula A-201",
    enrolledAt: "2026-02-14",
    status: "regular",
    tutor: "Prof. Flores",
    docs: [
      { label: "DNI del alumno",             submitted: true  },
      { label: "Partida de nacimiento",       submitted: true  },
      { label: "Libreta de notas anterior",   submitted: true  },
      { label: "Ficha de matrícula firmada",  submitted: true  },
      { label: "Foto 3×4 (2 unidades)",       submitted: true  },
      { label: "Carnet de vacunación",        submitted: true  },
      { label: "Certificado médico",          submitted: false },
    ],
  },
  {
    studentId: "2",
    code: "2026-3B-0027",
    year: 2026,
    grade: "3ro",
    section: "B",
    shift: "Mañana (7:45 – 13:20)",
    classroom: "Aula B-103",
    enrolledAt: "2026-02-17",
    status: "regular",
    tutor: "Prof. Ramos",
    docs: [
      { label: "DNI del alumno",             submitted: true  },
      { label: "Partida de nacimiento",       submitted: true  },
      { label: "Libreta de notas anterior",   submitted: true  },
      { label: "Ficha de matrícula firmada",  submitted: true  },
      { label: "Foto 3×4 (2 unidades)",       submitted: true  },
      { label: "Carnet de vacunación",        submitted: false },
      { label: "Certificado médico",          submitted: false },
    ],
  },
];

// ─── Announcements ────────────────────────────────────────────────────────────

export type AnnouncementCategory = "urgente" | "importante" | "general" | "informativo";

export type Announcement = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  sender: string;
  date: string;       // ISO date
  read: boolean;
  audience: "todos" | "padres" | "5to" | "3ro";
};

export const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    category: "urgente",
    title: "Simulacro de sismo – Jueves 14 de mayo",
    body: "Se realizará un simulacro de evacuación ante sismo el día jueves 14 de mayo a las 10:00 a.m. Se solicita a los padres de familia informar a sus hijos sobre la importancia de este ejercicio y la necesidad de guardar calma durante el procedimiento. Los alumnos no deberán traer mochilas voluminosas ese día para facilitar la evacuación.",
    sender: "Dirección",
    date: "2026-05-08",
    read: false,
    audience: "todos",
  },
  {
    id: "2",
    category: "importante",
    title: "Reunión de padres de familia – 5to grado",
    body: "Se convoca a los padres y/o apoderados de los alumnos de 5to grado a la reunión programada para el lunes 18 de mayo a las 17:00 hrs. en el auditorio principal. Temas a tratar: avance académico del bimestre, orientación vocacional y trámites de egreso. Se solicita puntual asistencia.",
    sender: "Coordinación Académica",
    date: "2026-05-07",
    read: false,
    audience: "5to",
  },
  {
    id: "3",
    category: "importante",
    title: "Exámenes de recuperación – Bimestre 2",
    body: "Los alumnos con cursos desaprobados en el Bimestre 2 deberán presentarse a los exámenes de recuperación los días 20 y 21 de mayo. El cronograma detallado por grado y sección se publicará en la vitrina del colegio y en el portal web institucional. Se recomienda presentar DNI y código de matrícula.",
    sender: "Secretaría Académica",
    date: "2026-05-06",
    read: true,
    audience: "todos",
  },
  {
    id: "4",
    category: "general",
    title: "Campeonato interno de fulbito – Inscripciones abiertas",
    body: "Se informa que están abiertas las inscripciones para el campeonato interno de fulbito entre secciones. Los interesados deben conformar equipos de 7 integrantes y registrarse con el Prof. Huamán (Educación Física) hasta el viernes 15 de mayo. Categorías: 1ro–2do, 3ro–4to y 5to grado.",
    sender: "Comité Deportivo",
    date: "2026-05-05",
    read: true,
    audience: "todos",
  },
  {
    id: "5",
    category: "informativo",
    title: "Actualización de datos de contacto",
    body: "Se solicita a los padres de familia verificar y actualizar sus datos de contacto (número celular, correo electrónico y dirección) en la oficina de Secretaría, de lunes a viernes de 8:00 a 13:00 hrs. Esta información es necesaria para las comunicaciones oficiales del colegio.",
    sender: "Secretaría General",
    date: "2026-05-02",
    read: true,
    audience: "padres",
  },
  {
    id: "6",
    category: "general",
    title: "Día del Logro – Exposición de proyectos",
    body: "El próximo 28 de mayo se realizará el Día del Logro donde los alumnos presentarán sus proyectos de aprendizaje ante la comunidad educativa. Se invita a los padres de familia a participar como público. El evento se realizará en el patio principal de 9:00 a 12:00 hrs.",
    sender: "Dirección",
    date: "2026-04-28",
    read: true,
    audience: "todos",
  },
  {
    id: "7",
    category: "importante",
    title: "Entrega de libretas de notas – Bimestre 1",
    body: "La entrega de libretas de notas del Bimestre 1 se realizará el sábado 26 de abril de 8:00 a 11:00 hrs. Es obligatoria la presencia del padre, madre o apoderado para recepcionar la libreta. En caso de no poder asistir, enviar carta poder simple con DNI del apoderado.",
    sender: "Dirección",
    date: "2026-04-20",
    read: true,
    audience: "todos",
  },
];

// ─── Teacher Panel ────────────────────────────────────────────────────────────

export type TeacherCourse = {
  id: string;
  subject: string;
  grade: string;       // "1ro", "2do", ...
  section: string;     // "A", "B", ...
  shift: string;
  room: string;
  studentsTotal: number;
  hoursPerWeek: number;
  currentBimester: number;
  avgGrade: number;    // promedio de la sección
  attendanceRate: number;
};

export const mockTeacherCourses: TeacherCourse[] = [
  {
    id: "tc-1",
    subject: "Matemáticas",
    grade: "1ro",
    section: "A",
    shift: "Mañana",
    room: "Aula A-101",
    studentsTotal: 32,
    hoursPerWeek: 6,
    currentBimester: 2,
    avgGrade: 14.6,
    attendanceRate: 94,
  },
  {
    id: "tc-2",
    subject: "Lengua Castellana",
    grade: "2do",
    section: "B",
    shift: "Mañana",
    room: "Aula B-203",
    studentsTotal: 30,
    hoursPerWeek: 5,
    currentBimester: 2,
    avgGrade: 15.3,
    attendanceRate: 96,
  },
  {
    id: "tc-3",
    subject: "Historia",
    grade: "3ro",
    section: "C",
    shift: "Mañana",
    room: "Aula C-305",
    studentsTotal: 28,
    hoursPerWeek: 4,
    currentBimester: 2,
    avgGrade: 14.2,
    attendanceRate: 91,
  },
];

// ─── Alumnos por curso ────────────────────────────────────────────────────────

export type CourseStudent = {
  id: string;
  name: string;
  initials: string;
  order: number; // número de orden en el aula
};

export const mockCourseStudents: Record<string, CourseStudent[]> = {
  "tc-1": [ // Matemáticas 1ro "A"
    { id: "s1-01", name: "Adriana Castillo Vega",       initials: "AC", order: 1  },
    { id: "s1-02", name: "Bruno Espinoza Ríos",          initials: "BE", order: 2  },
    { id: "s1-03", name: "Camila Herrera Ponce",         initials: "CH", order: 3  },
    { id: "s1-04", name: "Diego Torres Aguilar",         initials: "DT", order: 4  },
    { id: "s1-05", name: "Estefanía Quispe Mamani",      initials: "EQ", order: 5  },
    { id: "s1-06", name: "Fabricio Mendoza Ramos",       initials: "FM", order: 6  },
    { id: "s1-07", name: "Grecia Soto Palomino",         initials: "GS", order: 7  },
    { id: "s1-08", name: "Hernán Villanueva Chávez",     initials: "HV", order: 8  },
    { id: "s1-09", name: "Ivana Paredes León",           initials: "IP", order: 9  },
    { id: "s1-10", name: "Jorge Bazán Trigoso",          initials: "JB", order: 10 },
    { id: "s1-11", name: "Karla Muñoz Alvarado",         initials: "KM", order: 11 },
    { id: "s1-12", name: "Leonardo Salas Ccahuana",      initials: "LS", order: 12 },
    { id: "s1-13", name: "Milagros Cárdenas Pinto",      initials: "MC", order: 13 },
    { id: "s1-14", name: "Néstor Chávez Huamaní",        initials: "NC", order: 14 },
  ],
  "tc-2": [ // Lengua Castellana 2do "B"
    { id: "s2-01", name: "Alessandra Fuentes Quiroz",   initials: "AF", order: 1  },
    { id: "s2-02", name: "Brayan Condori Torres",        initials: "BC", order: 2  },
    { id: "s2-03", name: "Cristina Vásquez Huanca",      initials: "CV", order: 3  },
    { id: "s2-04", name: "Daniel Peña Zamora",           initials: "DP", order: 4  },
    { id: "s2-05", name: "Estela Cárdenas Pilco",        initials: "EC", order: 5  },
    { id: "s2-06", name: "Félix Quispe Apaza",           initials: "FQ", order: 6  },
    { id: "s2-07", name: "Gissela Ramos Benites",        initials: "GR", order: 7  },
    { id: "s2-08", name: "Harold Castro Meza",           initials: "HC", order: 8  },
    { id: "s2-09", name: "Iris Delgado Ccoyo",           initials: "ID", order: 9  },
    { id: "s2-10", name: "Josué Arroyo Neyra",           initials: "JA", order: 10 },
    { id: "s2-11", name: "Karina Lozano Puca",           initials: "KL", order: 11 },
    { id: "s2-12", name: "Luis Tapia Mamani",            initials: "LT", order: 12 },
    { id: "s2-13", name: "Melissa Orihuela Ccari",       initials: "MO", order: 13 },
  ],
  "tc-3": [ // Historia 3ro "C"
    { id: "s3-01", name: "Antonella Miranda Pino",       initials: "AM", order: 1  },
    { id: "s3-02", name: "Bastian Olivera Chino",        initials: "BO", order: 2  },
    { id: "s3-03", name: "Claudia Ríos Ccopa",           initials: "CR", order: 3  },
    { id: "s3-04", name: "Delfín Cusi Huallpa",          initials: "DC", order: 4  },
    { id: "s3-05", name: "Elena Gamarra Yupanqui",       initials: "EG", order: 5  },
    { id: "s3-06", name: "Franklin Ticona Huayhua",      initials: "FT", order: 6  },
    { id: "s3-07", name: "Gloria Condori Paucar",        initials: "GC", order: 7  },
    { id: "s3-08", name: "Héctor Lazo Gutiérrez",        initials: "HL", order: 8  },
    { id: "s3-09", name: "Ingrid Pinto Maquera",         initials: "IP", order: 9  },
    { id: "s3-10", name: "Jefferson Colque Mamani",      initials: "JC", order: 10 },
    { id: "s3-11", name: "Lucero Flores Hancco",         initials: "LF", order: 11 },
    { id: "s3-12", name: "Marco Valdez Quispe",          initials: "MV", order: 12 },
  ],
};

// ─── Notas por curso y bimestre ───────────────────────────────────────────────

export type GradeEntry = {
  studentId: string;
  n1: number;
  n2: number;
  n3: number;
  observation: string;
};

// null = bimestre aún no registrado
export const mockCourseGrades: Record<string, Record<string, GradeEntry[]>> = {
  "tc-1": {
    "Bimestre 1": [
      { studentId: "s1-01", n1: 16, n2: 17, n3: 15, observation: "Muy buena disposición" },
      { studentId: "s1-02", n1: 14, n2: 13, n3: 15, observation: "Buen esfuerzo" },
      { studentId: "s1-03", n1: 18, n2: 17, n3: 19, observation: "Sobresaliente" },
      { studentId: "s1-04", n1: 12, n2: 13, n3: 11, observation: "Necesita refuerzo" },
      { studentId: "s1-05", n1: 15, n2: 14, n3: 16, observation: "Progresando bien" },
      { studentId: "s1-06", n1: 17, n2: 18, n3: 17, observation: "Excelente desempeño" },
      { studentId: "s1-07", n1: 13, n2: 12, n3: 14, observation: "En proceso" },
      { studentId: "s1-08", n1:  9, n2: 10, n3: 11, observation: "Bajo rendimiento, refuerzo urgente" },
      { studentId: "s1-09", n1: 16, n2: 15, n3: 17, observation: "Buena alumna" },
      { studentId: "s1-10", n1: 14, n2: 16, n3: 15, observation: "Satisfactorio" },
      { studentId: "s1-11", n1: 19, n2: 18, n3: 20, observation: "Destacada, candidata a excelencia" },
      { studentId: "s1-12", n1: 11, n2: 12, n3: 10, observation: "Requiere apoyo adicional" },
      { studentId: "s1-13", n1: 15, n2: 16, n3: 15, observation: "Buen rendimiento" },
      { studentId: "s1-14", n1: 13, n2: 14, n3: 13, observation: "Regular, puede mejorar" },
    ],
    "Bimestre 2": [
      { studentId: "s1-01", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-02", n1: 15, n2: 14, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-03", n1: 19, n2: 18, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-04", n1: 13, n2: 12, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-05", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-06", n1: 18, n2: 17, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-07", n1: 14, n2: 13, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-08", n1: 11, n2: 10, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-09", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-10", n1: 15, n2: 17, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-11", n1: 20, n2: 19, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-12", n1: 12, n2: 13, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-13", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s1-14", n1: 14, n2: 13, n3: 0,  observation: "Pendiente examen" },
    ],
    "Bimestre 3": [],
    "Bimestre 4": [],
  },
  "tc-2": {
    "Bimestre 1": [
      { studentId: "s2-01", n1: 17, n2: 16, n3: 18, observation: "Excelente comprensión lectora" },
      { studentId: "s2-02", n1: 13, n2: 14, n3: 12, observation: "Mejorar ortografía" },
      { studentId: "s2-03", n1: 15, n2: 16, n3: 15, observation: "Buen desempeño oral" },
      { studentId: "s2-04", n1: 16, n2: 15, n3: 17, observation: "Muy buena redacción" },
      { studentId: "s2-05", n1: 11, n2: 12, n3: 10, observation: "Refuerzo en comprensión" },
      { studentId: "s2-06", n1: 18, n2: 19, n3: 17, observation: "Sobresaliente" },
      { studentId: "s2-07", n1: 14, n2: 13, n3: 15, observation: "Progresando" },
      { studentId: "s2-08", n1: 16, n2: 17, n3: 16, observation: "Buena participación" },
      { studentId: "s2-09", n1: 12, n2: 13, n3: 14, observation: "En proceso de mejora" },
      { studentId: "s2-10", n1: 15, n2: 16, n3: 14, observation: "Satisfactorio" },
      { studentId: "s2-11", n1: 19, n2: 18, n3: 20, observation: "Destacada" },
      { studentId: "s2-12", n1: 10, n2: 11, n3:  9, observation: "Bajo rendimiento" },
      { studentId: "s2-13", n1: 15, n2: 14, n3: 16, observation: "Buena alumna" },
    ],
    "Bimestre 2": [
      { studentId: "s2-01", n1: 18, n2: 17, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-02", n1: 14, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-03", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-04", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-05", n1: 12, n2: 13, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-06", n1: 19, n2: 18, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-07", n1: 14, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-08", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-09", n1: 13, n2: 14, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-10", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-11", n1: 20, n2: 19, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-12", n1: 11, n2: 12, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s2-13", n1: 15, n2: 16, n3: 0,  observation: "Pendiente examen" },
    ],
    "Bimestre 3": [],
    "Bimestre 4": [],
  },
  "tc-3": {
    "Bimestre 1": [
      { studentId: "s3-01", n1: 15, n2: 16, n3: 14, observation: "Buena comprensión histórica" },
      { studentId: "s3-02", n1: 13, n2: 12, n3: 14, observation: "Mejorar análisis de fuentes" },
      { studentId: "s3-03", n1: 17, n2: 16, n3: 18, observation: "Excelente" },
      { studentId: "s3-04", n1: 11, n2: 10, n3: 12, observation: "Necesita refuerzo" },
      { studentId: "s3-05", n1: 16, n2: 15, n3: 17, observation: "Muy buena participación" },
      { studentId: "s3-06", n1: 12, n2: 13, n3: 11, observation: "En proceso" },
      { studentId: "s3-07", n1: 14, n2: 15, n3: 13, observation: "Satisfactorio" },
      { studentId: "s3-08", n1: 18, n2: 17, n3: 19, observation: "Sobresaliente" },
      { studentId: "s3-09", n1: 13, n2: 14, n3: 12, observation: "Regular" },
      { studentId: "s3-10", n1:  8, n2:  9, n3: 10, observation: "Bajo rendimiento, citar a padres" },
      { studentId: "s3-11", n1: 16, n2: 17, n3: 15, observation: "Buen trabajo" },
      { studentId: "s3-12", n1: 15, n2: 14, n3: 16, observation: "Progresando" },
    ],
    "Bimestre 2": [
      { studentId: "s3-01", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-02", n1: 14, n2: 13, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-03", n1: 18, n2: 17, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-04", n1: 12, n2: 11, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-05", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-06", n1: 13, n2: 14, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-07", n1: 15, n2: 14, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-08", n1: 19, n2: 18, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-09", n1: 14, n2: 13, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-10", n1: 10, n2: 11, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-11", n1: 17, n2: 16, n3: 0,  observation: "Pendiente examen" },
      { studentId: "s3-12", n1: 16, n2: 15, n3: 0,  observation: "Pendiente examen" },
    ],
    "Bimestre 3": [],
    "Bimestre 4": [],
  },
};

// ─── Horario del docente ──────────────────────────────────────────────────────

export type TeacherScheduleSlot = {
  time: string;
  subject: string;
  grade: string;
  section: string;
  room: string;
};

// PERIODS y DAYS ya definidos arriba, se reusan aquí
// mockTeacherSchedule[day][periodIndex] = slot | null
export const mockTeacherSchedule: Record<string, (TeacherScheduleSlot | null)[]> = {
  "Lunes": [
    { time: "7:45 - 8:30",   subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "8:30 - 9:15",   subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "9:15 - 10:00",  subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "10:20 - 11:05", subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "11:05 - 11:50", subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    null,
    null,
  ],
  "Martes": [
    { time: "7:45 - 8:30",   subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "8:30 - 9:15",   subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "9:15 - 10:00",  subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "10:20 - 11:05", subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "11:05 - 11:50", subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    null,
    null,
  ],
  "Miércoles": [
    { time: "7:45 - 8:30",   subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "8:30 - 9:15",   subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "9:15 - 10:00",  subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "10:20 - 11:05", subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "11:05 - 11:50", subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    null,
    null,
  ],
  "Jueves": [
    { time: "7:45 - 8:30",   subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "8:30 - 9:15",   subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "9:15 - 10:00",  subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    { time: "10:20 - 11:05", subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "11:05 - 11:50", subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    null,
    null,
  ],
  "Viernes": [
    { time: "7:45 - 8:30",   subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "8:30 - 9:15",   subject: "Lengua Castellana", grade: "2do", section: "B", room: "Aula B-203" },
    { time: "9:15 - 10:00",  subject: "Historia",          grade: "3ro", section: "C", room: "Aula C-305" },
    { time: "10:20 - 11:05", subject: "Matemáticas",      grade: "1ro", section: "A", room: "Aula A-101" },
    null,
    null,
    null,
  ],
};

// ─── Materiales por curso ─────────────────────────────────────────────────────

export type Material = {
  id: string;
  courseId: string;
  title: string;
  type: "pdf" | "pptx" | "docx" | "xlsx" | "img";
  size: string;
  uploadedAt: string;
  topic: string;
};

export const mockMaterials: Material[] = [
  { id: "m1",  courseId: "tc-1", title: "Cap. 1 – Números reales y propiedades",         type: "pdf",  size: "1.2 MB", uploadedAt: "2026-03-05", topic: "Álgebra" },
  { id: "m2",  courseId: "tc-1", title: "Práctica calificada B1 – Ecuaciones",           type: "docx", size: "320 KB", uploadedAt: "2026-03-18", topic: "Álgebra" },
  { id: "m3",  courseId: "tc-1", title: "Diapositivas – Funciones lineales",             type: "pptx", size: "2.8 MB", uploadedAt: "2026-04-02", topic: "Funciones" },
  { id: "m4",  courseId: "tc-1", title: "Cap. 2 – Funciones y gráficas",                type: "pdf",  size: "980 KB", uploadedAt: "2026-04-10", topic: "Funciones" },
  { id: "m5",  courseId: "tc-1", title: "Práctica calificada B2 – Funciones",           type: "docx", size: "290 KB", uploadedAt: "2026-05-07", topic: "Funciones" },
  { id: "m6",  courseId: "tc-2", title: "Separata – Comprensión lectora Texto 1",       type: "pdf",  size: "740 KB", uploadedAt: "2026-03-08", topic: "Comprensión" },
  { id: "m7",  courseId: "tc-2", title: "Guía – Redacción de párrafos",                 type: "docx", size: "410 KB", uploadedAt: "2026-03-20", topic: "Producción" },
  { id: "m8",  courseId: "tc-2", title: "Diapositivas – Tipos de texto",                type: "pptx", size: "3.1 MB", uploadedAt: "2026-04-05", topic: "Producción" },
  { id: "m9",  courseId: "tc-2", title: "Práctica – Análisis de texto literario",       type: "pdf",  size: "620 KB", uploadedAt: "2026-04-22", topic: "Literatura" },
  { id: "m10", courseId: "tc-3", title: "Cap. 1 – El Perú prehispánico",                type: "pdf",  size: "1.5 MB", uploadedAt: "2026-03-06", topic: "Historia del Perú" },
  { id: "m11", courseId: "tc-3", title: "Línea de tiempo – Virreinato",                 type: "img",  size: "890 KB", uploadedAt: "2026-03-25", topic: "Historia del Perú" },
  { id: "m12", courseId: "tc-3", title: "Diapositivas – Independencia del Perú",        type: "pptx", size: "4.2 MB", uploadedAt: "2026-04-15", topic: "República" },
  { id: "m13", courseId: "tc-3", title: "Práctica – La República aristocrática",        type: "docx", size: "380 KB", uploadedAt: "2026-05-03", topic: "República" },
];
