/**
 * Periodos y turnos del horario escolar — una sola fuente para la API
 * de horario del padre y la página `/father/schedule`.
 */

export const SCHEDULE_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"] as const;

export const PERIODS_MANANA = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05",
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
] as const;

export const PERIODS_TARDE = [
  "13:30 - 14:15",
  "14:15 - 15:00",
  "15:00 - 15:45",
  "16:05 - 16:50",
  "16:50 - 17:35",
  "17:35 - 18:20",
  "18:20 - 19:05",
] as const;

/** Periodos que devuelve el endpoint (turno mañana, histórico). */
export const PERIODS = [...PERIODS_MANANA];

export const RECESS_TIME: Record<string, string> = {
  Mañana: "10:00 – 10:20",
  Tarde: "15:45 – 16:05",
};

export function periodsForShift(shift: string | undefined): readonly string[] {
  return shift === "Tarde" ? PERIODS_TARDE : PERIODS_MANANA;
}

export const DAY_SHORT: Record<string, string> = {
  Lunes: "Lun",
  Martes: "Mar",
  Miércoles: "Mié",
  Jueves: "Jue",
  Viernes: "Vie",
};
