import { User, Student, Course, Note, Activity } from "@/types";

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
