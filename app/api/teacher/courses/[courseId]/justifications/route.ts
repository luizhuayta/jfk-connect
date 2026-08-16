/**
 * GET /api/teacher/courses/[courseId]/justifications
 *
 * Justificaciones enviadas por los padres para los alumnos de un curso.
 * El docente las aprueba/rechaza desde aquí (PATCH en .../justifications/[id]).
 *
 * Seguridad: solo rol 'docente' (o admin) y solo si el curso es del docente.
 */

import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";

export const dynamic = "force-dynamic";

interface JustificationRow {
  id: string;
  attendance_id: string;
  student_id: string;
  reason: string;
  status: "pendiente" | "aprobada" | "rechazada";
  admin_response: string | null;
  date: string;
  student_name: string;
  parent_name: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
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
    const r = await query<JustificationRow>(
      `SELECT aj.id,
              aj.attendance_id,
              aj.student_id,
              aj.reason,
              aj.status::text AS status,
              aj.admin_response,
              to_char(a.date, 'YYYY-MM-DD') AS date,
              s.full_name AS student_name,
              u.full_name AS parent_name
       FROM attendance_justifications aj
       JOIN attendance a ON a.id = aj.attendance_id
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = aj.parent_id
       JOIN courses c ON c.id = $1
       WHERE s.grade = c.grade AND s.section = c.section
       ORDER BY a.date DESC, s.full_name`,
      [courseId],
    );

    const justifications = r.rows.map((j) => ({
      id: j.id,
      attendanceId: j.attendance_id,
      studentId: j.student_id,
      studentName: j.student_name,
      parentName: j.parent_name,
      date: j.date,
      reason: j.reason,
      status: j.status,
      adminResponse: j.admin_response,
    }));

    return NextResponse.json({ ok: true, justifications });
  } catch (err) {
    console.error("[teacher/courses/[id]/justifications GET] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
