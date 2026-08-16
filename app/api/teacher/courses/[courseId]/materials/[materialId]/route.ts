/**
 * DELETE /api/teacher/courses/[courseId]/materials/[materialId]
 *
 * Elimina un material del curso.
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { courseBelongsToTeacher } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; materialId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const [user, denied] = await requireRole(request, ["docente"]);
  if (denied) return denied;

  const { courseId, materialId } = await params;

  if (!(await courseBelongsToTeacher(courseId, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Este curso no está asignado a tu cuenta." },
      { status: 403 },
    );
  }

  try {
    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM materials WHERE id = $1 AND course_id = $2 RETURNING id`,
      [materialId, courseId],
    );
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Material no encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[teacher/courses/[id]/materials/[materialId] DELETE] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
