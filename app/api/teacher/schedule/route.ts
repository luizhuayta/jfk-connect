/**
 * GET /api/teacher/schedule
 *
 * Horario semanal del docente autenticado (sus slots en las mallas por sección).
 * Respuesta: { ok, days, periods, schedule: { <day>: [slot|null ×7] } }
 *
 * Seguridad: solo rol 'docente'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

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

    const schedule: Record<string, (TeacherSlot | null)[]> = {};
    for (const day of DAYS) schedule[day] = Array(7).fill(null);
    for (const row of r.rows) {
      if (!schedule[row.day]) schedule[row.day] = Array(7).fill(null);
      schedule[row.day][row.period - 1] = {
        time: row.time,
        subject: row.subject,
        grade: row.grade,
        section: row.section,
        room: row.room ?? "",
      };
    }

    return NextResponse.json({ ok: true, days: DAYS, periods: PERIODS, schedule });
  } catch (err) {
    console.error("[teacher/schedule GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
