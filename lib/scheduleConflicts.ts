/**
 * Detección de cruces de horario: un mismo docente no puede quedar
 * asignado a dos secciones distintas en el mismo (día, período).
 *
 * El identificador del docente se recibe vía `teacherIdOf` en vez de leerse
 * de un campo fijo, para que cada caller decida su fuente. En este proyecto
 * `schedule_entries.teacher_id` (llenado por el seed a partir de
 * `courses.teacher_id`) es la fuente confiable — el texto `teacher` no
 * sirve porque varios docentes de seed comparten el mismo full_name.
 */

export interface ScheduleSlotRef {
  grade: string;
  section: string;
  day: string;
  period: number;
  subject: string;
  /**
   * Turno de la sección ("Mañana" | "Tarde", ver `sectionShift`). Entra en
   * la llave de choque porque Mañana-período-3 y Tarde-período-3 son horas
   * de reloj distintas (turno Tarde arranca a las 13:30) — un docente con
   * shift_preference "Ambos" puede legítimamente tener ambas el mismo día
   * sin que sea un cruce real.
   */
  shift: string;
}

export interface TeacherConflict {
  teacherId: string;
  day: string;
  shift: string;
  period: number;
  sections: { grade: string; section: string; subject: string }[];
}

/**
 * Agrupa las entradas por (teacherId, día, turno, período) y devuelve los
 * grupos con más de una sección — esos son los cruces reales: el docente no
 * puede estar físicamente en dos aulas a la misma hora.
 *
 * No aplica ninguna tolerancia de minutos: los períodos son bloques fijos
 * (ver PERIODS_MAÑANA/PERIODS_TARDE en scripts/seed-full.mjs), así que dos
 * entradas del mismo turno solo pueden coincidir si comparten exactamente
 * el mismo (día, período) — no hay granularidad de minutos que tolerar
 * dentro de un mismo período.
 */
export function findTeacherConflicts<T extends ScheduleSlotRef>(
  entries: T[],
  teacherIdOf: (entry: T) => string | null | undefined,
): TeacherConflict[] {
  const byKey = new Map<string, TeacherConflict>();

  for (const entry of entries) {
    const teacherId = teacherIdOf(entry);
    if (!teacherId) continue;

    const key = `${teacherId}__${entry.day}__${entry.shift}__${entry.period}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.sections.push({ grade: entry.grade, section: entry.section, subject: entry.subject });
    } else {
      byKey.set(key, {
        teacherId,
        day: entry.day,
        shift: entry.shift,
        period: entry.period,
        sections: [{ grade: entry.grade, section: entry.section, subject: entry.subject }],
      });
    }
  }

  return [...byKey.values()].filter((c) => c.sections.length > 1);
}
