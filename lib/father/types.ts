/**
 * Contratos de payload del Panel de Padres — compartidos entre las rutas
 * REST, las herramientas del asistente y el cliente.
 */

import type { AttendanceStatus } from "@/lib/attendance/labels";

export type FatherStudent = {
  id: string;
  name: string;
  grade: string;
  section: string;
  status?: string;
  shift?: string;
  courses_count?: number;
};

export type AttendanceJustification = {
  status: "pendiente" | "aprobada" | "rechazada";
  reason: string;
  adminResponse: string | null;
};

export type AttendanceRecord = {
  id: string;
  date: string;
  status: AttendanceStatus;
  justification: AttendanceJustification | null;
};

export type AttendanceCounts = Record<AttendanceStatus, number>;

export type AttendanceResult = {
  records: AttendanceRecord[];
  counts: AttendanceCounts;
};

export type ScheduleSlot = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

export type ScheduleData = {
  days: string[];
  periods: string[];
  schedule: Record<string, (ScheduleSlot | null)[]>;
};

export type MaterialType = "pdf" | "pptx" | "docx" | "xlsx" | "img";

export type Material = {
  id: string;
  title: string;
  type: string;
  size: string;
  topic: string;
  uploadedAt: string;
};

export type CourseMaterials = {
  id: string;
  subject: string;
  materials: Material[];
};

export type EnrollmentDoc = { label: string; submitted: boolean };

export type Enrollment = {
  studentId: string;
  code: string;
  year: number;
  grade: string;
  section: string;
  shift: string;
  classroom: string;
  enrolledAt: string;
  status: "regular" | "condicional" | "pendiente";
  docs: EnrollmentDoc[];
  docsTotal: number;
  docsSubmitted: number;
  tutor: string;
};

export type DateRange = { from: string; to: string };
