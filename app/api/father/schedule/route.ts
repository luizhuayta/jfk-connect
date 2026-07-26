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
import { requireRole } from "@/lib/auth";
import { studentBelongsToParent } from "@/lib/guards";

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
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json(
      { ok: false, error: "Falta el parámetro studentId." },
      { status: 400 },
    );
  }

  if (!(await studentBelongsToParent(studentId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este estudiante no está vinculado a tu cuenta." },
      { status: 403 },
    );
  }

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
    console.error("[father/schedule GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
