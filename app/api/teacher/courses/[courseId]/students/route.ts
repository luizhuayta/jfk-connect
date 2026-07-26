/**
 * GET /api/teacher/courses/[courseId]/students
 *
 * Alumnos de la sección del curso (ordenados alfabéticamente, con N° de orden).
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";

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
  // Admin puede leer cualquier curso (solo lectura); docente solo los suyos
  const [user, denied] = await requireRole(request, ["docente", "admin"]);
  if (denied) return denied;

  const { courseId } = await params;

  if (user.role !== "admin" && !(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const course = await queryOne<{ grade: string; section: string }>(
      "SELECT grade, section FROM courses WHERE id = $1",
      [courseId],
    );
    if (!course) {
      return NextResponse.json(
        { ok: false, error: "Curso no encontrado." },
        { status: 404 },
      );
    }

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
