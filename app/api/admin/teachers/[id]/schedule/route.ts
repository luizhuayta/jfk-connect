/**
 * GET /api/admin/teachers/[id]/schedule
 *
 * Horario semanal de un docente puntual. Se filtra por
 * `schedule_entries.teacher_id`.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { parseUuidParam } from "@/lib/validate";
import { guardAdmin, internalError } from "@/lib/api/admin-route";

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

interface TeacherRow {
  id: string;
  full_name: string;
  subject: string | null;
}

interface EntryRow {
  id: string;
  grade: string;
  section: string;
  day: string;
  period: number;
  time: string;
  subject: string;
  room: string | null;
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const [, denied] = await guardAdmin(request);
  if (denied) return denied;

  try {
    const { id: rawId } = await params;
    const [id, invalid] = parseUuidParam(rawId);
    if (invalid) return invalid;

    const teacher = await queryOne<TeacherRow>(
      `SELECT id, full_name, subject FROM users WHERE id = $1 AND role = 'docente'`,
      [id],
    );
    if (!teacher) {
      return NextResponse.json({ ok: false, error: "Docente no encontrado." }, { status: 404 });
    }

    const r = await query<EntryRow>(
      `SELECT id, grade, section, day, period, time, subject, room
       FROM schedule_entries
       WHERE teacher_id = $1
       ORDER BY day, period`,
      [id],
    );

    return NextResponse.json({
      ok: true,
      teacher,
      days: DAYS,
      periods: PERIODS,
      entries: r.rows,
    });
  } catch (err) {
    return internalError(err, "admin/teachers/[id]/schedule GET");
  }
}
