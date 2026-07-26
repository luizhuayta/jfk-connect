/**
 * GET /api/father/students
 *
 * Devuelve los hijos del padre autenticado con su promedio y asistencia
 * calculados en vivo desde grades/attendance.
 *
 * Seguridad: solo rol 'padre'; cada padre ve únicamente sus propios hijos
 * (students.parent_id = usuario autenticado).
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface StudentRow {
  id: string;
  name: string;
  grade: string;
  grade_num: number;
  section: string;
  shift: string;
  status: string;
  avg_grade: number;
  attendance_rate: number;
}

export async function GET(request: NextRequest) {
  const [user, denied] = await requireRole(request, ["padre"]);
  if (denied) return denied;

  try {
    const r = await query<StudentRow>(
      `SELECT
         s.id,
         s.full_name AS name,
         s.grade,
         s.grade_num,
         s.section,
         s.shift::text AS shift,
         s.status,
         COALESCE((
           SELECT ROUND(AVG(g.average)::numeric, 2)
           FROM grades g WHERE g.student_id = s.id
         ), 0)::float AS avg_grade,
         COALESCE((
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a WHERE a.student_id = s.id
         ), 100)::int AS attendance_rate
       FROM students s
       WHERE s.parent_id = $1
       ORDER BY s.full_name`,
      [user.id],
    );

    return NextResponse.json({ ok: true, students: r.rows });
  } catch (err) {
    console.error("[father/students GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
