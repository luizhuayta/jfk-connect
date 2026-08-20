/**
 * GET /api/admin/teachers/[id]/schedule
 *
 * Horario semanal de un docente puntual: día, hora y sección de cada clase
 * que dicta. Se filtra directo por `schedule_entries.teacher_id` — el seed
 * lo llena con el mismo `teacher_id` de `courses`, y el único endpoint que
 * edita horarios (`PATCH /api/admin/schedule`) solo mueve día/período/hora,
 * nunca la asignatura ni el docente, así que se mantiene confiable. No se
 * usa `schedule_entries.teacher` (texto): varios docentes de seed comparten
 * el mismo full_name, así que comparar por nombre sería ambiguo.
 *
 * Seguridad: solo rol 'admin'.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
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
  const [, denied] = await requireRole(request, ["admin"]);
  if (denied) return denied;

  try {
    const { id } = await params;

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
    console.error("[admin/teachers/[id]/schedule GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
