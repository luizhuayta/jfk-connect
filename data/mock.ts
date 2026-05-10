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
