/** Estados de asistencia del colegio. No confundir con SIAGIE AD/A/B/C. */
export type AttendanceStatus = "A" | "F" | "T" | "J";

/** Verbo del día: lo que el padre lee de noche. */
export const ATTENDANCE_DAY_LABEL: Record<AttendanceStatus, string> = {
  A: "Asistió",
  F: "Faltó",
  T: "Tarde",
  J: "Justificado",
};

/** Sustantivo para conteos (el año, el mes). */
export const ATTENDANCE_COUNT_LABEL: Record<AttendanceStatus, string> = {
  A: "Asistencias",
  F: "Faltas",
  T: "Tardanzas",
  J: "Justificados",
};

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["A", "F", "T", "J"];
