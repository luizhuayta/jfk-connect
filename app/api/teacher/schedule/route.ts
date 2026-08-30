/**
 * GET /api/teacher/schedule
 *
 * Horario semanal del docente autenticado (sus slots en las mallas por
 * sección). Un docente con shift_preference "Ambos" puede tener clases en
 * turno Mañana y turno Tarde el mismo día — son bloques de reloj distintos
 * (Tarde arranca a las 13:30), así que NO se pueden mezclar en una sola
 * grilla de 7 períodos (period=3 de Mañana y period=3 de Tarde son horas
 * distintas; meterlas en el mismo casillero ocultaría una de las dos).
 * Por eso la respuesta trae una malla separada por turno.
 *
 * Respuesta: { ok, days, schedule: { Mañana: {<day>: [slot|null ×7]}, Tarde: {...} } }
 *
 * Seguridad: solo rol 'docente'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { sectionShift } from "@/lib/section-shift";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const SHIFTS = ["Mañana", "Tarde"] as const;

interface SlotRow {
  day: string;
  period: number;
  time: string;
  subject: string;
  grade: string;
  section: string;
  room: string | null;
}

export type TeacherSlot = {
  time: string;
  subject: string;
  grade: string;
  section: string;
  room: string;
};

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  try {
    const r = await query<SlotRow>(
      `SELECT day, period, time, subject, grade, section, room
       FROM schedule_entries
       WHERE teacher_id = $1
       ORDER BY day, period`,
      [user.id],
    );

    const schedule: Record<(typeof SHIFTS)[number], Record<string, (TeacherSlot | null)[]>> = {
      Mañana: {},
      Tarde: {},
    };
    for (const shift of SHIFTS) {
      for (const day of DAYS) schedule[shift][day] = Array(7).fill(null);
    }
    for (const row of r.rows) {
      const shift = sectionShift(row.section);
      schedule[shift][row.day][row.period - 1] = {
        time: row.time,
        subject: row.subject,
        grade: row.grade,
        section: row.section,
        room: row.room ?? "",
      };
    }

    return NextResponse.json({ ok: true, days: DAYS, schedule });
  } catch (err) {
    logger.error({ err, route: "teacher/schedule GET" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
