/**
 * GET /api/teacher/courses/[courseId]/students
 *
 * Alumnos de la sección del curso (ordenados alfabéticamente, con N° de orden).
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireOwnedCourse } from "@/lib/guards";

export const dynamic = "force-dynamic";

interface StudentRow {
  id: string;
  name: string;
  initials: string;
  order: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [ctx, denied] = await requireOwnedCourse(request, courseId);
  if (denied) return denied;
  const { course } = ctx;

  try {
    const r = await query<StudentRow>(
      `SELECT s.id,
              s.full_name AS name,
              COALESCE(s.initials, UPPER(LEFT(s.full_name, 1))) AS initials,
              ROW_NUMBER() OVER (ORDER BY s.full_name)::int AS "order"
       FROM students s
       WHERE s.grade = $1 AND s.section = $2 AND s.status = 'activo'
       ORDER BY s.full_name`,
      [course.grade, course.section],
    );

    return NextResponse.json({ ok: true, students: r.rows });
  } catch (err) {
    console.error("[teacher/courses/[id]/students GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
