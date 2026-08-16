/**
 * GET /api/father/schedule?studentId=<uuid>
 *
 * Horario semanal de un hijo del padre autenticado (según su grado/sección).
 * Respuesta: { ok, days, periods, schedule: { <day>: [slot|null ×7] } }
 *
 * Seguridad: solo rol 'padre' y solo si el estudiante es su hijo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireOwnedStudent } from "@/lib/guards";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const PERIODS = [
  "7:45 - 8:30",
  "8:30 - 9:15",
  "9:15 - 10:00",
  "10:20 - 11:05",
  "11:05 - 11:50",
  "11:50 - 12:35",
  "12:35 - 13:20",
];

interface SlotRow {
  day: string;
  period: number;
  time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
}

export type ScheduleSlot = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
};

export async function GET(request: NextRequest) {
  const [studentId, denied] = await requireOwnedStudent(request);
  if (denied) return denied;

  try {
    const student = await queryOne<{ grade: string; section: string }>(
      "SELECT grade, section FROM students WHERE id = $1",
      [studentId],
    );
    if (!student) {
      return NextResponse.json(
        { ok: false, error: "Estudiante no encontrado." },
        { status: 404 },
      );
    }

    const r = await query<SlotRow>(
      `SELECT day, period, time, subject, teacher, room
       FROM schedule_entries
       WHERE grade = $1 AND section = $2
       ORDER BY day, period`,
      [student.grade, student.section],
    );

    const schedule: Record<string, (ScheduleSlot | null)[]> = {};
    for (const day of DAYS) schedule[day] = Array(7).fill(null);
    for (const row of r.rows) {
      schedule[row.day][row.period - 1] = {
        time: row.time,
        subject: row.subject,
        teacher: row.teacher ?? "",
        room: row.room ?? "",
      };
    }

    return NextResponse.json({ ok: true, days: DAYS, periods: PERIODS, schedule });
  } catch (err) {
    logger.error({ err, route: "father/schedule" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
