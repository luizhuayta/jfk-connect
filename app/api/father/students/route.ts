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
import { logger } from "@/lib/logger";
import { SCHOOL_YEAR } from "@/lib/school-year";

export const dynamic = "force-dynamic";

interface StudentRow {
  id: string;
  name: string;
  grade: string;
  grade_num: number;
  section: string;
  shift: string;
  status: string;
  courses_count: number;
  avg_grade: number | null;
  attendance_rate: number | null;
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
           SELECT COUNT(*) FROM courses c
           WHERE c.grade = s.grade AND c.section = s.section
             AND c.year = EXTRACT(YEAR FROM now())
         ), 0)::int AS courses_count,
         (
           SELECT ROUND(AVG(v.score)::numeric, 2)
           FROM v_area_grades v WHERE v.student_id = s.id AND v.year = $2
         )::float AS avg_grade,
         (
           SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.status IN ('A','T','J')) / NULLIF(COUNT(*), 0))
           FROM attendance a WHERE a.student_id = s.id
         )::int AS attendance_rate
       FROM students s
       WHERE s.parent_id = $1
       ORDER BY s.full_name`,
      [user.id, SCHOOL_YEAR],
    );

    return NextResponse.json({ ok: true, students: r.rows });
  } catch (err) {
    logger.error({ err, route: "father/students" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
