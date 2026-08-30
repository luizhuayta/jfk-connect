/**
 * DELETE /api/teacher/courses/[courseId]/materials/[materialId]
 *
 * Elimina un material del curso.
 *
 * Seguridad: solo rol 'docente' y solo si el curso es suyo.
 */

import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { requireOwnedCourse } from "@/lib/guards";
import { assertSameOrigin } from "@/lib/csrf";
import { parseUuidParam } from "@/lib/validate";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; materialId: string }> },
) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const { courseId, materialId } = await params;
  const [materialIdOk, materialIdErr] = parseUuidParam(materialId);
  if (materialIdErr) return materialIdErr;

  const [, denied] = await requireOwnedCourse(request, courseId, { allowAdmin: false });
  if (denied) return denied;

  try {
    const deleted = await queryOne<{ id: string }>(
      `DELETE FROM materials WHERE id = $1 AND course_id = $2 RETURNING id`,
      [materialIdOk, courseId],
    );
    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Material no encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err, route: "teacher/courses/[id]/materials/[materialId] DELETE" }, "error inesperado");
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
